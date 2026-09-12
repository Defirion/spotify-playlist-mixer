/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly REACT_APP_SPOTIFY_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
