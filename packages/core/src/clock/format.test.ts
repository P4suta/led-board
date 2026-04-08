import { describe, expect, it } from 'vitest';
import { ContractError } from '../contracts';
import { formatTime } from './format';

// Use a fixed timezone for the tests; we configure the formatter to use UTC
// internally so that test results are reproducible regardless of the host TZ.

describe('clock/formatTime', () => {
  describe('HH:mm', () => {
    it('formats midnight UTC as "00:00"', () => {
      const t = Date.UTC(2026, 3, 8, 0, 0, 0);
      expect(formatTime(t, 'HH:mm', 'UTC')).toBe('00:00');
    });

    it('formats noon UTC as "12:00"', () => {
      const t = Date.UTC(2026, 3, 8, 12, 0, 0);
      expect(formatTime(t, 'HH:mm', 'UTC')).toBe('12:00');
    });

    it('zero-pads single-digit hours and minutes', () => {
      const t = Date.UTC(2026, 3, 8, 7, 5, 0);
      expect(formatTime(t, 'HH:mm', 'UTC')).toBe('07:05');
    });

    it('formats 23:59 correctly', () => {
      const t = Date.UTC(2026, 3, 8, 23, 59, 0);
      expect(formatTime(t, 'HH:mm', 'UTC')).toBe('23:59');
    });
  });

  describe('HH:mm:ss', () => {
    it('formats midnight UTC as "00:00:00"', () => {
      const t = Date.UTC(2026, 3, 8, 0, 0, 0);
      expect(formatTime(t, 'HH:mm:ss', 'UTC')).toBe('00:00:00');
    });

    it('formats with seconds zero-padded', () => {
      const t = Date.UTC(2026, 3, 8, 9, 8, 7);
      expect(formatTime(t, 'HH:mm:ss', 'UTC')).toBe('09:08:07');
    });
  });

  describe('yyyy-MM-dd', () => {
    it('formats ISO date with zero-padding', () => {
      const t = Date.UTC(2026, 0, 5, 0, 0, 0); // Jan 5
      expect(formatTime(t, 'yyyy-MM-dd', 'UTC')).toBe('2026-01-05');
    });

    it('formats December correctly (month index 11)', () => {
      const t = Date.UTC(2026, 11, 31, 0, 0, 0);
      expect(formatTime(t, 'yyyy-MM-dd', 'UTC')).toBe('2026-12-31');
    });
  });

  describe('date-jp (M月D日(曜))', () => {
    it('formats April 8 2026 (Wednesday) as "4月8日(水)"', () => {
      // 2026-04-08 is a Wednesday
      const t = Date.UTC(2026, 3, 8, 0, 0, 0);
      expect(formatTime(t, 'date-jp', 'UTC')).toBe('4月8日(水)');
    });

    it('does not zero-pad month/day for Japanese style', () => {
      const t = Date.UTC(2026, 0, 1, 0, 0, 0); // 1月1日 (木)
      expect(formatTime(t, 'date-jp', 'UTC')).toBe('1月1日(木)');
    });

    it('formats every weekday correctly across one week', () => {
      // 2026-04-05 is Sunday (verified via JS Date.getUTCDay())
      // Sun=日, Mon=月, Tue=火, Wed=水, Thu=木, Fri=金, Sat=土
      const expected = ['日', '月', '火', '水', '木', '金', '土'];
      for (let i = 0; i < 7; i++) {
        const t = Date.UTC(2026, 3, 5 + i, 12, 0, 0);
        expect(formatTime(t, 'date-jp', 'UTC')).toBe(`4月${5 + i}日(${expected[i]})`);
      }
    });
  });

  describe('input validation', () => {
    it('rejects negative time', () => {
      expect(() => formatTime(-1, 'HH:mm', 'UTC')).toThrow(ContractError);
    });
  });

  describe('determinism', () => {
    it('two calls with the same time produce the same string (HH:mm in same minute)', () => {
      const a = Date.UTC(2026, 3, 8, 12, 30, 0);
      const b = Date.UTC(2026, 3, 8, 12, 30, 59); // same minute, 59s later
      expect(formatTime(a, 'HH:mm', 'UTC')).toBe(formatTime(b, 'HH:mm', 'UTC'));
    });

    it('different seconds produce different strings for HH:mm:ss', () => {
      const a = Date.UTC(2026, 3, 8, 12, 30, 0);
      const b = Date.UTC(2026, 3, 8, 12, 30, 1);
      expect(formatTime(a, 'HH:mm:ss', 'UTC')).not.toBe(formatTime(b, 'HH:mm:ss', 'UTC'));
    });
  });
});
