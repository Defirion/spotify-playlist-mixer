// Types used by the playlist mixer.

import { Track } from '../../types/domain';

export interface PlaylistTracks {
  [playlistId: string]: Track[];
}

export type { MixedTrack } from '../../types/domain';

export interface DebugInfo {
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: unknown;
}

/** A track queue prepared for mixing without catalog ranking data. */
export interface PlaylistQueues extends PlaylistTracks {}
