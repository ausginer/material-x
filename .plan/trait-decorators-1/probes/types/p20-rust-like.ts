// P20. Rust-like traits: a required member, which an adopter must implement,
// and a provided one, which it may override. Form D (marker.ts) first, then
// the sketch's shape (sketch-fixed.ts).
import { ControlledElement } from './element.ts';
import { Traits } from './marker.ts';
import { impl, type Impl, type Trait } from './sketch-fixed.ts';
import { Disableable } from './traits.ts';

/** A trait with a required member and a provided one. */
export abstract class Labelled extends ControlledElement {
  abstract label(): string;
  describe(): string {
    return `[${this.label()}]`;
  }
}

// (a) An adopter that omits the required member. expected: TS2515
export class NoLabel extends Traits<[Labelled]> {}

// (b) It implements the member, with `override`. expected: ok
export class WithLabel extends Traits<[Labelled]> {
  override label(): string {
    return 'a';
  }
}

// (c) It implements the member without `override`. expected: unknown.
// Observed: ok in both compilers, so `override` is optional on an implementation
export class WithLabelNoOverride extends Traits<[Labelled]> {
  label(): string {
    return 'a';
  }
}

// (d) It overrides the provided member. expected: ok
export class Redescribed extends Traits<[Labelled]> {
  override label(): string {
    return 'a';
  }
  override describe(): string {
    return 'b';
  }
}

// (e) Another trait in the list supplies the required member. expected: unknown.
// Observed: ok, the intersection's concrete member satisfies the abstract one
export class LabelFromTrait extends ControlledElement {
  label(): string {
    return 'from a trait';
  }
}
export class SuppliedByTrait extends Traits<[Labelled, LabelFromTrait]> {}

// (f) A supertrait: a trait that takes other traits. expected: ok, and
// TS2515 for the adopter that omits the required member
export abstract class ButtonCore extends Traits<[Disableable, Labelled]> {}
export class Button extends Traits<[ButtonCore]> {
  override label(): string {
    return this.disabled ? 'off' : 'on';
  }
}
export class ButtonNoLabel extends Traits<[ButtonCore]> {}

// (g) A generic trait. expected: ok, and TS2416 for the wrong type
export abstract class Holding<T> extends ControlledElement {
  abstract get held(): T;
}
export class HoldsNumber extends Traits<[Holding<number>]> {
  override get held(): number {
    return 1;
  }
}
export class HoldsWrong extends Traits<[Holding<number>]> {
  override get held(): string {
    return '';
  }
}

// (h) A trait's static member, Rust's associated function. expected: TS2339,
// because the static side is ControlledElement's
export abstract class Creating extends ControlledElement {
  static create(): string {
    return '';
  }
}
export class Created extends Traits<[Creating]> {}
export const created: string = Created.create();

// (i) A generic bound, `T: Labelled` in Rust. expected: ok
export function describeAll<T extends Labelled>(items: readonly T[]): string[] {
  return items.map((item) => item.describe());
}
export const described: string[] = describeAll([new WithLabel()]);

// (j) The sketch's shape: a required member through impl and a Trait object.
// expected: TS2515
export const LabelledTrait: Trait<Labelled> = {
  [Symbol.hasInstance]: (_o: unknown): _o is Labelled => false,
};
const SketchBase: Impl<typeof ControlledElement, [typeof LabelledTrait]> = impl(
  ControlledElement,
  LabelledTrait,
);
export class SketchNoLabel extends SketchBase {}
export class SketchWithLabel extends SketchBase {
  override label(): string {
    return 'a'; // expected: ok
  }
}
