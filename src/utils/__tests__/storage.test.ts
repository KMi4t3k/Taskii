import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveTasks,
  loadSavedTasks,
  saveActiveTimer,
  loadActiveTimer,
  saveCustomPatterns,
  loadCustomPatterns,
  exportSyncPayload,
  importSyncPayload,
  generateSyncCode,
  decodeSyncCode,
  getOrCreateDeviceId,
} from '../storage';
import { TaskItem, PatternTemplate } from '../../types';

describe('storage utilities', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('generates and persists unique device ID', () => {
    const id1 = getOrCreateDeviceId();
    expect(id1).toMatch(/^dev-/);
    const id2 = getOrCreateDeviceId();
    expect(id2).toBe(id1);
  });

  it('saves and loads tasks from localStorage', () => {
    const tasks: TaskItem[] = [
      {
        id: 'test-task-1',
        title: 'Test Task Title',
        date: '2026-09-02',
        plannedDurationMinutes: 30,
        actualDurationSeconds: 0,
        category: 'work',
        priority: 'high',
        completed: false,
        isReminder: false,
        recurring: 'none',
        timeLogs: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    saveTasks(tasks);
    const loaded = loadSavedTasks();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].title).toBe('Test Task Title');
  });

  it('saves and loads active timer state', () => {
    const timerState = {
      taskId: 'task-1',
      taskTitle: 'Focus Sprint',
      status: 'running' as const,
      mode: 'pomodoro' as const,
      elapsedSeconds: 120,
      pomodoroTargetSeconds: 1500,
      isBreak: false,
      sessionStartTime: Date.now(),
      pomodoroCount: 2,
    };

    saveActiveTimer(timerState);
    const loaded = loadActiveTimer();
    expect(loaded.taskId).toBe('task-1');
    expect(loaded.taskTitle).toBe('Focus Sprint');
    expect(loaded.elapsedSeconds).toBe(120);
    expect(loaded.pomodoroCount).toBe(2);
  });

  it('saves and loads custom pattern templates', () => {
    const patterns: PatternTemplate[] = [
      {
        id: 'custom-1',
        name: 'Custom Morning Routine',
        description: 'Test routine',
        category: 'health',
        color: '#10b981',
        icon: 'Dumbbell',
        blocks: [],
      },
    ];

    saveCustomPatterns(patterns);
    const loaded = loadCustomPatterns();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe('Custom Morning Routine');
  });

  it('exports and imports sync payload JSON correctly', () => {
    const tasks: TaskItem[] = [
      {
        id: 'sync-task-1',
        title: 'Sync Task',
        date: '2026-09-02',
        plannedDurationMinutes: 45,
        actualDurationSeconds: 0,
        category: 'focus',
        priority: 'urgent',
        completed: false,
        isReminder: true,
        recurring: 'none',
        timeLogs: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const json = exportSyncPayload(tasks, []);
    expect(json).toContain('sync-task-1');

    localStorage.clear();
    const success = importSyncPayload(json);
    expect(success).toBe(true);

    const loaded = loadSavedTasks();
    expect(loaded.some((t) => t.id === 'sync-task-1')).toBe(true);
  });

  it('encodes and decodes base64 sync token correctly', () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      deviceId: 'dev-12345',
      deviceName: 'Test Device',
      tasks: [
        {
          id: 'b64-task-1',
          title: 'Base64 Encoded Task',
          date: '2026-09-02',
          plannedDurationMinutes: 60,
          actualDurationSeconds: 0,
          category: 'work' as const,
          priority: 'medium' as const,
          completed: false,
          isReminder: false,
          recurring: 'none' as const,
          timeLogs: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      customPatterns: [],
      userPreferences: {
        theme: 'system' as const,
        timeFormat: '12h' as const,
        soundEnabled: true,
        defaultPomodoroMins: 25,
        defaultBreakMins: 5,
        startHour: 6,
        endHour: 23,
      },
    };

    const code = generateSyncCode(payload);
    expect(code).toBeDefined();
    expect(typeof code).toBe('string');
    expect(code.length).toBeGreaterThan(0);

    const decoded = decodeSyncCode(code);
    expect(decoded).not.toBeNull();
    expect(decoded?.deviceId).toBe('dev-12345');
    expect(decoded?.tasks[0].title).toBe('Base64 Encoded Task');
  });

  it('handles invalid sync code gracefully without throwing', () => {
    const invalid = decodeSyncCode('not-a-valid-base64-payload!!!');
    expect(invalid).toBeNull();

    const importFail = importSyncPayload('invalid payload string');
    expect(importFail).toBe(false);
  });
});
