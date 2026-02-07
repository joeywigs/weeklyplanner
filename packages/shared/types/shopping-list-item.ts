export interface ShoppingListItem {
  id: string;
  shopping_list_id: string;
  ingredient_name: string;
  quantity: number | null;
  unit: string | null;
  category: string;
  source_recipes: string[];
  have_it: boolean;
  is_recurring_essential: boolean;
}

export interface ShoppingListItemInsert {
  shopping_list_id: string;
  ingredient_name: string;
  quantity?: number | null;
  unit?: string | null;
  category?: string;
  source_recipes?: string[];
  have_it?: boolean;
  is_recurring_essential?: boolean;
}
