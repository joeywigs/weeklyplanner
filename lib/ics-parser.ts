import type { CalendarEvent } from './types';

/**
 * Parse ICS calendar content into CalendarEvent objects.
 * Handles all-day events (VALUE=DATE) and timed events.
 * For all-day events, Google Calendar makes DTEND exclusive (day after last day).
 */
export function parseICS(icsContent: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  // Unfold continuation lines (lines starting with space/tab continue the previous line)
  const unfolded = icsContent.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');

  const blocks = unfolded.split('BEGIN:VEVENT');

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split('END:VEVENT')[0];
    if (!block) continue;

    const summary = extractProperty(block, 'SUMMARY');
    const uid = extractProperty(block, 'UID');
    const dtstart = extractDateValue(block, 'DTSTART');
    const dtend = extractDateValue(block, 'DTEND');

    if (!summary || !dtstart) continue;

    const startDate = toDateKey(dtstart.value, dtstart.isDate);
    let endDate: string;

    if (dtend) {
      endDate = toDateKey(dtend.value, dtend.isDate);
      // For all-day events, DTEND is exclusive — subtract one day
      if (dtend.isDate) {
        endDate = subtractOneDay(endDate);
      }
    } else {
      endDate = startDate;
    }

    // If end is before start (single all-day event edge case), use start
    if (endDate < startDate) {
      endDate = startDate;
    }

    events.push({
      id: uid ?? Math.random().toString(36).substring(2, 9),
      text: unescapeICS(summary),
      startDate,
      endDate,
    });
  }

  return events;
}

function extractProperty(block: string, name: string): string | null {
  // Match "NAME:" or "NAME;...:" at the start of a line
  const regex = new RegExp(`^${name}[;:](.*)$`, 'm');
  const match = block.match(regex);
  if (!match) return null;
  // If there were parameters (NAME;PARAM=VAL:value), grab after the last ':'
  const raw = match[1];
  const colonIdx = raw.indexOf(':');
  // Check if the line had parameters by looking at the original match
  if (match[0].includes(';') && colonIdx !== -1) {
    return raw.substring(colonIdx + 1).trim();
  }
  return raw.trim();
}

interface DateValue {
  value: string; // raw date string like "20260221" or "20260221T180000Z"
  isDate: boolean; // true if VALUE=DATE (all-day)
}

function extractDateValue(block: string, name: string): DateValue | null {
  const lines = block.split(/\r?\n/);
  for (const line of lines) {
    if (!line.startsWith(name)) continue;

    const isDate = line.includes('VALUE=DATE');
    // Get everything after the last ':'
    const colonIdx = line.lastIndexOf(':');
    if (colonIdx === -1) continue;
    const value = line.substring(colonIdx + 1).trim();
    if (!value) continue;

    return { value, isDate: isDate && !line.includes('VALUE=DATE-TIME') };
  }
  return null;
}

function toDateKey(raw: string, isDateOnly: boolean): string {
  // Format: "20260221" or "20260221T180000Z"
  const dateStr = raw.replace(/[^0-9T]/g, '');
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  return `${year}-${month}-${day}`;
}

function subtractOneDay(dateKey: string): string {
  const d = new Date(dateKey + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function unescapeICS(text: string): string {
  return text
    .replace(/\\n/g, ' ')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}
