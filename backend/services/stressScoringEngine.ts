export interface StressAssessmentResponses {
  emotionalState: number; // 1 (Calm/Balanced) to 5 (Overwhelmed/Distressed)
  stressCauses: string[]; // Selected triggers (0..6+)
  sleepQuality: number; // 1 (Restorative) to 5 (Severely disrupted)
  mentalExhaustion: number; // 1 (Fresh) to 5 (Depleted)
  concentrationDifficulty: number; // 1 (Sharp) to 5 (Unable to focus)
  workStudyPressure: number; // 1 (Manageable) to 5 (Excessive)
  anxietyFrequency: number; // 1 (Rarely) to 5 (Persistent)
  energyLevel: number; // 1 (High energy) to 5 (Very low energy / drained)
  freeTextReflection?: string;
}

export interface StressDimensionBreakdown {
  dimension: string;
  score: number;
  maxScore: number;
  percentage: number;
  note: string;
}

export interface DeterministicStressResult {
  score: number;
  category: 'Low' | 'Moderate' | 'High' | 'Very High';
  breakdown: StressDimensionBreakdown[];
  scoringRulesSummary: string;
  deterministicRecommendations: {
    observations: string[];
    supportiveSummary: string;
    actionPlan: string[];
    recommendedExerciseIds: string[];
    recommendedTrackIds: string[];
  };
}

function clampScale(val: number): number {
  const num = Number(val);
  if (Number.isNaN(num)) return 3;
  return Math.min(5, Math.max(1, Math.round(num)));
}

function scaleToPoints(scale1to5: number, maxPoints: number): number {
  // Maps 1 -> 0, 2 -> 0.25*max, 3 -> 0.5*max, 4 -> 0.75*max, 5 -> max
  const normalized = (clampScale(scale1to5) - 1) / 4;
  return Math.round(normalized * maxPoints * 10) / 10;
}

/**
 * Deterministic 0-100 Stress Scoring Engine.
 * Weights sum strictly to 100:
 *  - Emotional State Strain: 15
 *  - Active Stress Causes Load: 10 (2 pts per trigger, capped at 10)
 *  - Sleep Quality Deficit: 15
 *  - Mental Exhaustion: 15
 *  - Concentration Difficulty: 12
 *  - Work/Study Pressure: 13
 *  - Anxiety Frequency: 12
 *  - Daily Energy Deficit: 8
 */
export function calculateDeterministicStressScore(
  input: StressAssessmentResponses
): DeterministicStressResult {
  const emotionalPts = scaleToPoints(input.emotionalState, 15);
  const triggerCount = Array.isArray(input.stressCauses) ? input.stressCauses.length : 0;
  const triggerPts = Math.min(10, triggerCount * 2);
  const sleepPts = scaleToPoints(input.sleepQuality, 15);
  const exhaustionPts = scaleToPoints(input.mentalExhaustion, 15);
  const concentrationPts = scaleToPoints(input.concentrationDifficulty, 12);
  const pressurePts = scaleToPoints(input.workStudyPressure, 13);
  const anxietyPts = scaleToPoints(input.anxietyFrequency, 12);
  const energyPts = scaleToPoints(input.energyLevel, 8);

  const rawTotal =
    emotionalPts +
    triggerPts +
    sleepPts +
    exhaustionPts +
    concentrationPts +
    pressurePts +
    anxietyPts +
    energyPts;

  const score = Math.min(100, Math.max(0, Math.round(rawTotal)));

  let category: 'Low' | 'Moderate' | 'High' | 'Very High' = 'Low';
  if (score >= 75) category = 'Very High';
  else if (score >= 50) category = 'High';
  else if (score >= 25) category = 'Moderate';

  const breakdown: StressDimensionBreakdown[] = [
    {
      dimension: 'Emotional Load',
      score: Math.round(emotionalPts),
      maxScore: 15,
      percentage: Math.round((emotionalPts / 15) * 100),
      note: input.emotionalState >= 4 ? 'Elevated emotional strain reported' : 'Within manageable emotional range',
    },
    {
      dimension: 'Stressor Breadth',
      score: Math.round(triggerPts),
      maxScore: 10,
      percentage: Math.round((triggerPts / 10) * 100),
      note: triggerCount > 0 ? `${triggerCount} active stressor area(s) selected` : 'No acute stressors flagged',
    },
    {
      dimension: 'Sleep Deficit',
      score: Math.round(sleepPts),
      maxScore: 15,
      percentage: Math.round((sleepPts / 15) * 100),
      note: input.sleepQuality >= 4 ? 'Restorative sleep appears disrupted' : 'Sleep quality is moderate to steady',
    },
    {
      dimension: 'Mental Exhaustion',
      score: Math.round(exhaustionPts),
      maxScore: 15,
      percentage: Math.round((exhaustionPts / 15) * 100),
      note: input.mentalExhaustion >= 4 ? 'Notable cognitive fatigue detected' : 'Mental reserves are holding steady',
    },
    {
      dimension: 'Focus & Clarity',
      score: Math.round(concentrationPts),
      maxScore: 12,
      percentage: Math.round((concentrationPts / 12) * 100),
      note: input.concentrationDifficulty >= 4 ? 'Attention fragmentation noted' : 'Concentration remains functional',
    },
    {
      dimension: 'Work / Study Pressure',
      score: Math.round(pressurePts),
      maxScore: 13,
      percentage: Math.round((pressurePts / 13) * 100),
      note: input.workStudyPressure >= 4 ? 'High external demand load' : 'Workload pressure feels balanced',
    },
    {
      dimension: 'Anxiety Frequency',
      score: Math.round(anxietyPts),
      maxScore: 12,
      percentage: Math.round((anxietyPts / 12) * 100),
      note: input.anxietyFrequency >= 4 ? 'Frequent anxious tension' : 'Occasional or low anxious arousal',
    },
    {
      dimension: 'Energy Depletion',
      score: Math.round(energyPts),
      maxScore: 8,
      percentage: Math.round((energyPts / 8) * 100),
      note: input.energyLevel >= 4 ? 'Low physical and mental vitality' : 'Adequate daily energy baseline',
    },
  ];

  const observations: string[] = [];
  if (sleepPts >= 10) {
    observations.push('Sleep disruption is contributing significantly to your overall stress load.');
  }
  if (exhaustionPts >= 10 || energyPts >= 6) {
    observations.push('Cognitive fatigue and low energy suggest prioritizing restorative breaks over additional output.');
  }
  if (anxietyPts >= 8) {
    observations.push('Frequent anxious tension responds well to slow-exhale paced breathing and grounding.');
  }
  if (pressurePts >= 9) {
    observations.push('Workload demands are elevated; structured micro-breaks and boundary setting can help.');
  }
  if (observations.length === 0) {
    observations.push('Your overall stress indicators sit within a balanced range with room for preventive mindfulness.');
  }

  const actionPlan: string[] = [];
  const recommendedExerciseIds: string[] = [];
  const recommendedTrackIds: string[] = [];

  if (score >= 50) {
    actionPlan.push('Practice 4-7-8 Calming Breath for 4 minutes to lower nervous system arousal.');
    actionPlan.push('Release upper-body tension with the Neck & Shoulder Release routine.');
    actionPlan.push('Set a gentle wind-down alarm 45 minutes before bed with rain or brown-noise audio.');
    recommendedExerciseIds.push('breath-478', 'neck-shoulder-release', 'body-scan');
    recommendedTrackIds.push('rain-soft-shelter', 'sleep-brown-drift', 'meditation-432-stillness');
  } else if (score >= 25) {
    actionPlan.push('Use Box Breathing (4-4-4-4) before demanding work or study blocks.');
    actionPlan.push('Check in with a 2-minute emotion journal entry later today to spot recurring triggers.');
    actionPlan.push('Maintain a consistent sleep window tonight.');
    recommendedExerciseIds.push('breath-box', 'seated-spinal-reset', 'mindful-awareness');
    recommendedTrackIds.push('focus-ambient-pulse', 'nature-forest-canopy', 'lofi-evening-study');
  } else {
    actionPlan.push('Sustain your baseline with a 5-minute morning mindfulness or mountain stretch session.');
    actionPlan.push('Log brief positive reflections to reinforce emotional resilience.');
    recommendedExerciseIds.push('mindful-awareness', 'yoga-mountain-reach');
    recommendedTrackIds.push('nature-forest-canopy', 'relax-warm-horizon');
  }

  const supportiveSummary =
    category === 'Very High' || category === 'High'
      ? `Your deterministic wellness check-in scored ${score}/100 (${category}). You are carrying heavy strain right now—start with one small physiological reset like slow breathing rather than trying to fix everything at once. Consider reaching out to a trusted person or healthcare professional if high stress persists.`
      : category === 'Moderate'
      ? `Your deterministic wellness check-in scored ${score}/100 (${category}). Noticeable pressures are building, making short daily recovery pauses and steady sleep hygiene especially valuable right now.`
      : `Your deterministic wellness check-in scored ${score}/100 (${category}). Your current indicators point to a relatively steady baseline—keep nurturing your sleep and movement habits.`;

  return {
    score,
    category,
    breakdown,
    scoringRulesSummary:
      'Calculated deterministically from 8 weighted dimensions: Emotional Load (15), Stress Causes (10), Sleep Deficit (15), Mental Exhaustion (15), Concentration (12), Work/Study Pressure (13), Anxiety Frequency (12), Energy Deficit (8). Categories: 0-24 Low, 25-49 Moderate, 50-74 High, 75-100 Very High.',
    deterministicRecommendations: {
      observations,
      supportiveSummary,
      actionPlan,
      recommendedExerciseIds,
      recommendedTrackIds,
    },
  };
}
