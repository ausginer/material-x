import { createRequire } from 'node:module';
const require = createRequire('/workspaces/worktrees/c/package.json');
const pw = require('playwright');
const page_fn = () => {
  const out = {};
  // material-x's HOST_HAS_SUPPORTED, verbatim
  {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML =
      '<style>:host{--_has:0}:host:has(slot){--_has:1}</style><slot></slot>';
    document.body.append(host);
    out.HOST_HAS_SUPPORTED =
      getComputedStyle(host).getPropertyValue('--_has') === '1';
    host.remove();
  }
  out.supports_has_slotted = CSS.supports('selector(:has-slotted)');
  out.supports_state = CSS.supports('selector(:state(x))');
  // The built rule forms, as main.css.js has them
  class Probe extends HTMLElement {
    static formAssociated = true;
    constructor() {
      super();
      this.i = this.attachInternals();
      this.attachShadow({ mode: 'open' }).innerHTML =
        '<style>:host{display:block;--a:0;--b:0;--c:0}' +
        ':host:has(.lead.has-slotted){--a:1}' +
        ':host(:state(has-lead)){--b:1}' +
        ':host:has(.support.has-slotted):has(.overline.has-slotted),:host(:state(has-support):state(has-overline)){--c:1}' +
        '</style><slot class="lead" name="lead"></slot><slot class="support" name="support"></slot><slot class="overline" name="overline"></slot>';
    }
  }
  customElements.define('x-probe', Probe);
  const el = document.createElement('x-probe');
  document.body.append(el);
  const v = (n) => getComputedStyle(el).getPropertyValue(n).trim();
  out.before = { hasRule: v('--a'), stateRule: v('--b'), combined: v('--c') };
  for (const s of el.shadowRoot.querySelectorAll('slot'))
    s.classList.add('has-slotted');
  out.afterClass = {
    hasRule: v('--a'),
    stateRule: v('--b'),
    combined: v('--c'),
  };
  el.i.states.add('has-lead');
  el.i.states.add('has-support');
  el.i.states.add('has-overline');
  out.afterState = {
    hasRule: v('--a'),
    stateRule: v('--b'),
    combined: v('--c'),
  };
  return out;
};
for (const name of ['chromium', 'firefox', 'webkit']) {
  let b;
  try {
    b = await pw[name].launch();
    const p = await b.newPage();
    await p.setContent('<!doctype html><body></body>');
    console.log(name, b.version(), JSON.stringify(await p.evaluate(page_fn)));
  } catch (e) {
    console.log(name, 'not run:', String(e.message).split('\n')[0]);
  } finally {
    await b?.close();
  }
}
