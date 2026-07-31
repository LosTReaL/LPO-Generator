import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App Router Integration', () => {
  it('renders landing page with 4 module choices on startup', () => {
    render(<App />);
    expect(screen.getByText('Ordris')).toBeInTheDocument();
    expect(screen.getByText('Hotel LPO')).toBeInTheDocument();
    expect(screen.getByText('General LPO')).toBeInTheDocument();
    expect(screen.getByText('Hotel Invoice')).toBeInTheDocument();
    expect(screen.getByText('General Invoice')).toBeInTheDocument();
  });

  it('navigates to Hotel LPO module when clicked and allows returning home', async () => {
    render(<App />);
    const hotelLpoCard = screen.getByText('Hotel LPO');
    fireEvent.click(hotelLpoCard);

    await waitFor(() => {
      expect(screen.getByText('Back to Home')).toBeInTheDocument();
    });

    const homeBtn = screen.getByText('Back to Home');
    fireEvent.click(homeBtn);

    await waitFor(() => {
      expect(screen.getByText('Ordris')).toBeInTheDocument();
    });
  });
});
