// React import removed - using automatic JSX runtime
import { render, screen } from '@testing-library/react';
import TrackList from '../TrackList';
import { mockTracks } from '../../../mocks/fixtures';

describe('TrackList', () => {
  it('renders the list of tracks', () => {
    render((<TrackList tracks={mockTracks} />) as any);

    expect(screen.getByTestId('track-list')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0);
  });
});
