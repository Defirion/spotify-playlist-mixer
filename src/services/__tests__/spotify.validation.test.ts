import SpotifyService from '../spotify';
import { ApiError, ERROR_TYPES } from '../apiErrorHandler';

describe('SpotifyService validation errors', () => {
  // Silence noisy console output in this suite to keep passing test runs quiet.
  // See src/test-utils/SILENCE_POLICY.md for preferred patterns.
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    logSpy?.mockRestore?.();
    errorSpy?.mockRestore?.();
  });
  it('throws ApiError when constructed without accessToken', () => {
    // @ts-ignore - testing runtime behavior
    // Ensure constructor throws the appropriate error type
    expect(() => new SpotifyService(null)).toThrow(ApiError);
  });

  it('searchTracks validation throws ApiError for empty query', async () => {
    const svc = new SpotifyService('fake-token');
    await expect(svc.searchTracks('', {} as any)).rejects.toMatchObject({
      type: ERROR_TYPES.BAD_REQUEST,
      context: expect.objectContaining({ operation: 'searchTracks' }),
    });
  });

  it('addTracksToPlaylist validation throws ApiError for empty uris', async () => {
    const svc = new SpotifyService('fake-token');
    // @ts-ignore missing request body
    await expect(
      // @ts-ignore
      svc.addTracksToPlaylist('playlist1', { uris: [] })
    ).rejects.toMatchObject({
      type: ERROR_TYPES.BAD_REQUEST,
      context: expect.objectContaining({ operation: 'addTracksToPlaylist' }),
    });
  });
});
