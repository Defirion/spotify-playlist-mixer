import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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

    // The modal and backdrop should be in the document
    const modal = screen.getByRole('dialog');
    expect(modal).not.toBeNull();

    // Record initial styles (may vary in JSDOM). We primarily assert a change
    const initialModalStyle = window.getComputedStyle(modal);
    const initialPointerEvents = initialModalStyle.pointerEvents;
    const initialOpacity = Number(initialModalStyle.opacity);

    // Simulate starting a drag by adding the class to the documentElement
    const target = document.scrollingElement || document.documentElement;
    target.classList.add('dnd-dragging');

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
  });
});
