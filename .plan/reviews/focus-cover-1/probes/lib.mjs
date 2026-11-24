// Shared by the probes: loads a bundle of the built elements, moves keyboard
// focus, and samples the middle line of each straight edge of an indicator.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const playwright = createRequire(`${process.cwd()}/package.json`)('playwright');
export const DPR = 2;
export async function open(engine, bundle, options = {}) {
  const code = fs.readFileSync(bundle, 'utf8');
  const browser = await playwright[engine].launch();
  const context = await browser.newContext({
    viewport: { width: 700, height: 700 },
    deviceScaleFactor: DPR,
    ...options,
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const load = async (html, css = '') => {
    await page.mouse.move(690, 690);
    await page.setContent(
      `<!doctype html><style>body{margin:40px;font:16px sans-serif}*{transition:none!important;animation:none!important}${css}</style><button id=before>b</button><br><br>${html}<script>${code}</script>`,
    );
    await page.evaluate(
      () =>
        new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r)),
        ),
    );
    await page.waitForTimeout(30);
    await page.evaluate(() => {
      const s = new CSSStyleSheet();
      s.replaceSync(
        '*,*::before,*::after{transition:none!important;animation:none!important}',
      );
      const all = (r) => {
        for (const e of r.querySelectorAll('*'))
          if (e.shadowRoot) {
            e.shadowRoot.adoptedStyleSheets.push(s);
            all(e.shadowRoot);
          }
      };
      all(document);
    });
  };
  const key = async () => {
    await page.evaluate(() => document.querySelector('#before').focus());
    await page.keyboard.press('Shift');
  };
  return { browser, page, load, key, errors };
}
/** Focuses an element found by a path of selectors through shadow roots. Returns the box's geometry. */
export const focus = (page, path) =>
  page.evaluate((p) => {
    let r = document,
      e;
    for (const s of p) {
      e = r.querySelectorAll(s.split('@')[0])[+(s.split('@')[1] ?? 0)];
      r = e.shadowRoot;
    }
    e.focus();
    const box =
      e.shadowRoot?.querySelector('.host') && e.localName !== 'mx-list-item'
        ? e.shadowRoot.querySelector('.host')
        : e;
    const cs = getComputedStyle(box),
      b = box.getBoundingClientRect();
    return {
      visible: box.matches(':focus-visible'),
      x: b.x,
      y: b.y,
      w: b.width,
      h: b.height,
      color: cs.outlineColor,
      width: cs.outlineWidth,
      style: cs.outlineStyle,
      offset: parseFloat(cs.outlineOffset),
      radius: (() => {
        const q = ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'].map(
          (c) => {
            const v = cs[`border${c}Radius`];
            const n = parseFloat(v);
            return v.includes('%')
              ? (Math.min(b.width, b.height) * n) / 100
              : n;
          },
        );
        const f = Math.min(
          1,
          b.width / (q[0] + q[1] || 1),
          b.width / (q[2] + q[3] || 1),
          b.height / (q[0] + q[3] || 1),
          b.height / (q[1] + q[2] || 1),
        );
        return q.map((r) => r * f);
      })(),
      z: cs.zIndex,
    };
  }, path);
export async function pixels(page) {
  const data = (await page.screenshot()).toString('base64');
  return page.evaluate(async (d) => {
    const i = new Image();
    i.src = `data:image/png;base64,${d}`;
    await i.decode();
    const c = document.createElement('canvas');
    c.width = i.width;
    c.height = i.height;
    const x = c.getContext('2d');
    x.drawImage(i, 0, 0);
    window.__img = x.getImageData(0, 0, i.width, i.height);
  }, data);
}
/** Per side, [samples of the indicator's own color, samples]; `at` is the distance outside the box. */
export const ring = (page, g, tolerance = 12) =>
  page.evaluate(
    ([g, tol, dpr]) => {
      const img = window.__img;
      const c = document
        .createElement('canvas')
        .getContext('2d', { willReadFrequently: true });
      c.fillStyle = g.color;
      c.fillRect(0, 0, 1, 1);
      const k = c.getImageData(0, 0, 1, 1).data;
      const d = g.offset + parseFloat(g.width) / 2;
      const px = (x, y) => {
        const i = (Math.floor(y * dpr) * img.width + Math.floor(x * dpr)) * 4;
        return img.data.slice(i, i + 3);
      };
      const out = {},
        seen = {};
      const run = (name, from, to, f) => {
        let n = 0,
          ok = 0;
        const others = new Map();
        for (let t = from + 1; t < to - 1; t += 1 / dpr) {
          const p = px(...f(t));
          n++;
          if (p.every((v, j) => Math.abs(v - k[j]) < tol)) ok++;
          else {
            const s = [...p].join(' ');
            others.set(s, (others.get(s) ?? 0) + 1);
          }
        }
        out[name] = [ok, n];
        if (others.size)
          seen[name] = [...others]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([s, m]) => `${s}×${m}`);
      };
      const [tl, tr, br, bl] = g.radius.map((r) => r);
      run('top', g.x + tl, g.x + g.w - tr, (t) => [t, g.y - d]);
      run('bottom', g.x + bl, g.x + g.w - br, (t) => [t, g.y + g.h + d]);
      run('left', g.y + tl, g.y + g.h - bl, (t) => [g.x - d, t]);
      run('right', g.y + tr, g.y + g.h - br, (t) => [g.x + g.w + d, t]);
      return { out, seen };
    },
    [g, tolerance, DPR],
  );
export const whole = (r) => Object.values(r.out).every(([a, b]) => a === b);
export const text = (r) =>
  Object.entries(r.out)
    .map(([k, [a, b]]) => `${k} ${a}/${b}`)
    .join(' ');
