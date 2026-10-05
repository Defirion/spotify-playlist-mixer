// Integration test to verify all utility functions work together

import * as MixerUtils from '../mixerUtils';
import { Track } from '../../../types/domain';

describe('Mixer Utils Integration', () => {
  const createMockTrack = (id: string, durationMs: number): Track => ({
    id,
    title: `Track ${id}`,
    durationMs,
    artists: ['Artist'],
    sourceRefs: [],
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
        { id: '', uri: '', title: '' }, // Invalid track
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
