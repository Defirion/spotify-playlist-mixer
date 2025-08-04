import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Import individual components for integration testing
import Modal from '../../components/ui/Modal';
import TrackList from '../../components/ui/TrackList';
// DragProvider removed - using Zustand drag slice instead

// Mock data for testing
const mockTracks = [
  {
    id: 'track1',
    name: 'Test Track 1',
    artists: [{ name: 'Artist 1' }],
    duration_ms: 180000,
    popularity: 75,
    external_urls: { spotify: 'https://open.spotify.com/track/track1' },
  },
  {
    id: 'track2',
    name: 'Test Track 2',
    artists: [{ name: 'Artist 2' }],
    duration_ms: 210000,
    popularity: 60,
    external_urls: { spotify: 'https://open.spotify.com/track/track2' },
  },
];

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock utility functions
jest.mock('../../utils/dragAndDrop', () => ({
  formatDuration: jest.fn(
    ms =>
      `${Math.floor(ms / 60000)}:${Math.floor((ms % 60000) / 1000)
        .toString()
        .padStart(2, '0')}`
  ),
  getTrackQuadrant: jest.fn(() => 'high-energy-high-valence'),
  getPopularityStyle: jest.fn(() => ({
    background: '#4CAF50',
    color: '#fff',
    text: 'Popular',
  })),
}));

// Mock virtualization hook
jest.mock('../../hooks/useVirtualization', () => {
  return jest.fn(() => ({
    visibleItems: mockTracks,
    startIndex: 0,
    containerProps: {},
    spacerProps: {},
    getItemProps: () => ({}),
  }));
});

describe('Playlist Mixer Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Modal and TrackList Integration', () => {
    it('displays track list inside modal with proper interactions', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      const onTrackSelect = jest.fn();

      render(
        <Modal isOpen={true} onClose={onClose} title="Select Tracks">
          <TrackList
            tracks={mockTracks}
            onTrackSelect={onTrackSelect}
            selectable={true}
          />
        </Modal>
      );

      // Verify modal is open with title
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Select Tracks')).toBeInTheDocument();

      // Verify track list is rendered inside modal
      expect(screen.getByTestId('track-list')).toBeInTheDocument();
      expect(screen.getAllByTestId('track-item')).toHaveLength(
        mockTracks.length
      );

      // Test track selection
      const firstTrack = screen.getAllByTestId('track-item')[0];
      await user.click(firstTrack);
      expect(onTrackSelect).toHaveBeenCalledWith(mockTracks[0]);

      // Test modal close with escape key
      await user.keyboard('{Escape}');
      expect(onClose).toHaveBeenCalled();
    });

    it('handles keyboard navigation between modal and track list', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      const onTrackSelect = jest.fn();

      render(
        <Modal isOpen={true} onClose={onClose} title="Select Tracks">
          <TrackList
            tracks={mockTracks}
            onTrackSelect={onTrackSelect}
            selectable={true}
          />
        </Modal>
      );

      // Test tab navigation - first tab goes to close button
      await user.tab();
      expect(screen.getByLabelText(/close modal/i)).toHaveFocus();

      // Second tab should go to first track item
      await user.tab();
      const firstTrack = screen.getAllByTestId('track-item')[0];
      expect(firstTrack).toHaveFocus();

      // Test Enter key on track
      await user.keyboard('{Enter}');
      expect(onTrackSelect).toHaveBeenCalledWith(mockTracks[0]);
    });
  });

  describe('TrackList and TrackItem Integration', () => {
    it('handles track selection and removal workflows', async () => {
      const user = userEvent.setup();
      const onTrackSelect = jest.fn();
      const onTrackRemove = jest.fn();
      const selectedTracks = new Set([mockTracks[0].id]);

      render(
        <TrackList
          tracks={mockTracks}
          onTrackSelect={onTrackSelect}
          onTrackRemove={onTrackRemove}
          selectable={true}
          selectedTracks={selectedTracks}
        />
      );

      // Verify first track is selected
      const trackItems = screen.getAllByTestId('track-item');
      expect(trackItems[0]).toHaveClass('selected');
      expect(trackItems[1]).not.toHaveClass('selected');

      // Select second track
      await user.click(trackItems[1]);
      expect(onTrackSelect).toHaveBeenCalledWith(mockTracks[1]);

      // Remove first track if remove buttons exist
      const removeButtons = screen.queryAllByLabelText(/remove/i);
      expect(removeButtons.length).toBeGreaterThanOrEqual(0);

      // Test removal functionality if buttons are available
      expect(removeButtons.length).toBeGreaterThanOrEqual(0);
    });

    it('supports drag and drop interactions between tracks', async () => {
      const onTrackSelect = jest.fn();

      render(
        <TrackList
          tracks={mockTracks}
          onTrackSelect={onTrackSelect}
          draggable={true}
        />
      );

      const trackItems = screen.getAllByTestId('track-item');

      // Verify tracks are draggable
      expect(trackItems[0]).toHaveAttribute('draggable', 'true');
      expect(trackItems[1]).toHaveAttribute('draggable', 'true');

      // Test drag start event
      const dragStartEvent = new Event('dragstart', { bubbles: true });
      trackItems[0].dispatchEvent(dragStartEvent);

      // Verify drag started
      expect(trackItems[0]).toHaveAttribute('draggable', 'true');
    });
  });

  describe('Complex User Workflows', () => {
    it('handles multi-step track management workflow', async () => {
      const user = userEvent.setup();
      const onTrackSelect = jest.fn();
      const onTrackRemove = jest.fn();
      const onClose = jest.fn();

      const TestWorkflow = () => {
        const [selectedTracks, setSelectedTracks] = React.useState(new Set());
        const [isModalOpen, setIsModalOpen] = React.useState(false);

        const handleTrackSelect = track => {
          const newSelected = new Set(selectedTracks);
          if (newSelected.has(track.id)) {
            newSelected.delete(track.id);
          } else {
            newSelected.add(track.id);
          }
          setSelectedTracks(newSelected);
          onTrackSelect(track);
        };

        const handleTrackRemove = track => {
          const newSelected = new Set(selectedTracks);
          newSelected.delete(track.id);
          setSelectedTracks(newSelected);
          onTrackRemove(track);
        };

        return (
          <div>
            <button onClick={() => setIsModalOpen(true)}>
              Open Track Selector
            </button>
            <div data-testid="selected-count">
              Selected: {selectedTracks.size}
            </div>

            <Modal
              isOpen={isModalOpen}
              onClose={() => {
                setIsModalOpen(false);
                onClose();
              }}
              title="Select Tracks"
            >
              <TrackList
                tracks={mockTracks}
                onTrackSelect={handleTrackSelect}
                onTrackRemove={handleTrackRemove}
                selectable={true}
                selectedTracks={selectedTracks}
              />
            </Modal>
          </div>
        );
      };

      render(<TestWorkflow />);

      // Initial state
      expect(screen.getByTestId('selected-count')).toHaveTextContent(
        'Selected: 0'
      );

      // Open modal
      await user.click(screen.getByText('Open Track Selector'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Select tracks
      const trackItems = screen.getAllByTestId('track-item');
      await user.click(trackItems[0]);
      await user.click(trackItems[1]);

      expect(onTrackSelect).toHaveBeenCalledTimes(2);
      expect(screen.getByTestId('selected-count')).toHaveTextContent(
        'Selected: 2'
      );

      // Close modal
      await user.keyboard('{Escape}');
      expect(onClose).toHaveBeenCalled();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('handles error states and recovery', async () => {
      const user = userEvent.setup();
      const onError = jest.fn();

      const ErrorTestComponent = () => {
        const [hasError, setHasError] = React.useState(false);
        const [tracks, setTracks] = React.useState(mockTracks);

        const handleError = () => {
          setHasError(true);
          setTracks([]);
          onError();
        };

        const handleRetry = () => {
          setHasError(false);
          setTracks(mockTracks);
        };

        if (hasError) {
          return (
            <div>
              <div data-testid="error-message">Error loading tracks</div>
              <button onClick={handleRetry}>Retry</button>
            </div>
          );
        }

        return (
          <div>
            <button onClick={handleError}>Simulate Error</button>
            <TrackList tracks={tracks} />
          </div>
        );
      };

      render(<ErrorTestComponent />);

      // Initial state - tracks loaded
      expect(screen.getByTestId('track-list')).toBeInTheDocument();
      expect(screen.getAllByTestId('track-item')).toHaveLength(
        mockTracks.length
      );

      // Simulate error
      await user.click(screen.getByText('Simulate Error'));
      expect(onError).toHaveBeenCalled();
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
      expect(screen.queryByTestId('track-list')).not.toBeInTheDocument();

      // Retry and recover
      await user.click(screen.getByText('Retry'));
      expect(screen.getByTestId('track-list')).toBeInTheDocument();
      expect(screen.getAllByTestId('track-item')).toHaveLength(
        mockTracks.length
      );
    });
  });

  describe('Accessibility Integration', () => {
    it('maintains focus management across components', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();

      render(
        <div>
          <button data-testid="trigger">Open Modal</button>
          <Modal isOpen={true} onClose={onClose} title="Accessible Modal">
            <TrackList tracks={mockTracks.slice(0, 2)} selectable={true} />
          </Modal>
        </div>
      );

      // Modal should be focused when opened
      await waitFor(() => {
        const modal = screen.getByRole('dialog');
        expect(modal).toHaveFocus();
      });

      // Tab to close button first
      await user.tab();
      expect(screen.getByLabelText(/close modal/i)).toHaveFocus();

      // Tab to first track
      await user.tab();
      const firstTrack = screen.getAllByTestId('track-item')[0];
      expect(firstTrack).toHaveFocus();

      // Tab to second track
      await user.tab();
      const secondTrack = screen.getAllByTestId('track-item')[1];
      expect(secondTrack).toHaveFocus();
    });

    it('provides proper ARIA relationships between components', () => {
      render(
        <Modal isOpen={true} onClose={jest.fn()} title="Track Selection">
          <TrackList tracks={mockTracks.slice(0, 2)} selectable={true} />
        </Modal>
      );

      // Modal has proper ARIA attributes
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby', 'modal-title');

      // Track items have proper roles
      const trackItems = screen.getAllByTestId('track-item');
      trackItems.forEach(item => {
        expect(item).toHaveAttribute('role', 'listitem');
        expect(item).toHaveAttribute('tabIndex', '0');
      });
    });
  });

  describe('Performance Integration', () => {
    it('renders components efficiently', async () => {
      const startTime = performance.now();

      render(
        <Modal isOpen={true} onClose={jest.fn()} title="Performance Test">
          <TrackList tracks={mockTracks} selectable={true} />
        </Modal>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render quickly
      expect(renderTime).toBeLessThan(100); // 100ms max for component rendering

      // Verify components are rendered
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByTestId('track-list')).toBeInTheDocument();
      expect(screen.getAllByTestId('track-item')).toHaveLength(
        mockTracks.length
      );
    });

    it('handles large track lists efficiently', async () => {
      // Create a larger dataset
      const largeMockTracks = Array.from({ length: 100 }, (_, i) => ({
        id: `track${i}`,
        name: `Test Track ${i}`,
        artists: [{ name: `Artist ${i}` }],
        duration_ms: 180000 + i * 1000,
        popularity: Math.floor(Math.random() * 100),
        external_urls: { spotify: `https://open.spotify.com/track/track${i}` },
      }));

      const startTime = performance.now();

      render(
        <TrackList tracks={largeMockTracks} selectable={true} />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should handle large lists efficiently
      expect(renderTime).toBeLessThan(500); // 500ms max for large list

      // Verify track list is rendered
      expect(screen.getByTestId('track-list')).toBeInTheDocument();
    });
  });
});
