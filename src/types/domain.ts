/** Models used by mixing and future sources, independent of provider DTOs. */
export interface SourceRef {
  provider: string;
  id: string;
  uri?: string;
}

export interface Track {
  /** Provider-qualified identity; equal catalog tracks share this ID. */
  id: string;
  title: string;
  artists: string[];
  durationMs: number;
  sourceRefs: SourceRef[];
  album?: string;
  isrc?: string;
  releaseDate?: string;
  artworkUrl?: string;
}

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  source?: SourceRef;
  sourceTotal?: number;
}

export interface MixedTrack extends Track {
  sourcePlaylist: string;
  instanceId?: string;
  originalIndex?: number;
}

export interface MixResult {
  tracks: MixedTrack[];
  exhaustedPlaylists: string[];
  stoppedEarly: boolean;
}

export interface PlaylistReadOptions {
  signal?: AbortSignal;
  onProgress?: (progress: {
    loaded: number;
    total: number;
    percentage: number;
  }) => void;
}

export interface PlaylistSource {
  getPlaylist(
    reference: Pick<Playlist, 'id' | 'name' | 'source'>,
    options?: PlaylistReadOptions
  ): Promise<Playlist>;
}

export interface CreatedPlaylist {
  playlist: Playlist;
  url?: string;
  confirmedTracks: number;
}

export interface PlaylistDestination {
  savePlaylist(
    playlist: Playlist,
    options?: { isSessionCurrent?: () => boolean }
  ): Promise<CreatedPlaylist>;
}
