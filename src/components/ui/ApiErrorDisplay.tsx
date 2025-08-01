import React, { useState } from 'react';
import { ERROR_TYPES } from '../../services/apiErrorHandler';
import styles from './ApiErrorDisplay.module.css';

// API Error types based on the existing error handler
export type ApiErrorType =
  | 'NETWORK'
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'RATE_LIMIT'
  | 'NOT_FOUND'
  | 'BAD_REQUEST'
  | 'SERVER_ERROR'
  | 'TIMEOUT'
  | 'UNKNOWN';

export interface ApiErrorData {
  type: ApiErrorType;
  title: string;
  message: string;
  suggestions?: string[];
  retryable: boolean;
  timestamp: string;
  status?: number;
  statusText?: string;
  context?: Record<string, any>;
  originalError?: {
    message: string;
    stack?: string;
  };
}

export interface ApiErrorDisplayProps {
  error: ApiErrorData | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
  className?: string;
  style?: React.CSSProperties;
  testId?: string;
}

/**
 * Enhanced error display component for API errors
 * Shows user-friendly messages with retry options and detailed information
 */
const ApiErrorDisplay: React.FC<ApiErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  showDetails = false,
  className = '',
  style = {},
  testId,
}) => {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  if (!error) return null;

  // Get error icon based on type
  const getErrorIcon = (type: ApiErrorType): string => {
    const icons: Record<ApiErrorType, string> = {
      NETWORK: '',
      AUTHENTICATION: '',
      AUTHORIZATION: '',
      RATE_LIMIT: '',
      NOT_FOUND: '',
      BAD_REQUEST: '',
      SERVER_ERROR: '',
      TIMEOUT: '',
      UNKNOWN: '',
    } as Record<ApiErrorType, string>;
    return icons[type] || 'default-icon';
  };

  // Get CSS class name based on error type
  const getErrorTypeClass = (type: ApiErrorType): string => {
    const classMap: Record<ApiErrorType, string> = {
      NETWORK: 'network',
      AUTHENTICATION: 'authentication',
      AUTHORIZATION: 'authorization',
      RATE_LIMIT: 'rate-limit',
      NOT_FOUND: 'not-found',
      BAD_REQUEST: 'bad-request',
      SERVER_ERROR: 'server-error',
      TIMEOUT: 'timeout',
      UNKNOWN: 'unknown',
    } as Record<ApiErrorType, string>;
    return classMap[type] || 'default-class';
  };

  const errorIcon = getErrorIcon(error.type);
  const errorTypeClass = getErrorTypeClass(error.type);

  return (
    <div
      className={`${styles.container} ${styles[errorTypeClass]} ${className}`}
      style={style}
      data-testid={testId}
    >
      <div className={styles.header}>
        <div className={styles.content}>
          {/* Error Title */}
          <h3 className={`${styles.title} ${styles[errorTypeClass]}`}>
            <span className={styles.icon}>{errorIcon}</span>
            {error.title}
          </h3>

          {/* Error Message */}
          <p className={styles.message}>{error.message}</p>

          {/* Suggestions */}
          {error.suggestions && error.suggestions.length > 0 && (
            <div className={styles.suggestions}>
              <strong
                className={`${styles.suggestionsTitle} ${styles[errorTypeClass]}`}
              >
                💡 What you can try:
              </strong>
              <ul className={styles.suggestionsList}>
                {error.suggestions.map((suggestion, index) => (
                  <li key={index} className={styles.suggestionItem}>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div
            className={`${styles.actions} ${showDetails ? styles.hasDetails : ''}`}
          >
            {error.retryable && onRetry && (
              <button
                className={`btn ${styles.retryButton} ${styles[errorTypeClass]}`}
                onClick={onRetry}
              >
                🔄 Try Again
              </button>
            )}

            {onDismiss && (
              <button
                className={`btn ${styles.dismissButton} ${styles[errorTypeClass]}`}
                onClick={onDismiss}
              >
                ✕ Dismiss
              </button>
            )}

            {showDetails && (
              <button
                className={`btn ${styles.detailsButton} ${styles[errorTypeClass]}`}
                onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              >
                {showTechnicalDetails ? '🔼 Hide Details' : '🔽 Show Details'}
              </button>
            )}
          </div>

          {/* Technical Details */}
          {showDetails && showTechnicalDetails && (
            <details
              open={showTechnicalDetails}
              className={styles.technicalDetails}
            >
              <summary
                className={`${styles.detailsSummary} ${styles[errorTypeClass]}`}
              >
                🔧 Technical Details
              </summary>
              <div
                className={`${styles.detailsContent} ${styles[errorTypeClass]}`}
              >
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Error Type:</span>{' '}
                  {error.type}
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Timestamp:</span>{' '}
                  {new Date(error.timestamp).toLocaleString()}
                </div>
                {error.status && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>HTTP Status:</span>{' '}
                    {error.status} {error.statusText}
                  </div>
                )}
                {error.context && Object.keys(error.context).length > 0 && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Context:</span>
                    <pre className={styles.detailValue}>
                      {JSON.stringify(error.context, null, 2)}
                    </pre>
                  </div>
                )}
                {error.originalError && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Original Error:</span>
                    <pre className={styles.detailValue}>
                      {error.originalError.message}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}
        </div>

        {/* Close Button */}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={`${styles.closeButton} ${styles[errorTypeClass]}`}
            title="Dismiss error"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

export default ApiErrorDisplay;
