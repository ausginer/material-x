// P18. The sketch with the fewest type fixes (sketch-fixed.ts) as a component
// base: the study's checks.
import { ControlledElement } from './element.ts';
import {
  Counted,
  Disableable,
  DisableableTrait,
  impl,
  NamedNumber,
  NamedString,
  Valuable,
  ValuableTrait,
  type Impl,
  type TraitInstances,
} from './sketch-fixed.ts';

// (a) In the heritage clause of an exported class. expected: TS9021 only
export class Inline extends impl(ControlledElement, Valuable) {}

// (b) The same in a class that isn't exported. expected: ok
class Local extends impl(ControlledElement, Valuable, Disableable) {
  check(): boolean {
    return this.disabled && this.value !== null; // expected: ok
  }
}

// (c) The list in an annotated constant, which is form C's shape. expected: ok
const ButtonBase: Impl<
  typeof ControlledElement,
  [typeof Valuable, typeof Disableable]
> = impl(ControlledElement, Valuable, Disableable);
export class Button extends ButtonBase {
  check(): boolean {
    return this.disabled; // expected: ok
  }
  override get value(): string | null {
    return 'x'; // expected: ok, with `override`
  }
  override set value(_v: string | null) {}
}

// (d) Two traits give their intersection, not `never`. expected: ok
export const twoTraits: [
  TraitInstances<[typeof Valuable, typeof Disableable]>,
] extends [ValuableTrait & DisableableTrait]
  ? true
  : false = true;

// (e) RF-57: a subclass's accessor over a trait's field. expected: TS2611
const CounterBase: Impl<typeof ControlledElement, [typeof Counted]> = impl(
  ControlledElement,
  Counted,
);
export class Counter extends CounterBase {}
export class SubCounter extends Counter {
  override get count(): number {
    return 1;
  }
  override set count(_v: number) {}
}

// (f) The component's own field over a trait's accessor. expected: TS2610
const OwnFieldBase: Impl<typeof ControlledElement, [typeof Disableable]> = impl(
  ControlledElement,
  Disableable,
);
export class OwnField extends OwnFieldBase {
  override disabled: boolean = false;
}

// (g) Two traits with one member of different types. expected: `never`, no error
const ConflictBase: Impl<
  typeof ControlledElement,
  [typeof NamedString, typeof NamedNumber]
> = impl(ControlledElement, NamedString, NamedNumber);
export class Conflict extends ConflictBase {
  read(): never {
    return this.name; // expected: ok, `name` is `never`
  }
}

// (h) The annotation names a trait that the call doesn't. expected: TS2322
const Missing: Impl<
  typeof ControlledElement,
  [typeof Valuable, typeof Disableable]
> = impl(ControlledElement, Valuable);
export class FromMissing extends Missing {}

// (i) The call names a trait that the annotation doesn't. expected: ok, so the
// two lists disagree in silence, and the flattener adds a member the types lack
const Extra: Impl<typeof ControlledElement, [typeof Valuable]> = impl(
  ControlledElement,
  Valuable,
  Disableable,
);
export class FromExtra extends Extra {}

// (j) The class passed in place of its Trait object. expected: TS2345
const ClassPassed: Impl<typeof ControlledElement, []> = impl(
  ControlledElement,
  ValuableTrait,
);
export class FromClassPassed extends ClassPassed {}
