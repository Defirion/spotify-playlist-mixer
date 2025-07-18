import { IAuthService, IStorageService } from '../types/services';
import { User, AuthResult } from '../types';
import { createAuthError, AuthError } from '../types/errors';

export class AuthService implements IAuthService {
  private static readonly TOKEN_KEY = 'spotify_access_token';
  private static readonly USER_KEY = 'spotify_user';
  private static readonly TOKEN_EXPIRY_KEY = 'spotify_token_expiry';
  private static readonly REFRESH_TOKEN_KEY = 'spotify_refresh_token';
  
  private tokenExpirationCallbacks: (() => void)[] = [];
  private tokenExpirationTimer: NodeJS.Timeout | null = null;
  
  constructor(
    private storageService: IStorageService,
    private clientId: string,
    private redirectUri: string,
    private scopes: string[] = [
      'playlist-read-private',
      'playlist-read-collaborative', 
      'playlist-modify-public',
      'playlist-modify-private'
    ]
  ) {}

  async login(): Promise<AuthResult> {
    try {
      // Check if we already have a valid token
      const existingToken = this.getToken();
      if (existingToken && !this.isTokenExpired()) {
        const user = this.getCurrentUser();
        if (user) {
          return {
            token: existingToken,
            user,
            expiresIn: this.getTokenTimeRemaining()
          };
        }
      }

      // Redirect to Spotify authorization
      const authUrl = this.buildAuthUrl();
      window.location.href = authUrl;
      
      // This will never resolve as we redirect, but TypeScript needs a return
      throw createAuthError('Redirecting to Spotify authorization', 'LOGIN_FAILED');
    } catch (error) {
      throw this.handleAuthError(error, 'Failed to initiate login');
    }
  }

  async logout(): Promise<void> {
    try {
      this.clearTokenExpiredCallbacks();
      this.clearTokenExpirationTimer();
      
      this.storageService.removeItem(AuthService.TOKEN_KEY);
      this.storageService.removeItem(AuthService.USER_KEY);
      this.storageService.removeItem(AuthService.TOKEN_EXPIRY_KEY);
      this.storageService.removeItem(AuthService.REFRESH_TOKEN_KEY);
    } catch (error) {
      throw this.handleAuthError(error, 'Failed to logout');
    }
  }

  getToken(): string | null {
    try {
      const token = this.storageService.getItem<string>(AuthService.TOKEN_KEY);
      
      if (!token) {
        return null;
      }

      if (this.isTokenExpired()) {
        this.handleTokenExpiration();
        return null;
      }

      return token;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    return token !== null && !this.isTokenExpired();
  }

  getCurrentUser(): User | null {
    try {
      return this.storageService.getItem<User>(AuthService.USER_KEY);
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  async refreshToken(): Promise<string> {
    // Spotify implicit flow doesn't support refresh tokens
    // We need to re-authenticate
    return Promise.reject(createAuthError(
      'Token refresh not supported with implicit flow. Please re-authenticate.',
      'TOKEN_EXPIRED'
    ));
  }

  onTokenExpired(callback: () => void): void {
    this.tokenExpirationCallbacks.push(callback);
  }

  clearTokenExpiredCallbacks(): void {
    this.tokenExpirationCallbacks = [];
  }

  // Public method to handle token from URL hash (after redirect)
  handleAuthCallback(): AuthResult | null {
    try {
      const hash = window.location.hash;
      if (!hash) {
        return null;
      }

      const params = this.parseHashParams(hash);
      const accessToken = params.access_token;
      const expiresIn = parseInt(params.expires_in || '3600', 10);

      if (!accessToken) {
        return null;
      }

      // Calculate expiration time
      const expirationTime = Date.now() + (expiresIn * 1000);
      
      // Store token and expiration
      this.storageService.setItem(AuthService.TOKEN_KEY, accessToken);
      this.storageService.setItem(AuthService.TOKEN_EXPIRY_KEY, expirationTime);
      
      // Set up token expiration timer
      this.setupTokenExpirationTimer(expiresIn);
      
      // Clear the hash from URL
      window.location.hash = '';
      
      // We'll need to fetch user info separately since implicit flow doesn't provide it
      // For now, create a placeholder user that will be populated later
      const user: User = {
        id: 'unknown',
        displayName: 'Spotify User'
      };
      
      this.storageService.setItem(AuthService.USER_KEY, user);
      
      return {
        token: accessToken,
        user,
        expiresIn
      };
    } catch (error) {
      throw this.handleAuthError(error, 'Failed to handle auth callback');
    }
  }

  // Update user info after fetching from Spotify API
  updateUserInfo(user: User): void {
    this.storageService.setItem(AuthService.USER_KEY, user);
  }

  private buildAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'token',
      redirect_uri: this.redirectUri,
      scope: this.scopes.join(' '),
      show_dialog: 'true'
    });

    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  private parseHashParams(hash: string): Record<string, string> {
    return hash
      .substring(1)
      .split('&')
      .reduce((params, param) => {
        const [key, value] = param.split('=');
        params[key] = decodeURIComponent(value);
        return params;
      }, {} as Record<string, string>);
  }

  private isTokenExpired(): boolean {
    const expirationTime = this.storageService.getItem<number>(AuthService.TOKEN_EXPIRY_KEY);
    if (!expirationTime) {
      return true;
    }
    
    // Add 5 minute buffer to prevent edge cases
    const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
    return Date.now() >= (expirationTime - bufferTime);
  }

  private getTokenTimeRemaining(): number {
    const expirationTime = this.storageService.getItem<number>(AuthService.TOKEN_EXPIRY_KEY);
    if (!expirationTime) {
      return 0;
    }
    
    const remaining = Math.max(0, expirationTime - Date.now());
    return Math.floor(remaining / 1000); // Return in seconds
  }

  private setupTokenExpirationTimer(expiresIn: number): void {
    this.clearTokenExpirationTimer();
    
    // Set timer for 5 minutes before expiration
    const timerDelay = Math.max(0, (expiresIn - 300) * 1000); // 5 minutes before expiry
    
    this.tokenExpirationTimer = setTimeout(() => {
      this.handleTokenExpiration();
    }, timerDelay);
  }

  private clearTokenExpirationTimer(): void {
    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
      this.tokenExpirationTimer = null;
    }
  }

  private handleTokenExpiration(): void {
    // Notify all callbacks
    this.tokenExpirationCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in token expiration callback:', error);
      }
    });
    
    // Clear expired token
    this.storageService.removeItem(AuthService.TOKEN_KEY);
    this.storageService.removeItem(AuthService.TOKEN_EXPIRY_KEY);
    this.storageService.removeItem(AuthService.USER_KEY);
  }

  private handleAuthError(error: unknown, defaultMessage: string): AuthError {
    if (error instanceof Error) {
      return createAuthError(
        error.message || defaultMessage,
        'LOGIN_FAILED',
        { originalError: error }
      );
    }
    
    return createAuthError(defaultMessage, 'LOGIN_FAILED', { originalError: error });
  }
}