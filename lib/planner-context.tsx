'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import type {
  DayData,
  GroceryItem,
  CaraNote,
  CalendarEvent,
  SchoolLunchMenu,
  Reminder,
  Activity,
  WeekState,
} from './types';
import { getWeekDates, formatDateKey } from './date-utils';
import { getCachedCalendarEvents, onCalendarEventsChanged } from './calendar-store';
import { fetchNutrisliceMenus, getCachedMenus, setCachedMenus } from './nutrislice';
import { fetchWeather, getWeatherIcon } from './weather';
import { syncGet, syncSet, syncPull, isCloudEnabled } from './cloud';
import { getRecipes } from './recipe-store';
import { mergeIngredients } from './grocery-match';

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

const emptyWeek = (weekOffset: number): WeekState => ({
  weekOffset,
  days: {},
  groceryItems: [],
  caraNotes: [],
});

function loadState(weekOffset: number): WeekState {
  if (typeof window === 'undefined') return emptyWeek(weekOffset);
  const key = `planner_week_${weekOffset}`;
  try {
    const stored = syncGet(key);
    if (stored) {
      const parsed = JSON.parse(stored) as WeekState;
      return parsed;
    }
  } catch {
    // ignore
  }
  return emptyWeek(weekOffset);
}

function saveState(state: WeekState): void {
  if (typeof window === 'undefined') return;
  const key = `planner_week_${state.weekOffset}`;
  try {
    syncSet(key, JSON.stringify(state));
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
  getCalendarEventsForDay: (dateKey: string) => CalendarEvent[];
  addGroceryItem: (name: string) => void;
  removeGroceryItem: (id: string) => void;
  buildGroceryFromDinners: () => 'built' | 'already_built';
  addCaraNote: (text: string) => void;
  removeCaraNote: (id: string) => void;
  copyCaraNotes: () => void;
  getWeatherForDay: (dateKey: string) => { icon: string; high: number; low: number } | null;
  getSchoolMenu: (dateKey: string) => SchoolLunchMenu | null;
  swapDinner: (fromDateKey: string, toDateKey: string) => void;
  editMode: boolean;
  toggleEditMode: () => void;
}

const PlannerContext = createContext<PlannerContextValue | null>(null);

export function PlannerProvider({ children }: { children: ReactNode }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [state, setState] = useState<WeekState>(() => loadState(0));
  const [googleEvents, setGoogleEvents] = useState<CalendarEvent[]>([]);
  const [editMode, setEditMode] = useState(true);
  const [weather, setWeather] = useState<
    Map<string, { code: number; high: number; low: number }>
  >(new Map());
  const [schoolMenus, setSchoolMenus] = useState<Record<string, SchoolLunchMenu>>(() => getCachedMenus());
  const lastBuiltDinnerFingerprint = useRef<string | null>(null);

  const weekDates = getWeekDates(weekOffset);

  // Load Google Calendar events from global cache on mount, focus, and when cache changes
  useEffect(() => {
    setGoogleEvents(getCachedCalendarEvents());
    function reload() {
      setGoogleEvents(getCachedCalendarEvents());
    }
    window.addEventListener('focus', reload);
    const unsubscribe = onCalendarEventsChanged(reload);
    return () => {
      window.removeEventListener('focus', reload);
      unsubscribe();
    };
  }, []);

  // Fetch weather on mount (Tulsa, OK)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    fetchWeather(36.15, -95.99).then((days) => {
      const map = new Map<
        string,
        { code: number; high: number; low: number }
      >();
      for (const d of days) {
        map.set(d.dateKey, { code: d.code, high: d.high, low: d.low });
      }
      setWeather(map);
    });
  }, []);

  // Fetch school lunch menus from Nutrislice when week changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sundayKey = formatDateKey(weekDates[0]!);
    fetchNutrisliceMenus(sundayKey)
      .then((menus) => {
        setSchoolMenus((prev) => {
          const merged = { ...prev, ...menus };
          setCachedMenus(merged);
          return merged;
        });
      })
      .catch(() => {
        // Silently fail — cached data will be used
      });
  }, [weekDates]);

  // Load state when week changes
  useEffect(() => {
    setState(loadState(weekOffset));
  }, [weekOffset]);

  // Save state when it changes
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Cloud sync: pull latest on mount, week change, and focus
  useEffect(() => {
    if (!isCloudEnabled()) return;
    const key = `planner_week_${weekOffset}`;

    function pullFromCloud() {
      syncPull(key).then((value) => {
        if (value) {
          try {
            const parsed = JSON.parse(value) as WeekState;
            setState((prev) => {
              // Only update if cloud data is different (avoid loops)
              if (JSON.stringify(prev) !== value) {
                return parsed;
              }
              return prev;
            });
          } catch {
            // ignore
          }
        }
      });
    }

    pullFromCloud();
    window.addEventListener('focus', pullFromCloud);
    return () => window.removeEventListener('focus', pullFromCloud);
  }, [weekOffset]);

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

  const getCalendarEventsForDay = useCallback(
    (dateKey: string): CalendarEvent[] => {
      return googleEvents
        .filter((e) => dateKey >= e.startDate && dateKey <= e.endDate)
        .sort((a, b) => {
          // All-day events first, then by start time
          if (!a.startTime && !b.startTime) return 0;
          if (!a.startTime) return -1;
          if (!b.startTime) return 1;
          return a.startTime.localeCompare(b.startTime);
        });
    },
    [googleEvents]
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

  const buildGroceryFromDinners = useCallback((): 'built' | 'already_built' => {
    const dinnerNames = Object.values(state.days)
      .map((d) => d.dinner)
      .filter(Boolean);
    const fingerprint = dinnerNames.slice().sort().join('|');

    // Warn if dinners haven't changed since last build
    if (fingerprint === lastBuiltDinnerFingerprint.current) {
      return 'already_built';
    }

    const recipes = getRecipes();
    const recipeLookup = new Map(
      recipes.map((r) => [r.name.toLowerCase(), r])
    );

    // Collect all ingredients across all dinner recipes
    const allIngredients: string[] = [];
    const unmatchedDinners: string[] = [];

    for (const name of dinnerNames) {
      const recipe = recipeLookup.get(name.toLowerCase());
      if (recipe && recipe.ingredients.length > 0) {
        allIngredients.push(...recipe.ingredients);
      } else {
        unmatchedDinners.push(name);
      }
    }

    // Match against Walmart catalog and merge duplicates
    const merged = mergeIngredients(allIngredients);
    const newItems: GroceryItem[] = merged.map((m) => ({
      id: generateId(),
      name: m.name,
    }));

    // Add placeholder items for dinners without recipes
    for (const name of unmatchedDinners) {
      newItems.push({ id: generateId(), name: `Ingredients for: ${name}` });
    }

    lastBuiltDinnerFingerprint.current = fingerprint;

    setState((prev) => ({
      ...prev,
      groceryItems: [...prev.groceryItems, ...newItems],
    }));

    return 'built';
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

  const getSchoolMenu = useCallback(
    (dateKey: string): SchoolLunchMenu | null => {
      return schoolMenus[dateKey] ?? null;
    },
    [schoolMenus]
  );

  const toggleEditMode = useCallback(() => setEditMode((m) => !m), []);

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
        getCalendarEventsForDay,
        addGroceryItem,
        removeGroceryItem,
        buildGroceryFromDinners,
        addCaraNote,
        removeCaraNote,
        copyCaraNotes,
        getWeatherForDay,
        getSchoolMenu,
        swapDinner,
        editMode,
        toggleEditMode,
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
