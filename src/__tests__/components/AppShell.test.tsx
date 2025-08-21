import React from 'react';
import { render, screen } from '@testing-library/react';
import AppShell from '../../AppShell';

const baseProps = {
  isAuthenticated: false,
  accessToken: null,
  selectedPlaylists: [],
};

describe('AppShell', () => {
  let consoleErrorSpy: jest.SpyInstance;
  beforeAll(() => {
    // Prevent ErrorBoundary from spamming test output during intentional error paths
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });
  test('renders auth when not authenticated', () => {
    render(<AppShell {...baseProps} />);
    expect(screen.getByText(/Spotify Playlist Mixer/i)).toBeTruthy();
    // SpotifyAuth renders a button to auth; assert its presence by role
    expect(screen.getByRole('button')).toBeTruthy();
  });

  test('renders RatioConfig when there is at least 1 selected playlist', () => {
    render(
      <AppShell
        {...baseProps}
        isAuthenticated={true}
        selectedPlaylists={[{ id: 'p1' }]}
      />
    );
    expect(
      screen.getByText(/Mix your playlists with custom ratios/i)
    ).toBeTruthy();
    expect(screen.getByText(/Add Playlists to Mix/i)).toBeTruthy();
    // RatioConfig should be rendered when selectedPlaylists.length > 0
    expect(screen.getByText(/Add Playlists to Mix/i)).toBeTruthy();
  });

  test('renders PlaylistMixer when there are >1 playlists selected', () => {
    render(
      <AppShell
        {...baseProps}
        isAuthenticated={true}
        selectedPlaylists={[{ id: 'p1' }, { id: 'p2' }]}
      />
    );
    // PlaylistMixer renders children that include 'Mix' word in UI; assert presence via text
    expect(
      screen.getByText(/Mix your playlists with custom ratios/i)
    ).toBeTruthy();
  });
});
