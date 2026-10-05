import { useAppStore } from '../index';
import { makePlaylist } from '../../test-utils/mocks/spotify';

beforeEach(() => {
  useAppStore.getState().clearAllPlaylists();
  useAppStore.getState().resetMixOptions();
});

test('playlist limit applies to both direct selection and toggling, while removal remains possible', () => {
  const playlists = Array.from({ length: 11 }, (_, i) =>
    makePlaylist({ id: String(i) })
  );
  playlists.forEach(playlist =>
    useAppStore.getState().selectPlaylist(playlist)
  );
  expect(useAppStore.getState().selectedPlaylists).toHaveLength(10);
  useAppStore.getState().togglePlaylistSelection(playlists[10]);
  expect(useAppStore.getState().ratioConfig['10']).toBeUndefined();
  useAppStore.getState().togglePlaylistSelection(playlists[0]);
  useAppStore.getState().togglePlaylistSelection(playlists[10]);
  expect(useAppStore.getState().selectedPlaylists.map(p => p.id)).toEqual(
    playlists.slice(1).map(p => p.id)
  );
});

test('explicit mode changes normalize all and duration flags', () => {
  useAppStore.getState().updateMixOptions({ useTimeLimit: true });
  expect(useAppStore.getState().mixOptions).toMatchObject({
    useTimeLimit: true,
    useAllSongs: false,
  });
  useAppStore.getState().updateMixOptions({ useAllSongs: true });
  expect(useAppStore.getState().mixOptions).toMatchObject({
    useTimeLimit: false,
    useAllSongs: true,
  });
  useAppStore.getState().applyPresetOptions({
    presetName: 'Count',
    settings: { useAllSongs: false, useTimeLimit: false, totalSongs: 42 },
  });
  expect(useAppStore.getState().mixOptions.totalSongs).toBe(42);
});
