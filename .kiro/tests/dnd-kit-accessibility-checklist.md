# dnd-kit accessibility & touch-drag verification checklist

This checklist implements Task 7 from the refactor-consolidation spec. Use this file as the single source of truth for manual testing before adding smoke tests.

## Quick checklist (requirements covered)
- Touch drag on iOS Safari (7.1)
- Touch drag on Android Chrome (7.2)
- Keyboard navigation: Tab, Space/Enter, Arrow keys (7.3)
- Screen reader verification (VoiceOver / TalkBack / NVDA) (7.4)
- dnd-kit tuning verification: 250 ms long-press delay and 5 px movement tolerance (7.5)

## Test contract
- Inputs: running app URL (local or staging), test playlist (>=6 tracks), tester device(s).
- Outputs: Pass/Fail per scenario, screenshots or video, console log snippet, reproduction steps.
- Error modes: drag not starting, drag starts on tap, focus lost after reorder, missing screen reader announcements.

## Pre-test setup
1. Provide tester with app URL and build tag/branch.
2. Ensure test playlist with >=6 tracks is available.
3. Enable remote debugging: Safari Web Inspector (iOS) and Chrome remote (Android).
4. Have a screen recorder and a way to capture console logs (remote inspector or device log).

## Manual routine (record device/OS/browser, steps, expected behaviour, result, evidence)
Follow each scenario and mark Pass/Fail with attachments.

### A. Touch drag — basic reorder (iOS & Android)
1. Open app and navigate to `PlaylistMixer` with the test playlist.
2. Identify a draggable item (track) or handle.
3. Short tap (<200 ms): expected — selection/open, NOT start drag.
4. Long press (>=250 ms) then move finger >5 px: expected — drag starts, item lifts visually and follows finger; dropping updates playlist order.
5. Long press (>=250 ms) then move <5 px: expected — no unintended movement; either drag doesn't start until movement crosses tolerance or stays stable.
6. Repeat rapid pick/move/drop (5 attempts): expected — no crashes or stuck states.
7. Observe animation and perceived lag (target: feel immediate; not noticeable >100 ms).

### B. Touch drag — edge cases
- Drag near list edges while the list scrolls: expected smooth auto-scroll or predictable behaviour.
- Two-finger gestures should not trigger reorders.
- Simulate offline during drag: UI must not crash; local reorder may persist and sync later.

### C. Keyboard accessibility (desktop)
1. Tab to draggable item or handle: expected — visible focus state.
2. Press Space/Enter to pick up item: expected — visual "grabbed" state and (if available) announcement.
3. ArrowUp/ArrowDown to move item stepwise: expected — item moves, focus stays correct.
4. Space/Enter to drop: expected — order updated and focus remains sensible.
5. Test tab order after reordering.

### D. Screen reader checks
- Use VoiceOver, TalkBack, or NVDA.
- Expected announcements: "Item grabbed", "Moved to position X of Y", "Item dropped" (or equivalent).
- Verify focused item announced after drop and position updates are audible.
- Check aria attributes on track items (role, aria-grabbed, aria-posinset/aria-setsize if implemented).

### E. Delay & tolerance verification (250 ms / 5 px)
- Short press (100–150 ms) then move 20 px: expected — no drag.
- Long press (>=250 ms) then move 6 px: expected — drag starts.
- Long press (>=250 ms) then move <=5 px: expected — tolerant behaviour; document observed behaviour and timings.
- Record timings with screen-recording for later inspection.

## Acceptance criteria
- Touch drag: long-press + move reorders reliably; short taps do not start drag.
- Keyboard: pick-up, arrow moves, and drop work; focus and tab order remain logical.
- Screen reader: start/move/drop announcements exist and focus is correct.
- Delay/tolerance: behaviour is consistent with 250 ms and 5 px settings (document any deviations).
- No console errors or UI crashes after repeated operations.

## Edge cases to try
- Very long track titles and very short titles
- Nested scroll containers
- Reordering while background async operations run (save/sync)
- Rapid repeated drags
- Dragging into an empty list or empty drop zone

## Bug report template (copy/paste into issue)
- Title:
- Device / OS / Browser (versions):
- App build/branch/tag:
- Test step(s) performed:
- Expected result:
- Actual result:
- Repro rate (e.g., 5/5, intermittent):
- Attachments: screenshot(s), screen recording, console log excerpt
- Console errors (copy/paste):
- Notes (timings, tolerance behaviour, additional context):

## Evidence collection checklist
- Screenshot of focused draggable item
- Short screen recording showing long-press -> drag -> drop
- Console log or remote inspector log (errors/warnings)
- Screen reader audio or transcript if possible

## Optional: quick Playwright smoke snippets (for later automation)
- Add selectors/data-testids to relevant items first (e.g. `data-testid="track-<index>"`).
- Example ideas: keyboard pick/move/drop test; emulated mobile long-press smoke test.

## Next steps
1. Run this checklist on each device/environment in the matrix.
2. Record Pass/Fail, attach evidence, file issues for failures using the bug template above.
3. When manual checks are passing and flaky cases are known/fixed, convert critical flows into Playwright smoke tests and add them under the test suite.

---
File created: `.kiro/tests/dnd-kit-accessibility-checklist.md`
