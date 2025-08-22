import { renderHook, act } from '@testing-library/react';
import {
  makeUseMixPreviewModule,
  makeUseMixGenerationModule,
  makeUseMixPreviewMock,
  makeUseMixGenerationMock,
} from '../mixHooks';

describe('mixHooks mock factories', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.TEST_VERBOSE;
  });

  it('non-hook direct invocation falls back and supports preview lifecycle', async () => {
    const mod = makeUseMixPreviewModule();
    const inst = mod.useMixPreview(); // direct call -> should fallback to non-hook
    expect(inst._isHookContext).toBe(false);

    // generate preview
    const preview = await inst.generatePreview();
    expect(preview).toHaveProperty('tracks');
    expect(inst.getPreviewTracks()).toEqual(preview.tracks);

    // update track order
    inst.updateTrackOrder([{ id: 'updated' }]);
    expect(inst.getPreviewTracks().map((t: any) => t.id)).toEqual(['updated']);

    // clear preview
    inst.clearPreview();
    expect(inst.getPreviewTracks()).toEqual([]);
  });

  it('hook-context invocation uses React state and _isHookContext true', async () => {
    const mod = makeUseMixPreviewModule();
    const { result } = renderHook(() => mod.useMixPreview());
    expect(result.current._isHookContext).toBe(true);

    await act(async () => {
      await result.current.generatePreview();
    });

    expect(Array.isArray(result.current.getPreviewTracks())).toBe(true);
  });

  it('generation module exposes _mixFn and createPlaylist behavior (with verbose logging)', async () => {
    const mod = makeUseMixGenerationModule();
    const inst = mod.useMixGeneration();
    // _mixFn is the internal mock
    expect(typeof inst._mixFn).toBe('function');

    const mix = await inst.generateMix();
    // default impl returns { tracks: [] }
    expect(mix).toHaveProperty('tracks');

    // createPlaylist returns created result; when TEST_VERBOSE set it logs
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    process.env.TEST_VERBOSE = '1';
    const created = await inst.createPlaylist('name', [{ id: 't' }]);
    expect(created.id).toBe('created');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('legacy mock factories return modules with working fns', async () => {
    const { mockModule: previewModuleFactory, _previewFn } =
      makeUseMixPreviewMock();
    const previewMod = previewModuleFactory();
    const previewInst = previewMod.useMixPreview();
    expect(typeof previewInst.generatePreview).toBe('function');
    await previewInst.generatePreview();
    expect(_previewFn).toHaveBeenCalled();

    const { mockModule: genModuleFactory, _mixFn } = makeUseMixGenerationMock();
    const genMod = genModuleFactory();
    const genInst = genMod.useMixGeneration();
    expect(typeof genInst.generateMix).toBe('function');
    await genInst.generateMix();
    expect(_mixFn).toHaveBeenCalled();
  });
});
