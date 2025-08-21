import {
  normalizeError,
  getDisplayErrorWithLabel,
} from '../../utils/normalizeError';
import { ApiError, ERROR_TYPES } from '../../services/apiErrorHandler';

describe('normalizeError', () => {
  test('handles null/undefined', () => {
    expect(normalizeError(null)).toEqual({
      message: 'An unexpected error occurred.',
    });
    expect(normalizeError(undefined)).toEqual({
      message: 'An unexpected error occurred.',
    });
  });

  test('handles strings', () => {
    expect(normalizeError('oh no')).toEqual({ message: 'oh no' });
  });

  test('handles Error instances', () => {
    const err = new Error('boom');
    const normalized = normalizeError(err);
    expect(normalized.message).toBe('boom');
    expect(normalized.originalError).toBeDefined();
    expect((normalized.originalError as any).message).toBe('boom');
    expect((normalized.originalError as any).stack).toBeDefined();
  });

  test('handles ApiError instances and preserves metadata', () => {
    const original = new Error('network fail');
    const apiErr = new ApiError(ERROR_TYPES.NETWORK, original, {
      something: true,
    });

    const normalized = normalizeError(apiErr);

    expect(normalized.title).toBe(apiErr.title);
    expect(normalized.message).toBe(apiErr.message);
    expect(normalized.suggestions).toEqual(apiErr.suggestions);
    expect(normalized.retryable).toBe(apiErr.retryable);
    expect(normalized.timestamp).toBe(apiErr.timestamp);
    // originalError on ApiError should be converted to a plain object with message/stack
    expect(normalized.originalError).toBeDefined();
    expect((normalized.originalError as any).message).toBe(original.message);
    expect((normalized.originalError as any).stack).toBeDefined();
  });

  test('falls back when JSON.stringify throws (circular)', () => {
    const circular: any = { name: 'loop' };
    circular.self = circular;

    const normalized = normalizeError(circular);
    // JSON.stringify will throw for circular structures and the fallback should use String(err)
    expect(normalized.message).toBe(String(circular));
  });
});

describe('getDisplayErrorWithLabel', () => {
  test('prefers title then first line of message and truncates long labels', () => {
    const long = 'a'.repeat(100);
    const { label: truncated } = getDisplayErrorWithLabel(long, 10);
    // truncation uses slice(maxLabelLength - 1) + '…' to preserve length
    expect(truncated).toBe('aaaaaaaaa…');

    const multi = 'first line\nsecond line';
    const { label: firstLine } = getDisplayErrorWithLabel(multi, 80);
    expect(firstLine).toBe('first line');

    // Use an ApiError so normalizeError will preserve the title
    const apiErr = new ApiError(ERROR_TYPES.UNKNOWN, new Error('something'));
    const { label: titleLabel } = getDisplayErrorWithLabel(apiErr);
    expect(titleLabel).toBe(apiErr.title);
  });
});
