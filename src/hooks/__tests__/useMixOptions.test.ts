import { renderHook, act } from '@testing-library/react';
import { useMixOptions } from '../useMixOptions';
import { MixOptions } from '../../types';

describe('useMixOptions', () => {
  it('initializes with default options', () => {
    const { result } = renderHook(() => useMixOptions());

    expect(result.current.mixOptions).toEqual({
      totalSongs: 100,
      targetDuration: 240,
      useTimeLimit: false,
      useAllSongs: true,
      playlistName: 'My Mixed Playlist',
      shuffleWithinGroups: true,
      popularityStrategy: 'mixed',
      recencyBoost: true,
      continueWhenPlaylistEmpty: false,
    });
  });

  it('accepts initial options', () => {
    const initialOptions: Partial<MixOptions> = {
      totalSongs: 50,
      playlistName: 'Custom Playlist',
    };

    const { result } = renderHook(() => useMixOptions(initialOptions));

    expect(result.current.mixOptions.totalSongs).toBe(50);
    expect(result.current.mixOptions.playlistName).toBe('Custom Playlist');
    expect(result.current.mixOptions.useAllSongs).toBe(true); // Default value preserved
  });

  it('updates mix options', () => {
    const { result } = renderHook(() => useMixOptions());

    act(() => {
      result.current.updateMixOptions({
        totalSongs: 200,
        useTimeLimit: true,
      });
    });

    expect(result.current.mixOptions.totalSongs).toBe(200);
    expect(result.current.mixOptions.useTimeLimit).toBe(true);
    expect(result.current.mixOptions.playlistName).toBe('My Mixed Playlist'); // Other values preserved
  });

  it('resets to default options', () => {
    const { result } = renderHook(() => useMixOptions());

    act(() => {
      result.current.updateMixOptions({ totalSongs: 200 });
    });

    expect(result.current.mixOptions.totalSongs).toBe(200);

    act(() => {
      result.current.resetMixOptions();
    });

    expect(result.current.mixOptions.totalSongs).toBe(100);
  });

  it('applies preset options correctly', () => {
    const { result } = renderHook(() => useMixOptions());

    const presetData = {
      strategy: 'popular',
      settings: {
        recencyBoost: false,
        shuffleWithinGroups: false,
        useTimeLimit: true,
        targetDuration: 180,
      },
      presetName: 'Popular Mix',
    };

    act(() => {
      result.current.applyPresetOptions(presetData);
    });

    expect(result.current.mixOptions.popularityStrategy).toBe('popular');
    expect(result.current.mixOptions.recencyBoost).toBe(false);
    expect(result.current.mixOptions.shuffleWithinGroups).toBe(false);
    expect(result.current.mixOptions.useTimeLimit).toBe(true);
    expect(result.current.mixOptions.targetDuration).toBe(180);
    expect(result.current.mixOptions.playlistName).toBe('Popular Mix Mix');
  });

  it('handles sync functionality with external options', () => {
    const initialOptions: Partial<MixOptions> = {
      totalSongs: 75,
      useTimeLimit: true,
    };

    const { result, rerender } = renderHook(
      ({ options, sync }) => useMixOptions(options, sync),
      {
        initialProps: { options: initialOptions, sync: true },
      }
    );

    expect(result.current.mixOptions.totalSongs).toBe(75);
    expect(result.current.mixOptions.useTimeLimit).toBe(true);

    // Update external options
    const updatedOptions: Partial<MixOptions> = {
      totalSongs: 150,
      useTimeLimit: false,
    };

    rerender({ options: updatedOptions, sync: true });

    expect(result.current.mixOptions.totalSongs).toBe(150);
    expect(result.current.mixOptions.useTimeLimit).toBe(false);
  });

  it('calls onOptionsChange callback when options are updated', () => {
    const mockCallback = jest.fn();
    const config = { onOptionsChange: mockCallback };

    const { result } = renderHook(() => useMixOptions({}, false, config));

    act(() => {
      result.current.updateMixOptions({ totalSongs: 300 });
    });

    expect(mockCallback).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.resetMixOptions();
    });

    expect(mockCallback).toHaveBeenCalledTimes(2);
  });

  it('maintains proper TypeScript types for all return values', () => {
    const { result } = renderHook(() => useMixOptions());

    // Type assertions to ensure TypeScript compilation
    const mixOptions: MixOptions = result.current.mixOptions;
    const updateFn: (updates: Partial<MixOptions>) => void =
      result.current.updateMixOptions;
    const resetFn: () => void = result.current.resetMixOptions;
    const presetFn: (preset: {
      strategy: string;
      settings: Partial<MixOptions>;
      presetName: string;
    }) => void = result.current.applyPresetOptions;

    expect(typeof mixOptions).toBe('object');
    expect(typeof updateFn).toBe('function');
    expect(typeof resetFn).toBe('function');
    expect(typeof presetFn).toBe('function');
  });
});
