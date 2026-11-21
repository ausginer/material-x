// Scratch probe: can an item whose host is `display: contents` take focus?
// It reads the real `mx-list-item` at the branch's source, and four stand-in
// elements whose host is `display: contents` and whose inner `.host` is a
// block. Copy it into packages/material-x/tests/zz-probe/ and run from
// packages/material-x:
//
//   MX_TEST_ENGINES=chromium,firefox,webkit aube exec vitest run \
//     -c vitest.config.ts --project 'browser*' --silent=false tests/zz-probe
//
// Each row prints one `PROBE` line and asserts nothing.
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import '../../src/list/list-item.ts';

/** `inner`: the inner `.host`'s `tabindex`, or `null` for none. */
const STAND_INS = {
  'probe-a': { delegatesFocus: true, inner: '-1' },
  'probe-b': { delegatesFocus: true, inner: '0' },
  'probe-c': { delegatesFocus: false, inner: '0' },
  'probe-d': { delegatesFocus: false, inner: '-1' },
} as const;

for (const [tag, { delegatesFocus, inner }] of Object.entries(STAND_INS)) {
  customElements.define(
    tag,
    class extends HTMLElement {
      constructor() {
        super();
        const root = this.attachShadow({ mode: 'open', delegatesFocus });
        root.innerHTML = `<style>:host{display:contents}.host{display:block;height:20px}</style><div class="host" tabindex="${inner}"><slot></slot></div>`;
      }
    },
  );
}

function engine(): string {
  return navigator.userAgent.match(/(?:Chrome|Firefox|Version)\/[\d.]+/u)![0];
}

describe('probe', () => {
  it('should read the real mx-list-item with a tabindex', async () => {
    const before = document.createElement('button');
    const item = document.createElement('mx-list-item');
    item.textContent = 'Item';
    item.tabIndex = 0;
    document.body.append(before, item);
    before.focus();
    await userEvent.tab();
    const tabbed = document.activeElement === item;
    before.focus();
    item.focus();
    const programmatic = document.activeElement === item;
    console.log(
      'PROBE',
      engine(),
      'mx-list-item',
      JSON.stringify({
        display: getComputedStyle(item).display,
        tabbed,
        programmatic,
      }),
    );
    expect(true).toBe(true);
  });

  it.each(Object.keys(STAND_INS))(
    'should read the stand-in %s',
    async (tag) => {
      const before = document.createElement('button');
      const after = document.createElement('button');
      const item = document.createElement(tag);
      item.textContent = 'Item';
      item.tabIndex = 0;
      document.body.append(before, item, after);
      const inner = item.shadowRoot!.querySelector('.host')!;

      before.focus();
      await userEvent.tab();
      const tabbed =
        document.activeElement === item &&
        item.shadowRoot!.activeElement === inner;
      const focusVisible = inner.matches(':focus-visible');
      const hostMatchesFocus = item.matches(':focus');
      await userEvent.tab();
      const tabLeaves = document.activeElement === after;
      await userEvent.tab({ shift: true });
      const shiftTabReturns = document.activeElement === item;
      before.focus();
      item.focus();
      const programmatic = item.shadowRoot!.activeElement === inner;
      item.removeAttribute('tabindex');
      before.focus();
      await userEvent.tab();
      const tabbedWithoutHostTabindex = document.activeElement === item;

      console.log(
        'PROBE',
        engine(),
        tag,
        JSON.stringify({
          tabbed,
          focusVisible,
          hostMatchesFocus,
          tabLeaves,
          shiftTabReturns,
          programmatic,
          tabbedWithoutHostTabindex,
        }),
      );
      expect(true).toBe(true);
    },
  );
});
