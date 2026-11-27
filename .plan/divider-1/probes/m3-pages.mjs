// Renders M3's four divider pages in Chromium and prints their text,
// walking shadow roots. Run: node .plan/divider-1/probes/m3-pages.mjs
import { createRequire } from 'node:module';
const { chromium } = createRequire(
  new URL('../../../package.json', import.meta.url),
)('playwright');
const browser = await chromium.launch();
const page = await browser.newPage();
for (const tab of ['overview', 'specs', 'guidelines', 'accessibility']) {
  const url = `https://m3.material.io/components/divider/${tab}`;
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);
  const text = await page.evaluate(() => {
    const out = [];
    const walk = (n) => {
      if (n.nodeName === 'SCRIPT' || n.nodeName === 'STYLE') return;
      if (n.nodeType === 3) {
        const s = n.textContent.replace(/\s+/g, ' ').trim();
        if (s) out.push(s);
      }
      if (n.shadowRoot) walk(n.shadowRoot);
      for (const c of n.childNodes) walk(c);
    };
    walk(document.querySelector('main') ?? document.body);
    return out.join('\n');
  });
  console.log(`===== ${url}\n${text}\n`);
}
await browser.close();
