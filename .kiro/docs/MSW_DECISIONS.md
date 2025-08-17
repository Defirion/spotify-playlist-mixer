# MSW decisions and rationale

This document captures the project's choices around Mock Service Worker (MSW), why test helpers live in `src/test-utils` and `src/mocks`, and why those folders are excluded from production TypeScript compilation.

## Key points

- MSW is pinned to `0.49.3` in `devDependencies` to avoid issues with newer ESM-only MSW distributions breaking Create React App's default Jest transform. Newer MSW versions can leak `export` syntax into files Jest tries to transform, causing `Unexpected token 'export'` errors.

- Test helpers that use MSW (`src/test-utils/msw-setup.ts`, `src/mocks/browser.ts`, `src/mocks/server.ts`, etc.) are test-only and should not be part of the production build or enforce type-checking during production builds.

- To prevent TypeScript from attempting to resolve MSW imports during production builds (which can cause TS2307 or bundler issues), we exclude test-only folders from `tsconfig.json`'s compilation set.

## Practical outcomes

- Developers can still write MSW-enabled tests by importing `setupMSW()` from `src/test-utils/msw-setup.ts` inside test files.

- CI and Netlify builds won't fail due to MSW test helpers being type-checked or bundled for production.

- If you need MSW network-style tests to run everywhere (no fallback), open a tech-debt ticket to update Jest transforms or migrate testing to an ESM-friendly runner.

## How to revert/change

- To make MSW test files included in TS checks again, remove `src/mocks`, `src/test-utils`, and `src/__tests__` from the `exclude` array in `tsconfig.json` and ensure `msw` is upgraded and compatible with your Jest transform.

- To run MSW in production (not recommended), move MSW code behind environment guards so it's only imported in dev/test environments.

## Links
- See `README.md` and `docs/MSW_TESTING.md` for more context and examples.

Document created to help reviewers and CI troubleshoot MSW-related failures.
