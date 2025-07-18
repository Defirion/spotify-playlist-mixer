import { AuthService } from '../AuthService';
import { StorageService } from '../StorageService';
import { IStorageService } from '../../types/services';
import { User } from '../../types';

// Mock storage for testing
class MockStorageService implements IStorageService {
  private storage: Map<string, any> = new Map();

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

// Mock window.location
const mockLocation = {
  href: '',
  hash: ''
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true
});

describe('AuthService', () => {
  let authService: AuthService;
  let mockStorage: MockStorageService;
  
  const mockClientId = 'test-client-id';
  const mockRedirectUri = 'http://localhost:3000';
  const mockScopes = ['playlist-read-private', 'playlist-modify-public'];

  beforeEach(() => {
    mockStorage = new MockStorageService();
    authService = new AuthService(mockStorage, mockClientId, mockRedirectUri, mockScopes);
    mockLocation.href = '';
    mockLocation.hash = '';
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('login', () => {
    it('should redirect to Spotify authorization URL', async () => {
      try {
        await authService.login();
      } catch (error) {
        // Expected to throw since we redirect
        expect(error).toBeDefined();
      }

      expect(mockLocation.href).toContain('https://accounts.spotify.com/authorize');
      expect(mockLocation.href).toContain(`client_id=${mockClientId}`);
      expect(mockLocation.href).toContain(`redirect_uri=${encodeURIComponent(mockRedirectUri)}`);
      expect(mockLocation.href).toContain('response_type=token');
    });

    it('should return existing valid token if available', async () => {
      const mockUser: User = { id: 'user1', displayName: 'Test User' };
      const futureExpiry = Date.now() + 3600000; // 1 hour from now
      
      mockStorage.setItem('spotify_access_token', 'valid-token');
      mockStorage.setItem('spotify_user', mockUser);
      mockStorage.setItem('spotify_token_expiry', futureExpiry);

      const result = await authService.login();

      expect(result.token).toBe('valid-token');
      expect(result.user).toEqual(mockUser);
      expect(result.expiresIn).toBeGreaterThan(0);
    });
  });

  describe('logout', () => {
    it('should clear all stored authentication data', async () => {
      // Set up some stored data
      mockStorage.setItem('spotify_access_token', 'token');
      mockStorage.setItem('spotify_user', { id: 'user1', displayName: 'Test' });
      mockStorage.setItem('spotify_token_expiry', Date.now() + 3600000);

      await authService.logout();

      expect(mockStorage.getItem('spotify_access_token')).toBeNull();
      expect(mockStorage.getItem('spotify_user')).toBeNull();
      expect(mockStorage.getItem('spotify_token_expiry')).toBeNull();
    });

    it('should clear token expiration callbacks', async () => {
      const callback = jest.fn();
      authService.onTokenExpired(callback);

      await authService.logout();

      // Simulate token expiration - callback should not be called
      authService['handleTokenExpiration']();
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('getToken', () => {
    it('should return null when no token is stored', () => {
      expect(authService.getToken()).toBeNull();
    });

    it('should return token when valid token exists', () => {
      const futureExpiry = Date.now() + 3600000;
      mockStorage.setItem('spotify_access_token', 'valid-token');
      mockStorage.setItem('spotify_token_expiry', futureExpiry);

      expect(authService.getToken()).toBe('valid-token');
    });

    it('should return null and handle expiration when token is expired', () => {
      const pastExpiry = Date.now() - 1000; // 1 second ago
      mockStorage.setItem('spotify_access_token', 'expired-token');
      mockStorage.setItem('spotify_token_expiry', pastExpiry);

      expect(authService.getToken()).toBeNull();
      expect(mockStorage.getItem('spotify_access_token')).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return false when no token exists', () => {
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('should return true when valid token exists', () => {
      const futureExpiry = Date.now() + 3600000;
      mockStorage.setItem('spotify_access_token', 'valid-token');
      mockStorage.setItem('spotify_token_expiry', futureExpiry);

      expect(authService.isAuthenticated()).toBe(true);
    });

    it('should return false when token is expired', () => {
      const pastExpiry = Date.now() - 1000;
      mockStorage.setItem('spotify_access_token', 'expired-token');
      mockStorage.setItem('spotify_token_expiry', pastExpiry);

      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe('getCurrentUser', () => {
    it('should return null when no user is stored', () => {
      expect(authService.getCurrentUser()).toBeNull();
    });

    it('should return stored user', () => {
      const mockUser: User = { id: 'user1', displayName: 'Test User', email: 'test@example.com' };
      mockStorage.setItem('spotify_user', mockUser);

      expect(authService.getCurrentUser()).toEqual(mockUser);
    });
  });

  describe('handleAuthCallback', () => {
    it('should return null when no hash is present', () => {
      mockLocation.hash = '';
      expect(authService.handleAuthCallback()).toBeNull();
    });

    it('should parse token from URL hash and store it', () => {
      mockLocation.hash = '#access_token=test-token&token_type=Bearer&expires_in=3600';
      
      const result = authService.handleAuthCallback();

      expect(result).toBeDefined();
      expect(result!.token).toBe('test-token');
      expect(result!.expiresIn).toBe(3600);
      expect(mockStorage.getItem('spotify_access_token')).toBe('test-token');
      expect(mockLocation.hash).toBe('');
    });

    it('should return null when no access token in hash', () => {
      mockLocation.hash = '#token_type=Bearer&expires_in=3600';
      
      expect(authService.handleAuthCallback()).toBeNull();
    });
  });

  describe('token expiration handling', () => {
    it('should call registered callbacks when token expires', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      authService.onTokenExpired(callback1);
      authService.onTokenExpired(callback2);

      // Simulate token expiration
      authService['handleTokenExpiration']();

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should clear callbacks when clearTokenExpiredCallbacks is called', () => {
      const callback = jest.fn();
      authService.onTokenExpired(callback);
      authService.clearTokenExpiredCallbacks();

      authService['handleTokenExpiration']();

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle callback errors gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });
      const normalCallback = jest.fn();
      
      authService.onTokenExpired(errorCallback);
      authService.onTokenExpired(normalCallback);

      // Should not throw
      expect(() => authService['handleTokenExpiration']()).not.toThrow();
      expect(normalCallback).toHaveBeenCalled();
    });
  });

  describe('updateUserInfo', () => {
    it('should update stored user information', () => {
      const user: User = { id: 'user1', displayName: 'Updated User', email: 'updated@example.com' };
      
      authService.updateUserInfo(user);

      expect(mockStorage.getItem('spotify_user')).toEqual(user);
    });
  });

  describe('refreshToken', () => {
    it('should throw error as refresh is not supported in implicit flow', async () => {
      await expect(authService.refreshToken()).rejects.toMatchObject({
        type: 'AUTH',
        message: expect.stringContaining('Token refresh not supported')
      });
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle storage errors gracefully in getToken', () => {
      const errorStorage = {
        ...mockStorage,
        getItem: jest.fn(() => {
          throw new Error('Storage error');
        })
      } as any;

      const authServiceWithErrorStorage = new AuthService(
        errorStorage,
        mockClientId,
        mockRedirectUri,
        mockScopes
      );

      expect(authServiceWithErrorStorage.getToken()).toBeNull();
    });

    it('should handle storage errors gracefully in getCurrentUser', () => {
      const errorStorage = {
        ...mockStorage,
        getItem: jest.fn(() => {
          throw new Error('Storage error');
        })
      } as any;

      const authServiceWithErrorStorage = new AuthService(
        errorStorage,
        mockClientId,
        mockRedirectUri,
        mockScopes
      );

      expect(authServiceWithErrorStorage.getCurrentUser()).toBeNull();
    });
  });
});