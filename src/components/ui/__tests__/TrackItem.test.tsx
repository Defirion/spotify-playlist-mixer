// React import removed - using automatic JSX runtime
import { render, screen } from '@testing-library/react';
import TrackItem from '../TrackItem';
import { mockTracks } from '../../../mocks/fixtures';

// Mock the utility functions
vi.mock('../../../utils/trackUtils', () => ({
  formatDuration: vi.fn(
    (ms: number) =>
      `${Math.floor(ms / 60000)}:${Math.floor((ms % 60000) / 1000)
        .toString()
        .padStart(2, '0')}`
  ),
  getTrackQuadrant: vi.fn(() => 'high-energy-high-valence'),
  getPopularityStyle: vi.fn((_quadrant: any, popularity: any) => {
    if (popularity !== undefined) {
      return {
        background: '#4CAF50',
        color: '#fff',
        text: 'Popular',
      };
    }
    return null;
  }),
}));

describe('TrackItem', () => {
  const defaultProps = {
    track: mockTracks[0],
    onSelect: vi.fn(),
    onRemove: vi.fn(),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders track item with basic information', () => {
      render(<TrackItem {...defaultProps} />);

      expect(
        screen.getByTestId(`track-item-${mockTracks[0].id}`)
      ).toBeInTheDocument();
      expect(screen.getByText(mockTracks[0].name)).toBeInTheDocument();
      expect(
        screen.getByText(mockTracks[0].artists[0].name)
      ).toBeInTheDocument();
    });

    it('renders album art when showAlbumArt is true', () => {
      render(<TrackItem {...defaultProps} showAlbumArt={true} />);

      const albumImage = screen.getByRole('img');
      expect(albumImage).toBeInTheDocument();
      expect(albumImage).toHaveAttribute(
        'alt',
        `${mockTracks[0].album.name} album cover`
      );
    });

    it('does not render album art when showAlbumArt is false', () => {
      render(<TrackItem {...defaultProps} showAlbumArt={false} />);

      const albumImage = screen.queryByRole('img');
      expect(albumImage).not.toBeInTheDocument();
    });

    it('applies selected class when selected is true', () => {
      render(<TrackItem {...defaultProps} selected={true} />);

      const trackItem = screen.getByTestId(`track-item-${mockTracks[0].id}`);
      expect(trackItem).toHaveClass('selected');
    });

    it('applies custom className', () => {
      render(<TrackItem {...defaultProps} className="custom-track" />);

      const trackItem = screen.getByTestId(`track-item-${mockTracks[0].id}`);
      expect(trackItem).toHaveClass('custom-track');
    });

    it('applies custom styles', () => {
      const customStyle = { backgroundColor: 'red' } as any;
      render(<TrackItem {...defaultProps} style={customStyle} />);

      const trackItem = screen.getByTestId(`track-item-${mockTracks[0].id}`);
      expect(trackItem).toHaveStyle('background-color: rgb(255, 0, 0)');
    });
  });

  // ...rest of tests omitted for brevity (same as original)
});
