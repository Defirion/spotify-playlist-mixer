import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import { IAuthService } from '../../types/services';
import { User, AuthResult } from '../../types';
import { createAuthError } from '../../types/errors';

// Mock AuthService
class MockAuthService implements IAuthService {
  private token: string | null = null;
  private user: User | null = null;
  private callbacks: (() => void)[] = [];
  private shouldFailLogin = false;
  private shouldFailLogout = false;
  private shouldFailRefresh = false;

  async login(): Promise<AuthResult> {
    if (this.shouldFailLogin) {
      throw createAuthError('Login failed', 'LOGIN_FAILED');
    }
    
    this.token = 'mock-token';
    this.user = { id: 'user1', displayName: 'Test User' };
    
    return {
      token: this.token,
      user: this.user,
      expiresIn: 3600
    };
  }

  async logout(): Promise<void> {
    if (this.shouldFailLogout) {
      throw new Error('Logout failed');
    }
    
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
    if (this.shouldFailRefresh) {
      throw createAuthError('Token refresh failed', 'TOKEN_EXPIRED');
    }
    
    this.token = 'refreshed-token';
    return this.token;
  }

  onTokenExpired(callback: () => void): void {
    this.callbacks.push(callback);
  }

  clearTokenExpiredCallbacks(): void {
    this.callbacks = [];
  }

  // Test helpers
  setToken(token: string | null) {
    this.token = token;
  }

  setUser(user: User | null) {
    this.user = user;
  }

  setShouldFailLogin(shouldFail: boolean) {
    this.shouldFailLogin = shouldFail;
  }

  setShouldFailLogout(shouldFail: boolean) {
    this.shouldFailLogout = shouldFail;
  }

  setShouldFailRefresh(shouldFail: boolean) {
    this.shouldFailRefresh = shouldFail;
  }

  triggerTokenExpired() {
    this.callbacks.forEach(cb => cb());
  }

  handleAuthCallback() {
    return {
      token: 'callback-token',
      user: { id: 'callback-user', displayName: 'Callback User' },
      expiresIn: 3600
    };
  }
}

// Test component that uses the auth context
function TestComponent() {
  const {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    refreshToken,
    clearError,
    checkAuthStatus
  } = useAuth();

  return (
    <div>
      <div data-testid="user">{user?.displayName || 'No user'}</div>
      <div data-testid="token">{token || 'No token'}</div>
      <div data-testid="isAuthenticated">{isAuthenticated.toString()}</div>
      <div data-testid="isLoading">{isLoading.toString()}</div>
      <div data-testid="error">{error || 'No error'}</div>
      
      <button data-testid="login" onClick={login}>Login</button>
      <button data-testid="logout" onClick={logout}>Logout</button>
      <button data-testid="refresh" onClick={refreshToken}>Refresh</button>
      <button data-testid="clearError" onClick={clearError}>Clear Error</button>
      <button data-testid="checkStatus" onClick={checkAuthStatus}>Check Status</button>
    </div>
  );
}

describe('AuthContext Integration Tests', () => {
  let mockAuthService: MockAuthService;

  beforeEach(() => {
    mockAuthService = new MockAuthService();
  });

  const renderWithProvider = (authService = mockAuthService) => {
    return render(
      <AuthProvider authService={authService}>
        <TestComponent />
      </AuthProvider>
    );
  };

  describe('Initial State', () => {
    it('should initialize with unauthenticated state', () => {
      renderWithProvider();

      expect(screen.getByTestId('user')).toHaveTextContent('No user');
      expect(screen.getByTestId('token')).toHaveTextContent('No token');
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      expect(screen.getByTestId('error')).toHaveTextContent('No error');
    });

    it('should check auth status on mount', () => {
      mockAuthService.setToken('existing-token');
      mockAuthService.setUser({ id: 'existing-user', displayName: 'Existing User' });

      renderWithProvider();

      expect(screen.getByTestId('user')).toHaveTextContent('Existing User');
      expect(screen.getByTestId('token')).toHaveTextContent('existing-token');
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
    });

    it('should handle auth callback on mount', () => {
      // Mock URL hash scenario
      const originalLocation = window.location;
      delete (window as any).location;
      (window as any).location = { ...originalLocation, hash: '#access_token=callback-token' };

      renderWithProvider();

      expect(screen.getByTestId('user')).toHaveTextContent('Callback User');
      expect(screen.getByTestId('token')).toHaveTextContent('callback-token');
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');

      // Restore location
      (window as any).location = originalLocation;
    });
  });

  describe('Login Flow', () => {
    it('should handle successful login', async () => {
      renderWithProvider();

      const loginButton = screen.getByTestId('login');

      await act(async () => {
        loginButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('Test User');
        expect(screen.getByTestId('token')).toHaveTextContent('mock-token');
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });
    });

    it('should handle login failure', async () => {
      mockAuthService.setShouldFailLogin(true);
      renderWithProvider();

      const loginButton = screen.getByTestId('login');

      await act(async () => {
        loginButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Login failed');
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });
    });

    it('should show loading state during login', async () => {
      renderWithProvider();

      const loginButton = screen.getByTestId('login');

      act(() => {
        loginButton.click();
      });

      // Check loading state immediately
      expect(screen.getByTestId('isLoading')).toHaveTextContent('true');

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });
    });
  });

  describe('Logout Flow', () => {
    beforeEach(async () => {
      renderWithProvider();
      
      // Login first
      await act(async () => {
        screen.getByTestId('login').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
      });
    });

    it('should handle successful logout', async () => {
      const logoutButton = screen.getByTestId('logout');

      await act(async () => {
        logoutButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('No user');
        expect(screen.getByTestId('token')).toHaveTextContent('No token');
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });
    });

    it('should handle logout failure', async () => {
      mockAuthService.setShouldFailLogout(true);
      const logoutButton = screen.getByTestId('logout');

      await act(async () => {
        logoutButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Logout failed');
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });
    });
  });

  describe('Token Refresh Flow', () => {
    beforeEach(async () => {
      renderWithProvider();
      
      // Login first
      await act(async () => {
        screen.getByTestId('login').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
      });
    });

    it('should handle successful token refresh', async () => {
      const refreshButton = screen.getByTestId('refresh');

      await act(async () => {
        refreshButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('token')).toHaveTextContent('refreshed-token');
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });
    });

    it('should handle token refresh failure', async () => {
      mockAuthService.setShouldFailRefresh(true);
      const refreshButton = screen.getByTestId('refresh');

      await act(async () => {
        refreshButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Token refresh failed');
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });
    });
  });

  describe('Token Expiration Handling', () => {
    it('should handle token expiration callback', async () => {
      renderWithProvider();

      // Login first
      await act(async () => {
        screen.getByTestId('login').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
      });

      // Trigger token expiration
      act(() => {
        mockAuthService.triggerTokenExpired();
      });

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
        expect(screen.getByTestId('user')).toHaveTextContent('No user');
        expect(screen.getByTestId('token')).toHaveTextContent('No token');
      });
    });
  });

  describe('Error Handling', () => {
    it('should clear errors', async () => {
      mockAuthService.setShouldFailLogin(true);
      renderWithProvider();

      // Trigger error
      await act(async () => {
        screen.getByTestId('login').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Login failed');
      });

      // Clear error
      act(() => {
        screen.getByTestId('clearError').click();
      });

      expect(screen.getByTestId('error')).toHaveTextContent('No error');
    });
  });

  describe('Auth Status Check', () => {
    it('should manually check auth status', () => {
      mockAuthService.setToken('manual-token');
      mockAuthService.setUser({ id: 'manual-user', displayName: 'Manual User' });
      
      renderWithProvider();

      // Initially should be unauthenticated
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');

      // Manually check status
      act(() => {
        screen.getByTestId('checkStatus').click();
      });

      expect(screen.getByTestId('user')).toHaveTextContent('Manual User');
      expect(screen.getByTestId('token')).toHaveTextContent('manual-token');
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
    });
  });

  describe('Context Error Handling', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup token expiration callbacks on unmount', () => {
      const clearCallbacksSpy = jest.spyOn(mockAuthService, 'clearTokenExpiredCallbacks');
      
      const { unmount } = renderWithProvider();
      
      unmount();
      
      expect(clearCallbacksSpy).toHaveBeenCalled();
    });
  });

  describe('State Transitions', () => {
    it('should handle complex state transitions correctly', async () => {
      renderWithProvider();

      // Initial state
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('isLoading')).toHaveTextContent('false');

      // Start login
      act(() => {
        screen.getByTestId('login').click();
      });
      expect(screen.getByTestId('isLoading')).toHaveTextContent('true');

      // Complete login
      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });

      // Start logout
      act(() => {
        screen.getByTestId('logout').click();
      });
      expect(screen.getByTestId('isLoading')).toHaveTextContent('true');

      // Complete logout
      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });
    });
  });
});