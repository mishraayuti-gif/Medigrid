import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  Check,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Info,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { api, extractApiError } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useJourney } from '../contexts/JourneyContext';
import type { DashboardSummary, WellnessGoal } from '../types/wellness';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardPage() {
  const { user } = useAuth();
  const {
    steps,
    completedCount,
    progressPercent,
    allCompleted,
    nextStep,
    isStepCompleted,
    resetTodayJourney,
  } = useJourney();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [updatingGoalId, setUpdatingGoalId] = useState<string | null>(null);

  const loadSummary = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/dashboard/summary');
      setSummary(res.data);
    } catch (err) {
      setError(extractApiError(err, 'Unable to load your daily wellness plan.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSummary();
  }, []);

  const handleGoalCheckIn = async (goal: WellnessGoal) => {
    setUpdatingGoalId(goal.id);
    const nextVal = Math.min(goal.targetValue, goal.currentValue + 1);
    const today = new Date().toISOString().slice(0, 10);
    const nextDates = goal.completedDates.includes(today)
      ? goal.completedDates
      : [...goal.completedDates, today];
    try {
      await api.put(`/wellness/goals/${goal.id}`, {
        currentValue: nextVal,
        completedDates: nextDates,
      });
      setSummary((prev) =>
        prev
          ? {
              ...prev,
              goals: prev.goals.map((g) =>
                g.id === goal.id
                  ? { ...g, currentValue: nextVal, completedDates: nextDates }
                  : g
              ),
            }
          : prev
      );
    } catch {
      // keep existing state on error
    } finally {
      setUpdatingGoalId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-28 bg-white dark:bg-[#111827] rounded-[24px] border border-slate-200/80 dark:border-slate-800/80 animate-pulse" />
        <div className="h-96 bg-white dark:bg-[#111827] rounded-[24px] border border-slate-200/80 dark:border-slate-800/80 animate-pulse" />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="rounded-[24px] border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-6">
        <p className="text-sm font-medium text-rose-700 dark:text-rose-300">{error}</p>
        <button
          type="button"
          onClick={loadSummary}
          className="mt-3 px-4 py-2 rounded-full bg-rose-600 text-white text-xs font-medium hover:bg-rose-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-7">
      {/* Simple Sequential Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <div>
          <p className="text-xs font-medium text-[#3F4A8A] dark:text-indigo-300 mb-1.5">
            {todayFormatted}
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-medium tracking-tight text-slate-900 dark:text-white">
            {getGreeting()},{' '}
            <em className="italic font-normal text-[#3F4A8A] dark:text-indigo-300">
              {user?.name?.split(' ')[0]}
            </em>
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5">
            Follow these 6 simple steps in order—or jump directly to whichever one you need right now.
          </p>
        </div>

        <Link
          to={nextStep.path}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#3F4A8A] hover:bg-[#333D75] dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0"
        >
          {allCompleted ? (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Revisit Step 1: Stress Check-In</span>
            </>
          ) : (
            <>
              <span>
                {completedCount === 0
                  ? 'Start Step 1: Stress Check-In'
                  : `Continue Step ${nextStep.stepNumber}: ${nextStep.shortLabel}`}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </Link>
      </div>

      {/* Explicit Demo Notice */}
      {summary.hasDemoRecords && (
        <div className="flex items-start gap-3 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#111827]/80 px-5 py-3.5 text-xs text-slate-600 dark:text-slate-300">
          <Info className="w-4 h-4 text-[#3F4A8A] dark:text-indigo-300 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-900 dark:text-white">
              Demo Account Active:
            </span>{' '}
            Sample wellness entries are pre-loaded so you can explore right away. Anything new you
            log is saved directly to your history.
          </div>
        </div>
      )}

      {/* Primary Sequential 6-Step Guided Form Plan */}
      <section className="rounded-[24px] border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] overflow-hidden">
        <div className="px-6 py-5 sm:px-7 sm:py-6 border-b border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-display text-xl font-medium text-slate-900 dark:text-white">
              Your 6-Step Daily Reset
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {allCompleted
                ? 'All 6 steps completed today. Wonderful consistency.'
                : `${completedCount} of ${steps.length} steps completed today (${progressPercent}%)`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-28 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#3F4A8A] dark:bg-indigo-400 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {completedCount > 0 && (
              <button
                type="button"
                onClick={resetTodayJourney}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                title="Reset today’s checklist"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>
        </div>

        <ol className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {steps.map((step) => {
            const done = isStepCompleted(step.id);
            const isNext = !allCompleted && nextStep.id === step.id;
            return (
              <li
                key={step.id}
                className={`px-6 py-4 sm:px-7 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                  isNext
                    ? 'bg-[#F8F9FD] dark:bg-indigo-500/[0.06]'
                    : 'hover:bg-[#FAFBFD] dark:hover:bg-slate-800/30'
                }`}
              >
                <div className="flex items-start sm:items-center gap-4 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-mono tabular-nums font-semibold shrink-0 ${
                      done
                        ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                        : isNext
                        ? 'bg-[#3F4A8A] text-white dark:bg-indigo-500'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {done ? <Check className="w-4 h-4" /> : step.stepNumber}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-base font-medium text-slate-900 dark:text-white">
                        Step {step.stepNumber}: {step.title}
                      </p>
                      <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">
                        · {step.estimatedTime}
                      </span>
                      {done && (
                        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                          · Done
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {step.subtitle}
                    </p>
                  </div>
                </div>

                <Link
                  to={step.path}
                  className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    isNext
                      ? 'bg-[#3F4A8A] hover:bg-[#333D75] dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white'
                      : 'border border-slate-200/90 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{done ? 'Review' : isNext ? 'Start Step' : 'Open'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Compact Today at a Glance Strip */}
      <div className="rounded-[24px] border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/75 dark:divide-slate-800/75">
        <div className="p-5 sm:p-6">
          <p className="text-xs text-slate-500 dark:text-slate-400">Latest Stress</p>
          {summary.latestStress ? (
            <>
              <p className="mt-2 font-mono tabular-nums text-2xl sm:text-3xl font-medium text-slate-900 dark:text-white">
                {summary.latestStress.deterministicScore}
                <span className="text-xs font-normal text-slate-400"> / 100</span>
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {summary.latestStress.category}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Not checked yet</p>
          )}
        </div>

        <div className="p-5 sm:p-6">
          <p className="text-xs text-slate-500 dark:text-slate-400">Latest Mood</p>
          {summary.latestMood ? (
            <>
              <p className="mt-2 font-display text-2xl sm:text-3xl font-medium text-slate-900 dark:text-white">
                {summary.latestMood.mood}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                Intensity {summary.latestMood.intensity}/10
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Not logged yet</p>
          )}
        </div>

        <div className="p-5 sm:p-6">
          <p className="text-xs text-slate-500 dark:text-slate-400">Guided Practice</p>
          <p className="mt-2 font-mono tabular-nums text-2xl sm:text-3xl font-medium text-slate-900 dark:text-white">
            {summary.exerciseStats.totalMinutes}
            <span className="text-xs font-normal text-slate-400"> min</span>
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {summary.exerciseStats.completedCount} session(s)
          </p>
        </div>

        <div className="p-5 sm:p-6">
          <p className="text-xs text-slate-500 dark:text-slate-400">Last Sleep</p>
          {summary.latestSleep ? (
            <>
              <p className="mt-2 font-mono tabular-nums text-2xl sm:text-3xl font-medium text-slate-900 dark:text-white">
                {summary.latestSleep.durationHours}
                <span className="text-xs font-normal text-slate-400"> hrs</span>
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                Quality {summary.latestSleep.qualityScore}/5
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No sleep log</p>
          )}
        </div>
      </div>

      {/* Collapsible Trends & Goals Drawer to Keep Home Screen Calm */}
      <div className="rounded-[24px] border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] overflow-hidden">
        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          className="w-full px-6 py-4 sm:px-7 flex items-center justify-between text-left hover:bg-[#FAFBFD] dark:hover:bg-slate-800/30 transition-colors"
        >
          <div>
            <p className="font-display text-base font-medium text-slate-900 dark:text-white">
              Weekly Stress Trend & Goals
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Optional deeper view of your recent trend chart and active wellness goals.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#3F4A8A] dark:text-indigo-300 shrink-0">
            {showDetails ? 'Hide' : 'Show'}
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>

        {showDetails && (
          <div className="px-6 pb-6 sm:px-7 sm:pb-7 pt-2 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 lg:grid-cols-12 gap-7">
            <div className="lg:col-span-7 space-y-3">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Recent Stress Score Trend (0–100)
              </p>
              {summary.weeklyStressTrend.length > 0 ? (
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={summary.weeklyStressTrend}>
                      <defs>
                        <linearGradient id="sanctuaryStressGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3F4A8A" stopOpacity={0.22} />
                          <stop offset="95%" stopColor="#3F4A8A" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" opacity={0.35} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: '#64748B' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 11, fill: '#64748B' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '14px',
                          border: '1px solid #E2E8F0',
                          fontSize: '12px',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="score"
                        stroke="#3F4A8A"
                        strokeWidth={2.25}
                        fill="url(#sanctuaryStressGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-8">
                  Complete Step 1 (Stress Check-In) to visualize your trend here.
                </p>
              )}
            </div>

            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Active Goals
                </p>
                <Link
                  to="/app/analytics"
                  className="text-xs font-medium text-[#3F4A8A] dark:text-indigo-300 hover:underline"
                >
                  Manage in Step 6
                </Link>
              </div>
              {summary.goals.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {summary.goals.slice(0, 4).map((goal) => {
                    const pct = Math.min(
                      100,
                      Math.round((goal.currentValue / goal.targetValue) * 100)
                    );
                    const done = goal.currentValue >= goal.targetValue;
                    return (
                      <div key={goal.id} className="py-3 first:pt-0 last:pb-0 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                              {goal.title}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                              {goal.currentValue} / {goal.targetValue} {goal.unit}
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={done || updatingGoalId === goal.id}
                            onClick={() => handleGoalCheckIn(goal)}
                            className={`px-3 py-1 rounded-full text-[11px] font-medium shrink-0 transition-colors ${
                              done
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                                : 'bg-[#EEF0F8] hover:bg-[#3F4A8A] text-[#333D75] hover:text-white dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-indigo-500'
                            }`}
                          >
                            {done ? 'Complete' : '+1 Log'}
                          </button>
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
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-4">
                  No active wellness goals yet. You can add one in Step 6.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
