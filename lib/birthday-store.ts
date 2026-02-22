import type { Birthday } from './types';
import { syncGet, syncSet } from './cloud';

const BIRTHDAYS_KEY = 'important_birthdays';

export function getBirthdays(): Birthday[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = syncGet(BIRTHDAYS_KEY);
    return raw ? (JSON.parse(raw) as Birthday[]) : [];
  } catch {
    return [];
  }
}

export function saveBirthdays(birthdays: Birthday[]): void {
  if (typeof window === 'undefined') return;
  syncSet(BIRTHDAYS_KEY, JSON.stringify(birthdays));
}
