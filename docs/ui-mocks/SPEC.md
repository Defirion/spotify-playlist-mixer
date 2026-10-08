# UI mock spec (shared by every direction)

Each mock is ONE self-contained HTML file (inline CSS + vanilla JS, no build step, Google Fonts via <link> allowed,
no other external assets — NO external images; make cover art with CSS gradients / inline SVG / generated patterns).
Desktop-first at 1440x900 but must degrade gracefully to 390px wide. Respect prefers-reduced-motion.

## The app (Spotify Playlist Mixer) — functionality that MUST remain visible/usable

1. **Connect** state (signed-out screen): explains the app, "Connect Spotify" button. Include it as a toggleable
   view (e.g. a small "view: Connect | Workspace" switch in a corner labelled "mock controls", so reviewers can flip).
2. **Add playlists**: search box ("search playlists or paste a Spotify URL"), results list with cover/name/owner/track count,
   already-added ones show a check. Counter "N/10 playlists", "Clear all".
3. **Presets** (quick-start templates): Karimctiva (balanced bachata/salsa dance flow, 5h, by play time),
   Workout Mix (high energy, 1h, 3-5 songs in a row), Road Trip (evenly blended). Applying one sets ratios + length + shuffle.
4. **Per-playlist ratio controls** for each selected playlist: cover, name, "{n} tracks · avg 3:42/song",
   "Play together" range 1-8 songs in a row (a min AND max), "Priority" weight 1-100, remove button.
   Global **balance method** toggle: "Same song count" vs "Same play time".
   Plus an **example mix** readout showing what the resulting sequence looks like (e.g. B B S S S B B S ...).
5. **Mix settings**: mix name input; length = Use all songs | Set song count | Set duration (minutes);
   shuffle-within-playlist checkbox; an **exhaustion warning** ("'Bachata Sensual' will run out first, ~38 min before the others —
   [Apply suggested ratios] [Continue with remaining playlists]").
6. **Preview**: generate preview -> shows stats (tracks, total duration), per-playlist breakdown (count + duration),
   a **drag-to-reorder track list** (drag handle, number, cover, title, artist, source-playlist tag, duration, remove ✕),
   "Search Spotify" and "Add unselected tracks" actions.
7. **Save**: "Create playlist on Spotify" primary action + the privacy note
   ("Saved playlists stay off your profile, but anyone with the link may access them").
8. Toasts: success ("Created 'Friday Heat' — Open in Spotify") and an error toast. Footer: Privacy · Terms.

## Shared fake data (use exactly this so the mocks are comparable)

Selected playlists (3 shown in workspace):
- **Bachata Sensual** — 312 tracks, avg 3:48/song, min 2 / max 3, priority 60, owner "Latin Nights"
- **Salsa Romantica** — 204 tracks, avg 4:21/song, min 1 / max 2, priority 40, owner "Cali Salsero"
- **Kizomba Classics** — 148 tracks, avg 4:05/song, min 1 / max 1, priority 25, owner "Afro Lounge"
Search-result extras (not selected): "Bachata Dominicana" 188 tracks, "Salsa Dura" 260 tracks, "Zouk Love" 96 tracks.
Mix: name "Friday Heat", balance = Same play time, length = Set duration 300 min, shuffle on.
Preview: 78 tracks · 5h 02m. Breakdown: Bachata 34 tracks 2h 09m · Salsa 28 tracks 1h 58m · Kizomba 16 tracks 55m.
Tracks (use ~12, mix of the three sources): Obsesión — Aventura (Bachata, 4:11) · Vivir Mi Vida — Marc Anthony (Salsa, 4:12) ·
Yo Quiero Bailar — Ricky Martin... (invent plausible titles; don't stress accuracy) with durations 3:20–4:50.

## Each mock must also ship
- A short "design notes" block at the bottom or in a collapsible panel: palette (hex), fonts, 3 signature ideas, and one thing
  it trades off (e.g. density vs. drama).
- A drag-reorder on the track list that really works (pointer events or HTML5 DnD) and at least one live control
  (the ratio sliders / segmented bar should actually move and update the example-mix readout).
