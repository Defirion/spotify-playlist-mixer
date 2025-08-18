import { StateCreator } from 'zustand';
import { arrayMove } from '@dnd-kit/sortable';
import { SpotifyTrack } from '../../types/spotify';

export interface TrackSlice {
  // State
  tracks: SpotifyTrack[];

  // Actions
  setTracks: (tracks: SpotifyTrack[]) => void;
  reorderTracks: (activeId: string, overId: string) => void;
  clearTracks: () => void;
}

export const createTrackSlice: StateCreator<
  TrackSlice,
  [['zustand/devtools', never], ['zustand/subscribeWithSelector', never]],
  [],
  TrackSlice
> = (set, _get) => ({
  // Initial state
  tracks: [],

  // Actions
  setTracks: tracks =>
    set(state => ({
      ...state,
      tracks,
    })),

  reorderTracks: (activeId, overId) =>
    set(state => {
      const oldIndex = state.tracks.findIndex(track => track.id === activeId);
      const newIndex = state.tracks.findIndex(track => track.id === overId);

      // Handle edge cases
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
        return state;
      }

      return {
        ...state,
        tracks: arrayMove(state.tracks, oldIndex, newIndex),
      };
    }),

  clearTracks: () =>
    set(state => ({
      ...state,
      tracks: [],
    })),
});
