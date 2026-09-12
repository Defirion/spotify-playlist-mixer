import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import Modal from '../Modal';

describe('Modal', () => {
  it('does not render when closed', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={false} onClose={onClose} title="T">
        <div>content</div>
      </Modal>
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders when open with title and close button', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Title">
        <div>content</div>
      </Modal>
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Close modal')).toBeInTheDocument();
  });

  it('calls onClose when backdrop is clicked and closeOnBackdropClick=true', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="T">
        <div>content</div>
      </Modal>
    );

    const backdrop = screen.getByTestId('modal-backdrop');
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it('does not close on backdrop when closeOnBackdropClick=false', () => {
    const onClose = vi.fn();
    render(
      <Modal
        isOpen={true}
        onClose={onClose}
        title="T"
        closeOnBackdropClick={false}
      >
        <div>content</div>
      </Modal>
    );

    const backdrop = screen.getByTestId('modal-backdrop');
    fireEvent.click(backdrop);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose on Escape when closeOnEscape=true', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="T">
        <div>content</div>
      </Modal>
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('prevents tabbing out of modal (focus trap) by wrapping focus', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="T">
        <button>first</button>
        <button>last</button>
      </Modal>
    );
    const dialog = screen.getByTestId('modal-dialog');
    // focus first child
    const { getAllByRole } = within(dialog);
    const buttons = getAllByRole('button');
    (buttons[0] as HTMLElement).focus();

    // simulate Shift+Tab at first element -> should move focus to last
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(buttons[buttons.length - 1]).toHaveFocus();

    // simulate Tab at last element -> should wrap to first
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: false });
    expect(buttons[0]).toHaveFocus();
  });
});
