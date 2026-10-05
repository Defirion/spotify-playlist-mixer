# Spotify Playlist Mixer Repair Plan

## Goal

Repair the real correctness issues found in the September 2026 code review and prepare the app for future non-Spotify playlist sources and destinations.

This is a small private app. Prefer simple, observable fixes over general-purpose infrastructure or theoretical edge-case handling.

The full review is preserved at [`docs/reviews/2026-09-full-code-review.md`](docs/reviews/2026-09-full-code-review.md). The longer-term local-library direction is documented at [`docs/local-library-direction.md`](docs/local-library-direction.md).

## Non-goals

- CRA -> Vite migration
- broad UI redesign
- generic plugin framework
- full error-system rewrite
- speculative scalability work
- local music server implementation
- Navidrome/Jellyfin integration
- fuzzy matching implementation
- fixing bugs in confirmed-dead code

## Architectural Direction

Spotify should become an integration boundary, not the application's domain model.

```text
Spotify / future source
        ↓
provider adapter
        ↓
canonical Track / Playlist
        ↓
mixer / local-library matcher
        ↓
Spotify / local / future destination
```

The local-library work in this cycle is scaffolding only:

- provider-neutral `Track` and `Playlist` models
- `PlaylistSource` contract
- `PlaylistDestination` contract
- `matched` / `ambiguous` / `missing` result model

No local backend implementation yet.

---

## PR 1 — Correctness

### Scope

- [ ] Replace ambiguous `targetDuration` with `targetDurationSeconds`
- [ ] Normalize mixer duration calculations to seconds
- [ ] Add duration regression tests
- [ ] Fix playlist pagination termination
- [ ] Forward `AbortSignal` into Spotify requests
- [ ] Prevent stale playlist-search responses
- [ ] Prevent stale mix-preview responses
- [ ] Fix `Retry-After` handling for native `Headers`
- [ ] Handle `QUOTA_EXCEEDED` separately from normal 429
- [ ] Preserve success-toast IDs
- [ ] Make "Use All Songs" actually include all usable tracks
- [ ] Standardize track instance identity using `instanceId ?? id`
- [ ] Enforce the existing playlist-count limit in state
- [ ] Add Netlify SPA fallback
- [ ] Correct inaccurate privacy-policy wording

### Exit criteria

- Existing unrelated behavior remains unchanged
- Each fixed bug has a focused regression test
- Tests pass
- Production build succeeds

---

## PR 2 — Provider Boundary

### Scope

- [ ] Add provider-neutral `Track` domain model
- [ ] Add provider-neutral `Playlist` domain model
- [ ] Separate Spotify DTOs from domain models
- [ ] Add Spotify normalization functions
- [ ] Introduce `SpotifyGateway`
- [ ] Move Spotify endpoint construction into the gateway
- [ ] Make popularity optional rather than defaulting missing data to `0`
- [ ] Disable popularity-dependent behavior when the capability is absent
- [ ] Add `PlaylistSource` contract
- [ ] Add `PlaylistDestination` contract
- [ ] Add `matched` / `ambiguous` / `missing` import result types

### Explicitly not included

- local library scanner
- fuzzy matching
- local database
- Navidrome/Jellyfin adapter
- local playback
- new local-library UI

### Exit criteria

Core mixing code should operate on internal domain models rather than Spotify wire-response shapes where reasonably achievable without rewriting the application.

---

## PR 3 — Cleanup

### Scope

- [ ] Confirm production references before deleting migration-era code
- [ ] Remove confirmed-dead Spotify/state/DnD abstractions
- [ ] Remove obsolete endpoint mocks/tests
- [ ] Align fixtures with the active Spotify contract
- [ ] Remove generated coverage/report artifacts
- [ ] Add TypeScript check to CI
- [ ] Add production build check to CI
- [ ] Add lint only if the current tree can satisfy it without unrelated cleanup

### Exit criteria

The repository contains less duplicated/dead architecture than before, not merely more abstraction layered on top of it.

---

## Deferred

Items discovered during implementation go here unless they block the current PR. Do not expand an active PR merely because another issue exists.

- CRA -> Vite
- seeded randomness
- broad accessibility pass
- unified application error hierarchy
- CSP/security-header tuning
- local music server
- local-library matching implementation

## Working Rules

This file is a scope document, not a workflow protocol.

- Use normal branches, PRs, and CI.
- Check items off only when they are actually completed.
- Update the plan when a technical assumption changes.
- Do not add agent roles, handoff templates, SHA bookkeeping, or mandatory status rituals.
- Do not fix confirmed-dead code merely because a review found a bug in it; delete it during cleanup if appropriate.
