export interface DayData {
  dropOff: 'Carly' | 'Joey' | 'Other';
  pickUp: 'Carly' | 'Joey' | 'Other' | '';
  morningReminders: Reminder[];
  greyLunch: 'pack' | 'school' | null;
  sloaneLunch: 'pack' | 'school' | null;
  hasSchool: boolean;
  eveningActivities: Activity[];
  calendarEventOwners: Record<string, 'C' | 'J' | 'O'>;
  dinner: string;
  cook: 'Carly' | 'Joey' | 'Other' | '';
  notes: string;
}

export interface Reminder {
  id: string;
  text: string;
}

export interface Activity {
  id: string;
  text: string;
  owner?: 'C' | 'J' | 'O';
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
  checked?: boolean;
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

export interface Birthday {
  id: string;
  name: string;
  month: number; // 1-12
  day: number;   // 1-31
}

export interface WeekState {
  weekOffset: number;
  days: Record<string, DayData>;
  groceryItems: GroceryItem[];
  caraNotes: CaraNote[];
}
