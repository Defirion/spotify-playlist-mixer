import { act, renderHook } from '@testing-library/react';
import { useAppStore, useTracks } from '../index';
import { SpotifyTrack } from '../../types/spotify';
import { makeTrack } from '../../test-utils/mocks/spotify';

// Mock track data using factory to ensure full shape
const mockTrack1: SpotifyTrack = makeTrack({
  id: 'track1',
  name: 'Test Track 1',
  duration_ms: 180000,
  popularity: 75,
  preview_url: 'https://example.com/preview1',
  external_urls: { spotify: 'https://open.spotify.com/track/track1' },
  uri: 'spotify:track:track1',
});

const mockTrack2: SpotifyTrack = makeTrack({
  id: 'track2',
  name: 'Test Track 2',
  duration_ms: 200000,
  popularity: 80,
  preview_url: 'https://example.com/preview2',
  external_urls: { spotify: 'https://open.spotify.com/track/track2' },
  uri: 'spotify:track:track2',
});

const mockTrack3: SpotifyTrack = makeTrack({
  id: 'track3',
  name: 'Test Track 3',
  duration_ms: 220000,
  popularity: 65,
  preview_url: 'https://example.com/preview3',
  external_urls: { spotify: 'https://open.spotify.com/track/track3' },
  uri: 'spotify:track:track3',
});

describe('Track Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAppStore.setState({
      tracks: [],
    });
  });

  describe('Track Management', () => {
    it('should set tracks correctly', () => {
      const { result } = renderHook(() => useTracks());

      expect(result.current.tracks).toHaveLength(0);

      act(() => {
        result.current.setTracks([mockTrack1, mockTrack2, mockTrack3]);
      });

      expect(result.current.tracks).toHaveLength(3);
      expect(result.current.tracks[0]).toEqual(mockTrack1);
      expect(result.current.tracks[1]).toEqual(mockTrack2);
      expect(result.current.tracks[2]).toEqual(mockTrack3);
    });

    it('should clear tracks correctly', () => {
      const { result } = renderHook(() => useTracks());

      act(() => {
        result.current.setTracks([mockTrack1, mockTrack2]);
      });

      expect(result.current.tracks).toHaveLength(2);

      act(() => {
        result.current.clearTracks();
      });

      expect(result.current.tracks).toHaveLength(0);
    });
  });

  describe('reorderTracks', () => {
    it('should move items correctly', () => {
      const { result } = renderHook(() => useTracks());

      act(() => {
        result.current.setTracks([mockTrack1, mockTrack2, mockTrack3]);
      });

      // Move track1 to position of track3 (index 0 to index 2)
      act(() => {
        result.current.reorderTracks('track1', 'track3');
      });

      expect(result.current.tracks).toHaveLength(3);
      expect(result.current.tracks[0]).toEqual(mockTrack2);
      expect(result.current.tracks[1]).toEqual(mockTrack3);
      expect(result.current.tracks[2]).toEqual(mockTrack1);
    });

    it('should move items from end to beginning', () => {
      const { result } = renderHook(() => useTracks());

      act(() => {
        result.current.setTracks([mockTrack1, mockTrack2, mockTrack3]);
      });

      // Move track3 to position of track1 (index 2 to index 0)
      act(() => {
        result.current.reorderTracks('track3', 'track1');
      });

      expect(result.current.tracks).toHaveLength(3);
      expect(result.current.tracks[0]).toEqual(mockTrack3);
      expect(result.current.tracks[1]).toEqual(mockTrack1);
      expect(result.current.tracks[2]).toEqual(mockTrack2);
    });

    it('should handle edge cases (same position, invalid IDs)', () => {
      const { result } = renderHook(() => useTracks());

      act(() => {
        result.current.setTracks([mockTrack1, mockTrack2, mockTrack3]);
      });

      const originalTracks = [...result.current.tracks];

      // Same position - should not change anything
      act(() => {
        result.current.reorderTracks('track1', 'track1');
      });

      expect(result.current.tracks).toEqual(originalTracks);

      // Invalid activeId - should not change anything
      act(() => {
        result.current.reorderTracks('invalid-id', 'track2');
      });

      expect(result.current.tracks).toEqual(originalTracks);

      // Invalid overId - should not change anything
      act(() => {
        result.current.reorderTracks('track1', 'invalid-id');
      });

      expect(result.current.tracks).toEqual(originalTracks);

      // Both invalid - should not change anything
      act(() => {
        result.current.reorderTracks('invalid1', 'invalid2');
      });

      expect(result.current.tracks).toEqual(originalTracks);
    });
  });

  describe('Store state updates trigger re-renders', () => {
    it('should trigger re-renders when tracks are reordered', () => {
      const { result } = renderHook(() => useTracks());

      act(() => {
        result.current.setTracks([mockTrack1, mockTrack2, mockTrack3]);
      });

      expect(result.current.tracks).toHaveLength(3);

      act(() => {
        result.current.reorderTracks('track1', 'track2');
      });

      // Verify the reorder worked, which confirms re-render occurred
      expect(result.current.tracks[0]).toEqual(mockTrack2);
      expect(result.current.tracks[1]).toEqual(mockTrack1);
      expect(result.current.tracks[2]).toEqual(mockTrack3);
    });
  });

  describe('arrayMove logic is contained in store, not components', () => {
    it('should encapsulate arrayMove logic within the store action', () => {
      const { result } = renderHook(() => useTracks());

      act(() => {
        result.current.setTracks([mockTrack1, mockTrack2, mockTrack3]);
      });

      // The reorderTracks action should handle all the arrayMove logic internally
      // Components should only need to call reorderTracks with activeId and overId
      act(() => {
        result.current.reorderTracks('track2', 'track1');
      });

      // Verify the move was handled correctly by the store
      expect(result.current.tracks[0]).toEqual(mockTrack2);
      expect(result.current.tracks[1]).toEqual(mockTrack1);
      expect(result.current.tracks[2]).toEqual(mockTrack3);
    });

    it('should handle complex reordering scenarios', () => {
      const { result } = renderHook(() => useTracks());

      act(() => {
        result.current.setTracks([mockTrack1, mockTrack2, mockTrack3]);
      });

      // Multiple reorders to test the internal logic
      act(() => {
        result.current.reorderTracks('track1', 'track3'); // [track2, track3, track1]
      });

      act(() => {
        result.current.reorderTracks('track3', 'track2'); // [track3, track2, track1]
      });

      expect(result.current.tracks[0]).toEqual(mockTrack3);
      expect(result.current.tracks[1]).toEqual(mockTrack2);
      expect(result.current.tracks[2]).toEqual(mockTrack1);
    });
  });

  describe('Integration with existing store', () => {
    it('should work alongside other store slices', () => {
      const { result: trackResult } = renderHook(() => useTracks());

      // Set up tracks
      act(() => {
        trackResult.current.setTracks([mockTrack1, mockTrack2]);
      });

      // Verify tracks are set
      expect(trackResult.current.tracks).toHaveLength(2);

      // Verify other store functionality still works
      const directState = useAppStore.getState();
      expect(directState.tracks).toHaveLength(2);
      expect(directState.selectedPlaylists).toBeDefined();
      expect(directState.mixOptions).toBeDefined();
    });
  });
});
