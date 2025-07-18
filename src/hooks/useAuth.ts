import { useContext, useEffect, useRef, useCallback } from 'react';
import AuthContext from '../context/AuthContext';
import { AuthState, User } from '../types';

// Extended auth hook interface with additional functionality
export interface UseAuthReturn {
  // State
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error?: string;
  
  // Actions
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  clearError: () => void;
  
  // Status monitoring
  checkAuthStatus: () => void;
  isTokenExpired: () => boolean;
  getTokenExpirationTime: () => Date | null;
  
  // Utility methods
  requireAuth: () => boolean;
  withAuth: <T>(callback: () => T) => T | null;
}

// Token refresh interval (15 minutes)
const TOKEN_REFRESH_INTERVAL = 15 * 60 * 1000;

// Token expiration check interval (1 minute)
const TOKEN_CHECK_INTERVAL = 60 * 1000;

/**
 * Enhanced useAuth hook that provides comprehensive authentication management
 * with automatic token refresh, status monitoring, and proper cleanup
 */
export function useAuth(): UseAuthReturn {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  const { state, login, logout, refreshToken, clearError, checkAuthStatus } = context;
  
  // Refs for cleanup and interval management
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);

  // Parse JWT token to get expiration time
  const parseTokenExpiration = useCallback((token: string): Date | null => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp ? new Date(payload.exp * 1000) : null;
    } catch (error) {
      console.warn('Failed to parse token expiration:', error);
      return null;
    }
  }, []);

  // Check if token is expired or will expire soon (within 5 minutes)
  const isTokenExpired = useCallback((): boolean => {
    if (!state.token) return true;
    
    const expirationTime = parseTokenExpiration(state.token);
    if (!expirationTime) return false; // If we can't parse, assume it's valid
    
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
    
    return expirationTime <= fiveMinutesFromNow;
  }, [state.token, parseTokenExpiration]);

  // Get token expiration time
  const getTokenExpirationTime = useCallback((): Date | null => {
    if (!state.token) return null;
    return parseTokenExpiration(state.token);
  }, [state.token, parseTokenExpiration]);

  // Automatic token refresh logic
  const handleTokenRefresh = useCallback(async () => {
    if (isUnmountedRef.current) return;
    
    if (state.isAuthenticated && state.token && isTokenExpired()) {
      try {
        await refreshToken();
      } catch (error) {
        console.error('Automatic token refresh failed:', error);
        // Don't throw here as this is background refresh
      }
    }
  }, [state.isAuthenticated, state.token, isTokenExpired, refreshToken]);

  // Authentication status monitoring
  const monitorAuthStatus = useCallback(() => {
    if (isUnmountedRef.current) return;
    
    // Check if token is expired and user should be logged out
    if (state.isAuthenticated && state.token && isTokenExpired()) {
      const expirationTime = parseTokenExpiration(state.token);
      const now = new Date();
      
      // If token is actually expired (not just within 5 minutes), logout
      if (expirationTime && expirationTime <= now) {
        console.warn('Token expired, logging out user');
        logout().catch(error => {
          console.error('Failed to logout expired user:', error);
        });
      }
    }
  }, [state.isAuthenticated, state.token, isTokenExpired, parseTokenExpiration, logout]);

  // Set up automatic token refresh and status monitoring
  useEffect(() => {
    if (state.isAuthenticated && state.token) {
      // Set up token refresh interval
      refreshIntervalRef.current = setInterval(handleTokenRefresh, TOKEN_REFRESH_INTERVAL);
      
      // Set up status monitoring interval
      checkIntervalRef.current = setInterval(monitorAuthStatus, TOKEN_CHECK_INTERVAL);
    }

    // Cleanup intervals when authentication state changes
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [state.isAuthenticated, state.token, handleTokenRefresh, monitorAuthStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, []);

  // Utility method to require authentication
  const requireAuth = useCallback((): boolean => {
    if (!state.isAuthenticated) {
      throw new Error('Authentication required');
    }
    return true;
  }, [state.isAuthenticated]);

  // Utility method to execute callback only if authenticated
  const withAuth = useCallback(<T>(callback: () => T): T | null => {
    if (state.isAuthenticated) {
      return callback();
    }
    return null;
  }, [state.isAuthenticated]);

  // Enhanced login with automatic monitoring setup
  const enhancedLogin = useCallback(async (): Promise<void> => {
    await login();
    // Monitoring will be set up automatically via useEffect
  }, [login]);

  // Enhanced logout with cleanup
  const enhancedLogout = useCallback(async (): Promise<void> => {
    // Clear intervals before logout
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
    
    await logout();
  }, [logout]);

  return {
    // State
    user: state.user,
    token: state.token,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,
    
    // Actions
    login: enhancedLogin,
    logout: enhancedLogout,
    refreshToken,
    clearError,
    
    // Status monitoring
    checkAuthStatus,
    isTokenExpired,
    getTokenExpirationTime,
    
    // Utility methods
    requireAuth,
    withAuth,
  };
}

export default useAuth;