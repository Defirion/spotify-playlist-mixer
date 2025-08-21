import {
  makeUseMixPreviewModule,
  makeUseMixGenerationModule,
  makeUseMixPreviewMock,
  makeUseMixGenerationMock,
} from './mixHooks';

describe('mixHooks mocks', () => {
  // Silence console.error in this suite to avoid invalid-hook warnings
  // from the non-hook fallbacks during passing test runs.
  let consoleErrorSpy: jest.SpyInstance | undefined;
  beforeAll(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterAll(() => {
    if (consoleErrorSpy) consoleErrorSpy.mockRestore();
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('useMixPreview fallback (non-hook) works when called outside React', async () => {
    const mod = makeUseMixPreviewModule();
    const api = mod.useMixPreview();
    // initially no preview
    expect(api.getPreviewTracks()).toEqual([]);

    const preview = await api.generatePreview({});
    expect(preview).toHaveProperty('tracks');
    expect(Array.isArray(api.getPreviewTracks())).toBe(true);

    // update order
    api.updateTrackOrder([{ id: 'x' }]);
    expect(api.getPreviewTracks()[0].id).toBe('x');

    api.clearPreview();
    expect(api.getPreviewTracks()).toEqual([]);
  });

  it('useMixPreview uses provided impl when given and returns array shape', async () => {
    const impl = async () => [{ id: 't1' }];
    const mod = makeUseMixPreviewModule(impl as any);
    const api = mod.useMixPreview();
    const res = await api.generatePreview();
    expect(Array.isArray(res.tracks || res)).toBe(true);
  });

  it('useMixGeneration returns mix functions and createPlaylist respects TEST_VERBOSE', async () => {
    const mod = makeUseMixGenerationModule();
    const api = mod.useMixGeneration();
    const out = await api.generateMix();
    expect(out).toBeDefined();

    // Ensure createPlaylist returns created id and logs only when verbose
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    process.env.TEST_VERBOSE = 'true';
    const created = await api.createPlaylist('my', [] as any);
    expect(created.id).toBe('created');
    expect(spy).toHaveBeenCalled();
    delete process.env.TEST_VERBOSE;
    spy.mockRestore();
  });

  it('legacy makeUseMixPreviewMock and makeUseMixGenerationMock produce predictable modules', async () => {
    const { mockModule, _previewFn } = makeUseMixPreviewMock(
      async () => [{ id: 'a' }] as any
    );
    const mm = mockModule();
    const api = mm.useMixPreview();
    const res = await api.generatePreview();
    expect(_previewFn).toBeDefined();
    expect(Array.isArray(res)).toBe(true);

    const { mockModule: gm, _mixFn } = makeUseMixGenerationMock(
      async () => ({ tracks: [{ id: 'b' }] }) as any
    );
    const gmMod = gm();
    const gapi = gmMod.useMixGeneration();
    const gres = await gapi.generateMix();
    expect(_mixFn).toBeDefined();
    expect((gres as any).tracks.length).toBeGreaterThan(0);
  });
});
