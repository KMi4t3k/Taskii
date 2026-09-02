import { PatternTemplate, TaskItem, CategoryType } from '../types';
import { addMinutesToTimeString, parseTimeToMinutes, calculateDurationMinutes } from './dateUtils';

export const DEFAULT_PATTERNS: PatternTemplate[] = [
  {
    id: 'pattern-deep-workday',
    name: 'Deep Flow Workday',
    description: 'High-leverage focus blocks, strategic buffer, and afternoon execution.',
    icon: 'Brain',
    color: '#3b82f6',
    category: 'focus',
    blocks: [
      {
        id: 'block-1',
        title: 'Morning Daily Standup & Planning',
        startTime: '08:30',
        endTime: '09:00',
        plannedDurationMinutes: 30,
        category: 'work',
        priority: 'high',
        color: '#2563eb',
        isReminder: true,
      },
      {
        id: 'block-2',
        title: 'Deep Work Sprint 1 (No Distractions)',
        startTime: '09:00',
        endTime: '11:30',
        plannedDurationMinutes: 150,
        category: 'focus',
        priority: 'urgent',
        color: '#6366f1',
      },
      {
        id: 'block-3',
        title: 'Healthy Lunch & Movement',
        startTime: '12:00',
        endTime: '13:00',
        plannedDurationMinutes: 60,
        category: 'health',
        priority: 'medium',
        color: '#10b981',
      },
      {
        id: 'block-4',
        title: 'Execution & Collaboration Block',
        startTime: '13:30',
        endTime: '15:30',
        plannedDurationMinutes: 120,
        category: 'work',
        priority: 'high',
        color: '#3b82f6',
      },
      {
        id: 'block-5',
        title: 'Admin, Inbox Zero & Day Closeout',
        startTime: '16:00',
        endTime: '17:00',
        plannedDurationMinutes: 60,
        category: 'work',
        priority: 'low',
        color: '#8b5cf6',
        isReminder: true,
      },
    ],
  },
  {
    id: 'pattern-morning-power',
    name: 'Morning Momentum Routine',
    description: 'Energizing start with hydration, meditation, workout, and day priming.',
    icon: 'Sunrise',
    color: '#f59e0b',
    category: 'health',
    blocks: [
      {
        id: 'block-mp-1',
        title: 'Wakeup, Hydrate & Mindfulness',
        startTime: '06:30',
        endTime: '07:00',
        plannedDurationMinutes: 30,
        category: 'health',
        priority: 'medium',
        color: '#f59e0b',
        isReminder: true,
      },
      {
        id: 'block-mp-2',
        title: 'Cardio / Strength Training',
        startTime: '07:00',
        endTime: '08:00',
        plannedDurationMinutes: 60,
        category: 'health',
        priority: 'high',
        color: '#10b981',
      },
      {
        id: 'block-mp-3',
        title: 'Healthy Breakfast & Day Review',
        startTime: '08:00',
        endTime: '08:45',
        plannedDurationMinutes: 45,
        category: 'personal',
        priority: 'medium',
        color: '#06b6d4',
      },
    ],
  },
  {
    id: 'pattern-study-mastery',
    name: 'Academic Study & Revision',
    description: 'Pomodoro-structured study sessions with active recall and knowledge consolidation.',
    icon: 'GraduationCap',
    color: '#8b5cf6',
    category: 'study',
    blocks: [
      {
        id: 'block-sm-1',
        title: 'Core Concept Learning & Note Review',
        startTime: '10:00',
        endTime: '11:45',
        plannedDurationMinutes: 105,
        category: 'study',
        priority: 'high',
        color: '#8b5cf6',
      },
      {
        id: 'block-sm-2',
        title: 'Active Practice & Problem Solving',
        startTime: '13:00',
        endTime: '15:00',
        plannedDurationMinutes: 120,
        category: 'study',
        priority: 'urgent',
        color: '#7c3aed',
      },
      {
        id: 'block-sm-3',
        title: 'Flashcard Drill & Summary Log',
        startTime: '15:30',
        endTime: '16:30',
        plannedDurationMinutes: 60,
        category: 'study',
        priority: 'medium',
        color: '#a855f7',
      },
    ],
  },
  {
    id: 'pattern-evening-unwind',
    name: 'Evening Wind-Down & Review',
    description: 'Disconnect from screens, prepare for tomorrow, and restorative sleep prep.',
    icon: 'Moon',
    color: '#ec4899',
    category: 'personal',
    blocks: [
      {
        id: 'block-ew-1',
        title: 'Plan Tomorrow & Clear Desktop',
        startTime: '19:30',
        endTime: '20:00',
        plannedDurationMinutes: 30,
        category: 'work',
        priority: 'low',
        color: '#3b82f6',
        isReminder: true,
      },
      {
        id: 'block-ew-2',
        title: 'Reading / Relaxing Audio',
        startTime: '21:00',
        endTime: '21:45',
        plannedDurationMinutes: 45,
        category: 'personal',
        priority: 'low',
        color: '#ec4899',
      },
      {
        id: 'block-ew-3',
        title: 'Sleep Prep (Dim Lights & Phone Off)',
        startTime: '22:00',
        endTime: '22:30',
        plannedDurationMinutes: 30,
        category: 'health',
        priority: 'medium',
        color: '#64748b',
        isReminder: true,
      },
    ],
  },
];

export function createTasksFromPattern(
  pattern: PatternTemplate,
  targetDate: string,
  startHourOverride?: string
): TaskItem[] {
  const timestamp = Date.now();
  let timeDeltaMinutes = 0;

  if (startHourOverride && pattern.blocks.length > 0) {
    const originalFirstStart = parseTimeToMinutes(pattern.blocks[0].startTime);
    const targetFirstStart = parseTimeToMinutes(startHourOverride);
    timeDeltaMinutes = targetFirstStart - originalFirstStart;
  }

  return pattern.blocks.map((block, index) => {
    let startTime = block.startTime;
    let endTime = block.endTime;

    if (timeDeltaMinutes !== 0) {
      startTime = addMinutesToTimeString(startTime, timeDeltaMinutes);
      endTime = addMinutesToTimeString(endTime, timeDeltaMinutes);
    }

    const duration = calculateDurationMinutes(startTime, endTime) || block.plannedDurationMinutes || 60;

    return {
      id: `task-pattern-${pattern.id}-${timestamp}-${index}`,
      title: block.title,
      description: `Created from routine pattern: ${pattern.name}`,
      date: targetDate,
      startTime,
      endTime,
      plannedDurationMinutes: duration,
      actualDurationSeconds: 0,
      category: block.category,
      priority: block.priority,
      completed: false,
      isReminder: !!block.isReminder,
      reminderTime: block.isReminder ? startTime : undefined,
      recurring: 'none',
      color: block.color,
      patternId: pattern.id,
      timeLogs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
}

export const generateTasksFromPattern = createTasksFromPattern;

/**
 * Shifts all scheduled blocks on a specific date forward or backward by a given number of minutes
 */
export function shiftDayBlocks(
  tasks: TaskItem[],
  targetDate: string,
  minutesShift: number
): TaskItem[] {
  return tasks.map((task) => {
    if (task.date !== targetDate || !task.startTime) return task;
    
    const newStart = addMinutesToTimeString(task.startTime, minutesShift);
    const newEnd = task.endTime ? addMinutesToTimeString(task.endTime, minutesShift) : undefined;
    const newReminder = task.reminderTime ? addMinutesToTimeString(task.reminderTime, minutesShift) : undefined;

    return {
      ...task,
      startTime: newStart,
      endTime: newEnd,
      reminderTime: newReminder,
      updatedAt: new Date().toISOString(),
    };
  });
}

export const CATEGORY_COLORS: Record<CategoryType, { bg: string; text: string; border: string; badge: string; hex: string }> = {
  work: {
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200',
    hex: '#3b82f6',
  },
  focus: {
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800',
    badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200',
    hex: '#6366f1',
  },
  personal: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200',
    hex: '#10b981',
  },
  health: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200',
    hex: '#f59e0b',
  },
  study: {
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200',
    hex: '#8b5cf6',
  },
  meeting: {
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800',
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200',
    hex: '#f43f5e',
  },
  urgent: {
    bg: 'bg-red-50 dark:bg-red-950/40',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
    badge: 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200',
    hex: '#ef4444',
  },
};
