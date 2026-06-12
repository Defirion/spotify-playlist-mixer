import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import AppProviders from '../AppProviders';
import App from '../App';
import {
  mockVisualViewport,
  restoreVisualViewport,
} from '../test-utils/mockVisualViewport';

// Integration test template: simplified app rendering test
describe('App integration (happy path) - template', () => {
  beforeAll(() => {
    mockVisualViewport();
  });

  afterAll(() => {
    restoreVisualViewport();
  });

  test('app renders correctly when authenticated', async () => {
    // Seed the auth store before mount so the app renders authenticated.
    // (The real flow exchanges an authorization code via PKCE; that exchange
    // is covered by the App auth callback tests.)
    const token = 'test_access_token_123';
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useAppStore } = require('../store');
    useAppStore.getState().setAccessToken(token);

    render(
      <AppProviders>
        <App />
      </AppProviders>
    );

    // Wait for app to consider itself authenticated
    await waitFor(() => {
      expect(screen.queryByText(/Connect to Spotify/i)).toBeFalsy();
    });

    // Verify main components are rendered
    expect(screen.getByText(/Spotify Playlist Mixer/i)).toBeInTheDocument();
    expect(screen.getByText(/Add Playlists to Mix/i)).toBeInTheDocument();

    // Verify search input is present
    const searchInput = screen.getByPlaceholderText(/paste Spotify URL|Try:/i);
    expect(searchInput).toBeInTheDocument();

    // Test passes if app renders without errors
  });
});
