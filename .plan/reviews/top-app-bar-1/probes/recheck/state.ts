import { open, walk, on, settle, browser, ENGINE, BAR, code } from './lib.ts';
console.log(`# ${ENGINE} ${browser.version()}`);
const D = '<!doctype html><style>body{margin:0}</style>';
const CSS: Record<string, string> = {
  plain: '',
  quirks: 'Q',
  'html margin-top': 'html{margin-top:46px}',
  'html top': 'html{position:relative;top:20px}',
  'html negative margin': 'html{margin-top:-30px}',
  'html height 0': 'html{height:0}',
  'body absolute': 'body{position:absolute;inset:0 0 auto}',
  'html zoom 1.5': 'html{zoom:1.5}',
  'body zoom .5': 'body{zoom:.5}',
  'html zoom 3': 'html{zoom:3}',
  'html rtl': 'html{direction:rtl}',
  'html transform': 'html{transform:translateY(40px)}',
  'html perspective+contain': 'html{contain:layout paint;perspective:100px}',
  'bar content-visibility': '#bar{content-visibility:auto}',
  'bar display contents': '#bar{display:contents}',
  'bar opacity/filter/transform':
    '#bar{opacity:.5;filter:blur(1px);transform:translateY(5px)}',
  'bar fixed': '#bar{position:fixed;inset-inline:0}',
  'bar clip': '#bar{overflow:clip;contain:strict;height:64px}',
  'bar visibility hidden': '#bar{visibility:hidden}',
  'page rules on popovers':
    '[popover],:popover-open,*:popover-open{display:none!important;position:fixed!important;inset:100px!important;width:50px!important;height:50px!important;visibility:visible!important;background:red}::backdrop,*::backdrop{background:rgba(255,0,0,.9)!important;visibility:visible!important}',
  'universal !important':
    '*,*::before,*::after{margin:9px!important;padding:9px!important;border:3px solid!important;inset:auto!important;box-sizing:border-box!important}',
  'div rules': 'div{position:fixed;top:500px;transform:scale(3)}',
  'scroll-padding/snap':
    'html{scroll-padding-top:64px;scroll-snap-type:y mandatory}',
  'body transformed': 'body{transform:translateZ(0)}',
  'overflow-y scroll html': 'html{overflow-y:scroll;overflow-x:clip}',
};
for (const [n, css] of Object.entries(CSS)) {
  const page = await open(
    css === 'Q'
      ? `<style>body{margin:0}</style>${BAR}`
      : `${D}<style>${css}</style>${BAR}`,
  );
  console.log(
    n,
    n === 'quirks' ? await page.evaluate(() => document.compatMode) : '',
    await walk(page),
  );
  await page.context().close();
}
for (const dsf of [1, 1.5, 2, 3]) {
  const page = await open(
    D + BAR,
    ENGINE === 'x' ? {} : { deviceScaleFactor: dsf },
  );
  console.log(
    `dsf ${dsf} fractions`,
    await walk(page, [0, 0.25, 0.34, 0.5, 0.67, 0.75, 1, 0.5, 0]),
  );
  await page.context().close();
}
// Frame
{
  const page = await open(
    `${D}<iframe id=f style="width:400px;height:300px;margin-top:900px"></iframe><div style="height:3000px"></div>`,
  );
  const f = page.frames()[1]!;
  await f.setContent(D + BAR);
  await f.addScriptTag({ content: code });
  await settle(f);
  console.log('frame out of view', await walk(f));
  await page.evaluate(() => scrollTo(0, 700));
  await settle(page);
  console.log('frame half in view', await walk(f));
  await page.evaluate(() => {
    document.getElementById('f')!.style.display = 'none';
  });
  await settle(page);
  await page.evaluate(() => {
    document.getElementById('f')!.style.display = '';
  });
  await settle(page);
  await settle(page);
  console.log('frame hidden and shown', await on(f), await walk(f));
  await page.context().close();
}
// Reconnect, move, moveBefore, clone, adopt.
{
  const page = await open(D + BAR);
  const act = async (n: string, y: number, js: string) => {
    await page.evaluate((v) => scrollTo(0, v), y);
    await settle(page);
    await page.evaluate(js);
    await settle(page);
    console.log(
      n,
      await on(page),
      await page.evaluate(() =>
        (document.getElementById('bar') as any).shadowRoot
          .querySelector('.scroll-start')
          .matches(':popover-open'),
      ),
      await walk(page),
    );
  };
  await act(
    'removed and inserted at 0',
    0,
    '{const b=bar;b.remove();document.body.prepend(b)}',
  );
  await act(
    'removed and inserted at 300',
    300,
    '{const b=bar;b.remove();document.body.prepend(b)}',
  );
  await act('moved at 300', 300, 'document.body.append(bar)');
  await act('moved back at 0', 0, 'document.body.prepend(bar)');
  await act(
    'moveBefore',
    300,
    'document.body.moveBefore?.(bar, document.body.firstChild)',
  );
  await act(
    'moved twice in a task',
    300,
    'document.body.append(bar);document.body.prepend(bar)',
  );
  await act(
    'into an open dialog',
    300,
    '{const d=document.createElement("dialog");document.body.append(d);d.showModal();d.append(bar)}',
  );
  await act(
    'out of it, dialog removed',
    0,
    '{document.body.prepend(bar);document.querySelector("dialog").remove()}',
  );
  await act('cloned', 300, '{const c=bar.cloneNode(true);bar.replaceWith(c)}');
  await act(
    'popover hidden by force then reconnected',
    0,
    '{bar.shadowRoot.querySelector(".scroll-start").hidePopover();const b=bar;b.remove();document.body.prepend(b)}',
  );
  await page.context().close();
}
// The moving container: takes the bar out and puts it somewhere else as it connects.
{
  const page = await open(
    D + '<div id=to></div><div id=tall style="height:5000px"></div>',
  );
  await page.evaluate(() => {
    customElements.define(
      'x-mover',
      class extends HTMLElement {
        connectedCallback() {
          document.getElementById('to')!.append(...this.children);
        }
      },
    );
    const c = document.createElement('x-mover');
    const b = document.createElement('mx-top-app-bar');
    b.id = 'bar';
    c.append(b);
    document.body.append(c);
  });
  await settle(page);
  console.log('moved as it connected', await walk(page));
  await page.context().close();
}
// Two bars; a detached frame document.
{
  const page = await open(D + '<mx-top-app-bar id=b2></mx-top-app-bar>' + BAR);
  console.log(
    'two bars',
    await walk(page),
    '|',
    await walk(page, [0, 5, 0], 'b2'),
  );
  await page.context().close();
}
// Scroll lock by a fixed body.
{
  const page = await open(D + BAR);
  await page.evaluate(() => scrollTo(0, 300));
  await settle(page);
  await page.evaluate(() => {
    document.body.style.cssText = 'position:fixed;top:-300px;inset-inline:0';
  });
  await settle(page);
  console.log('body fixed at -300 (a scroll lock)', await on(page));
  await page.evaluate(() => {
    document.body.style.cssText = 'margin:0';
    scrollTo(0, 300);
  });
  await settle(page);
  console.log('  unlocked', await on(page));
  await page.evaluate(() => {
    document.documentElement.style.overflow = 'hidden';
  });
  await settle(page);
  console.log('html overflow hidden (a scroll lock)', await on(page));
  await page.context().close();
}
// Hidden: the state and the flash when shown at the start.
{
  const page = await open(D + BAR);
  await page.evaluate(() => {
    const w = window as any;
    w.log = [];
    bar.addEventListener('transitionrun', (e: any) =>
      w.log.push(e.propertyName),
    );
    bar.style.display = 'none';
  });
  await settle(page);
  const hid = await on(page);
  await page.evaluate(() => {
    const w = window as any;
    w.colors = [];
    bar.style.display = '';
    let n = 0;
    const f = () => {
      w.colors.push(getComputedStyle(bar).backgroundColor);
      if (++n < 16) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
  await page.waitForTimeout(500);
  console.log(
    'display:none at 0:',
    hid,
    '| shown at 0:',
    await on(page),
    '| transitions',
    await page.evaluate(() => (window as any).log.join()),
    '| frames with a color other than rest',
    await page.evaluate(() => {
      const c = (window as any).colors,
        r = getComputedStyle(bar).backgroundColor;
      return c.filter((x: string) => x !== r).length + ' of ' + c.length;
    }),
  );
  await page.context().close();
}
await browser.close();
