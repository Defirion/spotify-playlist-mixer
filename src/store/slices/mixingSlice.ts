import { StateCreator } from 'zustand';
import { MixOptions } from '../../types';

const DEFAULT_MIX_OPTIONS: MixOptions = {
  totalSongs: 100,
  targetDuration: 240,
  useTimeLimit: false,
  useAllSongs: true,
  playlistName: 'My Mixed Playlist',
  shuffleWithinGroups: true,
  popularityStrategy: 'mixed',
  recencyBoost: true,
  continueWhenPlaylistEmpty: false,
};

export interface MixingSlice {
  // State
  mixOptions: MixOptions;

  // Actions
  updateMixOptions: (updates: Partial<MixOptions>) => void;
  resetMixOptions: () => void;
  applyPresetOptions: (preset: {
    strategy: string;
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
      },
    })),

  resetMixOptions: () =>
    set(state => ({
      ...state,
      mixOptions: { ...DEFAULT_MIX_OPTIONS },
    })),

  applyPresetOptions: ({ strategy, settings, presetName }) =>
    set(state => ({
      ...state,
      mixOptions: {
        ...state.mixOptions,
        popularityStrategy: strategy as any, // Cast to handle string to PopularityStrategy
        recencyBoost: settings.recencyBoost ?? state.mixOptions.recencyBoost,
        shuffleWithinGroups:
          settings.shuffleWithinGroups ?? state.mixOptions.shuffleWithinGroups,
        useTimeLimit: settings.useTimeLimit || false,
        useAllSongs:
          settings.useAllSongs !== undefined
            ? settings.useAllSongs
            : state.mixOptions.useAllSongs,
        targetDuration:
          settings.targetDuration || state.mixOptions.targetDuration,
        playlistName: `${presetName} Mix`,
        continueWhenPlaylistEmpty:
          settings.continueWhenPlaylistEmpty !== undefined
            ? settings.continueWhenPlaylistEmpty
            : state.mixOptions.continueWhenPlaylistEmpty,
      },
    })),
});
