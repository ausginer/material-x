// Chromium in forced colors: what the host's own background computes to with
// no rule, with CanvasText, and with CanvasText and forced-color-adjust: none.
// Run: node .plan/divider-1/probes/simple-box-forced-colors.mjs
import { createRequire } from 'node:module';
const require = createRequire(
  new URL('../../../packages/material-x/package.json', import.meta.url),
);
const { chromium } = require('playwright');
const b = await chromium.launch();
const p = await b.newPage();
await p.emulateMedia({ forcedColors: 'active' });
await p.setContent(
  '<div id="a"></div><div id="b"></div><div id="c"></div><div id="t" style="color:CanvasText"></div><div id="cv" style="color:Canvas"></div>',
);
const r = await p.evaluate(() => {
  const set = (id, css) => {
    const h = document.getElementById(id);
    const s = new CSSStyleSheet();
    s.replaceSync(css);
    h.attachShadow({ mode: 'open' }).adoptedStyleSheets = [s];
    return getComputedStyle(h).backgroundColor;
  };
  return {
    'token color, no rule': set(
      'a',
      ':host{display:block;block-size:1px;background-color:rgb(202,196,208)}',
    ),
    'CanvasText, no forced-color-adjust': set(
      'b',
      ':host{display:block;block-size:1px;background-color:rgb(202,196,208)}@media (forced-colors:active){:host{background-color:CanvasText}}',
    ),
    'CanvasText, forced-color-adjust none': set(
      'c',
      ':host{display:block;block-size:1px;background-color:rgb(202,196,208)}@media (forced-colors:active){:host{forced-color-adjust:none;background-color:CanvasText}}',
    ),
    CanvasText: getComputedStyle(document.getElementById('t')).color,
    Canvas: getComputedStyle(document.getElementById('cv')).color,
  };
});
console.log(JSON.stringify(r, null, 1));
await b.close();
