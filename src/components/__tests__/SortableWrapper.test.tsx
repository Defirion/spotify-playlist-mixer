import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mocks for @dnd-kit/sortable and @dnd-kit/utilities
/* eslint-disable import/first */
const mockUseSortable = jest.fn();
const mockDefaultAnimate = jest.fn();

jest.mock('@dnd-kit/sortable', () => ({
  useSortable: (opts: any) => mockUseSortable(opts),
  defaultAnimateLayoutChanges: (...args: any[]) => mockDefaultAnimate(...args),
}));

jest.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: (t: any) => `translate(${t?.x || 0}px,${t?.y || 0}px)`,
    },
  },
}));

import SortableWrapper from '../SortableWrapper';
/* eslint-enable import/first */

describe('SortableWrapper', () => {
  let capturedAnimate: any = null;

  beforeEach(() => {
    capturedAnimate = null;
    mockDefaultAnimate.mockReset();
    mockUseSortable.mockReset();
  });

  it('renders children and applies transform/transition/opacity when not dragging', () => {
    mockUseSortable.mockImplementation((opts: any) => {
      capturedAnimate = opts.animateLayoutChanges;
      return {
        attributes: { 'data-foo': 'bar' },
        listeners: {},
        setNodeRef: jest.fn(),
        transform: { x: 1, y: 2 },
        transition: 'transform 200ms',
        isDragging: false,
      };
    });

    render(
      <SortableWrapper id="item-1">
        <span>child</span>
      </SortableWrapper>
    );

    const el = screen.getByTestId('sortable-wrapper');
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent('child');
    // check inline styles applied by component
    expect(el.style.transform).toBe('translate(1px,2px)');
    expect(el.style.transition).toBe('transform 200ms');
    expect(el.getAttribute('data-dragging')).toBe('false');
    expect(el.style.opacity).toBe('1');
  });

  it('applies reduced opacity when dragging', () => {
    mockUseSortable.mockImplementation((opts: any) => {
      capturedAnimate = opts.animateLayoutChanges;
      return {
        attributes: {},
        listeners: {},
        setNodeRef: jest.fn(),
        transform: { x: 0, y: 0 },
        transition: 'none',
        isDragging: true,
      };
    });

    render(
      <SortableWrapper id="drag-item">
        <div>drag</div>
      </SortableWrapper>
    );

    const el = screen.getByTestId('sortable-wrapper');
    expect(el.getAttribute('data-dragging')).toBe('true');
    expect(el.style.opacity).toBe('0.5');
  });

  it('animateLayoutChanges: delegates to defaultAnimateLayoutChanges when isSorting=true', () => {
    mockDefaultAnimate.mockReturnValue('DEFAULT');
    mockUseSortable.mockImplementation((opts: any) => {
      capturedAnimate = opts.animateLayoutChanges;
      return {
        attributes: {},
        listeners: {},
        setNodeRef: jest.fn(),
        transform: null,
        transition: '',
        isDragging: false,
      };
    });

    render(<SortableWrapper id="x">x</SortableWrapper>);
    // call captured animate function
    const args = { isSorting: true, items: [], previousItems: [], id: 'x' };
    const result = capturedAnimate(args as any);
    expect(result).toBe('DEFAULT');
    expect(mockDefaultAnimate).toHaveBeenCalledWith(args);
  });

  it('animateLayoutChanges: returns true for new items', () => {
    mockDefaultAnimate.mockReturnValue('NEVER_CALLED');
    mockUseSortable.mockImplementation((opts: any) => {
      capturedAnimate = opts.animateLayoutChanges;
      return {
        attributes: {},
        listeners: {},
        setNodeRef: jest.fn(),
        transform: null,
        transition: '',
        isDragging: false,
      };
    });

    render(<SortableWrapper id="new-id">new</SortableWrapper>);
    const args = {
      isSorting: false,
      items: ['a'],
      previousItems: [],
      id: 'new-id',
    };
    const result = capturedAnimate(args as any);
    expect(result).toBe(true);
    expect(mockDefaultAnimate).not.toHaveBeenCalled();
  });

  it('animateLayoutChanges: returns true when items length changed', () => {
    mockDefaultAnimate.mockReturnValue('NEVER_CALLED');
    mockUseSortable.mockImplementation((opts: any) => {
      capturedAnimate = opts.animateLayoutChanges;
      return {
        attributes: {},
        listeners: {},
        setNodeRef: jest.fn(),
        transform: null,
        transition: '',
        isDragging: false,
      };
    });

    render(<SortableWrapper id="a">a</SortableWrapper>);
    const args = {
      isSorting: false,
      items: ['a', 'b'],
      previousItems: ['a'],
      id: 'a',
    };
    const result = capturedAnimate(args as any);
    expect(result).toBe(true);
    expect(mockDefaultAnimate).not.toHaveBeenCalled();
  });

  it('animateLayoutChanges: falls back to default when no special case', () => {
    mockDefaultAnimate.mockReturnValue('FALLBACK');
    mockUseSortable.mockImplementation((opts: any) => {
      capturedAnimate = opts.animateLayoutChanges;
      return {
        attributes: {},
        listeners: {},
        setNodeRef: jest.fn(),
        transform: null,
        transition: '',
        isDragging: false,
      };
    });

    render(<SortableWrapper id="b">b</SortableWrapper>);
    const args = {
      isSorting: false,
      items: ['b'],
      previousItems: ['b'],
      id: 'b',
    };
    const result = capturedAnimate(args as any);
    expect(result).toBe('FALLBACK');
    expect(mockDefaultAnimate).toHaveBeenCalledWith(args);
  });
});
