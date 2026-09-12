import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';
import AppProviders from '../AppProviders';
import * as spotifyAuth from '../services/spotifyAuth';
import { useAppStore } from '../store';
import {
  mockVisualViewport,
  restoreVisualViewport,
} from '../test-utils/mockVisualViewport';

// Integration tests for App against the REAL zustand store; only the auth
// service is mocked so no network token exchange happens. The mocked-store
// unit tests live in App.test.tsx.

vi.mock('../services/spotifyAuth', async () => ({
  ...(await vi.importActual('../services/spotifyAuth')),
  completeAuthorization: vi.fn(),
  refreshAccessToken: vi.fn(),
}));

describe('App integration (real store)', () => {
  beforeAll(() => {
    mockVisualViewport();
  });

  afterAll(() => {
    restoreVisualViewport();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.getState().clearAuth();
    window.history.replaceState({}, '', '/');
  });

  it('renders the footer route links', () => {
    render(
      <AppProviders>
        <App />
      </AppProviders>
    );

    expect(screen.getByText(/Privacy Policy/i)).toBeInTheDocument();
    expect(screen.getByText(/Terms of Service/i)).toBeInTheDocument();
    expect(screen.getByText(/Back to Mixer/i)).toBeInTheDocument();
  });

  it('removes one-time auth params from the URL when Spotify redirects back with an error', () => {
    window.history.replaceState({}, '', '/?error=access_denied&state=abc');

    render(
      <AppProviders>
        <App />
      </AppProviders>
    );

    expect(window.location.search).toBe('');
  });

  it('exchanges ?code= from the redirect and sets auth state', async () => {
    vi.stubEnv('REACT_APP_SPOTIFY_CLIENT_ID', 'test-client-id');
    (
      spotifyAuth.completeAuthorization as import('vitest').Mock
    ).mockResolvedValue({
      accessToken: 'unit_test_token_abc123',
      refreshToken: null,
      expiresAt: Date.now() + 3600_000,
      grantedScopes: ['playlist-read-private', 'user-read-private'],
    });
    window.history.replaceState({}, '', '/?code=unit_code&state=unit_state');

    render(
      <AppProviders>
        <App />
      </AppProviders>
    );

    // MainApp cleans the query string after processing the one-time code
    await waitFor(() => {
      expect(window.location.search).toBe('');
    });
    expect(spotifyAuth.completeAuthorization).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'unit_code', state: 'unit_state' })
    );
    await waitFor(() => {
      expect(useAppStore.getState().accessToken).toBe('unit_test_token_abc123');
    });

    vi.unstubAllEnvs();
  });

  it('renders the main mixer UI when authenticated', async () => {
    // Seed the auth store before mount so the app renders authenticated.
    // (The real PKCE exchange is covered by the test above.)
    useAppStore.getState().setAccessToken('test_access_token_123');

    render(
      <AppProviders>
        <App />
      </AppProviders>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Connect to Spotify/i)).toBeFalsy();
    });

    expect(screen.getByText(/Spotify Playlist Mixer/i)).toBeInTheDocument();
    expect(screen.getByText(/Add Playlists to Mix/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/paste Spotify URL|Try:/i)
    ).toBeInTheDocument();
  });
});
