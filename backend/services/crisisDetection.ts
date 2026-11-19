export interface CrisisDetectionResult {
  isCrisis: boolean;
  matchedCategory: string | null;
  guidanceMessage: string;
  resources: {
    name: string;
    contact: string;
    description: string;
  }[];
}

const CRISIS_PATTERNS: RegExp[] = [
  /\b(kill\s+myself|end\s+my\s+life|want\s+to\s+die|don'?t\s+want\s+to\s+live|suicid(e|al)|self[-\s]?harm|hurt\s+myself|cut\s+myself|overdose|no\s+reason\s+to\s+live)\b/i,
  /\b(ending\s+it\s+all|better\s+off\s+dead|take\s+my\s+own\s+life)\b/i,
];

export const CRISIS_RESOURCES = [
  {
    name: '988 Suicide & Crisis Lifeline (US & Canada)',
    contact: 'Call or text 988 (24/7, free, confidential)',
    description: 'Immediate support from trained crisis counselors.',
  },
  {
    name: 'Crisis Text Line',
    contact: 'Text HOME to 741741',
    description: '24/7 free, confidential text support with a crisis counselor.',
  },
  {
    name: 'Emergency Services',
    contact: 'Call 911 (US) or your local emergency number',
    description: 'If you are in immediate physical danger, please contact local emergency services or go to the nearest emergency room.',
  },
  {
    name: 'International Helplines',
    contact: 'findahelpline.com',
    description: 'Directory of free, confidential crisis support lines worldwide.',
  },
];

export function detectCrisisSignal(text: string): CrisisDetectionResult {
  if (!text || typeof text !== 'string') {
    return {
      isCrisis: false,
      matchedCategory: null,
      guidanceMessage: '',
      resources: [],
    };
  }

  for (const pattern of CRISIS_PATTERNS) {
    if (pattern.test(text)) {
      return {
        isCrisis: true,
        matchedCategory: 'immediate_self_harm_risk',
        guidanceMessage:
          'It sounds like you may be going through an overwhelming and painful moment. Please know you do not have to carry this alone, and immediate human support is available right now. MindCare AI is a wellness tool and cannot provide crisis intervention—please connect with a trained counselor or emergency service immediately.',
        resources: CRISIS_RESOURCES,
      };
    }
  }

  return {
    isCrisis: false,
    matchedCategory: null,
    guidanceMessage: '',
    resources: [],
  };
}
