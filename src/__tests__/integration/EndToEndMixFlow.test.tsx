/// <reference types="@testing-library/jest-dom" />
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';
import AppProviders from '../../AppProviders';
import { setupMSW } from '../../test-utils/mocks/mswSetup';

// Use fixtures for deterministic selections
import { mockPlaylists } from '../../mocks/fixtures';

// Start MSW server for this suite
setupMSW();

describe('End-to-end mixing flow (integration with MSW)', () => {
  it('selects two playlists, generates a preview, and creates a playlist', async () => {
    const user = userEvent.setup();

    // Ensure app is authenticated so PlaylistSelector is shown.
    // Use the store API to set an access token before mounting the App.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const store = require('../../store');
    if (store && store.useAppStore && store.useAppStore.getState) {
      store.useAppStore.getState().setAccessToken('mock_access_token');
    }

    render(
      <AppProviders>
        <App />
      </AppProviders>
    );

    // Ensure app shell rendered
    expect(screen.getByText(/Spotify Playlist Mixer/i)).toBeInTheDocument();

    // Open the "Add Playlists to Mix" input by locating its label
    const input = screen.getByPlaceholderText(
      /Try: 'salsa romantica', 'bachata sensual' or paste Spotify URL.../i
    );
    // Type a search term that will match fixtures
    await user.type(input, 'My Awesome');

    // Wait for search results (use text from mockPlaylists)
    const playlistItem = await screen.findByText(
      new RegExp(mockPlaylists[0].name, 'i')
    );
    expect(playlistItem).toBeInTheDocument();

    // Click the first search result to add the playlist
    await user.click(playlistItem);

    // Add a second playlist via search
    await user.clear(input);
    await user.type(input, 'Chill Vibes');
    const secondItem = await screen.findByText(
      new RegExp(mockPlaylists[1].name, 'i')
    );
    await user.click(secondItem);

    // Now switch to the Mixer section and click Generate Preview
    const generateBtn = await screen.findByRole('button', {
      name: /generate preview/i,
    });
    expect(generateBtn).toBeInTheDocument();
    await user.click(generateBtn);

    // Wait for preview tracks to render (preview uses mockTracks via MSW)
    const previewTracks = await screen.findAllByText(
      /Test Song 1|Another Great Song/i
    );
    expect(previewTracks.length).toBeGreaterThan(0);

    // Click Create Playlist
    const createBtn = screen.getByRole('button', {
      name: /create this playlist/i,
    });
    await user.click(createBtn);

    // Wait for success: created playlist should be added to Mixed Playlists list (AppShell shows mixedPlaylists)
    // Wait for success toast title which is deterministic
    const toastTitle = await screen.findByText(/Mixed Playlist Created!/i);
    expect(toastTitle).toBeInTheDocument();
  }, 20000);
});
