import mongoose, { Schema } from 'mongoose';

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'demo'], default: 'user' },
    preferences: {
      theme: { type: String, enum: ['light', 'dark'], default: 'light' },
      notifications: {
        dailyCheckIn: { type: Boolean, default: true },
        weeklyReport: { type: Boolean, default: true },
        exerciseReminder: { type: Boolean, default: false },
      },
      wellnessFocus: { type: [String], default: ['Stress Management', 'Mindful Breathing'] },
    },
    resetToken: { type: String, default: null, select: false },
    resetTokenExpiry: { type: Date, default: null, select: false },
  },
  { timestamps: true }
);

const StressAssessmentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    responses: {
      emotionalState: { type: Number, required: true, min: 1, max: 5 },
      stressCauses: { type: [String], default: [] },
      sleepQuality: { type: Number, required: true, min: 1, max: 5 },
      mentalExhaustion: { type: Number, required: true, min: 1, max: 5 },
      concentrationDifficulty: { type: Number, required: true, min: 1, max: 5 },
      workStudyPressure: { type: Number, required: true, min: 1, max: 5 },
      anxietyFrequency: { type: Number, required: true, min: 1, max: 5 },
      energyLevel: { type: Number, required: true, min: 1, max: 5 },
      freeTextReflection: { type: String, default: '', maxlength: 2000 },
    },
    deterministicScore: { type: Number, required: true, min: 0, max: 100 },
    category: { type: String, enum: ['Low', 'Moderate', 'High', 'Very High'], required: true },
    breakdown: { type: Schema.Types.Mixed, required: true },
    aiAnalysis: { type: Schema.Types.Mixed, default: null },
    aiProviderStatus: {
      provider: { type: String, default: 'ollama' },
      aiAvailable: { type: Boolean, default: false },
      model: { type: String, default: '' },
      error: { type: String, default: '' },
    },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
);
StressAssessmentSchema.index({ userId: 1, createdAt: -1 });

const EmotionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    mood: {
      type: String,
      enum: ['Happy', 'Sad', 'Angry', 'Anxious', 'Calm', 'Tired', 'Excited', 'Confused', 'Lonely'],
      required: true,
    },
    intensity: { type: Number, required: true, min: 1, max: 10 },
    note: { type: String, default: '', maxlength: 500 },
    journalText: { type: String, default: '', maxlength: 5000 },
    tags: { type: [String], default: [] },
    aiJournalAnalysis: { type: Schema.Types.Mixed, default: null },
    aiProviderStatus: { type: Schema.Types.Mixed, default: null },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
);
EmotionSchema.index({ userId: 1, createdAt: -1 });

const ExerciseSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    exerciseId: { type: String, required: true },
    exerciseName: { type: String, required: true },
    category: { type: String, required: true },
    durationSeconds: { type: Number, required: true, min: 1 },
    completedSeconds: { type: Number, required: true, min: 0 },
    postureUsed: { type: Boolean, default: false },
    postureScore: { type: Number, min: 0, max: 100, default: null },
    postureFeedbackSummary: { type: String, default: '' },
    completed: { type: Boolean, default: true },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
);
ExerciseSessionSchema.index({ userId: 1, createdAt: -1 });

const MusicHistorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    trackId: { type: String, required: true },
    title: { type: String, required: true },
    category: { type: String, required: true },
    action: { type: String, enum: ['play', 'favorite', 'unfavorite'], default: 'play' },
    durationListened: { type: Number, default: 0 },
  },
  { timestamps: true }
);
MusicHistorySchema.index({ userId: 1, createdAt: -1 });

const WellnessGoalSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    category: {
      type: String,
      enum: ['Mindfulness', 'Sleep', 'Movement', 'Journaling', 'Stress Relief'],
      default: 'Mindfulness',
    },
    targetValue: { type: Number, required: true, min: 1 },
    currentValue: { type: Number, default: 0, min: 0 },
    unit: { type: String, default: 'sessions' },
    frequency: { type: String, enum: ['daily', 'weekly'], default: 'daily' },
    completedDates: { type: [String], default: [] },
    active: { type: Boolean, default: true },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
);
WellnessGoalSchema.index({ userId: 1, active: 1 });

const SleepEntrySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true },
    bedtime: { type: String, required: true },
    wakeTime: { type: String, required: true },
    durationHours: { type: Number, required: true, min: 0, max: 24 },
    qualityScore: { type: Number, required: true, min: 1, max: 5 },
    awakenings: { type: Number, default: 0, min: 0 },
    notes: { type: String, default: '', maxlength: 500 },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
);
SleepEntrySchema.index({ userId: 1, date: -1 });

const AIConversationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, default: 'Wellness Conversation' },
    contextEnabled: { type: Boolean, default: true },
    messages: [
      {
        role: { type: String, enum: ['user', 'assistant'], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        crisisFlag: { type: Boolean, default: false },
        recommendedExerciseIds: { type: [String], default: [] },
        recommendedTrackIds: { type: [String], default: [] },
      },
    ],
  },
  { timestamps: true }
);
AIConversationSchema.index({ userId: 1, updatedAt: -1 });

export const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
export const StressAssessmentModel =
  mongoose.models.StressAssessment || mongoose.model('StressAssessment', StressAssessmentSchema);
export const EmotionModel = mongoose.models.Emotion || mongoose.model('Emotion', EmotionSchema);
export const ExerciseSessionModel =
  mongoose.models.ExerciseSession || mongoose.model('ExerciseSession', ExerciseSessionSchema);
export const MusicHistoryModel =
  mongoose.models.MusicHistory || mongoose.model('MusicHistory', MusicHistorySchema);
export const WellnessGoalModel =
  mongoose.models.WellnessGoal || mongoose.model('WellnessGoal', WellnessGoalSchema);
export const SleepEntryModel =
  mongoose.models.SleepEntry || mongoose.model('SleepEntry', SleepEntrySchema);
export const AIConversationModel =
  mongoose.models.AIConversation || mongoose.model('AIConversation', AIConversationSchema);
