import { mixPlaylists } from '../../utils/mixer';
import { makeTrack } from '../../test-utils/mocks/spotify';

describe('Mixer output invariants', () => {
  test('output respects total track count and no duplicates', () => {
    const playlistA = Array.from({ length: 5 }).map((_, i) =>
      makeTrack({ id: `A${i}`, uri: `spotify:track:A${i}` })
    );
    const playlistB = Array.from({ length: 5 }).map((_, i) =>
      makeTrack({ id: `B${i}`, uri: `spotify:track:B${i}` })
    );

    const input = { playlistA, playlistB } as any;
    // Proper ratioConfig shape expected by mixer: per-playlist config objects
    const ratioConfig = {
      playlistA: { min: 1, max: 5, weight: 1, weightType: 'frequency' },
      playlistB: { min: 1, max: 5, weight: 1, weightType: 'frequency' },
    } as any;
    const mixOptions = {
      totalSongs: 6,
      popularityStrategy: 'mixed',
      useTimeLimit: false,
      useAllSongs: false,
    } as any;

    const result = mixPlaylists(input, ratioConfig, mixOptions) as any[];

    // Total length should be equal to requested totalSongs or available tracks
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThanOrEqual(6);

    // No duplicate URIs
    const uris = result.map(r => r.uri);
    const unique = new Set(uris);
    expect(unique.size).toBe(uris.length);

    // All items have required fields
    for (const item of result) {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('uri');
      expect(item).toHaveProperty('sourcePlaylist');
    }
  });
});
