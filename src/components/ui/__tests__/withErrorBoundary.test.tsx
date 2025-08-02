import React from 'react';
import { render, screen } from '@testing-library/react';
import withErrorBoundary from '../withErrorBoundary';

const WorkingComponent = () => <div>Working Component</div>;

describe('withErrorBoundary', () => {
  beforeEach(() => {
    // Suppress console.error during tests that expect errors
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console.error after each test
    jest.restoreAllMocks();
  });

  test('renders the wrapped component correctly', () => {
    const Component = withErrorBoundary(WorkingComponent);
    render(<Component />);
    expect(screen.getByText('Working Component')).toBeInTheDocument();
  });

  test('sets correct display name', () => {
    const Component = withErrorBoundary(WorkingComponent);
    expect(Component.displayName).toBe('withErrorBoundary(WorkingComponent)');
  });

  test('passes props to wrapped component correctly', () => {
    interface TestProps {
      testProp: string;
    }

    const TestComponent = ({ testProp }: TestProps) => (
      <div>Test: {testProp}</div>
    );
    const Component = withErrorBoundary(TestComponent);

    render(<Component testProp="hello" />);
    expect(screen.getByText('Test: hello')).toBeInTheDocument();
  });

  test('passes error boundary specific props correctly', () => {
    const customFallback = (
      error: Error | null,
      errorInfo: React.ErrorInfo | null,
      handleRetry: () => void
    ) => <div>Custom Fallback</div>;
    const handleError = jest.fn();
    const Component = withErrorBoundary(WorkingComponent);

    // This test just verifies the component renders without error when error boundary props are passed
    render(<Component fallback={customFallback} onError={handleError} />);
    expect(screen.getByText('Working Component')).toBeInTheDocument();
  });

  test('works with components that have display names', () => {
    const NamedComponent = () => <div>Named Component</div>;
    NamedComponent.displayName = 'NamedComponent';

    const Component = withErrorBoundary(NamedComponent);
    expect(Component.displayName).toBe('withErrorBoundary(NamedComponent)');
  });

  test('works with anonymous components', () => {
    const Component = withErrorBoundary(() => <div>Anonymous Component</div>);
    render(<Component />);
    expect(screen.getByText('Anonymous Component')).toBeInTheDocument();
  });
});
