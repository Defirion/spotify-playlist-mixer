/**
 * @jest-environment node
 */

import setupMSW from '../../test-utils/msw';
// Simple handler to echo authorization header
import * as msw from 'msw';

type MSWInfo = {
  request: Request & { json(): Promise<any> };
  params: Record<string, string>;
  cookies: Record<string, string>;
};

const server = setupMSW();

if (server) {
  server.use(
    msw.http.get(
      'https://api.spotify.com/v1/__diagnostics__/headers',
      (info: any) => {
        const auth = info.request.headers.get('authorization');
        return msw.HttpResponse.json({ authorization: auth });
      }
    )
  );
}

describe('Diagnostics - headers', () => {
  test('fetch sends Authorization header and MSW intercepts', async () => {
    if (!server) return;
    try {
      const res = await (global as any).fetch(
        'https://api.spotify.com/v1/__diagnostics__/headers',
        {
          headers: { Authorization: 'Bearer diag_token' },
        }
      );
      const data = await res.json();
      // eslint-disable-next-line no-console
      console.error('Diagnostics response:', data);
      expect(data.authorization).toMatch(/Bearer diag_token/);
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error('Diagnostics fetch error:', e && e.message);
      throw e;
    }
  });
});
