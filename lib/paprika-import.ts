import type { Recipe } from './types';

interface PaprikaRecipeJSON {
  name?: string;
  categories?: string;
  prep_time?: string;
  cook_time?: string;
  total_time?: string;
  servings?: string;
}

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
  let offset = 0;

  while (offset < buffer.byteLength - 4) {
    // Local file header signature: PK\x03\x04
    if (view.getUint32(offset, true) !== 0x04034b50) break;

    const compressionMethod = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const filenameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);

    const filenameStart = offset + 30;
    const filename = new TextDecoder().decode(
      bytes.slice(filenameStart, filenameStart + filenameLength)
    );

    const dataStart = filenameStart + filenameLength + extraLength;
    const compressedData = bytes.slice(dataStart, dataStart + compressedSize);

    entries.push({ filename, compressionMethod, compressedData });
    offset = dataStart + compressedSize;
  }

  return entries;
}

function paprikaToRecipe(raw: PaprikaRecipeJSON): Recipe | null {
  if (!raw.name) return null;

  const tags: string[] = [];
  if (raw.categories) {
    for (const cat of raw.categories.split(',')) {
      const trimmed = cat.trim().toLowerCase();
      if (trimmed) tags.push(trimmed);
    }
  }

  return {
    id: generateId(),
    name: raw.name,
    prepTime: raw.prep_time || raw.total_time || '',
    tags,
  };
}

export async function parsePaprikaFile(file: File): Promise<Recipe[]> {
  const buffer = await file.arrayBuffer();
  const recipes: Recipe[] = [];

  // Try as a .paprikarecipes zip bundle
  try {
    const entries = parseZipEntries(buffer);
    if (entries.length > 0) {
      for (const entry of entries) {
        try {
          let data: Uint8Array;
          if (entry.compressionMethod === 8) {
            data = await decompressStream(
              entry.compressedData,
              'deflate-raw'
            );
          } else {
            data = entry.compressedData;
          }

          // Each .paprikarecipe is gzipped JSON
          let jsonStr: string;
          try {
            const decompressed = await decompressStream(data, 'gzip');
            jsonStr = new TextDecoder().decode(decompressed);
          } catch {
            jsonStr = new TextDecoder().decode(data);
          }

          const raw = JSON.parse(jsonStr) as PaprikaRecipeJSON;
          const recipe = paprikaToRecipe(raw);
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
    const recipe = paprikaToRecipe(raw);
    if (recipe) recipes.push(recipe);
  } catch {
    // Not a valid single recipe file
  }

  return recipes;
}
