import toDisplayError from '../migrateError';

describe('migrateError.toDisplayError', () => {
  test('string input', () => {
    expect(toDisplayError('fail').message).toBe('fail');
  });
  test('Error input', () => {
    const e = new Error('Oops');
    const out = toDisplayError(e);
    expect(out.message).toBe('Oops');
    expect(out.originalError?.message).toBe('Oops');
  });
  test('null/undefined becomes generic', () => {
    expect(toDisplayError(null as any).message.toLowerCase()).toContain(
      'unexpected'
    );
  });
  test('object becomes JSON string', () => {
    const out = toDisplayError({ a: 1, b: 2 });
    expect(out.message).toContain('a');
  });
});
