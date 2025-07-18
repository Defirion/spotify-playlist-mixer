import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SpotifyAuth from '../SpotifyAuth';
import { AuthProvider } from '../../context/AuthContext';
import { IAuthService } from '../../types/services';
import { User, AuthResult } from '../../types';
import { createAuthError } from '../../types/errors';

// Mock AuthService
class MockAuthService implements IAuthService {
  private token: string | null = null;
  private user: User | null = null;
  private callbacks: (() => void)[] = [];
  private shouldFailLogin = false;
  private isLoading = false;
  private error: string | undefined = undefined;

  async login(): Promise<AuthResult> {
    this.isLoading = true;
    
    if (this.shouldFailLogin) {
      this.isLoading = false;
      this.error = 'Login failed';
      throw createAuthError('Login failed', 'LOGIN_FAILED');
    }
    
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    this.token = 'mock-token';
    this.user = { id: 'user1', displayName: 'Test User' };
    this.isLoading = false;
    this.error = undefined;
    
    return {
      token: this.token,
      user: this.user,
      expiresIn: 3600
    };
  }

  async logout(): Promise<void> {
    this.token = null;
    this.user = null;
  }

  getToken(): string | null {
    return this.token;
  }

  isAuthenticated(): boolean {
    return this.token !== null;
  }

  getCurrentUser(): User | null {
    return this.user;
  }

  async refreshToken(): Promise<string> {
    return this.token || 'refreshed-token';
  }

  onTokenExpired(callback: () => void): void {
    this.callbacks.push(callback);
  }

  clearTokenExpiredCallbacks(): void {
    this.callbacks = [];
  }

  // Test helpers
  setShouldFailLogin(shouldFail: boolean) {
    this.shouldFailLogin = shouldFail;
  }

  getIsLoading() {
    return this.isLoading;
  }

  getError() {
    return this.error;
  }

  clearError() {
    this.error = undefined;
  }
}

describe('SpotifyAuth Component', () => {
  let mockAuthService: MockAuthService;

  beforeEach(() => {
    mockAuthService = new MockAuthService();
  });

  const renderWithProvider = (authService = mockAuthService) => {
    return render(
      <AuthProvider authService={authService}>
        <SpotifyAuth />
      </AuthProvider>
    );
  };

  describe('Initial Render', () => {
    it('should render the connect to Spotify UI', () => {
      renderWithProvider();

      expect(screen.getByText('Connect to Spotify')).toBeInTheDocument();
      expect(screen.getByText('To get started, you\'ll need to connect your Spotify account.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Connect Spotify Account' })).toBeInTheDocument();
    });

    it('should render ready to use message', () => {
      renderWithProvider();

      expect(screen.getByText('Ready to use!')).toBeInTheDocument();
      expect(screen.getByText('Click the button above to connect your Spotify account and start mixing playlists.')).toBeInTheDocument();
    });

    it('should have proper CSS classes', () => {
      renderWithProvider();

      const cardElement = screen.getByText('Connect to Spotify').closest('.card');
      expect(cardElement).toBeInTheDocument();
      
      const buttonElement = screen.getByRole('button');
      expect(buttonElement).toHaveClass('btn');
    });
  });

  describe('Login Functionality', () => {
    it('should handle successful login', async () => {
      renderWithProvider();

      const loginButton = screen.getByRole('button', { name: 'Connect Spotify Account' });
      
      fireEvent.click(loginButton);

      // Should show loading state
      expect(screen.getByRole('button', { name: 'Connecting...' })).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();

      // Wait for login to complete
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Connect Spotify Account' })).toBeInTheDocument();
      });

      expect(screen.getByRole('button')).not.toBeDisabled();
    });

    it('should handle login failure', async () => {
      mockAuthService.setShouldFailLogin(true);
      renderWithProvider();

      const loginButton = screen.getByRole('button', { name: 'Connect Spotify Account' });
      
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('Error:')).toBeInTheDocument();
        expect(screen.getByText('Login failed')).toBeInTheDocument();
      });

      // Button should be enabled again
      expect(screen.getByRole('button')).not.toBeDisabled();
    });

    it('should show loading state during login', async () => {
      renderWithProvider();

      const loginButton = screen.getByRole('button', { name: 'Connect Spotify Account' });
      
      fireEvent.click(loginButton);

      // Should immediately show loading state
      expect(screen.getByRole('button', { name: 'Connecting...' })).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should clear previous errors before login', async () => {
      mockAuthService.setShouldFailLogin(true);
      renderWithProvider();

      const loginButton = screen.getByRole('button');
      
      // First login attempt (fails)
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('Login failed')).toBeInTheDocument();
      });

      // Enable successful login and try again
      mockAuthService.setShouldFailLogin(false);
      
      fireEvent.click(loginButton);

      // Error should be cleared during the new attempt
      await waitFor(() => {
        expect(screen.queryByText('Login failed')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Display', () => {
    it('should display error messages with proper styling', async () => {
      mockAuthService.setShouldFailLogin(true);
      renderWithProvider();

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        const errorElement = screen.getByText('Login failed').closest('div');
        expect(errorElement).toHaveStyle({
          color: 'red',
          backgroundColor: '#ffe6e6',
          borderRadius: '4px'
        });
      });
    });

    it('should show error with proper structure', async () => {
      mockAuthService.setShouldFailLogin(true);
      renderWithProvider();

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText('Error:')).toBeInTheDocument();
        expect(screen.getByText('Login failed')).toBeInTheDocument();
      });
    });

    it('should not show error when there is no error', () => {
      renderWithProvider();

      expect(screen.queryByText('Error:')).not.toBeInTheDocument();
    });
  });

  describe('Button States', () => {
    it('should disable button during loading', async () => {
      renderWithProvider();

      const loginButton = screen.getByRole('button');
      
      fireEvent.click(loginButton);

      expect(loginButton).toBeDisabled();
      expect(loginButton).toHaveTextContent('Connecting...');
    });

    it('should enable button after login completes', async () => {
      renderWithProvider();

      const loginButton = screen.getByRole('button');
      
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(loginButton).not.toBeDisabled();
        expect(loginButton).toHaveTextContent('Connect Spotify Account');
      });
    });

    it('should enable button after login fails', async () => {
      mockAuthService.setShouldFailLogin(true);
      renderWithProvider();

      const loginButton = screen.getByRole('button');
      
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(loginButton).not.toBeDisabled();
        expect(loginButton).toHaveTextContent('Connect Spotify Account');
      });
    });
  });

  describe('Component Memoization', () => {
    it('should not re-render unnecessarily', () => {
      const { rerender } = renderWithProvider();

      const initialButton = screen.getByRole('button');
      
      // Re-render with same props
      rerender(
        <AuthProvider authService={mockAuthService}>
          <SpotifyAuth />
        </AuthProvider>
      );

      const newButton = screen.getByRole('button');
      
      // Should be the same element (React.memo working)
      expect(initialButton).toBe(newButton);
    });
  });

  describe('Accessibility', () => {
    it('should have proper button role and text', () => {
      renderWithProvider();

      const button = screen.getByRole('button', { name: 'Connect Spotify Account' });
      expect(button).toBeInTheDocument();
    });

    it('should have proper heading structure', () => {
      renderWithProvider();

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Connect to Spotify');
    });

    it('should have descriptive text for screen readers', () => {
      renderWithProvider();

      expect(screen.getByText('To get started, you\'ll need to connect your Spotify account.')).toBeInTheDocument();
      expect(screen.getByText('Click the button above to connect your Spotify account and start mixing playlists.')).toBeInTheDocument();
    });

    it('should indicate loading state to screen readers', async () => {
      renderWithProvider();

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.getByRole('button', { name: 'Connecting...' })).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle console errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockAuthService.setShouldFailLogin(true);
      
      renderWithProvider();

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText('Login failed')).toBeInTheDocument();
      });

      expect(consoleSpy).toHaveBeenCalledWith('Login failed:', expect.any(Object));
      
      consoleSpy.mockRestore();
    });

    it('should handle auth service errors', async () => {
      // Create a service that throws during login but has all required methods
      const faultyService = {
        login: jest.fn().mockRejectedValue(new Error('Network error')),
        logout: jest.fn(),
        getToken: jest.fn().mockReturnValue(null),
        isAuthenticated: jest.fn().mockReturnValue(false),
        getCurrentUser: jest.fn().mockReturnValue(null),
        refreshToken: jest.fn(),
        onTokenExpired: jest.fn(),
        clearTokenExpiredCallbacks: jest.fn()
      };

      render(
        <AuthProvider authService={faultyService as any}>
          <SpotifyAuth />
        </AuthProvider>
      );

      fireEvent.click(screen.getByRole('button'));

      // Should handle the error gracefully
      await waitFor(() => {
        expect(screen.getByRole('button')).not.toBeDisabled();
      });
    });
  });

  describe('Integration with AuthContext', () => {
    it('should respond to auth state changes', async () => {
      renderWithProvider();

      // Initially should show connect button
      expect(screen.getByRole('button', { name: 'Connect Spotify Account' })).toBeInTheDocument();

      // Simulate login
      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByRole('button')).not.toBeDisabled();
      });
    });

    it('should clear errors through auth context', async () => {
      mockAuthService.setShouldFailLogin(true);
      renderWithProvider();

      // Trigger error
      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText('Login failed')).toBeInTheDocument();
      });

      // Enable successful login
      mockAuthService.setShouldFailLogin(false);

      // Try again - should clear error
      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.queryByText('Login failed')).not.toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid button clicks', async () => {
      renderWithProvider();

      const button = screen.getByRole('button');
      
      // Click multiple times rapidly
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      // Should only process one login
      expect(button).toBeDisabled();
      expect(button).toHaveTextContent('Connecting...');

      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });

    it('should handle component unmount during login', async () => {
      const { unmount } = renderWithProvider();

      fireEvent.click(screen.getByRole('button'));

      // Unmount while login is in progress
      unmount();

      // Should not cause any errors or memory leaks
    });
  });
});