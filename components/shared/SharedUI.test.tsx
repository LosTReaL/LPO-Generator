import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Building } from 'lucide-react';
import { Section, SubSection, Label, Input, Select, TextArea, Checkbox, StatusBadge, ModuleHeader } from './SharedUI';

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

  it('renders SubSection', () => {
    render(
      <SubSection title="Sub Title" icon={Building}>
        <div>Sub Content</div>
      </SubSection>
    );
    expect(screen.getByText('Sub Title')).toBeInTheDocument();
    expect(screen.getByText('Sub Content')).toBeInTheDocument();
  });

  it('renders Label with icon', () => {
    render(<Label icon={Building}>My Label</Label>);
    expect(screen.getByText('My Label')).toBeInTheDocument();
  });

  it('renders Input and handles change events', () => {
    const handleChange = vi.fn();
    render(<Input value="Test" onChange={handleChange} placeholder="Enter name" icon={Building} />);
    const inputEl = screen.getByPlaceholderText('Enter name');
    expect(inputEl).toHaveValue('Test');
    fireEvent.change(inputEl, { target: { value: 'New Value' } });
    expect(handleChange).toHaveBeenCalledWith('New Value');
  });

  it('renders number Input and handles keydown', () => {
    const handleChange = vi.fn();
    render(<Input type="number" value={10} min={0} onChange={handleChange} placeholder="Enter age" />);
    const inputEl = screen.getByPlaceholderText('Enter age');
    expect(inputEl).toHaveValue(10);
    
    // valid change
    fireEvent.change(inputEl, { target: { value: '20' } });
    expect(handleChange).toHaveBeenCalledWith(20);

    // keydown negative prevention
    expect(fireEvent.keyDown(inputEl, { key: '-' })).toBe(false); // false means default was prevented
    expect(fireEvent.keyDown(inputEl, { key: 'e' })).toBe(false);
    expect(fireEvent.keyDown(inputEl, { key: '1' })).toBe(true); // not prevented
  });

  it('renders Select and handles option changes', () => {
    const handleChange = vi.fn();
    const { rerender } = render(<Select value="USD" onChange={handleChange} options={['USD', 'EUR', 'AED']} icon={Building} />);
    const selectEl = screen.getByRole('combobox');
    expect(selectEl).toHaveValue('USD');
    fireEvent.change(selectEl, { target: { value: 'EUR' } });
    expect(handleChange).toHaveBeenCalledWith('EUR');

    // Test without icon
    rerender(<Select value="EUR" onChange={handleChange} options={['USD', 'EUR', 'AED']} />);
    expect(screen.getByRole('combobox')).not.toHaveClass('select-field--with-icon');
  });

  it('renders TextArea and handles change events', () => {
    const handleChange = vi.fn();
    render(<TextArea value="Initial" onChange={handleChange} placeholder="Text area" />);
    const textareaEl = screen.getByPlaceholderText('Text area');
    expect(textareaEl).toHaveValue('Initial');
    fireEvent.change(textareaEl, { target: { value: 'Updated' } });
    expect(handleChange).toHaveBeenCalledWith('Updated');
  });

  it('renders Checkbox and handles toggle', () => {
    const handleChange = vi.fn();
    const { rerender } = render(<Checkbox label="Enable Tax" checked={false} onChange={handleChange} />);
    const checkboxEl = screen.getByLabelText('Enable Tax');
    expect(checkboxEl).not.toBeChecked();
    fireEvent.click(checkboxEl);
    expect(handleChange).toHaveBeenCalledWith(true);

    // Test checked state with children
    rerender(
      <Checkbox label="Enable Tax" checked={true} onChange={handleChange}>
        <div data-testid="child-content">Child content</div>
      </Checkbox>
    );
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  it('renders StatusBadge with expected status class', () => {
    const { rerender } = render(<StatusBadge status="Approved" />);
    expect(screen.getByText('Approved')).toHaveClass('status-badge--approved');

    // Default fallback
    rerender(<StatusBadge status="Unknown" />);
    expect(screen.getByText('Unknown')).toHaveClass('status-badge--draft');
  });

  it('maps General-LPO workflow statuses to styled badges (regression)', () => {
    const { rerender } = render(<StatusBadge status="Sent to Supplier" />);
    expect(screen.getByText('Sent to Supplier')).toHaveClass('status-badge--sent');

    rerender(<StatusBadge status="Partially Received" />);
    expect(screen.getByText('Partially Received')).toHaveClass('status-badge--partial');

    rerender(<StatusBadge status="Completed" />);
    expect(screen.getByText('Completed')).toHaveClass('status-badge--delivered');
  });

  it('renders ModuleHeader and handles navigation', () => {
    const handleHome = vi.fn();
    render(
      <ModuleHeader title="Test Module" onNavigateHome={handleHome}>
        <button>Extra Action</button>
      </ModuleHeader>
    );
    
    expect(screen.getByText('Test Module')).toBeInTheDocument();
    expect(screen.getByText('Extra Action')).toBeInTheDocument();

    const homeBtn = screen.getByText('Home');
    fireEvent.click(homeBtn);
    expect(handleHome).toHaveBeenCalled();
  });
});
