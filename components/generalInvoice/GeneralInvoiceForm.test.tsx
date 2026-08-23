import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { expect, test, describe } from 'vitest';
import { GeneralInvoiceForm } from './GeneralInvoiceForm';
import { INITIAL_GENERAL_INVOICE, GeneralInvoiceData } from '../../types/generalInvoice';

const Wrapper = ({ initial = {} }: { initial?: Partial<GeneralInvoiceData> }) => {
  const [data, setData] = useState<GeneralInvoiceData>({ ...INITIAL_GENERAL_INVOICE, ...initial });
  return <GeneralInvoiceForm data={data} setData={setData} />;
};

describe('GeneralInvoiceForm', () => {
  test('renders and updates company fields', () => {
    render(<Wrapper />);
    
    const companyName = screen.getByPlaceholderText('e.g. Acme Corp');
    fireEvent.change(companyName, { target: { value: 'Test Company' } });
    expect(companyName).toHaveValue('Test Company');

    const taxId = screen.getByPlaceholderText('e.g. TRN1234567');
    fireEvent.change(taxId, { target: { value: 'TX123' } });
    expect(taxId).toHaveValue('TX123');

    const address = screen.getByPlaceholderText('Company full address...');
    fireEvent.change(address, { target: { value: '123 Main St' } });
    expect(address).toHaveValue('123 Main St');

    const email = screen.getByPlaceholderText('billing@acme.com');
    fireEvent.change(email, { target: { value: 'test@test.com' } });
    expect(email).toHaveValue('test@test.com');

    const phone = screen.getByPlaceholderText('+1 234 567 890');
    fireEvent.change(phone, { target: { value: '1234567890' } });
    expect(phone).toHaveValue('1234567890');

    const bank = screen.getByPlaceholderText('Bank Name, IBAN, SWIFT...');
    fireEvent.change(bank, { target: { value: 'Bank of Test' } });
    expect(bank).toHaveValue('Bank of Test');
  });

  test('renders and updates customer fields', () => {
    render(<Wrapper />);
    
    const custName = screen.getByPlaceholderText('John Doe or Company Ltd');
    fireEvent.change(custName, { target: { value: 'Test Customer' } });
    expect(custName).toHaveValue('Test Customer');

    const taxId = screen.getByPlaceholderText('Customer Tax ID');
    fireEvent.change(taxId, { target: { value: 'CUST123' } });
    expect(taxId).toHaveValue('CUST123');

    const address = screen.getByPlaceholderText('Customer full address...');
    fireEvent.change(address, { target: { value: '456 Cust St' } });
    expect(address).toHaveValue('456 Cust St');

    const email = screen.getByPlaceholderText('customer@email.com');
    fireEvent.change(email, { target: { value: 'cust@test.com' } });
    expect(email).toHaveValue('cust@test.com');

    const phone = screen.getByPlaceholderText('+1 987 654 321');
    fireEvent.change(phone, { target: { value: '0987654321' } });
    expect(phone).toHaveValue('0987654321');
  });

  test('adds, updates, and removes an item', () => {
    render(<Wrapper />);
    
    const addItemBtn = screen.getByText('Add Item');
    fireEvent.click(addItemBtn);
    
    const descInput = screen.getByPlaceholderText('Product or service description...');
    fireEvent.change(descInput, { target: { value: 'Item 1' } });
    
    const qtyInputs = screen.getAllByRole('spinbutton').filter(el => el.getAttribute('min') === '1');
    // The first one might be quantity
    const qtyInput = qtyInputs[0];
    fireEvent.change(qtyInput, { target: { value: '2' } });

    // unit price min is 0
    const numberInputs = screen.getAllByRole('spinbutton');
    const unitPriceInput = numberInputs[1];
    fireEvent.change(unitPriceInput, { target: { value: '100' } });

    const discountInput = numberInputs[2];
    fireEvent.change(discountInput, { target: { value: '10' } });

    // Total should be 2 * 100 - 10 = 190
    expect(screen.getAllByText(/190\.00 USD/)[0]).toBeInTheDocument();

    const deleteBtns = screen.getAllByRole('button').filter(b => b.className.includes('btn-icon-danger'));
    fireEvent.click(deleteBtns[0]); // delete item
    expect(screen.queryByPlaceholderText('Product or service description...')).not.toBeInTheDocument();
  });

  test('adds, updates, and removes a payment', () => {
    render(<Wrapper />);
    
    const addPaymentBtn = screen.getByText('Add Payment');
    fireEvent.click(addPaymentBtn);

    const methods = screen.getAllByRole('combobox'); // Currency, status...
    // The payment method select should be there
    const methodSelect = methods[0]; 
    fireEvent.change(methodSelect, { target: { value: 'Cash' } });
    const paymentCard = screen.getByText('Payment 1').closest('.item-card');
    const paymentDate = paymentCard?.querySelector('input[type="date"], input.input-field') as HTMLElement;
    if(paymentDate) {
      fireEvent.change(paymentDate, { target: { value: '2025-01-01' } });
    }

    const ref = screen.getByPlaceholderText('Transaction ID, Cheque #...');
    fireEvent.change(ref, { target: { value: 'REF123' } });

    // Amount
    const amountInputs = screen.getAllByRole('spinbutton');
    fireEvent.change(amountInputs[amountInputs.length - 1], { target: { value: '50' } });

    const deleteBtns = screen.getAllByRole('button').filter(b => b.className.includes('btn-icon-danger'));
    fireEvent.click(deleteBtns[0]); // delete payment
    expect(screen.queryByPlaceholderText('Transaction ID, Cheque #...')).not.toBeInTheDocument();
  });

  test('adds, updates, and removes a credit note', () => {
    render(<Wrapper />);
    
    const addCreditNoteBtn = screen.getByText('Add Credit Note');
    fireEvent.click(addCreditNoteBtn);

    const reason = screen.getByPlaceholderText('e.g. Return, Overcharge...');
    fireEvent.change(reason, { target: { value: 'Refund' } });

    const amountInputs = screen.getAllByRole('spinbutton');
    fireEvent.change(amountInputs[amountInputs.length - 1], { target: { value: '20' } });
    const creditNoteCard = screen.getByText('Credit Note 1').closest('.item-card');
    const creditNoteDate = creditNoteCard?.querySelector('input[type="date"], input.input-field') as HTMLElement;
    if(creditNoteDate) {
      fireEvent.change(creditNoteDate, { target: { value: '2025-01-01' } });
    }

    const deleteBtns = screen.getAllByRole('button').filter(b => b.className.includes('btn-icon-danger'));
    fireEvent.click(deleteBtns[0]); // delete
    expect(screen.queryByPlaceholderText('e.g. Return, Overcharge...')).not.toBeInTheDocument();
  });

  test('recurring settings update', () => {
    render(<Wrapper />);
    
    const recurringCheck = screen.getByLabelText('Enable Recurring Invoice');
    fireEvent.click(recurringCheck);
    
    const selects = screen.getAllByRole('combobox');
    const freqSelect = selects[selects.length - 1]; // last one should be frequency if it expanded
    fireEvent.change(freqSelect, { target: { value: 'monthly' } });

    const dates = screen.getAllByRole('textbox').filter(el => el.getAttribute('type') === 'date' || el.className.includes('input-field'));
    fireEvent.change(dates[dates.length - 1], { target: { value: '2025-10-10' } });
  });

  test('invoice settings update', () => {
    render(<Wrapper />);

    const manualInv = screen.getByLabelText('Manual Invoice Number');
    fireEvent.click(manualInv);
    const invInput = screen.getByPlaceholderText('e.g. INV-2023-001');
    fireEvent.change(invInput, { target: { value: 'INV-007' } });

    const sigCheck = screen.getByLabelText('Show Signature Section');
    fireEvent.click(sigCheck);
    const sigInput = screen.getByPlaceholderText('Signatory Name');
    fireEvent.change(sigInput, { target: { value: 'John Doe' } });

    const watermarkCheck = screen.getByLabelText('Apply Watermark');
    fireEvent.click(watermarkCheck);
    const watermarkInput = screen.getByPlaceholderText('e.g. DRAFT or CANCELLED');
    fireEvent.change(watermarkInput, { target: { value: 'CONFIDENTIAL' } });
    
    // uncheck watermark
    fireEvent.click(watermarkCheck);

    const notes = screen.getByPlaceholderText('Additional notes...');
    fireEvent.change(notes, { target: { value: 'Note 1' } });

    const terms = screen.getByPlaceholderText('Terms and conditions...');
    fireEvent.change(terms, { target: { value: 'Term 1' } });

    // Dates and status
    const allInputs = screen.getAllByRole('textbox').concat(screen.getAllByRole('combobox')) as HTMLElement[];
    const dateInputs = allInputs.filter(el => el.getAttribute('type') === 'date' || el.className.includes('input-field'));
    if (dateInputs.length > 1) {
      fireEvent.change(dateInputs[0], { target: { value: '2023-01-01' } }); // invoiceDate
      fireEvent.change(dateInputs[1], { target: { value: '2023-01-15' } }); // dueDate
    }

    const selects = screen.getAllByRole('combobox');
    const statusSelect = selects.find(s => s.innerHTML.includes('Sent'));
    if (statusSelect) {
      fireEvent.change(statusSelect, { target: { value: 'Sent' } });
    }

    const currencySelect = selects.find(s => s.innerHTML.includes('EUR'));
    if (currencySelect) {
      fireEvent.change(currencySelect, { target: { value: 'EUR' } });
    }
  });

  test('financial settings update', () => {
    render(<Wrapper />);
    
    // shipping charges
    const shipping = screen.getByText('Shipping / Handling').parentElement?.querySelector('input');
    if (shipping) fireEvent.change(shipping, { target: { value: '25' } });

    // use per item tax
    const usePerItem = screen.getByLabelText('Use Per-Item Tax (Instead of Global)');
    fireEvent.click(usePerItem); // turns it on
    fireEvent.click(usePerItem); // turns it off

    // global tax type
    const selects = screen.getAllByRole('combobox');
    const taxTypeSelect = selects.find(s => s.innerHTML.includes('percentage'));
    if (taxTypeSelect) fireEvent.change(taxTypeSelect, { target: { value: 'flat' } });

    // tax rate/amount
    const taxRate = screen.getByText('Tax Rate/Amount').parentElement?.querySelector('input');
    if (taxRate) fireEvent.change(taxRate, { target: { value: '15' } });

    // tax label
    const taxLabel = screen.getByText('Tax Label (e.g. VAT, GST)').parentElement?.querySelector('input');
    if (taxLabel) fireEvent.change(taxLabel, { target: { value: 'VAT' } });

    // discount type
    // Since there are two selects that have options percentage/flat, the second one is discount type
    const percentageSelects = selects.filter(s => s.innerHTML.includes('percentage'));
    if (percentageSelects.length > 1) {
      fireEvent.change(percentageSelects[1], { target: { value: 'percentage' } });
    }

    // discount value
    const discountVal = screen.getByText('Discount Value').parentElement?.querySelector('input');
    if (discountVal) fireEvent.change(discountVal, { target: { value: '12' } });
  });

  test('calculations with global flat tax and flat discount', () => {
    render(<Wrapper initial={{
      items: [{ id: '1', description: 'Test', quantity: 2, unitPrice: 100, taxRate: 0, discount: 0, total: 200 }],
      globalTaxType: 'flat',
      globalTaxRate: 10,
      discountType: 'flat',
      discountValue: 20,
      shippingCharges: 15,
      usePerItemTax: false
    }} />);
    
    // Subtotal: 200
    // Discount: -20
    // Tax: 10
    // Shipping: 15
    // Total = 200 - 20 + 10 + 15 = 205
    expect(screen.getAllByText(/205\.00 USD/)[0]).toBeInTheDocument();
  });

  test('calculations with global percentage tax and percentage discount', () => {
    render(<Wrapper initial={{
      items: [{ id: '1', description: 'Test', quantity: 1, unitPrice: 100, taxRate: 0, discount: 0, total: 100 }],
      globalTaxType: 'percentage',
      globalTaxRate: 10, // 10% of (100 - 10) = 9
      discountType: 'percentage',
      discountValue: 10, // 10% of 100 = 10
      shippingCharges: 0,
      usePerItemTax: false
    }} />);
    
    // Subtotal: 100
    // Discount: -10
    // Taxable: 90, Tax = 9
    // Grand Total = 99
    expect(screen.getAllByText(/99\.00 USD/)[0]).toBeInTheDocument();
  });

  test('calculations with per-item tax', () => {
    render(<Wrapper initial={{
      items: [
        { id: '1', description: 'Test', quantity: 1, unitPrice: 100, taxRate: 10, discount: 0, total: 110 }
      ],
      usePerItemTax: true,
      shippingCharges: 0
    }} />);
    
    expect(screen.getAllByText(/110\.00 USD/)[0]).toBeInTheDocument();

    // find tax rate input
    // The structure: item desc, item qty, item unit price, item tax, item discount
    // We can just add another item in test to trigger updateItem logic
    const addItemBtn = screen.getByText('Add Item');
    fireEvent.click(addItemBtn);

    const descInputs = screen.getAllByPlaceholderText('Product or service description...');
    fireEvent.change(descInputs[1], { target: { value: 'Item 2' } });

    const numberInputs = screen.getAllByRole('spinbutton');
    // first item: qty, price, tax, discount (4)
    // second item: qty(4), price(5), tax(6), discount(7)
    fireEvent.change(numberInputs[4], { target: { value: '1' } });
    fireEvent.change(numberInputs[5], { target: { value: '50' } });
    fireEvent.change(numberInputs[6], { target: { value: '20' } }); // tax 20%
    
    // Item 2 total: 50 + 10 = 60
    // Grand total: 110 + 60 = 170
    expect(screen.getAllByText(/170\.00 USD/)[0]).toBeInTheDocument();
  });

  test('balance due with payments and credit notes', () => {
    render(<Wrapper initial={{
      items: [{ id: '1', description: 'Test', quantity: 1, unitPrice: 100, taxRate: 0, discount: 0, total: 100 }],
      payments: [{ id: 'p1', method: 'Cash', amount: 30, date: '', reference: '' }],
      creditNotes: [{ id: 'c1', amount: 20, reason: '', date: '' }]
    }} />);
    
    // Subtotal: 100
    // Grand Total: 100 - 20 (credit) = 80
    // Balance Due: 80 - 30 (payment) = 50
    expect(screen.getByText('80.00 USD')).toBeInTheDocument(); // grand total
    expect(screen.getByText('50.00 USD')).toBeInTheDocument(); // balance
  });
});
