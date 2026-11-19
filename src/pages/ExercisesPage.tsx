import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Play,
  Pause,
  CheckCircle2,
  Volume2,
  VolumeX,
  RotateCcw,
  Camera,
  Clock,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from 'lucide-react';
import { api, extractApiError } from '../services/api';
import { useJourney } from '../contexts/JourneyContext';
import { SequentialStepFooter } from '../components/SequentialStepFooter';
import type { ExerciseItem, ExerciseSession } from '../types/wellness';
import { SafeImage } from '../components/SafeImage';
import { LivePostureMonitor } from '../components/LivePostureMonitor';

const CATEGORIES = [
  'All',
  'Breathing',
  'Meditation',
  'Yoga',
  'Stretching',
  'Neck & Shoulder',
  'Body Relaxation',
];

function formatTimer(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function ExercisesPage() {
  const { markStepCompleted } = useJourney();
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [history, setHistory] = useState<ExerciseSession[]>([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  const [activeExercise, setActiveExercise] = useState<ExerciseItem | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [completionSummary, setCompletionSummary] = useState<ExerciseSession | null>(null);
  const [saveError, setSaveError] = useState('');

  const postureMetricsRef = useRef<{
    postureUsed: boolean;
    averageScore: number | null;
    latestFeedback: string;
  }>({
    postureUsed: false,
    averageScore: null,
    latestFeedback: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [exRes, histRes] = await Promise.all([
        api.get('/exercises'),
        api.get('/exercises/history'),
      ]);
      setExercises(exRes.data.exercises || []);
      setHistory(histRes.data.history || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (!activeExercise || !isRunning) return;
    const timer = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          void finishSession(activeExercise, activeExercise.durationSeconds);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activeExercise, isRunning]);

  const elapsedSeconds = activeExercise ? activeExercise.durationSeconds - remainingSeconds : 0;
  let currentStepIdx = 0;
  if (activeExercise) {
    let acc = 0;
    for (let i = 0; i < activeExercise.steps.length; i++) {
      acc += activeExercise.steps[i].durationSeconds;
      if (elapsedSeconds < acc) {
        currentStepIdx = i;
        break;
      }
      currentStepIdx = activeExercise.steps.length - 1;
    }
  }
  const currentStep = activeExercise?.steps[currentStepIdx] || null;

  useEffect(() => {
    if (!voiceEnabled || !isRunning || !currentStep) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(
        `${currentStep.title}. ${currentStep.instruction}`
      );
      utterance.rate = 0.92;
      window.speechSynthesis.speak(utterance);
    }
  }, [currentStepIdx, voiceEnabled, isRunning]);

  const startExercise = (ex: ExerciseItem) => {
    setCompletionSummary(null);
    setSaveError('');
    postureMetricsRef.current = { postureUsed: false, averageScore: null, latestFeedback: '' };
    setActiveExercise(ex);
    setRemainingSeconds(ex.durationSeconds);
    setIsRunning(true);
  };

  const finishSession = async (ex: ExerciseItem, completedSec?: number) => {
    setIsRunning(false);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    const secondsDone = completedSec ?? Math.max(10, ex.durationSeconds - remainingSeconds);
    try {
      const res = await api.post('/exercises/session', {
        exerciseId: ex.id,
        durationSeconds: ex.durationSeconds,
        completedSeconds: secondsDone,
        postureUsed: postureMetricsRef.current.postureUsed,
        postureScore: postureMetricsRef.current.averageScore,
        postureFeedbackSummary: postureMetricsRef.current.latestFeedback,
        completed: true,
      });
      setCompletionSummary(res.data.session);
      markStepCompleted('exercises');
      setActiveExercise(null);
      await loadData();
    } catch (err) {
      setSaveError(extractApiError(err, 'Could not save session.'));
    }
  };

  const getBreathingPhase = (ex: ExerciseItem) => {
    if (!ex.breathingPattern) return null;
    const { inhale, holdTop, exhale, holdBottom } = ex.breathingPattern;
    const cycle = inhale + holdTop + exhale + holdBottom;
    const t = elapsedSeconds % cycle;
    if (t < inhale) return { label: 'Inhale slowly', scale: 1.24 };
    if (t < inhale + holdTop) return { label: 'Hold gently', scale: 1.24 };
    if (t < inhale + holdTop + exhale) return { label: 'Exhale smoothly', scale: 0.88 };
    return { label: 'Rest empty', scale: 0.88 };
  };

  const filtered =
    filter === 'All' ? exercises : exercises.filter((e) => e.category === filter);

  return (
    <div className="space-y-6">
      {/* Completion Summary */}
      {completionSummary && (
        <div className="rounded-[24px] border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/30 p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-display text-base font-medium text-slate-900 dark:text-white">
                Step 3 Complete: {completionSummary.exerciseName}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 tabular-nums">
                Logged {Math.max(1, Math.round(completionSummary.completedSeconds / 60))} min (
                {completionSummary.completedSeconds}s)
                {completionSummary.postureUsed && completionSummary.postureScore !== null
                  ? ` · Average Posture Alignment: ${completionSummary.postureScore}%`
                  : ''}
              </p>
            </div>
          </div>
          <Link
            to="/app/music"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium transition-colors"
          >
            Continue to Step 4: Sound
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Active Guided Session Workspace */}
      {activeExercise && (
        <div className="rounded-[24px] border border-[#3F4A8A]/25 dark:border-indigo-500/30 bg-white dark:bg-[#111827] shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-6 sm:p-8 space-y-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-[#3F4A8A] dark:text-indigo-300">
                Active Guided Session · {activeExercise.category}
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-medium tracking-tight text-slate-900 dark:text-white mt-1">
                {activeExercise.name}
              </h2>
            </div>

            <div className="flex items-center gap-3.5">
              <button
                type="button"
                onClick={() => setVoiceEnabled((v) => !v)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200/90 dark:border-slate-700/80 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
              >
                {voiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                {voiceEnabled ? 'Audio Cues On' : 'Audio Cues Off'}
              </button>
              <span className="font-mono tabular-nums text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white">
                {formatTimer(remainingSeconds)}
              </span>
            </div>
          </div>

          {saveError && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 p-3.5 text-xs text-rose-700 dark:text-rose-300">
              {saveError}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-5 flex flex-col items-center justify-center rounded-2xl bg-[#F6F7FB] dark:bg-slate-800/45 p-6 min-h-[240px]">
              {activeExercise.breathingPattern ? (
                (() => {
                  const phase = getBreathingPhase(activeExercise);
                  return (
                    <div className="flex flex-col items-center gap-6">
                      <div
                        className="w-36 h-36 rounded-full bg-[#3F4A8A]/10 dark:bg-indigo-400/15 border border-[#3F4A8A]/45 dark:border-indigo-400/50 flex items-center justify-center transition-transform duration-1000 ease-in-out"
                        style={{ transform: `scale(${isRunning ? phase?.scale || 1 : 1})` }}
                      >
                        <span className="font-display text-sm font-medium text-[#3F4A8A] dark:text-indigo-200 text-center px-3">
                          {isRunning ? phase?.label : 'Paused'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                        Guided breathing pacer
                      </p>
                    </div>
                  );
                })()
              ) : (
                <div className="w-full space-y-3">
                  <div className="h-44 rounded-xl overflow-hidden">
                    <SafeImage
                      src={activeExercise.illustration}
                      alt={activeExercise.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-xs text-center text-slate-500 dark:text-slate-400">
                    Follow the step-by-step cues on the right.
                  </p>
                </div>
              )}
            </div>

            <div className="lg:col-span-7 space-y-5">
              {currentStep && (
                <div className="rounded-2xl bg-[#F6F7FB] dark:bg-slate-800/40 p-6 space-y-2.5">
                  <p className="text-xs font-medium text-[#3F4A8A] dark:text-indigo-300 tabular-nums">
                    Phase {currentStepIdx + 1} of {activeExercise.steps.length} · {currentStep.title}
                  </p>
                  <p className="font-display text-lg font-medium text-slate-900 dark:text-white leading-snug">
                    {currentStep.instruction}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 pt-1 leading-relaxed">
                    Coach cue: {currentStep.tutorCue}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsRunning((r) => !r)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#3F4A8A] hover:bg-[#333D75] dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white text-xs font-medium shadow-xs transition-colors"
                >
                  {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {isRunning ? 'Pause' : 'Resume'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRemainingSeconds(activeExercise.durationSeconds);
                    setIsRunning(false);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-slate-200/90 dark:border-slate-700/80 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restart
                </button>
                <button
                  type="button"
                  onClick={() => void finishSession(activeExercise)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-medium transition-colors"
                >
                  Finish & Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsRunning(false);
                    setActiveExercise(null);
                  }}
                  className="px-3 py-2 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>

          {activeExercise.postureSupported && activeExercise.postureRuleKey && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80">
              <LivePostureMonitor
                ruleKey={activeExercise.postureRuleKey}
                isActiveSession={Boolean(activeExercise)}
                onMetricsUpdate={(metrics) => {
                  postureMetricsRef.current = metrics;
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Step 3 Header & Simple Filter */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#3F4A8A] dark:text-indigo-300">
            Step 3 of 6 · Breathe & Move
          </p>
          <h2 className="font-display text-2xl font-medium tracking-tight text-slate-900 dark:text-white mt-0.5">
            Pick one short guided reset
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Choose a 3-minute breathing pacer, quiet meditation, or posture-guided stretch.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-full">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                filter === cat
                  ? 'bg-[#EEF0F8] text-[#3F4A8A] dark:bg-indigo-500/20 dark:text-indigo-200'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Exercise Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-72 rounded-[24px] border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((ex) => (
            <div
              key={ex.id}
              className="rounded-[24px] border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden flex flex-col justify-between group"
            >
              <div>
                <div className="h-40 overflow-hidden">
                  <SafeImage
                    src={ex.illustration}
                    alt={ex.name}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                  />
                </div>
                <div className="p-5 space-y-2.5">
                  <div className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                    <span className="text-[#3F4A8A] dark:text-indigo-300 font-medium">
                      {ex.category}
                    </span>
                    <span>·</span>
                    <span className="tabular-nums">{Math.round(ex.durationSeconds / 60)} min</span>
                    <span>·</span>
                    <span>{ex.difficulty}</span>
                  </div>
                  <h3 className="font-display text-lg font-medium text-slate-900 dark:text-white">
                    {ex.name}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {ex.benefits[0]}
                  </p>
                  {ex.postureSupported && (
                    <p className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#3F4A8A] dark:text-indigo-300 pt-0.5">
                      <Camera className="w-3.5 h-3.5" />
                      Optional posture camera supported
                    </p>
                  )}
                </div>
              </div>

              <div className="px-5 pb-5">
                <button
                  type="button"
                  onClick={() => startExercise(ex)}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-full bg-[#3F4A8A] hover:bg-[#333D75] dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white text-xs font-medium shadow-xs transition-colors"
                >
                  <Play className="w-3.5 h-3.5" />
                  Start Session
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Collapsible Exercise History */}
      <div className="rounded-[24px] border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] overflow-hidden">
        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-[#FAFBFD] dark:hover:bg-slate-800/30 transition-colors"
        >
          <span className="font-display text-base font-medium text-slate-900 dark:text-white">
            Completed Practice Log{' '}
            <span className="font-mono text-xs text-slate-400 tabular-nums">
              ({history.length})
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#3F4A8A] dark:text-indigo-300">
            {showHistory ? 'Hide' : 'View Log'}
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>

        {showHistory && (
          <div className="px-6 pb-6 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            {history.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-3">
                Complete any guided session above to log your practice minutes.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {history.map((s) => (
                  <div
                    key={s.id}
                    className="py-3.5 first:pt-0 last:pb-0 flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                        {s.exerciseName}
                      </p>
                      <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                        {s.category}
                        {s.postureUsed && s.postureScore !== null
                          ? ` · Posture Alignment ${s.postureScore}%`
                          : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400 tabular-nums">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {Math.max(1, Math.round(s.completedSeconds / 60))} min
                      </span>
                      <span>
                        {new Date(s.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <SequentialStepFooter stepId="exercises" />
    </div>
  );
}
