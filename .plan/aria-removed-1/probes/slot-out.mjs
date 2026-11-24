// Run from packages/material-x, with the package built:
//   node ../../.plan/reviews/focus-cover-1/probes/bundle.mjs <bundle>
//   node ../../.plan/aria-removed-1/probes/slot-out.mjs <engine> <bundle>
// Each caller of useSlot: what it wrote for its content, when the content
// changes while the element is out (in a task of its own), after it is put back,
// against the same content in a new element.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const playwright = createRequire(`${process.cwd()}/package.json`)('playwright');
const [engine, bundle] = process.argv.slice(2);
const code = fs.readFileSync(bundle, 'utf8');
const browser = await playwright[engine].launch();
const page = await browser.newPage();
console.log(`# ${engine} ${browser.version()}`);
const CASES = {
  'text field, label removed': [
    '<mx-text-field><span slot=label>L</span></mx-text-field>',
    'remove',
    'span',
  ],
  'text field, label added': [
    '<mx-text-field></mx-text-field>',
    'add',
    '<span slot=label>L</span>',
  ],
  'text field, support added': [
    '<mx-text-field></mx-text-field>',
    'add',
    '<span slot=support>S</span>',
  ],
  'multiline, counter added': [
    '<mx-multiline-text-field></mx-multiline-text-field>',
    'add',
    '<span slot=counter>C</span>',
  ],
  'connected group, button added': [
    '<mx-connected-button-group value=1><mx-switch-button value=1>1</mx-switch-button><mx-switch-button value=2>2</mx-switch-button></mx-connected-button-group>',
    'add',
    '<mx-switch-button value=3>3</mx-switch-button>',
  ],
  'connected group, first removed': [
    '<mx-connected-button-group><mx-switch-button value=1>1</mx-switch-button><mx-switch-button value=2>2</mx-switch-button><mx-switch-button value=3>3</mx-switch-button></mx-connected-button-group>',
    'remove',
    'mx-switch-button',
  ],
  'standard group, first removed': [
    '<mx-button-group><mx-button>1</mx-button><mx-button>2</mx-button></mx-button-group>',
    'remove',
    'mx-button',
  ],
  'list item, lead added': [
    '<mx-list-item>x</mx-list-item>',
    'add',
    '<mx-icon slot=lead>a</mx-icon>',
  ],
  'list item, large image added': [
    '<mx-list-item>x</mx-list-item>',
    'add',
    '<img slot=lead data-large width=56 height=56 alt>',
  ],
  'button, icon added': [
    '<mx-button>x</mx-button>',
    'add',
    '<mx-icon slot=icon>a</mx-icon>',
  ],
  'sortable list, item added': [
    '<mx-sortable-list><mx-list-button-item>1</mx-list-button-item></mx-sortable-list>',
    'add',
    '<mx-list-button-item>2</mx-list-button-item>',
  ],
};
for (const [name, [html, op, arg]] of Object.entries(CASES)) {
  await page.setContent(
    `<!doctype html><body><div id=root></div><script>${code}</script>`,
  );
  const read = await page.evaluate(
    async ([html, op, arg]) => {
      const root = document.querySelector('#root');
      const task = () => new Promise((r) => setTimeout(r, 400));
      const change = (e) => {
        if (op === 'add') e.insertAdjacentHTML('beforeend', arg);
        else e.querySelector(arg).remove();
      };
      // What an element, its children and its shadow tree say of its content.
      const look = (e) => {
        const at = (n) =>
          `${n.localName}${n.id ? `#${n.id}` : ''}[${[...n.attributes]
            .filter((a) =>
              /^(data-|aria-|tabindex|role|draggable)/.test(a.name),
            )
            .map((a) => `${a.name}=${a.value}`)
            .sort()
            .join(' ')}]`;
        const s = [];
        const all = (n) => {
          s.push(at(n) + (n.matches(':state(has-slotted)') ? ':hs' : ''));
          for (const c of n.children) all(c);
          if (n.shadowRoot) for (const c of n.shadowRoot.children) all(c);
        };
        all(e);
        const box = e.getBoundingClientRect();
        return [
          ...s.filter((x) => !x.includes('[]')),
          `box ${Math.round(box.width)}×${Math.round(box.height)}`,
          ...[...e.children].map((c) => {
            const q = c.shadowRoot?.querySelector('.host');
            return q ? getComputedStyle(q).borderRadius : '';
          }),
        ];
      };
      const make = () => {
        root.innerHTML = html;
        return root.firstElementChild;
      };
      const fresh = make();
      await task();
      change(fresh);
      await task();
      const right = look(fresh);
      const e = make();
      await task();
      e.remove();
      await task();
      change(e);
      await task();
      root.append(e);
      await task();
      const got = look(e);
      // Made out of the document with the content, and appended in a later task.
      root.replaceChildren();
      const t = document.createElement('div');
      t.innerHTML = html;
      const made = document.createElement(t.firstElementChild.localName);
      for (const { name, value } of t.firstElementChild.attributes)
        made.setAttribute(name, value);
      made.append(...t.firstElementChild.childNodes);
      change(made);
      await task();
      root.append(made);
      await task();
      return { right, got, late: look(made) };
    },
    [html, op, arg],
  );
  for (const [how, got] of [
    ['changed while out', read.got],
    ['made out, appended in a later task', read.late],
  ]) {
    const bad = got.filter((x, i) => x !== read.right[i]);
    console.log(
      `${name}, ${how}: ${bad.length === 0 && got.length === read.right.length ? 'as while connected' : `DIFFERS\n    got   ${bad.join(' | ')}\n    right ${read.right.filter((x, i) => x !== got[i]).join(' | ')}`}`,
    );
  }
}
await browser.close();
