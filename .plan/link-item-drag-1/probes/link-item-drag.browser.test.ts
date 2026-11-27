import { afterEach, describe, expect, it } from 'vitest';
import { commands, server } from 'vitest/browser';
import '../../src/list/list-link-item.ts';
import '../../src/list/list-item.ts';
import '../../src/list/sortable-list.ts';
import { nextFrame } from '../browser.ts';

type Variant = Readonly<{
  name: string;
  handle?: boolean;
  setup?: (item: HTMLElement, anchor: HTMLAnchorElement) => void;
}>;

const VARIANTS: readonly Variant[] = [
  { name: 'baseline' },
  {
    name: 'anchor draggable=false',
    setup: (_, a) => a.setAttribute('draggable', 'false'),
  },
  {
    name: 'host draggable=false',
    setup: (item) => item.setAttribute('draggable', 'false'),
  },
  {
    name: 'anchor and host draggable=false',
    setup: (item, a) => {
      a.setAttribute('draggable', 'false');
      item.setAttribute('draggable', 'false');
    },
  },
  {
    name: 'anchor -webkit-user-drag: none',
    setup: (_, a) => a.style.setProperty('-webkit-user-drag', 'none'),
  },
  {
    name: 'dragstart cancelled on host',
    setup: (item) =>
      item.addEventListener('dragstart', (e) => e.preventDefault()),
  },
  { name: 'handle baseline', handle: true },
  {
    name: 'handle, anchor draggable=false',
    handle: true,
    setup: (_, a) => a.setAttribute('draggable', 'false'),
  },
  {
    name: 'handle, dragstart cancelled on host',
    handle: true,
    setup: (item) =>
      item.addEventListener('dragstart', (e) => e.preventDefault()),
  },
];

afterEach(async () => {
  await commands.pointerRelease().catch(() => {});
});

describe(`link item drag probe (${server.browser})`, () => {
  it.each(VARIANTS)('$name', async ({ handle, setup }) => {
    const log: string[] = [];
    const list = document.createElement('mx-sortable-list');
    list.style.setProperty('--_drag-duration', '0s');
    const item = document.createElement('mx-list-link-item');
    item.setAttribute('href', '#target');
    const lead = document.createElement('span');
    lead.slot = 'lead';
    lead.textContent = 'H';
    lead.toggleAttribute('data-handle', !!handle);
    item.append(lead, 'Label text');
    list.append(item, document.createElement('mx-list-item'));
    document.body.append(list);
    await nextFrame();
    const anchor = item.shadowRoot!.querySelector('a')!;
    setup?.(item, anchor);
    const before = location.href;

    const ctrl = new AbortController();
    for (const type of [
      'pointerdown',
      'pointercancel',
      'dragstart',
      'selectstart',
      'click',
    ]) {
      document.addEventListener(
        type,
        (e) => {
          const path = e
            .composedPath()
            .slice(0, 3)
            .map((n) =>
              n instanceof Element
                ? n.localName + (n.className ? '.' + n.className : '')
                : n.nodeName,
            )
            .join('<');
          const types =
            e instanceof DragEvent
              ? ` types=${[...e.dataTransfer!.types]}`
              : '';
          log.push(`${type} [${path}]${types}`);
        },
        { capture: true, signal: ctrl.signal },
      );
    }

    const { left, top, width, height } = (
      handle ? lead : anchor
    ).getBoundingClientRect();
    const [x, y] = [left + width / 2, top + height / 2];
    await commands.pointerMove(x, y, 1);
    await commands.pointerPress(x, y);
    await commands.pointerMove(x, y + 12, 3);
    const lifted = item.matches(':state(drag)');
    await commands.pointerRelease();
    await nextFrame();
    ctrl.abort();
    console.log(
      JSON.stringify({
        browser: server.browser,
        lifted,
        locationChanged: location.href !== before,
        log,
      }),
    );
    history.replaceState(null, '', before);
    expect(true).toBe(true);
  });
});
