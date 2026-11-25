// What popover="auto" on the box would do, which no row notices.
import { open, settle, on, browser, ENGINE, BAR } from './lib.ts';
console.log(`# ${ENGINE} ${browser.version()}`);
const page = await open(`<!doctype html><div id=pop popover>p</div>${BAR}`);
for (const kind of ['manual', 'auto']) {
  await page.evaluate((k) => {
    const b: any = (
      document.getElementById('bar') as any
    ).shadowRoot.querySelector('.scroll-start');
    b.hidePopover();
    b.popover = k;
    (document.getElementById('pop') as any).showPopover();
    const h = document.getElementById('bar')!;
    h.remove();
    document.body.prepend(h);
  }, kind);
  await settle(page);
  const open2 = await page.evaluate(() =>
    document.getElementById('pop')!.matches(':popover-open'),
  );
  await page.mouse.click(400, 500);
  await settle(page);
  console.log(
    kind,
    "| the page's own open popover stays open",
    open2,
    '| after a click on the page',
    await on(page),
  );
}
await browser.close();
