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
  private authenticated = false;
  private callbacks: (() => void)[] = [];
  
  // Test control methods
  setMockState(token: string | null, user: User | null, authenticated: boolean) {
    this.token = token;
    this.user = user;
    this.authenticated = authenticated;
  }
  
  triggerTokenExpiration() {
    this.callbacks.forEach(callback => callback());
  }

  async login(): Promise<AuthResult> {
    if (this.token && this.user) {
      this.authenticated = true;
      return {
        token: this.token,
        user: this.user,
        expiresIn: 3600
      };
    }
    throw createAuthError('Login failed', 'LOGIN_FAILED');
  }

  async logout(): Promise<void> {
    this.token = null;
    this.user = null;
    this.authenticated = false;
  }

  getToken(): string | null {
    return this.token;
  }

  isAuthenticated(): boolean {
    return this.authenticated;
  }

  getCurrentUser(): User | null {
    return this.user;
  }

  async refreshToken(): Promise<string> {
    if (this.token) {
      return this.token;
    }
    throw createAuthError('Token refresh failed', 'TOKEN_EXPIRED');
  }

  onTokenExpired(callback: () => void): void {
    this.callbacks.push(callback);
  }

  clearTokenExpiredCallbacks(): void {
    this.callbacks = [];
  }
}

// Test component that uses the auth context
function TestComponent() {
  const { state, login, logout, refreshToken, clearError } = useAuth();
  
  const handleLogin = async () => {
    try {
      await login();
    } catch (error) {
      // Error is handled by the context
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      // Error is handled by the context
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshToken();
    } catch (error) {
      // Error is handled by the context
    }
  };
  
  return (
    <div>
      <div data-testid="auth-state">
        {JSON.stringify({
          isAuthenticated: state.isAuthenticated,
          isLoading: state.isLoading,
          hasUser: !!state.user,
          hasToken: !!state.token,
          error: state.error
        })}
      </div>
      <button onClick={handleLogin} data-testid="login-btn">Login</button>
      <button onClick={handleLogout} data-testid="logout-btn">Logout</button>
      <button onClick={handleRefresh} data-testid="refresh-btn">Refresh</button>
      <button onClick={clearError} data-testid="clear-error-btn">Clear Error</button>
    </div>
  );
}

describe('AuthContext', () => {
  let mockAuthService: MockAuthService;

  beforeEach(() => {
    mockAuthService = new MockAuthService();
  });

  const renderWithProvider = (children: React.ReactNode) => {
    return render(
      <AuthProvider authService={mockAuthService}>
        {children}
      </AuthProvider>
    );
  };

  it('should provide initial unauthenticated state', () => {
    renderWithProvider(<TestComponent />);
    
    const authState = JSON.parse(screen.getByTestId('auth-state').textContent || '{}');
    expect(authState).toEqual({
      isAuthenticated: false,
      isLoading: false,
      hasUser: false,
      hasToken: false,
      error: undefined
    });
  });

  it('should initialize with authenticated state when service has valid token', () => {
    const mockUser: User = { id: '123', displayName: 'Test User' };
    mockAuthService.setMockState('valid-token', mockUser, true);
    
    renderWithProvider(<TestComponent />);
    
    const authState = JSON.parse(screen.getByTestId('auth-state').textContent || '{}');
    expect(authState).toEqual({
      isAuthenticated: true,
      isLoading: false,
      hasUser: true,
      hasToken: true,
      error: undefined
    });
  });

  it('should handle successful login', async () => {
    const mockUser: User = { id: '123', displayName: 'Test User' };
    mockAuthService.setMockState('new-token', mockUser, true);
    
    renderWithProvider(<TestComponent />);
    
    const loginBtn = screen.getByTestId('login-btn');
    
    await act(async () => {
      loginBtn.click();
    });
    
    await waitFor(() => {
      const authState = JSON.parse(screen.getByTestId('auth-state').textContent || '{}');
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.hasUser).toBe(true);
      expect(authState.hasToken).toBe(true);
      expect(authState.isLoading).toBe(false);
    });
  });

  it('should handle login failure', async () => {
    mockAuthService.setMockState(null, null, false);
    
    renderWithProvider(<TestComponent />);
    
    const loginBtn = screen.getByTestId('login-btn');
    
    await act(async () => {
      try {
        loginBtn.click();
      } catch (error) {
        // Expected to throw
      }
    });
    
    await waitFor(() => {
      const authState = JSON.parse(screen.getByTestId('auth-state').textContent || '{}');
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.isLoading).toBe(false);
      expect(authState.error).toBeDefined();
    });
  });

  it('should handle successful logout', async () => {
    const mockUser: User = { id: '123', displayName: 'Test User' };
    mockAuthService.setMockState('valid-token', mockUser, true);
    
    renderWithProvider(<TestComponent />);
    
    // Wait for initial auth state
    await waitFor(() => {
      const authState = JSON.parse(screen.getByTestId('auth-state').textContent || '{}');
      expect(authState.isAuthenticated).toBe(true);
    });
    
    const logoutBtn = screen.getByTestId('logout-btn');
    
    await act(async () => {
      logoutBtn.click();
    });
    
    await waitFor(() => {
      const authState = JSON.parse(screen.getByTestId('auth-state').textContent || '{}');
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.hasUser).toBe(false);
      expect(authState.hasToken).toBe(false);
      expect(authState.isLoading).toBe(false);
    });
  });

  it('should handle token refresh', async () => {
    const mockUser: User = { id: '123', displayName: 'Test User' };
    mockAuthService.setMockState('valid-token', mockUser, true);
    
    renderWithProvider(<TestComponent />);
    
    const refreshBtn = screen.getByTestId('refresh-btn');
    
    await act(async () => {
      refreshBtn.click();
    });
    
    await waitFor(() => {
      const authState = JSON.parse(screen.getByTestId('auth-state').textContent || '{}');
      expect(authState.isLoading).toBe(false);
      expect(authState.error).toBeUndefined();
    });
  });

  it('should handle token expiration callback', async () => {
    const mockUser: User = { id: '123', displayName: 'Test User' };
    mockAuthService.setMockState('valid-token', mockUser, true);
    
    renderWithProvider(<TestComponent />);
    
    // Wait for initial auth state
    await waitFor(() => {
      const authState = JSON.parse(screen.getByTestId('auth-state').textContent || '{}');
      expect(authState.isAuthenticated).toBe(true);
    });
    
    // Trigger token expiration
    act(() => {
      mockAuthService.triggerTokenExpiration();
    });
    
    await waitFor(() => {
      const authState = JSON.parse(screen.getByTestId('auth-state').textContent || '{}');
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.hasUser).toBe(false);
      expect(authState.hasToken).toBe(false);
    });
  });

  it('should clear error state', async () => {
    mockAuthService.setMockState(null, null, false);
    
    renderWithProvider(<TestComponent />);
    
    // Trigger login failure to set error
    const loginBtn = screen.getByTestId('login-btn');
    await act(async () => {
      loginBtn.click();
    });
    
    await waitFor(() => {
      const authState = JSON.parse(screen.getByTestId('auth-state').textContent || '{}');
      expect(authState.error).toBeDefined();
    });
    
    // Clear error
    const clearErrorBtn = screen.getByTestId('clear-error-btn');
    act(() => {
      clearErrorBtn.click();
    });
    
    await waitFor(() => {
      const authState = JSON.parse(screen.getByTestId('auth-state').textContent || '{}');
      expect(authState.error).toBeUndefined();
    });
  });

  it('should throw error when useAuth is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');
    
    consoleSpy.mockRestore();
  });

  it('should handle loading states correctly', async () => {
    const mockUser: User = { id: '123', displayName: 'Test User' };
    mockAuthService.setMockState('valid-token', mockUser, true);
    
    renderWithProvider(<TestComponent />);
    
    const loginBtn = screen.getByTestId('login-btn');
    
    // Start login
    act(() => {
      loginBtn.click();
    });
    
    // Should show loading state briefly
    const authState = JSON.parse(screen.getByTestId('auth-state').textContent || '{}');
    expect(authState.isLoading).toBe(true);
    
    // Wait for completion
    await waitFor(() => {
      const finalState = JSON.parse(screen.getByTestId('auth-state').textContent || '{}');
      expect(finalState.isLoading).toBe(false);
    });
  });
});