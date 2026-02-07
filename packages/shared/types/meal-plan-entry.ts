export type EveningClassification = 'free' | 'partial' | 'busy';
export type MealStatus = 'suggested' | 'confirmed' | 'eating_out' | 'leftovers';

export interface MealPlanEntry {
  id: string;
  meal_plan_id: string;
  date: string;
  meal_type: 'dinner';
  classification: EveningClassification;
  override_classification: EveningClassification | null;
  recipe_id: string | null;
  status: MealStatus;
  leftover_source_entry_id: string | null;
  headcount: number;
  notes: string | null;
}

export interface MealPlanEntryInsert {
  meal_plan_id: string;
  date: string;
  meal_type?: 'dinner';
  classification: EveningClassification;
  override_classification?: EveningClassification | null;
  recipe_id?: string | null;
  status?: MealStatus;
  leftover_source_entry_id?: string | null;
  headcount?: number;
  notes?: string | null;
}
