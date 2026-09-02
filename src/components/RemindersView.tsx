import React, { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  AlertTriangle,
  RotateCcw,
  Plus,
  Trash2,
  Edit2,
  Volume2,
  ShieldCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { TaskItem, PriorityType } from '../types';
import { formatDate, formatTimeDisplay, getTodayString } from '../utils/dateUtils';
import { soundService } from '../utils/audio';

interface RemindersViewProps {
  tasks: TaskItem[];
  onToggleComplete: (task: TaskItem) => void;
  onEditTask: (task: TaskItem) => void;
  onDeleteTask: (id: string) => void;
  onQuickCreateReminder: (title: string, date: string, time: string, priority: PriorityType) => void;
  onSnoozeReminder: (taskId: string, minutes: number) => void;
  onRequestNotificationPermission: () => Promise<string>;
}

export const RemindersView: React.FC<RemindersViewProps> = ({
  tasks,
  onToggleComplete,
  onEditTask,
  onDeleteTask,
  onQuickCreateReminder,
  onSnoozeReminder,
  onRequestNotificationPermission,
}) => {
  const [filterTab, setFilterTab] = useState<'today' | 'upcoming' | 'overdue' | 'recurring' | 'completed'>('today');
  const [quickTitle, setQuickTitle] = useState('');
  const [quickDate, setQuickDate] = useState(getTodayString());
  const [quickTime, setQuickTime] = useState('09:00');
  const [quickPriority, setQuickPriority] = useState<PriorityType>('medium');
  const [permissionStatus, setPermissionStatus] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  const todayStr = getTodayString();
  const allReminders = tasks.filter((t) => t.isReminder);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    onQuickCreateReminder(quickTitle.trim(), quickDate, quickTime, quickPriority);
    setQuickTitle('');
  };

  const handleRequestPerm = async () => {
    const perm = await onRequestNotificationPermission();
    setPermissionStatus(perm);
  };

  const handleCheck = (task: TaskItem) => {
    if (!task.completed) {
      soundService.playSuccess();
      try {
        confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
      } catch {
        // Ignore
      }
    }
    onToggleComplete(task);
  };

  // Classify reminders
  const overdueReminders = allReminders.filter((t) => {
    if (t.completed) return false;
    if (!t.date) return false;
    return t.date < todayStr;
  });

  const todayReminders = allReminders.filter((t) => {
    if (t.completed) return false;
    return t.date === todayStr || (!t.date && filterTab === 'today');
  });

  const upcomingReminders = allReminders.filter((t) => {
    if (t.completed) return false;
    if (!t.date) return false;
    return t.date > todayStr;
  });

  const recurringReminders = allReminders.filter((t) => {
    return t.recurring && t.recurring !== 'none';
  });

  const completedReminders = allReminders.filter((t) => t.completed);

  let activeList: TaskItem[] = [];
  if (filterTab === 'today') activeList = todayReminders;
  else if (filterTab === 'upcoming') activeList = upcomingReminders;
  else if (filterTab === 'overdue') activeList = overdueReminders;
  else if (filterTab === 'recurring') activeList = recurringReminders;
  else if (filterTab === 'completed') activeList = completedReminders;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      {/* Top Banner: Reminders Header & Notification Permission Status */}
      <div className="p-4 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center text-rose-600">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Reminders &amp; Alerts
            </h2>
            <p className="text-xs text-slate-500">
              Timely sound alarms, scheduled push notifications, and recurring reminders
            </p>
          </div>
        </div>

        {/* Browser & OS Notification Permission Button */}
        {permissionStatus !== 'granted' && (
          <button
            onClick={handleRequestPerm}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Enable System Notifications</span>
          </button>
        )}
        {permissionStatus === 'granted' && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 rounded-lg border border-emerald-200 dark:border-emerald-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Notifications Active</span>
          </div>
        )}
      </div>

      {/* Quick Add Reminder Form */}
      <form onSubmit={handleCreate} className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-850">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Quick reminder (e.g., Call doctor, Submit report, Take vitamins)..."
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            className="flex-1 min-w-[240px] px-3.5 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none text-slate-900 dark:text-white"
          />

          <input
            type="date"
            value={quickDate}
            onChange={(e) => setQuickDate(e.target.value)}
            className="px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-rose-500"
          />

          <input
            type="time"
            value={quickTime}
            onChange={(e) => setQuickTime(e.target.value)}
            className="px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-rose-500"
          />

          <select
            value={quickPriority}
            onChange={(e) => setQuickPriority(e.target.value as PriorityType)}
            className="px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-medium focus:ring-2 focus:ring-rose-500"
          >
            <option value="urgent">Urgent Priority</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Set Reminder</span>
          </button>
        </div>
      </form>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-2 sm:px-4 border-b border-slate-100 dark:border-slate-800 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setFilterTab('today')}
          className={`px-3 py-1.5 rounded-lg transition ${
            filterTab === 'today'
              ? 'bg-rose-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Today ({todayReminders.length})
        </button>

        <button
          onClick={() => setFilterTab('upcoming')}
          className={`px-3 py-1.5 rounded-lg transition ${
            filterTab === 'upcoming'
              ? 'bg-rose-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Upcoming ({upcomingReminders.length})
        </button>

        {overdueReminders.length > 0 && (
          <button
            onClick={() => setFilterTab('overdue')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filterTab === 'overdue'
                ? 'bg-red-600 text-white'
                : 'text-red-600 bg-red-50 dark:bg-red-950/40 hover:bg-red-100'
            }`}
          >
            Overdue ({overdueReminders.length})
          </button>
        )}

        <button
          onClick={() => setFilterTab('recurring')}
          className={`px-3 py-1.5 rounded-lg transition ${
            filterTab === 'recurring'
              ? 'bg-rose-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Recurring ({recurringReminders.length})
        </button>

        <button
          onClick={() => setFilterTab('completed')}
          className={`px-3 py-1.5 rounded-lg transition ${
            filterTab === 'completed'
              ? 'bg-rose-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Completed ({completedReminders.length})
        </button>
      </div>

      {/* Reminders List */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-2.5">
        {activeList.map((task) => {
          const isOverdue = !task.completed && task.date && task.date < todayStr;

          return (
            <div
              key={task.id}
              className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition ${
                task.completed
                  ? 'bg-slate-50 dark:bg-slate-850/50 border-slate-200 dark:border-slate-800 opacity-60'
                  : isOverdue
                  ? 'bg-red-50/60 dark:bg-red-950/40 border-red-200 dark:border-red-900'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-rose-300'
              }`}
            >
              {/* Checkbox + Title + Time info */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => handleCheck(task)}
                  className="shrink-0 text-slate-400 hover:text-emerald-600 transition"
                >
                  {task.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-sm font-bold ${
                        task.completed
                          ? 'line-through text-slate-400'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {task.title}
                    </span>

                    {task.recurring && task.recurring !== 'none' && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded-full flex items-center gap-1">
                        <RotateCcw className="w-2.5 h-2.5" />
                        {task.recurring}
                      </span>
                    )}

                    {task.priority === 'urgent' && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 bg-red-100 text-red-800 rounded">
                        Urgent
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                    {task.date && (
                      <span className="flex items-center gap-1 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-rose-500" />
                        {formatDate(task.date)}
                      </span>
                    )}

                    {(task.reminderTime || task.startTime) && (
                      <span className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        {formatTimeDisplay(task.reminderTime || task.startTime!)}
                      </span>
                    )}

                    {isOverdue && (
                      <span className="text-red-600 dark:text-red-400 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Overdue
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Snooze & Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                {!task.completed && (
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/60 p-1 rounded-lg">
                    <button
                      onClick={() => onSnoozeReminder(task.id, 15)}
                      className="px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-600 rounded transition"
                      title="Snooze 15 minutes"
                    >
                      +15m
                    </button>
                    <button
                      onClick={() => onSnoozeReminder(task.id, 60)}
                      className="px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-600 rounded transition"
                      title="Snooze 1 hour"
                    >
                      +1h
                    </button>
                  </div>
                )}

                <button
                  onClick={() => onEditTask(task)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onDeleteTask(task.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {activeList.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Bell className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-semibold">No {filterTab} reminders</p>
            <p className="text-xs text-slate-400 mt-1">Use the quick bar above to schedule a reminder.</p>
          </div>
        )}
      </div>
    </div>
  );
};
