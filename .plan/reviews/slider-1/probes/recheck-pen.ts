// A pen in Chromium by CDP, on the built slider and a bare range, one page each, with every pointer event.
// node recheck-pen.ts <packages> chromium
import { open, browser, ENGINE } from './lib.ts';
console.log(`# ${ENGINE} ${browser.version()}`);
for (const kind of ['mx', 'bare']) {
  const run = async (name: string, go: any, pt = 'pen') => {
    const page = await open(
      `<style>body{margin:0} mx-slider,#h{inline-size:204px;margin:100px 0 0 100px;display:block} input{appearance:none;block-size:44px;touch-action:pan-y}input::-webkit-slider-thumb{appearance:none;inline-size:4px;block-size:44px}</style>` +
        (kind === 'mx'
          ? '<form id=f><mx-slider id=h name=n value=30 indicator></mx-slider></form>'
          : '<form id=f><input id=h name=n type=range value=30></form>') +
        '<div style="height:3000px">',
      { hasTouch: true },
    );
    const cdp = await page.context().newCDPSession(page);
    const b = await page.evaluate((mx) => {
      const w = window as any;
      w.h = document.getElementById('h');
      w.f = document.getElementById('f');
      w.i = mx ? w.inp(w.h) : w.h;
      w.log = [];
      for (const t of ['input', 'change'])
        w.h.addEventListener(t, () =>
          w.log.push(
            t + w.h.value + (w.h.matches(':disabled') ? '(disabled)' : ''),
          ),
        );
      for (const t of [
        'pointerdown',
        'pointermove',
        'pointerup',
        'pointercancel',
        'touchstart',
        'mousedown',
      ])
        w.i.addEventListener(t, (e: any) =>
          w.log.push(
            t.replace('pointer', 'p.') +
              (e.pointerType ? `(${e.pointerType})` : ''),
          ),
        );
      const r = w.i.getBoundingClientRect();
      return [r.left + 2, r.top + r.height / 2];
    }, kind === 'mx');
    const ev = async (type: string, f: number, dy = 0) => {
      await cdp.send('Input.dispatchMouseEvent', {
        type,
        x: b[0]! + f * 200,
        y: b[1]! + dy,
        button: 'left',
        buttons: type === 'mouseReleased' ? 0 : 1,
        clickCount: 1,
        pointerType: pt,
        force: type === 'mouseReleased' ? 0 : 0.5,
      } as any);
      await page.waitForTimeout(60);
    };
    const touch = async (type: string, f?: number) => {
      await cdp.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: f === undefined ? [] : [{ x: b[0]! + f * 200, y: b[1]! }],
      } as any);
      await page.waitForTimeout(60);
    };
    const mark = (m: string) =>
      page.evaluate((m) => {
        const w = window as any;
        w.log.push(
          `-${m}[v${w.h.value} in${w.i.value} f${new FormData(w.f).get('n')}${w.h.matches(':state(pressed)') ? ' HELD' : ''}]`,
        );
      }, m);
    await go({ ev, touch, mark, js: (c: string) => page.evaluate(c), page });
    await page.waitForTimeout(200);
    await mark('end');
    console.log(
      `${kind} | ${name} | ${((await page.evaluate('log')) as string[]).join(' ')}`,
    );
    await page.context().close();
  };
  await run('press, release', async ({ ev, mark }: any) => {
    await ev('mousePressed', 0.7);
    await mark('down');
    await ev('mouseReleased', 0.7);
  });
  await run('drag', async ({ ev, mark }: any) => {
    await ev('mousePressed', 0.5);
    for (const f of [0.55, 0.6, 0.7]) await ev('mouseMoved', f);
    await mark('moved');
    await ev('mouseReleased', 0.7);
  });
  await run('drag up', async ({ ev, mark }: any) => {
    await ev('mousePressed', 0.5);
    for (const f of [20, 40, 80]) await ev('mouseMoved', 0.5, -f);
    await mark('moved');
    await ev('mouseReleased', 0.5, -80);
  });
  for (const [n, c] of [
    ['disabled', 'h.disabled=true'],
    ['removed', 'h.remove()'],
    ['moved', 'f.prepend(h)'],
    ['removed and back', 'h.remove();f.append(h)'],
    ['hidden', 'h.style.display="none"'],
    ['blurred', 'document.activeElement.blur()'],
    ['value=90', 'h.value=90'],
    ['value=30', 'h.value=30'],
    ['reset', 'f.reset()'],
  ] as const)
    for (const pt of ['pen', 'mouse'])
      await run(
        `${pt} down at 70, then ${n}, then up`,
        async ({ ev, mark, js }: any) => {
          await ev('mousePressed', 0.7);
          await js(c);
          await mark('did');
          await ev('mouseReleased', 0.7);
        },
        pt,
      );
  // A finger on a slider that has focus already.
  for (const focused of [false, true])
    for (const [n, c] of [
      ['disabled', 'h.disabled=true'],
      ['removed', 'h.remove()'],
      ['moved', 'f.prepend(h)'],
      ['blurred', 'document.activeElement.blur()'],
      ['hidden', 'h.style.display="none"'],
      ['nothing', '1'],
    ] as const)
      await run(
        `finger down at 70${focused ? ', focused' : ''}, then ${n}, then up`,
        async ({ touch, mark, js }: any) => {
          if (focused) await js('h.focus()');
          await touch('touchStart', 0.7);
          await js(c);
          await mark('did');
          await touch('touchEnd');
        },
      );
}
await browser.close();
