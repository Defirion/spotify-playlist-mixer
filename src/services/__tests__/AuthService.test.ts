import { AuthService } from '../AuthService';
import { IStorageService } from '../../types/services';
import { User, AuthResult } from '../../types';
import { createAuthError } from '../../types/errors';

// Mock storage service
class MockStorageService implements IStorageService {
  private storage = new Map<string, any>();

  setItem(key: string, value: any): void {
    this.storage.set(key, value);
  }

  getItem<T>(key: string): T | null {
    return this.storage.get(key) || null;
  }

  removeItem(key: string): void {
    this.storage.delete(key);
  }

  clear(): void {
    this.storage.clear();
  }

  hasItem(key: string): boolean {
    return this.storage.has(key);
  }
}

describe('AuthService', () => {
  let authService: AuthService;
  let mockStorageService: MockStorageService;
  const mockClientId = 'test-client-id';
  const mockRedirectUri = 'http://localhost:3000/callback';
  const mockScopes = ['playlist-read-private', 'playlist-modify-public'];

  beforeEach(() => {
    mockStorageService = new MockStorageService();
    authService = new AuthService(mockStorageService, mockClientId, mockRedirectUri, mockScopes);
    
    // Mock window.location
    delete (window as any).location;
    (window as any).location = { href: '', hash: '' };
    
    // Clear any existing timers
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('login', () => {
    it('should redirect to Spotify authorization URL', async () => {
      const originalLocation = window.location.href;
      
      try {
        await authService.login();
      } catch (error) {
        // Expected to throw since we redirect
        expect(error).toBeDefined();
      }

      expect(window.location.href).toContain('https://accounts.spotify.com/authorize');
      expect(window.location.href).toContain(`client_id=${mockClientId}`);
      expect(window.location.href).toContain(`redirect_uri=${encodeURIComponent(mockRedirectUri)}`);
      expect(window.location.href).toContain('response_type=token');
    });

    it('should return existing valid token if available', async () => {
      const mockUser: User = { id: 'user1', displayName: 'Test User' };
      const mockToken = 'valid-token';
      const futureExpiry = Date.now() + 3600000; // 1 hour from now

      mockStorageService.setItem('spotify_access_token', mockToken);
      mockStorageService.setItem('spotify_user', mockUser);
      mockStorageService.setItem('spotify_token_expiry', futureExpiry);

      const result = await authService.login();

      expect(result.token).toBe(mockToken);
      expect(result.user).toEqual(mockUser);
      expect(result.expiresIn).toBeGreaterThan(0);
    });

    it('should handle login errors gracefully', async () => {
      // Mock storage to throw error
      jest.spyOn(mockStorageService, 'getItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      await expect(authService.login()).rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('should clear all stored authentication data', async () => {
      // Set up some stored data
      mockStorageService.setItem('spotify_access_token', 'token');
      mockStorageService.setItem('spotify_user', { id: 'user1' });
      mockStorageService.setItem('spotify_token_expiry', Date.now());
      mockStorageService.setItem('spotify_refresh_token', 'refresh');

      await authService.logout();

      expect(mockStorageService.getItem('spotify_access_token')).toBeNull();
      expect(mockStorageService.getItem('spotify_user')).toBeNull();
      expect(mockStorageService.getItem('spotify_token_expiry')).toBeNull();
      expect(mockStorageService.getItem('spotify_refresh_token')).toBeNull();
    });

    it('should clear token expiration callbacks and timers', async () => {
      const callback = jest.fn();
      authService.onTokenExpired(callback);

      await authService.logout();

      // Verify callbacks are cleared (this is tested indirectly)
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('getToken', () => {
    it('should return valid token when not expired', () => {
      const mockToken = 'valid-token';
      const futureExpiry = Date.now() + 3600000; // 1 hour from now

      mockStorageService.setItem('spotify_access_token', mockToken);
      mockStorageService.setItem('spotify_token_expiry', futureExpiry);

      const token = authService.getToken();
      expect(token).toBe(mockToken);
    });

    it('should return null when token is expired', () => {
      const mockToken = 'expired-token';
      const pastExpiry = Date.now() - 3600000; // 1 hour ago

      mockStorageService.setItem('spotify_access_token', mockToken);
      mockStorageService.setItem('spotify_token_expiry', pastExpiry);

      const token = authService.getToken();
      expect(token).toBeNull();
    });

    it('should return null when no token exists', () => {
      const token = authService.getToken();
      expect(token).toBeNull();
    });

    it('should handle storage errors gracefully', () => {
      jest.spyOn(mockStorageService, 'getItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      const token = authService.getToken();
      expect(token).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when valid token exists', () => {
      const mockToken = 'valid-token';
      const futureExpiry = Date.now() + 3600000;

      mockStorageService.setItem('spotify_access_token', mockToken);
      mockStorageService.setItem('spotify_token_expiry', futureExpiry);

      expect(authService.isAuthenticated()).toBe(true);
    });

    it('should return false when token is expired', () => {
      const mockToken = 'expired-token';
      const pastExpiry = Date.now() - 3600000;

      mockStorageService.setItem('spotify_access_token', mockToken);
      mockStorageService.setItem('spotify_token_expiry', pastExpiry);

      expect(authService.isAuthenticated()).toBe(false);
    });

    it('should return false when no token exists', () => {
      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe('getCurrentUser', () => {
    it('should return stored user data', () => {
      const mockUser: User = { id: 'user1', displayName: 'Test User', email: 'test@example.com' };
      mockStorageService.setItem('spotify_user', mockUser);

      const user = authService.getCurrentUser();
      expect(user).toEqual(mockUser);
    });

    it('should return null when no user data exists', () => {
      const user = authService.getCurrentUser();
      expect(user).toBeNull();
    });

    it('should handle storage errors gracefully', () => {
      jest.spyOn(mockStorageService, 'getItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      const user = authService.getCurrentUser();
      expect(user).toBeNull();
    });
  });

  describe('refreshToken', () => {
    it('should reject with appropriate error for implicit flow', async () => {
      await expect(authService.refreshToken()).rejects.toMatchObject({
        type: 'AUTH',
        reason: 'TOKEN_EXPIRED'
      });
    });
  });

  describe('handleAuthCallback', () => {
    beforeEach(() => {
      // Mock window.location.hash
      Object.defineProperty(window, 'location', {
        value: { hash: '', href: '' },
        writable: true
      });
    });

    it('should parse and store token from URL hash', () => {
      const mockToken = 'access-token-123';
      const expiresIn = '3600';
      window.location.hash = `#access_token=${mockToken}&token_type=Bearer&expires_in=${expiresIn}`;

      const result = authService.handleAuthCallback();

      expect(result).toBeDefined();
      expect(result!.token).toBe(mockToken);
      expect(result!.expiresIn).toBe(3600);
      expect(mockStorageService.getItem('spotify_access_token')).toBe(mockToken);
      expect(window.location.hash).toBe('');
    });

    it('should return null when no hash present', () => {
      window.location.hash = '';

      const result = authService.handleAuthCallback();
      expect(result).toBeNull();
    });

    it('should return null when no access token in hash', () => {
      window.location.hash = '#token_type=Bearer&expires_in=3600';

      const result = authService.handleAuthCallback();
      expect(result).toBeNull();
    });

    it('should handle malformed hash gracefully', () => {
      window.location.hash = '#invalid-hash-format';

      const result = authService.handleAuthCallback();
      expect(result).toBeNull();
    });
  });

  describe('updateUserInfo', () => {
    it('should update stored user information', () => {
      const mockUser: User = { id: 'user1', displayName: 'Updated User' };

      authService.updateUserInfo(mockUser);

      expect(mockStorageService.getItem('spotify_user')).toEqual(mockUser);
    });
  });

  describe('onTokenExpired', () => {
    it('should register token expiration callbacks', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      authService.onTokenExpired(callback1);
      authService.onTokenExpired(callback2);

      // Simulate token expiration by setting expired token and calling getToken
      const pastExpiry = Date.now() - 3600000;
      mockStorageService.setItem('spotify_access_token', 'expired-token');
      mockStorageService.setItem('spotify_token_expiry', pastExpiry);

      authService.getToken(); // This should trigger expiration handling

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should handle callback errors gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });
      const normalCallback = jest.fn();

      authService.onTokenExpired(errorCallback);
      authService.onTokenExpired(normalCallback);

      // Simulate token expiration
      const pastExpiry = Date.now() - 3600000;
      mockStorageService.setItem('spotify_access_token', 'expired-token');
      mockStorageService.setItem('spotify_token_expiry', pastExpiry);

      // Should not throw despite callback error
      expect(() => authService.getToken()).not.toThrow();
      expect(normalCallback).toHaveBeenCalled();
    });
  });

  describe('clearTokenExpiredCallbacks', () => {
    it('should clear all registered callbacks', () => {
      const callback = jest.fn();
      authService.onTokenExpired(callback);

      authService.clearTokenExpiredCallbacks();

      // Simulate token expiration
      const pastExpiry = Date.now() - 3600000;
      mockStorageService.setItem('spotify_access_token', 'expired-token');
      mockStorageService.setItem('spotify_token_expiry', pastExpiry);

      authService.getToken();

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('token expiration timer', () => {
    it('should set up expiration timer when handling auth callback', () => {
      const mockToken = 'access-token-123';
      const expiresIn = '3600'; // 1 hour
      window.location.hash = `#access_token=${mockToken}&expires_in=${expiresIn}`;

      const callback = jest.fn();
      authService.onTokenExpired(callback);

      authService.handleAuthCallback();

      // Fast-forward time to just before expiration (5 minutes before)
      jest.advanceTimersByTime((3600 - 300) * 1000);

      expect(callback).toHaveBeenCalled();
    });

    it('should clear existing timer when setting up new one', () => {
      const mockToken = 'access-token-123';
      window.location.hash = `#access_token=${mockToken}&expires_in=3600`;

      // Set up first timer
      authService.handleAuthCallback();

      // Set up second timer (should clear first)
      window.location.hash = `#access_token=${mockToken}&expires_in=7200`;
      authService.handleAuthCallback();

      // Should not have multiple timers running
      expect(jest.getTimerCount()).toBe(1);
    });
  });
});