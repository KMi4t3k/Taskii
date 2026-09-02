import { useEffect, useState, useRef } from 'react';
import { TaskItem } from '../types';
import { soundService } from '../utils/audio';
import { getTodayString } from '../utils/dateUtils';

export interface ActiveAlert {
  task: TaskItem;
  triggeredAt: number;
}

export function useReminderAlerts(
  tasks: TaskItem[],
  onCompleteTask?: (id: string) => void,
  onSnoozeTask?: (id: string, minutes: number) => void
) {
  const [activeAlerts, setActiveAlerts] = useState<ActiveAlert[]>([]);
  const notifiedIdsRef = useRef<Set<string>>(new Set());

  // Request browser notification permission if available
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        // Can be requested on user interaction
      }
    }
  }, []);

  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const todayStr = getTodayString();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTimeNum = currentHours * 60 + currentMinutes;

      tasks.forEach((task) => {
        if (!task.isReminder || task.completed) return;

        // Check if snoozed
        if (task.snoozedUntil) {
          const snoozeTime = new Date(task.snoozedUntil).getTime();
          if (now.getTime() < snoozeTime) return;
        }

        const taskDate = task.date || todayStr;
        if (taskDate !== todayStr) return;

        const targetTimeStr = task.reminderTime || task.startTime;
        if (!targetTimeStr) return;

        const [th, tm] = targetTimeStr.split(':').map(Number);
        const taskTimeNum = th * 60 + tm;

        // Trigger if within current minute and not already notified in this cycle
        const notifyKey = `${task.id}-${todayStr}-${targetTimeStr}`;
        if (currentTimeNum >= taskTimeNum && currentTimeNum <= taskTimeNum + 3) {
          if (!notifiedIdsRef.current.has(notifyKey)) {
            notifiedIdsRef.current.add(notifyKey);

            // Play chime
            soundService.playReminderAlarm();

            // Native notification if permitted
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification(`Reminder: ${task.title}`, {
                  body: task.description || `Scheduled for ${targetTimeStr}`,
                  icon: '/icon.svg',
                });
              } catch {
                // Ignore
              }
            }

            // Add to active alerts banner / popup
            setActiveAlerts((prev) => {
              if (prev.some((a) => a.task.id === task.id)) return prev;
              return [...prev, { task, triggeredAt: Date.now() }];
            });
          }
        }
      });
    };

    checkReminders();
    const interval = setInterval(checkReminders, 15000);
    return () => clearInterval(interval);
  }, [tasks]);

  const dismissAlert = (taskId: string) => {
    setActiveAlerts((prev) => prev.filter((a) => a.task.id !== taskId));
  };

  const handleComplete = (taskId: string) => {
    dismissAlert(taskId);
    onCompleteTask?.(taskId);
  };

  const handleSnooze = (taskId: string, minutes: number) => {
    dismissAlert(taskId);
    onSnoozeTask?.(taskId, minutes);
  };

  const requestPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return await Notification.requestPermission();
    }
    return 'denied';
  };

  return {
    activeAlerts,
    dismissAlert,
    handleComplete,
    handleSnooze,
    requestPermission,
  };
}
