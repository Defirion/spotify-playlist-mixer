## Goal

Achieve a fully type-safe, coordinated drag-and-drop system for both internal reordering and external track transfers. This includes flawless scroll locking and pixel-perfect scroll position preservation.

## Core Issues to Be Resolved

*   **Non-functional Internal Reordering:** Drag operations within the `DraggableTrackList` fail to alter the list's state.
    *   **Symptom:** There is no visual indication (e.g., a placeholder or element shift) of where the track will be dropped during the drag.
    *   **Symptom:** The track order remains unchanged after the drag-and-drop operation is completed.

*   **Failure of External Track Transfer:** Dragging tracks from the `AddUnselectedModal` or `SpotifySearchModal` into the `DraggableTrackList` is impossible.
    *   **Symptom:** The cursor immediately becomes a "no go" (not-allowed) icon upon entering the drop zone.
    *   **Symptom:** The source modals do not become visually muted or uninteractable, obscuring the drop target.

*   **Ineffective Scroll Locking:** The system fails to isolate scrolling to the intended component during a drag.
    *   **Symptom:** The entire page scrolls when the user drags near the top or bottom of the viewport, particularly on mobile devices, instead of scrolling only the track list.

*   **Erroneous Scroll Position Reset:** The user's scroll context is lost after the track list is programmatically updated.
    *   **Symptom:** The `DraggableTrackList` unexpectedly scrolls to the top after a track is reordered or a new preview is generated.

---

#### **Phase 1: Pre-flight Check & API Contract**

1.  **Backup:** Create a new git branch from the current `main`/`develop` branch to isolate these changes.
2.  **Define API Contract (`src/types/dragAndDrop.ts`):** Establish the non-negotiable types for the entire system. This file will define the shape of the data being dragged.

    ```typescript
    // src/types/dragAndDrop.ts
    import { MixedTrack, SpotifyTrack } from './mixer';

    export type DragSourceType = 'internal-track' | 'modal-track' | 'search-track';

    export type DraggedItemPayload = {
      'internal-track': { track: MixedTrack };
      'modal-track': { track: SpotifyTrack };
      'search-track': { track: SpotifyTrack };
    };

    export interface DraggedItem<T extends DragSourceType> {
      id: string; // Unique ID of the track being dragged
      type: T;
      payload: DraggedItemPayload[T];
    }

    export interface DragState {
      isDragging: boolean;
      draggedItem: DraggedItem<any> | null;
      startDrag: <T extends DragSourceType>(item: DraggedItem<T>) => void;
      endDrag: () => void;
    }
    ```

---

#### **Phase 2: Centralized State Management**

This phase replaces the React Context with a `zustand` slice, integrating it into the existing store.

1.  **Create `src/store/slices/dragSlice.ts`:** Following the existing convention, create a new slice for drag-and-drop state. This will be the single source of truth.

    ```typescript
    // src/store/slices/dragSlice.ts
    import { StateCreator } from 'zustand';
    import { DragState, DraggedItem, DragSourceType } from '../../types/dragAndDrop';
    import { AppStore } from '..'; // Assuming AppStore is exported from the main store index

    export const createDragSlice: StateCreator<AppStore, [], [], DragState> = (set, get) => ({
      isDragging: false,
      draggedItem: null,
      startDrag: <T extends DragSourceType>(item: DraggedItem<T>) => {
        // Prevent concurrent drags
        if (get().isDragging) return;
        set({ isDragging: true, draggedItem: item }, false, 'drag/startDrag');
      },
      endDrag: () => {
        set({ isDragging: false, draggedItem: null }, false, 'drag/endDrag');
      },
    });
    ```

2.  **Integrate Slice into Main Store (`src/store/index.ts`):** Add the `dragSlice` and a corresponding selector hook.

    ```typescript
    // src/store/index.ts (additions)
    import { createDragSlice, DragSlice } from './slices/dragSlice'; // Adjust path if needed

    // Add DragSlice to the combined store type
    export type AppStore = AuthSlice & PlaylistSlice & MixingSlice & UISlice & DragSlice;

    // Add the slice to the store creation
    export const useAppStore = create<AppStore>()(
      devtools(
        subscribeWithSelector((...args) => ({
          ...
          ...createDragSlice(...args), // Add this line
        })),
      )
    );

    // Create a new selector hook for the drag state
    export const useDragState = () =>
      useAppStore(
        useShallow((state: AppStore) => ({
          isDragging: state.isDragging,
          draggedItem: state.draggedItem,
          startDrag: state.startDrag,
          endDrag: state.endDrag,
        }))
      );
    ```

---

#### **Phase 3: Architectural Implementation**

This phase refactors existing components and hooks to use the new `zustand` store.

1.  **Refactor `useDraggable.ts` - The Pure Initiator:**
    *   **Responsibility:** This hook's *only* job is to attach event listeners (`onDragStart`, `onTouchStart`, etc.) and report events to the `useDragStore`. It will no longer manage any state itself.
    *   **Implementation:**
        *   Remove all `useState` calls related to drag state (`isDragging`, `draggedItem`).
        *   Import and use the `useDragState` hook.
        *   In `handleDragStart` (and its touch/keyboard equivalents), call `startDrag(item)`.
        *   In `handleDragEnd`, call `endDrag()`. **Crucially, wrap the `endDrag()` call in a `setTimeout(..., 0)`** to ensure the `onDrop` event fires *before* the drag state is cleared.

2.  **Refactor `DraggableTrackList.tsx` - The Central Drop Coordinator:**
    *   **Responsibility:** This component will listen for drops and coordinate the appropriate state updates based on the source of the dragged item.
    *   **Implementation:**
        *   Use the `useDragState` hook to get `draggedItem`.
        *   The `onDrop` handler will now be the primary logic center. It will read `draggedItem` directly from the store.
        *   Use a `switch` statement on `draggedItem.type` to delegate to the correct handler (`handleInternalReorder` or `handleExternalAdd`).
        *   **Implement "Capture-and-Restore" for Scroll Position:**
            *   Create a `useRef<number | null>` to store the scroll position, e.g., `scrollPosRef`.
            *   In the function that triggers the track list re-render (e.g., `handleInternalReorder`), capture the `scrollTop` of the scrollable element *before* updating the state: `scrollPosRef.current = scrollContainerRef.current?.scrollTop;`.
            *   Use a `useLayoutEffect` that runs when the track list array changes. Inside it, if `scrollPosRef.current` has a value, restore the scroll position: `scrollContainerRef.current.scrollTop = scrollPosRef.current;`, then reset the ref: `scrollPosRef.current = null;`.

3.  **Refactor Modals (`AddUnselectedModal.tsx`, `SpotifySearchModal.tsx`):**
    *   **Responsibility:** Modals must become visually muted and uninteractable when a drag is initiated from *outside* of themselves.
    *   **Implementation:**
        *   Use the `useDragState` hook to get `isDragging` and `draggedItem`.
        *   Apply conditional styling (e.g., `opacity: 0.5`, `pointer-events: none`) to the modal's main container when `isDragging` is true and `draggedItem.type` is not the modal's own type (e.g., in `SpotifySearchModal`, apply when `draggedItem.type` is `'internal-track'` or `'modal-track'`).

4.  **Remove `DragContext.js`:**
    *   Delete the file `src/components/DragContext.js`.
    *   Remove the `<DragProvider>` from the component tree where it's currently used (likely in `App.tsx` or a similar top-level component).

---

#### **Phase 4: Testing & Verification**

1.  **Update & Run Existing Tests:** Fix any tests that fail due to the removal of `DragContext` and the changes to hook signatures.
2.  **Write New, Targeted Tests:**
    *   **`dragSlice.ts`:** Unit test the slice's logic directly. Use `act` from `@testing-library/react` to test state changes.
        *   Verify `startDrag` sets `isDragging` and `draggedItem`.
        *   Verify a second `startDrag` call is ignored.
        *   Verify `endDrag` resets the state.
    *   **Component Integration Tests (React Testing Library):**
        *   Mock the `zustand` store to test component behavior in different drag states.
        *   Simulate drag-and-drop events.
        *   Assert that the correct actions on the `dragSlice` are called.
        *   Verify that modals correctly change their appearance based on store state.
        *   Verify the "Capture-and-Restore" pattern by checking the `scrollTop` property of the list element before and after a drop.
3.  **Manual Testing:** Perform thorough manual tests focusing on all drag sources (internal, modal, search) on both desktop (mouse) and mobile (touch).
4.  **Code Quality:** Run `npm run lint` and `tsc --noEmit` to ensure no new issues are introduced.
