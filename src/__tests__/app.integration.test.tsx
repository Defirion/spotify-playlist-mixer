import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../App';
import AppProviders from '../AppProviders';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import {
  mockVisualViewport,
  restoreVisualViewport,
} from '../test-utils/mockVisualViewport';

// Minimal MSW handlers for the happy path; replace with project fixtures when available
const server = setupServer(
  rest.get('https://api.spotify.com/v1/me', (req, res, ctx) => {
    return res(ctx.json({ id: 'test-user', display_name: 'Test User' }));
  })
);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
  mockVisualViewport();
});
afterAll(() => {
  server.close();
  restoreVisualViewport();
});

test('mounts App and shows auth when unauthenticated', async () => {
  render(
    <AppProviders>
      <App />
    </AppProviders>
  );

  expect(screen.getByText(/Spotify Playlist Mixer/i)).toBeInTheDocument();
  // Auth button should be visible
  expect(screen.getByText(/Connect to Spotify/i)).toBeInTheDocument();
});
