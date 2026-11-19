import React, { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Compass,
  UserCircle2,
  Sun,
  Moon,
  LogOut,
  Menu,
  X,
  Play,
  Pause,
  SkipForward,
  Volume2,
  Check,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useMusicPlayer } from '../contexts/MusicPlayerContext';
import { useJourney } from '../contexts/JourneyContext';

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const {
    currentTrack,
    isPlaying,
    volume,
    elapsedSeconds,
    togglePlayPause,
    playNext,
    setVolume,
    stopPlayback,
  } = useMusicPlayer();
  const {
    steps,
    completedCount,
    progressPercent,
    allCompleted,
    nextStep,
    isStepCompleted,
    getStepByPath,
  } = useJourney();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const activeStep = getStepByPath(location.pathname);

  const pageTitle = activeStep
    ? `Step ${activeStep.stepNumber} · ${activeStep.title}`
    : location.pathname === '/app/profile'
    ? 'Profile & Privacy'
    : 'Daily Wellness Flow';

  const handleLogout = async () => {
    stopPlayback();
    await logout();
    navigate('/');
  };

  const renderSidebarNav = (onItemClick?: () => void) => (
    <div className="flex-1 px-3.5 py-5 space-y-5 overflow-y-auto">
      {/* Daily Flow Home + Compact Progress */}
      <div className="space-y-2.5">
        <NavLink
          to="/app/dashboard"
          onClick={onItemClick}
          className={({ isActive }) =>
            `flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-colors whitespace-nowrap ${
              isActive
                ? 'bg-[#EEF0F8] text-[#333D75] dark:bg-indigo-500/15 dark:text-indigo-200'
                : 'text-slate-700 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:bg-slate-800/60'
            }`
          }
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <Compass className="w-4 h-4 shrink-0 opacity-85" />
            <span className="truncate">Daily Flow</span>
          </span>
          <span className="font-mono tabular-nums text-[11px] text-slate-500 dark:text-slate-400">
            {completedCount}/{steps.length}
          </span>
        </NavLink>

        <div className="px-3.5 space-y-1.5">
          <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#3F4A8A] dark:bg-indigo-400 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            {allCompleted
              ? 'Today’s 6-step flow complete'
              : `${completedCount} of ${steps.length} steps done today`}
          </p>
        </div>
      </div>

      {/* Numbered Sequential Steps 1 -> 6 */}
      <nav aria-label="Sequential daily steps" className="space-y-1">
        <p className="px-3.5 pb-1 text-xs font-medium text-slate-400 dark:text-slate-500">
          Daily Sequence
        </p>
        {steps.map((step) => {
          const done = isStepCompleted(step.id);
          return (
            <NavLink
              key={step.id}
              to={step.path}
              onClick={onItemClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-[#EEF0F8] text-[#333D75] dark:bg-indigo-500/15 dark:text-indigo-200'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100'
                }`
              }
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono tabular-nums font-semibold shrink-0 transition-colors ${
                  done
                    ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : step.stepNumber}
              </span>
              <span className="truncate flex-1">{step.title}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Secondary Account Section */}
      <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800/70">
        <NavLink
          to="/app/profile"
          onClick={onItemClick}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-colors whitespace-nowrap ${
              isActive
                ? 'bg-[#EEF0F8] text-[#333D75] dark:bg-indigo-500/15 dark:text-indigo-200'
                : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100'
            }`
          }
        >
          <UserCircle2 className="w-4 h-4 shrink-0 opacity-85" />
          <span className="truncate">Profile & Privacy</span>
        </NavLink>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F6F7FB] dark:bg-[#0A0F1C] text-slate-900 dark:text-slate-100 sanctuary-atmosphere">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-[#0E1424]/95 backdrop-blur-md">
        <div className="h-16 flex items-center px-6 border-b border-slate-200/70 dark:border-slate-800/70">
          <Link
            to="/app/dashboard"
            className="font-display text-xl font-medium tracking-tight text-slate-900 dark:text-white whitespace-nowrap"
          >
            MindCare AI
          </Link>
        </div>

        {renderSidebarNav()}

        <div className="p-4 border-t border-slate-200/70 dark:border-slate-800/70 space-y-3">
          <div className="px-2">
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
              {user?.name}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {user?.role === 'demo' ? 'Demo Account · Seeded' : user?.email}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-300 dark:hover:bg-rose-950/40 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-white dark:bg-[#0E1424] h-full flex flex-col border-r border-slate-200 dark:border-slate-800 z-10">
            <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200/80 dark:border-slate-800/80">
              <span className="font-display text-xl font-medium text-slate-900 dark:text-white">
                MindCare AI
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close navigation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderSidebarNav(() => setMobileMenuOpen(false))}
            <div className="p-4 border-t border-slate-200/80 dark:border-slate-800/80">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <header className="h-16 sticky top-0 z-30 flex items-center justify-between gap-4 px-5 sm:px-9 border-b border-slate-200/70 dark:border-slate-800/70 bg-[#F6F7FB]/85 dark:bg-[#0A0F1C]/85 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5 text-sm min-w-0">
              <Link
                to="/app/dashboard"
                className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hidden sm:inline transition-colors"
              >
                Daily Flow
              </Link>
              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">/</span>
              <h1 className="font-display text-base font-medium text-slate-900 dark:text-white truncate">
                {pageTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200/90 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/80 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
              aria-label="Toggle color theme"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
            {!activeStep && (
              <Link
                to={nextStep.path}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#3F4A8A] hover:bg-[#333D75] dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0"
              >
                <span>
                  {completedCount === 0
                    ? 'Start Step 1'
                    : allCompleted
                    ? 'Review Step 1'
                    : `Continue Step ${nextStep.stepNumber}`}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </header>

        <main
          className={`flex-1 p-5 sm:p-8 lg:p-10 max-w-5xl w-full mx-auto ${
            currentTrack ? 'pb-28' : ''
          }`}
        >
          {/* Sequential Step Progress Strip on Steps 1-6 */}
          {activeStep && (
            <div className="mb-8 rounded-[22px] border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] px-4 py-3.5 sm:px-6 sm:py-4">
              <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 sm:pb-0">
                {steps.map((step, idx) => {
                  const isCurrent = step.id === activeStep.id;
                  const done = isStepCompleted(step.id);
                  return (
                    <React.Fragment key={step.id}>
                      <Link
                        to={step.path}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                          isCurrent
                            ? 'bg-[#EEF0F8] text-[#333D75] dark:bg-indigo-500/20 dark:text-indigo-200'
                            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-mono tabular-nums font-semibold ${
                            done
                              ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                              : isCurrent
                              ? 'bg-[#3F4A8A] text-white dark:bg-indigo-500'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {done ? <Check className="w-3 h-3" /> : step.stepNumber}
                        </span>
                        <span className={isCurrent ? 'inline' : 'hidden md:inline'}>
                          {step.shortLabel}
                        </span>
                      </Link>
                      {idx < steps.length - 1 && (
                        <div
                          className={`hidden sm:block flex-1 h-px min-w-[14px] ${
                            done
                              ? 'bg-emerald-400/70 dark:bg-emerald-600/60'
                              : 'bg-slate-200 dark:bg-slate-800'
                          }`}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}

          <Outlet />
        </main>

        {/* Persistent Frosted Soundscape Player */}
        {currentTrack && (
          <div className="fixed bottom-0 left-0 right-0 lg:left-64 z-40 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/92 dark:bg-[#0E1424]/92 backdrop-blur-lg px-5 sm:px-8 py-3">
            <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {currentTrack.title}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate tabular-nums">
                  {currentTrack.category} · {formatTime(elapsedSeconds)} /{' '}
                  {formatTime(currentTrack.durationSeconds)}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={togglePlayPause}
                  className="p-2 rounded-full bg-[#3F4A8A] text-white hover:bg-[#333D75] dark:bg-indigo-500 dark:hover:bg-indigo-400 transition-colors"
                  aria-label={isPlaying ? 'Pause soundscape' : 'Play soundscape'}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={playNext}
                  className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Next soundscape"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
                <div className="hidden sm:flex items-center gap-2 pl-2">
                  <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="w-20 accent-[#3F4A8A] dark:accent-indigo-400"
                    aria-label="Volume"
                  />
                </div>
                <button
                  type="button"
                  onClick={stopPlayback}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  aria-label="Close player"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
