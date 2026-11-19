/**
 * Built-In Deterministic Guided Wellness Engine for MindCare AI.
 *
 * Activates automatically whenever the primary Ollama LLM service is offline,
 * unreachable, or out of credits. Never calls external cloud LLMs and never
 * fabricates clinical diagnoses—provides structured, empathetic, topic-aware
 * self-care guidance paired with the user's real stress/mood context and catalog items.
 */

interface GuidedContext {
  summaryText?: string;
  latestStressScore?: number | null;
  latestStressCategory?: string | null;
  latestMood?: string | null;
  latestMoodIntensity?: number | null;
}

interface CatalogRef {
  id: string;
  name?: string;
  title?: string;
}

interface MessageLike {
  role: string;
  content: string;
}

interface TopicMatch {
  id: string;
  keywords: RegExp;
  empathy: string;
  steps: string[];
  followUp: string;
}

const TOPICS: TopicMatch[] = [
  {
    id: 'work_overload',
    keywords: /\b(work|workload|deadline|overload|overloaded|burnout|meeting|meetings|boss|job|office|study|exam|assignment|pressure|busy|tasks?)\b/i,
    empathy:
      'Carrying heavy mental load from work or study leaves your nervous system stuck in high gear, even after you step away.',
    steps: [
      'Close or minimize extra tabs and write down only the single next item that truly needs attention—park everything else for later.',
      'Take 60 seconds for 4-4-4-4 Box Breathing (inhale 4s, hold 4s, exhale 4s, hold 4s) to signal safety to your nervous system.',
      'Stand up, roll your shoulders down and back, and drink a full glass of water before deciding what comes next.',
    ],
    followUp:
      'What feels like the heaviest weight on your plate right now—the volume of tasks, or the feeling that you cannot switch off?',
  },
  {
    id: 'sleep_rest',
    keywords: /\b(sleep|insomnia|awake|bed|bedtime|night|tired|exhausted|fatigue|fatigued|unwind|rest|nap|groggy|drained)\b/i,
    empathy:
      'When your mind stays active at night or your energy feels depleted, forcing yourself to relax usually backfires—gentle down-shifting works much better.',
    steps: [
      'Dim bright overhead lights and put devices slightly out of reach for the next 15–20 minutes.',
      'Try 4 rounds of 4-7-8 Calming Breath (inhale 4s, hold 7s, slow exhale 8s) to lengthen your exhale and slow your heart rate.',
      'Do a 2-minute head-to-toe muscle release: gently unclench your jaw, drop your shoulders, and let your hands rest heavy.',
    ],
    followUp:
      'Are racing thoughts keeping you alert, or does your body itself feel restless right now?',
  },
  {
    id: 'posture_tension',
    keywords: /\b(shoulder|shoulders|neck|back|posture|desk|tight|stiff|tension|jaw|headache|ache|sore|slouch|sit|sitting)\b/i,
    empathy:
      'Stress settles quickly in the upper trapezius, neck, and jaw—especially after long hours looking at a screen.',
    steps: [
      'Drop both shoulders two inches away from your ears and soften your jaw so your back teeth are not touching.',
      'Gently tilt your right ear toward your right shoulder for 20 seconds while breathing slowly, then switch to the left side.',
      'Interlace your fingers, reach gently overhead, take one deep belly breath, and exhale as you lower your arms.',
    ],
    followUp:
      'Would you like to open Step 3 for a 3-minute Neck & Shoulder Release with optional live posture alignment?',
  },
  {
    id: 'anxiety_worry',
    keywords: /\b(anxious|anxiety|worry|worried|worrying|panic|nervous|overwhelmed|racing|stress|stressed|edge|uneasy|afraid|fear|scared)\b/i,
    empathy:
      'Feeling anxious or on edge is exhausting—your body is trying to protect you by staying hyper-alert, even when you just want calm.',
    steps: [
      'Ground into your senses with 5-4-3-2-1: notice 5 things you see, 4 you can physically feel, 3 sounds, 2 scents, and 1 steady breath.',
      'Make your exhale slightly longer than your inhale (inhale 4 seconds, exhale 6 seconds) for 5 calm cycles.',
      'Name the worry plainly in one short sentence without trying to solve the entire future in this minute.',
    ],
    followUp:
      'Is there a specific worry looping right now, or does it feel more like a general wave of restlessness in your body?',
  },
  {
    id: 'low_mood_lonely',
    keywords: /\b(sad|lonely|alone|down|heavy|cry|crying|empty|numb|unmotivated|low|blue|heartbreak|grief|miss|missing)\b/i,
    empathy:
      'It takes real energy to sit with heaviness or loneliness. You do not have to force positivity right now—just meeting yourself with gentleness is enough.',
    steps: [
      'Place one hand comfortably over your chest or stomach and take three slow, unhurried breaths.',
      'Choose one tiny, low-effort act of care for the next 10 minutes: warm tea, fresh air by a window, or soft ambient rain.',
      'If it feels manageable, send a brief, low-pressure message to someone you trust—even just checking in.',
    ],
    followUp:
      'Would it help to put what feels heaviest into words here, or would you prefer a quiet sensory reset first?',
  },
  {
    id: 'focus_fog',
    keywords: /\b(focus|concentrate|concentration|distracted|fog|brain fog|procrastinat|scattered|stuck|confused|indecisive)\b/i,
    empathy:
      'Mental fog and distraction are very common signs of cognitive overload, not a personal failing.',
    steps: [
      'Pick one small 10-minute task—just enough to create gentle momentum—and silence notifications until the timer ends.',
      'Take 3 slow deep breaths while looking at a distant point away from your screen to rest your visual cortex.',
      'Put on steady ambient focus audio from Step 4 to mask sudden background interruptions.',
    ],
    followUp:
      'What is the smallest 5-minute piece of what you need to do that feels approachable right now?',
  },
  {
    id: 'frustration_anger',
    keywords: /\b(angry|anger|frustrated|frustration|irritated|annoyed|mad|furious|resent|unfair|fed up)\b/i,
    empathy:
      'Frustration and anger usually point to a boundary being stretched or an important need going unheard.',
    steps: [
      'Before reacting or sending any message, pause for 90 seconds—the initial adrenaline surge naturally begins to ebb within that window.',
      'Release physical charge safely: unclench your fists, exhale forcefully through your mouth three times, and stretch your upper back.',
      'Separate what happened factually from what you need next so you can respond from steadiness rather than urgency.',
    ],
    followUp:
      'What boundary or expectation feels like it got crossed today?',
  },
  {
    id: 'positive_grateful',
    keywords: /\b(grateful|thankful|happy|good|great|better|calm|peaceful|proud|relaxed|excited|progress|relieved)\b/i,
    empathy:
      'It is wonderful to notice moments of steadiness or relief—pausing to savor them actually helps train your brain to recognize safety and progress.',
    steps: [
      'Take 20 seconds to notice where that calmer or lighter feeling sits physically in your body.',
      'Jot down one small thing that contributed to feeling this way so you can return to it on busier days.',
      'Carry this pace gently into your next step without rushing.',
    ],
    followUp:
      'What helped create this shift for you today?',
  },
];

export function generateGuidedCompanionReply(
  message: string,
  priorMessages: MessageLike[],
  userContext: GuidedContext,
  suggestedExercises: CatalogRef[],
  suggestedTracks: CatalogRef[]
): string {
  const cleanMsg = message.trim();
  const matched = TOPICS.find((t) => t.keywords.test(cleanMsg));
  const isFollowUp = priorMessages.length > 0;

  const lines: string[] = [];

  if (matched) {
    lines.push(matched.empathy);
  } else if (isFollowUp) {
    lines.push(
      'Thank you for sharing more of what is going on. Taking a moment to slow down and put it into words already creates breathing room.'
    );
  } else {
    lines.push(
      'Thank you for checking in. Whatever pace today has been moving at, you can pause here for a couple of quiet minutes.'
    );
  }

  // Gently weave in user wellness context if shared
  if (userContext.latestStressScore != null || userContext.latestMood) {
    const contextParts: string[] = [];
    if (userContext.latestStressScore != null) {
      contextParts.push(
        `your latest stress check-in was ${userContext.latestStressScore}/100 (${userContext.latestStressCategory || 'recorded'})`
      );
    }
    if (userContext.latestMood) {
      contextParts.push(
        `your recent mood check-in noted feeling ${userContext.latestMood.toLowerCase()}`
      );
    }
    if (contextParts.length > 0) {
      lines.push(
        `Keeping in mind that ${contextParts.join(' and ')}, a brief, low-effort reset is a smart choice right now.`
      );
    }
  }

  const steps = matched
    ? matched.steps
    : [
        'Unclench your jaw, drop your shoulders, and take 3 slow breaths with a slightly longer exhale than inhale.',
        'Name one thing you can let go of for the next hour so your attention has room to settle.',
        'Pair a short 3-minute guided breathing session with a calming ambient soundscape.',
      ];

  lines.push(
    `Here is a gentle reset you can try right now:\n${steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
  );

  const recNames: string[] = [];
  if (suggestedExercises.length > 0) {
    recNames.push(
      `Guided exercise: ${suggestedExercises.map((e) => e.name).filter(Boolean).join(' or ')}`
    );
  }
  if (suggestedTracks.length > 0) {
    recNames.push(
      `Soundscape: ${suggestedTracks.map((t) => t.title).filter(Boolean).join(' or ')}`
    );
  }
  if (recNames.length > 0) {
    lines.push(`Quick links ready below — ${recNames.join(' · ')}.`);
  }

  lines.push(
    matched
      ? matched.followUp
      : 'What feels like the single most helpful shift for you over the next hour?'
  );

  return lines.join('\n\n');
}

export function generateGuidedJournalReflection({
  mood,
  intensity,
  note,
  journalText,
}: {
  mood: string;
  intensity: number;
  note?: string;
  journalText: string;
}) {
  const combined = `${note || ''} ${journalText || ''}`.trim();
  const themes: string[] = [mood];

  if (/\b(work|deadline|job|meeting|study|exam|pressure|busy)\b/i.test(combined)) {
    themes.push('Work & study load');
  }
  if (/\b(sleep|tired|exhausted|rest|night|awake)\b/i.test(combined)) {
    themes.push('Rest & energy');
  }
  if (/\b(friend|family|partner|people|lonely|conversation|relationship)\b/i.test(combined)) {
    themes.push('Connection & boundaries');
  }
  if (/\b(shoulder|neck|headache|body|tension|posture|breath)\b/i.test(combined)) {
    themes.push('Physical tension');
  }
  if (/\b(grateful|calm|better|progress|proud|relief)\b/i.test(combined)) {
    themes.push('Steady progress');
  }
  if (themes.length < 2) {
    themes.push(intensity >= 7 ? 'High emotional intensity' : 'Self-awareness');
  }

  const lowerMood = mood.toLowerCase();
  const empatheticReflection =
    intensity >= 7
      ? `Feeling ${lowerMood} at ${intensity}/10 takes a lot of inner bandwidth. Putting your thoughts onto paper right now helps create gentle distance between you and the intensity of the moment.`
      : `Taking a quiet pause to notice feeling ${lowerMood} (${intensity}/10) builds steady emotional awareness. Naming your inner state clearly makes it much easier to choose what supports you next.`;

  let gentleReframe =
    'Treat today’s emotional state like passing weather—it gives you useful information, without defining who you are.';
  if (['anxious', 'confused'].includes(lowerMood)) {
    gentleReframe =
      'You do not need complete certainty about the whole week right now—only enough steadiness for the next single step.';
  } else if (['tired', 'sad', 'lonely'].includes(lowerMood)) {
    gentleReframe =
      'Lower energy is a signal for gentler pacing and restoration, not something to criticize yourself over.';
  } else if (['happy', 'calm', 'excited'].includes(lowerMood)) {
    gentleReframe =
      'Noticing what supported this steady moment gives you a personal blueprint you can revisit whenever stress rises.';
  }

  let suggestedNextStep = 'Take a 3-minute mindful pause with a glass of water and a gentle shoulder stretch.';
  if (['anxious', 'angry'].includes(lowerMood) || intensity >= 8) {
    suggestedNextStep = 'Try 4-7-8 Calming Breath in Step 3 or play Soft Rain on Glass for 5 minutes.';
  } else if (lowerMood === 'tired') {
    suggestedNextStep = 'Try the Progressive Body Scan in Step 3 and plan an earlier screen-free wind-down tonight.';
  } else if (['sad', 'lonely'].includes(lowerMood)) {
    suggestedNextStep = 'Step outside for 5 minutes of daylight or reach out with a brief text to someone you feel comfortable with.';
  }

  return {
    keyThemes: themes.slice(0, 3),
    empatheticReflection,
    gentleReframe,
    suggestedNextStep,
  };
}
