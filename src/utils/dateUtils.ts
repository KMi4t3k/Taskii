/**
 * Date and time manipulation utilities for Calendar & Time-Blocking
 */

export function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const [y, m, d] = dateString.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatFullDate(dateString: string): string {
  if (!dateString) return '';
  const [y, m, d] = dateString.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getRelativeDayLabel(dateString: string): string {
  if (!dateString) return '';
  const today = getTodayString();
  if (dateString === today) return 'Today';

  const [y, m, d] = dateString.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  
  const [ty, tm, td] = today.split('-').map(Number);
  const todayDate = new Date(ty, tm - 1, td);

  const diffDays = Math.round((target.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 7) {
    return target.toLocaleDateString(undefined, { weekday: 'long' });
  }

  return target.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTimeString(totalMinutes: number): string {
  const norm = Math.max(0, Math.min(24 * 60 - 1, Math.round(totalMinutes)));
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatTimeDisplay(timeStr: string, is24h: boolean = false): string {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);

  if (is24h) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
}

export function addMinutesToTimeString(timeStr: string, minutesToAdd: number): string {
  const currentMins = parseTimeToMinutes(timeStr);
  return minutesToTimeString(currentMins + minutesToAdd);
}

export function calculateDurationMinutes(startTime: string, endTime: string): number {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  if (end >= start) return end - start;
  return (24 * 60 - start) + end;
}

export function getWeekDays(referenceDate: string): { date: string; dayName: string; dayNumber: number; isToday: boolean }[] {
  const [y, m, d] = referenceDate.split('-').map(Number);
  const current = new Date(y, m - 1, d);
  
  // Find Monday of the current week (or Sunday depending on preference)
  const dayOfWeek = current.getDay(); // 0 is Sunday, 1 is Monday
  const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(current);
  monday.setDate(current.getDate() + distanceToMonday);

  const todayStr = getTodayString();
  const weekDays = [];

  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    const year = day.getFullYear();
    const month = String(day.getMonth() + 1).padStart(2, '0');
    const dayNum = String(day.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayNum}`;

    weekDays.push({
      date: dateStr,
      dayName: day.toLocaleDateString(undefined, { weekday: 'short' }),
      dayNumber: day.getDate(),
      isToday: dateStr === todayStr,
    });
  }

  return weekDays;
}

export function getMonthMatrix(year: number, monthIndex: number): { date: string; isCurrentMonth: boolean; isToday: boolean }[][] {
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);

  const startDayOfWeek = firstDay.getDay(); // 0 is Sunday
  // Align to Monday start
  const adjustedStart = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

  const todayStr = getTodayString();
  const matrix: { date: string; isCurrentMonth: boolean; isToday: boolean }[][] = [];

  let currentWeek: { date: string; isCurrentMonth: boolean; isToday: boolean }[] = [];

  // Previous month trailing days
  const prevMonthLastDay = new Date(year, monthIndex, 0).getDate();
  for (let i = adjustedStart - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i;
    const prevDate = new Date(year, monthIndex - 1, d);
    const dateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    currentWeek.push({
      date: dateStr,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
    });
  }

  // Current month days
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    currentWeek.push({
      date: dateStr,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
    });

    if (currentWeek.length === 7) {
      matrix.push(currentWeek);
      currentWeek = [];
    }
  }

  // Next month leading days to complete the matrix
  let nextDay = 1;
  while (currentWeek.length > 0 && currentWeek.length < 7) {
    const nextDate = new Date(year, monthIndex + 1, nextDay);
    const dateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`;
    currentWeek.push({
      date: dateStr,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
    });
    nextDay++;
  }
  if (currentWeek.length > 0) {
    matrix.push(currentWeek);
  }

  return matrix;
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) {
    return `${mins}m ${secs > 0 ? `${secs}s` : ''}`.trim() || '0m';
  }
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}h ${remMins > 0 ? `${remMins}m` : ''}`.trim();
}

export function formatSecondsToDigital(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
