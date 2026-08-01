import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

const ProblemChild = ({ shouldThrow }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>All good</div>;
};

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>
    );
    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('catches error and displays fallback UI', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/The application encountered an unexpected error/)).toBeInTheDocument();
    consoleError.mockRestore();
  });

  it('restarts application when restart button is clicked', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const originalLocation = window.location;
    // @ts-ignore
    delete window.location;
    window.location = { hash: '#/hotel-lpo', reload: vi.fn() } as any;

    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow />
      </ErrorBoundary>
    );
    
    const btn = screen.getByText(/Restart Application/);
    
    fireEvent.mouseOver(btn);
    fireEvent.mouseOut(btn);
    
    fireEvent.click(btn);
    
    expect(window.location.hash).toBe('');
    expect(window.location.reload).toHaveBeenCalled();
    
    window.location = originalLocation as any;
    consoleError.mockRestore();
  });
});
