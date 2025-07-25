import { renderHook, act } from '@testing-library/react';
import { useRatioConfig } from '../useRatioConfig';

describe('useRatioConfig', () => {
  it('initializes with empty config', () => {
    const { result } = renderHook(() => useRatioConfig());

    expect(result.current.ratioConfig).toEqual({});
  });

  it('accepts initial config', () => {
    const initialConfig = {
      1: { min: 2, max: 4, weight: 3, weightType: 'duration' },
    };

    const { result } = renderHook(() => useRatioConfig(initialConfig));

    expect(result.current.ratioConfig).toEqual(initialConfig);
  });

  it('updates ratio config for a playlist', () => {
    const { result } = renderHook(() => useRatioConfig());

    act(() => {
      result.current.updateRatioConfig('1', { min: 2, max: 4 });
    });

    expect(result.current.ratioConfig['1']).toEqual({
      min: 2,
      max: 4,
      weight: 2, // Default value
      weightType: 'frequency', // Default value
    });
  });

  it('removes ratio config for a playlist', () => {
    const initialConfig = {
      1: { min: 1, max: 2, weight: 2, weightType: 'frequency' },
      2: { min: 2, max: 3, weight: 3, weightType: 'duration' },
    };

    const { result } = renderHook(() => useRatioConfig(initialConfig));

    act(() => {
      result.current.removeRatioConfig('1');
    });

    expect(result.current.ratioConfig).toEqual({
      2: { min: 2, max: 3, weight: 3, weightType: 'duration' },
    });
  });

  it('adds playlist to ratio config with defaults', () => {
    const { result } = renderHook(() => useRatioConfig());

    act(() => {
      result.current.addPlaylistToRatioConfig('1');
    });

    expect(result.current.ratioConfig['1']).toEqual({
      min: 1,
      max: 2,
      weight: 2,
      weightType: 'frequency',
    });
  });

  it('adds playlist to ratio config with custom values', () => {
    const { result } = renderHook(() => useRatioConfig());

    act(() => {
      result.current.addPlaylistToRatioConfig('1', { min: 3, weight: 5 });
    });

    expect(result.current.ratioConfig['1']).toEqual({
      min: 3,
      max: 2, // Default
      weight: 5,
      weightType: 'frequency', // Default
    });
  });

  it('sets ratio config in bulk', () => {
    const { result } = renderHook(() => useRatioConfig());

    const newConfig = {
      1: { min: 1, max: 2, weight: 2, weightType: 'frequency' },
      2: { min: 2, max: 3, weight: 3, weightType: 'duration' },
    };

    act(() => {
      result.current.setRatioConfigBulk(newConfig);
    });

    expect(result.current.ratioConfig).toEqual(newConfig);
  });

  it('clears all ratio config', () => {
    const initialConfig = {
      1: { min: 1, max: 2, weight: 2, weightType: 'frequency' },
    };

    const { result } = renderHook(() => useRatioConfig(initialConfig));

    act(() => {
      result.current.clearRatioConfig();
    });

    expect(result.current.ratioConfig).toEqual({});
  });

  it('gets ratio config for a playlist', () => {
    const initialConfig = {
      1: { min: 2, max: 4, weight: 3, weightType: 'duration' },
    };

    const { result } = renderHook(() => useRatioConfig(initialConfig));

    expect(result.current.getRatioConfig('1')).toEqual({
      min: 2,
      max: 4,
      weight: 3,
      weightType: 'duration',
    });

    // Returns default for non-existent playlist
    expect(result.current.getRatioConfig('2')).toEqual({
      min: 1,
      max: 2,
      weight: 2,
      weightType: 'frequency',
    });
  });
});
