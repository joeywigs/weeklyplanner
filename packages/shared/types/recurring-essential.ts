export interface RecurringEssential {
  id: string;
  item_name: string;
  quantity: number | null;
  unit: string | null;
  category: string;
}

export interface RecurringEssentialInsert {
  item_name: string;
  quantity?: number | null;
  unit?: string | null;
  category?: string;
}
