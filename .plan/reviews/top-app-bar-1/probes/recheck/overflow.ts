import { open, settle, on, browser, ENGINE, BAR } from './lib.ts';
console.log(`# ${ENGINE} ${browser.version()}`);
for (const css of [
  'html,body{overflow-x:hidden}',
  'body{overflow-x:hidden}',
  'body{overflow-x:clip}',
  'html{overflow-x:hidden} body{overflow-x:clip}',
  'html{overflow-x:clip} body{overflow-x:clip}',
]) {
  const page = await open(
    `<!doctype html><style>body{margin:0}${css}</style>${BAR}`,
  );
  await page.evaluate(() => scrollTo(0, 300));
  await settle(page);
  console.log(
    css,
    '| bar top',
    await page.evaluate(() => bar.getBoundingClientRect().top),
    await on(page),
  );
  await page.context().close();
}
await browser.close();
