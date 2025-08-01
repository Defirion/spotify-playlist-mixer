import React from 'react';
import { LoadingProps } from '../types/components';
import styles from './LoadingOverlay.module.css';

interface LoadingOverlayProps extends Omit<LoadingProps, 'variant'> {
  /**
   * The loading text to display below the spinner
   * @default "Loading..."
   */
  text?: string;

  /**
   * Whether to show as an overlay (fixed position) or inline
   * @default true
   */
  overlay?: boolean;

  /**
   * The size of the loading spinner
   * @default "medium"
   */
  size?: 'small' | 'medium' | 'large';

  /**
   * The color theme of the spinner
   * @default "white"
   */
  color?: 'primary' | 'secondary' | 'white';

  /**
   * Additional CSS class name
   */
  className?: string;

  /**
   * Test ID for testing purposes
   */
  testId?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  text = 'Loading...',
  overlay = true,
  size = 'medium',
  color = 'white',
  className = '',
  testId = 'loading-overlay',
}) => {
  const overlayClasses = [
    overlay ? styles.overlay : styles.inline,
    styles[size],
    styles[color],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={overlayClasses}
      data-testid={testId}
      role="status"
      aria-live="polite"
      aria-label={text}
    >
      <div
        className={styles.spinner}
        aria-hidden="true"
        data-testid="loading-spinner"
      />
      <div className={styles.text} data-testid="loading-text">
        {text}
      </div>
    </div>
  );
};

export default LoadingOverlay;
