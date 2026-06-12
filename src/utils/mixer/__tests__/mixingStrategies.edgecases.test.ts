import {
  MixedStrategy,
  FrontLoadedStrategy,
  MidPeakStrategy,
  CrescendoStrategy,
  createStrategyManager,
  addFallbackTracks,
} from '../mixingStrategies';

const makePools = () => ({
  topHits: [{ id: 't1' }],
  popular: [{ id: 'p1' }],
  moderate: [{ id: 'm1' }],
  deepCuts: [{ id: 'd1' }],
});

describe('mixingStrategies branches', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());
  test('MixedStrategy returns combined arrays', () => {
    const strat = new MixedStrategy();
    const res = strat.getTracksForPosition(
      { pid: makePools() } as any,
      'pid',
      1,
      10
    );
    expect(Array.isArray(res)).toBe(true);
    expect(res.find(r => r.id === 't1')).toBeTruthy();
  });

  test('FrontLoaded strategy changes pools by position and uses fallback', () => {
    const strat = new FrontLoadedStrategy();
    const pools = makePools();
    // position at start
    const start = strat.getTracksForPosition(
      { pid: pools } as any,
      'pid',
      0,
      10
    );
    expect(start.some(t => t.id === 't1' || t.id === 'p1')).toBe(true);

    // mid position
    const mid = strat.getTracksForPosition({ pid: pools } as any, 'pid', 5, 10);
    expect(mid.some(t => t.id === 'm1' || t.id === 'p1')).toBe(true);

    // end position
    const end = strat.getTracksForPosition({ pid: pools } as any, 'pid', 9, 10);
    expect(end.some(t => t.id === 'd1' || t.id === 'm1')).toBe(true);
  });

  test('MidPeak strategy covers all ranges', () => {
    const strat = new MidPeakStrategy();
    const pools = makePools();
    [0, 2, 4, 6, 9].forEach(pos => {
      const out = strat.getTracksForPosition(
        { pid: pools } as any,
        'pid',
        pos,
        10
      );
      expect(out.length).toBeGreaterThan(0);
    });
  });

  test('Crescendo strategy covers ranges and fallback', () => {
    const strat = new CrescendoStrategy();
    const pools = makePools();
    [0, 4, 8].forEach(pos => {
      const out = strat.getTracksForPosition(
        { pid: pools } as any,
        'pid',
        pos,
        10
      );
      expect(out.length).toBeGreaterThan(0);
    });
  });

  test('Strategy manager fallback for unknown strategy', () => {
    const manager = createStrategyManager();
    const strat = manager.getStrategy('mixed');
    expect(strat).toBeDefined();
    // request unknown strategy returns a default without throwing
    // @ts-ignore - intentionally passing invalid name
    const unknown = manager.getStrategy('unknown');
    expect(unknown).toBeDefined();
  });

  test('addFallbackTracks returns all tracks when strategy empty', () => {
    const fallback = addFallbackTracks([], [{ id: 'a' }, { id: 'b' }] as any);
    expect(fallback.length).toBe(2);
  });
});
