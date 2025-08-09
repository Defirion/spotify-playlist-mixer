// Integration test to verify all utility functions work together

import * as MixerUtils from '../mixerUtils';
import { SpotifyTrack } from '../../../types/spotify';

describe('Mixer Utils Integration', () => {
  const createMockTrack = (id: string, duration_ms: number): SpotifyTrack => ({
    id,
    uri: `spotify:track:${id}`,
    name: `Track ${id}`,
    duration_ms,
    popularity: 50,
    explicit: false,
    preview_url: null,
    track_number: 1,
    artists: [],
    album: {
      id: 'album-id',
      name: 'Test Album',
      release_date: '2023-01-01',
      images: [],
      uri: 'spotify:album:test',
      external_urls: { spotify: 'https://open.spotify.com/album/test' },
    },
    external_urls: { spotify: `https://open.spotify.com/track/${id}` },
  });

  it('should export all required utility functions', () => {
    expect(typeof MixerUtils.safeObjectKeys).toBe('function');
    expect(typeof MixerUtils.calculateTotalDuration).toBe('function');
    expect(typeof MixerUtils.validateTrack).toBe('function');
    expect(typeof MixerUtils.cleanPlaylistTracks).toBe('function');
    expect(typeof MixerUtils.formatDuration).toBe('function');
    expect(typeof MixerUtils.logDebugInfo).toBe('function');
  });

  it('should work together in a realistic scenario', () => {
    // Create test data with mixed valid and invalid tracks
    const rawPlaylistData = {
      playlist1: [
        createMockTrack('track1', 180000),
        { id: '', uri: '', name: '' }, // Invalid track
        createMockTrack('track2', 240000),
      ],
      playlist2: [createMockTrack('track3', 210000)],
      emptyPlaylist: [],
    };

    // Clean the playlist data
    const cleanedData = MixerUtils.cleanPlaylistTracks(rawPlaylistData);

    // Should have removed invalid tracks and empty playlists
    expect(MixerUtils.safeObjectKeys(cleanedData)).toEqual([
      'playlist1',
      'playlist2',
    ]);
    expect(cleanedData.playlist1).toHaveLength(2);
    expect(cleanedData.playlist2).toHaveLength(1);

    // Calculate total duration for each playlist
    const playlist1Duration = MixerUtils.calculateTotalDuration(
      cleanedData.playlist1
    );
    const playlist2Duration = MixerUtils.calculateTotalDuration(
      cleanedData.playlist2
    );

    expect(playlist1Duration).toBe(420000); // 180000 + 240000
    expect(playlist2Duration).toBe(210000);

    // Format durations
    expect(MixerUtils.formatDuration(playlist1Duration)).toBe('7:00');
    expect(MixerUtils.formatDuration(playlist2Duration)).toBe('3:30');

    // Validate individual tracks
    cleanedData.playlist1.forEach(track => {
      expect(MixerUtils.validateTrack(track)).toBe(true);
    });
  });
});
