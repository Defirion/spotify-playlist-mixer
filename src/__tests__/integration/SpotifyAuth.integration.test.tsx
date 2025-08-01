import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SpotifyAuth from '../../components/SpotifyAuth';

// Mock environment variables
const mockClientId = 'test-client-id';
const originalEnv = process.env;

describe('SpotifyAuth Integration Tests', () => {
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
    const loginButton = screen.getByRole('button', {
      name: 'Connect Spotify Account',
    });
    await user.click(loginButton);

    // Should redirect to Spotify (in real app, this would trigger OAuth flow)
    const expectedUrl =
      `https://accounts.spotify.com/authorize?` +
      `client_id=${mockClientId}&` +
      `response_type=token&` +
      `redirect_uri=${encodeURIComponent('http://localhost:3000/')}&` +
      `scope=${encodeURIComponent('playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private')}`;

    expect(window.location.href).toBe(expectedUrl);
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

    const loginButton = screen.getByRole('button', {
      name: 'Connect Spotify Account',
    });
    await user.click(loginButton);

    const expectedUrl =
      `https://accounts.spotify.com/authorize?` +
      `client_id=${customConfig.clientId}&` +
      `response_type=token&` +
      `redirect_uri=${encodeURIComponent(customConfig.redirectUri)}&` +
      `scope=${encodeURIComponent(customConfig.scopes.join(' '))}`;

    expect(window.location.href).toBe(expectedUrl);
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
