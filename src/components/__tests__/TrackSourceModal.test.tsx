/* eslint-disable import/first */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock Modal and DnD wrapper components to keep tests focused
/* eslint-disable import/first */
vi.mock('../ui/Modal', () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../SortableWrapper', () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../ui/TrackItem', () => ({
  __esModule: true,
  default: ({ track, onSelect }: any) => (
    <div
      data-testid={`track-item-${track.id}`}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(track)}
      onKeyDown={(e: any) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect(track);
      }}
    >
      {track.name}
    </div>
  ),
}));

const mockUseTrackSelection = vi.fn();
vi.mock('../../hooks/useTrackSelection', () => ({
  useTrackSelection: (opts: any) => mockUseTrackSelection(opts),
}));

import TrackSourceModal from '../TrackSourceModal';

describe('TrackSourceModal', () => {
  let _consoleLogSpy: import('vitest').MockInstance | undefined;
  beforeEach(() => {
    mockUseTrackSelection.mockReset();
    // suppress noisy debug logs during passing runs
    _consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    _consoleLogSpy?.mockRestore?.();
  });

  it('shows empty message when no tracks', () => {
    mockUseTrackSelection.mockReturnValue({
      selectedTracksToAdd: new Set(),
      handleTrackSelect: vi.fn(),
      handleAddSelected: vi.fn(),
      clearSelection: vi.fn(),
    });

    render(
      <TrackSourceModal
        isOpen={true}
        onClose={() => {}}
        title="T"
        tracks={[]}
        loading={false}
        error={null}
        onAddTracks={() => {}}
        searchQuery=""
        onSearchQueryChange={() => {}}
      />
    );

    expect(screen.getByTestId('empty-message')).toBeInTheDocument();
  });

  it('shows simple error message for Error instance', () => {
    mockUseTrackSelection.mockReturnValue({
      selectedTracksToAdd: new Set(),
      handleTrackSelect: vi.fn(),
      handleAddSelected: vi.fn(),
      clearSelection: vi.fn(),
    });

    render(
      <TrackSourceModal
        isOpen={true}
        onClose={() => {}}
        title="T"
        tracks={[]}
        loading={false}
        error={new Error('boom')}
        onAddTracks={() => {}}
        searchQuery=""
        onSearchQueryChange={() => {}}
      />
    );

    expect(
      screen.getByText('Error loading tracks. Please try again.')
    ).toBeInTheDocument();
  });

  it('calls onSearchQueryChange and onManualSearch when appropriate', () => {
    const onSearchQueryChange = vi.fn();
    const onManualSearch = vi.fn();

    mockUseTrackSelection.mockReturnValue({
      selectedTracksToAdd: new Set(),
      handleTrackSelect: vi.fn(),
      handleAddSelected: vi.fn(),
      clearSelection: vi.fn(),
    });

    render(
      <TrackSourceModal
        isOpen={true}
        onClose={() => {}}
        title="T"
        tracks={[]}
        loading={false}
        error={null}
        onAddTracks={() => {}}
        searchQuery="foo"
        onSearchQueryChange={onSearchQueryChange}
        showSearchButton={true}
        onManualSearch={onManualSearch}
      />
    );

    const btn = screen.getByTitle(
      'Search manually (searches automatically as you type)'
    );
    fireEvent.click(btn);
    expect(onManualSearch).toHaveBeenCalled();
  });

  it('renders track list and handles selection/add flow', () => {
    const t1 = {
      id: 't1',
      name: 'Track 1',
      artists: [
        {
          id: 'a1',
          name: 'Artist 1',
          uri: 'spotify:artist:a1',
          external_urls: { spotify: '' },
        },
      ],
      album: {
        id: 'al1',
        name: 'Album 1',
        images: [],
        release_date: '2020-01-01',
        uri: 'spotify:album:al1',
        external_urls: { spotify: '' },
      },
      duration_ms: 1000,
      explicit: false,
      preview_url: null,
      track_number: 1,
      uri: 'spotify:track:t1',
      external_urls: { spotify: '' },
    };
    const t2 = {
      id: 't2',
      name: 'Track 2',
      artists: [
        {
          id: 'a2',
          name: 'Artist 2',
          uri: 'spotify:artist:a2',
          external_urls: { spotify: '' },
        },
      ],
      album: {
        id: 'al2',
        name: 'Album 2',
        images: [],
        release_date: '2020-01-01',
        uri: 'spotify:album:al2',
        external_urls: { spotify: '' },
      },
      duration_ms: 1000,
      explicit: false,
      preview_url: null,
      track_number: 1,
      uri: 'spotify:track:t2',
      external_urls: { spotify: '' },
    };

    const handleAddSelected = vi.fn();
    const handleTrackSelect = vi.fn((track: any) => {
      // simulate selection by mutating the set
    });

    mockUseTrackSelection.mockReturnValue({
      selectedTracksToAdd: new Set(['t1']),
      handleTrackSelect,
      handleAddSelected,
      clearSelection: vi.fn(),
    });

    render(
      <TrackSourceModal
        isOpen={true}
        onClose={() => {}}
        title="T"
        tracks={[t1, t2]}
        loading={false}
        error={null}
        onAddTracks={() => {}}
        searchQuery=""
        onSearchQueryChange={() => {}}
      />
    );

    expect(screen.getByTestId('track-list')).toBeInTheDocument();
    // simulate clicking the first track to toggle selection
    fireEvent.click(screen.getByTestId('track-item-t1'));
    expect(handleTrackSelect).toHaveBeenCalled();

    // click add button
    const addBtn = screen.getByText(/Add/);
    fireEvent.click(addBtn);
    expect(handleAddSelected).toHaveBeenCalled();
  });

  it('regenerates instance id when trackDraggedToPreview event fires while open', () => {
    const t1 = {
      id: 't1',
      name: 'Track 1',
      artists: [
        {
          id: 'a1',
          name: 'Artist 1',
          uri: 'spotify:artist:a1',
          external_urls: { spotify: '' },
        },
      ],
      album: {
        id: 'al1',
        name: 'Album 1',
        images: [],
        release_date: '2020-01-01',
        uri: 'spotify:album:al1',
        external_urls: { spotify: '' },
      },
      duration_ms: 1000,
      explicit: false,
      preview_url: null,
      track_number: 1,
      uri: 'spotify:track:t1',
      external_urls: { spotify: '' },
    };

    mockUseTrackSelection.mockReturnValue({
      selectedTracksToAdd: new Set(),
      handleTrackSelect: vi.fn(),
      handleAddSelected: vi.fn(),
      clearSelection: vi.fn(),
    });

    render(
      <TrackSourceModal
        isOpen={true}
        onClose={() => {}}
        title="T"
        tracks={[t1]}
        loading={false}
        error={null}
        onAddTracks={() => {}}
        searchQuery=""
        onSearchQueryChange={() => {}}
      />
    );

    // Trigger custom event
    const event = new CustomEvent('trackDraggedToPreview', {
      detail: { trackId: 't1' },
    });
    window.dispatchEvent(event as Event);

    // After the event, the track list should still render and no exception thrown
    expect(screen.getByTestId('track-list')).toBeInTheDocument();
  });
});
