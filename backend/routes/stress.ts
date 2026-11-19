import { Router } from 'express';
import type { Response } from 'express';
import { body } from 'express-validator';
import { authenticateToken, handleValidationErrors } from '../middleware/auth.ts';
import type { AuthenticatedRequest } from '../middleware/auth.ts';
import { dbStore } from '../services/dataStore.ts';
import { calculateDeterministicStressScore } from '../services/stressScoringEngine.ts';
import ollamaService from '../services/ollamaService.js';

const router = Router();
router.use(authenticateToken);

router.post(
  '/assessment',
  [
    body('emotionalState').isInt({ min: 1, max: 5 }).withMessage('Emotional state must be between 1 and 5.'),
    body('sleepQuality').isInt({ min: 1, max: 5 }).withMessage('Sleep quality must be between 1 and 5.'),
    body('mentalExhaustion').isInt({ min: 1, max: 5 }).withMessage('Mental exhaustion must be between 1 and 5.'),
    body('concentrationDifficulty').isInt({ min: 1, max: 5 }).withMessage('Concentration rating must be between 1 and 5.'),
    body('workStudyPressure').isInt({ min: 1, max: 5 }).withMessage('Work/study pressure must be between 1 and 5.'),
    body('anxietyFrequency').isInt({ min: 1, max: 5 }).withMessage('Anxiety frequency must be between 1 and 5.'),
    body('energyLevel').isInt({ min: 1, max: 5 }).withMessage('Energy level must be between 1 and 5.'),
    body('stressCauses').optional().isArray().withMessage('Stress causes must be an array.'),
    body('freeTextReflection').optional().isString().isLength({ max: 2000 }),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const responses = {
        emotionalState: Number(req.body.emotionalState),
        stressCauses: Array.isArray(req.body.stressCauses) ? req.body.stressCauses.map(String) : [],
        sleepQuality: Number(req.body.sleepQuality),
        mentalExhaustion: Number(req.body.mentalExhaustion),
        concentrationDifficulty: Number(req.body.concentrationDifficulty),
        workStudyPressure: Number(req.body.workStudyPressure),
        anxietyFrequency: Number(req.body.anxietyFrequency),
        energyLevel: Number(req.body.energyLevel),
        freeTextReflection: String(req.body.freeTextReflection || ''),
      };

      const deterministic = calculateDeterministicStressScore(responses);

      const aiResult = await ollamaService.analyzeStressAssessment({
        score: deterministic.score,
        category: deterministic.category,
        breakdown: deterministic.breakdown,
        responses,
      });

      const saved = await dbStore.createStressAssessment(req.user!.userId, {
        responses,
        deterministicScore: deterministic.score,
        category: deterministic.category,
        breakdown: deterministic.breakdown,
        aiAnalysis: aiResult.aiAvailable
          ? aiResult.analysis
          : {
              emotionalObservations: deterministic.deterministicRecommendations.observations,
              supportiveExplanation: deterministic.deterministicRecommendations.supportiveSummary,
              personalizedRecommendations: deterministic.deterministicRecommendations.actionPlan,
              actionPlan: deterministic.deterministicRecommendations.actionPlan,
            },
        aiProviderStatus: {
          provider: 'ollama',
          aiAvailable: aiResult.aiAvailable,
          model: aiResult.model,
          error: aiResult.error || '',
        },
        isDemo: false,
      });

      return res.status(201).json({
        assessment: saved,
        scoringRulesSummary: deterministic.scoringRulesSummary,
        recommendedExerciseIds: deterministic.deterministicRecommendations.recommendedExerciseIds,
        recommendedTrackIds: deterministic.deterministicRecommendations.recommendedTrackIds,
        disclaimer:
          'This score is a deterministic general wellness estimate and not a clinical or psychiatric diagnosis.',
      });
    } catch {
      return res.status(500).json({ error: 'Unable to save stress assessment.' });
    }
  }
);

router.get('/history', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const history = await dbStore.getStressHistory(req.user!.userId, 50);
    return res.json({ history });
  } catch {
    return res.status(500).json({ error: 'Failed to load stress assessment history.' });
  }
});

router.get('/latest', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const history = await dbStore.getStressHistory(req.user!.userId, 1);
    return res.json({ latest: history[0] || null });
  } catch {
    return res.status(500).json({ error: 'Failed to load latest stress assessment.' });
  }
});

export default router;
