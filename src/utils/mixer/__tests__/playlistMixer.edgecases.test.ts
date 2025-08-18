import { mixPlaylists } from '../playlistMixer';
import { addSongsFromPlaylist } from '../mixingCalculations';
import { makePlaylist, makeTrack } from './fixtures';

describe('playlistMixer edge cases', () => {
  test('treats zero weight as default (falsy weight fallback)', () => {
    const a = makePlaylist('A', 10);
    const b = makePlaylist('B', 10);
    const playlists = { a, b } as any;

    const ratioConfig = {
      a: { min: 1, max: 1, weight: 0, weightType: 'frequency' },
      b: { min: 1, max: 1, weight: 2, weightType: 'frequency' },
    } as any;

    const options = {
      totalSongs: 9,
      targetDuration: 30,
      useTimeLimit: false,
      useAllSongs: false,
      playlistName: 'Edge Mix',
      shuffleWithinGroups: false,
      popularityStrategy: 'mixed',
      recencyBoost: false,
      continueWhenPlaylistEmpty: false,
    } as any;

    const result = mixPlaylists(playlists, ratioConfig, options);
    const counts = result.reduce((acc: any, t: any) => {
      acc[t.sourcePlaylist] = (acc[t.sourcePlaylist] || 0) + 1;
      return acc;
    }, {} as any);

    expect(counts['a'] + counts['b']).toBe(result.length);
    expect(counts['b']).toBeGreaterThanOrEqual(counts['a']);
  });

  test('ignores empty playlists and does not select from them', () => {
    const a = makePlaylist('A', 0);
    const b = makePlaylist('B', 5);
    const playlists = { a, b } as any;

    const ratioConfig = {
      a: { min: 1, max: 1, weight: 1, weightType: 'frequency' },
      b: { min: 1, max: 1, weight: 1, weightType: 'frequency' },
    } as any;

    const options = {
      totalSongs: 4,
      targetDuration: 10,
      useTimeLimit: false,
      useAllSongs: false,
      playlistName: 'Edge',
      shuffleWithinGroups: false,
      popularityStrategy: 'mixed',
      recencyBoost: false,
      continueWhenPlaylistEmpty: false,
    } as any;

    const mixed = mixPlaylists(playlists, ratioConfig, options);
    expect(mixed.every((t: any) => t.sourcePlaylist !== 'a')).toBe(true);
  });

  test('addSongsFromPlaylist prefers max when playlist is behind on time share', () => {
    const playlistId = 'x';
    const ratioConfig = {
      x: { min: 1, max: 3, weight: 1, weightType: 'frequency' },
    } as any;
    const totalWeight = 1;

    const popularityPools = { x: [] } as any;

    const estimatedTotalSongs = 20;

    const strategy = {
      getTracksForPosition: (_pools: any, _id: string) => {
        return [
          makeTrack('x1', { duration_ms: 180000 }),
          makeTrack('x2', { duration_ms: 180000 }),
          makeTrack('x3', { duration_ms: 180000 }),
          makeTrack('x4', { duration_ms: 180000 }),
        ];
      },
    } as any;

    const mixedTracks: any[] = [];
    const playlistCounts: any = { x: 0, y: 0 };
    const playlistDurations: any = { x: 0, y: 600000 };

    const shouldContinue = () => true;

    const songsAdded = addSongsFromPlaylist(
      playlistId,
      ratioConfig,
      totalWeight,
      popularityPools,
      estimatedTotalSongs,
      strategy,
      mixedTracks,
      playlistCounts,
      playlistDurations,
      shouldContinue
    );

    expect(songsAdded).toBe(3);
    expect(playlistCounts.x).toBe(3);
    expect(playlistDurations.x).toBeGreaterThan(0);
  });

  test('small perf smoke: mixing 200 tracks completes quickly', () => {
    const a = makePlaylist('A', 200);
    const b = makePlaylist('B', 200);
    const playlists = { a, b } as any;

    const ratioConfig = {
      a: { min: 1, max: 1, weight: 1, weightType: 'frequency' },
      b: { min: 1, max: 1, weight: 1, weightType: 'frequency' },
    } as any;

    const options = {
      totalSongs: 100,
      targetDuration: 300,
      useTimeLimit: false,
      useAllSongs: false,
      playlistName: 'PerfMix',
      shuffleWithinGroups: false,
      popularityStrategy: 'mixed',
      recencyBoost: false,
      continueWhenPlaylistEmpty: false,
    } as any;

    const start = Date.now();
    const mixed = mixPlaylists(playlists, ratioConfig, options);
    const elapsed = Date.now() - start;

    expect(mixed.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(2000);
  });
});
