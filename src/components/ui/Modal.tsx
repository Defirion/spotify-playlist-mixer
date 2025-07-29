import React, { useEffect, useRef, useCallback, memo } from 'react';
import { ModalProps } from '../../types';
import styles from './Modal.module.css';

const Modal = memo<ModalProps>(
  ({
    isOpen,
    onClose,
    title,
    children,
    size = 'medium',
    className = '',
    showCloseButton = true,
    closeOnBackdropClick = true,
    closeOnEscape = true,
    style = {},
    backdropStyle = {},
  }) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const previousActiveElement = useRef<Element | null>(null);

    // Handle escape key press
    const handleEscapeKey = useCallback(
      (event: KeyboardEvent) => {
        if (closeOnEscape && event.key === 'Escape' && isOpen) {
          onClose();
        }
      },
      [closeOnEscape, isOpen, onClose]
    );

    // Handle backdrop click
    const handleBackdropClick = useCallback(
      (event: React.MouseEvent<HTMLDivElement>) => {
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
            'focus' in previousActiveElement.current
          ) {
            (previousActiveElement.current as HTMLElement).focus();
          }
        };
      }
    }, [isOpen, handleEscapeKey]);

    // Focus trap within modal
    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Tab') {
          const focusableElements = modalRef.current?.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );

          if (focusableElements && focusableElements.length > 0) {
            const firstElement = focusableElements[0] as HTMLElement;
            const lastElement = focusableElements[
              focusableElements.length - 1
            ] as HTMLElement;

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
      },
      []
    );

    // Generate CSS classes
    const modalClasses = [styles.modal, styles[size], className]
      .filter(Boolean)
      .join(' ');

    if (!isOpen) return null;

    return (
      <>
        {/* Backdrop */}
        <div
          className={styles.backdrop}
          onClick={handleBackdropClick}
          aria-hidden="true"
          style={backdropStyle}
        />

        {/* Modal Container */}
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          className={modalClasses}
          style={style}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className={styles.header}>
              {title && (
                <h2 id="modal-title" className={styles.title}>
                  {title}
                </h2>
              )}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  aria-label="Close modal"
                  className={`${styles.closeButton} ${title ? styles.withTitle : ''}`}
                >
                  ×
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div className={styles.content}>{children}</div>
        </div>
      </>
    );
  }
);

Modal.displayName = 'Modal';

export default Modal;
