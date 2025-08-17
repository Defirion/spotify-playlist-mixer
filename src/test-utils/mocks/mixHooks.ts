/**
 * Factories to create mock modules for useMixPreview and useMixGeneration.
 * Moved out of `__tests__` so Jest won't auto-discover it as a test file.
 */
import type { SpotifyTrack } from '../../types/spotify';

type PreviewResult = { tracks: SpotifyTrack[] } | SpotifyTrack[];

type UseMixPreviewImpl = (
  playlists?: unknown,
  ratio?: unknown,
  opts?: unknown
) => Promise<PreviewResult> | PreviewResult;

export const makeUseMixPreviewModule = (impl?: UseMixPreviewImpl) => {
  const _previewFn = jest.fn(
    async (...args: Parameters<UseMixPreviewImpl>): Promise<PreviewResult> => {
      const result = impl ? impl(...args) : { tracks: [] };
      return (await Promise.resolve(result)) as PreviewResult;
    }
  );
  return {
    __esModule: true,
    useMixPreview: () => ({
      state: {
        preview: null as null | unknown,
        loading: false,
        error: null as null | unknown,
        customTrackOrder: null as null | unknown,
      },
      generatePreview: _previewFn,
      updateTrackOrder: jest.fn() as jest.Mock<void, [unknown]>,
      clearPreview: jest.fn() as jest.Mock<void, []>,
      getPreviewTracks: jest.fn<SpotifyTrack[], []>(() => []),
      _previewFn,
    }),
  };
};

type MixGenResult = { tracks: SpotifyTrack[] } | SpotifyTrack[];
type UseMixGenImpl = (cfg?: unknown) => Promise<MixGenResult> | MixGenResult;

export const makeUseMixGenerationModule = (impl?: UseMixGenImpl) => {
  const _mixFn = jest.fn(
    async (...args: Parameters<UseMixGenImpl>): Promise<MixGenResult> => {
      const result = impl ? impl(...args) : { tracks: [] };
      return (await Promise.resolve(result)) as MixGenResult;
    }
  );
  return {
    __esModule: true,
    useMixGeneration: () => ({
      state: {
        loading: false,
        error: null as null | unknown,
        mixedTracks: [] as SpotifyTrack[],
        exhaustedPlaylists: [] as string[],
        stoppedEarly: false,
      },
      generateMix: _mixFn,
      createPlaylist: jest.fn<
        Promise<{ id: string; name: string }>,
        [string, unknown]
      >(async () => ({ id: 'created', name: 'created' })),
      reset: jest.fn() as jest.Mock<void, []>,
      _mixFn,
    }),
  };
};

// Legacy factories
export const makeUseMixPreviewMock = (impl?: UseMixPreviewImpl) => {
  const _previewFn = jest.fn(
    async (...args: Parameters<UseMixPreviewImpl>): Promise<PreviewResult> => {
      const result = impl ? impl(...args) : { tracks: [] };
      return (await Promise.resolve(result)) as PreviewResult;
    }
  );
  const mockModule = () => ({
    __esModule: true,
    useMixPreview: () => ({
      state: {
        preview: null as null | unknown,
        loading: false,
        error: null as null | unknown,
        customTrackOrder: null as null | unknown,
      },
      generatePreview: _previewFn,
      updateTrackOrder: jest.fn(),
      clearPreview: jest.fn(),
      getPreviewTracks: jest.fn(() => [] as SpotifyTrack[]),
      _previewFn,
    }),
  });
  return { mockModule, _previewFn };
};

export const makeUseMixGenerationMock = (impl?: UseMixGenImpl) => {
  const _mixFn = jest.fn(
    async (...args: Parameters<UseMixGenImpl>): Promise<MixGenResult> => {
      const result = impl ? impl(...args) : { tracks: [] };
      return (await Promise.resolve(result)) as MixGenResult;
    }
  );
  const mockModule = () => ({
    __esModule: true,
    useMixGeneration: () => ({
      state: {
        loading: false,
        error: null as null | unknown,
        mixedTracks: [] as SpotifyTrack[],
        exhaustedPlaylists: [],
        stoppedEarly: false,
      },
      generateMix: _mixFn,
      createPlaylist: jest.fn(async () => ({ id: 'created', name: 'created' })),
      reset: jest.fn(),
      _mixFn,
    }),
  });
  return { mockModule, _mixFn };
};

export default {};
