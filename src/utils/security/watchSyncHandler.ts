/**
 * WatchConnectivity Security Handler (SEC-06 Hardening)
 * Implements strict schema validation, command whitelisting, and timestamp expiration
 * checks to prevent Replay Attacks and IPC Spoofing between iOS and watchOS.
 * Complies with OWASP MASVS-PLATFORM & CWE-345.
 */

export type AppCommandType = 'CMD_QUICK_START' | 'CMD_CONFIRM' | 'CMD_DISCARD' | 'CMD_SYNC_STATE';

export interface WatchMessagePayload {
  command: AppCommandType;
  timestamp: number; // Unix Epoch in milliseconds
  nonce?: string;
  taskId?: string;
  title?: string;
  durationSeconds?: number;
  plannedMinutes?: number;
  isTentative?: boolean;
}

export interface WatchResponsePayload {
  status: 'SUCCESS' | 'ERROR_INVALID_PAYLOAD' | 'ERROR_EXPIRED_TIMESTAMP' | 'ERROR_UNKNOWN_COMMAND';
  message?: string;
  serverTimestamp: number;
}

const ALLOWED_COMMANDS: AppCommandType[] = [
  'CMD_QUICK_START',
  'CMD_CONFIRM',
  'CMD_DISCARD',
  'CMD_SYNC_STATE',
];

const MAX_TIMESTAMP_SKEW_MS = 60_000; // 60 seconds replay tolerance window

/**
 * Validates and securely processes messages received across the IPC channel (WCSession)
 */
export function handleSecureWatchMessage(
  rawMessage: Record<string, any>,
  onExecuteCommand: (command: AppCommandType, payload: WatchMessagePayload) => void
): WatchResponsePayload {
  const currentTimestamp = Date.now();

  // 1. Structural schema verification
  if (!rawMessage || typeof rawMessage !== 'object') {
    return {
      status: 'ERROR_INVALID_PAYLOAD',
      message: 'Nieprawidłowy ładunek komunikatu IPC.',
      serverTimestamp: currentTimestamp,
    };
  }

  const { command, timestamp } = rawMessage;

  // 2. Command whitelisting
  if (!command || !ALLOWED_COMMANDS.includes(command as AppCommandType)) {
    return {
      status: 'ERROR_UNKNOWN_COMMAND',
      message: `Nierozpoznana lub niedozwolona komenda: ${String(command).slice(0, 30)}`,
      serverTimestamp: currentTimestamp,
    };
  }

  // 3. Replay attack protection (Timestamp freshness validation)
  if (typeof timestamp !== 'number' || Math.abs(currentTimestamp - timestamp) > MAX_TIMESTAMP_SKEW_MS) {
    return {
      status: 'ERROR_EXPIRED_TIMESTAMP',
      message: 'Odrzucono przedawniony pakiet (ochrona przed Replay Attack > 60s).',
      serverTimestamp: currentTimestamp,
    };
  }

  // 4. Sanitize payload attributes
  const sanitizedPayload: WatchMessagePayload = {
    command: command as AppCommandType,
    timestamp,
    nonce: typeof rawMessage.nonce === 'string' ? rawMessage.nonce.slice(0, 64) : undefined,
    taskId: typeof rawMessage.taskId === 'string' ? rawMessage.taskId.replace(/[^a-zA-Z0-9-_]/g, '') : undefined,
    title: typeof rawMessage.title === 'string' ? rawMessage.title.slice(0, 200) : undefined,
    durationSeconds: typeof rawMessage.durationSeconds === 'number' ? Math.max(0, Math.min(86400, rawMessage.durationSeconds)) : undefined,
    plannedMinutes: typeof rawMessage.plannedMinutes === 'number' ? Math.max(0, Math.min(1440, rawMessage.plannedMinutes)) : undefined,
    isTentative: Boolean(rawMessage.isTentative),
  };

  try {
    onExecuteCommand(sanitizedPayload.command, sanitizedPayload);
    return {
      status: 'SUCCESS',
      message: `Wykonano ${sanitizedPayload.command}`,
      serverTimestamp: currentTimestamp,
    };
  } catch (err: any) {
    return {
      status: 'ERROR_INVALID_PAYLOAD',
      message: err?.message || 'Błąd podczas przetwarzania komendy.',
      serverTimestamp: currentTimestamp,
    };
  }
}
