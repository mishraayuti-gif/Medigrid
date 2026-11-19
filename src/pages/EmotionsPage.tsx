import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  Sparkles,
  Trash2,
  Edit3,
  Check,
  Info,
  Calendar,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from 'lucide-react';
import { api, extractApiError } from '../services/api';
import { useJourney } from '../contexts/JourneyContext';
import { SequentialStepFooter } from '../components/SequentialStepFooter';
import type { EmotionEntry, JournalAIAnalysis, MoodType } from '../types/wellness';

const MOOD_OPTIONS: { mood: MoodType; emoji: string }[] = [
  { mood: 'Happy', emoji: '😊' },
  { mood: 'Calm', emoji: '😌' },
  { mood: 'Excited', emoji: '🤩' },
  { mood: 'Tired', emoji: '😴' },
  { mood: 'Anxious', emoji: '😰' },
  { mood: 'Sad', emoji: '😢' },
  { mood: 'Confused', emoji: '😕' },
  { mood: 'Lonely', emoji: '😔' },
  { mood: 'Angry', emoji: '😠' },
];

export function EmotionsPage() {
  const { markStepCompleted } = useJourney();
  const [entries, setEntries] = useState<EmotionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchive, setShowArchive] = useState(false);

  const [selectedMood, setSelectedMood] = useState<MoodType>('Calm');
  const [intensity, setIntensity] = useState(6);
  const [note, setNote] = useState('');
  const [journalText, setJournalText] = useState('');
  const [saving, setSaving] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState('');
  const [editJournal, setEditJournal] = useState('');
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'warning' | 'error';
    text: string;
  } | null>(null);
  const [aiPreview, setAiPreview] = useState<{
    aiAvailable: boolean;
    analysis: JournalAIAnalysis;
    crisisDetected?: boolean;
  } | null>(null);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get('/emotions/history');
      setEntries(res.data.history || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedbackBanner(null);
    try {
      const res = await api.post('/emotions', {
        mood: selectedMood,
        intensity,
        note: note.trim(),
        journalText: journalText.trim(),
      });
      const saved: EmotionEntry = res.data.entry;
      setNote('');
      setJournalText('');
      markStepCompleted('emotions');
      setFeedbackBanner({ type: 'success', text: 'Step 2 saved! Your mood and journal entry are logged.' });
      await loadHistory();

      if (saved.journalText && saved.journalText.length >= 5) {
        await handleAnalyzeEntry(saved);
      }
    } catch (err) {
      setFeedbackBanner({
        type: 'error',
        text: extractApiError(err, 'Failed to save emotion check-in.'),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAnalyzeEntry = async (entry: EmotionEntry) => {
    if (!entry.journalText || entry.journalText.trim().length < 5) {
      setFeedbackBanner({
        type: 'warning',
        text: 'Add at least a short sentence in your journal to run Ollama reflection.',
      });
      return;
    }
    setAnalyzingId(entry.id);
    try {
      const res = await api.post('/ai/analyze-journal', {
        emotionId: entry.id,
        mood: entry.mood,
        intensity: entry.intensity,
        note: entry.note,
        journalText: entry.journalText,
      });
      if (res.data.aiAvailable) {
        setAiPreview({
          aiAvailable: true,
          analysis: res.data.analysis,
          crisisDetected: res.data.crisisDetected,
        });
        await loadHistory();
      } else {
        setAiPreview({
          aiAvailable: false,
          analysis: res.data.fallbackAnalysis,
        });
      }
    } catch (err) {
      setFeedbackBanner({
        type: 'error',
        text: extractApiError(err, 'Unable to analyze journal entry.'),
      });
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/emotions/${id}`);
      setEntries((prev) => prev.filter((x) => x.id !== id));
    } catch {
      // ignore
    }
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const res = await api.put(`/emotions/${id}`, {
        note: editNote,
        journalText: editJournal,
      });
      setEntries((prev) => prev.map((e) => (e.id === id ? res.data.entry : e)));
      setEditingId(null);
    } catch {
      // ignore
    }
  };

  const moodCounts = MOOD_OPTIONS.map((m) => ({
    mood: m.mood,
    count: entries.filter((e) => e.mood === m.mood).length,
  })).filter((d) => d.count > 0);

  const recentDays = Array.from({ length: 14 }, (_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - idx));
    const dateKey = d.toISOString().slice(0, 10);
    const match = entries.find((e) => e.createdAt.slice(0, 10) === dateKey);
    return {
      dateKey,
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      entry: match || null,
    };
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Focused Step 2 Form */}
        <form
          onSubmit={handleSaveEntry}
          className="lg:col-span-7 rounded-[24px] border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] shadow-[0_1px_2px_rgba(15,23,42,0.03)] p-6 sm:p-8 space-y-6"
        >
          <div>
            <p className="text-xs font-medium text-[#3F4A8A] dark:text-indigo-300">
              Step 2 of 6 · Mood & Journal
            </p>
            <h2 className="font-display text-2xl font-medium tracking-tight text-slate-900 dark:text-white mt-1">
              How are you feeling right now?
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Tap one mood, adjust the intensity, and optionally jot a private note.
            </p>
          </div>

          {feedbackBanner && (
            <div
              className={`rounded-2xl px-4 py-3 text-xs flex flex-wrap items-center justify-between gap-2 ${
                feedbackBanner.type === 'error'
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                  : feedbackBanner.type === 'warning'
                  ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
              }`}
            >
              <span>{feedbackBanner.text}</span>
              {feedbackBanner.type === 'success' && (
                <Link
                  to="/app/exercises"
                  className="inline-flex items-center gap-1 font-semibold underline"
                >
                  Go to Step 3 <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          )}

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {MOOD_OPTIONS.map((opt) => {
              const active = selectedMood === opt.mood;
              return (
                <button
                  key={opt.mood}
                  type="button"
                  onClick={() => setSelectedMood(opt.mood)}
                  className={`flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-2xl border text-xs font-medium transition-all ${
                    active
                      ? 'border-[#3F4A8A] bg-[#EEF0F8]/75 text-[#2C356B] dark:bg-indigo-500/15 dark:text-indigo-200 dark:border-indigo-400'
                      : 'border-slate-200/80 dark:border-slate-800 hover:bg-[#F9FAFD] dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="text-lg" aria-hidden="true">
                    {opt.emoji}
                  </span>
                  <span>{opt.mood}</span>
                </button>
              );
            })}
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Intensity
              </span>
              <span className="font-mono tabular-nums font-semibold text-[#3F4A8A] dark:text-indigo-400">
                {intensity} / 10
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
              className="w-full accent-[#3F4A8A] dark:accent-indigo-400"
            />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Quick Headline (Optional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g., Afternoon focus fatigue before deadline"
                maxLength={200}
                className="w-full rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-[#F9FAFD] dark:bg-[#0D1322] focus:bg-white dark:focus:bg-[#0A0F1C] px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3F4A8A]/25 dark:focus:ring-indigo-400/25 focus:border-[#3F4A8A] dark:focus:border-indigo-400 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Private Journal Note (Optional — unlocks AI reflection)
              </label>
              <textarea
                rows={3}
                value={journalText}
                onChange={(e) => setJournalText(e.target.value)}
                placeholder="Write a sentence or two about what is on your mind..."
                className="w-full rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-[#F9FAFD] dark:bg-[#0D1322] focus:bg-white dark:focus:bg-[#0A0F1C] p-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3F4A8A]/25 dark:focus:ring-indigo-400/25 focus:border-[#3F4A8A] dark:focus:border-indigo-400 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-7 py-2.5 rounded-full bg-[#3F4A8A] hover:bg-[#333D75] dark:bg-indigo-500 dark:hover:bg-indigo-400 disabled:opacity-60 text-white text-xs font-medium shadow-xs transition-colors"
          >
            {saving ? 'Saving Entry...' : 'Save Mood & Reflect'}
          </button>
        </form>

        {/* Right Side: Clean AI Reflection Panel */}
        <div className="lg:col-span-5 rounded-[24px] border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] shadow-[0_1px_2px_rgba(15,23,42,0.03)] p-6 sm:p-7 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#3F4A8A] dark:text-indigo-400" />
            <h3 className="font-display text-lg font-medium text-slate-900 dark:text-white">
              Gentle AI Reflection
            </h3>
          </div>

          {aiPreview ? (
            <div className="space-y-3.5 text-xs">
              {!aiPreview.aiAvailable && (
                <div className="flex items-start gap-2 rounded-2xl bg-[#F6F7FB] dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 p-3 text-slate-600 dark:text-slate-300">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#3F4A8A] dark:text-indigo-400" />
                  <span>
                    Guided Wellness Mode active (Ollama is currently unavailable).
                  </span>
                </div>
              )}
              <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-sm">
                {aiPreview.analysis.empatheticReflection}
              </p>
              <div className="rounded-2xl bg-[#F6F7FB] dark:bg-slate-800/45 p-4 space-y-1.5">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Gentle Reframe
                </p>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {aiPreview.analysis.gentleReframe}
                </p>
              </div>
              <p className="text-[#3F4A8A] dark:text-indigo-400 font-medium">
                Suggested next step: {aiPreview.analysis.suggestedNextStep}
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Add a short note in the journal box and click Save to receive a calm, private
              reflection from Ollama. You can also skip writing and simply log your mood.
            </p>
          )}
        </div>
      </div>

      {/* Collapsible Calendar, Chart & Past Entries */}
      <div className="rounded-[24px] border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] overflow-hidden">
        <button
          type="button"
          onClick={() => setShowArchive((v) => !v)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-[#FAFBFD] dark:hover:bg-slate-800/30 transition-colors"
        >
          <span className="font-display text-base font-medium text-slate-900 dark:text-white">
            Mood Calendar & Past Journal Entries{' '}
            <span className="font-mono text-xs text-slate-400 tabular-nums">
              ({entries.length})
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#3F4A8A] dark:text-indigo-300">
            {showArchive ? 'Hide' : 'View History'}
            {showArchive ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>

        {showArchive && (
          <div className="px-6 pb-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-[#3F4A8A] dark:text-indigo-400" />
                  <h4 className="text-xs font-medium text-slate-700 dark:text-slate-200">
                    14-Day Mood Calendar
                  </h4>
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {recentDays.map((day) => {
                    const moodObj = day.entry
                      ? MOOD_OPTIONS.find((m) => m.mood === day.entry?.mood)
                      : null;
                    return (
                      <div
                        key={day.dateKey}
                        title={
                          day.entry
                            ? `${day.label}: ${day.entry.mood} (${day.entry.intensity}/10)`
                            : `${day.label}: No entry`
                        }
                        className={`rounded-xl p-2 text-center ${
                          day.entry
                            ? 'bg-[#EEF0F8] dark:bg-indigo-500/15'
                            : 'bg-[#F6F7FB] dark:bg-slate-800/35'
                        }`}
                      >
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
                          {day.dateKey.slice(8)}
                        </p>
                        <p className="text-sm mt-0.5">{moodObj ? moodObj.emoji : '·'}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {moodCounts.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-slate-700 dark:text-slate-200 mb-3">
                    Mood Distribution
                  </h4>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={moodCounts}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" opacity={0.4} vertical={false} />
                        <XAxis dataKey="mood" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#3F4A8A" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

            {loading ? (
              <div className="h-20 bg-slate-100 dark:bg-slate-800/60 rounded-2xl animate-pulse" />
            ) : entries.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No mood entries logged yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {entries.map((entry) => {
                  const moodMeta = MOOD_OPTIONS.find((m) => m.mood === entry.mood);
                  const isEditing = editingId === entry.id;
                  return (
                    <div key={entry.id} className="py-4 first:pt-0 last:pb-0 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{moodMeta?.emoji || '🙂'}</span>
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                              {entry.mood} ·{' '}
                              <span className="font-mono tabular-nums text-xs font-normal text-slate-500">
                                Intensity {entry.intensity}/10
                              </span>
                            </p>
                            <p className="text-[11px] text-slate-400 tabular-nums mt-0.5">
                              {new Date(entry.createdAt).toLocaleString()}
                              {entry.isDemo ? ' · Demonstration Data' : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {entry.journalText && (
                            <button
                              type="button"
                              onClick={() => void handleAnalyzeEntry(entry)}
                              disabled={analyzingId === entry.id}
                              className="px-3.5 py-1.5 rounded-full bg-[#EEF0F8] text-[#3F4A8A] hover:bg-[#E2E6F4] dark:bg-indigo-500/15 dark:text-indigo-300 text-xs font-medium transition-colors"
                            >
                              {analyzingId === entry.id ? 'Analyzing...' : 'Reflect'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(entry.id);
                              setEditNote(entry.note || '');
                              setEditJournal(entry.journalText || '');
                            }}
                            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
                            aria-label="Edit entry"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(entry.id)}
                            className="p-2 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            aria-label="Delete entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="space-y-2.5 pt-2">
                          <input
                            type="text"
                            value={editNote}
                            onChange={(e) => setEditNote(e.target.value)}
                            className="w-full rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-[#F9FAFD] dark:bg-[#0D1322] px-3.5 py-2 text-xs text-slate-900 dark:text-white"
                          />
                          <textarea
                            rows={3}
                            value={editJournal}
                            onChange={(e) => setEditJournal(e.target.value)}
                            className="w-full rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-[#F9FAFD] dark:bg-[#0D1322] p-3 text-xs text-slate-900 dark:text-white"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => void handleSaveEdit(entry.id)}
                              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#3F4A8A] dark:bg-indigo-500 text-white text-xs font-medium"
                            >
                              <Check className="w-3.5 h-3.5" /> Save Changes
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="px-4 py-1.5 rounded-full text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="pl-0 sm:pl-9 space-y-1">
                          {entry.note && (
                            <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                              {entry.note}
                            </p>
                          )}
                          {entry.journalText && (
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                              {entry.journalText}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <SequentialStepFooter stepId="emotions" />
    </div>
  );
}
