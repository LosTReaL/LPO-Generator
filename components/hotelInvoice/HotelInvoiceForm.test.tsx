import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HotelInvoiceForm } from './HotelInvoiceForm';
import { INITIAL_HOTEL_INVOICE, HotelInvoiceData } from '../../types/generalInvoice';

describe('HotelInvoiceForm', () => {
  const mockOnChange = vi.fn();
  let baseData: HotelInvoiceData;

  beforeEach(() => {
    vi.clearAllMocks();
    baseData = {
      ...INITIAL_HOTEL_INVOICE,
      lineItems: [],
      payments: []
    };
  });

  const getNextInput = (container: HTMLElement, labelText: string) => {
    const labels = Array.from(container.querySelectorAll('.form-label'));
    const labelSpan = labels.find(s => s.textContent?.includes(labelText));
    if (!labelSpan) return null;
    const containerDiv = labelSpan.nextElementSibling;
    return containerDiv?.tagName === 'INPUT' || containerDiv?.tagName === 'TEXTAREA' ? containerDiv : containerDiv?.querySelector('input, textarea');
  };

  it('renders form and updates hotel details', () => {
    const { container } = render(<HotelInvoiceForm data={baseData} onChange={mockOnChange} />);
    
    const hotelNameInput = getNextInput(container, 'Hotel Name') as HTMLInputElement;
    fireEvent.change(hotelNameInput, { target: { value: 'Test Hotel' } });
    expect(mockOnChange).toHaveBeenCalledWith({ hotelName: 'Test Hotel' });

    const hotelAddressInput = getNextInput(container, 'Hotel Address') as HTMLTextAreaElement;
    fireEvent.change(hotelAddressInput, { target: { value: '123 Test St' } });
    expect(mockOnChange).toHaveBeenCalledWith({ hotelAddress: '123 Test St' });

    const phoneInput = getNextInput(container, 'Phone Number') as HTMLInputElement;
    fireEvent.change(phoneInput, { target: { value: '123456789' } });
    expect(mockOnChange).toHaveBeenCalledWith({ hotelPhone: '123456789' });

    const emailInput = getNextInput(container, 'Email') as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: 'test@hotel.com' } });
    expect(mockOnChange).toHaveBeenCalledWith({ hotelEmail: 'test@hotel.com' });
  });

  it('handles logo upload correctly', async () => {
    const { container } = render(<HotelInvoiceForm data={baseData} onChange={mockOnChange} />);
    
    // Upload logo
    const file = new File(['dummy content'], 'logo.png', { type: 'image/png' });
    
    // We can find the file input by type
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();
    
    // Mock FileReader
    const mockFileReader = {
      readAsDataURL: vi.fn(),
      result: 'data:image/png;base64,dummy',
      onloadend: null as any
    };
    window.FileReader = vi.fn(() => mockFileReader) as any;

    fireEvent.change(fileInput, { target: { files: [file] } });
    
    expect(mockFileReader.readAsDataURL).toHaveBeenCalledWith(file);
    
    // Trigger onloadend
    if (mockFileReader.onloadend) {
      mockFileReader.onloadend();
    }
    
    expect(mockOnChange).toHaveBeenCalledWith({ hotelLogo: 'data:image/png;base64,dummy', showLogo: true });

    // Test Show Logo checkbox (needs hotelLogo to be present to show up)
    const { container: reContainer } = render(<HotelInvoiceForm data={{ ...baseData, hotelLogo: 'data:image/png;base64,dummy', showLogo: true }} onChange={mockOnChange} />);
    const showLogoCheckbox = Array.from(reContainer.querySelectorAll('label')).find(l => l.textContent?.includes('Show Logo'))?.querySelector('input') as HTMLInputElement;
    fireEvent.click(showLogoCheckbox);
    expect(mockOnChange).toHaveBeenCalledWith({ showLogo: false });
  });

  it('updates guest information', () => {
    const { container } = render(<HotelInvoiceForm data={baseData} onChange={mockOnChange} />);
    
    const guestNameInput = getNextInput(container, 'Guest Name') as HTMLInputElement;
    fireEvent.change(guestNameInput, { target: { value: 'John Smith' } });
    expect(mockOnChange).toHaveBeenCalledWith({ primaryGuest: { ...baseData.primaryGuest, name: 'John Smith' } });

    const loyaltyInput = getNextInput(container, 'Loyalty / Member No.') as HTMLInputElement;
    fireEvent.change(loyaltyInput, { target: { value: 'LOY123' } });
    expect(mockOnChange).toHaveBeenCalledWith({ primaryGuest: { ...baseData.primaryGuest, loyaltyNumber: 'LOY123' } });

    const contactPhone = getNextInput(container, 'Contact Phone') as HTMLInputElement;
    fireEvent.change(contactPhone, { target: { value: '987654321' } });
    expect(mockOnChange).toHaveBeenCalledWith({ guestPhone: '987654321' });

    const contactEmail = getNextInput(container, 'Contact Email') as HTMLInputElement;
    fireEvent.change(contactEmail, { target: { value: 'john@example.com' } });
    expect(mockOnChange).toHaveBeenCalledWith({ guestEmail: 'john@example.com' });

    const companyName = getNextInput(container, 'Company Name (Bill To)') as HTMLInputElement;
    fireEvent.change(companyName, { target: { value: 'Corp Inc' } });
    expect(mockOnChange).toHaveBeenCalledWith({ companyName: 'Corp Inc' });
  });

  it('updates stay details', () => {
    const { container } = render(<HotelInvoiceForm data={baseData} onChange={mockOnChange} />);

    const checkIn = getNextInput(container, 'Check-In Date') as HTMLInputElement;
    fireEvent.change(checkIn, { target: { value: '2026-08-01' } });
    expect(mockOnChange).toHaveBeenCalledWith({ checkInDate: '2026-08-01' });

    const checkOut = getNextInput(container, 'Check-Out Date') as HTMLInputElement;
    fireEvent.change(checkOut, { target: { value: '2026-08-05' } });
    expect(mockOnChange).toHaveBeenCalledWith({ checkOutDate: '2026-08-05' });

    const folio = getNextInput(container, 'Folio / Reg No.') as HTMLInputElement;
    fireEvent.change(folio, { target: { value: 'FOL456' } });
    expect(mockOnChange).toHaveBeenCalledWith({ folioNumber: 'FOL456' });

    const roomNum = getNextInput(container, 'Room Number') as HTMLInputElement;
    fireEvent.change(roomNum, { target: { value: '101' } });
    expect(mockOnChange).toHaveBeenCalledWith({ roomNumber: '101' });

    const roomType = getNextInput(container, 'Room Type') as HTMLInputElement;
    fireEvent.change(roomType, { target: { value: 'Suite' } });
    expect(mockOnChange).toHaveBeenCalledWith({ roomType: 'Suite' });
  });

  it('handles line items (add, update, delete)', () => {
    const { rerender, container } = render(<HotelInvoiceForm data={baseData} onChange={mockOnChange} />);
    
    // Add charge
    const addChargeBtn = screen.getByText(/Add Charge/i);
    fireEvent.click(addChargeBtn);
    expect(mockOnChange).toHaveBeenCalledTimes(1);
    const addedLineItems = mockOnChange.mock.calls[0][0].lineItems;
    expect(addedLineItems.length).toBe(1);
    
    // Add a second charge manually for branch coverage
    const twoLineItems = [...addedLineItems, { ...addedLineItems[0], id: '2' }];
    
    // Now rerender with these line items
    const withLineItemData = { ...baseData, lineItems: twoLineItems };
    rerender(<HotelInvoiceForm data={withLineItemData} onChange={mockOnChange} />);

    // Update Date
    const dateInputs = container.querySelectorAll('input[type="date"]');
    const lineItemDateInput = dateInputs[2]; // Check-In, Check-Out, LineItem 1 Date
    fireEvent.change(lineItemDateInput, { target: { value: '2026-08-02' } });
    expect(mockOnChange).toHaveBeenCalledWith({
      lineItems: expect.arrayContaining([expect.objectContaining({ date: '2026-08-02' })])
    });
    
    // Update category
    const categorySelects = container.querySelectorAll('select.items-table-input');
    fireEvent.change(categorySelects[0], { target: { value: 'Food & Beverage' } });
    expect(mockOnChange).toHaveBeenCalledWith({
      lineItems: expect.arrayContaining([expect.objectContaining({ category: 'Food & Beverage' })])
    });

    // Update description
    const descInput = screen.getAllByPlaceholderText(/Detail\.\.\./i)[0];
    fireEvent.change(descInput, { target: { value: 'Dinner' } });
    expect(mockOnChange).toHaveBeenCalledWith({
      lineItems: expect.arrayContaining([expect.objectContaining({ description: 'Dinner' })])
    });

    // Update quantity
    const quantityInputs = Array.from(container.querySelectorAll('input[type="number"]')).filter(el => el.getAttribute('min') === '1');
    fireEvent.change(quantityInputs[0], { target: { value: '2' } });
    expect(mockOnChange).toHaveBeenCalledWith({
      lineItems: expect.arrayContaining([expect.objectContaining({ quantity: 2, amount: 0 })])
    });

    // Update rate
    const rateInputs = Array.from(container.querySelectorAll('input[type="number"]')).filter(el => el.getAttribute('min') === '0');
    fireEvent.change(rateInputs[0], { target: { value: '50' } });
    // quantity in withLineItemData is 1, rate becomes 50, amount becomes 50
    expect(mockOnChange).toHaveBeenCalledWith({
      lineItems: expect.arrayContaining([expect.objectContaining({ rate: 50, amount: 50 })])
    });

    // Fire event with empty quantity and rate to hit the || 0 branches
    fireEvent.change(quantityInputs[0], { target: { value: '' } });
    fireEvent.change(rateInputs[0], { target: { value: '' } });
    expect(mockOnChange).toHaveBeenCalledWith({
      lineItems: expect.arrayContaining([expect.objectContaining({ quantity: 0, amount: 0, rate: 0 })])
    });
    
    // Remove charge
    const removeBtn = container.querySelectorAll('.text-danger')[0].closest('button');
    if (removeBtn) fireEvent.click(removeBtn);
    expect(mockOnChange).toHaveBeenCalledWith({ lineItems: [expect.any(Object)] });
  });

  it('handles payments (add, update, delete)', () => {
    const { rerender, container } = render(<HotelInvoiceForm data={baseData} onChange={mockOnChange} />);
    
    // Add payment
    const addPaymentBtn = screen.getByText(/Add Payment/i);
    fireEvent.click(addPaymentBtn);
    expect(mockOnChange).toHaveBeenCalledTimes(1);
    const addedPayments = mockOnChange.mock.calls[0][0].payments;
    expect(addedPayments.length).toBe(1);
    
    // Add a second payment manually for branch coverage
    const twoPayments = [...addedPayments, { ...addedPayments[0], id: 'p2' }];
    
    // Now rerender with this payment
    const withPaymentData = { ...baseData, payments: twoPayments };
    rerender(<HotelInvoiceForm data={withPaymentData} onChange={mockOnChange} />);

    // Update date
    const dateInputs = container.querySelectorAll('input[type="date"]');
    const paymentDateInput = dateInputs[2]; // Check-in, check-out, payment 1
    fireEvent.change(paymentDateInput, { target: { value: '2026-08-03' } });
    expect(mockOnChange).toHaveBeenCalledWith({
      payments: expect.arrayContaining([expect.objectContaining({ date: '2026-08-03' })])
    });
    
    // Update method
    const methodSelect = container.querySelectorAll('select.items-table-input')[0];
    fireEvent.change(methodSelect, { target: { value: 'Cash' } });
    expect(mockOnChange).toHaveBeenCalledWith({
      payments: expect.arrayContaining([expect.objectContaining({ method: 'Cash' })])
    });

    // Update reference
    const refInput = screen.getAllByPlaceholderText(/Auth code\/Ref\.\.\./i)[0];
    fireEvent.change(refInput, { target: { value: 'REF123' } });
    expect(mockOnChange).toHaveBeenCalledWith({
      payments: expect.arrayContaining([expect.objectContaining({ reference: 'REF123' })])
    });

    // Update amount
    const amountInputs = Array.from(container.querySelectorAll('input[type="number"]')).filter(el => el.getAttribute('min') === '0');
    fireEvent.change(amountInputs[0], { target: { value: '100' } });
    expect(mockOnChange).toHaveBeenCalledWith({
      payments: expect.arrayContaining([expect.objectContaining({ amount: 100 })])
    });
    
    // Remove payment
    const removeBtn = container.querySelectorAll('.text-danger')[0].closest('button');
    if (removeBtn) fireEvent.click(removeBtn);
    expect(mockOnChange).toHaveBeenCalledWith({ payments: [expect.any(Object)] });
  });

  it('updates document settings', () => {
    const { rerender, container } = render(<HotelInvoiceForm data={baseData} onChange={mockOnChange} />);
    
    const dateInputs = container.querySelectorAll('input[type="date"]');
    const invoiceDate = dateInputs[2];
    const dueDate = dateInputs[3];
    
    fireEvent.change(invoiceDate, { target: { value: '2026-08-10' } });
    expect(mockOnChange).toHaveBeenCalledWith({ invoiceDate: '2026-08-10' });

    fireEvent.change(dueDate, { target: { value: '2026-08-20' } });
    expect(mockOnChange).toHaveBeenCalledWith({ dueDate: '2026-08-20' });

    // Currency and Status 
    const selects = container.querySelectorAll('select');
    // selects[0] could be currency, status. Let's find by options
    const currencySelect = Array.from(selects).find(s => Array.from(s.options).some(o => o.value === 'USD')) as HTMLSelectElement;
    fireEvent.change(currencySelect, { target: { value: 'EUR' } });
    expect(mockOnChange).toHaveBeenCalledWith({ currency: 'EUR' });
    
    const statusSelect = Array.from(selects).find(s => Array.from(s.options).some(o => o.value === 'Draft')) as HTMLSelectElement;
    fireEvent.change(statusSelect, { target: { value: 'Sent' } });
    expect(mockOnChange).toHaveBeenCalledWith({ status: 'Sent' });

    // Invoice number input
    const manualCheckbox = Array.from(container.querySelectorAll('label')).find(l => l.textContent?.includes('Manual'))?.querySelector('input') as HTMLInputElement;
    fireEvent.click(manualCheckbox);
    expect(mockOnChange).toHaveBeenCalledWith({ manualInvoiceNumber: true });

    const invoiceNumInput = screen.getByPlaceholderText(/Auto-generated if empty/i);
    fireEvent.change(invoiceNumInput, { target: { value: 'INV-111' } });
    expect(mockOnChange).toHaveBeenCalledWith({ invoiceNumber: 'INV-111', manualInvoiceNumber: true });
    
    // Notes
    const notesInput = screen.getByPlaceholderText(/Thank you for staying with us\.\.\./i);
    fireEvent.change(notesInput, { target: { value: 'Have a nice day' } });
    expect(mockOnChange).toHaveBeenCalledWith({ notes: 'Have a nice day' });

    // Signature Block
    const sigCheckbox = Array.from(container.querySelectorAll('label')).find(l => l.textContent?.includes('Include Signature Block'))?.querySelector('input') as HTMLInputElement;
    fireEvent.click(sigCheckbox);
    expect(mockOnChange).toHaveBeenCalledWith({ showSignature: true });

    rerender(<HotelInvoiceForm data={{ ...baseData, showSignature: true }} onChange={mockOnChange} />);
    const sigNameInput = screen.getByPlaceholderText(/Front Desk \/ Manager/i);
    fireEvent.change(sigNameInput, { target: { value: 'John Manager' } });
    expect(mockOnChange).toHaveBeenCalledWith({ signatureName: 'John Manager' });
    
    // Watermark
    const watermarkCheckbox = Array.from(container.querySelectorAll('label')).find(l => l.textContent?.includes('Apply Watermark'))?.querySelector('input') as HTMLInputElement;
    fireEvent.click(watermarkCheckbox);
    expect(mockOnChange).toHaveBeenCalledWith({ watermarkText: 'DRAFT' }); 
    
    rerender(<HotelInvoiceForm data={{ ...baseData, watermarkText: 'DRAFT' }} onChange={mockOnChange} />);
    const watermarkInput = screen.getByPlaceholderText(/e\.g\. DRAFT/i);
    fireEvent.change(watermarkInput, { target: { value: 'FINAL' } });
    expect(mockOnChange).toHaveBeenCalledWith({ watermarkText: 'FINAL' });
  });

  it('updates taxes & adjustments and calculates correctly', () => {
    const dataWithTotals: HotelInvoiceData = {
      ...baseData,
      lineItems: [
        { id: '1', category: 'Room', description: 'Room', quantity: 1, rate: 100, amount: 100, date: '' },
        { id: '2', category: 'Food & Beverage', description: 'Meal', quantity: 1, rate: 50, amount: 50, date: '' }
      ],
      payments: [
        { id: 'p1', method: 'Cash', reference: '', amount: 40, date: '' }
      ],
      serviceChargeType: 'percentage',
      serviceChargeRate: 10,
      taxType: 'percentage',
      taxRate: 5, 
      discountType: 'flat',
      discountValue: 10,
    };
    
    const { container } = render(<HotelInvoiceForm data={dataWithTotals} onChange={mockOnChange} />);

    // Tax type updates - Find by looking for options 'percentage' and 'flat'
    const selects = Array.from(container.querySelectorAll('select')).filter(s => s.options.length === 2 && s.options[0].value === 'percentage');
    
    fireEvent.change(selects[0], { target: { value: 'flat' } });
    expect(mockOnChange).toHaveBeenCalledWith({ serviceChargeType: 'flat' });

    // Inputs for rate/amount
    const allNumberInputs = Array.from(container.querySelectorAll('input[type="number"]'));
    // The rate/amount inputs are those without a min attribute (or specifically those inside Taxes & Adjustments)
    // We have serviceChargeRate, taxRate, discountValue in order
    const adjustmentInputs = allNumberInputs.filter(el => !el.closest('.items-table-wrap'));
    
    fireEvent.change(adjustmentInputs[0], { target: { value: '20' } });
    expect(mockOnChange).toHaveBeenCalledWith({ serviceChargeRate: 20 });
    
    fireEvent.change(adjustmentInputs[1], { target: { value: '15' } });
    expect(mockOnChange).toHaveBeenCalledWith({ taxRate: 15 });
    
    fireEvent.change(adjustmentInputs[2], { target: { value: '20' } });
    expect(mockOnChange).toHaveBeenCalledWith({ discountValue: 20 });

    // Check rendering of summary
    expect(screen.getAllByText('Room').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Food & Beverage').length).toBeGreaterThan(0);
    expect(screen.getByText('150.00 USD')).toBeInTheDocument(); // subtotal
    expect(screen.getByText('15.00 USD')).toBeInTheDocument(); // service charge
    expect(screen.getByText('8.25 USD')).toBeInTheDocument(); // tax amount
    expect(screen.getByText('-10.00 USD')).toBeInTheDocument(); // discount amount
    expect(screen.getByText('163.25 USD')).toBeInTheDocument(); // grand total
    expect(screen.getByText('40.00 USD')).toBeInTheDocument(); // total paid
    expect(screen.getByText('123.25 USD')).toBeInTheDocument(); // balance
  });

  it('calculates flat percentage adjustments correctly', () => {
    // Fill data to trigger calculation rendering branches
    const dataWithFlatPercentage: HotelInvoiceData = {
      ...baseData,
      lineItems: [
        { id: '1', category: 'Room', description: 'Room', quantity: 1, rate: 100, amount: 100, date: '' },
      ],
      payments: [
        { id: 'p1', method: 'Cash', reference: '', amount: 150, date: '' } // Overpaid
      ],
      serviceChargeType: 'flat',
      serviceChargeRate: 20, 
      taxType: 'flat',
      taxRate: 30, 
      discountType: 'percentage',
      discountValue: 10,
    };
    
    render(<HotelInvoiceForm data={dataWithFlatPercentage} onChange={mockOnChange} />);
    
    expect(screen.getByText('100.00 USD')).toBeInTheDocument(); // subtotal
    expect(screen.getByText('20.00 USD')).toBeInTheDocument(); // service charge flat
    expect(screen.getByText('30.00 USD')).toBeInTheDocument(); // tax flat
    expect(screen.getByText('-15.00 USD')).toBeInTheDocument(); // discount % of 150 -> 15
    expect(screen.getByText('135.00 USD')).toBeInTheDocument(); // grand total
    expect(screen.getByText('150.00 USD')).toBeInTheDocument(); // total paid
    
    // Balance should be Math.max(0, balance) -> 0.00
    expect(screen.getByText('0.00 USD')).toBeInTheDocument();
  });

  it('unchecks Apply Watermark correctly', () => {
    const { container } = render(<HotelInvoiceForm data={{ ...baseData, watermarkText: 'DRAFT' }} onChange={mockOnChange} />);
    const watermarkCheckbox = Array.from(container.querySelectorAll('label')).find(l => l.textContent?.includes('Apply Watermark'))?.querySelector('input') as HTMLInputElement;
    fireEvent.click(watermarkCheckbox);
    expect(mockOnChange).toHaveBeenCalledWith({ watermarkText: '' });
  });

  it('changes serviceChargeLabel, taxLabel, discountLabel', () => {
    const { container } = render(<HotelInvoiceForm data={baseData} onChange={mockOnChange} />);
    
    const labels = Array.from(screen.getAllByText('Label'));
    // The next sibling of the label span is the div.input-group, inside which there is the input
    
    const getNextInput = (labelSpan: Element) => {
      const containerDiv = labelSpan.nextElementSibling;
      return containerDiv?.querySelector('input') as HTMLInputElement;
    };

    const serviceLabelInput = getNextInput(labels[0]);
    fireEvent.change(serviceLabelInput, { target: { value: 'SC' } });
    expect(mockOnChange).toHaveBeenCalledWith({ serviceChargeLabel: 'SC' });
    
    const taxLabelInput = getNextInput(labels[1]);
    fireEvent.change(taxLabelInput, { target: { value: 'VAT' } });
    expect(mockOnChange).toHaveBeenCalledWith({ taxLabel: 'VAT' });
    
    const discountLabelInput = getNextInput(labels[2]);
    fireEvent.change(discountLabelInput, { target: { value: 'Promo' } });
    expect(mockOnChange).toHaveBeenCalledWith({ discountLabel: 'Promo' });
  });

});
