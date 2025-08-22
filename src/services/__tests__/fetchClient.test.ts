import createFetchClient from '../fetchClient';

describe('FetchInstance', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
    delete (global as any).fetch;
  });

  test('GET returns JSON when content-type is application/json', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
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
    (global as any).fetch = jest.fn().mockResolvedValue({
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

  test('POST merges headers and stringifies JSON body', async () => {
    let capturedInit: any = null;
    (global as any).fetch = jest
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

  test('throws an error with response attached when response is not ok', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
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
});
