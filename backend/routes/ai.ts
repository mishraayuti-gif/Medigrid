import { Router } from 'express';
import type { Response } from 'express';
import { body } from 'express-validator';
import { authenticateToken, handleValidationErrors } from '../middleware/auth.ts';
import type { AuthenticatedRequest } from '../middleware/auth.ts';
import { dbStore } from '../services/dataStore.ts';
import { detectCrisisSignal } from '../services/crisisDetection.ts';
import { calculateDeterministicStressScore } from '../services/stressScoringEngine.ts';
import { EXERCISES_CATALOG, MUSIC_CATALOG } from '../data/catalog.ts';
import ollamaService from '../services/ollamaService.js';
import {
  generateGuidedCompanionReply,
  generateGuidedJournalReflection,
} from '../services/wellnessFallbackEngine.ts';

const router = Router();

router.get('/health', async (_req, res: Response) => {
  const status = await ollamaService.checkHealth();
  return res.json(status);
});

router.use(authenticateToken);

router.get('/conversations', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const conversations = await dbStore.getConversations(req.user!.userId);
    return res.json({ conversations });
  } catch {
    return res.status(500).json({ error: 'Failed to load AI conversations.' });
  }
});

router.delete('/conversations/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const deleted = await dbStore.deleteConversation(req.user!.userId, req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }
    return res.json({ deleted: true });
  } catch {
    return res.status(500).json({ error: 'Failed to delete conversation.' });
  }
});

router.post(
  '/chat',
  [
    body('message').isString().trim().isLength({ min: 1, max: 2000 }).withMessage('Message cannot be empty.'),
    body('conversationId').optional({ nullable: true }).isString(),
    body('saveHistory').optional().isBoolean(),
    body('shareWellnessContext').optional().isBoolean(),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const message = String(req.body.message).trim();
      const conversationId = req.body.conversationId ? String(req.body.conversationId) : null;
      const saveHistory = req.body.saveHistory !== false;
      const shareWellnessContext = req.body.shareWellnessContext !== false;

      // 1. Immediate Crisis Signal Check
      const crisis = detectCrisisSignal(message);
      let existingConv = conversationId ? await dbStore.getConversationById(userId, conversationId) : null;
      const priorMessages = existingConv?.messages || [];

      if (crisis.isCrisis) {
        const crisisReply = `${crisis.guidanceMessage}\n\nImmediate Support Resources:\n${crisis.resources
          .map((r) => `• ${r.name}: ${r.contact} — ${r.description}`)
          .join('\n')}`;

        const updatedMessages = [
          ...priorMessages,
          { role: 'user', content: message, timestamp: new Date().toISOString(), crisisFlag: true },
          { role: 'assistant', content: crisisReply, timestamp: new Date().toISOString(), crisisFlag: true },
        ];

        const savedConv = saveHistory
          ? await dbStore.saveConversation(userId, conversationId, 'Crisis Support Check-In', updatedMessages)
          : null;

        return res.json({
          crisisDetected: true,
          crisisResources: crisis.resources,
          aiAvailable: true,
          provider: 'safety-guardrail',
          reply: crisisReply,
          conversation: savedConv,
          recommendedExercises: [],
          recommendedTracks: [],
        });
      }

      // 2. Build optional user context if privacy switch permits
      let contextSummary = '';
      let latestStressScore: number | null = null;
      let latestStressCategory: string | null = null;
      let latestMood: string | null = null;
      let latestMoodIntensity: number | null = null;

      if (shareWellnessContext) {
        const [stressList, emotions] = await Promise.all([
          dbStore.getStressHistory(userId, 1),
          dbStore.getEmotionHistory(userId, 1),
        ]);
        const latestStress = stressList[0];
        const latestMoodEntry = emotions[0];
        const parts: string[] = [];
        if (latestStress) {
          latestStressScore = latestStress.deterministicScore;
          latestStressCategory = latestStress.category;
          parts.push(`Latest stress score: ${latestStress.deterministicScore}/100 (${latestStress.category})`);
        }
        if (latestMoodEntry) {
          latestMood = latestMoodEntry.mood;
          latestMoodIntensity = latestMoodEntry.intensity;
          parts.push(`Recent mood: ${latestMoodEntry.mood} (${latestMoodEntry.intensity}/10)`);
        }
        contextSummary = parts.join('. ');
      }

      // 3. Query Ollama (Primary LLM Provider)
      const aiRes = await ollamaService.chatWithCompanion(priorMessages, message, {
        summaryText: contextSummary,
      });

      const lowerMsg = message.toLowerCase();
      const suggestedExercises = EXERCISES_CATALOG.filter((e) => {
        if (lowerMsg.includes('sleep') || lowerMsg.includes('tired')) return ['breath-478', 'body-scan'].includes(e.id);
        if (lowerMsg.includes('neck') || lowerMsg.includes('posture') || lowerMsg.includes('shoulder'))
          return ['neck-shoulder-release', 'seated-spinal-reset'].includes(e.id);
        return ['breath-box', 'mindful-awareness'].includes(e.id);
      }).slice(0, 2);

      const suggestedTracks = MUSIC_CATALOG.filter((t) => {
        if (lowerMsg.includes('sleep')) return ['sleep-brown-drift', 'rain-soft-shelter'].includes(t.id);
        if (lowerMsg.includes('focus') || lowerMsg.includes('study'))
          return ['focus-ambient-pulse', 'lofi-evening-study'].includes(t.id);
        return ['rain-soft-shelter', 'meditation-432-stillness'].includes(t.id);
      }).slice(0, 2);

      const title =
        existingConv?.title || (message.length > 42 ? `${message.slice(0, 42)}...` : message);

      if (!aiRes.aiAvailable) {
        const guidedReply = generateGuidedCompanionReply(
          message,
          priorMessages,
          {
            summaryText: contextSummary,
            latestStressScore,
            latestStressCategory,
            latestMood,
            latestMoodIntensity,
          },
          suggestedExercises,
          suggestedTracks
        );

        const updatedMessages = [
          ...priorMessages,
          { role: 'user', content: message, timestamp: new Date().toISOString() },
          {
            role: 'assistant',
            content: guidedReply,
            timestamp: new Date().toISOString(),
            provider: 'guided-wellness-engine',
            recommendedExerciseIds: suggestedExercises.map((e) => e.id),
            recommendedTrackIds: suggestedTracks.map((t) => t.id),
          },
        ];

        const savedConv = saveHistory
          ? await dbStore.saveConversation(userId, conversationId, title, updatedMessages)
          : null;

        return res.json({
          crisisDetected: false,
          aiAvailable: false,
          provider: 'guided-wellness-engine',
          error: aiRes.error,
          preservedInput: message,
          reply: guidedReply,
          fallbackGuidance: aiRes.error || 'Guided Wellness Mode is active while Ollama is unavailable.',
          recommendedExercises: suggestedExercises,
          recommendedTracks: suggestedTracks,
          conversation: savedConv,
        });
      }
      const updatedMessages = [
        ...priorMessages,
        { role: 'user', content: message, timestamp: new Date().toISOString() },
        {
          role: 'assistant',
          content: aiRes.reply,
          timestamp: new Date().toISOString(),
          recommendedExerciseIds: suggestedExercises.map((e) => e.id),
          recommendedTrackIds: suggestedTracks.map((t) => t.id),
        },
      ];

      const savedConv = saveHistory
        ? await dbStore.saveConversation(userId, conversationId, title, updatedMessages)
        : null;

      return res.json({
        crisisDetected: false,
        aiAvailable: true,
        provider: 'ollama',
        model: aiRes.model,
        reply: aiRes.reply,
        recommendedExercises: suggestedExercises,
        recommendedTracks: suggestedTracks,
        conversation: savedConv,
      });
    } catch {
      return res.status(500).json({ error: 'Unable to process AI companion request.' });
    }
  }
);

router.post('/analyze-stress', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const score = Number(req.body.score ?? 50);
    const category = req.body.category || 'Moderate';
    const breakdown = Array.isArray(req.body.breakdown) ? req.body.breakdown : [];
    const responses = req.body.responses || {};

    const aiRes = await ollamaService.analyzeStressAssessment({ score, category, breakdown, responses });
    if (!aiRes.aiAvailable) {
      const deterministic = calculateDeterministicStressScore({
        emotionalState: Number(responses.emotionalState || 3),
        stressCauses: Array.isArray(responses.stressCauses) ? responses.stressCauses : [],
        sleepQuality: Number(responses.sleepQuality || 3),
        mentalExhaustion: Number(responses.mentalExhaustion || 3),
        concentrationDifficulty: Number(responses.concentrationDifficulty || 3),
        workStudyPressure: Number(responses.workStudyPressure || 3),
        anxietyFrequency: Number(responses.anxietyFrequency || 3),
        energyLevel: Number(responses.energyLevel || 3),
      });
      return res.json({
        aiAvailable: false,
        error: aiRes.error,
        fallbackAnalysis: deterministic.deterministicRecommendations,
      });
    }

    return res.json({
      aiAvailable: true,
      model: aiRes.model,
      analysis: aiRes.analysis,
    });
  } catch {
    return res.status(500).json({ error: 'Failed to analyze stress assessment.' });
  }
});

router.post(
  '/analyze-journal',
  [
    body('mood').isString().notEmpty(),
    body('intensity').isInt({ min: 1, max: 10 }),
    body('journalText').isString().isLength({ min: 5, max: 5000 }).withMessage('Write at least a short journal entry to analyze.'),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { mood, intensity, note, journalText, emotionId } = req.body;
      const crisis = detectCrisisSignal(`${note || ''} ${journalText}`);
      if (crisis.isCrisis) {
        return res.json({
          crisisDetected: true,
          crisisResources: crisis.resources,
          aiAvailable: true,
          analysis: {
            keyThemes: ['Acute emotional distress'],
            empatheticReflection: crisis.guidanceMessage,
            gentleReframe: 'Reaching out to a trained human supporter right now is a courageous step.',
            suggestedNextStep: 'Call or text 988 (US/Canada) or contact local emergency services.',
          },
        });
      }

      const aiRes = await ollamaService.analyzeJournalEntry({ mood, intensity, note, journalText });
      if (!aiRes.aiAvailable) {
        const fallbackAnalysis = generateGuidedJournalReflection({
          mood,
          intensity,
          note,
          journalText,
        });
        if (emotionId) {
          await dbStore.updateEmotion(req.user!.userId, String(emotionId), {
            aiJournalAnalysis: fallbackAnalysis,
            aiProviderStatus: {
              provider: 'guided-wellness-engine',
              aiAvailable: false,
              error: aiRes.error || undefined,
            },
          });
        }
        return res.json({
          crisisDetected: false,
          aiAvailable: false,
          provider: 'guided-wellness-engine',
          error: aiRes.error,
          fallbackAnalysis,
        });
      }

      if (emotionId) {
        await dbStore.updateEmotion(req.user!.userId, String(emotionId), {
          aiJournalAnalysis: aiRes.analysis,
          aiProviderStatus: { provider: 'ollama', aiAvailable: true, model: aiRes.model },
        });
      }

      return res.json({
        crisisDetected: false,
        aiAvailable: true,
        model: aiRes.model,
        analysis: aiRes.analysis,
      });
    } catch {
      return res.status(500).json({ error: 'Failed to analyze journal entry.' });
    }
  }
);

router.post('/recommend-exercise', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const [stressList, emotions] = await Promise.all([
      dbStore.getStressHistory(userId, 1),
      dbStore.getEmotionHistory(userId, 1),
    ]);
    const wellnessState = {
      stressScore: stressList[0]?.deterministicScore ?? null,
      stressCategory: stressList[0]?.category ?? null,
      latestMood: emotions[0]?.mood ?? null,
    };

    const aiRes = await ollamaService.recommendExercises(wellnessState, EXERCISES_CATALOG);
    if (!aiRes.aiAvailable) {
      const fallback = EXERCISES_CATALOG.slice(0, 3);
      return res.json({
        aiAvailable: false,
        error: aiRes.error,
        exercises: fallback,
        rationale: 'Deterministic selection based on balanced breathing, posture reset, and mindfulness.',
      });
    }

    const exercises = EXERCISES_CATALOG.filter((e) => aiRes.recommendedIds.includes(e.id));
    return res.json({
      aiAvailable: true,
      model: aiRes.model,
      exercises,
      rationale: aiRes.rationale,
    });
  } catch {
    return res.status(500).json({ error: 'Failed to recommend exercises.' });
  }
});

router.post('/recommend-music', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const [stressList, emotions] = await Promise.all([
      dbStore.getStressHistory(userId, 1),
      dbStore.getEmotionHistory(userId, 1),
    ]);
    const wellnessState = {
      stressScore: stressList[0]?.deterministicScore ?? null,
      latestMood: emotions[0]?.mood ?? null,
    };

    const aiRes = await ollamaService.recommendMusic(wellnessState, MUSIC_CATALOG);
    if (!aiRes.aiAvailable) {
      const fallback = MUSIC_CATALOG.slice(0, 3);
      return res.json({
        aiAvailable: false,
        error: aiRes.error,
        tracks: fallback,
        rationale: 'Guided soundscape selection based on your latest wellness check-in.',
      });
    }

    const tracks = MUSIC_CATALOG.filter((t) => aiRes.recommendedIds.includes(t.id));
    return res.json({
      aiAvailable: true,
      model: aiRes.model,
      tracks,
      rationale: aiRes.rationale,
    });
  } catch {
    return res.status(500).json({ error: 'Failed to recommend music.' });
  }
});

export default router;
