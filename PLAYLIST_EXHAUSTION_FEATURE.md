# Playlist exhaustion handling

Current behavior, verified 5 October 2026.

The **Continue when playlist empty** checkbox controls what happens when a
selected source has no usable, unused tracks left. It is **disabled by default**.

- Disabled: stop when any source is exhausted. A count or duration target may
  remain unmet, and an all-song mix can leave songs in other sources.
- Enabled: skip exhausted sources and keep mixing from the remaining sources
  until the count or duration target is reached, or every source is exhausted.
  Limited available tracks can still produce a mix shorter than the target.

**Use All Songs** takes precedence over count and duration targets. Automatic
mixing deduplicates catalog identities across sources; manual additions remain
editable as separate occurrences. Count balancing uses song shares; listening-time
balancing uses duration shares. Duration targets take whole songs and may overshoot.
The exhaustion choice does not promise exact ratio adherence as sources run out.

## Guidance before generation

The form estimates the first source to run out and explains the selected policy.
The optional **Apply suggested ratios** action uses source counts for count
balancing and estimated source duration for time balancing. Applying suggestions
preserves group sizes, target, and exhaustion policy, and invalidates the preview.

These are estimates: shared tracks, unavailable items, missing durations, group
sizes, and ordering affect the actual mix. See
[exhaustion guidance](docs/mixer-exhaustion-guidance.md) for details and verification.
The current preview shows tracks and statistics; it does not show a separate
post-generation exhaustion notice.

## Implementation

- `src/store/slices/mixingSlice.ts` defines the disabled continuation default.
- `src/components/features/mixer/PlaylistForm.tsx` renders the control and guidance.
- `src/utils/exhaustionPrediction.ts` computes advisory predictions and suggestions.
- `src/utils/mixer/playlistMixer.ts` implements mixPlaylistsWithResult, returning
  { tracks, exhaustedPlaylists, stoppedEarly }. The mixPlaylists convenience
  export returns only the tracks array.
- `src/utils/mixer/mixingCalculations.ts` applies count/time/all stopping and
  stop/continue exhaustion policies.

Reaching a requested target is completion even if the last song empties a source.
Consuming every source in all-song mode is also completion. Stopping at the first
exhausted source while other sources remain reports an early stop. Preview and
generation load canonical tracks through the provider gateway; the editor keeps
its existing display-track boundary.
