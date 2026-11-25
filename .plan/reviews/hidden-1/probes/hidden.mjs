// `hidden` as a page's user has it, on built bundles of the head and the base.
// Run from packages/material-x: node hidden.mjs <head.js> <main.js> [engine,...]
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const playwright = createRequire(`${process.cwd()}/package.json`)('playwright');
const codes = {
  head: readFileSync(process.argv[2], 'utf8'),
  main: readFileSync(process.argv[3], 'utf8'),
};
for (const engine of (process.argv[4] ?? 'chromium,firefox,webkit').split(
  ',',
)) {
  const browser = await playwright[engine].launch();
  console.log(`\n# ${engine} ${browser.version()}`);
  const open = async (name) => {
    const page = await browser.newPage({
      viewport: { width: 800, height: 600 },
    });
    page.on('pageerror', (e) => console.log('PAGE ERROR', name, e.message));
    await page.setContent(
      `<!doctype html><style>body{margin:20px}</style><button id="before">B</button><div id="r" style="min-height:300px"></div><button id="after">A</button><script>${codes[name]}</script>`,
    );
    await page.evaluate(() => {
      window.root = document.querySelector('#r');
      window.tick = (n = 60) => new Promise((f) => setTimeout(f, n));
      window.boxes = (e) =>
        [
          e,
          ...(e.shadowRoot?.querySelectorAll('*') ?? []),
          ...e.querySelectorAll('*'),
        ].filter((x) => x.getClientRects().length).length;
      window.make = (t, a = {}, h = 'Text') => {
        const e = document.createElement(t);
        for (const [k, v] of Object.entries(a)) e.setAttribute(k, v);
        e.innerHTML = h;
        return e;
      };
    });
    return page;
  };
  for (const name of ['head', 'main']) {
    const page = await open(name);
    const out = await page.evaluate(async () => {
      const line = [];
      // 1. values of the attribute, over every element
      for (const v of [
        '',
        'hidden',
        'true',
        'false',
        'until-found ',
        'until-found',
        'Until-Found',
      ]) {
        const shown = [];
        for (const t of TAGS) {
          const e = make(t, { hidden: v });
          root.replaceChildren(e);
          await 0;
          if (boxes(e)) shown.push(t);
        }
        line.push(
          `hidden=${JSON.stringify(v)}: ${TAGS.length - shown.length} of ${TAGS.length} without a box`,
        );
      }
      // 2. states, as attributes that elements have
      const S = {
        disabled: '',
        open: '',
        checked: '',
        error: '',
        extended: '',
        selected: '',
        color: 'outlined',
        size: 'large',
        shape: 'square',
        value: 'x',
        command: '',
      };
      const bad = [];
      let n = 0;
      for (const t of TAGS)
        for (const set of [
          ...Object.entries(S).map((x) => [x]),
          Object.entries(S),
        ]) {
          n += 1;
          const e = make(t, { hidden: '', ...Object.fromEntries(set) });
          root.replaceChildren(e);
          await 0;
          if (boxes(e)) bad.push(`${t} ${set.map((x) => x[0])}`);
        }
      line.push(`states: ${n} read, ${bad.length} with a box`);
      // 3. the page's declarations, by way
      const ways = {
        'type rule': (t) => `${t}{display:inline-block}`,
        universal: () => `*{display:inline-block}`,
        ':where': (t) => `:where(${t}){display:inline-block}`,
        layer: (t) => `@layer a{${t}{display:inline-block}}`,
        'page [hidden]!important': (t) =>
          `${t}{display:inline-block}[hidden]{display:none!important}`,
        'page [hidden]': () => `[hidden]{display:none}`,
        'display: revert': (t) => `${t}{display:revert}`,
        'all: unset (page)': (t) => `${t}{all:unset}`,
        'display: revert-layer': (t) => `${t}{display:revert-layer}`,
      };
      for (const [w, css] of Object.entries(ways)) {
        const seen = {};
        for (const t of [...TAGS, 'div']) {
          const st = document.createElement('style');
          st.textContent = css(t);
          document.head.append(st);
          const e = make(t, { hidden: '' });
          root.replaceChildren(e);
          await 0;
          const d = getComputedStyle(e).display;
          (seen[d] ??= []).push(t);
          st.remove();
        }
        line.push(
          `page ${w}: ${Object.entries(seen)
            .map(([d, l]) => `${d} ${l.length > 3 ? l.length : l.join(',')}`)
            .join(
              '; ',
            )} (native div ${Object.entries(seen).find(([, l]) => l.includes('div'))[0]})`,
        );
      }
      {
        const e = make('mx-card', { hidden: '', style: 'display:grid' });
        root.replaceChildren(e);
        line.push(`inline display: ${getComputedStyle(e).display}`);
      }
      // 4. slotted in a component, with that component's own ::slotted display
      for (const t of ['mx-icon', 'mx-card', 'mx-icon-button', 'span']) {
        const i = make('mx-list-item', {}, '');
        const a = make(t, { slot: 'lead', 'data-avatar': '', hidden: '' });
        i.append(a, 'T');
        root.replaceChildren(i);
        await tick();
        const b = make(t, { slot: 'lead', hidden: '' });
        const j = make('mx-list-item', {}, '');
        j.append(b, 'T');
        root.append(j);
        await tick();
        line.push(
          `in the lead slot, hidden, ${t}: data-avatar ${getComputedStyle(a).display} ${boxes(a)} boxes; plain ${getComputedStyle(b).display}`,
        );
      }
      return line;
    });
    console.log(`\n## ${name}\n  ${out.join('\n  ')}`);
    // 5. shown after it was made hidden, against never hidden: pixels
    const shots = {};
    const tags = await page.evaluate(() => TAGS);
    const differ = [];
    let n = 0;
    for (const t of tags)
      for (const extra of [{}, { color: 'outlined', label: 'L', value: '3' }]) {
        n += 1;
        const s = [];
        for (const hide of [false, true, 'later']) {
          await page.evaluate(
            async ([tag, a, h]) => {
              const inner =
                tag.includes('list') && !tag.includes('item')
                  ? '<mx-list-item>One</mx-list-item><mx-list-item>Two</mx-list-item>'
                  : tag.includes('group')
                    ? '<mx-button>One</mx-button><mx-button>Two</mx-button>'
                    : tag.includes('text-field')
                      ? '<span slot="label">Label</span><mx-icon slot="lead">e</mx-icon>'
                      : 'Text';
              const e = make(tag, a, inner);
              if (h === true) e.hidden = true;
              root.replaceChildren(e);
              await tick(120);
              if (h === 'later') {
                e.hidden = true;
                await tick();
              }
              if (h) {
                e.hidden = false;
                await tick(120);
              }
            },
            [t, extra, hide],
          );
          s.push(
            await page.locator('#r').screenshot({ animations: 'disabled' }),
          );
        }
        if (!s[0].equals(s[1]))
          differ.push(`${t} ${JSON.stringify(extra)} made hidden`);
        if (!s[0].equals(s[2]))
          differ.push(`${t} ${JSON.stringify(extra)} hidden later`);
      }
    console.log(
      `  shown again: ${n} elements, two ways each, ${differ.length} differ in pixels from the never hidden ${differ.join(' | ')}`,
    );
    // 6. layout of an until-found element and its neighbour, and find-in-page
    const uf = await page.evaluate(async () => {
      const l = [];
      for (const t of [...TAGS, 'div']) {
        const e = make(t, { hidden: 'until-found' });
        root.replaceChildren(e);
        await tick(20);
        const inner = e.shadowRoot?.querySelector('.host, .impl, slot') ?? e;
        const plain = make(t);
        root.append(plain);
        await tick(20);
        const r = e.getBoundingClientRect(),
          q = plain.getBoundingClientRect();
        l.push(
          `${t} ${getComputedStyle(e).display}/${getComputedStyle(e).contentVisibility} ${Math.round(r.height)} of ${Math.round(q.height)}`,
        );
      }
      return l;
    });
    console.log(
      `  until-found: display/content-visibility, height of the plain: ${uf.join('; ')}`,
    );
    // 7. focus, the tree, forms
    const f = await page.evaluate(async () => {
      const l = [];
      for (const t of [
        'mx-button',
        'mx-checkbox',
        'mx-text-field',
        'mx-slider',
        'mx-list-button-item',
        'mx-card',
      ]) {
        const e = make(t);
        root.replaceChildren(e);
        await tick();
        const c = e.shadowRoot.querySelector('button, input, textarea, .host');
        e.focus();
        if (document.activeElement !== e) c?.focus();
        const was = document.activeElement === e;
        e.hidden = true;
        await tick();
        const now = document.activeElement;
        e.focus();
        c?.focus();
        l.push(
          `${t} focused ${was}, after hidden ${now === e ? 'still' : 'body'}, focus() ${document.activeElement === e}`,
        );
      }
      return l;
    });
    console.log(`  focus: ${f.join('; ')}`);
    // 8. members of a connected group
    for (const [tag, group] of [
      ['mx-switch-button', 'mx-connected-button-group'],
      ['mx-button', 'mx-button-group'],
      ['mx-radio', 'div'],
    ]) {
      const g = await page.evaluate(
        async ([t, gr]) => {
          const e = document.createElement(gr);
          for (const x of 'abc') {
            const m = make(t, { value: x, name: 'n' }, x);
            m.id = x;
            e.append(m);
          }
          root.replaceChildren(e);
          await tick();
          e.firstElementChild.hidden = true;
          await tick();
          return [...e.children]
            .map(
              (m) =>
                `${m.id} tabindex ${m.tabIndex}${m.dataset.first === '' ? ' first' : ''}${m.dataset.last === '' ? ' last' : ''}`,
            )
            .join(', ');
        },
        [tag, group],
      );
      await page.evaluate(() => document.querySelector('#before').focus());
      const stops = [];
      for (let i = 0; i < 4; i += 1) {
        await page.keyboard.press(engine === 'webkit' ? 'Alt+Tab' : 'Tab');
        stops.push(
          await page.evaluate(
            () => document.activeElement.id || document.activeElement.localName,
          ),
        );
      }
      await page.evaluate(() => document.querySelector('#b').focus());
      const arrows = [];
      for (let i = 0; i < 4; i += 1) {
        await page.keyboard.press('ArrowLeft');
        arrows.push(
          await page.evaluate(
            () => document.activeElement.id || document.activeElement.localName,
          ),
        );
      }
      console.log(
        `  ${group} of ${tag}, the first hidden after the connect: ${g}; Tab from before: ${stops.join(', ')}; ArrowLeft from b: ${arrows.join(', ')}`,
      );
    }
    await page.close();
  }
  await browser.close();
}
