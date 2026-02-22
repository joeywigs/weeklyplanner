import type { SchoolLunchMenu } from './types';
import { syncGet, syncSet } from './cloud';

const CACHE_KEY = 'nutrislice_menus';
const CACHE_TS_KEY = 'nutrislice_last_fetch';
const DISTRICT = 'tulsaschools';
const SCHOOL = 'council-oak-elementary';

// Stations we care about, mapped to SchoolLunchMenu keys
const STATION_MAP: Record<string, keyof SchoolLunchMenu> = {
  'Entree': 'entree',
  'Daily Serve Entree': 'entree',
  'Grill': 'grill',
  'Express': 'express',
  'Vegetable': 'vegetable',
  'Fruit': 'fruit',
};

interface NutrisliceItem {
  text: string;
  is_section_title: boolean;
  food?: { name: string } | null;
}

interface NutrisliceDay {
  date: string;
  menu_items: NutrisliceItem[];
}

interface NutrisliceResponse {
  days: NutrisliceDay[];
}

function parseDay(day: NutrisliceDay): SchoolLunchMenu | null {
  if (!day.menu_items || day.menu_items.length === 0) return null;

  const menu: SchoolLunchMenu = {
    entree: [],
    grill: [],
    express: [],
    vegetable: [],
    fruit: [],
  };

  let currentStation: keyof SchoolLunchMenu | null = null;

  for (const item of day.menu_items) {
    if (item.is_section_title) {
      currentStation = STATION_MAP[item.text] ?? null;
    } else if (currentStation && item.food?.name) {
      menu[currentStation].push(item.food.name);
    }
  }

  const hasItems = Object.values(menu).some((arr) => arr.length > 0);
  return hasItems ? menu : null;
}

async function fetchWithProxies(url: string): Promise<string> {
  const encoded = encodeURIComponent(url);

  const attempts = [
    url,
    `https://corsproxy.io/?${encoded}`,
    `https://api.allorigins.win/raw?url=${encoded}`,
  ];

  for (const attemptUrl of attempts) {
    try {
      const res = await fetch(attemptUrl);
      if (!res.ok) throw new Error(`${res.status}`);
      const text = await res.text();
      // Validate it looks like JSON with days array
      if (text.includes('"days"')) return text;
    } catch {
      // try next proxy
    }
  }

  throw new Error('Could not fetch school lunch menu (all proxies failed)');
}

export async function fetchNutrisliceMenus(
  sundayDateKey: string
): Promise<Record<string, SchoolLunchMenu>> {
  const apiUrl = `https://${DISTRICT}.api.nutrislice.com/menu/api/weeks/school/${SCHOOL}/menu-type/lunch/${sundayDateKey}/?format=json`;

  const text = await fetchWithProxies(apiUrl);
  const data = JSON.parse(text) as NutrisliceResponse;

  const menus: Record<string, SchoolLunchMenu> = {};

  for (const day of data.days) {
    const menu = parseDay(day);
    if (menu) {
      menus[day.date] = menu;
    }
  }

  return menus;
}

// Cache helpers
export function getCachedMenus(): Record<string, SchoolLunchMenu> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = syncGet(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, SchoolLunchMenu>) : {};
  } catch {
    return {};
  }
}

export function setCachedMenus(menus: Record<string, SchoolLunchMenu>): void {
  if (typeof window === 'undefined') return;
  syncSet(CACHE_KEY, JSON.stringify(menus));
  syncSet(CACHE_TS_KEY, new Date().toISOString());
}
