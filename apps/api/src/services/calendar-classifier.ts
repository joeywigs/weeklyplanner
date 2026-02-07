import type { EveningClassification } from '@mealflow/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CalendarEvent {
  id: string;
  summary: string;
  start: string; // ISO 8601 datetime or YYYY-MM-DD for all-day
  end: string;   // ISO 8601 datetime or YYYY-MM-DD for all-day
  isAllDay: boolean;
}

export interface DayClassification {
  date: string; // YYYY-MM-DD
  classification: EveningClassification;
  events: Array<{
    summary: string;
    start: string;
    end: string;
  }>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** The evening window we care about: 4:00 PM to 9:00 PM */
const EVENING_START_HOUR = 16; // 4 PM
const EVENING_END_HOUR = 21;   // 9 PM
const EVENING_DURATION_MINUTES = (EVENING_END_HOUR - EVENING_START_HOUR) * 60; // 300 min

/**
 * Threshold for "partial" classification: if events cover more than this
 * fraction of the evening window, classify as busy.
 */
const BUSY_THRESHOLD = 0.7; // 70% of evening booked = busy
const FREE_THRESHOLD = 0.0; // 0% = free (any events at all = at least partial)

// ---------------------------------------------------------------------------
// Classification logic
// ---------------------------------------------------------------------------

/**
 * Calculate how many minutes of overlap an event has with the evening window
 * of a given date.
 */
function getEveningOverlapMinutes(event: CalendarEvent, dateStr: string): number {
  const eveningStart = new Date(`${dateStr}T${String(EVENING_START_HOUR).padStart(2, '0')}:00:00`);
  const eveningEnd = new Date(`${dateStr}T${String(EVENING_END_HOUR).padStart(2, '0')}:00:00`);

  let eventStart: Date;
  let eventEnd: Date;

  if (event.isAllDay) {
    // All-day events span the entire day
    eventStart = new Date(`${dateStr}T00:00:00`);
    eventEnd = new Date(`${dateStr}T23:59:59`);
  } else {
    eventStart = new Date(event.start);
    eventEnd = new Date(event.end);
  }

  // Calculate overlap
  const overlapStart = eventStart > eveningStart ? eventStart : eveningStart;
  const overlapEnd = eventEnd < eveningEnd ? eventEnd : eveningEnd;

  const overlapMs = overlapEnd.getTime() - overlapStart.getTime();
  return overlapMs > 0 ? overlapMs / (1000 * 60) : 0;
}

/**
 * Classify a single day's evening based on calendar events.
 */
function classifyEvening(events: CalendarEvent[], dateStr: string): EveningClassification {
  let totalOverlapMinutes = 0;

  for (const event of events) {
    totalOverlapMinutes += getEveningOverlapMinutes(event, dateStr);
  }

  const occupancyRatio = totalOverlapMinutes / EVENING_DURATION_MINUTES;

  if (occupancyRatio <= FREE_THRESHOLD) {
    return 'free';
  }

  if (occupancyRatio >= BUSY_THRESHOLD) {
    return 'busy';
  }

  return 'partial';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Classify each evening of a week given a list of calendar events.
 *
 * @param events - All calendar events for the week
 * @param weekStart - The Monday of the week (YYYY-MM-DD)
 * @returns Classification for each day (Mon through Sun)
 */
export function classifyWeekEvenings(
  events: CalendarEvent[],
  weekStart: string,
): DayClassification[] {
  const results: DayClassification[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    // Find events that overlap with this day's evening
    const eveningEvents = events.filter((event) => {
      return getEveningOverlapMinutes(event, dateStr) > 0;
    });

    results.push({
      date: dateStr,
      classification: classifyEvening(eveningEvents, dateStr),
      events: eveningEvents.map((e) => ({
        summary: e.summary,
        start: e.start,
        end: e.end,
      })),
    });
  }

  return results;
}
