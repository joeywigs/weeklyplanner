const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function getSundayOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getWeekDates(weekOffset: number = 0): Date[] {
  const now = new Date();
  now.setDate(now.getDate() + weekOffset * 7);
  const sunday = getSundayOfWeek(now);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d;
  });
}

export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDayName(date: Date): string {
  return DAY_NAMES[date.getDay()] ?? '';
}

export function getShortDayName(date: Date): string {
  return SHORT_DAY_NAMES[date.getDay()] ?? '';
}

export function formatShortDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function formatWeekRange(dates: Date[]): string {
  if (dates.length === 0) return '';
  const first = dates[0]!;
  const last = dates[dates.length - 1]!;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const firstMonth = months[first.getMonth()]!;
  const lastMonth = months[last.getMonth()]!;

  if (first.getMonth() === last.getMonth()) {
    return `${firstMonth} ${first.getDate()} – ${last.getDate()}, ${first.getFullYear()}`;
  }
  return `${firstMonth} ${first.getDate()} – ${lastMonth} ${last.getDate()}, ${last.getFullYear()}`;
}

export function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

export function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}
