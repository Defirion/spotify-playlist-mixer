import React from 'react';
import { render, screen } from '@testing-library/react';
import TrackList, { TrackListContainer } from '../TrackList';
import { SpotifyTrack } from '../../types/spotify';
import { makeTrack } from '../../test-utils/mocks/spotify';

// Mock SortableWrapper
vi.mock('../SortableWrapper', () => {
  const __mod = (() => {
    return function MockSortableWrapper({
      id,
      children,
    }: {
      id: string;
      children: React.ReactNode;
    }) {
      return <div data-testid={`sortable-wrapper-${id}`}>{children}</div>;
    };
  })();
  return typeof __mod === 'function'
    ? { __esModule: true, default: __mod }
    : __mod;
});

// Mock TrackItem
vi.mock('../ui/TrackItem', () => {
  const __mod = (() => {
    return function MockTrackItem({ track }: { track: SpotifyTrack }) {
      return <div data-testid={`track-item-${track.id}`}>{track.name}</div>;
    };
  })();
  return typeof __mod === 'function'
    ? { __esModule: true, default: __mod }
    : __mod;
});

// Mock DraggableTrackList
vi.mock('../DraggableTrackList', () => {
  const __mod = (() => {
    return function MockDraggableTrackList({
      children,
    }: {
      children: React.ReactNode;
    }) {
      return <div data-testid="draggable-track-list">{children}</div>;
    };
  })();
  return typeof __mod === 'function'
    ? { __esModule: true, default: __mod }
    : __mod;
});

const mockTracks: SpotifyTrack[] = [
  makeTrack({
    id: 'track1',
    name: 'Track 1',
    uri: 'spotify:track:track1',
    external_urls: { spotify: 'https://open.spotify.com/track/track1' },
    duration_ms: 180000,
  }),
  makeTrack({
    id: 'track2',
    name: 'Track 2',
    uri: 'spotify:track:track2',
    external_urls: { spotify: 'https://open.spotify.com/track/track2' },
    duration_ms: 200000,
  }),
];

describe('TrackList', () => {
  it('renders tracks with SortableWrapper', () => {
    render(<TrackList tracks={mockTracks} />);

    expect(screen.getByTestId('sortable-wrapper-track1')).toBeInTheDocument();
    expect(screen.getByTestId('sortable-wrapper-track2')).toBeInTheDocument();
    expect(screen.getByTestId('track-item-track1')).toBeInTheDocument();
    expect(screen.getByTestId('track-item-track2')).toBeInTheDocument();
  });

  it('renders empty list when no tracks provided', () => {
    render(<TrackList tracks={[]} />);

    // Just verify no track items are rendered
    expect(screen.queryByTestId(/track-item-/)).not.toBeInTheDocument();
  });
});

describe('TrackListContainer', () => {
  it('renders DraggableTrackList with TrackList', () => {
    render(<TrackListContainer tracks={mockTracks} />);

    expect(screen.getByTestId('draggable-track-list')).toBeInTheDocument();
    expect(screen.getByTestId('track-item-track1')).toBeInTheDocument();
    expect(screen.getByTestId('track-item-track2')).toBeInTheDocument();
  });
});
