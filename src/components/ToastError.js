import React, { useEffect } from 'react';

const ToastError = ({ error, onDismiss }) => {
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
    <div className="toast-error">
      <div className="toast-content">
        <span>{error}</span>
        <button onClick={onDismiss}>✕</button>
      </div>
    </div>
  );
};

export default ToastError;