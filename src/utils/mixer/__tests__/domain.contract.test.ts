import { mixPlaylistsWithResult } from '../playlistMixer';
import { makeTrack } from './fixtures';
import { MixOptions } from '../../../types/mixer';

const options: MixOptions = {
  totalSongs: 10,
  targetDurationSeconds: 60,
  useAllSongs: false,
  useTimeLimit: false,
  continueWhenPlaylistEmpty: true,
  shuffleTracks: false,
  playlistName: 'Domain test',
};
const ratios = {
  a: { min: 1, max: 1, weight: 1, weightType: 'frequency' as const },
};

test('canonical tracks mix without Spotify fields or destination references', () => {
  const sources = { a: [makeTrack('1'), makeTrack('2')] };
  const result = mixPlaylistsWithResult(sources, ratios, options);
  expect(result.tracks).toHaveLength(2);
  expect(result.exhaustedPlaylists).toEqual(['a']);
  expect(result.stoppedEarly).toBe(true);
  expect(result.tracks[0]).not.toHaveProperty('uri');
  expect(result.tracks[0]).not.toHaveProperty('duration_ms');
  expect(sources.a[0]).not.toHaveProperty('instanceId');
});

test('reaching the count or duration target is not an early stop even if a source empties', () => {
  const sources = { a: [makeTrack('1', { durationMs: 60000 })] };
  for (const settings of [
    { ...options, totalSongs: 1 },
    { ...options, useTimeLimit: true },
  ]) {
    const result = mixPlaylistsWithResult(sources, ratios, settings);
    expect(result.exhaustedPlaylists).toEqual(['a']);
    expect(result.stoppedEarly).toBe(false);
  }
});

test('provider-qualified identities avoid accidental cross-provider deduplication', () => {
  const sources = {
    a: [
      makeTrack('1', {
        id: 'spotify:1',
        sourceRefs: [{ provider: 'spotify', id: '1' }],
      }),
      makeTrack('1', {
        id: 'local:1',
        sourceRefs: [{ provider: 'local', id: '1' }],
      }),
    ],
  };
  expect(
    mixPlaylistsWithResult(sources, ratios, options).tracks.map(
      track => track.id
    )
  ).toEqual(['spotify:1', 'local:1']);
});

test('an initially empty source is reported with the configured all-song stop policy', () => {
  const result = mixPlaylistsWithResult(
    { a: [], b: [makeTrack('b')] },
    { ...ratios, b: ratios.a },
    { ...options, useAllSongs: true, continueWhenPlaylistEmpty: false }
  );
  expect(result).toEqual({
    tracks: [],
    exhaustedPlaylists: ['a'],
    stoppedEarly: true,
  });
});
