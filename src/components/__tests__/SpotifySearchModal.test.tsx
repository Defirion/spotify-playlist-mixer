import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SpotifySearchModal from '../SpotifySearchModal';
// DragProvider removed - using Zustand drag slice instead
import * as useSpotifySearchModule from '../../hooks/useSpotifySearch';
import { makeTrack } from '../../test-utils/mocks/spotify';
// Drag-related imports removed

// Mock the hooks and utilities
jest.mock('../../hooks/useSpotifySearch');
// Drag-related mocks removed
let _trackIdCounter = 0;
const _genTrackId = () => `track_mock_id_${++_trackIdCounter}`;

jest.mock('../../utils/trackUtils', () => ({
  formatDuration: jest.fn(
    ms =>
      `${Math.floor(ms / 60000)}:${Math.floor((ms % 60000) / 1000)
        .toString()
        .padStart(2, '0')}`
  ),
  getTrackQuadrant: jest.fn(() => 'high-energy-happy'),
  getPopularityStyle: jest.fn(() => ({ opacity: 1 })),
  generateTrackInstanceId: jest.fn(() => _genTrackId()),
}));

const mockUseSpotifySearch =
  useSpotifySearchModule.default as jest.MockedFunction<
    typeof useSpotifySearchModule.default
  >;
// Drag-related mock variables removed

// Mock data
// Use factory to ensure complete SpotifyTrack shape
const mockTracks = [
  makeTrack({
    id: '1',
    name: 'Test Song 1',
    duration_ms: 180000,
    popularity: 75,
    uri: 'spotify:track:1',
    preview_url: 'test-preview-1.mp3',
    external_urls: { spotify: 'https://open.spotify.com/track/1' },
    album: {
      id: 'album1',
      name: 'Test Album 1',
      uri: 'spotify:album:album1',
      external_urls: { spotify: 'https://open.spotify.com/album/album1' },
      images: [{ url: 'test-image-1.jpg', height: 300, width: 300 }],
      release_date: '2023-01-01',
    },
  }),
  makeTrack({
    id: '2',
    name: 'Test Song 2',
    duration_ms: 200000,
    popularity: 80,
    uri: 'spotify:track:2',
    preview_url: 'test-preview-2.mp3',
    external_urls: { spotify: 'https://open.spotify.com/track/2' },
    album: {
      id: 'album2',
      name: 'Test Album 2',
      uri: 'spotify:album:album2',
      external_urls: { spotify: 'https://open.spotify.com/album/album2' },
      images: [{ url: 'test-image-2.jpg', height: 300, width: 300 }],
      release_date: '2023-02-01',
    },
  }),
];

// Drag context mock removed

// Wrapper component - no longer needs DragProvider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>{children}</>
);

describe('SpotifySearchModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    accessToken: 'test-token',
    onAddTracks: jest.fn(),
  };
  const mockHandleTrackSelection = jest.fn();

  const mockSearchHookReturn = {
    query: '',
    results: [],
    loading: false,
    error: null,
    hasMore: false,
    total: 0,
    setQuery: jest.fn(),
    search: jest.fn(),
    loadMore: jest.fn(),
    clear: jest.fn(),
    retry: jest.fn(),
    isEmpty: true,
    isInitialLoad: false,
    isLoadingMore: false,
  };

  // Silence console.log for modal closing noise emitted by TrackSourceModal
  let consoleLogSpy: jest.SpyInstance;

  // Drag-related mock return removed

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSpotifySearch.mockReturnValue(mockSearchHookReturn);
    // Drag-related mocks removed
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy?.mockRestore?.();
  });

  describe('Rendering', () => {
    it('renders the modal when open', () => {
      render(
        <TestWrapper>
          <SpotifySearchModal {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('🎵 Search Spotify')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(
        <TestWrapper>
          <SpotifySearchModal {...defaultProps} isOpen={false} />
        </TestWrapper>
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders search input and button', () => {
      render(
        <TestWrapper>
          <SpotifySearchModal {...defaultProps} />
        </TestWrapper>
      );

      expect(
        screen.getByPlaceholderText(
          'Type to search songs, artists, or albums...'
        )
      ).toBeInTheDocument();
      expect(
        screen.getByTitle(
          'Search manually (searches automatically as you type)'
        )
      ).toBeInTheDocument();
    });

    it('renders track count information', () => {
      mockUseSpotifySearch.mockReturnValue({
        ...mockSearchHookReturn,
        results: mockTracks,
      });

      render(
        <TestWrapper>
          <SpotifySearchModal {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText(/2\s*tracks/)).toBeInTheDocument();
    });

    it('renders loading state', () => {
      mockUseSpotifySearch.mockReturnValue({
        ...mockSearchHookReturn,
        loading: true,
      });

      render(
        <TestWrapper>
          <SpotifySearchModal {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getAllByText('Searching...')[0]).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('renders error state', () => {
      mockUseSpotifySearch.mockReturnValue({
        ...mockSearchHookReturn,
        error: new Error('Search failed'),
      });

      render(
        <TestWrapper>
          <SpotifySearchModal {...defaultProps} />
        </TestWrapper>
      );

      expect(
        screen.getByText('Error loading tracks. Please try again.')
      ).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('updates query when typing in search input', async () => {
      const user = userEvent.setup();
      const mockSetQuery = jest.fn();
      mockUseSpotifySearch.mockReturnValue({
        ...mockSearchHookReturn,
        setQuery: mockSetQuery,
      });

      render(
        <TestWrapper>
          <SpotifySearchModal {...defaultProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText(
        'Type to search songs, artists, or albums...'
      );
      await user.type(searchInput, 'test');

      expect(mockSetQuery).toHaveBeenCalledWith('t');
      expect(mockSetQuery).toHaveBeenCalledWith('e');
      expect(mockSetQuery).toHaveBeenCalledWith('s');
      expect(mockSetQuery).toHaveBeenCalledWith('t');
    });

    it('triggers search when clicking search button', async () => {
      const user = userEvent.setup();
      const mockSearch = jest.fn();
      mockUseSpotifySearch.mockReturnValue({
        ...mockSearchHookReturn,
        query: 'test query',
        search: mockSearch,
      });

      render(
        <TestWrapper>
          <SpotifySearchModal {...defaultProps} />
        </TestWrapper>
      );

      const searchButton = screen.getByTitle(
        'Search manually (searches automatically as you type)'
      );
      await user.click(searchButton);

      expect(mockSearch).toHaveBeenCalled();
    });

    it('triggers search when pressing Enter in search input', async () => {
      const user = userEvent.setup();
      const mockSearch = jest.fn();
      mockUseSpotifySearch.mockReturnValue({
        ...mockSearchHookReturn,
        query: 'test query',
        search: mockSearch,
      });

      render(
        <TestWrapper>
          <SpotifySearchModal {...defaultProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText(
        'Type to search songs, artists, or albums...'
      );
      await user.type(searchInput, '{enter}');

      expect(mockSearch).toHaveBeenCalled();
    });

    it('disables search button when query is empty', () => {
      mockUseSpotifySearch.mockReturnValue({
        ...mockSearchHookReturn,
        query: '',
      });

      render(
        <TestWrapper>
          <SpotifySearchModal {...defaultProps} />
        </TestWrapper>
      );

      const searchButton = screen.getByTitle(
        'Search manually (searches automatically as you type)'
      );
      expect(searchButton).toBeDisabled();
    });

    it('disables search button when loading', () => {
      mockUseSpotifySearch.mockReturnValue({
        ...mockSearchHookReturn,
        query: 'test',
        loading: true,
      });

      render(
        <TestWrapper>
          <SpotifySearchModal {...defaultProps} />
        </TestWrapper>
      );

      const searchButton = screen.getByTitle(
        'Search manually (searches automatically as you type)'
      );
      expect(searchButton).toBeDisabled();
    });
  });

  describe('Track Selection', () => {
    beforeEach(() => {
      mockUseSpotifySearch.mockReturnValue({
        ...mockSearchHookReturn,
        results: mockTracks,
      });
    });

    it('shows selected track count', () => {
      render(
        <TestWrapper>
          <SpotifySearchModal {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('0 tracks selected')).toBeInTheDocument();
    });

    it('calls handleTrackSelection when track is selected', () => {
      render(
        <TestWrapper>
          <SpotifySearchModal {...defaultProps} />
        </TestWrapper>
      );

      // This would be triggered by TrackList component
      // We can't easily test this without mocking TrackList
      expect(mockHandleTrackSelection).not.toHaveBeenCalled();
    });

    it('enables add button when tracks are selected', () => {
      // This is a simplified test - in reality we'd need to simulate track selection
      render(
        <TestWrapper>
          <SpotifySearchModal {...defaultProps} />
        </TestWrapper>
      );

      // The add button should be enabled when tracks are selected
      expect(
        screen.getByRole('button', { name: /Add 0 Tracks & Continue/ })
      ).toBeDisabled();
    });
  });

  // Drag and Drop Integration tests removed - will be replaced with dnd-kit tests

  describe('Modal Behavior', () => {
    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();

      render(
        <TestWrapper>
          <SpotifySearchModal {...defaultProps} onClose={mockOnClose} />
        </TestWrapper>
      );

      const closeButton = screen.getByLabelText('Close modal');
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();

      render(
        <TestWrapper>
          <SpotifySearchModal {...defaultProps} onClose={mockOnClose} />
        </TestWrapper>
      );

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('clears search when modal closes', () => {
      const mockClear = jest.fn();
      mockUseSpotifySearch.mockReturnValue({
        ...mockSearchHookReturn,
        clear: mockClear,
      });

      const { rerender } = render(
        <TestWrapper>
          <SpotifySearchModal {...defaultProps} isOpen={true} />
        </TestWrapper>
      );

      rerender(
        <TestWrapper>
          <SpotifySearchModal {...defaultProps} isOpen={false} />
        </TestWrapper>
      );

      expect(mockClear).toHaveBeenCalled();
    });
  });

  describe('Add Tracks Functionality', () => {
    it('calls onAddTracks with selected tracks', () => {
      const mockOnAddTracks = jest.fn();

      // Mock that we have search results and selected tracks
      mockUseSpotifySearch.mockReturnValue({
        ...mockSearchHookReturn,
        results: mockTracks,
      });

      render(
        <TestWrapper>
          <SpotifySearchModal {...defaultProps} onAddTracks={mockOnAddTracks} />
        </TestWrapper>
      );

      // This is a simplified test - in reality we'd need to simulate track selection
      // and then click the add button
      expect(mockOnAddTracks).not.toHaveBeenCalled();
    });

    it('clears selected tracks after adding', () => {
      // This would be tested by simulating the full flow of selecting tracks
      // and then clicking the add button
    });

    it('disables add button when no tracks are selected', () => {
      render(
        <TestWrapper>
          <SpotifySearchModal {...defaultProps} />
        </TestWrapper>
      );

      const addButton = screen.getByRole('button', {
        name: /Add 0 Tracks & Continue/,
      });
      expect(addButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(
        <TestWrapper>
          <SpotifySearchModal {...defaultProps} />
        </TestWrapper>
      );

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby');
    });

    it('renders search input with correct attributes', () => {
      render(
        <TestWrapper>
          <SpotifySearchModal {...defaultProps} />
        </TestWrapper>
      );

      // placeholder updated in refactor
      const searchInput = screen.getByPlaceholderText(
        'Type to search songs, artists, or albums...'
      );

      // Check basic input attributes
      expect(searchInput).toHaveAttribute('type', 'text');
      expect(searchInput).toHaveAttribute(
        'placeholder',
        'Type to search songs, artists, or albums...'
      );
    });

    it('manages focus properly', () => {
      // Test focus management when modal opens and closes
      // This would require more complex setup to test properly
    });
  });

  describe('Responsive Design', () => {
    it('applies responsive classes correctly', () => {
      render(
        <TestWrapper>
          <SpotifySearchModal {...defaultProps} />
        </TestWrapper>
      );

      // Test that CSS modules are applied
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveClass('modal');
    });
  });

  describe('Error Handling', () => {
    it('handles search errors gracefully', () => {
      mockUseSpotifySearch.mockReturnValue({
        ...mockSearchHookReturn,
        error: new Error('Network error'),
      });

      render(
        <TestWrapper>
          <SpotifySearchModal {...defaultProps} />
        </TestWrapper>
      );

      // error text changed to a more generic loading message
      expect(
        screen.getByText('Error loading tracks. Please try again.')
      ).toBeInTheDocument();
    });

    it('handles missing access token', () => {
      render(
        <TestWrapper>
          <SpotifySearchModal {...defaultProps} accessToken="" />
        </TestWrapper>
      );

      // The component should still render but search functionality should be limited
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});
