import createFetchClient from '../fetchClient';

const jsonHeaders = {
  get: (k: string) =>
    k.toLowerCase() === 'content-type' ? 'application/json' : null,
};

describe('FetchInstance', () => {
  beforeEach(() => {
    (global as any).fetch = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();
    delete (global as any).fetch;
  });

  test('GET returns JSON when content-type is application/json', async () => {
    (global as any).fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: {
        get: (k: string) =>
          k.toLowerCase() === 'content-type' ? 'application/json' : null,
      },
      json: async () => ({ hello: 'world' }),
      text: async () => JSON.stringify({ hello: 'world' }),
    });

    const client = createFetchClient({ baseURL: 'https://api.example.com' });
    const res = await client.get('/path');

    expect((global as any).fetch).toHaveBeenCalledWith(
      'https://api.example.com/path',
      expect.objectContaining({ method: 'GET' })
    );
    expect(res.data).toEqual({ hello: 'world' });
  });

  test('GET returns text when content-type is not json', async () => {
    (global as any).fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: {
        get: (k: string) =>
          k.toLowerCase() === 'content-type'
            ? 'text/plain; charset=utf-8'
            : null,
      },
      json: async () => {
        throw new Error('not json');
      },
      text: async () => 'plain text body',
    });

    const client = createFetchClient({ baseURL: 'https://api.example.com' });
    const res = await client.get('/plain');

    expect((global as any).fetch).toHaveBeenCalledWith(
      'https://api.example.com/plain',
      expect.objectContaining({ method: 'GET' })
    );
    expect(res.data).toBe('plain text body');
  });

  test('forwards an abort signal to fetch', async () => {
    (global as any).fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: jsonHeaders,
      json: async () => ({ ok: true }),
      text: async () => JSON.stringify({ ok: true }),
    });

    const controller = new AbortController();
    const client = createFetchClient({ baseURL: 'https://api.example.com' });
    await client.get('/cancelable', { signal: controller.signal });

    expect((global as any).fetch).toHaveBeenCalledWith(
      'https://api.example.com/cancelable',
      expect.objectContaining({ signal: controller.signal })
    );
  });

  test('POST merges headers and stringifies JSON body', async () => {
    let capturedInit: any = null;
    (global as any).fetch = vi
      .fn()
      .mockImplementation(async (_url: string, init: any) => {
        capturedInit = init;
        return {
          ok: true,
          status: 201,
          statusText: 'Created',
          headers: {
            get: (k: string) =>
              k.toLowerCase() === 'content-type' ? 'application/json' : null,
          },
          json: async () => ({ created: true }),
          text: async () => JSON.stringify({ created: true }),
        };
      });

    const client = createFetchClient({
      baseURL: 'https://api.example.com',
      headers: { 'X-Default': 'yes' },
    });
    const payload = { a: 1 };
    const res = await client.post('/items', payload, {
      headers: { Authorization: 'Bearer tok' },
    });

    expect(capturedInit).not.toBeNull();
    expect(capturedInit.method).toBe('POST');
    expect(capturedInit.body).toBe(JSON.stringify(payload));
    expect(
      capturedInit.headers['Content-Type'] ||
        capturedInit.headers['content-type']
    ).toBeDefined();
    // default header should be merged
    expect(
      capturedInit.headers['X-Default'] || capturedInit.headers['x-default']
    ).toBeDefined();
    expect(res.data).toEqual({ created: true });
  });

  test('joins a relative path to a baseURL with trailing slash', async () => {
    (global as any).fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: jsonHeaders,
      json: async () => ({ ok: true }),
      text: async () => JSON.stringify({ ok: true }),
    });

    const client = createFetchClient({ baseURL: 'https://api.example.com/' });
    const res = await client.get('/v1/items');

    expect((global as any).fetch).toHaveBeenCalledWith(
      'https://api.example.com/v1/items',
      expect.objectContaining({ method: 'GET' })
    );
    expect(res.data).toEqual({ ok: true });
  });

  test('sends FormData body unchanged and does not set JSON content-type', async () => {
    const form = new FormData();
    form.append('a', '1');

    let capturedInit: any = null;
    (global as any).fetch = vi
      .fn()
      .mockImplementation(async (_url: string, init: any) => {
        capturedInit = init;
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: jsonHeaders,
          json: async () => ({ ok: true }),
          text: async () => JSON.stringify({ ok: true }),
        };
      });

    const client = createFetchClient({ baseURL: 'https://host' });
    await client.post('/upload', form as any);

    expect(capturedInit.body).toBeInstanceOf(FormData);
    // content-type must not be forced to application/json for FormData
    expect(capturedInit.headers['Content-Type']).toBeUndefined();
  });

  test('throws an error with response attached when response is not ok', async () => {
    (global as any).fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      headers: {
        get: (k: string) =>
          k.toLowerCase() === 'content-type' ? 'application/json' : null,
      },
      json: async () => ({ error: 'invalid' }),
      text: async () => JSON.stringify({ error: 'invalid' }),
    });

    const client = createFetchClient({ baseURL: 'https://api.example.com' });

    await expect(client.get('/bad')).rejects.toMatchObject({
      message: expect.any(String),
      response: expect.objectContaining({
        status: 400,
        data: { error: 'invalid' },
      }),
    });
  });

  test('parses JSON error bodies even without a JSON content type', async () => {
    (global as any).fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      headers: {
        get: () => 'text/plain; charset=utf-8',
      },
      json: async () => {
        throw new Error('not json');
      },
      text: async () => '{"error":{"message":"Forbidden"}}',
    });

    const client = createFetchClient({ baseURL: 'https://api.example.com' });

    await expect(client.get('/forbidden')).rejects.toMatchObject({
      response: expect.objectContaining({
        status: 403,
        data: { error: { message: 'Forbidden' } },
      }),
    });
  });
});
