export type NormalizedApiError = {
  type: 'AUTH' | 'RATE_LIMIT' | 'SERVER' | 'CLIENT' | 'NETWORK' | 'UNKNOWN';
  status?: number;
  retryable: boolean;
  retryAfterSeconds?: number | null;
  message: string;
};

export function normalizeApiError(err: unknown): NormalizedApiError {
  // axios-like error
  const anyErr = err as any;

  if (anyErr && typeof anyErr === 'object') {
    // network / no response
    if (anyErr.request && !anyErr.response) {
      return {
        type: 'NETWORK',
        retryable: true,
        retryAfterSeconds: null,
        message: anyErr.message || 'Network error',
      };
    }

    if (anyErr.response && anyErr.response.status) {
      const status: number = Number(anyErr.response.status) || 0;
      const headers = anyErr.response.headers || {};
      const raRaw = headers['retry-after'] ?? headers['Retry-After'] ?? null;
      const retryAfterSeconds = raRaw ? Number(raRaw) || null : null;

      if (status === 401) {
        return {
          type: 'AUTH',
          status,
          retryable: false,
          retryAfterSeconds,
          message: 'Authentication required',
        };
      }

      if (status === 429) {
        return {
          type: 'RATE_LIMIT',
          status,
          retryable: true,
          retryAfterSeconds,
          message: 'Rate limited',
        };
      }

      if (status >= 500 && status < 600) {
        return {
          type: 'SERVER',
          status,
          retryable: true,
          retryAfterSeconds,
          message: 'Server error',
        };
      }

      if (status >= 400 && status < 500) {
        return {
          type: 'CLIENT',
          status,
          retryable: false,
          retryAfterSeconds,
          message: 'Client error',
        };
      }
    }

    // fallback for objects with message
    if (anyErr.message && typeof anyErr.message === 'string') {
      return {
        type: 'UNKNOWN',
        retryable: false,
        retryAfterSeconds: null,
        message: anyErr.message,
      };
    }
  }

  // unknown shape
  return {
    type: 'UNKNOWN',
    retryable: false,
    retryAfterSeconds: null,
    message: 'Unknown error',
  };
}

export default normalizeApiError;
