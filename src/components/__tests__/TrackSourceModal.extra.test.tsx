/**
 * Tests for TrackSourceModal focused on branchy behaviors:
 * - empty list rendering
 * - Enter key triggers onManualSearch
 * - regenerating instanceId when 'trackDraggedToPreview' event fires
 * - rich error rendering path
 */
import React from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react';

import TrackSourceModal from '../TrackSourceModal';
import { generateTrackInstanceId } from '../../utils/trackUtils';

// Mock generateTrackInstanceId to control and observe calls while preserving other utilities
const seq: string[] = ['init-1', 'init-2', 'regen-1'];
vi.mock('../../utils/trackUtils', async () => {
  const actual = await vi.importActual('../../utils/trackUtils');
  return {
    ...actual,
    generateTrackInstanceId: vi.fn(() => seq.shift()),
  };
});

const baseProps = {
  isOpen: true,
  onClose: vi.fn(),
  title: 'Choose',
  className: '',
  tracks: [],
  loading: false,
  error: null,
  onAddTracks: vi.fn(),
  searchQuery: '',
  onSearchQueryChange: vi.fn(),
  searchPlaceholder: 'Search tracks, artists, or albums...',
  showSearchButton: false,
  onManualSearch: undefined,
  headerInfo: undefined,
  emptyMessage: 'No tracks available',
  showLoadingIndicator: false,
};

describe('TrackSourceModal branches', () => {
  test('shows empty message when no tracks', () => {
    render(<TrackSourceModal {...baseProps} tracks={[]} />);
    expect(screen.getByTestId('empty-message')).toHaveTextContent(
      'No tracks available'
    );
  });

  test('pressing Enter triggers onManualSearch when provided', () => {
    const onManual = vi.fn();
    const props = {
      ...baseProps,
      onManualSearch: onManual,
      showSearchButton: true,
    };
    render(<TrackSourceModal {...props} />);
    const input = screen.getByPlaceholderText(props.searchPlaceholder);
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(onManual).toHaveBeenCalled();
  });

  test('regenerates instance id for dragged track when event dispatched', () => {
    // two tracks to initialize the instance id mapping
    const tracks = [
      { id: 't1', name: 'A' } as any,
      { id: 't2', name: 'B' } as any,
    ];

    render(<TrackSourceModal {...baseProps} tracks={tracks} />);

    // Two tracks => two instance IDs generated on mount.
    const callsAfterMount = (generateTrackInstanceId as import('vitest').Mock)
      .mock.calls.length;
    expect(callsAfterMount).toBe(2);

    // Dispatching the event should regenerate the dragged track's instance ID.
    const ev = new CustomEvent('trackDraggedToPreview', {
      detail: { trackId: 't1' },
    });
    act(() => {
      window.dispatchEvent(ev as Event);
    });

    expect(
      (generateTrackInstanceId as import('vitest').Mock).mock.calls.length
    ).toBe(callsAfterMount + 1);
  });

  test('rich error object renders label and ErrorHandler', () => {
    const richError = { title: 'API problem', message: 'up' } as any;
    render(<TrackSourceModal {...baseProps} error={richError} />);
    // The component shows a short label using getDisplayErrorWithLabel
    expect(screen.getByText('API problem')).toBeTruthy();
  });
});
