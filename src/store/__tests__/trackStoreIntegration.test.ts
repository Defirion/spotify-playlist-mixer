import { renderHook, act } from '@testing-library/react';
import { useTracks } from '../index';
import { SpotifyTrack } from '../../types/spotify';
import { makeTrack } from '../../test-utils/mocks/spotify';

// Mock track data
const mockTrack1: SpotifyTrack = makeTrack({
  id: 'track1',
  name: 'Test Track 1',
  duration_ms: 180000,
  preview_url: 'https://example.com/preview1',
  external_urls: { spotify: 'https://open.spotify.com/track/track1' },
  uri: 'spotify:track:track1',
});

const mockTrack2: SpotifyTrack = makeTrack({
  id: 'track2',
  name: 'Test Track 2',
  duration_ms: 200000,
  preview_url: 'https://example.com/preview2',
  external_urls: { spotify: 'https://open.spotify.com/track/track2' },
  uri: 'spotify:track:track2',
});

describe('Track Store Integration with DraggableTrackList', () => {
  it('should demonstrate how to connect reorderTracks with DraggableTrackList onReorder', () => {
    const { result } = renderHook(() => useTracks());

    // Set up initial tracks
    act(() => {
      result.current.setTracks([mockTrack1, mockTrack2]);
    });

    expect(result.current.tracks).toHaveLength(2);
    expect(result.current.tracks[0].id).toBe('track1');
    expect(result.current.tracks[1].id).toBe('track2');

    // Simulate DraggableTrackList onReorder callback
    // This is exactly how DraggableTrackList would call the store action
    const onReorder = result.current.reorderTracks;

    // Simulate drag from track1 to track2 position
    act(() => {
      onReorder('track1', 'track2');
    });

    // Verify the reorder worked
    expect(result.current.tracks[0].id).toBe('track2');
    expect(result.current.tracks[1].id).toBe('track1');
  });

  it('should provide track IDs for DraggableTrackList tracks prop', () => {
    const { result } = renderHook(() => useTracks());

    act(() => {
      result.current.setTracks([mockTrack1, mockTrack2]);
    });

    // This is how you would get the track IDs for DraggableTrackList
    const trackIds = result.current.tracks.map(track => track.id);

    expect(trackIds).toEqual(['track1', 'track2']);

    // Usage example:
    // <DraggableTrackList
    //   tracks={trackIds}
    //   onReorder={reorderTracks}
    // >
    //   <TrackList tracks={tracks} />
    // </DraggableTrackList>
  });
});
