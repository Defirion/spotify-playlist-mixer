import React, { useEffect } from 'react';
import styles from './ToastError.module.css';
import { ApiError } from '../services/apiErrorHandler';
import { normalizeError, DisplayError } from '../utils/normalizeError';

interface ToastErrorProps {
  // Accept the normalized DisplayError directly or legacy shapes for
  // backwards compatibility.
  error: DisplayError | string | Error | ApiError | null | undefined;
  onDismiss: () => void;
  // Optional retry handler to invoke when error.retryable is true
  onRetry?: () => void;
}

const ToastError: React.FC<ToastErrorProps> = ({
  error,
  onDismiss,
  onRetry,
}) => {
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        onDismiss();
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [error, onDismiss]);

  if (!error) return null;

  // Normalize various error shapes to a DisplayError and show the message/title
  const display = normalizeError(error);
  const message = display.title || display.message;

  return (
    <div className={styles['toast-error']} role="status">
      <div className={styles['toast-content']}>
        <div className={styles['toast-main']}>
          <span className={styles['toast-message']}>{message}</span>

          <div className={styles['toast-actions']}>
            {display.suggestions && display.suggestions.length > 0 && (
              <div className={styles['toast-suggestions']}>
                {display.suggestions.map((sugg, idx) => (
                  <div key={idx} className={styles['toast-suggestion']}>
                    {sugg}
                  </div>
                ))}
              </div>
            )}

            {display.retryable && onRetry && (
              <button onClick={onRetry} className={styles['toast-retry']}>
                Retry
              </button>
            )}

            <button onClick={onDismiss} aria-label="Close notification">
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToastError;
