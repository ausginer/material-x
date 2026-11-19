import { $ } from '@ydinjs/core/utils/DOM.js';
import { beforeEach, describe, expect, it } from 'vitest';
import Button from '../../../src/button/button.ts';
import '../../../src/button/icon-button.ts';
import '../../../src/button/link-button.ts';
import '../../../src/button/switch-button.ts';
import '../../../src/button/switch-icon-button.ts';
import '../../../src/fab/fab.ts';
import ListButtonItem from '../../../src/list/list-button-item.ts';
import '../../../src/list/list-link-item.ts';

/** Every host that adopts the trait (`repo:RF-33`). */
const FORWARDING_TAGS = [
  'mx-button',
  'mx-icon-button',
  'mx-link-button',
  'mx-switch-button',
  'mx-switch-icon-button',
  'mx-fab',
  'mx-list-button-item',
  'mx-list-link-item',
] as const;

let subclassFocusCalls = 0;

class FocusCountingButton extends Button {
  override focus(options?: FocusOptions): void {
    subclassFocusCalls += 1;
    super.focus(options);
  }
}

class FocusCountingListButtonItem extends ListButtonItem {
  override focus(options?: FocusOptions): void {
    subclassFocusCalls += 1;
    super.focus(options);
  }
}

customElements.define('test-focus-counting-button', FocusCountingButton);
customElements.define(
  'test-focus-counting-list-button-item',
  FocusCountingListButtonItem,
);

function create(tag: string): HTMLElement {
  const element = document.createElement(tag);
  element.textContent = 'Label';
  document.body.append(element);
  return element;
}

/** The nearest prototype of `element` that declares `focus`. */
function focusOwner(element: HTMLElement): object {
  let prototype = Object.getPrototypeOf(element) as object | null;

  while (prototype && !Object.hasOwn(prototype, 'focus')) {
    prototype = Object.getPrototypeOf(prototype) as object | null;
  }

  return prototype!;
}

describe('FocusForwarding', () => {
  beforeEach(() => {
    subclassFocusCalls = 0;
  });

  it.each(FORWARDING_TAGS)(
    'should resolve focus on %s to the trait method, not an own property',
    (tag) => {
      const element = create(tag);

      expect(Object.hasOwn(element, 'focus')).toBe(false);
      expect(
        Object.getOwnPropertySymbols(focusOwner(element)).some(
          (key) => key.description === 'FocusForwarding',
        ),
      ).toBe(true);
    },
  );

  it.each(FORWARDING_TAGS)('should focus the .host of %s on focus()', (tag) => {
    const element = create(tag);
    // A link takes focus only when it has an `href`.
    if (tag.includes('link')) {
      element.setAttribute('href', '#');
    }

    element.focus();

    expect(document.activeElement).toBe(element);
    expect(element.shadowRoot?.activeElement).toBe($(element, '.host'));
  });

  it.each([
    { tag: 'test-focus-counting-button', base: 'mx-button' },
    {
      tag: 'test-focus-counting-list-button-item',
      base: 'mx-list-button-item',
    },
  ])(
    "should call a $base subclass's own focus() and reach the control through super",
    ({ tag }) => {
      const element = create(tag);

      element.focus();

      expect(Object.hasOwn(element, 'focus')).toBe(false);
      expect(subclassFocusCalls).toBe(1);
      expect(document.activeElement).toBe(element);
      expect(element.shadowRoot?.activeElement).toBe($(element, '.host'));
    },
  );
});
