export interface Ingredient {
  id: string;
  name: string;
  raw_text: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  recipe_id: string;
}

export interface IngredientInsert {
  name: string;
  raw_text: string;
  quantity?: number | null;
  unit?: string | null;
  category?: string | null;
  recipe_id: string;
}
