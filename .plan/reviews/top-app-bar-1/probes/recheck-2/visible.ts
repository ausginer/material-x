// The 1px box without its visibility: hidden: what is drawn at the corner, and what takes a hit there.
import { open, settle, browser, ENGINE } from './lib.ts';
console.log(`# ${ENGINE} ${browser.version()}`);
for (const colorScheme of ['light', 'dark'] as const)
  for (const kind of [
    'hidden, as built',
    'hidden, 0px',
    'visible, 0px',
    'visible, 1px',
  ]) {
    const page = await open(
      '<!doctype html><meta name=color-scheme content="light dark"><style>body{margin:0}mx-top-app-bar{--md-top-app-bar-container-color:#c00}</style><mx-top-app-bar id=bar><button slot=lead style="position:absolute;inset:0 auto auto 0">L</button></mx-top-app-bar><div style="height:3000px"></div>',
      { colorScheme },
    );
    await page.evaluate((k) => {
      const b: any = (bar as any).shadowRoot.querySelector('.scroll-start');
      if (k.startsWith('visible')) b.style.visibility = 'visible';
      if (k.endsWith('0px')) b.style.inlineSize = b.style.blockSize = '0';
      document
        .querySelector('button')!
        .addEventListener(
          'click',
          () => ((window as any).n = ((window as any).n ?? 0) + 1),
        );
    }, kind);
    await settle(page);
    await page.waitForTimeout(400);
    const png = (
      await page.screenshot({ clip: { x: 0, y: 0, width: 1, height: 1 } })
    ).toString('base64');
    const pixel = await page.evaluate(async (d) => {
      const i = new Image();
      i.src = `data:image/png;base64,${d}`;
      await i.decode();
      const c = document.createElement('canvas').getContext('2d')!;
      c.drawImage(i, 0, 0);
      return [...c.getImageData(0, 0, 1, 1).data].slice(0, 3).join();
    }, png);
    const hit = await page.evaluate(() => {
      const e: any = document.elementFromPoint(0.5, 0.5);
      return `${e.localName}/${(bar as any).shadowRoot.elementFromPoint(0.5, 0.5)?.className || (bar as any).shadowRoot.elementFromPoint(0.5, 0.5)?.localName}`;
    });
    await page.mouse.click(0.5, 0.5);
    console.log(
      `${colorScheme} | ${kind} | pixel ${pixel} | hit ${hit} | the button's clicks ${await page.evaluate('window.n ?? 0')}`,
    );
    await page.context().close();
  }
await browser.close();
