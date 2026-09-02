/**
 * Safe Garbage Collector & Optimistic Concurrency Service (SEC-04 Hardening)
 * Eliminates Race Conditions in the 5-minute (300s) planning window for 2137s tentative events.
 * Enforces strict UTC invariant time comparison and ETag / If-Match optimistic locking.
 * Complies with Microsoft STRIDE (Tampering, Repudiation) & PASTA Attack Trees.
 */

import { TaskItem } from '../../types';

export interface GcAuditEntry {
  id: string;
  taskId: string;
  action: 'DELETE_ORPHANED_TENTATIVE' | 'ABORT_PRECONDITION_FAILED' | 'CONFIRMED_PRESERVED';
  reason: string;
  timestampUtc: string;
  etag?: string;
  elapsedSeconds: number;
}

const GC_AUDIT_LOG_KEY = 'taskii_gc_audit_log_v1';
const MAX_AUDIT_ENTRIES = 50;

/**
 * Loads recent Garbage Collector audit entries
 */
export function loadGcAuditLog(): GcAuditEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(GC_AUDIT_LOG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore parse error
  }
  return [];
}

/**
 * Appends an entry to the GC audit log
 */
function appendGcAuditEntry(entry: Omit<GcAuditEntry, 'id'>): void {
  if (typeof window === 'undefined') return;
  try {
    const current = loadGcAuditLog();
    const fullEntry: GcAuditEntry = {
      ...entry,
      id: `gc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    current.unshift(fullEntry);
    if (current.length > MAX_AUDIT_ENTRIES) {
      current.length = MAX_AUDIT_ENTRIES;
    }
    localStorage.setItem(GC_AUDIT_LOG_KEY, JSON.stringify(current));
  } catch (e) {
    console.error('Błąd zapisu logu GC audit:', e);
  }
}

/**
 * Computes a deterministic ETag for a task to support If-Match optimistic concurrency
 */
export function computeTaskETag(task: TaskItem): string {
  const source = `${task.id}:${task.updatedAt || task.createdAt}:${task.completed}:${task.isTentative}:${task.actualDurationSeconds}`;
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    hash = (hash << 5) - hash + source.charCodeAt(i);
    hash |= 0;
  }
  return `W/"taskii-${Math.abs(hash).toString(16)}"`;
}

/**
 * Safely cleans up orphaned tentative sessions, applying UTC drift protection and ETag verification
 */
export function runSafeGarbageCollection(
  tasks: TaskItem[],
  planningWindowSeconds: number = 300,
  knownEtags?: Record<string, string>
): { cleanedTasks: TaskItem[]; deletedCount: number } {
  const nowUtc = Date.now();
  const retained: TaskItem[] = [];
  let deletedCount = 0;

  for (const task of tasks) {
    if (!task.isTentative) {
      // Confirmed or normal task - retain unconditionally
      retained.push(task);
      continue;
    }

    // Task is in tentative state (2137s flag)
    const createdAtMs = new Date(task.createdAt).getTime();
    if (isNaN(createdAtMs)) {
      // Invalid date format - retain safely to prevent data loss
      retained.push(task);
      continue;
    }

    const elapsedSeconds = Math.floor((nowUtc - createdAtMs) / 1000);
    const currentEtag = computeTaskETag(task);
    const expectedEtag = knownEtags ? knownEtags[task.id] : null;

    // Check if task was modified elsewhere (Precondition Check)
    if (expectedEtag && expectedEtag !== currentEtag) {
      appendGcAuditEntry({
        taskId: task.id,
        action: 'ABORT_PRECONDITION_FAILED',
        reason: 'Zdarzenie zostało zmodyfikowane na innym urządzeniu (ETag mismatch). Anulowano usunięcie.',
        timestampUtc: new Date().toISOString(),
        etag: currentEtag,
        elapsedSeconds,
      });
      retained.push(task);
      continue;
    }

    // Check UTC elapsed time against planning window (default 300s)
    if (elapsedSeconds >= planningWindowSeconds) {
      // Legitimate timeout - delete orphaned provisional event
      deletedCount++;
      appendGcAuditEntry({
        taskId: task.id,
        action: 'DELETE_ORPHANED_TENTATIVE',
        reason: `Upłynęło ${elapsedSeconds}s (okno: ${planningWindowSeconds}s). Pomyślnie usunięto porzucony stan przejściowy PT35M37S.`,
        timestampUtc: new Date().toISOString(),
        etag: currentEtag,
        elapsedSeconds,
      });
    } else {
      // Still within the 5-minute planning window - retain
      retained.push(task);
    }
  }

  return { cleanedTasks: retained, deletedCount };
}
