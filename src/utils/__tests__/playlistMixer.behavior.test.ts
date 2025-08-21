import { mixPlaylists } from '../playlistMixer';

// Minimal fixture to exercise mixing behavior via compat layer
const smallPlaylists = {
  p1: [
    {
      id: 'a',
      uri: 'uri:a',
      name: 'A',
      duration_ms: 100000,
      artists: [{ name: 'Artist A' }],
    },
    {
      id: 'b',
      uri: 'uri:b',
      name: 'B',
      duration_ms: 120000,
      artists: [{ name: 'Artist B' }],
    },
  ],
  p2: [
    {
      id: 'c',
      uri: 'uri:c',
      name: 'C',
      duration_ms: 90000,
      artists: [{ name: 'Artist C' }],
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
  popularityStrategy: 'mixed',
  continueWhenPlaylistEmpty: false,
  recencyBoost: 0,
  shuffleWithinGroups: false,
};

describe('mixPlaylists behavior via compat layer', () => {
  it('should return a mixed track array for valid inputs', () => {
    const result = mixPlaylists(
      smallPlaylists as any,
      ratioConfig as any,
      options as any
    );
    expect(Array.isArray(result)).toBe(true);
    // When useAllSongs is true, result should have at least as many tracks as total input
    expect(result.length).toBeGreaterThanOrEqual(3);
    // Each returned item should contain an id
    expect(result.every(r => r && r.id)).toBe(true);
  });

  it('should return empty array for invalid inputs', () => {
    const res = mixPlaylists({}, {}, null as any);
    expect(Array.isArray(res)).toBe(true);
    expect(res.length).toBe(0);
  });
});
