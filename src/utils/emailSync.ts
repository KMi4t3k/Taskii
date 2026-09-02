import { TaskItem } from '../types';

export interface EmailExportOptions {
  recipientEmail?: string;
  subject?: string;
  provider: 'mailto' | 'gmail' | 'icloud' | 'outlook';
  date?: string; // Specific day summary or full schedule
  includeReminders: boolean;
  includeCompleted: boolean;
  notes?: string;
}

export interface ICloudCalDavConfig {
  appleIdEmail: string;
  appSpecificPassword?: string;
  serverUrl?: string; // Default: https://caldav.icloud.com
  calendarName?: string;
}

/**
 * Formats a clean, professional plaintext / markdown report of the user's schedule & reminders
 */
export function generateScheduleSummaryText(
  tasks: TaskItem[],
  options: { date?: string; includeReminders?: boolean; includeCompleted?: boolean } = {}
): string {
  const { date, includeReminders = true, includeCompleted = true } = options;

  const filteredTasks = tasks.filter((t) => {
    if (date && t.date !== date && t.date) return false;
    if (!includeCompleted && t.completed) return false;
    return true;
  });

  const reminders = filteredTasks.filter((t) => t.isReminder && !t.completed);
  const plannedBlocks = filteredTasks.filter((t) => !t.isReminder || t.startTime);

  let output = `📅 TASKII SCHEDULE & REMINDERS REPORT\n`;
  output += `Generated on: ${new Date().toLocaleString()}\n`;
  if (date) {
    output += `Selected Date: ${date}\n`;
  }
  output += `--------------------------------------------------\n\n`;

  // Reminders Section
  if (includeReminders && reminders.length > 0) {
    output += `🔔 ACTIVE REMINDERS & ALARMS (${reminders.length}):\n`;
    reminders.forEach((rem, idx) => {
      const timeStr = rem.startTime || rem.reminderTime || 'All-day / Any time';
      output += `${idx + 1}. [${rem.priority.toUpperCase()}] ${rem.title}\n`;
      output += `   • Time: ${timeStr} | Date: ${rem.date || 'Unscheduled'}\n`;
      if (rem.description) {
        output += `   • Notes: ${rem.description}\n`;
      }
    });
    output += `\n`;
  }

  // Planned Schedule Timeline Section
  output += `⏱️ PLANNED TIME BLOCKS & EVENTS (${plannedBlocks.length}):\n`;
  if (plannedBlocks.length === 0) {
    output += `No time blocks found for this period.\n`;
  } else {
    // Sort by date then startTime
    const sorted = [...plannedBlocks].sort((a, b) => {
      const dComp = (a.date || '').localeCompare(b.date || '');
      if (dComp !== 0) return dComp;
      return (a.startTime || '').localeCompare(b.startTime || '');
    });

    sorted.forEach((item, idx) => {
      const statusIcon = item.completed ? '✅ [COMPLETED]' : '⏳ [PLANNED]';
      const timeSpan = item.startTime
        ? `${item.startTime} - ${item.endTime || 'End'}`
        : 'All Day';
      output += `${idx + 1}. ${statusIcon} ${item.title} (${item.category})\n`;
      output += `   • Date: ${item.date || 'Backlog'} | Time: ${timeSpan}\n`;
      output += `   • Planned: ${item.plannedDurationMinutes} min | Actual Tracked: ${Math.round(
        item.actualDurationSeconds / 60
      )} min\n`;
      if (item.description) {
        output += `   • Notes: ${item.description}\n`;
      }
    });
  }

  output += `\n--------------------------------------------------\n`;
  output += `Sent via Taskii — Time-Blocking, Routines & Cross-Device Calendar\n`;

  return output;
}

/**
 * Builds standard mailto / Webmail compose URLs for instant pre-filled email sharing
 */
export function buildEmailComposeUrl(
  recipient: string,
  subject: string,
  body: string,
  provider: 'mailto' | 'gmail' | 'icloud' | 'outlook' = 'mailto'
): string {
  const encSubject = encodeURIComponent(subject);
  const encBody = encodeURIComponent(body);
  const encRecipient = encodeURIComponent(recipient);

  switch (provider) {
    case 'gmail':
      return `https://mail.google.com/mail/?view=cm&fs=1&to=${encRecipient}&su=${encSubject}&body=${encBody}`;
    case 'outlook':
      return `https://outlook.live.com/mail/0/deeplink/compose?to=${encRecipient}&subject=${encSubject}&body=${encBody}`;
    case 'icloud':
      // iCloud Mail web interface compose or standard mailto scheme
      return `mailto:${recipient}?subject=${encSubject}&body=${encBody}`;
    case 'mailto':
    default:
      return `mailto:${recipient}?subject=${encSubject}&body=${encBody}`;
  }
}

/**
 * Saves and loads iCloud / WebMail sync configuration locally
 */
const ICLOUD_CONFIG_KEY = 'taskii_icloud_config';
const EMAIL_SHARE_PREFS_KEY = 'taskii_email_prefs';

export function loadICloudConfig(): ICloudCalDavConfig {
  try {
    const raw = localStorage.getItem(ICLOUD_CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read iCloud config', e);
  }
  return {
    appleIdEmail: '',
    serverUrl: 'https://caldav.icloud.com',
    calendarName: 'Taskii Calendar',
  };
}

export function saveICloudConfig(config: ICloudCalDavConfig): void {
  try {
    localStorage.setItem(ICLOUD_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save iCloud config', e);
  }
}

export function loadEmailSharePrefs(): { defaultRecipient: string; preferredProvider: 'mailto' | 'gmail' | 'icloud' | 'outlook' } {
  try {
    const raw = localStorage.getItem(EMAIL_SHARE_PREFS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    defaultRecipient: '',
    preferredProvider: 'icloud',
  };
}

export function saveEmailSharePrefs(prefs: { defaultRecipient: string; preferredProvider: 'mailto' | 'gmail' | 'icloud' | 'outlook' }): void {
  try {
    localStorage.setItem(EMAIL_SHARE_PREFS_KEY, JSON.stringify(prefs));
  } catch {}
}
