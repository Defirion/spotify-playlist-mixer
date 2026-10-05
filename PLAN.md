# Spotify Mixer — correctness release and provider boundary

Status: **active roadmap**. Adopted 5 October 2026. Milestones below describe intended work; adoption does not mark implementation or acceptance complete.

## Roadmap authority and preserved detail

This is the active project plan. The [previous plan](docs/archive/PLAN-before-adoption-2026-10-05.md) is preserved verbatim, including the local edits present at adoption. Its detailed product requirements and regression cases remain references; its old sequencing/status text is superseded here. Current game-law, runtime-contract, and verification documents retain their established authority. No retired agent-role or exact-SHA attestation workflow is reinstated.

The baseline observations below are dated snapshots. Recheck source and working changes before implementation; historical commits, PR descriptions, and prior test counts are not fresh acceptance evidence.

Updated 5 October 2026. Repository: `C:/Users/defir/Documents/fun_with_Copilot/Kiro vibes`, `Defirion/spotify-playlist-mixer`.

## Execution record — 5 October 2026

Local correctness work and the authenticated load/mix/edit/save/refresh flow are verified. **SM3 verification is complete for the available sources.** Detailed evidence, supported behavior, recovery instructions, and provider limitations are in [the correctness verification record](docs/correctness-release-2026-10-05.md). This is a local correctness result; no deployment was performed.

| Milestone | Current status |
|---|---|
| SM0 | Runtime paths and baseline verified; Development Mode confirmed by user; local OAuth redirect and owned/third-party source access verified live; no collaborative source available; exact granted scope list/dashboard configuration not inspected |
| SM1 | Duration seconds and preset values, mode precedence, exhaustion semantics, occurrence editing, and state playlist limit implemented; automated regressions pass |
| SM2 | Pagination, cancellation, bounded retry waits, partial-save reporting, write replay protection, toast IDs, and privacy corrections implemented; automated regressions pass; live loading, occurrence editing, ordered save, and toast dismissal verified |
| SM3 | Complete for available sources: 1,063 tests pass across 136 files; coverage, lint, and production build pass; production build added to CI; local production startup/deep link and authenticated mix/save/refresh flow checked; deployed `/privacy` returns HTTP 200 with the app shell |
| SM4 | First end-to-end provider boundary and selective cleanup implemented and live verified; 1,061 tests and coverage pass, lint and build pass; remaining UI/store DTO migration and additional cleanup deferred |

Baseline was 1,029 passing tests across 131 files and a passing build. Final statement coverage is 95.83%, above CI's 60% threshold. No persisted mix settings or saved user-preset implementation was found, so no speculative duration migration was added. Existing automatic generation removes duplicate Spotify track IDs; manually added occurrences remain independently editable and retain repeated URI order when saved.

Live verification created [Mixer verification — delete later](https://open.spotify.com/playlist/3y6isGYmeVMudia1S2nAQq) with seven songs in the edited order. It was made private through Spotify's client and its private status verified. Spotify's API `public: false` controls profile/search visibility, not access through a link; the app now explains the required “Make private” step before and after saving. Both supplied playlists loaded in this Development Mode session; this observed access must not be generalized to other apps/accounts.

Token renewal now preserves a completed edited preview while canceling pending loading; logout still clears the preview. The diagnostic “Refresh connection” action uses the same renewal callback as the automatic timer. A real Spotify refresh succeeded at `2026-10-05T12:49:19.644Z`; the five-track edited preview retained its exact order, and refreshed owned-playlist/search requests returned 200. Timer scheduling and renewal transitions also pass automated regressions; a naturally elapsed timer was not separately waited for.

Deployment follow-up: the user requested production deployment through the existing GitHub-to-Netlify integration. Three newer `origin/master` commits were integrated, preserving their `user-read-private` request, granted-scope metadata, account probe, and fresh-approval reconnect alongside the verified refresh action. A stale login-test scope expectation was corrected. The combined tree passes 1,066 tests in 136 files, coverage (95.61% statements), lint, and production build. The earlier authenticated evidence predates this merged scope change; it does not claim a newly granted scope. Production publication is verified separately after pushing `master`.

SM4 continuation: the mixer now consumes canonical `Track` inputs with `durationMs` and provider-qualified IDs. `SpotifyGateway` implements the small canonical source/destination contracts behind preview and generation/save hooks; it preserves the existing editor DTOs through an explicit presentation bridge. Typed mix results now report exhausted sources and whether the configured count/time/all-song policy stopped early. Ordered repeated URI writes, cancellation, session changes, and incomplete-save recovery have adapter contract coverage. The retired result-shape normalizer, unused API error normalizer, and 133 tracked generated coverage files were removed. See [SM4 verification and remaining scope](docs/provider-boundary-2026-10-05.md).

Fresh SM4 acceptance verified both supplied sources, all three mix modes, both ratio types and both exhaustion policies, manual track search, independent duplicate addition/removal/reordering, a seven-track ordered save, and preservation of the edited preview across real token renewal. Live search exposed a pre-existing click-event/query crash; the callback was fixed and regression-tested. [SM4 verification — delete later](https://open.spotify.com/playlist/0MhofKKypVO3mm9cGIJgnZ) was created once, its exact order and repeated track verified in Spotify, then made private through Spotify's client. This work is local and has not been deployed.

Mixer usability follow-up: exhaustion guidance now accounts for different source song lengths, offers opt-in source-size ratio suggestions, and keeps the stop/continue choice available even without a warning. Applying suggestions preserves group sizes and invalidates the old preview. The full suite passes 1,074 tests across 138 files with 95.73% statement coverage; build, lint and changed-file formatting pass. Whole-tree formatting still flags 21 untouched CSS files. This change remains local; broader provider/local-library expansion remains deferred. See [exhaustion guidance and verification](docs/mixer-exhaustion-guidance.md).

The dated observations below are retained as the starting snapshot. The execution record supersedes their implementation status, including the all-song cap, ambiguous duration name, and missing CI build step.

## Outcome

A user can load supported playlists completely, generate a mix whose count/duration and exhaustion behavior match the controls, rearrange individual track occurrences, and save the intended result. Slow requests, missing provider fields, expired access, and partial saves produce clear outcomes rather than misleading success or stale previews.

First deliver a correctness release. Then introduce a small provider boundary and remove confirmed migration debris. Preserve the existing React/Vite application.

## What is already present

- Vite migration is already complete. `npm run build` runs TypeScript checking and builds to `build/`, matching Netlify configuration.
- The Netlify SPA fallback already exists. Verify deep links; do not implement it again.
- `SpotifyService.getPlaylistTracks` already uses response pagination metadata instead of filtered-item counts. Preserve and test that improvement.
- Playlist search already passes an `AbortSignal` and keeps a request-local controller. Do not assume the old September search finding is still unfixed.
- The form displays minutes and converts to seconds; mixer calculations use seconds. Ambiguous `targetDuration` naming and old preset values still need a complete trace.
- `useAllSongs` remains capped by `estimatedTotalSongs` in `shouldContinueMixing`; reconcile that behavior with exhaustion policy.
- The inspected error normalizer still accesses headers as object properties; prove whether it is in the active retry path before repairing or deleting it.
- CI currently runs coverage/tests; it does not run the production build.

Baseline: `master` at `4b6edfff8bd745d060c94fd7fdc5c78bda35c6ef`, with unrelated local changes. The September review and `PLAN.md` are inputs, not a current bug verdict.

## SM0 — Verify the usable product boundary and current failures

**Dependencies:** none. **Size:** small investigation slice.

1. Trace current production entrypoints and identify the active service, hook, mixer, state, and retry paths. Tag old findings as reproduced, already fixed, inactive/dead, or not yet tested.
2. Run the baseline tests/build before edits and record existing failures separately from new regressions.
3. Check the configured Spotify app's actual quota mode, granted scopes, redirect URI, and live access diagnostics without recording credentials. Test one owned playlist, one collaborative playlist if available, and one third-party playlist.
4. Record the supported source behavior and available fields. Development-mode restrictions can prevent reading other users' playlist contents and remove popularity fields; the app should reflect the observed capability rather than fabricate an empty playlist or fake popularity. Extended-quota behavior differs. [Official migration guide](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide).
5. Choose a documented default for mode precedence: Use All Songs, duration target, and song count must be mutually understandable. Preserve the explicit exhaustion option: stopping when the first source empties versus continuing remaining sources. Do not silently override it.

**Exit:** a short supported-capability table and a reproducible surviving-defect list. If Spotify cannot supply the desired inputs in the current app mode, explain that limit before investing in a broader architecture change. Continue correctness work for supported inputs; additional source adapters become separately scoped work.

## SM1 — Fix mix semantics and occurrence identity

**Dependencies:** SM0. **Suggested implementation slice:** mixing/state/components and focused regressions.

- Define `targetDurationSeconds` at the options boundary; track duration stays milliseconds with explicit conversion helpers. Trace UI defaults, built-in presets, user presets, warnings, preview, generation, and exported settings.
- Version or migrate persisted settings conservatively. Do not multiply every old value by 60: the inspected current form already stores seconds. Identify known legacy formats and preserve uncertain values with a visible reset/migration choice if necessary.
- Define duration stopping explicitly, including whether the final song may exceed the target. Recommended compatibility default: include whole songs until the target is reached and show the actual duration. Avoid changing this silently if current product behavior promises a hard cap.
- In Use All Songs mode, source exhaustion and the chosen stop/continue policy determine completion; a ratio-estimated length must not silently truncate available tracks. Ratios choose ordering/contributions while sources are available; they do not invent extra tracks.
- Represent distinct occurrences using `instanceId ?? id` consistently in selection, drag/reorder, removal, and save. Decide and test the existing duplicate policy across/within playlists; an occurrence identifier is not a deduplication rule.
- Enforce the existing playlist-count limit in state as well as UI.

**Acceptance cases:** 60-minute input means 3,600 seconds; every built-in preset has its intended duration; two unequal sources finish according to both exhaustion policies; duplicates can be moved/removed independently; no available occurrence vanishes merely due to ratio estimates; empty and unavailable sources remain understandable; preview count/duration matches the actual generated list.

## SM2 — Reliable loading, latest-request wins, and safe saving

**Dependencies:** SM0; apply SM1 semantics to final preview/save checks.

- Retain the existing metadata-driven pagination. Add cases with null/unavailable/unsupported items, a fully filtered page followed by usable items, and explicit next-page metadata. Track source total versus usable loaded count honestly; do not call a partial load complete.
- Carry cancellation through active playlist-loading/service/retry paths. A superseded request must not update results, errors, progress, or loading state belonging to a newer request. Cover preview generation, clearing, logout, and unmount; retain already-correct search behavior.
- Treat absence of popularity as absence. Disable/explain popularity-dependent strategies when the capability is unavailable rather than substituting a numeric zero.
- Read active fetch-response headers through `Headers.get`, while retaining any still-required object-header support. Handle `Retry-After` units consistently and stop abortable waits when canceled. Transient 429 handling must respect Spotify's wait guidance. [Official rate-limit guidance](https://developer.spotify.com/documentation/web-api/concepts/rate-limits).
- Distinguish observed quota/access restrictions from recoverable rate limiting and prevent unbounded retry loops. Do not invent undocumented error codes; retain `QUOTA_EXCEEDED` support only if it is an actual application/provider error shape in use.
- Check playlist creation and multi-batch writes as one observable save operation. Show partial completion explicitly. Do not blindly replay a non-idempotent write after an ambiguous network response; reconcile where supported or give a clear recovery action.
- Preserve success-toast IDs and dismiss/update the intended toast only. Ensure preview order and saved URI order agree.
- Remove authorization-header/token values from existing debug output in the touched active request paths; align privacy text with actual browser/provider behavior.

**Acceptance:** controlled delayed responses cannot overwrite newer results; cancellation stops active transport/waits; filtered pages do not lose later data; missing popularity has a clear supported fallback; mocked rate/access errors terminate appropriately; mocked partial save never reports full success.

SM1 and SM2 may be separate small PRs; neither requires the provider refactor first.

## SM3 — Complete the correctness release

**Dependencies:** SM1 and SM2.

1. Run focused regressions, `npm test`, and `npm run build`. Use `npm run test:coverage` where CI requires it; add the production build to CI rather than a redundant separate typecheck job.
2. Verify browser login/refresh, supported playlist loading, both ratio types, count/time/all modes, preview/reorder, and a deliberately initiated test save. Use a deliberately authorized test destination for live save verification and record the outcome.
3. Check Netlify deep-link fallback and production output alignment using the existing config. Any preview/public deployment is a separate execution action.
4. Update `PLAN.md` to reflect fixed/verified/deferred findings and document supported Spotify capabilities and recovery behavior.

**Done:** current tests and build pass, the real supported user flow succeeds, and remaining provider limitations are accurately described. A failed dependency install or account restriction is an environment/provider finding, not a reason to rewrite the mixer.

## SM4 — Small provider boundary, then cleanup

**Dependencies:** accepted correctness release. **Optional stopping point:** stop at SM3 if the app now meets the user's needs.

- Introduce canonical Track/Playlist models, separate Spotify DTO normalization, and one narrow Spotify gateway behind the existing hooks. Use optional provider metadata and stable source references; normalize durations in one place.
- Introduce small `PlaylistSource` / `PlaylistDestination` contracts, and the planned matched/ambiguous/missing result types only as needed to preserve the documented local-library direction. No generic plugin framework.
- Migrate one end-to-end path first, then remove old abstractions after proving no production imports/callers remain.
- Align fixtures with the active provider shapes and preserve domain tests independent of Spotify wire responses. Remove confirmed-dead state/service/DnD code and generated tracked coverage outputs selectively.

**Done:** mixing operates on canonical domain inputs, the Spotify adapter has focused contract tests, source/destination changes have one boundary, and the real Spotify flow remains correct.

Local scanning, fuzzy matching, databases, Navidrome/Jellyfin adapters, playback, a UI redesign, and another bundler migration remain later work.

## Files to start from

`PLAN.md`, `docs/reviews/2026-09-full-code-review.md`, `docs/local-library-direction.md`, `src/services/spotify.ts`, `src/services/fetchClient.ts`, `src/services/_helpers/`, `src/hooks/usePlaylistSearch.ts`, `usePlaylistTracks.ts`, `useMixPreview.ts`, `useMixGeneration.ts`, `src/utils/mixer/`, `src/utils/trackUtils.ts`, `src/store/slices/mixingSlice.ts`, `src/components/features/mixer/PlaylistForm.tsx`, `src/components/PresetTemplates.tsx`, `.github/workflows/ci.yml`.

Read active source before applying the old review. These plans require no new agent-role workflow or full audit ceremony.

## Previous scope carried forward

| Previous scope | Current execution milestone |
|---|---|
| PR 1 correctness | SM0 identifies surviving findings; SM1/SM2 repair them; SM3 verifies the release |
| PR 2 provider boundary | SM4 introduces canonical models, gateway, and minimal source/destination contracts |
| PR 3 cleanup | SM3 adds production-build CI; SM4 removes confirmed-dead code/fixtures and generated outputs |

Seeded randomness, a broad accessibility redesign, a unified error hierarchy, speculative CSP/header work, local music-server implementation, and local-library matching remain deferred. Lint changes are bounded by the existing tree; they do not authorize unrelated cleanup. Vite migration and the existing SPA fallback are present and need verification rather than reimplementation.
