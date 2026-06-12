import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../App';
// MemoryRouter not needed here

describe('App root component logic', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });

  test('renders footer links and routes', () => {
    render(<App />);

    expect(screen.getByText(/Privacy Policy/i)).toBeInTheDocument();
    expect(screen.getByText(/Terms of Service/i)).toBeInTheDocument();
    expect(screen.getByText(/Back to Mixer/i)).toBeInTheDocument();
  });

  test('removes one-time auth params from the URL when not authenticated', () => {
    // Simulate redirect query params from Spotify's authorization code flow
    window.history.replaceState({}, '', '/?error=access_denied&state=abc');

    render(<App />);

    // Effect should clean the query string after processing
    expect(window.location.search).toBe('');
  });
});
