import React from 'react';
import { render, screen } from '@testing-library/react';
import useAutoScroll from '../../hooks/useAutoScroll';

function Harness() {
  // Call the hook to ensure it mounts without runtime errors
  useAutoScroll();
  return <div data-testid="harness">ok</div>;
}

test('useAutoScroll mounts without crashing', () => {
  render(<Harness />);
  expect(screen.getByTestId('harness')).toBeTruthy();
});
