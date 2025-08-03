import { StateCreator } from 'zustand';
import { SpotifyPlaylist } from '../../types/spotify';
import { RatioConfig, RatioConfigItem } from '../../types/mixer';

const DEFAULT_RATIO_CONFIG: RatioConfigItem = {
  min: 1,
  max: 2,
  weight: 2,
  weightType: 'frequency',
};

export interface PlaylistSlice {
  // State
  selectedPlaylists: SpotifyPlaylist[];
  ratioConfig: RatioConfig;

  // Playlist selection actions
  selectPlaylist: (playlist: SpotifyPlaylist) => void;
  deselectPlaylist: (playlistId: string) => void;
  togglePlaylistSelection: (playlist: SpotifyPlaylist) => void;
  clearAllPlaylists: () => void;
  isPlaylistSelected: (playlistId: string) => boolean;

  // Ratio configuration actions
  updateRatioConfig: (
    playlistId: string,
    config: Partial<RatioConfigItem>
  ) => void;
  removeRatioConfig: (playlistId: string) => void;
  addPlaylistToRatioConfig: (
    playlistId: string,
    config?: Partial<RatioConfigItem>
  ) => void;
  setRatioConfigBulk: (newConfig: RatioConfig) => void;
  clearRatioConfig: () => void;
  getRatioConfig: (playlistId: string) => RatioConfigItem;
}

export const createPlaylistSlice: StateCreator<
  PlaylistSlice,
  [['zustand/devtools', never], ['zustand/subscribeWithSelector', never]],
  [],
  PlaylistSlice
> = (set, get) => ({
  // Initial state
  selectedPlaylists: [],
  ratioConfig: {},

  // Playlist selection actions
  selectPlaylist: playlist =>
    set(state => {
      // Check if playlist is already selected
      if (!state.selectedPlaylists.find(p => p.id === playlist.id)) {
        return {
          ...state,
          selectedPlaylists: [...state.selectedPlaylists, playlist],
        };
      }
      return state;
    }),

  deselectPlaylist: playlistId =>
    set(state => ({
      ...state,
      selectedPlaylists: state.selectedPlaylists.filter(
        p => p.id !== playlistId
      ),
    })),

  togglePlaylistSelection: playlist =>
    set(state => {
      const existingIndex = state.selectedPlaylists.findIndex(
        p => p.id === playlist.id
      );
      if (existingIndex >= 0) {
        // Remove playlist and its ratio config
        const newRatioConfig = { ...state.ratioConfig };
        delete newRatioConfig[playlist.id];
        return {
          ...state,
          selectedPlaylists: state.selectedPlaylists.filter(
            p => p.id !== playlist.id
          ),
          ratioConfig: newRatioConfig,
        };
      } else {
        // Add playlist and default ratio config
        return {
          ...state,
          selectedPlaylists: [...state.selectedPlaylists, playlist],
          ratioConfig: {
            ...state.ratioConfig,
            [playlist.id]: { ...DEFAULT_RATIO_CONFIG },
          },
        };
      }
    }),

  clearAllPlaylists: () =>
    set(state => ({
      ...state,
      selectedPlaylists: [],
      ratioConfig: {},
    })),

  isPlaylistSelected: playlistId => {
    const state = get();
    return state.selectedPlaylists.some(p => p.id === playlistId);
  },

  // Ratio configuration actions
  updateRatioConfig: (playlistId, config) =>
    set(state => ({
      ...state,
      ratioConfig: {
        ...state.ratioConfig,
        [playlistId]: {
          ...DEFAULT_RATIO_CONFIG,
          ...state.ratioConfig[playlistId],
          ...config,
        },
      },
    })),

  removeRatioConfig: playlistId =>
    set(state => {
      const newConfig = { ...state.ratioConfig };
      delete newConfig[playlistId];
      return {
        ...state,
        ratioConfig: newConfig,
      };
    }),

  addPlaylistToRatioConfig: (playlistId, config = {}) =>
    set(state => ({
      ...state,
      ratioConfig: {
        ...state.ratioConfig,
        [playlistId]: {
          ...DEFAULT_RATIO_CONFIG,
          ...config,
        },
      },
    })),

  setRatioConfigBulk: newConfig =>
    set(state => ({
      ...state,
      ratioConfig: newConfig,
    })),

  clearRatioConfig: () =>
    set(state => ({
      ...state,
      ratioConfig: {},
    })),

  getRatioConfig: playlistId => {
    const state = get();
    return state.ratioConfig[playlistId] || DEFAULT_RATIO_CONFIG;
  },
});
