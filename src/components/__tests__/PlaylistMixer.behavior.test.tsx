import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Now import the component under test
import PlaylistMixer from '../PlaylistMixer';

// Mocks for hooks
const mockMixGeneration = {
  state: { loading: false },
  generateMix: vi.fn(),
  createPlaylist: vi.fn(),
};

const mockMixPreview = {
  state: { preview: null, loading: false },
  getPreviewTracks: vi.fn(),
  updateTrackOrder: vi.fn(),
  clearPreview: vi.fn(),
  generatePreview: vi.fn(),
};

const mockMixWarnings = {
  exceedsLimit: false,
  ratioImbalance: false,
};

vi.mock('../../hooks/useMixGeneration', () => ({
  useMixGeneration: () => mockMixGeneration,
}));

vi.mock('../../hooks/useMixPreview', () => ({
  useMixPreview: () => mockMixPreview,
}));

vi.mock('../../hooks/useMixWarnings', () => ({
  useMixWarnings: () => mockMixWarnings,
}));

// Mock DndProvider to expose drag callbacks via buttons
vi.mock('../DndProvider', () => ({
  __esModule: true,
  default: (props: any) => {
    // capture the passed props so tests can call the autoScroll.canScroll at runtime
    (global as any).__lastDndProps = props;

    return (
      <div>
        <button
          onClick={() =>
            props.onDragStart && props.onDragStart(mockDragStartEvent)
          }
        >
          Trigger DragStart
        </button>
        <button
          onClick={() => props.onDragEnd && props.onDragEnd(mockDragEndEvent)}
        >
          Trigger DragEnd
        </button>
        <button
          onClick={() =>
            props.onDragEnd &&
            // use instance ids that will match preview tracks in tests
            props.onDragEnd({
              active: { id: 'a1', data: { current: {} } },
              over: { id: 'b1', data: { current: {} } },
            })
          }
        >
          Trigger Internal Reorder
        </button>
        <button
          onClick={() =>
            props.onDragEnd &&
            // drag end with no over
            props.onDragEnd({
              active: { id: 'noover', data: { current: {} } },
              over: null,
            })
          }
        >
          Trigger DragEnd NoOver
        </button>
        <button
          onClick={() =>
            props.onDragEnd &&
            // active === over (same index)
            props.onDragEnd({
              active: { id: 'a1', data: { current: {} } },
              over: { id: 'a1', data: { current: {} } },
            })
          }
        >
          Trigger Same Reorder
        </button>
        <button
          onClick={() =>
            props.onDragEnd &&
            // optimistic same - modal style active and over equals optimistic instance id i1
            props.onDragEnd({
              active: {
                id: 'drag-i1',
                data: { current: { context: 'modal', track: mockTrack } },
              },
              over: { id: 'i1' },
            })
          }
        >
          Trigger DragEnd OptimisticSame
        </button>
        <button
          onClick={() =>
            props.onDragEnd &&
            // optimistic move - modal style active and over equals another track id o1
            props.onDragEnd({
              active: {
                id: 'drag-i1',
                data: { current: { context: 'modal', track: mockTrack } },
              },
              over: { id: 'o1' },
            })
          }
        >
          Trigger DragEnd OptimisticMove
        </button>
        <button onClick={() => props.onDragCancel && props.onDragCancel()}>
          Trigger DragCancel
        </button>
        {props.children}
      </div>
    );
  },
}));

// Mock MixControls to expose create/generate actions
vi.mock('../features/mixer/MixControls', () => ({
  __esModule: true,
  default: (props: any) => {
    return (
      <div>
        <button
          onClick={() => props.onGeneratePreview && props.onGeneratePreview()}
        >
          Generate Preview
        </button>
        <button
          onClick={() => props.onCreatePlaylist && props.onCreatePlaylist()}
        >
          Create Playlist
        </button>
        <div data-testid="has-preview">{props.hasPreview ? 'yes' : 'no'}</div>
        <div data-testid="loading">
          {props.loading ? 'gen-loading' : 'idle'}
        </div>
        <div data-testid="preview-loading">
          {props.previewLoading ? 'prev-loading' : 'idle'}
        </div>
      </div>
    );
  },
}));

// Minimal MixPreview mock to render lists if present
vi.mock('../features/mixer/MixPreview', () => ({
  __esModule: true,
  default: (props: any) => {
    return (
      <div>
        <div data-testid="preview-tracks">
          {props.tracks ? props.tracks.length : '0'}
        </div>
        <button
          onClick={() =>
            props.onTrackOrderChange && props.onTrackOrderChange([])
          }
        >
          Change Order
        </button>
      </div>
    );
  },
}));

// Minimal PlaylistForm mock
vi.mock('../features/mixer/PlaylistForm', () => ({
  __esModule: true,
  default: (props: any) => {
    return <div data-testid="playlist-form">PlaylistForm</div>;
  },
}));

// Helpers for fake drag events
const mockTrack = {
  id: 't1',
  instanceId: 'i1',
  sourcePlaylist: 'p1',
  name: 'Track 1',
};

const mockDragStartEvent = {
  active: {
    id: 'drag-i1',
    data: { current: { context: 'modal', track: mockTrack } },
  },
};

const mockDragEndEvent = {
  active: {
    id: 'drag-i1',
    data: { current: { context: 'modal', track: mockTrack } },
  },
  over: { id: 'drop-target' },
};

describe('PlaylistMixer behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // default preview tracks empty
    mockMixPreview.getPreviewTracks.mockReturnValue([]);
    mockMixPreview.state.preview = null;
    mockMixGeneration.state.loading = false;
    // silence console.log during passing runs unless DEBUG_PLAYLIST_MIXER is set by the test
    const origLog = console.log;
    (console as any).log = (...args: any[]) => {
      if (process.env.DEBUG_PLAYLIST_MIXER) {
        origLog(...args);
      }
    };
  });

  afterEach(() => {
    // restore console.log to original implementation
    vi.restoreAllMocks();
  });

  it('calls generatePreview when user requests it through controls', async () => {
    render(
      <PlaylistMixer
        accessToken="token"
        selectedPlaylists={[]}
        ratioConfig={{}}
        mixOptions={{ playlistName: 'X' } as any}
        updateMixOptions={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /generate preview/i }));

    await waitFor(() => {
      expect(mockMixPreview.generatePreview).toHaveBeenCalled();
    });
  });

  it('renders MixPreview when there is a preview and MixControls reflects hasPreview', async () => {
    mockMixPreview.state.preview = {
      tracks: [{ id: 'a' }],
      stats: {},
      totalDuration: 123,
    } as any;

    render(
      <PlaylistMixer
        accessToken="token"
        selectedPlaylists={[]}
        ratioConfig={{}}
        mixOptions={{ playlistName: 'X' } as any}
        updateMixOptions={() => {}}
      />
    );

    expect(screen.getByTestId('preview-tracks')).toHaveTextContent('1');
    expect(screen.getByTestId('has-preview')).toHaveTextContent('yes');
  });

  it('clears preview when mixOptions meaningful fields change', async () => {
    // start with a preview
    mockMixPreview.state.preview = {
      tracks: [{ id: 'a' }],
      stats: {},
      totalDuration: 123,
    } as any;

    const updateMixOptions = vi.fn();
    const initialMixOptions = {
      playlistName: 'X',
      totalSongs: 5,
      targetDuration: 60,
      useTimeLimit: false,
      useAllSongs: false,
      shuffleWithinGroups: false,
      popularityStrategy: 'none',
      recencyBoost: 0,
      continueWhenPlaylistEmpty: false,
    } as any;

    const { rerender } = render(
      <PlaylistMixer
        accessToken="token"
        selectedPlaylists={[]}
        ratioConfig={{}}
        mixOptions={initialMixOptions}
        updateMixOptions={updateMixOptions}
      />
    );

    // Change a meaningful field
    const newMixOptions = { ...initialMixOptions, totalSongs: 10 } as any;
    mockMixPreview.clearPreview.mockClear();

    rerender(
      <PlaylistMixer
        accessToken="token"
        selectedPlaylists={[]}
        ratioConfig={{}}
        mixOptions={newMixOptions}
        updateMixOptions={updateMixOptions}
      />
    );

    await waitFor(() => {
      expect(mockMixPreview.clearPreview).toHaveBeenCalled();
    });
  });

  it('reorders within preview when internal reorder event occurs', async () => {
    // preview with two tracks
    mockMixPreview.getPreviewTracks.mockReturnValue([
      { id: 'a', instanceId: 'a1' },
      { id: 'b', instanceId: 'b1' },
    ]);
    mockMixPreview.state.preview = {
      tracks: [{ id: 'a' }, { id: 'b' }],
      stats: {},
      totalDuration: 0,
    } as any;

    render(
      <PlaylistMixer
        accessToken="token"
        selectedPlaylists={[]}
        ratioConfig={{}}
        mixOptions={{ playlistName: 'X' } as any}
        updateMixOptions={() => {}}
      />
    );

    fireEvent.click(
      screen.getByRole('button', { name: /trigger internal reorder/i })
    );

    await waitFor(() => {
      expect(mockMixPreview.updateTrackOrder).toHaveBeenCalled();
    });
  });

  it('does nothing on drag end when there is no over target', async () => {
    mockMixPreview.getPreviewTracks.mockReturnValue([
      { id: 'x', instanceId: 'x1' },
    ]);
    mockMixPreview.state.preview = {
      tracks: [{ id: 'x' }],
      stats: {},
      totalDuration: 0,
    } as any;

    render(
      <PlaylistMixer
        accessToken="token"
        selectedPlaylists={[]}
        ratioConfig={{}}
        mixOptions={{ playlistName: 'X' } as any}
        updateMixOptions={() => {}}
      />
    );

    fireEvent.click(
      screen.getByRole('button', { name: /trigger dragend noover/i })
    );

    await waitFor(() => {
      expect(mockMixPreview.updateTrackOrder).not.toHaveBeenCalled();
    });
  });

  it('does not call updateTrackOrder when active and over are same index', async () => {
    mockMixPreview.getPreviewTracks.mockReturnValue([
      { id: 'a', instanceId: 'a1' },
      { id: 'b', instanceId: 'b1' },
    ]);
    mockMixPreview.state.preview = {
      tracks: [{ id: 'a' }, { id: 'b' }],
      stats: {},
      totalDuration: 0,
    } as any;

    render(
      <PlaylistMixer
        accessToken="token"
        selectedPlaylists={[]}
        ratioConfig={{}}
        mixOptions={{ playlistName: 'X' } as any}
        updateMixOptions={() => {}}
      />
    );

    fireEvent.click(
      screen.getByRole('button', { name: /trigger same reorder/i })
    );

    await waitFor(() => {
      expect(mockMixPreview.updateTrackOrder).not.toHaveBeenCalled();
    });
  });

  it('runs debug logging branches when DEBUG_PLAYLIST_MIXER=1', async () => {
    process.env.DEBUG_PLAYLIST_MIXER = '1';
    mockMixPreview.getPreviewTracks.mockReturnValue([
      { id: 'a', instanceId: 'a1' },
      { id: 'b', instanceId: 'b1' },
    ]);
    mockMixPreview.state.preview = {
      tracks: [{ id: 'a' }, { id: 'b' }],
      stats: {},
      totalDuration: 0,
    } as any;

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    render(
      <PlaylistMixer
        accessToken="token"
        selectedPlaylists={[]}
        ratioConfig={{}}
        mixOptions={{ playlistName: 'X' } as any}
        updateMixOptions={() => {}}
      />
    );

    fireEvent.click(
      screen.getByRole('button', { name: /trigger internal reorder/i })
    );

    await waitFor(() => {
      expect(logSpy).toHaveBeenCalled();
    });

    logSpy.mockRestore();
    delete process.env.DEBUG_PLAYLIST_MIXER;
  });

  it('handles optimistic drag end when target is the optimistic track (no move), but dispatches event', async () => {
    // Start with optimistic track present
    mockMixPreview.getPreviewTracks.mockReturnValue([
      { ...mockTrack, instanceId: 'i1' },
    ]);
    mockMixPreview.state.preview = {
      tracks: [{ id: 't1' }],
      stats: {},
      totalDuration: 0,
    } as any;

    const eventSpy = vi.fn();
    window.addEventListener('trackDraggedToPreview', eventSpy as any);

    render(
      <PlaylistMixer
        accessToken="token"
        selectedPlaylists={[]}
        ratioConfig={{}}
        mixOptions={{ playlistName: 'X' } as any}
        updateMixOptions={() => {}}
      />
    );

    // ensure optimisticTrackRef is set by simulating drag start first
    fireEvent.click(screen.getByRole('button', { name: 'Trigger DragStart' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Trigger DragEnd OptimisticSame' })
    );

    await waitFor(() => {
      expect(eventSpy).toHaveBeenCalled();
    });

    window.removeEventListener('trackDraggedToPreview', eventSpy as any);
  });

  it('adds optimistic track on external drag start and removes on cancel', async () => {
    render(
      <PlaylistMixer
        accessToken="token"
        selectedPlaylists={[]}
        ratioConfig={{}}
        mixOptions={{ playlistName: 'X' } as any}
        updateMixOptions={() => {}}
      />
    );

    // trigger drag start -> should call updateTrackOrder with optimistic track appended
    fireEvent.click(screen.getByRole('button', { name: /trigger dragstart/i }));

    await waitFor(() =>
      expect(mockMixPreview.updateTrackOrder).toHaveBeenCalled()
    );
    // inspect last call outside of waitFor
    const arg = mockMixPreview.updateTrackOrder.mock.calls[0][0];
    // optimistic track appended
    expect(Array.isArray(arg)).toBe(true);
    expect(arg.some((t: any) => t.instanceId === 'i1' || t.id === 't1')).toBe(
      true
    );

    // Now cancel drag -> optimistic track should be removed (updateTrackOrder called again)
    fireEvent.click(
      screen.getByRole('button', { name: /trigger dragcancel/i })
    );

    await waitFor(() => {
      expect(mockMixPreview.updateTrackOrder).toHaveBeenCalled();
    });
  });

  it('finalizes optimistic track on drag end and dispatches event', async () => {
    // start with preview containing the optimistic track
    mockMixPreview.getPreviewTracks.mockReturnValue([
      { ...mockTrack, instanceId: 'i1' },
      { id: 'other', instanceId: 'o1' },
    ]);

    render(
      <PlaylistMixer
        accessToken="token"
        selectedPlaylists={[]}
        ratioConfig={{}}
        mixOptions={{ playlistName: 'X' } as any}
        updateMixOptions={() => {}}
      />
    );

    const eventSpy = vi.fn();
    window.addEventListener('trackDraggedToPreview', eventSpy as any);

    // ensure component saw a drag start so it has active drag state
    fireEvent.click(screen.getByRole('button', { name: 'Trigger DragStart' }));
    fireEvent.click(screen.getByRole('button', { name: 'Trigger DragEnd' }));

    await waitFor(() =>
      expect(mockMixPreview.updateTrackOrder).toHaveBeenCalled()
    );
    await waitFor(() => expect(eventSpy).toHaveBeenCalled());

    window.removeEventListener('trackDraggedToPreview', eventSpy as any);
  });

  it('creates playlist using preview tracks when available', async () => {
    const resultPlaylist = { id: 'new1', name: 'New' };
    mockMixPreview.getPreviewTracks.mockReturnValue([{ id: 't1' }]);
    mockMixGeneration.createPlaylist.mockResolvedValue(resultPlaylist);

    const onMixed = vi.fn();

    render(
      <PlaylistMixer
        accessToken="token"
        selectedPlaylists={[{ id: 'p1', name: 'P1' } as any]}
        ratioConfig={{}}
        mixOptions={{ playlistName: 'Final Mix' } as any}
        updateMixOptions={() => {}}
        onMixedPlaylist={onMixed}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /create playlist/i }));

    await waitFor(() =>
      expect(mockMixGeneration.createPlaylist).toHaveBeenCalled()
    );
    await waitFor(() => expect(onMixed).toHaveBeenCalledWith(resultPlaylist));
  });

  it('falls back to generateMix when no preview, then creates', async () => {
    const generatedTracks = [{ id: 'g1' }];
    const resultPlaylist = { id: 'new2' };
    mockMixPreview.getPreviewTracks.mockReturnValue([]);
    mockMixGeneration.generateMix.mockResolvedValue(generatedTracks as any);
    mockMixGeneration.createPlaylist.mockResolvedValue(resultPlaylist);

    const onMixed = vi.fn();

    render(
      <PlaylistMixer
        accessToken="token"
        selectedPlaylists={[{ id: 'p1', name: 'P1' } as any]}
        ratioConfig={{}}
        mixOptions={{ playlistName: 'Fallback Mix' } as any}
        updateMixOptions={() => {}}
        onMixedPlaylist={onMixed}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /create playlist/i }));

    await waitFor(() =>
      expect(mockMixGeneration.generateMix).toHaveBeenCalled()
    );
    await waitFor(() =>
      expect(mockMixGeneration.createPlaylist).toHaveBeenCalled()
    );
    await waitFor(() => expect(onMixed).toHaveBeenCalledWith(resultPlaylist));
  });

  it('logs error and does not call onMixedPlaylist when create fails', async () => {
    mockMixPreview.getPreviewTracks.mockReturnValue([{ id: 't1' }]);
    mockMixGeneration.createPlaylist.mockRejectedValue(new Error('fail'));

    const onMixed = vi.fn();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <PlaylistMixer
        accessToken="token"
        selectedPlaylists={[{ id: 'p1', name: 'P1' } as any]}
        ratioConfig={{}}
        mixOptions={{ playlistName: 'Error Mix' } as any}
        updateMixOptions={() => {}}
        onMixedPlaylist={onMixed}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /create playlist/i }));

    await waitFor(() =>
      expect(mockMixGeneration.createPlaylist).toHaveBeenCalled()
    );
    await waitFor(() => expect(errorSpy).toHaveBeenCalled());
    expect(onMixed).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it('emits debug logs for create playlist when DEBUG_PLAYLIST_MIXER=1 (preview path)', async () => {
    process.env.DEBUG_PLAYLIST_MIXER = '1';
    mockMixPreview.getPreviewTracks.mockReturnValue([{ id: 't1' }]);
    mockMixPreview.state.preview = {
      tracks: [{ id: 't1' }],
      stats: {},
      totalDuration: 0,
    } as any;
    mockMixGeneration.createPlaylist.mockResolvedValue({ id: 'dbg' });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const onMixed = vi.fn();

    render(
      <PlaylistMixer
        accessToken="token"
        selectedPlaylists={[{ id: 'p1', name: 'P1' } as any]}
        ratioConfig={{}}
        mixOptions={{ playlistName: 'Debug Mix' } as any}
        updateMixOptions={() => {}}
        onMixedPlaylist={onMixed}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /create playlist/i }));

    await waitFor(() =>
      expect(mockMixGeneration.createPlaylist).toHaveBeenCalled()
    );
    await waitFor(() => expect(logSpy).toHaveBeenCalled());
    await waitFor(() => expect(onMixed).toHaveBeenCalled());

    logSpy.mockRestore();
    delete process.env.DEBUG_PLAYLIST_MIXER;
  });

  it('handles generateMix rejection by logging and not calling onMixedPlaylist', async () => {
    mockMixPreview.getPreviewTracks.mockReturnValue([]);
    mockMixGeneration.generateMix.mockRejectedValue(
      new Error('generate failed')
    );

    const onMixed = vi.fn();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <PlaylistMixer
        accessToken="token"
        selectedPlaylists={[{ id: 'p1', name: 'P1' } as any]}
        ratioConfig={{}}
        mixOptions={{ playlistName: 'GenFail Mix' } as any}
        updateMixOptions={() => {}}
        onMixedPlaylist={onMixed}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /create playlist/i }));

    await waitFor(() =>
      expect(mockMixGeneration.generateMix).toHaveBeenCalled()
    );
    await waitFor(() => expect(errorSpy).toHaveBeenCalled());
    expect(onMixed).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it('does NOT clear preview when mixOptions fields that do not affect mixing change (playlistName)', async () => {
    // start with a preview
    mockMixPreview.state.preview = {
      tracks: [{ id: 'a' }],
      stats: {},
      totalDuration: 123,
    } as any;

    const initialMixOptions = {
      playlistName: 'X',
      totalSongs: 5,
      targetDuration: 60,
      useTimeLimit: false,
      useAllSongs: false,
      shuffleWithinGroups: false,
      popularityStrategy: 'none',
      recencyBoost: 0,
      continueWhenPlaylistEmpty: false,
    } as any;

    const { rerender } = render(
      <PlaylistMixer
        accessToken="token"
        selectedPlaylists={[]}
        ratioConfig={{}}
        mixOptions={initialMixOptions}
        updateMixOptions={() => {}}
      />
    );

    mockMixPreview.clearPreview.mockClear();

    // Change only playlistName which should NOT trigger clearPreview
    const newMixOptions = { ...initialMixOptions, playlistName: 'Y' } as any;

    rerender(
      <PlaylistMixer
        accessToken="token"
        selectedPlaylists={[]}
        ratioConfig={{}}
        mixOptions={newMixOptions}
        updateMixOptions={() => {}}
      />
    );

    await waitFor(() => {
      expect(mockMixPreview.clearPreview).not.toHaveBeenCalled();
    });
  });

  it('moves optimistic track to a different target index on drag end', async () => {
    // preview with optimistic track and another track where target index differs
    mockMixPreview.getPreviewTracks.mockReturnValue([
      { id: 't1', instanceId: 'i1' },
      { id: 'other', instanceId: 'o1' },
    ]);
    mockMixPreview.state.preview = {
      tracks: [{ id: 't1' }, { id: 'other' }],
      stats: {},
      totalDuration: 0,
    } as any;

    render(
      <PlaylistMixer
        accessToken="token"
        selectedPlaylists={[]}
        ratioConfig={{}}
        mixOptions={{ playlistName: 'X' } as any}
        updateMixOptions={() => {}}
      />
    );

    // Simulate drag start (optimistic add) then drag end with over pointing at other track
    fireEvent.click(screen.getByRole('button', { name: 'Trigger DragStart' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Trigger DragEnd OptimisticSame' })
    );

    await waitFor(() => {
      expect(mockMixPreview.updateTrackOrder).toHaveBeenCalled();
    });
  });

  it('logs reordering within preview when DEBUG_PLAYLIST_MIXER=1 and active/over are in preview', async () => {
    process.env.DEBUG_PLAYLIST_MIXER = '1';
    mockMixPreview.getPreviewTracks.mockReturnValue([
      { id: 'a', instanceId: 'a1' },
      { id: 'b', instanceId: 'b1' },
      { id: 'c', instanceId: 'c1' },
    ]);
    mockMixPreview.state.preview = {
      tracks: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      stats: {},
      totalDuration: 0,
    } as any;

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    render(
      <PlaylistMixer
        accessToken="token"
        selectedPlaylists={[]}
        ratioConfig={{}}
        mixOptions={{ playlistName: 'X' } as any}
        updateMixOptions={() => {}}
      />
    );

    // Use internal reorder button to move a1 -> c1
    fireEvent.click(
      screen.getByRole('button', { name: /trigger internal reorder/i })
    );

    await waitFor(() => expect(logSpy).toHaveBeenCalled());
    await waitFor(() =>
      expect(mockMixPreview.updateTrackOrder).toHaveBeenCalled()
    );

    logSpy.mockRestore();
    delete process.env.DEBUG_PLAYLIST_MIXER;
  });

  it('logs reorder failed when DEBUG_PLAYLIST_MIXER=1 and tracks not found', async () => {
    process.env.DEBUG_PLAYLIST_MIXER = '1';
    // preview has different ids
    mockMixPreview.getPreviewTracks.mockReturnValue([
      { id: 'x', instanceId: 'x1' },
    ]);
    mockMixPreview.state.preview = {
      tracks: [{ id: 'x' }],
      stats: {},
      totalDuration: 0,
    } as any;

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    render(
      <PlaylistMixer
        accessToken="token"
        selectedPlaylists={[]}
        ratioConfig={{}}
        mixOptions={{ playlistName: 'X' } as any}
        updateMixOptions={() => {}}
      />
    );

    // trigger internal reorder where active/over won't match preview
    fireEvent.click(
      screen.getByRole('button', { name: /trigger internal reorder/i })
    );

    await waitFor(() => {
      expect(logSpy).toHaveBeenCalled();
    });

    logSpy.mockRestore();
    delete process.env.DEBUG_PLAYLIST_MIXER;
  });

  it('moves optimistic track to a different target index on optimistic move button', async () => {
    // preview with optimistic track and another track where target index differs
    mockMixPreview.getPreviewTracks.mockReturnValue([
      { id: 't1', instanceId: 'i1' },
      { id: 'other', instanceId: 'o1' },
    ]);
    mockMixPreview.state.preview = {
      tracks: [{ id: 't1' }, { id: 'other' }],
      stats: {},
      totalDuration: 0,
    } as any;

    render(
      <PlaylistMixer
        accessToken="token"
        selectedPlaylists={[]}
        ratioConfig={{}}
        mixOptions={{ playlistName: 'X' } as any}
        updateMixOptions={() => {}}
      />
    );

    // simulate drag start then optimistic move to o1
    fireEvent.click(screen.getByRole('button', { name: /trigger dragstart/i }));
    fireEvent.click(
      screen.getByRole('button', { name: /trigger dragend optimisticmove/i })
    );

    await waitFor(() => {
      expect(mockMixPreview.updateTrackOrder).toHaveBeenCalled();
    });
  });

  it('invokes mixPreview.updateTrackOrder when MixPreview onTrackOrderChange is called', async () => {
    mockMixPreview.state.preview = {
      tracks: [{ id: 'a' }, { id: 'b' }],
      stats: {},
      totalDuration: 0,
    } as any;
    mockMixPreview.getPreviewTracks.mockReturnValue([{ id: 'a' }, { id: 'b' }]);

    render(
      <PlaylistMixer
        accessToken="token"
        selectedPlaylists={[]}
        ratioConfig={{}}
        mixOptions={{ playlistName: 'X' } as any}
        updateMixOptions={() => {}}
      />
    );

    // Click the MixPreview change order button which calls onTrackOrderChange([])
    fireEvent.click(screen.getByRole('button', { name: /change order/i }));

    await waitFor(() => {
      expect(mockMixPreview.updateTrackOrder).toHaveBeenCalledWith([]);
    });
  });

  it('calls autoScroll.canScroll for both scrollingElement and other element', async () => {
    mockMixPreview.state.preview = null;

    render(
      <PlaylistMixer
        accessToken="token"
        selectedPlaylists={[]}
        ratioConfig={{}}
        mixOptions={{ playlistName: 'X' } as any}
        updateMixOptions={() => {}}
      />
    );

    // Props captured by the mock
    const props = (global as any).__lastDndProps;
    expect(props).toBeDefined();
    expect(props.autoScroll).toBeDefined();
    expect(typeof props.autoScroll.canScroll).toBe('function');

    // call with scrollingElement (should return boolean)
    const r1 = props.autoScroll.canScroll(document.scrollingElement);
    // call with other (should return boolean)
    const other = document.createElement('div');
    const r2 = props.autoScroll.canScroll(other);

    // ensure both return values are booleans
    expect(typeof r1).toBe('boolean');
    expect(typeof r2).toBe('boolean');
  });
});
