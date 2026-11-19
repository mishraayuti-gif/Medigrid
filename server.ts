import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { initDatabase, getStorageStatus } from './backend/services/dataStore.ts';
import { apiLimiter } from './backend/middleware/auth.ts';
import authRoutes from './backend/routes/auth.ts';
import stressRoutes from './backend/routes/stress.ts';
import emotionsRoutes from './backend/routes/emotions.ts';
import exercisesRoutes from './backend/routes/exercises.ts';
import musicRoutes from './backend/routes/music.ts';
import aiRoutes from './backend/routes/ai.ts';
import dashboardRoutes from './backend/routes/dashboard.ts';
import usersRoutes from './backend/routes/users.ts';
import wellnessRoutes from './backend/routes/wellness.ts';
import sleepRoutes from './backend/routes/sleep.ts';
import ollamaService from './backend/services/ollamaService.js';

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const dbStatus = await initDatabase();
  const app = express();
  app.set('trust proxy', 1);

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use('/api', apiLimiter);

  app.get('/api/health', async (_req, res) => {
    const ollama = await ollamaService.checkHealth();
    res.json({
      status: 'ok',
      service: 'MindCare AI',
      timestamp: new Date().toISOString(),
      database: getStorageStatus(),
      ollama,
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/stress', stressRoutes);
  app.use('/api/emotions', emotionsRoutes);
  app.use('/api/exercises', exercisesRoutes);
  app.use('/api/music', musicRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/wellness', wellnessRoutes);
  app.use('/api/sleep', sleepRoutes);

  // API 404 handler
  app.use('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MindCare AI server listening on http://localhost:${PORT} [${dbStatus.mode}]`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start MindCare AI server:', err);
  process.exit(1);
});
