import { StateCreator } from 'zustand';
import { SpotifyPlaylist } from '../../types/spotify';
import { DisplayError } from '../../utils/normalizeError';

export interface MixedPlaylistToast extends SpotifyPlaylist {
  toastId: string;
  createdAt: Date;
}

export interface UISlice {
  // State
  error: DisplayError | null;
  mixedPlaylists: MixedPlaylistToast[];

  // Actions
  setError: (error: DisplayError | null) => void;
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
    set(state =>
      // Simple shallow compare is fine for this slice; callers should
      // provide normalized DisplayError objects created by normalizeError
      state.error === error
        ? state
        : {
            ...state,
            error,
          }
    ),

  dismissError: () =>
    set(state => ({
      ...state,
      error: null,
    })),

  addMixedPlaylist: playlist =>
    set(state => {
      // Debug: log when addMixedPlaylist is called
      // eslint-disable-next-line no-console
      if (process.env.DEBUG_UI === '1') {
        // eslint-disable-next-line no-console
        console.log('uiSlice.addMixedPlaylist called', {
          id: playlist?.id,
          name: playlist?.name,
        });
      }

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
