import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight,
  ChevronDown,
  Sun,
  Moon,
} from 'lucide-react';
import { SafeImage } from '../components/SafeImage';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

const FAQ_ITEMS = [
  {
    q: 'How is my stress score calculated?',
    a: 'Your 0–100 stress score is calculated strictly by a deterministic backend rubric across 8 weighted dimensions: emotional load, active stressors, sleep quality, mental exhaustion, concentration, work/study pressure, anxiety frequency, and energy levels. Local AI only interprets that verified score.',
  },
  {
    q: 'Why does MindCare AI use Ollama instead of a cloud LLM?',
    a: 'Mental wellness reflections and private journals deserve discretion. By integrating directly with Ollama (local or authenticated endpoint), your reflections remain under your control. If Ollama is offline, MindCare AI reports it honestly and offers deterministic fallback guidance.',
  },
  {
    q: 'Does live posture monitoring record or upload my camera video?',
    a: 'No. MediaPipe Pose Landmarker evaluates upper-body alignment rules transiently in memory during posture-supported exercises. No video frames are stored or uploaded by default, and camera tracks close automatically when a session ends.',
  },
  {
    q: 'Are MindCare AI assessments a clinical or medical diagnosis?',
    a: 'No. MindCare AI provides general wellness estimates, habit tracking, and supportive reflection. It is not a medical device, psychiatric diagnostic tool, or substitute for licensed professional care.',
  },
];

const SAMPLE_TESTIMONIALS = [
  {
    name: 'Maya Lin',
    role: 'Product Designer · Sample Testimonial',
    quote:
      'Before structured check-ins, I only noticed burnout once exhaustion arrived. Tracking sleep alongside the 4-7-8 breath timer helped me spot early strain and reclaim quiet evenings.',
  },
  {
    name: 'Daniel Okafor',
    role: 'Graduate Researcher · Sample Testimonial',
    quote:
      'Pairing transparent stress scoring with private Ollama journal reflections meant I could write honestly without sending personal notes into third-party ad clouds.',
  },
  {
    name: 'Hannah Park',
    role: 'Operations Lead · Sample Testimonial',
    quote:
      'The desk neck-release posture check gently reminds me to soften my shoulders between calls, and the rain soundscape keeps my afternoon focus effortless.',
  },
];

const PILLARS = [
  {
    index: '01',
    title: 'Deterministic 0–100 Scoring',
    desc: 'Eight weighted dimensions calculated strictly by backend logic—never fabricated by an LLM.',
  },
  {
    index: '02',
    title: 'Private Ollama Companion',
    desc: 'Empathetic reflection, journal themes, and immediate crisis-resource guardrails.',
  },
  {
    index: '03',
    title: 'Breath & Posture Guidance',
    desc: 'Paced breathing timers alongside optional MediaPipe upper-body alignment cues.',
  },
  {
    index: '04',
    title: 'Adaptive Soundscapes',
    desc: 'Rain, coastal tide, 432Hz pads, and brown noise synthesized smoothly in your browser.',
  },
];

export function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const { user, loginDemo } = useAuth();
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState('');

  const handleDemoAccess = async () => {
    setDemoLoading(true);
    setDemoError('');
    try {
      await loginDemo();
      navigate('/app/dashboard');
    } catch {
      setDemoError('Could not open demo workspace right now. Please try signing in.');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F7FB] dark:bg-[#0A0F1C] text-slate-900 dark:text-slate-100 sanctuary-atmosphere">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-40 border-b border-slate-200/70 dark:border-slate-800/70 bg-[#F6F7FB]/85 dark:bg-[#0A0F1C]/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-5 sm:px-10 h-18 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <Link
            to="/"
            className="font-display text-xl font-medium tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
          >
            MindCare AI
          </Link>

          {/* Zone 2: 5 concise single-line text nav links */}
          <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium text-slate-600 dark:text-slate-300">
            <a
              href="#features"
              className="hover:text-slate-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="hover:text-slate-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              How It Works
            </a>
            <a
              href="#exercises"
              className="hover:text-slate-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Practices
            </a>
            <a
              href="#faq"
              className="hover:text-slate-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              FAQ
            </a>
            <Link
              to={user ? '/app/dashboard' : '/login'}
              className="hover:text-slate-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              {user ? 'Dashboard' : 'Login'}
            </Link>
          </nav>

          {/* Zone 3: 1 primary CTA */}
          <div className="flex items-center shrink-0">
            <Link
              to={user ? '/app/dashboard' : '/signup'}
              className="px-4 py-2 rounded-full bg-[#3F4A8A] hover:bg-[#333D75] dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white text-xs sm:text-[13px] font-medium transition-colors whitespace-nowrap shrink-0"
            >
              {user ? 'Open Workspace' : 'Get Started'}
            </Link>
          </div>
        </div>
      </header>

      {/* Editorial Sanctuary Hero */}
      <section className="max-w-7xl mx-auto px-5 sm:px-10 pt-12 pb-16 lg:pt-20 lg:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-stretch">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 flex flex-col justify-between py-2"
          >
            <div className="space-y-7">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-medium text-[#3F4A8A] dark:text-indigo-300 tracking-wide">
                  Private Mental Wellness Sanctuary · Powered by Ollama
                </p>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors whitespace-nowrap"
                >
                  {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                  {theme === 'dark' ? 'Light' : 'Dark'}
                </button>
              </div>

              <h1
                className="font-display font-medium tracking-tight text-slate-900 dark:text-white leading-[1.06]"
                style={{ fontSize: 'clamp(2.5rem, 4.4vw, 3.85rem)', textWrap: 'balance' }}
              >
                Understand your mind.{' '}
                <em className="italic font-normal text-[#3F4A8A] dark:text-indigo-300">
                  Manage
                </em>{' '}
                your stress.
              </h1>

              <p className="text-[15px] sm:text-[17px] text-slate-600 dark:text-slate-300 leading-[1.7] max-w-xl">
                A calm daily space uniting deterministic 0–100 stress check-ins, private
                Ollama-powered reflections, guided breathwork, live MediaPipe posture alignment,
                sleep tracking, and restorative soundscapes.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  to={user ? '/app/dashboard' : '/signup'}
                  className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-[#3F4A8A] hover:bg-[#333D75] dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white text-sm font-medium transition-colors whitespace-nowrap"
                >
                  Begin Privately
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <button
                  type="button"
                  onClick={handleDemoAccess}
                  disabled={demoLoading}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-slate-300/90 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm font-medium transition-colors whitespace-nowrap"
                >
                  {demoLoading ? 'Opening demo...' : 'Explore Demo Workspace'}
                </button>
                <Link
                  to="/login"
                  className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-[#3F4A8A] dark:hover:text-indigo-300 underline underline-offset-4 decoration-slate-300 dark:decoration-slate-700 whitespace-nowrap"
                >
                  Sign in
                </Link>
              </div>
              {demoError && (
                <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
                  {demoError}
                </p>
              )}
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 pt-10">
              Improve your life through gentle awareness · General wellness platform, not a clinical diagnostic tool.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 flex flex-col"
          >
            <div className="flex-1 min-h-[340px] rounded-[28px] overflow-hidden border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-[0_20px_50px_-30px_rgba(30,41,59,0.22)]">
              <SafeImage
                src="/src/assets/images/hero_mindcare_sanctuary_1795007514519.jpg"
                alt="Sunlit calm wellness sanctuary interior with linen curtains and botanical olive branch"
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-xs font-display italic text-slate-500 dark:text-slate-400 mt-3 text-right">
              Quiet clarity — daily reflection, breath, posture, and rest in one serene rhythm.
            </p>
          </motion.div>
        </div>

        {/* Hairline Architectural 4-Pillar Strip */}
        <div className="mt-16 pt-10 border-t border-slate-200/80 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {PILLARS.map((item) => (
            <div key={item.index} className="space-y-2.5">
              <span className="font-mono text-xs text-[#3F4A8A] dark:text-indigo-300 tabular-nums">
                {item.index}
              </span>
              <h2 className="font-display text-lg font-medium text-slate-900 dark:text-white leading-snug">
                {item.title}
              </h2>
              <p className="text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Curatorial Features Overview */}
      <section
        id="features"
        className="border-t border-slate-200/75 dark:border-slate-800/75 bg-white dark:bg-[#0E1424] py-20 lg:py-28"
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-10">
          <div className="max-w-2xl mb-14">
            <p className="text-xs font-medium text-[#3F4A8A] dark:text-indigo-300 mb-3">
              Integrated Wellness Suite
            </p>
            <h2
              className="font-display text-3xl sm:text-4xl font-medium tracking-tight text-slate-900 dark:text-white leading-[1.15]"
              style={{ textWrap: 'balance' }}
            >
              Every daily practice connected in one quiet sanctuary
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
            <div className="lg:col-span-8 rounded-[24px] border border-slate-200/80 dark:border-slate-800/80 bg-[#F6F7FB] dark:bg-[#121A2E] overflow-hidden grid grid-cols-1 md:grid-cols-2">
              <div className="p-8 sm:p-10 flex flex-col justify-between">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                    01. Stress Check-In & Ollama Reflection
                  </p>
                  <h3 className="font-display text-2xl font-medium text-slate-900 dark:text-white mb-3.5 leading-snug">
                    Conversational check-ins with transparent scoring
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-[1.7]">
                    Answer one unhurried question at a time covering emotional strain, sleep
                    quality, concentration, and workload. Inspect an exact 8-dimension breakdown
                    paired with supportive Ollama guidance.
                  </p>
                </div>
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 text-sm font-medium text-[#3F4A8A] dark:text-indigo-300 hover:underline underline-offset-4 mt-8"
                >
                  Begin your first check-in <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="min-h-[260px]">
                <SafeImage
                  src="/src/assets/images/feature_guided_breath_1795007511928.jpg"
                  alt="Minimalist linen meditation corner in soft morning light"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="lg:col-span-4 rounded-[24px] border border-slate-200/80 dark:border-slate-800/80 bg-[#F6F7FB] dark:bg-[#121A2E] p-8 sm:p-9 flex flex-col justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  02. Emotion & Private Journal
                </p>
                <h3 className="font-display text-2xl font-medium text-slate-900 dark:text-white mb-3.5 leading-snug">
                  Mood calendar & reflective themes
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-[1.7]">
                  Record nine nuanced emotional states with intensity scales, write private entries,
                  explore 14-day patterns, and invite gentle Ollama reflections whenever you wish.
                </p>
              </div>
              <div className="mt-8 pt-5 border-t border-slate-200/80 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Happy · Calm · Anxious · Tired · Sad · Excited · Confused · Lonely · Angry
              </div>
            </div>

            <div
              id="exercises"
              className="lg:col-span-5 rounded-[24px] border border-slate-200/80 dark:border-slate-800/80 bg-[#F6F7FB] dark:bg-[#121A2E] overflow-hidden flex flex-col"
            >
              <div className="h-52">
                <SafeImage
                  src="/src/assets/images/feature_posture_yoga_1795007558598.jpg"
                  alt="Quiet minimalist movement studio with yoga mat on pale oak floor"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-8 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2.5">
                    03. Guided Exercises & MediaPipe Posture
                  </p>
                  <h3 className="font-display text-xl font-medium text-slate-900 dark:text-white mb-2.5">
                    Breath pacers & gentle alignment cues
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-[1.7]">
                    Practice 4-7-8 breathwork, box breathing, neck desk release, and mountain reach
                    with optional in-memory webcam alignment cues and zero video recording.
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 rounded-[24px] border border-slate-200/80 dark:border-slate-800/80 bg-[#F6F7FB] dark:bg-[#121A2E] overflow-hidden grid grid-cols-1 md:grid-cols-2">
              <div className="min-h-[260px]">
                <SafeImage
                  src="/src/assets/images/feature_sleep_soundscape_1795007512642.jpg"
                  alt="Tranquil twilight bedroom sanctuary with soft blue linen and warm bedside lamp"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-8 sm:p-9 flex flex-col justify-between">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                    04. Soundscapes, Sleep & Reports
                  </p>
                  <h3 className="font-display text-2xl font-medium text-slate-900 dark:text-white mb-3.5 leading-snug">
                    Restorative audio tailored to how you feel
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-[1.7]">
                    Unwind with procedural rain, coastal tides, 432Hz resonance pads, lo-fi chords,
                    and brown noise while tracking sleep duration, goals, and exportable insights.
                  </p>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-6">
                  100% browser-synthesized Web Audio · Zero broken stream links
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-5 sm:px-10 py-20 lg:py-28">
        <div className="max-w-2xl mb-14">
          <p className="text-xs font-medium text-[#3F4A8A] dark:text-indigo-300 mb-3">
            A Gentle Daily Rhythm
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-medium tracking-tight text-slate-900 dark:text-white leading-[1.15]">
            From a two-minute check-in to lasting steadiness
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              step: '01. Measure Calmly',
              detail:
                'Complete the 8-part conversational stress check-in or record your mood and sleep quality.',
            },
            {
              step: '02. Interpret Safely',
              detail:
                'Transparent backend logic calculates your 0–100 score while Ollama offers supportive clarity.',
            },
            {
              step: '03. Reset Your Body',
              detail:
                'Follow guided breath pacers, stretch with optional MediaPipe alignment feedback, or play rain audio.',
            },
            {
              step: '04. Own Your Progress',
              detail:
                'Track weekly trends, nurture realistic habits, and export or delete your private data anytime.',
            },
          ].map((item) => (
            <div
              key={item.step}
              className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] p-7"
            >
              <h3 className="font-display text-lg font-medium text-slate-900 dark:text-white mb-2.5">
                {item.step}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-[1.65]">
                {item.detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Editorial Pull-Quote Sample Testimonials */}
      <section className="border-t border-slate-200/75 dark:border-slate-800/75 bg-white dark:bg-[#0E1424] py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-5 sm:px-10">
          <div className="mb-12">
            <p className="text-xs font-medium text-[#3F4A8A] dark:text-indigo-300 mb-2">
              Sample Testimonials (Illustrative Examples)
            </p>
            <h2 className="font-display text-3xl font-medium tracking-tight text-slate-900 dark:text-white">
              Crafted for unhurried daily care
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {SAMPLE_TESTIMONIALS.map((t) => (
              <blockquote
                key={t.name}
                className="border-t border-b border-slate-200/80 dark:border-slate-800/80 py-7 flex flex-col justify-between"
              >
                <p className="font-display italic text-base sm:text-[17px] text-slate-800 dark:text-slate-200 leading-[1.65]">
                  “{t.quote}”
                </p>
                <footer className="mt-6">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{t.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.role}</p>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="max-w-4xl mx-auto px-5 sm:px-10 py-20 lg:py-24">
        <div className="mb-10">
          <p className="text-xs font-medium text-[#3F4A8A] dark:text-indigo-300 mb-2">
            Frequently Asked Questions
          </p>
          <h2 className="font-display text-3xl font-medium tracking-tight text-slate-900 dark:text-white">
            Privacy, scoring rigor, and posture safety
          </h2>
        </div>

        <div className="divide-y divide-slate-200/80 dark:divide-slate-800/80 border-y border-slate-200/80 dark:border-slate-800/80">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={item.q} className="py-5">
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between gap-4 text-left"
                >
                  <span className="font-display text-lg font-medium text-slate-900 dark:text-white">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-[1.7] pr-8">
                    {item.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Quiet Sanctuary Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0E1424] py-12">
        <div className="max-w-7xl mx-auto px-5 sm:px-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="font-display text-lg font-medium text-slate-900 dark:text-white">
              MindCare AI
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Understand Your Mind. Manage Your Stress. Improve Your Life.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-600 dark:text-slate-400">
            <Link to="/login" className="hover:text-slate-900 dark:hover:text-white">
              Login
            </Link>
            <Link to="/signup" className="hover:text-slate-900 dark:hover:text-white">
              Create Account
            </Link>
            <a href="#faq" className="hover:text-slate-900 dark:hover:text-white">
              Privacy & Disclaimer
            </a>
            <span>© {new Date().getFullYear()} MindCare AI</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
