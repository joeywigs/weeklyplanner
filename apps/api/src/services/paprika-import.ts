import { scanRecipeForTreeNuts } from '@mealflow/shared';
import { parseIngredient, categorizeIngredient } from '@mealflow/shared';
import { getRecipeByPaprikaUid, createRecipe, updateRecipe, bulkInsertIngredients } from '../db/queries';
import type { Recipe } from '@mealflow/shared';

// ---------------------------------------------------------------------------
// Paprika file format types
// ---------------------------------------------------------------------------

/**
 * A .paprikarecipes file is a gzip archive containing individual
 * .paprikarecipe files, each of which is a gzip-compressed JSON object.
 */
interface PaprikaRecipeJson {
  uid: string;
  name: string;
  ingredients: string;       // newline-separated ingredient list
  directions: string;
  description: string;
  notes: string;
  prep_time: string;         // e.g. "15 min"
  cook_time: string;
  total_time: string;
  servings: string;          // e.g. "4" or "4-6"
  source: string;
  source_url: string;
  image_url: string;
  photo_data: string | null; // base64 encoded image
  categories: string[];
  rating: number;            // 0-5
  difficulty: string;
  created: string;
  hash: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse a time string like "15 min", "1 hour 30 min", "1h30m" into minutes.
 */
function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr || timeStr.trim() === '') return null;

  const lower = timeStr.toLowerCase().trim();

  // Try "Xh Ym" or "X hour(s) Y min(utes)"
  let totalMinutes = 0;
  let matched = false;

  const hourMatch = lower.match(/(\d+)\s*(?:h(?:ours?)?)/);
  if (hourMatch) {
    totalMinutes += parseInt(hourMatch[1], 10) * 60;
    matched = true;
  }

  const minMatch = lower.match(/(\d+)\s*(?:m(?:in(?:utes?)?)?)/);
  if (minMatch) {
    totalMinutes += parseInt(minMatch[1], 10);
    matched = true;
  }

  if (matched) return totalMinutes;

  // Try plain number (assume minutes)
  const plainNum = parseInt(lower, 10);
  if (!isNaN(plainNum)) return plainNum;

  return null;
}

/**
 * Parse a servings string like "4", "4-6", "serves 4" into a number.
 */
function parseServings(servingsStr: string): number {
  if (!servingsStr) return 4;
  const match = servingsStr.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 4;
}

/**
 * Map Paprika difficulty to our effort_level (1=easy, 2=medium, 3=hard).
 */
function mapDifficulty(difficulty: string): 1 | 2 | 3 {
  const lower = (difficulty ?? '').toLowerCase();
  if (lower.includes('easy') || lower.includes('simple') || lower.includes('quick')) return 1;
  if (lower.includes('hard') || lower.includes('difficult') || lower.includes('complex')) return 3;
  return 2; // default to medium
}

/**
 * Decompress gzip data using the Web Streams API (available in Workers).
 */
async function decompressGzip(compressedData: ArrayBuffer): Promise<ArrayBuffer> {
  const ds = new DecompressionStream('gzip');
  const writer = ds.writable.getWriter();
  writer.write(compressedData);
  writer.close();

  const reader = ds.readable.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  // Concatenate all chunks
  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result.buffer;
}

/**
 * Extract individual recipe files from the outer gzip archive.
 *
 * The .paprikarecipes format is a gzip-compressed file that contains
 * individual .paprikarecipe entries. Each entry is itself a gzip-compressed
 * JSON file. The outer archive uses a simple concatenation format similar
 * to a ZIP file with local file headers.
 *
 * In practice, most Paprika exports use a ZIP container (not gzip) for the
 * outer archive. We handle both cases.
 */
async function extractPaprikaArchive(buffer: ArrayBuffer): Promise<PaprikaRecipeJson[]> {
  const bytes = new Uint8Array(buffer);
  const recipes: PaprikaRecipeJson[] = [];

  // Check for ZIP magic number (PK\x03\x04)
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    // ZIP format — iterate through local file entries
    let pos = 0;

    while (pos < bytes.length - 30) {
      // Check for local file header signature
      if (
        bytes[pos] !== 0x50 ||
        bytes[pos + 1] !== 0x4b ||
        bytes[pos + 2] !== 0x03 ||
        bytes[pos + 3] !== 0x04
      ) {
        break; // No more local file headers
      }

      // Parse the local file header
      const view = new DataView(buffer, pos);
      const compressedSize = view.getUint32(18, true);
      const fileNameLength = view.getUint16(26, true);
      const extraFieldLength = view.getUint16(28, true);

      const fileNameBytes = bytes.slice(pos + 30, pos + 30 + fileNameLength);
      const fileName = new TextDecoder().decode(fileNameBytes);

      const dataStart = pos + 30 + fileNameLength + extraFieldLength;
      const fileData = buffer.slice(dataStart, dataStart + compressedSize);

      if (fileName.endsWith('.paprikarecipe')) {
        try {
          // Each .paprikarecipe is gzip-compressed JSON
          const decompressed = await decompressGzip(fileData);
          const jsonStr = new TextDecoder().decode(decompressed);
          const recipeJson = JSON.parse(jsonStr) as PaprikaRecipeJson;
          recipes.push(recipeJson);
        } catch (err) {
          console.error(`Failed to parse recipe entry: ${fileName}`, err);
        }
      }

      pos = dataStart + compressedSize;
    }
  } else {
    // Try as a single gzip-compressed JSON (legacy or single recipe)
    try {
      const decompressed = await decompressGzip(buffer);
      const jsonStr = new TextDecoder().decode(decompressed);
      const parsed = JSON.parse(jsonStr);

      if (Array.isArray(parsed)) {
        recipes.push(...(parsed as PaprikaRecipeJson[]));
      } else {
        recipes.push(parsed as PaprikaRecipeJson);
      }
    } catch (err) {
      console.error('Failed to decompress outer archive as gzip', err);
      throw new Error('Unable to parse .paprikarecipes file');
    }
  }

  return recipes;
}

// ---------------------------------------------------------------------------
// Main import function
// ---------------------------------------------------------------------------

/**
 * Parse a .paprikarecipes file, run tree-nut detection on each recipe,
 * parse ingredients, optionally upload images to R2, and insert into D1.
 *
 * Handles deduplication via paprika_uid — if a recipe with the same UID
 * already exists, it is updated rather than duplicated.
 */
export async function parsePaprikaFile(
  buffer: ArrayBuffer,
  db: D1Database,
  imagesBucket: R2Bucket,
): Promise<Recipe[]> {
  const paprikaRecipes = await extractPaprikaArchive(buffer);
  const importedRecipes: Recipe[] = [];

  for (const pr of paprikaRecipes) {
    // Parse ingredients from the newline-separated string
    const rawIngredientLines = (pr.ingredients ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const parsedIngredients = rawIngredientLines.map((raw) => {
      const parsed = parseIngredient(raw);
      return {
        name: parsed.name,
        raw_text: parsed.raw_text,
        quantity: parsed.quantity,
        unit: parsed.unit,
        category: categorizeIngredient(parsed.name),
      };
    });

    // Run tree nut detection
    const treeNutResult = scanRecipeForTreeNuts({
      title: pr.name ?? '',
      ingredients: rawIngredientLines,
      directions: pr.directions ?? '',
      notes: pr.notes ?? '',
    });

    // Handle image upload to R2
    let imageUrl: string | null = null;
    if (pr.photo_data) {
      try {
        const imageBuffer = Uint8Array.from(atob(pr.photo_data), (c) => c.charCodeAt(0));
        const imageKey = `recipes/${pr.uid ?? crypto.randomUUID()}.jpg`;
        await imagesBucket.put(imageKey, imageBuffer, {
          httpMetadata: { contentType: 'image/jpeg' },
        });
        imageUrl = imageKey;
      } catch (err) {
        console.error(`Failed to upload image for recipe "${pr.name}"`, err);
      }
    } else if (pr.image_url) {
      imageUrl = pr.image_url;
    }

    // Build recipe data
    const recipeData = {
      paprika_uid: pr.uid ?? null,
      title: pr.name ?? 'Untitled Recipe',
      directions: pr.directions ?? '',
      prep_time_minutes: parseTimeToMinutes(pr.prep_time),
      cook_time_minutes: parseTimeToMinutes(pr.cook_time),
      total_time_minutes: parseTimeToMinutes(pr.total_time),
      servings: parseServings(pr.servings),
      effort_level: mapDifficulty(pr.difficulty) as 1 | 2 | 3,
      categories: pr.categories ?? [],
      tags: [] as string[],
      image_url: imageUrl,
      source: pr.source_url || pr.source || null,
      last_made: null,
      times_made: 0,
      rating: pr.rating > 0 ? pr.rating : null,
      notes: [pr.notes, pr.description].filter(Boolean).join('\n\n'),
      contains_tree_nuts: treeNutResult.containsTreeNuts,
    };

    // Check for existing recipe with same paprika_uid (deduplication)
    let recipe: Recipe;
    if (pr.uid) {
      const existing = await getRecipeByPaprikaUid(db, pr.uid);
      if (existing) {
        recipe = await updateRecipe(db, existing.id, recipeData);
        // Replace ingredients
        await db.prepare('DELETE FROM ingredients WHERE recipe_id = ?').bind(existing.id).run();
        if (parsedIngredients.length > 0) {
          await bulkInsertIngredients(
            db,
            parsedIngredients.map((ing) => ({ ...ing, recipe_id: existing.id })),
          );
        }
      } else {
        recipe = await createRecipe(db, recipeData);
        if (parsedIngredients.length > 0) {
          await bulkInsertIngredients(
            db,
            parsedIngredients.map((ing) => ({ ...ing, recipe_id: recipe.id })),
          );
        }
      }
    } else {
      recipe = await createRecipe(db, recipeData);
      if (parsedIngredients.length > 0) {
        await bulkInsertIngredients(
          db,
          parsedIngredients.map((ing) => ({ ...ing, recipe_id: recipe.id })),
        );
      }
    }

    importedRecipes.push(recipe);
  }

  return importedRecipes;
}
