import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import LPOForm from './LPOForm';
import { ToastProvider } from './shared/ToastContext';
import { LPOData, INITIAL_LPO_DATA } from '../types';

const mockData: LPOData = { ...INITIAL_LPO_DATA };

const renderForm = (data: LPOData, onChange = vi.fn()) =>
  render(
    <ToastProvider>
      <LPOForm data={data} onChange={onChange} />
    </ToastProvider>
  );

const WrappedForm: React.FC<React.ComponentProps<typeof LPOForm>> = (props) => (
  <ToastProvider>
    <LPOForm {...props} />
  </ToastProvider>
);

test('LPOForm renders and interacts comprehensively', async () => {
  const onChange = vi.fn();
  const user = userEvent.setup();

  const { rerender } = renderForm(mockData, onChange);

  // Basic Field updates
  const hotelNameInput = screen.getByPlaceholderText('e.g. Atlantis');
  await user.clear(hotelNameInput);
  await user.type(hotelNameInput, 'New Hotel');
  expect(onChange).toHaveBeenCalled();

  const hotelAddressInput = screen.getByPlaceholderText('e.g. The Palm Jumeirah, Dubai, UAE');
  await user.type(hotelAddressInput, 'Address');

  const roomTypeInput = screen.getByPlaceholderText('e.g. Atlantis Suite');
  await user.type(roomTypeInput, 'Suite');

  const companyInput = screen.getByPlaceholderText('e.g. Corporate Inc.');
  await user.type(companyInput, 'Test Co');

  // Guest Operations
  const addGuestBtn = screen.getByText(/ADD ANOTHER GUEST/i);
  await user.click(addGuestBtn);

  // Update data to reflect 2 guests
  rerender(<WrappedForm data={{...mockData, guests: [{name: 'G1', loyaltyNumber: ''}, {name: 'G2', loyaltyNumber: ''}]}} onChange={onChange} />);
  const deleteGuestBtns = screen.getAllByRole('button').filter(b => b.className === 'btn-icon-delete');
  if (deleteGuestBtns.length > 0) {
    await user.click(deleteGuestBtns[0]);
  }

  // Update Guest Fields
  const guestInputs = screen.getAllByPlaceholderText(/Guest .* Full Name/);
  await user.type(guestInputs[0], 'Updated Guest');

  const loyaltyInputs = screen.getAllByPlaceholderText('Loyalty Number (Optional)');
  await user.type(loyaltyInputs[0], '999');

  // Occupancy changes
  const occupancyPanel = document.querySelector('.occupancy-panel') as HTMLElement;
  const occupancyInputs = occupancyPanel.querySelectorAll('input[type="number"]');
  const adultInput = occupancyInputs[0] as HTMLInputElement;
  const childInput = occupancyInputs[1] as HTMLInputElement;
  const infantInput = occupancyInputs[2] as HTMLInputElement;

  await user.clear(adultInput);
  await user.type(adultInput, '3');
  fireEvent.change(adultInput, { target: { value: '-1' } });
  fireEvent.change(adultInput, { target: { value: 'abc' } });
  
  await user.clear(infantInput);
  await user.type(infantInput, '1');
  fireEvent.change(infantInput, { target: { value: '-1' } });
  fireEvent.change(infantInput, { target: { value: 'abc' } });

  await user.clear(childInput);
  await user.type(childInput, '2');
  fireEvent.change(childInput, { target: { value: '-1' } });
  fireEvent.change(childInput, { target: { value: 'abc' } });

  // Render with children to test child ages
  rerender(<WrappedForm data={{...mockData, childCount: 2, childAges: [5, 6]}} onChange={onChange} />);
  
  const childAgePanel = document.querySelector('.child-ages-panel') as HTMLElement;
  if (childAgePanel) {
    const ageInputs = childAgePanel.querySelectorAll('input[type="number"]');
    fireEvent.change(ageInputs[0], { target: { value: '7' } });
  }

  // Decrease child count
  const updatedChildInput = document.querySelector('.occupancy-panel')!.querySelectorAll('input')[1] as HTMLInputElement;
  fireEvent.change(updatedChildInput, { target: { value: '1' } });
  
  // Phone & Email
  const phoneInput = screen.getByPlaceholderText('+971 50 000 0000');
  await user.type(phoneInput, '123');

  const emailInput = screen.getByPlaceholderText('guest@example.com');
  await user.type(emailInput, 'a@a.com');

  // Rate Codes & Currency
  const rateCodeInput = screen.getByPlaceholderText('e.g. SUMMER SALE');
  await user.type(rateCodeInput, 'CODE');

  // Meal Plan Select
  const selects = screen.getAllByRole('combobox');
  fireEvent.change(selects[0], { target: { value: 'Full Board' } }); // Meal Plan
  fireEvent.change(selects[1], { target: { value: 'USD' } }); // Currency

  // Rate Configuration (Add Rate)
  const rateInput = screen.getByPlaceholderText(`Rate (${mockData.currency})`);
  await user.type(rateInput, '200');
  const addRateBtn = screen.getByText('Add Rate');
  await user.click(addRateBtn);
  
  await user.clear(rateInput);
  await user.type(rateInput, '-50');
  await user.click(addRateBtn);
  await user.clear(rateInput);
  await user.click(addRateBtn);
  
  // Rate Overlap Validation
  const overlappingData = { ...mockData, applicableRates: [{ id: '1', start: new Date('2026-08-01'), end: new Date('2026-08-05'), amount: 100 }] };
  rerender(<WrappedForm data={overlappingData} onChange={onChange} />);
  
  const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
  
  const rateInputOverlap = screen.getByPlaceholderText(`Rate (${overlappingData.currency})`);
  await user.clear(rateInputOverlap);
  await user.type(rateInputOverlap, '300');
  const addRateBtnOverlap = screen.getByText('Add Rate');
  await user.click(addRateBtnOverlap);
  
  alertMock.mockRestore();

  // Removing applicable rate
  rerender(<WrappedForm data={{...mockData, applicableRates: [{ id: '1', start: new Date('2026-08-01'), end: new Date('2026-08-05'), amount: 100 }]}} onChange={onChange} />);
  const rateDeleteBtns = screen.queryAllByRole('button').filter(b => b.className === 'btn-icon-delete');
  if (rateDeleteBtns.length > 0) {
    await user.click(rateDeleteBtns[0]);
  }

  // Remarks
  const textareas = document.querySelectorAll('textarea');
  if (textareas.length >= 3) {
    fireEvent.change(textareas[0], { target: { value: 'Pay remarks' } });
    fireEvent.change(textareas[1], { target: { value: 'Cancel remarks' } });
    fireEvent.change(textareas[2], { target: { value: 'Gen remarks' } });
  }

  // Financial Presentation Mode (Radio buttons)
  const noneMode = screen.getByText('Hide Breakdown');
  await user.click(noneMode);
  const averageMode = screen.getByText('Average Rate');
  await user.click(averageMode);
  const fullMode = screen.getByText('Full Breakdown');
  await user.click(fullMode);

  // Checkboxes
  const dl = screen.getByText('Display Logo on PDF');
  fireEvent.click(dl);

  // Rerender with showLogo true to reveal the file input
  rerender(<WrappedForm data={{...mockData, pdfOptions: {...mockData.pdfOptions, showLogo: true}}} onChange={onChange} />);

  // Logo Upload
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File(['dummy'], 'logo.png', { type: 'image/png' });
  
  const dummyFileReader = {
    readAsDataURL: vi.fn(function() {
      // @ts-ignore
      this.result = 'data:image/png;base64,dummy';
      // @ts-ignore
      this.onloadend();
    })
  };
  vi.spyOn(window, 'FileReader').mockImplementation(() => dummyFileReader as any);
  
  fireEvent.change(fileInput, { target: { files: [file] } });
  
  const badFile = new File(['dummy'], 'bad.txt', { type: 'text/plain' });
  fireEvent.change(fileInput, { target: { files: [badFile] } });
  
  const largeFile = new File([new ArrayBuffer(600 * 1024)], 'large.png', { type: 'image/png' });
  Object.defineProperty(largeFile, 'size', { value: 600 * 1024 });
  fireEvent.change(fileInput, { target: { files: [largeFile] } });

  // Remove Logo
  rerender(<WrappedForm data={{...mockData, pdfOptions: {...mockData.pdfOptions, logoDataUrl: 'data:image/png;base64,123'}}} onChange={onChange} />);
  const removeLogoBtns = screen.queryAllByRole('button').filter(b => b.className === 'logo-remove-btn');
  if (removeLogoBtns.length > 0) {
    await user.click(removeLogoBtns[0]);
  }

  // Checkboxes
  const rateCodesCb = screen.getByText('Include Rate Codes');
  await user.click(rateCodesCb);
  
  const watermarkCb = screen.getByText('Apply Watermark');
  await user.click(watermarkCb);
  rerender(<WrappedForm data={{...mockData, pdfOptions: {...mockData.pdfOptions, watermarkText: 'DRAFT'}}} onChange={onChange} />);
  
  const watermarkInput = screen.getByPlaceholderText(/DRAFT or CANCELLED/i);
  await user.type(watermarkInput, 'TEST');
  
  const overrideHeaderCb = screen.getByText('Override Header Title');
  await user.click(overrideHeaderCb);
  rerender(<WrappedForm data={{...mockData, pdfOptions: {...mockData.pdfOptions, manualPOHeader: true, poHeaderTitle: 'BOOKING REQUEST'}}} onChange={onChange} />);
  const headerInput = screen.getByPlaceholderText('e.g. BOOKING REQUEST');
  await user.type(headerInput, 'REQ');
  
  const overrideLpoCb = screen.getByText('Override LPO Number');
  await user.click(overrideLpoCb);
  rerender(<WrappedForm data={{...mockData, pdfOptions: {...mockData.pdfOptions, manualPONumber: true, poNumber: '123'}}} onChange={onChange} />);
  const poInput = screen.getByPlaceholderText('Custom LPO #');
  await user.type(poInput, '123');

  const confCb = screen.getByText('Include Supplier Ref #');
  await user.click(confCb);
  rerender(<WrappedForm data={{...mockData, pdfOptions: {...mockData.pdfOptions, showSupplierConfirmation: true, supplierConfirmationNumber: 'abc'}}} onChange={onChange} />);
  const confInput = screen.getByPlaceholderText('Confirmation #');
  await user.type(confInput, 'abc');

  const sigCb = screen.getByText('Enable Authorized Signature Area');
  await user.click(sigCb);
  rerender(<WrappedForm data={{...mockData, pdfOptions: {...mockData.pdfOptions, showSignatureArea: true}}} onChange={onChange} />);
  const sigInput = screen.getByPlaceholderText('Signatory Name');
  await user.type(sigInput, 'John');

  const creatorCb = screen.getByText("Show 'Prepared By' Section");
  await user.click(creatorCb);
  rerender(<WrappedForm data={{...mockData, pdfOptions: {...mockData.pdfOptions, showCreatedBy: true}}} onChange={onChange} />);
  const creatorInput = screen.getByPlaceholderText('Enter Name');
  await user.type(creatorInput, 'Jane');
  
  // other visibility checkboxes
  const dtTableCb = screen.getByText('Include Daily Rate Table');
  await user.click(dtTableCb);
  const pyCb = screen.getByText('Include Payment Instructions');
  await user.click(pyCb);
  const cxCb = screen.getByText('Include Cancellation Policy');
  await user.click(cxCb);
  const gpCb = screen.getByText('Include Special Requests');
  await user.click(gpCb);
  const hnCb = screen.getByText('Display Hotel Name in Guest Table');
  await user.click(hnCb);
  const cb1 = screen.getByText('Include Company Name (Bill To)');
  await user.click(cb1);
  const cb2 = screen.getByText('Include Guest Name (Bill To)');
  await user.click(cb2);
});
