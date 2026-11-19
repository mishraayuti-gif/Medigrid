import { Router } from 'express';
import type { Response } from 'express';
import { body } from 'express-validator';
import { authenticateToken, handleValidationErrors } from '../middleware/auth.ts';
import type { AuthenticatedRequest } from '../middleware/auth.ts';
import { dbStore } from '../services/dataStore.ts';

const router = Router();
router.use(authenticateToken);

router.post(
  '/',
  [
    body('date').isString().notEmpty(),
    body('bedtime').isString().notEmpty(),
    body('wakeTime').isString().notEmpty(),
    body('durationHours').isFloat({ min: 0, max: 24 }).withMessage('Duration must be between 0 and 24 hours.'),
    body('qualityScore').isInt({ min: 1, max: 5 }).withMessage('Sleep quality must be between 1 and 5.'),
    body('awakenings').optional().isInt({ min: 0, max: 20 }),
    body('notes').optional().isString().isLength({ max: 500 }),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const entry = await dbStore.createSleepEntry(req.user!.userId, {
        date: String(req.body.date),
        bedtime: String(req.body.bedtime),
        wakeTime: String(req.body.wakeTime),
        durationHours: Number(req.body.durationHours),
        qualityScore: Number(req.body.qualityScore),
        awakenings: Number(req.body.awakenings || 0),
        notes: String(req.body.notes || ''),
        isDemo: false,
      });
      return res.status(201).json({ entry });
    } catch {
      return res.status(500).json({ error: 'Failed to log sleep entry.' });
    }
  }
);

router.get('/history', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const history = await dbStore.getSleepHistory(req.user!.userId, 60);
    return res.json({ history });
  } catch {
    return res.status(500).json({ error: 'Failed to load sleep diary.' });
  }
});

router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const deleted = await dbStore.deleteSleepEntry(req.user!.userId, req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Sleep entry not found.' });
    return res.json({ deleted: true });
  } catch {
    return res.status(500).json({ error: 'Failed to delete sleep entry.' });
  }
});

export default router;
