import type { CalendarEvent } from './types';

/**
 * Parse ICS calendar content into CalendarEvent objects.
 * Handles all-day events (VALUE=DATE) and timed events with timezone support.
 * Expands recurring events (RRULE) within a window around the current date.
 * For all-day events, Google Calendar makes DTEND exclusive (day after last day).
 */
export function parseICS(icsContent: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const seen = new Set<string>();

  // Unfold continuation lines (lines starting with space/tab continue the previous line)
  const unfolded = icsContent.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');

  // Collect RECURRENCE-ID dates to know which instances are overridden
  const overriddenInstances = new Set<string>();
  const blocks = unfolded.split('BEGIN:VEVENT');
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split('END:VEVENT')[0];
    if (!block) continue;
    const uid = extractProperty(block, 'UID');
    const recurrenceId = extractDateValue(block, 'RECURRENCE-ID');
    if (uid && recurrenceId) {
      const recDate = toDateKey(recurrenceId);
      overriddenInstances.add(`${uid}_${recDate.dateKey}`);
    }
  }

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split('END:VEVENT')[0];
    if (!block) continue;

    const summary = extractProperty(block, 'SUMMARY');
    const uid = extractProperty(block, 'UID');
    const dtstart = extractDateValue(block, 'DTSTART');
    const dtend = extractDateValue(block, 'DTEND');
    const rrule = extractProperty(block, 'RRULE');
    const exdates = extractExDates(block);

    if (!summary || !dtstart) continue;

    // Skip cancelled events
    const status = extractProperty(block, 'STATUS');
    if (status && status.toUpperCase() === 'CANCELLED') continue;

    const start = toDateKey(dtstart);
    const baseId = uid ?? Math.random().toString(36).substring(2, 9);

    // Calculate event duration in days for multi-day events
    let durationDays = 0;
    let durationMs = 0;
    if (dtend) {
      const endParsed = toDateKey(dtend);
      let endDateKey = endParsed.dateKey;
      if (dtend.isDate) {
        endDateKey = subtractOneDay(endDateKey);
      }
      if (endDateKey < start.dateKey) endDateKey = start.dateKey;
      const startD = new Date(start.dateKey + 'T12:00:00');
      const endD = new Date(endDateKey + 'T12:00:00');
      durationDays = Math.round((endD.getTime() - startD.getTime()) / 86400000);
      durationMs = endD.getTime() - startD.getTime();
    }

    if (rrule) {
      // Expand recurring events
      const instances = expandRRule(
        rrule,
        dtstart,
        durationDays,
        durationMs,
        start,
        exdates,
        overriddenInstances,
        uid,
      );
      for (const inst of instances) {
        const dedupKey = uid ? `${uid}_${inst.dateKey}` : null;
        if (dedupKey && seen.has(dedupKey)) continue;
        if (dedupKey) seen.add(dedupKey);
        const eventId = uid ? `${uid}_${inst.dateKey}` : `${baseId}_${inst.dateKey}`;

        events.push({
          id: eventId,
          text: unescapeICS(summary),
          startDate: inst.dateKey,
          endDate: inst.endDateKey,
          ...(inst.timeString ? { startTime: inst.timeString } : {}),
        });
      }
    } else {
      // Non-recurring event
      const dedupKey = uid ? `${uid}_${start.dateKey}` : null;
      if (dedupKey && seen.has(dedupKey)) continue;
      if (dedupKey) seen.add(dedupKey);
      const eventId = uid ? `${uid}_${start.dateKey}` : baseId;
      let endDate: string;

      if (dtend) {
        const end = toDateKey(dtend);
        endDate = end.dateKey;
        if (dtend.isDate) {
          endDate = subtractOneDay(endDate);
        }
      } else {
        endDate = start.dateKey;
      }

      if (endDate < start.dateKey) {
        endDate = start.dateKey;
      }

      events.push({
        id: eventId,
        text: unescapeICS(summary),
        startDate: start.dateKey,
        endDate,
        ...(start.timeString ? { startTime: start.timeString } : {}),
      });
    }
  }

  return events;
}

/**
 * Deduplicate events from multiple calendar sources by UID.
 */
export function deduplicateEvents(events: CalendarEvent[]): CalendarEvent[] {
  const seen = new Set<string>();
  return events.filter((e) => {
    const key = `${e.id}_${e.startDate}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// --- RRULE expansion ---

interface RRuleParts {
  freq: string;
  interval: number;
  count?: number;
  until?: Date;
  byday?: string[];
  bymonthday?: number[];
  bymonth?: number[];
}

function parseRRule(rrule: string): RRuleParts {
  const parts: Record<string, string> = {};
  for (const segment of rrule.split(';')) {
    const eq = segment.indexOf('=');
    if (eq === -1) continue;
    parts[segment.substring(0, eq).toUpperCase()] = segment.substring(eq + 1);
  }

  const result: RRuleParts = {
    freq: parts['FREQ'] ?? 'DAILY',
    interval: parts['INTERVAL'] ? parseInt(parts['INTERVAL'], 10) : 1,
  };

  if (parts['COUNT']) {
    result.count = parseInt(parts['COUNT'], 10);
  }
  if (parts['UNTIL']) {
    const u = parts['UNTIL'];
    const cleaned = u.replace(/[^0-9]/g, '');
    const year = parseInt(cleaned.substring(0, 4), 10);
    const month = parseInt(cleaned.substring(4, 6), 10) - 1;
    const day = parseInt(cleaned.substring(6, 8), 10);
    result.until = new Date(year, month, day, 23, 59, 59);
  }
  if (parts['BYDAY']) {
    result.byday = parts['BYDAY'].split(',').map((s) => s.trim());
  }
  if (parts['BYMONTHDAY']) {
    result.bymonthday = parts['BYMONTHDAY'].split(',').map((s) => parseInt(s.trim(), 10));
  }
  if (parts['BYMONTH']) {
    result.bymonth = parts['BYMONTH'].split(',').map((s) => parseInt(s.trim(), 10));
  }

  return result;
}

const DAY_MAP: Record<string, number> = {
  SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6,
};

interface ExpandedInstance {
  dateKey: string;
  endDateKey: string;
  timeString: string | null;
}

function expandRRule(
  rrule: string,
  dtstart: DateValue,
  durationDays: number,
  _durationMs: number,
  startResult: DateKeyResult,
  exdates: Set<string>,
  overriddenInstances: Set<string>,
  uid: string | null,
): ExpandedInstance[] {
  const rule = parseRRule(rrule);
  const instances: ExpandedInstance[] = [];

  // Expansion window: 30 days in the past, 90 days in the future
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - 30);
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + 90);

  const windowStartKey = dateToKey(windowStart);
  const windowEndKey = dateToKey(windowEnd);

  // Start date as a Date object for iteration
  const startDate = new Date(startResult.dateKey + 'T12:00:00');
  const maxInstances = rule.count ?? 1000; // safety cap

  let count = 0;
  let current = new Date(startDate);

  // For WEEKLY with BYDAY, we need to iterate week by week
  if (rule.freq === 'WEEKLY' && rule.byday) {
    const targetDays = rule.byday
      .map((d) => DAY_MAP[d.replace(/[^A-Z]/g, '')])
      .filter((d) => d !== undefined) as number[];

    if (targetDays.length === 0) return instances;

    // Start from the beginning of the week of the start date
    const weekStart = new Date(current);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    let week = new Date(weekStart);
    while (count < maxInstances) {
      if (rule.until && week > rule.until) break;
      // Check if past window end
      const weekEndDate = new Date(week);
      weekEndDate.setDate(weekEndDate.getDate() + 6);
      if (dateToKey(week) > windowEndKey && dateToKey(weekEndDate) > windowEndKey) break;

      for (const dayNum of targetDays.sort((a, b) => a - b)) {
        if (count >= maxInstances) break;

        const instanceDate = new Date(week);
        instanceDate.setDate(week.getDate() + dayNum);

        // Skip instances before the original start date
        if (instanceDate < startDate) continue;

        if (rule.until && instanceDate > rule.until) break;

        const dk = dateToKey(instanceDate);

        // Skip if excluded
        if (exdates.has(dk)) { count++; continue; }

        // Skip if overridden by a RECURRENCE-ID instance
        if (uid && overriddenInstances.has(`${uid}_${dk}`)) { count++; continue; }

        count++;

        // Only include if in window
        if (dk >= windowStartKey && dk <= windowEndKey) {
          const endDk = durationDays > 0 ? addDays(dk, durationDays) : dk;
          instances.push({
            dateKey: dk,
            endDateKey: endDk,
            timeString: startResult.timeString,
          });
        }
      }

      // Advance to next week (respecting interval)
      week.setDate(week.getDate() + 7 * rule.interval);
    }
  } else {
    // DAILY, MONTHLY, YEARLY (and WEEKLY without BYDAY)
    while (count < maxInstances) {
      const dk = dateToKey(current);

      if (rule.until && current > rule.until) break;
      if (dk > windowEndKey) break;

      // Skip if excluded
      const skip = exdates.has(dk) || (uid && overriddenInstances.has(`${uid}_${dk}`));

      if (!skip && dk >= windowStartKey) {
        const endDk = durationDays > 0 ? addDays(dk, durationDays) : dk;
        instances.push({
          dateKey: dk,
          endDateKey: endDk,
          timeString: startResult.timeString,
        });
      }

      count++;

      // Advance to next occurrence
      switch (rule.freq) {
        case 'DAILY':
          current.setDate(current.getDate() + rule.interval);
          break;
        case 'WEEKLY':
          current.setDate(current.getDate() + 7 * rule.interval);
          break;
        case 'MONTHLY':
          current.setMonth(current.getMonth() + rule.interval);
          break;
        case 'YEARLY':
          current.setFullYear(current.getFullYear() + rule.interval);
          break;
        default:
          current.setDate(current.getDate() + rule.interval);
          break;
      }
    }
  }

  return instances;
}

function extractExDates(block: string): Set<string> {
  const exdates = new Set<string>();
  const lines = block.split(/\r?\n/);
  for (const line of lines) {
    if (!line.startsWith('EXDATE')) continue;
    const colonIdx = line.lastIndexOf(':');
    if (colonIdx === -1) continue;
    const values = line.substring(colonIdx + 1).split(',');
    for (const v of values) {
      const cleaned = v.trim().replace(/[^0-9]/g, '');
      if (cleaned.length >= 8) {
        exdates.add(
          `${cleaned.substring(0, 4)}-${cleaned.substring(4, 6)}-${cleaned.substring(6, 8)}`
        );
      }
    }
  }
  return exdates;
}

function dateToKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(dateKey: string, days: number): string {
  const d = new Date(dateKey + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return dateToKey(d);
}

// --- Original helper functions ---

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

interface DateKeyResult {
  dateKey: string;
  timeString: string | null; // "HH:MM" 24-hour format, null for all-day events
}

/**
 * Convert an ICS datetime to a local date key (YYYY-MM-DD) and optional time.
 *
 * For all-day events (VALUE=DATE), the 8-digit string is used directly.
 * For timed events, we convert to the local timezone to get the correct day:
 *   - UTC times (ending in Z): converted via Date object
 *   - Times with TZID: converted via Intl.DateTimeFormat when possible
 *   - Bare times (no Z, no TZID): assumed local
 */
function toDateKey(dv: DateValue): DateKeyResult {
  const raw = dv.value;

  // All-day events: the 8 digits are the literal date, no TZ conversion needed
  if (dv.isDate) {
    const dateStr = raw.replace(/[^0-9]/g, '');
    return {
      dateKey: `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`,
      timeString: null,
    };
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
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return {
    dateKey: `${y}-${m}-${d}`,
    timeString: `${hh}:${mm}`,
  };
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
