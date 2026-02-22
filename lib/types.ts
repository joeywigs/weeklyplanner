export interface DayData {
  dropOff: 'Carly' | 'Joey';
  morningReminders: Reminder[];
  greyLunch: 'pack' | 'school' | null;
  sloaneLunch: 'pack' | 'school' | null;
  hasSchool: boolean;
  eveningActivities: Activity[];
  dinner: string;
  cook: 'Carly' | 'Joey' | '';
}

export interface Reminder {
  id: string;
  text: string;
}

export interface Activity {
  id: string;
  text: string;
}

export interface CalendarEvent {
  id: string;
  text: string;
  startDate: string;
  endDate: string;
  startTime?: string; // "HH:MM" 24-hour format, absent for all-day events
}

export interface CalendarSource {
  id: string;
  name: string;
  url: string;
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
  entree: string[];
  grill: string[];
  express: string[];
  vegetable: string[];
  fruit: string[];
}

export interface Recipe {
  id: string;
  name: string;
  prepTime: string;
  cookTime: string;
  totalTime: string;
  servings: string;
  source: string;
  tags: string[];
  ingredients: string[];
  directions: string;
  notes: string;
}

export interface WeekState {
  weekOffset: number;
  days: Record<string, DayData>;
  groceryItems: GroceryItem[];
  caraNotes: CaraNote[];
}
