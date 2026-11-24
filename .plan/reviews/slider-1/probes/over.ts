// Does the page's layout move while the value indicator is shown at the inline end? Classic scrollbars, and a mobile layout viewport.
import { open, browser, ENGINE } from './lib.ts';
console.log(`# ${ENGINE} ${browser.version()}`);
for (const v of ['100', '1000000']) {
  const page = await open(
    `<style>body{margin:0;padding:80px 0 0} #c{overflow:auto;inline-size:300px} </style><div id=c style="padding-top:80px"><mx-slider id=s indicator max=${v} value=${v}></mx-slider></div><p id=p>after</p>`,
    { viewport: { width: 400, height: 300 } },
  );
  const read = () =>
    page.evaluate(() => {
      const c = document.getElementById('c')!;
      return {
        overflow: c.scrollWidth - c.clientWidth,
        boxHeight: c.offsetHeight,
        after: document.getElementById('p')!.getBoundingClientRect().top,
      };
    });
  console.log(v, 'rest ', JSON.stringify(await read()));
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
  console.log(v, 'shown', JSON.stringify(await read()));
  await page.evaluate(() => {
    document.getElementById('c')!.scrollLeft = 99;
  });
  console.log(
    '  scrollLeft after scrolling',
    await page.evaluate(() => document.getElementById('c')!.scrollLeft),
  );
  await page.context().close();
}
{
  const page = await open(
    '<style>body{margin:0;padding:80px 16px 0}</style><mx-slider id=s indicator max=10000 value=10000></mx-slider>',
    { viewport: { width: 400, height: 300 } },
  );
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
  console.log(
    '16px page gutter, 10000: page overflow',
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  );
  await page.evaluate(() => {
    (document.getElementById('s') as any).valuetext = 'A long value text';
  });
  console.log(
    '   with valuetext',
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  );
}
await browser.close();
