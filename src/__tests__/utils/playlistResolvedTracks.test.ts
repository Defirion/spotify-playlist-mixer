import { makePlaylistWithTracks } from '../../test-utils/fixtures/playlistFactory';

describe('playlistFactory _resolvedTracks helper', () => {
  test('exposes _resolvedTracks for low-level utilities', () => {
    const p = makePlaylistWithTracks({ id: 'unit1' }, 5);
    expect(Array.isArray(p._resolvedTracks)).toBe(true);
    expect(p._resolvedTracks.length).toBe(5);
    expect(p._resolvedTracks[0]).toHaveProperty('id');
  });
});
