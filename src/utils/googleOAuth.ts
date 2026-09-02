/**
 * Google OAuth 2.0 & Google Calendar API Client for Taskii
 * Uses Google Identity Services (GSI) Token Client with scopes:
 * - https://www.googleapis.com/auth/calendar.events
 * - https://www.googleapis.com/auth/userinfo.email
 * - https://www.googleapis.com/auth/userinfo.profile
 */

import { TaskItem } from '../types';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: GoogleTokenResponse) => void;
            error_callback?: (error: unknown) => void;
          }) => {
            requestAccessToken: (options?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

export interface GoogleTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

export interface GoogleUserProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export const GOOGLE_ACCESS_TOKEN_STORAGE_KEY = 'taskii_google_access_token';
export const GOOGLE_USER_PROFILE_STORAGE_KEY = 'taskii_google_user_profile';

/**
 * Pure function: converts a Taskii task item into a Google Calendar API v3 Event resource
 */
export function buildGoogleCalendarEventPayload(task: TaskItem) {
  const dateStr = task.date || new Date().toISOString().split('T')[0];
  let startObj: { dateTime?: string; date?: string; timeZone?: string };
  let endObj: { dateTime?: string; date?: string; timeZone?: string };

  if (task.startTime) {
    const [sh, sm] = task.startTime.split(':').map(Number);
    const dur = task.plannedDurationMinutes || 60;
    const endTotal = (isNaN(sh) ? 9 : sh) * 60 + (isNaN(sm) ? 0 : sm) + dur;
    const eh = Math.floor(endTotal / 60) % 24;
    const em = endTotal % 60;
    const endTimeStr = task.endTime || `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;

    const startDateTime = new Date(`${dateStr}T${task.startTime}:00`).toISOString();
    const endDateTime = new Date(`${dateStr}T${endTimeStr}:00`).toISOString();

    startObj = { dateTime: startDateTime };
    endObj = { dateTime: endDateTime };
  } else {
    startObj = { date: dateStr };
    endObj = { date: dateStr };
  }

  return {
    summary: task.title,
    description: `${task.description || ''}\n\nSynchronized via Taskii [Priority: ${task.priority}] [Category: ${task.category}]`.trim(),
    start: startObj,
    end: endObj,
    reminders: {
      useDefault: false,
      overrides: task.isReminder ? [{ method: 'popup', minutes: 15 }] : [],
    },
  };
}

/**
 * Pure function: converts a Google Calendar v3 API Event resource into a Taskii task item
 */
export function mapGoogleEventToTaskItem(item: any): TaskItem {
  const start = item.start?.dateTime || item.start?.date || '';
  const date = start ? start.split('T')[0] : new Date().toISOString().split('T')[0];
  const startTime = start.includes('T') ? start.split('T')[1].substring(0, 5) : undefined;

  let endTime: string | undefined;
  let plannedDurationMinutes = 60;
  const end = item.end?.dateTime || item.end?.date || '';
  if (end.includes('T')) {
    endTime = end.split('T')[1].substring(0, 5);
    if (startTime) {
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) {
        const diff = (eh * 60 + em) - (sh * 60 + sm);
        if (diff > 0) plannedDurationMinutes = diff;
      }
    }
  }

  const hasReminder = Boolean(item.reminders?.overrides?.length);
  const reminderMins = item.reminders?.overrides?.[0]?.minutes;
  const nowIso = new Date().toISOString();

  return {
    id: `gcal-${item.id || Math.random().toString(36).substring(2, 9)}`,
    title: item.summary || 'Bez tytułu (Google Calendar)',
    description: item.description || '',
    category: 'work',
    priority: 'medium',
    completed: false,
    date,
    startTime,
    endTime,
    plannedDurationMinutes,
    actualDurationSeconds: 0,
    timeLogs: [],
    recurring: 'none',
    isReminder: hasReminder,
    reminderTime: reminderMins ? `${reminderMins} min przed` : undefined,
    createdAt: item.created || nowIso,
    updatedAt: item.updated || nowIso,
  };
}

/**
 * Loads the Google Identity Services script dynamically if not already present
 */
export async function loadGoogleGsiScript(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existing = document.getElementById('google-gsi-script');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', (err) => reject(err));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Nie udało się załadować biblioteki Google Identity Services.'));
    document.head.appendChild(script);
  });
}

/**
 * Initiates 1-Click Google Sign-In & Calendar authorization
 */
export async function signInWithGoogleOAuth(): Promise<{
  accessToken: string;
  profile: GoogleUserProfile;
}> {
  await loadGoogleGsiScript();

  return new Promise((resolve, reject) => {
    const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '840246028648-app.apps.googleusercontent.com';
    const scope = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';

    if (!window.google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services nie jest dostępne.'));
      return;
    }

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope,
      callback: async (response: GoogleTokenResponse) => {
        if (response.error) {
          let errMsg = response.error_description || response.error;
          if (errMsg === 'popup_closed' || errMsg.includes('closed') || errMsg.includes('Popup')) {
            errMsg = 'Okno logowania Google zostało zamknięte. Otwórz aplikację w nowej karcie lub połącz kalendarz przez Hasło aplikacji / CalDAV.';
          } else if (errMsg === 'access_denied') {
            errMsg = 'Anulowano dostęp do konta Google.';
          }
          reject(new Error(errMsg));
          return;
        }

        if (!response.access_token) {
          reject(new Error('Brak tokenu dostępu w odpowiedzi Google.'));
          return;
        }

        try {
          // Fetch user profile
          const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
              Authorization: `Bearer ${response.access_token}`,
            },
          });

          let profile: GoogleUserProfile;
          if (profileRes.ok) {
            const data = await profileRes.json();
            profile = {
              id: data.id || 'google-user',
              email: data.email || 'kwiatuszyn@gmail.com',
              name: data.name || data.email?.split('@')[0] || 'Google User',
              picture: data.picture,
            };
          } else {
            profile = {
              id: 'google-user',
              email: 'kwiatuszyn@gmail.com',
              name: 'Google User',
            };
          }

          // Cache active token and profile in session storage for secure access
          sessionStorage.setItem(GOOGLE_ACCESS_TOKEN_STORAGE_KEY, response.access_token);
          sessionStorage.setItem(GOOGLE_USER_PROFILE_STORAGE_KEY, JSON.stringify(profile));

          resolve({
            accessToken: response.access_token,
            profile,
          });
        } catch (err) {
          reject(err);
        }
      },
      error_callback: (err: any) => {
        let msg = 'Błąd autoryzacji Google';
        if (typeof err === 'string') {
          msg = err;
        } else if (err?.message) {
          msg = err.message;
        } else if (err?.type === 'popup_closed' || err?.type === 'popup_failed_to_open') {
          msg = 'Okno logowania Google zostało zamknięte lub zablokowane przez przeglądarkę.';
        }

        if (msg.toLowerCase().includes('popup') || msg.toLowerCase().includes('closed')) {
          msg = 'Okno logowania Google zostało zamknięte. Otwórz aplikację w nowej karcie (bez ograniczeń ramki) lub skorzystaj z połączenia CalDAV / Hasła aplikacji.';
        }
        reject(new Error(msg));
      },
    });

    try {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (reqErr: any) {
      reject(new Error(reqErr?.message || 'Nie udało się otworzyć okna logowania Google.'));
    }
  });
}

/**
 * Gets cached access token if valid
 */
export function getCachedGoogleAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(GOOGLE_ACCESS_TOKEN_STORAGE_KEY);
}

/**
 * Gets cached Google user profile
 */
export function getCachedGoogleProfile(): GoogleUserProfile | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(GOOGLE_USER_PROFILE_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Clears stored Google session
 */
export function signOutGoogle(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(GOOGLE_ACCESS_TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(GOOGLE_USER_PROFILE_STORAGE_KEY);
}

/**
 * Syncs Taskii tasks directly with Google Calendar API using 1-Click OAuth token
 */
export async function syncWithGoogleCalendarApi(
  accessToken: string,
  tasks: TaskItem[]
): Promise<{
  syncedCount: number;
  createdCount: number;
  message: string;
}> {
  const listRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=10', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!listRes.ok) {
    if (listRes.status === 401) {
      signOutGoogle();
      throw new Error('Token autoryzacji Google wygasł. Zaloguj się ponownie jednym kliknięciem.');
    }
    const errBody = await listRes.text();
    throw new Error(`Błąd Google Calendar API: ${listRes.status} ${errBody}`);
  }

  let createdCount = 0;
  const validTasks = tasks.filter((t) => t.date && !t.isTentative);

  for (const task of validTasks.slice(0, 15)) {
    const eventPayload = buildGoogleCalendarEventPayload(task);

    try {
      const createRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventPayload),
      });

      if (createRes.ok) {
        createdCount++;
      }
    } catch (e) {
      console.warn(`Nie udało się zapisać zdarzenia "${task.title}" do Google Calendar:`, e);
    }
  }

  return {
    syncedCount: validTasks.length,
    createdCount,
    message: `Zsynchronizowano pomyślnie z Google Calendar API! Przesłano ${createdCount} zadań.`,
  };
}

/**
 * Fetches events from Google Calendar API to import into Taskii
 */
export async function fetchGoogleCalendarEvents(accessToken: string): Promise<TaskItem[]> {
  const timeMin = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
      timeMin
    )}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=50`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    if (res.status === 401) {
      signOutGoogle();
      throw new Error('Sesja Google wygasła. Zaloguj się ponownie.');
    }
    throw new Error(`Błąd pobierania wydarzeń z Google Calendar (${res.status})`);
  }

  const data = await res.json();
  const items = data.items || [];
  return items.map(mapGoogleEventToTaskItem);
}
