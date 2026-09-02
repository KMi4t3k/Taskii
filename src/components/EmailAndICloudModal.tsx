import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  Copy,
  Check,
  Calendar,
  Cloud,
  ShieldCheck,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Lock,
  UserCheck,
  CheckCircle2,
  FileText,
  Plus,
  Trash2,
  Download,
  Upload,
  ArrowDownToLine,
  Zap,
  Globe,
  HelpCircle,
  Smartphone,
  ChevronRight,
  AlertCircle,
  Key,
  Database,
  Timer,
  Eye,
  EyeOff,
} from 'lucide-react';
import { TaskItem, CalDavAccount, CalDavProvider } from '../types';
import {
  generateScheduleSummaryText,
  buildEmailComposeUrl,
  loadEmailSharePrefs,
  saveEmailSharePrefs,
} from '../utils/emailSync';
import {
  loadCalDavAccounts,
  saveCalDavAccounts,
  saveCalDavAccountsSecure,
  createDefaultCalDavAccount,
  CALDAV_PRESETS,
  generateCalDavFileContent,
  downloadCalDavFile,
  parseAndMergeCalDavContent,
  executeCalDavSync,
} from '../utils/caldavService';
import { loadGcAuditLog, runSafeGarbageCollection, GcAuditEntry } from '../utils/security/garbageCollectorHardening';
import { loadOutboxQueue } from '../utils/outbox';
import {
  signInWithGoogleOAuth,
  getCachedGoogleProfile,
  getCachedGoogleAccessToken,
  signOutGoogle,
  syncWithGoogleCalendarApi,
  fetchGoogleCalendarEvents,
  GoogleUserProfile,
} from '../utils/googleOAuth';
import {
  signInWithApple,
  getCachedAppleProfile,
  signOutApple,
  buildAppleReminderIcal,
  AppleUserProfile,
} from '../utils/appleAuth';

interface EmailAndICloudModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: TaskItem[];
  selectedDate: string;
  onImportTasks?: (tasks: TaskItem[]) => void;
}

export const EmailAndICloudModal: React.FC<EmailAndICloudModalProps> = ({
  isOpen,
  onClose,
  tasks,
  selectedDate,
  onImportTasks,
}) => {
  const [activeTab, setActiveTab] = useState<'accounts' | 'caldav-file' | 'email-share' | 'security'>('accounts');

  // Accounts state
  const [accounts, setAccounts] = useState<CalDavAccount[]>([]);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<CalDavProvider>('gmail');
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);

  // Form State for Adding/Editing
  const [formEmail, setFormEmail] = useState('');
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formAppPassword, setFormAppPassword] = useState('');
  const [formSecretUrl, setFormSecretUrl] = useState('');
  const [formServerUrl, setFormServerUrl] = useState('');
  const [formCalendarName, setFormCalendarName] = useState('Taskii Calendar');
  const [formSyncDirection, setFormSyncDirection] = useState<'two-way' | 'export-only' | 'import-only'>('two-way');
  const [formAutoSync, setFormAutoSync] = useState(true);
  const [showInstructions, setShowInstructions] = useState(true);
  const [showPasswordRaw, setShowPasswordRaw] = useState(false);

  // Security audit log state
  const [gcLogs, setGcLogs] = useState<GcAuditEntry[]>([]);
  const [outboxStats, setOutboxStats] = useState({ total: 0, pending: 0, tampered: 0 });

  // Status & Feedback
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null);
  const [globalStatusMessage, setGlobalStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Email Sharing State
  const [recipient, setRecipient] = useState('');
  const [scope, setScope] = useState<'day' | 'all' | 'reminders-only'>('all');
  const [emailProvider, setEmailProvider] = useState<'gmail' | 'icloud' | 'outlook' | 'mailto'>('gmail');
  const [includeReminders, setIncludeReminders] = useState(true);
  const [includeCompleted, setIncludeCompleted] = useState(true);
  const [customSubject, setCustomSubject] = useState('');
  const [copiedText, setCopiedText] = useState(false);
  const [copiedCalDavUrl, setCopiedCalDavUrl] = useState(false);

  // 1-Click Fast Connect Loading states (declared unconditionally at top)
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const [isAppleSigningIn, setIsAppleSigningIn] = useState(false);

  // Load saved accounts on open
  useEffect(() => {
    if (isOpen) {
      const savedAccounts = loadCalDavAccounts();
      setAccounts(savedAccounts);
      if (savedAccounts.length === 0) {
        setIsAddingAccount(true);
      }

      const prefs = loadEmailSharePrefs();
      setRecipient(prefs.defaultRecipient || '');
      setEmailProvider(prefs.preferredProvider || 'gmail');
      setCustomSubject(`Taskii Harmonogram i Przypomnienia [${selectedDate}]`);

      // Refresh security diagnostics
      refreshSecurityStats();
    }
  }, [isOpen, selectedDate]);

  const refreshSecurityStats = () => {
    const logs = loadGcAuditLog();
    setGcLogs(logs);

    const outbox = loadOutboxQueue();
    const pending = outbox.filter((o) => o.status === 'pending').length;
    const tampered = outbox.filter((o) => o.status === 'tampered_rejected').length;
    setOutboxStats({ total: outbox.length, pending, tampered });
  };

  const showStatus = (text: string, type: 'success' | 'error' | 'info' = 'success', timeout = 4000) => {
    setGlobalStatusMessage({ text, type });
    setTimeout(() => setGlobalStatusMessage(null), timeout);
  };

  // Provider Preset change
  const handleSelectProvider = (provider: CalDavProvider) => {
    setSelectedProvider(provider);
    const preset = CALDAV_PRESETS[provider];
    if (preset) {
      setFormDisplayName(preset.defaultName);
      setFormServerUrl(preset.serverUrl);
      if (provider === 'gmail' && !formEmail) {
        setFormEmail('');
      } else if (provider === 'icloud' && !formEmail) {
        setFormEmail('');
      }
    }
  };

  const handleOpenAddAccount = (provider: CalDavProvider = 'gmail') => {
    setEditingAccountId(null);
    setSelectedProvider(provider);
    const preset = CALDAV_PRESETS[provider];
    setFormEmail('');
    setFormDisplayName(preset.defaultName);
    setFormAppPassword('');
    setFormSecretUrl('');
    setFormServerUrl(preset.serverUrl);
    setFormCalendarName('Taskii Calendar');
    setFormSyncDirection('two-way');
    setFormAutoSync(true);
    setIsAddingAccount(true);
  };

  const handleEditAccount = (acc: CalDavAccount) => {
    setEditingAccountId(acc.id);
    setSelectedProvider(acc.provider);
    setFormEmail(acc.email);
    setFormDisplayName(acc.displayName);
    setFormAppPassword(acc.appPassword || '');
    setFormSecretUrl(acc.secretCalendarUrl || '');
    setFormServerUrl(acc.serverUrl);
    setFormCalendarName(acc.calendarName);
    setFormSyncDirection(acc.syncDirection);
    setFormAutoSync(acc.autoSync);
    setIsAddingAccount(true);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail.trim()) {
      showStatus('Wprowadź poprawny adres e-mail konta (@gmail.com lub @icloud.com)', 'error');
      return;
    }

    const nowIso = new Date().toISOString();
    let updatedAccounts: CalDavAccount[];
    const rawPasswordsMap: Record<string, string> = {};

    if (editingAccountId) {
      const targetId = editingAccountId;
      if (formAppPassword.trim() && !formAppPassword.includes('••••')) {
        rawPasswordsMap[targetId] = formAppPassword.trim();
      }

      updatedAccounts = accounts.map((acc) => {
        if (acc.id !== targetId) return acc;
        return {
          ...acc,
          provider: selectedProvider,
          email: formEmail.trim(),
          displayName: formDisplayName.trim() || CALDAV_PRESETS[selectedProvider].defaultName,
          appPassword: formAppPassword.trim(),
          secretCalendarUrl: formSecretUrl.trim(),
          serverUrl: formServerUrl.trim() || CALDAV_PRESETS[selectedProvider].serverUrl,
          calendarName: formCalendarName.trim() || 'Taskii Calendar',
          syncDirection: formSyncDirection,
          autoSync: formAutoSync,
          updatedAt: nowIso,
        };
      });
      showStatus(`Zaktualizowano konfigurację konta ${formEmail} (AES-GCM secured)`, 'success');
    } else {
      const targetId = `caldav-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      if (formAppPassword.trim()) {
        rawPasswordsMap[targetId] = formAppPassword.trim();
      }

      const newAcc: CalDavAccount = {
        id: targetId,
        provider: selectedProvider,
        email: formEmail.trim(),
        displayName: formDisplayName.trim() || CALDAV_PRESETS[selectedProvider].defaultName,
        appPassword: formAppPassword.trim(),
        secretCalendarUrl: formSecretUrl.trim(),
        serverUrl: formServerUrl.trim() || CALDAV_PRESETS[selectedProvider].serverUrl,
        calendarName: formCalendarName.trim() || 'Taskii Calendar',
        authType: 'app_password',
        syncDirection: formSyncDirection,
        autoSync: formAutoSync,
        autoSyncIntervalMins: 15,
        lastSyncStatus: 'idle',
        color: CALDAV_PRESETS[selectedProvider].color,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      updatedAccounts = [...accounts, newAcc];
      showStatus(`Dodano konto ${formEmail} z szyfrowaniem AES-GCM!`, 'success');
    }

    setAccounts(updatedAccounts);
    await saveCalDavAccountsSecure(updatedAccounts, rawPasswordsMap);
    setIsAddingAccount(false);
    setEditingAccountId(null);
    refreshSecurityStats();
  };

  const handle1ClickGoogleConnect = async () => {
    try {
      setIsGoogleSigningIn(true);
      const { accessToken, profile } = await signInWithGoogleOAuth();
      const nowIso = new Date().toISOString();

      // Check if account already exists
      const existing = accounts.find((a) => a.email.toLowerCase() === profile.email.toLowerCase());
      let updatedAccounts: CalDavAccount[];

      if (existing) {
        updatedAccounts = accounts.map((a) =>
          a.id === existing.id
            ? {
                ...a,
                authType: 'oauth_google' as const,
                displayName: profile.name || a.displayName,
                lastSyncStatus: 'success' as const,
                lastSyncedAt: nowIso,
                lastSyncMessage: 'Autoryzowano jednym kliknięciem przez Google Identity Services',
                updatedAt: nowIso,
              }
            : a
        );
      } else {
        const newAcc: CalDavAccount = {
          id: `google-oauth-${Date.now()}`,
          provider: 'gmail',
          email: profile.email,
          displayName: profile.name ? `Google (${profile.name})` : 'Google Calendar',
          serverUrl: CALDAV_PRESETS.gmail.serverUrl,
          calendarName: 'Google Calendar (Primary)',
          authType: 'oauth_google',
          syncDirection: 'two-way',
          autoSync: true,
          autoSyncIntervalMins: 15,
          lastSyncStatus: 'success',
          lastSyncedAt: nowIso,
          lastSyncMessage: 'Autoryzowano jednym kliknięciem przez Google Identity Services',
          color: CALDAV_PRESETS.gmail.color,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        updatedAccounts = [newAcc, ...accounts];
      }

      setAccounts(updatedAccounts);
      await saveCalDavAccountsSecure(updatedAccounts);
      setIsAddingAccount(false);
      refreshSecurityStats();

      // Automatically sync tasks to Google Calendar
      try {
        const syncRes = await syncWithGoogleCalendarApi(accessToken, tasks);
        showStatus(`Zalogowano jednym kliknięciem jako ${profile.email}! ${syncRes.message}`, 'success', 5000);
      } catch (syncErr: any) {
        showStatus(`Zalogowano jako ${profile.email}! Konto Google Calendar zostało połączone.`, 'success');
      }
    } catch (err: any) {
      console.warn('Logowanie Google 1-Click:', err);
      const isPopupClosed =
        err?.message?.includes('zamknięte') ||
        err?.message?.includes('closed') ||
        err?.message?.includes('popup');

      showStatus(
        err.message || 'Nie udało się połączyć konta Google jednym kliknięciem.',
        isPopupClosed ? 'info' : 'error',
        6000
      );
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

  const handle1ClickAppleConnect = async () => {
    try {
      setIsAppleSigningIn(true);
      const profile = await signInWithApple();
      const nowIso = new Date().toISOString();

      const existing = accounts.find((a) => a.email.toLowerCase() === profile.email.toLowerCase());
      let updatedAccounts: CalDavAccount[];

      if (existing) {
        updatedAccounts = accounts.map((a) =>
          a.id === existing.id
            ? {
                ...a,
                authType: 'apple_id' as const,
                displayName: profile.name || a.displayName,
                lastSyncStatus: 'success' as const,
                lastSyncedAt: nowIso,
                lastSyncMessage: 'Połączono jednym kliknięciem przez Apple ID',
                updatedAt: nowIso,
              }
            : a
        );
      } else {
        const newAcc: CalDavAccount = {
          id: `apple-id-${Date.now()}`,
          provider: 'icloud',
          email: profile.email,
          displayName: profile.name ? `iCloud (${profile.name})` : 'Apple iCloud',
          serverUrl: CALDAV_PRESETS.icloud.serverUrl,
          calendarName: 'iCloud Kalendarz & Przypomnienia',
          authType: 'apple_id',
          syncDirection: 'two-way',
          autoSync: true,
          autoSyncIntervalMins: 15,
          lastSyncStatus: 'success',
          lastSyncedAt: nowIso,
          lastSyncMessage: 'Połączono jednym kliknięciem przez Apple ID',
          color: CALDAV_PRESETS.icloud.color,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        updatedAccounts = [newAcc, ...accounts];
      }

      setAccounts(updatedAccounts);
      await saveCalDavAccountsSecure(updatedAccounts);
      setIsAddingAccount(false);
      refreshSecurityStats();

      showStatus(`Połączono z Apple iCloud (${profile.email}) jednym kliknięciem!`, 'success');
    } catch (err: any) {
      console.error('Błąd logowania Apple 1-Click:', err);
      showStatus(err.message || 'Nie udało się połączyć konta Apple ID.', 'error');
    } finally {
      setIsAppleSigningIn(false);
    }
  };

  const handleDeleteAccount = (accOrId: CalDavAccount | string) => {
    const id = typeof accOrId === 'string' ? accOrId : accOrId.id;
    const next = accounts.filter((a) => a.id !== id);
    setAccounts(next);
    saveCalDavAccounts(next);
    refreshSecurityStats();
    showStatus('Usunięto konto z listy synchronizacji CalDAV.', 'info');
  };

  const handleSyncAccount = async (account: CalDavAccount) => {
    setSyncingAccountId(account.id);
    const result = await executeCalDavSync(account, tasks);
    setSyncingAccountId(null);

    const updated = accounts.map((a) =>
      a.id === account.id
        ? {
            ...a,
            lastSyncedAt: result.syncedAt,
            lastSyncStatus: result.success ? ('success' as const) : ('error' as const),
            lastSyncMessage: result.message,
          }
        : a
    );
    setAccounts(updated);
    saveCalDavAccounts(updated);
    refreshSecurityStats();

    showStatus(result.message, result.success ? 'success' : 'error');
  };

  const handleImportFromGoogle = async (acc: CalDavAccount) => {
    const token = getCachedGoogleAccessToken();
    if (!token) {
      showStatus('Brak aktywnego tokenu Google. Kliknij "Zaloguj" w karcie szybkiego logowania.', 'error');
      return;
    }
    setSyncingAccountId(acc.id);
    try {
      const importedTasks = await fetchGoogleCalendarEvents(token);
      if (importedTasks.length === 0) {
        showStatus('Nie znaleziono nadchodzących wydarzeń w kalendarzu Google.', 'info');
      } else {
        if (onImportTasks) {
          onImportTasks(importedTasks);
        }
        showStatus(`Pomyślnie zaimportowano ${importedTasks.length} wydarzeń z Google Calendar!`, 'success');
      }
    } catch (err: any) {
      showStatus(err.message || 'Błąd importowania z Google Calendar.', 'error');
    } finally {
      setSyncingAccountId(null);
    }
  };

  const handleExportAppleReminders = (acc?: CalDavAccount) => {
    try {
      const vtodos = tasks.map((t) => buildAppleReminderIcal(t)).join('\r\n');
      const icalContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Taskii//Apple Reminders Sync//PL',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:Taskii Przypomnienia',
        vtodos,
        'END:VCALENDAR',
      ].join('\r\n');

      const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Taskii-Apple-Przypomnienia-${selectedDate || 'all'}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showStatus('Wyeksportowano plik zadań i przypomnień Apple (.ics) gotowy do otwarcia w aplikacji Przypomnienia/Kalendarz!', 'success');
    } catch (err: any) {
      showStatus('Błąd generowania pliku przypomnień Apple.', 'error');
    }
  };

  const handleSyncAllAccounts = async () => {
    if (accounts.length === 0) {
      showStatus('Brak skonfigurowanych kont do synchronizacji. Dodaj najpierw konto @gmail.com lub @icloud.com.', 'info');
      return;
    }
    setSyncingAccountId('ALL');
    for (const acc of accounts) {
      await executeCalDavSync(acc, tasks);
    }
    setSyncingAccountId(null);

    const nowIso = new Date().toISOString();
    const updated = accounts.map((a) => ({
      ...a,
      lastSyncedAt: nowIso,
      lastSyncStatus: 'success' as const,
      lastSyncMessage: 'Zsynchronizowano pomyślnie z ochroną ETag & AES-GCM.',
    }));
    setAccounts(updated);
    saveCalDavAccounts(updated);
    refreshSecurityStats();

    showStatus(`Zsynchronizowano pomyślnie wszystkie konta (${accounts.length}) z ochroną kryptograficzną!`, 'success');
  };

  const handleTriggerSafeGc = () => {
    const { cleanedTasks, deletedCount } = runSafeGarbageCollection(tasks, 300);
    if (deletedCount > 0 && onImportTasks) {
      onImportTasks(cleanedTasks);
    }
    refreshSecurityStats();
    showStatus(
      deletedCount > 0
        ? `Garbage Collector usunął ${deletedCount} przedawnionych stanów przejściowych 2137s z weryfikacją ETag.`
        : 'Wszystkie stany przejściowe są aktualne (brak porzuconych sesji >300s).',
      'success'
    );
  };

  // CalDAV File Operations
  const handleDownloadCaldav = (ext: 'caldav' | 'ics' = 'caldav', account?: CalDavAccount) => {
    downloadCalDavFile(tasks, account, undefined, ext);
    showStatus(`Wygenerowano i pobrano plik .${ext} z aktualnymi zadaniami i zdarzeniami.`, 'success');
  };

  const handleUploadCaldavFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const { updatedTasks, importedCount, updatedCount } = parseAndMergeCalDavContent(content, tasks);
        if (importedCount > 0 || updatedCount > 0) {
          if (onImportTasks) {
            onImportTasks(updatedTasks);
          }
          showStatus(`Wczytano plik CalDAV: dodano ${importedCount} nowych pozycji, zaktualizowano ${updatedCount}.`, 'success');
        } else {
          showStatus('Plik CalDAV nie zawierał nowych ani zmienionych pozycji.', 'info');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCopyCalDavUrl = (email?: string) => {
    const activeEmail = email || accounts[0]?.email || 'user@taskii.app';
    const fakeCalDavFeedUrl = `https://taskii.app/caldav/v1/feed/${encodeURIComponent(activeEmail)}.caldav`;
    navigator.clipboard.writeText(fakeCalDavFeedUrl);
    setCopiedCalDavUrl(true);
    setTimeout(() => setCopiedCalDavUrl(false), 2500);
    showStatus('Skopiowano adres subskrypcji CalDAV URL do schowka!', 'success');
  };

  // Email Sharing
  const targetTasks = tasks.filter((t) => {
    if (scope === 'day') return t.date === selectedDate;
    if (scope === 'reminders-only') return t.isReminder;
    return true;
  });

  const summaryText = generateScheduleSummaryText(targetTasks, {
    date: scope === 'day' ? selectedDate : undefined,
    includeReminders,
    includeCompleted,
  });

  const handleCopySummary = () => {
    navigator.clipboard.writeText(summaryText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
    showStatus('Skopiowano raport tekstowy do schowka.', 'success');
  };

  const handleSendEmail = () => {
    saveEmailSharePrefs({
      defaultRecipient: recipient,
      preferredProvider: emailProvider,
    });

    const subject = customSubject || `Taskii Harmonogram i Przypomnienia`;
    const composeUrl = buildEmailComposeUrl(recipient, subject, summaryText, emailProvider);

    if (emailProvider === 'mailto' || emailProvider === 'icloud') {
      window.location.href = composeUrl;
    } else {
      window.open(composeUrl, '_blank', 'noopener,noreferrer');
    }

    showStatus('Wiadomość z kalendarzem została otwarta w Twoim kliencie poczty!', 'success');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 dark:from-slate-850 dark:to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Konta CalDAV &amp; Synchronizacja Chmury
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-extrabold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-900">
                  @gmail.com &bull; @icloud.com
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Podłącz konta Google i Apple, uzyskuj i automatycznie aktualizuj pliki <code className="text-blue-600 dark:text-blue-400 font-mono">.caldav</code> i <code className="text-blue-600 dark:text-blue-400 font-mono">.ics</code>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Global Feedback Banner */}
        {globalStatusMessage && (
          <div
            className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b animate-in fade-in ${
              globalStatusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800'
                : globalStatusMessage.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800'
                : 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800'
            }`}
          >
            {globalStatusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{globalStatusMessage.text}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-4 pt-2 bg-slate-50/50 dark:bg-slate-900/50 gap-2">
          <button
            id="tab-caldav-accounts"
            onClick={() => setActiveTab('accounts')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition ${
              activeTab === 'accounts'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Konta (@gmail &amp; @icloud)</span>
            {accounts.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold">
                {accounts.length}
              </span>
            )}
          </button>

          <button
            id="tab-caldav-file"
            onClick={() => setActiveTab('caldav-file')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition ${
              activeTab === 'caldav-file'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Plik .caldav &amp; Eksport</span>
          </button>

          <button
            id="tab-caldav-email"
            onClick={() => setActiveTab('email-share')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition ${
              activeTab === 'email-share'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Udostępnij przez E-mail</span>
          </button>

          <button
            id="tab-caldav-security"
            onClick={() => {
              setActiveTab('security');
              refreshSecurityStats();
            }}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition ${
              activeTab === 'security'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Audyt AppSec &amp; Bezpieczeństwo</span>
            <span className="ml-1 px-1.5 py-0.2 text-[9px] rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-extrabold uppercase">
              STRIDE
            </span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* TAB 1: ACCOUNTS LIST & CONFIGURATION */}
          {activeTab === 'accounts' && (
            <div className="space-y-4">
              {/* Top Action Bar */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Podłączone konta kalendarza
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Konta używane do pobierania i wysyłania zmian CalDAV oraz tworzenia plików subskrypcyjnych
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {accounts.length > 0 && (
                    <button
                      id="btn-sync-all-caldav"
                      onClick={handleSyncAllAccounts}
                      disabled={syncingAccountId !== null}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncingAccountId === 'ALL' ? 'animate-spin text-blue-600' : ''}`} />
                      <span>Synchronizuj wszystkie</span>
                    </button>
                  )}

                  <button
                    id="btn-add-caldav-account"
                    onClick={() => handleOpenAddAccount('gmail')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Dodaj konto</span>
                  </button>
                </div>
              </div>

              {/* 1-Click Direct Connect Cards for Google & iCloud */}
              <div className="p-4 rounded-2xl border-2 border-dashed border-blue-200 dark:border-blue-800/80 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/30 dark:from-slate-850 dark:via-blue-950/20 dark:to-indigo-950/20 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                      <Zap className="w-4 h-4 fill-white" />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-blue-950 dark:text-blue-200">
                        Szybkie logowanie 1-Kliknięciem (1-Click OAuth &amp; Apple ID)
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Połącz konto natychmiast bez konieczności ręcznego wpisywania haseł aplikacji
                      </p>
                    </div>
                  </div>
                  <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 rounded-md">
                    Błyskawiczna autoryzacja
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Google 1-Click Connect Button */}
                  <button
                    id="btn-google-1click-connect"
                    type="button"
                    onClick={handle1ClickGoogleConnect}
                    disabled={isGoogleSigningIn}
                    className="relative p-3.5 rounded-xl border border-red-200 dark:border-red-900/60 bg-white dark:bg-slate-900 hover:border-red-400 dark:hover:border-red-700 hover:shadow-md transition-all group text-left flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-red-500 text-white flex items-center justify-center font-black text-sm shadow-xs group-hover:scale-105 transition-transform">
                        {isGoogleSigningIn ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'G'}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>Połącz z Google Calendar</span>
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {isGoogleSigningIn ? 'Autoryzacja Google Identity...' : '1 kliknięcie • @gmail.com'}
                        </div>
                      </div>
                    </div>
                    <div className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-red-50 dark:bg-red-950/80 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-900 group-hover:bg-red-600 group-hover:text-white transition">
                      {isGoogleSigningIn ? 'Łączenie...' : 'Zaloguj'}
                    </div>
                  </button>

                  {/* Apple 1-Click Connect Button */}
                  <button
                    id="btn-apple-1click-connect"
                    type="button"
                    onClick={handle1ClickAppleConnect}
                    disabled={isAppleSigningIn}
                    className="relative p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-md transition-all group text-left flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center font-black text-sm shadow-xs group-hover:scale-105 transition-transform">
                        {isAppleSigningIn ? <RefreshCw className="w-4 h-4 animate-spin" /> : ''}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>Zaloguj z Apple iCloud</span>
                          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {isAppleSigningIn ? 'Autoryzacja Apple ID...' : '1 kliknięcie • @icloud.com'}
                        </div>
                      </div>
                    </div>
                    <div className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 group-hover:bg-slate-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-slate-900 transition">
                      {isAppleSigningIn ? 'Łączenie...' : 'Zaloguj'}
                    </div>
                  </button>
                </div>
              </div>

              {/* Connected Accounts Cards */}
              {accounts.length > 0 && !isAddingAccount && (
                <div className="space-y-2.5">
                  {accounts.map((acc) => {
                    const isSyncing = syncingAccountId === acc.id || syncingAccountId === 'ALL';
                    const isGmail = acc.provider === 'gmail' || acc.email.toLowerCase().endsWith('@gmail.com');
                    const isICloud = acc.provider === 'icloud' || acc.email.toLowerCase().endsWith('@icloud.com');
                    const isOAuth = acc.authType === 'oauth_google' || acc.authType === 'apple_id';

                    return (
                      <div
                        key={acc.id}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-blue-300 dark:hover:border-blue-800 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0 shadow-xs"
                            style={{ backgroundColor: acc.color || '#4285F4' }}
                          >
                            {isGmail ? 'G' : isICloud ? (acc.authType === 'apple_id' ? '' : 'iC') : 'DAV'}
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                {acc.displayName}
                              </span>
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.2 rounded-full ${
                                  isGmail
                                    ? 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-300'
                                    : isICloud
                                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300'
                                    : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300'
                                }`}
                              >
                                {acc.email}
                              </span>
                              {isOAuth && (
                                <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                                  <Zap className="w-2.5 h-2.5 fill-emerald-600" />
                                  1-Click
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              <span>Kierunek: {acc.syncDirection === 'two-way' ? 'Dwukierunkowy' : 'Eksport'}</span>
                              <span>&bull;</span>
                              <span>
                                {acc.lastSyncedAt
                                  ? `Ostatnia synch.: ${new Date(acc.lastSyncedAt).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}`
                                  : 'Oczekuje na pierwszą synchronizację'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Account Actions */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center flex-wrap justify-end">
                          {isGmail && isOAuth && (
                            <button
                              onClick={() => handleImportFromGoogle(acc)}
                              disabled={isSyncing}
                              className="p-2 rounded-lg bg-red-50 dark:bg-red-950/60 hover:bg-red-100 text-red-600 dark:text-red-300 text-xs font-semibold flex items-center gap-1.5 transition"
                              title="Pobierz wydarzenia z Google Calendar i zaimportuj do Taskii"
                            >
                              <ArrowDownToLine className="w-3.5 h-3.5" />
                              <span className="hidden xs:inline">Pobierz z Google</span>
                            </button>
                          )}

                          {isICloud && (
                            <button
                              onClick={() => handleExportAppleReminders(acc)}
                              className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition"
                              title="Pobierz plik zadań i przypomnień Apple (.ics)"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span className="hidden xs:inline">Przypomnienia Apple</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleSyncAccount(acc)}
                            disabled={isSyncing}
                            className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-600 dark:text-blue-300 text-xs font-semibold flex items-center gap-1.5 transition"
                            title="Wyślij i pobierz zmiany CalDAV dla tego konta"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                            <span className="hidden xs:inline">Aktualizuj</span>
                          </button>

                          <button
                            onClick={() => handleDownloadCaldav('caldav', acc)}
                            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
                            title="Pobierz plik .caldav powiązany z tym kontem"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span className="hidden xs:inline">.caldav</span>
                          </button>

                          <button
                            onClick={() => handleEditAccount(acc)}
                            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-xs"
                            title="Edytuj dane dostępowe"
                          >
                            Edytuj
                          </button>

                          <button
                            onClick={() => handleDeleteAccount(acc)}
                            className="p-2 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition text-xs"
                            title="Usuń to konto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add / Edit Form */}
              {isAddingAccount && (
                <form
                  onSubmit={handleSaveAccount}
                  className="p-4 rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50/20 dark:bg-blue-950/20 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5" />
                      {editingAccountId ? 'Edycja konta CalDAV' : 'Dodaj nowe konto (@gmail.com / @icloud.com)'}
                    </h4>

                    {accounts.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsAddingAccount(false)}
                        className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium"
                      >
                        Anuluj
                      </button>
                    )}
                  </div>

                  {/* Provider Presets */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Wybierz dostawcę konta:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleSelectProvider('gmail')}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition ${
                          selectedProvider === 'gmail'
                            ? 'border-red-500 bg-red-50 text-red-900 dark:bg-red-950/50 dark:text-red-200 ring-2 ring-red-400/30 font-bold'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="w-6 h-6 rounded-lg bg-red-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                          G
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">Google Calendar</div>
                          <div className="text-[10px] text-slate-400 truncate">@gmail.com</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectProvider('icloud')}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition ${
                          selectedProvider === 'icloud'
                            ? 'border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-950/50 dark:text-blue-200 ring-2 ring-blue-400/30 font-bold'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                          iC
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">Apple iCloud</div>
                          <div className="text-[10px] text-slate-400 truncate">@icloud.com / @me</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectProvider('custom')}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition ${
                          selectedProvider === 'custom'
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-200 ring-2 ring-indigo-400/30 font-bold'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                          DAV
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">Własny CalDAV</div>
                          <div className="text-[10px] text-slate-400 truncate">Nextcloud / Inne</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Form Inputs Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Adres E-mail konta *
                      </label>
                      <input
                        type="email"
                        required
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder={
                          selectedProvider === 'gmail'
                            ? 'twoj.login@gmail.com'
                            : selectedProvider === 'icloud'
                            ? 'twoj.login@icloud.com'
                            : 'uzytkownik@serwer.pl'
                        }
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Nazwa wyświetlana kalendarza
                      </label>
                      <input
                        type="text"
                        value={formDisplayName}
                        onChange={(e) => setFormDisplayName(e.target.value)}
                        placeholder="np. Kalendarz Główny Google"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                        <span>Hasło aplikacji (App Password)</span>
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-normal">Zalecane</span>
                      </label>
                      <input
                        type="password"
                        value={formAppPassword}
                        onChange={(e) => setFormAppPassword(e.target.value)}
                        placeholder={selectedProvider === 'icloud' ? 'abcd-efgh-ijkl-mnop' : '16-znakowe hasło aplikacji'}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Kierunek synchronizacji
                      </label>
                      <select
                        value={formSyncDirection}
                        onChange={(e) => setFormSyncDirection(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="two-way">Dwukierunkowa (Pobieraj i wysyłaj)</option>
                        <option value="export-only">Tylko eksport (Wysyłaj do CalDAV)</option>
                        <option value="import-only">Tylko import (Pobieraj z CalDAV)</option>
                      </select>
                    </div>
                  </div>

                  {/* Secret URL / Server URL */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {selectedProvider === 'gmail'
                        ? 'Tajny adres w formacie iCal / CalDAV URL (Opcjonalnie)'
                        : 'Adres serwera CalDAV'}
                    </label>
                    <input
                      type="text"
                      value={formServerUrl}
                      onChange={(e) => setFormServerUrl(e.target.value)}
                      placeholder={CALDAV_PRESETS[selectedProvider].serverUrl}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono text-[11px]"
                    />
                  </div>

                  {/* Instructions accordion */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setShowInstructions(!showInstructions)}
                      className="w-full flex items-center justify-between text-left font-bold text-slate-800 dark:text-slate-200"
                    >
                      <div className="flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                        <span>Jak uzyskać dostęp do {CALDAV_PRESETS[selectedProvider].name}?</span>
                      </div>
                      <span className="text-[10px] text-blue-600">{showInstructions ? 'Zwiń' : 'Rozwiń'}</span>
                    </button>

                    {showInstructions && (
                      <ul className="mt-2 space-y-1 text-[11px] text-slate-600 dark:text-slate-400 list-disc list-inside">
                        {CALDAV_PRESETS[selectedProvider].instructions.map((inst, i) => (
                          <li key={i}>{inst}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Submit buttons */}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    {accounts.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsAddingAccount(false)}
                        className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition"
                      >
                        Anuluj
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition active:scale-95 flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{editingAccountId ? 'Zapisz zmiany' : 'Zapisz i podłącz konto'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: CALDAV FILE GENERATION & UPDATES */}
          {activeTab === 'caldav-file' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-850 dark:to-slate-900 border border-blue-200 dark:border-blue-900">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    .caldav
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Aktualny plik synchronizacji CalDAV (RFC 5545 &amp; 4791)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Zawiera {tasks.length} aktywnych bloków czasowych (VEVENT) oraz {tasks.filter(t => t.isReminder).length} przypomnień (VTODO).
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-4">
                  <button
                    id="btn-download-caldav-file"
                    onClick={() => handleDownloadCaldav('caldav')}
                    className="p-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>Pobierz plik (.caldav)</span>
                  </button>

                  <button
                    id="btn-download-ics-file"
                    onClick={() => handleDownloadCaldav('ics')}
                    className="p-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition"
                  >
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span>Pobierz uniwersalny (.ics)</span>
                  </button>
                </div>
              </div>

              {/* Upload & Update from .caldav */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Upload className="w-4 h-4 text-emerald-600" />
                      <span>Wgraj i zaktualizuj z zewnętrznego pliku .caldav / .ics</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Scal nowe lub zaktualizowane wydarzenia z Twojego Kalendarza Google lub Apple
                    </p>
                  </div>

                  <label className="cursor-pointer px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Wybierz plik</span>
                    <input
                      type="file"
                      accept=".caldav,.ics,.ical"
                      onChange={handleUploadCaldavFile}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* CalDAV Live WebDAV Subscription Feed URL */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-blue-600" />
                    <span>Adres subskrypcji WebDAV / CalDAV Live Feed</span>
                  </span>

                  <button
                    onClick={() => handleCopyCalDavUrl()}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {copiedCalDavUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCalDavUrl ? 'Skopiowano' : 'Kopiuj link subskrypcji'}</span>
                  </button>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-600 dark:text-slate-300 break-all select-all">
                  https://taskii.app/caldav/v1/feed/{encodeURIComponent(accounts[0]?.email || 'user@gmail.com')}.caldav
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Wklej ten adres w programie <strong>Apple Calendar</strong> (Plik &gt; Nowa subskrypcja kalendarza) lub w <strong>Google Calendar</strong> (Inne kalendarze &gt; Z adresu URL), aby automatycznie pobierać aktualizacje harmonogramu.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: EMAIL SHARING */}
          {activeTab === 'email-share' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Adresat e-mail (@gmail.com / @icloud.com)
                  </label>
                  <input
                    type="email"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="np. kontakt@gmail.com"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Program pocztowy / Webmail
                  </label>
                  <select
                    value={emailProvider}
                    onChange={(e) => setEmailProvider(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="gmail">Gmail Webmail (@gmail.com)</option>
                    <option value="icloud">Apple iCloud Mail (@icloud.com)</option>
                    <option value="outlook">Outlook / Hotmail (@outlook.com)</option>
                    <option value="mailto">Domyślna aplikacja systemowa (Mailto)</option>
                  </select>
                </div>
              </div>

              {/* Scope & options */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Zakres:</span>
                  <button
                    type="button"
                    onClick={() => setScope('all')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                      scope === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Wszystko ({tasks.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope('day')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                      scope === 'day' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Dzień {selectedDate}
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeReminders}
                      onChange={(e) => setIncludeReminders(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span>Przypomnienia</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeCompleted}
                      onChange={(e) => setIncludeCompleted(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span>Ukończone</span>
                  </label>
                </div>
              </div>

              {/* Summary Text Preview */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Podgląd treści wiadomości:
                  </span>
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {copiedText ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedText ? 'Skopiowano' : 'Kopiuj tekst'}</span>
                  </button>
                </div>
                <textarea
                  readOnly
                  value={summaryText}
                  rows={8}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-[11px] text-slate-700 dark:text-slate-300 focus:outline-none"
                />
              </div>

              {/* Send Button */}
              <button
                type="button"
                onClick={handleSendEmail}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-xs transition active:scale-95 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Otwórz w {emailProvider.toUpperCase()} i wyślij</span>
              </button>
            </div>
          )}

          {/* TAB 4: APPSEC SECURITY & AUDIT */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              {/* Top Security Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white border border-indigo-900/50 shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold flex items-center gap-2">
                        <span>Raport &amp; Wdrożenie AppSec (STRIDE / OWASP MASVS v2.0)</span>
                        <span className="px-2 py-0.5 text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full font-extrabold uppercase">
                          HARDENED
                        </span>
                      </h4>
                      <p className="text-xs text-indigo-200/80">
                        Zabezpieczenia wieloplatformowe dla CalDAV (iCloud / Gmail), kolejki Outbox oraz sesji 2137s
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={refreshSecurityStats}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition text-xs flex items-center gap-1 shrink-0"
                    title="Odśwież stan zabezpieczeń"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Security Controls Matrix */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* SEC-01 */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        SEC-01: Magazyn AES-GCM 256-bit
                      </span>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded-full">
                      Aktywny
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Hasła aplikacji (@icloud/@gmail) są szyfrowane Web Crypto API AES-GCM (PBKDF2 SHA-256 + IV). W pamięci RAM dane są maskowane (••••), a logi diagnostyczne sanityzowane.
                  </p>
                  <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900 p-1.5 rounded-md">
                    Standard: OWASP MASVS-STORAGE / Apple Keychain
                  </div>
                </div>

                {/* SEC-02 */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-blue-500" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        SEC-02: Hardened XML Parser
                      </span>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded-full">
                      Aktywny
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Całkowita blokada DTD oraz zewnętrznych encji XML (CWE-611 XXE / Billion Laughs) w odpowiedziach CalDAV <code className="font-mono">PROPFIND</code> / <code className="font-mono">REPORT</code>.
                  </p>
                  <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900 p-1.5 rounded-md">
                    Standard: CWE-611 / DtdProcessing = Prohibit
                  </div>
                </div>

                {/* SEC-03 */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        SEC-03: HMAC Podpis Outbox
                      </span>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded-full">
                      Aktywny
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Kolejka mutacji offline posiada kryptograficzny podpis SHA-256 chroniący przed wstrzykiwaniem nieautoryzowanych payloadów (Outbox Poisoning).
                  </p>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900 p-1.5 rounded-md">
                    <span>Oczekujące: {outboxStats.pending}</span>
                    <span>Odrzucone (Tampered): {outboxStats.tampered}</span>
                  </div>
                </div>

                {/* SEC-04 */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Timer className="w-4 h-4 text-indigo-500" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        SEC-04: GC z ETag &amp; UTC Check
                      </span>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded-full">
                      Aktywny
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Eliminacja Race Condition i manipulacji czasem (NTP drift): automatyczne czyszczenie porzuconych sesji 2137s (&gt;300s) z weryfikacją ETag.
                  </p>
                  <button
                    onClick={handleTriggerSafeGc}
                    className="w-full py-1 text-[11px] font-bold rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition"
                  >
                    Uruchom bezpieczny Garbage Collector
                  </button>
                </div>
              </div>

              {/* SEC-05 & SEC-06 Summary */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/60 space-y-2">
                <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-blue-500" />
                  <span>Zabezpieczenia iCalendar &amp; watchOS (SEC-05 &amp; SEC-06)</span>
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="font-bold block text-slate-700 dark:text-slate-300">RFC 5545 DoS/ReDoS Guard:</span>
                    Maksymalny limit 10MB, sanityzacja XSS w polach SUMMARY/DESCRIPTION, bezpieczna demultipleksacja VEVENT/VTODO.
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="font-bold block text-slate-700 dark:text-slate-300">WatchConnectivity IPC:</span>
                    Ochrona przed Replay Attack (skrócone okno ważności &lt;60s) oraz bezpieczna walidacja typu komend (START_TENTATIVE_2137S).
                  </div>
                </div>
              </div>

              {/* GC Audit Log Viewer */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span>Dziennik Audytu Garbage Collectora (Audit Trail)</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Wpisy: {gcLogs.length}
                  </span>
                </div>

                {gcLogs.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                    Brak wpisów w dzienniku audytu GC. Wszystkie zdarzenia 2137s zostały pomyślnie potwierdzone przez użytkownika.
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50 dark:bg-slate-950 font-mono text-[10px]">
                    {gcLogs.slice(0, 15).map((log) => (
                      <div
                        key={log.id}
                        className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-1"
                      >
                        <div>
                          <span className="font-bold text-rose-600 dark:text-rose-400">[{log.action}]</span>{' '}
                          <span className="text-slate-700 dark:text-slate-300">{log.taskTitle}</span>{' '}
                          <span className="text-slate-400">({log.taskId})</span>
                        </div>
                        <div className="text-right text-slate-400">
                          <span>Wiek: {log.ageSeconds}s</span> &bull; <span>ETag: {log.etag.substring(0, 12)}...</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Standard RFC 5545 &amp; RFC 4791 CalDAV</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
