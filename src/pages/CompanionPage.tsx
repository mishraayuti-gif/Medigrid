import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Send,
  Plus,
  Trash2,
  Info,
  ShieldAlert,
  PhoneCall,
  Play,
  Wind,
  History,
  X,
} from 'lucide-react';
import { api, extractApiError } from '../services/api';
import { useMusicPlayer } from '../contexts/MusicPlayerContext';
import { useJourney } from '../contexts/JourneyContext';
import { SequentialStepFooter } from '../components/SequentialStepFooter';
import type { AIConversation, AIMessage, ExerciseItem, MusicTrack } from '../types/wellness';
import { SafeImage } from '../components/SafeImage';

const QUICK_PROMPTS = [
  'I feel mentally overloaded after work—how can I reset in 5 minutes?',
  'Help me unwind before sleep tonight.',
  'My shoulders feel tight from sitting at my desk all day.',
];

export function CompanionPage() {
  const { playTrack } = useMusicPlayer();
  const { markStepCompleted } = useJourney();
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);

  const [saveHistory, setSaveHistory] = useState(true);
  const [shareContext, setShareContext] = useState(true);

  const [guidedModeNotice, setGuidedModeNotice] = useState('');
  const [requestError, setRequestError] = useState('');
  const [crisisResources, setCrisisResources] = useState<
    { name: string; contact: string; description: string }[]
  >([]);
  const [suggestedExercises, setSuggestedExercises] = useState<ExerciseItem[]>([]);
  const [suggestedTracks, setSuggestedTracks] = useState<MusicTrack[]>([]);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const loadConversations = async () => {
    try {
      const res = await api.get('/ai/conversations');
      setConversations(res.data.conversations || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void loadConversations();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const startNewChat = () => {
    setActiveConvId(null);
    setMessages([]);
    setGuidedModeNotice('');
    setRequestError('');
    setCrisisResources([]);
    setSuggestedExercises([]);
    setSuggestedTracks([]);
    setShowHistoryPanel(false);
  };

  const selectConversation = (conv: AIConversation) => {
    setActiveConvId(conv.id);
    setMessages(conv.messages || []);
    setGuidedModeNotice('');
    setRequestError('');
    setCrisisResources([]);
    setShowHistoryPanel(false);
  };

  const deleteConversation = async (id: string) => {
    try {
      await api.delete(`/ai/conversations/${id}`);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConvId === id) {
        startNewChat();
      }
    } catch {
      // ignore
    }
  };

  const sendMessage = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || sending) return;

    setSending(true);
    setGuidedModeNotice('');
    setRequestError('');
    setCrisisResources([]);

    const optimisticUser: AIMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);
    if (!textOverride) setInput('');

    try {
      const res = await api.post('/ai/chat', {
        message: text,
        conversationId: activeConvId,
        saveHistory,
        shareWellnessContext: shareContext,
      });

      const data = res.data;
      setSuggestedExercises(data.recommendedExercises || []);
      setSuggestedTracks(data.recommendedTracks || []);
      markStepCompleted('companion');

      if (data.crisisDetected) {
        setCrisisResources(data.crisisResources || []);
      }

      if (data.reply) {
        const assistantMsg: AIMessage = {
          role: 'assistant',
          content: data.reply,
          timestamp: new Date().toISOString(),
          provider: data.provider || (data.aiAvailable ? 'ollama' : 'guided-wellness-engine'),
          crisisFlag: Boolean(data.crisisDetected),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        if (data.conversation) {
          setActiveConvId(data.conversation.id);
          await loadConversations();
        }
      }

      if (!data.aiAvailable) {
        setGuidedModeNotice(
          data.fallbackGuidance ||
            data.error ||
            'Responding in Guided Wellness Mode while Ollama is offline.'
        );
      }
    } catch (err) {
      setRequestError(extractApiError(err, 'Failed to reach companion service. Please try again.'));
      if (!textOverride) setInput(text);
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Focused Step 5 Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#3F4A8A] dark:text-indigo-300">
            Step 5 of 6 · AI Reflection
          </p>
          <h2 className="font-display text-2xl font-medium tracking-tight text-slate-900 dark:text-white mt-0.5">
            Talk it out with your private companion
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowHistoryPanel((v) => !v)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-[#111827] text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
          >
            <History className="w-3.5 h-3.5" />
            Threads & Privacy ({conversations.length})
          </button>
          <button
            type="button"
            onClick={startNewChat}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#EEF0F8] text-[#3F4A8A] hover:bg-[#E2E6F4] dark:bg-indigo-500/15 dark:text-indigo-200 text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Chat
          </button>
        </div>
      </div>

      {/* Collapsible Threads & Privacy Panel */}
      {showHistoryPanel && (
        <div className="rounded-[24px] border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-medium text-slate-900 dark:text-white">
              Saved Conversations & Privacy
            </h3>
            <button
              type="button"
              onClick={() => setShowHistoryPanel(false)}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              aria-label="Close threads panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl bg-[#F6F7FB] dark:bg-slate-800/45 p-4 space-y-3 text-xs">
              <p className="font-medium text-slate-700 dark:text-slate-200">Privacy Controls</p>
              <label className="flex items-center justify-between gap-2 cursor-pointer">
                <span className="text-slate-600 dark:text-slate-300">Save chat history</span>
                <input
                  type="checkbox"
                  checked={saveHistory}
                  onChange={(e) => setSaveHistory(e.target.checked)}
                  className="accent-[#3F4A8A] dark:accent-indigo-400"
                />
              </label>
              <label className="flex items-center justify-between gap-2 cursor-pointer">
                <span className="text-slate-600 dark:text-slate-300">
                  Share stress & mood context
                </span>
                <input
                  type="checkbox"
                  checked={shareContext}
                  onChange={(e) => setShareContext(e.target.checked)}
                  className="accent-[#3F4A8A] dark:accent-indigo-400"
                />
              </label>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Recent Threads
              </p>
              {conversations.length === 0 ? (
                <p className="text-xs text-slate-400">No saved threads yet.</p>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs transition-colors ${
                      activeConvId === conv.id
                        ? 'bg-[#EEF0F8] text-[#3F4A8A] dark:bg-indigo-500/15 dark:text-indigo-200'
                        : 'hover:bg-[#F9FAFD] dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => selectConversation(conv)}
                      className="flex-1 text-left truncate font-medium"
                    >
                      {conv.title}
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteConversation(conv.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                      aria-label="Delete conversation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Calm Chat Panel */}
      <div className="rounded-[24px] border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col overflow-hidden min-h-[500px]">
        {crisisResources.length > 0 && (
          <div className="bg-rose-50/90 dark:bg-rose-950/50 border-b border-rose-200/80 dark:border-rose-900 p-5 space-y-3">
            <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-medium text-xs">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              Immediate Human Support & Crisis Resources
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {crisisResources.map((r) => (
                <div key={r.name} className="rounded-xl bg-white dark:bg-[#111827] p-3 text-xs">
                  <p className="font-medium text-slate-900 dark:text-white flex items-center gap-1.5">
                    <PhoneCall className="w-3.5 h-3.5 text-rose-600" />
                    {r.name}
                  </p>
                  <p className="text-rose-700 dark:text-rose-300 font-medium mt-0.5">{r.contact}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 p-6 sm:p-8 overflow-y-auto space-y-5 max-h-[520px]">
          {messages.length === 0 ? (
            <div className="py-6 space-y-6 max-w-2xl">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0">
                  <SafeImage
                    src="/src/assets/images/avatar_wellness_companion_1795007537462.jpg"
                    alt="MindCare Companion"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-display text-xl font-medium text-slate-900 dark:text-white">
                    What is on your mind right now?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Tap a quick starter below or type freely. Powered by Ollama.
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2.5">
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => void sendMessage(p)}
                    className="text-left px-4 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:bg-[#F6F7FB] dark:hover:bg-slate-800/50 text-xs text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-[#3F4A8A] dark:bg-indigo-500 text-white'
                      : 'bg-[#F6F7FB] dark:bg-slate-800/70 text-slate-800 dark:text-slate-100'
                  }`}
                >
                  {m.content}
                </div>
                {m.role === 'assistant' && m.provider === 'guided-wellness-engine' && (
                  <span className="mt-1 px-1 text-[11px] text-slate-400 dark:text-slate-500">
                    Guided Wellness Mode
                  </span>
                )}
              </div>
            ))
          )}

          {sending && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-[#F6F7FB] dark:bg-slate-800/70 px-4 py-3 text-xs text-slate-500">
                Preparing a calm response...
              </div>
            </div>
          )}

          {requestError && (
            <div className="rounded-2xl border border-rose-200/80 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/30 p-4 text-xs text-rose-800 dark:text-rose-200">
              {requestError}
            </div>
          )}

          {guidedModeNotice && (
            <div className="flex items-start gap-2.5 rounded-2xl bg-[#F6F7FB] dark:bg-slate-800/45 border border-slate-200/70 dark:border-slate-700/60 px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#3F4A8A] dark:text-indigo-400" />
              <div className="space-y-0.5 leading-relaxed">
                <p className="font-medium text-slate-700 dark:text-slate-200">
                  Guided Wellness Mode active
                </p>
                <p className="text-slate-500 dark:text-slate-400">{guidedModeNotice}</p>
              </div>
            </div>
          )}

          {(suggestedExercises.length > 0 || suggestedTracks.length > 0) && (
            <div className="rounded-2xl bg-[#F6F7FB] dark:bg-slate-800/45 p-4 space-y-2.5">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Helpful next activities
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestedExercises.map((ex) => (
                  <Link
                    key={ex.id}
                    to="/app/exercises"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-700 text-xs font-medium text-[#3F4A8A] dark:text-indigo-300 hover:border-[#3F4A8A]/50 transition-colors"
                  >
                    <Wind className="w-3.5 h-3.5" />
                    {ex.name}
                  </Link>
                ))}
                {suggestedTracks.map((tr) => (
                  <button
                    key={tr.id}
                    type="button"
                    onClick={() => playTrack(tr)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-[#3F4A8A]/50 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 text-[#3F4A8A] dark:text-indigo-400" />
                    Play: {tr.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendMessage();
          }}
          className="border-t border-slate-100 dark:border-slate-800/80 p-4 sm:p-5 flex items-center gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Share what is on your mind..."
            className="flex-1 rounded-full border border-slate-200/90 dark:border-slate-700/80 bg-[#F9FAFD] dark:bg-[#0D1322] focus:bg-white dark:focus:bg-[#0A0F1C] px-5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3F4A8A]/25 dark:focus:ring-indigo-400/25 focus:border-[#3F4A8A] dark:focus:border-indigo-400 transition-all"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#3F4A8A] hover:bg-[#333D75] dark:bg-indigo-500 dark:hover:bg-indigo-400 disabled:opacity-50 text-white text-xs font-medium shadow-xs transition-colors shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            Send
          </button>
        </form>
      </div>

      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        Supportive reflection only—not a medical or psychiatric diagnosis.
      </p>

      <SequentialStepFooter stepId="companion" />
    </div>
  );
}
