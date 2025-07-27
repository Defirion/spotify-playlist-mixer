import React, { useState } from 'react';
import { ERROR_TYPES } from '../../services/apiErrorHandler';

/**
 * Enhanced error display component for API errors
 * Shows user-friendly messages with retry options and detailed information
 */
const ApiErrorDisplay = ({
  error,
  onRetry,
  onDismiss,
  showDetails = false,
  className = '',
  style = {},
}) => {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  if (!error) return null;

  // Get error icon based on type
  const getErrorIcon = type => {
    const icons = {
      [ERROR_TYPES.NETWORK]: '🌐',
      [ERROR_TYPES.AUTHENTICATION]: '🔑',
      [ERROR_TYPES.AUTHORIZATION]: '🚫',
      [ERROR_TYPES.RATE_LIMIT]: '⏱️',
      [ERROR_TYPES.NOT_FOUND]: '📋',
      [ERROR_TYPES.BAD_REQUEST]: '⚠️',
      [ERROR_TYPES.SERVER_ERROR]: '🔧',
      [ERROR_TYPES.TIMEOUT]: '⏰',
      [ERROR_TYPES.UNKNOWN]: '❓',
    };
    return icons[type] || '⚠️';
  };

  // Get error color based on type
  const getErrorColor = type => {
    const colors = {
      [ERROR_TYPES.NETWORK]: 'var(--moss-green)',
      [ERROR_TYPES.AUTHENTICATION]: 'var(--fern-green)',
      [ERROR_TYPES.AUTHORIZATION]: 'var(--hunter-green)',
      [ERROR_TYPES.RATE_LIMIT]: 'var(--moss-green)',
      [ERROR_TYPES.NOT_FOUND]: 'var(--fern-green)',
      [ERROR_TYPES.BAD_REQUEST]: 'var(--hunter-green)',
      [ERROR_TYPES.SERVER_ERROR]: 'var(--moss-green)',
      [ERROR_TYPES.TIMEOUT]: 'var(--fern-green)',
      [ERROR_TYPES.UNKNOWN]: 'var(--hunter-green)',
    };
    return colors[type] || 'var(--moss-green)';
  };

  const errorIcon = getErrorIcon(error.type);
  const errorColor = getErrorColor(error.type);

  return (
    <div
      className={`api-error-display ${className}`}
      style={{
        border: `2px solid ${errorColor}`,
        background: 'rgba(79, 119, 45, 0.1)',
        borderRadius: '8px',
        padding: '20px',
        margin: '16px 0',
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div style={{ flex: 1 }}>
          {/* Error Title */}
          <h3
            style={{
              color: errorColor,
              margin: '0 0 12px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '1.2em' }}>{errorIcon}</span>
            {error.title}
          </h3>

          {/* Error Message */}
          <p
            style={{
              margin: '0 0 16px 0',
              lineHeight: '1.5',
              color: 'var(--text-color)',
            }}
          >
            {error.message}
          </p>

          {/* Suggestions */}
          {error.suggestions && error.suggestions.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <strong style={{ color: errorColor }}>
                💡 What you can try:
              </strong>
              <ul
                style={{
                  margin: '8px 0 0 0',
                  paddingLeft: '20px',
                  color: 'var(--text-color)',
                }}
              >
                {error.suggestions.map((suggestion, index) => (
                  <li
                    key={index}
                    style={{ marginBottom: '4px', lineHeight: '1.4' }}
                  >
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
              marginBottom: showDetails ? '16px' : '0',
            }}
          >
            {error.retryable && onRetry && (
              <button
                className="btn"
                onClick={onRetry}
                style={{
                  background: errorColor,
                  color: 'white',
                  border: 'none',
                }}
              >
                🔄 Try Again
              </button>
            )}

            {onDismiss && (
              <button
                className="btn"
                onClick={onDismiss}
                style={{
                  background: 'var(--hunter-green)',
                  border: `1px solid ${errorColor}`,
                  color: 'white',
                }}
              >
                ✕ Dismiss
              </button>
            )}

            {showDetails && (
              <button
                className="btn"
                onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                style={{
                  background: 'transparent',
                  border: `1px solid ${errorColor}`,
                  color: errorColor,
                  fontSize: '12px',
                }}
              >
                {showTechnicalDetails ? '🔼 Hide Details' : '🔽 Show Details'}
              </button>
            )}
          </div>

          {/* Technical Details */}
          {showDetails && showTechnicalDetails && (
            <details
              open={showTechnicalDetails}
              style={{
                marginTop: '16px',
                opacity: '0.8',
                fontSize: '12px',
              }}
            >
              <summary
                style={{
                  cursor: 'pointer',
                  color: errorColor,
                  fontWeight: 'bold',
                  marginBottom: '8px',
                }}
              >
                🔧 Technical Details
              </summary>
              <div
                style={{
                  padding: '12px',
                  background: 'var(--dark-green)',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  overflow: 'auto',
                  maxHeight: '200px',
                  border: `1px solid ${errorColor}`,
                }}
              >
                <div style={{ marginBottom: '8px' }}>
                  <strong>Error Type:</strong> {error.type}
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Timestamp:</strong>{' '}
                  {new Date(error.timestamp).toLocaleString()}
                </div>
                {error.status && (
                  <div style={{ marginBottom: '8px' }}>
                    <strong>HTTP Status:</strong> {error.status}{' '}
                    {error.statusText}
                  </div>
                )}
                {error.context && Object.keys(error.context).length > 0 && (
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Context:</strong>
                    <pre
                      style={{
                        whiteSpace: 'pre-wrap',
                        margin: '4px 0',
                        fontSize: '11px',
                      }}
                    >
                      {JSON.stringify(error.context, null, 2)}
                    </pre>
                  </div>
                )}
                {error.originalError && (
                  <div>
                    <strong>Original Error:</strong>
                    <pre
                      style={{
                        whiteSpace: 'pre-wrap',
                        margin: '4px 0',
                        fontSize: '11px',
                      }}
                    >
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
            style={{
              background: 'none',
              border: 'none',
              color: errorColor,
              cursor: 'pointer',
              fontSize: '20px',
              padding: '4px',
              marginLeft: '12px',
            }}
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
