import React, { useEffect, useRef, useCallback } from 'react';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
  className = '',
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
}) => {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  // Handle escape key press
  const handleEscapeKey = useCallback(
    event => {
      if (closeOnEscape && event.key === 'Escape' && isOpen) {
        onClose();
      }
    },
    [closeOnEscape, isOpen, onClose]
  );

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    event => {
      if (closeOnBackdropClick && event.target === event.currentTarget) {
        onClose();
      }
    },
    [closeOnBackdropClick, onClose]
  );

  // Focus management
  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      previousActiveElement.current = document.activeElement;

      // Focus the modal
      if (modalRef.current) {
        modalRef.current.focus();
      }

      // Add escape key listener
      document.addEventListener('keydown', handleEscapeKey);

      return () => {
        document.removeEventListener('keydown', handleEscapeKey);

        // Restore focus to the previously focused element
        if (
          previousActiveElement.current &&
          previousActiveElement.current.focus
        ) {
          previousActiveElement.current.focus();
        }
      };
    }
  }, [isOpen, handleEscapeKey]);

  // Focus trap within modal
  const handleKeyDown = useCallback(event => {
    if (event.key === 'Tab') {
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements && focusableElements.length > 0) {
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    }
  }, []);

  // Size configurations
  const sizeStyles = {
    small: {
      width: '90%',
      maxWidth: '400px',
    },
    medium: {
      width: '90%',
      maxWidth: '600px',
    },
    large: {
      width: '90%',
      maxWidth: '800px',
    },
    fullscreen: {
      width: '95%',
      maxWidth: '1200px',
      maxHeight: '95vh',
    },
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          zIndex: 1000,
          transition: 'opacity 0.2s ease',
        }}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={className}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'var(--hunter-green)',
          border: '2px solid var(--fern-green)',
          borderRadius: '12px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 1001,
          transition: 'opacity 0.2s ease',
          outline: 'none',
          ...sizeStyles[size],
        }}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div
            style={{
              padding: '20px',
              borderBottom: '1px solid var(--fern-green)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            {title && (
              <h2
                id="modal-title"
                style={{
                  margin: 0,
                  color: 'var(--mindaro)',
                  fontSize: '1.25rem',
                  fontWeight: '600',
                }}
              >
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                aria-label="Close modal"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--mindaro)',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  transition: 'background-color 0.2s',
                  marginLeft: title ? '16px' : '0',
                }}
                onMouseEnter={e =>
                  (e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)')
                }
                onMouseLeave={e =>
                  (e.target.style.backgroundColor = 'transparent')
                }
              >
                ×
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
};

export default Modal;
