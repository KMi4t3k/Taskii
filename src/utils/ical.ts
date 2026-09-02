import { TaskItem } from '../types';

/**
 * iCalendar (RFC 5545) & CalDAV Exporter and Importer (SEC-05 Hardened)
 * - Safe string escaping & HTML/Script sanitization
 * - Maximum line count and length limits (DoS/ReDoS prevention)
 * - Demultiplexing: VEVENT (Calendar) & VTODO (Apple Reminders)
 * - 2137s Transitional State Flag (PT35M37S) & TENTATIVE status for Quick-Start
 */

const MAX_ICAL_TEXT_LENGTH = 10000;
const MAX_LINES_TO_PARSE = 50000;

function formatICalDate(dateStr: string, timeStr?: string): string {
  if (!dateStr) return '';
  const cleanDate = dateStr.replace(/[^0-9]/g, '');
  if (!timeStr) {
    return cleanDate.slice(0, 8);
  }
  const cleanTime = timeStr.replace(/[^0-9]/g, '').slice(0, 4) + '00';
  return `${cleanDate.slice(0, 8)}T${cleanTime}`;
}

export function generateICalContent(tasks: TaskItem[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Taskii//Calendar, Tasks and Habits//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Taskii Schedule & Reminders',
    'X-WR-TIMEZONE:UTC',
  ];

  tasks.forEach((task) => {
    // Demultiplexing:
    // Pure tasks / reminders / habits without scheduled start time -> VTODO
    // Scheduled calendar blocks / time-slots -> VEVENT
    const isPureTodo = task.isReminder && !task.startTime;

    if (isPureTodo) {
      // VTODO for Apple Reminders / CalDAV Tasks
      lines.push('BEGIN:VTODO');
      lines.push(`UID:taskii-todo-${sanitizeUid(task.id)}@taskii.app`);
      lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
      lines.push(`SUMMARY:${escapeICalText(task.title)}`);

      if (task.date) {
        const dueTime = task.reminderTime || '235900';
        lines.push(`DUE:${formatICalDate(task.date, dueTime.length === 5 ? dueTime : undefined)}`);
      }

      lines.push(`STATUS:${task.completed ? 'COMPLETED' : 'NEEDS-ACTION'}`);
      if (task.completed && task.completedAt) {
        lines.push(`COMPLETED:${new Date(task.completedAt).toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
      }

      // Priority mapping
      if (task.priority === 'urgent' || task.priority === 'high') {
        lines.push('PRIORITY:1');
      } else if (task.priority === 'medium') {
        lines.push('PRIORITY:5');
      } else {
        lines.push('PRIORITY:9');
      }

      if (task.category) {
        lines.push(`CATEGORIES:${sanitizeCategory(task.category)}`);
      }

      // Habits recurrence
      if (task.recurring === 'daily') {
        lines.push('RRULE:FREQ=DAILY;INTERVAL=1');
      } else if (task.recurring === 'weekly') {
        lines.push('RRULE:FREQ=WEEKLY;INTERVAL=1');
      } else if (task.recurring === 'monthly') {
        lines.push('RRULE:FREQ=MONTHLY;INTERVAL=1');
      }

      if (task.description) {
        lines.push(`DESCRIPTION:${escapeICalText(task.description.trim())}`);
      }

      // Alarm reminder
      lines.push('BEGIN:VALARM');
      lines.push('TRIGGER:-PT15M');
      lines.push('ACTION:DISPLAY');
      lines.push(`DESCRIPTION:Reminder: ${escapeICalText(task.title)}`);
      lines.push('END:VALARM');

      lines.push('END:VTODO');
    } else {
      // BEGIN:VEVENT for Calendar Blocks & Sessions
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:taskii-${sanitizeUid(task.id)}@taskii.app`);
      lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);

      const targetDate = task.date || new Date().toISOString().split('T')[0];

      if (task.startTime) {
        const dtStart = formatICalDate(targetDate, task.startTime);
        lines.push(`DTSTART:${dtStart}`);

        // 2137 Seconds Transitional State (PT35M37S)
        if (task.isTentative) {
          lines.push('DURATION:PT35M37S');
          lines.push('STATUS:TENTATIVE');
        } else if (task.endTime) {
          const dtEnd = formatICalDate(targetDate, task.endTime);
          lines.push(`DTEND:${dtEnd}`);
          lines.push(`STATUS:${task.completed ? 'COMPLETED' : 'CONFIRMED'}`);
        } else {
          const [h, m] = task.startTime.split(':').map(Number);
          const durMins = task.plannedDurationMinutes || 60;
          const endTotalMins = (h * 60 + m + durMins) % (24 * 60);
          const endH = Math.floor(endTotalMins / 60);
          const endM = endTotalMins % 60;
          const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
          lines.push(`DTEND:${formatICalDate(targetDate, endTimeStr)}`);
          lines.push(`STATUS:${task.completed ? 'COMPLETED' : 'CONFIRMED'}`);
        }
      } else {
        // All day event
        lines.push(`DTSTART;VALUE=DATE:${formatICalDate(targetDate)}`);
        lines.push(`STATUS:${task.completed ? 'COMPLETED' : 'CONFIRMED'}`);
      }

      lines.push(`SUMMARY:${escapeICalText(task.title)}`);

      let description = task.description || '';
      if (task.plannedDurationMinutes) {
        description += `\nPlanned Duration: ${task.plannedDurationMinutes} mins`;
      }
      if (task.actualDurationSeconds) {
        description += `\nTracked Time: ${Math.round(task.actualDurationSeconds / 60)} mins`;
      }
      if (task.category) {
        description += `\nCategory: ${task.category}`;
      }

      if (description.trim()) {
        lines.push(`DESCRIPTION:${escapeICalText(description.trim())}`);
      }

      lines.push(`CATEGORIES:${sanitizeCategory(task.category || 'WORK')}`);

      if (task.priority === 'urgent' || task.priority === 'high') {
        lines.push('PRIORITY:1');
      } else if (task.priority === 'medium') {
        lines.push('PRIORITY:5');
      } else {
        lines.push('PRIORITY:9');
      }

      // Habits recurrence
      if (task.recurring === 'daily') {
        lines.push('RRULE:FREQ=DAILY;INTERVAL=1');
      } else if (task.recurring === 'weekly') {
        lines.push('RRULE:FREQ=WEEKLY;INTERVAL=1');
      }

      // Alarm reminder
      if (task.isReminder) {
        lines.push('BEGIN:VALARM');
        lines.push('TRIGGER:-PT15M');
        lines.push('ACTION:DISPLAY');
        lines.push(`DESCRIPTION:Reminder: ${escapeICalText(task.title)}`);
        lines.push('END:VALARM');
      }

      lines.push('END:VEVENT');
    }
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function escapeICalText(text: string): string {
  if (!text) return '';
  const safe = text.slice(0, MAX_ICAL_TEXT_LENGTH);
  return safe
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function sanitizeUid(uid: string): string {
  if (!uid) return 'uid';
  return uid.replace(/[^a-zA-Z0-9-_]/g, '');
}

function sanitizeCategory(cat: string): string {
  if (!cat) return 'WORK';
  return cat.replace(/[^a-zA-Z0-9-_]/g, '').toUpperCase();
}

export function downloadICalFile(tasks: TaskItem[], filename = 'taskii-schedule.ics') {
  const icalContent = generateICalContent(tasks);
  const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parses iCal VEVENT and VTODO blocks into Taskii items with DoS protection
 */
export function parseICalToTasks(icalString: string): TaskItem[] {
  if (!icalString || typeof icalString !== 'string') return [];
  if (icalString.length > 10 * 1024 * 1024) {
    throw new Error('Plik iCalendar przekracza bezpieczny limit wielkości (10MB).');
  }

  const events: TaskItem[] = [];

  // 1. Parse VEVENT blocks
  const eventBlocks = icalString.split('BEGIN:VEVENT');
  const maxEvents = Math.min(eventBlocks.length, 2000); // Guard against memory explosion

  for (let i = 1; i < maxEvents; i++) {
    const block = eventBlocks[i].split('END:VEVENT')[0];
    let title = 'Imported Event';
    let date = '';
    let startTime = '';
    let endTime = '';
    let description = '';
    let isCompleted = false;

    const lines = block.split(/\r?\n/).slice(0, 100);
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('SUMMARY:')) {
        title = unescapeICalText(trimmed.substring(8));
      } else if (trimmed.startsWith('DTSTART')) {
        const value = trimmed.split(':')[1];
        if (value) {
          if (value.includes('T')) {
            const [dPart, tPart] = value.split('T');
            date = `${dPart.substring(0, 4)}-${dPart.substring(4, 6)}-${dPart.substring(6, 8)}`;
            startTime = `${tPart.substring(0, 2)}:${tPart.substring(2, 4)}`;
          } else {
            date = `${value.substring(0, 4)}-${value.substring(4, 6)}-${value.substring(6, 8)}`;
          }
        }
      } else if (trimmed.startsWith('DTEND')) {
        const value = trimmed.split(':')[1];
        if (value && value.includes('T')) {
          const [, tPart] = value.split('T');
          endTime = `${tPart.substring(0, 2)}:${tPart.substring(2, 4)}`;
        }
      } else if (trimmed.startsWith('DESCRIPTION:')) {
        description = unescapeICalText(trimmed.substring(12));
      } else if (trimmed.startsWith('STATUS:')) {
        if (trimmed.includes('COMPLETED')) isCompleted = true;
      }
    });

    if (date) {
      events.push({
        id: `ical-${Date.now()}-${i}`,
        title: sanitizeHtmlInput(title),
        date,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        description: sanitizeHtmlInput(description),
        category: 'work',
        priority: 'medium',
        plannedDurationMinutes: 60,
        actualDurationSeconds: 0,
        completed: isCompleted,
        isReminder: false,
        recurring: 'none',
        timeLogs: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  // 2. Parse VTODO blocks (Tasks & Reminders from Apple Reminders / CalDAV)
  const todoBlocks = icalString.split('BEGIN:VTODO');
  const maxTodos = Math.min(todoBlocks.length, 2000);

  for (let j = 1; j < maxTodos; j++) {
    const block = todoBlocks[j].split('END:VTODO')[0];
    let title = 'Imported Reminder';
    let date = '';
    let reminderTime = '';
    let description = '';
    let isCompleted = false;

    const lines = block.split(/\r?\n/).slice(0, 100);
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('SUMMARY:')) {
        title = unescapeICalText(trimmed.substring(8));
      } else if (trimmed.startsWith('DUE')) {
        const value = trimmed.split(':')[1];
        if (value) {
          if (value.includes('T')) {
            const [dPart, tPart] = value.split('T');
            date = `${dPart.substring(0, 4)}-${dPart.substring(4, 6)}-${dPart.substring(6, 8)}`;
            reminderTime = `${tPart.substring(0, 2)}:${tPart.substring(2, 4)}`;
          } else {
            date = `${value.substring(0, 4)}-${value.substring(4, 6)}-${value.substring(6, 8)}`;
          }
        }
      } else if (trimmed.startsWith('DESCRIPTION:')) {
        description = unescapeICalText(trimmed.substring(12));
      } else if (trimmed.startsWith('STATUS:')) {
        if (trimmed.includes('COMPLETED')) isCompleted = true;
      }
    });

    events.push({
      id: `ical-todo-${Date.now()}-${j}`,
      title: sanitizeHtmlInput(title),
      date: date || undefined,
      reminderTime: reminderTime || undefined,
      description: sanitizeHtmlInput(description),
      category: 'urgent',
      priority: 'high',
      plannedDurationMinutes: 15,
      actualDurationSeconds: 0,
      completed: isCompleted,
      isReminder: true,
      recurring: 'none',
      timeLogs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return events;
}

export const generateICalendarData = generateICalContent;
export const parseICalendarData = parseICalToTasks;

function unescapeICalText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .slice(0, MAX_ICAL_TEXT_LENGTH);
}

function sanitizeHtmlInput(input: string): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}
