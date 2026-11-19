import { Router } from 'express';
import type { Response } from 'express';
import { body } from 'express-validator';
import { authenticateToken, handleValidationErrors } from '../middleware/auth.ts';
import type { AuthenticatedRequest } from '../middleware/auth.ts';
import { dbStore } from '../services/dataStore.ts';

const VALID_MOODS = ['Happy', 'Sad', 'Angry', 'Anxious', 'Calm', 'Tired', 'Excited', 'Confused', 'Lonely'];

const router = Router();
router.use(authenticateToken);

router.post(
  '/',
  [
    body('mood').isIn(VALID_MOODS).withMessage('Please select a valid emotion.'),
    body('intensity').isInt({ min: 1, max: 10 }).withMessage('Intensity must be between 1 and 10.'),
    body('note').optional().isString().isLength({ max: 500 }),
    body('journalText').optional().isString().isLength({ max: 5000 }),
    body('tags').optional().isArray(),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const entry = await dbStore.createEmotion(req.user!.userId, {
        mood: req.body.mood,
        intensity: Number(req.body.intensity),
        note: String(req.body.note || ''),
        journalText: String(req.body.journalText || ''),
        tags: Array.isArray(req.body.tags) ? req.body.tags.slice(0, 8).map(String) : [],
        aiJournalAnalysis: req.body.aiJournalAnalysis || null,
        aiProviderStatus: req.body.aiProviderStatus || null,
        isDemo: false,
      });
      return res.status(201).json({ entry });
    } catch {
      return res.status(500).json({ error: 'Failed to record emotion check-in.' });
    }
  }
);

router.get('/history', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const history = await dbStore.getEmotionHistory(req.user!.userId, 120);
    return res.json({ history });
  } catch {
    return res.status(500).json({ error: 'Failed to load emotion history.' });
  }
});

router.put(
  '/:id',
  [
    body('mood').optional().isIn(VALID_MOODS),
    body('intensity').optional().isInt({ min: 1, max: 10 }),
    body('note').optional().isString().isLength({ max: 500 }),
    body('journalText').optional().isString().isLength({ max: 5000 }),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updates: any = {};
      if (req.body.mood !== undefined) updates.mood = req.body.mood;
      if (req.body.intensity !== undefined) updates.intensity = Number(req.body.intensity);
      if (req.body.note !== undefined) updates.note = String(req.body.note);
      if (req.body.journalText !== undefined) updates.journalText = String(req.body.journalText);
      if (req.body.aiJournalAnalysis !== undefined) updates.aiJournalAnalysis = req.body.aiJournalAnalysis;
      if (req.body.aiProviderStatus !== undefined) updates.aiProviderStatus = req.body.aiProviderStatus;

      const updated = await dbStore.updateEmotion(req.user!.userId, req.params.id, updates);
      if (!updated) {
        return res.status(404).json({ error: 'Emotion entry not found.' });
      }
      return res.json({ entry: updated });
    } catch {
      return res.status(500).json({ error: 'Failed to update emotion entry.' });
    }
  }
);

router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const deleted = await dbStore.deleteEmotion(req.user!.userId, req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Emotion entry not found.' });
    }
    return res.json({ deleted: true });
  } catch {
    return res.status(500).json({ error: 'Failed to delete emotion entry.' });
  }
});

export default router;
