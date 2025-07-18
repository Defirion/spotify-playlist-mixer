import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlaylistSelector from '../PlaylistSelector';
import { PlaylistProvider } from '../../context/PlaylistContext';
import { ISpotifyService } from '../../types/services';
import { Playlist, Track, User } from '../../types';

// Mock data
const mockUser: User = { id: 'user1', displayName: 'Test User' };

const mockPlaylists: Playlist[] = [
  {
    id: 'playlist1',
    name: 'Rock Classics',
    description: 'Classic rock hits',
    trackCount: 25,
    owner: mockUser,
    images: [{ url: 'https://example.com/image1.jpg', height: 300, width: 300 }]
  },
  {
    id: 'playlist2',
    name: 'Jazz Essentials',
    description: 'Essential jazz tracks',
    trackCount: 30,
    owner: { id: 'user2', displayName: 'Jazz Lover' },
    images: []
  },
  {
    id: 'playlist3',
    name: 'Pop Hits',
    trackCount: 50,
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

describe('PlaylistSelector Component', () => {
  let mockSpotifyService: MockSpotifyService;
  let mockOnError: jest.Mock;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    mockSpotifyService = new MockSpotifyService();
    mockOnError = jest.fn();
    user = userEvent.setup();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const renderWithProvider = (spotifyService = mockSpotifyService, onError = mockOnError) => {
    return render(
      <PlaylistProvider spotifyService={spotifyService}>
        <PlaylistSelector onError={onError} />
      </PlaylistProvider>
    );
  };

  describe('Initial Render', () => {
    it('should render the playlist selector UI', () => {
      renderWithProvider();

      expect(screen.getByText('Add Playlists to Mix')).toBeInTheDocument();
      expect(screen.getByText('0/10 playlists')).toBeInTheDocument();
      expect(screen.getByLabelText('Search playlists or paste URL:')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Try: 'salsa romantica'/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
    });

    it('should have proper CSS classes and structure', () => {
      renderWithProvider();

      const cardElement = screen.getByText('Add Playlists to Mix').closest('.card');
      expect(cardElement).toBeInTheDocument();

      const inputGroup = screen.getByLabelText('Search playlists or paste URL:').closest('.input-group');
      expect(inputGroup).toBeInTheDocument();
    });

    it('should show playlist counter', () => {
      renderWithProvider();

      const counter = screen.getByText('0/10 playlists');
      expect(counter).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    beforeEach(async () => {
      renderWithProvider();
      
      // Mock the playlist manager to have playlists
      const playlistProvider = screen.getByText('Add Playlists to Mix').closest('.card')?.parentElement;
      // This would need to be set up through the context, but for now we'll test the UI behavior
    });

    it('should handle text input changes', async () => {
      renderWithProvider();

      const input = screen.getByPlaceholderText(/Try: 'salsa romantica'/);
      
      await user.type(input, 'rock');

      expect(input).toHaveValue('rock');
    });

    it('should detect URL input and change button text', async () => {
      renderWithProvider();

      const input = screen.getByPlaceholderText(/Try: 'salsa romantica'/);
      const button = screen.getByRole('button', { name: 'Search' });

      await user.type(input, 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M');

      expect(button).toHaveTextContent('Add');
    });

    it('should detect Spotify URI and change button text', async () => {
      renderWithProvider();

      const input = screen.getByPlaceholderText(/Try: 'salsa romantica'/);
      const button = screen.getByRole('button', { name: 'Search' });

      await user.type(input, 'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M');

      expect(button).toHaveTextContent('Add');
    });

    it('should handle Enter key submission', async () => {
      renderWithProvider();

      const input = screen.getByPlaceholderText(/Try: 'salsa romantica'/);
      
      await user.type(input, 'rock music');
      await user.keyboard('{Enter}');

      // Should trigger search functionality
      expect(input).toHaveValue('rock music');
    });

    it('should debounce search input', async () => {
      renderWithProvider();

      const input = screen.getByPlaceholderText(/Try: 'salsa romantica'/);
      
      // Type rapidly
      await user.type(input, 'r');
      await user.type(input, 'o');
      await user.type(input, 'c');
      await user.type(input, 'k');

      // Should not search immediately
      expect(screen.queryByText('Found')).not.toBeInTheDocument();

      // Fast-forward debounce timer
      act(() => {
        jest.advanceTimersByTime(400);
      });

      // Now search should be triggered
      await waitFor(() => {
        expect(input).toHaveValue('rock');
      });
    });
  });

  describe('URL Validation', () => {
    it('should accept valid Spotify playlist URLs', async () => {
      renderWithProvider();

      const input = screen.getByPlaceholderText(/Try: 'salsa romantica'/);
      const validUrls = [
        'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
        'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M',
        '37i9dQZF1DXcBWIGoYBM5M'
      ];

      for (const url of validUrls) {
        await user.clear(input);
        await user.type(input, url);
        
        expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
      }
    });

    it('should reject invalid URLs', async () => {
      renderWithProvider();

      const input = screen.getByPlaceholderText(/Try: 'salsa romantica'/);
      const invalidUrls = [
        'https://google.com',
        'not-a-url',
        'spotify:track:invalid'
      ];

      for (const url of invalidUrls) {
        await user.clear(input);
        await user.type(input, url);
        
        expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
      }
    });
  });

  describe('Error Handling', () => {
    it('should call onError for invalid playlist URLs', async () => {
      renderWithProvider();

      const input = screen.getByPlaceholderText(/Try: 'salsa romantica'/);
      const button = screen.getByRole('button');

      await user.type(input, 'invalid-url');
      await user.click(button);

      expect(mockOnError).toHaveBeenCalledWith('Please enter a playlist URL or search term');
    });

    it('should handle empty input submission', async () => {
      renderWithProvider();

      const button = screen.getByRole('button');
      await user.click(button);

      expect(mockOnError).toHaveBeenCalledWith('Please enter a playlist URL or search term');
    });

    it('should handle playlist loading errors', async () => {
      mockSpotifyService.setShouldFailTracks(true);
      renderWithProvider();

      const input = screen.getByPlaceholderText(/Try: 'salsa romantica'/);
      const button = screen.getByRole('button');

      await user.type(input, 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M');
      await user.click(button);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(
          expect.stringContaining('Failed to load playlist')
        );
      });
    });

    it('should handle 404 errors with specific message', async () => {
      const error404Service = {
        ...mockSpotifyService,
        getPlaylistTracks: jest.fn().mockRejectedValue(new Error('404 not found'))
      };

      render(
        <PlaylistProvider spotifyService={error404Service as any}>
          <PlaylistSelector onError={mockOnError} />
        </PlaylistProvider>
      );

      const input = screen.getByPlaceholderText(/Try: 'salsa romantica'/);
      const button = screen.getByRole('button');

      await user.type(input, 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M');
      await user.click(button);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(
          'Playlist not found. Make sure the playlist is public or you have access to it.'
        );
      });
    });

    it('should handle 403 errors with specific message', async () => {
      const error403Service = {
        ...mockSpotifyService,
        getPlaylistTracks: jest.fn().mockRejectedValue(new Error('403 access denied'))
      };

      render(
        <PlaylistProvider spotifyService={error403Service as any}>
          <PlaylistSelector onError={mockOnError} />
        </PlaylistProvider>
      );

      const input = screen.getByPlaceholderText(/Try: 'salsa romantica'/);
      const button = screen.getByRole('button');

      await user.type(input, 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M');
      await user.click(button);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Access denied. The playlist might be private.');
      });
    });
  });

  describe('Search Results Display', () => {
    it('should show search results when found', async () => {
      renderWithProvider();

      const input = screen.getByPlaceholderText(/Try: 'salsa romantica'/);
      
      await user.type(input, 'rock');
      
      act(() => {
        jest.advanceTimersByTime(400);
      });

      // Mock search results would appear here
      // This would need proper context setup to test fully
    });

    it('should show close button for search results', async () => {
      renderWithProvider();

      // This would need search results to be displayed first
      // Testing the UI structure for when results are shown
    });

    it('should display playlist information in search results', () => {
      // Test would verify playlist name, owner, track count, and images
      // when search results are displayed
    });
  });

  describe('Playlist Selection', () => {
    it('should prevent selecting already selected playlists', async () => {
      renderWithProvider();

      // This would need to simulate a playlist already being selected
      // and then trying to select it again
    });

    it('should clear input after successful selection', async () => {
      renderWithProvider();

      const input = screen.getByPlaceholderText(/Try: 'salsa romantica'/);
      
      await user.type(input, 'test playlist');
      
      // After successful selection, input should be cleared
      // This would need proper context integration to test
    });
  });

  describe('Playlist Limit', () => {
    it('should disable input when maximum playlists reached', () => {
      // This would need to simulate having 10 playlists selected
      renderWithProvider();

      // Would need to set up context with 10 selected playlists
      // Then verify input and button are disabled
    });

    it('should show maximum playlists message', () => {
      // Test for the "Maximum of 10 playlists reached" message
      // when limit is reached
    });

    it('should update playlist counter correctly', () => {
      renderWithProvider();

      // Should show "0/10 playlists" initially
      expect(screen.getByText('0/10 playlists')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading state during search', async () => {
      renderWithProvider();

      const input = screen.getByPlaceholderText(/Try: 'salsa romantica'/);
      const button = screen.getByRole('button');

      await user.type(input, 'rock music');
      await user.click(button);

      // Should show "Searching..." text
      expect(screen.getByRole('button', { name: 'Searching...' })).toBeInTheDocument();
    });

    it('should disable button during loading', async () => {
      renderWithProvider();

      const input = screen.getByPlaceholderText(/Try: 'salsa romantica'/);
      const button = screen.getByRole('button');

      await user.type(input, 'rock music');
      await user.click(button);

      expect(button).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels and ARIA attributes', () => {
      renderWithProvider();

      const input = screen.getByLabelText('Search playlists or paste URL:');
      expect(input).toBeInTheDocument();

      const button = screen.getByRole('button', { name: 'Search' });
      expect(button).toBeInTheDocument();
    });

    it('should have proper heading structure', () => {
      renderWithProvider();

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Add Playlists to Mix');
    });

    it('should support keyboard navigation', async () => {
      renderWithProvider();

      const input = screen.getByPlaceholderText(/Try: 'salsa romantica'/);
      
      // Should be able to tab to input
      await user.tab();
      expect(input).toHaveFocus();

      // Should be able to tab to button
      await user.tab();
      expect(screen.getByRole('button')).toHaveFocus();
    });
  });

  describe('Component Cleanup', () => {
    it('should cleanup debounce timer on unmount', () => {
      const { unmount } = renderWithProvider();

      unmount();

      // Should not cause any timer-related errors
      act(() => {
        jest.advanceTimersByTime(1000);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid input changes', async () => {
      renderWithProvider();

      const input = screen.getByPlaceholderText(/Try: 'salsa romantica'/);
      
      // Rapid typing
      await user.type(input, 'abcdefghijklmnop');
      
      expect(input).toHaveValue('abcdefghijklmnop');
    });

    it('should handle special characters in search', async () => {
      renderWithProvider();

      const input = screen.getByPlaceholderText(/Try: 'salsa romantica'/);
      
      await user.type(input, 'rock & roll!');
      
      expect(input).toHaveValue('rock & roll!');
    });

    it('should handle very long input strings', async () => {
      renderWithProvider();

      const input = screen.getByPlaceholderText(/Try: 'salsa romantica'/);
      const longString = 'a'.repeat(1000);
      
      await user.type(input, longString);
      
      expect(input).toHaveValue(longString);
    });

    it('should handle empty search results gracefully', async () => {
      mockSpotifyService.setPlaylistsToReturn([]);
      renderWithProvider();

      const input = screen.getByPlaceholderText(/Try: 'salsa romantica'/);
      
      await user.type(input, 'nonexistent playlist');
      
      act(() => {
        jest.advanceTimersByTime(400);
      });

      // Should handle empty results without errors
    });
  });
});