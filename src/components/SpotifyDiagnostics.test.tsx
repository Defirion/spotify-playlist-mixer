import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SpotifyDiagnostics from './SpotifyDiagnostics';
import { getSpotifyApi } from '../utils/spotify';

vi.mock('../utils/spotify', () => ({
  getDefaultMarket: () => 'US',
  getSpotifyApi: vi.fn(),
}));

describe('SpotifyDiagnostics', () => {
  const get = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSpotifyApi).mockReturnValue({ get } as any);
  });

  it('probes only the playlist capabilities covered by the app scopes', async () => {
    get.mockResolvedValueOnce({ status: 200 }).mockRejectedValueOnce({
      response: {
        status: 403,
        data: { error: { reason: 'DENIED', message: 'Forbidden' } },
      },
    });

    render(<SpotifyDiagnostics accessToken="token-not-rendered" />);
    fireEvent.click(screen.getByRole('button', { name: 'Run diagnostics' }));

    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    expect(get).toHaveBeenNthCalledWith(1, '/me/playlists?limit=1');
    expect(get).toHaveBeenNthCalledWith(
      2,
      '/search?q=salsa&type=playlist&limit=1&market=US'
    );
    expect(get).not.toHaveBeenCalledWith('/me');
    expect(screen.getByText(/Checked at .* UTC/)).toBeInTheDocument();
    expect(screen.getByText(/DENIED: Forbidden/)).toBeInTheDocument();
    expect(screen.queryByText('token-not-rendered')).not.toBeInTheDocument();
  });
});
