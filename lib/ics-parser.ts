import type { CalendarEvent } from './types';

/**
 * Parse ICS calendar content into CalendarEvent objects.
 * Handles all-day events (VALUE=DATE) and timed events with timezone support.
 * For all-day events, Google Calendar makes DTEND exclusive (day after last day).
 */
export function parseICS(icsContent: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const seen = new Set<string>();

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

    // Deduplicate by UID
    const eventId = uid ?? Math.random().toString(36).substring(2, 9);
    if (uid && seen.has(uid)) continue;
    if (uid) seen.add(uid);

    const startDate = toDateKey(dtstart);
    let endDate: string;

    if (dtend) {
      endDate = toDateKey(dtend);
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
      id: eventId,
      text: unescapeICS(summary),
      startDate,
      endDate,
    });
  }

  return events;
}

/**
 * Deduplicate events from multiple calendar sources by UID.
 */
export function deduplicateEvents(events: CalendarEvent[]): CalendarEvent[] {
  const seen = new Set<string>();
  return events.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });
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
  tzid: string | null; // e.g. "America/Chicago"
  isUtc: boolean; // true if value ends with Z
}

function extractDateValue(block: string, name: string): DateValue | null {
  const lines = block.split(/\r?\n/);
  for (const line of lines) {
    if (!line.startsWith(name)) continue;

    const isDate = line.includes('VALUE=DATE') && !line.includes('VALUE=DATE-TIME');

    // Extract TZID if present
    const tzidMatch = line.match(/TZID=([^;:]+)/);
    const tzid = tzidMatch ? tzidMatch[1] : null;

    // Get everything after the last ':'
    const colonIdx = line.lastIndexOf(':');
    if (colonIdx === -1) continue;
    const value = line.substring(colonIdx + 1).trim();
    if (!value) continue;

    const isUtc = value.endsWith('Z');

    return { value, isDate, tzid, isUtc };
  }
  return null;
}

/**
 * Convert an ICS datetime to a local date key (YYYY-MM-DD).
 *
 * For all-day events (VALUE=DATE), the 8-digit string is used directly.
 * For timed events, we convert to the local timezone to get the correct day:
 *   - UTC times (ending in Z): converted via Date object
 *   - Times with TZID: converted via Intl.DateTimeFormat when possible
 *   - Bare times (no Z, no TZID): assumed local
 */
function toDateKey(dv: DateValue): string {
  const raw = dv.value;

  // All-day events: the 8 digits are the literal date, no TZ conversion needed
  if (dv.isDate) {
    const dateStr = raw.replace(/[^0-9]/g, '');
    return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
  }

  // Timed event — parse the components
  const cleaned = raw.replace(/[^0-9TZ]/g, '');
  const year = parseInt(cleaned.substring(0, 4), 10);
  const month = parseInt(cleaned.substring(4, 6), 10) - 1; // JS months 0-based
  const day = parseInt(cleaned.substring(6, 8), 10);
  const hour = cleaned.length >= 11 ? parseInt(cleaned.substring(9, 11), 10) : 0;
  const minute = cleaned.length >= 13 ? parseInt(cleaned.substring(11, 13), 10) : 0;
  const second = cleaned.length >= 15 ? parseInt(cleaned.substring(13, 15), 10) : 0;

  let date: Date;

  if (dv.isUtc) {
    // UTC time — create with Date.UTC so JS handles the local conversion
    date = new Date(Date.UTC(year, month, day, hour, minute, second));
  } else if (dv.tzid) {
    // Has a TZID — use Intl to figure out the UTC offset, then convert
    date = dateFromTzid(year, month, day, hour, minute, second, dv.tzid);
  } else {
    // No timezone info — treat as local time
    date = new Date(year, month, day, hour, minute, second);
  }

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Convert a datetime with a TZID to a local Date.
 * Uses Intl.DateTimeFormat to resolve the source timezone offset.
 */
function dateFromTzid(
  year: number, month: number, day: number,
  hour: number, minute: number, second: number,
  tzid: string
): Date {
  try {
    // Build a UTC date, then figure out the offset in the source TZ
    const utcGuess = new Date(Date.UTC(year, month, day, hour, minute, second));

    // Get the parts in the source timezone to find the offset
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tzid,
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(utcGuess);
    const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);

    const tzYear = get('year');
    const tzMonth = get('month') - 1;
    const tzDay = get('day');
    const tzHour = get('hour') === 24 ? 0 : get('hour');
    const tzMinute = get('minute');
    const tzSecond = get('second');

    // The offset = what UTC shows in the source TZ vs what UTC actually is
    const inTz = new Date(Date.UTC(tzYear, tzMonth, tzDay, tzHour, tzMinute, tzSecond));
    const offsetMs = inTz.getTime() - utcGuess.getTime();

    // The actual UTC time = the "local" time in source TZ minus the offset
    const actualUtc = new Date(Date.UTC(year, month, day, hour, minute, second) - offsetMs);

    // Return as local Date (browser will display in local TZ)
    return actualUtc;
  } catch {
    // If TZID is invalid, fall back to treating as local time
    return new Date(year, month, day, hour, minute, second);
  }
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
