Silence Policy for Tests

Purpose

This document explains our approach to keeping passing test runs quiet while still showing logs when tests fail.

Important constraint

- We do NOT add a global "silence everything" wrapper for the entire test run. Global suppression breaks many existing tests that rely on console spies, module-scoped logging, or runtime mock identity. Instead we silence specific noisy tests or suites when they produce benign logs during passing runs.

Principles

- Prefer per-suite/per-test suppression using `beforeEach`/`afterEach` spies. This keeps spying scoped and predictable.
- Only use module-scoped spies when a test must install the spy before any test helpers or wrappers run (rare). If you do, explicitly opt the file out of any global helpers (see pattern #2 below).
- Use the `silenceIfPass` helper for ad-hoc captures inside a test when you only need to silence a specific operation rather than an entire suite.

Patterns

1. Per-suite suppression (recommended)

Use this when a single test file or suite emits noisy logs that are not useful during passing runs:

```js
let consoleLogSpy;
let consoleErrorSpy;
beforeEach(() => {
  consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  consoleLogSpy?.mockRestore?.();
  consoleErrorSpy?.mockRestore?.();
});
```

2. Module-scoped spies (use sparingly)

If a test needs the spy at module load time (for example, to assert calls made during imports), install the spy at module scope and opt the file out of the default silence helper by setting an explicit flag at the top of the file:

```ts
// Place at the top of the test file to opt out of helpers that would otherwise capture console output
(globalThis as any).__NO_SILENCE = true;

// Then create module-scoped spies
const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

// Remember to restore in afterAll
afterAll(() => logSpy.mockRestore());
```

Note: Module-scoped spies must be restored after the suite using `afterAll` or similar.

3. Using `silenceIfPass` for focused captures

The repository provides a helper `silenceIfPass` (see `src/test-utils/silenceIfPass.ts`) that captures console output for the duration of a single operation and only replays it if the operation throws. Use this for localized suppression inside a single test or when you only need to silence one async operation:

```ts
await silenceIfPass(async () => {
  await someNoisyOperation();
});
```

4. Disabling module-level library logging

Some helpers use module-level logging (for example, a convenience `defaultApiErrorHandler`). Tests that trigger those modules can disable that logging at the top of the test file instead of adding global suppression:

```js
import { defaultApiErrorHandler } from '../../services/apiErrorHandler';
// disable module-level logging for this test file
defaultApiErrorHandler.enableLogging = false;
```

Contributing

- When adding or updating tests, prefer pattern #1 or `silenceIfPass` (pattern #3) to keep scope tight.
- Use pattern #2 only when necessary and document the reason in the test file.
- If you find a noisy test, either add per-suite spies or wrap the noisy operation with `silenceIfPass` rather than changing global test behavior.

If you're unsure which approach to use, open an issue or ask the maintainers with the test name and why it is noisy.

Debug instrumentation category

We differentiate between:

- Assertion logs: Required for test expectations. DO NOT silence.
- Domain/problem warnings: Useful signals (validation failures, edge-case warnings). Silence only if extremely noisy and unasserted.
- Debug instrumentation (temporary tracing: playlist creation logs, SpotifyService "DEBUG (spotify.ts)" lines, haptics vibration traces, masked token debug). These MUST be either:
  1. Gated behind an env flag (e.g. `if (process.env.DEBUG_SPOTIFY) console.log(...)`), or
  2. Silenced in the invoking test via per-suite spies, if not asserted.
- Focused diagnostic capture: wrap with `silenceIfPass` when only needed during failures.

console.debug is treated the same as console.log for suppression decisions.

Implementation guidance:

- Prefer gating new debug logs: `if (process.env.DEBUG_PLAYLIST_MIXER) { console.log('...'); }`.
- When cleaning existing noisy logs in tests, add per-suite spies for `log`, `debug`, and optionally `error` if the errors are expected.
- Avoid adding permanent debug logs that are never gated.
