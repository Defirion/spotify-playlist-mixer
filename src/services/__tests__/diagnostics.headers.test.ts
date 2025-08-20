/**
 * @jest-environment node
 */

import setupMSW from '../../test-utils/msw-setup';
import axios from 'axios';

// Simple handler to echo authorization header
import { rest } from 'msw';
jest.unmock('axios');

const server = setupMSW();

if (server) {
  server.use(
    rest.get(
      'https://api.spotify.com/v1/__diagnostics__/headers',
      (req, res, ctx) => {
        const auth = req.headers.get('authorization');
        return res(ctx.json({ authorization: auth }));
      }
    )
  );
}

describe('Diagnostics - headers', () => {
  test('axios sends Authorization header and MSW intercepts', async () => {
    if (!server) return;
    const inst = axios.create({
      baseURL: 'https://api.spotify.com/v1',
      headers: { Authorization: 'Bearer diag_token' },
    });
    try {
      const res = await inst.get('/__diagnostics__/headers');
      // eslint-disable-next-line no-console
      console.error('Diagnostics response:', res && res.data);
      expect(res.data.authorization).toMatch(/Bearer diag_token/);
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error(
        'Diagnostics axios error:',
        e && e.message,
        e && e.response && e.response.status
      );
      // eslint-disable-next-line no-console
      console.error(
        'Diagnostics axios error response data:',
        e && e.response && e.response.data
      );
      throw e;
    }
  });
});
