export interface Recipe {
  id: string;
  paprika_uid: string | null;
  title: string;
  directions: string;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  total_time_minutes: number | null;
  servings: number;
  effort_level: 1 | 2 | 3;
  categories: string[];
  tags: string[];
  image_url: string | null;
  source: string | null;
  last_made: string | null;
  times_made: number;
  rating: number | null;
  notes: string;
  contains_tree_nuts: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecipeInsert {
  paprika_uid?: string | null;
  title: string;
  directions: string;
  prep_time_minutes?: number | null;
  cook_time_minutes?: number | null;
  total_time_minutes?: number | null;
  servings?: number;
  effort_level?: 1 | 2 | 3;
  categories?: string[];
  tags?: string[];
  image_url?: string | null;
  source?: string | null;
  last_made?: string | null;
  times_made?: number;
  rating?: number | null;
  notes?: string;
  contains_tree_nuts?: boolean;
}
