import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { waitFor } from '@testing-library/react';

describe('index.tsx', () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('throws an error if root element is not found', async () => {
    await expect(() => import('./index.tsx')).rejects.toThrow('Could not find root element to mount to');
  });

  it('renders App when root element exists', async () => {
    vi.resetModules();
    const rootElement = document.createElement('div');
    rootElement.id = 'root';
    document.body.appendChild(rootElement);

    await import('./index.tsx');
    await waitFor(() => {
      expect(document.getElementById('root')?.innerHTML).not.toBe('');
    });
  });
});
