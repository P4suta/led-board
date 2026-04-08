import { requires } from '../contracts';

export type ClockFormat = 'HH:mm' | 'HH:mm:ss' | 'yyyy-MM-dd' | 'date-jp';

const JP_WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * Format an absolute epoch milliseconds value as a string suitable for the
 * clock scene's text path.
 *
 * Uses pure arithmetic on Date getters; the timezone parameter routes through
 * a per-format `Intl.DateTimeFormat` instance. UTC is the default for tests.
 */
export function formatTime(timeMs: number, format: ClockFormat, timeZone: string = 'UTC'): string {
  requires(timeMs >= 0, 'timeMs must be non-negative');

  // Use Intl.DateTimeFormat to derive components in the target timezone.
  // Cache the formatter per (format, timeZone) for hot-path performance.
  const parts = getParts(timeMs, timeZone);

  switch (format) {
    case 'HH:mm':
      return `${pad2(parts.hour)}:${pad2(parts.minute)}`;
    case 'HH:mm:ss':
      return `${pad2(parts.hour)}:${pad2(parts.minute)}:${pad2(parts.second)}`;
    case 'yyyy-MM-dd':
      return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
    case 'date-jp':
      return `${parts.month}月${parts.day}日(${JP_WEEKDAYS[parts.weekday] as string})`;
  }
}

interface DateParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
  second: number; // 0-59
  weekday: number; // 0=Sunday … 6=Saturday
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatterCache.get(timeZone);
  if (f === undefined) {
    f = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
      hour12: false,
    });
    formatterCache.set(timeZone, f);
  }
  return f;
}

function getParts(timeMs: number, timeZone: string): DateParts {
  const f = getFormatter(timeZone);
  const parts = f.formatToParts(new Date(timeMs));
  // Intl.DateTimeFormat with the options we configured always emits these
  // fields for valid Date inputs. Cast through `as Record<string, string>`
  // and trust the platform.
  const map: Record<string, string> = Object.fromEntries(
    parts.filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]),
  );
  return {
    year: Number.parseInt(map.year as string, 10),
    month: Number.parseInt(map.month as string, 10),
    day: Number.parseInt(map.day as string, 10),
    hour: Number.parseInt(map.hour as string, 10) % 24, // en-GB sometimes emits "24" for midnight
    minute: Number.parseInt(map.minute as string, 10),
    second: Number.parseInt(map.second as string, 10),
    weekday: WEEKDAY_INDEX[map.weekday as string] as number,
  };
}

const WEEKDAY_INDEX: Readonly<Record<string, number>> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};
