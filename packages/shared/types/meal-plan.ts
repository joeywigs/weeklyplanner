export interface MealPlan {
  id: string;
  week_start: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MealPlanInsert {
  week_start: string;
  created_by: string;
}
