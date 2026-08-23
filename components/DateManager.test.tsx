import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DateManager from './DateManager';

describe('DateManager', () => {
  it('renders without crashing', () => {
    render(<DateManager ranges={[]} />);
    expect(screen.getByText('Scheduled Stays')).toBeInTheDocument();
  });

  it('handles month and year navigation', () => {
    const { container } = render(<DateManager ranges={[]} />);
    
    // Previous Month
    const prevBtn = container.querySelectorAll('.calendar-nav-btn')[0];
    fireEvent.click(prevBtn);
    
    // Next Month
    const nextBtn = container.querySelectorAll('.calendar-nav-btn')[1];
    fireEvent.click(nextBtn);

    // Change month via select
    const select = container.querySelector('.calendar-month-select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '5' } }); // June
    expect(select.value).toBe('5');

    // Change year via input
    const yearInput = container.querySelector('.calendar-year-input') as HTMLInputElement;
    fireEvent.change(yearInput, { target: { value: '2025' } });
    expect(yearInput.value).toBe('2025');

    // Invalid year should not crash
    fireEvent.change(yearInput, { target: { value: 'abc' } });
  });

  it('selects date range and adds it', () => {
    const handleChange = vi.fn();
    render(<DateManager ranges={[]} onRangesChange={handleChange} />);
    
    const days = screen.getAllByRole('button').filter(b => b.className.includes('calendar-day'));
    
    // Click start date
    fireEvent.click(days[10]);
    // Click end date
    fireEvent.click(days[15]);
    
    // Add Range button
    const addBtn = screen.getByText('Add Range');
    fireEvent.click(addBtn);
    
    expect(handleChange).toHaveBeenCalled();
  });

  it('uses onAdd when provided', () => {
    const handleAdd = vi.fn();
    render(<DateManager ranges={[]} onAdd={handleAdd} />);
    
    const days = screen.getAllByRole('button').filter(b => b.className.includes('calendar-day'));
    fireEvent.click(days[10]);
    fireEvent.click(days[15]);
    
    const addBtn = screen.getByText('Add Range');
    fireEvent.click(addBtn);
    
    expect(handleAdd).toHaveBeenCalled();
  });

  it('handles disabling nights calculation', () => {
    const handleChange = vi.fn();
    render(<DateManager ranges={[]} disableNightsCalculation onRangesChange={handleChange} />);
    
    const days = screen.getAllByRole('button').filter(b => b.className.includes('calendar-day'));
    // Start date
    fireEvent.click(days[10]);
    // End date can be same day when disabled
    fireEvent.click(days[10]);
    
    const addBtn = screen.getByText('Add Range');
    fireEvent.click(addBtn);
    
    expect(handleChange).toHaveBeenCalled();
  });

  it('handles clicking before start date', () => {
    render(<DateManager ranges={[]} />);
    const days = screen.getAllByRole('button').filter(b => b.className.includes('calendar-day'));
    
    // Click start date
    fireEvent.click(days[15]);
    // Click before start date
    fireEvent.click(days[10]);
  });

  it('removes range', () => {
    const mockRanges = [
      { id: '1', start: new Date(2025, 0, 1), end: new Date(2025, 0, 5), nights: 4 }
    ];
    const handleChange = vi.fn();
    
    render(<DateManager ranges={mockRanges} onRangesChange={handleChange} />);
    
    const deleteBtn = screen.getByTitle('Remove this stay');
    fireEvent.click(deleteBtn);
    
    expect(handleChange).toHaveBeenCalledWith([]);
  });

  it('shows configured ranges', () => {
    const mockRanges = [
      { id: '1', start: new Date(), end: new Date(new Date().setDate(new Date().getDate() + 2)), nights: 2 }
    ];
    render(<DateManager ranges={mockRanges} />);
    expect(screen.getByText(/Stay 1/)).toBeInTheDocument();
  });

  it('handles third click by resetting start date', () => {
    render(<DateManager ranges={[]} />);
    const days = screen.getAllByRole('button').filter(b => b.className.includes('calendar-day'));
    
    fireEvent.click(days[10]); // start
    fireEvent.click(days[15]); // end
    fireEvent.click(days[20]); // new start
  });

  it('hides list when hideList is true', () => {
    render(<DateManager ranges={[]} hideList />);
    expect(screen.queryByText('Scheduled Stays')).not.toBeInTheDocument();
  });

  it('renders action content', () => {
    render(<DateManager ranges={[]} actionContent={<div data-testid="custom-action" />} />);
    expect(screen.getByTestId('custom-action')).toBeInTheDocument();
  });

  it('disables add button when disableAdd is true', () => {
    render(<DateManager ranges={[]} disableAdd />);
    const addBtn = screen.getByText('Add Range');
    expect(addBtn).toBeDisabled();
  });

  it('does nothing when Add button clicked without selection or partial selection', () => {
    render(<DateManager ranges={[]} />);
    const addBtn = screen.getByText('Add Range');
    
    // Force click when both are null
    addBtn.removeAttribute('disabled');
    fireEvent.click(addBtn);

    // Click only start date
    const days = screen.getAllByRole('button').filter(b => b.className.includes('calendar-day'));
    fireEvent.click(days[10]);
    
    // Force click when tempEnd is null
    addBtn.removeAttribute('disabled');
    fireEvent.click(addBtn);
  });

  it('covers unreachable nights < 1 branch by changing props', () => {
    const handleChange = vi.fn();
    const { rerender } = render(<DateManager ranges={[]} disableNightsCalculation onRangesChange={handleChange} />);
    
    const days = screen.getAllByRole('button').filter(b => b.className.includes('calendar-day'));
    fireEvent.click(days[10]);
    fireEvent.click(days[10]); // sets tempEnd to same day because disableNightsCalculation=true

    // Re-render with disableNightsCalculation=false
    rerender(<DateManager ranges={[]} disableNightsCalculation={false} onRangesChange={handleChange} />);

    const addBtn = screen.getByText('Add Range');
    fireEvent.click(addBtn);

    expect(handleChange).not.toHaveBeenCalled();
  });
});
