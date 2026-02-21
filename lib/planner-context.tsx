'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import type {
  DayData,
  GroceryItem,
  CaraNote,
  CalendarEvent,
  Reminder,
  Activity,
  WeekState,
} from './types';
import { getWeekDates, formatDateKey } from './date-utils';
import { getCachedCalendarEvents } from './calendar-store';
import { fetchWeather, getWeatherIcon } from './weather';

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function createDefaultDayData(date: Date): DayData {
  const day = date.getDay();
  return {
    dropOff: 'Carly',
    morningReminders: [],
    greyLunch: null,
    sloaneLunch: null,
    hasSchool: day >= 1 && day <= 5,
    eveningActivities: [],
    dinner: '',
    cook: '',
  };
}

function loadState(weekOffset: number): WeekState {
  if (typeof window === 'undefined') {
    return { weekOffset, days: {}, groceryItems: [], caraNotes: [], calendarEvents: [] };
  }
  const key = `planner_week_${weekOffset}`;
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored) as WeekState;
      return { ...parsed, calendarEvents: parsed.calendarEvents ?? [] };
    }
  } catch {
    // ignore
  }
  return { weekOffset, days: {}, groceryItems: [], caraNotes: [], calendarEvents: [] };
}

function saveState(state: WeekState): void {
  if (typeof window === 'undefined') return;
  const key = `planner_week_${state.weekOffset}`;
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // ignore
  }
}

interface PlannerContextValue {
  weekOffset: number;
  weekDates: Date[];
  days: Record<string, DayData>;
  groceryItems: GroceryItem[];
  caraNotes: CaraNote[];
  goToWeek: (offset: number) => void;
  goToPrevWeek: () => void;
  goToNextWeek: () => void;
  goToCurrentWeek: () => void;
  getDayData: (dateKey: string, date: Date) => DayData;
  setDropOff: (dateKey: string, value: 'Carly' | 'Joey') => void;
  addReminder: (dateKey: string, text: string) => void;
  removeReminder: (dateKey: string, id: string) => void;
  setLunchChoice: (
    dateKey: string,
    child: 'grey' | 'sloane',
    choice: 'pack' | 'school' | null
  ) => void;
  toggleSchool: (dateKey: string) => void;
  addActivity: (dateKey: string, text: string) => void;
  removeActivity: (dateKey: string, id: string) => void;
  setDinner: (dateKey: string, value: string) => void;
  setCook: (dateKey: string, value: 'Carly' | 'Joey' | '') => void;
  calendarEvents: CalendarEvent[];
  addCalendarEvent: (text: string, startDate: string, endDate: string) => void;
  removeCalendarEvent: (id: string) => void;
  getCalendarEventsForDay: (dateKey: string) => CalendarEvent[];
  addGroceryItem: (name: string) => void;
  removeGroceryItem: (id: string) => void;
  buildGroceryFromDinners: () => void;
  addCaraNote: (text: string) => void;
  removeCaraNote: (id: string) => void;
  copyCaraNotes: () => void;
  getWeatherForDay: (dateKey: string) => { icon: string; high: number; low: number } | null;
  swapDinner: (fromDateKey: string, toDateKey: string) => void;
}

const PlannerContext = createContext<PlannerContextValue | null>(null);

export function PlannerProvider({ children }: { children: ReactNode }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [state, setState] = useState<WeekState>(() => loadState(0));
  const [googleEvents, setGoogleEvents] = useState<CalendarEvent[]>([]);
  const [weather, setWeather] = useState<
    Map<string, { code: number; high: number; low: number }>
  >(new Map());

  const weekDates = getWeekDates(weekOffset);

  // Load Google Calendar events from global cache on mount and when window regains focus
  useEffect(() => {
    setGoogleEvents(getCachedCalendarEvents());
    function handleFocus() {
      setGoogleEvents(getCachedCalendarEvents());
    }
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Fetch weather on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        fetchWeather(pos.coords.latitude, pos.coords.longitude).then(
          (days) => {
            const map = new Map<
              string,
              { code: number; high: number; low: number }
            >();
            for (const d of days) {
              map.set(d.dateKey, { code: d.code, high: d.high, low: d.low });
            }
            setWeather(map);
          }
        );
      },
      () => {
        // Fallback: use a default location (Dallas, TX area)
        fetchWeather(32.78, -96.8).then((days) => {
          const map = new Map<
            string,
            { code: number; high: number; low: number }
          >();
          for (const d of days) {
            map.set(d.dateKey, { code: d.code, high: d.high, low: d.low });
          }
          setWeather(map);
        });
      }
    );
  }, []);

  // Load state when week changes
  useEffect(() => {
    setState(loadState(weekOffset));
  }, [weekOffset]);

  // Save state when it changes
  useEffect(() => {
    saveState(state);
  }, [state]);

  const getDayData = useCallback(
    (dateKey: string, date: Date): DayData => {
      return state.days[dateKey] ?? createDefaultDayData(date);
    },
    [state.days]
  );

  const updateDay = useCallback(
    (dateKey: string, date: Date, updater: (day: DayData) => DayData) => {
      setState((prev) => {
        const current = prev.days[dateKey] ?? createDefaultDayData(date);
        return {
          ...prev,
          days: { ...prev.days, [dateKey]: updater(current) },
        };
      });
    },
    []
  );

  const setDropOff = useCallback(
    (dateKey: string, value: 'Carly' | 'Joey') => {
      const date = new Date(dateKey + 'T00:00:00');
      updateDay(dateKey, date, (day) => ({ ...day, dropOff: value }));
    },
    [updateDay]
  );

  const addReminder = useCallback(
    (dateKey: string, text: string) => {
      const date = new Date(dateKey + 'T00:00:00');
      updateDay(dateKey, date, (day) => ({
        ...day,
        morningReminders: [
          ...day.morningReminders,
          { id: generateId(), text },
        ],
      }));
    },
    [updateDay]
  );

  const removeReminder = useCallback(
    (dateKey: string, id: string) => {
      const date = new Date(dateKey + 'T00:00:00');
      updateDay(dateKey, date, (day) => ({
        ...day,
        morningReminders: day.morningReminders.filter((r) => r.id !== id),
      }));
    },
    [updateDay]
  );

  const setLunchChoice = useCallback(
    (
      dateKey: string,
      child: 'grey' | 'sloane',
      choice: 'pack' | 'school' | null
    ) => {
      const date = new Date(dateKey + 'T00:00:00');
      updateDay(dateKey, date, (day) => ({
        ...day,
        [child === 'grey' ? 'greyLunch' : 'sloaneLunch']: choice,
      }));
    },
    [updateDay]
  );

  const toggleSchool = useCallback(
    (dateKey: string) => {
      const date = new Date(dateKey + 'T00:00:00');
      updateDay(dateKey, date, (day) => ({
        ...day,
        hasSchool: !day.hasSchool,
      }));
    },
    [updateDay]
  );

  const addActivity = useCallback(
    (dateKey: string, text: string) => {
      const date = new Date(dateKey + 'T00:00:00');
      updateDay(dateKey, date, (day) => ({
        ...day,
        eveningActivities: [
          ...day.eveningActivities,
          { id: generateId(), text },
        ],
      }));
    },
    [updateDay]
  );

  const removeActivity = useCallback(
    (dateKey: string, id: string) => {
      const date = new Date(dateKey + 'T00:00:00');
      updateDay(dateKey, date, (day) => ({
        ...day,
        eveningActivities: day.eveningActivities.filter((a) => a.id !== id),
      }));
    },
    [updateDay]
  );

  const setDinner = useCallback(
    (dateKey: string, value: string) => {
      const date = new Date(dateKey + 'T00:00:00');
      updateDay(dateKey, date, (day) => ({ ...day, dinner: value }));
    },
    [updateDay]
  );

  const setCook = useCallback(
    (dateKey: string, value: 'Carly' | 'Joey' | '') => {
      const date = new Date(dateKey + 'T00:00:00');
      updateDay(dateKey, date, (day) => ({ ...day, cook: value }));
    },
    [updateDay]
  );

  const addCalendarEvent = useCallback(
    (text: string, startDate: string, endDate: string) => {
      setState((prev) => ({
        ...prev,
        calendarEvents: [
          ...prev.calendarEvents,
          { id: generateId(), text, startDate, endDate },
        ],
      }));
    },
    []
  );

  const removeCalendarEvent = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      calendarEvents: prev.calendarEvents.filter((e) => e.id !== id),
    }));
  }, []);

  const getCalendarEventsForDay = useCallback(
    (dateKey: string): CalendarEvent[] => {
      const manual = state.calendarEvents.filter(
        (e) => dateKey >= e.startDate && dateKey <= e.endDate
      );
      const google = googleEvents.filter(
        (e) => dateKey >= e.startDate && dateKey <= e.endDate
      );
      return [...google, ...manual];
    },
    [state.calendarEvents, googleEvents]
  );

  const addGroceryItem = useCallback((name: string) => {
    setState((prev) => ({
      ...prev,
      groceryItems: [
        ...prev.groceryItems,
        { id: generateId(), name },
      ],
    }));
  }, []);

  const removeGroceryItem = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      groceryItems: prev.groceryItems.filter((i) => i.id !== id),
    }));
  }, []);

  const buildGroceryFromDinners = useCallback(() => {
    const dinnerNames = Object.values(state.days)
      .map((d) => d.dinner)
      .filter(Boolean);
    const newItems: GroceryItem[] = dinnerNames.map((name) => ({
      id: generateId(),
      name: `Ingredients for: ${name}`,
    }));
    setState((prev) => ({
      ...prev,
      groceryItems: [...prev.groceryItems, ...newItems],
    }));
  }, [state.days]);

  const addCaraNote = useCallback((text: string) => {
    setState((prev) => ({
      ...prev,
      caraNotes: [...prev.caraNotes, { id: generateId(), text }],
    }));
  }, []);

  const removeCaraNote = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      caraNotes: prev.caraNotes.filter((n) => n.id !== id),
    }));
  }, []);

  const copyCaraNotes = useCallback(() => {
    const text = state.caraNotes
      .map((n, i) => `${i + 1}. ${n.text}`)
      .join('\n');
    const header = 'Notes for Cara:\n';
    navigator.clipboard.writeText(header + text).catch(() => {
      // Fallback: create a textarea and copy
      const el = document.createElement('textarea');
      el.value = header + text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    });
  }, [state.caraNotes]);

  const swapDinner = useCallback(
    (fromDateKey: string, toDateKey: string) => {
      if (fromDateKey === toDateKey) return;
      setState((prev) => {
        const fromDate = new Date(fromDateKey + 'T00:00:00');
        const toDate = new Date(toDateKey + 'T00:00:00');
        const fromDay =
          prev.days[fromDateKey] ?? createDefaultDayData(fromDate);
        const toDay = prev.days[toDateKey] ?? createDefaultDayData(toDate);
        return {
          ...prev,
          days: {
            ...prev.days,
            [fromDateKey]: {
              ...fromDay,
              dinner: toDay.dinner,
              cook: toDay.cook,
            },
            [toDateKey]: {
              ...toDay,
              dinner: fromDay.dinner,
              cook: fromDay.cook,
            },
          },
        };
      });
    },
    []
  );

  const getWeatherForDay = useCallback(
    (dateKey: string) => {
      const w = weather.get(dateKey);
      if (!w) return null;
      return { icon: getWeatherIcon(w.code), high: w.high, low: w.low };
    },
    [weather]
  );

  const goToWeek = useCallback((offset: number) => setWeekOffset(offset), []);
  const goToPrevWeek = useCallback(
    () => setWeekOffset((o) => o - 1),
    []
  );
  const goToNextWeek = useCallback(
    () => setWeekOffset((o) => o + 1),
    []
  );
  const goToCurrentWeek = useCallback(() => setWeekOffset(0), []);

  return (
    <PlannerContext.Provider
      value={{
        weekOffset,
        weekDates,
        days: state.days,
        groceryItems: state.groceryItems,
        caraNotes: state.caraNotes,
        goToWeek,
        goToPrevWeek,
        goToNextWeek,
        goToCurrentWeek,
        getDayData,
        setDropOff,
        addReminder,
        removeReminder,
        setLunchChoice,
        toggleSchool,
        addActivity,
        removeActivity,
        setDinner,
        setCook,
        calendarEvents: state.calendarEvents,
        addCalendarEvent,
        removeCalendarEvent,
        getCalendarEventsForDay,
        addGroceryItem,
        removeGroceryItem,
        buildGroceryFromDinners,
        addCaraNote,
        removeCaraNote,
        copyCaraNotes,
        getWeatherForDay,
        swapDinner,
      }}
    >
      {children}
    </PlannerContext.Provider>
  );
}

export function usePlanner(): PlannerContextValue {
  const ctx = useContext(PlannerContext);
  if (!ctx) {
    throw new Error('usePlanner must be used within PlannerProvider');
  }
  return ctx;
}
