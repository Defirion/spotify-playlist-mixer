import { createFetchClient, FetchInstance } from '../../services/fetchClient';

// Use real timers; we mock global fetch per test.

describe('fetchClient', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    (global.fetch as any) = originalFetch;
    jest.resetAllMocks();
  });

  function mockFetchImpl(impl: any) {
    (global as any).fetch = jest.fn(impl);
  }

  it('should build absolute URL from baseURL when relative path used', async () => {
    mockFetchImpl(async (url: string) => {
      expect(url).toBe('https://api.example.com/v1/items');
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const client = createFetchClient({ baseURL: 'https://api.example.com/' });
    const res = await client.get('/v1/items');
    expect(res.data.ok).toBe(true);
  });

  it('should merge default and per-request headers', async () => {
    mockFetchImpl(async (_url: string, init: RequestInit) => {
      const hdrs = init.headers as Record<string, string>;
      expect(hdrs['Authorization']).toBe('Bearer token');
      expect(hdrs['X-Req']).toBe('1');
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const client = createFetchClient({
      headers: { Authorization: 'Bearer token' },
    });
    const res = await client.get('https://api.example.com/data', {
      headers: { 'X-Req': '1' },
    });
    expect(res.data.ok).toBe(true);
  });

  it('should serialize JSON bodies for post requests', async () => {
    mockFetchImpl(async (_url: string, init: RequestInit) => {
      expect(init.method).toBe('POST');
      expect(init.headers).toMatchObject({
        'Content-Type': 'application/json',
      });
      const body = JSON.parse(init.body as string);
      expect(body).toEqual({ name: 'Test' });
      return new Response(JSON.stringify({ id: '123' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const client = new FetchInstance();
    const res = await client.post('https://api.example.com/items', {
      name: 'Test',
    });
    expect(res.data.id).toBe('123');
  });

  it('should throw error with response data when status not ok', async () => {
    mockFetchImpl(async () => {
      return new Response(JSON.stringify({ message: 'Nope' }), {
        status: 400,
        statusText: 'Bad Request',
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const client = createFetchClient();
    await expect(
      client.get('https://api.example.com/fail')
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        status: 400,
        data: { message: 'Nope' },
      }),
    });
  });

  it('should parse non-json responses as text', async () => {
    mockFetchImpl(async () => {
      return new Response('plain text body', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    });

    const client = createFetchClient();
    const res = await client.get('https://example.com/text');
    expect(res.data).toBe('plain text body');
  });
});
