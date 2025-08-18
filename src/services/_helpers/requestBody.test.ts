import buildAddRequestBody from './requestBody';

describe('buildAddRequestBody', () => {
  test('filters invalid uris and builds body', () => {
    const input = ['spotify:track:1', null, '', 'spotify:track:2'];
    const out = buildAddRequestBody(input as any, { position: 3 });
    expect(out.uris).toEqual(['spotify:track:1', 'spotify:track:2']);
    expect(out.position).toBe(3);
  });

  test('handles empty list', () => {
    const out = buildAddRequestBody([], {});
    expect(out.uris).toEqual([]);
  });

  test('includes snapshot_id when provided', () => {
    const out = buildAddRequestBody(['a'], { snapshot_id: 'snap' });
    expect(out.snapshot_id).toBe('snap');
  });
});
