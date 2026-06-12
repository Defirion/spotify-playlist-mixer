import {
  beginAuthorization,
  completeAuthorization,
  computeCodeChallenge,
  generateRandomString,
  refreshAccessToken,
  SPOTIFY_TOKEN_URL,
} from '../spotifyAuth';

const VERIFIER_KEY = 'spotify_pkce_code_verifier';
const STATE_KEY = 'spotify_auth_state';

const tokenJson = (overrides: Record<string, unknown> = {}) => ({
  access_token: 'access-123',
  refresh_token: 'refresh-456',
  expires_in: 3600,
  token_type: 'Bearer',
  ...overrides,
});

const mockFetchOnce = (body: unknown, ok = true, status = 200) => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok,
    status,
    json: async () => body,
  });
};

describe('spotifyAuth (PKCE)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    global.fetch = jest.fn();
  });

  describe('generateRandomString', () => {
    it('produces strings of the requested length from the allowed charset', () => {
      const value = generateRandomString(64);
      expect(value).toMatch(/^[A-Za-z0-9\-._~]{64}$/);
    });

    it('produces different values on each call', () => {
      expect(generateRandomString(32)).not.toBe(generateRandomString(32));
    });
  });

  describe('computeCodeChallenge', () => {
    it('computes the RFC 7636 S256 challenge', async () => {
      // Known vector from RFC 7636 appendix B
      const challenge = await computeCodeChallenge(
        'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
      );
      expect(challenge).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
    });
  });

  describe('beginAuthorization', () => {
    it('returns the authorize URL and stashes verifier/state', async () => {
      const url = new URL(
        await beginAuthorization({
          clientId: 'client-1',
          redirectUri: 'http://localhost:3000/',
          scopes: ['playlist-read-private'],
        })
      );

      expect(url.origin).toBe('https://accounts.spotify.com');
      expect(url.pathname).toBe('/authorize');
      expect(url.searchParams.get('client_id')).toBe('client-1');
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('redirect_uri')).toBe(
        'http://localhost:3000/'
      );
      expect(url.searchParams.get('scope')).toBe('playlist-read-private');
      expect(url.searchParams.get('code_challenge_method')).toBe('S256');

      const verifier = sessionStorage.getItem(VERIFIER_KEY);
      const state = sessionStorage.getItem(STATE_KEY);
      expect(verifier).toBeTruthy();
      expect(state).toBe(url.searchParams.get('state'));
      // challenge must match the stashed verifier
      expect(url.searchParams.get('code_challenge')).toBe(
        await computeCodeChallenge(verifier as string)
      );
    });
  });

  describe('completeAuthorization', () => {
    const begin = () => {
      sessionStorage.setItem(VERIFIER_KEY, 'stored-verifier');
      sessionStorage.setItem(STATE_KEY, 'stored-state');
    };

    it('exchanges the code for tokens with the stored verifier', async () => {
      begin();
      mockFetchOnce(tokenJson());

      const before = Date.now();
      const tokens = await completeAuthorization({
        clientId: 'client-1',
        redirectUri: 'http://localhost:3000/',
        code: 'auth-code',
        state: 'stored-state',
      });

      expect(tokens.accessToken).toBe('access-123');
      expect(tokens.refreshToken).toBe('refresh-456');
      expect(tokens.expiresAt).toBeGreaterThanOrEqual(before + 3600_000);

      const [calledUrl, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(calledUrl).toBe(SPOTIFY_TOKEN_URL);
      const body = new URLSearchParams(init.body);
      expect(body.get('grant_type')).toBe('authorization_code');
      expect(body.get('code')).toBe('auth-code');
      expect(body.get('code_verifier')).toBe('stored-verifier');
      expect(body.get('client_id')).toBe('client-1');
      expect(init.headers['Content-Type']).toBe(
        'application/x-www-form-urlencoded'
      );
    });

    it('clears the stashed verifier and state after use', async () => {
      begin();
      mockFetchOnce(tokenJson());

      await completeAuthorization({
        clientId: 'client-1',
        redirectUri: 'http://localhost:3000/',
        code: 'auth-code',
        state: 'stored-state',
      });

      expect(sessionStorage.getItem(VERIFIER_KEY)).toBeNull();
      expect(sessionStorage.getItem(STATE_KEY)).toBeNull();
    });

    it('rejects when the returned state does not match', async () => {
      begin();

      await expect(
        completeAuthorization({
          clientId: 'client-1',
          redirectUri: 'http://localhost:3000/',
          code: 'auth-code',
          state: 'tampered-state',
        })
      ).rejects.toThrow('State mismatch in Spotify authorization response');
      expect(global.fetch).not.toHaveBeenCalled();
      // stash is cleared even on failure so the exchange cannot be replayed
      expect(sessionStorage.getItem(VERIFIER_KEY)).toBeNull();
    });

    it('rejects when no verifier was stashed (flow not started here)', async () => {
      sessionStorage.setItem(STATE_KEY, 'stored-state');

      await expect(
        completeAuthorization({
          clientId: 'client-1',
          redirectUri: 'http://localhost:3000/',
          code: 'auth-code',
          state: 'stored-state',
        })
      ).rejects.toThrow(/Missing PKCE code verifier/);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('rejects with Spotify error details when the exchange fails', async () => {
      begin();
      mockFetchOnce(
        {
          error: 'invalid_grant',
          error_description: 'Invalid authorization code',
        },
        false,
        400
      );

      await expect(
        completeAuthorization({
          clientId: 'client-1',
          redirectUri: 'http://localhost:3000/',
          code: 'bad-code',
          state: 'stored-state',
        })
      ).rejects.toThrow(
        'Spotify token request failed: Invalid authorization code'
      );
    });

    it('rejects when the response has no access token', async () => {
      begin();
      mockFetchOnce({ token_type: 'Bearer' });

      await expect(
        completeAuthorization({
          clientId: 'client-1',
          redirectUri: 'http://localhost:3000/',
          code: 'auth-code',
          state: 'stored-state',
        })
      ).rejects.toThrow(/did not include an access token/);
    });
  });

  describe('refreshAccessToken', () => {
    it('exchanges the refresh token for a new access token', async () => {
      mockFetchOnce(tokenJson({ refresh_token: 'rotated-refresh' }));

      const tokens = await refreshAccessToken('client-1', 'old-refresh');

      expect(tokens.accessToken).toBe('access-123');
      expect(tokens.refreshToken).toBe('rotated-refresh');

      const [, init] = (global.fetch as jest.Mock).mock.calls[0];
      const body = new URLSearchParams(init.body);
      expect(body.get('grant_type')).toBe('refresh_token');
      expect(body.get('refresh_token')).toBe('old-refresh');
    });

    it('keeps the current refresh token when Spotify omits it', async () => {
      mockFetchOnce(tokenJson({ refresh_token: undefined }));

      const tokens = await refreshAccessToken('client-1', 'old-refresh');

      expect(tokens.refreshToken).toBe('old-refresh');
    });

    it('rejects with the HTTP status when the body is not JSON', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => {
          throw new Error('not json');
        },
      });

      await expect(
        refreshAccessToken('client-1', 'old-refresh')
      ).rejects.toThrow('Spotify token request failed: HTTP 503');
    });
  });
});
