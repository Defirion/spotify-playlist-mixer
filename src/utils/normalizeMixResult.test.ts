import normalizeMixResult from './normalizeMixResult';

describe('normalizeMixResult', () => {
  test('returns empty for null/undefined', () => {
    expect(normalizeMixResult(null)).toEqual({
      tracks: [],
      exhaustedPlaylists: [],
      stoppedEarly: false,
    });
    expect(normalizeMixResult(undefined)).toEqual({
      tracks: [],
      exhaustedPlaylists: [],
      stoppedEarly: false,
    });
  });

  test('handles array return with attached metadata', () => {
    const arr: any = [{ uri: 'u1' }];
    arr.exhaustedPlaylists = ['p1'];
    arr.stoppedEarly = true;
    const res = normalizeMixResult(arr);
    expect(res.tracks).toEqual([{ uri: 'u1' }]);
    expect(res.exhaustedPlaylists).toEqual(['p1']);
    expect(res.stoppedEarly).toBe(true);
  });

  test('handles object return with tracks array', () => {
    const obj = {
      tracks: [{ uri: 'u2' }],
      exhaustedPlaylists: ['p2'],
      stoppedEarly: false,
    };
    const res = normalizeMixResult(obj);
    expect(res.tracks).toEqual([{ uri: 'u2' }]);
    expect(res.exhaustedPlaylists).toEqual(['p2']);
    expect(res.stoppedEarly).toBe(false);
  });

  test('handles object with malformed tracks', () => {
    const obj = {
      tracks: 'not-an-array',
      exhaustedPlaylists: null,
      stoppedEarly: 'yes',
    } as any;
    const res = normalizeMixResult(obj);
    expect(res.tracks).toEqual([]);
    expect(res.exhaustedPlaylists).toEqual([]);
    expect(res.stoppedEarly).toBe(true);
  });
});
