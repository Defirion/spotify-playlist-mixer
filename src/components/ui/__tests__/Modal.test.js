import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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

    it('applies custom className', () => {
      render(<Modal {...defaultProps} className="custom-modal" />);

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveClass('custom-modal');
    });

    it('applies custom styles', () => {
      const customStyle = { backgroundColor: 'red' };
      render(<Modal {...defaultProps} style={customStyle} />);

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveStyle('background-color: red');
    });

    it('renders different sizes correctly', () => {
      const { rerender } = render(<Modal {...defaultProps} size="small" />);
      expect(screen.getByRole('dialog')).toHaveClass('small');

      rerender(<Modal {...defaultProps} size="large" />);
      expect(screen.getByRole('dialog')).toHaveClass('large');
    });
  });

  describe('Close Button', () => {
    it('renders close button by default', () => {
      render(<Modal {...defaultProps} />);

      const closeButton = screen.getByRole('button', { name: /close modal/i });
      expect(closeButton).toBeInTheDocument();
    });

    it('does not render close button when showCloseButton is false', () => {
      render(<Modal {...defaultProps} showCloseButton={false} />);

      const closeButton = screen.queryByRole('button', {
        name: /close modal/i,
      });
      expect(closeButton).not.toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<Modal {...defaultProps} />);

      const closeButton = screen.getByRole('button', { name: /close modal/i });
      await user.click(closeButton);

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Keyboard Interactions', () => {
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

    it('traps focus within modal', async () => {
      const user = userEvent.setup();
      render(
        <Modal {...defaultProps}>
          <button>First Button</button>
          <button>Second Button</button>
        </Modal>
      );

      const firstButton = screen.getByText('First Button');
      const secondButton = screen.getByText('Second Button');
      const closeButton = screen.getByRole('button', { name: /close modal/i });

      // Focus first button
      firstButton.focus();
      expect(firstButton).toHaveFocus();

      // Tab to second button
      await user.tab();
      expect(secondButton).toHaveFocus();

      // Tab should cycle to close button (since it's also focusable)
      await user.tab();
      expect(closeButton).toHaveFocus();

      // Tab should cycle back to first button
      await user.tab();
      expect(firstButton).toHaveFocus();
    });
  });

  describe('Modal Content Interactions', () => {
    it('does not call onClose when modal content is clicked', async () => {
      const user = userEvent.setup();
      render(<Modal {...defaultProps} />);

      const modalContent = screen.getByText('Modal content');
      await user.click(modalContent);

      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    it('renders modal content correctly', () => {
      render(<Modal {...defaultProps} />);

      expect(screen.getByText('Modal content')).toBeInTheDocument();
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
    });
  });

  describe('Focus Management', () => {
    it('focuses modal when opened', async () => {
      render(<Modal {...defaultProps} />);

      await waitFor(() => {
        const modal = screen.getByRole('dialog');
        expect(modal).toHaveFocus();
      });
    });

    it('restores focus to previous element when closed', async () => {
      const button = document.createElement('button');
      document.body.appendChild(button);
      button.focus();

      const { rerender } = render(<Modal {...defaultProps} />);

      // Close modal
      rerender(<Modal {...defaultProps} isOpen={false} />);

      await waitFor(() => {
        expect(button).toHaveFocus();
      });

      document.body.removeChild(button);
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

    it('has proper modal structure for accessibility', () => {
      render(<Modal {...defaultProps} />);

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby', 'modal-title');
      expect(modal).toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('Event Cleanup', () => {
    it('removes event listeners when modal is closed', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
      const removeEventListenerSpy = jest.spyOn(
        document,
        'removeEventListener'
      );

      const { rerender } = render(<Modal {...defaultProps} />);

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );

      // Close modal
      rerender(<Modal {...defaultProps} isOpen={false} />);

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });
  });
});
