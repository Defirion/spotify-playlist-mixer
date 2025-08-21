import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlaylistMixer from '../PlaylistMixer';
import { useMixGeneration } from '../../hooks/useMixGeneration';
import { useMixPreview } from '../../hooks/useMixPreview';
import { useMixWarnings } from '../../hooks/useMixWarnings';

// Mock the DndProvider so tests can invoke the passed handlers directly
jest.mock('../DndProvider', () => {
  return function MockDndProvider({
    children,
    onDragStart,
    onDragEnd,
    onDragCancel,
  }: any) {
    return (
      <div>
        <div data-testid="dnd-children">{children}</div>
        <button
          data-testid="dnd-start-external"
          onClick={() =>
            onDragStart({
              active: {
                id: 'drag-1',
                data: {
                  current: {
                    context: 'modal',
                    track: {
                      id: 't-external',
                      instanceId: 'inst-external',
                      sourcePlaylist: 'p1',
                    },
                  },
                },
              },
            })
          }
        />
        <button data-testid="dnd-cancel" onClick={() => onDragCancel()} />
        <button
          data-testid="dnd-end-external"
          onClick={() =>
            onDragEnd({
              active: {
                id: 'drag-1',
                data: {
                  current: {
                    context: 'modal',
                    track: {
                      id: 't-external',
                      instanceId: 'inst-external',
                      sourcePlaylist: 'p1',
                    },
                  },
                },
              },
              over: { id: 'some-target' },
            })
          }
        />
      </div>
    );
  };
});

jest.mock('../../hooks/useMixGeneration', () => ({
  useMixGeneration: jest.fn(),
}));
jest.mock('../../hooks/useMixPreview', () => ({ useMixPreview: jest.fn() }));
jest.mock('../../hooks/useMixWarnings', () => ({ useMixWarnings: jest.fn() }));

const mockUseMixGeneration = useMixGeneration as jest.MockedFunction<
  typeof useMixGeneration
>;
const mockUseMixPreview = useMixPreview as jest.MockedFunction<
  typeof useMixPreview
>;
const mockUseMixWarnings = useMixWarnings as jest.MockedFunction<
  typeof useMixWarnings
>;

const mockSelectedPlaylists = [
  {
    id: 'p1',
    name: 'P1',
    images: [],
    tracks: { total: 1, href: '' },
    owner: { id: 'u' },
    public: false,
    collaborative: false,
    uri: '',
    external_urls: {},
    realAverageDurationSeconds: 200,
  },
];

const baseMixOptions = {
  totalSongs: 3,
  targetDuration: 120,
  useTimeLimit: false,
  useAllSongs: true,
  playlistName: 'Drag Mix',
  shuffleWithinGroups: true,
  popularityStrategy: 'mixed',
  recencyBoost: false,
  continueWhenPlaylistEmpty: false,
};
const baseRatio = {
  p1: { min: 0, max: 100, weight: 1, weightType: 'frequency' },
};

describe('PlaylistMixer drag optimistic flows', () => {
  let updateTrackOrder: jest.Mock;
  let getPreviewTracks: jest.Mock;
  let generatePreview: jest.Mock;
  let createPlaylist: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    createPlaylist = jest.fn().mockResolvedValue({ id: 'pl' });
    mockUseMixGeneration.mockReturnValue({
      state: {
        loading: false,
        error: null,
        mixedTracks: [],
        exhaustedPlaylists: [],
        stoppedEarly: false,
      },
      generateMix: jest.fn(),
      createPlaylist,
      reset: jest.fn(),
    } as any);

    // Start with empty preview
    const previewState = {
      preview: null,
      loading: false,
      error: null,
      customTrackOrder: null,
    };
    updateTrackOrder = jest.fn();
    getPreviewTracks = jest.fn(() => []);
    generatePreview = jest.fn();

    mockUseMixPreview.mockReturnValue({
      state: previewState,
      generatePreview,
      updateTrackOrder,
      clearPreview: jest.fn(),
      getPreviewTracks,
    } as any);

    mockUseMixWarnings.mockReturnValue({
      exceedsLimit: null,
      ratioImbalance: null,
    } as any);
  });

  it('adds optimistic track on external drag start and removes it on cancel', async () => {
    render(
      <PlaylistMixer
        accessToken="tok"
        selectedPlaylists={mockSelectedPlaylists as any}
        ratioConfig={baseRatio as any}
        mixOptions={baseMixOptions as any}
        updateMixOptions={jest.fn()}
      />
    );

    // start external drag -> optimistic add
    fireEvent.click(screen.getByTestId('dnd-start-external'));

    await waitFor(() => expect(updateTrackOrder).toHaveBeenCalled());
    // the optimistic track should have been appended to empty preview
    const calledWith = updateTrackOrder.mock.calls[0][0];
    expect(Array.isArray(calledWith)).toBe(true);
    expect(calledWith[0].id).toBe('t-external');

    // cancel drag -> should remove optimistic track
    // set getPreviewTracks to include the optimistic track so cancel logic finds it
    getPreviewTracks.mockImplementation(() => [
      { id: 't-external', instanceId: 'inst-external', sourcePlaylist: 'p1' },
    ]);

    fireEvent.click(screen.getByTestId('dnd-cancel'));

    await waitFor(() =>
      expect(updateTrackOrder.mock.calls.length).toBeGreaterThanOrEqual(2)
    );
    const lastCall =
      updateTrackOrder.mock.calls[updateTrackOrder.mock.calls.length - 1][0];
    expect(Array.isArray(lastCall)).toBe(true);
    expect(lastCall.find((t: any) => t.id === 't-external')).toBeUndefined();
  });

  it('dispatches event when external drag ends and clears optimistic reference', async () => {
    // make getPreviewTracks return the optimistic track (was added earlier)
    getPreviewTracks = jest.fn(() => [
      { id: 't-external', instanceId: 'inst-external', sourcePlaylist: 'p1' },
    ]);
    mockUseMixPreview.mockReturnValue({
      state: {
        preview: {
          tracks: [{ id: 't-external', instanceId: 'inst-external' }],
          stats: {},
          totalDuration: 0,
        },
        loading: false,
        error: null,
        customTrackOrder: null,
      },
      generatePreview: jest.fn(),
      updateTrackOrder: updateTrackOrder,
      clearPreview: jest.fn(),
      getPreviewTracks,
    } as any);

    const listener = jest.fn();
    window.addEventListener('trackDraggedToPreview', listener as any);

    render(
      <PlaylistMixer
        accessToken="tok"
        selectedPlaylists={mockSelectedPlaylists as any}
        ratioConfig={baseRatio as any}
        mixOptions={baseMixOptions as any}
        updateMixOptions={jest.fn()}
      />
    );

    // start external drag first so optimisticTrackRef is set
    fireEvent.click(screen.getByTestId('dnd-start-external'));
    // then end the external drag to trigger finalize logic
    fireEvent.click(screen.getByTestId('dnd-end-external'));

    await waitFor(() => expect(listener).toHaveBeenCalled());

    window.removeEventListener('trackDraggedToPreview', listener as any);
  });
});
