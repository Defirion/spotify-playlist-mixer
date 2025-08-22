import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MainApp } from '../App';
import * as store from '../store';

// Mock the store hooks
jest.mock('../store', () => ({
  useAuth: jest.fn(),
  usePlaylistSelection: jest.fn(),
  useRatioConfig: jest.fn(),
  useMixOptions: jest.fn(),
  useUI: jest.fn(),
  setUIError: jest.fn(),
}));

// Mock AppShell to capture and expose handler props
let mockAppShellProps: any = {};
jest.mock('../AppShell', () => {
  return function MockAppShell(props: any) {
    mockAppShellProps = props;
    return <div data-testid="app-shell" />;
  };
});

describe('MainApp behavioral coverage', () => {
  const mockStoreReturns = {
    useAuth: {
      accessToken: null,
      isAuthenticated: false,
      setAccessToken: jest.fn(),
    },
    usePlaylistSelection: {
      selectedPlaylists: [],
      togglePlaylistSelection: jest.fn(),
      clearAllPlaylists: jest.fn(),
    },
    useRatioConfig: {
      ratioConfig: {},
      setRatioConfigBulk: jest.fn(),
      updateRatioConfig: jest.fn(),
    },
    useMixOptions: {
      mixOptions: {},
      updateMixOptions: jest.fn(),
      applyPresetOptions: jest.fn(),
    },
    useUI: {
      error: null,
      mixedPlaylists: [],
      dismissError: jest.fn(),
      dismissSuccessToast: jest.fn(),
      addMixedPlaylist: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAppShellProps = {}; // Reset mock props

    // Setup default mock returns
    (store.useAuth as jest.Mock).mockReturnValue(mockStoreReturns.useAuth);
    (store.usePlaylistSelection as jest.Mock).mockReturnValue(
      mockStoreReturns.usePlaylistSelection
    );
    (store.useRatioConfig as jest.Mock).mockReturnValue(
      mockStoreReturns.useRatioConfig
    );
    (store.useMixOptions as jest.Mock).mockReturnValue(
      mockStoreReturns.useMixOptions
    );
    (store.useUI as jest.Mock).mockReturnValue(mockStoreReturns.useUI);
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.DEBUG_AUTH;
    // Restore window.location.hash
    window.location.hash = '';
  });

  describe('token parsing behavior', () => {
    it('does not parse token when user is already authenticated', () => {
      const setAccessToken = jest.fn();
      (store.useAuth as jest.Mock).mockReturnValue({
        ...mockStoreReturns.useAuth,
        isAuthenticated: true,
        setAccessToken,
      });

      window.location.hash = '#access_token=FAKE_TOKEN';

      render(<MainApp />);

      expect(setAccessToken).not.toHaveBeenCalled();
    });

    it('does not parse token when hash exists but no access_token param', () => {
      const setAccessToken = jest.fn();
      (store.useAuth as jest.Mock).mockReturnValue({
        ...mockStoreReturns.useAuth,
        setAccessToken,
      });

      window.location.hash = '#other_param=value';

      render(<MainApp />);

      expect(setAccessToken).not.toHaveBeenCalled();
    });

    it('does not parse token when access_token param has no value', () => {
      const setAccessToken = jest.fn();
      (store.useAuth as jest.Mock).mockReturnValue({
        ...mockStoreReturns.useAuth,
        setAccessToken,
      });

      window.location.hash = '#access_token=';

      render(<MainApp />);

      expect(setAccessToken).not.toHaveBeenCalled();
    });

    it('logs debug info when DEBUG_AUTH is enabled and token is long', () => {
      process.env.NODE_ENV = 'development';
      process.env.DEBUG_AUTH = '1';

      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();
      const setAccessToken = jest.fn();

      (store.useAuth as jest.Mock).mockReturnValue({
        ...mockStoreReturns.useAuth,
        setAccessToken,
      });

      window.location.hash =
        '#access_token=very_long_token_that_is_more_than_10_chars';

      render(<MainApp />);

      expect(consoleSpy).toHaveBeenCalledWith(
        'DEV: setAccessToken called, maskedToken=',
        'very_l...hars'
      );

      consoleSpy.mockRestore();
    });

    it('logs debug info when DEBUG_AUTH is enabled and token is short', () => {
      process.env.NODE_ENV = 'development';
      process.env.DEBUG_AUTH = '1';

      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();
      const setAccessToken = jest.fn();

      (store.useAuth as jest.Mock).mockReturnValue({
        ...mockStoreReturns.useAuth,
        setAccessToken,
      });

      window.location.hash = '#access_token=shorttkn';

      render(<MainApp />);

      expect(consoleSpy).toHaveBeenCalledWith(
        'DEV: setAccessToken called, maskedToken=',
        'shorttkn'
      );

      consoleSpy.mockRestore();
    });

    it('does not log debug info when DEBUG_AUTH is not set', () => {
      process.env.NODE_ENV = 'development';
      // DEBUG_AUTH not set

      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();
      const setAccessToken = jest.fn();

      (store.useAuth as jest.Mock).mockReturnValue({
        ...mockStoreReturns.useAuth,
        setAccessToken,
      });

      window.location.hash = '#access_token=some_token';

      render(<MainApp />);

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('clears hash after successful token parsing', () => {
      const setAccessToken = jest.fn();
      (store.useAuth as jest.Mock).mockReturnValue({
        ...mockStoreReturns.useAuth,
        setAccessToken,
      });

      window.location.hash = '#access_token=FAKE_TOKEN';

      render(<MainApp />);

      expect(window.location.hash).toBe('');
    });
  });

  describe('preset application behavior', () => {
    it('clears UI error when applying preset and error exists', () => {
      const setUIError = jest.fn();
      (store.setUIError as jest.Mock).mockImplementation(setUIError);

      (store.useUI as jest.Mock).mockReturnValue({
        ...mockStoreReturns.useUI,
        error: 'Some existing error',
      });

      render(<MainApp />);

      // Use the captured handler from mock
      mockAppShellProps.onApplyPreset({
        ratioConfig: { playlist1: 0.5 },
        strategy: 'balanced',
        settings: {},
        presetName: 'test-preset',
      });

      expect(setUIError).toHaveBeenCalledWith(null);
    });

    it('does not clear UI error when applying preset and no error exists', () => {
      const setUIError = jest.fn();
      (store.setUIError as jest.Mock).mockImplementation(setUIError);

      (store.useUI as jest.Mock).mockReturnValue({
        ...mockStoreReturns.useUI,
        error: null,
      });

      render(<MainApp />);

      // Use the captured handler from mock
      mockAppShellProps.onApplyPreset({
        ratioConfig: { playlist1: 0.5 },
        strategy: 'balanced',
        settings: {},
        presetName: 'test-preset',
      });

      expect(setUIError).not.toHaveBeenCalled();
    });
  });

  describe('playlist removal behavior', () => {
    it('removes playlist when it exists in selectedPlaylists', () => {
      const mockPlaylist = { id: 'playlist1', name: 'Test Playlist' };
      const togglePlaylistSelection = jest.fn();

      (store.usePlaylistSelection as jest.Mock).mockReturnValue({
        ...mockStoreReturns.usePlaylistSelection,
        selectedPlaylists: [mockPlaylist],
        togglePlaylistSelection,
      });

      render(<MainApp />);

      // Use the captured handler from mock
      mockAppShellProps.onPlaylistRemove('playlist1');

      expect(togglePlaylistSelection).toHaveBeenCalledWith(mockPlaylist);
    });

    it('does not remove playlist when it does not exist in selectedPlaylists', () => {
      const togglePlaylistSelection = jest.fn();

      (store.usePlaylistSelection as jest.Mock).mockReturnValue({
        ...mockStoreReturns.usePlaylistSelection,
        selectedPlaylists: [],
        togglePlaylistSelection,
      });

      render(<MainApp />);

      // Use the captured handler from mock
      mockAppShellProps.onPlaylistRemove('non-existent-playlist');

      expect(togglePlaylistSelection).not.toHaveBeenCalled();
    });
  });
});
