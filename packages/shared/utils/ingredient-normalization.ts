/**
 * Basic ingredient parsing and normalization.
 *
 * For MVP, we use rule-based parsing. The CLAUDE.md notes suggest
 * upgrading to LLM-based parsing later for better accuracy.
 */

const UNIT_MAP: Record<string, string> = {
  // Volume
  'tsp': 'tsp',
  'teaspoon': 'tsp',
  'teaspoons': 'tsp',
  'tbsp': 'tbsp',
  'tablespoon': 'tbsp',
  'tablespoons': 'tbsp',
  'cup': 'cup',
  'cups': 'cup',
  'c': 'cup',
  'fl oz': 'fl oz',
  'fluid ounce': 'fl oz',
  'fluid ounces': 'fl oz',
  'pint': 'pint',
  'pints': 'pint',
  'pt': 'pint',
  'quart': 'quart',
  'quarts': 'quart',
  'qt': 'quart',
  'gallon': 'gallon',
  'gallons': 'gallon',
  'gal': 'gallon',
  'ml': 'ml',
  'milliliter': 'ml',
  'milliliters': 'ml',
  'l': 'l',
  'liter': 'l',
  'liters': 'l',
  'litre': 'l',
  'litres': 'l',

  // Weight
  'oz': 'oz',
  'ounce': 'oz',
  'ounces': 'oz',
  'lb': 'lb',
  'lbs': 'lb',
  'pound': 'lb',
  'pounds': 'lb',
  'g': 'g',
  'gram': 'g',
  'grams': 'g',
  'kg': 'kg',
  'kilogram': 'kg',
  'kilograms': 'kg',

  // Count
  'clove': 'clove',
  'cloves': 'clove',
  'piece': 'piece',
  'pieces': 'piece',
  'slice': 'slice',
  'slices': 'slice',
  'can': 'can',
  'cans': 'can',
  'bunch': 'bunch',
  'bunches': 'bunch',
  'head': 'head',
  'heads': 'head',
  'sprig': 'sprig',
  'sprigs': 'sprig',
  'stalk': 'stalk',
  'stalks': 'stalk',
  'package': 'package',
  'packages': 'package',
  'pkg': 'package',
  'bag': 'bag',
  'bags': 'bag',
  'jar': 'jar',
  'jars': 'jar',
  'bottle': 'bottle',
  'bottles': 'bottle',
  'box': 'box',
  'boxes': 'box',
  'pinch': 'pinch',
  'dash': 'dash',
};

const FRACTION_MAP: Record<string, number> = {
  '\u00BC': 0.25,   // ¼
  '\u00BD': 0.5,    // ½
  '\u00BE': 0.75,   // ¾
  '\u2153': 0.333,  // ⅓
  '\u2154': 0.667,  // ⅔
  '\u215B': 0.125,  // ⅛
  '\u215C': 0.375,  // ⅜
  '\u215D': 0.625,  // ⅝
  '\u215E': 0.875,  // ⅞
};

export interface ParsedIngredient {
  name: string;
  quantity: number | null;
  unit: string | null;
  raw_text: string;
}

/**
 * Parse a raw ingredient string into structured data.
 * Examples:
 *   "2 lbs boneless skinless chicken breast, cubed" -> { name: "chicken breast", quantity: 2, unit: "lb" }
 *   "1/2 cup olive oil" -> { name: "olive oil", quantity: 0.5, unit: "cup" }
 *   "salt and pepper to taste" -> { name: "salt and pepper", quantity: null, unit: null }
 */
export function parseIngredient(raw: string): ParsedIngredient {
  const raw_text = raw.trim();
  let remaining = raw_text;

  // Remove parenthetical notes like "(about 2 cups)" or "(optional)"
  remaining = remaining.replace(/\(.*?\)/g, '').trim();

  // Remove trailing prep instructions after comma: "chicken breast, cubed" -> "chicken breast"
  // But keep things like "salt and pepper" together

  // Parse quantity
  let quantity: number | null = null;

  // Check for unicode fractions first
  for (const [frac, val] of Object.entries(FRACTION_MAP)) {
    const fracPattern = new RegExp(`^(\\d+\\s*)?${frac}`);
    const fracMatch = remaining.match(fracPattern);
    if (fracMatch) {
      const whole = fracMatch[1] ? parseInt(fracMatch[1].trim(), 10) : 0;
      quantity = whole + val;
      remaining = remaining.slice(fracMatch[0].length).trim();
      break;
    }
  }

  // Check for "X/Y" fractions or "N X/Y" mixed numbers
  if (quantity === null) {
    const mixedMatch = remaining.match(/^(\d+)\s+(\d+)\/(\d+)/);
    if (mixedMatch && mixedMatch[1] && mixedMatch[2] && mixedMatch[3]) {
      quantity = parseInt(mixedMatch[1], 10) + parseInt(mixedMatch[2], 10) / parseInt(mixedMatch[3], 10);
      remaining = remaining.slice(mixedMatch[0].length).trim();
    } else {
      const fractionMatch = remaining.match(/^(\d+)\/(\d+)/);
      if (fractionMatch && fractionMatch[1] && fractionMatch[2]) {
        quantity = parseInt(fractionMatch[1], 10) / parseInt(fractionMatch[2], 10);
        remaining = remaining.slice(fractionMatch[0].length).trim();
      } else {
        const numMatch = remaining.match(/^(\d+\.?\d*)/);
        if (numMatch && numMatch[1]) {
          quantity = parseFloat(numMatch[1]);
          remaining = remaining.slice(numMatch[0].length).trim();
        }
      }
    }
  }

  // Parse unit
  let unit: string | null = null;
  const remainingLower = remaining.toLowerCase();

  // Sort unit keys by length (longest first) to match "fluid ounces" before "fl"
  const sortedUnits = Object.keys(UNIT_MAP).sort((a, b) => b.length - a.length);
  for (const unitKey of sortedUnits) {
    if (remainingLower.startsWith(unitKey + ' ') || remainingLower.startsWith(unitKey + '.')) {
      unit = UNIT_MAP[unitKey] ?? null;
      remaining = remaining.slice(unitKey.length).trim();
      if (remaining.startsWith('.')) {
        remaining = remaining.slice(1).trim();
      }
      // Remove "of" after unit: "cup of flour" -> "flour"
      if (remaining.toLowerCase().startsWith('of ')) {
        remaining = remaining.slice(3).trim();
      }
      break;
    }
    // Also check if the unit is the entire remaining string (rare but possible)
    if (remainingLower === unitKey) {
      unit = UNIT_MAP[unitKey] ?? null;
      remaining = '';
      break;
    }
  }

  // Clean up the ingredient name
  let name = remaining
    .replace(/,.*$/, '')  // remove everything after comma (prep instructions)
    .replace(/\s+/g, ' ') // collapse whitespace
    .trim()
    .toLowerCase();

  // Remove leading articles
  name = name.replace(/^(a |an |the )/, '');

  // Remove trailing periods
  name = name.replace(/\.$/, '');

  return {
    name: name || raw_text.toLowerCase(),
    quantity,
    unit,
    raw_text,
  };
}

/**
 * Normalize an ingredient name for comparison and deduplication.
 * Makes names more consistent for grouping in shopping lists.
 */
export function normalizeIngredientName(name: string): string {
  let normalized = name.toLowerCase().trim();

  // Common substitutions for deduplication
  const substitutions: [RegExp, string][] = [
    [/\bboneless\b\s*/g, ''],
    [/\bskinless\b\s*/g, ''],
    [/\bfresh\b\s*/g, ''],
    [/\bfrozen\b\s*/g, ''],
    [/\bdried\b\s*/g, ''],
    [/\bground\b\s*/g, ''],
    [/\bminced\b\s*/g, ''],
    [/\bchopped\b\s*/g, ''],
    [/\bdiced\b\s*/g, ''],
    [/\bsliced\b\s*/g, ''],
    [/\bshredded\b\s*/g, ''],
    [/\bcrushed\b\s*/g, ''],
    [/\blarge\b\s*/g, ''],
    [/\bsmall\b\s*/g, ''],
    [/\bmedium\b\s*/g, ''],
    [/\s+/g, ' '],
  ];

  for (const [pattern, replacement] of substitutions) {
    normalized = normalized.replace(pattern, replacement);
  }

  return normalized.trim();
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  produce: [
    'onion', 'garlic', 'tomato', 'potato', 'carrot', 'celery', 'pepper',
    'lettuce', 'spinach', 'kale', 'broccoli', 'cauliflower', 'zucchini',
    'squash', 'cucumber', 'mushroom', 'avocado', 'lemon', 'lime', 'orange',
    'apple', 'banana', 'berry', 'berries', 'cilantro', 'parsley', 'basil',
    'mint', 'thyme', 'rosemary', 'ginger', 'jalapeno', 'corn', 'peas',
    'green bean', 'asparagus', 'cabbage', 'beet', 'radish', 'scallion',
    'shallot', 'leek', 'fennel', 'artichoke', 'eggplant', 'sweet potato',
  ],
  dairy: [
    'milk', 'cheese', 'butter', 'cream', 'yogurt', 'sour cream',
    'cream cheese', 'mozzarella', 'cheddar', 'parmesan', 'ricotta',
    'feta', 'gouda', 'brie', 'egg', 'eggs', 'half and half', 'whipping cream',
    'heavy cream', 'buttermilk',
  ],
  meat: [
    'chicken', 'beef', 'pork', 'turkey', 'lamb', 'sausage', 'bacon',
    'ham', 'steak', 'ground beef', 'ground turkey', 'ground pork',
    'shrimp', 'salmon', 'tuna', 'cod', 'tilapia', 'fish', 'seafood',
    'crab', 'lobster', 'scallop', 'mussels', 'clams', 'anchovy',
    'prosciutto', 'pepperoni', 'salami',
  ],
  pantry: [
    'flour', 'sugar', 'salt', 'pepper', 'oil', 'vinegar', 'soy sauce',
    'rice', 'pasta', 'noodle', 'bread crumb', 'broth', 'stock',
    'tomato paste', 'tomato sauce', 'canned', 'beans', 'lentils',
    'chickpea', 'coconut milk', 'honey', 'maple syrup', 'mustard',
    'ketchup', 'mayonnaise', 'hot sauce', 'worcestershire', 'cumin',
    'paprika', 'chili powder', 'oregano', 'cinnamon', 'nutmeg',
    'vanilla', 'baking soda', 'baking powder', 'cornstarch', 'yeast',
    'cocoa', 'chocolate', 'peanut butter', 'jam', 'jelly',
  ],
  frozen: [
    'frozen', 'ice cream', 'frozen vegetable', 'frozen fruit',
    'frozen pizza', 'frozen dinner',
  ],
  bakery: [
    'bread', 'bun', 'roll', 'tortilla', 'pita', 'naan', 'bagel',
    'croissant', 'muffin', 'cake', 'pie crust',
  ],
};

/**
 * Guess the grocery category for an ingredient name.
 */
export function categorizeIngredient(name: string): string {
  const lower = name.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return category;
      }
    }
  }

  return 'other';
}
