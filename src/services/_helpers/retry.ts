export type RetryOptions = { maxRetries?: number; baseMs?: number };

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
