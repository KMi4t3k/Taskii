import React, { useState } from 'react';
import {
  Inbox,
  Plus,
  Clock,
  Calendar,
  ChevronRight,
  ChevronLeft,
  X,
  Play,
  ArrowRight,
  Layers,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { TaskItem, CategoryType } from '../types';
import { CATEGORY_COLORS } from '../utils/patterns';
import { getTodayString, addMinutesToTimeString } from '../utils/dateUtils';

interface TaskBacklogProps {
  tasks: TaskItem[];
  isOpen: boolean;
  onToggleOpen: () => void;
  selectedDate: string;
  onScheduleTask: (taskId: string, targetDate: string, startTime?: string) => void;
  onEditTask: (task: TaskItem) => void;
  onQuickCreateBacklog: (title: string, category: CategoryType, durationMinutes: number) => void;
  onToggleComplete: (task: TaskItem) => void;
}

export const TaskBacklog: React.FC<TaskBacklogProps> = ({
  tasks,
  isOpen,
  onToggleOpen,
  selectedDate,
  onScheduleTask,
  onEditTask,
  onQuickCreateBacklog,
  onToggleComplete,
}) => {
  const [quickTitle, setQuickTitle] = useState('');
  const [quickCategory, setQuickCategory] = useState<CategoryType>('work');
  const [quickDuration, setQuickDuration] = useState(45);

  // Unscheduled backlog items (no date or no time)
  const backlogTasks = tasks.filter((t) => !t.completed && (!t.date || !t.startTime));

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    onQuickCreateBacklog(quickTitle.trim(), quickCategory, quickDuration);
    setQuickTitle('');
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  return (
    <>
      {/* Toggle Button when closed */}
      {!isOpen && (
        <button
          onClick={onToggleOpen}
          className="fixed bottom-20 right-4 z-30 flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-900 text-white rounded-full shadow-lg hover:bg-slate-800 transition active:scale-95 text-xs font-bold"
        >
          <Inbox className="w-4 h-4 text-blue-400" />
          <span>Backlog ({backlogTasks.length})</span>
        </button>
      )}

      {/* Slide-out Panel */}
      {isOpen && (
        <div className="w-80 sm:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col h-full shrink-0 shadow-lg z-30 transition-all duration-300">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Inbox className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Unscheduled Backlog
              </h3>
              <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 text-[10px] font-bold rounded-full">
                {backlogTasks.length}
              </span>
            </div>

            <button
              onClick={onToggleOpen}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Create Backlog Form */}
          <form onSubmit={handleCreate} className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 space-y-2">
            <input
              type="text"
              placeholder="Add unscheduled task..."
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <div className="flex items-center gap-2">
              <select
                value={quickCategory}
                onChange={(e) => setQuickCategory(e.target.value as CategoryType)}
                className="flex-1 px-2 py-1 text-[11px] bg-white dark:bg-slate-900 border rounded-lg text-slate-700 dark:text-slate-300 capitalize"
              >
                <option value="work">Work</option>
                <option value="focus">Deep Focus</option>
                <option value="personal">Personal</option>
                <option value="health">Health</option>
                <option value="study">Study</option>
              </select>

              <select
                value={quickDuration}
                onChange={(e) => setQuickDuration(Number(e.target.value))}
                className="w-20 px-2 py-1 text-[11px] bg-white dark:bg-slate-900 border rounded-lg text-slate-700 dark:text-slate-300"
              >
                <option value={15}>15m</option>
                <option value={30}>30m</option>
                <option value={45}>45m</option>
                <option value={60}>1h</option>
                <option value={90}>1.5h</option>
              </select>

              <button
                type="submit"
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          {/* Backlog List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {backlogTasks.map((task) => {
              const cat = CATEGORY_COLORS[task.category] || CATEGORY_COLORS.work;

              return (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  onClick={() => onEditTask(task)}
                  className={`p-2.5 rounded-xl border text-xs cursor-pointer group transition hover:shadow-xs ${cat.bg} ${cat.border}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-1.5 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleComplete(task);
                        }}
                        className="mt-0.5 text-slate-400 hover:text-emerald-600"
                      >
                        <Circle className="w-3.5 h-3.5" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-slate-900 dark:text-white truncate block">
                          {task.title}
                        </span>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {task.plannedDurationMinutes}m • {task.category}
                        </div>
                      </div>
                    </div>

                    {/* Quick Schedule into Today button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onScheduleTask(task.id, selectedDate, '10:00');
                      }}
                      className="opacity-0 group-hover:opacity-100 px-2 py-1 bg-white dark:bg-slate-800 border rounded-lg text-[10px] font-bold text-blue-600 hover:bg-blue-50 transition flex items-center gap-1 shrink-0"
                      title="Schedule into current day"
                    >
                      <span>Slot</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {backlogTasks.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-xs">
                <Inbox className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p className="font-semibold">Backlog is clean!</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Add unscheduled tasks to keep track of ideas without cluttering your calendar.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
