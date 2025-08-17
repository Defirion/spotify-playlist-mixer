import { ApiError } from '../services/apiErrorHandler';

export type DisplayError = {
  title?: string;
  message: string;
  suggestions?: string[];
  retryable?: boolean;
  timestamp?: string | number;
  originalError?: { message?: string; stack?: string } | null;
};

/**
 * Normalize various error shapes (string, Error, ApiError, unknown)
 * into a consistent object useful for UI display.
 */
export function normalizeError(err: unknown): DisplayError {
  if (err == null) {
    return { message: 'An unexpected error occurred.' };
  }

  if (typeof err === 'string') {
    return { message: err };
  }

  if (err instanceof ApiError) {
    return {
      title: err.title || undefined,
      message: err.message || 'An unexpected error occurred.',
      suggestions: err.suggestions || [],
      retryable: err.retryable,
      timestamp: err.timestamp,
      originalError:
        err.originalError && typeof err.originalError === 'object'
          ? {
              message: (err.originalError as any).message,
              stack: (err.originalError as any).stack,
            }
          : undefined,
    };
  }

  if (err instanceof Error) {
    return {
      message: err.message || 'An unexpected error occurred.',
      originalError: { message: err.message, stack: err.stack },
    };
  }

  // Fallback: try to stringify unknown inputs
  try {
    return { message: JSON.stringify(err) };
  } catch {
    return { message: String(err) };
  }
}

/**
 * Convenience helper for UI components that need a short label plus
 * the normalized error details. The label prefers the title, then the
 * first line of the message, truncated to `maxLabelLength`.
 */
export function getDisplayErrorWithLabel(
  err: unknown,
  maxLabelLength: number = 80
): { label: string; details: DisplayError } {
  const details = normalizeError(err);
  const rawLabel = details.title || details.message.split('\n')[0] || 'Error';
  const label =
    rawLabel.length > maxLabelLength
      ? rawLabel.slice(0, maxLabelLength - 1) + '…'
      : rawLabel;
  return { label, details };
}
