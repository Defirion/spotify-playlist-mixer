import {
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

/**
 * Custom hook that configures mobile-optimized sensors for dnd-kit
 * Uses proven values: MouseSensor (10px), TouchSensor (250ms delay, 5px tolerance), KeyboardSensor
 */
export function useDragSensors() {
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 10 },
    }),
    useSensor(TouchSensor, {
      // increased from 250 -> 300ms to delay drag activation slightly
      activationConstraint: { delay: 300, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return sensors;
}
