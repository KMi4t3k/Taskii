import React from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, Clock, Plus } from 'lucide-react';
import { TaskItem } from '../types';
import { getMonthMatrix, formatDate, getTodayString } from '../utils/dateUtils';
import { CATEGORY_COLORS } from '../utils/patterns';

interface MonthCalendarProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onSwitchToDayView: (date: string) => void;
  tasks: TaskItem[];
  onCreateTask: (date: string) => void;
  onEditTask: (task: TaskItem) => void;
}

export const MonthCalendar: React.FC<MonthCalendarProps> = ({
  selectedDate,
  onSelectDate,
  onSwitchToDayView,
  tasks,
  onCreateTask,
  onEditTask,
}) => {
  const [y, m] = selectedDate.split('-').map(Number);
  const monthIndex = m - 1;

  const monthMatrix = getMonthMatrix(y, monthIndex);
  const monthName = new Date(y, monthIndex, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const handlePrevMonth = () => {
    const prev = new Date(y, monthIndex - 1, 1);
    const ny = prev.getFullYear();
    const nm = String(prev.getMonth() + 1).padStart(2, '0');
    onSelectDate(`${ny}-${nm}-01`);
  };

  const handleNextMonth = () => {
    const next = new Date(y, monthIndex + 1, 1);
    const ny = next.getFullYear();
    const nm = String(next.getMonth() + 1).padStart(2, '0');
    onSelectDate(`${ny}-${nm}-01`);
  };

  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      {/* Month Header */}
      <div className="p-4 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
          {monthName}
        </h2>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-850 text-center py-2 text-xs font-bold text-slate-400">
        {weekdays.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      {/* Month Days Grid */}
      <div className="flex-1 grid grid-cols-7 auto-rows-fr gap-px bg-slate-200 dark:bg-slate-800 overflow-y-auto">
        {monthMatrix.flat().map((cell) => {
          const dayTasks = tasks.filter((t) => t.date === cell.date);
          const isSelected = selectedDate === cell.date;
          const dayNum = parseInt(cell.date.split('-')[2], 10);

          return (
            <div
              key={cell.date}
              onClick={() => onSelectDate(cell.date)}
              onDoubleClick={() => onSwitchToDayView(cell.date)}
              className={`min-h-[100px] p-2 flex flex-col justify-between transition relative group ${
                cell.isCurrentMonth
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white'
                  : 'bg-slate-50/60 dark:bg-slate-950/40 text-slate-400 dark:text-slate-600'
              } ${
                isSelected
                  ? 'ring-2 ring-blue-500 ring-inset bg-blue-50/20'
                  : 'hover:bg-blue-50/30 dark:hover:bg-slate-800/60'
              }`}
            >
              {/* Day Number and Quick Action */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                    cell.isToday
                      ? 'bg-blue-600 text-white shadow-xs'
                      : ''
                  }`}
                >
                  {dayNum}
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateTask(cell.date);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  title="Add block on this day"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Task Chips in cell */}
              <div className="space-y-1 my-1 flex-1 overflow-hidden">
                {dayTasks.slice(0, 3).map((task) => {
                  const cat = CATEGORY_COLORS[task.category] || CATEGORY_COLORS.work;
                  return (
                    <div
                      key={task.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditTask(task);
                      }}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold truncate border cursor-pointer hover:scale-102 transition ${
                        task.completed
                          ? 'bg-slate-100 text-slate-400 line-through border-slate-200'
                          : `${cat.bg} ${cat.text} ${cat.border}`
                      }`}
                      title={`${task.title} ${task.startTime ? `(${task.startTime})` : ''}`}
                    >
                      {task.startTime && <span className="opacity-75 mr-1">{task.startTime}</span>}
                      {task.title}
                    </div>
                  );
                })}
                {dayTasks.length > 3 && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onSwitchToDayView(cell.date);
                    }}
                    className="text-[9px] font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    +{dayTasks.length - 3} more
                  </div>
                )}
              </div>

              {/* Bottom day total hours badge */}
              {dayTasks.length > 0 && (
                <div className="text-[9px] text-slate-400 text-right">
                  {dayTasks.filter((t) => t.completed).length}/{dayTasks.length} done
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
