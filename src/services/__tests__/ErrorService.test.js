import { ErrorService } from '../ErrorService';
import { createNetworkError, createAuthError } from '../../types/errors';

// Mock console methods
const originalConsole = { ...console };
beforeAll(() => {
  console.error = jest.fn();
  console.log = jest.fn();
  console.group = jest.fn();
  console.groupEnd = jest.fn();
});

afterAll(() => {
  Object.assign(console, originalConsole);
});

describe('ErrorService', () => {
  let errorService;

  beforeEach(() => {
    errorService = new ErrorService();
    jest.clearAllMocks();
  });

  describe('Error Logging', () => {
    it('should log error with context', () => {
      const error = createNetworkError('Test error', 500, 'Server Error');
      const context = { component: 'TestComponent' };

      const errorId = errorService.logError(error, context);

      expect(errorId).toBeDefined();
      expect(errorService.getErrorHistory()).toHaveLength(1);
      expect(errorService.getErrorHistory()[0]).toMatchObject({
        ...error,
        context,
        id: errorId
      });
    });

    it('should notify error listeners', () => {
      const listener = jest.fn();
      errorService.addErrorListener(listener);

      const error = createNetworkError('Test error');
      errorService.logError(error);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          ...error,
          id: expect.any(String)
        })
      );
    });

    it('should maintain error history with size limit', () => {
      errorService.maxHistorySize = 3;

      // Add 5 errors
      for (let i = 0; i < 5; i++) {
        errorService.logError(createNetworkError(`Error ${i}`));
      }

      expect(errorService.getErrorHistory()).toHaveLength(3);
      // Should keep the most recent errors
      expect(errorService.getErrorHistory()[0].message).toBe('Error 4');
      expect(errorService.getErrorHistory()[2].message).toBe('Error 2');
    });
  });

  describe('User-Friendly Messages', () => {
    it('should return appropriate message for network errors', () => {
      const networkError = createNetworkError('Network failed', 500);
      const message = errorService.getUserFriendlyMessage(networkError);
      expect(message).toBe('Server is temporarily unavailable. Please try again in a few moments.');
    });

    it('should return appropriate message for auth errors', () => {
      const authError = createAuthError('Token expired', 'TOKEN_EXPIRED');
      const message = errorService.getUserFriendlyMessage(authError);
      expect(message).toBe('Your session has expired. Please log in again.');
    });

    it('should return generic message for unknown errors', () => {
      const unknownError = { type: 'UNKNOWN', message: 'Unknown error' };
      const message = errorService.getUserFriendlyMessage(unknownError);
      expect(message).toBe('An unexpected error occurred. Please try again.');
    });
  });

  describe('Retry Mechanism', () => {
    it('should retry operation with exponential backoff', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(createNetworkError('First failure', 500))
        .mockRejectedValueOnce(createNetworkError('Second failure', 500))
        .mockResolvedValueOnce('Success');

      const result = await errorService.retryOperation(operation, 'NETWORK');

      expect(result).toBe('Success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should stop retrying after max attempts', async () => {
      const persistentError = createNetworkError('Persistent failure', 500);
      const operation = jest.fn().mockRejectedValue(persistentError);

      await expect(
        errorService.retryOperation(operation, 'NETWORK')
      ).rejects.toEqual(persistentError);

      expect(operation).toHaveBeenCalledTimes(4); // Initial + 3 retries
    }, 10000);

    it('should not retry client errors', async () => {
      const clientError = createNetworkError('Bad request', 400);
      const operation = jest.fn().mockRejectedValue(clientError);

      await expect(
        errorService.retryOperation(operation, 'NETWORK')
      ).rejects.toEqual(clientError);

      expect(operation).toHaveBeenCalledTimes(1); // No retries for 4xx errors
    });

    it('should use custom retry strategy', async () => {
      const customStrategy = {
        maxRetries: 1,
        baseDelay: 100,
        shouldRetry: () => true
      };

      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValueOnce('Success');

      const result = await errorService.retryOperation(operation, 'NETWORK', customStrategy);

      expect(result).toBe('Success');
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Factory Methods', () => {
    it('should create and log network error', () => {
      const error = errorService.createAndLogNetworkError(
        'Network error',
        500,
        'Server Error',
        { details: 'test' },
        { component: 'Test' }
      );

      expect(error.type).toBe('NETWORK');
      expect(error.message).toBe('Network error');
      expect(error.status).toBe(500);
      expect(errorService.getErrorHistory()).toHaveLength(1);
    });

    it('should create and log auth error', () => {
      const error = errorService.createAndLogAuthError(
        'Auth failed',
        'TOKEN_EXPIRED',
        { token: 'expired' }
      );

      expect(error.type).toBe('AUTH');
      expect(error.reason).toBe('TOKEN_EXPIRED');
      expect(errorService.getErrorHistory()).toHaveLength(1);
    });
  });

  describe('Spotify API Error Handling', () => {
    it('should handle 401 unauthorized error', async () => {
      const spotifyError = {
        response: {
          status: 401,
          data: { error: 'Unauthorized' }
        }
      };

      const error = await errorService.handleSpotifyAPIError(
        spotifyError,
        '/me/playlists',
        'GET'
      );

      expect(error.type).toBe('AUTH');
      expect(error.reason).toBe('UNAUTHORIZED');
    });

    it('should handle 429 rate limit error', async () => {
      const spotifyError = {
        response: {
          status: 429,
          headers: { 'retry-after': '60' },
          statusText: 'Too Many Requests'
        }
      };

      const error = await errorService.handleSpotifyAPIError(
        spotifyError,
        '/me/playlists',
        'GET'
      );

      expect(error.type).toBe('NETWORK');
      expect(error.status).toBe(429);
      expect(error.details.retryAfter).toBe('60');
    });

    it('should handle server errors', async () => {
      const spotifyError = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: { error: 'Server error' }
        }
      };

      const error = await errorService.handleSpotifyAPIError(
        spotifyError,
        '/me/playlists',
        'GET'
      );

      expect(error.type).toBe('NETWORK');
      expect(error.status).toBe(500);
    });
  });

  describe('Error Listeners', () => {
    it('should add and remove error listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      const removeListener1 = errorService.addErrorListener(listener1);
      const removeListener2 = errorService.addErrorListener(listener2);

      errorService.logError(createNetworkError('Test'));

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();

      // Remove first listener
      removeListener1();
      jest.clearAllMocks();

      errorService.logError(createNetworkError('Test 2'));

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();

      // Remove second listener
      removeListener2();
    });

    it('should handle listener errors gracefully', () => {
      const faultyListener = jest.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      const goodListener = jest.fn();

      errorService.addErrorListener(faultyListener);
      errorService.addErrorListener(goodListener);

      // Should not throw even if listener fails
      expect(() => {
        errorService.logError(createNetworkError('Test'));
      }).not.toThrow();

      expect(goodListener).toHaveBeenCalled();
    });
  });

  describe('Error Statistics', () => {
    it('should provide error statistics', () => {
      errorService.logError(createNetworkError('Network 1'));
      errorService.logError(createNetworkError('Network 2'));
      errorService.logError(createAuthError('Auth 1', 'TOKEN_EXPIRED'));

      const stats = errorService.getErrorStats();

      expect(stats.total).toBe(3);
      expect(stats.byType.NETWORK).toBe(2);
      expect(stats.byType.AUTH).toBe(1);
      expect(stats.recent).toHaveLength(3);
    });
  });

  describe('Utility Methods', () => {
    it('should generate unique error IDs', () => {
      const id1 = errorService.generateErrorId();
      const id2 = errorService.generateErrorId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^error_\d+_[a-z0-9]+$/);
    });

    it('should implement delay', async () => {
      const start = Date.now();
      await errorService.delay(100);
      const end = Date.now();

      expect(end - start).toBeGreaterThanOrEqual(90); // Allow some variance
    });
  });
});