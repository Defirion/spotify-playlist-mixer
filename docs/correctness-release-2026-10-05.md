# Correctness verification — 5 October 2026

This records local implementation and live verification against the active [roadmap](../PLAN.md). SM3 verification is complete for the available sources: the authenticated load/mix/edit/save/refresh flow passed and the deployed deep link returns the app shell. This records a local correctness result, not a deployment. Pre-existing edits to README, the plan, archived documents, and local agent files were preserved.

## Runtime boundary and baseline

The application enters through `App` and `AppShell`. Playlist selection uses `usePlaylistSearch` and `useSpotifyUrlHandler`. The editor uses `PlaylistMixer`, `useMixPreview`, and `useMixGeneration`; playlist loading uses `SpotifyService.getPlaylistTracks` and `FetchInstance`. Mix settings and selected playlists live in the Zustand store. Mixing runs in `src/utils/mixer/`.

The active service retry path is `ApiErrorHandler.withRetry`. `_helpers/errorNormalizer.ts` has no production caller; its old header indexing was not the active defect. The former add-track path used generic `retryWithBackoff`; writes now use the active handler with explicit non-idempotent protection. The generic helper and other migration abstractions remain for the later selective cleanup.

Before changes, `npm test` passed 1,029 tests in 131 files and `npm run build` passed. The build already emitted a large-chunk warning. Vite and the Netlify SPA fallback were already present. No `.codegraph/` directory was present, so ordinary repository inspection was used.

## Supported capabilities and evidence

| Capability | Current behavior | Evidence / remaining uncertainty |
|---|---|---|
| App quota mode | Development Mode | Confirmed by the user; Extended Quota has not been requested |
| Requested permissions | `playlist-read-private`, `playlist-read-collaborative`, `playlist-modify-public`, `playlist-modify-private` | Spotify authorization screen showed the requested access and user completed authorization; read/create/append operations succeeded; exact token response scope list not inspected |
| OAuth redirect | Current browser origin plus `/` | `http://127.0.0.1:3000/` accepted by Spotify and returned a connected session; dashboard configuration not inspected |
| Owned / collaborative sources | Load accessible playlist items completely | Owned “Salsa extra” loaded live: 66 entries, 65 with duration data; no collaborative source available |
| Other users' sources | Access depends on app capability; failures stop generation with an access/retry explanation | Supplied “Bachata Sensual Party Hits” loaded all 240 entries in this session; access succeeded despite published Development Mode guidance; do not assume every third-party playlist/app/account is supported |
| Track fields | Uses ID, URI, name, artists, album, and `duration_ms`; skips null items, episodes, local tracks, and explicitly unplayable tracks in the service loader | Controlled provider-shaped responses verified; live loading, visible metadata/durations, and ordered URI saving succeeded; raw token/provider payloads were not recorded |
| Popularity | No active popularity strategy or fabricated score; source ordering and shuffle remain available | Already removed before this work; active types/UI inspected |
| Playlist page completion | Explicit `next` is authoritative, with offset/limit/total and raw-item fallback when absent | Fully filtered pages still advance; missing items and non-advancing pages fail as incomplete |
| Source total / usable count | Source total is retained independently from the number of usable loaded tracks | Controlled progress tests; completed pagination may report 100% with fewer usable tracks than source entries |
| Saved mix | Creates a playlist off the Spotify profile and appends batches in preview URI order, including deliberate repeated URIs; private access requires Spotify's client | Live seven-song save and repeated track/order verified in Spotify; test playlist subsequently made private through Spotify; mocked multi-batch/partial-failure cases pass |

Spotify's [February 2026 migration guide](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide) describes Development Mode playlist-content access for owners/collaborators, metadata-only responses for other playlists, and removal of popularity fields. It states that Extended Quota apps are unaffected by those changes. This is provider guidance, not evidence of this app's actual mode or account access. Missing playlist items are an incomplete load rather than a successful empty playlist.

The user confirmed Development Mode, and both supplied sources loaded successfully in the live session. The reason for broader-than-documented third-party access was not established. According to Spotify's [playlist concepts](https://developer.spotify.com/documentation/web-api/concepts/playlists), `public: false` excludes a playlist from the profile/search but does not restrict link access; the Web API cannot change that access control. The UI now explains “Make private” in Spotify before and after a save, and the privacy policy reflects the distinction.

## Findings and fixes

| Finding from the old review / roadmap | Current verdict |
|---|---|
| Conflicting duration units | Reproduced in presets/defaults; fixed with `targetDurationSeconds` throughout options, fixtures, warnings, generation, and presets |
| Popularity-dependent strategies | Already removed from active runtime; no further strategy migration needed |
| Search signal absent | Already forwarded to fetch; remaining query-change, clear, and authentication cancellation gaps repaired |
| Stale preview / loading results | Reproduced and repaired with request-local controllers and guards for state, errors, progress, and finalizers |
| Edited preview lost on token renewal | Found during live-flow follow-up inspection; fixed to preserve completed preview/order on renewal, clear on logout, and cancel pending loading; regression passes |
| Filtered-page truncation | Service already used metadata; preserved and hardened, and shared offset logic added to URL/unselected-track loading |
| All-song ratio cap / duration attempt cap | Reproduced and repaired; available queues and exhaustion policy now control completion |
| Missing track occurrence identity | Reproduced and repaired for selection, drag, removal, manual append, and preview/save order |
| Playlist maximum only in UI | Reproduced and repaired in state; ten sources maximum, with removal still permitted |
| Native `Retry-After` / unsafe write replay | Active paths repaired; native and object headers supported, full wait respected, waits abortable, retries bounded |
| Toast dismissal loses ID | Reproduced and repaired through App/AppShell |
| Privacy / token debug output | Touched active token/header output removed and browser/Spotify data flow documented accurately |
| API profile visibility mistaken for private access | Exposed by live save; explained in save controls, success message, policy, and service documentation; test playlist manually made private and verified |
| Silent failed source / empty edited preview | Generation now fails for an unavailable source; saving an emptied preview does not regenerate and substitute another mix |
| CI lacks production build | Repaired; build added before coverage tests |
| Netlify fallback / Vite missing | Already present; output directory and fallback configuration verified |
| Mixer exhaustion result metadata | Existing array return still does not expose full exhaustion metadata to all consumers; canonical result contract remains follow-up work |
| Fragmented provider boundary / dead abstractions | Deferred to SM4 after live correctness acceptance |

## Mix and editor semantics

The form displays minutes and stores seconds: 60 minutes is 3,600 seconds. The default is 240 minutes (14,400 seconds). Built-in preset targets are Karimctiva 300 minutes, Workout 60 minutes, and Road Trip 180 minutes. No settings persistence or saved user-preset implementation was found; uncertain legacy values were not multiplied or migrated.

Mode precedence is Use All Songs, then duration, then count. State normalizes conflicting flags and the mixer also applies that precedence. Duration mixing includes whole songs until the target is reached, so the final song may exceed the target; the UI explains this and displays actual duration.

Use All Songs has no ratio-derived count cap. Frequency and time ratios determine contributions while sources have tracks. With continuation disabled, an exhausted source stops the mix; with continuation enabled, remaining sources continue. A successfully loaded empty source participates in that policy. A failed or inaccessible source stops generation with its name and recovery guidance.

Automatic generation preserves the existing global Spotify-ID deduplication within and across sources. Each generated result has an occurrence ID. Manual additions create fresh occurrence IDs, so repeated tracks can be selected, moved, and removed separately. Saving preserves their final order and repeated URIs. Source/ratio/meaningful option changes invalidate the preview; an intentionally empty edited preview remains editable and cannot silently trigger regeneration on save.

## Requests, retries, and save recovery

Playlist reads pass cancellation to transport and retry waits. New requests, clear/reset, token changes/logout, and unmount cancel the previous loading request. Guarded callbacks prevent older results, errors, progress, or finalizers from overwriting a newer request's state. Search retains its existing request-local controller and now cancels promptly when its input or authentication changes.

Token renewal preserves a completed preview and its custom order, including an intentionally emptied preview. Logout clears it. A pending preview is canceled and cleared across a token change; completion from the old token cannot restore it. Controlled hook transitions pass. The diagnostic “Refresh connection” action and automatic timer share the same renewal callback; the diagnostic action completed a real Spotify refresh while preserving the five-track edited preview, and subsequent authenticated diagnostics succeeded. The naturally elapsed timer was not separately waited for; its scheduling and token handling are covered by automated tests.

HTTP 429 retries wait the full valid `Retry-After` number of seconds, read using native `Headers.get` or the compatible object representation; cancellation interrupts the wait. Retry attempts remain bounded. Access failures terminate without a rate-limit loop. This matches Spotify's [rate-limit guidance](https://developer.spotify.com/documentation/web-api/concepts/rate-limits).

Playlist creation and append operations do not automatically replay ambiguous network or server failures. A rejected 429 can retry within the bounded policy. If creation succeeded but a later batch fails, the error identifies the created playlist, reports the number of tracks confirmed saved, and tells the user to check Spotify before creating another copy. An ambiguous final request may have succeeded; the app does not report full success. Duplicate submissions are blocked while a save is pending, including during reset. Preview generation and saving controls cannot overlap through the UI.

Save requests are not canceled mid-write or automatically reconciled by re-reading Spotify. A session change detected after creation stops before appending and reports the created destination. Confirmed batch counts are conservative evidence, not a claim that an ambiguous final batch was rejected. This avoids blind replay but still requires the user to inspect Spotify after an uncertain outcome.

## Verification

| Check | Result |
|---|---|
| Baseline `npm test` | 131 files, 1,029 tests passed |
| Final `npm test` | 136 files, 1,063 tests passed |
| Final `npm run test:coverage` | 136 files, 1,063 tests passed |
| Coverage | Statements 95.83%; branches 87.47%; functions 95.88%; lines 96.55% |
| `node scripts/check-coverage.js` | Passed; 60% statement threshold |
| `npm run lint` | Passed without warnings |
| `npm run build` | Passed, including TypeScript check; output in `build/` |
| Browser startup / login | Signed-out screen and user-completed PKCE authorization passed; owned/search diagnostics returned 200 at `2026-10-05T12:16:56.654Z` |
| Direct production `/privacy` load | Passed using local Vite preview on port 4173 |
| Netlify output / fallback | Existing `publish = "build"` and `/* -> /index.html` status 200 verified in configuration |
| Deployed fallback | Host HTTP check of `https://spotify-mixer.netlify.app/privacy` returned 200 with title “Spotify Playlist Mixer” and the app root; browser rendering was not verified because attachment timed out |
| CI | Workflow edited locally; remote CI not executed |

New regressions cover both ratio types and exhaustion policies, long duration targets with short songs, whole-song overflow, mode precedence, preset units, state limits, duplicate occurrence selection/reorder/removal, emptied-preview saves, filtered/malformed pages, native retry headers, full delay and cancellation, source failures, partial saves, concurrent submissions, and URI order.

## Live flow evidence

| Check | Observed result |
|---|---|
| Owned source | `78KFUAwBw6dsOrYhFcQHgB`, “Salsa extra”: 66 source entries, 65 tracks with duration data |
| Third-party source | `5T7eowYuk28NiBUiPoOu14`, “Bachata Sensual Party Hits”: 240 source entries, load succeeded |
| Song-count mode / frequency ratios | Six-song preview: three songs from each source, 23 minutes displayed |
| Duration mode / play-time ratios | Ten-minute target: three whole songs, displayed 11 minutes; visible durations sum to 11m 29s |
| All songs / play-time ratios / stop first | 155 tracks: 65 from owned source, 90 from third-party source; 9h 53m displayed |
| All songs / play-time ratios / continue | 304 tracks after deduplication: 65 owned, 239 third-party; 18h 49m displayed |
| All songs / frequency ratios / stop first | 129 tracks: 65 owned, 64 third-party; 8h 32m displayed |
| All songs / frequency ratios / continue | 304 tracks after deduplication, same source totals and duration as play-time continuation |
| Occurrence editing | Added the same “Diamante” track twice: 6 → 7 → 8 tracks; removed one manual occurrence: 8 → 7; moved the remaining manual occurrence independently using keyboard drag |
| Live save | One authorized playlist created with seven songs; verified directly in Spotify, including exact edited order and repeated track ID |
| Access control | Initially “Public Playlist” but not on profile; selected “Make private” in Spotify; “Private Playlist” verified afterward |
| Success notification | Correct notification dismissed; preview remained intact; updated privacy guidance visible |
| Real connection refresh | Completed at `2026-10-05T12:49:19.644Z` through the same callback used by the automatic timer; edited five-track preview remained unchanged in count and exact order |
| Requests after refresh | Owned playlists `/me/playlists` and playlist `/search` both returned 200 at `2026-10-05T12:52:48.722Z`; edited preview still unchanged |

Saved playlist: [Mixer verification — delete later](https://open.spotify.com/playlist/3y6isGYmeVMudia1S2nAQq). Verified Spotify order:

1. Pa'l Bailador — `6rsAqgBNLooUcpO060WSv4`
2. Diamante — `01pBq7DYbZBFpeTzODQ4bA`
3. Llorarás — `0zDO5avDZSXRwWzfuguIRb`
4. Si Me Extrañas — `2MS8lKMuQopXMoUTjwSv5H`
5. Tú Con El — `6sRQjwLPdzADXhgZeKy6PQ`
6. Diamante — `01pBq7DYbZBFpeTzODQ4bA`
7. Yo Soy Feo — `6G2cOj6VbZJbvmN3tVo8N3`

Screenshots were saved locally under `test-results/`: `live-preview.jpg`, `live-save.jpg`, `live-spotify-private.jpg`, and `live-refresh.jpg`. The private screenshot confirms Spotify's private label; the refresh screenshot shows successful renewal and subsequent 200 responses. These are verification artifacts, not credentials. No extra playlist, deployment, playback action, or deletion was performed.

## Verification limits and follow-up scope

The user completed local authorization and the authorized save. No collaborative playlist is available, so that case is not applicable to this session. Dashboard configuration and the exact returned scope list were not inspected; the local redirect and required read/write operations succeeded. Real Spotify renewal and preservation of edited work were verified using the shared automatic/manual refresh callback. Automatic timer scheduling is regression-tested; the live session did not wait for natural expiry. The deployed deep link returns the app shell over HTTP; full deployed browser rendering was not verified. No deployment was performed.

SM3's supported-flow checks are complete for the available sources. The successful third-party access in this session is an observed capability, not a guarantee for other Development Mode apps or accounts.

Work stops at the plan's optional SM3 stopping point. SM4's canonical provider/result models, consolidation of the remaining endpoint-building hooks, complete exhaustion metadata, and selective dead-code/generated-artifact cleanup remain follow-up work. Local-library adapters, matching, playback, broad UI work, and another bundler migration remain outside this slice.

## Deployment integration follow-up

The user authorized production deployment via the existing GitHub-to-Netlify integration. Before pushing, `origin/master` was fetched and three newer commits through `e07c2c313ad3e4f96feb3c6c6455bf7da00cdcd2` were merged with the local correctness release. Their additional `user-read-private` request, granted-scope metadata, account diagnostic, and fresh-approval reconnect were retained together with the manual/automatic refresh callback. An outdated login-component test caused the existing remote CI failure; its expected scope list was updated without weakening the assertion.

The merged tree passes 1,066 tests in 136 files, production build, lint, and the coverage threshold. Coverage is 95.61% statements, 87.36% branches, 95.75% functions, and 96.31% lines. The earlier live four-scope authorization and refresh evidence remains historical; a new authorization with the merged scope request has not been exercised. GitHub CI and the published production asset are checked after the push. Unrelated local README edits, the pre-existing `big_idea.txt` deletion, local agent configuration, and screenshots are excluded from the deployment commit.
