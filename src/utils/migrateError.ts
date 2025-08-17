import { normalizeError, DisplayError } from './normalizeError';

/**
 * Migration helper: convert any existing error shape (string, Error, ApiError)
 * into a DisplayError suitable for the UI store.
 */
export function toDisplayError(err: unknown): DisplayError {
  return normalizeError(err);
}

export default toDisplayError;
