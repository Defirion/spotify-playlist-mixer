import React, { ReactNode } from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from '../useAuth';
import { AuthProvider } from '../../context/AuthContext';
import { IAuthService } from '../../types/services';
import { User, AuthResult } from '../../types';

// Mock auth service
const createMockAuthService = (): jest.Mocked<IAuthService> => ({
  login: jest.fn(),
  logout: jest.fn(),
  refreshToken: jest.fn(),
  getToken: jest.fn(),
  getCurrentUser: jest.fn(),
  isAuthenticated: jest.fn(),
  onTokenExpired: jest.fn(),
  clearTokenExpiredCallbacks: jest.fn(),
});

// Mock user and auth result
const mockUser: User = {
  id: 'user123',
  displayName: 'Test User',
  email: 'test@example.com',
};

const mockAuthResult: AuthResult = {
  user: mockUser,
  token: 'mock-token',
};

// Create a valid JWT token for testing (expires in 1 hour)
const createMockJWT = (expirationMinutes: number = 60): string => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    sub: 'user123',
    exp: Math.floor(Date.now() / 1000) + (expirationMinutes * 60),
    iat: Math.floor(Date.now() / 1000),
  }));
  const signature = 'mock-signature';
  return `${header}.${payload}.${signature}`;
};

// Test wrapper component
const createWrapper = (authService: IAuthService) => {
  return ({ children }: { children: ReactNode }) => (
    <AuthProvider authService={authService}>
      {children}
    </AuthProvider>
  );
};

describe('useAuth', () => {
  let mockAuthService: jest.Mocked<IAuthService>;

  beforeEach(() => {
    mockAuthService = createMockAuthService();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Basic functionality', () => {

    it('should return initial unauthenticated state', () => {
      mockAuthService.getToken.mockReturnValue(null);
      mockAuthService.getCurrentUser.mockReturnValue(null);
      mockAuthService.isAuthenticated.mockReturnValue(false);

      const wrapper = createWrapper(mockAuthService);
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeUndefined();
    });

    it('should return authenticated state when user is logged in', () => {
      const mockToken = createMockJWT();
      mockAuthService.getToken.mockReturnValue(mockToken);
      mockAuthService.getCurrentUser.mockReturnValue(mockUser);
      mockAuthService.isAuthenticated.mockReturnValue(true);

      const wrapper = createWrapper(mockAuthService);
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.token).toBe(mockToken);
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('Authentication actions', () => {
    it('should handle successful login', async () => {
      mockAuthService.login.mockResolvedValue(mockAuthResult);
      mockAuthService.getToken.mockReturnValue(null);
      mockAuthService.getCurrentUser.mockReturnValue(null);
      mockAuthService.isAuthenticated.mockReturnValue(false);

      const wrapper = createWrapper(mockAuthService);
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login();
      });

      expect(mockAuthService.login).toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle login failure', async () => {
      const loginError = new Error('Login failed');
      mockAuthService.login.mockRejectedValue(loginError);
      mockAuthService.getToken.mockReturnValue(null);
      mockAuthService.getCurrentUser.mockReturnValue(null);
      mockAuthService.isAuthenticated.mockReturnValue(false);

      const wrapper = createWrapper(mockAuthService);
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.login();
        } catch (error) {
          expect(error).toBe(loginError);
        }
      });

      expect(result.current.error).toBe('Login failed');
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle successful logout', async () => {
      const mockToken = createMockJWT();
      mockAuthService.getToken.mockReturnValue(mockToken);
      mockAuthService.getCurrentUser.mockReturnValue(mockUser);
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockAuthService.logout.mockResolvedValue();

      const wrapper = createWrapper(mockAuthService);
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.logout();
      });

      expect(mockAuthService.logout).toHaveBeenCalled();
    });

    it('should handle token refresh', async () => {
      const newToken = createMockJWT();
      mockAuthService.refreshToken.mockResolvedValue(newToken);
      mockAuthService.getToken.mockReturnValue(createMockJWT());
      mockAuthService.getCurrentUser.mockReturnValue(mockUser);
      mockAuthService.isAuthenticated.mockReturnValue(true);

      const wrapper = createWrapper(mockAuthService);
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.refreshToken();
      });

      expect(mockAuthService.refreshToken).toHaveBeenCalled();
    });
  });

  describe('Token expiration handling', () => {
    it('should detect expired tokens', () => {
      const expiredToken = createMockJWT(-10); // Expired 10 minutes ago
      mockAuthService.getToken.mockReturnValue(expiredToken);
      mockAuthService.getCurrentUser.mockReturnValue(mockUser);
      mockAuthService.isAuthenticated.mockReturnValue(true);

      const wrapper = createWrapper(mockAuthService);
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isTokenExpired()).toBe(true);
    });

    it('should detect tokens expiring soon', () => {
      const soonToExpireToken = createMockJWT(3); // Expires in 3 minutes
      mockAuthService.getToken.mockReturnValue(soonToExpireToken);
      mockAuthService.getCurrentUser.mockReturnValue(mockUser);
      mockAuthService.isAuthenticated.mockReturnValue(true);

      const wrapper = createWrapper(mockAuthService);
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isTokenExpired()).toBe(true);
    });

    it('should return correct token expiration time', () => {
      const mockToken = createMockJWT(60);
      mockAuthService.getToken.mockReturnValue(mockToken);
      mockAuthService.getCurrentUser.mockReturnValue(mockUser);
      mockAuthService.isAuthenticated.mockReturnValue(true);

      const wrapper = createWrapper(mockAuthService);
      const { result } = renderHook(() => useAuth(), { wrapper });

      const expirationTime = result.current.getTokenExpirationTime();
      expect(expirationTime).toBeInstanceOf(Date);
      expect(expirationTime!.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('Utility methods', () => {
    it('should require authentication successfully when authenticated', () => {
      const mockToken = createMockJWT();
      mockAuthService.getToken.mockReturnValue(mockToken);
      mockAuthService.getCurrentUser.mockReturnValue(mockUser);
      mockAuthService.isAuthenticated.mockReturnValue(true);

      const wrapper = createWrapper(mockAuthService);
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.requireAuth()).toBe(true);
    });

    it('should throw error when requiring authentication while unauthenticated', () => {
      mockAuthService.getToken.mockReturnValue(null);
      mockAuthService.getCurrentUser.mockReturnValue(null);
      mockAuthService.isAuthenticated.mockReturnValue(false);

      const wrapper = createWrapper(mockAuthService);
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(() => result.current.requireAuth()).toThrow('Authentication required');
    });

    it('should execute callback with withAuth when authenticated', () => {
      const mockToken = createMockJWT();
      mockAuthService.getToken.mockReturnValue(mockToken);
      mockAuthService.getCurrentUser.mockReturnValue(mockUser);
      mockAuthService.isAuthenticated.mockReturnValue(true);

      const wrapper = createWrapper(mockAuthService);
      const { result } = renderHook(() => useAuth(), { wrapper });

      const callback = jest.fn().mockReturnValue('success');
      const returnValue = result.current.withAuth(callback);

      expect(callback).toHaveBeenCalled();
      expect(returnValue).toBe('success');
    });

    it('should return null with withAuth when unauthenticated', () => {
      mockAuthService.getToken.mockReturnValue(null);
      mockAuthService.getCurrentUser.mockReturnValue(null);
      mockAuthService.isAuthenticated.mockReturnValue(false);

      const wrapper = createWrapper(mockAuthService);
      const { result } = renderHook(() => useAuth(), { wrapper });

      const callback = jest.fn();
      const returnValue = result.current.withAuth(callback);

      expect(callback).not.toHaveBeenCalled();
      expect(returnValue).toBeNull();
    });
  });

  describe('Cleanup and memory leak prevention', () => {
    it('should clear intervals on unmount', () => {
      const mockToken = createMockJWT();
      mockAuthService.getToken.mockReturnValue(mockToken);
      mockAuthService.getCurrentUser.mockReturnValue(mockUser);
      mockAuthService.isAuthenticated.mockReturnValue(true);

      const wrapper = createWrapper(mockAuthService);
      const { unmount } = renderHook(() => useAuth(), { wrapper });

      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });

    it('should clear intervals on logout', async () => {
      const mockToken = createMockJWT();
      mockAuthService.getToken.mockReturnValue(mockToken);
      mockAuthService.getCurrentUser.mockReturnValue(mockUser);
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockAuthService.logout.mockResolvedValue();

      const wrapper = createWrapper(mockAuthService);
      const { result } = renderHook(() => useAuth(), { wrapper });

      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      await act(async () => {
        await result.current.logout();
      });

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });
});