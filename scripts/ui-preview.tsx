// Development-only browser fixture. The production entry never imports this.
// All Spotify requests stay here; preview and creation still use the real hooks.
import ReactDOM from 'react-dom/client';
import { MainApp } from '../src/App';
import AppProviders from '../src/AppProviders';
import { useAppStore } from '../src/store';
import { makePlaylist, makeTrack } from '../src/test-utils/mocks/spotify';
import { channelColors } from '../src/components/features/mixer/channelAppearance';
import '../src/index.css';
import '../src/styles/console-tokens.module.css';

const artwork = (color: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44"><rect width="44" height="44" fill="#181816"/><path d="M0 0h11v11H0zm22 0h11v11H22zM11 11h11v11H11zm22 0h11v11H33zM0 22h11v11H0zm22 0h11v11H22zM11 33h11v11H11zm22 0h11v11H33z" fill="${color}"/></svg>`)}`;
const names = [
  'Bachata Sensual',
  'Salsa Romantica',
  'Kizomba Classics',
  'Late Night Jazz',
];
const playlists = names.map((name, i) =>
  makePlaylist({
    id: `source${i}`,
    name,
    items: { total: i === 0 ? 48 : 80, href: '' },
    realAverageDurationSeconds: 240 + i * 10,
    images: [{ url: artwork(channelColors[i]), width: 44, height: 44 }],
  })
);
const tracks = playlists.map((playlist, source) =>
  Array.from({ length: playlist.items!.total }, (_, i) =>
    makeTrack({
      id: `${source}-${i}`,
      name: [
        'Madrugada (live)',
        'Noche de Luna',
        'Corazon Prestado',
        'Amor Prohibido',
        'Lluvia de Abril',
      ][i % 5],
      duration_ms: (240 + source * 10) * 1000,
      artists: [
        {
          id: `artist${source}`,
          name: [
            'Yosenia Cruz',
            'Marco Santana',
            'Talia Reyes',
            'Evening Quartet',
          ][source],
          uri: '',
          external_urls: { spotify: '' },
        },
      ],
      album: {
        id: `album${source}`,
        name: playlist.name,
        images: playlist.images,
        release_date: '2026',
        uri: '',
        external_urls: { spotify: '' },
      },
      uri: `spotify:track:${source}-${i}`,
    })
  )
);

window.fetch = async (input, init) => {
  const url = new URL(
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : input.url
  );
  const playlistIndex = playlists.findIndex(playlist =>
    url.pathname.includes(`/playlists/${playlist.id}`)
  );
  let data: unknown;
  if (url.pathname === '/v1/search')
    data = {
      playlists: { items: playlists, total: playlists.length },
      tracks: { items: tracks[3].slice(0, 10), total: 10 },
    };
  else if (playlistIndex >= 0 && url.pathname.endsWith('/items')) {
    const offset = Number(url.searchParams.get('offset') || 0);
    const limit = Number(url.searchParams.get('limit') || 100);
    data = {
      items: tracks[playlistIndex]
        .slice(offset, offset + limit)
        .map(item => ({ item })),
      total: tracks[playlistIndex].length,
      next:
        offset + limit < tracks[playlistIndex].length
          ? `${url.origin}${url.pathname}?offset=${offset + limit}&limit=${limit}`
          : null,
    };
  } else if (playlistIndex >= 0) data = playlists[playlistIndex];
  else if (url.pathname === '/v1/me/playlists' && init?.method === 'POST')
    data = makePlaylist({
      id: 'created',
      name: JSON.parse(String(init.body)).name,
    });
  else if (url.pathname === '/v1/playlists/created/items')
    data = { snapshot_id: 'saved' };
  else if (url.pathname === '/v1/me')
    data = { id: 'ui-test', display_name: 'UI verification' };
  else throw new Error(`Unmocked verification request: ${url.pathname}`);
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

const state = useAppStore.getState();
state.setAccessToken('local-verification-only');
playlists
  .slice(0, 3)
  .forEach(playlist => state.togglePlaylistSelection(playlist));
state.setRatioConfigBulk({
  source0: { min: 2, max: 2, weight: 38, weightType: 'time' },
  source1: { min: 1, max: 2, weight: 45, weightType: 'time' },
  source2: { min: 1, max: 1, weight: 25, weightType: 'time' },
});
state.updateMixOptions({
  playlistName: 'Friday Heat',
  useTimeLimit: true,
  useAllSongs: false,
  targetDurationSeconds: 300 * 60,
});
ReactDOM.createRoot(document.getElementById('root')!).render(
  <AppProviders>
    <MainApp />
  </AppProviders>
);
