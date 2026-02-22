'use client';

import { useState, useEffect } from 'react';
import {
  getCalendarSources,
  getCachedCalendarEvents,
  setCachedCalendarEvents,
  clearCachedCalendarEvents,
  getLastRefreshTime,
} from '@/lib/calendar-store';
import { parseICS, deduplicateEvents } from '@/lib/ics-parser';

export function CalendarSettings() {
  const [eventCount, setEventCount] = useState(0);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sources = getCalendarSources();

  useEffect(() => {
    setEventCount(getCachedCalendarEvents().length);
    setLastRefresh(getLastRefreshTime());
  }, []);

  async function handleRefresh() {
    setIsRefreshing(true);
    setError(null);

    try {
      const allEvents = await Promise.all(
        sources.map(async (src) => {
          const label = src.name || 'Calendar';
          let icsText: string;
          try {
            const directRes = await fetch(src.url.trim());
            if (!directRes.ok) throw new Error('direct fetch failed');
            icsText = await directRes.text();
          } catch {
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(src.url.trim())}`;
            const proxyRes = await fetch(proxyUrl);
            if (!proxyRes.ok) {
              throw new Error(`${label}: could not fetch calendar feed`);
            }
            icsText = await proxyRes.text();
          }
          if (!icsText.includes('BEGIN:VCALENDAR')) {
            throw new Error(`${label}: URL did not return a valid ICS feed`);
          }
          return parseICS(icsText);
        })
      );

      const merged = deduplicateEvents(allEvents.flat());
      setCachedCalendarEvents(merged);
      setEventCount(merged.length);
      setLastRefresh(getLastRefreshTime());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh failed');
    } finally {
      setIsRefreshing(false);
    }
  }

  function handleClear() {
    clearCachedCalendarEvents();
    setEventCount(0);
    setLastRefresh(null);
  }

  function formatRefreshTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-4">
      <h2 className="text-sm font-bold text-gray-900 mb-1">
        Google Calendar
      </h2>
      <p className="text-xs text-gray-500 mb-3">
        Importing events from:
      </p>

      <ul className="text-xs text-gray-600 space-y-1 mb-3">
        {sources.map((src) => (
          <li key={src.id} className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-400 shrink-0" />
            {src.name}
          </li>
        ))}
      </ul>

      {error && (
        <p className="mb-2 text-xs text-red-600 bg-red-50 px-2 py-1.5 rounded-md">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="text-xs px-3 py-1.5 rounded-md bg-accent-500 text-white font-medium hover:bg-accent-600 disabled:opacity-50 transition-colors"
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh Events'}
        </button>
        <button
          onClick={handleClear}
          className="text-xs px-3 py-1.5 rounded-md bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 transition-colors"
        >
          Clear Events
        </button>
      </div>

      {(lastRefresh || eventCount > 0) && (
        <div className="mt-3 text-[10px] text-gray-400 space-y-0.5">
          {lastRefresh && (
            <p>Last refreshed: {formatRefreshTime(lastRefresh)}</p>
          )}
          <p>{eventCount} event{eventCount !== 1 ? 's' : ''} loaded</p>
        </div>
      )}
    </div>
  );
}
