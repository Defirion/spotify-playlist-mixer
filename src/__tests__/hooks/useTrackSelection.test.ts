import { renderHook, act } from '@testing-library/react';
import { useTrackSelection } from '../../hooks/useTrackSelection';

const makeTrack = (id: string) => ({ id, name: `Track ${id}` });

describe('useTrackSelection', () => {
  it('toggles selection when handleTrackSelect called and clears on add', () => {
    const available = [makeTrack('1'), makeTrack('2')];
    const onAdd = jest.fn();

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
    const onAdd = jest.fn();
    const { result } = renderHook(() =>
      useTrackSelection({ availableTracks: available, onAddTracks: onAdd })
    );

    act(() => result.current.handleTrackSelect(available[0]));
    expect(result.current.selectedTracksToAdd.size).toBe(1);

    act(() => result.current.clearSelection());
    expect(result.current.selectedTracksToAdd.size).toBe(0);
  });
});
