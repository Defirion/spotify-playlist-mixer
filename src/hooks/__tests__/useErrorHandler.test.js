import { renderHook, act } from '@testing-library/react';
import useErrorHandler from '../useErrorHandler';
import errorService from '../../services/ErrorService';
import { createNetworkError, createAuthError } from '../../types/errors';

// Mock the ErrorService
jest.mock('../../services/ErrorService', () => ({
  addErrorListener: jest.fn(),
  logError: jest.fn(),
  retryOperation: jest.fn(),
  getUserFriendlyMessage: jest.fn(),
  createAndLogNetworkError: jest.fn(),
  createAndLogAuthError: jest.fn(),
  createAndLogValidationError: jest.fn(),
  createAndLogAPIError: jest.fn(),
  handleSpotifyAPIError: jest.fn()
}));

describe('useErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with empty errors array', () => {
    const { result } = renderHook(() => useErrorHandler());

    expect(result.current.errors).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('should add error listener on mount', () => {
    const mockRemoveListener = jest.fn();
    errorService.addErrorListener.mockReturnValue(mockRemoveListener);

    const { unmount } = renderHook(() => useErrorHandler());

    expect(errorService.addErrorListener).toHaveBeenCalledWith(expect.any(Function));

    // Test cleanup
    unmount();
    expect(mockRemoveListener).toHaveBeenCalled();
  });

  it('should handle errors from error service', () => {
    let errorListener;
    errorService.addErrorListener.mockImplementation((listener) => {
      errorListener = listener;
      return jest.fn();
    });

    const { result } = renderHook(() => useErrorHandler());

    const testError = createNetworkError('Test error');
    
    act(() => {
      errorListener(testError);
    });

    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0]).toEqual(testError);
  });

  it('should limit errors to 5 most recent', () => {
    let errorListener;
    errorService.addErrorListener.mockImplementation((listener) => {
      errorListener = listener;
      return jest.fn();
    });

    const { result } = renderHook(() => useErrorHandler());

    // Add 7 errors
    act(() => {
      for (let i = 0; i < 7; i++) {
        errorListener(createNetworkError(`Error ${i}`));
      }
    });

    expect(result.current.errors).toHaveLength(5);
    expect(result.current.errors[0].message).toBe('Error 6'); // Most recent first
  });

  it('should handle error logging', async () => {
    errorService.logError.mockReturnValue('error_123');

    const { result } = renderHook(() => useErrorHandler());
    const testError = createNetworkError('Test error');
    const context = { component: 'TestComponent' };

    let errorId;
    await act(async () => {
      errorId = await result.current.handleError(testError, context);
    });

    expect(errorService.logError).toHaveBeenCalledWith(testError, context);
    expect(errorId).toBe('error_123');
  });

  it('should handle retry operations', async () => {
    const mockOperation = jest.fn().mockResolvedValue('success');
    errorService.retryOperation.mockResolvedValue('success');

    const { result } = renderHook(() => useErrorHandler());

    let operationResult;
    await act(async () => {
      operationResult = await result.current.retryOperation(mockOperation, 'NETWORK');
    });

    expect(errorService.retryOperation).toHaveBeenCalledWith(mockOperation, 'NETWORK', null);
    expect(operationResult).toBe('success');
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle retry operation failures', async () => {
    const mockOperation = jest.fn();
    const testError = createNetworkError('Operation failed');
    errorService.retryOperation.mockRejectedValue(testError);
    errorService.logError.mockReturnValue('error_123');

    const { result } = renderHook(() => useErrorHandler());

    await act(async () => {
      try {
        await result.current.retryOperation(mockOperation, 'NETWORK');
      } catch (error) {
        expect(error).toBe(testError);
      }
    });

    expect(errorService.logError).toHaveBeenCalledWith(
      testError,
      { operation: mockOperation.name }
    );
    expect(result.current.isLoading).toBe(false);
  });

  it('should get user-friendly messages', () => {
    const testError = createNetworkError('Network error');
    errorService.getUserFriendlyMessage.mockReturnValue('Friendly message');

    const { result } = renderHook(() => useErrorHandler());
    const message = result.current.getUserFriendlyMessage(testError);

    expect(errorService.getUserFriendlyMessage).toHaveBeenCalledWith(testError);
    expect(message).toBe('Friendly message');
  });

  it('should clear specific errors', () => {
    let errorListener;
    errorService.addErrorListener.mockImplementation((listener) => {
      errorListener = listener;
      return jest.fn();
    });

    const { result } = renderHook(() => useErrorHandler());

    const error1 = { ...createNetworkError('Error 1'), id: 'error_1' };
    const error2 = { ...createNetworkError('Error 2'), id: 'error_2' };

    act(() => {
      errorListener(error1);
      errorListener(error2);
    });

    expect(result.current.errors).toHaveLength(2);

    act(() => {
      result.current.clearError('error_1');
    });

    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0].id).toBe('error_2');
  });

  it('should clear all errors', () => {
    let errorListener;
    errorService.addErrorListener.mockImplementation((listener) => {
      errorListener = listener;
      return jest.fn();
    });

    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      errorListener(createNetworkError('Error 1'));
      errorListener(createNetworkError('Error 2'));
    });

    expect(result.current.errors).toHaveLength(2);

    act(() => {
      result.current.clearAllErrors();
    });

    expect(result.current.errors).toHaveLength(0);
  });

  it('should create network errors', () => {
    const mockError = createNetworkError('Network error');
    errorService.createAndLogNetworkError.mockReturnValue(mockError);

    const { result } = renderHook(() => useErrorHandler());
    const error = result.current.createNetworkError('Network error', 500, 'Server Error');

    expect(errorService.createAndLogNetworkError).toHaveBeenCalledWith(
      'Network error',
      500,
      'Server Error',
      undefined,
      {}
    );
    expect(error).toBe(mockError);
  });

  it('should handle Spotify errors', async () => {
    const mockError = createAuthError('Spotify error', 'UNAUTHORIZED');
    errorService.handleSpotifyAPIError.mockResolvedValue(mockError);

    const { result } = renderHook(() => useErrorHandler());
    const spotifyError = { response: { status: 401 } };

    let handledError;
    await act(async () => {
      handledError = await result.current.handleSpotifyError(
        spotifyError,
        '/me/playlists',
        'GET'
      );
    });

    expect(errorService.handleSpotifyAPIError).toHaveBeenCalledWith(
      spotifyError,
      '/me/playlists',
      'GET'
    );
    expect(handledError).toBe(mockError);
  });
});