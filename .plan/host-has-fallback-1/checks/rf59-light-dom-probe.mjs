// RF-59: can a light-DOM selector, `:host(:has(> [slot=name]))`, stand in for the has-slotted polyfill?
// Run as: node rf59-light-dom-probe.mjs <checkout with playwright installed>
// Every rule is written raw, as an author would, not rewritten by the build. Each rule sets its own custom
// property, so one getComputedStyle read tells which rules match. Reads are taken synchronously after each
// mutation and again after two animation frames, so a missing invalidation shows as a difference between them.
import { createRequire } from 'node:module';

const require = createRequire(`${process.argv[2]}/package.json`);
const pw = require('playwright');

const pageFn = async () => {
  const frames = () =>
    new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const out = {
    supports: {
      hostHasLight: CSS.supports('selector(:host(:has(> [slot=lead])))'),
      hasSlotted: CSS.supports('selector(:has-slotted)'),
      hostHasShadow: CSS.supports('selector(:host:has(.lead))'),
    },
  };
  const css = `
    :host { display: block; --light: 0; --light-combined: 0; --light-default: 0; --shadow-has-slotted: 0; --shadow-has: 0; }
    :host(:has(> [slot=lead])) { --light: 1; }
    :host(:has(> [slot=support]):has(> [slot=overline])) { --light-combined: 1; }
    :host(:has(> :not([slot]))) { --light-default: 1; }
    :host:has(.lead:has-slotted) { --shadow-has-slotted: 1; }
    :host:has(.lead) { --shadow-has: 1; }
    slot { --slot-has-slotted: 0; }
    slot:has-slotted { --slot-has-slotted: 1; }
  `;
  class Probe extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' }).innerHTML =
        `<style>${css}</style><slot class="lead" name="lead"></slot>` +
        '<slot class="support" name="support"></slot><slot class="overline" name="overline"></slot>' +
        '<slot class="label"></slot>';
    }
  }
  customElements.define('x-probe', Probe);

  const read = (el) => {
    const s = getComputedStyle(el);
    const v = (n) => s.getPropertyValue(n).trim();
    const slot = (c) =>
      getComputedStyle(el.shadowRoot.querySelector(`.${c}`))
        .getPropertyValue('--slot-has-slotted')
        .trim();
    return [
      `light=${v('--light')}`,
      `combined=${v('--light-combined')}`,
      `default=${v('--light-default')}`,
      `shadowHas=${v('--shadow-has')}`,
      `shadowHasSlotted=${v('--shadow-has-slotted')}`,
      `slotLead=${slot('lead')}`,
      `slotLabel=${slot('label')}`,
    ].join(' ');
  };

  const run = async (label, container) => {
    const rows = [];
    const el = document.createElement('x-probe');
    container.append(el);
    const step = async (name, mutate) => {
      mutate?.();
      const sync = read(el);
      await frames();
      const later = read(el);
      rows.push(
        `${name}: ${sync}${later === sync ? '' : `  | after frames: ${later}`}`,
      );
    };
    const lead = document.createElement('span');
    lead.textContent = 'L';
    await step('empty');
    await step('append <span slot=lead>', () => {
      lead.slot = 'lead';
      el.append(lead);
    });
    await step('slot attribute lead -> trail', () => {
      lead.slot = 'trail';
    });
    await step('slot attribute trail -> lead', () => {
      lead.slot = 'lead';
    });
    await step('remove it', () => lead.remove());
    const wrap = document.createElement('div');
    await step('grandchild <div><span slot=lead>', () => {
      const s = document.createElement('span');
      s.slot = 'lead';
      wrap.append(s);
      el.append(wrap);
    });
    await step('remove the wrapper', () => wrap.remove());
    const support = document.createElement('span');
    support.slot = 'support';
    const overline = document.createElement('span');
    overline.slot = 'overline';
    await step('append support only', () => el.append(support));
    await step('append overline too', () => el.append(overline));
    await step('remove support and overline', () => {
      support.remove();
      overline.remove();
    });
    const text = document.createTextNode('label text');
    await step('default slot: a text node', () => el.append(text));
    await step('default slot: whitespace only', () => {
      text.data = '  ';
    });
    await step('default slot: remove the text', () => text.remove());
    const b = document.createElement('b');
    await step('default slot: an element', () => el.append(b));
    await step('default slot: remove it', () => b.remove());
    out[label] = rows;
    el.remove();
  };

  await run('in the document', document.body);

  // The child exists before the host's first style, then the host is re-inserted after a change.
  {
    const rows = [];
    const el = document.createElement('x-probe');
    const lead = document.createElement('span');
    lead.slot = 'lead';
    el.append(lead);
    document.body.append(el);
    rows.push(`connected with <span slot=lead>: ${read(el)}`);
    lead.remove();
    await frames();
    rows.push(`child removed: ${read(el)}`);
    el.remove();
    document.body.append(el);
    rows.push(`host re-inserted: ${read(el)}`);
    el.append(lead);
    await frames();
    rows.push(`child appended again: ${read(el)}`);
    el.remove();
    document.body.append(el);
    rows.push(`host re-inserted: ${read(el)}`);
    out['child before first style'] = rows;
    el.remove();
  }

  // The host inside another shadow tree.
  const outer = document.createElement('div');
  outer.attachShadow({ mode: 'open' });
  document.body.append(outer);
  await run('inside a shadow tree', outer.shadowRoot);

  // Nested slots: an outer component re-slots its own `outer` slot into x-probe's lead slot.
  class Outer extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' }).innerHTML =
        '<x-probe><slot name="outer" slot="lead"></slot></x-probe>';
    }
  }
  customElements.define('x-outer', Outer);
  const o = document.createElement('x-outer');
  document.body.append(o);
  await frames();
  const inner = o.shadowRoot.querySelector('x-probe');
  const nested = [];
  const leadSlot = inner.shadowRoot.querySelector('.lead');
  const counts = () =>
    `assigned=${leadSlot.assignedNodes().length} flattened=${leadSlot.assignedNodes({ flatten: true }).length}`;
  nested.push(`outer slot empty: ${read(inner)} ${counts()}`);
  const icon = document.createElement('i');
  icon.slot = 'outer';
  o.append(icon);
  await frames();
  nested.push(`outer slot filled: ${read(inner)} ${counts()}`);
  out['nested slot'] = nested;
  return out;
};

for (const name of ['chromium', 'firefox', 'webkit']) {
  const browser = await pw[name].launch();
  const page = await browser.newPage();
  await page.setContent('<!doctype html><html><body></body></html>');
  const result = await page.evaluate(pageFn);
  console.log(`## ${name} ${browser.version()}`);
  console.log(`supports: ${JSON.stringify(result.supports)}`);
  for (const [k, rows] of Object.entries(result)) {
    if (k === 'supports') continue;
    console.log(`# ${k}`);
    for (const r of rows) console.log(`  ${r}`);
  }
  await browser.close();
}
