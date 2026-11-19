import { Router } from 'express';
import type { Response } from 'express';
import { authenticateToken } from '../middleware/auth.ts';
import type { AuthenticatedRequest } from '../middleware/auth.ts';
import { dbStore } from '../services/dataStore.ts';
import { MUSIC_CATALOG, EXERCISES_CATALOG } from '../data/catalog.ts';
import ollamaService from '../services/ollamaService.js';

const router = Router();
router.use(authenticateToken);

router.get('/summary', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const [stressHistory, emotions, exercises, goals, sleepEntries, musicHistory, ollamaHealth] =
      await Promise.all([
        dbStore.getStressHistory(userId, 14),
        dbStore.getEmotionHistory(userId, 14),
        dbStore.getExerciseHistory(userId, 20),
        dbStore.getWellnessGoals(userId),
        dbStore.getSleepHistory(userId, 14),
        dbStore.getMusicHistory(userId, 30),
        ollamaService.checkHealth(),
      ]);

    const latestStress = stressHistory[0] || null;
    const latestMood = emotions[0] || null;
    const latestSleep = sleepEntries[0] || null;

    const totalExerciseMinutes = Math.round(
      exercises.reduce((sum: number, s: any) => sum + Number(s.completedSeconds || 0), 0) / 60
    );

    const hasDemoRecords =
      stressHistory.some((s: any) => s.isDemo) ||
      emotions.some((e: any) => e.isDemo) ||
      sleepEntries.some((s: any) => s.isDemo);

    // Recommend 3 soundscapes based on latest mood/stress
    const score = latestStress?.deterministicScore ?? 35;
    const mood = latestMood?.mood ?? null;
    let musicRecommendations = MUSIC_CATALOG.filter((t) => {
      if (mood && t.moodTags.includes(mood)) return true;
      if (score >= 55 && ['Rain', 'Sleep', 'Meditation'].includes(t.category)) return true;
      return false;
    }).slice(0, 3);
    if (musicRecommendations.length < 3) {
      musicRecommendations = MUSIC_CATALOG.slice(0, 3);
    }

    const weeklyStressTrend = [...stressHistory]
      .reverse()
      .map((s: any) => ({
        date: new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        score: s.deterministicScore,
        category: s.category,
        isDemo: Boolean(s.isDemo),
      }));

    return res.json({
      hasDemoRecords,
      latestStress,
      latestMood,
      latestSleep,
      weeklyStressTrend,
      recentMoods: emotions.slice(0, 5),
      exerciseStats: {
        completedCount: exercises.length,
        totalMinutes: totalExerciseMinutes,
        recentSessions: exercises.slice(0, 4),
      },
      goals: goals.filter((g: any) => g.active !== false),
      musicRecommendations,
      recommendedExercises: EXERCISES_CATALOG.slice(0, 3),
      recentMusicCount: musicHistory.filter((m: any) => m.action === 'play').length,
      ollamaStatus: ollamaHealth,
    });
  } catch {
    return res.status(500).json({ error: 'Failed to compile dashboard summary.' });
  }
});

export default router;
