import {
  validateStoreStateFor,
  buildCleanedRatioConfig,
} from '../../store/migration';

describe('migration helpers - validateStoreStateFor & buildCleanedRatioConfig', () => {
  it('returns empty issues for empty state and empty cleaned config', () => {
    expect(validateStoreStateFor({})).toEqual([]);
    expect(buildCleanedRatioConfig({})).toEqual({});
  });

  it('detects orphaned and missing ratio config entries', () => {
    const state = {
      selectedPlaylists: [{ id: 'p1' }],
      ratioConfig: { orphan: { weight: 1 } },
    } as any;

    const issues = validateStoreStateFor(state);
    expect(issues).toContain('Orphaned ratio config for playlist: orphan');
    expect(issues).toContain('Missing ratio config for selected playlist: p1');
  });

  it('buildCleanedRatioConfig removes orphan and adds defaults for missing playlists', () => {
    const state = {
      selectedPlaylists: [{ id: 'p1' }, { id: 'p2' }],
      ratioConfig: { p1: { weight: 3 }, orphan: { weight: 1 } },
    } as any;

    const cleaned = buildCleanedRatioConfig(state);

    // orphan removed
    expect((cleaned as any).orphan).toBeUndefined();

    // p1 preserved
    expect((cleaned as any).p1).toBeDefined();

    // p2 default config added
    expect((cleaned as any).p2).toBeDefined();
    expect((cleaned as any).p2.weight).toBe(2);
  });
});
