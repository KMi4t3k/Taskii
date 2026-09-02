import React, { useState } from 'react';
import {
  Layers,
  X,
  Plus,
  Play,
  Check,
  Brain,
  Sunrise,
  GraduationCap,
  Moon,
  Sparkles,
  Calendar,
  Clock,
  Trash2,
  Copy,
} from 'lucide-react';
import { PatternTemplate, PatternBlock, CategoryType } from '../types';
import { DEFAULT_PATTERNS, CATEGORY_COLORS } from '../utils/patterns';
import { formatTimeDisplay, formatDate, getTodayString } from '../utils/dateUtils';

interface PatternManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customPatterns: PatternTemplate[];
  selectedDate: string;
  onApplyPattern: (pattern: PatternTemplate, targetDate: string, startHourOverride?: string) => void;
  onBatchApplyWeekdays: (pattern: PatternTemplate, referenceDate: string) => void;
  onSaveCustomPattern: (pattern: PatternTemplate) => void;
  onDeleteCustomPattern: (id: string) => void;
}

export const PatternManagerModal: React.FC<PatternManagerModalProps> = ({
  isOpen,
  onClose,
  customPatterns,
  selectedDate,
  onApplyPattern,
  onBatchApplyWeekdays,
  onSaveCustomPattern,
  onDeleteCustomPattern,
}) => {
  const [selectedPatternId, setSelectedPatternId] = useState<string>(DEFAULT_PATTERNS[0].id);
  const [targetDateInput, setTargetDateInput] = useState<string>(selectedDate || getTodayString());
  const [startHourOverride, setStartHourOverride] = useState<string>('');
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);

  // New Custom Pattern Form State
  const [newPatternName, setNewPatternName] = useState('');
  const [newPatternDesc, setNewPatternDesc] = useState('');
  const [newPatternBlocks, setNewPatternBlocks] = useState<PatternBlock[]>([
    {
      id: 'b-1',
      title: 'Focus Sprint 1',
      startTime: '09:00',
      endTime: '11:00',
      plannedDurationMinutes: 120,
      category: 'focus',
      priority: 'high',
      color: '#6366f1',
    },
    {
      id: 'b-2',
      title: 'Review & Sync',
      startTime: '11:30',
      endTime: '12:30',
      plannedDurationMinutes: 60,
      category: 'work',
      priority: 'medium',
      color: '#3b82f6',
    },
  ]);

  const allPatterns = [...DEFAULT_PATTERNS, ...customPatterns];
  const activePattern = allPatterns.find((p) => p.id === selectedPatternId) || allPatterns[0];

  const handleApplySingleDay = () => {
    if (activePattern) {
      onApplyPattern(activePattern, targetDateInput, startHourOverride || undefined);
      onClose();
    }
  };

  const handleApplyWeekdays = () => {
    if (activePattern) {
      onBatchApplyWeekdays(activePattern, targetDateInput);
      onClose();
    }
  };

  const handleSaveNewCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatternName.trim()) return;

    const pattern: PatternTemplate = {
      id: `custom-pattern-${Date.now()}`,
      name: newPatternName.trim(),
      description: newPatternDesc.trim() || 'Custom user routine pattern',
      icon: 'Layers',
      color: '#3b82f6',
      category: 'work',
      blocks: newPatternBlocks,
      isCustom: true,
    };

    onSaveCustomPattern(pattern);
    setSelectedPatternId(pattern.id);
    setIsCreatingCustom(false);
  };

  const handleAddBlockToNew = () => {
    setNewPatternBlocks((prev) => [
      ...prev,
      {
        id: `b-${Date.now()}`,
        title: 'New Routine Block',
        startTime: '14:00',
        endTime: '15:00',
        plannedDurationMinutes: 60,
        category: 'work',
        priority: 'medium',
        color: '#3b82f6',
      },
    ]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Routine Patterns &amp; Time-Blocking Templates
              </h2>
              <p className="text-xs text-slate-500">
                1-Click schedule days with structured routines or create your own custom patterns
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column: Pattern Selector (5 cols) */}
          <div className="md:col-span-5 space-y-2 border-r border-slate-100 dark:border-slate-800 pr-0 md:pr-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Saved Patterns
              </span>
              <button
                onClick={() => setIsCreatingCustom(true)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New</span>
              </button>
            </div>

            {allPatterns.map((pattern) => {
              const isSelected = pattern.id === selectedPatternId && !isCreatingCustom;

              return (
                <div
                  key={pattern.id}
                  onClick={() => {
                    setSelectedPatternId(pattern.id);
                    setIsCreatingCustom(false);
                  }}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                    isSelected
                      ? 'bg-blue-50/90 dark:bg-blue-950/60 border-blue-400 ring-2 ring-blue-300'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                      {pattern.name}
                    </span>
                    {pattern.isCustom && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-purple-100 text-purple-700 rounded">
                        Custom
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                    {pattern.description}
                  </p>
                  <div className="text-[10px] text-slate-400 mt-2 font-medium">
                    {pattern.blocks.length} scheduled time blocks
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Pattern Preview & Apply Tool (7 cols) */}
          <div className="md:col-span-7 space-y-4">
            {isCreatingCustom ? (
              /* Create Custom Pattern Form */
              <form onSubmit={handleSaveNewCustom} className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Create Custom Routine Pattern
                </h3>

                <input
                  type="text"
                  placeholder="Pattern Name (e.g. Creator Friday Flow)..."
                  value={newPatternName}
                  onChange={(e) => setNewPatternName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                  required
                />

                <input
                  type="text"
                  placeholder="Description..."
                  value={newPatternDesc}
                  onChange={(e) => setNewPatternDesc(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Routine Blocks
                    </span>
                    <button
                      type="button"
                      onClick={handleAddBlockToNew}
                      className="text-xs text-blue-600 font-semibold"
                    >
                      + Add Block
                    </button>
                  </div>

                  {newPatternBlocks.map((block, idx) => (
                    <div
                      key={block.id}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 flex items-center gap-2"
                    >
                      <input
                        type="text"
                        value={block.title}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewPatternBlocks((prev) =>
                            prev.map((b, i) => (i === idx ? { ...b, title: val } : b))
                          );
                        }}
                        className="flex-1 px-2 py-1 text-xs bg-white dark:bg-slate-900 border rounded"
                      />
                      <input
                        type="time"
                        value={block.startTime}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewPatternBlocks((prev) =>
                            prev.map((b, i) => (i === idx ? { ...b, startTime: val } : b))
                          );
                        }}
                        className="px-2 py-1 text-xs bg-white dark:bg-slate-900 border rounded"
                      />
                      <input
                        type="time"
                        value={block.endTime}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewPatternBlocks((prev) =>
                            prev.map((b, i) => (i === idx ? { ...b, endTime: val } : b))
                          );
                        }}
                        className="px-2 py-1 text-xs bg-white dark:bg-slate-900 border rounded"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setNewPatternBlocks((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="p-1 text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs"
                  >
                    Save Pattern
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingCustom(false)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-xl"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              /* Preview Pattern Blocks & Apply Section */
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{activePattern.name}</span>
                    {activePattern.isCustom && (
                      <button
                        onClick={() => onDeleteCustomPattern(activePattern.id)}
                        className="text-xs text-red-500 hover:underline flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{activePattern.description}</p>
                </div>

                {/* Blocks Timeline List */}
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {activePattern.blocks.map((block) => {
                    const cat = CATEGORY_COLORS[block.category] || CATEGORY_COLORS.work;

                    return (
                      <div
                        key={block.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${cat.bg} ${cat.border}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {block.title}
                          </span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${cat.badge}`}>
                            {block.category}
                          </span>
                        </div>
                        <span className="font-medium text-slate-600 dark:text-slate-400">
                          {formatTimeDisplay(block.startTime)} - {formatTimeDisplay(block.endTime)} ({block.plannedDurationMinutes}m)
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Apply Controls Box */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Apply this pattern to schedule:
                  </div>

                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <label className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                      <span>Target Date:</span>
                      <input
                        type="date"
                        value={targetDateInput}
                        onChange={(e) => setTargetDateInput(e.target.value)}
                        className="px-2.5 py-1 bg-white dark:bg-slate-900 border rounded-lg"
                      />
                    </label>

                    <label className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                      <span>Start hour (optional):</span>
                      <input
                        type="time"
                        value={startHourOverride}
                        onChange={(e) => setStartHourOverride(e.target.value)}
                        className="px-2 py-1 bg-white dark:bg-slate-900 border rounded-lg"
                      />
                    </label>
                  </div>

                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <button
                      onClick={handleApplySingleDay}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Apply to {formatDate(targetDateInput) || 'Selected Date'}</span>
                    </button>

                    <button
                      onClick={handleApplyWeekdays}
                      className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-semibold text-xs rounded-xl transition"
                    >
                      Apply to All Weekdays (Mon-Fri)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
