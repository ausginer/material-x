// What the top-layer box takes part in, each beside the same page with a box that isn't shown, and in print.
import { open, on, walk, settle, browser, ENGINE, BAR } from './lib.ts';
console.log(`# ${ENGINE} ${browser.version()}`);
const D = '<!doctype html><style>body{margin:0}</style>';
const hide = (page: any) =>
  page.evaluate(() =>
    document
      .querySelectorAll('mx-top-app-bar')
      .forEach((b: any) =>
        b.shadowRoot.querySelector('.scroll-start').hidePopover(),
      ),
  );
for (const shown of [true, false]) {
  const page = await open(
    `${D}<input id=before><mx-top-app-bar id=bar><button slot=lead>L</button><h1>Title</h1><button slot=trail>T</button></mx-top-app-bar><button id=inv popovertarget=pop>open</button><div id=pop popover><button id=inpop>in</button></div><div id=hint popover=hint>h</div><dialog id=dlg closedby=any><button id=indlg>x</button></dialog><details name=a><summary id=sum>s</summary></details><input id=after><div id=tall style="height:3000px"></div>`,
  );
  if (!shown) await hide(page);
  const out: any = {
    box: await page.evaluate(() =>
      (document.getElementById('bar') as any).shadowRoot
        .querySelector('.scroll-start')
        .matches(':popover-open'),
    ),
  };
  const order: string[] = [];
  await page.focus('#before');
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press(ENGINE === 'webkit' ? 'Alt+Tab' : 'Tab');
    order.push(
      await page.evaluate(() => {
        let a: any = document.activeElement;
        return a.id || a.textContent || a.localName;
      }),
    );
  }
  out.tab = order.join('>');
  // Light dismiss of an auto popover, of a hint, of a dialog with closedby=any.
  await page.evaluate(() =>
    (document.getElementById('pop') as any).showPopover(),
  );
  await page.mouse.click(700, 500);
  out.autoDismissed = await page.evaluate(
    () => !document.getElementById('pop')!.matches(':popover-open'),
  );
  await page.evaluate(() =>
    (document.getElementById('pop') as any).showPopover(),
  );
  await page.mouse.click(0.5, 0.5);
  out.autoDismissedAtBox = await page.evaluate(
    () => !document.getElementById('pop')!.matches(':popover-open'),
  );
  await page.evaluate(() =>
    (document.getElementById('pop') as any).showPopover(),
  );
  await page.keyboard.press('Escape');
  out.autoEscape = await page.evaluate(
    () => !document.getElementById('pop')!.matches(':popover-open'),
  );
  out.boxAfterDismissals = await page.evaluate(() =>
    (document.getElementById('bar') as any).shadowRoot
      .querySelector('.scroll-start')
      .matches(':popover-open'),
  );
  await page.evaluate(() =>
    (document.getElementById('dlg') as any).showModal(),
  );
  out.dlgFocus = await page.evaluate(() => document.activeElement!.id);
  out.stateUnderModal = await walk(page, [0, 300, 0]);
  await page.keyboard.press('Escape');
  out.dlgEscape = await page.evaluate(
    () => !(document.getElementById('dlg') as any).open,
  );
  await page.evaluate(() =>
    (document.getElementById('dlg') as any).showModal(),
  );
  await page.mouse.click(700, 550);
  out.dlgLight = await page.evaluate(
    () => !(document.getElementById('dlg') as any).open,
  );
  await page.evaluate(() => (document.getElementById('dlg') as any).close());
  // Hit testing, also where the box is and over the whole viewport.
  out.hits = await page.evaluate(() =>
    [
      [0, 0],
      [0.5, 0.5],
      [400, 300],
      [799, 599],
    ].map(
      ([x, y]) =>
        document
          .elementsFromPoint(x!, y!)
          .map((e) => e.id || e.localName)
          .join('/') +
        ' ' +
        (document.getElementById('bar') as any).shadowRoot
          .elementsFromPoint(x!, y!)
          .some((e: any) => e.className === 'scroll-start'),
    ),
  );
  out.size = await page.evaluate(() => {
    const d = document.documentElement;
    return `${d.scrollWidth}x${d.scrollHeight}`;
  });
  out.snapshot = await page.locator('body').ariaSnapshot();
  out.popoversSeen = await page.evaluate(() => [
    document.querySelectorAll(':popover-open').length,
    document.querySelector('mx-top-app-bar:popover-open'),
  ]);
  out.backdrop = await page.evaluate(() => {
    const c = getComputedStyle(
      (document.getElementById('bar') as any).shadowRoot.querySelector(
        '.scroll-start',
      ),
      '::backdrop',
    );
    return `${c.display} ${c.visibility} ${c.backgroundColor} pe:${c.pointerEvents}`;
  });
  if (ENGINE === 'chromium') {
    const cdp = await page.context().newCDPSession(page);
    const { nodes } = (await cdp.send('Accessibility.getFullAXTree')) as any;
    out.ax = nodes
      .filter((n: any) => !n.ignored)
      .map((n: any) => `${n.role?.value}:${n.name?.value ?? ''}`)
      .join(' ');
  }
  console.log(JSON.stringify(out, null, 1));
  await page.context().close();
}
// When a bar connects while something is open or focused.
{
  const page = await open(
    `${D}<input id=i><div id=pop popover><input id=p></div><div id=tall style="height:3000px"></div>`,
  );
  console.log(
    'connects:',
    JSON.stringify(
      await page.evaluate(async () => {
        const w = window as any;
        w.ev = [];
        for (const t of [
          'toggle',
          'beforetoggle',
          'focusin',
          'focusout',
          'scroll',
          'cancel',
          'close',
        ])
          document.addEventListener(t, (e) => w.ev.push(e.type), true);
        const pop: any = document.getElementById('pop');
        pop.showPopover();
        document.getElementById('p')!.focus();
        await new Promise((r) => setTimeout(r, 100));
        w.ev.length = 0;
        const b = document.createElement('mx-top-app-bar');
        b.id = 'bar';
        document.body.prepend(b);
        await new Promise((r) => setTimeout(r, 100));
        const a = [
          document.activeElement!.id,
          pop.matches(':popover-open'),
          w.ev.join(),
        ];
        b.remove();
        await new Promise((r) => setTimeout(r, 100));
        return [
          ...a,
          'removed:',
          document.activeElement!.id,
          pop.matches(':popover-open'),
          w.ev.join(),
        ];
      }),
    ),
  );
  await page.context().close();
}
// Fullscreen.
{
  const page = await open(
    `${D}${BAR}<button id=f style="position:fixed;bottom:0">f</button>`,
  );
  await page.evaluate(() => {
    document.getElementById('f')!.onclick = () =>
      document
        .getElementById('tall')!
        .requestFullscreen()
        .catch(() => {});
    scrollTo(0, 300);
  });
  await settle(page);
  await page.click('#f').catch(() => {});
  await page.waitForTimeout(400);
  const during = await page.evaluate(() => !!document.fullscreenElement);
  const st = await on(page);
  await page.evaluate(() => document.exitFullscreen?.().catch(() => {}));
  await page.waitForTimeout(400);
  console.log(
    'fullscreen',
    during,
    st,
    '| after',
    await on(page),
    await walk(page),
  );
  await page.context().close();
}
// Print.
{
  const page = await open(
    `${D}<style>@media print{#tall{height:100px!important}}</style>${BAR}`,
  );
  await page.evaluate(() => scrollTo(0, 300));
  await settle(page);
  const before = await on(page);
  await page.emulateMedia({ media: 'print' });
  await settle(page);
  const printed = await on(page);
  await page.emulateMedia({ media: 'screen' });
  await settle(page);
  console.log('print media', before, '|', printed, '| back', await walk(page));
  await page.context().close();
}
if (ENGINE === 'chromium')
  for (const shown of [true, false])
    for (const y of [0, 2500]) {
      const page = await open(
        `${D}<style>@media print{#tall{height:2500px!important}}</style>${BAR}`,
      );
      if (!shown) await hide(page);
      await page.evaluate((v) => scrollTo(0, v), y);
      await settle(page);
      const ev: any = await page.evaluate(() => {
        const w = window as any;
        w.st = [];
        addEventListener('beforeprint', () =>
          w.st.push(bar.matches(':state(scrolled)')),
        );
        addEventListener('afterprint', () =>
          w.st.push(bar.matches(':state(scrolled)')),
        );
      });
      const pdf = await page.pdf({ printBackground: true });
      await settle(page);
      console.log(
        'pdf, box shown',
        shown,
        'scrolled to',
        y,
        'pages',
        (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length,
        'bytes',
        pdf.length,
        'states',
        await page.evaluate(() => (window as any).st.join()),
        'then',
        await on(page),
      );
      await page.context().close();
    }
// Pinch zoom, in Chromium by CDP.
if (ENGINE === 'chromium') {
  const page = await open(
    '<!doctype html><meta name=viewport content="width=device-width"><style>body{margin:0}</style>' +
      BAR,
    { isMobile: true, hasTouch: true },
  );
  const cdp = await page.context().newCDPSession(page);
  for (const f of [1, 2, 3]) {
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: f });
    await settle(page);
    console.log(
      'pinch zoom',
      f,
      'visual',
      await page.evaluate(
        () => `${visualViewport!.scale} offsetTop ${visualViewport!.offsetTop}`,
      ),
      await walk(page),
    );
  }
  await cdp.send('Input.synthesizeScrollGesture', {
    x: 100,
    y: 120,
    yDistance: -60,
  } as any);
  await settle(page);
  console.log(
    '  a pan of 60px while zoomed 3',
    await page.evaluate(
      () =>
        `scrollY ${scrollY} visual offsetTop ${visualViewport!.offsetTop} pageTop ${visualViewport!.pageTop}`,
    ),
    await on(page),
  );
  await cdp.send('Input.synthesizeScrollGesture', {
    x: 100,
    y: 60,
    yDistance: 100,
  } as any);
  await settle(page);
  console.log('  overscroll at the start', await on(page));
  await page.context().close();
}
// Forced inertness: the bar in an inert tree, in a closed details, in content-visibility hidden.
for (const [n, h] of [
  ['inert parent', `<div inert style="height:6000px">${BAR}</div>`],
  [
    'inside a closed dialog, then opened',
    `<dialog id=d>${BAR}</dialog><div style="height:4000px"></div>`,
  ],
  [
    'inside a popover, then opened',
    `<div popover id=d>${BAR}</div><div style="height:4000px"></div>`,
  ],
  [
    'content-visibility:hidden parent',
    `<div id=d style="content-visibility:hidden">${BAR}</div><div style="height:4000px"></div>`,
  ],
] as const) {
  const page = await open(D + h);
  const a = await on(page);
  await page.evaluate(() => {
    const d: any = document.getElementById('d');
    if (d) {
      d.showModal
        ? d.showModal()
        : d.popover
          ? d.showPopover()
          : (d.style.contentVisibility = 'visible');
    }
  });
  await settle(page);
  console.log(n, '| before', a, '| after', await walk(page));
  await page.context().close();
}
await browser.close();
