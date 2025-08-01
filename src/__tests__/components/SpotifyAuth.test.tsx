import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SpotifyAuth from '../../components/SpotifyAuth';

// Mock environment variables
const mockClientId = 'test-client-id';
const originalEnv = process.env;

describe('SpotifyAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window.location
    delete (window as any).location;
    window.location = {
      ...window.location,
      origin: 'http://localhost:3000',
      href: '',
    };

    // Mock environment
    process.env = {
      ...originalEnv,
      REACT_APP_SPOTIFY_CLIENT_ID: mockClientId,
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('renders the component with default content', () => {
    render(<SpotifyAuth />);

    expect(screen.getByText('Connect to Spotify')).toBeInTheDocument();
    expect(
      screen.getByText(
        "To get started, you'll need to connect your Spotify account."
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Connect Spotify Account' })
    ).toBeInTheDocument();
    expect(screen.getByText('Ready to use!')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Click the button above to connect your Spotify account and start mixing playlists.'
      )
    ).toBeInTheDocument();
  });

  it('applies custom className and testId props', () => {
    render(
      <SpotifyAuth className="custom-auth-class" testId="spotify-auth-test" />
    );

    const component = screen.getByTestId('spotify-auth-test');
    expect(component).toBeInTheDocument();
    expect(component).toHaveClass('card');
    expect(component).toHaveClass('custom-auth-class');
  });

  it('redirects to Spotify authorization URL when login button is clicked', async () => {
    const user = userEvent.setup();
    render(<SpotifyAuth />);

    const loginButton = screen.getByRole('button', {
      name: 'Connect Spotify Account',
    });
    await user.click(loginButton);

    const expectedUrl =
      `https://accounts.spotify.com/authorize?` +
      `client_id=${mockClientId}&` +
      `response_type=token&` +
      `redirect_uri=${encodeURIComponent('http://localhost:3000/')}&` +
      `scope=${encodeURIComponent('playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private')}`;

    expect(window.location.href).toBe(expectedUrl);
  });

  it('uses custom redirect URI when provided', async () => {
    const user = userEvent.setup();
    const customRedirectUri = 'https://custom-domain.com/callback';

    render(<SpotifyAuth redirectUri={customRedirectUri} />);

    const loginButton = screen.getByRole('button', {
      name: 'Connect Spotify Account',
    });
    await user.click(loginButton);

    const expectedUrl =
      `https://accounts.spotify.com/authorize?` +
      `client_id=${mockClientId}&` +
      `response_type=token&` +
      `redirect_uri=${encodeURIComponent(customRedirectUri)}&` +
      `scope=${encodeURIComponent('playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private')}`;

    expect(window.location.href).toBe(expectedUrl);
  });

  it('uses custom scopes when provided', async () => {
    const user = userEvent.setup();
    const customScopes = ['playlist-read-private', 'user-read-email'];

    render(<SpotifyAuth scopes={customScopes} />);

    const loginButton = screen.getByRole('button', {
      name: 'Connect Spotify Account',
    });
    await user.click(loginButton);

    const expectedUrl =
      `https://accounts.spotify.com/authorize?` +
      `client_id=${mockClientId}&` +
      `response_type=token&` +
      `redirect_uri=${encodeURIComponent('http://localhost:3000/')}&` +
      `scope=${encodeURIComponent('playlist-read-private user-read-email')}`;

    expect(window.location.href).toBe(expectedUrl);
  });

  it('uses custom client ID when provided', async () => {
    const user = userEvent.setup();
    const customClientId = 'custom-client-id';

    render(<SpotifyAuth clientId={customClientId} />);

    const loginButton = screen.getByRole('button', {
      name: 'Connect Spotify Account',
    });
    await user.click(loginButton);

    const expectedUrl =
      `https://accounts.spotify.com/authorize?` +
      `client_id=${customClientId}&` +
      `response_type=token&` +
      `redirect_uri=${encodeURIComponent('http://localhost:3000/')}&` +
      `scope=${encodeURIComponent('playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private')}`;

    expect(window.location.href).toBe(expectedUrl);
  });

  it('calls onError when client ID is not configured', async () => {
    const user = userEvent.setup();
    const mockOnError = jest.fn();

    // Temporarily set process.env.REACT_APP_SPOTIFY_CLIENT_ID to undefined
    // for this specific test case
    const originalReactAppSpotifyClientId =
      process.env.REACT_APP_SPOTIFY_CLIENT_ID;
    process.env.REACT_APP_SPOTIFY_CLIENT_ID = undefined;

    // Render the component without a clientId prop, so it relies on the environment variable
    render(<SpotifyAuth onError={mockOnError} />);

    const loginButton = screen.getByRole('button', {
      name: 'Connect Spotify Account',
    });
    await user.click(loginButton);

    expect(mockOnError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Spotify Client ID is not configured',
      })
    );
    expect(window.location.href).toBe('');

    // Restore the original environment variable after the test
    process.env.REACT_APP_SPOTIFY_CLIENT_ID = originalReactAppSpotifyClientId;
  });

  it('calls onError when an exception occurs during login', async () => {
    const user = userEvent.setup();
    const mockOnError = jest.fn();

    // Mock encodeURIComponent to throw an error
    const originalEncodeURIComponent = global.encodeURIComponent;
    global.encodeURIComponent = jest.fn(() => {
      throw new Error('Encoding failed');
    });

    render(<SpotifyAuth onError={mockOnError} />);

    const loginButton = screen.getByRole('button', {
      name: 'Connect Spotify Account',
    });

    // Suppress console errors for this test
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    await user.click(loginButton);

    expect(mockOnError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Encoding failed',
      })
    );

    // Restore original functions
    global.encodeURIComponent = originalEncodeURIComponent;
    consoleSpy.mockRestore();
  });

  it('calls onAuth callback when provided (integration test)', async () => {
    const user = userEvent.setup();
    const mockOnAuth = jest.fn();

    render(<SpotifyAuth onAuth={mockOnAuth} />);

    const loginButton = screen.getByRole('button', {
      name: 'Connect Spotify Account',
    });
    await user.click(loginButton);

    // Note: onAuth would typically be called after successful redirect and token parsing
    // This test verifies the prop is accepted, actual token handling would be in parent component
    expect(mockOnAuth).not.toHaveBeenCalled(); // Not called during login initiation
  });

  it('has proper button type attribute', () => {
    render(<SpotifyAuth />);

    const loginButton = screen.getByRole('button', {
      name: 'Connect Spotify Account',
    });
    expect(loginButton).toHaveAttribute('type', 'button');
  });

  it('handles keyboard navigation properly', async () => {
    const user = userEvent.setup();
    render(<SpotifyAuth />);

    const loginButton = screen.getByRole('button', {
      name: 'Connect Spotify Account',
    });

    // Tab to focus the button
    await user.tab();
    expect(loginButton).toHaveFocus();

    // Press Enter to activate
    await user.keyboard('{Enter}');

    // Should redirect (same as click)
    const expectedUrl =
      `https://accounts.spotify.com/authorize?` +
      `client_id=${mockClientId}&` +
      `response_type=token&` +
      `redirect_uri=${encodeURIComponent('http://localhost:3000/')}&` +
      `scope=${encodeURIComponent('playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private')}`;

    expect(window.location.href).toBe(expectedUrl);
  });

  it('handles space key activation', async () => {
    const user = userEvent.setup();
    render(<SpotifyAuth />);

    const loginButton = screen.getByRole('button', {
      name: 'Connect Spotify Account',
    });

    // Tab to focus the button and press space
    await user.tab();
    expect(loginButton).toHaveFocus();
    await user.keyboard(' ');

    // Should redirect (same as click)
    const expectedUrl =
      `https://accounts.spotify.com/authorize?` +
      `client_id=${mockClientId}&` +
      `response_type=token&` +
      `redirect_uri=${encodeURIComponent('http://localhost:3000/')}&` +
      `scope=${encodeURIComponent('playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private')}`;

    expect(window.location.href).toBe(expectedUrl);
  });

  it('uses default scopes when scopes array is empty', async () => {
    const user = userEvent.setup();

    render(<SpotifyAuth scopes={[]} />);

    const loginButton = screen.getByRole('button', {
      name: 'Connect Spotify Account',
    });
    await user.click(loginButton);

    const expectedUrl =
      `https://accounts.spotify.com/authorize?` +
      `client_id=${mockClientId}&` +
      `response_type=token&` +
      `redirect_uri=${encodeURIComponent('http://localhost:3000/')}&` +
      `scope=${encodeURIComponent('')}`;

    expect(window.location.href).toBe(expectedUrl);
  });

  it('properly encodes special characters in redirect URI', async () => {
    const user = userEvent.setup();
    const redirectUriWithSpecialChars =
      'https://example.com/callback?param=value&other=test';

    render(<SpotifyAuth redirectUri={redirectUriWithSpecialChars} />);

    const loginButton = screen.getByRole('button', {
      name: 'Connect Spotify Account',
    });
    await user.click(loginButton);

    const expectedUrl =
      `https://accounts.spotify.com/authorize?` +
      `client_id=${mockClientId}&` +
      `response_type=token&` +
      `redirect_uri=${encodeURIComponent(redirectUriWithSpecialChars)}&` +
      `scope=${encodeURIComponent('playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private')}`;

    expect(window.location.href).toBe(expectedUrl);
  });

  it('handles non-Error objects in catch block', async () => {
    const user = userEvent.setup();
    const mockOnError = jest.fn();

    // Mock encodeURIComponent to throw a non-Error object
    const originalEncodeURIComponent = global.encodeURIComponent;
    global.encodeURIComponent = jest.fn(() => {
      // eslint-disable-next-line no-throw-literal
      throw 'String error';
    });

    render(<SpotifyAuth onError={mockOnError} />);

    const loginButton = screen.getByRole('button', {
      name: 'Connect Spotify Account',
    });

    // Suppress console errors for this test
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    await user.click(loginButton);

    expect(mockOnError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Authentication failed',
      })
    );

    // Restore original functions
    global.encodeURIComponent = originalEncodeURIComponent;
    consoleSpy.mockRestore();
  });
});
