import { mixPlaylists } from '../mixer';

// Minimal fixture to exercise mixing behavior via compat layer
const smallPlaylists = {
  p1: [
    {
      id: 'a',
      uri: 'uri:a',
      title: 'A',
      durationMs: 100000,
      artists: ['Artist A'],
      sourceRefs: [],
    },
    {
      id: 'b',
      uri: 'uri:b',
      title: 'B',
      durationMs: 120000,
      artists: ['Artist B'],
      sourceRefs: [],
    },
  ],
  p2: [
    {
      id: 'c',
      uri: 'uri:c',
      title: 'C',
      durationMs: 90000,
      artists: ['Artist C'],
      sourceRefs: [],
    },
  ],
};

const ratioConfig = {
  p1: { weight: 2 },
  p2: { weight: 1 },
};

const options = {
  useAllSongs: true,
  useTimeLimit: false,
  continueWhenPlaylistEmpty: false,
  shuffleTracks: false,
};

describe('mixPlaylists behavior via compat layer', () => {
  it('should return a mixed track array for valid inputs', () => {
    const result = mixPlaylists(
      smallPlaylists as any,
      ratioConfig as any,
      options as any
    );
    expect(Array.isArray(result)).toBe(true);
    // The shorter source is exhausted after the second song; stop is explicit.
    expect(result.map(track => track.id)).toEqual(['a', 'c']);
    // Each returned item should contain an id
    expect(result.every(r => r && r.id)).toBe(true);
  });

  it('should return empty array for invalid inputs', () => {
    const res = mixPlaylists({}, {}, null as any);
    expect(Array.isArray(res)).toBe(true);
    expect(res.length).toBe(0);
  });
});
