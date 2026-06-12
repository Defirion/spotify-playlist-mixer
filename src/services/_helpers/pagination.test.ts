import paginate from './pagination';

describe('paginate', () => {
  test('yields items across pages', async () => {
    const pages = [
      { items: [1, 2], next_cursor: 'a' },
      { items: [3], next_cursor: null },
    ];
    const fetchPage = vi
      .fn()
      .mockImplementation(() => Promise.resolve(pages.shift() as any));
    const out: unknown[] = [];
    for await (const x of paginate(fetchPage)) out.push(x);
    expect(out).toEqual([1, 2, 3]);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  test('throws on malformed page', async () => {
    const fetchPage = vi.fn().mockResolvedValue({} as any);
    const it = paginate(fetchPage);
    await expect(async () => {
      // consume one value to trigger
      // @ts-ignore
      await it.next();
    }).rejects.toThrow('Malformed page');
  });
});
