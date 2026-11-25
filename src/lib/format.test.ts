import { describe, expect, it } from 'vitest';
import { formatElapsed, formatMonthYear } from './format';

describe('formatElapsed', () => {
  const now = Date.UTC(2026, 10, 25); // 25 Nov 2026

  it('reports whole years and months', () => {
    expect(formatElapsed(Date.UTC(2017, 7, 29), now)).toBe('9y 2mo');
    expect(formatElapsed(Date.UTC(2025, 10, 25), now)).toBe('1y');
    expect(formatElapsed(Date.UTC(2026, 8, 25), now)).toBe('2mo');
  });

  it('falls back to days for recent dates', () => {
    expect(formatElapsed(Date.UTC(2026, 10, 20), now)).toBe('5d');
    expect(formatElapsed(Date.UTC(2026, 10, 25), now)).toBe('today');
  });

  it('handles missing or future dates', () => {
    expect(formatElapsed(0, now)).toBe('an unknown time');
    expect(formatElapsed(Date.UTC(2027, 0, 1), now)).toBe('today');
  });
});

describe('formatMonthYear', () => {
  it('uses UTC so the month does not shift', () => {
    expect(formatMonthYear(Date.UTC(2017, 7, 29))).toBe('Aug 2017');
    expect(formatMonthYear(0)).toBe('unknown date');
  });
});
