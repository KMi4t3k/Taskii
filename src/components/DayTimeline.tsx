import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  CheckCircle2,
  Circle,
  Clock,
  MoreVertical,
  ChevronUp,
  ChevronDown,
  Plus,
  Layers,
  Sparkles,
  ArrowRight,
  Trash2,
  Edit2,
  Calendar,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { TaskItem, CategoryType } from '../types';
import {
  parseTimeToMinutes,
  minutesToTimeString,
  formatTimeDisplay,
  addMinutesToTimeString,
  formatDuration,
  getTodayString,
  calculateDurationMinutes,
} from '../utils/dateUtils';
import { CATEGORY_COLORS } from '../utils/patterns';
import { soundService } from '../utils/audio';

interface DayTimelineProps {
  selectedDate: string;
  tasks: TaskItem[];
  activeTimerTaskId: string | null;
  activeTimerRunning: boolean;
  onStartTimer: (task: TaskItem) => void;
  onPauseTimer: () => void;
  onToggleComplete: (task: TaskItem) => void;
  onEditTask: (task: TaskItem) => void;
  onDeleteTask: (id: string) => void;
  onMoveTaskTime: (taskId: string, newStartTime: string, newEndTime?: string) => void;
  onNudgeTask: (taskId: string, minutes: number) => void;
  onShiftAllDayBlocks: (date: string, minutes: number) => void;
  onCreateAtTime: (date: string, startTime: string) => void;
  onOpenPatternModal: () => void;
}

export const DayTimeline: React.FC<DayTimelineProps> = ({
  selectedDate,
  tasks,
  activeTimerTaskId,
  activeTimerRunning,
  onStartTimer,
  onPauseTimer,
  onToggleComplete,
  onEditTask,
  onDeleteTask,
  onMoveTaskTime,
  onNudgeTask,
  onShiftAllDayBlocks,
  onCreateAtTime,
  onOpenPatternModal,
}) => {
  const [startHour, setStartHour] = useState(6); // 6 AM
  const [endHour, setEndHour] = useState(23); // 11 PM
  const [currentTimeMinutes, setCurrentTimeMinutes] = useState<number>(0);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [hoveredSlotTime, setHoveredSlotTime] = useState<string | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const todayStr = getTodayString();
  const isToday = selectedDate === todayStr;

  // Update current time indicator
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeMinutes(now.getHours() * 60 + now.getMinutes());
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filter tasks for this date that have a start time
  const dayTasks = tasks.filter((t) => t.date === selectedDate && t.startTime);
  const allDayOrNoTimeTasks = tasks.filter((t) => t.date === selectedDate && !t.startTime);

  // Statistics for this day
  const totalPlannedMins = dayTasks.reduce((acc, t) => acc + (t.plannedDurationMinutes || 0), 0);
  const totalTrackedSecs = dayTasks.reduce((acc, t) => acc + (t.actualDurationSeconds || 0), 0);
  const totalTrackedMins = Math.round(totalTrackedSecs / 60);
  const completedCount = dayTasks.filter((t) => t.completed).length;

  const totalHours = endHour - startHour + 1;
  const pixelsPerHour = 72; // height per hour
  const totalHeight = totalHours * pixelsPerHour;

  const handleTaskCheck = (task: TaskItem) => {
    if (!task.completed) {
      soundService.playSuccess();
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 },
        });
      } catch {
        // Ignore
      }
    }
    onToggleComplete(task);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent, timeStr: string) => {
    e.preventDefault();
    setHoveredSlotTime(timeStr);
  };

  const handleDrop = (e: React.DragEvent, targetTimeStr: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (taskId) {
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        const duration = task.plannedDurationMinutes || 60;
        const newEndTime = addMinutesToTimeString(targetTimeStr, duration);
        onMoveTaskTime(taskId, targetTimeStr, newEndTime);
      }
    }
    setDraggedTaskId(null);
    setHoveredSlotTime(null);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      {/* Top Banner: Day Stats & Time Block Actions */}
      <div className="p-3.5 sm:p-4 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        {/* Stats Pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Planned: <strong className="text-slate-900 dark:text-white">{Math.round(totalPlannedMins / 60 * 10) / 10}h</strong>
            </span>
            <span className="text-slate-300 dark:text-slate-600 mx-1">•</span>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Tracked: <strong className="text-indigo-600 dark:text-indigo-400">{Math.round(totalTrackedMins / 60 * 10) / 10}h</strong>
            </span>
            <span className="text-slate-300 dark:text-slate-600 mx-1">•</span>
            <span className="text-xs font-semibold text-emerald-600">
              {completedCount}/{dayTasks.length} Done
            </span>
          </div>
        </div>

        {/* Quick Day Shifters & Tools */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            id="btn-shift-backward"
            onClick={() => onShiftAllDayBlocks(selectedDate, -30)}
            disabled={dayTasks.length === 0}
            className="px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 rounded-lg border border-slate-200 dark:border-slate-700 transition"
            title="Shift all blocks earlier by 30 minutes"
          >
            -30m Shift
          </button>

          <button
            id="btn-shift-forward"
            onClick={() => onShiftAllDayBlocks(selectedDate, 30)}
            disabled={dayTasks.length === 0}
            className="px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 rounded-lg border border-slate-200 dark:border-slate-700 transition"
            title="Shift all blocks later by 30 minutes (e.g. if morning meeting ran long)"
          >
            +30m Shift
          </button>

          <button
            id="btn-quick-apply-routine"
            onClick={onOpenPatternModal}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 rounded-lg border border-blue-200 dark:border-blue-800 transition"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Apply Routine Pattern</span>
          </button>
        </div>
      </div>

      {/* Untimed / All Day Tasks Bar (if any) */}
      {allDayOrNoTimeTasks.length > 0 && (
        <div className="px-4 py-2 bg-amber-50/50 dark:bg-amber-950/20 border-b border-amber-200/50 dark:border-amber-900/30 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider shrink-0">
            All-Day / Untimed:
          </span>
          <div className="flex items-center gap-2">
            {allDayOrNoTimeTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => onEditTask(task)}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer hover:border-blue-400 transition"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTaskCheck(task);
                  }}
                >
                  {task.completed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>
                <span className={task.completed ? 'line-through text-slate-400' : ''}>
                  {task.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main 24-Hour Timeline Grid Canvas */}
      <div
        ref={timelineRef}
        className="flex-1 overflow-y-auto relative p-2 sm:p-4 select-none"
        style={{ minHeight: '600px' }}
      >
        <div className="relative" style={{ height: `${totalHeight}px` }}>
          {/* Current Time Indicator Line (if today) */}
          {isToday && currentTimeMinutes >= startHour * 60 && currentTimeMinutes <= (endHour + 1) * 60 && (
            <div
              className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
              style={{
                top: `${((currentTimeMinutes - startHour * 60) / 60) * pixelsPerHour}px`,
              }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm -ml-1 animate-ping" />
              <div className="w-2 h-2 rounded-full bg-rose-500 -ml-2 mr-1" />
              <div className="flex-1 h-0.5 bg-rose-500 shadow-xs" />
              <span className="text-[10px] font-bold text-rose-600 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded shadow-xs border border-rose-200 ml-1">
                Now
              </span>
            </div>
          )}

          {/* Hour and Half-Hour Grid Rows */}
          {Array.from({ length: totalHours }).map((_, index) => {
            const hour = startHour + index;
            const hourTimeStr = `${String(hour).padStart(2, '0')}:00`;
            const halfHourTimeStr = `${String(hour).padStart(2, '0')}:30`;
            const topPx = index * pixelsPerHour;

            return (
              <React.Fragment key={hour}>
                {/* Full Hour Row */}
                <div
                  className="absolute left-0 right-0 border-t border-slate-200 dark:border-slate-800 flex items-start group hover:bg-blue-50/20 dark:hover:bg-blue-950/10 transition"
                  style={{ top: `${topPx}px`, height: `${pixelsPerHour / 2}px` }}
                  onDragOver={(e) => handleDragOver(e, hourTimeStr)}
                  onDrop={(e) => handleDrop(e, hourTimeStr)}
                  onClick={(e) => {
                    // Only trigger create if clicking background
                    if (e.target === e.currentTarget) {
                      onCreateAtTime(selectedDate, hourTimeStr);
                    }
                  }}
                >
                  <div className="w-14 sm:w-16 text-right pr-3 -mt-2.5 text-xs font-semibold text-slate-400 dark:text-slate-500 shrink-0">
                    {formatTimeDisplay(hourTimeStr)}
                  </div>
                  <div className="flex-1 h-full relative border-l border-slate-100 dark:border-slate-800/80">
                    {/* Hover Quick Create Indicator */}
                    <div className="opacity-0 group-hover:opacity-100 text-[11px] text-blue-500 flex items-center gap-1 pl-2 pt-1 pointer-events-none transition">
                      <Plus className="w-3 h-3" /> Click to add block at {formatTimeDisplay(hourTimeStr)}
                    </div>
                  </div>
                </div>

                {/* Half Hour Divider Row */}
                <div
                  className="absolute left-0 right-0 border-t border-dashed border-slate-150 dark:border-slate-800/50 flex items-start group hover:bg-blue-50/20 dark:hover:bg-blue-950/10 transition"
                  style={{ top: `${topPx + pixelsPerHour / 2}px`, height: `${pixelsPerHour / 2}px` }}
                  onDragOver={(e) => handleDragOver(e, halfHourTimeStr)}
                  onDrop={(e) => handleDrop(e, halfHourTimeStr)}
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      onCreateAtTime(selectedDate, halfHourTimeStr);
                    }
                  }}
                >
                  <div className="w-14 sm:w-16 text-right pr-3 -mt-2 text-[10px] text-slate-300 dark:text-slate-600 shrink-0">
                    :30
                  </div>
                  <div className="flex-1 h-full relative border-l border-slate-100 dark:border-slate-800/80">
                    <div className="opacity-0 group-hover:opacity-100 text-[10px] text-blue-400 flex items-center gap-1 pl-2 pt-0.5 pointer-events-none transition">
                      <Plus className="w-2.5 h-2.5" /> + Add at {formatTimeDisplay(halfHourTimeStr)}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })}

          {/* Render Scheduled Time Blocks */}
          {dayTasks.map((task) => {
            const startMins = parseTimeToMinutes(task.startTime!);
            const endMins = task.endTime
              ? parseTimeToMinutes(task.endTime)
              : startMins + (task.plannedDurationMinutes || 60);

            const durationMinutes = Math.max(15, endMins - startMins);
            const offsetFromStart = startMins - startHour * 60;
            const topPx = (offsetFromStart / 60) * pixelsPerHour;
            const heightPx = Math.max(34, (durationMinutes / 60) * pixelsPerHour - 4);

            const isCurrentTimer = activeTimerTaskId === task.id;
            const categoryConfig = CATEGORY_COLORS[task.category] || CATEGORY_COLORS.work;

            // Planned vs Actual percentage
            const plannedSecs = (task.plannedDurationMinutes || 60) * 60;
            const trackedSecs = task.actualDurationSeconds || 0;
            const progressPct = Math.min(100, Math.round((trackedSecs / plannedSecs) * 100));

            return (
              <div
                key={task.id}
                id={`time-block-${task.id}`}
                draggable
                onDragStart={(e) => handleDragStart(e, task.id)}
                className={`absolute left-16 sm:left-20 right-2 sm:right-4 rounded-xl p-2.5 shadow-xs border transition-all cursor-move group select-none ${
                  task.completed
                    ? 'bg-slate-100/90 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 opacity-75'
                    : isCurrentTimer
                    ? 'bg-indigo-50/95 dark:bg-indigo-950/80 border-indigo-400 dark:border-indigo-600 ring-2 ring-indigo-400 shadow-md'
                    : `${categoryConfig.bg} ${categoryConfig.border} hover:shadow-md`
                }`}
                style={{
                  top: `${Math.max(0, topPx)}px`,
                  height: `${heightPx}px`,
                  zIndex: isCurrentTimer ? 15 : 10,
                }}
                onClick={() => onEditTask(task)}
              >
                <div className="flex items-start justify-between gap-2 h-full">
                  {/* Left: Checkbox + Title + Time + Description */}
                  <div className="flex items-start gap-2 overflow-hidden flex-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTaskCheck(task);
                      }}
                      className="mt-0.5 text-slate-400 hover:text-emerald-600 transition shrink-0"
                    >
                      {task.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Circle className="w-4 h-4 hover:scale-110 transition" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs sm:text-sm font-bold truncate ${
                            task.completed
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {task.title}
                        </span>

                        {/* Priority / Category badge */}
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${categoryConfig.badge}`}
                        >
                          {task.category}
                        </span>

                        {task.priority === 'urgent' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                            Urgent
                          </span>
                        )}
                      </div>

                      {/* Time & Duration Display */}
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-600 dark:text-slate-400">
                        <span className="font-medium">
                          {formatTimeDisplay(task.startTime!)} - {formatTimeDisplay(task.endTime || addMinutesToTimeString(task.startTime!, task.plannedDurationMinutes))}
                        </span>
                        <span>•</span>
                        <span>Planned: {task.plannedDurationMinutes}m</span>
                        {task.actualDurationSeconds > 0 && (
                          <>
                            <span>•</span>
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                              Tracked: {formatDuration(task.actualDurationSeconds)}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Optional Description if height allows */}
                      {heightPx > 60 && task.description && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-1">
                          {task.description}
                        </p>
                      )}

                      {/* Progress Bar (Planned vs Actual Tracked) */}
                      {task.actualDurationSeconds > 0 && heightPx > 50 && (
                        <div className="w-full max-w-xs mt-1.5">
                          <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                progressPct >= 100
                                  ? 'bg-emerald-500'
                                  : 'bg-indigo-600'
                              }`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Quick Action Controls */}
                  <div
                    className="flex items-center gap-1 shrink-0 opacity-90 group-hover:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Start / Pause Active Timer Button */}
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
                        className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                          isCurrentTimer && activeTimerRunning
                            ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                        }`}
                        title={
                          isCurrentTimer && activeTimerRunning
                            ? 'Pause Live Timer'
                            : 'Start Live Focus / Stopwatch on this task'
                        }
                      >
                        {isCurrentTimer && activeTimerRunning ? (
                          <>
                            <Pause className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline text-[10px]">Pause</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span className="hidden sm:inline text-[10px]">Track</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Quick Nudge Buttons (+15m / -15m) */}
                    <div className="hidden sm:flex items-center gap-0.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
                      <button
                        onClick={() => onNudgeTask(task.id, -15)}
                        className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                        title="Move 15 mins earlier"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => onNudgeTask(task.id, 15)}
                        className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                        title="Move 15 mins later"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Edit button */}
                    <button
                      onClick={() => onEditTask(task)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-white/80 dark:hover:bg-slate-800"
                      title="Edit Block"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
