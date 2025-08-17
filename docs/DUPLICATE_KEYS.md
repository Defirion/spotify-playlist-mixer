Problem: React "Encountered two children with the same key" warning in tests

What happened
- Many tests mock `generateTrackInstanceId` to always return the same static string (`'track_mock_id'`).
- Components (e.g., `TrackList`, `TrackItem`, drag/sort code) use that instance id as the React `key` for list items.
- When tests render multiple items, duplicated keys are produced and React warns.

Why it matters
- React uses keys to identify items across renders. Duplicate keys can cause incorrect updates and mask bugs.
- While the warning doesn't fail tests, it pollutes CI logs and can hide real issues.

Immediate (safe) fix applied
- For tests only, replace the static mock with an incrementing id generator so each call returns `track_mock_id_1`, `track_mock_id_2`, etc.
- This keeps tests deterministic while removing the warnings.

Code sample (applied in tests):

let _trackIdCounter = 0;
const _genTrackId = () => `track_mock_id_${++_trackIdCounter}`;

jest.mock('../../utils/trackUtils', () => ({
  // ...other mocked fns...
  generateTrackInstanceId: jest.fn(() => _genTrackId()),
}));

Resetting the counter
- If you want the sequence to restart between tests, call `_trackIdCounter = 0` in a `beforeEach` in that test file.

Longer-term options (recommended)
1) Persist an `instanceId` on copied track objects at runtime so keys are stable and unique across renders. This ensures production behaviour is correct.
2) If appropriate, derive keys from stable properties (e.g., `${track.id}-${instanceIndex}`) instead of using a runtime-generated id.

Tradeoffs
- Test-only change: fastest and safest, no runtime impact.
- Runtime/component change: better long-term robustness but needs careful implementation to avoid generating new ids on every render.

If you'd like, I can implement a runtime fix (assigning an `instanceId` when a track is copied) and update components to use it. That will require more tests and a small migration.
