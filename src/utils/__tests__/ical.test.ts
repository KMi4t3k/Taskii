import { describe, it, expect } from 'vitest';
import { generateICalContent, parseICalToTasks, generateICalendarData, parseICalendarData } from '../ical';
import { TaskItem } from '../../types';

describe('ical utilities', () => {
  const sampleTasks: TaskItem[] = [
    {
      id: 'task-1',
      title: 'Project Kickoff & Strategy',
      description: 'Discuss milestones and deliverables',
      date: '2026-09-02',
      startTime: '09:00',
      endTime: '10:00',
      plannedDurationMinutes: 60,
      actualDurationSeconds: 1800,
      category: 'work',
      priority: 'high',
      completed: false,
      isReminder: true,
      recurring: 'none',
      timeLogs: [],
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-01T10:00:00.000Z',
    },
    {
      id: 'task-2',
      title: 'All-Day Planning Session, with commas & semicolons; and newlines\nsecond line',
      description: 'Important review',
      date: '2026-09-03',
      plannedDurationMinutes: 480,
      actualDurationSeconds: 0,
      category: 'focus',
      priority: 'urgent',
      completed: true,
      isReminder: false,
      recurring: 'none',
      timeLogs: [],
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-01T10:00:00.000Z',
    },
  ];

  it('generates valid RFC 5545 iCalendar content', () => {
    const ical = generateICalContent(sampleTasks);
    expect(ical).toContain('BEGIN:VCALENDAR');
    expect(ical).toContain('VERSION:2.0');
    expect(ical).toContain('BEGIN:VEVENT');
    expect(ical).toContain('SUMMARY:Project Kickoff & Strategy');
    expect(ical).toContain('DTSTART:20260902T090000');
    expect(ical).toContain('DTEND:20260902T100000');
    expect(ical).toContain('BEGIN:VALARM'); // reminder alarm
    expect(ical).toContain('END:VCALENDAR');
  });

  it('escapes text characters in export properly', () => {
    const ical = generateICalContent(sampleTasks);
    expect(ical).toContain('All-Day Planning Session\\, with commas & semicolons\\; and newlines\\nsecond line');
  });

  it('parses iCalendar strings back into task items', () => {
    const icalString = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//EN
BEGIN:VEVENT
UID:12345
DTSTART:20260905T140000
DTEND:20260905T153000
SUMMARY:Team Sync & Retrospective
DESCRIPTION:Weekly sprint retrospective
END:VEVENT
BEGIN:VEVENT
UID:67890
DTSTART:20260906
SUMMARY:Whole Day Workshop
DESCRIPTION:Full team workshop
END:VEVENT
END:VCALENDAR`;

    const tasks = parseICalToTasks(icalString);
    expect(tasks).toHaveLength(2);

    expect(tasks[0].title).toBe('Team Sync & Retrospective');
    expect(tasks[0].date).toBe('2026-09-05');
    expect(tasks[0].startTime).toBe('14:00');
    expect(tasks[0].endTime).toBe('15:30');
    expect(tasks[0].description).toBe('Weekly sprint retrospective');

    expect(tasks[1].title).toBe('Whole Day Workshop');
    expect(tasks[1].date).toBe('2026-09-06');
    expect(tasks[1].startTime).toBeUndefined();
  });

  it('supports aliases generateICalendarData and parseICalendarData', () => {
    expect(typeof generateICalendarData).toBe('function');
    expect(typeof parseICalendarData).toBe('function');
  });
});
