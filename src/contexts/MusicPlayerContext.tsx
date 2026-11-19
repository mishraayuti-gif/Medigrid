import React, { createContext, useContext, useEffect, useState } from 'react';
import type { MusicTrack } from '../types/wellness';
import { api } from '../services/api';
import { soundEngine } from '../utils/soundEngine';
import { useAuth } from './AuthContext';

interface MusicPlayerContextValue {
  tracks: MusicTrack[];
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  volume: number;
  elapsedSeconds: number;
  favoriteIds: string[];
  recentlyPlayedIds: string[];
  playTrack: (track: MusicTrack) => void;
  togglePlayPause: () => void;
  stopPlayback: () => void;
  setVolume: (vol: number) => void;
  seekTo: (seconds: number) => void;
  toggleFavorite: (track: MusicTrack) => Promise<void>;
  playNext: () => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextValue | undefined>(undefined);

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.55);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [recentlyPlayedIds, setRecentlyPlayedIds] = useState<string[]>([]);

  useEffect(() => {
    api
      .get('/music')
      .then((res) => setTracks(res.data.tracks || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) {
      setFavoriteIds([]);
      setRecentlyPlayedIds([]);
      soundEngine.stop();
      setIsPlaying(false);
      return;
    }
    api
      .get('/music/history')
      .then((res) => {
        setFavoriteIds(res.data.favoriteTrackIds || []);
        setRecentlyPlayedIds(res.data.recentlyPlayedIds || []);
      })
      .catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    if (!isPlaying || !currentTrack) return;
    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => {
        if (prev + 1 >= currentTrack.durationSeconds) {
          return 0;
        }
        return prev + 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isPlaying, currentTrack]);

  useEffect(() => {
    return () => {
      soundEngine.stop();
    };
  }, []);

  const playTrack = (track: MusicTrack) => {
    setCurrentTrack(track);
    setElapsedSeconds(0);
    setIsPlaying(true);
    soundEngine.start(track.synthPreset, volume);

    if (user) {
      setRecentlyPlayedIds((prev) => [track.id, ...prev.filter((id) => id !== track.id)].slice(0, 8));
      api.post('/music/history', { trackId: track.id, action: 'play', durationListened: 60 }).catch(() => {});
    }
  };

  const togglePlayPause = () => {
    if (!currentTrack) {
      if (tracks.length > 0) playTrack(tracks[0]);
      return;
    }
    if (isPlaying) {
      soundEngine.stop();
      setIsPlaying(false);
    } else {
      soundEngine.start(currentTrack.synthPreset, volume);
      setIsPlaying(true);
    }
  };

  const stopPlayback = () => {
    soundEngine.stop();
    setIsPlaying(false);
    setCurrentTrack(null);
    setElapsedSeconds(0);
  };

  const setVolume = (vol: number) => {
    setVolumeState(vol);
    soundEngine.setVolume(vol);
  };

  const seekTo = (seconds: number) => {
    if (!currentTrack) return;
    setElapsedSeconds(Math.max(0, Math.min(currentTrack.durationSeconds, seconds)));
  };

  const toggleFavorite = async (track: MusicTrack) => {
    const isFav = favoriteIds.includes(track.id);
    const nextAction = isFav ? 'unfavorite' : 'favorite';
    setFavoriteIds((prev) => (isFav ? prev.filter((id) => id !== track.id) : [...prev, track.id]));
    if (user) {
      await api.post('/music/history', { trackId: track.id, action: nextAction }).catch(() => {});
    }
  };

  const playNext = () => {
    if (!tracks.length) return;
    if (!currentTrack) {
      playTrack(tracks[0]);
      return;
    }
    const idx = tracks.findIndex((t) => t.id === currentTrack.id);
    const next = tracks[(idx + 1) % tracks.length];
    playTrack(next);
  };

  return (
    <MusicPlayerContext.Provider
      value={{
        tracks,
        currentTrack,
        isPlaying,
        volume,
        elapsedSeconds,
        favoriteIds,
        recentlyPlayedIds,
        playTrack,
        togglePlayPause,
        stopPlayback,
        setVolume,
        seekTo,
        toggleFavorite,
        playNext,
      }}
    >
      {children}
    </MusicPlayerContext.Provider>
  );
}

export function useMusicPlayer() {
  const ctx = useContext(MusicPlayerContext);
  if (!ctx) throw new Error('useMusicPlayer must be used inside MusicPlayerProvider');
  return ctx;
}
