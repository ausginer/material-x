// Opens Storybook stories on a dev server and reports, for each, whether the
// preview rendered it and the page errors and failed requests it saw.
const [playwrightPath, base, ...ids] = process.argv.slice(2);
const { chromium } = (await import(playwrightPath)).default;
const browser = await chromium.launch();
try {
  for (const id of ids) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) =>
      errors.push(`pageerror: ${e.message.split('\n')[0]}`),
    );
    page.on(
      'console',
      (m) =>
        m.type() === 'error' &&
        errors.push(`console: ${m.text().split('\n')[0].slice(0, 200)}`),
    );
    page.on(
      'response',
      (r) =>
        r.status() >= 400 &&
        errors.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`),
    );
    await page.goto(`${base}/iframe.html?id=${id}&viewMode=story`);
    const rendered = await page
      .waitForFunction(
        () => document.querySelector('#storybook-root')?.childElementCount > 0,
        null,
        { timeout: 30000 },
      )
      .then(
        () => true,
        () => false,
      );
    console.log(`${id}: ${rendered ? 'rendered' : 'NOT rendered'}`);
    for (const e of [...new Set(errors)].slice(0, 4)) console.log(`  ${e}`);
    await page.close();
  }
} finally {
  await browser.close();
}
