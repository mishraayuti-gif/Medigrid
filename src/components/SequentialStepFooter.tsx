import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { useJourney, type JourneyStepId } from '../contexts/JourneyContext';

interface SequentialStepFooterProps {
  stepId: JourneyStepId;
  nextLabelOverride?: string;
}

export function SequentialStepFooter({
  stepId,
  nextLabelOverride,
}: SequentialStepFooterProps) {
  const navigate = useNavigate();
  const { steps, isStepCompleted, markStepCompleted, toggleStepCompleted } = useJourney();

  const index = steps.findIndex((s) => s.id === stepId);
  if (index === -1) return null;

  const current = steps[index];
  const prevStep = index > 0 ? steps[index - 1] : null;
  const nextStep = index < steps.length - 1 ? steps[index + 1] : null;
  const completed = isStepCompleted(stepId);

  const handleContinue = () => {
    markStepCompleted(stepId);
    if (nextStep) {
      navigate(nextStep.path);
    } else {
      navigate('/app/dashboard');
    }
  };

  return (
    <div className="mt-8 pt-6 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
      <button
        type="button"
        onClick={() => navigate(prevStep ? prevStep.path : '/app/dashboard')}
        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-[#111827] hover:bg-slate-50 dark:hover:bg-slate-800/70 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap shrink-0"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {prevStep ? `Step ${prevStep.stepNumber}: ${prevStep.shortLabel}` : 'Back to Daily Flow'}
      </button>

      <div className="flex items-center justify-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span className="font-mono tabular-nums">
          Step {current.stepNumber} of {steps.length}
        </span>
        <span aria-hidden="true">·</span>
        <button
          type="button"
          onClick={() => toggleStepCompleted(stepId)}
          className={`inline-flex items-center gap-1.5 font-medium transition-colors ${
            completed
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-slate-600 dark:text-slate-300 hover:text-[#3F4A8A] dark:hover:text-indigo-300'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          {completed ? 'Completed today' : 'Mark step done'}
        </button>
      </div>

      <button
        type="button"
        onClick={handleContinue}
        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-[#3F4A8A] hover:bg-[#333D75] dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0"
      >
        {nextStep ? (
          <>
            <span>
              {nextLabelOverride ||
                `Next: Step ${nextStep.stepNumber} · ${nextStep.shortLabel}`}
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </>
        ) : (
          <>
            <Sparkles className="w-3.5 h-3.5" />
            <span>{nextLabelOverride || 'Finish Today’s Flow'}</span>
          </>
        )}
      </button>
    </div>
  );
}
