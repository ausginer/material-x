// Scratch reading for repo:RF-33, removed after its reading.
import { describe, expect, it } from 'vitest';
import { server, userEvent } from 'vitest/browser';
import '../../src/button/button.ts';
import '../../src/button/icon-button.ts';
import '../../src/button/link-button.ts';
import '../../src/button/switch-button.ts';
import '../../src/button/switch-icon-button.ts';
import '../../src/list/list-button-item.ts';
import '../../src/list/list-link-item.ts';

const LISTED = [
  'mx-button',
  'mx-icon-button',
  'mx-link-button',
  'mx-switch-button',
  'mx-switch-icon-button',
  'mx-list-button-item',
  'mx-list-link-item',
] as const;

function listed(tag: string): HTMLElement {
  const el = document.createElement(tag);
  el.textContent = 'label';
  if (tag.includes('link')) el.setAttribute('href', '#target');
  return el;
}

function frames(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

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
  for (const tag of LISTED) {
    it(`should compare delegation and the forward for ${tag}`, () => {
      const el = listed(tag);
      document.body.append(el);
      HTMLElement.prototype.focus.call(el);
      const delegated = el.shadowRoot!.activeElement;
      (document.activeElement as HTMLElement | null)?.blur();
      el.focus();
      const forwarded = el.shadowRoot!.activeElement;
      const name = (node: Element | null) =>
        node ? `${node.localName}.${node.className}` : 'null';
      console.log(
        `RF33F ${server.browser} ${tag}: delegation=${name(delegated)} forward=${name(forwarded)} same=${delegated === forwarded}`,
      );
      el.remove();
      expect(true).toBe(true);
    });

    it(`should report autofocus for ${tag}`, async () => {
      const el = listed(tag);
      el.setAttribute('autofocus', '');
      document.body.append(el);
      await frames();
      await frames();
      const control =
        el.shadowRoot!.querySelector('.control') ??
        el.shadowRoot!.querySelector('.host');
      console.log(
        `RF33A ${server.browser} ${tag} autofocus: activeElement=${document.activeElement?.localName}, shadow=${el.shadowRoot!.activeElement === control ? 'control' : (el.shadowRoot!.activeElement?.localName ?? 'null')}`,
      );
      el.remove();
      expect(true).toBe(true);
    });
  }
  it('should report autofocus on a plain native button, as a control', async () => {
    const button = document.createElement('button');
    button.textContent = 'plain';
    button.setAttribute('autofocus', '');
    document.body.append(button);
    await frames();
    await frames();
    console.log(
      `RF33A ${server.browser} control <button autofocus>: activeElement=${document.activeElement?.localName}`,
    );
    button.remove();
    expect(true).toBe(true);
  });
  for (const variant of ['button', 'host-contents', 'host-inline']) {
    it(`should report autofocus in a fresh top-level document: ${variant}`, async () => {
      const opener = document.createElement('button');
      opener.textContent = 'open';
      let popup: Window | null = null;
      opener.addEventListener('click', () => {
        popup = window.open('about:blank', '_blank', 'width=400,height=300');
      });
      document.body.append(opener);
      await userEvent.click(opener);
      opener.remove();
      if (!popup) {
        console.log(
          `RF33A ${server.browser} fresh ${variant}: popup not opened`,
        );
        expect(true).toBe(true);
        return;
      }
      const win = popup as Window;
      win.document.write(`<!doctype html><body><script>
        customElements.define('x-host', class extends HTMLElement {
          constructor() {
            super();
            const root = this.attachShadow({ mode: 'open', delegatesFocus: true });
            root.innerHTML = '<style>:host { display: ${variant === 'host-contents' ? 'contents' : 'inline'} }</style><button>x</button>';
          }
        });
      <\/script>${variant === 'button' ? '<button autofocus>b</button>' : '<x-host autofocus></x-host>'}</body>`);
      win.document.close();
      await new Promise((resolve) => setTimeout(resolve, 300));
      const active = win.document.activeElement;
      const shadow = active?.shadowRoot?.activeElement;
      console.log(
        `RF33A ${server.browser} fresh ${variant}: hasFocus=${win.document.hasFocus()} activeElement=${active?.localName ?? 'null'}${active?.shadowRoot ? ` shadow=${shadow?.localName ?? 'null'}` : ''}`,
      );
      win.close();
      expect(true).toBe(true);
    });
  }
});
