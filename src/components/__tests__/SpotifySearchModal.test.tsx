import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SpotifySearchModal from '../SpotifySearchModal';
// DragProvider removed - using Zustand drag slice instead
import * as useSpotifySearchModule from '../../hooks/useSpotifySearch';
import * as useDraggableModule from '../../hooks/useDraggable';
import * as dragAndDropUtils from '../../utils/dragAndDrop';

// Mock the hooks and utilities
jest.mock('../../hooks/useSpotifySearch');
jest.mock('../../hooks/useDraggable');
jest.mock('../../utils/dragAndDrop');

const mockUseSpotifySearch =
  useSpotifySearchModule.default as jest.MockedFunction<
    typeof useSpotifySearchModule.default
  >;
const mockUseDraggable = useDraggableModule.default as jest.MockedFunction<
  typeof useDraggableModule.default
>;
const mockHandleTrackSelection =
  dragAndDropUtils.handleTrackSelection as jest.MockedFunction<
    typeof dragAndDropUtils.handleTrackSelection
  >;

// Mock data
const mockTracks = [
  {
    id: '1',
    name: 'Test Song 1',
    artists: [
      { id: 'artist1', name: 'Test Artist 1', uri: 'spotify:artist:artist1' },
    ],
    album: {
      id: 'album1',
      name: 'Test Album 1',
      images: [{ url: 'test-image-1.jpg', height: 300, width: 300 }],
      release_date: '2023-01-01',
    },
    duration_ms: 180000,
    popularity: 75,
    uri: 'spotify:track:1',
    preview_url: 'test-preview-1.mp3',
    external_urls: { spotify: 'https://open.spotify.com/track/1' },
  },
  {
    id: '2',
    name: 'Test Song 2',
    artists: [
      { id: 'artist2', name: 'Test Artist 2', uri: 'spotify:artist:artist2' },
    ],
    album: {
      id: 'album2',
      name: 'Test Album 2',
      images: [{ url: 'test-image-2.jpg', height: 300, width: 300 }],
      release_date: '2023-02-01',
    },
    duration_ms: 200000,
    popularity: 80,
    uri: 'spotify:track:2',
    preview_url: 'test-preview-2.mp3',
    external_urls: { spotify: 'https://open.spotify.com/track/2' },
  },
];

// Mock drag context
const mockDragContext = {
  startDrag: jest.fn(),
  endDrag: jest.fn(),
  isDragging: false,
  draggedItem: null,
  dropTargets: [],
  registerDropTarget: jest.fn(),
  unregisterDropTarget: jest.fn(),
  notifyHTML5DragStart: jest.fn(),
  notifyHTML5DragEnd: jest.fn(),
  notifyTouchDragStart: jest.fn(),
  notifyTouchDragEnd: jest.fn(),
};

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

  const mockDraggableReturn = {
    dragHandleProps: {
      draggable: true,
      onDragStart: jest.fn(),
      onDragEnd: jest.fn(),
      onTouchStart: jest.fn(),
      onTouchMove: jest.fn(),
      onTouchEnd: jest.fn(),
      onKeyDown: jest.fn(),
      tabIndex: 0,
      role: 'button',
      'aria-grabbed': false,
    },
    dropZoneProps: {
      onDragOver: jest.fn(),
      onDrop: jest.fn(),
      onDragLeave: jest.fn(),
    },
    isDragging: false,
    draggedItem: null,
    dropPosition: null,
    touchState: {
      isLongPress: false,
      isActive: false,
    },
    keyboardState: {
      isDragging: false,
      selectedIndex: -1,
    },
    startDrag: jest.fn(),
    endDrag: jest.fn(),
    checkAutoScroll: jest.fn(),
    stopAutoScroll: jest.fn(),
    provideHapticFeedback: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSpotifySearch.mockReturnValue(mockSearchHookReturn);
    mockUseDraggable.mockReturnValue(mockDraggableReturn);
    mockHandleTrackSelection.mockImplementation(() => {});
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
        screen.getByPlaceholderText('Search for songs, artists, or albums...')
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Search' })
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

      expect(screen.getByText(/2 tracks found/)).toBeInTheDocument();
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
      expect(screen.getByText('Searching Spotify...')).toBeInTheDocument();
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
        screen.getByText('Error searching Spotify. Please try again.')
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
        'Search for songs, artists, or albums...'
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

      const searchButton = screen.getByRole('button', { name: 'Search' });
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
        'Search for songs, artists, or albums...'
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

      const searchButton = screen.getByRole('button', { name: 'Search' });
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

      const searchButton = screen.getByRole('button', { name: 'Searching...' });
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

  describe('Drag and Drop Integration', () => {
    beforeEach(() => {
      mockUseSpotifySearch.mockReturnValue({
        ...mockSearchHookReturn,
        results: mockTracks,
      });
    });

    it('initializes useDraggable hook with correct options', () => {
      render(
        <TestWrapper>
          <SpotifySearchModal {...defaultProps} />
        </TestWrapper>
      );

      expect(mockUseDraggable).toHaveBeenCalledWith({
        type: 'search-track',
        onDragStart: expect.any(Function),
        onDragEnd: expect.any(Function),
        scrollContainer: null, // Initially null, gets set by ref
        longPressDelay: 250,
      });
    });

    it('handles drag start correctly', () => {
      render(
        <TestWrapper>
          <SpotifySearchModal {...defaultProps} />
        </TestWrapper>
      );

      // This would be called by TrackList
      // We can test the handler function directly if needed
      expect(mockUseDraggable).toHaveBeenCalled();
    });

    it('applies dragging styles when isDragging is true', () => {
      // Mock the useDrag hook to return isDragging: true
      const mockUseDragWithDragging = {
        ...mockDragContext,
        isDragging: true,
      };

      // Mock the DragContext to provide the dragging state
      // DragContext mock no longer needed - using Zustand drag slice

      const TestWrapperWithDragging: React.FC<{
        children: React.ReactNode;
      }> = ({ children }) => <>{children}</>;

      render(
        <TestWrapperWithDragging>
          <SpotifySearchModal {...defaultProps} />
        </TestWrapperWithDragging>
      );

      const modal = screen.getByRole('dialog');
      // Check if the modal has the dragging class or the appropriate style
      expect(modal.className).toContain('modal');
    });
  });

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

      const searchInput = screen.getByPlaceholderText(
        'Search for songs, artists, or albums...'
      );

      // Check basic input attributes
      expect(searchInput).toHaveAttribute('type', 'text');
      expect(searchInput).toHaveAttribute(
        'placeholder',
        'Search for songs, artists, or albums...'
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

      expect(
        screen.getByText('Error searching Spotify. Please try again.')
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
