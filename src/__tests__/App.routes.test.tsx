import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';
import * as store from '../store';

// Mock store hooks to simulate auth states and playlists
vi.spyOn(store, 'useAuth') as any;
vi.spyOn(store, 'usePlaylistSelection') as any;
vi.spyOn(store, 'useRatioConfig') as any;
vi.spyOn(store, 'useMixOptions') as any;
vi.spyOn(store, 'useUI') as any;

describe('App routing and auth states', () => {
  beforeEach(() => {
    // Default authenticated state
    (store.useAuth as any).mockReturnValue({
      accessToken: 't',
      isAuthenticated: true,
      setAccessToken: vi.fn(),
      clearAuth: vi.fn(),
    });
    (store.usePlaylistSelection as any).mockReturnValue({
      selectedPlaylists: [],
      togglePlaylistSelection: vi.fn(),
      clearAllPlaylists: vi.fn(),
    });
    (store.useRatioConfig as any).mockReturnValue({
      ratioConfig: {},
      setRatioConfigBulk: vi.fn(),
    });
    (store.useMixOptions as any).mockReturnValue({
      mixOptions: { playlistName: 'x' },
      updateMixOptions: vi.fn(),
      applyPresetOptions: vi.fn(),
    });
    (store.useUI as any).mockReturnValue({
      error: null,
      mixedPlaylists: [],
      dismissError: vi.fn(),
      addMixedPlaylist: vi.fn(),
      dismissSuccessToast: vi.fn(),
    });
  });

  it('renders footer links and routes', () => {
    render(<App />);

    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    expect(screen.getByText('Terms of Service')).toBeInTheDocument();
    expect(screen.getByText('Back to Mixer')).toBeInTheDocument();
  });

  it('renders main app when authenticated', () => {
    render(<App />);
    // MainApp renders AppShell which includes the Back to Mixer link in footer; presence of footer implies router mounted
    expect(screen.getByText('Back to Mixer')).toBeInTheDocument();
  });
});
