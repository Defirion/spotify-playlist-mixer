import { useEffect, useState } from 'react';
import styles from '../RatioConfig.module.css';
interface LcdNumberProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}
export default function LcdNumber({
  label,
  value,
  min,
  max,
  onChange,
}: LcdNumberProps) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const next = draft.trim()
      ? Math.max(min, Math.min(max, Math.round(Number(draft))))
      : value;
    setDraft(String(next));
    onChange(next);
  };
  return (
    <input
      className={styles.num}
      type="number"
      aria-label={label}
      min={min}
      max={max}
      value={draft}
      onChange={event => {
        setDraft(event.target.value);
        if (event.target.value)
          onChange(
            Math.max(min, Math.min(max, Math.round(Number(event.target.value))))
          );
      }}
      onBlur={commit}
      onKeyDown={event => {
        if (event.key === 'Enter') event.currentTarget.blur();
        if (event.key === 'Escape') {
          setDraft(String(value));
          event.currentTarget.blur();
        }
      }}
    />
  );
}
