# Build and test toolchain migration

This note is retained as historical context for the completed CRA migration.
The repository now uses Vite and Vitest directly; Create React App,
`react-scripts`, Babel, and Jest are not the active build or test pipeline.

## Current toolchain

- Vite 8 builds the React application into `build/`.
- Vitest runs TypeScript and JSX tests in jsdom.
- TypeScript runs before Vite in `npm run build`.
- ESLint and Prettier provide linting and formatting.
- `REACT_APP_SPOTIFY_CLIENT_ID` remains supported through Vite's
  `envPrefix`, so existing deployment configuration does not need a rename.

## Commands

```powershell
npm start
npm run build
npm test
npm run lint
```

Do not reintroduce a Babel/Jest migration plan unless the build requirements
change. For Spotify API work, see
[SPOTIFY_API_MIGRATION.md](SPOTIFY_API_MIGRATION.md).
