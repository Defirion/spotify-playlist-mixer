import { CSSProperties, PointerEvent, useEffect, useRef } from 'react';
import styles from '../RatioConfig.module.css';

interface HardwareControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  kind: 'knob' | 'fader';
  onChange: (value: number) => void;
}

export default function HardwareControl({
  label,
  value,
  min,
  max,
  kind,
  onChange,
}: HardwareControlProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const drag = useRef<{ y: number; value: number } | null>(null);
  const latest = useRef({ value, onChange });
  latest.current = { value, onChange };
  const clamp = (next: number) =>
    Math.max(min, Math.min(max, Math.round(next)));
  const position = (value - min) / (max - min);

  useEffect(() => {
    const input = inputRef.current;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const step = kind === 'knob' ? 1 : 3;
      latest.current.onChange(
        clamp(latest.current.value + (event.deltaY < 0 ? step : -step))
      );
    };
    input?.addEventListener('wheel', wheel, { passive: false });
    return () => input?.removeEventListener('wheel', wheel);
    // Bounds are fixed for each hardware control.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [min, max, kind]);

  const move = (event: PointerEvent<HTMLInputElement>) => {
    if (!drag.current) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const next =
      kind === 'knob'
        ? drag.current.value + (drag.current.y - event.clientY) / 14
        : min +
          (1 -
            (event.clientY - bounds.top - 21) /
              Math.max(1, bounds.height - 42)) *
            (max - min);
    onChange(clamp(next));
  };

  return (
    <div
      className={styles[kind]}
      style={
        {
          '--p': position,
          '--a': `${-135 + position * 270}deg`,
        } as CSSProperties
      }
    >
      {kind === 'knob' ? (
        <>
          <svg className={styles.kticks} viewBox="0 0 62 62" aria-hidden="true">
            {Array.from({ length: 8 }, (_, index) => (
              <line
                key={index}
                x1="31"
                y1="2"
                x2="31"
                y2="6"
                transform={`rotate(${-135 + (index * 270) / 7} 31 31)`}
                className={index <= value - min ? styles.on : ''}
              />
            ))}
          </svg>
          <span className={styles.kcap} aria-hidden="true">
            <i />
          </span>
        </>
      ) : (
        <>
          <span className={styles.slot} />
          <span className={styles.fill} />
          <span className={styles.ticks} />
          <span className={styles.fcap}>
            <i />
          </span>
        </>
      )}
      <input
        ref={inputRef}
        className={styles.range}
        type="range"
        aria-label={label}
        aria-orientation="vertical"
        min={min}
        max={max}
        value={value}
        onChange={event => onChange(clamp(Number(event.target.value)))}
        onPointerDown={event => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.focus({ preventScroll: true });
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { y: event.clientY, value };
          if (kind === 'fader') move(event);
        }}
        onPointerMove={move}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onLostPointerCapture={() => {
          drag.current = null;
        }}
        onKeyDown={event => {
          const steps: Record<string, number> = {
            ArrowUp: 1,
            ArrowRight: 1,
            ArrowDown: -1,
            ArrowLeft: -1,
            PageUp: kind === 'knob' ? 2 : 10,
            PageDown: kind === 'knob' ? -2 : -10,
          };
          if (
            event.key in steps ||
            event.key === 'Home' ||
            event.key === 'End'
          ) {
            event.preventDefault();
            onChange(
              clamp(
                event.key === 'Home'
                  ? min
                  : event.key === 'End'
                    ? max
                    : value + steps[event.key]
              )
            );
          }
        }}
      />
    </div>
  );
}
