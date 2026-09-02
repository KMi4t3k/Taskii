import React from 'react';
import {
  Clock,
  CalendarDays,
  Calendar as CalendarIcon,
  ListTodo,
  Bell,
  BarChart3,
  Layers,
  Inbox,
  Timer,
  Volume2,
  VolumeX,
  Smartphone,
  Keyboard,
  Plus,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Mail,
  Zap,
  Wifi,
  WifiOff,
  Cloud,
} from 'lucide-react';
import { ViewMode, ActiveTimerState } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface SidebarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  remindersCount: number;
  backlogCount: number;
  isBacklogOpen: boolean;
  onToggleBacklog: () => void;
  onOpenNewTaskModal: () => void;
  onOpenPatternModal: () => void;
  onOpenTimerModal: () => void;
  onOpenSyncModal: () => void;
  onOpenEmailModal?: () => void;
  onOpenShortcutsModal: () => void;
  onQuickStart?: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  activeTimer: ActiveTimerState;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isOnline?: boolean;
  pendingOutboxCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  viewMode,
  onViewModeChange,
  remindersCount,
  backlogCount,
  isBacklogOpen,
  onToggleBacklog,
  onOpenNewTaskModal,
  onOpenPatternModal,
  onOpenTimerModal,
  onOpenSyncModal,
  onOpenEmailModal,
  onOpenShortcutsModal,
  onQuickStart,
  soundEnabled,
  onToggleSound,
  activeTimer,
  isCollapsed,
  onToggleCollapse,
  isOnline = true,
  pendingOutboxCount = 0,
}) => {
  const isTimerRunning = activeTimer.status === 'running';
  const isTentative = activeTimer.isTentative;

  return (
    <aside
      className={`hidden md:flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 transition-all duration-200 z-20 shrink-0 ${
        isCollapsed ? 'w-[70px]' : 'w-64'
      }`}
    >
      {/* Brand & App Title */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/25 shrink-0">
            <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">
                  Taskii
                </span>
                <span className="px-1.5 py-0.2 text-[10px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 rounded-md border border-blue-200/60 dark:border-blue-900">
                  v2.0
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium truncate">
                Czas &amp; Nawyki (iCloud/Win11)
              </span>
            </div>
          )}
        </div>

        <button
          onClick={onToggleCollapse}
          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          title={isCollapsed ? 'Rozwiń pasek boczny' : 'Zwiń pasek boczny'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Primary Actions: Quick-Start (Toggl Style) & New Task Block */}
      <div className="p-3 space-y-2">
        {/* Quick-Start 1-Click Engine (Section 5) */}
        {onQuickStart && (
          <button
            id="btn-sidebar-quick-start"
            onClick={onQuickStart}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
              isTentative
                ? 'bg-blue-700 text-white animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 active:scale-[0.98]'
            } ${isCollapsed ? 'px-0' : 'px-3'}`}
            title="Błyskawiczny Start sesji roboczej (1-kliknięcie, flaga 2137s, okno 5 min)"
          >
            <Zap className="w-4 h-4 fill-current text-white" />
            {!isCollapsed && <span>{isTentative ? 'Sesja w toku (2137s)' : 'Szybki Start Sesji'}</span>}
          </button>
        )}

        <button
          id="btn-sidebar-new-task"
          onClick={onOpenNewTaskModal}
          className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-sm shadow-blue-500/20 active:scale-[0.98] transition ${
            isCollapsed ? 'px-0' : 'px-3'
          }`}
          title="Utwórz nowy blok w kalendarzu (N)"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          {!isCollapsed && <span>Nowy Blok Czasowy</span>}
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-1 space-y-4 no-scrollbar">
        {/* Views Section */}
        <div>
          {!isCollapsed && (
            <p className="px-2 mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Widoki Kalendarza
            </p>
          )}
          <nav className="space-y-1">
            <button
              id="sidebar-view-day"
              onClick={() => onViewModeChange('day')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                viewMode === 'day'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80'
              } ${isCollapsed ? 'justify-center' : ''}`}
              title="Oś Czasu Dnia (D)"
            >
              <Clock className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>Dzień (Oś Czasu)</span>}
            </button>

            <button
              id="sidebar-view-week"
              onClick={() => onViewModeChange('week')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                viewMode === 'week'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80'
              } ${isCollapsed ? 'justify-center' : ''}`}
              title="Tydzień (W)"
            >
              <CalendarDays className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>Tydzień</span>}
            </button>

            <button
              id="sidebar-view-month"
              onClick={() => onViewModeChange('month')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                viewMode === 'month'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80'
              } ${isCollapsed ? 'justify-center' : ''}`}
              title="Miesiąc (M)"
            >
              <CalendarIcon className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>Miesiąc</span>}
            </button>

            <button
              id="sidebar-view-agenda"
              onClick={() => onViewModeChange('agenda')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                viewMode === 'agenda'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80'
              } ${isCollapsed ? 'justify-center' : ''}`}
              title="Agenda (A)"
            >
              <ListTodo className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>Agenda</span>}
            </button>
          </nav>
        </div>

        {/* Reminders & Habits Section (VTODO) */}
        <div>
          {!isCollapsed && (
            <p className="px-2 mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Zadania i Nawyki (VTODO)
            </p>
          )}
          <nav className="space-y-1">
            <button
              id="sidebar-view-reminders"
              onClick={() => onViewModeChange('reminders')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                viewMode === 'reminders'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80'
              } ${isCollapsed ? 'justify-center' : ''}`}
              title="Przypomnienia i Nawyki (R)"
            >
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>Przypomnienia i Nawyki</span>}
              </div>
              {!isCollapsed && remindersCount > 0 && (
                <span
                  className={`px-1.5 py-0.2 text-[10px] font-bold rounded-full ${
                    viewMode === 'reminders'
                      ? 'bg-blue-800 text-white'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                  }`}
                >
                  {remindersCount}
                </span>
              )}
            </button>

            <button
              id="sidebar-view-analytics"
              onClick={() => onViewModeChange('analytics')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                viewMode === 'analytics'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80'
              } ${isCollapsed ? 'justify-center' : ''}`}
              title="Analityka Czasu i Nawyków"
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>Analityka i Raporty</span>}
            </button>
          </nav>
        </div>

        {/* Tools Section */}
        <div>
          {!isCollapsed && (
            <p className="px-2 mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Narzędzia
            </p>
          )}
          <div className="space-y-1">
            <button
              id="sidebar-btn-patterns"
              onClick={onOpenPatternModal}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition ${
                isCollapsed ? 'justify-center' : ''
              }`}
              title="Szablony bloków czasowych (P)"
            >
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
              {!isCollapsed && <span>Szablony Dnia</span>}
            </button>

            <button
              id="sidebar-btn-backlog"
              onClick={onToggleBacklog}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                isBacklogOpen
                  ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
              } ${isCollapsed ? 'justify-center' : ''}`}
              title="Pula zadań nieprzypisanych (B)"
            >
              <div className="flex items-center gap-3">
                <Inbox className="w-4 h-4 text-amber-600 shrink-0" />
                {!isCollapsed && <span>Pula Zadań (Backlog)</span>}
              </div>
              {!isCollapsed && backlogCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-bold bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100 rounded-full">
                  {backlogCount}
                </span>
              )}
            </button>

            <button
              id="sidebar-btn-timer"
              onClick={onOpenTimerModal}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                isTimerRunning
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 animate-pulse'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
              } ${isCollapsed ? 'justify-center' : ''}`}
              title="Stoper i Pomodoro (Spacja)"
            >
              <Timer className={`w-4 h-4 ${isTimerRunning ? 'text-indigo-600 animate-spin' : 'text-slate-500'} shrink-0`} />
              {!isCollapsed && (
                <div className="flex items-center justify-between flex-1 truncate">
                  <span>Stoper i Pomodoro</span>
                  {isTimerRunning && (
                    <span className="text-[10px] px-1.5 py-0.2 font-bold bg-indigo-600 text-white rounded">
                      AKTYWNY
                    </span>
                  )}
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Utility Bar & Offline-First Status */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 bg-slate-50/50 dark:bg-slate-900/50">
        {/* Offline-First Outbox Status (Section 6) */}
        {!isCollapsed && (
          <div className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 flex items-center justify-between text-[11px] font-medium text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-1.5">
              {isOnline ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
              )}
              <span>{isOnline ? 'iCloud / Online' : 'Tryb Offline'}</span>
            </div>
            {pendingOutboxCount > 0 ? (
              <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200">
                Outbox: {pendingOutboxCount}
              </span>
            ) : (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                Zbuforowano
              </span>
            )}
          </div>
        )}

        {/* Email, Gmail & iCloud CalDAV Accounts Button */}
        {onOpenEmailModal && (
          <button
            id="sidebar-btn-email-icloud"
            onClick={onOpenEmailModal}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50/90 dark:bg-blue-950/70 hover:bg-blue-100 dark:hover:bg-blue-900/90 border border-blue-200/80 dark:border-blue-800 transition ${
              isCollapsed ? 'justify-center px-0' : ''
            }`}
            title="Konta @gmail.com & @icloud.com — Pobieraj i aktualizuj pliki .caldav oraz synchronizuj harmonogram (E)"
          >
            <Cloud className="w-4 h-4 text-blue-600 shrink-0" />
            {!isCollapsed && <span>Gmail &amp; iCloud (.caldav)</span>}
          </button>
        )}

        {/* Device Sync & iCal */}
        <button
          id="sidebar-btn-sync"
          onClick={onOpenSyncModal}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white border border-transparent hover:border-slate-200 dark:border-slate-700 transition ${
            isCollapsed ? 'justify-center px-0' : ''
          }`}
          title="Synchronizacja Międzyurządzeniowa (iOS, Win11, iCal) (S)"
        >
          <Smartphone className="w-4 h-4 text-indigo-600 shrink-0" />
          {!isCollapsed && <span>Sync &amp; Export CalDAV</span>}
        </button>

        {/* Sound & Shortcuts Row */}
        <div className={`flex items-center gap-1.5 ${isCollapsed ? 'flex-col' : 'justify-between'}`}>
          <button
            id="sidebar-btn-sound"
            onClick={onToggleSound}
            className="flex-1 flex items-center justify-center gap-1.5 p-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition"
            title={soundEnabled ? 'Wycisz powiadomienia dźwiękowe' : 'Włącz powiadomienia dźwiękowe'}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-4 h-4 text-emerald-600 shrink-0" />
                {!isCollapsed && <span className="text-[11px]">Dźwięk</span>}
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-slate-400 shrink-0" />
                {!isCollapsed && <span className="text-[11px]">Wyciszony</span>}
              </>
            )}
          </button>

          <button
            id="sidebar-btn-shortcuts"
            onClick={onOpenShortcutsModal}
            className="p-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white border border-transparent hover:border-slate-200 dark:border-slate-700 transition"
            title="Skróty klawiszowe (?)"
          >
            <Keyboard className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* PWA Install Button */}
        <div className="pt-0.5">
          <PWAInstallButton />
        </div>
      </div>
    </aside>
  );
};
