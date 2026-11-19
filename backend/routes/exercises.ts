import { Router } from 'express';
import type { Response } from 'express';
import { body } from 'express-validator';
import { authenticateToken, handleValidationErrors } from '../middleware/auth.ts';
import type { AuthenticatedRequest } from '../middleware/auth.ts';
import { EXERCISES_CATALOG } from '../data/catalog.ts';
import { dbStore } from '../services/dataStore.ts';

const router = Router();

router.get('/', (_req, res: Response) => {
  return res.json({ exercises: EXERCISES_CATALOG });
});

router.post(
  '/session',
  authenticateToken,
  [
    body('exerciseId').isString().notEmpty().withMessage('Exercise ID is required.'),
    body('durationSeconds').isInt({ min: 1 }).withMessage('Valid duration is required.'),
    body('completedSeconds').isInt({ min: 0 }).withMessage('Completed seconds required.'),
    body('postureUsed').optional().isBoolean(),
    body('postureScore').optional({ nullable: true }).isFloat({ min: 0, max: 100 }),
    body('postureFeedbackSummary').optional().isString().isLength({ max: 500 }),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const exercise = EXERCISES_CATALOG.find((e) => e.id === req.body.exerciseId);
      if (!exercise) {
        return res.status(404).json({ error: 'Exercise not found in catalog.' });
      }
      const session = await dbStore.createExerciseSession(req.user!.userId, {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        category: exercise.category,
        durationSeconds: Number(req.body.durationSeconds),
        completedSeconds: Number(req.body.completedSeconds),
        postureUsed: Boolean(req.body.postureUsed),
        postureScore: req.body.postureScore !== null && req.body.postureScore !== undefined ? Math.round(Number(req.body.postureScore)) : null,
        postureFeedbackSummary: String(req.body.postureFeedbackSummary || ''),
        completed: req.body.completed !== false,
        isDemo: false,
      });
      return res.status(201).json({ session });
    } catch {
      return res.status(500).json({ error: 'Failed to save exercise session.' });
    }
  }
);

router.get('/history', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const history = await dbStore.getExerciseHistory(req.user!.userId, 50);
    return res.json({ history });
  } catch {
    return res.status(500).json({ error: 'Failed to load exercise history.' });
  }
});

export default router;
