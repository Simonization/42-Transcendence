// Why do labels render as raw keys? Dump console output for a page. usage: node t11-i18n.js <url>
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ locale: process.env.LOCALE || 'en-US' })).newPage();
  p.on('console', (m) => console.log(m.type(), m.text().slice(0, 300)));
  p.on('pageerror', (e) => console.log('pageerror', String(e).slice(0, 300)));
  await p.goto(process.argv[2]);
  await p.waitForTimeout(2500);
  console.log('---- text:', (await p.innerText('body')).slice(0, 400).replace(/\n+/g, ' | '));
  await b.close();
})();
