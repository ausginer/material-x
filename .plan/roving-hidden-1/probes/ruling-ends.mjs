// RF-143, the ruling of the feature proof. Run from packages/material-x: node ruling-ends.mjs
// Can CSS alone mark the ends, by ::slotted(:nth-child(1 of :not([hidden]))), in each engine?
import { createRequire } from 'node:module';
const require = createRequire(`${process.cwd()}/package.json`);
const playwright = require('playwright');
const HTML = `<!doctype html><style>.off{display:none}</style><body><script>
customElements.define('x-g', class extends HTMLElement { constructor() { super(); this.attachShadow({ mode: 'open' }).innerHTML = '<style>::slotted(*){--f:0;--l:0}::slotted(:nth-child(1 of :not([hidden]))){--f:1}::slotted(:nth-last-child(1 of :not([hidden]))){--l:1}:host(:dir(rtl)) ::slotted(:nth-child(1 of :not([hidden])):not(:nth-last-child(1 of :not([hidden])))){--f:2}</style><slot></slot>'; } });
customElements.define('x-m', class extends HTMLElement { constructor() { super(); this.attachShadow({ mode: 'open' }).innerHTML = '<style>:host{display:contents}:host([hidden]){display:none}</style><button>b</button>'; } });
</script>`;
const ends = `(g) => [...g.children].map((c) => c.id + getComputedStyle(c).getPropertyValue('--f').trim() + getComputedStyle(c).getPropertyValue('--l').trim()).join(' ')`;
for (const engine of ['chromium', 'firefox', 'webkit']) {
  const b = await playwright[engine].launch();
  const p = await b.newPage();
  await p.setContent(HTML);
  const r = await p.evaluate(async (endsSrc) => {
    const ends = eval(endsSrc);
    const out = [];
    const make = (tag = 'x-m') => {
      const g = document.createElement('x-g');
      for (const id of 'abcd') {
        const m = document.createElement(tag);
        m.id = id;
        g.append(m);
      }
      return g;
    };
    const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
    let g = make();
    document.body.append(g);
    out.push('plain ' + ends(g));
    g.children[0].hidden = true;
    g.children[3].hidden = true;
    out.push('first and last hidden ' + ends(g));
    g.children[1].hidden = true;
    out.push('only c shown ' + ends(g));
    g.dir = 'rtl';
    g.children[1].hidden = false;
    out.push('rtl, b c shown ' + ends(g));
    g.remove();
    const panel = document.createElement('div');
    panel.hidden = true;
    document.body.append(panel);
    g = make();
    panel.append(g);
    await frame();
    g.children[0].hidden = true;
    await frame();
    panel.hidden = false;
    await frame();
    out.push(
      'a hidden while the panel is hidden, then shown ' +
        ends(g) +
        ' | a display ' +
        getComputedStyle(g.children[0]).display,
    );
    panel.remove();
    const s = document.createElement('style');
    s.textContent = ':not(:defined){display:none}';
    document.head.append(s);
    g = make('x-late');
    document.body.append(g);
    await frame();
    out.push('undefined members ' + ends(g));
    customElements.define(
      'x-late',
      class extends HTMLElement {
        constructor() {
          super();
          this.attachShadow({ mode: 'open' }).innerHTML =
            '<style>:host{display:contents}</style><button>b</button>';
        }
      },
    );
    await frame();
    out.push('defined later ' + ends(g));
    return out;
  }, ends);
  console.log(`## ${engine} ${b.version()}\n${r.join('\n')}`);
  await b.close();
}
