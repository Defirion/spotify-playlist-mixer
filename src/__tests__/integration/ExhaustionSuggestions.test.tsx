import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AppShell from '../../AppShell';
import { MixOptions, RatioConfig, RatioConfigItem } from '../../types';
import { makePlaylist } from '../../test-utils/mocks/spotify';

const playlists = [
  makePlaylist({
    id: 'a',
    name: 'Small source',
    items: { total: 10, href: '' },
  }),
  makePlaylist({
    id: 'b',
    name: 'Large source',
    items: { total: 20, href: '' },
  }),
];
const initialRatios: RatioConfig = {
  a: { min: 1, max: 2, weight: 1, weightType: 'frequency' },
  b: { min: 2, max: 3, weight: 1, weightType: 'frequency' },
};
const initialOptions: MixOptions = {
  totalSongs: 25,
  targetDurationSeconds: 3600,
  useTimeLimit: false,
  useAllSongs: false,
  playlistName: 'My mix',
  shuffleTracks: false,
  continueWhenPlaylistEmpty: false,
};

describe('exhaustion suggestions in the mixer', () => {
  it('applies only after a click, updates the ratio controls and clears the old preview', async () => {
    const onUpdate = vi.fn();
    const Harness = () => {
      const [ratios, setRatios] = useState(initialRatios);
      return (
        <AppShell
          isAuthenticated
          selectedPlaylists={playlists}
          ratioConfig={ratios}
          mixOptions={initialOptions}
          updateMixOptions={vi.fn()}
          onRatioUpdate={(id: string, config: RatioConfigItem) => {
            onUpdate(id, config);
            setRatios(previous => ({ ...previous, [id]: config }));
          }}
        />
      );
    };
    render(<Harness />);
    expect(
      screen.getByText(/estimated to run out around 20 songs/)
    ).toBeInTheDocument();
    expect(screen.getByText('Small source: 33.3%')).toBeInTheDocument();
    expect(screen.getByText('Large source: 66.7%')).toBeInTheDocument();
    expect(onUpdate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /generate preview/i }));
    await screen.findByText(/Mix Preview/);
    fireEvent.click(
      screen.getByRole('button', { name: 'Apply suggested ratios' })
    );
    expect(onUpdate).toHaveBeenCalledWith('a', {
      ...initialRatios.a,
      weight: 50,
    });
    expect(onUpdate).toHaveBeenCalledWith('b', {
      ...initialRatios.b,
      weight: 100,
    });
    expect(
      screen.getAllByRole('slider').map(slider => slider.getAttribute('value'))
    ).toEqual(['1', '2', '50', '2', '3', '100']);
    await waitFor(() =>
      expect(screen.queryByText(/Mix Preview/)).not.toBeInTheDocument()
    );
    expect(
      screen.queryByText(/Ratio imbalance warning/)
    ).not.toBeInTheDocument();
    expect(
      screen.getByLabelText(
        'Continue with remaining playlists when one runs out'
      )
    ).not.toBeChecked();
  });

  it('updates the stop/continue choice without changing the target', () => {
    const updateOptions = vi.fn();
    const props = {
      isAuthenticated: true,
      selectedPlaylists: playlists,
      ratioConfig: initialRatios,
      mixOptions: initialOptions,
      updateMixOptions: updateOptions,
    };
    const { rerender } = render(<AppShell {...props} />);
    expect(screen.getByText(/and mixing will stop there/)).toBeInTheDocument();
    fireEvent.click(
      screen.getByLabelText(
        'Continue with remaining playlists when one runs out'
      )
    );
    expect(updateOptions).toHaveBeenCalledWith({
      continueWhenPlaylistEmpty: true,
    });
    rerender(
      <AppShell
        {...props}
        mixOptions={{ ...initialOptions, continueWhenPlaylistEmpty: true }}
      />
    );
    expect(
      screen.getByText(/but mixing will continue with remaining playlists/)
    ).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toHaveValue(25);
  });
});
