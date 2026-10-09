import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import HardwareControl from '../ui/HardwareControl';

function Control({ initial = 4, kind = 'knob' as 'knob' | 'fader' }) {
  const [value, setValue] = useState(initial);
  return (
    <HardwareControl
      label="Test control"
      kind={kind}
      min={1}
      max={8}
      value={value}
      onChange={setValue}
    />
  );
}

function setup(initial = 4, kind: 'knob' | 'fader' = 'knob') {
  render(<Control initial={initial} kind={kind} />);
  const slider = screen.getByRole('slider');
  vi.spyOn(slider, 'getBoundingClientRect').mockReturnValue({
    left: 100,
    top: 200,
    width: 62,
    height: 62,
    right: 162,
    bottom: 262,
    x: 100,
    y: 200,
    toJSON: () => ({}),
  });
  slider.setPointerCapture = vi.fn();
  return slider;
}

function point(angle: number, pointerId = 1) {
  const radians = (angle * Math.PI) / 180;
  return {
    clientX: 131 + 25 * Math.sin(radians),
    clientY: 231 - 25 * Math.cos(radians),
    pointerId,
    button: 0,
  };
}

test('turning clockwise and counterclockwise updates the knob without a grab jump', () => {
  const slider = setup();
  fireEvent.pointerDown(slider, point(-90));
  expect(slider).toHaveValue('4');
  expect(slider).toHaveFocus();
  expect(slider.setPointerCapture).toHaveBeenCalledWith(1);
  fireEvent.pointerMove(slider, point(0));
  expect(slider).toHaveValue('6');
  fireEvent.pointerMove(slider, point(-90));
  expect(slider).toHaveValue('4');
});

test('a 270 degree sweep covers the full marked range', () => {
  const slider = setup(1);
  fireEvent.pointerDown(slider, point(-135));
  for (const angle of [-45, 45, 135]) {
    fireEvent.pointerMove(slider, point(angle));
  }
  expect(slider).toHaveValue('8');
  for (const angle of [45, -45, -135]) {
    fireEvent.pointerMove(slider, point(angle));
  }
  expect(slider).toHaveValue('1');
});

test('crossing the bottom angle boundary keeps the turn continuous', () => {
  const slider = setup();
  fireEvent.pointerDown(slider, point(170));
  fireEvent.pointerMove(slider, point(-170));
  expect(slider).toHaveValue('5');
  fireEvent.pointerMove(slider, point(170));
  expect(slider).toHaveValue('4');
});

test.each([
  [8, 90, 0, '6'],
  [1, -90, 0, '3'],
])(
  'reversing at the %s limit responds immediately',
  (initial, limit, reverse, expected) => {
    const slider = setup(initial);
    fireEvent.pointerDown(slider, point(0));
    fireEvent.pointerMove(slider, point(limit));
    expect(slider).toHaveValue(String(initial));
    fireEvent.pointerMove(slider, point(reverse));
    expect(slider).toHaveValue(expected);
  }
);

test('crossing the center does not cause an accidental half turn', () => {
  const slider = setup();
  fireEvent.pointerDown(slider, point(-90));
  fireEvent.pointerMove(slider, { clientX: 131, clientY: 231, pointerId: 1 });
  fireEvent.pointerMove(slider, point(90));
  expect(slider).toHaveValue('4');
  fireEvent.pointerMove(slider, point(0));
  expect(slider).toHaveValue('2');
});

test.each(['pointerUp', 'pointerCancel', 'lostPointerCapture'] as const)(
  '%s ends the captured gesture and other pointers cannot move it',
  end => {
    const slider = setup();
    fireEvent.pointerDown(slider, point(0));
    fireEvent.pointerMove(slider, point(90, 2));
    expect(slider).toHaveValue('4');
    fireEvent[end](slider, { pointerId: 1 });
    fireEvent.pointerMove(slider, point(90));
    expect(slider).toHaveValue('4');
  }
);

test('faders still follow vertical position', () => {
  const slider = setup(4, 'fader');
  fireEvent.pointerDown(slider, { clientY: 221, pointerId: 1, button: 0 });
  expect(slider).toHaveValue('8');
  fireEvent.pointerMove(slider, { clientY: 241, pointerId: 1 });
  expect(slider).toHaveValue('1');
});
