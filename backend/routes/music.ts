import { Router } from 'express';
import type { Response } from 'express';
import { body } from 'express-validator';
import { authenticateToken, handleValidationErrors } from '../middleware/auth.ts';
import type { AuthenticatedRequest } from '../middleware/auth.ts';
import { MUSIC_CATALOG } from '../data/catalog.ts';
import { dbStore } from '../services/dataStore.ts';

const router = Router();

router.get('/', (_req, res: Response) => {
  return res.json({ tracks: MUSIC_CATALOG });
});

router.get('/recommendations', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [stressList, emotions] = await Promise.all([
      dbStore.getStressHistory(req.user!.userId, 1),
      dbStore.getEmotionHistory(req.user!.userId, 1),
    ]);
    const latestStress = stressList[0];
    const latestMood = emotions[0]?.mood || null;
    const score = latestStress?.deterministicScore ?? 40;

    let recommended = MUSIC_CATALOG.filter((track) => {
      if (latestMood && track.moodTags.includes(latestMood)) return true;
      if (score >= 60 && ['Rain', 'Sleep', 'Meditation', 'Relaxing'].includes(track.category)) return true;
      if (score >= 30 && score < 60 && ['Focus', 'Nature', 'Lo-fi'].includes(track.category)) return true;
      return score < 30 && ['Relaxing', 'Nature'].includes(track.category);
    });

    if (recommended.length < 3) {
      recommended = MUSIC_CATALOG.slice(0, 4);
    }

    return res.json({
      tracks: recommended.slice(0, 4),
      context: {
        latestStressScore: latestStress?.deterministicScore ?? null,
        latestMood,
      },
    });
  } catch {
    return res.status(500).json({ error: 'Failed to compute music recommendations.' });
  }
});

router.post(
  '/history',
  authenticateToken,
  [
    body('trackId').isString().notEmpty(),
    body('action').isIn(['play', 'favorite', 'unfavorite']),
    body('durationListened').optional().isNumeric(),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const track = MUSIC_CATALOG.find((t) => t.id === req.body.trackId);
      if (!track) {
        return res.status(404).json({ error: 'Track not found.' });
      }
      const record = await dbStore.recordMusicAction(req.user!.userId, {
        trackId: track.id,
        title: track.title,
        category: track.category,
        action: req.body.action,
        durationListened: Number(req.body.durationListened || 0),
      });
      return res.status(201).json({ record });
    } catch {
      return res.status(500).json({ error: 'Failed to save music activity.' });
    }
  }
);

router.get('/history', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const history = await dbStore.getMusicHistory(req.user!.userId, 100);
    const favoriteSet = new Set<string>();
    const ordered = [...history].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    for (const item of ordered) {
      if (item.action === 'favorite') favoriteSet.add(item.trackId);
      if (item.action === 'unfavorite') favoriteSet.delete(item.trackId);
    }
    const recentlyPlayedIds: string[] = [];
    for (const item of history) {
      if (item.action === 'play' && !recentlyPlayedIds.includes(item.trackId)) {
        recentlyPlayedIds.push(item.trackId);
      }
    }
    return res.json({
      history,
      favoriteTrackIds: Array.from(favoriteSet),
      recentlyPlayedIds: recentlyPlayedIds.slice(0, 8),
    });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch music history.' });
  }
});

export default router;
