import chunkArray from './batching';

describe('chunkArray', () => {
  test('returns [] for null/undefined/empty', () => {
    expect(chunkArray(null, 3)).toEqual([]);
    expect(chunkArray(undefined, 3)).toEqual([]);
    expect(chunkArray([], 3)).toEqual([]);
  });

  test('throws for invalid batchSize', () => {
    // @ts-ignore
    expect(() => chunkArray([1, 2, 3], 0)).toThrow();
    // @ts-ignore
    expect(() => chunkArray([1, 2, 3], -1)).toThrow();
    // @ts-ignore
    expect(() => chunkArray([1, 2, 3], 1.5)).toThrow();
  });

  test('chunks correctly with remainder', () => {
    expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  test('chunks exactly when divisible', () => {
    expect(chunkArray([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
  });

  test('batchSize 1 returns single-item arrays', () => {
    expect(chunkArray([1, 2, 3], 1)).toEqual([[1], [2], [3]]);
  });

  test('handles large arrays quickly (simple smoke)', () => {
    const arr = Array.from({ length: 1000 }, (_, i) => i);
    const chunks = chunkArray(arr, 100);
    expect(chunks.length).toBe(10);
    expect(chunks[0][0]).toBe(0);
    expect(chunks[9][99]).toBe(999);
  });
});
