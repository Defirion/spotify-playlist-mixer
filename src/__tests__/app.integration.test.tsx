import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppProviders from '../AppProviders';
import App from '../App';
import { setupMSW } from '../test-utils/mocks/mswSetup';
import {
  mockVisualViewport,
  restoreVisualViewport,
} from '../test-utils/mockVisualViewport';

// Integration test template: happy-path skeleton
describe('App integration (happy path) - template', () => {
  beforeAll(() => {
    setupMSW();
    mockVisualViewport();
  });

  afterAll(() => {
    restoreVisualViewport();
  });

  test('full happy-path: auth -> select playlists -> generate preview -> create playlist', async () => {
    // Set auth hash before mount so MainApp picks up token on initial render
    const token = 'test_access_token_123';
    window.location.hash = `#access_token=${token}&token_type=Bearer`;

    const user = userEvent.setup();

    render(
      <AppProviders>
        <App />
      </AppProviders>
    );

    // Wait for app to consider itself authenticated (SpotifyAuth link removed)
    await waitFor(() => {
      expect(screen.queryByText(/Connect to Spotify/i)).toBeFalsy();
    });

    // Search for playlists using the input's placeholder (label isn't programmatically associated)
    const searchInput = screen.getByPlaceholderText(/paste Spotify URL|Try:/i);
    await user.type(searchInput, 'Chill');

    // Wait for both playlist search results to render (MSW search handler returns two playlists)
    const chill = await screen.findByText(/Chill Vibes/i);
    const awesome = await screen.findByText(/My Awesome Playlist/i);
    expect(chill).toBeInTheDocument();
    expect(awesome).toBeInTheDocument();

    // Select first playlist
    await user.click(chill);

    // After selecting one, search again to add the second playlist
    await user.clear(searchInput);
    await user.type(searchInput, 'My Awesome');
    const awesomeResult = await screen.findByText(/My Awesome Playlist/i);
    await user.click(awesomeResult);

    // Wait for PlaylistMixer header to appear
    await screen.findByText(/Create Your Mix/i);

    // Wait for PlaylistMixer to render with Generate Preview button
    const generateBtn = await screen.findByRole('button', {
      name: /generate preview|regenerate/i,
    });
    expect(generateBtn).toBeInTheDocument();

    // Click generate preview
    await user.click(generateBtn);

    // Wait for preview to appear (MixPreview header is rendered when preview exists)
    await screen.findByText(/🎵 Mix Preview/i);

    // Click create playlist
    const createBtn = screen.getByRole('button', {
      name: /create this playlist/i,
    });
    await user.click(createBtn);

    // Expect a success flow: the SuccessToast heading appears
    await screen.findByText(/🎉 Mixed Playlist Created!/i);
    // Also assert the created playlist name appears in the SuccessToast
    const createdPlaylistName = await screen.findByText(/My Mixed Playlist/i);
    expect(createdPlaylistName).toBeInTheDocument();
  });
});
