/**
 * Parse an ingredient string like "2 1/2 cups flour" into parts,
 * and scale quantities when servings change.
 */

const FRACTION_MAP: Record<string, number> = {
  '¼': 0.25, '½': 0.5, '¾': 0.75,
  '⅓': 1 / 3, '⅔': 2 / 3,
  '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
};

// Matches: whole, fraction (slash or unicode), and the rest
const QTY_RE = /^(\d+)?\s*(\d+\/\d+|[¼½¾⅓⅔⅛⅜⅝⅞])?\s*(.*)/;

interface ParsedIngredient {
  quantity: number | null;
  rest: string;
  original: string;
}

export function parseIngredient(text: string): ParsedIngredient {
  const match = QTY_RE.exec(text.trim());
  if (!match) return { quantity: null, rest: text, original: text };

  const [, wholePart, fracPart, rest] = match;

  if (!wholePart && !fracPart) {
    return { quantity: null, rest: text.trim(), original: text };
  }

  let qty = 0;
  if (wholePart) qty += parseInt(wholePart, 10);
  if (fracPart) {
    if (FRACTION_MAP[fracPart]) {
      qty += FRACTION_MAP[fracPart];
    } else if (fracPart.includes('/')) {
      const [n, d] = fracPart.split('/');
      qty += parseInt(n, 10) / parseInt(d, 10);
    }
  }

  return { quantity: qty, rest: rest.trim(), original: text };
}

function formatQuantity(n: number): string {
  // Common fractions for nice display
  const fractions: [number, string][] = [
    [0.125, '⅛'], [0.25, '¼'], [0.333, '⅓'], [0.375, '⅜'],
    [0.5, '½'], [0.625, '⅝'], [0.667, '⅔'], [0.75, '¾'], [0.875, '⅞'],
  ];

  const whole = Math.floor(n);
  const frac = n - whole;

  if (frac < 0.05) return whole.toString();

  for (const [val, sym] of fractions) {
    if (Math.abs(frac - val) < 0.05) {
      return whole > 0 ? `${whole} ${sym}` : sym;
    }
  }

  // Fall back to decimal, rounded to 1 place
  return n % 1 === 0 ? n.toString() : n.toFixed(1);
}

export function scaleIngredient(
  text: string,
  originalServings: number,
  newServings: number
): string {
  if (originalServings <= 0 || newServings <= 0) return text;
  if (originalServings === newServings) return text;

  const parsed = parseIngredient(text);
  if (parsed.quantity === null) return text;

  const ratio = newServings / originalServings;
  const scaled = parsed.quantity * ratio;
  return `${formatQuantity(scaled)} ${parsed.rest}`;
}
