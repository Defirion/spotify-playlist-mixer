import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { useUnselectedTracks } from '../useUnselectedTracks';

// Prevent accidental network calls by stubbing the spotify API helper used by the hook
jest.mock('../../utils/spotify', () => ({
  getSpotifyApi: (/* token: string */) => ({
    get: async () => ({ data: { items: [] } }),
  }),
}));

function Harness() {
  const selectedPlaylists = React.useMemo(() => [], []);
  const currentTracks = React.useMemo(() => [], []);
  useUnselectedTracks({ accessToken: '', selectedPlaylists, currentTracks });
  return <div data-testid="harness">ok</div>;
}

let mountedUtils: any = null;

afterEach(() => {
  if (mountedUtils && typeof mountedUtils.unmount === 'function') {
    mountedUtils.unmount();
  }
  mountedUtils = null;
  cleanup();
});

test('useUnselectedTracks mounts without crashing', () => {
  act(() => {
    mountedUtils = render(<Harness />);
  });
  expect(mountedUtils.getByTestId('harness')).toBeTruthy();
});
