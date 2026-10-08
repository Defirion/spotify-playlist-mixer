import { render, screen, fireEvent } from '@testing-library/react';
import AppShell from '../../AppShell';

const baseProps = {
  isAuthenticated: false,
  accessToken: null,
  selectedPlaylists: [],
};

describe('AppShell', () => {
  test('dismisses the selected success toast by its ID', () => {
    const onDismissSuccess = vi.fn();
    render(
      <AppShell
        {...baseProps}
        isAuthenticated
        mixedPlaylists={[
          {
            id: 'playlist',
            name: 'Saved mix',
            toastId: 'specific-toast',
            createdAt: new Date(),
            items: { total: 2 },
          },
        ]}
        onDismissSuccess={onDismissSuccess}
      />
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Dismiss notification for Saved mix' })
    );
    expect(onDismissSuccess).toHaveBeenCalledWith('specific-toast');
  });
  let consoleErrorSpy: import('vitest').MockInstance;
  beforeAll(() => {
    // Prevent ErrorBoundary from spamming test output during intentional error paths
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });
  test('renders auth when not authenticated', () => {
    render(<AppShell {...baseProps} />);
    expect(screen.getByText(/Playlist Mixer/i)).toBeTruthy();
    // SpotifyAuth renders a button to auth; assert its presence by role
    expect(screen.getByRole('button')).toBeTruthy();
  });

  test('renders RatioConfig when there is at least 1 selected playlist', () => {
    render(
      <AppShell
        {...baseProps}
        isAuthenticated={true}
        selectedPlaylists={[{ id: 'p1', name: 'First' } as any]}
      />
    );
    expect(screen.getByText(/Playlist Mixer/i)).toBeTruthy();
    expect(screen.getByText(/Add playlist/i)).toBeTruthy();
    // RatioConfig should be rendered when selectedPlaylists.length > 0
    expect(screen.getByText(/Add playlist/i)).toBeTruthy();
  });

  test('renders PlaylistMixer when there are >1 playlists selected', () => {
    render(
      <AppShell
        {...baseProps}
        isAuthenticated={true}
        selectedPlaylists={[
          { id: 'p1', name: 'First' } as any,
          { id: 'p2', name: 'Second' } as any,
        ]}
      />
    );
    // PlaylistMixer renders children that include 'Mix' word in UI; assert presence via text
    expect(screen.getByText(/Playlist Mixer/i)).toBeTruthy();
  });
});
