// Run from packages/material-x:
//   node ../../.plan/top-app-bar-1/probes/mechanisms.mjs <chromium|firefox|webkit>
// Reads, per engine, whether each mechanism's state matches `scrollY > 0` on the
// pages of the feature proof and on a page scrolled sideways, how often its
// script runs over 200 scroll steps, and what a page or a test sees of it.
import { createRequire } from 'node:module';
const type = createRequire(`${process.cwd()}/package.json`)('playwright')[
  process.argv[2]
];

// Each one sets `window.scrolled` and counts its callbacks in `window.calls`.
const io = (rootMargin, threshold, on) => `
  const o = new IntersectionObserver((entries) => {
    calls += 1; const e = entries.at(-1); window.scrolled = ${on};
  }, { root: document, rootMargin: '${rootMargin}', threshold: ${threshold} });
  o.observe(document.documentElement);`;
const MECHANISMS = {
  // The plan's observer, as built at 6dbdcbbd1.
  io: io('1000000px 1000000px -100%', '1e-9', 'e.intersectionRatio > 0'),
  // A box without size in the top layer, whose containing block is the document's
  // initial one. The area is the viewport, with large sides.
  'top-layer box': `
  const s = document.createElement('div'); s.popover = 'manual';
  s.style.cssText = 'position:absolute;inset:0;width:0;height:0;margin:0;border:0;padding:0;visibility:hidden';
  root.append(s); s.showPopover();
  new IntersectionObserver((entries) => {
    calls += 1; window.scrolled = !entries.at(-1).isIntersecting;
  }, { root: document, rootMargin: '0px 1000000px' }).observe(s);`,
  // A scroll-driven animation in the shadow tree, read through its events. Its
  // range starts far below 0, so that a negative overscroll stays inside it.
  'animation events': `
  const sheet = new CSSStyleSheet();
  sheet.replaceSync('@keyframes s{} .a{animation:s linear;animation-timeline:scroll(root y);animation-range:-100000px .5px}');
  root.adoptedStyleSheets = [sheet];
  const s = root.querySelector('slot'); s.className = 'a';
  s.addEventListener('animationstart', (e) => { if (e.target === s) { calls += 1; window.scrolled = false; } });
  s.addEventListener('animationend', (e) => { if (e.target === s) { calls += 1; window.scrolled = true; } });`,
  listener: `
  const read = () => { calls += 1; window.scrolled = document.scrollingElement.scrollTop > 0; };
  document.addEventListener('scroll', read, { passive: true }); requestAnimationFrame(read);`,
};
const PAGES = {
  plain: '',
  'html margin-top 46px': 'html{margin-top:46px}',
  'html relative top 20': 'html{position:relative;top:20px}',
  'html margin-top -20px': 'html{margin-top:-20px}',
  'html margin-top 46px, bar at 46px': 'html{margin-top:46px}#bar{top:46px}',
  'html padding-top 46px': 'html{padding-top:46px}',
  'body absolute': 'body{position:absolute;inset:0 0 auto}',
  'html height 0': 'html{height:0}',
  'html height 100%': 'html{height:100%}',
  'html and body height 100%': 'html,body{height:100%}',
  'html zoom 1.5': 'html{zoom:1.5}',
  'html zoom .67': 'html{zoom:.67}',
  'html transform': 'html{transform:translateY(0)}',
  'html transform 30px': 'html{transform:translateY(30px)}',
  'html contain paint': 'html{contain:paint}',
  'html overflow-x hidden': 'html{overflow-x:hidden}',
  'html display contents': 'html{display:contents}',
  'html absolute': 'html{position:absolute}',
  'html fixed': 'html{position:fixed;inset:0}',
  'html rotated': 'html{rotate:1deg}',
  'animation none for all': '*,*::before,*::after{animation:none!important}',
  'reduced-motion reset':
    '*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important}',
};
const YS = [0, 1, 20, 45, 47, 300, 2000, 1e6, 0, 3000, 0];

const documentOf = (css, code) => `<!doctype html><style>body{margin:0}
  #bar{position:sticky;top:0;height:64px} #tall{height:5000px;width:6000px;position:relative}${css}</style>
  <x-bar id=bar>bar</x-bar><div id=tall></div><script>{
  window.calls = 0; window.scrolled = undefined;
  customElements.define('x-bar', class extends HTMLElement {
    connectedCallback() {
      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML = '<slot style="display:block"></slot>';
      ${code}
    }
  });}</script>`;

const walk = async ([ys, steps]) => {
  const settle = () =>
    new Promise((resolve) => {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setTimeout(resolve, 40)),
      );
    });
  await settle();
  const wrong = [];
  let n = 0;
  const check = (label) => {
    n += 1;
    if (Boolean(window.scrolled) !== scrollY > 0) {
      wrong.push(label);
    }
  };
  check('initial');
  for (const top of ys) {
    scrollTo({ top, left: 0, behavior: 'instant' });
    await settle();
    check(`y${Math.round(scrollY)}`);
  }
  for (const [left, top] of [
    [3000, 300],
    [3000, 0],
    [3000, 1],
  ]) {
    scrollTo({ left, top, behavior: 'instant' });
    await settle();
    check(`x${Math.round(scrollX)}y${Math.round(scrollY)}`);
  }
  scrollTo({ left: 0, top: 0, behavior: 'instant' });
  await settle();
  const before = window.calls;
  for (let y = 10; y <= steps * 10; y += 10) {
    scrollTo({ top: y, behavior: 'instant' });
    await new Promise((resolve) => {
      requestAnimationFrame(resolve);
    });
  }
  await settle();
  return { n, max: scrollMaxOf(), wrong, calls: window.calls - before };
  function scrollMaxOf() {
    const s = document.scrollingElement;
    return s.scrollHeight - s.clientHeight;
  }
};

{
  const browser = await type.launch();
  console.log(`## ${type.name()} ${browser.version()}`);
  const totals = {};
  for (const [mechanism, code] of Object.entries(MECHANISMS)) {
    for (const [name, css] of Object.entries(PAGES)) {
      const page = await browser.newPage({
        viewport: { width: 1280, height: 720 },
      });
      await page.setContent(documentOf(css, code));
      const { n, wrong, calls, max } = await page.evaluate(walk, [
        YS,
        name === 'plain' ? 200 : 0,
      ]);
      totals[mechanism] ??= [0, 0];
      totals[mechanism][0] += wrong.length > 0 ? 1 : 0;
      totals[mechanism][1] += 1;
      if (wrong.length > 0 || name === 'plain') {
        console.log(
          `${mechanism} | ${name} (scrolls ${max}): ${wrong.length} of ${n} wrong ${wrong.join(' ')}${name === 'plain' ? `; calls over 200 steps ${calls}` : ''}`,
        );
      }
      await page.close();
    }
    // Small frame, then a restored position, a hidden bar and a moved bar.
    const page = await browser.newPage({
      viewport: { width: 400, height: 100 },
    });
    await page.setContent(documentOf('body{position:absolute}', code));
    const small = await page.evaluate(walk, [YS, 0]);
    console.log(
      `${mechanism} | body absolute in a 100px viewport: wrong ${small.wrong.join(' ') || 'none'}`,
    );
    await page.setContent(documentOf('', code));
    console.log(
      `${mechanism} | `,
      await page.evaluate(async () => {
        const settle = () =>
          new Promise((resolve) => {
            requestAnimationFrame(() =>
              requestAnimationFrame(() => setTimeout(resolve, 40)),
            );
          });
        const out = {};
        const bar = document.querySelector('#bar');
        scrollTo({ top: 300, behavior: 'instant' });
        await settle();
        out.on = window.scrolled;
        bar.style.display = 'none';
        await settle();
        scrollTo({ top: 0, behavior: 'instant' });
        await settle();
        out.hiddenAt0 = window.scrolled;
        bar.style.display = '';
        await settle();
        out.shownAt0 = window.scrolled;
        bar.style.display = 'none';
        scrollTo({ top: 300, behavior: 'instant' });
        await settle();
        bar.style.display = '';
        await settle();
        out.shownAt300 = window.scrolled;
        scrollTo({ top: 0, behavior: 'instant' });
        await settle();
        out.animations = document.getAnimations().length;
        out.finishedIdiom = await Promise.race([
          Promise.allSettled(
            document.getAnimations().map((a) => a.finished),
          ).then(() => 'settles'),
          new Promise((resolve) => {
            setTimeout(() => resolve('hangs'), 500);
          }),
        ]);
        for (const a of document.getAnimations()) {
          try {
            a.finish();
          } catch (error) {
            out.finishThrows = String(error).slice(0, 60);
          }
        }
        await settle();
        out.afterFinishAt0 = window.scrolled;
        return out;
      }),
    );
    await page.setContent(documentOf('', code));
    await page.waitForTimeout(200);
    const at0 = await page.evaluate(() => window.calls);
    await page.screenshot({ animations: 'disabled' });
    console.log(
      `${mechanism} | after a screenshot with animations disabled at 0, then at 300, then at 0:`,
      await page.evaluate(async (before) => {
        const settle = () =>
          new Promise((resolve) => {
            setTimeout(resolve, 150);
          });
        await settle();
        const out = [window.scrolled, `${window.calls - before} calls`];
        for (const top of [300, 0]) {
          scrollTo({ top, behavior: 'instant' });
          await settle();
          out.push(window.scrolled);
        }
        return out.join(', ');
      }, at0),
    );
    await page.close();
  }
  console.log('pages with a wrong state, of all:', JSON.stringify(totals));
  await browser.close();
}
