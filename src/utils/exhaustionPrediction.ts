import { MixOptions, RatioConfig, SpotifyPlaylist } from '../types';
import { getPlaylistItemCount } from './spotify';

export interface RatioSuggestion {
  playlistId: string;
  name: string;
  percentage: number;
  config: RatioConfig[string];
}

export interface RatioImbalanceWarning {
  limitingPlaylistName: string;
  mixWillBecomeImbalancedAt: string | number;
  unit: string;
  willStopEarly: boolean;
  isUseAllSongs?: boolean;
  suggestedRatios?: RatioSuggestion[];
}

/** Estimate exhaustion from source summaries, without loading or mixing tracks. */
export const predictExhaustion = (
  playlists: SpotifyPlaylist[],
  ratios: RatioConfig,
  options: MixOptions
): RatioImbalanceWarning | null => {
  const sources = playlists.filter(playlist => ratios[playlist.id]);
  if (sources.length < 2) return null;
  const timeBalanced = ratios[sources[0].id].weightType === 'time';
  // Mixed balance methods have no single count/time share to extrapolate.
  if (
    sources.some(p => (ratios[p.id].weightType === 'time') !== timeBalanced)
  ) {
    return null;
  }
  const totalWeight = sources.reduce(
    (sum, p) => sum + (ratios[p.id].weight || 1),
    0
  );
  const estimates = sources.map(playlist => {
    const count = getPlaylistItemCount(playlist);
    const average = playlist.realAverageDurationSeconds || 210;
    const share = (ratios[playlist.id].weight || 1) / totalWeight;
    const capacity = timeBalanced ? count * average : count;
    return { playlist, average, share, capacity, exhaustion: capacity / share };
  });
  const limiting = estimates.reduce((first, p) =>
    p.exhaustion < first.exhaustion ? p : first
  );
  const mixAverage = timeBalanced
    ? 1 / estimates.reduce((sum, p) => sum + p.share / p.average, 0)
    : estimates.reduce((sum, p) => sum + p.share * p.average, 0);
  const seconds = timeBalanced
    ? limiting.exhaustion
    : limiting.exhaustion * mixAverage;
  const songs = timeBalanced ? seconds / mixAverage : limiting.exhaustion;
  const point = options.useAllSongs || options.useTimeLimit ? seconds : songs;
  const target = options.useTimeLimit
    ? options.targetDurationSeconds
    : options.totalSongs;
  const latest = Math.max(...estimates.map(p => p.exhaustion));
  if (
    options.useAllSongs ? latest - limiting.exhaustion < 0.001 : point >= target
  ) {
    return null;
  }
  return {
    limitingPlaylistName: limiting.playlist.name,
    mixWillBecomeImbalancedAt:
      options.useAllSongs || options.useTimeLimit
        ? formatMinutes(seconds)
        : Math.floor(songs),
    unit: options.useAllSongs || options.useTimeLimit ? '' : 'songs',
    willStopEarly: !options.continueWhenPlaylistEmpty,
    isUseAllSongs: options.useAllSongs,
    suggestedRatios: suggestRatios(estimates, ratios),
  };
};

const formatMinutes = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
    : `${minutes}m`;
};

const suggestRatios = (
  estimates: { playlist: SpotifyPlaylist; capacity: number; share: number }[],
  ratios: RatioConfig
): RatioSuggestion[] => {
  // An empty source cannot be repaired by a positive priority slider.
  if (estimates.some(p => p.capacity === 0)) return [];
  const largest = Math.max(...estimates.map(p => p.capacity));
  const weights = estimates.map(p =>
    Math.max(1, Math.round((p.capacity / largest) * 100))
  );
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (
    estimates.every((p, i) => Math.abs(p.share - weights[i] / total) < 0.000001)
  ) {
    return [];
  }
  return estimates.map((p, i) => ({
    playlistId: p.playlist.id,
    name: p.playlist.name,
    percentage: Math.round((weights[i] / total) * 1000) / 10,
    config: { ...ratios[p.playlist.id], weight: weights[i] },
  }));
};
