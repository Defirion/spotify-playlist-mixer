import normalizeApiError from '../errorNormalizer';

describe('normalizeApiError', () => {
  it('handles network error (request present, no response)', () => {
    const err: any = { request: {}, message: 'failed to connect' };
    const out = normalizeApiError(err);
    expect(out.type).toBe('NETWORK');
    expect(out.retryable).toBe(true);
    expect(out.message).toContain('failed');
  });

  it('handles 401 auth error', () => {
    const err: any = { response: { status: 401, headers: {} } };
    const out = normalizeApiError(err);
    expect(out.type).toBe('AUTH');
    expect(out.retryable).toBe(false);
    expect(out.status).toBe(401);
  });

  it('handles 429 rate limit with Retry-After header', () => {
    const err: any = {
      response: { status: 429, headers: { 'retry-after': '30' } },
    };
    const out = normalizeApiError(err);
    expect(out.type).toBe('RATE_LIMIT');
    expect(out.retryable).toBe(true);
    expect(out.retryAfterSeconds).toBe(30);
  });

  it('handles 500 server error', () => {
    const err: any = { response: { status: 502, headers: {} } };
    const out = normalizeApiError(err);
    expect(out.type).toBe('SERVER');
    expect(out.retryable).toBe(true);
    expect(out.status).toBe(502);
  });

  it('handles 400 client error', () => {
    const err: any = { response: { status: 404, headers: {} } };
    const out = normalizeApiError(err);
    expect(out.type).toBe('CLIENT');
    expect(out.retryable).toBe(false);
    expect(out.status).toBe(404);
  });

  it('falls back to message property for objects', () => {
    const err: any = { message: 'something weird' };
    const out = normalizeApiError(err);
    expect(out.type).toBe('UNKNOWN');
    expect(out.message).toBe('something weird');
  });

  it('handles unknown shapes', () => {
    const out = normalizeApiError(null);
    expect(out.type).toBe('UNKNOWN');
    expect(out.message).toBe('Unknown error');
  });
});
