import { StateCreator } from 'zustand';
import { SpotifyPlaylist } from '../../types/spotify';

export interface MixedPlaylistToast extends SpotifyPlaylist {
  toastId: string;
  createdAt: Date;
}

export interface UISlice {
  // State
  error: string | null;
  mixedPlaylists: MixedPlaylistToast[];

  // Actions
  setError: (error: string | null) => void;
  dismissError: () => void;
  addMixedPlaylist: (playlist: SpotifyPlaylist) => void;
  dismissSuccessToast: (toastId: string) => void;
}

export const createUISlice: StateCreator<
  UISlice,
  [['zustand/devtools', never], ['zustand/subscribeWithSelector', never]],
  [],
  UISlice
> = set => ({
  // Initial state
  error: null,
  mixedPlaylists: [],

  // Actions
  setError: error =>
    set(state => ({
      ...state,
      error,
    })),

  dismissError: () =>
    set(state => ({
      ...state,
      error: null,
    })),

  addMixedPlaylist: playlist =>
    set(state => {
      const playlistWithId: MixedPlaylistToast = {
        ...playlist,
        toastId: `${Date.now()}-${Math.random()}`,
        createdAt: new Date(),
      };
      return {
        ...state,
        mixedPlaylists: [playlistWithId, ...state.mixedPlaylists],
      };
    }),

  dismissSuccessToast: toastId =>
    set(state => ({
      ...state,
      mixedPlaylists: state.mixedPlaylists.filter(
        playlist => playlist.toastId !== toastId
      ),
    })),
});
