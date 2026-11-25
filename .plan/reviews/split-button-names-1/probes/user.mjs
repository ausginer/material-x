// A split button as a page's user has it: activation, focus, the press and the
// look while disabled, on the built head; and its enabled pixels against main.
// Run from packages/material-x: node user.mjs <head.js> <main.js> [engine,...]
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const playwright = createRequire(`${process.cwd()}/package.json`)('playwright');
const [head, main] = process.argv
  .slice(2, 4)
  .map((f) => readFileSync(f, 'utf8'));
const engines = (process.argv[4] ?? 'chromium,firefox,webkit').split(',');
const COLORS = ['', 'outlined', 'elevated', 'text', 'tonal'];
const SIZES = ['', 'xsmall', 'medium', 'large', 'xlarge'];
const SHAPES = ['', 'square'];
const at = (o) =>
  Object.entries(o)
    .filter(([, v]) => v !== '')
    .map(([k, v]) => (v === true ? k : `${k}="${v}"`))
    .join(' ');
async function open(browser, code, html, context = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 1000, height: 400 },
    ...context,
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  await page.setContent(
    `<!doctype html><style>body{margin:30px}*{caret-color:transparent}</style><button id="before">B</button><div id="r" style="padding:20px">${html}</div><button id="after">A</button><script>${code}</script>`,
  );
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    window.log = [];
    const el = document.querySelector(
      '#r > mx-split-button, #r form > mx-split-button, #r fieldset > mx-split-button',
    );
    window.el = el;
    if (!el) return;
    for (const t of ['click', 'secondaryaction'])
      el.addEventListener(t, () => window.log.push(t));
    document.addEventListener('submit', (e) => {
      e.preventDefault();
      window.log.push('submit');
    });
    window.member = (p) => el.shadowRoot.querySelector(`[part=${p}]`);
    window.native = (p) => window.member(p).shadowRoot.querySelector('.host');
    window.deep = () => {
      let a = document.activeElement;
      const r = [];
      while (a) {
        r.push(a.id || a.getAttribute('part') || a.localName);
        a = a.shadowRoot?.activeElement;
      }
      return r.join('>');
    };
    window.look = (p) => {
      const n = window.native(p);
      const s = getComputedStyle(n);
      const i = window.member(p).querySelector('mx-icon');
      const pick = (x) =>
        [
          x.backgroundColor,
          x.color,
          x.borderRadius,
          x.boxShadow,
          x.outline,
          x.opacity,
          x.cursor,
        ].join(' ~ ');
      return `${pick(s)}${i ? ` ~ icon ${getComputedStyle(i).transform}` : ''}`;
    };
  });
  return { page, ctx };
}
const take = (page) =>
  page.evaluate(() => {
    const r = window.log.join('+') || 'none';
    window.log.length = 0;
    return r;
  });
const box = (page, p) =>
  page.evaluate((q) => {
    const r = window.native(q).getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  }, p);
for (const engine of engines) {
  const browser = await playwright[engine].launch();
  console.log(`\n# ${engine} ${browser.version()}`);
  const D =
    '<mx-split-button secondarylabel="More" disabled>Save</mx-split-button>';
  for (const [name, html] of [
    ['disabled', D],
    ['disabled, open', D.replace('disabled', 'disabled open')],
    ['disabled, in a form', `<form>${D}</form>`],
    ['enabled', D.replace(' disabled', '')],
  ]) {
    const { page, ctx } = await open(browser, head, html);
    const out = [];
    for (const p of ['leading', 'trailing']) {
      const b = await box(page, p);
      for (const [w, x, y] of [
        ['center', 0.5, 0.5],
        ['edge', 0.08, 0.5],
        ['top', 0.5, 0.1],
      ]) {
        await page.mouse.click(b.x + b.w * x, b.y + b.h * y);
        out.push(`${p} ${w} ${await take(page)}`);
      }
      await page.mouse.dblclick(b.x + b.w / 2, b.y + b.h / 2);
      out.push(`${p} dblclick ${await take(page)}`);
      const l0 = await page.evaluate((q) => window.look(q), p);
      await page.mouse.move(b.x + b.w / 2, b.y + b.h / 2);
      await page.waitForTimeout(700);
      const l1 = await page.evaluate((q) => window.look(q), p);
      await page.mouse.down();
      await page.waitForTimeout(700);
      const l2 = await page.evaluate((q) => window.look(q), p);
      await page.mouse.up();
      await page.mouse.move(5, 5);
      await page.waitForTimeout(700);
      const l3 = await page.evaluate((q) => window.look(q), p);
      await take(page);
      out.push(
        `${p} rest   ${l0}`,
        `${p} hover  ${l1 === l0 ? '=' : l1}`,
        `${p} press  ${l2 === l0 ? '=' : l2}`,
        `${p} after  ${l3 === l0 ? '=' : l3}`,
      );
      await page.evaluate((q) => {
        window.member(q).focus();
      }, p);
      out.push(
        `${p} member.focus() then ${await page.evaluate(() => window.deep())}`,
      );
      await page.keyboard.press('Enter');
      await page.keyboard.press('Space');
      out.push(`${p} keys ${await take(page)}`);
      await page.evaluate((q) => {
        document.activeElement?.blur?.();
        window.native(q).click();
      }, p);
      out.push(`${p} native.click() ${await take(page)}`);
    }
    await page.evaluate(() => {
      document.activeElement?.blur();
      window.el.focus();
    });
    out.push(`host.focus() then ${await page.evaluate(() => window.deep())}`);
    await page.evaluate(() => window.el.click());
    out.push(`host.click() ${await take(page)}`);
    await page.evaluate(() => document.querySelector('#before').focus());
    const stops = [];
    for (let i = 0; i < 3; i += 1) {
      await page.keyboard.press(engine === 'webkit' ? 'Alt+Tab' : 'Tab');
      stops.push(await page.evaluate(() => window.deep()));
    }
    out.push(`Tab: ${stops.join(', ')}`);
    console.log(`\n## ${name}\n  ${out.join('\n  ')}`);
    await ctx.close();
  }
  {
    // touch
    const { page, ctx } = await open(
      browser,
      head,
      D,
      engine === 'firefox' ? { hasTouch: true } : { hasTouch: true },
    );
    const out = [];
    for (const p of ['leading', 'trailing']) {
      const b = await box(page, p);
      await page.touchscreen.tap(b.x + b.w / 2, b.y + b.h / 2);
      await page.waitForTimeout(100);
      out.push(`${p} ${await take(page)}`);
    }
    console.log(`\n## disabled, touch: ${out.join(', ')}`);
    await ctx.close();
  }
  {
    // changes while focused, removed and moved
    const { page, ctx } = await open(browser, head, D.replace(' disabled', ''));
    const out = [];
    for (const p of ['leading', 'trailing']) {
      await page.evaluate((q) => window.member(q).focus(), p);
      out.push(`${p} focused: ${await page.evaluate(() => window.deep())}`);
      await page.evaluate(() => {
        window.el.disabled = true;
      });
      await page.waitForTimeout(100);
      await page.keyboard.press('Enter');
      out.push(
        `disabled then Enter: ${await take(page)} at ${await page.evaluate(() => window.deep())}`,
      );
      await page.evaluate(() => {
        window.el.disabled = false;
      });
      await page.waitForTimeout(100);
      await page.evaluate((q) => window.member(q).focus(), p);
      await page.keyboard.press('Enter');
      out.push(`enabled, focused, Enter: ${await take(page)}`);
    }
    // a page's own busy handler: disable in secondaryaction
    await page.evaluate(() => {
      window.el.addEventListener(
        'secondaryaction',
        () => {
          window.el.disabled = true;
        },
        { once: true },
      );
    });
    const b = await box(page, 'trailing');
    await page.mouse.dblclick(b.x + b.w / 2, b.y + b.h / 2);
    out.push(`double click, disabled by the first event: ${await take(page)}`);
    out.push(
      await page.evaluate(async () => {
        const el = window.el;
        const s = () =>
          ['leading', 'trailing']
            .map(
              (p) =>
                `${window.native(p).disabled}/${window.member(p).matches(':state(disabled)')}`,
            )
            .join(',');
        const r = [];
        const par = el.parentNode;
        el.remove();
        el.disabled = false;
        par.append(el);
        await 0;
        r.push(`enabled while away ${s()}`);
        el.remove();
        el.disabled = true;
        el.secondarylabel = 'Away';
        el.open = true;
        par.append(el);
        await new Promise((f) => setTimeout(f, 50));
        r.push(
          `disabled while away ${s()}, ${native('trailing').ariaLabel}, ${native('trailing').ariaExpanded}`,
        );
        el.toggleAttribute('disabled');
        r.push(`toggled, at once ${s()}`);
        el.size = 'large';
        el.color = 'tonal';
        el.disabled = true;
        r.push(
          `with size and color ${s()} ${member('leading').matches(':state(large)')} ${member('trailing').matches(':state(tonal)')}`,
        );
        const made = document.createElement('mx-split-button');
        made.disabled = true;
        made.secondarylabel = 'Made';
        made.open = true;
        par.append(made);
        await new Promise((f) => setTimeout(f, 50));
        const n = made.shadowRoot
          .querySelector('[part=trailing]')
          .shadowRoot.querySelector('.host');
        r.push(`made by script ${n.disabled} ${n.ariaLabel} ${n.ariaExpanded}`);
        const c = made.cloneNode(true);
        par.append(c);
        await new Promise((f) => setTimeout(f, 50));
        const m = c.shadowRoot
          .querySelector('[part=trailing]')
          .shadowRoot.querySelector('.host');
        r.push(`cloned ${m.disabled} ${m.ariaLabel} ${m.ariaExpanded}`);
        c.secondarylabel = '';
        c.removeAttribute('open');
        await new Promise((f) => setTimeout(f, 50));
        r.push(
          `empty label ${JSON.stringify(m.getAttribute('aria-label'))} ${m.ariaExpanded}`,
        );
        c.innerHTML = 'X';
        r.push(`text ${c.secondarylabel}`);
        return r.join('; ');
      }),
    );
    console.log(`\n## changes\n  ${out.join('\n  ')}`);
    await ctx.close();
  }
  {
    // the disabled look of every color, size and shape against the buttons alone
    const { page, ctx } = await open(browser, head, '');
    const r = await page.evaluate(
      async ([C, Z, H]) => {
        const root = document.querySelector('#r');
        const bad = [];
        let n = 0;
        const settle = async () => {
          await new Promise((f) => setTimeout(f, 30));
        };
        const pick = (e) => {
          const s = getComputedStyle(e.shadowRoot.querySelector('.host'));
          return [
            s.backgroundColor,
            s.color,
            s.boxShadow,
            s.borderColor,
            s.outlineColor,
            s.opacity,
            s.cursor,
          ].join(' ~ ');
        };
        for (const color of C)
          for (const size of Z)
            for (const shape of H)
              for (const open of [false, true]) {
                const set = (e) => {
                  if (color) e.color = color;
                  if (size) e.size = size;
                  if (shape) e.shape = shape;
                  e.disabled = true;
                  return e;
                };
                const s = set(document.createElement('mx-split-button'));
                s.textContent = 'Save';
                s.open = open;
                const b = set(document.createElement('mx-button'));
                b.textContent = 'Save';
                const i = set(document.createElement('mx-icon-button'));
                const ic = document.createElement('mx-icon');
                ic.textContent = 'x';
                i.append(ic);
                root.replaceChildren(s, b, i);
                await settle();
                for (const [p, o] of [
                  ['leading', b],
                  ['trailing', i],
                ]) {
                  n += 1;
                  const x = pick(s.shadowRoot.querySelector(`[part=${p}]`)),
                    y = pick(o);
                  if (x !== y)
                    bad.push(
                      `${color || 'filled'} ${size || 'small'} ${shape || 'round'} ${open ? 'open' : ''} ${p}: ${x} | ${y}`,
                    );
                }
              }
        return { n, bad };
      },
      [COLORS, SIZES, SHAPES],
    );
    console.log(
      `\n## disabled look: ${r.n} compared, ${r.bad.length} differ${r.bad
        .slice(0, 12)
        .map((x) => `\n  ${x}`)
        .join('')}`,
    );
    await ctx.close();
  }
  {
    // pixels, main against head
    let n = 0;
    const differ = [];
    const changed = [];
    const pages = [
      await open(browser, main, ''),
      await open(browser, head, ''),
    ];
    const shot = async (h) => {
      const s = [];
      for (const { page } of pages) {
        await page.evaluate((x) => {
          document.querySelector('#r').innerHTML = x;
        }, h);
        await page.waitForTimeout(60);
        await page.evaluate(() =>
          Promise.all(
            document.getAnimations().map((a) => a.finished.catch(() => {})),
          ),
        );
        s.push(await page.screenshot({ animations: 'disabled' }));
      }
      return s[0].equals(s[1]);
    };
    for (const color of COLORS)
      for (const size of SIZES)
        for (const shape of SHAPES)
          for (const open of ['', true])
            for (const icon of ['', '<mx-icon slot="icon">edit</mx-icon>']) {
              const a = at({ color, size, shape, open });
              n += 1;
              if (
                !(await shot(
                  `<mx-split-button ${a}>${icon}Save</mx-split-button>`,
                ))
              )
                differ.push(a + icon);
              if (
                !icon &&
                !(await shot(
                  `<mx-split-button disabled ${a}>Save</mx-split-button>`,
                ))
              )
                changed.push(a);
            }
    console.log(
      `\n## pixels against main: ${n} enabled, ${differ.length} differ ${differ.join(' | ')}; disabled (control): ${changed.length} of ${n / 2} differ`,
    );
    for (const { ctx } of pages) await ctx.close();
  }
  await browser.close();
}
