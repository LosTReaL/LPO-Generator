import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Global mocks for jsPDF
vi.mock('jspdf', () => {
  const jsPDFMock = vi.fn().mockImplementation(() => ({
    addImage: vi.fn(),
    text: vi.fn(),
    setFontSize: vi.fn(),
    setTextColor: vi.fn(),
    setFont: vi.fn(),
    line: vi.fn(),
    save: vi.fn(),
    saveGraphicsState: vi.fn(),
    restoreGraphicsState: vi.fn(),
    setGState: vi.fn(),
    splitTextToSize: vi.fn((text, width) => [text]), // Add this mock just in case
    setDrawColor: vi.fn(),
    setLineWidth: vi.fn(),
    GState: vi.fn().mockImplementation(function() { return {}; }),
    internal: {
      pageSize: {
        width: 210,
        height: 297,
        getWidth: () => 210,
        getHeight: () => 297
      }
    },
    getNumberOfPages: vi.fn(() => 1),
    setPage: vi.fn(),
    lastAutoTable: { finalY: 100 }
  }));
  
  return { 
    default: jsPDFMock,
    jsPDF: jsPDFMock
  };
});

vi.mock('jspdf-autotable', () => ({
  default: vi.fn()
}));

// Mock window.scrollTo
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
