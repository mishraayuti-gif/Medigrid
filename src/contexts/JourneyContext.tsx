import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

export type JourneyStepId =
  | 'stress'
  | 'emotions'
  | 'exercises'
  | 'music'
  | 'companion'
  | 'analytics';

export interface JourneyStepMeta {
  id: JourneyStepId;
  stepNumber: number;
  shortLabel: string;
  title: string;
  subtitle: string;
  estimatedTime: string;
  path: string;
}

export const JOURNEY_STEPS: JourneyStepMeta[] = [
  {
    id: 'stress',
    stepNumber: 1,
    shortLabel: 'Check-In',
    title: 'Stress Check-In',
    subtitle: 'Answer a quick 1-by-1 check-in to measure your stress level today.',
    estimatedTime: '2 min',
    path: '/app/stress',
  },
  {
    id: 'emotions',
    stepNumber: 2,
    shortLabel: 'Mood',
    title: 'Mood & Journal',
    subtitle: 'Pick how you feel right now and write a short private thought.',
    estimatedTime: '2 min',
    path: '/app/emotions',
  },
  {
    id: 'exercises',
    stepNumber: 3,
    shortLabel: 'Breathe',
    title: 'Breathe & Move',
    subtitle: 'Follow a calm guided breathing timer or gentle posture stretch.',
    estimatedTime: '3 min',
    path: '/app/exercises',
  },
  {
    id: 'music',
    stepNumber: 4,
    shortLabel: 'Sound',
    title: 'Calming Sound',
    subtitle: 'Start a soothing ambient soundscape matched to your mood.',
    estimatedTime: '1 min',
    path: '/app/music',
  },
  {
    id: 'companion',
    stepNumber: 5,
    shortLabel: 'Reflect',
    title: 'AI Reflection',
    subtitle: 'Chat privately with your AI wellness companion to clear your mind.',
    estimatedTime: '2 min',
    path: '/app/companion',
  },
  {
    id: 'analytics',
    stepNumber: 6,
    shortLabel: 'Wrap-Up',
    title: 'Sleep & Daily Wrap-Up',
    subtitle: 'Log last night’s rest, check your goals, and complete today’s flow.',
    estimatedTime: '2 min',
    path: '/app/analytics',
  },
];

interface JourneyContextValue {
  steps: JourneyStepMeta[];
  completedSteps: JourneyStepId[];
  completedCount: number;
  progressPercent: number;
  allCompleted: boolean;
  nextStep: JourneyStepMeta;
  isStepCompleted: (id: JourneyStepId) => boolean;
  markStepCompleted: (id: JourneyStepId) => void;
  toggleStepCompleted: (id: JourneyStepId) => void;
  resetTodayJourney: () => void;
  getStepByPath: (pathname: string) => JourneyStepMeta | null;
}

const JourneyContext = createContext<JourneyContextValue | undefined>(undefined);

function getTodayKey(userId?: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return `mindcare_journey_${userId || 'guest'}_${today}`;
}

export function JourneyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const storageKey = getTodayKey(user?.id);
  const [completedSteps, setCompletedSteps] = useState<JourneyStepId[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setCompletedSteps([]);
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const validIds = new Set(JOURNEY_STEPS.map((s) => s.id));
        setCompletedSteps(parsed.filter((id): id is JourneyStepId => validIds.has(id)));
      }
    } catch {
      setCompletedSteps([]);
    }
  }, [storageKey]);

  const persist = (next: JourneyStepId[]) => {
    setCompletedSteps(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // ignore storage quota errors
    }
  };

  const markStepCompleted = (id: JourneyStepId) => {
    setCompletedSteps((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const toggleStepCompleted = (id: JourneyStepId) => {
    setCompletedSteps((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const resetTodayJourney = () => {
    persist([]);
  };

  const value = useMemo<JourneyContextValue>(() => {
    const completedCount = completedSteps.length;
    const progressPercent = Math.round((completedCount / JOURNEY_STEPS.length) * 100);
    const allCompleted = completedCount === JOURNEY_STEPS.length;
    const nextStep =
      JOURNEY_STEPS.find((step) => !completedSteps.includes(step.id)) || JOURNEY_STEPS[0];

    return {
      steps: JOURNEY_STEPS,
      completedSteps,
      completedCount,
      progressPercent,
      allCompleted,
      nextStep,
      isStepCompleted: (id) => completedSteps.includes(id),
      markStepCompleted,
      toggleStepCompleted,
      resetTodayJourney,
      getStepByPath: (pathname) => JOURNEY_STEPS.find((s) => s.path === pathname) || null,
    };
  }, [completedSteps, storageKey]);

  return <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>;
}

export function useJourney() {
  const ctx = useContext(JourneyContext);
  if (!ctx) throw new Error('useJourney must be used within JourneyProvider');
  return ctx;
}
