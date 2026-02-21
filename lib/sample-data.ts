import type { SchoolLunchMenu } from './types';

// Sample school lunch menus keyed by day of week (1=Mon, 5=Fri)
export const SAMPLE_SCHOOL_LUNCH: Record<number, SchoolLunchMenu> = {
  1: {
    entree: 'Chicken Nuggets',
    grill: 'Cheeseburger',
    express: 'PB&J Uncrustable',
    vegetable: 'Green Beans',
    fruit: 'Apple Slices',
  },
  2: {
    entree: 'Spaghetti & Meatballs',
    grill: 'Hot Dog',
    express: 'Turkey Wrap',
    vegetable: 'Corn',
    fruit: 'Orange Wedges',
  },
  3: {
    entree: 'Chicken Tacos',
    grill: 'Grilled Cheese',
    express: 'Ham & Cheese Sub',
    vegetable: 'Carrots & Ranch',
    fruit: 'Grapes',
  },
  4: {
    entree: 'Pizza',
    grill: 'Chicken Sandwich',
    express: 'Bagel & Cream Cheese',
    vegetable: 'Side Salad',
    fruit: 'Banana',
  },
  5: {
    entree: 'Popcorn Chicken',
    grill: 'Corn Dog',
    express: 'Cheese Quesadilla',
    vegetable: 'Broccoli',
    fruit: 'Strawberries',
  },
};
