/**
 * Split an array into chunks of `batchSize`.
 * Returns an array of arrays. Empty or null input returns [] (no-op).
 */
export function chunkArray<T>(items: T[] | null | undefined, batchSize: number): T[][] {
  if (!Number.isInteger(batchSize) || batchSize <= 0) {
    throw new Error('batchSize must be a positive integer');
  }

  if (!Array.isArray(items) || items.length === 0) return [];

  const out: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    out.push(items.slice(i, i + batchSize));
  }
  return out;
}

export default chunkArray;
