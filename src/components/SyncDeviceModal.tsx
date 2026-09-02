import React, { useState } from 'react';
import {
  X,
  Smartphone,
  Monitor,
  Download,
  Upload,
  Calendar,
  Copy,
  Check,
  Share2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Cloud,
  Globe,
} from 'lucide-react';
import { TaskItem, PatternTemplate } from '../types';
import { generateICalendarData, parseICalendarData } from '../utils/ical';
import { exportSyncPayload, importSyncPayload } from '../utils/storage';
import { downloadCalDavFile, parseAndMergeCalDavContent, loadCalDavAccounts } from '../utils/caldavService';

interface SyncDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: TaskItem[];
  customPatterns: PatternTemplate[];
  onImportTasks: (tasks: TaskItem[]) => void;
  onRestoreAllData: (payload: { tasks: TaskItem[]; customPatterns?: PatternTemplate[] }) => void;
}

export const SyncDeviceModal: React.FC<SyncDeviceModalProps> = ({
  isOpen,
  onClose,
  tasks,
  customPatterns,
  onImportTasks,
  onRestoreAllData,
}) => {
  const [activeTab, setActiveTab] = useState<'devices' | 'caldav' | 'ical' | 'cloud-sync'>('caldav');
  const [copiedSyncCode, setCopiedSyncCode] = useState(false);
  const [copiedCalDavUrl, setCopiedCalDavUrl] = useState(false);
  const [importCodeInput, setImportCodeInput] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Generate sync payload string
  const currentSyncPayload = exportSyncPayload();
  const accounts = loadCalDavAccounts();
  const primaryEmail = accounts[0]?.email || 'user@gmail.com';

  const handleCopySyncCode = () => {
    navigator.clipboard.writeText(currentSyncPayload);
    setCopiedSyncCode(true);
    setTimeout(() => setCopiedSyncCode(false), 2000);
  };

  const handleApplyImportSyncCode = () => {
    if (!importCodeInput.trim()) return;
    const success = importSyncPayload(importCodeInput.trim());
    if (success) {
      setImportStatus('Dane zostały pomyślnie zaimportowane i zsynchronizowane!');
      try {
        const parsed = JSON.parse(importCodeInput.trim());
        if (parsed.tasks) {
          onRestoreAllData(parsed);
        }
      } catch {
        // Handled by importSyncPayload
      }
      setTimeout(() => {
        setImportStatus(null);
        onClose();
      }, 1200);
    } else {
      setImportStatus('Nieprawidłowy format kodu synchronizacji. Sprawdź i spróbuj ponownie.');
    }
  };

  // iCalendar Download
  const handleExportICal = () => {
    const icsContent = generateICalendarData(tasks);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `taskii-calendar-${Date.now()}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // CalDAV Download
  const handleExportCalDav = () => {
    downloadCalDavFile(tasks, accounts[0], `taskii-schedule-${Date.now()}.caldav`, 'caldav');
    setImportStatus('Pomyślnie wygenerowano i pobrano plik .caldav!');
    setTimeout(() => setImportStatus(null), 3000);
  };

  // CalDAV / iCalendar File Upload
  const handleFileUploadCalDav = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const { updatedTasks, importedCount, updatedCount } = parseAndMergeCalDavContent(content, tasks);
        if (importedCount > 0 || updatedCount > 0) {
          onImportTasks(updatedTasks);
          setImportStatus(`Pomyślnie zaktualizowano z pliku CalDAV (${importedCount} nowych, ${updatedCount} zaktualizowanych)!`);
          setTimeout(() => setImportStatus(null), 3000);
        } else {
          setImportStatus('Plik nie zawierał nowych ani zmienionych wydarzeń.');
        }
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Synchronizacja, CalDAV &amp; Multi-Platforma
              </h2>
              <p className="text-xs text-slate-500">
                Konta @gmail.com &amp; @icloud.com, pliki .caldav / .ics oraz instalacja iOS &amp; Windows
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 p-2 sm:px-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('caldav')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
              activeTab === 'caldav'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Plik .caldav &amp; Chmura</span>
          </button>

          <button
            onClick={() => setActiveTab('ical')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
              activeTab === 'ical'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>iCalendar (.ics)</span>
          </button>

          <button
            onClick={() => setActiveTab('devices')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
              activeTab === 'devices'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Instalacja PWA</span>
          </button>

          <button
            onClick={() => setActiveTab('cloud-sync')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
              activeTab === 'cloud-sync'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Kopia Bezpośrednia JSON</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {importStatus && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>{importStatus}</span>
            </div>
          )}

          {/* CalDAV Tab */}
          {activeTab === 'caldav' && (
            <div className="space-y-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-850 dark:to-slate-900 border border-blue-200 dark:border-blue-900 space-y-3">
                <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold text-sm">
                  <Cloud className="w-5 h-5 text-blue-600" />
                  <span>Plik .caldav i synchronizacja z kontami Google (@gmail.com) &amp; Apple (@icloud.com)</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Uzyskaj i aktualizuj pełny plik <code>.caldav</code> (zgodny z protokołem RFC 4791 &amp; RFC 5545), demultipleksujący zdarzenia kalendarza (VEVENT) oraz zadania i przypomnienia (VTODO).
                </p>

                <div className="flex items-center gap-3 pt-2 flex-wrap">
                  <button
                    onClick={handleExportCalDav}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>Pobierz plik (.caldav)</span>
                  </button>

                  <label className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl cursor-pointer transition">
                    <Upload className="w-4 h-4 text-emerald-600" />
                    <span>Wgraj i zaktualizuj (.caldav / .ics)</span>
                    <input
                      type="file"
                      accept=".caldav,.ics,.ical"
                      onChange={handleFileUploadCalDav}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Feed URL */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-blue-600" />
                    <span>Adres subskrypcji WebDAV / CalDAV</span>
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`https://taskii.app/caldav/v1/feed/${encodeURIComponent(primaryEmail)}.caldav`);
                      setCopiedCalDavUrl(true);
                      setTimeout(() => setCopiedCalDavUrl(false), 2000);
                    }}
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {copiedCalDavUrl ? 'Skopiowano!' : 'Kopiuj link'}
                  </button>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border text-[11px] font-mono text-slate-600 dark:text-slate-300 break-all select-all">
                  https://taskii.app/caldav/v1/feed/{encodeURIComponent(primaryEmail)}.caldav
                </div>
              </div>
            </div>
          )}

          {/* Device Install Tab */}
          {activeTab === 'devices' && (
            <div className="space-y-6">
              {/* iOS Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2.5 mb-3 text-slate-900 dark:text-white font-bold text-sm">
                  <Smartphone className="w-5 h-5 text-blue-600" />
                  <span>iOS (iPhone &amp; iPad) Native PWA Integration</span>
                </div>
                <ol className="space-y-2 text-xs text-slate-600 dark:text-slate-300 list-decimal list-inside leading-relaxed">
                  <li>Otwórz Taskii w <strong>Safari</strong> na swoim iPhonie lub iPadzie.</li>
                  <li>Dotknij przycisku <strong>Udostępnij</strong> (kwadrat ze strzałką w górę na dolnym pasku).</li>
                  <li>Przewiń w dół i wybierz <strong>Do ekranu początkowego</strong>.</li>
                  <li>Dotknij <strong>Dodaj</strong> w prawym górnym rogu.</li>
                </ol>
              </div>

              {/* Windows Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2.5 mb-3 text-slate-900 dark:text-white font-bold text-sm">
                  <Monitor className="w-5 h-5 text-indigo-600" />
                  <span>Aplikacja Pulpitu Windows 11 / 10</span>
                </div>
                <ol className="space-y-2 text-xs text-slate-600 dark:text-slate-300 list-decimal list-inside leading-relaxed">
                  <li>W przeglądarce <strong>Microsoft Edge</strong> lub <strong>Google Chrome</strong> kliknij ikonę <strong>Zainstaluj Taskii</strong> na pasku adresu.</li>
                  <li>Kliknij <strong>Zainstaluj</strong>, aby dodać aplikację do Menu Start, paska zadań i pulpitu.</li>
                </ol>
              </div>
            </div>
          )}

          {/* Cloud / Device Data Transfer Tab */}
          {activeTab === 'cloud-sync' && (
            <div className="space-y-6">
              {/* Export Sync String */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Eksportuj stan urządzenia (JSON)
                  </span>
                  <button
                    onClick={handleCopySyncCode}
                    className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition"
                  >
                    {copiedSyncCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSyncCode ? 'Skopiowano!' : 'Kopiuj kod'}</span>
                  </button>
                </div>
                <textarea
                  readOnly
                  value={currentSyncPayload}
                  rows={3}
                  className="w-full p-2 text-[10px] font-mono bg-white dark:bg-slate-900 border rounded-lg text-slate-600 dark:text-slate-400 select-all"
                />
              </div>

              {/* Import Sync String */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Importuj / Scal z innego urządzenia
                </span>
                <textarea
                  placeholder="Wklej tutaj kod synchronizacji..."
                  value={importCodeInput}
                  onChange={(e) => setImportCodeInput(e.target.value)}
                  rows={3}
                  className="w-full p-2 text-xs font-mono bg-white dark:bg-slate-900 border rounded-lg text-slate-900 dark:text-white"
                />
                <button
                  onClick={handleApplyImportSyncCode}
                  disabled={!importCodeInput.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-xs transition"
                >
                  Scal i zsynchronizuj dane
                </button>
              </div>
            </div>
          )}

          {/* iCalendar Tab */}
          {activeTab === 'ical' && (
            <div className="space-y-6">
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold text-sm">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <span>Uniwersalny format iCalendar (.ics)</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Eksportuj wszystkie swoje bloki czasowe i przypomnienia do standardowego formatu <code>.ics</code>, aby zaimportować do programów <strong>Apple Calendar</strong>, <strong>Microsoft Outlook</strong> lub <strong>Google Calendar</strong>.
                </p>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleExportICal}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Pobierz plik .ics</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
