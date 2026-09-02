import React, { useState } from 'react';
import {
  Search,
  CheckCircle2,
  Circle,
  Play,
  Pause,
  Clock,
  Calendar,
  Filter,
  ArrowUpDown,
  Tag,
  AlertCircle,
  Trash2,
  Edit2,
} from 'lucide-react';
import { TaskItem, CategoryType, PriorityType } from '../types';
import { formatDate, formatTimeDisplay, formatDuration, getTodayString } from '../utils/dateUtils';
import { CATEGORY_COLORS } from '../utils/patterns';

interface AgendaViewProps {
  tasks: TaskItem[];
  activeTimerTaskId: string | null;
  activeTimerRunning: boolean;
  onStartTimer: (task: TaskItem) => void;
  onPauseTimer: () => void;
  onToggleComplete: (task: TaskItem) => void;
  onEditTask: (task: TaskItem) => void;
  onDeleteTask: (id: string) => void;
}

export const AgendaView: React.FC<AgendaViewProps> = ({
  tasks,
  activeTimerTaskId,
  activeTimerRunning,
  onStartTimer,
  onPauseTimer,
  onToggleComplete,
  onEditTask,
  onDeleteTask,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [showCompleted, setShowCompleted] = useState(true);

  const todayStr = getTodayString();

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    if (!showCompleted && task.completed) return false;
    if (selectedCategory !== 'all' && task.category !== selectedCategory) return false;
    if (selectedPriority !== 'all' && task.priority !== selectedPriority) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchDesc = task.description?.toLowerCase().includes(q);
      const matchCategory = task.category.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchCategory) return false;
    }
    return true;
  });

  // Group by Date: Today, Tomorrow, This Week, Later, Unscheduled
  const groups: { [key: string]: TaskItem[] } = {
    Today: [],
    Tomorrow: [],
    'Upcoming This Week': [],
    'Later / Next Weeks': [],
    'Backlog / Unscheduled': [],
  };

  const [ty, tm, td] = todayStr.split('-').map(Number);
  const todayDate = new Date(ty, tm - 1, td);

  filteredTasks.forEach((task) => {
    if (!task.date) {
      groups['Backlog / Unscheduled'].push(task);
      return;
    }
    const [y, m, d] = task.date.split('-').map(Number);
    const taskDate = new Date(y, m - 1, d);
    const diffDays = Math.round((taskDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      groups['Today'].push(task);
    } else if (diffDays === 1) {
      groups['Tomorrow'].push(task);
    } else if (diffDays > 1 && diffDays < 7) {
      groups['Upcoming This Week'].push(task);
    } else {
      groups['Later / Next Weeks'].push(task);
    }
  });

  // Sort inside groups by start time
  Object.keys(groups).forEach((key) => {
    groups[key].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
      if (a.startTime) return -1;
      if (b.startTime) return 1;
      return 0;
    });
  });

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      {/* Search and Filters Bar */}
      <div className="p-3.5 sm:p-4 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks, reminders, patterns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="work">Work</option>
            <option value="focus">Deep Focus</option>
            <option value="personal">Personal</option>
            <option value="health">Health</option>
            <option value="study">Study</option>
            <option value="meeting">Meetings</option>
            <option value="urgent">Urgent</option>
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <label className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 cursor-pointer ml-1">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span>Show Completed</span>
          </label>
        </div>
      </div>

      {/* Agenda Feed */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-6">
        {Object.entries(groups).map(([groupTitle, groupTasks]) => {
          if (groupTasks.length === 0) return null;

          return (
            <div key={groupTitle} className="space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <span>{groupTitle}</span>
                  <span className="px-2 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-[10px]">
                    {groupTasks.length}
                  </span>
                </h3>
              </div>

              <div className="space-y-2">
                {groupTasks.map((task) => {
                  const cat = CATEGORY_COLORS[task.category] || CATEGORY_COLORS.work;
                  const isCurrentTimer = activeTimerTaskId === task.id;

                  return (
                    <div
                      key={task.id}
                      onClick={() => onEditTask(task)}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition ${
                        task.completed
                          ? 'bg-slate-50/80 dark:bg-slate-850/50 border-slate-200 dark:border-slate-800 opacity-60'
                          : isCurrentTimer
                          ? 'bg-indigo-50/90 dark:bg-indigo-950/70 border-indigo-400 ring-2 ring-indigo-300'
                          : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:shadow-xs'
                      }`}
                    >
                      {/* Left: Checkbox + Title + Metadata */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleComplete(task);
                          }}
                          className="shrink-0"
                        >
                          {task.completed ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <Circle className="w-5 h-5 text-slate-400 hover:text-emerald-500 transition" />
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-sm font-bold truncate ${
                                task.completed
                                  ? 'line-through text-slate-400 dark:text-slate-500'
                                  : 'text-slate-900 dark:text-white'
                              }`}
                            >
                              {task.title}
                            </span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${cat.badge}`}>
                              {task.category}
                            </span>
                            {task.priority === 'urgent' && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-100 text-red-800">
                                Urgent
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                            {task.date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                {formatDate(task.date)}
                              </span>
                            )}
                            {task.startTime && (
                              <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                                <Clock className="w-3.5 h-3.5 text-blue-600" />
                                {formatTimeDisplay(task.startTime)}
                              </span>
                            )}
                            <span>Planned: {task.plannedDurationMinutes}m</span>
                            {task.actualDurationSeconds > 0 && (
                              <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                                Tracked: {formatDuration(task.actualDurationSeconds)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div
                        className="flex items-center gap-1.5 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {!task.completed && (
                          <button
                            type="button"
                            onClick={() => {
                              if (isCurrentTimer && activeTimerRunning) {
                                onPauseTimer();
                              } else {
                                onStartTimer(task);
                              }
                            }}
                            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                              isCurrentTimer && activeTimerRunning
                                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                            title={isCurrentTimer && activeTimerRunning ? 'Pause Timer' : 'Start Timer'}
                          >
                            {isCurrentTimer && activeTimerRunning ? (
                              <Pause className="w-3.5 h-3.5" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-current" />
                            )}
                            <span className="hidden sm:inline">Track</span>
                          </button>
                        )}

                        <button
                          onClick={() => onEditTask(task)}
                          className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filteredTasks.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-semibold">No planned tasks or reminders found</p>
            <p className="text-xs text-slate-400 mt-1">Try changing search filters or create a new block.</p>
          </div>
        )}
      </div>
    </div>
  );
};
