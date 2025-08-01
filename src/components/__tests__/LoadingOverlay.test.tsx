import React from 'react';
import { render, screen } from '@testing-library/react';
import LoadingOverlay from '../LoadingOverlay';

describe('LoadingOverlay', () => {
  it('renders with default props', () => {
    render(<LoadingOverlay />);

    const overlay = screen.getByTestId('loading-overlay');
    const text = screen.getByText('Loading...');

    expect(overlay).toBeInTheDocument();
    expect(text).toBeInTheDocument();
    expect(overlay).toHaveAttribute('role', 'status');
    expect(overlay).toHaveAttribute('aria-live', 'polite');
    expect(overlay).toHaveAttribute('aria-label', 'Loading...');
  });

  it('renders with custom text', () => {
    const customText = 'Please wait...';
    render(<LoadingOverlay text={customText} />);

    const text = screen.getByText(customText);
    const overlay = screen.getByTestId('loading-overlay');

    expect(text).toBeInTheDocument();
    expect(overlay).toHaveAttribute('aria-label', customText);
  });

  it('renders as overlay by default', () => {
    render(<LoadingOverlay />);

    const overlay = screen.getByTestId('loading-overlay');
    expect(overlay).toHaveClass('overlay');
    expect(overlay).not.toHaveClass('inline');
  });

  it('renders as inline when overlay is false', () => {
    render(<LoadingOverlay overlay={false} />);

    const overlay = screen.getByTestId('loading-overlay');
    expect(overlay).toHaveClass('inline');
    expect(overlay).not.toHaveClass('overlay');
  });

  it('applies size classes correctly', () => {
    const { rerender } = render(<LoadingOverlay size="small" />);
    let overlay = screen.getByTestId('loading-overlay');
    expect(overlay).toHaveClass('small');

    rerender(<LoadingOverlay size="medium" />);
    overlay = screen.getByTestId('loading-overlay');
    expect(overlay).toHaveClass('medium');

    rerender(<LoadingOverlay size="large" />);
    overlay = screen.getByTestId('loading-overlay');
    expect(overlay).toHaveClass('large');
  });

  it('applies color classes correctly', () => {
    const { rerender } = render(<LoadingOverlay color="primary" />);
    let overlay = screen.getByTestId('loading-overlay');
    expect(overlay).toHaveClass('primary');

    rerender(<LoadingOverlay color="secondary" />);
    overlay = screen.getByTestId('loading-overlay');
    expect(overlay).toHaveClass('secondary');

    rerender(<LoadingOverlay color="white" />);
    overlay = screen.getByTestId('loading-overlay');
    expect(overlay).toHaveClass('white');
  });

  it('applies custom className', () => {
    const customClass = 'custom-loading';
    render(<LoadingOverlay className={customClass} />);

    const overlay = screen.getByTestId('loading-overlay');
    expect(overlay).toHaveClass(customClass);
  });

  it('uses custom testId', () => {
    const customTestId = 'custom-loading-overlay';
    render(<LoadingOverlay testId={customTestId} />);

    const overlay = screen.getByTestId(customTestId);
    expect(overlay).toBeInTheDocument();
  });

  it('has spinner with aria-hidden attribute', () => {
    render(<LoadingOverlay />);

    const spinner = screen.getByTestId('loading-spinner');

    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-hidden', 'true');
  });

  it('combines multiple classes correctly', () => {
    render(
      <LoadingOverlay
        size="large"
        color="primary"
        overlay={false}
        className="custom-class"
      />
    );

    const overlay = screen.getByTestId('loading-overlay');
    expect(overlay).toHaveClass('inline');
    expect(overlay).toHaveClass('large');
    expect(overlay).toHaveClass('primary');
    expect(overlay).toHaveClass('custom-class');
  });

  it('has proper accessibility attributes', () => {
    const text = 'Processing your request...';
    render(<LoadingOverlay text={text} />);

    const overlay = screen.getByTestId('loading-overlay');

    expect(overlay).toHaveAttribute('role', 'status');
    expect(overlay).toHaveAttribute('aria-live', 'polite');
    expect(overlay).toHaveAttribute('aria-label', text);
  });

  it('renders spinner and text elements', () => {
    render(<LoadingOverlay text="Custom loading text" />);

    const spinner = screen.getByTestId('loading-spinner');
    const textElement = screen.getByTestId('loading-text');

    expect(spinner).toBeInTheDocument();
    expect(textElement).toBeInTheDocument();
    expect(textElement).toHaveTextContent('Custom loading text');
  });

  it('handles empty text gracefully', () => {
    render(<LoadingOverlay text="" />);

    const overlay = screen.getByTestId('loading-overlay');
    const textElement = screen.getByTestId('loading-text');

    expect(textElement).toBeInTheDocument();
    expect(textElement).toHaveTextContent('');
    expect(overlay).toHaveAttribute('aria-label', '');
  });
});
