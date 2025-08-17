import React from 'react';

type P = { children: React.ReactNode };

export default class DragErrorBoundary extends React.Component<
  P,
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(e: Error) {
    console.error('DragErrorBoundary', e);
  }
  render() {
    if (this.state.hasError)
      return (
        <div role="alert" data-testid="drag-error-boundary">
          <p>Something went wrong with drag operations.</p>
          <button onClick={() => this.setState({ hasError: false })}>
            Retry
          </button>
        </div>
      );
    return this.props.children as React.ReactElement;
  }
}
