// The value indicator in the accessibility tree, with and without the handle's aria-hidden.
import { open, browser, ENGINE } from './lib.ts';
console.log(`# ${ENGINE} ${browser.version()}`);
for (const hidden of [true, false]) {
  const page = await open(
    '<body><div id=fixture role=group aria-label=F><mx-slider id=s indicator valuetext=Shown style="margin-top:80px"><span slot=label>S</span></mx-slider></div>',
  );
  if (!hidden)
    await page.evaluate(() =>
      (window as any)
        .q(document.getElementById('s'), '.handle')
        .removeAttribute('aria-hidden'),
    );
  await page.keyboard.press('Tab');
  await page.waitForTimeout(400);
  const cdp = await page.context().newCDPSession(page);
  const { nodes } = (await cdp.send('Accessibility.getFullAXTree')) as any;
  console.log(
    'aria-hidden',
    hidden,
    JSON.stringify(
      nodes
        .filter((n: any) => !n.ignored)
        .map(
          (n: any) =>
            `${n.role?.value}:${n.name?.value ?? ''}:${n.value?.value ?? ''}`,
        ),
    ),
  );
  await page.context().close();
}
{
  const page = await open(
    '<body style="padding-top:80px"><mx-slider id=s indicator></mx-slider>',
  );
  console.log(
    'touch-action',
    await page.evaluate(() => {
      const i = (window as any).inp(document.getElementById('s'));
      const a = getComputedStyle(i).touchAction;
      i.style.touchAction = 'unset';
      const b = getComputedStyle(i).touchAction;
      const n = document.createElement('input');
      n.type = 'range';
      document.body.append(n);
      return [a, b, getComputedStyle(n).touchAction];
    }),
  );
}
await browser.close();
