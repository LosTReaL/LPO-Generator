import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Building } from 'lucide-react';
import { Section, SubSection, Label, Input, Select, TextArea, Checkbox, StatusBadge } from './SharedUI';

describe('SharedUI Components', () => {
  it('renders Section with title and children', () => {
    render(
      <Section icon={Building} title="Company Info">
        <div>Content Inside</div>
      </Section>
    );
    expect(screen.getByText('Company Info')).toBeInTheDocument();
    expect(screen.getByText('Content Inside')).toBeInTheDocument();
  });

  it('renders Input and handles change events', () => {
    const handleChange = vi.fn();
    render(<Input value="Test" onChange={handleChange} placeholder="Enter name" />);
    const inputEl = screen.getByPlaceholderText('Enter name');
    expect(inputEl).toHaveValue('Test');
    fireEvent.change(inputEl, { target: { value: 'New Value' } });
    expect(handleChange).toHaveBeenCalledWith('New Value');
  });

  it('renders Select and handles option changes', () => {
    const handleChange = vi.fn();
    render(<Select value="USD" onChange={handleChange} options={['USD', 'EUR', 'AED']} />);
    const selectEl = screen.getByRole('combobox');
    expect(selectEl).toHaveValue('USD');
    fireEvent.change(selectEl, { target: { value: 'EUR' } });
    expect(handleChange).toHaveBeenCalledWith('EUR');
  });

  it('renders Checkbox and handles toggle', () => {
    const handleChange = vi.fn();
    render(<Checkbox label="Enable Tax" checked={false} onChange={handleChange} />);
    const checkboxEl = screen.getByLabelText('Enable Tax');
    expect(checkboxEl).not.toBeChecked();
    fireEvent.click(checkboxEl);
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('renders StatusBadge with expected status class', () => {
    render(<StatusBadge status="Approved" />);
    const badge = screen.getByText('Approved');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('status-badge--approved');
  });
});
