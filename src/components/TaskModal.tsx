import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  Calendar,
  Bell,
  RotateCcw,
  Tag,
  Trash2,
  CheckCircle2,
  Play,
} from 'lucide-react';
import { TaskItem, CategoryType, PriorityType, RecurrenceType } from '../types';
import {
  getTodayString,
  addMinutesToTimeString,
  calculateDurationMinutes,
} from '../utils/dateUtils';
import { CATEGORY_COLORS } from '../utils/patterns';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: TaskItem | null;
  initialDate?: string;
  initialStartTime?: string;
  onSave: (taskData: Partial<TaskItem>) => void;
  onDelete?: (id: string) => void;
  onStartTimerNow?: (task: TaskItem) => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  taskToEdit,
  initialDate,
  initialStartTime,
  onSave,
  onDelete,
  onStartTimerNow,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(getTodayString());
  const [hasTime, setHasTime] = useState(true);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [plannedDuration, setPlannedDuration] = useState(60);
  const [category, setCategory] = useState<CategoryType>('work');
  const [priority, setPriority] = useState<PriorityType>('medium');
  const [isReminder, setIsReminder] = useState(false);
  const [reminderTime, setReminderTime] = useState('08:45');
  const [recurring, setRecurring] = useState<RecurrenceType>('none');

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title || '');
      setDescription(taskToEdit.description || '');
      setDate(taskToEdit.date || getTodayString());
      setHasTime(!!taskToEdit.startTime);
      setStartTime(taskToEdit.startTime || '09:00');
      setEndTime(taskToEdit.endTime || '10:00');
      setPlannedDuration(taskToEdit.plannedDurationMinutes || 60);
      setCategory(taskToEdit.category || 'work');
      setPriority(taskToEdit.priority || 'medium');
      setIsReminder(!!taskToEdit.isReminder);
      setReminderTime(taskToEdit.reminderTime || taskToEdit.startTime || '08:45');
      setRecurring(taskToEdit.recurring || 'none');
    } else {
      setTitle('');
      setDescription('');
      setDate(initialDate || getTodayString());
      setHasTime(true);
      const start = initialStartTime || '09:00';
      setStartTime(start);
      setEndTime(addMinutesToTimeString(start, 60));
      setPlannedDuration(60);
      setCategory('work');
      setPriority('medium');
      setIsReminder(false);
      setReminderTime(start);
      setRecurring('none');
    }
  }, [taskToEdit, initialDate, initialStartTime, isOpen]);

  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    setEndTime(addMinutesToTimeString(newStart, plannedDuration));
  };

  const handleDurationPreset = (minutes: number) => {
    setPlannedDuration(minutes);
    if (startTime) {
      setEndTime(addMinutesToTimeString(startTime, minutes));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      date: date || undefined,
      startTime: hasTime ? startTime : undefined,
      endTime: hasTime ? endTime : undefined,
      plannedDurationMinutes: plannedDuration,
      category,
      priority,
      isReminder,
      reminderTime: isReminder ? reminderTime : undefined,
      recurring,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            {taskToEdit ? 'Edit Planned Block' : 'Create Planned Time Block'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs sm:text-sm">
          {/* Title */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Design sprint review, Morning workout, Client presentation..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-white font-medium"
            />
          </div>

          {/* Date & Time Toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CategoryType)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white capitalize"
              >
                <option value="work">Work</option>
                <option value="focus">Deep Focus</option>
                <option value="personal">Personal</option>
                <option value="health">Health &amp; Fitness</option>
                <option value="study">Study &amp; Learning</option>
                <option value="meeting">Meeting</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Time Slot Range */}
          {hasTime && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>Time-Block Schedule</span>
                </span>

                {/* Duration Presets */}
                <div className="flex items-center gap-1">
                  {[15, 30, 45, 60, 90, 120].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleDurationPreset(m)}
                      className={`px-2 py-0.5 text-[11px] rounded font-semibold transition ${
                        plannedDuration === m
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {m < 60 ? `${m}m` : `${m / 60}h`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Priority & Recurring */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityType)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white capitalize"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent (Top Priority)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Recurrence Pattern
              </label>
              <select
                value={recurring}
                onChange={(e) => setRecurring(e.target.value as RecurrenceType)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white capitalize"
              >
                <option value="none">Does Not Repeat</option>
                <option value="daily">Daily</option>
                <option value="weekdays">Every Weekday (Mon-Fri)</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>

          {/* Reminder Toggle & Time */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isReminder}
                  onChange={(e) => setIsReminder(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <Bell className="w-4 h-4 text-rose-500" />
                <span>Enable Reminder Alarm Notification</span>
              </label>

              {isReminder && (
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border rounded-lg"
                />
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Description &amp; Objectives
            </label>
            <textarea
              rows={2}
              placeholder="Key deliverables, agenda notes, or subtasks..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-white"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <div>
              {taskToEdit && onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    onDelete(taskToEdit.id);
                    onClose();
                  }}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl font-semibold text-xs flex items-center gap-1 transition"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition"
              >
                {taskToEdit ? 'Save Changes' : 'Create Block'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
