import React from 'react';
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  PieChart,
  BarChart2,
  Calendar,
  Layers,
  ArrowUpRight,
  Flame,
} from 'lucide-react';
import { TaskItem, CategoryType } from '../types';
import { formatDuration, formatDate, getTodayString } from '../utils/dateUtils';
import { CATEGORY_COLORS } from '../utils/patterns';

interface AnalyticsViewProps {
  tasks: TaskItem[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ tasks }) => {
  const todayStr = getTodayString();

  // Aggregate stats
  const totalPlannedMinutes = tasks.reduce((acc, t) => acc + (t.plannedDurationMinutes || 0), 0);
  const totalTrackedSeconds = tasks.reduce((acc, t) => acc + (t.actualDurationSeconds || 0), 0);
  const totalTrackedMinutes = Math.round(totalTrackedSeconds / 60);

  const completedTasks = tasks.filter((t) => t.completed);
  const completionRate = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  // Today specific
  const todayTasks = tasks.filter((t) => t.date === todayStr);
  const todayPlannedMins = todayTasks.reduce((acc, t) => acc + (t.plannedDurationMinutes || 0), 0);
  const todayTrackedSecs = todayTasks.reduce((acc, t) => acc + (t.actualDurationSeconds || 0), 0);
  const todayTrackedMins = Math.round(todayTrackedSecs / 60);

  // Category distribution of actual time tracked
  const categoryMinutes: Record<CategoryType, number> = {
    work: 0,
    focus: 0,
    personal: 0,
    health: 0,
    study: 0,
    meeting: 0,
    urgent: 0,
  };

  tasks.forEach((t) => {
    const mins = Math.round((t.actualDurationSeconds || 0) / 60);
    if (categoryMinutes[t.category] !== undefined) {
      categoryMinutes[t.category] += mins;
    }
  });

  const maxCategoryMins = Math.max(1, ...Object.values(categoryMinutes));

  // Collect all time logs across tasks
  const allLogs: Array<{
    taskTitle: string;
    category: CategoryType;
    durationSeconds: number;
    startTime: number;
    note?: string;
  }> = [];

  tasks.forEach((task) => {
    task.timeLogs?.forEach((log) => {
      allLogs.push({
        taskTitle: task.title,
        category: task.category,
        durationSeconds: log.durationSeconds,
        startTime: log.startTime,
        note: log.note,
      });
    });
  });

  // Sort logs by recency
  allLogs.sort((a, b) => b.startTime - a.startTime);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      {/* Top Title Banner */}
      <div className="p-4 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Planned vs. Actual Time Analytics
            </h2>
            <p className="text-xs text-slate-500">
              Measure focus execution efficiency, time variances, and category budget splits
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/40 dark:from-slate-800 dark:to-slate-800/60 border border-blue-100 dark:border-slate-700">
            <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
              <span className="text-xs font-bold uppercase tracking-wider">Today's Focus</span>
              <Clock className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
              {Math.round(todayTrackedMins / 60 * 10) / 10} <span className="text-sm font-semibold text-slate-500">hours</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Planned: {Math.round(todayPlannedMins / 60 * 10) / 10}h
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/40 dark:from-slate-800 dark:to-slate-800/60 border border-emerald-100 dark:border-slate-700">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
              <span className="text-xs font-bold uppercase tracking-wider">Completion Rate</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
              {completionRate}%
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {completedTasks.length} of {tasks.length} total tasks completed
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50/40 dark:from-slate-800 dark:to-slate-800/60 border border-purple-100 dark:border-slate-700">
            <div className="flex items-center justify-between text-purple-600 dark:text-purple-400">
              <span className="text-xs font-bold uppercase tracking-wider">Total Tracked</span>
              <BarChart2 className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
              {Math.round(totalTrackedMinutes / 60 * 10) / 10} <span className="text-sm font-semibold text-slate-500">hours</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Across all recorded focus blocks
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/40 dark:from-slate-800 dark:to-slate-800/60 border border-amber-100 dark:border-slate-700">
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
              <span className="text-xs font-bold uppercase tracking-wider">Focus Efficiency</span>
              <Flame className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
              {totalPlannedMinutes > 0 ? Math.min(100, Math.round((totalTrackedMinutes / totalPlannedMinutes) * 100)) : 100}%
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Tracked vs Planned Alignment
            </div>
          </div>
        </div>

        {/* Category Time Distribution */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <PieChart className="w-4 h-4 text-blue-600" />
            <span>Time Distribution by Category</span>
          </h3>

          <div className="space-y-3">
            {(Object.keys(categoryMinutes) as CategoryType[]).map((cat) => {
              const mins = categoryMinutes[cat];
              const pct = totalTrackedMinutes > 0 ? Math.round((mins / totalTrackedMinutes) * 100) : 0;
              const barPct = Math.round((mins / maxCategoryMins) * 100);
              const colorInfo = CATEGORY_COLORS[cat];

              return (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold capitalize text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colorInfo.hex }} />
                      {cat}
                    </span>
                    <span className="text-slate-500 font-mono">
                      {Math.round(mins / 60 * 10) / 10}h ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${barPct}%`,
                        backgroundColor: colorInfo.hex,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Focus Session Logs */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-indigo-600" />
            <span>Recent Time Tracking Sessions</span>
          </h3>

          <div className="space-y-2">
            {allLogs.slice(0, 8).map((log, index) => (
              <div
                key={index}
                className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-850/50 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">{log.taskTitle}</div>
                  {log.note && <p className="text-[11px] text-slate-500 mt-0.5">{log.note}</p>}
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold font-mono text-indigo-600 dark:text-indigo-400">
                    +{formatDuration(log.durationSeconds)}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {new Date(log.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}

            {allLogs.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">
                No individual focus sessions logged yet. Start tracking a task from Day Timeline or Agenda!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
