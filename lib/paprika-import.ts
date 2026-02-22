import type { Recipe } from './types';

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

async function decompressStream(
  data: Uint8Array,
  format: CompressionFormat
): Promise<Uint8Array> {
  const ds = new DecompressionStream(format);
  const writer = ds.writable.getWriter();
  const reader = ds.readable.getReader();

  writer.write(new Uint8Array(data) as unknown as ArrayBuffer);
  writer.close();

  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

interface ZipEntry {
  filename: string;
  compressionMethod: number;
  compressedData: Uint8Array;
}

function parseZipEntries(buffer: ArrayBuffer): ZipEntry[] {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const entries: ZipEntry[] = [];

  // Find the End of Central Directory record (scans backwards)
  let eocdOffset = -1;
  for (let i = buffer.byteLength - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) return entries;

  const cdSize = view.getUint32(eocdOffset + 12, true);
  const cdOffset = view.getUint32(eocdOffset + 16, true);

  // Walk the central directory to get reliable sizes
  let pos = cdOffset;
  const cdEnd = cdOffset + cdSize;
  while (pos < cdEnd && pos + 46 <= buffer.byteLength) {
    // Central directory file header signature: PK\x01\x02
    if (view.getUint32(pos, true) !== 0x02014b50) break;

    const compressionMethod = view.getUint16(pos + 10, true);
    const compressedSize = view.getUint32(pos + 20, true);
    const filenameLength = view.getUint16(pos + 28, true);
    const extraLength = view.getUint16(pos + 30, true);
    const commentLength = view.getUint16(pos + 32, true);
    const localHeaderOffset = view.getUint32(pos + 42, true);

    const filename = new TextDecoder().decode(
      bytes.slice(pos + 46, pos + 46 + filenameLength)
    );

    // Read local file header to find where data actually starts
    const localFilenameLength = view.getUint16(localHeaderOffset + 26, true);
    const localExtraLength = view.getUint16(localHeaderOffset + 28, true);
    const dataStart = localHeaderOffset + 30 + localFilenameLength + localExtraLength;

    const compressedData = bytes.slice(dataStart, dataStart + compressedSize);
    entries.push({ filename, compressionMethod, compressedData });

    pos += 46 + filenameLength + extraLength + commentLength;
  }

  return entries;
}

interface ParsedMetadata {
  prepTime: string;
  cookTime: string;
  totalTime: string;
  servings: string;
  source: string;
}

function parseMetadata(text: string): ParsedMetadata {
  const m = (label: string) => {
    const re = new RegExp(label + ':\\s*(.+?)(?=(?:Prep Time|Cook Time|Total Time|Servings|Source):|$)');
    return re.exec(text)?.[1]?.trim() || '';
  };
  return {
    prepTime: m('Prep Time'),
    cookTime: m('Cook Time'),
    totalTime: m('Total Time'),
    servings: m('Servings'),
    source: m('Source'),
  };
}

function parseTags(text: string): string[] {
  const tags: string[] = [];
  for (const cat of text.split(',')) {
    const trimmed = cat.trim().toLowerCase();
    if (trimmed) tags.push(trimmed);
  }
  return tags;
}

function parseHtmlRecipe(html: string): Recipe | null {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const recipe = doc.querySelector('.recipe');
  if (!recipe) return null;

  const name = recipe.querySelector('.name')?.textContent?.trim();
  if (!name) return null;

  const catText = recipe.querySelector('.categories')?.textContent?.trim() || '';
  const tags = parseTags(catText);

  const metaText = recipe.querySelector('.metadata')?.textContent?.trim() || '';
  const meta = parseMetadata(metaText);

  // Ingredients: each <p> inside .ingredients
  const ingredients: string[] = [];
  const ingDiv = recipe.querySelector('.ingredients');
  if (ingDiv) {
    for (const p of Array.from(ingDiv.querySelectorAll('p'))) {
      const t = p.textContent?.trim();
      if (t) ingredients.push(t);
    }
  }

  // Directions and Notes: found via .subhead divs
  let directions = '';
  let notes = '';
  for (const subhead of Array.from(recipe.querySelectorAll('.subhead'))) {
    const label = (subhead.textContent || '').trim().toLowerCase();
    const parts: string[] = [];
    let sibling = subhead.nextElementSibling;
    while (sibling && !sibling.classList.contains('subhead')) {
      const t = sibling.textContent?.trim();
      if (t) parts.push(t);
      sibling = sibling.nextElementSibling;
    }
    const content = parts.join('\n');
    if (label.includes('direction')) directions = content;
    else if (label.includes('note')) notes = content;
  }

  // Fallback: .text div for directions
  if (!directions) {
    const textDiv = recipe.querySelector('.text');
    if (textDiv) directions = textDiv.textContent?.trim() || '';
  }

  return {
    id: generateId(),
    name,
    prepTime: meta.prepTime || meta.cookTime || meta.totalTime,
    cookTime: meta.cookTime,
    totalTime: meta.totalTime,
    servings: meta.servings,
    source: meta.source,
    tags,
    ingredients,
    directions,
    notes,
  };
}

interface PaprikaRecipeJSON {
  name?: string;
  categories?: string;
  prep_time?: string;
  cook_time?: string;
  total_time?: string;
  servings?: string;
  source?: string;
  ingredients?: string;
  directions?: string;
  notes?: string;
}

function paprikaJsonToRecipe(raw: PaprikaRecipeJSON): Recipe | null {
  if (!raw.name) return null;

  const tags = parseTags(raw.categories || '');

  return {
    id: generateId(),
    name: raw.name,
    prepTime: raw.prep_time || raw.cook_time || raw.total_time || '',
    cookTime: raw.cook_time || '',
    totalTime: raw.total_time || '',
    servings: raw.servings || '',
    source: raw.source || '',
    tags,
    ingredients: raw.ingredients ? raw.ingredients.split('\n').filter(Boolean) : [],
    directions: raw.directions || '',
    notes: raw.notes || '',
  };
}

export async function parsePaprikaFile(file: File): Promise<Recipe[]> {
  const buffer = await file.arrayBuffer();
  const recipes: Recipe[] = [];

  try {
    const entries = parseZipEntries(buffer);
    if (entries.length > 0) {
      for (const entry of entries) {
        try {
          // Skip directories, dotfiles, index.html, __MACOSX
          const basename = entry.filename.split('/').pop() || '';
          if (
            !basename ||
            basename.startsWith('.') ||
            basename === 'index.html' ||
            entry.filename.includes('__MACOSX')
          ) {
            continue;
          }

          let data: Uint8Array;
          if (entry.compressionMethod === 8) {
            data = await decompressStream(entry.compressedData, 'deflate-raw');
          } else {
            data = entry.compressedData;
          }

          // HTML files — parse with DOMParser
          if (basename.endsWith('.html') || basename.endsWith('.htm')) {
            const html = new TextDecoder().decode(data);
            const recipe = parseHtmlRecipe(html);
            if (recipe) recipes.push(recipe);
            continue;
          }

          // Legacy .paprikarecipe files — gzipped JSON
          let jsonStr: string;
          try {
            const decompressed = await decompressStream(data, 'gzip');
            jsonStr = new TextDecoder().decode(decompressed);
          } catch {
            jsonStr = new TextDecoder().decode(data);
          }

          const raw = JSON.parse(jsonStr) as PaprikaRecipeJSON;
          const recipe = paprikaJsonToRecipe(raw);
          if (recipe) recipes.push(recipe);
        } catch {
          // Skip invalid entries
        }
      }
      if (recipes.length > 0) return recipes;
    }
  } catch {
    // Not a valid zip
  }

  // Try as a single HTML file
  try {
    const html = new TextDecoder().decode(new Uint8Array(buffer));
    const recipe = parseHtmlRecipe(html);
    if (recipe) {
      recipes.push(recipe);
      return recipes;
    }
  } catch {
    // Not valid HTML
  }

  // Try as a single .paprikarecipe (gzipped JSON)
  try {
    const data = new Uint8Array(buffer);
    let jsonStr: string;
    try {
      const decompressed = await decompressStream(data, 'gzip');
      jsonStr = new TextDecoder().decode(decompressed);
    } catch {
      jsonStr = new TextDecoder().decode(data);
    }
    const raw = JSON.parse(jsonStr) as PaprikaRecipeJSON;
    const recipe = paprikaJsonToRecipe(raw);
    if (recipe) recipes.push(recipe);
  } catch {
    // Not a valid single recipe file
  }

  return recipes;
}
