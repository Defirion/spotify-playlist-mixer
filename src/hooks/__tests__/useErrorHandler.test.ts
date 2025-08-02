import { renderHook, act } from '@testing-library/react';
import useErrorHandler, {
  UseErrorHandlerReturn,
  ErrorType,
} from '../useErrorHandler';

describe('useErrorHandler', () => {
  it('initializes with no error', () => {
    const { result } = renderHook(() => useErrorHandler());

    expect(result.current.error).toBeNull();
    expect(result.current.hasError).toBe(false);
    expect(result.current.isRetrying).toBe(false);
  });

  it('handles errors correctly', () => {
    const { result } = renderHook(() => useErrorHandler());
    const testError = new Error('Test error');

    act(() => {
      result.current.handleError(testError);
    });

    expect(result.current.error).toBe(testError);
    expect(result.current.hasError).toBe(true);
    expect(result.current.isRetrying).toBe(false);
  });

  it('handles string errors correctly', () => {
    const { result } = renderHook(() => useErrorHandler());
    const testErrorString = 'Test error string';

    act(() => {
      result.current.handleError(testErrorString);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe(testErrorString);
    expect(result.current.hasError).toBe(true);
    expect(result.current.isRetrying).toBe(false);
  });

  it('clears errors correctly', () => {
    const { result } = renderHook(() => useErrorHandler());
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
    const { result } = renderHook(() => useErrorHandler());
    const testError = new Error('Test error');
    const retryFn = jest.fn().mockResolvedValue('success');

    // Set initial error
    act(() => {
      result.current.handleError(testError);
    });

    expect(result.current.hasError).toBe(true);

    // Retry should clear error
    await act(async () => {
      await result.current.retry(retryFn);
    });

    expect(retryFn).toHaveBeenCalled();
    expect(result.current.error).toBeNull();
    expect(result.current.hasError).toBe(false);
    expect(result.current.isRetrying).toBe(false);
  });

  it('handles retry with failing function', async () => {
    const { result } = renderHook(() => useErrorHandler());
    const initialError = new Error('Initial error');
    const retryError = new Error('Retry error');
    const retryFn = jest.fn().mockRejectedValue(retryError);

    // Set initial error
    act(() => {
      result.current.handleError(initialError);
    });

    // Retry should set new error
    await act(async () => {
      await result.current.retry(retryFn);
    });

    expect(retryFn).toHaveBeenCalled();
    expect(result.current.error).toBe(retryError);
    expect(result.current.hasError).toBe(true);
    expect(result.current.isRetrying).toBe(false);
  });

  it('handles retry without function (just clears error)', async () => {
    const { result } = renderHook(() => useErrorHandler());
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

  it('wraps async functions with error handling', async () => {
    const { result } = renderHook(() => useErrorHandler());
    const testError = new Error('Async error');
    const asyncFn = jest.fn().mockRejectedValue(testError);

    const wrappedFn = result.current.withErrorHandling(asyncFn);

    await act(async () => {
      try {
        await wrappedFn('arg1', 'arg2');
      } catch (error) {
        // Expected to throw
      }
    });

    expect(asyncFn).toHaveBeenCalledWith('arg1', 'arg2');
    expect(result.current.error).toBe(testError);
    expect(result.current.hasError).toBe(true);
  });

  it('wraps successful async functions correctly', async () => {
    const { result } = renderHook(() => useErrorHandler());
    const asyncFn = jest.fn().mockResolvedValue('success');

    const wrappedFn = result.current.withErrorHandling(asyncFn);

    let returnValue: string;
    await act(async () => {
      returnValue = await wrappedFn('arg1', 'arg2');
    });

    expect(asyncFn).toHaveBeenCalledWith('arg1', 'arg2');
    expect(returnValue!).toBe('success');
    expect(result.current.error).toBeNull();
    expect(result.current.hasError).toBe(false);
  });

  it('sets isRetrying state correctly during retry', async () => {
    const { result } = renderHook(() => useErrorHandler());
    const testError = new Error('Test error');
    let resolveRetry: (value: string) => void;
    const retryFn = jest.fn(
      () =>
        new Promise<void>(resolve => {
          resolveRetry = resolve as any;
        })
    );

    // Set initial error
    act(() => {
      result.current.handleError(testError);
    });

    // Start retry (don't await immediately)
    let retryPromise: Promise<void>;
    act(() => {
      retryPromise = result.current.retry(retryFn);
    });

    // Should be retrying
    expect(result.current.isRetrying).toBe(true);

    // Resolve the retry
    resolveRetry!('success' as any);

    // Wait for the retry to complete
    await act(async () => {
      await retryPromise!;
    });

    // Should no longer be retrying
    expect(result.current.isRetrying).toBe(false);
  });

  it('calls custom error handler when provided', () => {
    const customErrorHandler = jest.fn();
    const { result } = renderHook(() =>
      useErrorHandler({
        onError: customErrorHandler,
      })
    );

    const testError = new Error('Test error');

    act(() => {
      result.current.handleError(testError);
    });

    expect(customErrorHandler).toHaveBeenCalledWith(testError);
  });

  it('handles null error correctly', () => {
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.handleError(null);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('null');
    expect(result.current.hasError).toBe(true);
  });

  it('preserves function signatures in withErrorHandling', async () => {
    const { result } = renderHook(() => useErrorHandler());

    // Test function with specific signature
    const typedAsyncFn = async (str: string, num: number): Promise<boolean> => {
      return str.length > num;
    };

    const wrappedFn = result.current.withErrorHandling(typedAsyncFn);

    let returnValue: boolean;
    await act(async () => {
      returnValue = await wrappedFn('test', 2);
    });

    expect(returnValue!).toBe(true);
    expect(result.current.hasError).toBe(false);
  });
});
