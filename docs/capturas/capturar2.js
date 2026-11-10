const { chromium } = require('playwright');

const SITE = 'http://localhost:3000';
const OUT = 'docs/capturas';

function cardOf(page) {
  return page.locator('#testResult').locator('xpath=ancestor::article');
}

async function login(page, username, password) {
  await page.goto(SITE, { waitUntil: 'networkidle' });
  await page.fill('#username', username);
  await page.fill('#password', password);
  await page.click('#loginBtn');
  await page.waitForSelector('#dashboardView:not(.hidden)', { timeout: 10000 });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2
  });

  // 05 · Endpoint de administración sin token -> 401
  const page401 = await context.newPage();
  await login(page401, 'admin', 'admin123');
  await page401.click('[data-noauth="true"]');
  await page401.waitForTimeout(800);
  await page401.screenshot({ path: `${OUT}/05-prueba-401.png`, fullPage: true });
  await cardOf(page401).screenshot({ path: `${OUT}/05b-resultado-401.png` });

  // 06 · Usuario sin rol admin -> 403
  const page403 = await context.newPage();
  await login(page403, 'usuario', 'usuario123');
  await page403.click('[data-test="/api/admin"]');
  await page403.waitForTimeout(800);
  await page403.screenshot({ path: `${OUT}/06-prueba-403.png`, fullPage: true });
  await cardOf(page403).screenshot({ path: `${OUT}/06b-resultado-403.png` });

  // 03b · Admin -> 200 (recorte de la tarjeta de pruebas)
  const page200 = await context.newPage();
  await login(page200, 'admin', 'admin123');
  await page200.click('[data-test="/api/admin"]');
  await page200.waitForTimeout(800);
  await cardOf(page200).screenshot({ path: `${OUT}/03b-resultado-200.png` });

  // 07 · Credenciales inválidas -> 401 en el login
  const pageBad = await context.newPage();
  await pageBad.goto(SITE, { waitUntil: 'networkidle' });
  await pageBad.fill('#username', 'admin');
  await pageBad.fill('#password', 'incorrecta');
  await pageBad.click('#loginBtn');
  await pageBad.waitForTimeout(900);
  await pageBad.screenshot({ path: `${OUT}/07-login-error.png`, fullPage: true });

  // 08, 09 y 10 · Informe real de OWASP ZAP
  const zap = await context.newPage();
  await zap.setViewportSize({ width: 1200, height: 900 });
  await zap.goto('file:///work/fase3/evidencias/zap-baseline.html', { waitUntil: 'load' });
  await zap.waitForTimeout(600);

  await zap.screenshot({
    path: `${OUT}/08-zap-resumen.png`,
    clip: { x: 0, y: 0, width: 1200, height: 640 }
  });

  const alerts = await zap.$('table.alerts');
  if (alerts) await alerts.screenshot({ path: `${OUT}/09-zap-alertas.png` });

  const detail = await zap.$('table.results');
  if (detail) {
    const box = await detail.boundingBox();
    await zap.screenshot({
      path: `${OUT}/10-zap-detalle.png`,
      clip: { x: box.x, y: Math.max(0, box.y - 48), width: box.width, height: 620 }
    });
  }

  await browser.close();
  console.log('Capturas nuevas generadas en docs/capturas/');
})();
