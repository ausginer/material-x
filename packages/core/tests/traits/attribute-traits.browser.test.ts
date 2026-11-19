// oxlint-disable max-classes-per-file
import { describe, expect, it } from 'vitest';
import { Bool, Num, Str } from '../../src/attribute.ts';
import { ControlledElement } from '../../src/element.ts';
import { AnyElement, attributes } from '../../src/traits/attribute-traits.ts';
import { compose, trait, type Composed } from '../../src/traits/composition.ts';
import { defineCE, nameCE } from '../browser.ts';

class BaseElement extends ControlledElement {
  static observedAttributes: readonly string[] = ['base'];
}

class Checked extends AnyElement {
  static {
    trait(this);
    attributes(this, { checked: Bool });
  }

  accessor checked!: boolean;
}

class Valued extends AnyElement {
  static {
    trait(this);
    attributes(this, { value: Str });
  }

  accessor value!: string | null;
}

class Counted extends AnyElement {
  static {
    trait(this);
    attributes(this, { count: Num });
  }

  accessor count!: number | null;
}

const CheckedBase: Composed<typeof BaseElement, [typeof Checked]> =
  compose(BaseElement);
class CheckedElement extends CheckedBase {}

const ValuedBase: Composed<typeof BaseElement, [typeof Valued]> =
  compose(BaseElement);
class ValuedElement extends ValuedBase {}

const CountedBase: Composed<typeof BaseElement, [typeof Counted]> =
  compose(BaseElement);
class CountedElement extends CountedBase {}

const CombinedBase: Composed<
  typeof BaseElement,
  [typeof Checked, typeof Valued]
> = compose(BaseElement);
class CombinedElement extends CombinedBase {}

/** Defines a fresh subclass of `element` and creates one. */
function createElement<T extends CustomElementConstructor>(
  element: T,
): InstanceType<T> {
  const tag = nameCE();

  defineCE(tag, class extends element {});

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return document.createElement(tag) as InstanceType<T>;
}

describe('attributes', () => {
  it('should read a missing boolean-backed member as false', () => {
    expect(createElement(CheckedElement).checked).toBe(false);
  });

  it('should write a boolean-backed member to the attribute', () => {
    const element = createElement(CheckedElement);

    element.checked = true;

    expect(element.getAttribute('checked')).toBe('');
  });

  it('should read a missing string-backed member as null', () => {
    expect(createElement(ValuedElement).value).toBeNull();
  });

  it('should write a string-backed member to the attribute', () => {
    const element = createElement(ValuedElement);

    element.value = 'hello';

    expect(element.getAttribute('value')).toBe('hello');
  });

  it('should read a missing number-backed member as null', () => {
    expect(createElement(CountedElement).count).toBeNull();
  });

  it('should write a number-backed member to the attribute', () => {
    const element = createElement(CountedElement);

    element.count = 42;

    expect(element.getAttribute('count')).toBe('42');
  });

  it("should add the trait's attributes to the base's observedAttributes", () => {
    expect(CheckedElement.observedAttributes).toEqual(['base', 'checked']);
  });

  it("should add each trait's attributes in list order", () => {
    expect(CombinedElement.observedAttributes).toEqual([
      'base',
      'checked',
      'value',
    ]);
  });

  it('should make the component an instance of each trait', () => {
    const element = createElement(CombinedElement);

    expect([element instanceof Checked, element instanceof Valued]).toEqual([
      true,
      true,
    ]);
  });
});
