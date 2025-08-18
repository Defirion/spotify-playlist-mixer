import React from 'react';
import { render } from '@testing-library/react';
import { useTrackSelection } from '../useTrackSelection';

function Harness() {
  useTrackSelection({ availableTracks: [], onAddTracks: () => {} });
  return <div data-testid="harness">ok</div>;
}

test('useTrackSelection mounts without crashing', () => {
  const { getByTestId } = render(<Harness />);
  expect(getByTestId('harness')).toBeTruthy();
});
