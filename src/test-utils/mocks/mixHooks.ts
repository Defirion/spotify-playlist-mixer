/**
 * Factories to create mock modules for useMixPreview and useMixGeneration.
 * Moved out of `__tests__` so Jest won't auto-discover it as a test file.
 */
import type { SpotifyTrack } from '../../types/spotify';

type PreviewResult =
  | {
      tracks: SpotifyTrack[];
      stats?: Record<string, unknown>;
      totalDuration?: number;
    }
  | SpotifyTrack[];

type UseMixPreviewImpl = (
  playlists?: unknown,
  ratio?: unknown,
  opts?: unknown
) => Promise<PreviewResult> | PreviewResult;

export const makeUseMixPreviewModule = (impl?: UseMixPreviewImpl) => {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const _previewFn = jest.fn(
    async (...args: Parameters<UseMixPreviewImpl>): Promise<PreviewResult> => {
      if (impl) {
        return (await Promise.resolve(impl(...args))) as PreviewResult;
      }
      // Default to returning fixture tracks so integration tests render preview
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { mockTracks } = require('../../mocks/fixtures');
      return {
        tracks: mockTracks,
        stats: {},
        totalDuration: mockTracks.reduce(
          (acc: number, t: any) => acc + (t.duration_ms || 0),
          0
        ),
      } as PreviewResult;
    }
  );
  /* eslint-enable @typescript-eslint/no-unused-vars */
  return {
    __esModule: true,
    useMixPreview: () => {
      // Prefer React state when used inside components so updates cause re-renders.
      // However, some tests call this mock directly outside React, which triggers
      // an "Invalid hook call". We detect that and fall back to a plain object
      // implementation so those tests don't crash.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const React = require('react') as typeof import('react');

      let isHookContext = true as boolean;
      let state: any;
      let setState: (updater: any) => void;

      try {
        // Try to use hooks (works when called inside a component)
        // This will throw when invoked outside hook rules, which we catch below.
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const tuple = React.useState<any>({
          preview: null,
          loading: false,
          error: null,
          customTrackOrder: null,
        });
        state = tuple[0];
        setState = tuple[1];
      } catch (err) {
        // Fallback non-hook state for direct invocation in tests.
        isHookContext = false;
        state = {
          preview: null,
          loading: false,
          error: null,
          customTrackOrder: null,
        };
        setState = (updater: any) => {
          if (typeof updater === 'function') {
            const res = updater(state);
            if (res && typeof res === 'object') {
              Object.assign(state, res);
            }
          } else if (updater && typeof updater === 'object') {
            Object.assign(state, updater);
          }
        };
      }

      const generatePreview = jest.fn(async (...args: any[]) => {
        let result;
        if (impl) {
          result = await Promise.resolve(impl(...args));
        } else {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { mockTracks } = require('../../mocks/fixtures');
          result = { tracks: mockTracks };
        }
        const previewShape: any = Array.isArray(result)
          ? { tracks: result }
          : result;
        // Ensure stats and totalDuration exist to satisfy MixPreview expectations
        previewShape.stats = previewShape.stats || {};
        previewShape.totalDuration =
          previewShape.totalDuration ??
          (Array.isArray(previewShape.tracks)
            ? previewShape.tracks.reduce(
                (acc: number, t: any) => acc + (t.duration_ms || 0),
                0
              )
            : 0);

        // Use the setState compatible with hook or fallback implementation
        setState((s: any) => ({ ...(s || {}), preview: previewShape }));
        return previewShape;
      });

      const updateTrackOrder = jest.fn((newTracks: any[]) => {
        setState((s: any) => ({
          ...(s || {}),
          preview: { ...((s && s.preview) || {}), tracks: newTracks },
        }));
      });

      const clearPreview = jest.fn(() =>
        setState((s: any) => ({ ...(s || {}), preview: null }))
      );

      const getPreviewTracks = jest.fn(
        () => (state && state.preview && state.preview.tracks) || []
      );

      return {
        state,
        generatePreview,
        updateTrackOrder,
        clearPreview,
        getPreviewTracks,
        _previewFn: generatePreview,
        _isHookContext: isHookContext,
      };
    },
  };
};

type MixGenResult = { tracks: SpotifyTrack[] } | SpotifyTrack[];
type UseMixGenImpl = (cfg?: unknown) => Promise<MixGenResult> | MixGenResult;

export const makeUseMixGenerationModule = (impl?: UseMixGenImpl) => {
  const _mixFn = jest.fn(
    async (...args: Parameters<UseMixGenImpl>): Promise<MixGenResult> => {
      if (impl) {
        return (await Promise.resolve(impl(...args))) as MixGenResult;
      }
      // Default to fixture tracks to simulate generated mix in integration tests
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { mockTracks } = require('../../mocks/fixtures');
      return { tracks: mockTracks } as MixGenResult;
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
      >(async (name?: string, tracks?: unknown) => {
        // Only log when explicitly requested by tests or during development
        const _testVerbose = String(
          process.env.TEST_VERBOSE || ''
        ).toLowerCase();
        if (
          _testVerbose === '1' ||
          _testVerbose === 'true' ||
          process.env.NODE_ENV === 'development'
        ) {
          // eslint-disable-next-line no-console
          console.log('mock.createPlaylist called', {
            name,
            tracksLength: Array.isArray(tracks)
              ? (tracks as any).length
              : undefined,
          });
        }
        return { id: 'created', name: name || 'created' };
      }),
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

const mixHooksNoop = {};
export default mixHooksNoop;
