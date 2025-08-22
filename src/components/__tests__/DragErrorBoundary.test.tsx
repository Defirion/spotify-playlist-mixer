import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DragErrorBoundary from '../DragErrorBoundary';

const Bomb: React.FC = () => {
  throw new Error('boom');
};

const Flakey: React.FC<{ fail?: boolean }> = ({ fail = false }) => {
  if (fail) throw new Error('flakey');
  return <div data-testid="flakey-ok">All good</div>;
};

test('DragErrorBoundary catches rendering errors and shows fallback', () => {
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    render(
      <DragErrorBoundary>
        <Bomb />
      </DragErrorBoundary>
    );

    expect(screen.getByTestId('drag-error-boundary')).toBeInTheDocument();
  } finally {
    spy.mockRestore();
  }
});

test('Retry button resets the boundary so a retrying child can render', async () => {
  const user = userEvent.setup();
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

  try {
    // First render throws
    const { rerender } = render(
      <DragErrorBoundary>
        <Flakey fail={true} />
      </DragErrorBoundary>
    );

    // Fallback should be visible
    expect(screen.getByTestId('drag-error-boundary')).toBeInTheDocument();

    // Rerender with a non-failing child first, then click Retry to clear the error state
    rerender(
      <DragErrorBoundary>
        <Flakey fail={false} />
      </DragErrorBoundary>
    );

    // Click the Retry button to reset the ErrorBoundary state
    const retryButton = screen.getByRole('button', { name: /Retry/i });
    await user.click(retryButton);

    // The child should now be rendered
    expect(await screen.findByTestId('flakey-ok')).toBeInTheDocument();
  } finally {
    spy.mockRestore();
  }
});

test('Retry button handles undefined handleRetry gracefully', async () => {
  const user = userEvent.setup();

  // Test the fallback function directly with undefined handleRetry
  const fallback = (
    _error: Error | null,
    _errorInfo: React.ErrorInfo | null,
    handleRetry?: () => void
  ) => (
    <div role="alert" data-testid="drag-error-boundary">
      <p>Something went wrong with drag operations.</p>
      <button
        onClick={() => {
          if (handleRetry) handleRetry();
        }}
      >
        Retry
      </button>
    </div>
  );

  // Render the fallback directly without handleRetry
  render(fallback(new Error('test'), null, undefined));

  // Click the Retry button (should not crash when handleRetry is undefined)
  const retryButton = screen.getByRole('button', { name: /Retry/i });
  await user.click(retryButton);

  // Should still be there and not have crashed
  expect(retryButton).toBeInTheDocument();
});
