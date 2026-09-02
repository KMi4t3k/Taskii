import { describe, it, expect } from 'vitest';
import { DEFAULT_PATTERNS, createTasksFromPattern, generateTasksFromPattern, shiftDayBlocks, CATEGORY_COLORS } from '../patterns';
import { TaskItem } from '../../types';

describe('patterns utilities', () => {
  it('DEFAULT_PATTERNS contains predefined templates', () => {
    expect(DEFAULT_PATTERNS.length).toBeGreaterThanOrEqual(4);
    const deepWork = DEFAULT_PATTERNS.find((p) => p.id === 'pattern-deep-workday');
    expect(deepWork).toBeDefined();
    expect(deepWork?.blocks.length).toBeGreaterThan(0);
  });

  it('createTasksFromPattern generates tasks with target date', () => {
    const pattern = DEFAULT_PATTERNS[0];
    const targetDate = '2026-09-10';
    const tasks = createTasksFromPattern(pattern, targetDate);

    expect(tasks.length).toBe(pattern.blocks.length);
    tasks.forEach((t) => {
      expect(t.date).toBe(targetDate);
      expect(t.patternId).toBe(pattern.id);
      expect(t.id).toBeDefined();
      expect(t.title).toBeDefined();
    });
  });

  it('createTasksFromPattern supports startHourOverride', () => {
    const pattern = DEFAULT_PATTERNS[0]; // original first block starts at 08:30
    const targetDate = '2026-09-10';
    const tasks = createTasksFromPattern(pattern, targetDate, '09:30'); // shifted +60 mins

    expect(tasks[0].startTime).toBe('09:30');
    expect(tasks[0].endTime).toBe('10:00');
  });

  it('shiftDayBlocks shifts all tasks on a specific date forward or backward', () => {
    const originalTasks: TaskItem[] = [
      {
        id: 'task-1',
        title: 'Morning Meeting',
        date: '2026-09-10',
        startTime: '09:00',
        endTime: '10:00',
        reminderTime: '08:50',
        plannedDurationMinutes: 60,
        actualDurationSeconds: 0,
        category: 'meeting',
        priority: 'medium',
        completed: false,
        isReminder: true,
        recurring: 'none',
        timeLogs: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'task-2',
        title: 'Other Day Meeting',
        date: '2026-09-11',
        startTime: '09:00',
        endTime: '10:00',
        plannedDurationMinutes: 60,
        actualDurationSeconds: 0,
        category: 'meeting',
        priority: 'medium',
        completed: false,
        isReminder: false,
        recurring: 'none',
        timeLogs: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const shifted = shiftDayBlocks(originalTasks, '2026-09-10', 30);
    expect(shifted[0].startTime).toBe('09:30');
    expect(shifted[0].endTime).toBe('10:30');
    expect(shifted[0].reminderTime).toBe('09:20');

    // Other date unaffected
    expect(shifted[1].startTime).toBe('09:00');
    expect(shifted[1].endTime).toBe('10:00');
  });

  it('CATEGORY_COLORS has color mappings for all CategoryTypes', () => {
    expect(CATEGORY_COLORS.work).toBeDefined();
    expect(CATEGORY_COLORS.focus).toBeDefined();
    expect(CATEGORY_COLORS.health).toBeDefined();
    expect(CATEGORY_COLORS.personal).toBeDefined();
    expect(CATEGORY_COLORS.study).toBeDefined();
    expect(CATEGORY_COLORS.meeting).toBeDefined();
    expect(CATEGORY_COLORS.urgent).toBeDefined();
  });
});
