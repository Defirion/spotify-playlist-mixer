import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import useVirtualization from '../useVirtualization';

function TestList({ items, itemHeight = 20, containerHeight = 100 }: any) {
  const v = useVirtualization({ items, itemHeight, containerHeight } as any);

  return (
    <div data-testid="container" {...v.containerProps}>
      <div data-testid="spacer" {...v.spacerProps}>
        {v.visibleItems.map((it: any, i: number) => (
          <div key={it.id} {...v.getItemProps(i)} data-testid={`item-${it.id}`}>
            {it.id}
          </div>
        ))}
      </div>
    </div>
  );
}

const makeItems = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `i${i}` }));

describe('useVirtualization scroll behavior', () => {
  it('updates visible items when container is scrolled', () => {
    const items = makeItems(100);
    render(<TestList items={items} itemHeight={20} containerHeight={100} />);

    const container = screen.getByTestId('container');
    // initially first item should be visible
    expect(screen.getByTestId('item-i0')).toBeTruthy();

    // simulate scroll by setting scrollTop and firing scroll event
    container.scrollTop = 300; // scroll to roughly item 15
    fireEvent.scroll(container);

    // after scroll, item i15 should be rendered in the DOM
    return waitFor(() => expect(screen.getByTestId('item-i15')).toBeTruthy());
  });
});
