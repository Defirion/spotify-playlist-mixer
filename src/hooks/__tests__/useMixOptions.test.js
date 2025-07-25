import { renderHook, act } from '@testing-library/react';
import { useMixOptions } from '../useMixOptions';

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
    const initialOptions = {
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
});
