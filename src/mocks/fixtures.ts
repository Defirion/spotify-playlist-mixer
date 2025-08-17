export const mockUserProfile = {
  id: 'test_user_123',
  display_name: 'Test User',
  email: 'test@example.com',
  country: 'US',
  product: 'premium',
  images: [
    {
      url: 'https://via.placeholder.com/300x300',
      height: 300,
      width: 300,
    },
  ],
  followers: {
    total: 42,
  },
};

export const mockPlaylists = [
  {
    id: 'playlist_1',
    name: 'My Awesome Playlist',
    description: 'A collection of great songs',
    public: true,
    collaborative: false,
    owner: {
      id: 'test_user_123',
      display_name: 'Test User',
    },
    tracks: {
      total: 25,
      href: 'https://api.spotify.com/v1/playlists/playlist_1/tracks',
    },
    images: [
      {
        url: 'https://via.placeholder.com/640x640',
        height: 640,
        width: 640,
      },
    ],
    external_urls: {
      spotify: 'https://open.spotify.com/playlist/playlist_1',
    },
  },
  {
    id: 'playlist_2',
    name: 'Chill Vibes',
    description: 'Relaxing music for any time',
    public: false,
    collaborative: false,
    owner: {
      id: 'test_user_123',
      display_name: 'Test User',
    },
    tracks: {
      total: 18,
      href: 'https://api.spotify.com/v1/playlists/playlist_2/tracks',
    },
    images: [
      {
        url: 'https://via.placeholder.com/640x640',
        height: 640,
        width: 640,
      },
    ],
    external_urls: {
      spotify: 'https://open.spotify.com/playlist/playlist_2',
    },
  },
  {
    id: 'playlist_3',
    name: 'Workout Mix',
    description: 'High energy tracks for exercise',
    public: true,
    collaborative: true,
    owner: {
      id: 'test_user_123',
      display_name: 'Test User',
    },
    tracks: {
      total: 32,
      href: 'https://api.spotify.com/v1/playlists/playlist_3/tracks',
    },
    images: [
      {
        url: 'https://via.placeholder.com/640x640',
        height: 640,
        width: 640,
      },
    ],
    external_urls: {
      spotify: 'https://open.spotify.com/playlist/playlist_3',
    },
  },
];

export const mockTracks = [
  {
    id: 'track_1',
    name: 'Test Song 1',
    artists: [
      {
        id: 'artist_1',
        name: 'Test Artist 1',
        external_urls: {
          spotify: 'https://open.spotify.com/artist/artist_1',
        },
      },
    ],
    album: {
      id: 'album_1',
      name: 'Test Album 1',
      images: [
        {
          url: 'https://via.placeholder.com/640x640',
          height: 640,
          width: 640,
        },
      ],
      release_date: '2023-01-15',
      external_urls: {
        spotify: 'https://open.spotify.com/album/album_1',
      },
    },
    duration_ms: 210000,
    explicit: false,
    popularity: 75,
    preview_url: 'https://example.com/preview1.mp3',
    track_number: 1,
    uri: 'spotify:track:track_1',
    external_urls: {
      spotify: 'https://open.spotify.com/track/track_1',
    },
  },
  {
    id: 'track_2',
    name: 'Another Great Song',
    artists: [
      {
        id: 'artist_2',
        name: 'Amazing Artist',
        external_urls: {
          spotify: 'https://open.spotify.com/artist/artist_2',
        },
      },
      {
        id: 'artist_3',
        name: 'Featured Artist',
        external_urls: {
          spotify: 'https://open.spotify.com/artist/artist_3',
        },
      },
    ],
    album: {
      id: 'album_2',
      name: 'Incredible Album',
      images: [
        {
          url: 'https://via.placeholder.com/640x640',
          height: 640,
          width: 640,
        },
      ],
      release_date: '2023-03-22',
      external_urls: {
        spotify: 'https://open.spotify.com/album/album_2',
      },
    },
    duration_ms: 195000,
    explicit: true,
    popularity: 82,
    preview_url: 'https://example.com/preview2.mp3',
    track_number: 3,
    uri: 'spotify:track:track_2',
    external_urls: {
      spotify: 'https://open.spotify.com/track/track_2',
    },
  },
  {
    id: 'track_3',
    name: 'Chill Melody',
    artists: [
      {
        id: 'artist_4',
        name: 'Relaxed Musician',
        external_urls: {
          spotify: 'https://open.spotify.com/artist/artist_4',
        },
      },
    ],
    album: {
      id: 'album_3',
      name: 'Peaceful Sounds',
      images: [
        {
          url: 'https://via.placeholder.com/640x640',
          height: 640,
          width: 640,
        },
      ],
      release_date: '2023-05-10',
      external_urls: {
        spotify: 'https://open.spotify.com/album/album_3',
      },
    },
    duration_ms: 240000,
    explicit: false,
    popularity: 68,
    preview_url: 'https://example.com/preview3.mp3',
    track_number: 2,
    uri: 'spotify:track:track_3',
    external_urls: {
      spotify: 'https://open.spotify.com/track/track_3',
    },
  },
  {
    id: 'track_4',
    name: 'Energy Boost',
    artists: [
      {
        id: 'artist_5',
        name: 'High Energy Band',
        external_urls: {
          spotify: 'https://open.spotify.com/artist/artist_5',
        },
      },
    ],
    album: {
      id: 'album_4',
      name: 'Power Up',
      images: [
        {
          url: 'https://via.placeholder.com/640x640',
          height: 640,
          width: 640,
        },
      ],
      release_date: '2023-07-08',
      external_urls: {
        spotify: 'https://open.spotify.com/album/album_4',
      },
    },
    duration_ms: 180000,
    explicit: false,
    popularity: 91,
    preview_url: 'https://example.com/preview4.mp3',
    track_number: 1,
    uri: 'spotify:track:track_4',
    external_urls: {
      spotify: 'https://open.spotify.com/track/track_4',
    },
  },
  {
    id: 'track_5',
    name: 'Midnight Dreams',
    artists: [
      {
        id: 'artist_6',
        name: 'Dream Pop Collective',
        external_urls: {
          spotify: 'https://open.spotify.com/artist/artist_6',
        },
      },
    ],
    album: {
      id: 'album_5',
      name: 'Nocturnal',
      images: [
        {
          url: 'https://via.placeholder.com/640x640',
          height: 640,
          width: 640,
        },
      ],
      release_date: '2023-09-15',
      external_urls: {
        spotify: 'https://open.spotify.com/album/album_5',
      },
    },
    duration_ms: 225000,
    explicit: false,
    popularity: 73,
    preview_url: 'https://example.com/preview5.mp3',
    track_number: 4,
    uri: 'spotify:track:track_5',
    external_urls: {
      spotify: 'https://open.spotify.com/track/track_5',
    },
  },
];

export const mockAuthToken = {
  access_token: 'mock_access_token_123',
  token_type: 'Bearer',
  expires_in: 3600,
  refresh_token: 'mock_refresh_token_456',
  scope:
    'user-read-private user-read-email playlist-read-private playlist-modify-public playlist-modify-private',
};
