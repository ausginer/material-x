// @ts-nocheck
import { it } from 'vitest';
import { server } from 'vitest/browser';
import '../../src/top-app-bar/top-app-bar.ts';
import '../../src/button/icon-button.ts';
import '../../src/button/link-button.ts';
import '../../src/icon/icon.ts';
import { nextFrame } from '../browser.ts';
it('layout', async () => {
  const out = [];
  const wait = async () => {
    for (let i = 0; i < 4; i++) await nextFrame();
  };
  const mk = (h) => {
    const b = document.createElement('mx-top-app-bar');
    b.innerHTML = h;
    document.body.append(b);
    return b;
  };
  const IB = (s) =>
    `<mx-icon-button slot=${s} color=standard aria-label=x><mx-icon>check</mx-icon></mx-icon-button>`;
  const b = mk(
    `${IB('lead')}<h1>Head</h1><mx-icon slot=trail>check</mx-icon><mx-link-button slot=trail href="#a">Sign in now please</mx-link-button>${IB('trail')}`,
  );
  await wait();
  const box = b.getBoundingClientRect();
  const inner = (e) =>
    e.shadowRoot?.querySelector('.host')?.getBoundingClientRect() ??
    e.getBoundingClientRect();
  const row = [...b.children].map((e) => {
    const r = inner(e);
    return `${e.localName}[${e.slot}] x=${(r.left - box.left).toFixed(1)}..${(r.right - box.left).toFixed(1)} c=${(r.top + r.height / 2 - box.top).toFixed(2)} w=${r.width.toFixed(1)}`;
  });
  out.push(
    `bar x=${box.left} w=${box.width} h=${box.height}; rest top=${box.top}; next sibling after: `,
    ...row,
  );
  const lb = b.querySelector('mx-link-button');
  const w0 = inner(lb).width;
  b.style.inlineSize = '260px';
  await wait();
  out.push(
    `link-button width ${w0.toFixed(1)} -> narrow ${inner(lb).width.toFixed(1)}`,
  );
  b.style.inlineSize = '';
  const after = document.createElement('p');
  after.style.margin = 0;
  after.textContent = 'x';
  b.after(after);
  await wait();
  out.push(
    `flow: next sibling top ${after.getBoundingClientRect().top} vs bar bottom ${b.getBoundingClientRect().bottom}`,
  );
  for (const t of ['mx-icon-button', 'mx-link-button']) {
    const inb = b.querySelector(t);
    const c = document.createElement('div');
    c.append(inb.cloneNode(true));
    document.body.append(c);
    await wait();
    const g = (e) => {
      const i = e.querySelector('mx-icon') ?? e;
      const s = getComputedStyle(i),
        h = getComputedStyle(e.shadowRoot.querySelector('.host'));
      return [
        s.fontSize,
        s.color,
        h.fontSize,
        h.color,
        h.lineHeight,
        h.letterSpacing,
        inner(e).height,
        inner(e).width.toFixed(1),
      ].join(',');
    };
    out.push(
      `${t} in bar ${g(inb)} || alone ${g(c.firstChild)} ${g(inb) === g(c.firstChild) ? 'SAME' : 'DIFF'}`,
    );
  }
  const nested = mk('<div><h1>x</h1></div>');
  await wait();
  out.push(
    `wrapped h1 margin ${getComputedStyle(nested.querySelector('h1')).marginTop} size ${getComputedStyle(nested.querySelector('h1')).fontSize}`,
  );
  throw new Error(`@@ ${server.browser}\n` + out.join('\n'));
});
