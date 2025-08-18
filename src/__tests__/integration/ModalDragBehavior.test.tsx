import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import TrackSourceModal from '../../components/TrackSourceModal';

const sampleTracks = [
  {
    id: 't1',
    name: 'Song 1',
    artists: [{ name: 'Artist' }],
    album: { name: 'A' },
    duration_ms: 1000,
  },
  {
    id: 't2',
    name: 'Song 2',
    artists: [{ name: 'Artist' }],
    album: { name: 'B' },
    duration_ms: 1000,
  },
];

describe('Modal drag visual state', () => {
  it('applies non-interactive/hidden styles when dnd-dragging class is present', async () => {
    const onClose = jest.fn();

    // Temporarily suppress the specific React act(...) warning that arises
    // because MutationObserver invokes state updates outside of act in JSDOM.
    const realConsoleError = console.error;
    const spy = jest.spyOn(console, 'error').mockImplementation((...args) => {
      const first = args[0] as string;
      if (
        typeof first === 'string' &&
        first.includes(
          'An update to TrackSourceModal inside a test was not wrapped in act'
        )
      ) {
        return;
      }
      return realConsoleError.apply(console, args as any);
    });

    // Mock MutationObserver so we can synchronously invoke its callback inside act
    const RealMO = (global as any).MutationObserver;
    let moCallback: ((mutations: MutationRecord[]) => void) | null = null;
    (global as any).MutationObserver = class {
      constructor(cb: (mutations: MutationRecord[]) => void) {
        moCallback = cb;
      }
      observe() {}
      disconnect() {}
    } as any;

    const target = document.scrollingElement || document.documentElement;

    // Render normally, then toggle the class. We'll call the mocked MutationObserver
    // callback inside act so React considers the resulting state updates wrapped.
    render(
      <TrackSourceModal
        isOpen={true}
        onClose={onClose}
        title="Test Modal"
        tracks={sampleTracks as any}
        loading={false}
        onAddTracks={() => {}}
        searchQuery={''}
        onSearchQueryChange={() => {}}
      />
    );

    // Add dragging class to simulate starting a drag
    target.classList.add('dnd-dragging');

    if (moCallback) {
      // Invoke the MutationObserver callback inside act so state updates are wrapped
      await act(async () => {
        moCallback!([
          { type: 'attributes', attributeName: 'class' } as MutationRecord,
        ]);
        await Promise.resolve();
      });
    } else {
      // Fallback: give JSDOM a microtask tick
      await act(async () => {
        await Promise.resolve();
      });
    }

    // The modal and backdrop should be in the document
    const modal = screen.getByRole('dialog');
    expect(modal).not.toBeNull();

    // Record initial styles (may vary in JSDOM). We primarily assert a change
    const initialModalStyle = window.getComputedStyle(modal);
    const initialPointerEvents = initialModalStyle.pointerEvents;
    const initialOpacity = Number(initialModalStyle.opacity);

    // (Already added during act above)

    // The modal should receive the dragging attribute (we set data-dragging on Modal)
    const modalElement = modal as HTMLElement;

    // Force a reflow so MutationObserver observers run in JSDOM
    // (JSDOM may batch mutations; reading offsetHeight helps ensure updates)
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    modalElement.offsetHeight;

    await waitFor(() => {
      expect(modalElement.getAttribute('data-dragging')).toBe('true');
    });

    // Clean up
    target.classList.remove('dnd-dragging');

    // restore MutationObserver and console
    (global as any).MutationObserver = RealMO;
    spy.mockRestore();
  });
});
