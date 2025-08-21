// Pure helper to normalize the various shapes returned by mixPlaylists
import { MixedTrack } from '../types';

export interface NormalizedMixResult {
  tracks: MixedTrack[];
  exhaustedPlaylists: string[];
  stoppedEarly: boolean;
}

export default function normalizeMixResult(raw: unknown): NormalizedMixResult {
  if (raw === null || raw === undefined) {
    return { tracks: [], exhaustedPlaylists: [], stoppedEarly: false };
  }

  // If the implementation returned an array (old behavior)
  if (Array.isArray(raw)) {
    const anyRaw = raw as any;
    return {
      tracks: [...(raw as MixedTrack[])],
      exhaustedPlaylists: Array.isArray(anyRaw.exhaustedPlaylists)
        ? anyRaw.exhaustedPlaylists
        : [],
      stoppedEarly: Boolean(anyRaw.stoppedEarly),
    };
  }

  // If the implementation returned an object with a `tracks` array
  if (typeof raw === 'object') {
    const obj: any = raw;
    return {
      tracks: Array.isArray(obj.tracks) ? [...obj.tracks] : [],
      exhaustedPlaylists: Array.isArray(obj.exhaustedPlaylists)
        ? obj.exhaustedPlaylists
        : [],
      stoppedEarly: Boolean(obj.stoppedEarly),
    };
  }

  // Unknown shape -> safe empty
  return { tracks: [], exhaustedPlaylists: [], stoppedEarly: false };
}
