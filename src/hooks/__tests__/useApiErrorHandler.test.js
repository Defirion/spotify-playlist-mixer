import { renderHook, act } from '@testing-library/react';
import useApiErrorHandler from '../useApiErrorHandler';
import { ApiError, ERROR_TYPES } from '../../services/apiErrorHandler';

describe('useApiErrorHandler', () => {
  it('initializes with no error', () => {
    const { result } = renderHook(() => useApiErrorHandler());

    expect(result.current.error).toBeNull();
    expect(result.current.hasError).toBe(false);
    expect(result.current.isRetrying).toBe(false);
  });

  it('handles errors correctly', () => {
    const { result } = renderHook(() => useApiErrorHandler());
    const testError = new Error('Test error');
    testError.response = { status: 500 };

    act(() => {
      result.current.handleError(testError, { test: 'context' });
    });

    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(result.current.hasError).toBe(true);
    expect(result.current.error.type).toBe(ERROR_TYPES.SERVER_ERROR);
  });

  it('clears errors correctly', () => {
    const { result } = renderHook(() => useApiErrorHandler());
    const testError = new Error('Test error');

    act(() => {
      result.current.handleError(testError);
    });

    expect(result.current.hasError).toBe(true);

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.hasError).toBe(false);
    expect(result.current.isRetrying).toBe(false);
  });

  it('handles retry with successful function', async () => {
    const { result } = renderHook(() => useApiErrorHandler());
    const testError = new Error('Test error');
    const retryFn = jest.fn().mockResolvedValue('success');

    // Set initial error
    act(() => {
      result.current.handleError(testError);
    });

    expect(result.current.hasError).toBe(true);

    // Retry should clear error
    let retryResult;
    await act(async () => {
      retryResult = await result.current.retry(retryFn);
    });

    expect(retryFn).toHaveBeenCalled();
    expect(retryResult).toBe('success');
    expect(result.current.error).toBeNull();
    expect(result.current.hasError).toBe(false);
    expect(result.current.isRetrying).toBe(false);
  });

  it('handles retry with failing function', async () => {
    const { result } = renderHook(() => useApiErrorHandler());
    const initialError = new Error('Initial error');
    const retryError = new Error('Retry error');
    retryError.response = { status: 404 };
    const retryFn = jest.fn().mockRejectedValue(retryError);

    // Set initial error
    act(() => {
      result.current.handleError(initialError);
    });

    // Retry should set new error
    await act(async () => {
      try {
        await result.current.retry(retryFn);
      } catch (error) {
        // Expected to throw
      }
    });

    expect(retryFn).toHaveBeenCalled();
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(result.current.error.type).toBe(ERROR_TYPES.NOT_FOUND);
    expect(result.current.hasError).toBe(true);
    expect(result.current.isRetrying).toBe(false);
  });

  it('handles retry without function (just clears error)', async () => {
    const { result } = renderHook(() => useApiErrorHandler());
    const testError = new Error('Test error');

    // Set initial error
    act(() => {
      result.current.handleError(testError);
    });

    expect(result.current.hasError).toBe(true);

    // Retry without function should just clear error
    await act(async () => {
      await result.current.retry();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.hasError).toBe(false);
  });

  it('wraps API calls correctly', async () => {
    const { result } = renderHook(() => useApiErrorHandler());
    const mockApiCall = jest.fn().mockResolvedValue('success');

    const wrappedCall = result.current.wrapApiCall(mockApiCall, {
      test: 'context',
    });
    const callResult = await wrappedCall('arg1', 'arg2');

    expect(mockApiCall).toHaveBeenCalledWith('arg1', 'arg2');
    expect(callResult).toBe('success');
    expect(result.current.hasError).toBe(false);
  });

  it('wraps API calls with retry correctly', async () => {
    const { result } = renderHook(() => useApiErrorHandler());
    const networkError = new Error('Network Error');
    networkError.code = 'NETWORK_ERROR';

    const mockApiCall = jest
      .fn()
      .mockRejectedValueOnce(networkError)
      .mockResolvedValue('success');

    const wrappedCall = result.current.wrapApiCallWithRetry(mockApiCall);
    const callResult = await wrappedCall('arg1');

    expect(mockApiCall).toHaveBeenCalledTimes(2);
    expect(mockApiCall).toHaveBeenCalledWith('arg1');
    expect(callResult).toBe('success');
  });

  it('executes withRetry correctly', async () => {
    const { result } = renderHook(() => useApiErrorHandler());
    const networkError = new Error('Network Error');
    networkError.code = 'NETWORK_ERROR';

    const mockApiCall = jest
      .fn()
      .mockRejectedValueOnce(networkError)
      .mockResolvedValue('success');

    let callResult;
    await act(async () => {
      callResult = await result.current.withRetry(mockApiCall, {
        test: 'context',
      });
    });

    expect(mockApiCall).toHaveBeenCalledTimes(2);
    expect(callResult).toBe('success');
    expect(result.current.hasError).toBe(false);
  });

  it('provides error information correctly', () => {
    const { result } = renderHook(() => useApiErrorHandler());
    const testError = new Error('Test error');
    testError.response = { status: 429 };

    act(() => {
      result.current.handleError(testError);
    });

    const errorInfo = result.current.getErrorInfo();
    expect(errorInfo).toEqual({
      title: '⏱️ Too Many Requests',
      message: "You're making requests too quickly.",
      suggestions: expect.any(Array),
      retryable: true,
      type: ERROR_TYPES.RATE_LIMIT,
      timestamp: expect.any(String),
    });

    expect(result.current.canRetry()).toBe(true);
    expect(result.current.getRetryDelay(0)).toBeGreaterThan(0);
  });

  it('calls custom error handler', () => {
    const customErrorHandler = jest.fn();
    const { result } = renderHook(() =>
      useApiErrorHandler({
        onError: customErrorHandler,
      })
    );

    const testError = new Error('Test error');

    act(() => {
      result.current.handleError(testError);
    });

    expect(customErrorHandler).toHaveBeenCalledWith(expect.any(ApiError));
  });

  it('sets isRetrying state correctly during retry', async () => {
    const { result } = renderHook(() => useApiErrorHandler());
    const testError = new Error('Test error');
    let resolveRetry;
    const retryFn = jest.fn(
      () =>
        new Promise(resolve => {
          resolveRetry = resolve;
        })
    );

    // Set initial error
    act(() => {
      result.current.handleError(testError);
    });

    // Start retry (don't await immediately)
    let retryPromise;
    act(() => {
      retryPromise = result.current.retry(retryFn);
    });

    // Should be retrying
    expect(result.current.isRetrying).toBe(true);

    // Resolve the retry
    resolveRetry('success');

    // Wait for the retry to complete
    await act(async () => {
      await retryPromise;
    });

    // Should no longer be retrying
    expect(result.current.isRetrying).toBe(false);
  });
});
