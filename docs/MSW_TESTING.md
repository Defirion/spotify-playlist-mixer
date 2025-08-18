MSW testing notes

Overview

This project supports two testing modes:

1. Hook-level mocks (default): Centralized factories for `useMixPreview` and `useMixGeneration` are registered in `src/setupTests.ts`. They keep tests deterministic and fast.

2. Network-style tests (optional): Tests can call `setupMSW()` from `src/__tests__/mocks/mswSetup.ts` to start an MSW `setupServer` with the provided handlers in `src/__tests__/mocks/mswHandlers.ts`.

Why the fallback exists

Recent versions of `msw` include ESM-only modules that can cause Create React App's (CRA) default Jest transform to throw during test bootstrap (you may see `Unexpected token 'export'` coming from a transitive dependency). To keep tests reliable without requiring a project-wide Jest transform change, we:

- Pin `msw` to `0.49.3` which avoids the problematic ESM-only distribution paths for most setups.
- Implement `setupMSW()` to `require('msw')` lazily inside a try/catch. If the require fails (due to transform issues), `setupMSW()` logs a short warning and returns without starting a server — tests continue to use hook-level mocks.

How to run tests

- Run all tests:

```powershell
npm test
```

- Run only integration tests:

```powershell
npm test -- --testPathPattern=src/__tests__/integration --watchAll=false
```

Troubleshooting

1. "MSW setup skipped: Unexpected token 'export'"
   - Meaning: Jest tried to parse an ESM-only file inside node_modules when MSW or a transitive dep was required. This is the expected fallback behavior; tests continue with hook-level mocks.
   - Fix options:
     a) Keep the fallback (recommended short-term) — no action required.
     b) Allow Jest to transform ESM deps by adjusting `transformIgnorePatterns` in Jest config so msw's ESM dependencies are transformed. This is a repo-level tooling change and may have side effects; treat as tech debt.
     c) Run tests in an environment that supports ESM for node_modules (advanced).

2. I want MSW network tests to always run
   - Create a tooling ticket: Update Jest config to transform MSW's ESM modules or migrate to a Node version/test runner that supports ESM dep transformation. This is higher-risk and should be scheduled separately.

3. Tests are failing because a hook mock is not what I expect
   - Tests use centralized mock factories in `src/__tests__/mocks/mixHooks.ts` by default. You can override or supply custom behavior by using the factory helpers inside a test file via `jest.mock('../../hooks/useMixPreview', () => require('../mocks/mixHooks').makeUseMixPreviewModule(async (cfg) => { ... }));`

Recommended next steps (tech debt)

- Create a ticket to investigate updating Jest transforms or consolidating test runner configuration so MSW's newer versions can be run without the try/catch fallback. This would allow moving to more up-to-date msw releases and reduce polyfills.

Contact

If you need help implementing the CI/tooling changes above, ping the team and allocate a short spike (1-2 days) to evaluate transform changes and confirm CI stability.

Note about Jest transforms and CI

We updated the repository Jest transform settings to allow Babel to transform a small set of ESM-style node_modules (notably `msw`, `axios`, `undici`, and `whatwg-fetch`). This enables running network-style MSW tests with the real HTTP stack (real `axios` + `msw`) instead of per-test fetch/undici workarounds. CI must use the same Node version as local dev and pick up the repo `jest.config.js`; transforming additional node_modules may slow test startup. If CI shows transform-related failures, revert the transform change and file a follow-up ticket to address ESM compatibility.
