// @ts-nocheck
import { it, onTestFinished } from 'vitest';
import { server } from 'vitest/browser';
import '../../src/button/icon-button.ts';
import '../../src/button/link-button.ts';
import '../../src/button/button.ts';
import '../../src/button/split-button.ts';
import '../../src/icon/icon.ts';
import '../../src/checkbox/checkbox.ts';
import '../../src/radio/radio.ts';
import '../../src/fab/fab.ts';
import '../../src/text-field/text-field.ts';
import '../../src/list/list.ts';
import '../../src/list/list-item.ts';
import '../../src/button-group/button-group.ts';
import '../../src/top-app-bar/top-app-bar.ts';
import { nextFrame } from '../browser.ts';

const CASES = [
  ...['', 'standard', 'filled', 'tonal', 'outlined'].flatMap((c) =>
    ['', 'disabled'].map(
      (d) =>
        `<mx-icon-button ${c ? `color="${c}"` : ''} ${d} aria-label=x><mx-icon>check</mx-icon></mx-icon-button>`,
    ),
  ),
  ...['', 'outlined', 'text', 'tonal', 'elevated'].flatMap((c) =>
    ['mx-button', 'mx-link-button'].map(
      (t) => `<${t} href="#a" ${c ? `color="${c}"` : ''}>Text</${t}>`,
    ),
  ),
  `<mx-checkbox></mx-checkbox>`,
  `<mx-checkbox checked></mx-checkbox>`,
  `<mx-checkbox disabled></mx-checkbox>`,
  `<mx-radio></mx-radio>`,
  `<mx-fab><mx-icon slot=icon>check</mx-icon></mx-fab>`,
  `<mx-text-field label=a></mx-text-field>`,
  `<mx-text-field variant=outlined label=a></mx-text-field>`,
  `<mx-text-field outlined label=a></mx-text-field>`,
  `<mx-list><mx-list-item>a</mx-list-item></mx-list>`,
  `<mx-list-item>a</mx-list-item>`,
  `<mx-icon>check</mx-icon>`,
  `<mx-button-group><mx-button>a</mx-button><mx-button>b</mx-button></mx-button-group>`,
  `<mx-button-group connected><mx-button>a</mx-button><mx-button>b</mx-button></mx-button-group>`,
];
function* boxes(root, path = '') {
  yield [path || root.localName, root];
  for (const [i, c] of [...(root.shadowRoot?.children ?? [])].entries())
    yield* boxes(c, `${path}/#${c.localName}.${c.className}`);
  for (const [i, c] of [...root.children].entries())
    yield* boxes(c, `${path}/${c.localName}${i}`);
}
function read(root) {
  const out = {};
  for (const [p, el] of boxes(root))
    for (const ps of [undefined, '::before', '::after']) {
      const s = getComputedStyle(el, ps);
      for (const k of s)
        if (!k.startsWith('--'))
          out[`${p}${ps ?? ''}|${k}`] = s.getPropertyValue(k);
    }
  return out;
}
it('inherit', async () => {
  const lines = [];
  for (const slot of ['lead', 'trail', ''])
    for (const html of CASES) {
      const bar = document.createElement('mx-top-app-bar');
      bar.style.setProperty(
        '--md-top-app-bar-container-color',
        'rgb(0, 0, 200)',
      );
      const names = [];
      for (const sheet of bar.shadowRoot.adoptedStyleSheets)
        for (const r of sheet.cssRules)
          if (r.selectorText === ':host')
            for (const p of r.style) if (p.startsWith('--')) names.push(p);
      const make = async (reset) => {
        const w = document.createElement('div');
        if (slot) w.slot = slot;
        if (reset) for (const n of names) w.style.setProperty(n, 'initial');
        w.innerHTML = html;
        bar.replaceChildren(w);
        document.body.append(bar);
        await nextFrame();
        await nextFrame();
        await nextFrame();
        for (const a of document.getAnimations()) {
          try {
            a.finish();
          } catch {}
        }
        await nextFrame();
        return read(w.firstElementChild);
      };
      const a = await make(false),
        b = await make(true);
      const diff = Object.keys(a).filter(
        (k) => a[k] !== b[k] && !/perspective-origin|transform-origin/.test(k),
      );
      if (diff.length)
        lines.push(
          `${slot || 'default'} ${html}\n     ` +
            diff
              .slice(0, 8)
              .map((k) => `${k}: ${b[k]} -> ${a[k]}`)
              .join('\n     ') +
            (diff.length > 8 ? `\n     +${diff.length - 8}` : ''),
        );
      bar.remove();
    }
  throw new Error(
    `@@ ${server.browser} vars\n` + (lines.join('\n') || 'no differences'),
  );
}, 120000);
