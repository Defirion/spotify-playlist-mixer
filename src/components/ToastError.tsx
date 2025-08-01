import React, { useEffect } from 'react';
import styles from './ToastError.module.css';

interface ToastErrorProps {
  error: string | null | undefined;
  onDismiss: () => void;
}

const ToastError: React.FC<ToastErrorProps> = ({ error, onDismiss }) => {
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        onDismiss();
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [error, onDismiss]);

  if (!error) return null;

  return (
    <div className={styles['toast-error']}>
      <div className={styles['toast-content']}>
        <span>{error}</span>
        <button onClick={onDismiss} aria-label="Close notification">
          ✕
        </button>
      </div>
    </div>
  );
};

export default ToastError;
