import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RatioConfig from '../RatioConfig';
import BalanceControl from '../features/mixer/BalanceControl';
import { makePlaylist } from '../../test-utils/mocks/spotify';
import { RatioConfig as Config } from '../../types';

const playlist = makePlaylist({
  id: 'a',
  name: 'Bachata',
  images: [{ url: 'cover.jpg', width: 44, height: 44 }],
});
const initial: Config = {
  a: { min: 1, max: 2, weight: 25, weightType: 'frequency' },
};

function Channel() {
  const [ratioConfig, setConfig] = useState(initial);
  return (
    <RatioConfig
      selectedPlaylists={[playlist]}
      ratioConfig={ratioConfig}
      onRatioUpdate={(id, config) =>
        setConfig(previous => ({ ...previous, [id]: config }))
      }
    />
  );
}

test('renders a compact channel with cover, knobs, fader and exact values', () => {
  render(<Channel />);
  expect(screen.getByRole('heading', { name: 'Bachata' })).toBeInTheDocument();
  expect(screen.getByAltText('Bachata')).toHaveAttribute('src', 'cover.jpg');
  expect(screen.getAllByRole('slider')).toHaveLength(3);
  expect(screen.getAllByRole('spinbutton')).toHaveLength(3);
  expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '100');
  expect(screen.queryByText(/% of mix/)).not.toBeInTheDocument();
});

test('renders channels without artwork and supports removal', async () => {
  const remove = vi.fn();
  render(
    <RatioConfig
      selectedPlaylists={[{ ...playlist, images: [] }]}
      ratioConfig={initial}
      onRatioUpdate={vi.fn()}
      onPlaylistRemove={remove}
    />
  );
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Remove Bachata' }));
  expect(remove).toHaveBeenCalledWith('a');
});

test('raising the minimum also raises the maximum in one update', () => {
  const update = vi.fn();
  render(
    <RatioConfig
      selectedPlaylists={[playlist]}
      ratioConfig={initial}
      onRatioUpdate={update}
    />
  );
  fireEvent.change(screen.getByRole('slider', { name: /minimum/ }), {
    target: { value: 5 },
  });
  expect(update).toHaveBeenCalledWith('a', { ...initial.a, min: 5, max: 5 });
});

test('lowering the maximum cannot cross the minimum', () => {
  const update = vi.fn();
  render(
    <RatioConfig
      selectedPlaylists={[playlist]}
      ratioConfig={{ a: { ...initial.a, min: 3, max: 5 } }}
      onRatioUpdate={update}
    />
  );
  fireEvent.change(screen.getByRole('slider', { name: /maximum/ }), {
    target: { value: 1 },
  });
  expect(update).toHaveBeenCalledWith('a', { ...initial.a, min: 3, max: 3 });
});

test.each([
  ['ArrowUp', 26],
  ['ArrowDown', 24],
  ['PageUp', 35],
  ['PageDown', 15],
  ['Home', 1],
  ['End', 100],
])('priority supports %s', (key, value) => {
  render(<Channel />);
  fireEvent.keyDown(screen.getByRole('slider', { name: 'Bachata priority' }), {
    key,
  });
  expect(
    screen.getByRole('spinbutton', { name: 'Bachata priority value' })
  ).toHaveValue(value);
});

test('wheel changes a knob and its LCD together', () => {
  render(<Channel />);
  fireEvent.wheel(screen.getByRole('slider', { name: /maximum/ }), {
    deltaY: -100,
  });
  expect(
    screen.getByRole('spinbutton', { name: 'Bachata max value' })
  ).toHaveValue(3);
});

test('exact entry changes the fader and its accessible value', async () => {
  render(<Channel />);
  const input = screen.getByRole('spinbutton', {
    name: 'Bachata priority value',
  });
  fireEvent.change(input, { target: { value: '73' } });
  expect(screen.getByRole('slider', { name: 'Bachata priority' })).toHaveValue(
    '73'
  );
});

test('LCD entry can be cleared, replaced, and restored on blur', () => {
  render(<Channel />);
  const input = screen.getByRole('spinbutton', {
    name: 'Bachata priority value',
  });
  fireEvent.change(input, { target: { value: '' } });
  expect(input).toHaveValue(null);
  fireEvent.change(input, { target: { value: '64' } });
  expect(screen.getByRole('slider', { name: 'Bachata priority' })).toHaveValue(
    '64'
  );
  fireEvent.change(input, { target: { value: '' } });
  fireEvent.blur(input);
  expect(input).toHaveValue(64);
});

test('the global balance buttons update every selected channel and retain its ratios', () => {
  const update = vi.fn();
  const second = makePlaylist({ id: 'b', name: 'Salsa' });
  render(
    <BalanceControl
      selectedPlaylists={[playlist, second]}
      ratioConfig={initial}
      onRatioUpdate={update}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Time' }));
  expect(update).toHaveBeenCalledWith('a', {
    ...initial.a,
    weightType: 'time',
  });
  expect(update).toHaveBeenCalledWith('b', {
    min: 1,
    max: 2,
    weight: 1,
    weightType: 'time',
  });
});

test('the balance buttons reflect a time preset', () => {
  render(
    <BalanceControl
      selectedPlaylists={[playlist]}
      ratioConfig={{ a: { ...initial.a, weightType: 'time' } }}
    />
  );
  expect(screen.getByRole('button', { name: 'Time' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
});
