POLYFILLS_MIGRATION_NOTES

Purpose
- Capture longer-term migration options and trade-offs for polyfills used in tests and the runtime.
- Provide a checklist and concrete steps to move from ad-hoc polyfills to a robust, documented solution after the TypeScript migration completes.

Background
- The test environment currently requires a set of browser-like globals (fetch, Request, Response, Headers, TextEncoder/TextDecoder, and minimal Streams) so that MSW and certain libraries run under Node.
- A temporary `src/jest.polyfills.ts` file provides defensive shims. These are intentionally minimal to avoid changing runtime semantics in environments that already provide the APIs.

Goals for a follow-up migration (post-TS migration)
1. Prefer native Node runtime behavior when available:
   - If CI and dev environments use Node 18+, rely on the built-in global `fetch` and remove third-party fetch polyfills.
2. Standardize on a single, well-maintained server-side polyfill when needed:
   - Recommended: `undici` (official, performant) as the preferred fetch polyfill for Node 16/17.
   - Avoid `node-fetch` v3 in CommonJS setups (v3 is ESM-only).
3. Decide on streaming support level:
   - Keep minimal shims for feature-detection-only checks, or
   - Adopt a full WHATWG-compatible stream polyfill if libraries require it.
4. Move polyfills to a Jest `setupFiles` entry (or maintain explicit import) to ensure deterministic loading order.
5. Add CI gate: smoke test that verifies polyfills (see `src/__tests__/polyfills.smoke.test.ts`).

Detailed migration checklist
- [ ] Verify Node version used in CI and development.
- [ ] If CI uses Node >= 18, remove external fetch polyfill code and document the change.
- [ ] Otherwise, install `undici` as a dev or runtime dependency depending on usage: `npm i undici --save-dev`.
- [ ] Update `src/jest.polyfills.ts` to prefer native -> undici -> node-fetch fallback.
- [ ] Run full test suite and iterate on failures.
- [ ] If streaming tests require more, evaluate `web-streams-polyfill` or similar and wire into the polyfills file.
- [ ] Update README or CONTRIBUTING docs to call out the Node version requirement and polyfills.

Risks & mitigation
- Risk: ESM vs CommonJS mismatch when using node-fetch v3. Mitigation: prefer undici or node-fetch v2 only.
- Risk: Incomplete stream polyfills cause subtle test failures. Mitigation: add a targeted smoke test and run integration tests.

Example commands
- Install undici (dev):
  npm install undici --save-dev

- Run smoke test locally:
  npm test -- src/__tests__/polyfills.smoke.test.ts -- --watchAll=false

Notes for maintainers
- Keep `src/jest.polyfills.ts` small and well-commented. Use defensive require() calls.
- When upgrading Node in CI, re-evaluate whether external polyfills are still necessary.

References
- undici: https://github.com/nodejs/undici
- node-fetch: https://github.com/node-fetch/node-fetch
- WHATWG Streams spec: https://streams.spec.whatwg.org/
