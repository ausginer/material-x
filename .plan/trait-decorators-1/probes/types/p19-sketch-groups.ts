// P19. Groups of traits in the sketch's shape (sketch-fixed.ts), and the same
// traits under form D.
import { ControlledElement } from './element.ts';
import {
  Counted,
  Disableable,
  DisableableTrait,
  impl,
  Valuable,
  ValuableTrait,
  type Impl,
  type Trait,
  type TraitInstance,
} from './sketch-fixed.ts';

// (a) A value group spread into impl. The annotation spreads the group's type.
// expected: ok. At runtime the exported array stays, as RF-63's lists do
export const BUTTON_CORE_TRAITS: readonly [
  typeof Valuable,
  typeof Disableable,
] = [Valuable, Disableable];
const SpreadBase: Impl<
  typeof ControlledElement,
  [...typeof BUTTON_CORE_TRAITS, typeof Counted]
> = impl(ControlledElement, ...BUTTON_CORE_TRAITS, Counted);
export class Spread extends SpreadBase {
  check(): boolean {
    return this.disabled && this.count > 0; // expected: ok
  }
}

// (b) A value group passed whole, with no spread: impl takes a group as an
// element, and the types flatten it. expected: ok
type TraitList = ReadonlyArray<Trait<any> | TraitList>;
type Flat<T extends TraitList> = T extends readonly [
  infer H,
  ...infer R extends TraitList,
]
  ? (H extends TraitList
      ? Flat<H>
      : H extends Trait<any>
        ? TraitInstance<H>
        : never) &
      Flat<R>
  : unknown;
export type ImplNested<
  B extends abstract new (...args: any[]) => object,
  T extends TraitList,
> = B & (new (...args: any[]) => InstanceType<B> & Flat<T>);
export declare function implNested<
  B extends abstract new (...args: any[]) => object,
  T extends TraitList,
>(base: B, ...traits: T): ImplNested<B, T>;

export const BUTTON_CORE_GROUP: readonly [typeof Valuable, typeof Disableable] =
  [Valuable, Disableable];
export const ICON_BUTTON_GROUP: readonly [
  typeof BUTTON_CORE_GROUP,
  typeof Counted,
] = [BUTTON_CORE_GROUP, Counted];
const NestedBase: ImplNested<
  typeof ControlledElement,
  [typeof ICON_BUTTON_GROUP]
> = implNested(ControlledElement, ICON_BUTTON_GROUP);
export class Nested extends NestedBase {
  check(): boolean {
    return this.disabled && this.count > 0 && this.value !== null; // expected: ok
  }
}

// (c) A type-level group. The annotation can name it, but the call still
// lists each trait as a value. expected: ok
export type ButtonCoreTraits = readonly [typeof Valuable, typeof Disableable];
const TypeGroupBase: Impl<
  typeof ControlledElement,
  [...ButtonCoreTraits, typeof Counted]
> = impl(ControlledElement, Valuable, Disableable, Counted);
export class TypeGroup extends TypeGroupBase {}

// (d) A group as a trait of its own, Rust's supertrait: an interface over the
// trait classes, and one Trait object that checks both brands. expected: ok
export interface ButtonCoreTrait extends ValuableTrait, DisableableTrait {}
export const ButtonCore: Trait<ButtonCoreTrait> = {
  [Symbol.hasInstance]: (o: unknown): o is ButtonCoreTrait =>
    o instanceof Valuable && o instanceof Disableable,
};
const SuperBase: Impl<typeof ControlledElement, [typeof ButtonCore]> = impl(
  ControlledElement,
  ButtonCore,
);
export class Super extends SuperBase {
  check(): boolean {
    return this.disabled && this.value !== null; // expected: ok
  }
}
export function isButtonCore(node: Node): boolean {
  return node instanceof ButtonCore && node.disabled; // expected: ok
}

// (e) The own-field check through a supertrait. expected: TS2610
export class SuperOwnField extends SuperBase {
  override disabled: boolean = false;
}

// (f) Form D over the sketch's Trait objects, with a type-level group.
// expected: ok
type Intersect<T extends readonly Trait<any>[]> = T extends readonly [
  infer H extends Trait<any>,
  ...infer R extends readonly Trait<any>[],
]
  ? TraitInstance<H> & Intersect<R>
  : unknown;
export const Traits: typeof ControlledElement &
  (new <const T extends readonly Trait<any>[]>() => ControlledElement &
    Intersect<T>) = ControlledElement as any;
export class FormD extends Traits<[...ButtonCoreTraits, typeof Counted]> {
  check(): boolean {
    return this.disabled && this.count > 0; // expected: ok
  }
}
export class FormDOwnField extends Traits<ButtonCoreTraits> {
  override disabled: boolean = false; // expected: TS2610
}
