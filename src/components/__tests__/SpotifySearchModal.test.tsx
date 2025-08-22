/* eslint-disable import/first */
// Lightweight integration tests for SpotifySearchModal without MSW.
import { render, screen, fireEvent } from '@testing-library/react';

// Mock the child TrackSourceModal so we can assert wiring/transforms at the
// boundary without rendering the full track list UI.
/* eslint-disable import/first */
jest.mock('../TrackSourceModal', () => ({
  __esModule: true,
  default: (props: any) => (
    <div data-testid="mock-track-source">
      <div data-testid="query">{props.searchQuery}</div>
      <button
        data-testid="mock-add"
        onClick={() => props.onAddTracks(props.tracks)}
      >
        Add
      </button>
    </div>
  ),
}));
import SpotifySearchModal from '../SpotifySearchModal';
import * as useSpotifySearchHook from '../../hooks/useSpotifySearch';

describe('SpotifySearchModal (integration wiring)', () => {
  afterEach(() => jest.restoreAllMocks());

  test('enriches tracks with source metadata and calls onAddTracks', () => {
    const mockResults = [
      { id: 't1', name: 'Test Song', artists: [{ name: 'A' }] },
    ];

    const setQuery = jest.fn();
    const search = jest.fn();
    const clear = jest.fn();

    jest.spyOn(useSpotifySearchHook, 'default').mockImplementation((): any => ({
      query: 'beatles',
      results: mockResults,
      loading: false,
      error: null,
      setQuery,
      search,
      clear,
    }));

    const onAddTracks = jest.fn();
    const onClose = jest.fn();

    render(
      <SpotifySearchModal
        isOpen={true}
        onClose={onClose}
        accessToken="tok"
        onAddTracks={onAddTracks}
      />
    );

    const addBtn = screen.getByTestId('mock-add');
    fireEvent.click(addBtn);

    expect(onAddTracks).toHaveBeenCalledTimes(1);
    const calledArg = onAddTracks.mock.calls[0][0];
    expect(Array.isArray(calledArg)).toBe(true);
    expect(calledArg[0]).toMatchObject({
      id: 't1',
      sourcePlaylist: 'search',
      sourcePlaylistName: 'Spotify Search',
    });
  });

  test('calls clear() from hook when modal closes', () => {
    const setQuery = jest.fn();
    const search = jest.fn();
    const clear = jest.fn();

    jest.spyOn(useSpotifySearchHook, 'default').mockImplementation((): any => ({
      query: '',
      results: [],
      loading: false,
      error: null,
      setQuery,
      search,
      clear,
    }));

    const onAddTracks = jest.fn();
    const onClose = jest.fn();

    const { rerender } = render(
      <SpotifySearchModal
        isOpen={true}
        onClose={onClose}
        accessToken="tok"
        onAddTracks={onAddTracks}
      />
    );

    rerender(
      <SpotifySearchModal
        isOpen={false}
        onClose={onClose}
        accessToken="tok"
        onAddTracks={onAddTracks}
      />
    );

    expect(clear).toHaveBeenCalled();
  });
});
