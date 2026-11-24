import { describe, expect, it } from 'vitest';
import '../src/button/link-button.ts';
import '../src/button/switch-button.ts';
import '../src/button/switch-icon-button.ts';
import '../src/list/list-button-item.ts';
import '../src/list/list-link-item.ts';
import '../src/text-field/multiline-text-field.ts';
import '../src/text-field/text-field.ts';
import { nextFrame } from './browser.ts';

type Pair = Readonly<{
  tag: string;
  aria: string;
  /** The host's attribute that the component's own value follows. */
  source: string;
  /** The value that the host gives. */
  given: string;
  /** The component's own value while the host has `source`. */
  on: string;
  /** The component's own value after the host lost `source`. */
  off: string | null;
}>;

const PAIRS: readonly Pair[] = [
  {
    tag: 'mx-text-field',
    aria: 'aria-invalid',
    source: 'error',
    given: 'false',
    on: 'true',
    off: null,
  },
  {
    tag: 'mx-multiline-text-field',
    aria: 'aria-required',
    source: 'required',
    given: 'false',
    on: 'true',
    off: null,
  },
  {
    tag: 'mx-switch-button',
    aria: 'aria-checked',
    source: 'checked',
    given: 'mixed',
    on: 'true',
    off: 'false',
  },
  {
    tag: 'mx-switch-button',
    aria: 'aria-invalid',
    source: 'error',
    given: 'grammar',
    on: 'true',
    off: null,
  },
  {
    tag: 'mx-link-button',
    aria: 'aria-disabled',
    source: 'disabled',
    given: 'false',
    on: 'true',
    off: null,
  },
  {
    tag: 'mx-link-button',
    aria: 'aria-disabled',
    source: 'disabled',
    given: 'true',
    on: 'true',
    off: null,
  },
  {
    tag: 'mx-list-link-item',
    aria: 'aria-disabled',
    source: 'disabled',
    given: 'false',
    on: 'true',
    off: null,
  },
  {
    tag: 'mx-list-link-item',
    aria: 'aria-current',
    source: 'selected',
    given: 'step',
    on: 'page',
    off: null,
  },
  {
    tag: 'mx-list-button-item',
    aria: 'aria-selected',
    source: 'selected',
    given: 'true',
    on: 'true',
    off: 'false',
  },
];

function create(
  tag: string,
): Readonly<{ host: HTMLElement; control: HTMLElement }> {
  const host = document.createElement(tag);
  const control = host.shadowRoot!.querySelector<HTMLElement>('.input, .host')!;

  return { host, control };
}

describe.each(PAIRS)(
  '$tag $aria, with "$given" on the host',
  ({ tag, aria, source, given, on, off }) => {
    it("should be the component's after the host's is set and lost", async () => {
      const { host, control } = create(tag);
      document.body.append(host);
      host.setAttribute(source, '');
      host.setAttribute(aria, given);
      await nextFrame();
      expect(control).toHaveAttribute(aria, given);

      host.removeAttribute(aria);
      await nextFrame();

      expect(control).toHaveAttribute(aria, on);
    });

    it("should be the component's when the loss, the source and the connect are in one task", async () => {
      const { host, control } = create(tag);
      document.body.append(host);
      host.setAttribute(aria, given);
      await nextFrame();
      host.remove();
      await nextFrame();
      host.removeAttribute(aria);
      host.setAttribute(source, '');
      document.body.append(host);

      expect(control).toHaveAttribute(aria, on);
    });

    it("should be the component's when the host's is set and lost before the first connect", async () => {
      const { host, control } = create(tag);
      host.setAttribute(aria, given);
      host.removeAttribute(aria);
      host.setAttribute(source, '');
      document.body.append(host);
      await nextFrame();

      expect(control).toHaveAttribute(aria, on);
    });

    it("should stay the host's while the source changes, and then be the component's", async () => {
      const { host, control } = create(tag);
      document.body.append(host);

      // The own value of the state that the source changes to differs from
      // the host's value.
      const isOn = on !== given;
      const own = isOn ? on : off;

      host.toggleAttribute(source, !isOn);
      host.setAttribute(aria, given);
      await nextFrame();
      host.toggleAttribute(source, isOn);
      await nextFrame();
      expect(control).toHaveAttribute(aria, given);

      host.removeAttribute(aria);
      await nextFrame();

      expect(control.getAttribute(aria)).toBe(own);
    });

    it("should be the component's without the source, after the source and the host's are set and lost", async () => {
      const { host, control } = create(tag);
      document.body.append(host);
      host.setAttribute(source, '');
      host.setAttribute(aria, given);
      await nextFrame();
      host.removeAttribute(source);
      await nextFrame();
      host.removeAttribute(aria);
      await nextFrame();

      expect(control.getAttribute(aria)).toBe(off);
    });
  },
);

describe.each(['mx-switch-button', 'mx-switch-icon-button'])(
  '%s aria-checked with no change of checked',
  (tag) => {
    it("should be 'false' before the first connect", () => {
      const { control } = create(tag);

      expect(control).toHaveAttribute('aria-checked', 'false');
    });

    it("should be 'false' after the host's is set and lost before the first connect", async () => {
      const { host, control } = create(tag);
      host.setAttribute('aria-checked', 'mixed');
      await nextFrame();
      host.removeAttribute('aria-checked');
      await nextFrame();
      document.body.append(host);

      expect(control).toHaveAttribute('aria-checked', 'false');
    });
  },
);
