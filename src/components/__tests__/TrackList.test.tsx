import React from 'react';
import { render, screen } from '@testing-library/react';
import TrackList, { TrackListContainer } from '../TrackList';
import { SpotifyTrack } from '../../types/spotify';

// Mock SortableWrapper
jest.mock('../SortableWrapper', () => {
  return function MockSortableWrapper({
    id,
    children,
  }: {
    id: string;
    children: React.ReactNode;
  }) {
    return <div data-testid={`sortable-wrapper-${id}`}>{children}</div>;
  };
});

// Mock TrackItem
jest.mock('../ui/TrackItem', () => {
  return function MockTrackItem({ track }: { track: SpotifyTrack }) {
    return <div data-testid={`track-item-${track.id}`}>{track.name}</div>;
  };
});

// Mock DraggableTrackList
jest.mock('../DraggableTrackList', () => {
  return function MockDraggableTrackList({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return <div data-testid="draggable-track-list">{children}</div>;
  };
});

const mockTracks: SpotifyTrack[] = [
  {
    id: 'track1',
    name: 'Track 1',
    uri: 'spotify:track:track1',
    external_urls: { spotify: 'https://open.spotify.com/track/track1' },
    artists: [
      {
        id: 'artist1',
        name: 'Artist 1',
        uri: 'spotify:artist:artist1',
        external_urls: { spotify: '' },
      },
    ],
    album: {
      id: 'album1',
      name: 'Album 1',
      uri: 'spotify:album:album1',
      external_urls: { spotify: '' },
      release_date: '2023-01-01',
      images: [],
    },
    duration_ms: 180000,
    popularity: 75,
    preview_url: null,
    track_number: 1,
    disc_number: 1,
    explicit: false,
    is_local: false,
    is_playable: true,
  },
  {
    id: 'track2',
    name: 'Track 2',
    uri: 'spotify:track:track2',
    external_urls: { spotify: 'https://open.spotify.com/track/track2' },
    artists: [
      {
        id: 'artist2',
        name: 'Artist 2',
        uri: 'spotify:artist:artist2',
        external_urls: { spotify: '' },
      },
    ],
    album: {
      id: 'album2',
      name: 'Album 2',
      uri: 'spotify:album:album2',
      external_urls: { spotify: '' },
      release_date: '2023-01-01',
      images: [],
    },
    duration_ms: 200000,
    popularity: 80,
    preview_url: null,
    track_number: 1,
    disc_number: 1,
    explicit: false,
    is_local: false,
    is_playable: true,
  },
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
  const mockOnReorder = jest.fn();

  beforeEach(() => {
    mockOnReorder.mockClear();
  });

  it('renders DraggableTrackList with TrackList', () => {
    render(
      <TrackListContainer tracks={mockTracks} onReorder={mockOnReorder} />
    );

    expect(screen.getByTestId('draggable-track-list')).toBeInTheDocument();
    expect(screen.getByTestId('track-item-track1')).toBeInTheDocument();
    expect(screen.getByTestId('track-item-track2')).toBeInTheDocument();
  });
});
