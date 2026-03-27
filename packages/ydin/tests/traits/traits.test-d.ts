import { assertType, describe, expectTypeOf, it } from 'vitest';
import { Bool, Num, Str } from '../../src/attribute.ts';
import { ControlledElement } from '../../src/element.ts';
import {
  impl,
  type Interface,
  type Props,
  trait,
} from '../../src/traits/traits.ts';

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
  it('should expose boolean element fields as non-nullable', () => {
    const Combined = impl(BaseElement, [Checked] as const);
    const instance = null as unknown as InstanceType<typeof Combined>;

    expectTypeOf(instance.checked).toEqualTypeOf<boolean>();
  });

  it('should expose string element fields as nullable', () => {
    const Combined = impl(BaseElement, [Valuable] as const);
    const instance = null as unknown as InstanceType<typeof Combined>;

    expectTypeOf(instance.value).toEqualTypeOf<string | null>();
  });

  it('should expose number element fields as nullable', () => {
    const Combined = impl(BaseElement, [Countable] as const);
    const instance = null as unknown as InstanceType<typeof Combined>;

    expectTypeOf(instance.count).toEqualTypeOf<number | null>();
  });

  it('should treat null descriptor entries as placeholder slots', () => {
    const Combined = impl(BaseElement, [Manual] as const);
    const instance = null as unknown as InstanceType<typeof Combined>;

    expectTypeOf(instance.manual).toEqualTypeOf<unknown>();
    // @ts-expect-error: placeholder slots are not converter-backed field contracts
    assertType<string | null>(instance.manual);
  });

  it('should project framework props from a concrete element trait', () => {
    type CheckedProps = Props<typeof Checked>;

    assertType<CheckedProps>({});
    assertType<CheckedProps>({ checked: true });
    // @ts-expect-error: framework props should keep boolean value types
    assertType<CheckedProps>({ checked: 'true' });
  });

  it('should expose a branded instance interface from a concrete element trait', () => {
    type CheckedInterface = Interface<typeof Checked>;
    const instance = null as unknown as CheckedInterface;

    expectTypeOf(instance.checked).toEqualTypeOf<boolean>();
    // @ts-expect-error: Interface should retain the trait brand
    assertType<CheckedInterface>({ checked: true });
  });

  it('should accumulate element trait field types across tuple composition', () => {
    const Combined = impl(BaseElement, [Checked, Valuable, Countable] as const);
    const instance = null as unknown as InstanceType<typeof Combined>;

    expectTypeOf(instance.checked).toEqualTypeOf<boolean>();
    expectTypeOf(instance.value).toEqualTypeOf<string | null>();
    expectTypeOf(instance.count).toEqualTypeOf<number | null>();
  });
});
