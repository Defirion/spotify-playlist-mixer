import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SpotifyAuth from '../../components/SpotifyAuth';

// Mock environment variables
const mockClientId = 'test-client-id';
const originalEnv = process.env;

const DEFAULT_SCOPE =
  'playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private';

/** Waits for the redirect and returns the parsed authorize URL. */
const waitForRedirect = async (): Promise<URL> => {
  await waitFor(() => {
    expect(window.location.href).not.toBe('');
  });
  return new URL(window.location.href as string);
};

describe('SpotifyAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
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

  it('redirects to the Spotify authorize URL using the PKCE code flow', async () => {
    const user = userEvent.setup();
    render(<SpotifyAuth />);

    await user.click(
      screen.getByRole('button', { name: 'Connect Spotify Account' })
    );

    const url = await waitForRedirect();
    expect(url.origin).toBe('https://accounts.spotify.com');
    expect(url.pathname).toBe('/authorize');
    expect(url.searchParams.get('client_id')).toBe(mockClientId);
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:3000/');
    expect(url.searchParams.get('scope')).toBe(DEFAULT_SCOPE);
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    // 43-char base64url SHA-256 digest
    expect(url.searchParams.get('code_challenge')).toMatch(
      /^[A-Za-z0-9\-_]{43}$/
    );
    expect(url.searchParams.get('state')).toBeTruthy();
  });

  it('stashes the PKCE verifier and state in sessionStorage for the redirect back', async () => {
    const user = userEvent.setup();
    render(<SpotifyAuth />);

    await user.click(
      screen.getByRole('button', { name: 'Connect Spotify Account' })
    );

    const url = await waitForRedirect();
    expect(sessionStorage.getItem('spotify_pkce_code_verifier')).toMatch(
      /^[A-Za-z0-9\-._~]{64}$/
    );
    expect(sessionStorage.getItem('spotify_auth_state')).toBe(
      url.searchParams.get('state')
    );
  });

  it('uses custom redirect URI when provided', async () => {
    const user = userEvent.setup();
    const customRedirectUri = 'https://custom-domain.com/callback';

    render(<SpotifyAuth redirectUri={customRedirectUri} />);

    await user.click(
      screen.getByRole('button', { name: 'Connect Spotify Account' })
    );

    const url = await waitForRedirect();
    expect(url.searchParams.get('redirect_uri')).toBe(customRedirectUri);
  });

  it('uses custom scopes when provided', async () => {
    const user = userEvent.setup();
    const customScopes = ['playlist-read-private', 'user-read-email'];

    render(<SpotifyAuth scopes={customScopes} />);

    await user.click(
      screen.getByRole('button', { name: 'Connect Spotify Account' })
    );

    const url = await waitForRedirect();
    expect(url.searchParams.get('scope')).toBe(
      'playlist-read-private user-read-email'
    );
  });

  it('uses custom client ID when provided', async () => {
    const user = userEvent.setup();
    const customClientId = 'custom-client-id';

    render(<SpotifyAuth clientId={customClientId} />);

    await user.click(
      screen.getByRole('button', { name: 'Connect Spotify Account' })
    );

    const url = await waitForRedirect();
    expect(url.searchParams.get('client_id')).toBe(customClientId);
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

    await user.click(
      screen.getByRole('button', { name: 'Connect Spotify Account' })
    );

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

    // Make PKCE generation fail
    const getRandomValuesSpy = jest
      .spyOn(crypto, 'getRandomValues')
      .mockImplementation(() => {
        throw new Error('Crypto failed');
      });

    render(<SpotifyAuth onError={mockOnError} />);

    // Suppress console errors for this test
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    await user.click(
      screen.getByRole('button', { name: 'Connect Spotify Account' })
    );

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Crypto failed',
        })
      );
    });
    expect(window.location.href).toBe('');

    getRandomValuesSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('calls onAuth callback when provided (integration test)', async () => {
    const user = userEvent.setup();
    const mockOnAuth = jest.fn();

    render(<SpotifyAuth onAuth={mockOnAuth} />);

    await user.click(
      screen.getByRole('button', { name: 'Connect Spotify Account' })
    );
    await waitForRedirect();

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
    const url = await waitForRedirect();
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe(mockClientId);
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
    const url = await waitForRedirect();
    expect(url.searchParams.get('response_type')).toBe('code');
  });

  it('sends an empty scope when scopes array is empty', async () => {
    const user = userEvent.setup();

    render(<SpotifyAuth scopes={[]} />);

    await user.click(
      screen.getByRole('button', { name: 'Connect Spotify Account' })
    );

    const url = await waitForRedirect();
    expect(url.searchParams.get('scope')).toBe('');
  });

  it('properly encodes special characters in redirect URI', async () => {
    const user = userEvent.setup();
    const redirectUriWithSpecialChars =
      'https://example.com/callback?param=value&other=test';

    render(<SpotifyAuth redirectUri={redirectUriWithSpecialChars} />);

    await user.click(
      screen.getByRole('button', { name: 'Connect Spotify Account' })
    );

    const url = await waitForRedirect();
    // URLSearchParams round-trips the encoded value back to the original
    expect(url.searchParams.get('redirect_uri')).toBe(
      redirectUriWithSpecialChars
    );
    // and the raw URL contains the encoded form
    expect(url.search).toContain(
      encodeURIComponent(redirectUriWithSpecialChars)
    );
  });

  it('handles non-Error objects in catch block', async () => {
    const user = userEvent.setup();
    const mockOnError = jest.fn();

    // Make PKCE generation throw a non-Error object
    const getRandomValuesSpy = jest
      .spyOn(crypto, 'getRandomValues')
      .mockImplementation(() => {
        // eslint-disable-next-line no-throw-literal
        throw 'String error';
      });

    render(<SpotifyAuth onError={mockOnError} />);

    // Suppress console errors for this test
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    await user.click(
      screen.getByRole('button', { name: 'Connect Spotify Account' })
    );

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Authentication failed',
        })
      );
    });

    getRandomValuesSpy.mockRestore();
    consoleSpy.mockRestore();
  });
});
