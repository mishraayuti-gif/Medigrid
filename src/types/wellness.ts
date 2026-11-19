export interface UserPreferences {
  theme: 'light' | 'dark';
  notifications: {
    dailyCheckIn: boolean;
    weeklyReport: boolean;
    exerciseReminder: boolean;
  };
  wellnessFocus: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'demo';
  preferences: UserPreferences;
  createdAt?: string;
}

export interface StressDimensionBreakdown {
  dimension: string;
  score: number;
  maxScore: number;
  percentage: number;
  note: string;
}

export interface StressAIAnalysis {
  emotionalObservations: string[];
  supportiveExplanation: string;
  personalizedRecommendations: string[];
  actionPlan: string[];
}

export interface StressAssessment {
  id: string;
  responses: {
    emotionalState: number;
    stressCauses: string[];
    sleepQuality: number;
    mentalExhaustion: number;
    concentrationDifficulty: number;
    workStudyPressure: number;
    anxietyFrequency: number;
    energyLevel: number;
    freeTextReflection?: string;
  };
  deterministicScore: number;
  category: 'Low' | 'Moderate' | 'High' | 'Very High';
  breakdown: StressDimensionBreakdown[];
  aiAnalysis?: StressAIAnalysis | null;
  aiProviderStatus?: {
    provider: string;
    aiAvailable: boolean;
    model: string;
    error?: string;
  };
  isDemo?: boolean;
  createdAt: string;
}

export type MoodType =
  | 'Happy'
  | 'Sad'
  | 'Angry'
  | 'Anxious'
  | 'Calm'
  | 'Tired'
  | 'Excited'
  | 'Confused'
  | 'Lonely';

export interface JournalAIAnalysis {
  keyThemes: string[];
  empatheticReflection: string;
  gentleReframe: string;
  suggestedNextStep: string;
}

export interface EmotionEntry {
  id: string;
  mood: MoodType;
  intensity: number;
  note: string;
  journalText: string;
  tags: string[];
  aiJournalAnalysis?: JournalAIAnalysis | null;
  aiProviderStatus?: {
    provider: string;
    aiAvailable: boolean;
    model?: string;
    error?: string;
  } | null;
  isDemo?: boolean;
  createdAt: string;
}

export interface ExerciseStep {
  title: string;
  instruction: string;
  durationSeconds: number;
  tutorCue: string;
}

export interface ExerciseItem {
  id: string;
  name: string;
  category:
    | 'Breathing'
    | 'Meditation'
    | 'Yoga'
    | 'Stretching'
    | 'Neck & Shoulder'
    | 'Body Relaxation';
  durationSeconds: number;
  difficulty: 'Beginner' | 'Intermediate';
  benefits: string[];
  instructions: string[];
  steps: ExerciseStep[];
  illustration: string;
  breathingPattern?: {
    inhale: number;
    holdTop: number;
    exhale: number;
    holdBottom: number;
  };
  postureSupported: boolean;
  postureRuleKey?: 'upright_alignment' | 'neck_tilt_release' | 'overhead_reach' | 'shoulder_level';
  postureInstructions?: string;
}

export interface ExerciseSession {
  id: string;
  exerciseId: string;
  exerciseName: string;
  category: string;
  durationSeconds: number;
  completedSeconds: number;
  postureUsed: boolean;
  postureScore: number | null;
  postureFeedbackSummary: string;
  completed: boolean;
  isDemo?: boolean;
  createdAt: string;
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  category: 'Relaxing' | 'Meditation' | 'Nature' | 'Rain' | 'Focus' | 'Sleep' | 'Lo-fi';
  durationSeconds: number;
  bpm: number;
  moodTags: string[];
  description: string;
  synthPreset: 'rain' | 'forest' | 'ocean' | 'drone432' | 'lofi' | 'brownNoise' | 'focusPulse' | 'warmPad';
  coverImage: string;
  licenseNote: string;
}

export interface WellnessGoal {
  id: string;
  title: string;
  category: 'Mindfulness' | 'Sleep' | 'Movement' | 'Journaling' | 'Stress Relief';
  targetValue: number;
  currentValue: number;
  unit: string;
  frequency: 'daily' | 'weekly';
  completedDates: string[];
  active: boolean;
  isDemo?: boolean;
  createdAt: string;
}

export interface SleepEntry {
  id: string;
  date: string;
  bedtime: string;
  wakeTime: string;
  durationHours: number;
  qualityScore: number;
  awakenings: number;
  notes: string;
  isDemo?: boolean;
  createdAt: string;
}

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  provider?: string;
  crisisFlag?: boolean;
  recommendedExerciseIds?: string[];
  recommendedTrackIds?: string[];
}

export interface AIConversation {
  id: string;
  title: string;
  messages: AIMessage[];
  updatedAt: string;
}

export interface OllamaHealth {
  available: boolean;
  baseUrl: string;
  model: string;
  modelLoaded?: boolean;
  models: string[];
  error: string | null;
}

export interface DashboardSummary {
  hasDemoRecords: boolean;
  latestStress: StressAssessment | null;
  latestMood: EmotionEntry | null;
  latestSleep: SleepEntry | null;
  weeklyStressTrend: { date: string; score: number; category: string; isDemo: boolean }[];
  recentMoods: EmotionEntry[];
  exerciseStats: {
    completedCount: number;
    totalMinutes: number;
    recentSessions: ExerciseSession[];
  };
  goals: WellnessGoal[];
  musicRecommendations: MusicTrack[];
  recommendedExercises: ExerciseItem[];
  recentMusicCount: number;
  ollamaStatus: OllamaHealth;
}
