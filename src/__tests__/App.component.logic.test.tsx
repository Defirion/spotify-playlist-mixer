import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../App';
// MemoryRouter not needed here

describe('App root component logic', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  test('renders footer links and routes', () => {
    render(<App />);

    expect(screen.getByText(/Privacy Policy/i)).toBeInTheDocument();
    expect(screen.getByText(/Terms of Service/i)).toBeInTheDocument();
    expect(screen.getByText(/Back to Mixer/i)).toBeInTheDocument();
  });

  test('parses access_token from hash and clears hash when not authenticated', () => {
    // Simulate redirect hash containing token
    window.location.hash = '#access_token=TEST_TOKEN_123&token_type=bearer';

    render(<App />);

    // Effect should clear the hash after processing
    expect(window.location.hash).toBe('');
  });
});
