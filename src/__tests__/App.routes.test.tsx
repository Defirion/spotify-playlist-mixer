import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';
import * as store from '../store';

// Mock store hooks to simulate auth states and playlists
jest.spyOn(store, 'useAuth') as any;
jest.spyOn(store, 'usePlaylistSelection') as any;
jest.spyOn(store, 'useRatioConfig') as any;
jest.spyOn(store, 'useMixOptions') as any;
jest.spyOn(store, 'useUI') as any;

describe('App routing and auth states', () => {
  beforeEach(() => {
    // Default authenticated state
    (store.useAuth as any).mockReturnValue({
      accessToken: 't',
      isAuthenticated: true,
      setAccessToken: jest.fn(),
      clearAuth: jest.fn(),
    });
    (store.usePlaylistSelection as any).mockReturnValue({
      selectedPlaylists: [],
      togglePlaylistSelection: jest.fn(),
      clearAllPlaylists: jest.fn(),
    });
    (store.useRatioConfig as any).mockReturnValue({
      ratioConfig: {},
      setRatioConfigBulk: jest.fn(),
    });
    (store.useMixOptions as any).mockReturnValue({
      mixOptions: { playlistName: 'x' },
      updateMixOptions: jest.fn(),
      applyPresetOptions: jest.fn(),
    });
    (store.useUI as any).mockReturnValue({
      error: null,
      mixedPlaylists: [],
      dismissError: jest.fn(),
      addMixedPlaylist: jest.fn(),
      dismissSuccessToast: jest.fn(),
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
