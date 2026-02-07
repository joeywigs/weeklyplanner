export interface ShoppingList {
  id: string;
  meal_plan_id: string;
  created_at: string;
  finalized_at: string | null;
}

export interface ShoppingListInsert {
  meal_plan_id: string;
}
