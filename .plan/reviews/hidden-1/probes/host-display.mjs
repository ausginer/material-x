// Every `display` that a built element's own sheets give its host or a slotted
// element, the specificity of its selector, and the place of the hidden rule.
// Run from packages/material-x: node host-display.mjs <head.js>
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const { chromium } = createRequire(`${process.cwd()}/package.json`)(
  'playwright',
);
const b = await chromium.launch();
const p = await b.newPage();
await p.setContent(`<script>${readFileSync(process.argv[2], 'utf8')}</script>`);
const r = await p.evaluate(async () => {
  const out = [];
  for (const tag of TAGS) {
    const e = document.createElement(tag);
    e.textContent = 'x';
    document.body.append(e);
    await new Promise((f) => setTimeout(f, 20));
    const sheets = e.shadowRoot.adoptedStyleSheets;
    let at = -1;
    const found = [];
    const walk = (rules, parent, n) => {
      for (const r of rules) {
        const sel = r.selectorText
          ? parent && r.selectorText.includes('&')
            ? r.selectorText.replaceAll('&', `:is(${parent})`)
            : r.selectorText
          : parent;
        const d = r.style?.display;
        if (sel?.includes('[hidden]')) at = n;
        if (d && /:host|::slotted/.test(sel))
          found.push(
            `${sel.replace(/\s+/g, ' ')} {${d}${r.style.getPropertyPriority('display') ? ' !important' : ''}} sheet ${n}`,
          );
        if (r.cssRules) walk(r.cssRules, sel, n);
      }
    };
    sheets.forEach((s, n) => walk(s.cssRules, '', n));
    out.push(
      `${tag}: ${sheets.length} sheets, the hidden rule in ${at}; ${found.join(' | ')}`,
    );
  }
  return out;
});
console.log(r.join('\n'));
await b.close();
