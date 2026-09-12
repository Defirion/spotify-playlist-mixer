import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  makeUseMixPreviewModule,
  makeUseMixGenerationModule,
} from './mixHooks';

describe('mixHooks additional branches', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.TEST_VERBOSE;
  });

  it('works inside React hook context and updates state on generatePreview', async () => {
    const mod = makeUseMixPreviewModule();

    function TestComp() {
      const api = mod.useMixPreview();
      return (
        <div>
          <button data-testid="gen" onClick={() => void api.generatePreview()}>
            gen
          </button>
          <div data-testid="count">{api.getPreviewTracks().length}</div>
          <div data-testid="isHook">{String((api as any)._isHookContext)}</div>
        </div>
      );
    }

    render(<TestComp />);

    // Should be running in hook context
    expect(screen.getByTestId('isHook').textContent).toBe('true');
    expect(screen.getByTestId('count').textContent).toBe('0');

    // trigger generatePreview and wait for re-render
    fireEvent.click(screen.getByTestId('gen'));

    await waitFor(() =>
      expect(Number(screen.getByTestId('count').textContent)).toBeGreaterThan(0)
    );
  });

  it('respects provided totalDuration and stats when impl returns an object', async () => {
    const impl = async () => ({
      tracks: [{ id: 'x' }],
      stats: { reason: 'test' },
      totalDuration: 12345,
    });
    const mod = makeUseMixPreviewModule(impl as any);
    const api = mod.useMixPreview();
    const res = await api.generatePreview();
    expect(res.totalDuration).toBe(12345);
    expect(res.stats).toBeDefined();
    expect((res as any).stats.reason).toBe('test');
  });

  it('createPlaylist does not log when TEST_VERBOSE is not set', async () => {
    delete process.env.TEST_VERBOSE;
    const mod = makeUseMixGenerationModule();
    const api = mod.useMixGeneration();
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const created = await api.createPlaylist('name', [] as any);
    expect(created.id).toBe('created');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
