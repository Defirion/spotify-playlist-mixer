import React from 'react';
import { DndContext, useDndMonitor } from '@dnd-kit/core';
import { useDragSensors } from '../hooks/useDragSensors';
import { vibrate } from '../utils/haptics';

type Props = Omit<
  React.ComponentProps<typeof DndContext>,
  'sensors' | 'children'
> & {
  children: React.ReactNode;
};

const DndProvider: React.FC<Props> = ({ children, ...rest }) => {
  const sensors = useDragSensors();

  // Small monitor component to centralize haptics on dnd-kit lifecycle events
  const HapticsMonitor: React.FC = () => {
    useDndMonitor({
      onDragStart(_event) {
        try {
          vibrate(50);
        } catch (e) {
          // ignore
        }
      },
    });

    return null;
  };

  // Dev-only: intercept navigator.vibrate to log stack traces and timing so we can
  // trace unexpected/delayed vibration calls. Does not change vibration behavior.
  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    try {
      const nav = window.navigator as any;
      if (nav && nav.vibrate && !nav.__vibrateWrapped) {
        const originalVibrate = nav.vibrate.bind(nav);
        nav.vibrate = function vibrateWithTrace(pattern: any) {
          try {
            // eslint-disable-next-line no-console
            console.debug('[haptics-intercept] vibrate called', {
              pattern,
              time: new Date().toISOString(),
              hr:
                typeof performance !== 'undefined' && performance.now
                  ? performance.now()
                  : Date.now(),
              stack: new Error().stack,
            });
          } catch (e) {
            // ignore logging errors
          }
          return originalVibrate(pattern);
        };
        nav.__vibrateWrapped = true;
      }
    } catch (e) {
      // ignore interceptor errors
    }
  }

  return (
    <DndContext sensors={sensors} {...(rest as any)}>
      <HapticsMonitor />
      {children}
    </DndContext>
  );
};

export default DndProvider;
