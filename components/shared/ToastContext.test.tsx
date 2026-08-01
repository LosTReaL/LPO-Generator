import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ToastProvider, useToast } from './ToastContext';

const TestComponent = () => {
  const { addToast } = useToast();
  return (
    <div>
      <button onClick={() => addToast('Success MSG', 'success')}>Add Success</button>
      <button onClick={() => addToast('Error MSG', 'error')}>Add Error</button>
      <button onClick={() => addToast('Warning MSG', 'warning')}>Add Warning</button>
      <button onClick={() => addToast('Info MSG')}>Add Info</button>
    </div>
  );
};

const ThrowComponent = () => {
  useToast();
  return null;
};

describe('ToastContext', () => {
  it('throws if useToast is used outside provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ThrowComponent />)).toThrow('useToast must be used within a ToastProvider');
    consoleError.mockRestore();
  });

  it('adds and displays toasts of different types', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Add Success'));
    expect(screen.getByText('Success MSG')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Add Error'));
    expect(screen.getByText('Error MSG')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Add Warning'));
    expect(screen.getByText('Warning MSG')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Add Info'));
    expect(screen.getByText('Info MSG')).toBeInTheDocument();
  });

  it('removes toast when close button is clicked', () => {
    const { container } = render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('Add Success'));
    expect(screen.getByText('Success MSG')).toBeInTheDocument();
    const closeBtn = container.querySelector('.toast-close');
    fireEvent.click(closeBtn!);
    expect(screen.queryByText('Success MSG')).not.toBeInTheDocument();
  });

  it('auto-removes toast after 4 seconds', () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('Add Success'));
    expect(screen.getByText('Success MSG')).toBeInTheDocument();
    
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    
    expect(screen.queryByText('Success MSG')).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
