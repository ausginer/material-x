// Probe for RF-68: does an interactive item's listitem wrapper leave a box in
// the list's flow while its control is lifted into the top layer, and does
// `display: contents` on the wrapper while its control is `:popover-open`
// remove it?
//
// node list-lift.ts <packages/material-x> <engine>
//
// Each case builds the list, gives the list a 12 px gap so a stray flex item
// shows, wraps each interactive item's `.host` as list-roles.ts's `inner`
// variant does, and lifts the button item's `.host` the way core's reorderable
// trait does: a footprint of the control's size before the item, then the
// control into the top layer as a manual popover at a fixed position. It reads
// the list's height and the link item's top before and during the lift.
//   none     - no wrapper (the built package as it is)
//   wrapper  - the wrapper, with no rule
//   collapse - the wrapper, with `.wrap:has(> :popover-open) { display: contents }`
// Added by the architect on 2026-11-21 for the box host, with no wrapper. Each
// item's shadow root adopts `:host { display: block }`, which comes after the
// item's own `:host { display: contents }`:
//   hostbox     - nothing else
//   hostbox-has - and `:host:has(.host:popover-open) { display: contents }`
//   hostbox-state - and `:host(.lifted) { display: contents }`, with the class
//               toggled on the host by a `beforetoggle` listener on its
//               `.host`. It stands in for a custom state on the item's
//               internals, which the probe can't reach; `:host(:state(…))`
//               already styles the items in every engine
//   host-lift   - the lifted visual is the item's host itself, not its `.host`
// Each box-host mode lifts the button item, then the static item (`-static`).
import { rolldown } from 'rolldown';
import { chromium, firefox, webkit } from 'playwright';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [MX, ENGINE] = process.argv.slice(2) as [string, string];

const dir = await mkdtemp(join(tmpdir(), 'list-lift-'));
const entry = join(dir, 'entry.js');
await writeFile(
  entry,
  [
    'list/list.js',
    'list/list-item.js',
    'list/list-button-item.js',
    'list/list-link-item.js',
  ]
    .map((f) => `import ${JSON.stringify(join(MX, f))};`)
    .join('\n'),
);
const build = await rolldown({ input: entry, platform: 'browser' });
const { output } = await build.generate({ format: 'iife' });
await rm(dir, { recursive: true });
const code = output
  .filter((c) => c.type === 'chunk')
  .map((c) => (c as { code: string }).code)
  .join('\n');

const type = { chromium, firefox, webkit }[ENGINE]!;
const browser = await type.launch();
console.log(`# engine ${ENGINE} ${browser.version()}`);
for (const mode of [
  'none',
  'wrapper',
  'collapse',
  'hostbox',
  'hostbox-static',
  'hostbox-has',
  'hostbox-has-static',
  'hostbox-state',
  'hostbox-state-static',
  'host-lift',
  'host-lift-static',
]) {
  const page = await browser.newPage();
  await page.setContent(`<mx-list id="l" style="gap: 12px">
  <mx-list-item id="s">Static</mx-list-item>
  <mx-list-button-item id="b">Button item</mx-list-button-item>
  <mx-list-link-item id="a" href="#x">Link item</mx-list-link-item>
</mx-list>`);
  await page.addScriptTag({ content: code });
  await page.waitForFunction(() => customElements.get('mx-list-link-item'));
  await page.waitForTimeout(100);
  const r = await page.evaluate((mode) => {
    const list = document.getElementById('l')!;
    const box = mode.startsWith('host');
    if (box) {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(
        mode.startsWith('hostbox-has')
          ? ':host { display: block; } :host:has(.host:popover-open) { display: contents; }'
          : mode.startsWith('hostbox-state')
            ? ':host { display: block; } :host(.lifted) { display: contents; }'
            : ':host { display: block; }',
      );
      for (const item of list.children) {
        if (mode.startsWith('hostbox-state')) {
          item
            .shadowRoot!.querySelector('.host')!
            .addEventListener('beforetoggle', (event) => {
              item.classList.toggle(
                'lifted',
                (event as ToggleEvent).newState === 'open',
              );
            });
        }
        item.shadowRoot!.adoptedStyleSheets = [
          ...item.shadowRoot!.adoptedStyleSheets,
          sheet,
        ];
      }
    }
    if (mode !== 'none' && !box) {
      for (const item of document.querySelectorAll(
        'mx-list-button-item, mx-list-link-item',
      )) {
        const target = item.shadowRoot!.querySelector('.host')!;
        const wrap = document.createElement('div');
        wrap.setAttribute('role', 'listitem');
        wrap.className = 'wrap';
        target.before(wrap);
        wrap.append(target);
        if (mode === 'collapse') {
          const sheet = new CSSStyleSheet();
          sheet.replaceSync(
            '.wrap:has(> :popover-open) { display: contents; }',
          );
          item.shadowRoot!.adoptedStyleSheets = [
            ...item.shadowRoot!.adoptedStyleSheets,
            sheet,
          ];
        }
      }
    }
    const link = document
      .getElementById('a')!
      .shadowRoot!.querySelector('.host')!;
    const before = {
      list: list.getBoundingClientRect().height,
      linkTop: link.getBoundingClientRect().top,
    };
    const item = document.getElementById(mode.endsWith('-static') ? 's' : 'b')!;
    const visual = mode.startsWith('host-lift')
      ? item
      : item.shadowRoot!.querySelector<HTMLElement>('.host')!;
    const rect = visual.getBoundingClientRect();
    const footprint = document.createElement('div');
    footprint.style.width = `${rect.width}px`;
    footprint.style.height = `${rect.height}px`;
    item.before(footprint);
    visual.style.position = 'fixed';
    visual.style.inset = 'auto';
    visual.style.top = `${rect.top}px`;
    visual.style.left = `${rect.left}px`;
    visual.style.width = `${rect.width}px`;
    visual.style.height = `${rect.height}px`;
    visual.style.margin = '0';
    visual.style.border = '0';
    visual.popover = 'manual';
    visual.showPopover();
    const during = {
      list: list.getBoundingClientRect().height,
      linkTop: link.getBoundingClientRect().top,
    };
    const lifted = visual.getBoundingClientRect();
    visual.hidePopover();
    const after = list.getBoundingClientRect().height;
    const same = ['x', 'y', 'width', 'height'].every(
      (k) => lifted[k as 'x'] === rect[k as 'x'],
    );
    return { before, during, open: true, same, after };
  }, mode);
  console.log(
    `${mode.padEnd(18)} list ${r.before.list} -> ${r.during.list}, link top ${r.before.linkTop} -> ${r.during.linkTop}, visual rect kept=${r.same}, list after hidePopover ${r.after}`,
  );
  await page.close();
}
await browser.close();
