// React import removed - using automatic JSX runtime
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorBoundary from '../../components/ui/ErrorBoundary';

describe('PlaylistSelector ErrorBoundary (unit)', () => {
  let consoleErrorSpy: import('vitest').MockInstance;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('shows fallback UI when child throws', () => {
    const Throwing = () => {
      throw new Error('playlist selector failure');
    };

    render(
      <ErrorBoundary>
        <Throwing />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Try Again/i })
    ).toBeInTheDocument();
  });
});
