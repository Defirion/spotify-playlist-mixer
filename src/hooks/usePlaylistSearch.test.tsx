import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { usePlaylistSearch } from './usePlaylistSearch';

jest.mock('../utils/spotify', () => ({
  getSpotifyApi: jest.fn(),
}));

const { getSpotifyApi } = require('../utils/spotify');

function HookTestHarness({
  accessToken,
  initialQuery = '',
  debounceMs = 10,
  limit = 5,
}: any) {
  const hook = usePlaylistSearch({ accessToken, debounceMs, limit });
  return (
    <div>
      <input
        data-testid="q"
        value={hook.query}
        onChange={e => hook.setQuery((e.target as HTMLInputElement).value)}
      />
      <button data-testid="clear" onClick={() => hook.clearResults()} />
      <div data-testid="out">
        {JSON.stringify({
          results: hook.results,
          loading: hook.loading,
          error: hook.error,
          showResults: hook.showResults,
        })}
      </div>
    </div>
  );
}

describe('usePlaylistSearch', () => {
  afterEach(() => jest.restoreAllMocks());

  it('clears results when query is empty or looks like a spotify link', async () => {
    (getSpotifyApi as jest.Mock).mockImplementation(() => ({
      defaults: { headers: {} },
      get: jest.fn(),
    }));
    render(<HookTestHarness accessToken={null} />);
    const input = screen.getByTestId('q') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '   ' } });
    await waitFor(() =>
      expect(screen.getByTestId('out').textContent).toContain(
        'showResults":false'
      )
    );

    fireEvent.change(input, {
      target: { value: 'https://open.spotify.com/playlist/abc' },
    });
    await waitFor(() =>
      expect(screen.getByTestId('out').textContent).toContain(
        'showResults":false'
      )
    );
  });

  it('sets results when api returns playlists.items', async () => {
    const mockGet = jest.fn().mockResolvedValue({
      data: { playlists: { items: [{ id: 'p1', name: 'P1' }] } },
    });
    (getSpotifyApi as jest.Mock).mockImplementation(() => ({
      defaults: { headers: {} },
      get: mockGet,
    }));

    render(<HookTestHarness accessToken={'token'} debounceMs={1} limit={5} />);
    const input = screen.getByTestId('q') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'hello' } });

    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByTestId('out').textContent).toContain('p1')
    );
  });

  it('handles alternative tracks.items shape and errors from api.get', async () => {
    const mockGet = jest
      .fn()
      .mockResolvedValueOnce({ data: { tracks: { items: [{ id: 't1' }] } } })
      .mockRejectedValueOnce({
        response: { status: 500, data: { msg: 'bad' } },
      });

    (getSpotifyApi as jest.Mock).mockImplementation(() => ({
      defaults: { headers: {} },
      get: mockGet,
    }));

    render(<HookTestHarness accessToken={'token'} debounceMs={1} limit={5} />);
    const input = screen.getByTestId('q') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'tracky' } });

    await waitFor(() => {
      expect(screen.getByTestId('out').textContent).toContain('t1');
    });

    // provoke error path
    fireEvent.change(input, { target: { value: 'will-error' } });
    await waitFor(() => {
      expect(screen.getByTestId('out').textContent).toContain(
        'Failed to search playlists'
      );
    });
  });
});
