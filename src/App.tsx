import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ViewMode, TaskItem, PatternTemplate, ActiveTimerState, PriorityType, CategoryType } from './types';
import {
  loadTasks,
  saveTasks,
  loadCustomPatterns,
  saveCustomPatterns,
  loadActiveTimer,
  saveActiveTimer,
} from './utils/storage';
import { getTodayString, addMinutesToTimeString, parseTimeToMinutes, getWeekDays } from './utils/dateUtils';
import { generateTasksFromPattern, DEFAULT_PATTERNS } from './utils/patterns';
import { soundService } from './utils/audio';
import { useReminderAlerts } from './hooks/useReminderAlerts';
import { enqueueOutbox, flushOutboxQueue, getPendingOutboxCount } from './utils/outbox';

// Components
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MobileTabBar } from './components/MobileTabBar';
import { DayTimeline } from './components/DayTimeline';
import { WeekTimeline } from './components/WeekTimeline';
import { MonthCalendar } from './components/MonthCalendar';
import { AgendaView } from './components/AgendaView';
import { RemindersView } from './components/RemindersView';
import { AnalyticsView } from './components/AnalyticsView';
import { TaskModal } from './components/TaskModal';
import { PatternManagerModal } from './components/PatternManagerModal';
import { ActiveTimerModal } from './components/ActiveTimerModal';
import { LiveTimerDock } from './components/LiveTimerDock';
import { SyncDeviceModal } from './components/SyncDeviceModal';
import { EmailAndICloudModal } from './components/EmailAndICloudModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { TaskBacklog } from './components/TaskBacklog';

export function App() {
  // Navigation & Date State
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('taskii_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('taskii_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Core Data
  const [tasks, setTasks] = useState<TaskItem[]>(() => loadTasks());
  const [customPatterns, setCustomPatterns] = useState<PatternTemplate[]>(() => loadCustomPatterns());

  // Active Focus & Stopwatch Timer (Quick-Start Engine)
  const [activeTimer, setActiveTimer] = useState<ActiveTimerState>(() => loadActiveTimer());

  // Offline-First Outbox State (Section 6)
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingOutboxCount, setPendingOutboxCount] = useState<number>(() => getPendingOutboxCount());

  // Modals & Panels State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TaskItem | null>(null);
  const [modalInitialDate, setModalInitialDate] = useState<string>(getTodayString());
  const [modalInitialStartTime, setModalInitialStartTime] = useState<string>('09:00');

  const [isPatternModalOpen, setIsPatternModalOpen] = useState(false);
  const [isFocusModalOpen, setIsFocusModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isBacklogOpen, setIsBacklogOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      soundService.setSoundEnabled(next);
      return next;
    });
  };

  const remindersCount = tasks.filter((t) => t.isReminder && !t.completed).length;

  // Hook for audio & browser reminder alerts
  const { requestPermission: requestNotificationPermission } = useReminderAlerts(tasks);

  // Persistence & Outbox effects
  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    saveCustomPatterns(customPatterns);
  }, [customPatterns]);

  useEffect(() => {
    saveActiveTimer(activeTimer);
  }, [activeTimer]);

  // Section 6: Monitor Łączności & Sequential Outbox Flush
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      const res = await flushOutboxQueue();
      setPendingOutboxCount(getPendingOutboxCount());
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Section 5: Live Timer Interval & 5-Minute Planning Window Garbage Collector
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (activeTimer.status === 'running') {
      interval = setInterval(() => {
        setActiveTimer((prev) => {
          if (prev.status !== 'running') return prev;
          const nextElapsed = prev.elapsedSeconds + 1;

          // Section 5.2: Okno Planowania (300 sekund) i Garbage Collector
          if (prev.isTentative) {
            const currentRemaining = prev.planningRemainingSeconds ?? 300;
            const nextRemaining = currentRemaining - 1;

            // Scenario B: Garbage Collector (Porzucenie po 300 sekundach)
            if (nextRemaining <= 0) {
              soundService.playTick();
              if (prev.taskId) {
                const tentativeId = prev.taskId;
                setTasks((taskList) => taskList.filter((t) => t.id !== tentativeId));
                enqueueOutbox('DELETE', 'event', { id: tentativeId });
                setPendingOutboxCount(getPendingOutboxCount());
              }
              return {
                taskId: null,
                taskTitle: '',
                status: 'idle',
                mode: 'stopwatch',
                sessionStartTime: null,
                elapsedSeconds: 0,
                pomodoroTargetSeconds: 25 * 60,
                isBreak: false,
                pomodoroCount: 0,
                isTentative: false,
                isQuickStart: false,
                planningRemainingSeconds: 300,
              };
            }

            return {
              ...prev,
              elapsedSeconds: nextElapsed,
              planningRemainingSeconds: nextRemaining,
            };
          }

          // Check Pomodoro Target Reached
          if (prev.mode === 'pomodoro' && nextElapsed >= prev.pomodoroTargetSeconds) {
            soundService.playPomodoroAlarm();
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              new Notification('Osiągnięto cel Pomodoro!', {
                body: prev.isBreak ? 'Przerwa zakończona! Czas na skupienie.' : 'Blok skupienia ukończony! Zrób krótką przerwę.',
                icon: '/icon.svg',
              });
            }
            return {
              ...prev,
              elapsedSeconds: nextElapsed,
              status: 'paused',
            };
          }

          return {
            ...prev,
            elapsedSeconds: nextElapsed,
          };
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTimer.status]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in form field
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)) {
        return;
      }

      if (e.key === 'Escape') {
        setIsTaskModalOpen(false);
        setIsPatternModalOpen(false);
        setIsFocusModalOpen(false);
        setIsSyncModalOpen(false);
        setIsEmailModalOpen(false);
        setIsShortcutsModalOpen(false);
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'n' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleOpenCreateTask(selectedDate);
      } else if (key === 'd') {
        setViewMode('day');
      } else if (key === 'w') {
        setViewMode('week');
      } else if (key === 'm') {
        setViewMode('month');
      } else if (key === 'a') {
        setViewMode('agenda');
      } else if (key === 'r') {
        setViewMode('reminders');
      } else if (key === 't') {
        setSelectedDate(getTodayString());
      } else if (key === 'p') {
        setIsPatternModalOpen(true);
      } else if (key === 's') {
        setIsSyncModalOpen(true);
      } else if (key === 'e') {
        setIsEmailModalOpen(true);
      } else if (key === 'b') {
        setIsBacklogOpen((prev) => !prev);
      } else if (e.code === 'Space' && activeTimer.status !== 'idle') {
        e.preventDefault();
        if (activeTimer.status === 'running') {
          handlePauseTimer();
        } else {
          handleResumeTimer();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDate, activeTimer.status]);

  // --- Task CRUD Handlers ---

  const handleOpenCreateTask = (date?: string, startTime?: string) => {
    setTaskToEdit(null);
    setModalInitialDate(date || selectedDate || getTodayString());
    setModalInitialStartTime(startTime || '09:00');
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: TaskItem) => {
    setTaskToEdit(task);
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = (taskData: Partial<TaskItem>) => {
    const nowIso = new Date().toISOString();
    if (taskToEdit) {
      // Update
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskToEdit.id
            ? {
                ...t,
                ...taskData,
                isTentative: false, // Confirmed on edit
                updatedAt: nowIso,
              }
            : t
        )
      );

      // Clear tentative from active timer if editing active task
      if (activeTimer.taskId === taskToEdit.id) {
        setActiveTimer((prev) => ({
          ...prev,
          taskTitle: taskData.title || prev.taskTitle,
          isTentative: false,
        }));
      }

      enqueueOutbox('UPDATE', 'task', { id: taskToEdit.id, ...taskData });
      setPendingOutboxCount(getPendingOutboxCount());
    } else {
      // Create new
      const newTask: TaskItem = {
        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        title: taskData.title || 'Nowy Blok Czasowy',
        description: taskData.description,
        date: taskData.date || selectedDate,
        startTime: taskData.startTime,
        endTime: taskData.endTime,
        plannedDurationMinutes: taskData.plannedDurationMinutes || 60,
        actualDurationSeconds: 0,
        completed: false,
        category: taskData.category || 'work',
        priority: taskData.priority || 'medium',
        isReminder: taskData.isReminder || false,
        reminderTime: taskData.reminderTime,
        recurring: taskData.recurring || 'none',
        createdAt: nowIso,
        updatedAt: nowIso,
        timeLogs: [],
      };
      setTasks((prev) => [...prev, newTask]);
      enqueueOutbox('CREATE', 'task', newTask);
      setPendingOutboxCount(getPendingOutboxCount());
    }
  };

  const handleToggleComplete = (task: TaskItem) => {
    const nextCompleted = !task.completed;
    const nowIso = new Date().toISOString();
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              completed: nextCompleted,
              completedAt: nextCompleted ? nowIso : undefined,
              updatedAt: nowIso,
            }
          : t
      )
    );
    enqueueOutbox('UPDATE', 'task', { id: task.id, completed: nextCompleted });
    setPendingOutboxCount(getPendingOutboxCount());
  };

  const handleDeleteTask = (id: string) => {
    if (activeTimer.taskId === id) {
      handleStopTimer();
    }
    setTasks((prev) => prev.filter((t) => t.id !== id));
    enqueueOutbox('DELETE', 'task', { id });
    setPendingOutboxCount(getPendingOutboxCount());
  };

  // --- Flexible Block Moving & Shifting Operations ---

  const handleMoveTaskTime = (
    taskId: string,
    newStartTime: string,
    newEndTime?: string,
    newDate?: string
  ) => {
    soundService.playTick();
    const nowIso = new Date().toISOString();
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const duration = t.plannedDurationMinutes || 60;
        const calcEnd = newEndTime || addMinutesToTimeString(newStartTime, duration);
        return {
          ...t,
          startTime: newStartTime,
          endTime: calcEnd,
          date: newDate || t.date,
          updatedAt: nowIso,
        };
      })
    );
    enqueueOutbox('UPDATE', 'event', { id: taskId, startTime: newStartTime, date: newDate });
    setPendingOutboxCount(getPendingOutboxCount());
  };

  const handleNudgeTask = (taskId: string, minutes: number) => {
    soundService.playTick();
    const nowIso = new Date().toISOString();
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId || !t.startTime) return t;
        const currentMins = parseTimeToMinutes(t.startTime);
        const nextMins = Math.max(0, Math.min(23 * 60 + 45, currentMins + minutes));
        const newStart = `${String(Math.floor(nextMins / 60)).padStart(2, '0')}:${String(
          nextMins % 60
        ).padStart(2, '0')}`;
        const newEnd = addMinutesToTimeString(newStart, t.plannedDurationMinutes || 60);

        return {
          ...t,
          startTime: newStart,
          endTime: newEnd,
          updatedAt: nowIso,
        };
      })
    );
  };

  const handleShiftAllDayBlocks = (date: string, minutes: number) => {
    soundService.playSuccess();
    const nowIso = new Date().toISOString();
    setTasks((prev) =>
      prev.map((t) => {
        if (t.date !== date || !t.startTime) return t;
        const currentMins = parseTimeToMinutes(t.startTime);
        const nextMins = Math.max(0, Math.min(23 * 60 + 45, currentMins + minutes));
        const newStart = `${String(Math.floor(nextMins / 60)).padStart(2, '0')}:${String(
          nextMins % 60
        ).padStart(2, '0')}`;
        const newEnd = addMinutesToTimeString(newStart, t.plannedDurationMinutes || 60);

        return {
          ...t,
          startTime: newStart,
          endTime: newEnd,
          updatedAt: nowIso,
        };
      })
    );
  };

  // --- Routine Patterns Application ---

  const handleApplyPattern = (
    pattern: PatternTemplate,
    targetDate: string,
    startHourOverride?: string
  ) => {
    const newTasks = generateTasksFromPattern(pattern, targetDate, startHourOverride);
    soundService.playSuccess();
    setTasks((prev) => [...prev, ...newTasks]);
  };

  const handleBatchApplyWeekdays = (pattern: PatternTemplate, referenceDate: string) => {
    const weekDays = getWeekDays(referenceDate);
    const generated: TaskItem[] = [];

    weekDays.forEach((day, index) => {
      if (index < 5) {
        const dayTasks = generateTasksFromPattern(pattern, day.date);
        generated.push(...dayTasks);
      }
    });

    soundService.playSuccess();
    setTasks((prev) => [...prev, ...generated]);
  };

  const handleSaveCustomPattern = (pattern: PatternTemplate) => {
    setCustomPatterns((prev) => [...prev.filter((p) => p.id !== pattern.id), pattern]);
  };

  const handleDeleteCustomPattern = (id: string) => {
    setCustomPatterns((prev) => prev.filter((p) => p.id !== id));
  };

  // --- Reminders View Actions ---

  const handleQuickCreateReminder = (
    title: string,
    date: string,
    time: string,
    priority: PriorityType
  ) => {
    const nowIso = new Date().toISOString();
    const newReminder: TaskItem = {
      id: `rem-${Date.now()}`,
      title,
      date,
      startTime: time,
      reminderTime: time,
      plannedDurationMinutes: 15,
      actualDurationSeconds: 0,
      completed: false,
      category: 'urgent',
      priority,
      isReminder: true,
      recurring: 'none',
      timeLogs: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    soundService.playSuccess();
    setTasks((prev) => [...prev, newReminder]);
    enqueueOutbox('CREATE', 'reminder', newReminder);
    setPendingOutboxCount(getPendingOutboxCount());
  };

  const handleSnoozeReminder = (taskId: string, minutes: number) => {
    soundService.playTick();
    const nowIso = new Date().toISOString();
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const currentReminder = t.reminderTime || t.startTime || '09:00';
        const newTime = addMinutesToTimeString(currentReminder, minutes);
        return {
          ...t,
          reminderTime: newTime,
          startTime: newTime,
          updatedAt: nowIso,
        };
      })
    );
  };

  // --- Unscheduled Backlog Actions ---

  const handleQuickCreateBacklog = (
    title: string,
    category: CategoryType,
    durationMinutes: number
  ) => {
    const nowIso = new Date().toISOString();
    const backlogTask: TaskItem = {
      id: `backlog-${Date.now()}`,
      title,
      plannedDurationMinutes: durationMinutes,
      actualDurationSeconds: 0,
      completed: false,
      category,
      priority: 'medium',
      isReminder: false,
      recurring: 'none',
      timeLogs: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    soundService.playSuccess();
    setTasks((prev) => [...prev, backlogTask]);
    enqueueOutbox('CREATE', 'task', backlogTask);
    setPendingOutboxCount(getPendingOutboxCount());
  };

  const handleScheduleBacklogTask = (
    taskId: string,
    targetDate: string,
    startTime: string = '10:00'
  ) => {
    soundService.playSuccess();
    const nowIso = new Date().toISOString();
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const duration = t.plannedDurationMinutes || 60;
        const endTime = addMinutesToTimeString(startTime, duration);
        return {
          ...t,
          date: targetDate,
          startTime,
          endTime,
          updatedAt: nowIso,
        };
      })
    );
  };

  // --- Quick-Start Engine (Section 5: Flaga 2137s & Okno 5 minut) ---

  const handleQuickStart = () => {
    soundService.playStartTimer();
    const today = getTodayString();
    const now = new Date();
    const nowHours = String(now.getHours()).padStart(2, '0');
    const nowMins = String(now.getMinutes()).padStart(2, '0');
    const startTime = `${nowHours}:${nowMins}`;
    const calculatedEndTime = addMinutesToTimeString(startTime, 36); // 2137s (~35m37s)
    const nowIso = now.toISOString();

    const provisionalTask: TaskItem = {
      id: `quick-${Date.now()}`,
      title: 'Błyskawiczna sesja robocza',
      date: today,
      startTime,
      endTime: calculatedEndTime,
      plannedDurationMinutes: 36, // 2137 seconds flag
      actualDurationSeconds: 0,
      category: 'work',
      priority: 'medium',
      completed: false,
      isReminder: false,
      recurring: 'none',
      isTentative: true,
      tentativeExpiresAt: Date.now() + 300000,
      timeLogs: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    setTasks((prev) => [provisionalTask, ...prev]);
    enqueueOutbox('CREATE', 'event', provisionalTask);
    setPendingOutboxCount(getPendingOutboxCount());

    setActiveTimer({
      taskId: provisionalTask.id,
      taskTitle: provisionalTask.title,
      status: 'running',
      mode: 'stopwatch',
      sessionStartTime: Date.now(),
      elapsedSeconds: 0,
      pomodoroTargetSeconds: 25 * 60,
      isBreak: false,
      pomodoroCount: 0,
      isQuickStart: true,
      isTentative: true,
      planningRemainingSeconds: 300,
    });
  };

  // Scenario A (Sukces): Zatwierdzenie sesji ze Stanu Przejściowego
  const handleConfirmTentative = () => {
    soundService.playSuccess();
    if (!activeTimer.taskId) return;
    const taskId = activeTimer.taskId;
    const nowIso = new Date().toISOString();

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          isTentative: false,
          updatedAt: nowIso,
        };
      })
    );

    setActiveTimer((prev) => ({
      ...prev,
      isTentative: false,
    }));

    enqueueOutbox('UPDATE', 'event', { id: taskId, isTentative: false });
    setPendingOutboxCount(getPendingOutboxCount());
  };

  // Scenario B: Odrzucenie sesji ze Stanu Przejściowego (Manual Garbage Collection)
  const handleDiscardTentative = () => {
    soundService.playTick();
    if (activeTimer.taskId) {
      const taskId = activeTimer.taskId;
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      enqueueOutbox('DELETE', 'event', { id: taskId });
      setPendingOutboxCount(getPendingOutboxCount());
    }

    setActiveTimer({
      taskId: null,
      taskTitle: '',
      status: 'idle',
      mode: 'stopwatch',
      sessionStartTime: null,
      elapsedSeconds: 0,
      pomodoroTargetSeconds: 25 * 60,
      isBreak: false,
      pomodoroCount: 0,
      isTentative: false,
      isQuickStart: false,
      planningRemainingSeconds: 300,
    });
  };

  // --- Active Time Tracking Handlers ---

  const handleStartTimer = (task: TaskItem) => {
    soundService.playStartTimer();
    setActiveTimer({
      taskId: task.id,
      taskTitle: task.title,
      status: 'running',
      mode: 'stopwatch',
      sessionStartTime: Date.now(),
      elapsedSeconds: 0,
      pomodoroTargetSeconds: 25 * 60,
      isBreak: false,
      pomodoroCount: 0,
      isTentative: false,
      isQuickStart: false,
      planningRemainingSeconds: 300,
    });
  };

  const handleResumeTimer = () => {
    soundService.playStartTimer();
    setActiveTimer((prev) => ({ ...prev, status: 'running' }));
  };

  const handlePauseTimer = () => {
    soundService.playPauseTimer();
    setActiveTimer((prev) => ({ ...prev, status: 'paused' }));
  };

  const handleStopTimer = (sessionNote?: string) => {
    soundService.playPauseTimer();
    if (activeTimer.taskId && activeTimer.elapsedSeconds > 0) {
      const durationSecs = activeTimer.elapsedSeconds;
      const taskId = activeTimer.taskId;

      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== taskId) return t;
          const newLog = {
            id: `log-${Date.now()}`,
            startTime: activeTimer.sessionStartTime || Date.now() - durationSecs * 1000,
            endTime: Date.now(),
            durationSeconds: durationSecs,
            note: sessionNote,
          };
          // Compute real DTEND
          let finalEndTime = t.endTime;
          if (t.startTime) {
            const actualMins = Math.max(1, Math.round(durationSecs / 60));
            finalEndTime = addMinutesToTimeString(t.startTime, actualMins);
          }

          return {
            ...t,
            endTime: finalEndTime,
            isTentative: false, // Scenario A: CONFIRMED
            actualDurationSeconds: (t.actualDurationSeconds || 0) + durationSecs,
            timeLogs: [...(t.timeLogs || []), newLog],
            updatedAt: new Date().toISOString(),
          };
        })
      );
      enqueueOutbox('UPDATE', 'event', { id: taskId, actualDurationSeconds: durationSecs });
      setPendingOutboxCount(getPendingOutboxCount());
    }

    setActiveTimer({
      taskId: null,
      taskTitle: '',
      status: 'idle',
      mode: 'stopwatch',
      sessionStartTime: null,
      elapsedSeconds: 0,
      pomodoroTargetSeconds: 25 * 60,
      isBreak: false,
      pomodoroCount: 0,
      isTentative: false,
      isQuickStart: false,
      planningRemainingSeconds: 300,
    });
  };

  const handleAddTimerMinutes = (mins: number) => {
    setActiveTimer((prev) => {
      if (prev.mode === 'pomodoro') {
        return {
          ...prev,
          pomodoroTargetSeconds: prev.pomodoroTargetSeconds + mins * 60,
        };
      }
      return {
        ...prev,
        elapsedSeconds: Math.max(0, prev.elapsedSeconds + mins * 60),
      };
    });
  };

  const handleSwitchTimerMode = (mode: 'stopwatch' | 'pomodoro') => {
    setActiveTimer((prev) => ({
      ...prev,
      mode,
      pomodoroTargetSeconds: 25 * 60,
      elapsedSeconds: 0,
      isBreak: false,
    }));
  };

  const handleToggleTimerBreak = () => {
    setActiveTimer((prev) => {
      const nextBreak = !prev.isBreak;
      return {
        ...prev,
        isBreak: nextBreak,
        pomodoroTargetSeconds: nextBreak ? 5 * 60 : 25 * 60,
        elapsedSeconds: 0,
      };
    });
  };

  // Find active task object for timer dock
  const activeTask = tasks.find((t) => t.id === activeTimer.taskId);
  const backlogCount = tasks.filter((t) => !t.completed && (!t.startTime || !t.date)).length;

  return (
    <div className="flex h-screen w-full bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white antialiased overflow-hidden select-none">
      {/* Sidebar Navigation */}
      <Sidebar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        remindersCount={remindersCount}
        backlogCount={backlogCount}
        isBacklogOpen={isBacklogOpen}
        onToggleBacklog={() => setIsBacklogOpen((prev) => !prev)}
        onOpenNewTaskModal={() => handleOpenCreateTask(selectedDate)}
        onOpenPatternModal={() => setIsPatternModalOpen(true)}
        onOpenTimerModal={() => setIsFocusModalOpen(true)}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        onOpenEmailModal={() => setIsEmailModalOpen(true)}
        onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
        onQuickStart={handleQuickStart}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        activeTimer={activeTimer}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        isOnline={isOnline}
        pendingOutboxCount={pendingOutboxCount}
      />

      {/* Main App Container */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          selectedDate={selectedDate}
          onSelectedDateChange={setSelectedDate}
          activeTimer={activeTimer}
          onOpenTimerModal={() => setIsFocusModalOpen(true)}
          onOpenPatternModal={() => setIsPatternModalOpen(true)}
          onOpenNewTaskModal={() => handleOpenCreateTask(selectedDate)}
          onOpenEmailModal={() => setIsEmailModalOpen(true)}
          onQuickStart={handleQuickStart}
          remindersCount={remindersCount}
          backlogCount={backlogCount}
          isBacklogOpen={isBacklogOpen}
          onToggleBacklog={() => setIsBacklogOpen((prev) => !prev)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden p-2 sm:p-4 gap-3 relative pb-16 md:pb-4">
          {/* Main View Panel */}
          <div className="flex-1 h-full min-w-0 flex flex-col">
            {viewMode === 'day' && (
              <DayTimeline
                selectedDate={selectedDate}
                tasks={tasks}
                activeTimerTaskId={activeTimer.taskId}
                activeTimerRunning={activeTimer.status === 'running'}
                onStartTimer={handleStartTimer}
                onPauseTimer={handlePauseTimer}
                onToggleComplete={handleToggleComplete}
                onEditTask={handleOpenEditTask}
                onDeleteTask={handleDeleteTask}
                onMoveTaskTime={handleMoveTaskTime}
                onNudgeTask={handleNudgeTask}
                onShiftAllDayBlocks={handleShiftAllDayBlocks}
                onCreateAtTime={(date, time) => handleOpenCreateTask(date, time)}
                onOpenPatternModal={() => setIsPatternModalOpen(true)}
              />
            )}

            {viewMode === 'week' && (
              <WeekTimeline
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                tasks={tasks}
                activeTimerTaskId={activeTimer.taskId}
                onStartTimer={handleStartTimer}
                onToggleComplete={handleToggleComplete}
                onEditTask={handleOpenEditTask}
                onMoveTaskTime={handleMoveTaskTime}
                onCreateAtTime={(date, time) => handleOpenCreateTask(date, time)}
                onOpenPatternModal={() => setIsPatternModalOpen(true)}
              />
            )}

            {viewMode === 'month' && (
              <MonthCalendar
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                onSwitchToDayView={(date) => {
                  setSelectedDate(date);
                  setViewMode('day');
                }}
                tasks={tasks}
                onCreateTask={(date) => handleOpenCreateTask(date)}
                onEditTask={handleOpenEditTask}
              />
            )}

            {viewMode === 'agenda' && (
              <AgendaView
                tasks={tasks}
                activeTimerTaskId={activeTimer.taskId}
                activeTimerRunning={activeTimer.status === 'running'}
                onStartTimer={handleStartTimer}
                onPauseTimer={handlePauseTimer}
                onToggleComplete={handleToggleComplete}
                onEditTask={handleOpenEditTask}
                onDeleteTask={handleDeleteTask}
              />
            )}

            {viewMode === 'reminders' && (
              <RemindersView
                tasks={tasks}
                onToggleComplete={handleToggleComplete}
                onEditTask={handleOpenEditTask}
                onDeleteTask={handleDeleteTask}
                onQuickCreateReminder={handleQuickCreateReminder}
                onSnoozeReminder={handleSnoozeReminder}
                onRequestNotificationPermission={requestNotificationPermission}
              />
            )}

            {viewMode === 'analytics' && <AnalyticsView tasks={tasks} />}
          </div>

          {/* Unscheduled Backlog Drawer */}
          <TaskBacklog
            tasks={tasks}
            isOpen={isBacklogOpen}
            onToggleOpen={() => setIsBacklogOpen((prev) => !prev)}
            selectedDate={selectedDate}
            onScheduleTask={handleScheduleBacklogTask}
            onEditTask={handleOpenEditTask}
            onQuickCreateBacklog={handleQuickCreateBacklog}
            onToggleComplete={handleToggleComplete}
          />
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <MobileTabBar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          remindersCount={remindersCount}
          onOpenNewTaskModal={() => handleOpenCreateTask(selectedDate)}
        />
      </div>

      {/* Floating Bottom Timer Dock (when a task timer is active) */}
      <LiveTimerDock
        timer={activeTimer}
        task={activeTask}
        onPlay={handleResumeTimer}
        onPause={handlePauseTimer}
        onStop={() => handleStopTimer()}
        onAddMinutes={handleAddTimerMinutes}
        onOpenFocusModal={() => setIsFocusModalOpen(true)}
        onToggleComplete={() => {
          if (activeTask) handleToggleComplete(activeTask);
        }}
        onConfirmTentative={handleConfirmTentative}
        onDiscardTentative={handleDiscardTentative}
        onEditTask={() => {
          if (activeTask) handleOpenEditTask(activeTask);
        }}
      />

      {/* Section 5.3: Minimalist 3px Planning Window Progress Bar on bottom edge */}
      {activeTimer.isTentative && (
        <div className="fixed bottom-0 left-0 right-0 h-[3px] bg-slate-300 dark:bg-slate-800 z-50">
          <div
            className="h-full bg-blue-600 transition-all duration-1000 ease-linear"
            style={{
              width: `${Math.max(
                0,
                Math.min(100, ((activeTimer.planningRemainingSeconds ?? 300) / 300) * 100)
              )}%`,
            }}
          />
        </div>
      )}

      {/* Deep Focus Mode / Pomodoro Modal */}
      <ActiveTimerModal
        timer={activeTimer}
        task={activeTask}
        isOpen={isFocusModalOpen}
        onClose={() => setIsFocusModalOpen(false)}
        onPlay={handleResumeTimer}
        onPause={handlePauseTimer}
        onStop={() => handleStopTimer()}
        onSwitchMode={handleSwitchTimerMode}
        onToggleBreak={handleToggleTimerBreak}
        onAddMinutes={handleAddTimerMinutes}
        onSaveLogNote={(note) => handleStopTimer(note)}
      />

      {/* Task & Planned Time Block Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        taskToEdit={taskToEdit}
        initialDate={modalInitialDate}
        initialStartTime={modalInitialStartTime}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
      />

      {/* Routine Patterns & Templates Manager Modal */}
      <PatternManagerModal
        isOpen={isPatternModalOpen}
        onClose={() => setIsPatternModalOpen(false)}
        customPatterns={customPatterns}
        selectedDate={selectedDate}
        onApplyPattern={handleApplyPattern}
        onBatchApplyWeekdays={handleBatchApplyWeekdays}
        onSaveCustomPattern={handleSaveCustomPattern}
        onDeleteCustomPattern={handleDeleteCustomPattern}
      />

      {/* Cross-Device Sync & iCal Export/Import Modal */}
      <SyncDeviceModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        tasks={tasks}
        customPatterns={customPatterns}
        onImportTasks={(imported) => setTasks((prev) => [...prev, ...imported])}
        onRestoreAllData={({ tasks: restoredTasks, customPatterns: restoredPatterns }) => {
          if (restoredTasks) setTasks(restoredTasks);
          if (restoredPatterns) setCustomPatterns(restoredPatterns);
        }}
      />

      {/* Email, Gmail & Apple iCloud CalDAV Integration Modal */}
      <EmailAndICloudModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        tasks={tasks}
        selectedDate={selectedDate}
        onImportTasks={(imported) => setTasks(imported)}
      />

      {/* Keyboard Shortcuts Cheat Sheet */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </div>
  );
}

export default App;
