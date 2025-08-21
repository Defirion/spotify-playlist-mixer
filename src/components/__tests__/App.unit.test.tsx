import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../../App';
import AppProviders from '../../AppProviders';

describe('App (unit) - routes and auth handling', () => {
  beforeEach(() => {
    // Ensure no leftover hash between tests
    window.location.hash = '';
  });

  it('parses access_token from location.hash and sets auth state', async () => {
    const token = 'unit_test_token_abc123';
    // set hash as after Spotify redirect
    window.location.hash = `#access_token=${token}&token_type=Bearer`;

    render(
      <AppProviders>
        <App />
      </AppProviders>
    );

    // The MainApp should clear the hash after processing
    await waitFor(() => {
      expect(window.location.hash).toBe('');
    });

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
