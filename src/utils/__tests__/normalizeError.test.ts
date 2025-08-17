import { normalizeError, getDisplayErrorWithLabel } from '../normalizeError';
import { ApiError, ERROR_TYPES } from '../../services/apiErrorHandler';

describe('normalizeError / getDisplayErrorWithLabel', () => {
  it('handles string errors', () => {
    const input = 'Simple error message';
    const details = normalizeError(input);

    expect(details).toHaveProperty('message', input);

    const { label, details: withLabel } = getDisplayErrorWithLabel(input);
    expect(label).toBe('Simple error message');
    expect(withLabel.message).toBe(input);
  });

  it('handles Error instances', () => {
    const error = new Error('Something went wrong');
    const details = normalizeError(error);

    expect(details.message).toBe('Something went wrong');
    expect(details.originalError).toBeDefined();
    expect(details.originalError?.message).toBe('Something went wrong');

    const { label } = getDisplayErrorWithLabel(error);
    expect(label).toBe('Something went wrong');
  });

  it('handles ApiError instances and preserves title/suggestions', () => {
    const original = new Error('Network failed');
    const apiErr = new ApiError(ERROR_TYPES.NETWORK as any, original);

    const details = normalizeError(apiErr);

    // ApiError should expose title/message from error handler messages
    expect(details.title).toBeDefined();
    expect(details.suggestions).toBeInstanceOf(Array);
    expect(details.retryable).toBe(true);

    const { label } = getDisplayErrorWithLabel(apiErr);
    // Label prefers title
    expect(label).toBe(details.title);
  });

  it('stringifies unknown objects', () => {
    const obj = { foo: 'bar', nested: { a: 1 } };
    const details = normalizeError(obj);

    expect(details.message).toContain('foo');
    const { label } = getDisplayErrorWithLabel(obj, 20);
    // label should be a truncated string
    expect(typeof label).toBe('string');
    expect(label.length).toBeLessThanOrEqual(20);
  });
});
