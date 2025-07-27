import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';

// Component that throws an error for testing
const ThrowError = ({ shouldThrow = false }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Mock console.error to avoid noise in test output
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('renders error UI when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('🚨 Something went wrong')).toBeInTheDocument();
    expect(
      screen.getByText(/The application encountered an unexpected error/)
    ).toBeInTheDocument();
    expect(screen.getByText('🔄 Try Again')).toBeInTheDocument();
    expect(screen.getByText('🔃 Refresh Page')).toBeInTheDocument();
  });

  it('calls onError prop when error occurs', () => {
    const onError = jest.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  it('resets error state when retry button is clicked', () => {
    // Test that retry button calls the retry handler
    const onRetry = jest.fn();

    // Create a custom fallback that uses the retry function
    const customFallback = (error, errorInfo, retry) => (
      <div>
        <h1>Custom Error UI</h1>
        <button
          onClick={() => {
            onRetry();
            retry();
          }}
        >
          Try Again
        </button>
      </div>
    );

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Error UI should be visible
    expect(screen.getByText('Custom Error UI')).toBeInTheDocument();

    // Click retry button
    fireEvent.click(screen.getByText('Try Again'));

    // Verify retry was called
    expect(onRetry).toHaveBeenCalled();
  });

  it('renders custom fallback UI when provided', () => {
    const customFallback = (error, errorInfo, retry) => (
      <div>
        <h1>Custom Error UI</h1>
        <button onClick={retry}>Custom Retry</button>
      </div>
    );

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
    expect(screen.getByText('Custom Retry')).toBeInTheDocument();
  });

  it('shows developer details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(
      screen.getByText('🔧 Developer Details (Development Mode)')
    ).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('hides developer details in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(
      screen.queryByText('🔧 Developer Details (Development Mode)')
    ).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });
});
