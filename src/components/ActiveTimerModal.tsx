import React, { useState } from 'react';
import {
  Play,
  Pause,
  Square,
  X,
  RotateCcw,
  Coffee,
  Brain,
  Volume2,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ActiveTimerState, TaskItem } from '../types';
import { formatSecondsToDigital, formatDuration } from '../utils/dateUtils';
import { soundService } from '../utils/audio';

interface ActiveTimerModalProps {
  timer: ActiveTimerState;
  task?: TaskItem;
  isOpen: boolean;
  onClose: () => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSwitchMode: (mode: 'stopwatch' | 'pomodoro') => void;
  onToggleBreak: () => void;
  onAddMinutes: (mins: number) => void;
  onSaveLogNote: (note: string) => void;
}

export const ActiveTimerModal: React.FC<ActiveTimerModalProps> = ({
  timer,
  task,
  isOpen,
  onClose,
  onPlay,
  onPause,
  onStop,
  onSwitchMode,
  onToggleBreak,
  onAddMinutes,
  onSaveLogNote,
}) => {
  const [sessionNote, setSessionNote] = useState('');

  const isRunning = timer.status === 'running';
  const isPomodoro = timer.mode === 'pomodoro';

  const displayTime = isPomodoro
    ? formatSecondsToDigital(Math.max(0, timer.pomodoroTargetSeconds - timer.elapsedSeconds))
    : formatSecondsToDigital(timer.elapsedSeconds);

  // Circular progress for pomodoro
  const pomodoroPct = isPomodoro
    ? Math.min(100, Math.round((timer.elapsedSeconds / timer.pomodoroTargetSeconds) * 100))
    : 0;

  const handleStopAndSave = () => {
    if (sessionNote.trim()) {
      onSaveLogNote(sessionNote.trim());
    }
    onStop();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-800 relative flex flex-col items-center text-center">
        {/* Close Modal Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Task Title & Mode Selector */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 p-1 bg-slate-800 rounded-xl mb-3 border border-slate-700">
            <button
              onClick={() => onSwitchMode('pomodoro')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition ${
                isPomodoro
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              <span>Pomodoro</span>
            </button>
            <button
              onClick={() => onSwitchMode('stopwatch')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition ${
                !isPomodoro
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Stopwatch</span>
            </button>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white">
            {timer.taskTitle || 'Focused Task'}
          </h2>
          {task && (
            <p className="text-xs text-slate-400 mt-1">
              Planned Duration: {task.plannedDurationMinutes}m • Category: {task.category}
            </p>
          )}
        </div>

        {/* Big Circular Timer Graphic */}
        <div className="relative my-4 flex items-center justify-center">
          <div className="w-56 h-56 rounded-full border-4 border-slate-800 flex flex-col items-center justify-center relative bg-slate-850 shadow-inner">
            <div className="text-5xl font-mono font-black tracking-tight text-indigo-400">
              {displayTime}
            </div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">
              {timer.isBreak ? '☕ Rest Break' : isRunning ? '⚡ Focus Mode' : '⏸ Paused'}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 my-4">
          {isRunning ? (
            <button
              onClick={onPause}
              className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition"
            >
              <Pause className="w-5 h-5" />
              <span>Pause Focus</span>
            </button>
          ) : (
            <button
              onClick={onPlay}
              className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 transition"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Start Focus</span>
            </button>
          )}

          <button
            onClick={handleStopAndSave}
            className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-sm flex items-center gap-2 transition"
          >
            <Square className="w-4 h-4 fill-current" />
            <span>Finish &amp; Save</span>
          </button>
        </div>

        {/* Quick Add Minutes Bar */}
        <div className="flex items-center gap-2 my-2 text-xs">
          <span className="text-slate-400">Extend:</span>
          <button
            onClick={() => onAddMinutes(5)}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 font-medium transition"
          >
            +5m
          </button>
          <button
            onClick={() => onAddMinutes(15)}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 font-medium transition"
          >
            +15m
          </button>
          {isPomodoro && (
            <button
              onClick={onToggleBreak}
              className="px-2.5 py-1 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 rounded-lg font-medium transition flex items-center gap-1"
            >
              <Coffee className="w-3 h-3" />
              <span>{timer.isBreak ? 'End Break' : 'Take 5m Break'}</span>
            </button>
          )}
        </div>

        {/* Optional Session Log Note */}
        <div className="w-full mt-4">
          <input
            type="text"
            placeholder="Log note (e.g. Completed section 2, merged pull request)..."
            value={sessionNote}
            onChange={(e) => setSessionNote(e.target.value)}
            className="w-full px-3.5 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>
    </div>
  );
};
