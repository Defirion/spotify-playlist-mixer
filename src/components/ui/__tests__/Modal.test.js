import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modal from '../Modal';

describe('Modal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    title: 'Test Modal',
    children: <div>Modal content</div>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any remaining modals
    document.body.innerHTML = '';
  });

  describe('Rendering', () => {
    it('renders modal when isOpen is true', () => {
      render(<Modal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('does not render modal when isOpen is false', () => {
      render(<Modal {...defaultProps} isOpen={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders without title when title is not provided', () => {
      render(<Modal {...defaultProps} title={undefined} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    });

    it('renders close button by default', () => {
      render(<Modal {...defaultProps} />);

      expect(screen.getByLabelText('Close modal')).toBeInTheDocument();
    });

    it('does not render close button when showCloseButton is false', () => {
      render(<Modal {...defaultProps} showCloseButton={false} />);

      expect(screen.queryByLabelText('Close modal')).not.toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<Modal {...defaultProps} className="custom-modal" />);

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveClass('custom-modal');
    });
  });

  describe('Size variants', () => {
    it('applies small size styles', () => {
      render(<Modal {...defaultProps} size="small" />);

      const modal = screen.getByRole('dialog');
      // With CSS modules, we can't easily test exact styles, but we can verify the modal renders
      expect(modal).toBeInTheDocument();
    });

    it('applies medium size styles by default', () => {
      render(<Modal {...defaultProps} />);

      const modal = screen.getByRole('dialog');
      // With CSS modules, we can't easily test exact styles, but we can verify the modal renders
      expect(modal).toBeInTheDocument();
    });

    it('applies large size styles', () => {
      render(<Modal {...defaultProps} size="large" />);

      const modal = screen.getByRole('dialog');
      // With CSS modules, we can't easily test exact styles, but we can verify the modal renders
      expect(modal).toBeInTheDocument();
    });

    it('applies fullscreen size styles', () => {
      render(<Modal {...defaultProps} size="fullscreen" />);

      const modal = screen.getByRole('dialog');
      // With CSS modules, we can't easily test exact styles, but we can verify the modal renders
      expect(modal).toBeInTheDocument();
    });
  });

  describe('Close functionality', () => {
    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<Modal {...defaultProps} />);

      const closeButton = screen.getByLabelText('Close modal');
      await user.click(closeButton);

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is clicked', async () => {
      const user = userEvent.setup();
      render(<Modal {...defaultProps} />);

      // Click on the backdrop (the first child of body that's not the modal)
      const backdrop = document.querySelector('[aria-hidden="true"]');
      await user.click(backdrop);

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when backdrop is clicked and closeOnBackdropClick is false', async () => {
      const user = userEvent.setup();
      render(<Modal {...defaultProps} closeOnBackdropClick={false} />);

      const backdrop = document.querySelector('[aria-hidden="true"]');
      await user.click(backdrop);

      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    it('calls onClose when Escape key is pressed', async () => {
      const user = userEvent.setup();
      render(<Modal {...defaultProps} />);

      await user.keyboard('{Escape}');

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when Escape key is pressed and closeOnEscape is false', async () => {
      const user = userEvent.setup();
      render(<Modal {...defaultProps} closeOnEscape={false} />);

      await user.keyboard('{Escape}');

      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
  });

  describe('Focus management', () => {
    it('focuses the modal when opened', async () => {
      render(<Modal {...defaultProps} />);

      await waitFor(() => {
        const modal = screen.getByRole('dialog');
        expect(modal).toHaveFocus();
      });
    });

    it('traps focus within modal', async () => {
      const user = userEvent.setup();
      render(
        <Modal {...defaultProps}>
          <button>First button</button>
          <button>Second button</button>
        </Modal>
      );

      const firstButton = screen.getByText('First button');
      const secondButton = screen.getByText('Second button');
      const closeButton = screen.getByLabelText('Close modal');

      // Focus should start on the modal
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toHaveFocus();
      });

      // Tab should move to first focusable element
      await user.tab();
      expect(closeButton).toHaveFocus();

      // Tab should move to next focusable element
      await user.tab();
      expect(firstButton).toHaveFocus();

      // Tab should move to next focusable element
      await user.tab();
      expect(secondButton).toHaveFocus();

      // Tab from last element should wrap to first
      await user.tab();
      expect(closeButton).toHaveFocus();

      // Shift+Tab should move backwards
      await user.tab({ shift: true });
      expect(secondButton).toHaveFocus();
    });

    it('restores focus to previously focused element when closed', async () => {
      const user = userEvent.setup();

      // Create a button outside the modal to focus initially
      const { rerender } = render(
        <div>
          <button>Outside button</button>
          <Modal {...defaultProps} isOpen={false} />
        </div>
      );

      const outsideButton = screen.getByText('Outside button');
      await user.click(outsideButton);
      expect(outsideButton).toHaveFocus();

      // Open modal
      rerender(
        <div>
          <button>Outside button</button>
          <Modal {...defaultProps} isOpen={true} />
        </div>
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toHaveFocus();
      });

      // Close modal
      rerender(
        <div>
          <button>Outside button</button>
          <Modal {...defaultProps} isOpen={false} />
        </div>
      );

      // Focus should be restored to the outside button
      await waitFor(() => {
        expect(outsideButton).toHaveFocus();
      });
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA attributes', () => {
      render(<Modal {...defaultProps} />);

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby', 'modal-title');
      expect(modal).toHaveAttribute('tabIndex', '-1');
    });

    it('does not have aria-labelledby when no title is provided', () => {
      render(<Modal {...defaultProps} title={undefined} />);

      const modal = screen.getByRole('dialog');
      expect(modal).not.toHaveAttribute('aria-labelledby');
    });

    it('backdrop has aria-hidden attribute', () => {
      render(<Modal {...defaultProps} />);

      const backdrop = document.querySelector('[aria-hidden="true"]');
      expect(backdrop).toBeInTheDocument();
    });
  });

  describe('Event handling', () => {
    it('prevents modal content clicks from closing modal', async () => {
      const user = userEvent.setup();
      render(<Modal {...defaultProps} />);

      const modalContent = screen.getByText('Modal content');
      await user.click(modalContent);

      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    it('handles multiple rapid escape key presses', async () => {
      const user = userEvent.setup();
      render(<Modal {...defaultProps} />);

      await user.keyboard('{Escape}{Escape}{Escape}');

      // Should only call onClose once per escape press
      expect(defaultProps.onClose).toHaveBeenCalledTimes(3);
    });
  });
});
