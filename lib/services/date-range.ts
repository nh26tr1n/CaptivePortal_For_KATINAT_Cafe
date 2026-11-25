import type { DateRange } from '@/types';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

function isValidDate(value: string | undefined): value is string {
  if (!value || !DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function addCalendarDays(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getCafeToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
}

export function toCafeTimestamp(date: string): string {
  return new Date(`${date}T00:00:00+07:00`).toISOString();
}

export function resolveDateRange(params: Record<string, string | string[] | undefined>): DateRange {
  const today = getCafeToday();
  const requestedPreset = typeof params.preset === 'string' ? params.preset : 'last7';
  const requestedFrom = typeof params.from === 'string' ? params.from : undefined;
  const requestedTo = typeof params.to === 'string' ? params.to : undefined;
  let fromDate = isValidDate(requestedFrom) ? requestedFrom : addCalendarDays(today, -6);
  let toDate = isValidDate(requestedTo) ? requestedTo : today;

  if (!fromDate || !toDate) {
    throw new Error('Unable to resolve a valid date range.');
  }

  if (fromDate > toDate) {
    fromDate = addCalendarDays(today, -6);
    toDate = today;
  }

  const dayCount = Math.round((Date.parse(`${toDate}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`)) / DAY_MS) + 1;
  const previousTo = addCalendarDays(fromDate, -1);
  const previousFrom = addCalendarDays(previousTo, -(dayCount - 1));

  return {
    fromDate,
    toDate,
    fromTimestamp: toCafeTimestamp(fromDate),
    toExclusiveTimestamp: toCafeTimestamp(addCalendarDays(toDate, 1)),
    previousFromTimestamp: toCafeTimestamp(previousFrom),
    previousToExclusiveTimestamp: toCafeTimestamp(fromDate),
    preset: requestedPreset
  };
}
