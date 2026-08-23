import '@testing-library/jest-dom';
import { vi } from 'vitest';

// NOTE: jsPDF / jspdf-autotable are NOT globally mocked here.
// Each service test collocates its own vi.mock('jspdf') factory so unit
// tests stay hermetic, while services/realPdfOutput.test.ts exercises the
// REAL libraries end-to-end to validate actual PDF binaries.
// window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
});

// Mock URL.createObjectURL / revokeObjectURL
Object.defineProperty(window.URL, 'createObjectURL', {
  writable: true,
  value: vi.fn(() => 'blob:mock-url'),
});
Object.defineProperty(window.URL, 'revokeObjectURL', {
  writable: true,
  value: vi.fn(),
});

// Mock HTMLCanvasElement.getContext
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Array(4) })),
  putImageData: vi.fn(),
  createImageData: vi.fn(() => []),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  fillText: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  transform: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
});
