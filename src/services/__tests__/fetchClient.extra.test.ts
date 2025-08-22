import createFetchClient from '../../services/fetchClient';

describe('FetchClient - request/response edge cases', () => {
  beforeEach(() => {
    // reset global fetch mock
    // @ts-ignore
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('handles non-JSON (text) 204 response', async () => {
    const mockResp = {
      ok: true,
      status: 204,
      statusText: 'No Content',
      headers: new Map([['content-type', 'text/plain']]),
      text: jest.fn().mockResolvedValue('no content'),
      json: jest.fn(),
    };

    // adapt headers.get API used by fetchClient
    // @ts-ignore
    mockResp.headers.get = key => {
      return key === 'content-type' ? 'text/plain' : null;
    };

    // @ts-ignore
    global.fetch.mockResolvedValue(mockResp);

    const client = createFetchClient({ baseURL: 'https://api.local' });
    const result = await client.get('/ping');

    expect(result.data).toBe('no content');
  });

  test('throws on non-ok response and attaches response on error', async () => {
    const body = { error: 'bad' };
    const mockResp = {
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      headers: new Map([['content-type', 'application/json']]),
      json: jest.fn().mockResolvedValue(body),
      text: jest.fn(),
    };
    // @ts-ignore
    mockResp.headers.get = key =>
      key === 'content-type' ? 'application/json' : null;
    // @ts-ignore
    global.fetch.mockResolvedValue(mockResp);

    const client = createFetchClient();
    await expect(client.get('/bad')).rejects.toMatchObject({
      message: expect.stringContaining('Request failed'),
      response: expect.objectContaining({ status: 400, data: body }),
    });
  });

  test('sends FormData body unchanged and does not set JSON content-type', async () => {
    const fakeForm = new FormData();
    fakeForm.append('a', '1');

    const captured: any = {};
    // build a mock fetch that captures init passed to it
    // @ts-ignore
    global.fetch.mockImplementation((url, init) => {
      captured.url = url;
      captured.init = init;
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: jest.fn().mockResolvedValue({ ok: true }),
        text: jest.fn(),
        // provide headers.get API expected by fetchClient
        // @ts-ignore
        headers: { get: () => 'application/json' },
      });
    });

    const client = createFetchClient({ baseURL: 'https://host' });
    await client.post('/upload', fakeForm as any);

    expect(captured.init.body).toBeInstanceOf(FormData);
    // content-type should not be overridden to application/json when FormData provided
    expect(captured.init.headers['Content-Type']).toBeUndefined();
  });
});
