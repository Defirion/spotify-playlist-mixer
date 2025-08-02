# Implementation Plan

- [ ] 1. **Setup Zustand and Store Structure**
  - [ ] 1.1 Install Zustand dependency by running `npm install zustand`.
  - [ ] 1.2 Create a new directory `src/store`.
  - [ ] 1.3 Create a new file `src/types/store.ts` to define the interfaces for the global state.
  - [ ] 1.4 Create the main store file `src/store/store.ts`.

- [ ] 2. **Define Global State Interface**
  - [ ] 2.1 In `src/types/store.ts`, define `AuthSlice` for `accessToken`.
  - [ ] 2.2 Define `UISlice` for `error` and `mixedPlaylists` (toasts).
  - [ ] 2.3 Define `PlaylistSlice` for `selectedPlaylists` and its related actions.
  - [ ] 2.4 Define `RatioSlice` for `ratioConfig` and its related actions.
  - [ ] 2.5 Define `MixSlice` for `mixOptions` and its related actions.
  - [ ] 2.6 Combine all slice interfaces into a single `StoreState` interface (`AuthSlice & UISlice & PlaylistSlice & RatioSlice & MixSlice`).

- [ ] 3. **Implement Zustand Store**
  - [ ] 3.1 In `src/store/store.ts`, import `create` from `zustand` and the necessary types.
  - [ ] 3.2 Create slice implementation functions (e.g., `createAuthSlice`, `createUISlice`, etc.) that take `set` and `get` as arguments and return the state and actions for each domain.
  - [ ] 3.3 Migrate the logic from `useAppState.ts` into `createAuthSlice` and `createUISlice`.
  - [ ] 3.4 Migrate the logic from `usePlaylistSelection.ts` into `createPlaylistSlice`.
  - [ ] 3.5 Migrate the logic from `useRatioConfig.ts` into `createRatioSlice`.
  - [ ] 3.6 Migrate the logic from `useMixOptions.ts` into `createMixSlice`.
  - [ ] 3.7 Combine all slice implementations into a single `useStore` hook using `create<StoreState>()((...a) => ({ ... }))`.

- [ ] 4. **Refactor `App` Component**
  - [ ] 4.1 Rename `src/App.js` to `src/App.tsx`.
  - [ ] 4.2 Remove all state management logic (`useState`, `useEffect` for state, `useCallback` for handlers) and the imports for the old custom hooks (`useAppState`, etc.).
  - [ ] 4.3 In the `MainApp` function component, use the `useStore` hook to select the necessary state and actions. Use object destructuring for cleaner access (e.g., `const { accessToken, setAccessToken } = useStore();`).
  - [ ] 4.4 Simplify event handlers. For example, `handlePlaylistSelection` will now directly call an action from the store.
  - [ ] 4.5 Remove all props that are now globally managed from the child components rendered in `MainApp` (e.g., remove `accessToken` prop from `PlaylistSelector`).

- [ ] 5. **Refactor Child Components to Use Global Store**
  - [ ] 5.1 In `src/components/PlaylistSelector.tsx`:
    - Remove the props: `accessToken`, `selectedPlaylists`, `onPlaylistSelect`, `onClearAll`, `onError`.
    - Import `useStore` and select the required state (`selectedPlaylists`) and actions (`togglePlaylistSelection`, `clearAllPlaylists`, `setError`) from the store.
  - [ ] 5.2 In `src/components/RatioConfig.tsx`:
    - Remove the props: `selectedPlaylists`, `ratioConfig`, `onRatioUpdate`, `onPlaylistRemove`.
    - Import `useStore` and select `selectedPlaylists`, `ratioConfig`, `updateRatioConfig`, and the playlist removal action.
  - [ ] 5.3 In `src/components/PlaylistMixer.tsx`:
    - Remove the props: `accessToken`, `selectedPlaylists`, `ratioConfig`, `mixOptions`, `onMixedPlaylist`, `onError`.
    - Import `useStore` and select the necessary state and actions.
  - [ ] 5.4 In `src/components/PresetTemplates.tsx`:
    - Remove `selectedPlaylists` and `onApplyPreset` props.
    - Use `useStore` to get `selectedPlaylists` and the `applyPreset` action.
  - [ ] 5.5 In `src/components/SpotifyAuth.tsx`:
    - Update the `onAuth` prop call to use the `setAccessToken` action from the store.
  - [ ] 5.6 In `src/components/ToastError.tsx` and `src/components/SuccessToast.tsx`:
    - Remove props and use `useStore` to get `error`, `mixedPlaylists`, and the dismiss actions.

- [ ] 6. **Cleanup and Finalization**
  - [ ] 6.1 Rename `src/index.js` to `src/index.tsx` and update the `App` import.
  - [ ] 6.2 Delete the now-unused custom hook files: `src/hooks/useAppState.ts`, `src/hooks/useMixOptions.ts`, `src/hooks/usePlaylistSelection.ts`, `src/hooks/useRatioConfig.ts`.
  - [ ] 6.3 Update `src/types/index.ts` to export the new store types from `src/types/store.ts`.
  - [ ] 6.4 Update `package.json` to add `zustand`.
