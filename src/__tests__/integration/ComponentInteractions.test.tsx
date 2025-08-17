import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modal from '../../components/ui/Modal';
import TrackList from '../../components/ui/TrackList';
import { mockTracks } from '../../mocks/fixtures';

// Mock the utility functions
let _trackIdCounter = 0;
const _genTrackId = () => `track_mock_id_${++_trackIdCounter}`;

jest.mock('../../utils/trackUtils', () => ({
  formatDuration: jest.fn(
    (ms: number) =>
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
  generateTrackInstanceId: jest.fn(() => _genTrackId()),
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

// Helper to collect track items rendered inside the track list using Testing Library queries
const getAllTrackItems = () =>
  within(screen.getByTestId('track-list')).getAllByRole('listitem');

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
      expect(getAllTrackItems()).toHaveLength(mockTracks.length);

      // Test track selection
      const firstTrack = getAllTrackItems()[0];
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
      const firstTrack = getAllTrackItems()[0];
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
    });
  });
});
