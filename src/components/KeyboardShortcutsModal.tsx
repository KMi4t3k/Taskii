import React from 'react';
import { X, Command, Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'N', desc: 'Create new planned block / task' },
    { key: 'R', desc: 'Open Reminders view' },
    { key: 'P', desc: 'Open Routine Patterns template manager' },
    { key: 'Space', desc: 'Play / Pause active focus timer' },
    { key: 'D', desc: 'Switch to Day view' },
    { key: 'W', desc: 'Switch to Week view' },
    { key: 'M', desc: 'Switch to Month view' },
    { key: 'A', desc: 'Switch to Agenda view' },
    { key: 'T', desc: 'Jump to Today' },
    { key: 'S', desc: 'Open Cross-Device Sync & iCal modal' },
    { key: 'E', desc: 'Open Email & Apple iCloud sync modal' },
    { key: 'B', desc: 'Toggle Unscheduled Backlog drawer' },
    { key: 'Esc', desc: 'Close any open modal' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-base text-slate-900 dark:text-white">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800 my-4 max-h-[60vh] overflow-y-auto">
          {shortcuts.map((s, idx) => (
            <div key={idx} className="py-2 flex items-center justify-between text-xs sm:text-sm">
              <span className="text-slate-600 dark:text-slate-300">{s.desc}</span>
              <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-800 dark:text-slate-200 shadow-2xs">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-2 text-center">
          <button
            onClick={onClose}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
