import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true,
      errorId: Date.now() + Math.random()
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Report error to error service if available
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null
    });
    // Force re-render of children
    this.forceUpdate();
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback(
          this.state.error, 
          this.state.errorInfo, 
          this.handleRetry
        );
      }

      // Default fallback UI
      return (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          background: 'var(--hunter-green)',
          border: '2px solid #ff6b6b',
          borderRadius: '12px',
          margin: '20px',
          color: 'white'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>😵</div>
          <h2 style={{ color: '#ff6b6b', marginBottom: '16px' }}>
            Oops! Something went wrong
          </h2>
          <p style={{ 
            marginBottom: '24px', 
            opacity: '0.8',
            maxWidth: '500px',
            margin: '0 auto 24px'
          }}>
            We encountered an unexpected error. Don't worry - your data is safe. 
            You can try again or reload the page.
          </p>
          
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={this.handleRetry}
              style={{
                background: 'var(--moss-green)',
                border: '2px solid var(--fern-green)',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '500'
              }}
            >
              🔄 Try Again
            </button>
            
            <button
              onClick={this.handleReload}
              style={{
                background: 'transparent',
                border: '2px solid var(--moss-green)',
                color: 'var(--moss-green)',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '500'
              }}
            >
              🔃 Reload Page
            </button>
          </div>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ 
              marginTop: '24px', 
              textAlign: 'left',
              background: 'rgba(0,0,0,0.3)',
              padding: '16px',
              borderRadius: '8px',
              fontSize: '14px'
            }}>
              <summary style={{ cursor: 'pointer', marginBottom: '8px', color: '#ff6b6b' }}>
                🐛 Error Details (Development)
              </summary>
              <pre style={{ 
                whiteSpace: 'pre-wrap', 
                wordBreak: 'break-word',
                fontSize: '12px',
                opacity: '0.8'
              }}>
                {this.state.error.toString()}
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;