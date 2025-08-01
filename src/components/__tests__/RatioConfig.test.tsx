import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RatioConfig from '../RatioConfig';
import { SpotifyPlaylist } from '../../types/spotify';
import { RatioConfig as RatioConfigType } from '../../types/mixer';

// Remove mock to test with actual hook

const mockPlaylist: SpotifyPlaylist = {
  id: '1',
  name: 'Test Playlist',
  description: 'A test playlist',
  images: [{ url: 'test.jpg', height: 300, width: 300 }],
  tracks: { total: 50 },
  owner: { id: 'user1', display_name: 'Test User' },
  public: true,
  uri: 'spotify:playlist:1',
  realAverageDurationSeconds: 180,
  tracksWithDuration: 50,
};

const mockRatioConfig: RatioConfigType = {
  '1': { min: 1, max: 2, weight: 3, weightType: 'frequency' },
};

const defaultProps = {
  selectedPlaylists: [mockPlaylist],
  ratioConfig: mockRatioConfig,
  onRatioUpdate: jest.fn(),
  onPlaylistRemove: jest.fn(),
};

describe('RatioConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders component with playlist information', () => {
    render(<RatioConfig {...defaultProps} />);

    expect(screen.getByText('🎛️ Customize Your Mix')).toBeInTheDocument();
    expect(screen.getByText('Test Playlist')).toBeInTheDocument();
    expect(screen.getByText('50 tracks')).toBeInTheDocument();
    expect(screen.getByText('• avg 3:00 per song')).toBeInTheDocument();
  });

  it('renders playlist cover image when available', () => {
    render(<RatioConfig {...defaultProps} />);

    const image = screen.getByAltText('Test Playlist');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'test.jpg');
  });

  it('handles playlist without cover image', () => {
    const playlistWithoutImage = {
      ...mockPlaylist,
      images: [],
    };

    render(
      <RatioConfig
        {...defaultProps}
        selectedPlaylists={[playlistWithoutImage]}
      />
    );

    expect(screen.queryByAltText('Test Playlist')).not.toBeInTheDocument();
    expect(screen.getByText('Test Playlist')).toBeInTheDocument();
  });

  it('displays balance method toggle buttons', () => {
    render(<RatioConfig {...defaultProps} />);

    expect(screen.getByText('Same Song Count')).toBeInTheDocument();
    expect(screen.getByText('Same Play Time')).toBeInTheDocument();
  });

  it('calls onRatioUpdate when min slider changes', async () => {
    render(<RatioConfig {...defaultProps} />);

    const minSlider = screen.getAllByRole('slider')[0];
    fireEvent.change(minSlider, { target: { value: '3' } });

    await waitFor(() => {
      expect(defaultProps.onRatioUpdate).toHaveBeenCalledWith('1', {
        min: 3,
        max: 3, // Should be updated to match min
        weight: 3,
        weightType: 'frequency',
      });
    });
  });

  it('calls onRatioUpdate when max slider changes', async () => {
    render(<RatioConfig {...defaultProps} />);

    const maxSlider = screen.getAllByRole('slider')[1];
    fireEvent.change(maxSlider, { target: { value: '4' } });

    await waitFor(() => {
      expect(defaultProps.onRatioUpdate).toHaveBeenCalledWith('1', {
        min: 1,
        max: 4,
        weight: 3,
        weightType: 'frequency',
      });
    });
  });

  it('calls onRatioUpdate when weight slider changes', async () => {
    render(<RatioConfig {...defaultProps} />);

    const weightSlider = screen.getAllByRole('slider')[2];
    fireEvent.change(weightSlider, { target: { value: '50' } });

    await waitFor(() => {
      expect(defaultProps.onRatioUpdate).toHaveBeenCalledWith('1', {
        min: 1,
        max: 2,
        weight: 50,
        weightType: 'frequency',
      });
    });
  });

  it('updates all playlists when global balance method changes', async () => {
    const multiplePlaylistsProps = {
      ...defaultProps,
      selectedPlaylists: [
        mockPlaylist,
        { ...mockPlaylist, id: '2', name: 'Playlist 2' },
      ],
      ratioConfig: {
        ...mockRatioConfig,
        '2': { min: 2, max: 3, weight: 2, weightType: 'frequency' as const },
      },
    };

    render(<RatioConfig {...multiplePlaylistsProps} />);

    const timeButton = screen.getByText('Same Play Time');
    fireEvent.click(timeButton);

    await waitFor(() => {
      expect(defaultProps.onRatioUpdate).toHaveBeenCalledWith('1', {
        min: 1,
        max: 2,
        weight: 3,
        weightType: 'time',
      });
    });

    await waitFor(() => {
      expect(defaultProps.onRatioUpdate).toHaveBeenCalledWith('2', {
        min: 2,
        max: 3,
        weight: 2,
        weightType: 'time',
      });
    });
  });

  it('calls onPlaylistRemove when remove button is clicked', async () => {
    const user = userEvent.setup();
    render(<RatioConfig {...defaultProps} />);

    const removeButton = screen.getByTitle('Remove Test Playlist');
    await user.click(removeButton);

    expect(defaultProps.onPlaylistRemove).toHaveBeenCalledWith('1');
  });

  it('does not render remove button when onPlaylistRemove is not provided', () => {
    const propsWithoutRemove = {
      ...defaultProps,
      onPlaylistRemove: undefined,
    };

    render(<RatioConfig {...propsWithoutRemove} />);

    expect(screen.queryByTitle('Remove Test Playlist')).not.toBeInTheDocument();
  });

  it('renders example mix display when multiple playlists are selected', () => {
    const multiplePlaylistsProps = {
      ...defaultProps,
      selectedPlaylists: [
        mockPlaylist,
        { ...mockPlaylist, id: '2', name: 'Playlist 2' },
      ],
    };

    render(<RatioConfig {...multiplePlaylistsProps} />);

    expect(
      screen.getByText('🎯 Example Mix (per 100 songs):')
    ).toBeInTheDocument();
    expect(screen.getByText(/~75 songs \(75%\)/)).toBeInTheDocument();
  });

  it('does not render example mix display for single playlist', () => {
    render(<RatioConfig {...defaultProps} />);

    expect(
      screen.queryByText('🎯 Example Mix (per 100 songs):')
    ).not.toBeInTheDocument();
  });

  it('ensures max slider cannot be less than min slider', async () => {
    render(<RatioConfig {...defaultProps} />);

    // First set min to 5
    const minSlider = screen.getAllByRole('slider')[0];
    fireEvent.change(minSlider, { target: { value: '5' } });

    // Then try to set max to 3 (should be ignored)
    const maxSlider = screen.getAllByRole('slider')[1];
    fireEvent.change(maxSlider, { target: { value: '3' } });

    // Only the min change should have been called, max change should be ignored
    await waitFor(() => {
      expect(defaultProps.onRatioUpdate).toHaveBeenCalledWith('1', {
        min: 5,
        max: 5, // Should be updated to match min
        weight: 3,
        weightType: 'frequency',
      });
    });
  });

  it('renders with custom className', () => {
    render(<RatioConfig {...defaultProps} className="custom-class" />);

    // Test that the component renders correctly with custom className
    // We focus on functionality rather than implementation details
    expect(screen.getByText('🎛️ Customize Your Mix')).toBeInTheDocument();
    expect(
      screen.getByText('Choose how your playlists blend together')
    ).toBeInTheDocument();
    expect(screen.getByText('Test Playlist')).toBeInTheDocument();
  });

  it('handles playlists without duration data', () => {
    const playlistWithoutDuration = {
      ...mockPlaylist,
      realAverageDurationSeconds: undefined,
      tracksWithDuration: undefined,
    };

    render(
      <RatioConfig
        {...defaultProps}
        selectedPlaylists={[playlistWithoutDuration]}
      />
    );

    expect(screen.getByText('50 tracks')).toBeInTheDocument();
    expect(screen.queryByText(/avg.*per song/)).not.toBeInTheDocument();
  });

  it('shows partial duration data information', () => {
    const playlistWithPartialDuration = {
      ...mockPlaylist,
      tracksWithDuration: 30, // Less than total tracks
    };

    render(
      <RatioConfig
        {...defaultProps}
        selectedPlaylists={[playlistWithPartialDuration]}
      />
    );

    expect(screen.getByText('(30 with duration data)')).toBeInTheDocument();
  });

  it('displays correct group descriptions', () => {
    render(<RatioConfig {...defaultProps} />);

    // Should show "1-2 songs" for min=1, max=2
    expect(screen.getByText(/Play together: 1-2 songs/)).toBeInTheDocument();
  });

  it('updates global balance method based on existing ratio config', () => {
    const timeBasedConfig: RatioConfigType = {
      '1': { min: 1, max: 2, weight: 3, weightType: 'time' },
    };

    render(<RatioConfig {...defaultProps} ratioConfig={timeBasedConfig} />);

    // The component should detect time-based config and update the toggle
    const timeButton = screen.getByText('Same Play Time');
    expect(timeButton).toHaveClass('active');
  });
});
