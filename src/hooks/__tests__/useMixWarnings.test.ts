import { renderHook } from '@testing-library/react';
import { useMixWarnings } from '../../hooks/useMixWarnings';
import type { SpotifyPlaylist, MixOptions, RatioConfig } from '../../types';

const playlistA: SpotifyPlaylist = {
  id: 'a',
  name: 'A',
  tracks: { total: 10, href: '' },
  realAverageDurationSeconds: 200,
} as SpotifyPlaylist;

const playlistB: SpotifyPlaylist = {
  id: 'b',
  name: 'B',
  tracks: { total: 20, href: '' },
  realAverageDurationSeconds: 180,
} as SpotifyPlaylist;

describe('useMixWarnings', () => {
  it('returns null warnings when under limits', () => {
    const mixOptions: MixOptions = {
      totalSongs: 5,
      targetDuration: 60,
      useTimeLimit: false,
      useAllSongs: false,
      playlistName: 'x',
      shuffleWithinGroups: false,
      popularityStrategy: 'mixed',
      recencyBoost: false,
      continueWhenPlaylistEmpty: true,
    } as MixOptions;
    const ratioCfg: RatioConfig = {
      a: { min: 1, max: 2, weight: 1, weightType: 'frequency' },
      b: { min: 1, max: 2, weight: 1, weightType: 'frequency' },
    } as RatioConfig;

    const { result } = renderHook(() =>
      useMixWarnings([playlistA, playlistB], ratioCfg, mixOptions)
    );

    expect(result.current.exceedsLimit).toBeNull();
    expect(result.current.ratioImbalance).toBeNull();
  });

  it('detects exceeds songs limit', () => {
    const mixOptions: MixOptions = {
      totalSongs: 1000,
      targetDuration: 60,
      useTimeLimit: false,
      useAllSongs: false,
      playlistName: 'x',
      shuffleWithinGroups: false,
      popularityStrategy: 'mixed',
      recencyBoost: false,
      continueWhenPlaylistEmpty: true,
    } as MixOptions;

    const ratioSingle: RatioConfig = {
      a: { min: 1, max: 2, weight: 1, weightType: 'frequency' },
    } as RatioConfig;

    const { result } = renderHook(() =>
      useMixWarnings([playlistA], ratioSingle, mixOptions)
    );

    expect(result.current.exceedsLimit).not.toBeNull();
    expect(result.current.exceedsLimit?.type).toBe('songs');
  });

  it('detects ratio imbalance for time-based weightType', () => {
    const mixOptions: MixOptions = {
      totalSongs: 100,
      // make targetDuration large enough (minutes) so imbalance is detectable
      targetDuration: 60,
      useTimeLimit: true,
      useAllSongs: false,
      playlistName: 'x',
      shuffleWithinGroups: false,
      popularityStrategy: 'mixed',
      recencyBoost: false,
      continueWhenPlaylistEmpty: false,
    } as MixOptions;

    const ratioTime: RatioConfig = {
      a: { min: 1, max: 10, weight: 10, weightType: 'time' },
      b: { min: 1, max: 10, weight: 1, weightType: 'time' },
    } as RatioConfig;

    const { result } = renderHook(() =>
      useMixWarnings([playlistA, playlistB], ratioTime, mixOptions)
    );

    expect(result.current.ratioImbalance).not.toBeNull();
    expect(result.current.ratioImbalance?.limitingPlaylistName).toBeDefined();
  });

  it('returns never when useAllSongs is true and not exhausted', () => {
    const mixOptions: MixOptions = {
      totalSongs: 100,
      targetDuration: 1,
      useTimeLimit: false,
      useAllSongs: true,
      playlistName: 'x',
      shuffleWithinGroups: false,
      popularityStrategy: 'mixed',
      recencyBoost: false,
      continueWhenPlaylistEmpty: true,
    } as MixOptions;

    const largePlaylistB: SpotifyPlaylist = {
      ...playlistB,
      tracks: { total: 10000, href: '' },
    } as SpotifyPlaylist;
    const ratioAll: RatioConfig = {
      a: { min: 1, max: 2, weight: 1, weightType: 'frequency' },
      b: { min: 1, max: 2, weight: 1, weightType: 'frequency' },
    } as RatioConfig;

    const { result } = renderHook(() =>
      useMixWarnings([playlistA, largePlaylistB], ratioAll, mixOptions)
    );

    expect(result.current.ratioImbalance).not.toBeNull();
    expect(
      result.current.ratioImbalance?.mixWillBecomeImbalancedAt
    ).toBeDefined();
  });
});
