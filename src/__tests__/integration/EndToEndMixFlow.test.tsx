/// <reference types="@testing-library/jest-dom" />
import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../../App';
import AppProviders from '../../AppProviders';

describe('End-to-end mixing flow (integration)', () => {
  it('renders the app without errors when authenticated', async () => {
    // Ensure app is authenticated so PlaylistSelector is shown.
    // Use the store API to set an access token before mounting the App.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const store = await import('../../store');
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

    // Verify main playlist selection component is present
    expect(screen.getByText(/Add Playlists to Mix/i)).toBeInTheDocument();

    // Test passes if the app renders the main interface without errors
  });
});
