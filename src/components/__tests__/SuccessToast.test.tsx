import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SuccessToast from '../SuccessToast';
import { MixedPlaylistToast } from '../../types/components';

// Mock CSS modules
jest.mock('../SuccessToast.module.css', () => ({
  toastContainer: 'toastContainer',
  toast: 'toast',
  'toast-0': 'toast-0',
  'toast-1': 'toast-1',
  'toast-2': 'toast-2',
  'toast-stacked': 'toast-stacked',
  toastContent: 'toastContent',
  toastMain: 'toastMain',
  toastTitle: 'toastTitle',
  toastMessage: 'toastMessage',
  toastDetails: 'toastDetails',
  toastButton: 'toastButton',
  closeButton: 'closeButton',
  spotifyLink: 'spotifyLink',
}));

describe('SuccessToast', () => {
  const mockOnDismiss = jest.fn();

  const createMockPlaylist = (
    overrides: Partial<MixedPlaylistToast> = {}
  ): MixedPlaylistToast => ({
    toastId: 'test-toast-1',
    name: 'Test Mixed Playlist',
    tracks: { total: 25 },
    duration: 90, // 1h 30m
    createdAt: new Date('2023-01-01T12:00:00Z'),
    external_urls: { spotify: 'https://open.spotify.com/playlist/test' },
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock the current time for consistent time calculations
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2023-01-01T12:05:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders nothing when mixedPlaylists is null', () => {
      render(<SuccessToast mixedPlaylists={null} onDismiss={mockOnDismiss} />);
      expect(screen.queryByTestId('success-toast')).not.toBeInTheDocument();
    });

    it('renders nothing when mixedPlaylists is empty array', () => {
      render(<SuccessToast mixedPlaylists={[]} onDismiss={mockOnDismiss} />);
      expect(screen.queryByTestId('success-toast')).not.toBeInTheDocument();
    });

    it('renders single toast correctly', () => {
      const playlist = createMockPlaylist();
      render(
        <SuccessToast mixedPlaylists={[playlist]} onDismiss={mockOnDismiss} />
      );

      expect(
        screen.getByText('🎉 Mixed Playlist Created!')
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /Your new playlist "Test Mixed Playlist" has been created with 25 songs/
        )
      ).toBeInTheDocument();
      expect(screen.getByText('Created 5 minutes ago')).toBeInTheDocument();
      expect(
        screen.getByRole('button', {
          name: 'Open Test Mixed Playlist in Spotify',
        })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', {
          name: 'Dismiss notification for Test Mixed Playlist',
        })
      ).toBeInTheDocument();
    });

    it('renders multiple toasts correctly', () => {
      const playlists = [
        createMockPlaylist({ toastId: 'toast-1', name: 'Playlist 1' }),
        createMockPlaylist({ toastId: 'toast-2', name: 'Playlist 2' }),
        createMockPlaylist({ toastId: 'toast-3', name: 'Playlist 3' }),
      ];
      render(
        <SuccessToast mixedPlaylists={playlists} onDismiss={mockOnDismiss} />
      );

      expect(screen.getByTestId('success-toast-toast-1')).toBeInTheDocument();
      expect(screen.getByTestId('success-toast-toast-2')).toBeInTheDocument();
      expect(screen.getByTestId('success-toast-toast-3')).toBeInTheDocument();
    });

    it('applies correct CSS classes for toast stacking', () => {
      const playlists = [
        createMockPlaylist({ toastId: 'toast-1' }),
        createMockPlaylist({ toastId: 'toast-2' }),
        createMockPlaylist({ toastId: 'toast-3' }),
        createMockPlaylist({ toastId: 'toast-4' }),
      ];
      render(
        <SuccessToast mixedPlaylists={playlists} onDismiss={mockOnDismiss} />
      );

      expect(screen.getByTestId('success-toast-toast-1')).toHaveClass(
        'toast toast-0'
      );
      expect(screen.getByTestId('success-toast-toast-2')).toHaveClass(
        'toast toast-1'
      );
      expect(screen.getByTestId('success-toast-toast-3')).toHaveClass(
        'toast toast-2'
      );
      expect(screen.getByTestId('success-toast-toast-4')).toHaveClass(
        'toast toast-stacked'
      );
    });

    it('applies custom className and testId', () => {
      const playlist = createMockPlaylist();
      render(
        <SuccessToast
          mixedPlaylists={[playlist]}
          onDismiss={mockOnDismiss}
          className="custom-class"
          testId="custom-test-id"
        />
      );

      const container = screen.getByTestId('custom-test-id');
      expect(container).toHaveClass('toastContainer custom-class');
    });
  });

  describe('Track Information Display', () => {
    it('displays track count from tracks.total', () => {
      const playlist = createMockPlaylist({ tracks: { total: 42 } });
      render(
        <SuccessToast mixedPlaylists={[playlist]} onDismiss={mockOnDismiss} />
      );

      expect(screen.getByText(/42 songs/)).toBeInTheDocument();
    });

    it('displays track count from tracks.length when total is not available', () => {
      const playlist = createMockPlaylist({ tracks: { length: 33 } });
      render(
        <SuccessToast mixedPlaylists={[playlist]} onDismiss={mockOnDismiss} />
      );

      expect(screen.getByText(/33 songs/)).toBeInTheDocument();
    });

    it('displays 0 songs when no track information is available', () => {
      const playlist = createMockPlaylist({ tracks: undefined });
      render(
        <SuccessToast mixedPlaylists={[playlist]} onDismiss={mockOnDismiss} />
      );

      expect(screen.getByText(/0 songs/)).toBeInTheDocument();
    });

    it('displays duration when available', () => {
      const playlist = createMockPlaylist({ duration: 125 }); // 2h 5m
      render(
        <SuccessToast mixedPlaylists={[playlist]} onDismiss={mockOnDismiss} />
      );

      expect(screen.getByText(/\(2h 5m\)/)).toBeInTheDocument();
    });

    it('does not display duration when not available', () => {
      const playlist = createMockPlaylist({ duration: undefined });
      render(
        <SuccessToast mixedPlaylists={[playlist]} onDismiss={mockOnDismiss} />
      );

      expect(screen.queryByText(/\(\d+h \d+m\)/)).not.toBeInTheDocument();
    });
  });

  describe('Time Formatting', () => {
    it('displays "just now" for recent playlists', () => {
      const playlist = createMockPlaylist({
        createdAt: new Date('2023-01-01T12:04:30Z'), // 30 seconds ago
      });
      render(
        <SuccessToast mixedPlaylists={[playlist]} onDismiss={mockOnDismiss} />
      );

      expect(screen.getByText('Created just now')).toBeInTheDocument();
    });

    it('displays minutes for playlists created within an hour', () => {
      const playlist = createMockPlaylist({
        createdAt: new Date('2023-01-01T11:35:00Z'), // 30 minutes ago
      });
      render(
        <SuccessToast mixedPlaylists={[playlist]} onDismiss={mockOnDismiss} />
      );

      expect(screen.getByText('Created 30 minutes ago')).toBeInTheDocument();
    });

    it('displays singular minute correctly', () => {
      const playlist = createMockPlaylist({
        createdAt: new Date('2023-01-01T12:04:00Z'), // 1 minute ago
      });
      render(
        <SuccessToast mixedPlaylists={[playlist]} onDismiss={mockOnDismiss} />
      );

      expect(screen.getByText('Created 1 minute ago')).toBeInTheDocument();
    });

    it('displays hours for playlists created within a day', () => {
      const playlist = createMockPlaylist({
        createdAt: new Date('2023-01-01T09:00:00Z'), // 3 hours ago
      });
      render(
        <SuccessToast mixedPlaylists={[playlist]} onDismiss={mockOnDismiss} />
      );

      expect(screen.getByText('Created 3 hours ago')).toBeInTheDocument();
    });

    it('displays singular hour correctly', () => {
      const playlist = createMockPlaylist({
        createdAt: new Date('2023-01-01T11:00:00Z'), // 1 hour ago
      });
      render(
        <SuccessToast mixedPlaylists={[playlist]} onDismiss={mockOnDismiss} />
      );

      expect(screen.getByText('Created 1 hour ago')).toBeInTheDocument();
    });

    it('displays days for older playlists', () => {
      const playlist = createMockPlaylist({
        createdAt: new Date('2022-12-30T12:00:00Z'), // 2 days ago
      });
      render(
        <SuccessToast mixedPlaylists={[playlist]} onDismiss={mockOnDismiss} />
      );

      expect(screen.getByText('Created 2 days ago')).toBeInTheDocument();
    });

    it('displays singular day correctly', () => {
      const playlist = createMockPlaylist({
        createdAt: new Date('2022-12-31T12:00:00Z'), // 1 day ago
      });
      render(
        <SuccessToast mixedPlaylists={[playlist]} onDismiss={mockOnDismiss} />
      );

      expect(screen.getByText('Created 1 day ago')).toBeInTheDocument();
    });
  });

  describe('Spotify Link', () => {
    it('renders Spotify link when external_urls.spotify is available', () => {
      const playlist = createMockPlaylist();
      render(
        <SuccessToast mixedPlaylists={[playlist]} onDismiss={mockOnDismiss} />
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute(
        'href',
        'https://open.spotify.com/playlist/test'
      );
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('does not render Spotify link when external_urls.spotify is not available', () => {
      const playlist = createMockPlaylist({ external_urls: undefined });
      render(
        <SuccessToast mixedPlaylists={[playlist]} onDismiss={mockOnDismiss} />
      );

      expect(screen.queryByRole('link')).not.toBeInTheDocument();
      expect(screen.queryByText('Open in Spotify')).not.toBeInTheDocument();
    });

    it('does not render Spotify link when external_urls.spotify is empty', () => {
      const playlist = createMockPlaylist({ external_urls: { spotify: '' } });
      render(
        <SuccessToast mixedPlaylists={[playlist]} onDismiss={mockOnDismiss} />
      );

      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onDismiss when close button is clicked', () => {
      const playlist = createMockPlaylist();
      render(
        <SuccessToast mixedPlaylists={[playlist]} onDismiss={mockOnDismiss} />
      );

      const closeButton = screen.getByRole('button', {
        name: 'Dismiss notification for Test Mixed Playlist',
      });
      fireEvent.click(closeButton);

      expect(mockOnDismiss).toHaveBeenCalledWith('test-toast-1');
      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });

    it('calls onDismiss with correct toastId for multiple toasts', () => {
      const playlists = [
        createMockPlaylist({ toastId: 'toast-1', name: 'Playlist 1' }),
        createMockPlaylist({ toastId: 'toast-2', name: 'Playlist 2' }),
      ];
      render(
        <SuccessToast mixedPlaylists={playlists} onDismiss={mockOnDismiss} />
      );

      const closeButton2 = screen.getByRole('button', {
        name: 'Dismiss notification for Playlist 2',
      });
      fireEvent.click(closeButton2);

      expect(mockOnDismiss).toHaveBeenCalledWith('toast-2');
      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });

    it('Spotify button has correct accessibility attributes', () => {
      const playlist = createMockPlaylist();
      render(
        <SuccessToast mixedPlaylists={[playlist]} onDismiss={mockOnDismiss} />
      );

      const spotifyButton = screen.getByRole('button', {
        name: 'Open Test Mixed Playlist in Spotify',
      });
      expect(spotifyButton).toHaveAttribute('type', 'button');
      expect(spotifyButton).toHaveAttribute(
        'aria-label',
        'Open Test Mixed Playlist in Spotify'
      );
    });

    it('close button has correct accessibility attributes', () => {
      const playlist = createMockPlaylist();
      render(
        <SuccessToast mixedPlaylists={[playlist]} onDismiss={mockOnDismiss} />
      );

      const closeButton = screen.getByRole('button', {
        name: 'Dismiss notification for Test Mixed Playlist',
      });
      expect(closeButton).toHaveAttribute('type', 'button');
      expect(closeButton).toHaveAttribute(
        'aria-label',
        'Dismiss notification for Test Mixed Playlist'
      );
    });
  });

  describe('Edge Cases', () => {
    it('handles playlist with very long name', () => {
      const longName = 'A'.repeat(200);
      const playlist = createMockPlaylist({ name: longName });
      render(
        <SuccessToast mixedPlaylists={[playlist]} onDismiss={mockOnDismiss} />
      );

      expect(
        screen.getByText(new RegExp(`Your new playlist "${longName}"`))
      ).toBeInTheDocument();
    });

    it('handles playlist with special characters in name', () => {
      const specialName = 'My Playlist! @#$%^&*()_+-=[]{}|;:,.<>?';
      const playlist = createMockPlaylist({ name: specialName });
      render(
        <SuccessToast mixedPlaylists={[playlist]} onDismiss={mockOnDismiss} />
      );

      expect(
        screen.getByText(
          new RegExp(
            `Your new playlist "${specialName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`
          )
        )
      ).toBeInTheDocument();
    });

    it('handles zero duration correctly', () => {
      const playlist = createMockPlaylist({ duration: 0 });
      render(
        <SuccessToast mixedPlaylists={[playlist]} onDismiss={mockOnDismiss} />
      );

      expect(screen.getByText(/\(0h 0m\)/)).toBeInTheDocument();
    });

    it('handles very large track counts', () => {
      const playlist = createMockPlaylist({ tracks: { total: 10000 } });
      render(
        <SuccessToast mixedPlaylists={[playlist]} onDismiss={mockOnDismiss} />
      );

      expect(screen.getByText(/10000 songs/)).toBeInTheDocument();
    });

    it('handles invalid date gracefully', () => {
      const playlist = createMockPlaylist({ createdAt: new Date('invalid') });
      render(
        <SuccessToast mixedPlaylists={[playlist]} onDismiss={mockOnDismiss} />
      );

      // Should not crash and should display fallback time text
      expect(screen.getByText('Created recently')).toBeInTheDocument();
    });
  });
});
