import { renderHook, act } from '@testing-library/react';
import { useTrackSelection } from '../../hooks/useTrackSelection';
import { SpotifyTrack } from '../../types';

// Only id/name are exercised here; cast the partial fixture to the full type.
const makeTrack = (id: string) =>
  ({ id, name: `Track ${id}` }) as unknown as SpotifyTrack;

describe('useTrackSelection', () => {
  it('toggles selection when handleTrackSelect called and clears on add', () => {
    const available = [makeTrack('1'), makeTrack('2')];
    const onAdd = vi.fn();

    const { result } = renderHook(() =>
      useTrackSelection({ availableTracks: available, onAddTracks: onAdd })
    );

    act(() => {
      result.current.handleTrackSelect(available[0]);
    });

    expect(result.current.selectedTracksToAdd.has('1')).toBe(true);

    act(() => {
      result.current.handleTrackSelect(available[0]);
    });

    expect(result.current.selectedTracksToAdd.has('1')).toBe(false);

    // select both and add (separate acts so state updates are applied)
    act(() => {
      result.current.handleTrackSelect(available[0]);
    });
    act(() => {
      result.current.handleTrackSelect(available[1]);
    });

    expect(result.current.selectedTracksToAdd.size).toBe(2);

    act(() => {
      result.current.handleAddSelected();
    });

    expect(onAdd).toHaveBeenCalledWith(available);
    expect(result.current.selectedTracksToAdd.size).toBe(0);
  });

  it('clearSelection empties the selected set', () => {
    const available = [makeTrack('a')];
    const onAdd = vi.fn();
    const { result } = renderHook(() =>
      useTrackSelection({ availableTracks: available, onAddTracks: onAdd })
    );

    act(() => result.current.handleTrackSelect(available[0]));
    expect(result.current.selectedTracksToAdd.size).toBe(1);

    act(() => result.current.clearSelection());
    expect(result.current.selectedTracksToAdd.size).toBe(0);
  });
});
