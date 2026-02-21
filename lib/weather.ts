const WEATHER_CACHE_KEY = 'weather_cache';
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

interface WeatherDay {
  dateKey: string;
  code: number;
  high: number;
  low: number;
}

interface WeatherCache {
  timestamp: number;
  data: WeatherDay[];
}

// WMO weather codes → emoji
const WEATHER_ICONS: Record<number, string> = {
  0: '\u2600\uFE0F',      // Clear sky ☀️
  1: '\u{1F324}\uFE0F',   // Mainly clear 🌤️
  2: '\u26C5',             // Partly cloudy ⛅
  3: '\u2601\uFE0F',      // Overcast ☁️
  45: '\u{1F32B}\uFE0F',  // Fog 🌫️
  48: '\u{1F32B}\uFE0F',  // Depositing rime fog 🌫️
  51: '\u{1F326}\uFE0F',  // Light drizzle 🌦️
  53: '\u{1F326}\uFE0F',  // Moderate drizzle 🌦️
  55: '\u{1F326}\uFE0F',  // Dense drizzle 🌦️
  61: '\u{1F327}\uFE0F',  // Slight rain 🌧️
  63: '\u{1F327}\uFE0F',  // Moderate rain 🌧️
  65: '\u{1F327}\uFE0F',  // Heavy rain 🌧️
  71: '\u{1F328}\uFE0F',  // Slight snow 🌨️
  73: '\u{1F328}\uFE0F',  // Moderate snow 🌨️
  75: '\u{1F328}\uFE0F',  // Heavy snow 🌨️
  77: '\u{1F328}\uFE0F',  // Snow grains 🌨️
  80: '\u{1F326}\uFE0F',  // Slight rain showers 🌦️
  81: '\u{1F327}\uFE0F',  // Moderate rain showers 🌧️
  82: '\u{1F327}\uFE0F',  // Violent rain showers 🌧️
  85: '\u{1F328}\uFE0F',  // Slight snow showers 🌨️
  86: '\u{1F328}\uFE0F',  // Heavy snow showers 🌨️
  95: '\u26C8\uFE0F',     // Thunderstorm ⛈️
  96: '\u26C8\uFE0F',     // Thunderstorm with slight hail ⛈️
  99: '\u26C8\uFE0F',     // Thunderstorm with heavy hail ⛈️
};

export function getWeatherIcon(code: number): string {
  return WEATHER_ICONS[code] ?? '\u2600\uFE0F';
}

export function getCachedWeather(): WeatherDay[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(WEATHER_CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as WeatherCache;
    if (Date.now() - cache.timestamp > CACHE_DURATION_MS) return null;
    return cache.data;
  } catch {
    return null;
  }
}

function setCachedWeather(data: WeatherDay[]): void {
  if (typeof window === 'undefined') return;
  const cache: WeatherCache = { timestamp: Date.now(), data };
  localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(cache));
}

export async function fetchWeather(
  latitude: number,
  longitude: number
): Promise<WeatherDay[]> {
  const cached = getCachedWeather();
  if (cached) return cached;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=auto&forecast_days=14`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();

    const days: WeatherDay[] = (json.daily.time as string[]).map(
      (date: string, i: number) => ({
        dateKey: date,
        code: json.daily.weather_code[i],
        high: Math.round(json.daily.temperature_2m_max[i]),
        low: Math.round(json.daily.temperature_2m_min[i]),
      })
    );

    setCachedWeather(days);
    return days;
  } catch {
    return [];
  }
}
