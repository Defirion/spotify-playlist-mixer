import React from 'react';
import { render, screen } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import SortableWrapper from '../SortableWrapper';

describe('SortableWrapper', () => {
  const renderWithDndContext = (children: React.ReactNode) => {
    return render(
      <DndContext>
        <SortableContext
          items={['test-id']}
          strategy={verticalListSortingStrategy}
        >
          {children}
        </SortableContext>
      </DndContext>
    );
  };

  it('should render children unchanged', () => {
    renderWithDndContext(
      <SortableWrapper id="test-id">
        <div data-testid="child-content">Test Content</div>
      </SortableWrapper>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should render wrapper with sortable-wrapper class', () => {
    renderWithDndContext(
      <SortableWrapper id="test-id">
        <div>Test</div>
      </SortableWrapper>
    );

    const wrapper = screen.getByTestId('sortable-wrapper');
    expect(wrapper).toBeInTheDocument();
  });

  it('should render children inside wrapper', () => {
    renderWithDndContext(
      <SortableWrapper id="test-id">
        <div data-testid="child">Test Content</div>
      </SortableWrapper>
    );

    const child = screen.getByTestId('child');
    expect(child).toBeInTheDocument();
    expect(child.textContent).toBe('Test Content');
  });

  it('should accept id prop', () => {
    // This test verifies the component accepts the id prop without errors
    expect(() => {
      renderWithDndContext(
        <SortableWrapper id="test-id">
          <div>Test</div>
        </SortableWrapper>
      );
    }).not.toThrow();
  });
});
