import normalizeApiError from './errorNormalizer';

describe('normalizeApiError', () => {
  test('classifies network errors', () => {
    const err: any = { request: {}, message: 'failed to fetch' };
    const n = normalizeApiError(err);
    expect(n.type).toBe('NETWORK');
    expect(n.retryable).toBe(true);
  });

  test('classifies 401', () => {
    const err: any = { response: { status: 401 } };
    const n = normalizeApiError(err);
    expect(n.type).toBe('AUTH');
    expect(n.retryable).toBe(false);
  });

  test('classifies 429 with Retry-After', () => {
    const err: any = {
      response: { status: 429, headers: { 'Retry-After': '5' } },
    };
    const n = normalizeApiError(err);
    expect(n.type).toBe('RATE_LIMIT');
    expect(n.retryable).toBe(true);
    expect(n.retryAfterSeconds).toBe(5);
  });

  test('classifies 500 as server error', () => {
    const err: any = { response: { status: 502 } };
    const n = normalizeApiError(err);
    expect(n.type).toBe('SERVER');
    expect(n.retryable).toBe(true);
  });

  test('falls back to message for unknown object', () => {
    const err: any = { message: 'boom' };
    const n = normalizeApiError(err);
    expect(n.type).toBe('UNKNOWN');
    expect(n.message).toBe('boom');
  });
});
