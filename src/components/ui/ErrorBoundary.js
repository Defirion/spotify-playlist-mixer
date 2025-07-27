import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      errorId: Date.now().toString(36) + Math.random().toString(36).substr(2),
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Report error to monitoring service if available
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    // Reset error state to retry rendering
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  handleReload = () => {
    // Reload the entire page as a last resort
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI can be provided via props
      if (this.props.fallback) {
        return this.props.fallback(
          this.state.error,
          this.state.errorInfo,
          this.handleRetry
        );
      }

      // Default fallback UI
      return (
        <div
          className="error-boundary"
          style={{
            padding: '24px',
            margin: '16px',
            border: '2px solid var(--fern-green)',
            borderRadius: '8px',
            background: 'rgba(79, 119, 45, 0.1)',
            textAlign: 'center',
          }}
        >
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ color: 'var(--moss-green)', margin: '0 0 12px 0' }}>
              🚨 Something went wrong
            </h2>
            <p style={{ margin: '0 0 16px 0', lineHeight: '1.5' }}>
              The application encountered an unexpected error and couldn't
              continue.
            </p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <strong style={{ color: 'var(--moss-green)' }}>
              💡 What you can try:
            </strong>
            <ul
              style={{
                margin: '8px 0 0 0',
                paddingLeft: '20px',
                textAlign: 'left',
                display: 'inline-block',
              }}
            >
              <li style={{ marginBottom: '4px' }}>
                Click "Try Again" to retry the operation
              </li>
              <li style={{ marginBottom: '4px' }}>
                Refresh the page to start over
              </li>
              <li style={{ marginBottom: '4px' }}>
                Check your internet connection
              </li>
              <li style={{ marginBottom: '4px' }}>
                Try again in a few minutes
              </li>
            </ul>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <button
              className="btn"
              onClick={this.handleRetry}
              style={{
                background: 'var(--moss-green)',
                padding: '12px 24px',
                fontSize: '14px',
              }}
            >
              🔄 Try Again
            </button>

            <button
              className="btn"
              onClick={this.handleReload}
              style={{
                background: 'var(--hunter-green)',
                border: '1px solid var(--fern-green)',
                padding: '12px 24px',
                fontSize: '14px',
              }}
            >
              🔃 Refresh Page
            </button>
          </div>

          {/* Technical details for debugging */}
          {process.env.NODE_ENV === 'development' && (
            <details style={{ marginTop: '24px', textAlign: 'left' }}>
              <summary
                style={{
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: 'var(--moss-green)',
                  fontWeight: 'bold',
                }}
              >
                🔧 Developer Details (Development Mode)
              </summary>
              <div
                style={{
                  marginTop: '12px',
                  padding: '12px',
                  background: 'var(--dark-green)',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  overflow: 'auto',
                  maxHeight: '200px',
                }}
              >
                <div style={{ marginBottom: '8px' }}>
                  <strong>Error ID:</strong> {this.state.errorId}
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Error:</strong>{' '}
                  {this.state.error && this.state.error.toString()}
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Component Stack:</strong>
                  <pre style={{ whiteSpace: 'pre-wrap', margin: '4px 0' }}>
                    {this.state.errorInfo &&
                      this.state.errorInfo.componentStack}
                  </pre>
                </div>
                {this.state.error && this.state.error.stack && (
                  <div>
                    <strong>Stack Trace:</strong>
                    <pre style={{ whiteSpace: 'pre-wrap', margin: '4px 0' }}>
                      {this.state.error.stack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
