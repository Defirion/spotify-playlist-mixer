import React from 'react';
import styles from './ErrorBoundary.module.css';

interface ErrorBoundaryProps {
  fallback?: (
    error: Error | null,
    errorInfo: React.ErrorInfo | null,
    handleRetry: () => void
  ) => React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string | null;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      errorId: Date.now().toString(36) + Math.random().toString(36).substr(2),
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
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

  handleRetry = (): void => {
    // Reset error state to retry rendering - clear all error-related fields
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  handleReload = (): void => {
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
        <div className={`${styles.errorBoundaryContainer} error-boundary`}>
          <div className={styles.errorHeaderContainer}>
            <h2 className={styles.errorTitle}>🚨 Something went wrong</h2>
            <p className={styles.errorMessage}>
              The application encountered an unexpected error and couldn't
              continue.
            </p>
          </div>

          <div className={styles.sectionMarginBottom}>
            <strong className={styles.errorMessageText}>
              💡 What you can try:
            </strong>
            <ul className={styles.listContainer}>
              <li className={styles.listItem}>
                Click "Try Again" to retry the operation
              </li>
              <li className={styles.listItem}>
                Refresh the page to start over
              </li>
              <li className={styles.listItem}>
                Check your internet connection
              </li>
              <li className={styles.listItem}>Try again in a few minutes</li>
            </ul>
          </div>

          <div className={styles.buttonContainer}>
            <button
              className={`${styles.tryAgainButton} btn`}
              onClick={this.handleRetry}
            >
              🔄 Try Again
            </button>

            <button
              className={`${styles.refreshButton} btn`}
              onClick={this.handleReload}
            >
              🔃 Refresh Page
            </button>
          </div>

          {/* Technical details for debugging */}
          {process.env.NODE_ENV === 'development' && (
            <details className={styles.developerDetails}>
              <summary className={styles.developerDetailsSummary}>
                🔧 Developer Details (Development Mode)
              </summary>
              <div className={styles.developerDetailsContent}>
                <div className={styles.errorId}>
                  <strong>Error ID:</strong> {this.state.errorId}
                </div>
                <div className={styles.errorMessageText}>
                  <strong>Error:</strong>{' '}
                  {this.state.error && this.state.error.toString()}
                </div>
                <div className={styles.componentStack}>
                  <strong>Component Stack:</strong>
                  <pre className={styles.stackTrace}>
                    {this.state.errorInfo &&
                      this.state.errorInfo.componentStack}
                  </pre>
                </div>
                {this.state.error && this.state.error.stack && (
                  <div>
                    <strong>Stack Trace:</strong>
                    <pre className={styles.stackTrace}>
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
