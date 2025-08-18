import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { useTrackOperations } from '../../hooks/useTrackOperations';

afterEach(() => {
  cleanup();
});

test('useTrackOperations handlers call onTrackOrderChange with expected arrays', () => {
  const initialTracks = [
    { id: 't1', uri: 'u1', sourcePlaylist: 'p1' },
    { id: 't2', uri: 'u2', sourcePlaylist: 'p2' },
    { id: 't3', uri: 'u3', sourcePlaylist: 'p1' },
  ];

  const onTrackOrderChange = jest.fn();

  const containerRef = React.createRef<HTMLDivElement>();

  function Harness() {
    const ops = useTrackOperations({
      tracks: initialTracks as any,
      onTrackOrderChange,
      scrollContainerRef: containerRef,
    });

    // expose to test
    // @ts-ignore
    (window as any).__trackOps = ops;
    return <div ref={containerRef} />;
  }

  render(<Harness />);

  // internal reorder: move index 0 to index 2
  act(() => {
    // fromIndex 0 toIndex 2 -> should move t1 after t3
    // @ts-ignore
    (window as any).__trackOps.handleInternalReorder(0, 2);
  });

  expect(onTrackOrderChange).toHaveBeenCalled();
  let calledWith = onTrackOrderChange.mock.calls[0][0];
    expect(calledWith.map((t: any) => t.id)).toEqual(['t2', 't1', 't3']);

  // external add: insert a new track at index 1
  act(() => {
    const newTrack = { id: 't4', uri: 'u4', sourcePlaylist: 'p3' };
    // @ts-ignore
    (window as any).__trackOps.handleExternalAdd(newTrack, 1);
  });

  expect(onTrackOrderChange).toHaveBeenCalledTimes(2);
  calledWith = onTrackOrderChange.mock.calls[1][0];
    expect(calledWith.map((t: any) => t.id)).toEqual(['t1', 't4', 't2', 't3']);

  // remove track at index 2
  act(() => {
    // @ts-ignore
    (window as any).__trackOps.handleTrackRemove(2);
  });

  expect(onTrackOrderChange).toHaveBeenCalledTimes(3);
  calledWith = onTrackOrderChange.mock.calls[2][0];
    expect(calledWith.map((t: any) => t.id)).toEqual(['t1', 't2']);

  // add spotify tracks (appends)
  act(() => {
    const spotifyTracks = [{ id: 's1', uri: 'su1', sourcePlaylist: 'search' }];
    // @ts-ignore
    (window as any).__trackOps.handleAddSpotifyTracks(spotifyTracks);
  });

  expect(onTrackOrderChange).toHaveBeenCalledTimes(4);
  calledWith = onTrackOrderChange.mock.calls[3][0];
    expect(calledWith.map((t: any) => t.id)).toEqual(['t1', 't2', 't3', 's1']);
});
