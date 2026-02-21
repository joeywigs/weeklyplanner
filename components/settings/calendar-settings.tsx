'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CalendarSource } from '@/lib/types';
import {
  getCalendarSources,
  setCalendarSources,
  getCachedCalendarEvents,
  setCachedCalendarEvents,
  clearCachedCalendarEvents,
  getLastRefreshTime,
} from '@/lib/calendar-store';
import { parseICS } from '@/lib/ics-parser';

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function CalendarSettings() {
  const [sources, setSources] = useState<CalendarSource[]>([]);
  const [eventCount, setEventCount] = useState(0);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = getCalendarSources();
    if (stored.length === 0) {
      // Start with 2 empty slots
      setSources([
        { id: generateId(), name: '', url: '' },
        { id: generateId(), name: '', url: '' },
      ]);
    } else {
      setSources(stored);
    }
    setEventCount(getCachedCalendarEvents().length);
    setLastRefresh(getLastRefreshTime());
  }, []);

  const save = useCallback(
    (updated: CalendarSource[]) => {
      setSources(updated);
      setCalendarSources(updated);
    },
    []
  );

  function updateSource(
    id: string,
    field: 'name' | 'url',
    value: string
  ) {
    const updated = sources.map((s) =>
      s.id === id ? { ...s, [field]: value } : s
    );
    save(updated);
  }

  function removeSource(id: string) {
    const updated = sources.filter((s) => s.id !== id);
    save(updated);
  }

  function addSource() {
    const updated = [...sources, { id: generateId(), name: '', url: '' }];
    save(updated);
  }

  async function handleRefresh() {
    const validSources = sources.filter((s) => s.url.trim());
    if (validSources.length === 0) {
      setError('Add at least one calendar URL first.');
      return;
    }

    setIsRefreshing(true);
    setError(null);

    try {
      const allEvents = await Promise.all(
        validSources.map(async (src) => {
          const label = src.name || 'Calendar';
          // Try direct fetch first, then fall back to CORS proxy
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

      const merged = allEvents.flat();
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
        Add your Google Calendar ICS feed URLs to import events.
      </p>

      <div className="space-y-3">
        {sources.map((src) => (
          <div key={src.id} className="space-y-1.5">
            <div className="flex gap-2">
              <input
                type="text"
                value={src.name}
                onChange={(e) => updateSource(src.id, 'name', e.target.value)}
                placeholder="Calendar name"
                className="w-28 shrink-0 text-xs px-2 py-1.5 rounded-md bg-gray-50 border border-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-accent-400"
              />
              <input
                type="url"
                value={src.url}
                onChange={(e) => updateSource(src.id, 'url', e.target.value)}
                placeholder="https://calendar.google.com/calendar/ical/..."
                className="flex-1 text-xs px-2 py-1.5 rounded-md bg-gray-50 border border-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-accent-400 min-w-0"
              />
              {sources.length > 1 && (
                <button
                  onClick={() => removeSource(src.id)}
                  className="text-gray-300 hover:text-red-500 shrink-0"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 12 12"
                    fill="none"
                  >
                    <path
                      d="M3 3l6 6M9 3l-6 6"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addSource}
        className="mt-3 text-xs text-accent-600 hover:text-accent-700 font-medium"
      >
        + Add another calendar
      </button>

      {error && (
        <p className="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1.5 rounded-md">
          {error}
        </p>
      )}

      <div className="mt-4 flex items-center gap-2 flex-wrap">
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
