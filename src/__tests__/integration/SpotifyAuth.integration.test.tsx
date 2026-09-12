import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SpotifyAuth from '../../components/SpotifyAuth';

// Mock environment variables
const mockClientId = 'test-client-id';
const originalEnv = process.env;
let originalLocation: Location | undefined;

/** Waits for the redirect and returns the parsed authorize URL. */
const waitForRedirect = async (): Promise<URL> => {
  await waitFor(() => {
    expect(window.location.href).not.toBe('');
  });
  return new URL(window.location.href as string);
};

describe('SpotifyAuth Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    // Mock window.location
    // capture original so we can restore it later
    originalLocation = window.location;
    try {
      // delete then reassign a safe mock; use any cast to avoid readonly errors
      delete (window as any).location;
    } catch (e) {
      // some environments may not allow delete, ignore and overwrite via cast
    }
    (window as any).location = {
      ...(originalLocation as any),
      origin: 'http://localhost:3000',
      href: '',
    } as Location;

    // Mock environment
    process.env = {
      ...originalEnv,
      REACT_APP_SPOTIFY_CLIENT_ID: mockClientId,
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    // restore original window.location if we captured it
    if (originalLocation) {
      try {
        (window as any).location = originalLocation;
      } catch (e) {
        // ignore restore errors in constrained environments
      }
      originalLocation = undefined;
    }
  });

  it('integrates properly with parent component authentication flow', async () => {
    const user = userEvent.setup();
    let authToken: string | null = null;
    let authError: Error | null = null;

    const MockParentComponent: React.FC = () => {
      const handleAuth = (token: string) => {
        authToken = token;
      };

      const handleError = (error: Error) => {
        authError = error;
      };

      return (
        <div>
          <h1>My App</h1>
          {!authToken ? (
            <SpotifyAuth onAuth={handleAuth} onError={handleError} />
          ) : (
            <div data-testid="authenticated-content">
              Welcome! You are authenticated.
            </div>
          )}
        </div>
      );
    };

    render(<MockParentComponent />);

    // Should show the auth component initially
    expect(screen.getByText('Connect to Spotify')).toBeInTheDocument();
    expect(
      screen.queryByTestId('authenticated-content')
    ).not.toBeInTheDocument();

    // Click the login button
    await user.click(
      screen.getByRole('button', { name: 'Connect Spotify Account' })
    );

    // Should redirect to Spotify's authorize endpoint using the PKCE code flow
    const url = await waitForRedirect();
    expect(url.origin).toBe('https://accounts.spotify.com');
    expect(url.pathname).toBe('/authorize');
    expect(url.searchParams.get('client_id')).toBe(mockClientId);
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:3000/');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(authError).toBeNull();
  });

  it('handles authentication errors gracefully in parent component', async () => {
    const user = userEvent.setup();

    // Set environment to undefined to trigger error
    const originalClientId = process.env.REACT_APP_SPOTIFY_CLIENT_ID;
    process.env.REACT_APP_SPOTIFY_CLIENT_ID = undefined;

    const MockParentComponent: React.FC = () => {
      const [authError, setAuthError] = React.useState<Error | null>(null);

      const handleError = (error: Error) => {
        setAuthError(error);
      };

      return (
        <div>
          <h1>My App</h1>
          <SpotifyAuth onError={handleError} />
          {authError && (
            <div data-testid="error-message" role="alert">
              Authentication failed: {authError.message}
            </div>
          )}
        </div>
      );
    };

    render(<MockParentComponent />);

    const loginButton = screen.getByRole('button', {
      name: 'Connect Spotify Account',
    });
    await user.click(loginButton);

    // Should show error message
    expect(screen.getByTestId('error-message')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Authentication failed: Spotify Client ID is not configured'
      )
    ).toBeInTheDocument();

    // Restore environment
    process.env.REACT_APP_SPOTIFY_CLIENT_ID = originalClientId;
  });

  it('works with custom configuration from parent component', async () => {
    const user = userEvent.setup();
    const customConfig = {
      clientId: 'custom-client-id',
      redirectUri: 'https://myapp.com/callback',
      scopes: ['playlist-read-private', 'user-read-email'],
    };

    const MockParentComponent: React.FC = () => {
      return (
        <div>
          <h1>Custom App</h1>
          <SpotifyAuth
            clientId={customConfig.clientId}
            redirectUri={customConfig.redirectUri}
            scopes={customConfig.scopes}
          />
        </div>
      );
    };

    render(<MockParentComponent />);

    await user.click(
      screen.getByRole('button', { name: 'Connect Spotify Account' })
    );

    const url = await waitForRedirect();
    expect(url.searchParams.get('client_id')).toBe(customConfig.clientId);
    expect(url.searchParams.get('redirect_uri')).toBe(customConfig.redirectUri);
    expect(url.searchParams.get('scope')).toBe(customConfig.scopes.join(' '));
  });

  it('maintains consistent styling with application theme', () => {
    render(
      <SpotifyAuth className="custom-theme-class" testId="auth-container" />
    );

    const container = screen.getByTestId('auth-container');
    expect(container).toHaveClass('card');
    expect(container).toHaveClass('custom-theme-class');

    const button = screen.getByRole('button', {
      name: 'Connect Spotify Account',
    });
    expect(button).toHaveClass('btn');
  });

  it('supports accessibility features for screen readers', () => {
    render(<SpotifyAuth testId="auth-component" />);

    const container = screen.getByTestId('auth-component');
    expect(container).toBeInTheDocument();

    const button = screen.getByRole('button', {
      name: 'Connect Spotify Account',
    });
    expect(button).toHaveAttribute('type', 'button');

    // Check that all text content is accessible
    expect(screen.getByText('Connect to Spotify')).toBeInTheDocument();
    expect(
      screen.getByText(
        "To get started, you'll need to connect your Spotify account."
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Ready to use!')).toBeInTheDocument();
  });
});
