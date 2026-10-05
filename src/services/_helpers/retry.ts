export type RetryOptions = { maxRetries?: number; baseMs?: number };

/** Spotify Retry-After is seconds; support native and legacy header shapes. */
export function readRetryAfterSeconds(headers: any): number | null {
  const value =
    typeof headers?.get === 'function'
      ? headers.get('retry-after')
      : (headers?.['retry-after'] ?? headers?.['Retry-After']);
  if (value == null || value === '') return null;
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}

export function abortableDelay(
  ms: number,
  signal?: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      reject(new DOMException('Request canceled', 'AbortError'));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
  });
}

function sleep(ms: number) {
  return new Promise(res => setTimeout(res, ms));
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  opts?: RetryOptions & { getRetryAfter?: () => number | null }
) {
  const maxRetries = opts?.maxRetries ?? 3;
  const base = opts?.baseMs ?? 100;
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      if (attempt > maxRetries) throw err;
      const ra = opts?.getRetryAfter ? opts.getRetryAfter() : null;
      const wait =
        ra !== null && ra !== undefined
          ? ra * 1000
          : base * Math.pow(2, attempt - 1);
      // jitter
      const jitter = Math.floor((Math.random() - 0.5) * base);
      await sleep(wait + jitter);
    }
  }
}

export default retryWithBackoff;
