import { describe, it, expect } from 'vitest';
import {
  getTodayString,
  formatDate,
  formatFullDate,
  getRelativeDayLabel,
  parseTimeToMinutes,
  minutesToTimeString,
  formatTimeDisplay,
  addMinutesToTimeString,
  calculateDurationMinutes,
  getWeekDays,
  getMonthMatrix,
  formatDuration,
  formatSecondsToDigital,
} from '../dateUtils';

describe('dateUtils', () => {
  it('getTodayString returns YYYY-MM-DD format', () => {
    const today = getTodayString();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('formatDate formats valid date strings and handles empty strings', () => {
    expect(formatDate('')).toBe('');
    const formatted = formatDate('2026-09-02');
    expect(formatted).toContain('Sep');
    expect(formatted).toContain('2');
  });

  it('formatFullDate formats complete date with weekday and year', () => {
    expect(formatFullDate('')).toBe('');
    const full = formatFullDate('2026-09-02');
    expect(full).toContain('2026');
    expect(full).toContain('September');
  });

  it('getRelativeDayLabel returns Today, Tomorrow, Yesterday, or formatted date', () => {
    expect(getRelativeDayLabel('')).toBe('');
    const today = getTodayString();
    expect(getRelativeDayLabel(today)).toBe('Today');

    const [y, m, d] = today.split('-').map(Number);
    const tomorrowDate = new Date(y, m - 1, d + 1);
    const tomorrowStr = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth() + 1).padStart(2, '0')}-${String(tomorrowDate.getDate()).padStart(2, '0')}`;
    expect(getRelativeDayLabel(tomorrowStr)).toBe('Tomorrow');

    const yesterdayDate = new Date(y, m - 1, d - 1);
    const yesterdayStr = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`;
    expect(getRelativeDayLabel(yesterdayStr)).toBe('Yesterday');
  });

  it('parseTimeToMinutes correctly parses HH:MM to minute totals', () => {
    expect(parseTimeToMinutes('')).toBe(0);
    expect(parseTimeToMinutes('00:00')).toBe(0);
    expect(parseTimeToMinutes('01:30')).toBe(90);
    expect(parseTimeToMinutes('14:45')).toBe(14 * 60 + 45);
    expect(parseTimeToMinutes('23:59')).toBe(23 * 60 + 59);
  });

  it('minutesToTimeString clamps and formats correctly', () => {
    expect(minutesToTimeString(0)).toBe('00:00');
    expect(minutesToTimeString(90)).toBe('01:30');
    expect(minutesToTimeString(1440)).toBe('23:59'); // clamped to 23:59
    expect(minutesToTimeString(-10)).toBe('00:00'); // clamped to 00:00
  });

  it('formatTimeDisplay formats 12h and 24h formats properly', () => {
    expect(formatTimeDisplay('')).toBe('');
    expect(formatTimeDisplay('00:00', true)).toBe('00:00');
    expect(formatTimeDisplay('00:00', false)).toBe('12:00 AM');
    expect(formatTimeDisplay('12:00', false)).toBe('12:00 PM');
    expect(formatTimeDisplay('13:15', false)).toBe('1:15 PM');
    expect(formatTimeDisplay('23:59', false)).toBe('11:59 PM');
    expect(formatTimeDisplay('09:05', false)).toBe('9:05 AM');
  });

  it('addMinutesToTimeString shifts times and handles clamps', () => {
    expect(addMinutesToTimeString('10:00', 30)).toBe('10:30');
    expect(addMinutesToTimeString('10:30', -45)).toBe('09:45');
    expect(addMinutesToTimeString('23:30', 60)).toBe('23:59');
  });

  it('calculateDurationMinutes calculates same day and overnight differences', () => {
    expect(calculateDurationMinutes('09:00', '10:30')).toBe(90);
    expect(calculateDurationMinutes('10:00', '10:00')).toBe(0);
    // Overnight (e.g. 23:00 to 01:00)
    expect(calculateDurationMinutes('23:00', '01:00')).toBe(120);
  });

  it('getWeekDays generates 7 consecutive days starting Monday', () => {
    const week = getWeekDays('2026-09-02'); // Wednesday
    expect(week).toHaveLength(7);
    expect(week[0].dayName).toBeDefined();
    expect(week[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('getMonthMatrix returns proper weeks and day objects', () => {
    const matrix = getMonthMatrix(2026, 8); // September 2026
    expect(matrix.length).toBeGreaterThanOrEqual(4);
    expect(matrix[0]).toHaveLength(7);
    const hasCurrentMonth = matrix.some((week) => week.some((d) => d.isCurrentMonth));
    expect(hasCurrentMonth).toBe(true);
  });

  it('formatDuration formats seconds into hours and minutes', () => {
    expect(formatDuration(0)).toBe('0m');
    expect(formatDuration(45)).toBe('0m 45s');
    expect(formatDuration(120)).toBe('2m');
    expect(formatDuration(3660)).toBe('1h 1m');
    expect(formatDuration(7200)).toBe('2h');
  });

  it('formatSecondsToDigital formats MM:SS correctly', () => {
    expect(formatSecondsToDigital(0)).toBe('00:00');
    expect(formatSecondsToDigital(65)).toBe('01:05');
    expect(formatSecondsToDigital(1500)).toBe('25:00');
  });
});
