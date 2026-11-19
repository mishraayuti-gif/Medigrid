import { Router } from 'express';
import type { Response } from 'express';
import { body } from 'express-validator';
import { authenticateToken, handleValidationErrors } from '../middleware/auth.ts';
import type { AuthenticatedRequest } from '../middleware/auth.ts';
import { dbStore } from '../services/dataStore.ts';

const router = Router();
router.use(authenticateToken);

router.get('/goals', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const goals = await dbStore.getWellnessGoals(req.user!.userId);
    return res.json({ goals });
  } catch {
    return res.status(500).json({ error: 'Failed to load wellness goals.' });
  }
});

router.post(
  '/goals',
  [
    body('title').trim().isLength({ min: 2, max: 140 }).withMessage('Goal title must be between 2 and 140 characters.'),
    body('category').isIn(['Mindfulness', 'Sleep', 'Movement', 'Journaling', 'Stress Relief']),
    body('targetValue').isInt({ min: 1, max: 100 }),
    body('unit').optional().isString().isLength({ max: 30 }),
    body('frequency').optional().isIn(['daily', 'weekly']),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const goal = await dbStore.createWellnessGoal(req.user!.userId, {
        title: req.body.title,
        category: req.body.category,
        targetValue: Number(req.body.targetValue),
        currentValue: Number(req.body.currentValue || 0),
        unit: String(req.body.unit || 'sessions'),
        frequency: req.body.frequency || 'daily',
        completedDates: [],
        active: true,
        isDemo: false,
      });
      return res.status(201).json({ goal });
    } catch {
      return res.status(500).json({ error: 'Failed to create wellness goal.' });
    }
  }
);

router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updates: any = {};
    if (req.body.title !== undefined) updates.title = String(req.body.title);
    if (req.body.currentValue !== undefined) updates.currentValue = Number(req.body.currentValue);
    if (req.body.targetValue !== undefined) updates.targetValue = Number(req.body.targetValue);
    if (req.body.active !== undefined) updates.active = Boolean(req.body.active);
    if (Array.isArray(req.body.completedDates)) updates.completedDates = req.body.completedDates;

    const updated = await dbStore.updateWellnessGoal(req.user!.userId, req.params.id, updates);
    if (!updated) return res.status(404).json({ error: 'Goal not found.' });
    return res.json({ goal: updated });
  } catch {
    return res.status(500).json({ error: 'Failed to update wellness goal.' });
  }
});

// Exact route required by prompt: PUT /api/wellness/goals/:id and DELETE /api/wellness/goals/:id
router.put('/goals/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updates: any = {};
    if (req.body.title !== undefined) updates.title = String(req.body.title);
    if (req.body.currentValue !== undefined) updates.currentValue = Number(req.body.currentValue);
    if (req.body.targetValue !== undefined) updates.targetValue = Number(req.body.targetValue);
    if (req.body.active !== undefined) updates.active = Boolean(req.body.active);
    if (Array.isArray(req.body.completedDates)) updates.completedDates = req.body.completedDates;

    const updated = await dbStore.updateWellnessGoal(req.user!.userId, req.params.id, updates);
    if (!updated) return res.status(404).json({ error: 'Goal not found.' });
    return res.json({ goal: updated });
  } catch {
    return res.status(500).json({ error: 'Failed to update wellness goal.' });
  }
});

router.delete('/goals/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const deleted = await dbStore.deleteWellnessGoal(req.user!.userId, req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Goal not found.' });
    return res.json({ deleted: true });
  } catch {
    return res.status(500).json({ error: 'Failed to delete wellness goal.' });
  }
});

router.get('/report', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const [stress, emotions, exercises, sleep, goals] = await Promise.all([
      dbStore.getStressHistory(userId, 30),
      dbStore.getEmotionHistory(userId, 30),
      dbStore.getExerciseHistory(userId, 30),
      dbStore.getSleepHistory(userId, 30),
      dbStore.getWellnessGoals(userId),
    ]);

    const avgStress =
      stress.length > 0
        ? Math.round(stress.reduce((s: number, a: any) => s + a.deterministicScore, 0) / stress.length)
        : null;
    const avgSleepHours =
      sleep.length > 0
        ? Math.round((sleep.reduce((s: number, e: any) => s + e.durationHours, 0) / sleep.length) * 10) / 10
        : null;
    const avgSleepQuality =
      sleep.length > 0
        ? Math.round((sleep.reduce((s: number, e: any) => s + e.qualityScore, 0) / sleep.length) * 10) / 10
        : null;

    const moodCounts: Record<string, number> = {};
    for (const e of emotions) {
      moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
    }

    const totalExerciseMinutes = Math.round(
      exercises.reduce((sum: number, s: any) => sum + Number(s.completedSeconds || 0), 0) / 60
    );

    return res.json({
      period: 'Last 30 Days',
      summary: {
        assessmentsCount: stress.length,
        avgStress,
        emotionsCount: emotions.length,
        moodDistribution: Object.entries(moodCounts).map(([mood, count]) => ({ mood, count })),
        exerciseSessionsCount: exercises.length,
        totalExerciseMinutes,
        sleepEntriesCount: sleep.length,
        avgSleepHours,
        avgSleepQuality,
        activeGoalsCount: goals.filter((g: any) => g.active !== false).length,
        goalsMetCount: goals.filter((g: any) => g.currentValue >= g.targetValue).length,
      },
    });
  } catch {
    return res.status(500).json({ error: 'Failed to generate wellness report.' });
  }
});

export default router;
