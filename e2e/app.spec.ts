import { expect, test, type Page } from '@playwright/test';

/**
 * Critical user journeys, executed against the real production bundle
 * (vite preview) with a real Chromium — including REAL PDF downloads.
 */

test.beforeEach(async ({ page }) => {
  // Fresh storage per journey so tests are order-independent.
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
});

async function openModule(page: Page, title: string) {
  await page.getByRole('button', { name: new RegExp(title, 'i') }).first().click();
  await expect(page.getByRole('button', { name: /home/i }).first()).toBeVisible();
}

test('landing page shows the four module cards and supports keyboard navigation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Ordris' })).toBeVisible();
  for (const title of ['Hotel LPO', 'General LPO', 'Hotel Invoice', 'General Invoice']) {
    await expect(page.getByRole('button', { name: new RegExp(title, 'i') })).toBeVisible();
  }

  // Keyboard-only user can activate a card with Enter
  await page.getByRole('button', { name: /hotel lpo/i }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByPlaceholder('e.g. Atlantis', { exact: true })).toBeVisible({ timeout: 10_000 });
});

test('hotel LPO end-to-end: fill form, schedule stay, download a real PDF, persist across reload', async ({ page }) => {
  await page.goto('/');
  await openModule(page, 'Hotel LPO');

  await page.getByPlaceholder('e.g. Atlantis', { exact: true }).fill('E2E Grand Hotel');
  await page.getByPlaceholder(/^Guest 1 Full Name$/i).fill('Ada Lovelace');

  // Schedule a stay via the calendar (click two days of the visible month).
  // Scope to the "Stay Duration" card — a second rate-config calendar exists.
  const stayCalendar = page
    .locator('.section-card', { hasText: 'Stay Duration' })
    .locator('.calendar-day');
  await stayCalendar.nth(9).click();
  await stayCalendar.nth(12).click();
  await page.getByRole('button', { name: /add range/i }).click();
  await expect(page.getByText(/Scheduled Stays/i)).toBeVisible();

  // No applicable rates exist yet, so generation shows the
  // "missing rates" warning dialog first — accept it like a user would.
  page.once('dialog', (dialog) => dialog.accept());

  // Validation must now pass and produce a genuine download
  const downloadPromise = page.waitForEvent('download', { timeout: 15_000 });
  await page.getByTitle('Generate PDF').first().click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^LPO_PO-\d{8}-[A-Z0-9]{6}_.*\.pdf$/);

  // Success feedback is shown to the user
  await expect(page.getByText(/PDF generated successfully/i)).toBeVisible();

  // State survives a full reload (localStorage persistence)
  await page.reload();
  await expect(page.getByPlaceholder('e.g. Atlantis', { exact: true })).toHaveValue('E2E Grand Hotel');
});

test('hotel LPO blocks generation with a clear error when required fields are missing', async ({ page }) => {
  await page.goto('/');
  await openModule(page, 'Hotel LPO');

  const downloadPromise = page.waitForEvent('download', { timeout: 5_000 }).catch(() => null);
  await page.getByTitle('Generate PDF').first().click();

  await expect(page.getByText(/Validation failed/i)).toBeVisible();
  expect(await downloadPromise).toBeNull();
});

test('general invoice end-to-end: create items, download PDF and JSON export, reset clears data', async ({ page }) => {
  test.setTimeout(45_000);
  await page.goto('/');
  await openModule(page, 'General Invoice');

  await page.getByPlaceholder(/e\.g\. Acme Corp/i).fill('E2E Seller Co');
  await page.getByPlaceholder(/John Doe or Company Ltd/i).fill('E2E Buyer Ltd');
  await page.getByRole('button', { name: /add item/i }).click();
  await page.getByPlaceholder(/Product or service description/i).fill('Consulting hours');

  const pdfDownload = page.waitForEvent('download', { timeout: 15_000 });
  await page.getByTitle('Generate PDF').first().click();
  const pdf = await pdfDownload;
  expect(pdf.suggestedFilename()).toMatch(/^INV_.*\.pdf$/);

  const jsonDownload = page.waitForEvent('download', { timeout: 15_000 });
  await page.getByTitle('Import JSON').locator('..'); // ensure header controls present
  await page.getByTitle('Export JSON').click();
  const json = await jsonDownload;
  expect(json.suggestedFilename()).toMatch(/^general_invoice_.*\.json$/);

  // Reset requires confirmation and wipes the form
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByTitle('Reset Form').click();
  await expect(page.getByPlaceholder(/e\.g\. Acme Corp/i)).toHaveValue('', { timeout: 10_000 });
});

test('importing an invalid JSON file surfaces the standardized error toast', async ({ page }) => {
  await page.goto('/');
  await openModule(page, 'General Invoice');

  await page.setInputFiles('input[type="file"]', {
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{ this is not json'),
  });

  await expect(page.getByText(/Invalid JSON file\./i)).toBeVisible();
});

test('mobile viewport exposes the floating action button; desktop hides it', async ({ page }, testInfo) => {
  await page.goto('/');
  await openModule(page, 'Hotel LPO');

  const fabVisible = await page.locator('.fab').isVisible();
  if (testInfo.project.name === 'chromium-mobile') {
    expect(fabVisible).toBeTruthy();
  } else {
    expect(fabVisible).toBeFalsy();
  }
});
