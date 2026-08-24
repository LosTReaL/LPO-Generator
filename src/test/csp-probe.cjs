/* Runtime CSP/console-error probe against the production preview build. */
const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const problems = [];
  page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Only flag violations/blocked resources; ignore offline-font noise.
      if (/security|Content Security Policy|Refused to/i.test(text)) {
        problems.push(`console.error: ${text}`);
      }
    }
  });
  page.on('requestfailed', (req) => {
    const failure = req.failure()?.errorText ?? '';
    if (/blocked/i.test(failure)) {
      problems.push(`request blocked: ${req.url()}`);
    }
  });

  for (const route of ['/Ordris/', '/Ordris/#/hotel-invoice', '/Ordris/#/general-lpo', '/Ordris/#/general-invoice']) {
    await page.goto(`http://localhost:4173${route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
  }

  // Exercise an interaction-heavy flow too
  await page.goto('http://localhost:4173/Ordris/#/general-invoice', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /add item/i }).click();
  await page.waitForTimeout(500);

  await browser.close();
  if (problems.length) {
    console.log('PROBLEMS FOUND:');
    problems.forEach((p) => console.log(' - ' + p));
    process.exit(1);
  } else {
    console.log('CLEAN: no page errors, CSP violations or blocked requests across 5 loaded routes');
  }
})();
