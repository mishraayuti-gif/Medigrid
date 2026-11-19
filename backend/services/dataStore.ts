import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import {
  UserModel,
  StressAssessmentModel,
  EmotionModel,
  ExerciseSessionModel,
  MusicHistoryModel,
  WellnessGoalModel,
  SleepEntryModel,
  AIConversationModel,
} from '../models/schemas.ts';

export type StorageBackendMode = 'mongodb' | 'local-persisted';

interface LocalDbSchema {
  users: any[];
  stressAssessments: any[];
  emotions: any[];
  exerciseSessions: any[];
  musicHistory: any[];
  wellnessGoals: any[];
  sleepEntries: any[];
  aiConversations: any[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'mindcare-db.json');

let storageMode: StorageBackendMode = 'local-persisted';
let mongoConnectionError: string | null = null;
let localCache: LocalDbSchema | null = null;

function generateId(): string {
  return crypto.randomBytes(12).toString('hex');
}

function daysAgoIso(days: number, hour = 10): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 15, 0, 0);
  return d.toISOString();
}

function dateOnlyDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function createInitialSeedData(): LocalDbSchema {
  const demoUserId = '670000000000000000000001';
  const demoPasswordHash = bcrypt.hashSync('MindCareDemo2026!', 10);

  return {
    users: [
      {
        _id: demoUserId,
        name: 'Elena Vance (Demo)',
        email: 'demo@mindcare.ai',
        passwordHash: demoPasswordHash,
        role: 'demo',
        preferences: {
          theme: 'light',
          notifications: {
            dailyCheckIn: true,
            weeklyReport: true,
            exerciseReminder: true,
          },
          wellnessFocus: ['Stress Recovery', 'Restorative Sleep', 'Posture Mindfulness'],
        },
        createdAt: daysAgoIso(21),
        updatedAt: daysAgoIso(1),
      },
    ],
    stressAssessments: [
      {
        _id: generateId(),
        userId: demoUserId,
        responses: {
          emotionalState: 4,
          stressCauses: ['Work deadlines', 'Sleep disruption'],
          sleepQuality: 4,
          mentalExhaustion: 4,
          concentrationDifficulty: 3,
          workStudyPressure: 4,
          anxietyFrequency: 3,
          energyLevel: 4,
          freeTextReflection: 'Heavy sprint week with late evening screen time.',
        },
        deterministicScore: 68,
        category: 'High',
        breakdown: [
          { dimension: 'Emotional Load', score: 11, maxScore: 15, percentage: 75, note: 'Elevated emotional strain reported' },
          { dimension: 'Stressor Breadth', score: 4, maxScore: 10, percentage: 40, note: '2 active stressor area(s) selected' },
          { dimension: 'Sleep Deficit', score: 11, maxScore: 15, percentage: 75, note: 'Restorative sleep appears disrupted' },
          { dimension: 'Mental Exhaustion', score: 11, maxScore: 15, percentage: 75, note: 'Notable cognitive fatigue detected' },
          { dimension: 'Focus & Clarity', score: 6, maxScore: 12, percentage: 50, note: 'Concentration remains functional' },
          { dimension: 'Work / Study Pressure', score: 10, maxScore: 13, percentage: 75, note: 'High external demand load' },
          { dimension: 'Anxiety Frequency', score: 6, maxScore: 12, percentage: 50, note: 'Occasional or low anxious arousal' },
          { dimension: 'Energy Depletion', score: 6, maxScore: 8, percentage: 75, note: 'Low physical and mental vitality' },
        ],
        aiAnalysis: {
          emotionalObservations: [
            'High workload combined with disrupted sleep is amplifying cognitive exhaustion.',
            'Concentration remains intact, suggesting resilience when recovery breaks are scheduled.',
          ],
          supportiveExplanation:
            'This demonstration baseline reflects a demanding work week where evening wind-down routines can rapidly improve next-day recovery.',
          personalizedRecommendations: [
            'Schedule a 4-minute 4-7-8 breathing pause after closing your laptop.',
            'Dim screen brightness 45 minutes before sleep and use Soft Rain on Glass.',
          ],
          actionPlan: [
            'Step away from work at a defined cutoff hour tonight.',
            'Complete one Neck & Shoulder Desk Release session.',
          ],
        },
        aiProviderStatus: { provider: 'seed-demo', aiAvailable: false, model: 'demo-baseline', error: '' },
        isDemo: true,
        createdAt: daysAgoIso(6, 18),
        updatedAt: daysAgoIso(6, 18),
      },
      {
        _id: generateId(),
        userId: demoUserId,
        responses: {
          emotionalState: 3,
          stressCauses: ['Work deadlines'],
          sleepQuality: 3,
          mentalExhaustion: 3,
          concentrationDifficulty: 2,
          workStudyPressure: 3,
          anxietyFrequency: 2,
          energyLevel: 3,
          freeTextReflection: 'Feeling steadier after two better nights of sleep.',
        },
        deterministicScore: 44,
        category: 'Moderate',
        breakdown: [
          { dimension: 'Emotional Load', score: 8, maxScore: 15, percentage: 50, note: 'Within manageable emotional range' },
          { dimension: 'Stressor Breadth', score: 2, maxScore: 10, percentage: 20, note: '1 active stressor area(s) selected' },
          { dimension: 'Sleep Deficit', score: 8, maxScore: 15, percentage: 50, note: 'Sleep quality is moderate to steady' },
          { dimension: 'Mental Exhaustion', score: 8, maxScore: 15, percentage: 50, note: 'Mental reserves are holding steady' },
          { dimension: 'Focus & Clarity', score: 3, maxScore: 12, percentage: 25, note: 'Concentration remains functional' },
          { dimension: 'Work / Study Pressure', score: 7, maxScore: 13, percentage: 50, note: 'Workload pressure feels balanced' },
          { dimension: 'Anxiety Frequency', score: 3, maxScore: 12, percentage: 25, note: 'Occasional or low anxious arousal' },
          { dimension: 'Energy Depletion', score: 4, maxScore: 8, percentage: 50, note: 'Adequate daily energy baseline' },
        ],
        aiAnalysis: {
          emotionalObservations: ['Steady improvement in focus and emotional balance compared to earlier in the week.'],
          supportiveExplanation: 'Demonstration check-in showing moderate, manageable daily pressure.',
          personalizedRecommendations: ['Keep consistent morning sunlight and brief mid-afternoon stretch breaks.'],
          actionPlan: ['Maintain 7.5+ hours sleep target tonight.'],
        },
        aiProviderStatus: { provider: 'seed-demo', aiAvailable: false, model: 'demo-baseline', error: '' },
        isDemo: true,
        createdAt: daysAgoIso(3, 14),
        updatedAt: daysAgoIso(3, 14),
      },
      {
        _id: generateId(),
        userId: demoUserId,
        responses: {
          emotionalState: 2,
          stressCauses: ['Upcoming travel'],
          sleepQuality: 2,
          mentalExhaustion: 2,
          concentrationDifficulty: 2,
          workStudyPressure: 3,
          anxietyFrequency: 2,
          energyLevel: 2,
          freeTextReflection: 'Morning breathwork helped set a calm pace.',
        },
        deterministicScore: 31,
        category: 'Moderate',
        breakdown: [
          { dimension: 'Emotional Load', score: 4, maxScore: 15, percentage: 25, note: 'Within manageable emotional range' },
          { dimension: 'Stressor Breadth', score: 2, maxScore: 10, percentage: 20, note: '1 active stressor area(s) selected' },
          { dimension: 'Sleep Deficit', score: 4, maxScore: 15, percentage: 25, note: 'Sleep quality is moderate to steady' },
          { dimension: 'Mental Exhaustion', score: 4, maxScore: 15, percentage: 25, note: 'Mental reserves are holding steady' },
          { dimension: 'Focus & Clarity', score: 3, maxScore: 12, percentage: 25, note: 'Concentration remains functional' },
          { dimension: 'Work / Study Pressure', score: 7, maxScore: 13, percentage: 50, note: 'Workload pressure feels balanced' },
          { dimension: 'Anxiety Frequency', score: 3, maxScore: 12, percentage: 25, note: 'Occasional or low anxious arousal' },
          { dimension: 'Energy Depletion', score: 2, maxScore: 8, percentage: 25, note: 'Adequate daily energy baseline' },
        ],
        aiAnalysis: {
          emotionalObservations: ['Stress load decreased notably as sleep and morning habits stabilized.'],
          supportiveExplanation: 'Demonstration check-in showing low-to-moderate strain with strong recovery momentum.',
          personalizedRecommendations: ['Continue brief box breathing prior to deep focus sessions.'],
          actionPlan: ['Log an evening gratitude note in your emotion journal.'],
        },
        aiProviderStatus: { provider: 'seed-demo', aiAvailable: false, model: 'demo-baseline', error: '' },
        isDemo: true,
        createdAt: daysAgoIso(1, 9),
        updatedAt: daysAgoIso(1, 9),
      },
    ],
    emotions: [
      {
        _id: generateId(),
        userId: demoUserId,
        mood: 'Anxious',
        intensity: 6,
        note: 'Pre-presentation tightness in shoulders',
        journalText: 'Noticed my breathing getting shallow before the afternoon review. Took four minutes of 4-7-8 breathing and felt steadier.',
        tags: ['work', 'breathing'],
        aiJournalAnalysis: null,
        isDemo: true,
        createdAt: daysAgoIso(5, 13),
        updatedAt: daysAgoIso(5, 13),
      },
      {
        _id: generateId(),
        userId: demoUserId,
        mood: 'Tired',
        intensity: 5,
        note: 'Low afternoon energy',
        journalText: 'Slept slightly later than planned. Neck release stretch helped restore focus without another coffee.',
        tags: ['sleep', 'posture'],
        aiJournalAnalysis: null,
        isDemo: true,
        createdAt: daysAgoIso(3, 16),
        updatedAt: daysAgoIso(3, 16),
      },
      {
        _id: generateId(),
        userId: demoUserId,
        mood: 'Calm',
        intensity: 8,
        note: 'Quiet morning walk and clear focus',
        journalText: 'Woke up rested after 7.5 hours of sleep. Rain soundscape last night made winding down effortless.',
        tags: ['morning', 'rested'],
        aiJournalAnalysis: null,
        isDemo: true,
        createdAt: daysAgoIso(1, 8),
        updatedAt: daysAgoIso(1, 8),
      },
    ],
    exerciseSessions: [
      {
        _id: generateId(),
        userId: demoUserId,
        exerciseId: 'breath-478',
        exerciseName: '4-7-8 Calming Breath',
        category: 'Breathing',
        durationSeconds: 240,
        completedSeconds: 240,
        postureUsed: false,
        postureScore: null,
        postureFeedbackSummary: '',
        completed: true,
        isDemo: true,
        createdAt: daysAgoIso(4, 21),
      },
      {
        _id: generateId(),
        userId: demoUserId,
        exerciseId: 'neck-shoulder-release',
        exerciseName: 'Neck & Shoulder Desk Release',
        category: 'Neck & Shoulder',
        durationSeconds: 240,
        completedSeconds: 240,
        postureUsed: true,
        postureScore: 89,
        postureFeedbackSummary: 'Balanced shoulder alignment maintained across 89% of active posture frames.',
        completed: true,
        isDemo: true,
        createdAt: daysAgoIso(2, 15),
      },
    ],
    musicHistory: [
      {
        _id: generateId(),
        userId: demoUserId,
        trackId: 'rain-soft-shelter',
        title: 'Soft Rain on Glass',
        category: 'Rain',
        action: 'favorite',
        durationListened: 0,
        createdAt: daysAgoIso(3, 22),
      },
      {
        _id: generateId(),
        userId: demoUserId,
        trackId: 'rain-soft-shelter',
        title: 'Soft Rain on Glass',
        category: 'Rain',
        action: 'play',
        durationListened: 420,
        createdAt: daysAgoIso(1, 22),
      },
      {
        _id: generateId(),
        userId: demoUserId,
        trackId: 'focus-ambient-pulse',
        title: 'Clear Horizon Focus Tone',
        category: 'Focus',
        action: 'play',
        durationListened: 300,
        createdAt: daysAgoIso(1, 11),
      },
    ],
    wellnessGoals: [
      {
        _id: generateId(),
        userId: demoUserId,
        title: 'Daily 4-Minute Guided Breathing',
        category: 'Mindfulness',
        targetValue: 1,
        currentValue: 1,
        unit: 'session',
        frequency: 'daily',
        completedDates: [dateOnlyDaysAgo(1)],
        active: true,
        isDemo: true,
        createdAt: daysAgoIso(10),
        updatedAt: daysAgoIso(1),
      },
      {
        _id: generateId(),
        userId: demoUserId,
        title: 'Consistent 7.5h Sleep Window',
        category: 'Sleep',
        targetValue: 5,
        currentValue: 3,
        unit: 'nights',
        frequency: 'weekly',
        completedDates: [dateOnlyDaysAgo(3), dateOnlyDaysAgo(2), dateOnlyDaysAgo(1)],
        active: true,
        isDemo: true,
        createdAt: daysAgoIso(10),
        updatedAt: daysAgoIso(1),
      },
      {
        _id: generateId(),
        userId: demoUserId,
        title: 'Desk Posture & Neck Reset',
        category: 'Movement',
        targetValue: 3,
        currentValue: 2,
        unit: 'sessions',
        frequency: 'weekly',
        completedDates: [dateOnlyDaysAgo(4), dateOnlyDaysAgo(2)],
        active: true,
        isDemo: true,
        createdAt: daysAgoIso(8),
        updatedAt: daysAgoIso(2),
      },
    ],
    sleepEntries: [
      {
        _id: generateId(),
        userId: demoUserId,
        date: dateOnlyDaysAgo(5),
        bedtime: '23:45',
        wakeTime: '06:15',
        durationHours: 6.5,
        qualityScore: 3,
        awakenings: 2,
        notes: 'Woke once checking phone notifications.',
        isDemo: true,
        createdAt: daysAgoIso(5, 7),
      },
      {
        _id: generateId(),
        userId: demoUserId,
        date: dateOnlyDaysAgo(3),
        bedtime: '23:00',
        wakeTime: '06:30',
        durationHours: 7.5,
        qualityScore: 4,
        awakenings: 1,
        notes: 'Used rain soundscape before bed.',
        isDemo: true,
        createdAt: daysAgoIso(3, 7),
      },
      {
        _id: generateId(),
        userId: demoUserId,
        date: dateOnlyDaysAgo(1),
        bedtime: '22:45',
        wakeTime: '06:30',
        durationHours: 7.75,
        qualityScore: 5,
        awakenings: 0,
        notes: 'Deep uninterrupted rest.',
        isDemo: true,
        createdAt: daysAgoIso(1, 7),
      },
    ],
    aiConversations: [],
  };
}

function loadLocalStore(): LocalDbSchema {
  if (localCache) return localCache;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      localCache = JSON.parse(raw);
      return localCache!;
    }
  } catch (err) {
    console.warn('Could not read local MindCare store, initializing fresh seed:', err);
  }
  localCache = createInitialSeedData();
  saveLocalStore();
  return localCache;
}

function saveLocalStore(): void {
  if (!localCache) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(localCache, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist local MindCare store:', err);
  }
}

function sanitizeMongoUri(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/^['"]|['"]$/g, '');
  const match = trimmed.match(/mongodb(?:\+srv)?:\/\/[^\s'"]+/i);
  if (match?.[0]) {
    return match[0];
  }
  return null;
}

export async function initDatabase(): Promise<{ mode: StorageBackendMode; detail: string }> {
  const rawMongoUri = process.env.MONGODB_URI;
  const mongoUri = sanitizeMongoUri(rawMongoUri);
  if (rawMongoUri && rawMongoUri.trim() !== '' && !mongoUri) {
    mongoConnectionError =
      'MONGODB_URI does not contain a valid mongodb:// or mongodb+srv:// connection string. Using local persisted store.';
    console.warn(mongoConnectionError);
  }
  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2500 });
      storageMode = 'mongodb';
      mongoConnectionError = null;
      await ensureDemoUserInMongo();
      return { mode: 'mongodb', detail: 'Connected to MongoDB via Mongoose' };
    } catch (err: any) {
      mongoConnectionError = err?.message || 'MongoDB unreachable';
      console.warn(
        `MongoDB connection unavailable (${mongoConnectionError}). Using local persisted JSON database at data/mindcare-db.json.`
      );
    }
  }
  storageMode = 'local-persisted';
  loadLocalStore();
  return {
    mode: 'local-persisted',
    detail: mongoConnectionError
      ? `Local persisted store active (MongoDB fallback: ${mongoConnectionError})`
      : 'Local persisted store active',
  };
}

async function ensureDemoUserInMongo() {
  const existing = await UserModel.findOne({ email: 'demo@mindcare.ai' });
  if (existing) return;
  const seed = createInitialSeedData();
  const demoUser = seed.users[0];
  const createdUser = await UserModel.create({
    _id: demoUser._id,
    name: demoUser.name,
    email: demoUser.email,
    passwordHash: demoUser.passwordHash,
    role: demoUser.role,
    preferences: demoUser.preferences,
  });
  const uid = createdUser._id;
  await StressAssessmentModel.insertMany(seed.stressAssessments.map((s) => ({ ...s, _id: undefined, userId: uid })));
  await EmotionModel.insertMany(seed.emotions.map((e) => ({ ...e, _id: undefined, userId: uid })));
  await ExerciseSessionModel.insertMany(seed.exerciseSessions.map((x) => ({ ...x, _id: undefined, userId: uid })));
  await MusicHistoryModel.insertMany(seed.musicHistory.map((m) => ({ ...m, _id: undefined, userId: uid })));
  await WellnessGoalModel.insertMany(seed.wellnessGoals.map((g) => ({ ...g, _id: undefined, userId: uid })));
  await SleepEntryModel.insertMany(seed.sleepEntries.map((s) => ({ ...s, _id: undefined, userId: uid })));
}

export function getStorageStatus() {
  return {
    mode: storageMode,
    mongoError: mongoConnectionError,
  };
}

export function sanitizeUser(user: any) {
  if (!user) return null;
  const obj = typeof user.toObject === 'function' ? user.toObject() : { ...user };
  delete obj.passwordHash;
  delete obj.resetToken;
  delete obj.resetTokenExpiry;
  return {
    id: String(obj._id || obj.id),
    name: obj.name,
    email: obj.email,
    role: obj.role || 'user',
    preferences: obj.preferences || {
      theme: 'light',
      notifications: { dailyCheckIn: true, weeklyReport: true, exerciseReminder: false },
      wellnessFocus: ['Stress Management'],
    },
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

function normalizeDoc(doc: any) {
  if (!doc) return null;
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  return { ...obj, id: String(obj._id || obj.id) };
}

export const dbStore = {
  // USERS
  async findUserByEmail(email: string, includeSecret = false) {
    const cleanEmail = email.toLowerCase().trim();
    if (storageMode === 'mongodb') {
      const q = UserModel.findOne({ email: cleanEmail });
      if (includeSecret) q.select('+passwordHash +resetToken +resetTokenExpiry');
      const doc = await q.exec();
      return doc ? normalizeDoc(doc) : null;
    }
    const store = loadLocalStore();
    const user = store.users.find((u) => u.email === cleanEmail);
    return user ? { ...user, id: String(user._id) } : null;
  },

  async findUserById(userId: string) {
    if (storageMode === 'mongodb') {
      const doc = await UserModel.findById(userId).exec();
      return doc ? normalizeDoc(doc) : null;
    }
    const store = loadLocalStore();
    const user = store.users.find((u) => String(u._id) === String(userId));
    return user ? { ...user, id: String(user._id) } : null;
  },

  async createUser(data: { name: string; email: string; passwordHash: string }) {
    const now = new Date().toISOString();
    if (storageMode === 'mongodb') {
      const doc = await UserModel.create({
        name: data.name,
        email: data.email.toLowerCase().trim(),
        passwordHash: data.passwordHash,
        role: 'user',
      });
      return normalizeDoc(doc);
    }
    const store = loadLocalStore();
    const user = {
      _id: generateId(),
      name: data.name,
      email: data.email.toLowerCase().trim(),
      passwordHash: data.passwordHash,
      role: 'user',
      preferences: {
        theme: 'light',
        notifications: { dailyCheckIn: true, weeklyReport: true, exerciseReminder: false },
        wellnessFocus: ['Stress Management', 'Mindful Breathing'],
      },
      createdAt: now,
      updatedAt: now,
    };
    store.users.push(user);
    saveLocalStore();
    return { ...user, id: String(user._id) };
  },

  async updateUser(userId: string, updates: any) {
    if (storageMode === 'mongodb') {
      const doc = await UserModel.findByIdAndUpdate(userId, { $set: updates }, { new: true }).exec();
      return doc ? normalizeDoc(doc) : null;
    }
    const store = loadLocalStore();
    const idx = store.users.findIndex((u) => String(u._id) === String(userId));
    if (idx === -1) return null;
    store.users[idx] = {
      ...store.users[idx],
      ...updates,
      preferences: updates.preferences
        ? { ...store.users[idx].preferences, ...updates.preferences }
        : store.users[idx].preferences,
      updatedAt: new Date().toISOString(),
    };
    saveLocalStore();
    return { ...store.users[idx], id: String(store.users[idx]._id) };
  },

  async deleteUserPersonalData(userId: string) {
    if (storageMode === 'mongodb') {
      await Promise.all([
        StressAssessmentModel.deleteMany({ userId }),
        EmotionModel.deleteMany({ userId }),
        ExerciseSessionModel.deleteMany({ userId }),
        MusicHistoryModel.deleteMany({ userId }),
        WellnessGoalModel.deleteMany({ userId }),
        SleepEntryModel.deleteMany({ userId }),
        AIConversationModel.deleteMany({ userId }),
      ]);
      return;
    }
    const store = loadLocalStore();
    const uid = String(userId);
    store.stressAssessments = store.stressAssessments.filter((x) => String(x.userId) !== uid);
    store.emotions = store.emotions.filter((x) => String(x.userId) !== uid);
    store.exerciseSessions = store.exerciseSessions.filter((x) => String(x.userId) !== uid);
    store.musicHistory = store.musicHistory.filter((x) => String(x.userId) !== uid);
    store.wellnessGoals = store.wellnessGoals.filter((x) => String(x.userId) !== uid);
    store.sleepEntries = store.sleepEntries.filter((x) => String(x.userId) !== uid);
    store.aiConversations = store.aiConversations.filter((x) => String(x.userId) !== uid);
    saveLocalStore();
  },

  async deleteUserAccount(userId: string) {
    await this.deleteUserPersonalData(userId);
    if (storageMode === 'mongodb') {
      await UserModel.findByIdAndDelete(userId).exec();
      return;
    }
    const store = loadLocalStore();
    store.users = store.users.filter((u) => String(u._id) !== String(userId));
    saveLocalStore();
  },

  // STRESS ASSESSMENTS
  async createStressAssessment(userId: string, payload: any) {
    const now = new Date().toISOString();
    if (storageMode === 'mongodb') {
      const doc = await StressAssessmentModel.create({ ...payload, userId });
      return normalizeDoc(doc);
    }
    const store = loadLocalStore();
    const record = { _id: generateId(), userId: String(userId), ...payload, createdAt: now, updatedAt: now };
    store.stressAssessments.unshift(record);
    saveLocalStore();
    return { ...record, id: record._id };
  },

  async getStressHistory(userId: string, limit = 30) {
    if (storageMode === 'mongodb') {
      const docs = await StressAssessmentModel.find({ userId }).sort({ createdAt: -1 }).limit(limit).exec();
      return docs.map(normalizeDoc);
    }
    const store = loadLocalStore();
    return store.stressAssessments
      .filter((x) => String(x.userId) === String(userId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit)
      .map((x) => ({ ...x, id: String(x._id) }));
  },

  // EMOTIONS
  async createEmotion(userId: string, payload: any) {
    const now = new Date().toISOString();
    if (storageMode === 'mongodb') {
      const doc = await EmotionModel.create({ ...payload, userId });
      return normalizeDoc(doc);
    }
    const store = loadLocalStore();
    const record = { _id: generateId(), userId: String(userId), ...payload, createdAt: now, updatedAt: now };
    store.emotions.unshift(record);
    saveLocalStore();
    return { ...record, id: record._id };
  },

  async getEmotionHistory(userId: string, limit = 100) {
    if (storageMode === 'mongodb') {
      const docs = await EmotionModel.find({ userId }).sort({ createdAt: -1 }).limit(limit).exec();
      return docs.map(normalizeDoc);
    }
    const store = loadLocalStore();
    return store.emotions
      .filter((x) => String(x.userId) === String(userId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit)
      .map((x) => ({ ...x, id: String(x._id) }));
  },

  async updateEmotion(userId: string, id: string, updates: any) {
    if (storageMode === 'mongodb') {
      const doc = await EmotionModel.findOneAndUpdate({ _id: id, userId }, { $set: updates }, { new: true }).exec();
      return doc ? normalizeDoc(doc) : null;
    }
    const store = loadLocalStore();
    const idx = store.emotions.findIndex((x) => String(x._id) === String(id) && String(x.userId) === String(userId));
    if (idx === -1) return null;
    store.emotions[idx] = { ...store.emotions[idx], ...updates, updatedAt: new Date().toISOString() };
    saveLocalStore();
    return { ...store.emotions[idx], id: String(store.emotions[idx]._id) };
  },

  async deleteEmotion(userId: string, id: string) {
    if (storageMode === 'mongodb') {
      const doc = await EmotionModel.findOneAndDelete({ _id: id, userId }).exec();
      return Boolean(doc);
    }
    const store = loadLocalStore();
    const before = store.emotions.length;
    store.emotions = store.emotions.filter((x) => !(String(x._id) === String(id) && String(x.userId) === String(userId)));
    if (store.emotions.length !== before) {
      saveLocalStore();
      return true;
    }
    return false;
  },

  // EXERCISE SESSIONS
  async createExerciseSession(userId: string, payload: any) {
    const now = new Date().toISOString();
    if (storageMode === 'mongodb') {
      const doc = await ExerciseSessionModel.create({ ...payload, userId });
      return normalizeDoc(doc);
    }
    const store = loadLocalStore();
    const record = { _id: generateId(), userId: String(userId), ...payload, createdAt: now, updatedAt: now };
    store.exerciseSessions.unshift(record);
    saveLocalStore();
    return { ...record, id: record._id };
  },

  async getExerciseHistory(userId: string, limit = 50) {
    if (storageMode === 'mongodb') {
      const docs = await ExerciseSessionModel.find({ userId }).sort({ createdAt: -1 }).limit(limit).exec();
      return docs.map(normalizeDoc);
    }
    const store = loadLocalStore();
    return store.exerciseSessions
      .filter((x) => String(x.userId) === String(userId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit)
      .map((x) => ({ ...x, id: String(x._id) }));
  },

  // MUSIC HISTORY
  async recordMusicAction(userId: string, payload: any) {
    const now = new Date().toISOString();
    if (storageMode === 'mongodb') {
      const doc = await MusicHistoryModel.create({ ...payload, userId });
      return normalizeDoc(doc);
    }
    const store = loadLocalStore();
    const record = { _id: generateId(), userId: String(userId), ...payload, createdAt: now, updatedAt: now };
    store.musicHistory.unshift(record);
    saveLocalStore();
    return { ...record, id: record._id };
  },

  async getMusicHistory(userId: string, limit = 100) {
    if (storageMode === 'mongodb') {
      const docs = await MusicHistoryModel.find({ userId }).sort({ createdAt: -1 }).limit(limit).exec();
      return docs.map(normalizeDoc);
    }
    const store = loadLocalStore();
    return store.musicHistory
      .filter((x) => String(x.userId) === String(userId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit)
      .map((x) => ({ ...x, id: String(x._id) }));
  },

  // WELLNESS GOALS
  async getWellnessGoals(userId: string) {
    if (storageMode === 'mongodb') {
      const docs = await WellnessGoalModel.find({ userId }).sort({ createdAt: -1 }).exec();
      return docs.map(normalizeDoc);
    }
    const store = loadLocalStore();
    return store.wellnessGoals
      .filter((x) => String(x.userId) === String(userId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((x) => ({ ...x, id: String(x._id) }));
  },

  async createWellnessGoal(userId: string, payload: any) {
    const now = new Date().toISOString();
    if (storageMode === 'mongodb') {
      const doc = await WellnessGoalModel.create({ ...payload, userId });
      return normalizeDoc(doc);
    }
    const store = loadLocalStore();
    const record = {
      _id: generateId(),
      userId: String(userId),
      completedDates: [],
      active: true,
      currentValue: 0,
      ...payload,
      createdAt: now,
      updatedAt: now,
    };
    store.wellnessGoals.unshift(record);
    saveLocalStore();
    return { ...record, id: record._id };
  },

  async updateWellnessGoal(userId: string, id: string, updates: any) {
    if (storageMode === 'mongodb') {
      const doc = await WellnessGoalModel.findOneAndUpdate({ _id: id, userId }, { $set: updates }, { new: true }).exec();
      return doc ? normalizeDoc(doc) : null;
    }
    const store = loadLocalStore();
    const idx = store.wellnessGoals.findIndex((x) => String(x._id) === String(id) && String(x.userId) === String(userId));
    if (idx === -1) return null;
    store.wellnessGoals[idx] = { ...store.wellnessGoals[idx], ...updates, updatedAt: new Date().toISOString() };
    saveLocalStore();
    return { ...store.wellnessGoals[idx], id: String(store.wellnessGoals[idx]._id) };
  },

  async deleteWellnessGoal(userId: string, id: string) {
    if (storageMode === 'mongodb') {
      const doc = await WellnessGoalModel.findOneAndDelete({ _id: id, userId }).exec();
      return Boolean(doc);
    }
    const store = loadLocalStore();
    const before = store.wellnessGoals.length;
    store.wellnessGoals = store.wellnessGoals.filter((x) => !(String(x._id) === String(id) && String(x.userId) === String(userId)));
    if (store.wellnessGoals.length !== before) {
      saveLocalStore();
      return true;
    }
    return false;
  },

  // SLEEP ENTRIES
  async createSleepEntry(userId: string, payload: any) {
    const now = new Date().toISOString();
    if (storageMode === 'mongodb') {
      const doc = await SleepEntryModel.create({ ...payload, userId });
      return normalizeDoc(doc);
    }
    const store = loadLocalStore();
    const record = { _id: generateId(), userId: String(userId), ...payload, createdAt: now, updatedAt: now };
    store.sleepEntries.unshift(record);
    saveLocalStore();
    return { ...record, id: record._id };
  },

  async getSleepHistory(userId: string, limit = 60) {
    if (storageMode === 'mongodb') {
      const docs = await SleepEntryModel.find({ userId }).sort({ date: -1, createdAt: -1 }).limit(limit).exec();
      return docs.map(normalizeDoc);
    }
    const store = loadLocalStore();
    return store.sleepEntries
      .filter((x) => String(x.userId) === String(userId))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, limit)
      .map((x) => ({ ...x, id: String(x._id) }));
  },

  async deleteSleepEntry(userId: string, id: string) {
    if (storageMode === 'mongodb') {
      const doc = await SleepEntryModel.findOneAndDelete({ _id: id, userId }).exec();
      return Boolean(doc);
    }
    const store = loadLocalStore();
    const before = store.sleepEntries.length;
    store.sleepEntries = store.sleepEntries.filter((x) => !(String(x._id) === String(id) && String(x.userId) === String(userId)));
    if (store.sleepEntries.length !== before) {
      saveLocalStore();
      return true;
    }
    return false;
  },

  // AI CONVERSATIONS
  async getConversations(userId: string) {
    if (storageMode === 'mongodb') {
      const docs = await AIConversationModel.find({ userId }).sort({ updatedAt: -1 }).limit(20).exec();
      return docs.map(normalizeDoc);
    }
    const store = loadLocalStore();
    return store.aiConversations
      .filter((x) => String(x.userId) === String(userId))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 20)
      .map((x) => ({ ...x, id: String(x._id) }));
  },

  async getConversationById(userId: string, id: string) {
    if (storageMode === 'mongodb') {
      const doc = await AIConversationModel.findOne({ _id: id, userId }).exec();
      return doc ? normalizeDoc(doc) : null;
    }
    const store = loadLocalStore();
    const conv = store.aiConversations.find((x) => String(x._id) === String(id) && String(x.userId) === String(userId));
    return conv ? { ...conv, id: String(conv._id) } : null;
  },

  async saveConversation(userId: string, conversationId: string | null, title: string, messages: any[]) {
    const now = new Date().toISOString();
    if (storageMode === 'mongodb') {
      if (conversationId) {
        const updated = await AIConversationModel.findOneAndUpdate(
          { _id: conversationId, userId },
          { $set: { messages, title } },
          { new: true }
        ).exec();
        if (updated) return normalizeDoc(updated);
      }
      const created = await AIConversationModel.create({ userId, title, messages });
      return normalizeDoc(created);
    }
    const store = loadLocalStore();
    if (conversationId) {
      const idx = store.aiConversations.findIndex(
        (x) => String(x._id) === String(conversationId) && String(x.userId) === String(userId)
      );
      if (idx !== -1) {
        store.aiConversations[idx] = { ...store.aiConversations[idx], title, messages, updatedAt: now };
        saveLocalStore();
        return { ...store.aiConversations[idx], id: String(store.aiConversations[idx]._id) };
      }
    }
    const record = { _id: generateId(), userId: String(userId), title, contextEnabled: true, messages, createdAt: now, updatedAt: now };
    store.aiConversations.unshift(record);
    saveLocalStore();
    return { ...record, id: record._id };
  },

  async deleteConversation(userId: string, id: string) {
    if (storageMode === 'mongodb') {
      const doc = await AIConversationModel.findOneAndDelete({ _id: id, userId }).exec();
      return Boolean(doc);
    }
    const store = loadLocalStore();
    const before = store.aiConversations.length;
    store.aiConversations = store.aiConversations.filter(
      (x) => !(String(x._id) === String(id) && String(x.userId) === String(userId))
    );
    if (store.aiConversations.length !== before) {
      saveLocalStore();
      return true;
    }
    return false;
  },
};
