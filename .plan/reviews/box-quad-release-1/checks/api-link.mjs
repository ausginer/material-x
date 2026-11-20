// Opens Storybook's Reference/API docs page on the dev server, reads the
// box-quad link, follows it, and reports the page it opens.
const [playwrightPath, base] = process.argv.slice(2);
const { chromium } = (await import(playwrightPath)).default;
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(`${base}/iframe.html?id=reference-api--docs&viewMode=docs`);
  const link = page.locator('a', { hasText: '@ydinjs/box-quad' });
  await link.waitFor({ timeout: 60000 });
  console.log(
    'href',
    await link.getAttribute('href'),
    'target',
    await link.getAttribute('target'),
  );
  const response = await page.goto(
    new URL(await link.getAttribute('href'), page.url()).href,
  );
  console.log('status', response?.status(), 'title', await page.title());
} finally {
  await browser.close();
}
