# Mixer exhaustion guidance — 5 October 2026

The mixer now estimates which selected playlist will run out first before
generating a preview. Count and duration targets show a warning if the estimated
exhaustion occurs before the target. Use All Songs warns when sources are
estimated to run out at different points; it takes precedence over other modes.
The warning explains the current stop/continue choice.
The continuation checkbox remains available even when there is no warning;
continuing still respects a configured count or duration target.

Suggested ratios match relative source sizes: song counts for song-count
balancing, estimated source duration for listening-time balancing. Suggestions
use the existing integer priority range of 1–100. The displayed percentages
reflect those suggested priorities. Nothing changes automatically: clicking
**Apply suggested ratios** changes priorities, preserves balance method and
song-group sizes, and invalidates the existing preview through the established
settings-change path. The mix target and exhaustion policy remain unchanged.

Count-balanced duration predictions use the weighted average song duration of
the whole mix. Time-balanced song-count predictions use the time shares divided
by each source's average duration. Both avoid extrapolating the entire mix from
only the limiting source's song lengths.

These are advisory estimates from source summaries. Missing duration data uses
the existing 210-second average. Shared songs, duplicates, unavailable tracks,
group sizes and the actual track order can change the result. Suggested ratios
help sources finish closer together; they do not guarantee reaching an
unavailable target or exact simultaneous exhaustion. An empty source receives
no ratio suggestion. Balanced all-song inputs receive no imbalance warning.
Stale ratio entries for deselected playlists are ignored. Mixed count/time
methods receive no extrapolated prediction; the normal balance control applies
one method to all playlists. Preview results remain authoritative.

Local-library integration and other provider expansion remain deferred.

## Verification

- Full suite with coverage: 1,074 tests passed across 138 files. Statement
  coverage is 95.73%; the existing 60% CI threshold passes.
- Production build (including TypeScript checking) and lint pass. The existing
  large-bundle warning remains.
- All changed source files pass formatting, and `git diff --check` passes.
  Whole-tree formatting still reports 21 untouched CSS files.
- Calculation regressions cover unequal durations in both balance methods,
  count/time/all modes, target boundaries, stale ratio entries, empty sources,
  fallback metadata and bounded suggestions.
- An AppShell integration test checks that suggestions are opt-in, reach the
  ratio controls, preserve group sizes and invalidate an existing preview.
  Another checks that continuation preserves the configured target.

This feature is local. No deployment or new authenticated Spotify save was
performed for this change.
