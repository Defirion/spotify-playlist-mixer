import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modal from '../../components/ui/Modal';
import TrackList from '../../components/ui/TrackList';
import { mockTracks } from '../../mocks/fixtures';

// Mock the utility functions
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

// Mock the virtualization hook
jest.mock('../../hooks/useVirtualization', () => {
  return jest.fn(() => ({
    visibleItems: mockTracks,
    startIndex: 0,
    containerProps: {},
    spacerProps: {},
    getItemProps: () => ({}),
  }));
});

describe('Component Integration Tests', () => {
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

      // Test modal close
      const closeButton = screen.getByRole('button', { name: /close modal/i });
      await user.click(closeButton);
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

      // Test Escape key to close modal
      await user.keyboard('{Escape}');
      expect(onClose).toHaveBeenCalled();
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

      // Remove first track
      const removeButtons = screen.getAllByLabelText(/remove/i);
      await user.click(removeButtons[0]);
      expect(onTrackRemove).toHaveBeenCalledWith(mockTracks[0]);
    });

    it('supports drag and drop interactions between tracks', async () => {
      const user = userEvent.setup();
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
      const onDragStart = jest.fn();
      trackItems[0].addEventListener('dragstart', onDragStart);

      await user.pointer([
        { target: trackItems[0], keys: '[MouseLeft>]' },
        { coords: { x: 100, y: 100 } },
      ]);

      // Test drag end
      await user.pointer([{ target: trackItems[1] }, { keys: '[/MouseLeft]' }]);
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

      // Remove one track
      const removeButtons = screen.getAllByLabelText(/remove/i);
      await user.click(removeButtons[0]);

      expect(onTrackRemove).toHaveBeenCalledWith(mockTracks[0]);
      expect(screen.getByTestId('selected-count')).toHaveTextContent(
        'Selected: 1'
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

      // Tab to close button
      await user.tab();
      const closeButton = screen.getByRole('button', { name: /close modal/i });
      expect(closeButton).toHaveFocus();

      // Tab should cycle back to first track
      await user.tab();
      expect(firstTrack).toHaveFocus();
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
});
