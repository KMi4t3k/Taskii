import React from 'react';
import {
  Clock,
  CalendarDays,
  Calendar as CalendarIcon,
  Bell,
  BarChart3,
  Plus,
  ListTodo,
} from 'lucide-react';
import { ViewMode } from '../types';

interface MobileTabBarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  remindersCount: number;
  onOpenNewTaskModal: () => void;
}

export const MobileTabBar: React.FC<MobileTabBarProps> = ({
  viewMode,
  onViewModeChange,
  remindersCount,
  onOpenNewTaskModal,
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 px-3 py-1.5 flex items-center justify-around">
      <button
        onClick={() => onViewModeChange('day')}
        className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-semibold transition ${
          viewMode === 'day'
            ? 'text-blue-600 dark:text-blue-400 font-bold'
            : 'text-slate-500 dark:text-slate-400'
        }`}
      >
        <Clock className="w-4 h-4" />
        <span>Day</span>
      </button>

      <button
        onClick={() => onViewModeChange('week')}
        className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-semibold transition ${
          viewMode === 'week'
            ? 'text-blue-600 dark:text-blue-400 font-bold'
            : 'text-slate-500 dark:text-slate-400'
        }`}
      >
        <CalendarDays className="w-4 h-4" />
        <span>Week</span>
      </button>

      {/* Floating Center Action Button */}
      <button
        onClick={onOpenNewTaskModal}
        className="-mt-5 w-11 h-11 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30 active:scale-95 transition"
        title="Add Block"
      >
        <Plus className="w-5 h-5 stroke-[2.5]" />
      </button>

      <button
        onClick={() => onViewModeChange('month')}
        className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-semibold transition ${
          viewMode === 'month'
            ? 'text-blue-600 dark:text-blue-400 font-bold'
            : 'text-slate-500 dark:text-slate-400'
        }`}
      >
        <CalendarIcon className="w-4 h-4" />
        <span>Month</span>
      </button>

      <button
        onClick={() => onViewModeChange('reminders')}
        className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-semibold transition relative ${
          viewMode === 'reminders'
            ? 'text-blue-600 dark:text-blue-400 font-bold'
            : 'text-slate-500 dark:text-slate-400'
        }`}
      >
        <Bell className="w-4 h-4" />
        <span>Alerts</span>
        {remindersCount > 0 && (
          <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
        )}
      </button>
    </nav>
  );
};
