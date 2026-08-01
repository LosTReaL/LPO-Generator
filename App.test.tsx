import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import App from './App';

vi.mock('./components/HotelLPOModule', () => ({
  default: ({ onNavigateHome }: any) => <div><button onClick={onNavigateHome}>Home</button> HotelLPOModule</div>
}));
vi.mock('./components/generalLpo/GeneralLPOModule', () => ({
  default: ({ onNavigateHome }: any) => <div><button onClick={onNavigateHome}>Home</button> GeneralLPOModule</div>
}));
vi.mock('./components/hotelInvoice/HotelInvoiceModule', () => ({
  default: ({ onNavigateHome }: any) => <div><button onClick={onNavigateHome}>Home</button> HotelInvoiceModule</div>
}));
vi.mock('./components/generalInvoice/GeneralInvoiceModule', () => ({
  default: ({ onNavigateHome }: any) => <div><button onClick={onNavigateHome}>Home</button> GeneralInvoiceModule</div>
}));

describe('App Router Integration', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  afterEach(() => {
    window.location.hash = '';
  });

  it('renders landing page with 4 module choices on startup', () => {
    render(<App />);
    expect(screen.getByText('Ordris')).toBeInTheDocument();
  });

  it('navigates to modules when clicked and allows returning home', async () => {
    render(<App />);
    
    // Hotel LPO
    fireEvent.click(screen.getByText('Hotel LPO'));
    await waitFor(() => expect(screen.getByText('Home')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Home'));
    await waitFor(() => expect(screen.getByText('Ordris')).toBeInTheDocument());

    // General LPO
    fireEvent.click(screen.getByText('General LPO'));
    await waitFor(() => expect(screen.getByText('Home')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Home'));
    await waitFor(() => expect(screen.getByText('Ordris')).toBeInTheDocument());

    // Hotel Invoice
    fireEvent.click(screen.getByText('Hotel Invoice'));
    await waitFor(() => expect(screen.getByText('Home')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Home'));
    await waitFor(() => expect(screen.getByText('Ordris')).toBeInTheDocument());

    // General Invoice
    fireEvent.click(screen.getByText('General Invoice'));
    await waitFor(() => expect(screen.getByText('Home')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Home'));
    await waitFor(() => expect(screen.getByText('Ordris')).toBeInTheDocument());
  });

  it('handles hashchange and popstate events', async () => {
    render(<App />);
    
    act(() => {
      window.location.hash = '#/hotel-lpo';
      window.dispatchEvent(new Event('hashchange'));
    });
    
    await waitFor(() => expect(screen.getByText('Home')).toBeInTheDocument());

    act(() => {
      window.location.hash = '#/general-lpo';
      window.dispatchEvent(new Event('popstate'));
    });
    
    await waitFor(() => expect(screen.getByText('Home')).toBeInTheDocument());
  });

  it('returns home for invalid hash', async () => {
    window.location.hash = '#/invalid-route';
    render(<App />);
    expect(screen.getByText('Ordris')).toBeInTheDocument();
  });
});
