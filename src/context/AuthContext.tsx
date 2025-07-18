import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AuthState, User, AuthResult } from '../types';
import { IAuthService } from '../types/services';
import { createAuthError } from '../types/errors';

// Auth Actions
export type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGIN_FAILURE'; payload: { error: string } }
  | { type: 'LOGOUT_START' }
  | { type: 'LOGOUT_SUCCESS' }
  | { type: 'LOGOUT_FAILURE'; payload: { error: string } }
  | { type: 'TOKEN_REFRESH_START' }
  | { type: 'TOKEN_REFRESH_SUCCESS'; payload: { token: string } }
  | { type: 'TOKEN_REFRESH_FAILURE'; payload: { error: string } }
  | { type: 'SET_AUTHENTICATED'; payload: { user: User; token: string } }
  | { type: 'SET_UNAUTHENTICATED' }
  | { type: 'CLEAR_ERROR' };

// Auth Context Interface
interface AuthContextType {
  state: AuthState;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  clearError: () => void;
  checkAuthStatus: () => void;
}

// Initial state
const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
};

// Auth reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        isLoading: true,
        error: undefined,
      };
    
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: undefined,
      };
    
    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload.error,
      };
    
    case 'LOGOUT_START':
      return {
        ...state,
        isLoading: true,
        error: undefined,
      };
    
    case 'LOGOUT_SUCCESS':
      return {
        ...initialState,
        isLoading: false,
      };
    
    case 'LOGOUT_FAILURE':
      return {
        ...state,
        isLoading: false,
        error: action.payload.error,
      };
    
    case 'TOKEN_REFRESH_START':
      return {
        ...state,
        isLoading: true,
        error: undefined,
      };
    
    case 'TOKEN_REFRESH_SUCCESS':
      return {
        ...state,
        token: action.payload.token,
        isLoading: false,
        error: undefined,
      };
    
    case 'TOKEN_REFRESH_FAILURE':
      return {
        ...state,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload.error,
      };
    
    case 'SET_AUTHENTICATED':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: undefined,
      };
    
    case 'SET_UNAUTHENTICATED':
      return {
        ...initialState,
        isLoading: false,
      };
    
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: undefined,
      };
    
    default:
      return state;
  }
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth Provider Props
interface AuthProviderProps {
  children: ReactNode;
  authService: IAuthService;
}

// Auth Provider Component
export function AuthProvider({ children, authService }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check authentication status on mount and handle auth callbacks
  useEffect(() => {
    checkAuthStatus();
    
    // Set up token expiration callback
    authService.onTokenExpired(() => {
      dispatch({ type: 'SET_UNAUTHENTICATED' });
    });

    // Cleanup on unmount
    return () => {
      authService.clearTokenExpiredCallbacks();
    };
  }, [authService]);

  const checkAuthStatus = () => {
    try {
      // Check if we have a valid token
      const token = authService.getToken();
      const user = authService.getCurrentUser();
      
      if (token && user && authService.isAuthenticated()) {
        dispatch({
          type: 'SET_AUTHENTICATED',
          payload: { user, token }
        });
      } else {
        // Check for auth callback in URL (after Spotify redirect)
        const authResult = (authService as any).handleAuthCallback?.();
        if (authResult) {
          dispatch({
            type: 'SET_AUTHENTICATED',
            payload: { user: authResult.user, token: authResult.token }
          });
        } else {
          dispatch({ type: 'SET_UNAUTHENTICATED' });
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      dispatch({ type: 'SET_UNAUTHENTICATED' });
    }
  };

  const login = async (): Promise<void> => {
    try {
      dispatch({ type: 'LOGIN_START' });
      
      const result: AuthResult = await authService.login();
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          user: result.user,
          token: result.token
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: { error: errorMessage }
      });
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      dispatch({ type: 'LOGOUT_START' });
      
      await authService.logout();
      
      dispatch({ type: 'LOGOUT_SUCCESS' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Logout failed';
      dispatch({
        type: 'LOGOUT_FAILURE',
        payload: { error: errorMessage }
      });
      throw error;
    }
  };

  const refreshToken = async (): Promise<void> => {
    try {
      dispatch({ type: 'TOKEN_REFRESH_START' });
      
      const newToken = await authService.refreshToken();
      
      dispatch({
        type: 'TOKEN_REFRESH_SUCCESS',
        payload: { token: newToken }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Token refresh failed';
      dispatch({
        type: 'TOKEN_REFRESH_FAILURE',
        payload: { error: errorMessage }
      });
      throw error;
    }
  };

  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const contextValue: AuthContextType = {
    state,
    login,
    logout,
    refreshToken,
    clearError,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

export default AuthContext;