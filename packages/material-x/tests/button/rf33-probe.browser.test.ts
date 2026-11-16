// Scratch probe for repo:RF-33, removed after its reading. It adds one of
// `mx-button`'s ingredients at a time to a host that delegates focus, and
// reports whether `focus()` on the host focuses the native button.
import { describe, expect, it } from 'vitest';
import { server } from 'vitest/browser';
import '../../src/button/button.ts';
import buttonTemplate from '../../src/button/button.tpl.html' with { type: 'html' };

type Variant = Readonly<{
  name: string;
  formAssociated?: boolean;
  internals?: boolean;
  template?: 'plain' | 'mx-button';
  styles?: boolean;
}>;

let count = 0;

function define(variant: Variant): string {
  const tag = `rf33-probe-${(count += 1)}`;
  const styles = variant.styles
    ? [...document.createElement('mx-button').shadowRoot!.adoptedStyleSheets]
    : [];

  class Probe extends HTMLElement {
    static formAssociated = variant.formAssociated ?? false;

    constructor() {
      super();
      if (variant.internals) {
        this.attachInternals();
      }
      const root = this.attachShadow({ mode: 'open', delegatesFocus: true });
      if (variant.template === 'mx-button') {
        root.append(buttonTemplate.content.cloneNode(true));
      } else {
        root.innerHTML = '<button type="button" class="host">x</button>';
      }
      root.adoptedStyleSheets = styles;
    }
  }

  customElements.define(tag, Probe);
  return tag;
}

function reading(element: HTMLElement): string {
  const button = element.shadowRoot!.querySelector('.host');
  const inner = element.shadowRoot!.activeElement;
  return `active=${document.activeElement?.localName ?? 'null'} shadowActive=${inner === button ? 'native button' : (inner?.localName ?? 'null')}`;
}

const variants: readonly Variant[] = [
  { name: 'A plain host' },
  { name: 'B + attachInternals()', internals: true },
  { name: 'C + formAssociated, no attachInternals()', formAssociated: true },
  {
    name: 'D + attachInternals() + formAssociated',
    internals: true,
    formAssociated: true,
  },
  { name: "E + mx-button's template", template: 'mx-button' },
  { name: "F + mx-button's stylesheets", styles: true },
  {
    name: "G + mx-button's template and stylesheets",
    template: 'mx-button',
    styles: true,
  },
  {
    name: 'H D + template + stylesheets',
    internals: true,
    formAssociated: true,
    template: 'mx-button',
    styles: true,
  },
];

describe('RF-33 probe', () => {
  for (const variant of variants) {
    it(`should report ${variant.name}`, () => {
      const element = document.createElement(define(variant));
      element.textContent = 'label';
      document.body.append(element);
      element.focus();
      // oxlint-disable-next-line no-console
      console.log(
        `RF33 ${server.browser} ${variant.name}: ${reading(element)}`,
      );
      element.remove();
      expect(true).toBe(true);
    });
  }

  it('should report a real mx-button', () => {
    const element = document.createElement('mx-button');
    element.textContent = 'label';
    document.body.append(element);
    element.focus();
    // oxlint-disable-next-line no-console
    console.log(`RF33 ${server.browser} real mx-button: ${reading(element)}`);
    element.remove();
    expect(true).toBe(true);
  });
});
