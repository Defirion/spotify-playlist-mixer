// Unit tests for mixing strategies module

import {
  MixedStrategy,
  FrontLoadedStrategy,
  MidPeakStrategy,
  CrescendoStrategy,
  DefaultStrategyManager,
  createStrategyManager,
  addFallbackTracks,
} from '../mixingStrategies';
import { PopularityPools, TrackWithPopularity } from '../types';
import { SpotifyTrack } from '../../../types/spotify';

// Mock console methods to avoid noise in tests
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
});

afterEach(() => {
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
});

// Helper function to create mock tracks with popularity data
const createMockTrack = (
  id: string,
  name: string,
  adjustedPopularity: number
): TrackWithPopularity => ({
  id,
  name,
  uri: `spotify:track:${id}`,
  external_urls: { spotify: `https://open.spotify.com/track/${id}` },
  duration_ms: 180000,
  explicit: false,
  popularity: adjustedPopularity,
  preview_url: null,
  track_number: 1,
  type: 'track',
  is_local: false,
  artists: [
    {
      id: 'artist1',
      name: 'Test Artist',
      uri: 'spotify:artist:artist1',
      external_urls: { spotify: 'https://open.spotify.com/artist/artist1' },
      type: 'artist',
    },
  ],
  album: {
    id: 'album1',
    name: 'Test Album',
    uri: 'spotify:album:album1',
    external_urls: { spotify: 'https://open.spotify.com/album/album1' },
    album_type: 'album',
    total_tracks: 10,
    release_date: '2023-01-01',
    release_date_precision: 'day',
    type: 'album',
    artists: [
      {
        id: 'artist1',
        name: 'Test Artist',
        uri: 'spotify:artist:artist1',
        external_urls: { spotify: 'https://open.spotify.com/artist/artist1' },
        type: 'artist',
      },
    ],
    images: [],
  },
  adjustedPopularity,
  basePopularity: adjustedPopularity,
  recencyBonus: 0,
  releaseYear: 2023,
});

// Create mock popularity pools for testing
const createMockPopularityPools = (): PopularityPools => ({
  playlist1: {
    topHits: [
      createMockTrack('top1', 'Top Hit 1', 90),
      createMockTrack('top2', 'Top Hit 2', 85),
    ],
    popular: [
      createMockTrack('pop1', 'Popular 1', 70),
      createMockTrack('pop2', 'Popular 2', 65),
    ],
    moderate: [
      createMockTrack('mod1', 'Moderate 1', 50),
      createMockTrack('mod2', 'Moderate 2', 45),
    ],
    deepCuts: [
      createMockTrack('deep1', 'Deep Cut 1', 25),
      createMockTrack('deep2', 'Deep Cut 2', 20),
    ],
  },
});

describe('MixedStrategy', () => {
  let strategy: MixedStrategy;
  let mockPools: PopularityPools;

  beforeEach(() => {
    strategy = new MixedStrategy();
    mockPools = createMockPopularityPools();
  });

  test('should have correct name', () => {
    expect(strategy.name).toBe('mixed');
  });

  test('should return all tracks from all quadrants', () => {
    const result = strategy.getTracksForPosition(mockPools, 'playlist1', 5, 20);

    expect(result).toHaveLength(8); // 2 + 2 + 2 + 2
    expect(result.map(t => t.id)).toEqual([
      'top1',
      'top2',
      'pop1',
      'pop2',
      'mod1',
      'mod2',
      'deep1',
      'deep2',
    ]);
  });

  test('should return empty array for non-existent playlist', () => {
    const result = strategy.getTracksForPosition(
      mockPools,
      'nonexistent',
      5,
      20
    );

    expect(result).toHaveLength(0);
  });

  test('should work with different positions and total lengths', () => {
    const result1 = strategy.getTracksForPosition(
      mockPools,
      'playlist1',
      1,
      10
    );
    const result2 = strategy.getTracksForPosition(
      mockPools,
      'playlist1',
      10,
      10
    );

    // Should return same tracks regardless of position for mixed strategy
    expect(result1).toEqual(result2);
  });
});

describe('FrontLoadedStrategy', () => {
  let strategy: FrontLoadedStrategy;
  let mockPools: PopularityPools;

  beforeEach(() => {
    strategy = new FrontLoadedStrategy();
    mockPools = createMockPopularityPools();
  });

  test('should have correct name', () => {
    expect(strategy.name).toBe('front-loaded');
  });

  test('should use top hits and popular tracks at the beginning (< 30%)', () => {
    const result = strategy.getTracksForPosition(mockPools, 'playlist1', 2, 20); // 10% position

    const trackIds = result.map(t => t.id);
    expect(trackIds).toContain('top1');
    expect(trackIds).toContain('top2');
    expect(trackIds).toContain('pop1');
    expect(trackIds).toContain('pop2');
  });

  test('should use moderate and popular tracks in the middle (30-70%)', () => {
    const result = strategy.getTracksForPosition(
      mockPools,
      'playlist1',
      10,
      20
    ); // 50% position

    const trackIds = result.map(t => t.id);
    expect(trackIds).toContain('mod1');
    expect(trackIds).toContain('mod2');
    expect(trackIds).toContain('pop1');
    expect(trackIds).toContain('pop2');
  });

  test('should use deep cuts and moderate tracks at the end (> 70%)', () => {
    const result = strategy.getTracksForPosition(
      mockPools,
      'playlist1',
      18,
      20
    ); // 90% position

    const trackIds = result.map(t => t.id);
    expect(trackIds).toContain('deep1');
    expect(trackIds).toContain('deep2');
    expect(trackIds).toContain('mod1');
    expect(trackIds).toContain('mod2');
  });

  test('should include fallback tracks when strategy pools are limited', () => {
    const result = strategy.getTracksForPosition(mockPools, 'playlist1', 2, 20);

    // Should include fallback tracks beyond the strategy-specific ones
    expect(result.length).toBeGreaterThan(4); // More than just top hits + popular
  });
});

describe('MidPeakStrategy', () => {
  let strategy: MidPeakStrategy;
  let mockPools: PopularityPools;

  beforeEach(() => {
    strategy = new MidPeakStrategy();
    mockPools = createMockPopularityPools();
  });

  test('should have correct name', () => {
    expect(strategy.name).toBe('mid-peak');
  });

  test('should use moderate and deep cuts at the start (< 20%)', () => {
    const result = strategy.getTracksForPosition(mockPools, 'playlist1', 1, 20); // 5% position

    const trackIds = result.map(t => t.id);
    expect(trackIds).toContain('mod1');
    expect(trackIds).toContain('mod2');
    expect(trackIds).toContain('deep1');
    expect(trackIds).toContain('deep2');
  });

  test('should use popular and moderate tracks during build (20-40%)', () => {
    const result = strategy.getTracksForPosition(mockPools, 'playlist1', 6, 20); // 30% position

    const trackIds = result.map(t => t.id);
    expect(trackIds).toContain('pop1');
    expect(trackIds).toContain('pop2');
    expect(trackIds).toContain('mod1');
    expect(trackIds).toContain('mod2');
  });

  test('should use top hits and popular tracks at peak (40-60%)', () => {
    const result = strategy.getTracksForPosition(
      mockPools,
      'playlist1',
      10,
      20
    ); // 50% position

    const trackIds = result.map(t => t.id);
    expect(trackIds).toContain('top1');
    expect(trackIds).toContain('top2');
    expect(trackIds).toContain('pop1');
    expect(trackIds).toContain('pop2');
  });

  test('should use popular and moderate tracks during wind down (60-80%)', () => {
    const result = strategy.getTracksForPosition(
      mockPools,
      'playlist1',
      14,
      20
    ); // 70% position

    const trackIds = result.map(t => t.id);
    expect(trackIds).toContain('pop1');
    expect(trackIds).toContain('pop2');
    expect(trackIds).toContain('mod1');
    expect(trackIds).toContain('mod2');
  });

  test('should use moderate and deep cuts at the end (> 80%)', () => {
    const result = strategy.getTracksForPosition(
      mockPools,
      'playlist1',
      18,
      20
    ); // 90% position

    const trackIds = result.map(t => t.id);
    expect(trackIds).toContain('mod1');
    expect(trackIds).toContain('mod2');
    expect(trackIds).toContain('deep1');
    expect(trackIds).toContain('deep2');
  });
});

describe('CrescendoStrategy', () => {
  let strategy: CrescendoStrategy;
  let mockPools: PopularityPools;

  beforeEach(() => {
    strategy = new CrescendoStrategy();
    mockPools = createMockPopularityPools();
  });

  test('should have correct name', () => {
    expect(strategy.name).toBe('crescendo');
  });

  test('should use deep cuts and moderate tracks at the start (< 30%)', () => {
    const result = strategy.getTracksForPosition(mockPools, 'playlist1', 2, 20); // 10% position

    const trackIds = result.map(t => t.id);
    expect(trackIds).toContain('deep1');
    expect(trackIds).toContain('deep2');
    expect(trackIds).toContain('mod1');
    expect(trackIds).toContain('mod2');
  });

  test('should use moderate and popular tracks during build (30-60%)', () => {
    const result = strategy.getTracksForPosition(mockPools, 'playlist1', 8, 20); // 40% position

    const trackIds = result.map(t => t.id);
    expect(trackIds).toContain('mod1');
    expect(trackIds).toContain('mod2');
    expect(trackIds).toContain('pop1');
    expect(trackIds).toContain('pop2');
  });

  test('should use popular and top hits at the finale (> 60%)', () => {
    const result = strategy.getTracksForPosition(
      mockPools,
      'playlist1',
      16,
      20
    ); // 80% position

    const trackIds = result.map(t => t.id);
    expect(trackIds).toContain('pop1');
    expect(trackIds).toContain('pop2');
    expect(trackIds).toContain('top1');
    expect(trackIds).toContain('top2');
  });
});

describe('DefaultStrategyManager', () => {
  let manager: DefaultStrategyManager;

  beforeEach(() => {
    manager = new DefaultStrategyManager();
  });

  test('should return correct strategy instances', () => {
    expect(manager.getStrategy('mixed')).toBeInstanceOf(MixedStrategy);
    expect(manager.getStrategy('front-loaded')).toBeInstanceOf(
      FrontLoadedStrategy
    );
    expect(manager.getStrategy('mid-peak')).toBeInstanceOf(MidPeakStrategy);
    expect(manager.getStrategy('crescendo')).toBeInstanceOf(CrescendoStrategy);
  });

  test('should return mixed strategy for unknown strategy names', () => {
    const strategy = manager.getStrategy('unknown' as any);
    expect(strategy).toBeInstanceOf(MixedStrategy);
    expect(console.warn).toHaveBeenCalledWith(
      "⚠️ Unknown strategy 'unknown', falling back to 'mixed'"
    );
  });

  test('should return all strategies', () => {
    const strategies = manager.getAllStrategies();
    expect(strategies).toHaveLength(4);
    expect(strategies.some(s => s instanceof MixedStrategy)).toBe(true);
    expect(strategies.some(s => s instanceof FrontLoadedStrategy)).toBe(true);
    expect(strategies.some(s => s instanceof MidPeakStrategy)).toBe(true);
    expect(strategies.some(s => s instanceof CrescendoStrategy)).toBe(true);
  });

  test('should maintain strategy instances (not create new ones each time)', () => {
    const strategy1 = manager.getStrategy('mixed');
    const strategy2 = manager.getStrategy('mixed');
    expect(strategy1).toBe(strategy2);
  });
});

describe('createStrategyManager', () => {
  test('should create a DefaultStrategyManager instance', () => {
    const manager = createStrategyManager();
    expect(manager).toBeInstanceOf(DefaultStrategyManager);
  });

  test('should create functional strategy manager', () => {
    const manager = createStrategyManager();
    const strategy = manager.getStrategy('mixed');
    expect(strategy).toBeInstanceOf(MixedStrategy);
  });
});

describe('addFallbackTracks', () => {
  let strategyTracks: TrackWithPopularity[];
  let allTracks: TrackWithPopularity[];

  beforeEach(() => {
    strategyTracks = [
      createMockTrack('strategy1', 'Strategy Track 1', 80),
      createMockTrack('strategy2', 'Strategy Track 2', 75),
    ];
    allTracks = [
      ...strategyTracks,
      createMockTrack('fallback1', 'Fallback Track 1', 60),
      createMockTrack('fallback2', 'Fallback Track 2', 55),
    ];
  });

  test('should return all tracks when strategy tracks are empty', () => {
    // Set NODE_ENV to development to enable debug logging
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const result = addFallbackTracks([], allTracks);
    expect(result).toEqual(allTracks);
    expect(console.log).toHaveBeenCalledWith(
      '   ⚠️ Fallback: Using all quadrants (strategy pools empty)'
    );

    // Restore original NODE_ENV
    process.env.NODE_ENV = originalEnv;
  });

  test('should add fallback tracks to strategy tracks', () => {
    const result = addFallbackTracks(strategyTracks, allTracks);

    expect(result).toHaveLength(4);
    expect(result.slice(0, 2)).toEqual(strategyTracks);
    expect(result.slice(2).map(t => t.id)).toEqual(['fallback1', 'fallback2']);
  });

  test('should not add duplicates', () => {
    const result = addFallbackTracks(strategyTracks, strategyTracks);
    expect(result).toEqual(strategyTracks);
  });

  test('should handle case where no fallback tracks are available', () => {
    const result = addFallbackTracks(strategyTracks, strategyTracks);
    expect(result).toEqual(strategyTracks);
  });

  test('should log debug information when fallback tracks are added', () => {
    // Set NODE_ENV to development to enable debug logging
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    addFallbackTracks(strategyTracks, allTracks);
    expect(console.log).toHaveBeenCalledWith(
      '   📋 Strategy pools: 2, Fallback pools: 2'
    );

    // Restore original NODE_ENV
    process.env.NODE_ENV = originalEnv;
  });
});

describe('Integration Tests', () => {
  let manager: DefaultStrategyManager;
  let mockPools: PopularityPools;

  beforeEach(() => {
    manager = new DefaultStrategyManager();
    mockPools = createMockPopularityPools();
  });

  test('should work end-to-end with strategy manager and strategies', () => {
    const strategy = manager.getStrategy('front-loaded');
    const result = strategy.getTracksForPosition(mockPools, 'playlist1', 2, 20);

    expect(result.length).toBeGreaterThan(0);
    expect(result.every(track => track.id && track.name)).toBe(true);
  });

  test('should handle empty pools gracefully', () => {
    const emptyPools: PopularityPools = {
      playlist1: {
        topHits: [],
        popular: [],
        moderate: [],
        deepCuts: [],
      },
    };

    const strategy = manager.getStrategy('mixed');
    const result = strategy.getTracksForPosition(
      emptyPools,
      'playlist1',
      5,
      20
    );

    expect(result).toHaveLength(0);
  });

  test('should maintain consistent behavior across multiple calls', () => {
    const strategy = manager.getStrategy('crescendo');
    const result1 = strategy.getTracksForPosition(
      mockPools,
      'playlist1',
      10,
      20
    );
    const result2 = strategy.getTracksForPosition(
      mockPools,
      'playlist1',
      10,
      20
    );

    expect(result1).toEqual(result2);
  });
});
