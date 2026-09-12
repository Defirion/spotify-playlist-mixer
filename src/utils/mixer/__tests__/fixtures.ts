// Lightweight deterministic fixtures for playlist mixer tests
export const makeTrack = (idSuffix: string | number, overrides: any = {}) => {
  const id = `t${idSuffix}`;
  return {
    id,
    uri: `spotify:track:${id}`,
    name: `Track ${id}`,
    duration_ms: overrides.duration_ms ?? 180000,
    artists: overrides.artists ?? [{ name: 'Artist' }],
    album: overrides.album ?? { name: 'Album' },
    release_date: overrides.release_date ?? '2020-01-01',
    ...overrides,
  };
};

export const makePlaylist = (prefix: string, count: number, startIndex = 1) => {
  const tracks: any[] = [];
  for (let i = 0; i < count; i++) {
    tracks.push(
      makeTrack(`${prefix}_${startIndex + i}`, { duration_ms: 180000 })
    );
  }
  return tracks;
};

// Jest picks up files under __tests__ - provide a harmless noop test so this file can be used as a fixture module
if (typeof test === 'function') {
  test('fixtures helper - noop', () => {
    expect(true).toBe(true);
  });
}
