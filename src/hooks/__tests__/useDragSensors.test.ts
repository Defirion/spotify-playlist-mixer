import { renderHook } from '@testing-library/react';
import { useDragSensors } from '../useDragSensors';

describe('useDragSensors', () => {
  it('should return sensors array', () => {
    const { result } = renderHook(() => useDragSensors());

    expect(result.current).toBeDefined();
    expect(Array.isArray(result.current)).toBe(true);
    expect(result.current).toHaveLength(3); // MouseSensor, TouchSensor, KeyboardSensor
  });

  it('should return consistent sensors on re-render', () => {
    const { result, rerender } = renderHook(() => useDragSensors());
    const firstResult = result.current;

    rerender();

    expect(result.current).toEqual(firstResult);
  });
});
