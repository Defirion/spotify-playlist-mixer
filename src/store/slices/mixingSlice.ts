import { StateCreator } from 'zustand';
import { MixOptions } from '../../types';

const DEFAULT_MIX_OPTIONS: MixOptions = {
  totalSongs: 100,
  targetDurationSeconds: 240 * 60,
  useTimeLimit: false,
  useAllSongs: true,
  playlistName: 'My Mixed Playlist',
  shuffleTracks: true,
  continueWhenPlaylistEmpty: false,
};

export interface MixingSlice {
  // State
  mixOptions: MixOptions;

  // Actions
  updateMixOptions: (updates: Partial<MixOptions>) => void;
  resetMixOptions: () => void;
  applyPresetOptions: (preset: {
    settings: Partial<MixOptions>;
    presetName: string;
  }) => void;
}

export const createMixingSlice: StateCreator<
  MixingSlice,
  [['zustand/devtools', never], ['zustand/subscribeWithSelector', never]],
  [],
  MixingSlice
> = set => ({
  // Initial state
  mixOptions: DEFAULT_MIX_OPTIONS,

  // Actions
  updateMixOptions: updates =>
    set(state => ({
      ...state,
      mixOptions: {
        ...state.mixOptions,
        ...updates,
        // Explicitly selecting a mode takes precedence over the previous mode.
        useAllSongs:
          updates.useAllSongs === true
            ? true
            : updates.useTimeLimit === true
              ? false
              : (updates.useAllSongs ?? state.mixOptions.useAllSongs),
        useTimeLimit:
          updates.useAllSongs === true
            ? false
            : (updates.useTimeLimit ?? state.mixOptions.useTimeLimit),
      },
    })),

  resetMixOptions: () =>
    set(state => ({
      ...state,
      mixOptions: { ...DEFAULT_MIX_OPTIONS },
    })),

  applyPresetOptions: ({ settings, presetName }) =>
    set(state => ({
      ...state,
      mixOptions: {
        ...state.mixOptions,
        shuffleTracks: settings.shuffleTracks ?? state.mixOptions.shuffleTracks,
        totalSongs: settings.totalSongs ?? state.mixOptions.totalSongs,
        useTimeLimit:
          settings.useAllSongs === true
            ? false
            : (settings.useTimeLimit ?? false),
        useAllSongs:
          settings.useAllSongs !== undefined
            ? settings.useAllSongs
            : settings.useTimeLimit
              ? false
              : state.mixOptions.useAllSongs,
        targetDurationSeconds:
          settings.targetDurationSeconds ??
          state.mixOptions.targetDurationSeconds,
        playlistName: `${presetName} Mix`,
        continueWhenPlaylistEmpty:
          settings.continueWhenPlaylistEmpty !== undefined
            ? settings.continueWhenPlaylistEmpty
            : state.mixOptions.continueWhenPlaylistEmpty,
      },
    })),
});
