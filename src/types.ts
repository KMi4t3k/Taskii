export type CategoryType = 
  | 'work' 
  | 'focus' 
  | 'personal' 
  | 'health' 
  | 'study' 
  | 'meeting' 
  | 'urgent';

export type PriorityType = 'low' | 'medium' | 'high' | 'urgent';

export type RecurrenceType = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly';

export interface TimeLog {
  id: string;
  startTime: number; // timestamp ms
  endTime?: number;  // timestamp ms
  durationSeconds: number;
  note?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  date?: string; // YYYY-MM-DD or empty for backlog
  startTime?: string; // HH:mm format, e.g. "09:00"
  endTime?: string;   // HH:mm format, e.g. "10:30"
  plannedDurationMinutes: number; // e.g. 60
  actualDurationSeconds: number; // accumulated tracked seconds
  category: CategoryType;
  priority: PriorityType;
  completed: boolean;
  completedAt?: string;
  isReminder: boolean;
  reminderTime?: string; // HH:mm or timestamp
  snoozedUntil?: string; // ISO string
  recurring: RecurrenceType;
  color?: string;
  patternId?: string; // If instantiated from a pattern template
  tags?: string[];
  timeLogs: TimeLog[];
  isTentative?: boolean; // 2137 seconds provisional state (PT35M37S)
  tentativeExpiresAt?: number; // 300 seconds planning window expiry timestamp
  createdAt: string;
  updatedAt: string;
}

export interface PatternBlock {
  id: string;
  title: string;
  startTime: string; // "08:00"
  endTime: string;   // "09:30"
  plannedDurationMinutes: number;
  category: CategoryType;
  priority: PriorityType;
  color: string;
  isReminder?: boolean;
}

export interface PatternTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: CategoryType;
  blocks: PatternBlock[];
  isCustom?: boolean;
}

export type CalendarViewMode = 'day' | 'week' | 'month' | 'agenda';
export type ViewMode = CalendarViewMode | 'reminders' | 'analytics';

export interface ActiveTimerState {
  taskId: string | null;
  taskTitle: string;
  mode: 'stopwatch' | 'pomodoro';
  status: 'idle' | 'running' | 'paused';
  elapsedSeconds: number;
  pomodoroTargetSeconds: number; // e.g. 25 * 60
  isBreak: boolean;
  sessionStartTime: number | null;
  pomodoroCount: number;
  isQuickStart?: boolean; // Toggl-style Quick-Start session
  isTentative?: boolean; // 2137s provisional flag
  planningRemainingSeconds?: number; // 300s countdown
}

export interface SyncDataPayload {
  version: number;
  exportedAt: string;
  deviceId: string;
  deviceName: string;
  tasks: TaskItem[];
  customPatterns: PatternTemplate[];
  userPreferences: {
    theme: 'system' | 'light' | 'dark';
    timeFormat: '12h' | '24h';
    soundEnabled: boolean;
    defaultPomodoroMins: number;
    defaultBreakMins: number;
    startHour: number; // e.g. 6 (6 AM)
    endHour: number;   // e.g. 23 (11 PM)
  };
}

export interface DayStats {
  date: string;
  plannedMinutes: number;
  actualMinutes: number;
  completedCount: number;
  totalCount: number;
  categoryBreakdown: Record<CategoryType, number>;
}

export type CalDavProvider = 'gmail' | 'icloud' | 'custom';

export interface CalDavAccount {
  id: string;
  provider: CalDavProvider;
  email: string; // e.g. user@gmail.com or user@icloud.com
  displayName: string;
  serverUrl: string;
  calendarName: string;
  appPassword?: string; // App-specific password (Google / Apple)
  secretCalendarUrl?: string; // Google Calendar Secret iCal Address or CalDAV WebDAV URL
  authType: 'app_password' | 'token' | 'secret_url' | 'oauth_google' | 'apple_id';
  syncDirection: 'two-way' | 'export-only' | 'import-only';
  autoSync: boolean;
  autoSyncIntervalMins: number;
  lastSyncedAt?: string;
  lastSyncStatus?: 'success' | 'error' | 'syncing' | 'idle';
  lastSyncMessage?: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}
