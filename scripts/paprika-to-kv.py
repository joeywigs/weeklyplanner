#!/usr/bin/env python3
"""Parse Paprika HTML recipe exports and upload to Cloudflare KV."""

import json
import os
import re
import subprocess
import sys
from pathlib import Path

try:
    from bs4 import BeautifulSoup
except ImportError:
    print("Missing dependency: pip install beautifulsoup4")
    sys.exit(1)

# --- Configuration ---
KV_NAMESPACE_ID = "PLANNER_KV"  # Replace with actual namespace ID


def slugify(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    return slug.strip("-")


def parse_metadata(text: str) -> dict:
    """Extract cook time, servings, and source from the metadata div text."""
    result = {"cook_time": "", "servings": "", "source": ""}

    # Cook Time:50 minsServings:4Source:foodandwine.com
    cook_match = re.search(r"Cook Time:\s*(.+?)(?=Servings:|Source:|$)", text)
    if cook_match:
        result["cook_time"] = cook_match.group(1).strip()

    prep_match = re.search(r"Prep Time:\s*(.+?)(?=Cook Time:|Servings:|Source:|$)", text)
    if prep_match:
        result["prep_time"] = prep_match.group(1).strip()

    total_match = re.search(r"Total Time:\s*(.+?)(?=Cook Time:|Prep Time:|Servings:|Source:|$)", text)
    if total_match:
        result["total_time"] = total_match.group(1).strip()

    servings_match = re.search(r"Servings:\s*(.+?)(?=Source:|Cook Time:|$)", text)
    if servings_match:
        result["servings"] = servings_match.group(1).strip()

    source_match = re.search(r"Source:\s*(.+?)$", text)
    if source_match:
        result["source"] = source_match.group(1).strip()

    return result


def parse_recipe(filepath: Path) -> dict | None:
    """Parse a single Paprika HTML recipe file."""
    html = filepath.read_text(encoding="utf-8", errors="replace")
    soup = BeautifulSoup(html, "html.parser")

    recipe_div = soup.find("div", class_="recipe")
    if not recipe_div:
        return None

    # Name
    name_div = recipe_div.find("div", class_="name")
    name = name_div.get_text(strip=True) if name_div else filepath.stem

    # Categories
    cat_div = recipe_div.find("div", class_="categories")
    categories = []
    if cat_div:
        raw = cat_div.get_text(strip=True)
        categories = [c.strip() for c in raw.split(",") if c.strip()]

    # Metadata (cook time, servings, source)
    meta_div = recipe_div.find("div", class_="metadata")
    metadata = parse_metadata(meta_div.get_text(strip=True)) if meta_div else {}

    # Rating
    rating_div = recipe_div.find("div", class_="rating")
    rating = rating_div.get_text(strip=True) if rating_div else ""

    # Ingredients — each <p> inside the ingredients div
    ing_div = recipe_div.find("div", class_="ingredients")
    ingredients = []
    if ing_div:
        for p in ing_div.find_all("p"):
            text = p.get_text(strip=True)
            if text:
                ingredients.append(text)

    # Directions and Notes — found via subhead divs
    directions = ""
    notes = ""
    subheads = recipe_div.find_all("div", class_="subhead")
    for subhead in subheads:
        label = subhead.get_text(strip=True).lower()
        # Collect sibling content until next subhead or end
        content_parts = []
        sibling = subhead.find_next_sibling()
        while sibling and "subhead" not in (sibling.get("class") or []):
            text = sibling.get_text(separator="\n", strip=True)
            if text:
                content_parts.append(text)
            sibling = sibling.find_next_sibling()
        content = "\n".join(content_parts)

        if "direction" in label:
            directions = content
        elif "note" in label:
            notes = content

    # If no subhead-based directions, try a plain .text div as fallback
    if not directions:
        text_div = recipe_div.find("div", class_="text")
        if text_div:
            directions = text_div.get_text(separator="\n", strip=True)

    return {
        "name": name,
        "slug": slugify(name),
        "categories": categories,
        "cook_time": metadata.get("cook_time", ""),
        "prep_time": metadata.get("prep_time", ""),
        "total_time": metadata.get("total_time", ""),
        "servings": metadata.get("servings", ""),
        "source": metadata.get("source", ""),
        "rating": rating,
        "ingredients": ingredients,
        "directions": directions,
        "notes": notes,
    }


def upload_to_kv(key: str, value: str) -> bool:
    """Upload a key-value pair to Cloudflare KV via wrangler."""
    result = subprocess.run(
        [
            "npx", "wrangler", "kv", "key", "put",
            "--namespace-id", KV_NAMESPACE_ID,
            key, value,
        ],
        capture_output=True,
        text=True,
    )
    return result.returncode == 0


def main():
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <path-to-Recipes-folder>")
        sys.exit(1)

    recipes_dir = Path(sys.argv[1])
    if not recipes_dir.is_dir():
        print(f"Error: {recipes_dir} is not a directory")
        sys.exit(1)

    html_files = sorted(
        f for f in recipes_dir.glob("*.html")
        if not f.name.startswith(".") and f.name != "index.html"
    )

    print(f"Found {len(html_files)} recipe files\n")

    success = 0
    failed = 0

    for i, filepath in enumerate(html_files, 1):
        print(f"[{i}/{len(html_files)}] {filepath.name} ... ", end="", flush=True)

        recipe = parse_recipe(filepath)
        if not recipe:
            print("SKIP (no recipe div found)")
            failed += 1
            continue

        value = json.dumps(recipe, ensure_ascii=False)
        if upload_to_kv(recipe["slug"], value):
            print(f"OK -> {recipe['slug']}")
            success += 1
        else:
            print("UPLOAD FAILED")
            failed += 1

    print(f"\nDone: {success} uploaded, {failed} failed/skipped")


if __name__ == "__main__":
    main()
