import * as migration from '../../store/migration';
import * as store from '../../store/index';

describe('migration legacy wrappers', () => {
  afterEach(() => jest.restoreAllMocks());

  it('useLegacyAppState warns and returns store slice', () => {
    const mockState: any = {
      accessToken: 'token',
      error: null,
      mixedPlaylists: [],
      setAccessToken: jest.fn(),
      setError: jest.fn(),
      dismissError: jest.fn(),
      addMixedPlaylist: jest.fn(),
      dismissSuccessToast: jest.fn(),
    };

    const useAppSpy = jest
      .spyOn(store, 'useAppStore')
      .mockImplementation((selector: any) => selector(mockState));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const out = migration.useLegacyAppState();
    expect(warn).toHaveBeenCalled();
    expect(out.accessToken).toBe('token');

    useAppSpy.mockRestore();
    warn.mockRestore();
  });

  it('other legacy wrappers return expected shape and warn', () => {
    const mockState: any = {
      mixOptions: { totalSongs: 1 },
      updateMixOptions: jest.fn(),
      resetMixOptions: jest.fn(),
      applyPresetOptions: jest.fn(),
      selectedPlaylists: [],
      selectPlaylist: jest.fn(),
      deselectPlaylist: jest.fn(),
      togglePlaylistSelection: jest.fn(),
      clearAllPlaylists: jest.fn(),
      isPlaylistSelected: jest.fn(),
      ratioConfig: {},
      updateRatioConfig: jest.fn(),
      removeRatioConfig: jest.fn(),
      addPlaylistToRatioConfig: jest.fn(),
      setRatioConfigBulk: jest.fn(),
      clearRatioConfig: jest.fn(),
      getRatioConfig: jest.fn(),
    };

    const useAppSpy = jest
      .spyOn(store, 'useAppStore')
      .mockImplementation((selector: any) => selector(mockState));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const mix = migration.useLegacyMixOptions();
    const sel = migration.useLegacyPlaylistSelection();
    const ratio = migration.useLegacyRatioConfig();

    expect(warn).toHaveBeenCalled();
    expect(mix.mixOptions).toBe(mockState.mixOptions);
    expect(typeof sel.selectPlaylist).toBe('function');
    expect(typeof ratio.updateRatioConfig).toBe('function');

    useAppSpy.mockRestore();
    warn.mockRestore();
  });
});
