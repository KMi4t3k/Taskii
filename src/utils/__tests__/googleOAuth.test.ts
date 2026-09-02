import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  buildGoogleCalendarEventPayload,
  mapGoogleEventToTaskItem,
  getCachedGoogleAccessToken,
  getCachedGoogleProfile,
  signOutGoogle,
  GOOGLE_ACCESS_TOKEN_STORAGE_KEY,
  GOOGLE_USER_PROFILE_STORAGE_KEY,
} from '../googleOAuth';
import { TaskItem } from '../../types';

describe('googleOAuth utility tests', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('correctly builds Google Calendar API event payload from Taskii task', () => {
    const task: TaskItem = {
      id: 'task-1',
      title: 'Spotkanie projektowe',
      description: 'Omówienie harmonogramu',
      category: 'work',
      priority: 'high',
      completed: false,
      plannedDurationMinutes: 90,
      actualDurationSeconds: 0,
      timeLogs: [],
      recurring: 'none',
      date: '2026-09-02',
      startTime: '10:00',
      endTime: '11:30',
      isReminder: true,
      createdAt: '2026-09-01T12:00:00.000Z',
      updatedAt: '2026-09-01T12:00:00.000Z',
    };

    const payload = buildGoogleCalendarEventPayload(task);

    expect(payload.summary).toBe('Spotkanie projektowe');
    expect(payload.description).toContain('Omówienie harmonogramu');
    expect(payload.description).toContain('[Priority: high]');
    expect(payload.start.dateTime).toBeDefined();
    expect(payload.end.dateTime).toBeDefined();
    expect(payload.reminders.overrides).toHaveLength(1);
    expect(payload.reminders.overrides[0].minutes).toBe(15);
  });

  it('correctly builds all-day Google Calendar event payload when no startTime is given', () => {
    const task: TaskItem = {
      id: 'task-2',
      title: 'Całodniowe zadanie',
      category: 'personal',
      priority: 'medium',
      completed: false,
      plannedDurationMinutes: 60,
      actualDurationSeconds: 0,
      timeLogs: [],
      recurring: 'none',
      isReminder: false,
      date: '2026-09-05',
      createdAt: '2026-09-01T12:00:00.000Z',
      updatedAt: '2026-09-01T12:00:00.000Z',
    };

    const payload = buildGoogleCalendarEventPayload(task);

    expect(payload.summary).toBe('Całodniowe zadanie');
    expect(payload.start.date).toBe('2026-09-05');
    expect(payload.end.date).toBe('2026-09-05');
  });

  it('correctly maps Google Calendar event item into Taskii TaskItem', () => {
    const googleItem = {
      id: 'gcal-evt-123',
      summary: 'Wizyta u lekarza',
      description: 'Kontrola okresowa',
      start: { dateTime: '2026-09-10T14:00:00.000Z' },
      end: { dateTime: '2026-09-10T15:00:00.000Z' },
      reminders: {
        overrides: [{ minutes: 30 }],
      },
      created: '2026-09-01T08:00:00.000Z',
    };

    const task = mapGoogleEventToTaskItem(googleItem);

    expect(task.id).toBe('gcal-gcal-evt-123');
    expect(task.title).toBe('Wizyta u lekarza');
    expect(task.description).toBe('Kontrola okresowa');
    expect(task.date).toBe('2026-09-10');
    expect(task.startTime).toBe('14:00');
    expect(task.endTime).toBe('15:00');
    expect(task.isReminder).toBe(true);
    expect(task.reminderTime).toBe('30 min przed');
  });

  it('manages token caching and sign out in sessionStorage', () => {
    sessionStorage.setItem(GOOGLE_ACCESS_TOKEN_STORAGE_KEY, 'mock-access-token');
    sessionStorage.setItem(
      GOOGLE_USER_PROFILE_STORAGE_KEY,
      JSON.stringify({ id: '123', email: 'test@gmail.com', name: 'Tester' })
    );

    expect(getCachedGoogleAccessToken()).toBe('mock-access-token');
    const profile = getCachedGoogleProfile();
    expect(profile?.email).toBe('test@gmail.com');
    expect(profile?.name).toBe('Tester');

    signOutGoogle();
    expect(getCachedGoogleAccessToken()).toBeNull();
    expect(getCachedGoogleProfile()).toBeNull();
  });
});
