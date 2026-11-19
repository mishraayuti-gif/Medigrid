import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api, extractApiError } from '../services/api';
import { SafeImage } from '../components/SafeImage';

function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F6F7FB] dark:bg-[#0A0F1C] grid grid-cols-1 lg:grid-cols-12">
      {/* Left Sanctuary Visual Column */}
      <div className="hidden lg:flex lg:col-span-6 relative overflow-hidden bg-slate-900">
        <SafeImage
          src="/src/assets/images/hero_mindcare_sanctuary_1795007514519.jpg"
          alt="Sunlit wellness sanctuary with soft linen curtains"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/35 to-slate-950/20" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <Link to="/" className="font-display text-xl font-medium tracking-tight text-white">
            MindCare AI
          </Link>

          <div className="max-w-md space-y-4">
            <p className="font-display italic text-2xl sm:text-3xl font-normal leading-snug text-white/95">
              “Stillness is where clarity begins—one breath, one honest check-in at a time.”
            </p>
            <p className="text-xs text-white/75 tracking-wide">
              Private wellness journaling · Deterministic stress scoring · Local Ollama AI
            </p>
          </div>
        </div>
      </div>

      {/* Right Clean Form Column */}
      <div className="lg:col-span-6 flex flex-col justify-center px-5 sm:px-12 py-12">
        <div className="max-w-md w-full mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white mb-8 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Return to MindCare AI
          </Link>

          <div className="rounded-[24px] border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] p-8 sm:p-10 shadow-[0_12px_36px_-24px_rgba(15,23,42,0.18)]">
            <p className="font-display text-sm font-medium text-[#3F4A8A] dark:text-indigo-300 mb-2 lg:hidden">
              MindCare AI
            </p>
            <h1 className="font-display text-3xl font-medium text-slate-900 dark:text-white tracking-tight">
              {title}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 mb-7 leading-relaxed">
              {subtitle}
            </p>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const { login, loginDemo } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter both your email and password.');
      return;
    }
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate('/app/dashboard');
    } catch (err) {
      setError(extractApiError(err, 'Unable to sign in. Check your credentials.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemo = async () => {
    setError('');
    setSubmitting(true);
    try {
      await loginDemo();
      navigate('/app/dashboard');
    } catch (err) {
      setError(extractApiError(err, 'Could not load demo session.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to access your private stress history, journal, and AI companion."
    >
      {error && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 px-3.5 py-2.5 text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full rounded-xl border border-slate-300/90 dark:border-slate-700 bg-[#F6F7FB]/50 dark:bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3F4A8A]/40 focus:border-[#3F4A8A] transition-colors"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-xs text-[#3F4A8A] dark:text-indigo-300 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full rounded-xl border border-slate-300/90 dark:border-slate-700 bg-[#F6F7FB]/50 dark:bg-slate-950/60 px-3.5 py-2.5 pr-10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3F4A8A]/40 focus:border-[#3F4A8A] transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-full bg-[#3F4A8A] hover:bg-[#333D75] dark:bg-indigo-500 dark:hover:bg-indigo-400 disabled:opacity-60 text-white text-sm font-medium transition-colors"
        >
          {submitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className="mt-5 pt-5 border-t border-slate-200/80 dark:border-slate-800/80 space-y-3.5">
        <button
          type="button"
          onClick={handleDemo}
          disabled={submitting}
          className="w-full py-2.5 rounded-full border border-slate-300/90 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors"
        >
          Explore Demo Workspace (demo@mindcare.ai)
        </button>
        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          New to MindCare AI?{' '}
          <Link to="/signup" className="text-[#3F4A8A] dark:text-indigo-300 font-medium hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

export function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (name.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    setSubmitting(true);
    try {
      await signup(name.trim(), email.trim(), password);
      navigate('/app/dashboard');
    } catch (err) {
      setError(extractApiError(err, 'Unable to create account.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Create your sanctuary"
      subtitle="Begin tracking your mental wellness privately with MindCare AI."
    >
      {error && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 px-3.5 py-2.5 text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Full name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex Rivera"
            required
            className="w-full rounded-xl border border-slate-300/90 dark:border-slate-700 bg-[#F6F7FB]/50 dark:bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3F4A8A]/40 focus:border-[#3F4A8A] transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full rounded-xl border border-slate-300/90 dark:border-slate-700 bg-[#F6F7FB]/50 dark:bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3F4A8A]/40 focus:border-[#3F4A8A] transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Password (minimum 8 characters)
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password"
              required
              minLength={8}
              className="w-full rounded-xl border border-slate-300/90 dark:border-slate-700 bg-[#F6F7FB]/50 dark:bg-slate-950/60 px-3.5 py-2.5 pr-10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3F4A8A]/40 focus:border-[#3F4A8A] transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-full bg-[#3F4A8A] hover:bg-[#333D75] dark:bg-indigo-500 dark:hover:bg-indigo-400 disabled:opacity-60 text-white text-sm font-medium transition-colors"
        >
          {submitting ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="text-[#3F4A8A] dark:text-indigo-300 font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatusMsg('');
    setSubmitting(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setStatusMsg(res.data.message);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Reset password"
      subtitle="Enter the email associated with your MindCare AI account."
    >
      {error && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 px-3.5 py-2.5 text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {statusMsg && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 px-3.5 py-2.5 text-xs text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{statusMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full rounded-xl border border-slate-300/90 dark:border-slate-700 bg-[#F6F7FB]/50 dark:bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3F4A8A]/40 focus:border-[#3F4A8A]"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-full bg-[#3F4A8A] hover:bg-[#333D75] dark:bg-indigo-500 dark:hover:bg-indigo-400 disabled:opacity-60 text-white text-sm font-medium transition-colors"
        >
          {submitting ? 'Sending instructions...' : 'Request Password Reset'}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
        Remembered your password?{' '}
        <Link to="/login" className="text-[#3F4A8A] dark:text-indigo-300 font-medium hover:underline">
          Back to login
        </Link>
      </p>
    </AuthShell>
  );
}
