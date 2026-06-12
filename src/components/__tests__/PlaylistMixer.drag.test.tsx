import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlaylistMixer from '../PlaylistMixer';
import { useMixGeneration } from '../../hooks/useMixGeneration';
import { useMixPreview } from '../../hooks/useMixPreview';
import { useMixWarnings } from '../../hooks/useMixWarnings';

// Mock the DndProvider so tests can invoke the passed handlers directly
vi.mock('../DndProvider', () => {
  const __mod = (() => {
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
  })();
  return typeof __mod === 'function'
    ? { __esModule: true, default: __mod }
    : __mod;
});

vi.mock('../../hooks/useMixGeneration', () => ({
  useMixGeneration: vi.fn(),
}));
vi.mock('../../hooks/useMixPreview', () => ({ useMixPreview: vi.fn() }));
vi.mock('../../hooks/useMixWarnings', () => ({ useMixWarnings: vi.fn() }));

const mockUseMixGeneration =
  useMixGeneration as import('vitest').MockedFunction<typeof useMixGeneration>;
const mockUseMixPreview = useMixPreview as import('vitest').MockedFunction<
  typeof useMixPreview
>;
const mockUseMixWarnings = useMixWarnings as import('vitest').MockedFunction<
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
  let updateTrackOrder: import('vitest').Mock;
  let getPreviewTracks: import('vitest').Mock;
  let generatePreview: import('vitest').Mock;
  let createPlaylist: import('vitest').Mock;

  beforeEach(() => {
    vi.clearAllMocks();

    createPlaylist = vi.fn().mockResolvedValue({ id: 'pl' });
    mockUseMixGeneration.mockReturnValue({
      state: {
        loading: false,
        error: null,
        mixedTracks: [],
        exhaustedPlaylists: [],
        stoppedEarly: false,
      },
      generateMix: vi.fn(),
      createPlaylist,
      reset: vi.fn(),
    } as any);

    // Start with empty preview
    const previewState = {
      preview: null,
      loading: false,
      error: null,
      customTrackOrder: null,
    };
    updateTrackOrder = vi.fn();
    getPreviewTracks = vi.fn(() => []);
    generatePreview = vi.fn();

    mockUseMixPreview.mockReturnValue({
      state: previewState,
      generatePreview,
      updateTrackOrder,
      clearPreview: vi.fn(),
      getPreviewTracks,
    } as any);

    mockUseMixWarnings.mockReturnValue({
      exceedsLimit: null,
      ratioImbalance: null,
    } as any);
    // silence console.log during passing runs unless DEBUG_PLAYLIST_MIXER is set
    const origLog = console.log;
    (console as any).log = (...args: any[]) => {
      if (process.env.DEBUG_PLAYLIST_MIXER) {
        origLog(...args);
      }
    };
  });

  it('adds optimistic track on external drag start and removes it on cancel', async () => {
    render(
      <PlaylistMixer
        accessToken="tok"
        selectedPlaylists={mockSelectedPlaylists as any}
        ratioConfig={baseRatio as any}
        mixOptions={baseMixOptions as any}
        updateMixOptions={vi.fn()}
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
    getPreviewTracks = vi.fn(() => [
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
      generatePreview: vi.fn(),
      updateTrackOrder: updateTrackOrder,
      clearPreview: vi.fn(),
      getPreviewTracks,
    } as any);

    const listener = vi.fn();
    window.addEventListener('trackDraggedToPreview', listener as any);

    render(
      <PlaylistMixer
        accessToken="tok"
        selectedPlaylists={mockSelectedPlaylists as any}
        ratioConfig={baseRatio as any}
        mixOptions={baseMixOptions as any}
        updateMixOptions={vi.fn()}
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
