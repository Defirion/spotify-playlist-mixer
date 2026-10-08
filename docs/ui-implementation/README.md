# Console UI implementation

Implemented the [agreed v5 target](../ui-redesign-target.md) using the existing React components, Spotify hooks, mixer, presets and dnd-kit. The production app contains no mock controls or fixture data.

The interface now has the warm grey device shell, dark playlist channels, draggable knobs and faders, editable LCD values, three preset pads, the combined settings panel, real preview totals and source bars, and matching search dialogs and toasts. On phones, the channels scroll horizontally and the settings stack below them.

Changing sources or mixing settings keeps edited preview rows visible and marks them out of date. Create on Spotify refreshes an outdated preview before saving; a failed or superseded refresh does not save old tracks. Renaming a mix retains the edited preview. Clearing all sources clears the preview.

## Validation

- Baseline before implementation: 109 suites, 788 tests passed.
- Final regression suite: 110 suites, 787 tests passed. Presentation assertions were updated for the agreed controls, and new regression cases cover refreshing before saving and exact LCD entry.
- Production build, lint and formatting checks passed.
- Browser checks used the real app components and mixing hooks with local Spotify responses: preview generation, current totals, stale preview refresh and creation, pointer dragging, keyboard reorder, playlist search/add, searched track selection/add, unused track dialog, Escape and focus restoration, and sign-out.
- Layouts checked at 1440px, 900px, 390px and 320px. The page stayed within the viewport; playlist channels have their own horizontal scrolling on phones.

Live Spotify authentication and playlist creation still need a real account check. Browser verification did not send changes to Spotify.

## Repeatable local preview

With the development server running, open `/scripts/ui-preview.html`. This development-only entry seeds local playlists and intercepts Spotify requests; it uses the real UI and mixer. Reload it to reset the fixture. Do not use it to validate OAuth or actual Spotify writes. The production build starts from `index.html` and does not include this entry.

## Screenshots

- [Desktop console and generated preview](desktop.png)
- [Phone console and preview](phone.png)
- [Phone playlist dialog](phone-playlists.png)
- [Phone track search](phone-search.png)
- [Connect screen](connect.png)
- [Phone connect screen](phone-connect.png)
