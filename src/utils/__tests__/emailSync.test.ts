import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateScheduleSummaryText,
  buildEmailComposeUrl,
  loadICloudConfig,
  saveICloudConfig,
} from '../emailSync';
import { TaskItem } from '../../types';

describe('emailSync utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const sampleTasks: TaskItem[] = [
    {
      id: 'task-1',
      title: 'Review Product Architecture',
      description: 'Prepare diagrams for meeting',
      date: '2026-09-02',
      startTime: '09:00',
      endTime: '10:30',
      plannedDurationMinutes: 90,
      actualDurationSeconds: 3600,
      category: 'work',
      priority: 'high',
      completed: false,
      isReminder: false,
      recurring: 'none',
      timeLogs: [],
      createdAt: '2026-09-02T08:00:00Z',
      updatedAt: '2026-09-02T08:00:00Z',
    },
    {
      id: 'rem-1',
      title: 'Take daily vitamins & hydration',
      date: '2026-09-02',
      startTime: '12:00',
      reminderTime: '12:00',
      plannedDurationMinutes: 15,
      actualDurationSeconds: 0,
      category: 'health',
      priority: 'urgent',
      completed: false,
      isReminder: true,
      recurring: 'daily',
      timeLogs: [],
      createdAt: '2026-09-02T08:00:00Z',
      updatedAt: '2026-09-02T08:00:00Z',
    },
  ];

  it('generates a well-formatted summary text with reminders and time blocks', () => {
    const summary = generateScheduleSummaryText(sampleTasks, {
      date: '2026-09-02',
      includeReminders: true,
      includeCompleted: true,
    });

    expect(summary).toContain('TASKII SCHEDULE & REMINDERS REPORT');
    expect(summary).toContain('ACTIVE REMINDERS & ALARMS');
    expect(summary).toContain('Take daily vitamins & hydration');
    expect(summary).toContain('Review Product Architecture');
    expect(summary).toContain('09:00 - 10:30');
  });

  it('builds valid mailto and webmail URLs', () => {
    const mailto = buildEmailComposeUrl(
      'kwiatuszyn@gmail.com',
      'Daily Plan',
      'Test Body',
      'mailto'
    );
    expect(mailto).toContain('mailto:kwiatuszyn@gmail.com');
    expect(mailto).toContain('subject=Daily%20Plan');

    const gmail = buildEmailComposeUrl(
      'kwiatuszyn@gmail.com',
      'Daily Plan',
      'Test Body',
      'gmail'
    );
    expect(gmail).toContain('https://mail.google.com/mail/');
    expect(gmail).toContain('to=kwiatuszyn%40gmail.com');
  });

  it('saves and loads iCloud CalDAV configurations in localStorage', () => {
    const config = {
      appleIdEmail: 'testuser@icloud.com',
      serverUrl: 'https://caldav.icloud.com',
      calendarName: 'My Work Plan',
    };

    saveICloudConfig(config);
    const loaded = loadICloudConfig();
    expect(loaded.appleIdEmail).toBe('testuser@icloud.com');
    expect(loaded.calendarName).toBe('My Work Plan');
  });
});
