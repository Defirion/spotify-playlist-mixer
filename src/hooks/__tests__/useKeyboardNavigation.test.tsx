import React from 'react';
import { render } from '@testing-library/react';
import useKeyboardNavigation from '../useKeyboardNavigation';

function Harness() {
  // call with empty items to exercise initial branches
  useKeyboardNavigation({ items: [] });
  return <div data-testid="harness">ok</div>;
}

test('useKeyboardNavigation mounts without crashing', () => {
  const { getByTestId } = render(<Harness />);
  expect(getByTestId('harness')).toBeTruthy();
});
