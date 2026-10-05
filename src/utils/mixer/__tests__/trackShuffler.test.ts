import { shuffleArray, shufflePlaylistTracks } from '../trackShuffler';
import { makeTrack } from './fixtures';

describe('trackShuffler', () => {
  it('shuffles without mutating the original array', () => {
    const tracks = [makeTrack(1), makeTrack(2), makeTrack(3)];
    const original = [...tracks];

    vi.spyOn(Math, 'random').mockReturnValue(0);
    const shuffled = shuffleArray(tracks);

    expect(tracks).toEqual(original);
    expect(shuffled).toHaveLength(tracks.length);
    expect(new Set(shuffled.map(track => track.id))).toEqual(
      new Set(tracks.map(track => track.id))
    );
    vi.restoreAllMocks();
  });

  it('shuffles each playlist independently without mutating the map', () => {
    const source = { p1: [makeTrack(1), makeTrack(2)], p2: [makeTrack(3)] };
    const shuffled = shufflePlaylistTracks(source);

    expect(shuffled).not.toBe(source);
    expect(shuffled.p1).not.toBe(source.p1);
    expect(shuffled.p1.map(track => track.id).sort()).toEqual(['t1', 't2']);
    expect(shuffled.p2.map(track => track.id)).toEqual(['t3']);
  });
});
