import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ToastError from '../ToastError';

vi.useFakeTimers();

describe('ToastError component', () => {
  test('does not render when error is null', () => {
    const onDismiss = vi.fn();
    render(<ToastError error={null} onDismiss={onDismiss} />);
    // prefer Testing Library queries over direct node access
    expect(screen.queryByRole('status')).toBeNull();
  });

  test('renders message and auto-dismisses after timeout', () => {
    const onDismiss = vi.fn();
    render(<ToastError error={'simple error'} onDismiss={onDismiss} />);
    expect(screen.getByRole('status')).toBeTruthy();
    // advance timers to trigger dismiss
    vi.advanceTimersByTime(8000);
    expect(onDismiss).toHaveBeenCalled();
  });

  test('shows Retry button when retryable and calls onRetry', async () => {
    const onDismiss = vi.fn();
    const onRetry = vi.fn();
    // construct an ApiError instance so normalizeError detects it as ApiError
    // import locally to avoid top-level import overhead
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ApiError, ERROR_TYPES } =
      await import('../../services/apiErrorHandler');
    const apiErr = new ApiError(ERROR_TYPES.UNKNOWN, new Error('orig'));
    render(
      <ToastError error={apiErr} onDismiss={onDismiss} onRetry={onRetry} />
    );
    const retry = screen.queryByText('Retry');
    expect(retry).toBeTruthy();
    if (retry) fireEvent.click(retry);
    expect(onRetry).toHaveBeenCalled();
  });
});
