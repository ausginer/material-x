import { assertType, describe, expectTypeOf, test } from 'vitest';
import { Bool, Num, Str } from '../../src/attribute.ts';
import { ControlledElement } from '../../src/element.ts';
import { impl, trait } from '../../src/traits/traits.ts';

class BaseElement extends ControlledElement {
  static observedAttributes = ['base'];
}

const $checked: unique symbol = Symbol('Checked');
const $value: unique symbol = Symbol('Value');
const $count: unique symbol = Symbol('Count');
const $manual: unique symbol = Symbol('Manual');

const Checked = trait({ checked: Bool }, $checked);

const Valuable = trait({ value: Str }, $value);

const Countable = trait({ count: Num }, $count);

const Manual = trait({ manual: null }, $manual);

describe('traits types', () => {
  test('should expose boolean DOM fields as non-nullable', () => {
    const Combined = impl(BaseElement, [Checked] as const);
    const instance = null as unknown as InstanceType<typeof Combined>;

    expectTypeOf(instance.checked).toEqualTypeOf<boolean>();
  });

  test('should expose string DOM fields as nullable', () => {
    const Combined = impl(BaseElement, [Valuable] as const);
    const instance = null as unknown as InstanceType<typeof Combined>;

    expectTypeOf(instance.value).toEqualTypeOf<string | null>();
  });

  test('should expose number DOM fields as nullable', () => {
    const Combined = impl(BaseElement, [Countable] as const);
    const instance = null as unknown as InstanceType<typeof Combined>;

    expectTypeOf(instance.count).toEqualTypeOf<number | null>();
  });

  test('should treat null descriptor entries as placeholder slots', () => {
    const Combined = impl(BaseElement, [Manual] as const);
    const instance = null as unknown as InstanceType<typeof Combined>;

    expectTypeOf(instance.manual).toEqualTypeOf<unknown>();
    // @ts-expect-error: placeholder slots are not converter-backed field contracts
    assertType<string | null>(instance.manual);
  });

  test('should accumulate DOM trait field types across tuple composition', () => {
    const Combined = impl(BaseElement, [Checked, Valuable, Countable] as const);
    const instance = null as unknown as InstanceType<typeof Combined>;

    expectTypeOf(instance.checked).toEqualTypeOf<boolean>();
    expectTypeOf(instance.value).toEqualTypeOf<string | null>();
    expectTypeOf(instance.count).toEqualTypeOf<number | null>();
  });
});
