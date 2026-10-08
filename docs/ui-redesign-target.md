# UI redesign target

**Target mock:** [`docs/ui-mocks/v5/console.html`](ui-mocks/v5/console.html) (open via `node docs/ui-mocks/serve.mjs`, then `http://127.0.0.1:4011/v5/console.html`).
Screenshots: `docs/ui-mocks/shots/v5/`. History of rounds 1 to 4 and the picks that led here: `docs/ui-mocks/index.html`, `docs/ui-mocks/prefs.json`.

Agreed with the owner after five rounds. The mock is static HTML with fake data. It defines the look and behaviour to build, not the code.

## Decisions

- **Look:** warm-grey hardware (Round 1) pulled down about 25% so nothing flashes white. Grain, screws, bevels on the device body. Dark channel panels. Pale LCD number boxes. One orange (primary action and active pad only). Data colours per playlist: `#E4572E #2BB5A4 #E0A100 #7FA83A #C9588A #6C93BF`.
- **Type:** Space Grotesk (labels), Space Mono (numbers). 13px minimum. Short labels, no sentences on controls. No em dashes.
- **Layout (desktop):** left = playlist channels (stretch to match the right column) + example order + running-out note. Right = one control panel: presets, mix name, balance by (songs or time), length (all, songs, time) with stepper, shuffle, master LCD, Preview, Create on Spotify, privacy line. Below both: the dark preview screen. One page, no separate review step.
- **Channel:** small cover tile + name + remove. "Songs in a row": two knurled knobs (min, max, 1 to 8) with LCD number boxes. "Priority": fader (1 to 100) with 100/50/1 scale, LED share meter, LCD number box. No coloured card stripe. No share percentage text on the card.
- **Presets:** three chunky pads, name and one short hint only (no "PAD n", no "active" caption).
- **Add playlist:** an "Add playlist" tile opens a dark dialog (search or paste a link). `/` opens it.
- **Example order:** plain coloured letter squares (first 24 songs).
- **Running-out warning:** plain note, two text actions (Apply suggested ratios, Continue without it).
- **Preview:** dark screen, stats header (songs, total) with per-playlist bars, drag-reorder rows with cover tile, title, artist, source, length, remove. Footer: Search Spotify, Add unselected. Changing any setting marks it out of date until Preview is pressed.
- **Phones:** channels become a horizontal swipe row, pads stay three across, the right column stacks below the channels.
- **Interaction:** faders and knobs by pointer drag, mouse wheel and keyboard (arrows, Home, End, PageUp/Down), plus typing exact values in the LCD boxes.

## Mapping to the real app

| Mock piece | Existing code | Notes |
|---|---|---|
| Channel strips | `src/components/RatioConfig.tsx` | Fader = `weight` (1 to 100), knobs = `min`/`max` (1 to 8). Balance by = global `weightType` (`frequency` or `time`). |
| Presets pads | `src/components/PresetTemplates.tsx` | Same `PresetTemplate` data. Drop descriptions from the pad face. |
| Add playlist dialog | `src/components/PlaylistSelector.tsx`, `SpotifySearchModal.tsx` | Existing search and URL logic moves into a dialog. Keep the 10-playlist limit. |
| Mix name, length, shuffle | `features/mixer/PlaylistForm.tsx` | `useAllSongs`, `useTimeLimit`, `totalSongs`, `targetDurationSeconds`, `shuffleTracks`. |
| Running-out note | `features/mixer/ExhaustionWarning.tsx` | Same advisory data (`ratioImbalance`). |
| Master LCD, Preview, Create | `features/mixer/MixControls.tsx`, `PlaylistMixer.tsx` | LCD shows songs, total time, target, difference. |
| Preview screen and rows | `features/mixer/MixPreview.tsx`, `ui/TrackItem.tsx`, `DndProvider.tsx`, `SortableWrapper.tsx` | Keep dnd-kit for reorder. |
| Toasts | `ToastError.tsx`, `SuccessToast.tsx` | Restyle only. |
| Search Spotify, Add unselected | `SpotifySearchModal.tsx`, `AddUnselectedModal.tsx`, `TrackSourceModal.tsx` | Restyle dialogs to match. |
| Connect screen | `SpotifyAuth.tsx`, `AppShell.tsx` | Heading, one line, Connect button. |

## Mock-only (do not port)

The "Mock" button and its panel, the "Exhaustion demo" switch (it forces a 28-song cap on the first playlist), the fake playlist and track data, and the mock arithmetic for shares and totals (the real app uses its own mixer logic).

## Suggested port order

1. Design tokens and device shell (colours, fonts, grain, screws, hardware button and LCD styles) as CSS modules.
2. Channel strip: fader, knob and LED meter components, with keyboard and a11y, wired to `RatioConfig` state.
3. Presets pads and the right-hand control panel (balance, length, shuffle, master LCD, actions).
4. Add-playlist dialog and the other dialogs.
5. Preview screen, example order, running-out note, toasts.
6. Phone layout pass and visual regression checks.

Existing tests assert behaviour and class names, so expect to update `src/components/__tests__` as each piece moves.
