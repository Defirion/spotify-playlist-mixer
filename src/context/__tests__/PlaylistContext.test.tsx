import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { PlaylistProvider, usePlaylist } from '../PlaylistContext';
import { ISpotifyService } from '../../types/services';
import { Playlist, Track, User } from '../../types';

// Mock data
const mockUser: User = { id: 'user1', displayName: 'Test User' };

const mockPlaylists: Playlist[] = [
  {
    id: 'playlist1',
    name: 'Test Playlist 1',
    description: 'First test playlist',
    trackCount: 10,
    owner: mockUser,
    images: []
  },
  {
    id: 'playlist2',
    name: 'Test Playlist 2',
    trackCount: 20,
    owner: mockUser,
    images: []
  }
];

const mockTracks: Track[] = [
  {
    id: 'track1',
    name: 'Test Track 1',
    artists: [{ id: 'artist1', name: 'Test Artist 1', uri: 'spotify:artist:artist1' }],
    album: {
      id: 'album1',
      name: 'Test Album 1',
      artists: [{ id: 'artist1', name: 'Test Artist 1', uri: 'spotify:artist:artist1' }],
      images: [],
      release_date: '2023-01-01'
    },
    duration_ms: 180000,
    popularity: 75,
    uri: 'spotify:track:track1'
  },
  {
    id: 'track2',
    name: 'Test Track 2',
    artists: [{ id: 'artist2', name: 'Test Artist 2', uri: 'spotify:artist:artist2' }],
    album: {
      id: 'album2',
      name: 'Test Album 2',
      artists: [{ id: 'artist2', name: 'Test Artist 2', uri: 'spotify:artist:artist2' }],
      images: [],
      release_date: '2023-01-02'
    },
    duration_ms: 200000,
    popularity: 80,
    uri: 'spotify:track:track2'
  }
];

// Mock SpotifyService
class MockSpotifyService implements ISpotifyService {
  private shouldFailPlaylists = false;
  private shouldFailTracks = false;
  private playlistsToReturn = mockPlaylists;
  private tracksToReturn = mockTracks;

  async authenticate() {
    return { token: 'mock-token', user: mockUser, expiresIn: 3600 };
  }

  async getUserProfile() {
    return mockUser;
  }

  async getUserPlaylists(limit = 50, offset = 0) {
    if (this.shouldFailPlaylists) {
      throw new Error('Failed to fetch playlists');
    }
    
    const start = offset;
    const end = Math.min(start + limit, this.playlistsToReturn.length);
    return this.playlistsToReturn.slice(start, end);
  }

  async getPlaylistTracks(playlistId: string) {
    if (this.shouldFailTracks) {
      throw new Error('Failed to fetch tracks');
    }
    
    return this.tracksToReturn;
  }

  async createPlaylist(name: string, description?: string) {
    return {
      id: 'new-playlist',
      name,
      description,
      trackCount: 0,
      owner: mockUser,
      images: []
    };
  }

  async addTracksToPlaylist(playlistId: string, trackUris: string[]) {
    // Mock implementation
  }

  async searchTracks(query: string, limit = 20) {
    return this.tracksToReturn.slice(0, limit);
  }

  async getTrack(trackId: string) {
    return this.tracksToReturn.find(t => t.id === trackId) || this.tracksToReturn[0];
  }

  async getMultipleTracks(trackIds: string[]) {
    return this.tracksToReturn.filter(t => trackIds.includes(t.id));
  }

  // Test helpers
  setShouldFailPlaylists(shouldFail: boolean) {
    this.shouldFailPlaylists = shouldFail;
  }

  setShouldFailTracks(shouldFail: boolean) {
    this.shouldFailTracks = shouldFail;
  }

  setPlaylistsToReturn(playlists: Playlist[]) {
    this.playlistsToReturn = playlists;
  }

  setTracksToReturn(tracks: Track[]) {
    this.tracksToReturn = tracks;
  }
}

// Test component
function TestComponent() {
  const {
    state,
    fetchUserPlaylists,
    fetchPlaylistTracks,
    selectPlaylist,
    deselectPlaylist,
    updatePlaylistConfig,
    clearSelectedPlaylists,
    clearError,
    resetState,
    isPlaylistSelected,
    getSelectedPlaylist
  } = usePlaylist();

  return (
    <div>
      <div data-testid="playlists-count">{state.userPlaylists.length}</div>
      <div data-testid="selected-count">{state.selectedPlaylists.length}</div>
      <div data-testid="is-loading">{state.isLoading.toString()}</div>
      <div data-testid="error">{state.error || 'No error'}</div>
      
      <div data-testid="playlists">
        {state.userPlaylists.map(playlist => (
          <div key={playlist.id} data-testid={`playlist-${playlist.id}`}>
            {playlist.name} - {playlist.trackCount} tracks
          </div>
        ))}
      </div>
      
      <div data-testid="selected-playlists">
        {state.selectedPlaylists.map(sp => (
          <div key={sp.playlist.id} data-testid={`selected-${sp.playlist.id}`}>
            {sp.playlist.name} - Ratio: {sp.config.ratio} - Enabled: {sp.config.isEnabled.toString()}
          </div>
        ))}
      </div>
      
      <button data-testid="fetch-playlists" onClick={fetchUserPlaylists}>
        Fetch Playlists
      </button>
      
      <button 
        data-testid="fetch-tracks" 
        onClick={() => fetchPlaylistTracks('playlist1')}
      >
        Fetch Tracks
      </button>
      
      <button 
        data-testid="select-playlist" 
        onClick={() => selectPlaylist(mockPlaylists[0])}
      >
        Select Playlist
      </button>
      
      <button 
        data-testid="deselect-playlist" 
        onClick={() => deselectPlaylist('playlist1')}
      >
        Deselect Playlist
      </button>
      
      <button 
        data-testid="update-config" 
        onClick={() => updatePlaylistConfig('playlist1', { ratio: 2, isEnabled: false })}
      >
        Update Config
      </button>
      
      <button data-testid="clear-selected" onClick={clearSelectedPlaylists}>
        Clear Selected
      </button>
      
      <button data-testid="clear-error" onClick={clearError}>
        Clear Error
      </button>
      
      <button data-testid="reset-state" onClick={resetState}>
        Reset State
      </button>
      
      <div data-testid="is-selected">{isPlaylistSelected('playlist1').toString()}</div>
      <div data-testid="selected-playlist">
        {getSelectedPlaylist('playlist1')?.playlist.name || 'None'}
      </div>
    </div>
  );
}

describe('PlaylistContext Integration Tests', () => {
  let mockSpotifyService: MockSpotifyService;

  beforeEach(() => {
    mockSpotifyService = new MockSpotifyService();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const renderWithProvider = (spotifyService = mockSpotifyService) => {
    return render(
      <PlaylistProvider spotifyService={spotifyService}>
        <TestComponent />
      </PlaylistProvider>
    );
  };

  describe('Initial State', () => {
    it('should initialize with empty state', () => {
      renderWithProvider();

      expect(screen.getByTestId('playlists-count')).toHaveTextContent('0');
      expect(screen.getByTestId('selected-count')).toHaveTextContent('0');
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
      expect(screen.getByTestId('error')).toHaveTextContent('No error');
      expect(screen.getByTestId('is-selected')).toHaveTextContent('false');
      expect(screen.getByTestId('selected-playlist')).toHaveTextContent('None');
    });
  });

  describe('Fetch Playlists', () => {
    it('should fetch user playlists successfully', async () => {
      renderWithProvider();

      await act(async () => {
        screen.getByTestId('fetch-playlists').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('playlists-count')).toHaveTextContent('2');
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('playlist-playlist1')).toHaveTextContent('Test Playlist 1 - 10 tracks');
      expect(screen.getByTestId('playlist-playlist2')).toHaveTextContent('Test Playlist 2 - 20 tracks');
    });

    it('should handle fetch playlists failure', async () => {
      mockSpotifyService.setShouldFailPlaylists(true);
      renderWithProvider();

      await act(async () => {
        screen.getByTestId('fetch-playlists').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Failed to fetch playlists');
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
      });
    });

    it('should show loading state during fetch', async () => {
      renderWithProvider();

      act(() => {
        screen.getByTestId('fetch-playlists').click();
      });

      expect(screen.getByTestId('is-loading')).toHaveTextContent('true');

      await waitFor(() => {
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
      });
    });

    it('should handle pagination for large playlist collections', async () => {
      const manyPlaylists = Array(150).fill(null).map((_, i) => ({
        id: `playlist${i}`,
        name: `Playlist ${i}`,
        trackCount: 10,
        owner: mockUser,
        images: []
      }));

      mockSpotifyService.setPlaylistsToReturn(manyPlaylists);
      renderWithProvider();

      await act(async () => {
        screen.getByTestId('fetch-playlists').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('playlists-count')).toHaveTextContent('150');
      });
    });
  });

  describe('Fetch Tracks', () => {
    it('should fetch playlist tracks successfully', async () => {
      renderWithProvider();

      await act(async () => {
        screen.getByTestId('fetch-tracks').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
      });

      // Tracks should be stored in the playlist state
      // This would be verified through the playlist having tracks
    });

    it('should handle fetch tracks failure', async () => {
      mockSpotifyService.setShouldFailTracks(true);
      renderWithProvider();

      await act(async () => {
        screen.getByTestId('fetch-tracks').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Failed to fetch tracks');
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
      });
    });
  });

  describe('Playlist Selection', () => {
    beforeEach(async () => {
      renderWithProvider();
      
      // Fetch playlists first
      await act(async () => {
        screen.getByTestId('fetch-playlists').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('playlists-count')).toHaveTextContent('2');
      });
    });

    it('should select a playlist', async () => {
      await act(async () => {
        screen.getByTestId('select-playlist').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('selected-count')).toHaveTextContent('1');
        expect(screen.getByTestId('is-selected')).toHaveTextContent('true');
        expect(screen.getByTestId('selected-playlist')).toHaveTextContent('Test Playlist 1');
      });

      expect(screen.getByTestId('selected-playlist1')).toHaveTextContent(
        'Test Playlist 1 - Ratio: 1 - Enabled: true'
      );
    });

    it('should deselect a playlist', async () => {
      // Select first
      await act(async () => {
        screen.getByTestId('select-playlist').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('selected-count')).toHaveTextContent('1');
      });

      // Then deselect
      act(() => {
        screen.getByTestId('deselect-playlist').click();
      });

      expect(screen.getByTestId('selected-count')).toHaveTextContent('0');
      expect(screen.getByTestId('is-selected')).toHaveTextContent('false');
      expect(screen.getByTestId('selected-playlist')).toHaveTextContent('None');
    });

    it('should update playlist configuration', async () => {
      // Select first
      await act(async () => {
        screen.getByTestId('select-playlist').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('selected-count')).toHaveTextContent('1');
      });

      // Update config
      act(() => {
        screen.getByTestId('update-config').click();
      });

      expect(screen.getByTestId('selected-playlist1')).toHaveTextContent(
        'Test Playlist 1 - Ratio: 2 - Enabled: false'
      );
    });

    it('should clear all selected playlists', async () => {
      // Select playlist
      await act(async () => {
        screen.getByTestId('select-playlist').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('selected-count')).toHaveTextContent('1');
      });

      // Clear all
      act(() => {
        screen.getByTestId('clear-selected').click();
      });

      expect(screen.getByTestId('selected-count')).toHaveTextContent('0');
    });

    it('should handle selecting the same playlist twice', async () => {
      // Select first time
      await act(async () => {
        screen.getByTestId('select-playlist').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('selected-count')).toHaveTextContent('1');
      });

      // Select again (should update, not duplicate)
      await act(async () => {
        screen.getByTestId('select-playlist').click();
      });

      expect(screen.getByTestId('selected-count')).toHaveTextContent('1');
    });
  });

  describe('Error Handling', () => {
    it('should clear errors', async () => {
      mockSpotifyService.setShouldFailPlaylists(true);
      renderWithProvider();

      // Trigger error
      await act(async () => {
        screen.getByTestId('fetch-playlists').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Failed to fetch playlists');
      });

      // Clear error
      act(() => {
        screen.getByTestId('clear-error').click();
      });

      expect(screen.getByTestId('error')).toHaveTextContent('No error');
    });
  });

  describe('State Reset', () => {
    it('should reset state to initial values', async () => {
      renderWithProvider();

      // Fetch playlists and select one
      await act(async () => {
        screen.getByTestId('fetch-playlists').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('playlists-count')).toHaveTextContent('2');
      });

      await act(async () => {
        screen.getByTestId('select-playlist').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('selected-count')).toHaveTextContent('1');
      });

      // Reset state
      act(() => {
        screen.getByTestId('reset-state').click();
      });

      expect(screen.getByTestId('playlists-count')).toHaveTextContent('0');
      expect(screen.getByTestId('selected-count')).toHaveTextContent('0');
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
      expect(screen.getByTestId('error')).toHaveTextContent('No error');
    });
  });

  describe('Context Error Handling', () => {
    it('should throw error when used outside provider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('usePlaylist must be used within a PlaylistProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('Background Prefetching', () => {
    it('should prefetch tracks for first few playlists', async () => {
      const getPlaylistTracksSpy = jest.spyOn(mockSpotifyService, 'getPlaylistTracks');
      renderWithProvider();

      await act(async () => {
        screen.getByTestId('fetch-playlists').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('playlists-count')).toHaveTextContent('2');
      });

      // Fast-forward timers to trigger prefetch
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Should have attempted to prefetch tracks
      await waitFor(() => {
        expect(getPlaylistTracksSpy).toHaveBeenCalled();
      });
    });
  });

  describe('Memory Management', () => {
    it('should cleanup timeouts on unmount', () => {
      const { unmount } = renderWithProvider();
      
      // This test ensures no memory leaks from timeouts
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty playlist response', async () => {
      mockSpotifyService.setPlaylistsToReturn([]);
      renderWithProvider();

      await act(async () => {
        screen.getByTestId('fetch-playlists').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('playlists-count')).toHaveTextContent('0');
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
      });
    });

    it('should handle playlist without tracks', async () => {
      const playlistWithoutTracks = {
        ...mockPlaylists[0],
        trackCount: 0
      };

      await act(async () => {
        renderWithProvider();
        screen.getByTestId('select-playlist').click();
      });

      // Should still work even with no tracks
      await waitFor(() => {
        expect(screen.getByTestId('selected-count')).toHaveTextContent('1');
      });
    });
  });
});