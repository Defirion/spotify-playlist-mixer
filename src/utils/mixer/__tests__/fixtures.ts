import { Track } from '../../../types/domain';

export const makeTrack = (
  idSuffix: string | number,
  overrides: Partial<Track> = {}
): Track => ({
  id: `t${idSuffix}`,
  title: `Track t${idSuffix}`,
  durationMs: 180000,
  artists: ['Artist'],
  album: 'Album',
  sourceRefs: [],
  ...overrides,
});

export const makePlaylist = (prefix: string, count: number, startIndex = 1) =>
  Array.from({ length: count }, (_, i) =>
    makeTrack(`${prefix}_${startIndex + i}`)
  );
