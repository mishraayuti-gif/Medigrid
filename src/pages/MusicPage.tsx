import React, { useEffect, useState } from 'react';
import {
  Play,
  Pause,
  Heart,
  Search,
  Volume2,
  Sparkles,
  Clock,
} from 'lucide-react';
import { api } from '../services/api';
import { useMusicPlayer } from '../contexts/MusicPlayerContext';
import { useJourney } from '../contexts/JourneyContext';
import { SequentialStepFooter } from '../components/SequentialStepFooter';
import type { MusicTrack } from '../types/wellness';
import { SafeImage } from '../components/SafeImage';

const MUSIC_FILTERS = [
  'All',
  'Relaxing',
  'Meditation',
  'Nature',
  'Rain',
  'Focus',
  'Sleep',
  'Lo-fi',
  'Favorites',
];

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function MusicPage() {
  const { markStepCompleted } = useJourney();
  const {
    tracks,
    currentTrack,
    isPlaying,
    volume,
    elapsedSeconds,
    favoriteIds,
    playTrack,
    togglePlayPause,
    setVolume,
    seekTo,
    toggleFavorite,
  } = useMusicPlayer();

  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [recommended, setRecommended] = useState<MusicTrack[]>([]);
  const [recContext, setRecContext] = useState<{
    latestStressScore: number | null;
    latestMood: string | null;
  } | null>(null);

  useEffect(() => {
    api
      .get('/music/recommendations')
      .then((res) => {
        setRecommended(res.data.tracks || []);
        setRecContext(res.data.context || null);
      })
      .catch(() => {});
  }, []);

  const handlePlayTrack = (track: MusicTrack) => {
    playTrack(track);
    markStepCompleted('music');
  };

  const filteredTracks = tracks.filter((t) => {
    const matchesSearch =
      !search.trim() ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase()) ||
      t.moodTags.some((m) => m.toLowerCase().includes(search.toLowerCase()));
    if (!matchesSearch) return false;

    if (category === 'All') return true;
    if (category === 'Favorites') return favoriteIds.includes(t.id);
    return t.category === category;
  });

  return (
    <div className="space-y-6">
      {/* Step 4 Heading */}
      <div>
        <p className="text-xs font-medium text-[#3F4A8A] dark:text-indigo-300">
          Step 4 of 6 · Calming Sound
        </p>
        <h2 className="font-display text-2xl font-medium tracking-tight text-slate-900 dark:text-white mt-0.5">
          Set a calm background soundscape
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Pick one ambient track below. It stays playing softly as you continue to Step 5.
        </p>
      </div>

      {/* Active Track Console */}
      {currentTrack && (
        <div className="rounded-[24px] border border-[#3F4A8A]/25 dark:border-indigo-500/30 bg-white dark:bg-[#111827] shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-6 flex flex-col md:flex-row items-center gap-6">
          <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0">
            <SafeImage
              src={currentTrack.coverImage}
              alt={currentTrack.title}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex-1 w-full space-y-3.5 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#3F4A8A] dark:text-indigo-300">
                  Now Playing · {currentTrack.category}
                </p>
                <h3 className="font-display text-xl font-medium tracking-tight text-slate-900 dark:text-white truncate mt-0.5">
                  {currentTrack.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => void toggleFavorite(currentTrack)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 transition-colors"
                aria-label="Toggle favorite"
              >
                <Heart
                  className={`w-4 h-4 ${
                    favoriteIds.includes(currentTrack.id)
                      ? 'fill-rose-500 text-rose-500'
                      : 'text-slate-400'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center gap-3.5">
              <button
                type="button"
                onClick={togglePlayPause}
                className="p-2.5 rounded-full bg-[#3F4A8A] hover:bg-[#333D75] dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white shrink-0 shadow-xs transition-colors"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>

              <span className="font-mono tabular-nums text-xs text-slate-500 w-10">
                {formatTime(elapsedSeconds)}
              </span>
              <input
                type="range"
                min={0}
                max={currentTrack.durationSeconds}
                value={elapsedSeconds}
                onChange={(e) => seekTo(Number(e.target.value))}
                className="flex-1 accent-[#3F4A8A] dark:accent-indigo-400"
                aria-label="Playback progress"
              />
              <span className="font-mono tabular-nums text-xs text-slate-500 w-10 text-right">
                {formatTime(currentTrack.durationSeconds)}
              </span>

              <div className="hidden sm:flex items-center gap-2 pl-2">
                <Volume2 className="w-4 h-4 text-slate-400" />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-24 accent-[#3F4A8A] dark:accent-indigo-400"
                  aria-label="Volume control"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recommended for Today */}
      {recommended.length > 0 && (
        <div className="space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#3F4A8A] dark:text-indigo-300" />
              <h3 className="font-display text-lg font-medium text-slate-900 dark:text-white">
                Suggested for Right Now
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {recContext?.latestMood ? `Mood: ${recContext.latestMood}` : 'Balanced baseline'}
              {recContext?.latestStressScore !== null && recContext?.latestStressScore !== undefined
                ? ` · Stress ${recContext.latestStressScore}/100`
                : ''}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recommended.map((track) => {
              const active = currentTrack?.id === track.id && isPlaying;
              return (
                <div
                  key={track.id}
                  className="rounded-[24px] border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] shadow-[0_1px_2px_rgba(15,23,42,0.03)] p-5 flex flex-col justify-between gap-4"
                >
                  <div>
                    <p className="text-xs font-medium text-[#3F4A8A] dark:text-indigo-300">
                      {track.category}
                    </p>
                    <h4 className="font-display text-base font-medium text-slate-900 dark:text-white mt-1">
                      {track.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                      {track.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => (active ? togglePlayPause() : handlePlayTrack(track))}
                    className={`inline-flex items-center justify-center gap-2 py-2.5 rounded-full text-xs font-medium transition-colors ${
                      active
                        ? 'bg-[#3F4A8A] text-white dark:bg-indigo-500'
                        : 'bg-[#EEF0F8] hover:bg-[#E2E6F4] text-[#3F4A8A] dark:bg-indigo-500/15 dark:hover:bg-indigo-500/25 dark:text-indigo-200'
                    }`}
                  >
                    {active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    {active ? 'Pause' : 'Play Now'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Full Library */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-display text-lg font-medium text-slate-900 dark:text-white">
            All Soundscapes
          </h3>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search rain, focus, sleep..."
              className="w-full rounded-full border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-[#111827] pl-10 pr-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3F4A8A]/25 dark:focus:ring-indigo-400/25 focus:border-[#3F4A8A] dark:focus:border-indigo-400 transition-all"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-full">
          {MUSIC_FILTERS.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                category === cat
                  ? 'bg-[#EEF0F8] text-[#3F4A8A] dark:bg-indigo-500/20 dark:text-indigo-200'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {filteredTracks.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              No soundscapes match this filter
            </p>
            <button
              type="button"
              onClick={() => {
                setCategory('All');
                setSearch('');
              }}
              className="mt-2 text-xs font-medium text-[#3F4A8A] dark:text-indigo-300 hover:underline"
            >
              Show all soundscapes
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTracks.map((track) => {
              const active = currentTrack?.id === track.id && isPlaying;
              const isFav = favoriteIds.includes(track.id);
              return (
                <div
                  key={track.id}
                  className="rounded-[22px] border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] shadow-[0_1px_2px_rgba(15,23,42,0.03)] p-4 flex items-center gap-4"
                >
                  <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0">
                    <SafeImage
                      src={track.coverImage}
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {track.category} ·{' '}
                      <span className="tabular-nums">
                        {Math.round(track.durationSeconds / 60)} min
                      </span>
                    </p>
                    <h4 className="font-display text-base font-medium text-slate-900 dark:text-white truncate mt-0.5">
                      {track.title}
                    </h4>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => void toggleFavorite(track)}
                      className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          isFav ? 'fill-rose-500 text-rose-500' : 'text-slate-400'
                        }`}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => (active ? togglePlayPause() : handlePlayTrack(track))}
                      className={`p-2.5 rounded-full transition-colors ${
                        active
                          ? 'bg-[#3F4A8A] dark:bg-indigo-500 text-white'
                          : 'bg-[#F6F7FB] dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-[#3F4A8A] hover:text-white dark:hover:bg-indigo-500'
                      }`}
                      aria-label={active ? `Pause ${track.title}` : `Play ${track.title}`}
                    >
                      {active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          Audio is synthesized locally via browser Web Audio API.
        </p>
      </div>

      <SequentialStepFooter stepId="music" />
    </div>
  );
}
