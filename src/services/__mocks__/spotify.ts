// Manual mock for services/spotify - simplified for testing
const mockGetPlaylistTracks = jest.fn();

export default jest.fn().mockImplementation(function (
  this: any,
  accessToken: string
) {
  if (!accessToken) {
    throw new Error('Access token is required for SpotifyService');
  }
  this.getPlaylistTracks = mockGetPlaylistTracks;
});

// Export the mock function so tests can access it
export { mockGetPlaylistTracks };
