# Coverage notes

Coverage is generated with Vitest's V8 provider:

```powershell
npm run test:coverage
```

The report is written to the configured coverage output directory. Type-only
files, index re-exports, test utilities, fixtures, and platform-specific
mocks are excluded by `vite.config.ts` because statement coverage is not a
useful signal for them.

When adding Spotify API behavior, prefer focused tests for:

- `/items` pagination and unavailable playlist items;
- `/me/playlists` creation and `/items` add/remove requests;
- Search's 5-result default and 10-result maximum;
- ratio- and duration-based mixer behavior without catalog popularity data.

Run `npm test` and `npm run build` alongside coverage when changing service or
mixer logic.
