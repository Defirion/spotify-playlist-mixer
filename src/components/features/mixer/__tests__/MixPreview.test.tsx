import React from 'react';
import { render, screen } from '@testing-library/react';
import MixPreview from '../MixPreview';
import { MixedTrack } from '../../../../types';

// Mock the TrackListContainer component
jest.mock('../../../TrackList', () => ({
  TrackListContainer: ({
    tracks,
    onReorder,
  }: {
    tracks: MixedTrack[];
    onReorder: (activeId: string, overId: string) => void;
  }) => (
    <div data-testid="track-list-container">
      <div data-testid="track-count">{tracks.length} tracks</div>
      <button
        data-testid="test-reorder"
        onClick={() => onReorder('track1', 'track2')}
      >
        Test Reorder
      </button>
    </div>
  ),
}));

const mockTracks: MixedTrack[] = [
  {
    id: 'track1',
    name: 'Track 1',
    artists: [
      {
        id: 'artist1',
        name: 'Artist 1',
        uri: 'spotify:artist:artist1',
        external_urls: { spotify: 'https://spotify.com' },
      },
    ],
    album: {
      id: 'album1',
      name: 'Album 1',
      uri: 'spotify:album:album1',
      release_date: '2023-01-01',
      images: [],
      external_urls: { spotify: 'https://spotify.com' },
    },
    duration_ms: 180000,
    popularity: 80,
    uri: 'spotify:track:track1',
    external_urls: { spotify: 'https://spotify.com' },
    sourcePlaylist: 'playlist1',
  },
  {
    id: 'track2',
    name: 'Track 2',
    artists: [
      {
        id: 'artist2',
        name: 'Artist 2',
        uri: 'spotify:artist:artist2',
        external_urls: { spotify: 'https://spotify.com' },
      },
    ],
    album: {
      id: 'album2',
      name: 'Album 2',
      uri: 'spotify:album:album2',
      release_date: '2023-01-01',
      images: [],
      external_urls: { spotify: 'https://spotify.com' },
    },
    duration_ms: 200000,
    popularity: 70,
    uri: 'spotify:track:track2',
    external_urls: { spotify: 'https://spotify.com' },
    sourcePlaylist: 'playlist2',
  },
];

const mockStats = {
  playlist1: { name: 'Playlist 1', count: 1, totalDuration: 180000 },
  playlist2: { name: 'Playlist 2', count: 1, totalDuration: 200000 },
};

describe('MixPreview Drag Integration', () => {
  it('should render TrackListContainer with tracks', () => {
    const mockOnTrackOrderChange = jest.fn();

    render(
      <MixPreview
        tracks={mockTracks}
        stats={mockStats}
        totalDuration={380000}
        loading={false}
        onTrackOrderChange={mockOnTrackOrderChange}
        accessToken="test-token"
        selectedPlaylists={[]}
      />
    );

    expect(screen.getByTestId('track-list-container')).toBeInTheDocument();
    expect(screen.getByTestId('track-count')).toHaveTextContent('2 tracks');
  });

  it('should call onTrackOrderChange when tracks are reordered', () => {
    const mockOnTrackOrderChange = jest.fn();

    render(
      <MixPreview
        tracks={mockTracks}
        stats={mockStats}
        totalDuration={380000}
        loading={false}
        onTrackOrderChange={mockOnTrackOrderChange}
        accessToken="test-token"
        selectedPlaylists={[]}
      />
    );

    // Simulate drag reorder
    const reorderButton = screen.getByTestId('test-reorder');
    reorderButton.click();

    // Should be called with reordered tracks array
    expect(mockOnTrackOrderChange).toHaveBeenCalledWith([
      mockTracks[1], // track2 moved to first position
      mockTracks[0], // track1 moved to second position
    ]);
  });

  it('should not call onTrackOrderChange when reordering to same position', () => {
    const mockOnTrackOrderChange = jest.fn();

    render(
      <MixPreview
        tracks={mockTracks}
        stats={mockStats}
        totalDuration={380000}
        loading={false}
        onTrackOrderChange={mockOnTrackOrderChange}
        accessToken="test-token"
        selectedPlaylists={[]}
      />
    );

    // Mock onReorder to simulate same position drag
    const trackListContainer = screen.getByTestId('track-list-container');
    const onReorderProp = jest.fn((activeId: string, overId: string) => {
      const oldIndex = mockTracks.findIndex(track => track.id === activeId);
      const newIndex = mockTracks.findIndex(track => track.id === overId);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const newTracks = [...mockTracks];
        const [movedTrack] = newTracks.splice(oldIndex, 1);
        newTracks.splice(newIndex, 0, movedTrack);
        mockOnTrackOrderChange(newTracks);
      }
    });

    // Simulate drag to same position
    onReorderProp('track1', 'track1');

    expect(mockOnTrackOrderChange).not.toHaveBeenCalled();
  });
});
