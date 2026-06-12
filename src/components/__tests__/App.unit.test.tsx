import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../../App';
import AppProviders from '../../AppProviders';
import * as spotifyAuth from '../../services/spotifyAuth';

// Mock the auth service so no real token exchange happens
vi.mock('../../services/spotifyAuth', async () => ({
  ...(await vi.importActual('../../services/spotifyAuth')),
  completeAuthorization: vi.fn(),
  refreshAccessToken: vi.fn(),
}));

describe('App (unit) - routes and auth handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure no leftover auth params between tests
    window.history.replaceState({}, '', '/');
  });

  it('exchanges ?code= from the redirect and sets auth state', async () => {
    process.env.REACT_APP_SPOTIFY_CLIENT_ID = 'test-client-id';
    (
      spotifyAuth.completeAuthorization as import('vitest').Mock
    ).mockResolvedValue({
      accessToken: 'unit_test_token_abc123',
      refreshToken: null,
      expiresAt: Date.now() + 3600_000,
    });

    // set query params as after Spotify redirect
    window.history.replaceState({}, '', '/?code=unit_code&state=unit_state');

    render(
      <AppProviders>
        <App />
      </AppProviders>
    );

    // The MainApp should clean the query string after processing
    await waitFor(() => {
      expect(window.location.search).toBe('');
    });
    expect(spotifyAuth.completeAuthorization).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'unit_code', state: 'unit_state' })
    );

    // The app header should render
    expect(screen.getByText(/Spotify Playlist Mixer/i)).toBeInTheDocument();
  });

  it('renders privacy and terms routes via footer links', async () => {
    render(
      <AppProviders>
        <App />
      </AppProviders>
    );

    // Footer contains links - ensure they exist in the document
    expect(screen.getByText(/Privacy Policy/i)).toBeInTheDocument();
    expect(screen.getByText(/Terms of Service/i)).toBeInTheDocument();
    expect(screen.getByText(/Back to Mixer/i)).toBeInTheDocument();
  });
});
