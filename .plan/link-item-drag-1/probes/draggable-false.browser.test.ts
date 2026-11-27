import { afterEach, describe, expect, it } from 'vitest';
import { commands, server } from 'vitest/browser';
import { nextFrame } from '../browser.ts';

type Case = Readonly<{ name: string; build: () => [HTMLElement, Element] }>;

function shadowHost(
  slotted: boolean,
  wrap: boolean,
  css = '',
): [HTMLElement, Element] {
  const host = document.createElement('div');
  const root = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = css;
  root.append(style);
  const a = document.createElement('a');
  a.href = '#target';
  a.setAttribute('draggable', 'false');
  a.style.display = 'block';
  a.style.padding = '16px';
  const inner = wrap ? document.createElement('div') : a;
  if (wrap) {
    a.append(inner);
  }
  if (slotted) {
    inner.append(document.createElement('slot'));
    host.append('Label text');
  } else {
    inner.append('Label text');
  }
  root.append(a);
  return [host, a];
}

const CASES: readonly Case[] = [
  {
    name: 'light DOM a[draggable=false]',
    build: () => {
      const a = document.createElement('a');
      a.href = '#target';
      a.setAttribute('draggable', 'false');
      a.style.display = 'block';
      a.style.padding = '16px';
      a.textContent = 'Label text';
      return [a, a];
    },
  },
  {
    name: 'light DOM a[draggable=false] > div > text',
    build: () => {
      const a = document.createElement('a');
      a.href = '#target';
      a.setAttribute('draggable', 'false');
      a.style.display = 'block';
      a.style.padding = '16px';
      const d = document.createElement('div');
      d.textContent = 'Label text';
      a.append(d);
      return [a, d];
    },
  },
  {
    name: 'shadow a[draggable=false] > text',
    build: () => shadowHost(false, false),
  },
  {
    name: 'shadow a[draggable=false] > slot',
    build: () => shadowHost(true, false),
  },
  {
    name: 'shadow a[draggable=false] > div > slot',
    build: () => shadowHost(true, true),
  },
  {
    name: 'shadow a[draggable=false] with a { all: unset }',
    build: () =>
      shadowHost(true, true, 'a { all: unset; display: block; padding: 16px }'),
  },
  {
    name: 'shadow a[draggable=false] with a { all: unset } and [draggable=false] { -webkit-user-drag: none }',
    build: () =>
      shadowHost(
        true,
        true,
        'a { all: unset; display: block; padding: 16px } [draggable=false] { -webkit-user-drag: none }',
      ),
  },
  {
    name: 'light DOM a[draggable=false] with a { all: unset }',
    build: () => {
      const style = document.createElement('style');
      style.textContent = '.u { all: unset; display: block; padding: 16px }';
      document.head.append(style);
      const a = document.createElement('a');
      a.className = 'u';
      a.href = '#target';
      a.setAttribute('draggable', 'false');
      a.textContent = 'Label text';
      return [a, a];
    },
  },
];

afterEach(async () => {
  await commands.pointerRelease().catch(() => {});
});

describe(`draggable=false probe (${server.browser})`, () => {
  it.each(CASES)('$name', async ({ name, build }) => {
    const [el, target] = build();
    document.body.append(el);
    await nextFrame();
    const log: string[] = [];
    const ctrl = new AbortController();
    document.addEventListener(
      'dragstart',
      (e) => {
        log.push(`dragstart types=${[...e.dataTransfer!.types]}`);
        e.preventDefault();
      },
      { capture: true, signal: ctrl.signal },
    );
    const { left, top, width, height } = target.getBoundingClientRect();
    const [x, y] = [left + width / 2, top + height / 2];
    await commands.pointerMove(x, y, 1);
    await commands.pointerPress(x, y);
    await commands.pointerMove(x, y + 12, 3);
    await commands.pointerRelease();
    ctrl.abort();
    const anchor =
      el instanceof HTMLAnchorElement ? el : el.shadowRoot!.querySelector('a')!;
    const userDrag =
      getComputedStyle(anchor).getPropertyValue('-webkit-user-drag');
    console.log(
      JSON.stringify({ browser: server.browser, name, userDrag, log }),
    );
    expect(true).toBe(true);
  });
});
