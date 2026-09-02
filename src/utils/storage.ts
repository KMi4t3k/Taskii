import { TaskItem, PatternTemplate, SyncDataPayload, ActiveTimerState } from '../types';
import { getTodayString, addMinutesToTimeString } from './dateUtils';
import { DEFAULT_PATTERNS } from './patterns';
import { runSafeGarbageCollection } from './security/garbageCollectorHardening';

const STORAGE_KEYS = {
  TASKS: 'taskii_tasks_v1',
  TASKS_LEGACY: 'chronoflow_tasks_v1',
  PATTERNS: 'taskii_custom_patterns_v1',
  PATTERNS_LEGACY: 'chronoflow_custom_patterns_v1',
  PREFS: 'taskii_user_prefs_v1',
  DEVICE_ID: 'taskii_device_id',
  TIMER: 'taskii_active_timer_v1',
};

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'device-server';
  let deviceId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID) || localStorage.getItem('chronoflow_device_id');
  if (!deviceId) {
    deviceId = `dev-${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
  }
  return deviceId;
}

export function detectDevicePlatform(): 'ios' | 'windows' | 'web' {
  if (typeof window === 'undefined') return 'web';
  const ua = window.navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/windows|win32|win64/.test(ua)) return 'windows';
  return 'web';
}

export function loadSavedTasks(): TaskItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TASKS) || localStorage.getItem(STORAGE_KEYS.TASKS_LEGACY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // SEC-04 App OnStart Hardened Garbage Collection
        const { cleanedTasks, deletedCount } = runSafeGarbageCollection(parsed, 300);

        if (deletedCount > 0 || cleanedTasks.length !== parsed.length) {
          saveTasks(cleanedTasks);
        }

        return cleanedTasks;
      }
    }
  } catch (e) {
    console.error('Failed to parse tasks from localStorage', e);
  }
  // Initialize with sample tasks for a rich starting experience
  const initial = generateSampleInitialTasks();
  saveTasks(initial);
  return initial;
}

export const loadTasks = loadSavedTasks;

export function loadActiveTimer(): ActiveTimerState {
  const defaultTimer: ActiveTimerState = {
    taskId: null,
    taskTitle: '',
    status: 'idle',
    mode: 'stopwatch',
    elapsedSeconds: 0,
    pomodoroTargetSeconds: 25 * 60,
    isBreak: false,
    sessionStartTime: null,
    pomodoroCount: 0,
  };

  if (typeof window === 'undefined') return defaultTimer;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TIMER);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load active timer', e);
  }
  return defaultTimer;
}

export function saveActiveTimer(timer: ActiveTimerState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.TIMER, JSON.stringify(timer));
  } catch (e) {
    console.error('Failed to save timer', e);
  }
}

export function saveTasks(tasks: TaskItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  } catch (e) {
    console.error('Failed to save tasks', e);
  }
}

export function loadCustomPatterns(): PatternTemplate[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PATTERNS) || localStorage.getItem(STORAGE_KEYS.PATTERNS_LEGACY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to parse custom patterns', e);
  }
  return [];
}

export function saveCustomPatterns(patterns: PatternTemplate[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.PATTERNS, JSON.stringify(patterns));
  } catch (e) {
    console.error('Failed to save custom patterns', e);
  }
}

export function exportSyncPayload(tasks?: TaskItem[], customPatterns?: PatternTemplate[]): string {
  const currentTasks = tasks || loadSavedTasks();
  const currentPatterns = customPatterns || loadCustomPatterns();
  const deviceId = getOrCreateDeviceId();
  const platform = detectDevicePlatform();
  const payload: SyncDataPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    deviceId,
    deviceName: `${platform.toUpperCase()} Device (${deviceId.slice(-4)})`,
    tasks: currentTasks,
    customPatterns: currentPatterns,
    userPreferences: {
      theme: 'system',
      timeFormat: '12h',
      soundEnabled: true,
      defaultPomodoroMins: 25,
      defaultBreakMins: 5,
      startHour: 6,
      endHour: 23,
    },
  };
  return JSON.stringify(payload, null, 2);
}

export function importSyncPayload(rawInput: string): boolean {
  try {
    let payload: SyncDataPayload | null = null;
    const trimmed = rawInput.trim();
    if (trimmed.startsWith('{')) {
      payload = JSON.parse(trimmed);
    } else {
      payload = decodeSyncCode(trimmed);
    }

    if (payload && Array.isArray(payload.tasks)) {
      saveTasks(payload.tasks);
      if (Array.isArray(payload.customPatterns)) {
        saveCustomPatterns(payload.customPatterns);
      }
      return true;
    }
  } catch (e) {
    console.error('Failed to import sync payload', e);
  }
  return false;
}

export function generateSyncCode(payload: SyncDataPayload): string {
  // Compress/encode to base64 sync token
  try {
    const json = JSON.stringify(payload);
    // encode UTF-8 safe base64
    const base64 = btoa(encodeURIComponent(json));
    return base64;
  } catch {
    return '';
  }
}

export function decodeSyncCode(code: string): SyncDataPayload | null {
  try {
    const trimmed = (code || '').trim();
    if (!trimmed) return null;
    let json = '';
    try {
      json = decodeURIComponent(atob(trimmed));
    } catch {
      json = atob(trimmed);
    }
    const payload = JSON.parse(json);
    if (payload && Array.isArray(payload.tasks)) {
      return payload as SyncDataPayload;
    }
  } catch (e) {
    console.error('Invalid sync code', e);
  }
  return null;
}

export function generateSampleInitialTasks(): TaskItem[] {
  const today = getTodayString();
  const now = new Date();

  // Create sample for today
  return [
    {
      id: 'task-sample-1',
      title: 'Morning Strategy & Roadmap Review',
      description: 'Review quarterly goals, align key milestones, and set top 3 daily priorities.',
      date: today,
      startTime: '08:30',
      endTime: '09:30',
      plannedDurationMinutes: 60,
      actualDurationSeconds: 3600, // 60 mins tracked
      category: 'work',
      priority: 'high',
      completed: true,
      completedAt: new Date(now.getTime() - 3600000).toISOString(),
      isReminder: false,
      recurring: 'none',
      color: '#3b82f6',
      timeLogs: [
        {
          id: 'log-1',
          startTime: Date.now() - 7200000,
          endTime: Date.now() - 3600000,
          durationSeconds: 3600,
          note: 'Completed quarterly priorities definition',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'task-sample-2',
      title: 'Core Architecture Deep Work',
      description: 'Implement core modules, refine type definitions, and optimize database indexing.',
      date: today,
      startTime: '10:00',
      endTime: '12:00',
      plannedDurationMinutes: 120,
      actualDurationSeconds: 4500, // 75 mins tracked
      category: 'focus',
      priority: 'urgent',
      completed: false,
      isReminder: true,
      reminderTime: '10:00',
      recurring: 'none',
      color: '#6366f1',
      timeLogs: [
        {
          id: 'log-2',
          startTime: Date.now() - 3600000,
          endTime: Date.now() - 900000,
          durationSeconds: 2700,
          note: 'Focus block 1: module restructuring',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'task-sample-3',
      title: 'Nutrition & Midday Stretch',
      description: 'Balanced lunch, hydration refill, and 15 min restorative walk.',
      date: today,
      startTime: '12:30',
      endTime: '13:30',
      plannedDurationMinutes: 60,
      actualDurationSeconds: 0,
      category: 'health',
      priority: 'medium',
      completed: false,
      isReminder: true,
      reminderTime: '12:30',
      recurring: 'daily',
      color: '#10b981',
      timeLogs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'task-sample-4',
      title: 'Client Demo & Feedback Sync',
      description: 'Demonstrate new cross-platform time-blocking flow on iOS and Windows.',
      date: today,
      startTime: '14:00',
      endTime: '15:00',
      plannedDurationMinutes: 60,
      actualDurationSeconds: 0,
      category: 'meeting',
      priority: 'high',
      completed: false,
      isReminder: true,
      reminderTime: '13:50',
      recurring: 'none',
      color: '#f43f5e',
      timeLogs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'task-sample-5',
      title: 'Submit Expense Reports & Invoices',
      description: 'Monthly business receipt reconciliations and cloud subscriptions review.',
      date: today,
      plannedDurationMinutes: 30,
      actualDurationSeconds: 0,
      category: 'work',
      priority: 'urgent',
      completed: false,
      isReminder: true,
      reminderTime: '17:00',
      recurring: 'monthly',
      color: '#ef4444',
      timeLogs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'task-sample-6',
      title: 'Read 20 pages of Systems Engineering',
      description: 'Chapter 4: Scalable State Machines & Distributed Concurrency.',
      date: today,
      startTime: '20:30',
      endTime: '21:15',
      plannedDurationMinutes: 45,
      actualDurationSeconds: 0,
      category: 'study',
      priority: 'medium',
      completed: false,
      isReminder: true,
      reminderTime: '20:30',
      recurring: 'daily',
      color: '#8b5cf6',
      timeLogs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    // Backlog / Unscheduled tasks ready to be dragged onto calendar
    {
      id: 'task-backlog-1',
      title: 'Refactor Auth Token Cache',
      description: 'Migrate to resilient secure store with auto-refresh interceptor.',
      plannedDurationMinutes: 90,
      actualDurationSeconds: 0,
      category: 'focus',
      priority: 'high',
      completed: false,
      isReminder: false,
      recurring: 'none',
      color: '#6366f1',
      timeLogs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'task-backlog-2',
      title: 'Car Maintenance & Tire Pressure Check',
      description: 'Scheduled seasonal check-up at local service center.',
      plannedDurationMinutes: 45,
      actualDurationSeconds: 0,
      category: 'personal',
      priority: 'low',
      completed: false,
      isReminder: true,
      recurring: 'none',
      color: '#10b981',
      timeLogs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}
