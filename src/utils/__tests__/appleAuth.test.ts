import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildAppleReminderIcal,
  getCachedAppleProfile,
  signOutApple,
  APPLE_USER_PROFILE_STORAGE_KEY,
} from '../appleAuth';
import { TaskItem } from '../../types';

describe('appleAuth utility tests', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('correctly builds Apple Reminders VTODO iCal payload with reminders & priorities', () => {
    const task: TaskItem = {
      id: 'apple-task-1',
      title: 'Kupić bilet',
      description: 'Pociąg do Krakowa',
      category: 'personal',
      priority: 'urgent',
      completed: false,
      plannedDurationMinutes: 30,
      actualDurationSeconds: 0,
      timeLogs: [],
      recurring: 'none',
      date: '2026-09-12',
      startTime: '08:15',
      isReminder: true,
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-01T10:00:00.000Z',
    };

    const ical = buildAppleReminderIcal(task);

    expect(ical).toContain('BEGIN:VTODO');
    expect(ical).toContain('SUMMARY:Kupić bilet');
    expect(ical).toContain('DESCRIPTION:Pociąg do Krakowa');
    expect(ical).toContain('PRIORITY:1');
    expect(ical).toContain('STATUS:NEEDS-ACTION');
    expect(ical).toContain('BEGIN:VALARM');
    expect(ical).toContain('END:VTODO');
  });

  it('manages Apple user profile caching and sign out in sessionStorage', () => {
    sessionStorage.setItem(
      APPLE_USER_PROFILE_STORAGE_KEY,
      JSON.stringify({ id: 'apple-999', email: 'user@icloud.com', name: 'Apple User' })
    );

    const profile = getCachedAppleProfile();
    expect(profile?.email).toBe('user@icloud.com');
    expect(profile?.name).toBe('Apple User');

    signOutApple();
    expect(getCachedAppleProfile()).toBeNull();
  });
});
