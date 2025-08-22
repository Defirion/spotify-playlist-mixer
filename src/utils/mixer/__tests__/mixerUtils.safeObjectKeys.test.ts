import { safeObjectKeys } from '../mixerUtils';

describe('safeObjectKeys', () => {
  it('returns empty array for null input', () => {
    expect(safeObjectKeys(null as any)).toEqual([]);
  });

  it('returns empty array for undefined input', () => {
    expect(safeObjectKeys(undefined as any)).toEqual([]);
  });

  it('returns empty array for non-object primitives', () => {
    expect(safeObjectKeys(123 as any)).toEqual([]);
    expect(safeObjectKeys('string' as any)).toEqual([]);
    expect(safeObjectKeys(true as any)).toEqual([]);
  });

  it('returns keys for valid objects', () => {
    const obj = { a: 1, b: 2, c: 3 };
    const keys = safeObjectKeys(obj as any);
    expect(keys.sort()).toEqual(['a', 'b', 'c']);
  });

  it('returns empty array for empty object', () => {
    expect(safeObjectKeys({} as any)).toEqual([]);
  });
});
