// Scratch reading for repo:RF-33, removed after its reading.
import { describe, expect, it } from 'vitest';
import { server, userEvent } from 'vitest/browser';
import '../../src/button/button.ts';

let count = 0;
function host(css: string): HTMLElement {
  const tag = `rf33-min-${(count += 1)}`;
  customElements.define(
    tag,
    class extends HTMLElement {
      constructor() {
        super();
        const root = this.attachShadow({ mode: 'open', delegatesFocus: true });
        root.innerHTML = `<style>${css}</style><button type="button">x</button>`;
      }
    },
  );
  const el = document.createElement(tag);
  document.body.append(el);
  return el;
}

describe('RF-33 minimal', () => {
  for (const css of [
    '',
    ':host { display: contents }',
    ':host { display: inline }',
  ]) {
    it(`should report "${css}"`, () => {
      const el = host(css);
      el.focus();
      const ok =
        el.shadowRoot!.activeElement === el.shadowRoot!.querySelector('button');
      console.log(
        `RF33M ${server.browser} "${css}": ${ok ? 'delegates' : 'does not delegate'}`,
      );
      el.remove();
      expect(true).toBe(true);
    });
  }
  it('should report an mx-button whose focus() focuses the native button', () => {
    const el = document.createElement('mx-button');
    document.body.append(el);
    const native = el.shadowRoot!.querySelector<HTMLButtonElement>('.host')!;
    el.focus = (options?: FocusOptions) => native.focus(options);
    el.focus();
    console.log(
      `RF33M ${server.browser} mx-button with focus() forwarded: activeElement=${document.activeElement?.localName}, shadow=${el.shadowRoot!.activeElement === native ? 'native button' : 'null'}`,
    );
    el.remove();
    expect(true).toBe(true);
  });
  it('should report where Tab from the page puts focus', async () => {
    const el = document.createElement('mx-button');
    el.textContent = 'label';
    document.body.append(el);
    (document.activeElement as HTMLElement | null)?.blur();
    await userEvent.keyboard('{Tab}');
    const native = el.shadowRoot!.querySelector('.host');
    console.log(
      `RF33T ${server.browser} Tab: activeElement=${document.activeElement?.localName}, shadow=${el.shadowRoot!.activeElement === native ? 'native button' : (el.shadowRoot!.activeElement?.localName ?? 'null')}`,
    );
    el.remove();
    expect(true).toBe(true);
  });
});
