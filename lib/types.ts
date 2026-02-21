export interface DayData {
  dropOff: 'Carly' | 'Joey';
  morningReminders: Reminder[];
  greyLunch: 'pack' | 'school' | null;
  sloaneLunch: 'pack' | 'school' | null;
  hasSchool: boolean;
  eveningActivities: Activity[];
  dinner: string;
}

export interface Reminder {
  id: string;
  text: string;
}

export interface Activity {
  id: string;
  text: string;
}

export interface GroceryItem {
  id: string;
  name: string;
}

export interface CaraNote {
  id: string;
  text: string;
}

export interface SchoolLunchMenu {
  entree: string;
  grill: string;
  express: string;
  vegetable: string;
  fruit: string;
}

export interface WeekState {
  weekOffset: number;
  days: Record<string, DayData>;
  groceryItems: GroceryItem[];
  caraNotes: CaraNote[];
}
