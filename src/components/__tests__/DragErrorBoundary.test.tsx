import React from 'react';
import { render, screen } from '@testing-library/react';
import DragErrorBoundary from '../DragErrorBoundary';

const Bomb: React.FC = () => {
  throw new Error('boom');
};

test('DragErrorBoundary catches rendering errors and shows fallback', () => {
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    render(
      <DragErrorBoundary>
        <Bomb />
      </DragErrorBoundary>
    );

    expect(screen.getByTestId('drag-error-boundary')).toBeInTheDocument();
  } finally {
    spy.mockRestore();
  }
});
