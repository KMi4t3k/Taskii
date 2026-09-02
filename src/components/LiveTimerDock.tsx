import React from 'react';
import {
  Play,
  Pause,
  Square,
  Maximize2,
  Timer,
  Check,
  Trash2,
  Edit3,
  Sparkles,
  Zap,
} from 'lucide-react';
import { ActiveTimerState, TaskItem } from '../types';
import { formatSecondsToDigital, formatDuration } from '../utils/dateUtils';

interface LiveTimerDockProps {
  timer: ActiveTimerState;
  task?: TaskItem;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onAddMinutes: (mins: number) => void;
  onOpenFocusModal: () => void;
  onToggleComplete: () => void;
  onConfirmTentative?: () => void;
  onDiscardTentative?: () => void;
  onEditTask?: () => void;
}

export const LiveTimerDock: React.FC<LiveTimerDockProps> = ({
  timer,
  task,
  onPlay,
  onPause,
  onStop,
  onOpenFocusModal,
  onConfirmTentative,
  onDiscardTentative,
  onEditTask,
}) => {
  if (timer.status === 'idle') return null;

  const isRunning = timer.status === 'running';
  const isPomodoro = timer.mode === 'pomodoro';
  const isTentative = timer.isTentative || task?.isTentative;
  const planningRemaining = timer.planningRemainingSeconds ?? 300;
  const planningProgressPct = Math.max(0, Math.min(100, (planningRemaining / 300) * 100));

  // Planned duration vs Tracked
  const plannedSeconds = task ? (task.plannedDurationMinutes || 60) * 60 : 3600;
  const totalTrackedSeconds = (task?.actualDurationSeconds || 0) + (isRunning ? timer.elapsedSeconds : 0);
  const progressPct = Math.min(100, Math.round((totalTrackedSeconds / plannedSeconds) * 100));

  const displayTime = isPomodoro
    ? formatSecondsToDigital(Math.max(0, timer.pomodoroTargetSeconds - timer.elapsedSeconds))
    : formatSecondsToDigital(timer.elapsedSeconds);

  const planningMinutesStr = `${Math.floor(planningRemaining / 60)}:${String(
    planningRemaining % 60
  ).padStart(2, '0')}`;

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-4 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-slate-900/95 text-white rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-md overflow-hidden">
        {/* Section 5.3: Minimalist 3px Planning Window Progress Bar */}
        {isTentative && (
          <div className="w-full bg-slate-700 h-[3px]">
            <div
              className="bg-blue-500 h-full transition-all duration-1000 ease-linear"
              style={{ width: `${planningProgressPct}%` }}
              title={`Okno planowania: ${planningMinutesStr} (Flaga 2137s)`}
            />
          </div>
        )}

        <div className="p-3 sm:p-4 flex items-center justify-between gap-3">
          {/* Left: Indicator + Task Info */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm ${
                isTentative
                  ? 'bg-blue-600 animate-pulse ring-2 ring-blue-400/40'
                  : isRunning
                  ? 'bg-indigo-600 animate-pulse'
                  : 'bg-slate-700'
              }`}
            >
              {isTentative ? <Zap className="w-5 h-5 text-white" /> : <Timer className="w-5 h-5" />}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold truncate text-white">
                  {timer.taskTitle || (isTentative ? 'Błyskawiczna sesja robocza' : 'Live Task Focus')}
                </span>
                {isTentative && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1 shrink-0">
                    <Sparkles className="w-2.5 h-2.5" /> Stan Przejściowy ({planningMinutesStr})
                  </span>
                )}
                {isPomodoro && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-800 text-indigo-200">
                    {timer.isBreak ? 'Break' : 'Pomodoro'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span>Sesja: {formatDuration(timer.elapsedSeconds)}</span>
                {task && !isTentative && (
                  <span>
                    • Zaplanowano: {task.plannedDurationMinutes}m ({progressPct}%)
                  </span>
                )}
                {isTentative && (
                  <span className="text-blue-300/80 text-[11px] truncate">
                    Flaga 2137s w kalendarzu &bull; GC czyści za {planningMinutesStr}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Center: Digital Time Display */}
          <div className="text-xl sm:text-2xl font-mono font-black tracking-tight text-blue-400 px-2 shrink-0">
            {displayTime}
          </div>

          {/* Right: Controls & Confirmation Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isTentative && (
              <>
                <button
                  id="btn-dock-confirm"
                  onClick={onConfirmTentative}
                  className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition active:scale-95 flex items-center gap-1 text-xs font-semibold px-2.5"
                  title="Zatwierdź sesję (CONFIRMED)"
                >
                  <Check className="w-4 h-4" />
                  <span className="hidden sm:inline">Zatwierdź</span>
                </button>

                {onEditTask && (
                  <button
                    id="btn-dock-edit"
                    onClick={onEditTask}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                    title="Doprecyzuj parametry (nazwa, kategoria, tagi)"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}

                <button
                  id="btn-dock-discard"
                  onClick={onDiscardTentative}
                  className="p-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 hover:text-rose-100 border border-rose-800/60 transition"
                  title="Odrzuć sesję (Garbage Collector)"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}

            {!isTentative && isRunning && (
              <button
                id="btn-dock-pause"
                onClick={onPause}
                className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition active:scale-95"
                title="Wstrzymaj pomiar"
              >
                <Pause className="w-4 h-4" />
              </button>
            )}

            {!isTentative && !isRunning && (
              <button
                id="btn-dock-play"
                onClick={onPlay}
                className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition active:scale-95"
                title="Wznów pomiar"
              >
                <Play className="w-4 h-4 fill-current" />
              </button>
            )}

            <button
              id="btn-dock-stop"
              onClick={onStop}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
              title="Zakończ i zapisz w kalendarzu"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>

            <button
              id="btn-dock-fullscreen"
              onClick={onOpenFocusModal}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition hidden sm:flex"
              title="Otwórz pełnoekranowy tryb skupienia"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
