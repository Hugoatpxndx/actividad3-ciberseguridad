const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'docs/capturas/01-login.png', fullPage: true });

  await page.fill('#username', 'admin');
  await page.fill('#password', 'admin123');
  await page.click('#loginBtn');
  await page.waitForSelector('#dashboardView:not(.hidden)', { timeout: 10000 });
  await page.screenshot({ path: 'docs/capturas/02-dashboard.png', fullPage: true });

  await page.click('[data-test="/api/admin"]');
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'docs/capturas/03-prueba-admin.png', fullPage: true });

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2
  });
  const mobilePage = await mobile.newPage();
  await mobilePage.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await mobilePage.screenshot({ path: 'docs/capturas/04-login-movil.png', fullPage: true });

  await browser.close();
  console.log('Capturas generadas en docs/capturas/');
})();
