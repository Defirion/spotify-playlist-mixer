// Types used by the playlist mixer.

import { SpotifyTrack } from '../../types/spotify';

export interface PlaylistTracks {
  [playlistId: string]: SpotifyTrack[];
}

export interface MixedTrack extends SpotifyTrack {
  sourcePlaylist: string;
}

export interface DebugInfo {
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: unknown;
}

/** A track queue prepared for mixing without catalog ranking data. */
export interface PlaylistQueues extends PlaylistTracks {}
