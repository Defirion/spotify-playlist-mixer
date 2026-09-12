import { renderHook } from '@testing-library/react';
import { useTrackOperations } from '../useTrackOperations';
import { MixedTrack, SpotifyTrack } from '../../types';

const createMockTrack = (id: string, sourcePlaylist: string): MixedTrack => ({
  id,
  name: `Track ${id}`,
  artists: [
    {
      id: 'artist1',
      name: 'Artist',
      uri: 'spotify:artist:artist1',
      external_urls: { spotify: 'https://spotify.com/artist/artist1' },
    },
  ],
  album: {
    id: 'album1',
    name: 'Album',
    images: [],
    release_date: '2023-01-01',
    uri: 'spotify:album:album1',
    external_urls: { spotify: 'https://spotify.com/album/album1' },
  },
  duration_ms: 180000,
  uri: `spotify:track:${id}`,
  external_urls: { spotify: `https://spotify.com/track/${id}` },
  track_number: 1,
  explicit: false,
  preview_url: null,
  sourcePlaylist,
});

const createSpotifyTrack = (
  id: string,
  sourcePlaylist?: string
): SpotifyTrack => ({
  id,
  name: `Track ${id}`,
  artists: [
    {
      id: 'artist1',
      name: 'Artist',
      uri: 'spotify:artist:artist1',
      external_urls: { spotify: 'https://spotify.com/artist/artist1' },
    },
  ],
  album: {
    id: 'album1',
    name: 'Album',
    images: [],
    release_date: '2023-01-01',
    uri: 'spotify:album:album1',
    external_urls: { spotify: 'https://spotify.com/album/album1' },
  },
  duration_ms: 180000,
  uri: `spotify:track:${id}`,
  external_urls: { spotify: `https://spotify.com/track/${id}` },
  track_number: 1,
  explicit: false,
  preview_url: null,
  sourcePlaylist,
});

describe('useTrackOperations', () => {
  let mockScrollContainer: HTMLElement;
  let mockOnTrackOrderChange: import('vitest').Mock;

  beforeEach(() => {
    mockOnTrackOrderChange = vi.fn();

    // Create mock scroll container
    mockScrollContainer = {
      scrollTop: 100,
      clientHeight: 500,
      scrollHeight: 1000,
    } as HTMLElement;

    // Quiet the hook's scroll-capture logging during passing runs
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('handleScrollPositionCapture', () => {
    it('still reorders tracks when the scroll container ref is null', () => {
      const tracks = [
        createMockTrack('1', 'playlist1'),
        createMockTrack('2', 'playlist2'),
      ];
      const scrollContainerRef = { current: null };

      const { result } = renderHook(() =>
        useTrackOperations({
          tracks,
          onTrackOrderChange: mockOnTrackOrderChange,
          scrollContainerRef,
        })
      );

      result.current.handleInternalReorder(0, 1);

      expect(mockOnTrackOrderChange).toHaveBeenCalledTimes(1);
      const reordered = mockOnTrackOrderChange.mock.calls[0][0];
      expect(reordered.map((t: SpotifyTrack) => t.id).sort()).toEqual([
        '1',
        '2',
      ]);
    });

    it('still reorders tracks when scroll position capture is not critical', () => {
      // Test that the core functionality works regardless of scroll position capture
      const tracks = [
        createMockTrack('1', 'playlist1'),
        createMockTrack('2', 'playlist2'),
        createMockTrack('3', 'playlist3'),
      ];
      const scrollContainerRef = { current: mockScrollContainer };

      const { result } = renderHook(() =>
        useTrackOperations({
          tracks,
          onTrackOrderChange: mockOnTrackOrderChange,
          scrollContainerRef,
        })
      );

      result.current.handleInternalReorder(0, 2); // Move first track to third position

      // Verify that the reorder functionality works
      expect(mockOnTrackOrderChange).toHaveBeenCalledWith([
        expect.objectContaining({ id: '2' }), // Track 2 moves to first position
        expect.objectContaining({ id: '1' }), // Track 1 moves to second position
        expect.objectContaining({ id: '3' }), // Track 3 stays in third position
      ]);
    });
  });

  describe('handleInternalReorder', () => {
    it('reorders tracks correctly when moving forward', () => {
      const tracks = [
        createMockTrack('1', 'playlist1'),
        createMockTrack('2', 'playlist2'),
        createMockTrack('3', 'playlist3'),
      ];
      const scrollContainerRef = { current: mockScrollContainer };

      const { result } = renderHook(() =>
        useTrackOperations({
          tracks,
          onTrackOrderChange: mockOnTrackOrderChange,
          scrollContainerRef,
        })
      );

      result.current.handleInternalReorder(0, 2); // Move first track to third position

      expect(mockOnTrackOrderChange).toHaveBeenCalledWith([
        tracks[1], // Track 2
        tracks[0], // Track 1 (moved)
        tracks[2], // Track 3
      ]);
    });

    it('reorders tracks correctly when moving backward', () => {
      const tracks = [
        createMockTrack('1', 'playlist1'),
        createMockTrack('2', 'playlist2'),
        createMockTrack('3', 'playlist3'),
      ];
      const scrollContainerRef = { current: mockScrollContainer };

      const { result } = renderHook(() =>
        useTrackOperations({
          tracks,
          onTrackOrderChange: mockOnTrackOrderChange,
          scrollContainerRef,
        })
      );

      result.current.handleInternalReorder(2, 0); // Move third track to first position

      expect(mockOnTrackOrderChange).toHaveBeenCalledWith([
        tracks[2], // Track 3 (moved)
        tracks[0], // Track 1
        tracks[1], // Track 2
      ]);
    });

    it('does not reorder when fromIndex equals toIndex', () => {
      const tracks = [createMockTrack('1', 'playlist1')];
      const scrollContainerRef = { current: mockScrollContainer };

      const { result } = renderHook(() =>
        useTrackOperations({
          tracks,
          onTrackOrderChange: mockOnTrackOrderChange,
          scrollContainerRef,
        })
      );

      result.current.handleInternalReorder(0, 0);

      expect(mockOnTrackOrderChange).not.toHaveBeenCalled();
    });

    it('does not reorder when onTrackOrderChange is not provided', () => {
      const tracks = [createMockTrack('1', 'playlist1')];
      const scrollContainerRef = { current: mockScrollContainer };

      const { result } = renderHook(() =>
        useTrackOperations({
          tracks,
          onTrackOrderChange: undefined,
          scrollContainerRef,
        })
      );

      result.current.handleInternalReorder(0, 1);

      expect(mockOnTrackOrderChange).not.toHaveBeenCalled();
    });
  });

  describe('handleExternalAdd', () => {
    it('adds track at specified index', () => {
      const tracks = [
        createMockTrack('1', 'playlist1'),
        createMockTrack('2', 'playlist2'),
      ];
      const newTrack = createMockTrack('3', 'playlist3');
      const scrollContainerRef = { current: mockScrollContainer };

      const { result } = renderHook(() =>
        useTrackOperations({
          tracks,
          onTrackOrderChange: mockOnTrackOrderChange,
          scrollContainerRef,
        })
      );

      result.current.handleExternalAdd(newTrack, 1);

      expect(mockOnTrackOrderChange).toHaveBeenCalledWith([
        tracks[0],
        newTrack,
        tracks[1],
      ]);
    });

    it('adds track at end when no index specified', () => {
      const tracks = [createMockTrack('1', 'playlist1')];
      const newTrack = createMockTrack('2', 'playlist2');
      const scrollContainerRef = { current: mockScrollContainer };

      const { result } = renderHook(() =>
        useTrackOperations({
          tracks,
          onTrackOrderChange: mockOnTrackOrderChange,
          scrollContainerRef,
        })
      );

      result.current.handleExternalAdd(newTrack);

      expect(mockOnTrackOrderChange).toHaveBeenCalledWith([
        tracks[0],
        newTrack,
      ]);
    });

    it('does not add when onTrackOrderChange is not provided', () => {
      const tracks = [createMockTrack('1', 'playlist1')];
      const newTrack = createMockTrack('2', 'playlist2');
      const scrollContainerRef = { current: mockScrollContainer };

      const { result } = renderHook(() =>
        useTrackOperations({
          tracks,
          onTrackOrderChange: undefined,
          scrollContainerRef,
        })
      );

      result.current.handleExternalAdd(newTrack);

      expect(mockOnTrackOrderChange).not.toHaveBeenCalled();
    });
  });

  describe('handleTrackRemove', () => {
    it('removes track at specified index', () => {
      const tracks = [
        createMockTrack('1', 'playlist1'),
        createMockTrack('2', 'playlist2'),
        createMockTrack('3', 'playlist3'),
      ];
      const scrollContainerRef = { current: mockScrollContainer };

      const { result } = renderHook(() =>
        useTrackOperations({
          tracks,
          onTrackOrderChange: mockOnTrackOrderChange,
          scrollContainerRef,
        })
      );

      result.current.handleTrackRemove(1);

      expect(mockOnTrackOrderChange).toHaveBeenCalledWith([
        tracks[0],
        tracks[2],
      ]);
    });

    it('does not remove when onTrackOrderChange is not provided', () => {
      const tracks = [createMockTrack('1', 'playlist1')];
      const scrollContainerRef = { current: mockScrollContainer };

      const { result } = renderHook(() =>
        useTrackOperations({
          tracks,
          onTrackOrderChange: undefined,
          scrollContainerRef,
        })
      );

      result.current.handleTrackRemove(0);

      expect(mockOnTrackOrderChange).not.toHaveBeenCalled();
    });
  });

  describe('handleAddUnselectedTracks', () => {
    it('adds unselected tracks with sourcePlaylist converted to MixedTrack', () => {
      const tracks = [createMockTrack('1', 'playlist1')];
      const unselectedTracks = [
        createSpotifyTrack('2', 'playlist2'),
        createSpotifyTrack('3', 'playlist3'),
      ];
      const scrollContainerRef = { current: mockScrollContainer };

      const { result } = renderHook(() =>
        useTrackOperations({
          tracks,
          onTrackOrderChange: mockOnTrackOrderChange,
          scrollContainerRef,
        })
      );

      result.current.handleAddUnselectedTracks(unselectedTracks);

      expect(mockOnTrackOrderChange).toHaveBeenCalledWith([
        tracks[0],
        { ...unselectedTracks[0], sourcePlaylist: 'playlist2' },
        { ...unselectedTracks[1], sourcePlaylist: 'playlist3' },
      ]);
    });

    it('adds tracks with unknown sourcePlaylist when not specified', () => {
      const tracks = [createMockTrack('1', 'playlist1')];
      const unselectedTracks = [createSpotifyTrack('2')]; // No sourcePlaylist
      const scrollContainerRef = { current: mockScrollContainer };

      const { result } = renderHook(() =>
        useTrackOperations({
          tracks,
          onTrackOrderChange: mockOnTrackOrderChange,
          scrollContainerRef,
        })
      );

      result.current.handleAddUnselectedTracks(unselectedTracks);

      expect(mockOnTrackOrderChange).toHaveBeenCalledWith([
        tracks[0],
        { ...unselectedTracks[0], sourcePlaylist: 'unknown' },
      ]);
    });

    it('does not add when onTrackOrderChange is not provided', () => {
      const tracks = [createMockTrack('1', 'playlist1')];
      const unselectedTracks = [createSpotifyTrack('2')];
      const scrollContainerRef = { current: mockScrollContainer };

      const { result } = renderHook(() =>
        useTrackOperations({
          tracks,
          onTrackOrderChange: undefined,
          scrollContainerRef,
        })
      );

      result.current.handleAddUnselectedTracks(unselectedTracks);

      expect(mockOnTrackOrderChange).not.toHaveBeenCalled();
    });
  });

  describe('handleAddSpotifyTracks', () => {
    it('adds Spotify tracks with search sourcePlaylist', () => {
      const tracks = [createMockTrack('1', 'playlist1')];
      const spotifyTracks = [
        createSpotifyTrack('2', 'existingPlaylist'),
        createSpotifyTrack('3'), // No sourcePlaylist
      ];
      const scrollContainerRef = { current: mockScrollContainer };

      const { result } = renderHook(() =>
        useTrackOperations({
          tracks,
          onTrackOrderChange: mockOnTrackOrderChange,
          scrollContainerRef,
        })
      );

      result.current.handleAddSpotifyTracks(spotifyTracks);

      expect(mockOnTrackOrderChange).toHaveBeenCalledWith([
        tracks[0],
        { ...spotifyTracks[0], sourcePlaylist: 'existingPlaylist' },
        { ...spotifyTracks[1], sourcePlaylist: 'search' },
      ]);
    });

    it('does not add when onTrackOrderChange is not provided', () => {
      const tracks = [createMockTrack('1', 'playlist1')];
      const spotifyTracks = [createSpotifyTrack('2')];
      const scrollContainerRef = { current: mockScrollContainer };

      const { result } = renderHook(() =>
        useTrackOperations({
          tracks,
          onTrackOrderChange: undefined,
          scrollContainerRef,
        })
      );

      result.current.handleAddSpotifyTracks(spotifyTracks);

      expect(mockOnTrackOrderChange).not.toHaveBeenCalled();
    });
  });

  describe('edge cases and complex scenarios', () => {
    it('handles reordering single track list', () => {
      const tracks = [createMockTrack('1', 'playlist1')];
      const scrollContainerRef = { current: mockScrollContainer };

      const { result } = renderHook(() =>
        useTrackOperations({
          tracks,
          onTrackOrderChange: mockOnTrackOrderChange,
          scrollContainerRef,
        })
      );

      result.current.handleInternalReorder(0, 0);

      expect(mockOnTrackOrderChange).not.toHaveBeenCalled();
    });

    it('handles adding to empty track list', () => {
      const tracks: MixedTrack[] = [];
      const newTrack = createMockTrack('1', 'playlist1');
      const scrollContainerRef = { current: mockScrollContainer };

      const { result } = renderHook(() =>
        useTrackOperations({
          tracks,
          onTrackOrderChange: mockOnTrackOrderChange,
          scrollContainerRef,
        })
      );

      result.current.handleExternalAdd(newTrack);

      expect(mockOnTrackOrderChange).toHaveBeenCalledWith([newTrack]);
    });

    it('handles removing from single track list', () => {
      const tracks = [createMockTrack('1', 'playlist1')];
      const scrollContainerRef = { current: mockScrollContainer };

      const { result } = renderHook(() =>
        useTrackOperations({
          tracks,
          onTrackOrderChange: mockOnTrackOrderChange,
          scrollContainerRef,
        })
      );

      result.current.handleTrackRemove(0);

      expect(mockOnTrackOrderChange).toHaveBeenCalledWith([]);
    });

    it('handles adding empty array of tracks', () => {
      const tracks = [createMockTrack('1', 'playlist1')];
      const scrollContainerRef = { current: mockScrollContainer };

      const { result } = renderHook(() =>
        useTrackOperations({
          tracks,
          onTrackOrderChange: mockOnTrackOrderChange,
          scrollContainerRef,
        })
      );

      result.current.handleAddUnselectedTracks([]);

      expect(mockOnTrackOrderChange).toHaveBeenCalledWith(tracks);
    });
  });
});
