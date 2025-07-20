import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { DragProvider, useDrag } from '../DragContext';

// Test component to interact with the drag context
const TestComponent = ({ onStateChange }) => {
  const dragContext = useDrag();
  
  React.useEffect(() => {
    if (onStateChange) {
      onStateChange(dragContext);
    }
  }, [dragContext, onStateChange]);

  return (
    <div>
      <div data-testid="is-dragging">{dragContext.isDragging.toString()}</div>
      <div data-testid="drag-type">{dragContext.dragType || 'none'}</div>
      <div data-testid="dragged-item">{dragContext.draggedItem ? 'item' : 'none'}</div>
      <button 
        data-testid="start-drag" 
        onClick={() => dragContext.startDrag({ id: 'test' }, 'custom')}
      >
        Start Drag
      </button>
      <button 
        data-testid="end-drag" 
        onClick={() => dragContext.endDrag('success')}
      >
        End Drag
      </button>
      <button 
        data-testid="cancel-drag" 
        onClick={() => dragContext.cancelDrag('test')}
      >
        Cancel Drag
      </button>
      <button 
        data-testid="html5-start" 
        onClick={() => dragContext.notifyHTML5DragStart()}
      >
        HTML5 Start
      </button>
      <button 
        data-testid="html5-end" 
        onClick={() => dragContext.notifyHTML5DragEnd()}
      >
        HTML5 End
      </button>
    </div>
  );
};

describe('DragContext', () => {
  let contextState;
  let getByTestId;

  beforeEach(() => {
    contextState = null;
    const result = render(
      <DragProvider>
        <TestComponent onStateChange={(state) => { contextState = state; }} />
      </DragProvider>
    );
    getByTestId = result.getByTestId;
  });

  afterEach(() => {
    // Clear any timers
    jest.clearAllTimers();
  });

  test('initializes with correct default state', () => {
    expect(getByTestId('is-dragging').textContent).toBe('false');
    expect(getByTestId('drag-type').textContent).toBe('none');
    expect(getByTestId('dragged-item').textContent).toBe('none');
    expect(contextState.isDropSuccessful).toBe(false);
  });

  test('startDrag sets correct state', () => {
    act(() => {
      getByTestId('start-drag').click();
    });

    expect(getByTestId('is-dragging').textContent).toBe('true');
    expect(getByTestId('drag-type').textContent).toBe('custom');
    expect(getByTestId('dragged-item').textContent).toBe('item');
    expect(contextState.isDropSuccessful).toBe(false);
  });

  test('endDrag with success clears state immediately when no HTML5 drag active', () => {
    // Start drag
    act(() => {
      getByTestId('start-drag').click();
    });

    expect(getByTestId('is-dragging').textContent).toBe('true');

    // End drag
    act(() => {
      getByTestId('end-drag').click();
    });

    expect(getByTestId('is-dragging').textContent).toBe('false');
    expect(getByTestId('drag-type').textContent).toBe('none');
    expect(getByTestId('dragged-item').textContent).toBe('none');
  });

  test('cancelDrag immediately clears all state', () => {
    // Start drag
    act(() => {
      getByTestId('start-drag').click();
    });

    expect(getByTestId('is-dragging').textContent).toBe('true');

    // Cancel drag
    act(() => {
      getByTestId('cancel-drag').click();
    });

    expect(getByTestId('is-dragging').textContent).toBe('false');
    expect(getByTestId('drag-type').textContent).toBe('none');
    expect(getByTestId('dragged-item').textContent).toBe('none');
    expect(contextState.isDropSuccessful).toBe(false);
  });

  test('coordinates HTML5 and custom drag states', async () => {
    // Start custom drag
    act(() => {
      getByTestId('start-drag').click();
    });

    // Start HTML5 drag
    act(() => {
      getByTestId('html5-start').click();
    });

    expect(getByTestId('is-dragging').textContent).toBe('true');

    // End custom drag - should not clear state yet because HTML5 is active
    act(() => {
      getByTestId('end-drag').click();
    });

    // State should still be active because HTML5 drag is ongoing
    expect(getByTestId('is-dragging').textContent).toBe('true');

    // End HTML5 drag - now state should clear
    act(() => {
      getByTestId('html5-end').click();
    });

    expect(getByTestId('is-dragging').textContent).toBe('false');
    expect(getByTestId('drag-type').textContent).toBe('none');
  });

  test('failsafe cleanup triggers after timeout', async () => {
    jest.useFakeTimers();

    // Start drag
    act(() => {
      getByTestId('start-drag').click();
    });

    expect(getByTestId('is-dragging').textContent).toBe('true');

    // Fast-forward time to trigger failsafe
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(getByTestId('is-dragging').textContent).toBe('false');
    expect(getByTestId('drag-type').textContent).toBe('none');

    jest.useRealTimers();
  });

  test('multiple rapid drag operations are handled correctly', () => {
    // Start first drag
    act(() => {
      getByTestId('start-drag').click();
    });

    expect(getByTestId('is-dragging').textContent).toBe('true');

    // Start second drag (should replace first)
    act(() => {
      contextState.startDrag({ id: 'test2' }, 'html5');
    });

    expect(getByTestId('is-dragging').textContent).toBe('true');
    expect(getByTestId('drag-type').textContent).toBe('html5');

    // Cancel should clear everything
    act(() => {
      getByTestId('cancel-drag').click();
    });

    expect(getByTestId('is-dragging').textContent).toBe('false');
  });

  test('HTML5 drag coordination without custom drag', () => {
    // Start HTML5 drag only
    act(() => {
      getByTestId('html5-start').click();
    });

    // End HTML5 drag - should not affect context state since no custom drag was active
    act(() => {
      getByTestId('html5-end').click();
    });

    expect(getByTestId('is-dragging').textContent).toBe('false');
    expect(getByTestId('drag-type').textContent).toBe('none');
  });

  test('unifiedCleanup can be called directly', () => {
    // Start drag
    act(() => {
      getByTestId('start-drag').click();
    });

    expect(getByTestId('is-dragging').textContent).toBe('true');

    // Call unified cleanup directly
    act(() => {
      contextState.unifiedCleanup('direct-call');
    });

    expect(getByTestId('is-dragging').textContent).toBe('false');
    expect(getByTestId('drag-type').textContent).toBe('none');
    expect(getByTestId('dragged-item').textContent).toBe('none');
  });
});