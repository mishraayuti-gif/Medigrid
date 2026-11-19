import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  Plus,
  Trash2,
  Download,
  CheckCircle2,
  Moon,
  Target,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { api, extractApiError } from '../services/api';
import { useJourney } from '../contexts/JourneyContext';
import { SequentialStepFooter } from '../components/SequentialStepFooter';
import type { SleepEntry, WellnessGoal } from '../types/wellness';

interface WellnessReport {
  period: string;
  summary: {
    assessmentsCount: number;
    avgStress: number | null;
    emotionsCount: number;
    moodDistribution: { mood: string; count: number }[];
    exerciseSessionsCount: number;
    totalExerciseMinutes: number;
    sleepEntriesCount: number;
    avgSleepHours: number | null;
    avgSleepQuality: number | null;
    activeGoalsCount: number;
    goalsMetCount: number;
  };
}

const DAILY_CHALLENGES = [
  'Complete 4 minutes of slow-exhale breathing before lunch.',
  'Take a screen-free 15-minute walk or stretch.',
  'Log one honest mood check-in with a reflection sentence.',
  'Turn off bright screens 45 minutes prior to bedtime.',
];

export function AnalyticsSleepPage() {
  const { markStepCompleted } = useJourney();
  const [sleepEntries, setSleepEntries] = useState<SleepEntry[]>([]);
  const [goals, setGoals] = useState<WellnessGoal[]>([]);
  const [report, setReport] = useState<WellnessReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savedNotice, setSavedNotice] = useState('');
  const [showMoreAnalytics, setShowMoreAnalytics] = useState(false);

  const [sleepDate, setSleepDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [bedtime, setBedtime] = useState('23:00');
  const [wakeTime, setWakeTime] = useState('06:30');
  const [durationHours, setDurationHours] = useState(7.5);
  const [qualityScore, setQualityScore] = useState(4);
  const [awakenings, setAwakenings] = useState(0);
  const [sleepNotes, setSleepNotes] = useState('');
  const [savingSleep, setSavingSleep] = useState(false);

  const [goalTitle, setGoalTitle] = useState('');
  const [goalCategory, setGoalCategory] = useState<WellnessGoal['category']>('Mindfulness');
  const [goalTarget, setGoalTarget] = useState(5);
  const [goalUnit] = useState('sessions');
  const [goalFrequency] = useState<'daily' | 'weekly'>('weekly');
  const [savingGoal, setSavingGoal] = useState(false);

  const [checkedChallenges, setCheckedChallenges] = useState<string[]>([]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [sleepRes, goalRes, reportRes] = await Promise.all([
        api.get('/sleep/history'),
        api.get('/wellness/goals'),
        api.get('/wellness/report'),
      ]);
      setSleepEntries(sleepRes.data.history || []);
      setGoals(goalRes.data.goals || []);
      setReport(reportRes.data || null);
    } catch (err) {
      setError(extractApiError(err, 'Unable to load sleep and summary data.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const handleAddSleep = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSleep(true);
    setError('');
    setSavedNotice('');
    try {
      await api.post('/sleep', {
        date: sleepDate,
        bedtime,
        wakeTime,
        durationHours: Number(durationHours),
        qualityScore: Number(qualityScore),
        awakenings: Number(awakenings),
        notes: sleepNotes,
      });
      setSleepNotes('');
      markStepCompleted('analytics');
      setSavedNotice('Sleep entry saved! Step 6 is complete.');
      await loadAll();
    } catch (err) {
      setError(extractApiError(err, 'Failed to log sleep entry.'));
    } finally {
      setSavingSleep(false);
    }
  };

  const handleDeleteSleep = async (id: string) => {
    try {
      await api.delete(`/sleep/${id}`);
      await loadAll();
    } catch {
      // ignore
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim()) return;
    setSavingGoal(true);
    try {
      await api.post('/wellness/goals', {
        title: goalTitle.trim(),
        category: goalCategory,
        targetValue: Number(goalTarget),
        unit: goalUnit.trim() || 'sessions',
        frequency: goalFrequency,
      });
      setGoalTitle('');
      markStepCompleted('analytics');
      await loadAll();
    } catch (err) {
      setError(extractApiError(err, 'Failed to create goal.'));
    } finally {
      setSavingGoal(false);
    }
  };

  const handleIncrementGoal = async (goal: WellnessGoal) => {
    try {
      const next = Math.min(goal.targetValue, goal.currentValue + 1);
      await api.put(`/wellness/goals/${goal.id}`, { currentValue: next });
      markStepCompleted('analytics');
      await loadAll();
    } catch (err) {
      setError(extractApiError(err, 'Could not update goal progress.'));
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      await api.delete(`/wellness/goals/${id}`);
      await loadAll();
    } catch (err) {
      setError(extractApiError(err, 'Could not remove goal.'));
    }
  };

  const handleExportJson = async () => {
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
    } catch {
      setError('Unable to download export right now.');
    }
  };

  const sleepChartData = [...sleepEntries]
    .reverse()
    .map((s) => ({
      date: s.date,
      hours: s.durationHours,
      quality: s.qualityScore,
    }));

  const inputClass =
    'w-full rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-[#F9FAFD] dark:bg-[#0D1322] focus:bg-white dark:focus:bg-[#0A0F1C] px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3F4A8A]/25 dark:focus:ring-indigo-400/25 focus:border-[#3F4A8A] dark:focus:border-indigo-400 transition-all';

  return (
    <div className="space-y-6">
      {/* Step 6 Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#3F4A8A] dark:text-indigo-300">
            Step 6 of 6 · Sleep & Daily Wrap-Up
          </p>
          <h2 className="font-display text-2xl font-medium tracking-tight text-slate-900 dark:text-white mt-0.5">
            Log your rest and close today’s loop
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Record how you slept and check off any daily habits before finishing.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportJson}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-[#111827] hover:bg-slate-50 dark:hover:bg-slate-800/60 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export Data (JSON)
        </button>
      </div>

      {error && (
        <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900 p-3.5 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {savedNotice && (
        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 p-3.5 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{savedNotice}</span>
        </div>
      )}

      {/* Main Focused Wrap-Up Grid: Quick Sleep Log + Today's Micro-Habits */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form
          onSubmit={handleAddSleep}
          className="lg:col-span-7 rounded-[24px] border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] shadow-[0_1px_2px_rgba(15,23,42,0.03)] p-6 sm:p-7 space-y-5"
        >
          <div className="flex items-center gap-2">
            <Moon className="w-4 h-4 text-[#3F4A8A] dark:text-indigo-400" />
            <h3 className="font-display text-lg font-medium text-slate-900 dark:text-white">
              Quick Sleep Log
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Date</label>
              <input
                type="date"
                value={sleepDate}
                onChange={(e) => setSleepDate(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                Duration (hrs)
              </label>
              <input
                type="number"
                step="0.25"
                min="0"
                max="24"
                value={durationHours}
                onChange={(e) => setDurationHours(Number(e.target.value))}
                required
                className={`${inputClass} font-mono tabular-nums`}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                Quality (1–5)
              </label>
              <select
                value={qualityScore}
                onChange={(e) => setQualityScore(Number(e.target.value))}
                className={inputClass}
              >
                <option value={5}>5 · Deep & Restorative</option>
                <option value={4}>4 · Good</option>
                <option value={3}>3 · Moderate</option>
                <option value={2}>2 · Restless</option>
                <option value={1}>1 · Poor</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                Bedtime
              </label>
              <input
                type="time"
                value={bedtime}
                onChange={(e) => setBedtime(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                Wake Time
              </label>
              <input
                type="time"
                value={wakeTime}
                onChange={(e) => setWakeTime(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                Awakenings
              </label>
              <input
                type="number"
                min="0"
                max="20"
                value={awakenings}
                onChange={(e) => setAwakenings(Number(e.target.value))}
                className={`${inputClass} font-mono tabular-nums`}
              />
            </div>
          </div>

          <input
            type="text"
            value={sleepNotes}
            onChange={(e) => setSleepNotes(e.target.value)}
            placeholder="Optional note (e.g., rain soundscape helped me fall asleep)"
            className={inputClass}
          />

          <button
            type="submit"
            disabled={savingSleep}
            className="px-6 py-2.5 rounded-full bg-[#3F4A8A] hover:bg-[#333D75] dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white text-xs font-medium shadow-xs transition-colors"
          >
            {savingSleep ? 'Saving...' : 'Save Sleep Entry'}
          </button>
        </form>

        {/* Daily Micro-Habits Checklist */}
        <div className="lg:col-span-5 rounded-[24px] border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] shadow-[0_1px_2px_rgba(15,23,42,0.03)] p-6 sm:p-7 space-y-4">
          <div>
            <h3 className="font-display text-lg font-medium text-slate-900 dark:text-white">
              Gentle Daily Habits
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tap any small habit you practiced today.
            </p>
          </div>
          <div className="space-y-2.5">
            {DAILY_CHALLENGES.map((ch) => {
              const checked = checkedChallenges.includes(ch);
              return (
                <button
                  key={ch}
                  type="button"
                  onClick={() =>
                    setCheckedChallenges((prev) =>
                      checked ? prev.filter((x) => x !== ch) : [...prev, ch]
                    )
                  }
                  className={`w-full text-left flex items-start gap-3 p-3.5 rounded-2xl border text-xs transition-all leading-relaxed ${
                    checked
                      ? 'border-emerald-300/80 bg-emerald-50/70 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200'
                      : 'border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-[#F9FAFD] dark:hover:bg-slate-800/40'
                  }`}
                >
                  <CheckCircle2
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      checked ? 'text-emerald-600' : 'text-slate-300 dark:text-slate-600'
                    }`}
                  />
                  <span className={checked ? 'line-through opacity-80' : ''}>{ch}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 30-Day Summary Strip */}
      {!loading && report && (
        <div className="rounded-[24px] border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800/80">
          <div className="p-5 sm:p-6">
            <p className="text-xs text-slate-500 dark:text-slate-400">Average Stress</p>
            <p className="font-mono tabular-nums text-2xl font-semibold text-slate-900 dark:text-white mt-1.5">
              {report.summary.avgStress !== null ? `${report.summary.avgStress}/100` : '—'}
            </p>
          </div>
          <div className="p-5 sm:p-6">
            <p className="text-xs text-slate-500 dark:text-slate-400">Avg Sleep</p>
            <p className="font-mono tabular-nums text-2xl font-semibold text-slate-900 dark:text-white mt-1.5">
              {report.summary.avgSleepHours !== null ? `${report.summary.avgSleepHours} hrs` : '—'}
            </p>
          </div>
          <div className="p-5 sm:p-6">
            <p className="text-xs text-slate-500 dark:text-slate-400">Practice Minutes</p>
            <p className="font-mono tabular-nums text-2xl font-semibold text-slate-900 dark:text-white mt-1.5">
              {report.summary.totalExerciseMinutes} min
            </p>
          </div>
          <div className="p-5 sm:p-6">
            <p className="text-xs text-slate-500 dark:text-slate-400">Goals Met</p>
            <p className="font-mono tabular-nums text-2xl font-semibold text-slate-900 dark:text-white mt-1.5">
              {report.summary.goalsMetCount} / {report.summary.activeGoalsCount}
            </p>
          </div>
        </div>
      )}

      {/* Collapsible Sleep Trend, History & Goals Manager */}
      <div className="rounded-[24px] border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] overflow-hidden">
        <button
          type="button"
          onClick={() => setShowMoreAnalytics((v) => !v)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-[#FAFBFD] dark:hover:bg-slate-800/30 transition-colors"
        >
          <span className="font-display text-base font-medium text-slate-900 dark:text-white">
            Sleep History Chart & Wellness Goals{' '}
            <span className="font-mono text-xs text-slate-400 tabular-nums">
              ({goals.length} goals · {sleepEntries.length} sleep logs)
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#3F4A8A] dark:text-indigo-300">
            {showMoreAnalytics ? 'Hide' : 'Manage'}
            {showMoreAnalytics ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </span>
        </button>

        {showMoreAnalytics && (
          <div className="px-6 pb-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 space-y-4">
                <h4 className="font-display text-base font-medium text-slate-900 dark:text-white">
                  Sleep Duration Trend
                </h4>
                {sleepChartData.length > 0 ? (
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sleepChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" opacity={0.4} vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 12]} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Line type="monotone" dataKey="hours" stroke="#3F4A8A" strokeWidth={2.25} dot={{ r: 3, fill: '#3F4A8A' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-6">No sleep trend yet.</p>
                )}

                <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-44 overflow-y-auto">
                  {sleepEntries.map((entry) => (
                    <div key={entry.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                          {entry.date} · {entry.durationHours}h ({entry.bedtime}–{entry.wakeTime})
                        </p>
                        <p className="text-slate-500 dark:text-slate-400">
                          Quality {entry.qualityScore}/5
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleDeleteSleep(entry.id)}
                        className="p-1.5 rounded-full text-slate-400 hover:text-rose-600 transition-colors"
                        aria-label="Delete sleep entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-[#3F4A8A] dark:text-indigo-400" />
                  <h4 className="font-display text-base font-medium text-slate-900 dark:text-white">
                    Wellness Goals
                  </h4>
                </div>

                <form onSubmit={handleCreateGoal} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <input
                    type="text"
                    value={goalTitle}
                    onChange={(e) => setGoalTitle(e.target.value)}
                    placeholder="New goal (e.g., 5 breath resets)"
                    required
                    className={`sm:col-span-6 ${inputClass}`}
                  />
                  <select
                    value={goalCategory}
                    onChange={(e) => setGoalCategory(e.target.value as WellnessGoal['category'])}
                    className={`sm:col-span-3 ${inputClass}`}
                  >
                    <option value="Mindfulness">Mindfulness</option>
                    <option value="Sleep">Sleep</option>
                    <option value="Movement">Movement</option>
                    <option value="Journaling">Journaling</option>
                    <option value="Stress Relief">Stress Relief</option>
                  </select>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={goalTarget}
                    onChange={(e) => setGoalTarget(Number(e.target.value))}
                    className={`sm:col-span-1 ${inputClass} font-mono tabular-nums px-2`}
                  />
                  <button
                    type="submit"
                    disabled={savingGoal}
                    className="sm:col-span-2 inline-flex items-center justify-center gap-1 rounded-full bg-[#3F4A8A] hover:bg-[#333D75] dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white text-xs font-medium py-2 px-3 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </form>

                <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {goals.map((g) => {
                    const pct = Math.min(100, Math.round((g.currentValue / g.targetValue) * 100));
                    return (
                      <div key={g.id} className="py-3 first:pt-1 last:pb-0 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-medium text-slate-900 dark:text-white">
                              {g.title}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                              {g.currentValue} / {g.targetValue} {g.unit}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => void handleIncrementGoal(g)}
                              disabled={g.currentValue >= g.targetValue}
                              className="px-3 py-1 rounded-full bg-[#EEF0F8] text-[#3F4A8A] dark:bg-indigo-500/15 dark:text-indigo-200 text-[11px] font-medium disabled:opacity-45"
                            >
                              +1
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteGoal(g.id)}
                              className="p-1 text-slate-400 hover:text-rose-600"
                              aria-label="Delete goal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-[#3F4A8A] dark:bg-indigo-400 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <SequentialStepFooter stepId="analytics" />
    </div>
  );
}
