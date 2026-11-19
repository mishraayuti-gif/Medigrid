import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Info,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { api, extractApiError } from '../services/api';
import { useJourney } from '../contexts/JourneyContext';
import { SequentialStepFooter } from '../components/SequentialStepFooter';
import type { StressAssessment } from '../types/wellness';

interface QuestionStep {
  key:
    | 'emotionalState'
    | 'stressCauses'
    | 'sleepQuality'
    | 'mentalExhaustion'
    | 'concentrationDifficulty'
    | 'workStudyPressure'
    | 'anxietyFrequency'
    | 'energyLevel'
    | 'freeTextReflection';
  prompt: string;
  helper: string;
  type: 'scale' | 'multi' | 'text';
  options?: { value: number; label: string }[];
  choices?: string[];
}

const QUESTIONS: QuestionStep[] = [
  {
    key: 'emotionalState',
    prompt: 'How would you describe your emotional state right now?',
    helper: 'Think about how steady or strained you have felt over the past 24 hours.',
    type: 'scale',
    options: [
      { value: 1, label: '1 · Calm & Grounded' },
      { value: 2, label: '2 · Mostly Steady' },
      { value: 3, label: '3 · Mildly Tense' },
      { value: 4, label: '4 · Strained / Heavy' },
      { value: 5, label: '5 · Overwhelmed' },
    ],
  },
  {
    key: 'stressCauses',
    prompt: 'Which areas are contributing to your stress right now?',
    helper: 'Select all that apply, or continue if none stand out.',
    type: 'multi',
    choices: [
      'Work deadlines',
      'Academic / study load',
      'Sleep disruption',
      'Financial concerns',
      'Interpersonal tension',
      'Health / fatigue',
      'Information overload',
    ],
  },
  {
    key: 'sleepQuality',
    prompt: 'How restorative was your sleep over the last couple of nights?',
    helper: 'Sleep deficit strongly amplifies next-day stress reactivity.',
    type: 'scale',
    options: [
      { value: 1, label: '1 · Deep & Restorative' },
      { value: 2, label: '2 · Fairly Good' },
      { value: 3, label: '3 · Interrupted / Light' },
      { value: 4, label: '4 · Poor / Fragmented' },
      { value: 5, label: '5 · Severely Disrupted' },
    ],
  },
  {
    key: 'mentalExhaustion',
    prompt: 'How mentally exhausted or drained do you feel?',
    helper: 'Consider cognitive fatigue, decision tiredness, or emotional numbness.',
    type: 'scale',
    options: [
      { value: 1, label: '1 · Fresh & Clear' },
      { value: 2, label: '2 · Slightly Tired' },
      { value: 3, label: '3 · Moderately Fatigued' },
      { value: 4, label: '4 · Quite Exhausted' },
      { value: 5, label: '5 · Completely Depleted' },
    ],
  },
  {
    key: 'concentrationDifficulty',
    prompt: 'How difficult has it been to stay focused on one task?',
    helper: 'Elevated stress often fragments working memory and attention.',
    type: 'scale',
    options: [
      { value: 1, label: '1 · Sharp Focus' },
      { value: 2, label: '2 · Occasional Distraction' },
      { value: 3, label: '3 · Noticeable Drift' },
      { value: 4, label: '4 · Hard to Concentrate' },
      { value: 5, label: '5 · Unable to Focus' },
    ],
  },
  {
    key: 'workStudyPressure',
    prompt: 'How intense does your current work or study pressure feel?',
    helper: 'Include unspoken expectations as well as explicit deadlines.',
    type: 'scale',
    options: [
      { value: 1, label: '1 · Light & Manageable' },
      { value: 2, label: '2 · Steady Pace' },
      { value: 3, label: '3 · Busy / Demanding' },
      { value: 4, label: '4 · Heavy Pressure' },
      { value: 5, label: '5 · Unrelenting' },
    ],
  },
  {
    key: 'anxietyFrequency',
    prompt: 'How often have you felt restless, on edge, or anxious lately?',
    helper: 'Notice physical tension such as tight shoulders, jaw clenching, or racing thoughts.',
    type: 'scale',
    options: [
      { value: 1, label: '1 · Rarely or Never' },
      { value: 2, label: '2 · Occasionally' },
      { value: 3, label: '3 · Several Times a Day' },
      { value: 4, label: '4 · Frequently' },
      { value: 5, label: '5 · Almost Constantly' },
    ],
  },
  {
    key: 'energyLevel',
    prompt: 'How would you rate your daily physical energy reserve?',
    helper: 'Lower energy reserves make emotional self-regulation harder.',
    type: 'scale',
    options: [
      { value: 1, label: '1 · High & Resilient' },
      { value: 2, label: '2 · Adequate' },
      { value: 3, label: '3 · Mid-level / Fluctuating' },
      { value: 4, label: '4 · Low Energy' },
      { value: 5, label: '5 · Severely Drained' },
    ],
  },
  {
    key: 'freeTextReflection',
    prompt: 'Anything else on your mind you want to share? (Optional)',
    helper: 'Your Ollama companion reads this note only to personalize supportive guidance.',
    type: 'text',
  },
];

export function StressAssessmentPage() {
  const { markStepCompleted } = useJourney();
  const [stepIndex, setStepIndex] = useState(0);
  const [responses, setResponses] = useState({
    emotionalState: 3,
    stressCauses: [] as string[],
    sleepQuality: 3,
    mentalExhaustion: 3,
    concentrationDifficulty: 3,
    workStudyPressure: 3,
    anxietyFrequency: 3,
    energyLevel: 3,
    freeTextReflection: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [latestResult, setLatestResult] = useState<{
    assessment: StressAssessment;
    scoringRulesSummary: string;
    disclaimer: string;
  } | null>(null);
  const [history, setHistory] = useState<StressAssessment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await api.get('/stress/history');
      setHistory(res.data.history || []);
    } catch {
      // ignore
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  const currentQuestion = QUESTIONS[stepIndex];
  const progressPct = Math.round(((stepIndex + 1) / QUESTIONS.length) * 100);

  const toggleCause = (cause: string) => {
    setResponses((prev) => ({
      ...prev,
      stressCauses: prev.stressCauses.includes(cause)
        ? prev.stressCauses.filter((c) => c !== cause)
        : [...prev.stressCauses, cause],
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post('/stress/assessment', responses);
      setLatestResult(res.data);
      markStepCompleted('stress');
      await loadHistory();
    } catch (err) {
      setError(extractApiError(err, 'Unable to submit stress assessment.'));
    } finally {
      setSubmitting(false);
    }
  };

  const resetWizard = () => {
    setLatestResult(null);
    setStepIndex(0);
  };

  return (
    <div className="space-y-6">
      {/* Focused Step 1 Card OR Result Panel */}
      {!latestResult ? (
        <div className="max-w-3xl mx-auto rounded-[24px] border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] shadow-[0_1px_2px_rgba(15,23,42,0.03)] p-6 sm:p-10 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-[#3F4A8A] dark:text-indigo-300">
                Step 1 of 6 · Question {stepIndex + 1} of {QUESTIONS.length}
              </p>
              <h2 className="font-display text-2xl sm:text-[28px] font-medium tracking-tight text-slate-900 dark:text-white mt-2 leading-snug">
                {currentQuestion.prompt}
              </h2>
            </div>
            <span className="font-mono tabular-nums text-xs font-medium text-slate-400 dark:text-slate-500 pt-1">
              {progressPct}%
            </span>
          </div>

          <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-[#3F4A8A] dark:bg-indigo-400 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {currentQuestion.helper}
          </p>

          {error && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-3.5 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {/* Question Input Area */}
          {currentQuestion.type === 'scale' && currentQuestion.options && (
            <div className="space-y-2.5">
              {currentQuestion.options.map((opt) => {
                const selected = responses[currentQuestion.key] === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      setResponses((prev) => ({
                        ...prev,
                        [currentQuestion.key]: opt.value,
                      }))
                    }
                    className={`w-full text-left px-4 py-3.5 rounded-2xl border text-sm font-medium transition-all flex items-center justify-between ${
                      selected
                        ? 'border-[#3F4A8A] bg-[#EEF0F8]/70 text-[#2C356B] dark:bg-indigo-500/15 dark:text-indigo-100 dark:border-indigo-400'
                        : 'border-slate-200/80 dark:border-slate-800 hover:bg-[#F9FAFD] dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {selected && (
                      <CheckCircle2 className="w-4 h-4 text-[#3F4A8A] dark:text-indigo-400" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {currentQuestion.type === 'multi' && currentQuestion.choices && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {currentQuestion.choices.map((choice) => {
                const selected = responses.stressCauses.includes(choice);
                return (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => toggleCause(choice)}
                    className={`text-left px-4 py-3.5 rounded-2xl border text-sm font-medium transition-all flex items-center justify-between ${
                      selected
                        ? 'border-[#3F4A8A] bg-[#EEF0F8]/70 text-[#2C356B] dark:bg-indigo-500/15 dark:text-indigo-100 dark:border-indigo-400'
                        : 'border-slate-200/80 dark:border-slate-800 hover:bg-[#F9FAFD] dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span>{choice}</span>
                    {selected && (
                      <CheckCircle2 className="w-4 h-4 text-[#3F4A8A] dark:text-indigo-400" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {currentQuestion.type === 'text' && (
            <textarea
              rows={4}
              value={responses.freeTextReflection}
              onChange={(e) =>
                setResponses((prev) => ({ ...prev, freeTextReflection: e.target.value }))
              }
              placeholder="Write a few sentences about what feels heaviest or most helpful today..."
              className="w-full rounded-2xl border border-slate-200/90 dark:border-slate-700/80 bg-[#F9FAFD] dark:bg-[#0D1322] focus:bg-white dark:focus:bg-[#0A0F1C] p-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3F4A8A]/25 dark:focus:ring-indigo-400/25 focus:border-[#3F4A8A] dark:focus:border-indigo-400 transition-all"
            />
          )}

          {/* Question Controls */}
          <div className="flex items-center justify-between pt-5 border-t border-slate-100 dark:border-slate-800/80">
            <button
              type="button"
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              disabled={stepIndex === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-slate-200/90 dark:border-slate-700/80 text-xs font-medium text-slate-700 dark:text-slate-200 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>

            {stepIndex < QUESTIONS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStepIndex((i) => i + 1)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#3F4A8A] hover:bg-[#333D75] dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white text-xs font-medium shadow-xs transition-colors"
              >
                Next Question
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#3F4A8A] hover:bg-[#333D75] dark:bg-indigo-500 dark:hover:bg-indigo-400 disabled:opacity-60 text-white text-xs font-medium shadow-xs transition-colors"
              >
                {submitting ? 'Calculating Score...' : 'See My Stress Score'}
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Assessment Results View */
        <div className="rounded-[24px] border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] shadow-[0_1px_2px_rgba(15,23,42,0.03)] p-6 sm:p-10 space-y-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Step 1 Complete · Stress Check-In Saved
              </p>
              <div className="flex flex-wrap items-baseline gap-3.5 mt-2">
                <span className="font-mono tabular-nums text-4xl sm:text-5xl font-semibold tracking-tight text-slate-900 dark:text-white">
                  {latestResult.assessment.deterministicScore}/100
                </span>
                <span className="font-display text-xl font-medium text-slate-600 dark:text-slate-300">
                  {latestResult.assessment.category} Stress Load
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={resetWizard}
                className="px-4 py-2.5 rounded-full border border-slate-200/90 dark:border-slate-700/80 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
              >
                Retake
              </button>
              <Link
                to="/app/emotions"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#3F4A8A] hover:bg-[#333D75] dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white text-xs font-medium transition-colors"
              >
                Continue to Step 2: Mood
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-[#F6F7FB] dark:bg-slate-800/45 px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300">
            <Info className="w-4 h-4 text-[#3F4A8A] dark:text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-200">
                {latestResult.disclaimer}
              </p>
              <p className="mt-1 text-slate-500 dark:text-slate-400">
                {latestResult.scoringRulesSummary}
              </p>
            </div>
          </div>

          {!latestResult.assessment.aiProviderStatus?.aiAvailable && (
            <div className="flex items-start gap-3 rounded-2xl bg-[#F6F7FB] dark:bg-slate-800/45 border border-slate-200/70 dark:border-slate-700/60 px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
              <Info className="w-4 h-4 text-[#3F4A8A] dark:text-indigo-400 shrink-0 mt-0.5" />
              <div>
                Guided Wellness Mode active while Ollama is unavailable (
                {latestResult.assessment.aiProviderStatus?.error || 'not connected'}). Showing
                deterministic score breakdown and action plan below.
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2">
            <div className="space-y-4">
              <h3 className="font-display text-lg font-medium text-slate-900 dark:text-white">
                8-Dimension Breakdown
              </h3>
              <div className="space-y-3.5">
                {latestResult.assessment.breakdown.map((dim) => (
                  <div key={dim.dimension} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {dim.dimension}
                      </span>
                      <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        {dim.score} / {dim.maxScore}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-[#3F4A8A] dark:bg-indigo-400 rounded-full"
                        style={{ width: `${dim.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#3F4A8A] dark:text-indigo-400" />
                <h3 className="font-display text-lg font-medium text-slate-900 dark:text-white">
                  {latestResult.assessment.aiProviderStatus?.aiAvailable
                    ? `Ollama Insights (${latestResult.assessment.aiProviderStatus.model})`
                    : 'Deterministic Wellness Guidance'}
                </h3>
              </div>

              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {latestResult.assessment.aiAnalysis?.supportiveExplanation}
              </p>

              <div className="space-y-2">
                <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Key Observations
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 list-disc pl-4 leading-relaxed">
                  {latestResult.assessment.aiAnalysis?.emotionalObservations?.map((obs, idx) => (
                    <li key={idx}>{obs}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Suggested Action Plan
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 list-disc pl-4 leading-relaxed">
                  {latestResult.assessment.aiAnalysis?.actionPlan?.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Collapsible Past Assessments */}
      <div className="max-w-3xl mx-auto rounded-[24px] border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] overflow-hidden">
        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-[#FAFBFD] dark:hover:bg-slate-800/30 transition-colors"
        >
          <span className="font-display text-base font-medium text-slate-900 dark:text-white">
            Past Stress Check-Ins{' '}
            <span className="font-mono text-xs text-slate-400 tabular-nums">
              ({history.length})
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#3F4A8A] dark:text-indigo-300">
            {showHistory ? 'Hide' : 'View History'}
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>

        {showHistory && (
          <div className="px-6 pb-6 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            {loadingHistory ? (
              <div className="h-20 bg-slate-100 dark:bg-slate-800/60 rounded-2xl animate-pulse" />
            ) : history.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-3">
                No completed check-ins yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                      <th className="py-2.5 pr-4 font-medium">Date</th>
                      <th className="py-2.5 px-4 font-medium text-right">Score</th>
                      <th className="py-2.5 px-4 font-medium">Category</th>
                      <th className="py-2.5 pl-4 font-medium">Top Stressors</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {history.map((item) => (
                      <tr key={item.id}>
                        <td className="py-3 pr-4 tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {new Date(item.createdAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                          {item.deterministicScore}/100
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-200">
                          {item.category}
                        </td>
                        <td className="py-3 pl-4 text-slate-600 dark:text-slate-400">
                          {item.responses?.stressCauses?.length
                            ? item.responses.stressCauses.join(', ')
                            : 'General check-in'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <SequentialStepFooter stepId="stress" />
    </div>
  );
}
