import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  AlertTriangle,
  Download,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { api, extractApiError } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import type { OllamaHealth } from '../types/wellness';

export function ProfilePage() {
  const { user, setUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || '');
  const [dailyCheckIn, setDailyCheckIn] = useState(
    user?.preferences?.notifications?.dailyCheckIn ?? true
  );
  const [weeklyReport, setWeeklyReport] = useState(
    user?.preferences?.notifications?.weeklyReport ?? true
  );
  const [exerciseReminder, setExerciseReminder] = useState(
    user?.preferences?.notifications?.exerciseReminder ?? false
  );

  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [ollamaHealth, setOllamaHealth] = useState<OllamaHealth | null>(null);
  const [checkingAi, setCheckingAi] = useState(false);

  const [confirmClearData, setConfirmClearData] = useState(false);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);

  const checkOllama = async () => {
    setCheckingAi(true);
    try {
      const res = await api.get('/ai/health');
      setOllamaHealth(res.data);
    } catch {
      setOllamaHealth(null);
    } finally {
      setCheckingAi(false);
    }
  };

  useEffect(() => {
    void checkOllama();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg('');
    setErrorMsg('');
    try {
      const res = await api.put('/users/profile', {
        name: name.trim(),
        preferences: {
          theme,
          notifications: {
            dailyCheckIn,
            weeklyReport,
            exerciseReminder,
          },
          wellnessFocus: user?.preferences?.wellnessFocus || ['Stress Management'],
        },
      });
      setUser(res.data.user);
      setStatusMsg('Profile and notification preferences saved.');
    } catch (err) {
      setErrorMsg(extractApiError(err, 'Failed to save profile settings.'));
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    setErrorMsg('');
    try {
      const res = await api.get('/users/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'mindcare-wellness-export.json');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setErrorMsg(extractApiError(err, 'Unable to download your wellness export right now.'));
    }
  };

  const handleClearPersonalData = async () => {
    try {
      await api.delete('/users/data');
      setConfirmClearData(false);
      setStatusMsg('All personal stress, mood, sleep, exercise, and AI chat records were cleared.');
    } catch (err) {
      setErrorMsg(extractApiError(err));
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await api.delete('/users/account');
      await logout();
      navigate('/');
    } catch (err) {
      setErrorMsg(extractApiError(err));
    }
  };

  return (
    <div className="max-w-3xl space-y-8">
      {/* Profile & Preferences Form */}
      <form
        onSubmit={handleSaveProfile}
        className="rounded-[24px] border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] shadow-[0_1px_2px_rgba(15,23,42,0.03)] p-6 sm:p-8 space-y-6"
      >
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#3F4A8A] dark:text-indigo-400 font-medium">
            Account Preferences
          </p>
          <h2 className="font-display text-2xl font-medium tracking-tight text-slate-900 dark:text-white mt-0.5">
            Profile & Notification Settings
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Signed in as {user?.email}
          </p>
        </div>

        {statusMsg && (
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-xs text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/40 px-4 py-3 text-xs text-rose-700 dark:text-rose-300">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              className="w-full rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-[#F9FAFD] dark:bg-[#0D1322] focus:bg-white dark:focus:bg-[#0A0F1C] px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3F4A8A]/25 dark:focus:ring-indigo-400/25 focus:border-[#3F4A8A] dark:focus:border-indigo-400 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Appearance Theme
            </label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}
              className="w-full rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-[#F9FAFD] dark:bg-[#0D1322] focus:bg-white dark:focus:bg-[#0A0F1C] px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3F4A8A]/25 dark:focus:ring-indigo-400/25 focus:border-[#3F4A8A] dark:focus:border-indigo-400 transition-all"
            >
              <option value="light">Light Theme</option>
              <option value="dark">Dark Theme</option>
            </select>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
          <p className="text-[11px] uppercase tracking-[0.12em] font-medium text-slate-500 dark:text-slate-400">
            Wellness Reminder Preferences
          </p>
          <label className="flex items-center justify-between gap-3 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
            <span>Daily mood & stress check-in reminder</span>
            <input
              type="checkbox"
              checked={dailyCheckIn}
              onChange={(e) => setDailyCheckIn(e.target.checked)}
              className="accent-[#3F4A8A] dark:accent-indigo-400"
            />
          </label>
          <label className="flex items-center justify-between gap-3 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
            <span>Weekly wellness summary digest</span>
            <input
              type="checkbox"
              checked={weeklyReport}
              onChange={(e) => setWeeklyReport(e.target.checked)}
              className="accent-[#3F4A8A] dark:accent-indigo-400"
            />
          </label>
          <label className="flex items-center justify-between gap-3 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
            <span>Midday posture & breathing break cue</span>
            <input
              type="checkbox"
              checked={exerciseReminder}
              onChange={(e) => setExerciseReminder(e.target.checked)}
              className="accent-[#3F4A8A] dark:accent-indigo-400"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-full bg-[#3F4A8A] hover:bg-[#333D75] dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white text-xs font-medium shadow-xs transition-colors"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </form>

      {/* Local Ollama Connection Diagnostics */}
      <div className="rounded-[24px] border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] shadow-[0_1px_2px_rgba(15,23,42,0.03)] p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
              AI Runtime
            </p>
            <h3 className="font-display text-lg font-medium text-slate-900 dark:text-white mt-0.5">
              Ollama AI Connection
            </h3>
          </div>
          <button
            type="button"
            onClick={() => void checkOllama()}
            disabled={checkingAi}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200/90 dark:border-slate-700/80 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingAi ? 'animate-spin' : ''}`} />
            Check Status
          </button>
        </div>

        {ollamaHealth ? (
          <div className="rounded-2xl bg-[#F6F7FB] dark:bg-slate-800/45 p-4 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-100">
              {ollamaHealth.available ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span>
                {ollamaHealth.available
                  ? `Connected to ${ollamaHealth.baseUrl} (Model: ${ollamaHealth.model})`
                  : `Offline at ${ollamaHealth.baseUrl} — Deterministic fallback active`}
              </span>
            </div>
            {ollamaHealth.error && (
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed pl-6">
                {ollamaHealth.error}
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-500">Checking Ollama service...</p>
        )}
      </div>

      {/* Privacy, Data Export & Account Deletion */}
      <div className="rounded-[24px] border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] shadow-[0_1px_2px_rgba(15,23,42,0.03)] p-6 sm:p-8 space-y-5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            Privacy & Portability
          </p>
          <h3 className="font-display text-lg font-medium text-slate-900 dark:text-white mt-0.5">
            Data Ownership & Account Controls
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Download a complete copy of your records or permanently remove personal data.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleExport()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-slate-200/90 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download My Data (JSON)
          </button>

          <button
            type="button"
            onClick={() => setConfirmClearData((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-amber-300/80 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-xs font-medium transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Personal Records
          </button>

          <button
            type="button"
            onClick={() => setConfirmDeleteAccount((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-rose-300/80 dark:border-rose-900 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-medium transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Account
          </button>
        </div>

        {confirmClearData && (
          <div className="rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 p-4 text-xs space-y-3">
            <p className="font-medium text-amber-900 dark:text-amber-200 leading-relaxed">
              Confirm clearing all personal stress, mood, exercise, sleep, and AI chat history? Your
              login account remains active.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void handleClearPersonalData()}
                className="px-4 py-2 rounded-full bg-amber-600 hover:bg-amber-700 text-white font-medium transition-colors"
              >
                Yes, Clear Personal Data
              </button>
              <button
                type="button"
                onClick={() => setConfirmClearData(false)}
                className="px-4 py-2 rounded-full text-slate-600 dark:text-slate-300 hover:text-slate-900"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {confirmDeleteAccount && (
          <div className="rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 p-4 text-xs space-y-3">
            <p className="font-medium text-rose-900 dark:text-rose-200 leading-relaxed">
              Permanently delete your MindCare AI account and all stored records? This cannot be
              undone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void handleDeleteAccount()}
                className="px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-medium transition-colors"
              >
                Yes, Permanently Delete Account
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteAccount(false)}
                className="px-4 py-2 rounded-full text-slate-600 dark:text-slate-300 hover:text-slate-900"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
