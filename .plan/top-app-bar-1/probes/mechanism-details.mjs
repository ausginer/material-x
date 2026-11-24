// Run from packages/material-x:
//   node ../../.plan/top-app-bar-1/probes/mechanism-details.mjs <chromium|firefox|webkit>
// What the top-layer box and the scroll-driven animation's events do in the cases
// that the plan's rows cover: frames, a reload at a restored position, disconnects, a document that
// shrinks, a bar in its own scroll container, reduced motion, slotted content's
// own animations, fractional positions, and a screenshot with animations
// disabled. Chromium also counts the work of 1000 scroll steps.
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
const type = createRequire(`${process.cwd()}/package.json`)('playwright')[
  process.argv[2]
];

const bar = (mechanism) => `<script>
window.log = []; window.frames_ = 0;
customElements.define('x-bar', class extends HTMLElement {
  #i = this.attachInternals();
  set(on) { log.push(on); this.#i.states[on ? 'add' : 'delete']('scrolled'); }
  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = '<slot style="display:block"></slot>';
    const s = root.querySelector('slot');
    if ('${mechanism}' === 'animation') {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync('@keyframes s{} slot{animation:s linear;animation-timeline:scroll(root y);animation-range:-100000px .5px}');
      root.adoptedStyleSheets = [sheet];
      s.addEventListener('animationstart', (e) => { if (e.target === s) this.set(false); });
      s.addEventListener('animationend', (e) => { if (e.target === s) this.set(true); });
      s.addEventListener('animationcancel', (e) => { if (e.target === s) log.push('cancel'); });
    }
    if ('${mechanism}' === 'observer') {
      new IntersectionObserver((entries) => this.set(entries.at(-1).intersectionRatio > 0),
        { root: document, rootMargin: '1000000px 1000000px -100%', threshold: 1e-9 }).observe(document.documentElement);
    }
    if ('${mechanism}' === 'box') {
      const b = document.createElement('div'); b.popover = 'manual';
      b.style.cssText = 'position:absolute;inset:0;width:0;height:0;margin:0;border:0;padding:0;visibility:hidden';
      root.append(b); this.box = b;
      this.observer = new IntersectionObserver((entries) => this.set(!entries.at(-1).isIntersecting), { root: document, rootMargin: '0px 1000000px' });
    }
    if ('${mechanism}' === 'listener') {
      let on = false;
      document.addEventListener('scroll', () => { const v = document.scrollingElement.scrollTop > 0; if (v !== on) this.set(on = v); }, { passive: true });
    }
  }
  connectedCallback() { if (this.box) { this.box.showPopover(); this.observer.observe(this.box); } }
  disconnectedCallback() { this.observer?.disconnect(); }
});</script>`;
const doc = (mechanism, css = '', inner = 'bar') =>
  `<!doctype html><style>body{margin:0}x-bar{display:block;position:sticky;top:0;height:64px;background:rgb(0,0,255)}x-bar:state(scrolled){background:rgb(255,0,0)}#tall{height:5000px}${css}</style><x-bar id=bar>${inner}</x-bar><div id=tall></div>${bar(mechanism)}`;

const settle = (target) =>
  target.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() =>
          requestAnimationFrame(() => setTimeout(resolve, 80)),
        );
      }),
  );
const at = async (target, top) => {
  await target.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), top);
  await settle(target);
  return target.evaluate(
    () =>
      `${Math.round(scrollY * 100) / 100}:${document.querySelector('#bar').matches(':state(scrolled)') ? 'on' : 'off'}`,
  );
};
const walk = async (target, ys = [0, 1, 0, 300, 2000, 0]) => {
  const out = [];
  for (const y of ys) {
    out.push(await at(target, y));
  }
  return out.join(' ');
};

const browser = await type.launch();
console.log(`## ${type.name()} ${browser.version()}`);
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
});
const page = await context.newPage();
const load = async (html) => {
  await page.goto('about:blank');
  await page.setContent(html);
  await settle(page);
};

for (const M of ['box', 'animation']) {
  console.log(`# ${M}`);
  await load(doc(M));
  console.log('top level:', await walk(page));
  console.log(
    'fractional positions:',
    await walk(page, [0, 0.25, 0.4, 0.5, 0.6, 0.75, 1, 0]),
  );
  console.log(
    'calls of each state in the walk:',
    await page.evaluate(() => log.length),
  );

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await load(doc(M));
  console.log('reduced motion:', await walk(page));
  await page.emulateMedia({ reducedMotion: null });

  await load(
    '<style>body{margin:0;height:3000px}</style><iframe style="width:400px;height:400px;margin-top:100px"></iframe>',
  );
  const frame = page.frames()[1];
  await frame.setContent(doc(M));
  console.log('frame:', await walk(frame));
  await page.evaluate(() => scrollTo(0, 200));
  console.log('frame, its page scrolled:', await walk(frame));

  await load(doc(M, '#tall{height:100px}'));
  console.log('page that does not scroll:', await walk(page, [0, 100]));
  await page.evaluate(() => {
    document.querySelector('#tall').style.height = '5000px';
  });
  console.log('  then grows:', await walk(page));
  await at(page, 2000);
  await page.evaluate(() => {
    document.querySelector('#tall').style.height = '100px';
  });
  await settle(page);
  console.log(
    '  then shrinks while scrolled:',
    await page.evaluate(
      () =>
        `${scrollY}:${document.querySelector('#bar').matches(':state(scrolled)')}`,
    ),
  );

  await load(doc(M));
  console.log('disconnect at 300:', await at(page, 300));
  await page.evaluate(() => {
    window.held = document.querySelector('#bar');
    held.remove();
  });
  await page.evaluate(() => scrollTo(0, 0));
  await settle(page);
  await page.evaluate(() => document.body.prepend(held));
  await settle(page);
  console.log('  reconnect at 0:', await at(page, 0));
  await page.evaluate(() => held.remove());
  await page.evaluate(() => scrollTo(0, 300));
  await settle(page);
  await page.evaluate(() => document.body.prepend(held));
  await settle(page);
  console.log(
    '  reconnect at 300:',
    await page.evaluate(() => `${scrollY}:${held.matches(':state(scrolled)')}`),
  );

  await load(
    `<!doctype html>${bar(M)}<style>body{margin:0}x-bar{display:block;position:sticky;top:0;height:64px}</style><div id=s style="height:300px;overflow:auto"><x-bar id=bar></x-bar><div style="height:2000px"></div></div><div style="height:3000px"></div>`,
  );
  await page.evaluate(() => {
    document.querySelector('#s').scrollTop = 200;
  });
  await settle(page);
  console.log(
    'in its own scroll container, scrolled:',
    await page.evaluate(() => log.join()),
  );

  await load(
    doc(
      M,
      '@keyframes s{from{opacity:0}} #bar b{display:block;animation:s 50ms 3}',
      '<b>x</b>',
    ),
  );
  await page.waitForTimeout(400);
  console.log(
    "slotted content's own animation:",
    await page.evaluate(() => `${log.join()}`),
    await walk(page),
  );

  await load(doc(M));
  console.log(
    'visible to a page: document.getAnimations()',
    await page.evaluate(
      () =>
        `${document.getAnimations().length}, with subtree from the bar ${document.querySelector('#bar').getAnimations({ subtree: true }).length}, the shadow root's ${document.querySelector('#bar').shadowRoot.getAnimations().length}`,
    ),
  );
  for (const y of [0, 300]) {
    await at(page, y);
    for (const animations of ['disabled', 'allow']) {
      const shot = await page.screenshot({
        animations,
        clip: { x: 600, y: 40, width: 1, height: 1 },
      });
      const color = await page.evaluate(async (data) => {
        const image = new Image();
        image.src = `data:image/png;base64,${data}`;
        await image.decode();
        const canvas = document.createElement('canvas');
        const c = canvas.getContext('2d');
        c.drawImage(image, 0, 0);
        return [...c.getImageData(0, 0, 1, 1).data].slice(0, 3).join();
      }, shot.toString('base64'));
      await settle(page);
      console.log(
        `screenshot at ${y}, animations ${animations}: the bar is ${color}; then`,
        await page.evaluate(() =>
          document.querySelector('#bar').matches(':state(scrolled)'),
        ),
      );
    }
  }

  if (M === 'box') {
    await load(
      '<!doctype html><input id=i autofocus><div id=p popover>p</div><dialog id=d>d<button>b</button></dialog>' +
        doc('none'),
    );
    console.log(
      'page with a focused field and an open auto popover, when a bar connects:',
      await page.evaluate(async (script) => {
        const events = [];
        for (const n of ['beforetoggle', 'toggle', 'focusin', 'scroll']) {
          document.addEventListener(
            n,
            (e) => events.push(`${n}:${e.target.localName ?? 'document'}`),
            true,
          );
        }
        document.querySelector('#i').focus();
        document.querySelector('#p').showPopover();
        await new Promise((r) => {
          setTimeout(r, 50);
        });
        events.length = 0;
        const f = document.createElement('div');
        f.innerHTML = script;
        const code = f
          .querySelector('script')
          .textContent.replace("'x-bar'", "'x-bar2'");
        const el = document.createElement('script');
        el.textContent = code;
        document.head.append(el);
        const x = document.createElement('x-bar2');
        x.style.cssText = 'display:block;height:64px';
        document.body.prepend(x);
        await new Promise((r) => {
          setTimeout(r, 100);
        });
        const out = {
          focused: document.activeElement.id,
          popoverOpen: document.querySelector('#p').matches(':popover-open'),
          events: events.join() || 'none',
          boxOpen: x.box.matches(':popover-open'),
          size: `${document.documentElement.scrollWidth}x${document.documentElement.scrollHeight}`,
          hit: document.elementFromPoint(0, 0).localName,
        };
        document.querySelector('#d').showModal();
        out.modalFocus = document.activeElement.localName;
        document.querySelector('#d').close();
        const before = x.matches(':state(scrolled)');
        x.style.display = 'none';
        await new Promise((r) => {
          setTimeout(r, 100);
        });
        x.style.display = 'block';
        await new Promise((r) => {
          setTimeout(r, 100);
        });
        out.hideShowAt0 = `${before} ${x.matches(':state(scrolled)')}`;
        const h = document.createElement('x-bar2');
        h.hidden = true;
        h.style.display = 'none';
        document.body.prepend(h);
        await new Promise((r) => {
          setTimeout(r, 100);
        });
        out.connectedHidden = h.matches(':state(scrolled)');
        h.style.display = 'block';
        await new Promise((r) => {
          setTimeout(r, 100);
        });
        out.thenShownAt0 = h.matches(':state(scrolled)');
        return out;
      }, bar('box')),
    );
  }

  // A reload that restores the scroll position needs a real origin.
  const server = createServer((_, response) => {
    response.setHeader('content-type', 'text/html');
    response.end(doc(M));
  }).listen(0);
  await page.goto(`http://localhost:${server.address().port}/`);
  await at(page, 1500);
  await page.reload();
  await page.waitForTimeout(500);
  console.log(
    'reload:',
    await page.evaluate(
      () =>
        `${scrollY}:${document.querySelector('#bar').matches(':state(scrolled)')}`,
    ),
  );
  server.close();
}

if (type.name() === 'chromium') {
  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');
  const metrics = async () =>
    Object.fromEntries(
      (await cdp.send('Performance.getMetrics')).metrics.map((m) => [
        m.name,
        m.value,
      ]),
    );
  for (let round = 0; round < 3; round += 1) {
    for (const mechanism of [
      'none',
      'observer',
      'box',
      'animation',
      'listener',
    ]) {
      await load(doc(mechanism));
      await at(page, 300);
      const before = await metrics();
      await page.evaluate(async () => {
        for (let i = 1; i <= 1000; i += 1) {
          scrollTo({ top: 300 + (i % 1000) * 3, behavior: 'instant' });
          await new Promise((resolve) => {
            requestAnimationFrame(resolve);
          });
        }
      });
      const after = await metrics();
      const d = (k) => after[k] - before[k];
      console.log(
        `1000 steps, ${mechanism}: style recalcs ${d('RecalcStyleCount')}, layouts ${d('LayoutCount')}, script ${(d('ScriptDuration') * 1000).toFixed(1)}ms, style ${(d('RecalcStyleDuration') * 1000).toFixed(1)}ms, task ${(d('TaskDuration') * 1000).toFixed(0)}ms`,
      );
    }
  }
}
await browser.close();
