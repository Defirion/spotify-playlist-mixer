# Provider boundary — 5 October 2026

SM4's first end-to-end path is implemented locally and freshly verified with Spotify. Automated checks pass. This record does not claim a deployment or reuse SM3's older live evidence as verification of this refactor.

## Implemented path

`SpotifyService` retains transport, metadata-driven pagination, cancellation, bounded retry waits, and protected non-idempotent writes. `SpotifyGateway` wraps that service and implements canonical `PlaylistSource` and `PlaylistDestination` contracts. Preview and generation load canonical playlists through the gateway, run the existing ratio algorithm on canonical tracks, and convert its output into the existing editor's display tracks. Saving converts edited display tracks back into canonical tracks and resolves their Spotify source references at the destination boundary.

`src/types/domain.ts` defines `Track`, `Playlist`, stable `SourceRef`, mixed occurrences, the typed mix result, and the small source/destination contracts. Spotify DTOs remain in `src/types/spotify.ts`. Normalization is isolated in `src/services/spotifyNormalizer.ts`:

- Track IDs are qualified as `spotify:<id>`, so future providers can distinguish equal raw IDs.
- Domain durations are milliseconds in `durationMs`. Spotify's `duration_ms` is converted once; absent or invalid durations become zero, preserving the current loading behavior.
- Artist names are strings. Album, release date, artwork, and ISRC remain optional. Popularity is not introduced.
- Provider IDs and destination URIs live in source references. The canonical mixer requires no Spotify URI or wire fields.

The gateway retains original display metadata per source outside the domain model. It preserves the first occurrence's DTO when automatic mixing deduplicates a repeated track, replaces metadata on reload, and carries generated occurrence IDs through conversion. Display durations use the canonical normalized value, so invalid wire durations cannot make preview statistics disagree with the mixer. Existing manual duplicate editing remains in the editor. Save requests preserve edited URI order, including repeated occurrences.

## Result and recovery semantics

`mixPlaylistsWithResult` returns `{ tracks, exhaustedPlaylists, stoppedEarly }`. Exhaustion is computed from usable remaining catalog identities, including sources emptied by cross-source deduplication. Reaching the requested count or duration is successful completion even if the final track empties a source. Consuming every source in all-song mode is also completion; stopping at the first exhausted source while others remain reports an early stop. The array convenience export remains for domain callers that only need tracks.

Source failures and incomplete loading still prevent successful generation. Cancellation guards remain in both hooks and the gateway. Token renewal preserves an already edited preview; logout clears it.

The gateway validates destination references before creating a playlist, checks session continuity before creation and append, and reports the created destination plus conservative confirmed counts on a failed append. It does not add a replay layer. The service's existing batching and ambiguous-write protections remain authoritative. A source track without a Spotify reference is rejected by the canonical destination; the existing UI emits its established missing-URI events before calling it.

## Selective cleanup

After checking current callers, removed:

- `normalizeMixResult` and its legacy array/object-shape tests, now superseded by the typed result contract.
- `_helpers/errorNormalizer` and its tests; the active `ApiErrorHandler` never called it.
- 133 tracked generated files under `temp-coverage/` and `tmp-coverage/`; both directories are now ignored. Files were removed only from those verified workspace directories.

Mixer fixtures, integration invariants, and performance inputs now use canonical tracks. Obsolete compatibility-shape cases and a fixture-only no-op test were retired, with meaningful domain and adapter cases added. The test count changed from 1,066 to 1,061 for these reasons.

Fresh live editing also reproduced a pre-existing manual track-search crash: the modal forwarded its click event to a search callback accepting an optional string. That event replaced the query and triggered `trim is not a function`. The button now invokes the callback without arguments; a targeted click regression passes. The final suite includes this new case.

## Verification

| Check | Result |
|---|---|
| Fresh pre-change `npm test` | 1,066 tests, 136 files passed |
| Final full suite with coverage | 1,061 tests, 136 files passed |
| Statements / branches / functions / lines | 95.64% / 87.43% / 95.86% / 96.40% |
| Coverage threshold | Passed, 60% required |
| Production build | Passed with TypeScript checking; existing large-chunk warning remains |
| Lint | Passed after correcting line endings in two test files |
| Browser startup | Local production preview at `http://127.0.0.1:3000/` rendered the connection screen |
| Local `/privacy` fallback | HTTP 200 from production preview |
| Fresh authenticated flow | Owned/third-party loads, both ratio types, count/duration/all modes, duplicate editing, ordered repeated-track save, private status, notification dismissal and real token renewal passed |

The user connected the local preview with all five reported scopes: `user-read-private`, `playlist-read-private`, `playlist-read-collaborative`, `playlist-modify-public`, and `playlist-modify-private`. Diagnostics at `2026-10-05T13:47:05.916Z` returned 200 for `/me`, `/me/playlists`, and playlist search. The owned source again reported 66 entries (65 with duration), and the third-party source reported 240 entries. Six-song count mixing produced three songs per source; a ten-minute duration target with listening-time ratios produced three whole songs totaling 11m 29s. All-song stop-first produced 155 tracks/9h 53m for time ratios and 129 tracks/8h 32m for count ratios; continuation produced 304 tracks/18h 49m for both. These are fresh observations from the canonical path for this app/account, not a general provider access guarantee.

After rebuilding the manual-search fix, a reconnect approval click was rejected by automatic review because the original request did not explicitly list account/playlist permissions. The user then explicitly approved the five named scopes, and the preview reconnected. No permissions beyond those five were requested.

## Live editor and destination evidence

On the corrected production build, manual search for `Diamante SONCE` returned five tracks without crashing. The six-song preview gained two additional occurrences of the existing “Diamante” track (6 → 7 → 8); removing one manual occurrence left seven tracks. Keyboard drag moved the remaining manual occurrence independently before “Yo Soy Feo”.

The deliberately initiated test save created [SM4 verification — delete later](https://open.spotify.com/playlist/0MhofKKypVO3mm9cGIJgnZ) once with seven songs. Spotify's client showed the following exact order and repeated catalog ID:

1. Pa'l Bailador — `6rsAqgBNLooUcpO060WSv4`
2. Diamante — `01pBq7DYbZBFpeTzODQ4bA`
3. Llorarás — `0zDO5avDZSXRwWzfuguIRb`
4. Si Me Extrañas — `2MS8lKMuQopXMoUTjwSv5H`
5. Tú Con El — `6sRQjwLPdzADXhgZeKy6PQ`
6. Diamante — `01pBq7DYbZBFpeTzODQ4bA`
7. Yo Soy Feo — `6G2cOj6VbZJbvmN3tVo8N3`

As documented in SM3, API profile visibility is distinct from link access. The test playlist initially showed “Public Playlist” despite the `public: false` request; Spotify's client offered “Make private”, which was selected. “Private Playlist” was then verified. No playback or deletion was performed. The app's matching success notification was dismissed without discarding the preview.

Real connection renewal succeeded at `2026-10-05T16:07:52.375Z` through the existing shared automatic/manual renewal callback. The seven-track edited preview retained its exact order, including both “Diamante” occurrences. Follow-up authenticated diagnostics at `2026-10-05T16:08:35.710Z` returned 200 for `/me`, `/me/playlists`, and playlist search. The naturally elapsed timer was not separately observed for this refactor.

Local screenshots under `test-results/` record the edited preview, save message, Spotify private status and refreshed connection. The approval screenshot records the consent handoff, not credentials. Source and adapter regressions also cover cancellation, stale generation, concurrent submission, empty edited previews and ambiguous writes.

Contract tests cover sparse provider metadata, source totals distinct from usable counts, incomplete/canceled reads, provider-neutral mixing, provider-qualified deduplication, count/duration completion metadata, both all-song exhaustion policies, original display metadata, repeated edited URI order, canonical save receipts, unresolved destination references, stale sessions before/after creation, and partial writes without replay. Existing request-race, token renewal, occurrence-editing, and service pagination/retry regressions also pass.

## Remaining scope

This deliberately migrates one complete mixing path first. Playlist discovery, track search, the unselected-track loader, and the existing UI/store presentation contracts still use Spotify DTOs. Their migration and other suspected dead state/DnD abstractions require current caller evidence and are not included in this cleanup. The gateway's display bridge can be removed when those presentation contracts move to domain data.

No matching implementation currently consumes `matched` / `ambiguous` / `missing` types, so those types remain design direction rather than unused scaffolding. Local scanning, databases, music-server adapters, matching, playback, UI redesign, and deployment remain outside this slice. Fresh authenticated acceptance is complete for the migrated path and available sources; no collaborative source was available. Further presentation migration and additional dead-code cleanup remain follow-up work.
