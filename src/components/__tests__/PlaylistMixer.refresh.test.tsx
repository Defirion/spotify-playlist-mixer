import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import PlaylistMixer from '../PlaylistMixer';
import { makePlaylist, makeTrack } from '../../test-utils/mocks/spotify';
import { DEFAULT_MIX_OPTIONS } from '../../store/slices/mixingSlice';

const hooks = vi.hoisted(() => ({
  generatePreview: vi.fn(),
  clearPreview: vi.fn(),
  createPlaylist: vi.fn(),
  generateMix: vi.fn(),
  edited: [] as any[],
  preview: null as any,
}));
vi.mock('../../hooks/useMixPreview', () => ({
  useMixPreview: () => ({
    state: { preview: hooks.preview, loading: false },
    generatePreview: hooks.generatePreview,
    clearPreview: hooks.clearPreview,
    getPreviewTracks: () => hooks.edited,
    updateTrackOrder: vi.fn(),
  }),
}));
vi.mock('../../hooks/useMixGeneration', () => ({
  useMixGeneration: () => ({
    state: { loading: false },
    generateMix: hooks.generateMix,
    createPlaylist: hooks.createPlaylist,
  }),
}));
vi.mock('../../hooks/useMixWarnings', () => ({
  useMixWarnings: () => ({ exceedsLimit: false, ratioImbalance: false }),
}));

const sources = [
  makePlaylist({ id: 'a', name: 'Bachata' }),
  makePlaylist({ id: 'b', name: 'Salsa' }),
];
const ratios = {
  a: { min: 1, max: 2, weight: 50, weightType: 'frequency' as const },
  b: { min: 1, max: 2, weight: 50, weightType: 'frequency' as const },
};
const options = {
  ...DEFAULT_MIX_OPTIONS,
  playlistName: 'Friday',
  totalSongs: 10,
};
const props = {
  accessToken: 'fixture',
  selectedPlaylists: sources,
  ratioConfig: ratios,
  mixOptions: options,
  updateMixOptions: vi.fn(),
};
const fresh = {
  tracks: [
    { ...makeTrack({ id: 'fresh' }), instanceId: 'fresh', sourcePlaylist: 'a' },
  ],
  stats: {},
  totalDuration: 180000,
};

beforeEach(() => {
  vi.clearAllMocks();
  hooks.edited = [
    {
      ...makeTrack({ id: 'edited' }),
      instanceId: 'edited',
      sourcePlaylist: 'a',
    },
  ];
  hooks.preview = {
    tracks: hooks.edited,
    stats: { a: { name: 'Bachata', count: 1, totalDuration: 180000 } },
    totalDuration: 180000,
  };
  hooks.generatePreview.mockResolvedValue(fresh);
  hooks.createPlaylist.mockResolvedValue(makePlaylist({ id: 'saved' }));
});

test('keeps edited rows after settings change and saves regenerated tracks', async () => {
  const { rerender } = render(<PlaylistMixer {...props} />);
  const next = { ...options, totalSongs: 20 };
  rerender(<PlaylistMixer {...props} mixOptions={next} />);
  expect(
    screen.getByText('Settings changed. Press Preview to refresh.')
  ).toBeInTheDocument();
  expect(hooks.clearPreview).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Create on Spotify' }));
  await waitFor(() =>
    expect(hooks.createPlaylist).toHaveBeenCalledWith('Friday', fresh.tracks)
  );
  expect(hooks.generatePreview).toHaveBeenCalledWith(sources, ratios, next);
});

test('a name change preserves edited tracks for saving', async () => {
  const { rerender } = render(<PlaylistMixer {...props} />);
  rerender(
    <PlaylistMixer
      {...props}
      mixOptions={{ ...options, playlistName: 'Renamed' }}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Create on Spotify' }));
  await waitFor(() =>
    expect(hooks.createPlaylist).toHaveBeenCalledWith('Renamed', hooks.edited)
  );
  expect(hooks.generatePreview).not.toHaveBeenCalled();
});

test('a failed refresh retains the edited preview and does not save outdated tracks', async () => {
  hooks.generatePreview.mockResolvedValue(undefined);
  const { rerender } = render(<PlaylistMixer {...props} />);
  rerender(
    <PlaylistMixer {...props} mixOptions={{ ...options, totalSongs: 20 }} />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Create on Spotify' }));
  await waitFor(() => expect(hooks.generatePreview).toHaveBeenCalledOnce());
  expect(hooks.createPlaylist).not.toHaveBeenCalled();
  expect(hooks.clearPreview).not.toHaveBeenCalled();
});

test('does not save a refresh superseded by another settings change', async () => {
  let finish!: (value: typeof fresh) => void;
  hooks.generatePreview.mockReturnValue(
    new Promise(resolve => {
      finish = resolve;
    })
  );
  const { rerender } = render(<PlaylistMixer {...props} />);
  rerender(
    <PlaylistMixer {...props} mixOptions={{ ...options, totalSongs: 20 }} />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Create on Spotify' }));
  rerender(
    <PlaylistMixer {...props} mixOptions={{ ...options, totalSongs: 30 }} />
  );
  await act(async () => finish(fresh));
  expect(hooks.createPlaylist).not.toHaveBeenCalled();
});

test('clearing all sources clears the preview', () => {
  const { rerender } = render(<PlaylistMixer {...props} />);
  rerender(
    <PlaylistMixer {...props} selectedPlaylists={[]} ratioConfig={{}} />
  );
  expect(hooks.clearPreview).toHaveBeenCalledOnce();
});
