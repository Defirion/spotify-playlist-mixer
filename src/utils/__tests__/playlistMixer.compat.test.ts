import * as compat from '../mixer';
import * as mixer from '../mixer/playlistMixer';

describe('playlistMixer compatibility re-exports', () => {
  it('should re-export mixPlaylists and utility functions from the new mixer module', () => {
    expect(compat.mixPlaylists).toBe(mixer.mixPlaylists);
    expect(compat.validateInputs).toBe(mixer.validateInputs);
    expect(compat.createMixingContext).toBe(mixer.createMixingContext);
    expect(compat.calculateTargetCounts).toBe(mixer.calculateTargetCounts);
  });
});
