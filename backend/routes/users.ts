import { Router } from 'express';
import type { Response } from 'express';
import { body } from 'express-validator';
import { authenticateToken, handleValidationErrors } from '../middleware/auth.ts';
import type { AuthenticatedRequest } from '../middleware/auth.ts';
import { dbStore, sanitizeUser } from '../services/dataStore.ts';

const router = Router();
router.use(authenticateToken);

router.get('/profile', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await dbStore.findUserById(req.user!.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    return res.json({ user: sanitizeUser(user) });
  } catch {
    return res.status(500).json({ error: 'Failed to load profile.' });
  }
});

router.put(
  '/profile',
  [
    body('name').optional().trim().isLength({ min: 2, max: 100 }),
    body('preferences').optional().isObject(),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updates: any = {};
      if (req.body.name) updates.name = req.body.name;
      if (req.body.preferences) updates.preferences = req.body.preferences;
      const updated = await dbStore.updateUser(req.user!.userId, updates);
      if (!updated) return res.status(404).json({ error: 'User not found.' });
      return res.json({ user: sanitizeUser(updated) });
    } catch {
      return res.status(500).json({ error: 'Failed to update profile.' });
    }
  }
);

router.get('/export', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const [user, stressAssessments, emotions, exerciseSessions, wellnessGoals, sleepEntries, musicHistory] =
      await Promise.all([
        dbStore.findUserById(userId),
        dbStore.getStressHistory(userId, 500),
        dbStore.getEmotionHistory(userId, 500),
        dbStore.getExerciseHistory(userId, 500),
        dbStore.getWellnessGoals(userId),
        dbStore.getSleepHistory(userId, 500),
        dbStore.getMusicHistory(userId, 500),
      ]);

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      platform: 'MindCare AI',
      user: sanitizeUser(user),
      stressAssessments,
      emotions,
      exerciseSessions,
      wellnessGoals,
      sleepEntries,
      musicHistory,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="mindcare-wellness-export.json"');
    return res.send(JSON.stringify(exportPayload, null, 2));
  } catch {
    return res.status(500).json({ error: 'Failed to export personal wellness data.' });
  }
});

router.delete('/data', async (req: AuthenticatedRequest, res: Response) => {
  try {
    await dbStore.deleteUserPersonalData(req.user!.userId);
    return res.json({ cleared: true, message: 'All personal wellness records have been deleted.' });
  } catch {
    return res.status(500).json({ error: 'Failed to delete personal records.' });
  }
});

router.delete('/account', async (req: AuthenticatedRequest, res: Response) => {
  try {
    await dbStore.deleteUserAccount(req.user!.userId);
    return res.json({ deleted: true, message: 'Your account and all associated wellness data have been deleted.' });
  } catch {
    return res.status(500).json({ error: 'Failed to delete account.' });
  }
});

export default router;
