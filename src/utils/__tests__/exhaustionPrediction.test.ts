import { predictExhaustion } from '../exhaustionPrediction';
import { MixOptions, RatioConfig } from '../../types';
import { makePlaylist } from '../../test-utils/mocks/spotify';

const sources = [
  makePlaylist({
    id: 'a',
    name: 'Short',
    items: { total: 10, href: '' },
    realAverageDurationSeconds: 60,
  }),
  makePlaylist({
    id: 'b',
    name: 'Long',
    items: { total: 100, href: '' },
    realAverageDurationSeconds: 600,
  }),
];
const ratios: RatioConfig = {
  a: { weight: 1, weightType: 'frequency', min: 2, max: 4 },
  b: { weight: 1, weightType: 'frequency', min: 1, max: 2 },
};
const options: MixOptions = {
  totalSongs: 30,
  targetDurationSeconds: 7200,
  useTimeLimit: false,
  useAllSongs: false,
  continueWhenPlaylistEmpty: false,
  shuffleTracks: false,
  playlistName: 'Test',
};
const timeRatios: RatioConfig = {
  a: { ...ratios.a, weightType: 'time' },
  b: { ...ratios.b, weightType: 'time' },
};

describe('exhaustion predictions', () => {
  it('estimates count exhaustion and recommends priorities based on source sizes', () => {
    const result = predictExhaustion(sources, ratios, options);
    expect(result).toMatchObject({
      limitingPlaylistName: 'Short',
      mixWillBecomeImbalancedAt: 20,
      unit: 'songs',
      willStopEarly: true,
    });
    expect(result?.suggestedRatios?.map(p => p.config.weight)).toEqual([
      10, 100,
    ]);
    expect(result?.suggestedRatios?.[0].config).toEqual({
      ...ratios.a,
      weight: 10,
    });
    expect(ratios.a.weight).toBe(1);
    const suggested = Object.fromEntries(
      result!.suggestedRatios!.map(p => [p.playlistId, p.config])
    );
    expect(predictExhaustion(sources, suggested, options)).toBeNull();
  });

  it('uses the weighted mix average for count-balanced duration estimates', () => {
    expect(
      predictExhaustion(sources, ratios, { ...options, useTimeLimit: true })
    ).toMatchObject({ mixWillBecomeImbalancedAt: '1h 50m' });
    expect(
      predictExhaustion(sources, ratios, {
        ...options,
        useTimeLimit: true,
        targetDurationSeconds: 3600,
      })
    ).toBeNull();
  });

  it('uses time shares to estimate song counts when song lengths differ', () => {
    const result = predictExhaustion(sources, timeRatios, options);
    expect(result?.mixWillBecomeImbalancedAt).toBe(11);
    expect(result?.suggestedRatios?.map(p => p.config.weight)).toEqual([
      1, 100,
    ]);
    expect(
      predictExhaustion(sources, timeRatios, { ...options, totalSongs: 10 })
    ).toBeNull();
  });

  it('estimates time-balanced duration exhaustion in seconds', () => {
    expect(
      predictExhaustion(sources, timeRatios, { ...options, useTimeLimit: true })
    ).toMatchObject({ mixWillBecomeImbalancedAt: '20m', unit: '' });
  });

  it('warns even when exhaustion is close to the target, but not at completion', () => {
    expect(
      predictExhaustion(sources, ratios, { ...options, totalSongs: 21 })
    ).not.toBeNull();
    expect(
      predictExhaustion(sources, ratios, { ...options, totalSongs: 20 })
    ).toBeNull();
  });

  it('honors all-song mode precedence and the continuation policy', () => {
    expect(
      predictExhaustion(sources, ratios, {
        ...options,
        useAllSongs: true,
        useTimeLimit: true,
        targetDurationSeconds: 1,
        continueWhenPlaylistEmpty: true,
      })
    ).toMatchObject({
      mixWillBecomeImbalancedAt: '1h 50m',
      willStopEarly: false,
      isUseAllSongs: true,
    });
    const balanced = { ...ratios, b: { ...ratios.b, weight: 10 } };
    expect(
      predictExhaustion(sources, balanced, { ...options, useAllSongs: true })
    ).toBeNull();
  });

  it('ignores ratio entries for playlists that are no longer selected', () => {
    expect(
      predictExhaustion(
        sources,
        { ...ratios, stale: { ...ratios.a, weight: 99 } },
        options
      )
    ).toEqual(predictExhaustion(sources, ratios, options));
    expect(predictExhaustion([sources[0]], ratios, options)).toBeNull();
  });

  it('reports an empty source without suggesting an unusable zero priority', () => {
    const empty = makePlaylist({
      ...sources[0],
      items: { total: 0, href: '' },
    });
    expect(
      predictExhaustion([empty, sources[1]], ratios, options)
    ).toMatchObject({ mixWillBecomeImbalancedAt: 0, suggestedRatios: [] });
    expect(
      predictExhaustion([empty, empty], ratios, {
        ...options,
        useAllSongs: true,
      })
    ).toBeNull();
  });

  it('uses the documented duration fallback and legacy count shape', () => {
    const fallback = sources.map(p =>
      makePlaylist({
        ...p,
        items: undefined,
        tracks: { total: p.items!.total, href: '' },
        realAverageDurationSeconds: undefined,
      })
    );
    expect(
      predictExhaustion(fallback, ratios, { ...options, useTimeLimit: true })
    ).toMatchObject({ mixWillBecomeImbalancedAt: '1h 10m' });
  });

  it('does not invent a shared balance prediction for mixed ratio methods', () => {
    expect(
      predictExhaustion(sources, { ...ratios, b: timeRatios.b }, options)
    ).toBeNull();
  });

  it('keeps suggested weights inside the priority slider bounds', () => {
    const huge = makePlaylist({
      ...sources[1],
      items: { total: 100000, href: '' },
    });
    expect(
      predictExhaustion(
        [sources[0], huge],
        ratios,
        options
      )?.suggestedRatios?.map(p => p.config.weight)
    ).toEqual([1, 100]);
  });
});
