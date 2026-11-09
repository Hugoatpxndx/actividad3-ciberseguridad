const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('file:///work/docs/INFORME.html', { waitUntil: 'networkidle' });
  await page.pdf({
    path: 'docs/Informe_Actividad3.pdf',
    format: 'A4',
    printBackground: true,
    margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' }
  });
  await browser.close();
  console.log('PDF generado en docs/Informe_Actividad3.pdf');
})();
