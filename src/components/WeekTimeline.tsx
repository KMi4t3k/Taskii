import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Play,
  CheckCircle2,
  Circle,
  Clock,
  Layers,
} from 'lucide-react';
import { TaskItem } from '../types';
import {
  getWeekDays,
  parseTimeToMinutes,
  formatTimeDisplay,
  addMinutesToTimeString,
  formatDuration,
  getTodayString,
} from '../utils/dateUtils';
import { CATEGORY_COLORS } from '../utils/patterns';

interface WeekTimelineProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  tasks: TaskItem[];
  activeTimerTaskId: string | null;
  onStartTimer: (task: TaskItem) => void;
  onToggleComplete: (task: TaskItem) => void;
  onEditTask: (task: TaskItem) => void;
  onMoveTaskTime: (taskId: string, newStartTime: string, newEndTime?: string, newDate?: string) => void;
  onCreateAtTime: (date: string, startTime: string) => void;
  onOpenPatternModal: () => void;
}

export const WeekTimeline: React.FC<WeekTimelineProps> = ({
  selectedDate,
  onSelectDate,
  tasks,
  activeTimerTaskId,
  onStartTimer,
  onToggleComplete,
  onEditTask,
  onMoveTaskTime,
  onCreateAtTime,
  onOpenPatternModal,
}) => {
  const weekDays = getWeekDays(selectedDate);
  const startHour = 7; // 7 AM
  const endHour = 22; // 10 PM
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  const pixelsPerHour = 56;
  const totalHeight = hours.length * pixelsPerHour;

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    setDraggedTaskId(taskId);
  };

  const handleDropOnSlot = (e: React.DragEvent, targetDate: string, targetTimeStr: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (taskId) {
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        const duration = task.plannedDurationMinutes || 60;
        const newEndTime = addMinutesToTimeString(targetTimeStr, duration);
        onMoveTaskTime(taskId, targetTimeStr, newEndTime, targetDate);
      }
    }
    setDraggedTaskId(null);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      {/* Week Header with 7 Days */}
      <div className="grid grid-cols-8 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/80 sticky top-0 z-20">
        {/* GMT / Time Column Header */}
        <div className="p-3 text-center border-r border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-400">
          <Clock className="w-4 h-4 mx-auto mb-1 text-slate-400" />
          <span>Time</span>
        </div>

        {/* 7 Days Headers */}
        {weekDays.map((day) => {
          const dayTasks = tasks.filter((t) => t.date === day.date);
          const totalPlanned = dayTasks.reduce((acc, t) => acc + (t.plannedDurationMinutes || 0), 0);
          const isSelected = selectedDate === day.date;

          return (
            <div
              key={day.date}
              onClick={() => onSelectDate(day.date)}
              className={`p-2 text-center border-r border-slate-200 dark:border-slate-800 cursor-pointer transition ${
                isSelected
                  ? 'bg-blue-50/80 dark:bg-blue-950/40 font-bold text-blue-700 dark:text-blue-300'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-700/50'
              }`}
            >
              <div className="text-[11px] font-semibold text-slate-500 uppercase">
                {day.dayName}
              </div>
              <div
                className={`inline-flex items-center justify-center w-7 h-7 mt-0.5 rounded-full text-xs font-bold ${
                  day.isToday
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-800 dark:text-slate-200'
                }`}
              >
                {day.dayNumber}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {dayTasks.length > 0 ? `${Math.round(totalPlanned / 60 * 10) / 10}h` : '—'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Week Grid Canvas */}
      <div className="flex-1 overflow-y-auto relative" style={{ minHeight: '600px' }}>
        <div className="grid grid-cols-8 relative" style={{ height: `${totalHeight}px` }}>
          
          {/* Time Labels Column */}
          <div className="border-r border-slate-200 dark:border-slate-800 relative bg-slate-50/40 dark:bg-slate-900">
            {hours.map((hour, index) => (
              <div
                key={hour}
                className="absolute left-0 right-0 border-t border-slate-200 dark:border-slate-800 pr-2 text-right text-[11px] font-medium text-slate-400"
                style={{ top: `${index * pixelsPerHour}px`, height: `${pixelsPerHour}px` }}
              >
                <span className="-mt-2.5 inline-block">{formatTimeDisplay(`${String(hour).padStart(2, '0')}:00`)}</span>
              </div>
            ))}
          </div>

          {/* 7 Day Columns with Blocks */}
          {weekDays.map((day) => {
            const dayTasks = tasks.filter((t) => t.date === day.date && t.startTime);

            return (
              <div
                key={day.date}
                className="relative border-r border-slate-200 dark:border-slate-800 hover:bg-slate-50/30 dark:hover:bg-slate-800/20 transition"
              >
                {/* Hour Guidelines */}
                {hours.map((hour, index) => {
                  const hourTimeStr = `${String(hour).padStart(2, '0')}:00`;
                  return (
                    <div
                      key={hour}
                      className="absolute left-0 right-0 border-t border-slate-150 dark:border-slate-800/60 cursor-pointer hover:bg-blue-50/30 dark:hover:bg-blue-900/20"
                      style={{ top: `${index * pixelsPerHour}px`, height: `${pixelsPerHour}px` }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDropOnSlot(e, day.date, hourTimeStr)}
                      onClick={(e) => {
                        if (e.target === e.currentTarget) {
                          onCreateAtTime(day.date, hourTimeStr);
                        }
                      }}
                    />
                  );
                })}

                {/* Day Tasks */}
                {dayTasks.map((task) => {
                  const startMins = parseTimeToMinutes(task.startTime!);
                  const duration = task.plannedDurationMinutes || 60;
                  const offset = startMins - startHour * 60;
                  const topPx = (offset / 60) * pixelsPerHour;
                  const heightPx = Math.max(26, (duration / 60) * pixelsPerHour - 2);

                  const cat = CATEGORY_COLORS[task.category] || CATEGORY_COLORS.work;
                  const isCurrentTimer = activeTimerTaskId === task.id;

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onClick={() => onEditTask(task)}
                      className={`absolute left-1 right-1 rounded-lg p-1.5 shadow-2xs border text-left overflow-hidden cursor-pointer group transition-all ${
                        task.completed
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200'
                          : isCurrentTimer
                          ? 'bg-indigo-50 border-indigo-400 ring-1 ring-indigo-400'
                          : `${cat.bg} ${cat.border} hover:shadow-xs`
                      }`}
                      style={{
                        top: `${Math.max(0, topPx)}px`,
                        height: `${heightPx}px`,
                        zIndex: isCurrentTimer ? 15 : 10,
                      }}
                      title={`${task.title} (${task.startTime} - ${task.endTime || ''})`}
                    >
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleComplete(task);
                          }}
                          className="shrink-0"
                        >
                          {task.completed ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Circle className="w-3 h-3 text-slate-400 hover:text-emerald-500" />
                          )}
                        </button>
                        <span
                          className={`text-[11px] font-bold truncate ${
                            task.completed ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {task.title}
                        </span>
                      </div>

                      {heightPx > 40 && (
                        <div className="text-[9px] text-slate-500 truncate mt-0.5">
                          {task.startTime} • {task.plannedDurationMinutes}m
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
