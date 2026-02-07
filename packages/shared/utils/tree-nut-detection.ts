const TREE_NUT_KEYWORDS = [
  'almond',
  'walnut',
  'pecan',
  'cashew',
  'pistachio',
  'macadamia',
  'brazil nut',
  'hazelnut',
  'filbert',
  'pine nut',
  'praline',
  'marzipan',
  'nougat',
  'gianduja',
  // Common derivatives
  'almond flour',
  'almond milk',
  'almond butter',
  'almond extract',
  'walnut oil',
  'pecan pie',
  'cashew cream',
  'cashew butter',
  'pistachio cream',
  'hazelnut spread',
  'pine nuts',
  'marcona',
  'frangipane',
  'amaretti',
  'nutella',
];

// Build a regex that matches any tree nut keyword as a whole word (case-insensitive)
const TREE_NUT_PATTERN = new RegExp(
  TREE_NUT_KEYWORDS
    .sort((a, b) => b.length - a.length) // longest first to avoid partial matches
    .map((kw) => kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|'),
  'i'
);

export interface TreeNutScanResult {
  containsTreeNuts: boolean;
  matchedKeywords: string[];
}

/**
 * Scan text (ingredient list, recipe title, directions) for tree nut references.
 * Returns which keywords matched, if any.
 */
export function scanForTreeNuts(text: string): TreeNutScanResult {
  const lowerText = text.toLowerCase();
  const matchedKeywords: string[] = [];

  for (const keyword of TREE_NUT_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      matchedKeywords.push(keyword);
    }
  }

  return {
    containsTreeNuts: matchedKeywords.length > 0,
    matchedKeywords: [...new Set(matchedKeywords)],
  };
}

/**
 * Scan all parts of a recipe for tree nuts.
 * Checks title, ingredients (raw text), directions, and notes.
 */
export function scanRecipeForTreeNuts(recipe: {
  title: string;
  ingredients: string[];
  directions: string;
  notes?: string;
}): TreeNutScanResult {
  const allText = [
    recipe.title,
    ...recipe.ingredients,
    recipe.directions,
    recipe.notes ?? '',
  ].join(' ');

  return scanForTreeNuts(allText);
}

export { TREE_NUT_KEYWORDS, TREE_NUT_PATTERN };
