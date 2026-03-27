import { describe, expect, it } from 'vitest';
import { Bool, Num, Str } from '../../src/attribute.ts';
import { ControlledElement } from '../../src/element.ts';
import { impl, trait } from '../../src/traits/traits.ts';
import { defineCE, nameCE } from '../browser.ts';

class BaseElement extends ControlledElement {
  static observedAttributes = ['base'];
}

function createElement<T extends CustomElementConstructor>(
  element: T,
): InstanceType<T> {
  const tag = nameCE();

  defineCE(tag, element);

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return document.createElement(tag) as InstanceType<T>;
}

describe('traits', () => {
  it('should read a missing boolean-backed field as false', () => {
    const $checked: unique symbol = Symbol('Checked');

    const Checked = trait({ checked: Bool }, $checked);

    const element = createElement(Checked(BaseElement));

    expect(element.checked).toBe(false);
  });

  it('should write a boolean-backed field through a generated accessor', () => {
    const $checked: unique symbol = Symbol('Checked');

    const Checked = trait({ checked: Bool }, $checked);

    const element = createElement(Checked(BaseElement));

    element.checked = true;

    expect(element.getAttribute('checked')).toBe('');
  });

  it('should read a missing string-backed field as null', () => {
    const $value: unique symbol = Symbol('Value');

    const Valuable = trait({ value: Str }, $value);

    const element = createElement(Valuable(BaseElement));

    expect(element.value).toBeNull();
  });

  it('should write a string-backed field through a generated accessor', () => {
    const $value: unique symbol = Symbol('Value');

    const Valuable = trait({ value: Str }, $value);

    const element = createElement(Valuable(BaseElement));

    element.value = 'hello';

    expect(element.getAttribute('value')).toBe('hello');
  });

  it('should read a missing number-backed field as null', () => {
    const $count: unique symbol = Symbol('Count');

    const Countable = trait({ count: Num }, $count);

    const element = createElement(Countable(BaseElement));

    expect(element.count).toBeNull();
  });

  it('should write a number-backed field through a generated accessor', () => {
    const $count: unique symbol = Symbol('Count');

    const Countable = trait({ count: Num }, $count);

    const element = createElement(Countable(BaseElement));

    element.count = 42;

    expect(element.getAttribute('count')).toBe('42');
  });

  it('should merge observedAttributes with the base constructor', () => {
    const $checked: unique symbol = Symbol('Checked');

    const Checked = trait({ checked: Bool }, $checked);

    expect(Checked(BaseElement).observedAttributes).toEqual([
      'base',
      'checked',
    ]);
  });

  it('should merge observedAttributes across composed DOM traits', () => {
    const $checked: unique symbol = Symbol('Checked');
    const $value: unique symbol = Symbol('Value');

    const Checked = trait({ checked: Bool }, $checked);

    const Valuable = trait({ value: Str }, $value);

    const Combined = impl(BaseElement, [Checked, Valuable] as const);

    expect(Combined.observedAttributes).toEqual(['base', 'checked', 'value']);
  });
});
