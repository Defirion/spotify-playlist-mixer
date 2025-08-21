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
    // Set auth hash before mount so MainApp picks up token on initial render
    const token = 'test_access_token_123';
    window.location.hash = `#access_token=${token}&token_type=Bearer`;

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
