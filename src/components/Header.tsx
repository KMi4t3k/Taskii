import React from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Layers,
  Bell,
  BarChart3,
  ListTodo,
  CalendarDays,
  Clock,
  Play,
  Pause,
  Timer,
  Inbox,
  Sparkles,
  CheckCircle2,
  Mail,
  Zap,
} from 'lucide-react';
import { CalendarViewMode, ActiveTimerState, ViewMode } from '../types';
import { formatDate, formatFullDate, getTodayString, getRelativeDayLabel, formatSecondsToDigital } from '../utils/dateUtils';

interface HeaderProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  selectedDate: string;
  onSelectedDateChange: (date: string) => void;
  activeTimer: ActiveTimerState;
  onOpenTimerModal: () => void;
  onOpenPatternModal: () => void;
  onOpenNewTaskModal: () => void;
  onOpenSyncModal?: () => void;
  onOpenEmailModal?: () => void;
  onOpenShortcutsModal?: () => void;
  onQuickStart?: () => void;
  remindersCount: number;
  backlogCount?: number;
  isBacklogOpen?: boolean;
  onToggleBacklog?: () => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  viewMode,
  onViewModeChange,
  selectedDate,
  onSelectedDateChange,
  activeTimer,
  onOpenTimerModal,
  onOpenPatternModal,
  onOpenNewTaskModal,
  onOpenEmailModal,
  onQuickStart,
  remindersCount,
  backlogCount = 0,
  isBacklogOpen = false,
  onToggleBacklog,
}) => {
  const today = getTodayString();
  const isSelectedToday = selectedDate === today;

  const handlePrev = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (viewMode === 'week') {
      date.setDate(date.getDate() - 7);
    } else if (viewMode === 'month') {
      date.setMonth(date.getMonth() - 1);
    } else {
      date.setDate(date.getDate() - 1);
    }
    const newY = date.getFullYear();
    const newM = String(date.getMonth() + 1).padStart(2, '0');
    const newD = String(date.getDate()).padStart(2, '0');
    onSelectedDateChange(`${newY}-${newM}-${newD}`);
  };

  const handleNext = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (viewMode === 'week') {
      date.setDate(date.getDate() + 7);
    } else if (viewMode === 'month') {
      date.setMonth(date.getMonth() + 1);
    } else {
      date.setDate(date.getDate() + 1);
    }
    const newY = date.getFullYear();
    const newM = String(date.getMonth() + 1).padStart(2, '0');
    const newD = String(date.getDate()).padStart(2, '0');
    onSelectedDateChange(`${newY}-${newM}-${newD}`);
  };

  const handleJumpToday = () => {
    onSelectedDateChange(today);
  };

  const relativeLabel = getRelativeDayLabel(selectedDate);
  const isTimerActive = activeTimer.status !== 'idle';

  return (
    <header className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
      <div className="px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        {/* Left: Mobile Brand & Desktop Date Stepper */}
        <div className="flex items-center gap-3">
          {/* Mobile brand (hidden on desktop since sidebar has it) */}
          <div className="flex md:hidden items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
              Taskii
            </span>
          </div>

          {/* Date Navigator (Visible in day/week/month/agenda modes) */}
          {viewMode !== 'analytics' && viewMode !== 'reminders' && (
            <div className="flex items-center bg-slate-100/90 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/70 dark:border-slate-700">
              <button
                id="btn-prev-date"
                onClick={handlePrev}
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded-lg transition"
                title="Previous"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                id="btn-jump-today"
                onClick={handleJumpToday}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition mx-1 ${
                  isSelectedToday
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700'
                }`}
              >
                Today
              </button>

              <button
                id="btn-next-date"
                onClick={handleNext}
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded-lg transition"
                title="Next"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />

              {/* Formatted Date & Picker */}
              <div className="relative flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <CalendarIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="font-bold">{formatDate(selectedDate)}</span>
                {relativeLabel && relativeLabel !== 'Today' && (
                  <span className="hidden sm:inline text-[11px] text-slate-400 font-normal">
                    ({relativeLabel})
                  </span>
                )}
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => e.target.value && onSelectedDateChange(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  title="Pick specific date"
                />
              </div>
            </div>
          )}

          {viewMode === 'reminders' && (
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
              <Bell className="w-4 h-4 text-rose-500" />
              <span>Smart Reminders &amp; Alarms</span>
              {remindersCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 rounded-full">
                  {remindersCount} active
                </span>
              )}
            </div>
          )}

          {viewMode === 'analytics' && (
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span>Planned vs. Tracked Time Analytics</span>
            </div>
          )}
        </div>

        {/* Center / Right: Quick Active Timer Chip, Patterns, Backlog, & New Block */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Active Timer Mini-Widget in Header */}
          {isTimerActive && (
            <button
              id="btn-header-active-timer"
              onClick={onOpenTimerModal}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition shadow-2xs animate-pulse"
              title="Open Focus Timer Modal (Space)"
            >
              <Timer className="w-3.5 h-3.5 text-indigo-600" />
              <span className="max-w-[120px] truncate">{activeTimer.taskTitle || 'Focus Session'}</span>
              <span className="font-mono text-xs bg-indigo-200/80 dark:bg-indigo-900/80 px-1.5 py-0.5 rounded text-indigo-950 dark:text-indigo-200">
                {formatSecondsToDigital(activeTimer.elapsedSeconds)}
              </span>
            </button>
          )}

          {/* Quick Apply Routine Pattern Button */}
          <button
            id="btn-header-open-patterns"
            onClick={onOpenPatternModal}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200/70 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition"
            title="Apply or customize routine time-blocking patterns (P)"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Patterns</span>
          </button>

          {/* Quick Email & iCloud Export Button */}
          {onOpenEmailModal && (
            <button
              id="btn-header-open-email"
              onClick={onOpenEmailModal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50/80 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/80 border border-blue-200/80 dark:border-blue-800 rounded-xl transition"
              title="Przekaż kalendarz i przypomnienia na e-mail / iCloud (E)"
            >
              <Mail className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">E-mail &amp; iCloud</span>
            </button>
          )}

          {/* Unscheduled Backlog Toggle */}
          {onToggleBacklog && (
            <button
              id="btn-header-backlog"
              onClick={onToggleBacklog}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition ${
                isBacklogOpen
                  ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-800'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
              title="Unscheduled Backlog Pool (B)"
            >
              <Inbox className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Backlog</span>
              {backlogCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-bold bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100 rounded-full">
                  {backlogCount}
                </span>
              )}
            </button>
          )}

          {/* Quick-Start 1-Click Button (Section 5) */}
          {onQuickStart && (
            <button
              id="btn-header-quick-start"
              onClick={onQuickStart}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition shadow-xs ${
                activeTimer.isTentative
                  ? 'bg-blue-600 text-white animate-pulse ring-2 ring-blue-400/40'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 active:scale-95'
              }`}
              title="Błyskawiczny Start pomiaru czasu (1 kliknięcie, flaga 2137s)"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">
                {activeTimer.isTentative ? 'Sesja w toku' : 'Szybki Start'}
              </span>
            </button>
          )}

          {/* Primary Create Button */}
          <button
            id="btn-header-new-task"
            onClick={onOpenNewTaskModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-xs shadow-blue-500/20 transition"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden xs:inline">Nowy Blok</span>
          </button>
        </div>
      </div>
    </header>
  );
};
