import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { queryByAttribute } from '@testing-library/react';
import TrackList from '../TrackList';
import { mockTracks } from '../../../mocks/fixtures';
import useVirtualization from '../../../hooks/useVirtualization';

// Mock the virtualization hook used by TrackList
jest.mock('../../../hooks/useVirtualization');

const mockedUseVirtualization = useVirtualization as unknown as jest.Mock;

describe('TrackList virtualization', () => {
  beforeEach(() => {
    mockedUseVirtualization.mockReset();
  });

  it('renders virtualized items and applies container, spacer and item props', () => {
    const visibleItems = mockTracks.slice(0, 2);
    const startIndex = 5;
    const containerProps = {
      'data-virt': '1',
      style: { background: 'rgb(1,2,3)' },
    };
    const spacerProps = { 'data-spacer': 'true' };
    const getItemProps = (index: number) => ({ 'data-item-index': index });

    mockedUseVirtualization.mockReturnValue({
      visibleItems,
      startIndex,
      containerProps,
      spacerProps,
      getItemProps,
    });

    render(
      (
        <TrackList
          tracks={mockTracks}
          virtualized
          itemHeight={42}
          containerHeight={200}
        />
      ) as any
    );

    const trackList = screen.getByTestId('track-list');
    // containerProps should be applied to the outer container
    expect(trackList).toHaveAttribute('data-virt', '1');
    expect(trackList).toHaveStyle({ background: 'rgb(1,2,3)' });

    // spacer should exist and include spacerProps
    const spacer = queryByAttribute('data-spacer', trackList, 'true');
    expect(spacer).toBeInTheDocument();

    // visible items are rendered
    const firstRendered = screen.getByTestId(
      `track-item-${visibleItems[0].id}`
    );
    expect(firstRendered).toBeInTheDocument();

    // wrapper div around TrackItem should have the item props provided by getItemProps
    const wrapper = queryByAttribute('data-item-index', trackList, '0');
    expect(wrapper).toBeInTheDocument();

    // style prop passed for virtualization should include the --item-height CSS variable
    expect(firstRendered.style.getPropertyValue('--item-height')).toBe('42px');
  });

  it('forwards mouse enter event with correct actualIndex when virtualized', async () => {
    const visibleItems = mockTracks.slice(0, 2);
    const startIndex = 5;
    const containerProps = { 'data-virt': '1' };
    const spacerProps = {};
    const getItemProps = (index: number) => ({ 'data-item-index': index });

    mockedUseVirtualization.mockReturnValue({
      visibleItems,
      startIndex,
      containerProps,
      spacerProps,
      getItemProps,
    });

    const onTrackMouseEnter = jest.fn();

    render(
      (
        <TrackList
          tracks={mockTracks}
          virtualized
          onTrackMouseEnter={onTrackMouseEnter}
        />
      ) as any
    );

    const firstRendered = screen.getByTestId(
      `track-item-${visibleItems[0].id}`
    );
    // Hovering should call the wrapper which forwards (e, track, actualIndex)
    const ue = userEvent.setup();
    await ue.hover(firstRendered);

    expect(onTrackMouseEnter).toHaveBeenCalled();
    // ensure the forwarded index equals startIndex + visible index (5 + 0)
    const callArgs = onTrackMouseEnter.mock.calls[0];
    expect(callArgs[2]).toBe(startIndex + 0);
  });
});
