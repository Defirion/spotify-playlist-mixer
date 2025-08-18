import React from 'react';
import { render, screen } from '@testing-library/react';
import { useDropPosition } from '../../hooks/useDropPosition';

function Harness() {
  // pass a minimal tracksLength so hook can initialize
  useDropPosition({ tracksLength: 0 });
  return <div data-testid="harness-drop">ok</div>;
}

test('useDropPosition mounts without crashing', () => {
  render(<Harness />);
  expect(screen.getByTestId('harness-drop')).toBeTruthy();
});
