Silence Policy for Tests

Purpose

This document explains how we silence console output in tests so passing runs stay quiet while failures still show logs.

Principles

- Prefer per-suite/per-test suppression using `beforeEach`/`afterEach` spies. This keeps spying scoped and predictable.
- Only use module-scoped spies when a test must install the spy before any test helpers or wrappers run (rare). If you do, opt the file out of the global silence helper.

Patterns

1. Per-suite suppression (recommended)

Use this when you want to silence noisy console output for a single test suite:

```js
let consoleLogSpy;
beforeEach(() => {
  consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => {
  consoleLogSpy?.mockRestore?.();
});
```

2. Module-scoped spies (use sparingly)

If a test needs the spy to exist at module load time (for example, to assert against calls made when modules are imported), install the spy at module scope and opt out of the global silence wrapper at the top of the test file:

```ts
// Place at the top of the test file
(globalThis as any).__NO_SILENCE = true;

// Then create spies at module scope
const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
```

Note: module-scoped spies must be restored after the suite using `afterAll` or similar.

3. Disabling the default API error handler logging in tests

Some convenience helpers use a module-level `defaultApiErrorHandler` that logs by default. If a test file triggers those helpers and you want to suppress the log during passing runs, disable logging in the test file (JS example):

```js
import { defaultApiErrorHandler } from '../../services/apiErrorHandler';
// disable module-level logging for this test file
defaultApiErrorHandler.enableLogging = false;
```

Contributing

When adding or updating tests, prefer pattern #1. Use pattern #2 only when you understand why the spy must be installed before test runtime. Document the rationale in the test file.

If you need help deciding which approach to use, ping the repo maintainers or open an issue with the test name and why you think you need module-scoped behavior.
