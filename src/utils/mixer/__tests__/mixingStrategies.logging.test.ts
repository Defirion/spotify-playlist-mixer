import {
  MixedStrategy,
  FrontLoadedStrategy,
  MidPeakStrategy,
  CrescendoStrategy,
  addFallbackTracks,
  createStrategyManager,
} from '../mixingStrategies';

const makePools = () => ({
  topHits: [{ id: 't1', name: 'T' }],
  popular: [{ id: 'p1', name: 'P' }],
  moderate: [{ id: 'm1', name: 'M' }],
  deepCuts: [{ id: 'd1', name: 'D' }],
});

describe('mixingStrategies development logging and fallback coverage', () => {
  const OLD_ENV = process.env.NODE_ENV;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.NODE_ENV = OLD_ENV;
    jest.restoreAllMocks();
  });

  test('development logs are called across strategies', () => {
    process.env.NODE_ENV = 'development';
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});

    const pools = { pid: makePools() } as any;

    const mixed = new MixedStrategy();
    mixed.getTracksForPosition(pools, 'pid', 2, 10);

    const front = new FrontLoadedStrategy();
    front.getTracksForPosition(pools, 'pid', 0, 10);
    front.getTracksForPosition(pools, 'pid', 4, 10);
    front.getTracksForPosition(pools, 'pid', 9, 10);

    const mid = new MidPeakStrategy();
    [0, 2, 4, 6, 9].forEach(p => mid.getTracksForPosition(pools, 'pid', p, 10));

    const cres = new CrescendoStrategy();
    [0, 4, 8].forEach(p => cres.getTracksForPosition(pools, 'pid', p, 10));

    expect(log).toHaveBeenCalled();
  });

  test('addFallbackTracks returns original when no fallback available', () => {
    const tracks = [{ id: 'a' }, { id: 'b' }] as any;
    // strategyTracks contains all tracks already
    const out = addFallbackTracks(tracks, tracks);
    expect(out).toBe(tracks);
  });

  test('strategy manager getAllStrategies returns non-empty list', () => {
    const m = createStrategyManager();
    const all = m.getAllStrategies();
    expect(Array.isArray(all)).toBe(true);
    expect(all.length).toBeGreaterThan(0);
  });
});
