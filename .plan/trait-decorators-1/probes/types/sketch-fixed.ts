// The owner's sketch (sketch/_example.ts) with the fewest type changes that
// let a component extend it. Each change is marked "fix". The rest is the
// sketch's, and the traits below Valuable are added for the probes.
import type { Constructor } from 'type-fest';
import attribute, { Bool, Str } from './attribute.ts';
import { ControlledElement } from './element.ts';

declare const trait: ClassDecorator;

export interface Trait<T extends object> {
  [Symbol.hasInstance](o: unknown): o is T;
}

export type TraitInstance<T extends Trait<any>> =
  T extends Trait<infer I> ? I : never;

// fix 1: a rest tuple isn't a Trait, so the sketch's TraitInstance<T> over it
// is `never`. Map each element and intersect them.
export type TraitInstances<T extends readonly Trait<any>[]> =
  T extends readonly [
    infer H extends Trait<any>,
    ...infer R extends readonly Trait<any>[],
  ]
    ? TraitInstance<H> & TraitInstances<R>
    : unknown;

// fix 2: `extends` needs a constructor, so impl returns the base's
// constructor whose instances also have the traits' members.
export type Impl<
  B extends Constructor<any>,
  T extends readonly Trait<any>[],
> = B & (new (...args: any[]) => InstanceType<B> & TraitInstances<T>);

export function impl<
  B extends Constructor<any>,
  T extends ReadonlyArray<Trait<any>>,
>(base: B, ..._traits: T): Impl<B, T> {
  return base as never; // fix 3: the type is a claim that the flattener makes true
}

// oxlint-disable-next-line typescript/no-unnecessary-type-parameters
export function createHasInstance<T extends object>(
  brand: symbol,
): (o: unknown) => o is T {
  return (o: unknown): o is T =>
    o != null && typeof o === 'object' && !!(o as { [brand]: boolean })[brand];
}

const $valuable = Symbol();

@trait
export class ValuableTrait extends HTMLElement {
  static observedAttributes: readonly string[] = ['value'];

  static {
    Object.defineProperty(this.prototype, $valuable, {
      value: true,
    });
  }

  get value(): string | null {
    return attribute.get(this, 'value', Str);
  }

  set value(v: string | null) {
    attribute.set(this, 'value', v, Str);
  }
}

export const Valuable: Trait<ValuableTrait> = {
  [Symbol.hasInstance]: createHasInstance($valuable),
};

// Added for the probes, in the sketch's shape.

const $disableable = Symbol();

export class DisableableTrait extends ControlledElement {
  get disabled(): boolean {
    return attribute.get(this, 'disabled', Bool);
  }

  set disabled(v: boolean) {
    attribute.set(this, 'disabled', v, Bool);
  }
}

export const Disableable: Trait<DisableableTrait> = {
  [Symbol.hasInstance]: createHasInstance($disableable),
};

/** RF-57's shape: a trait with a class field. */
export class CountedTrait extends ControlledElement {
  count: number = 0;
}
export const Counted: Trait<CountedTrait> = {
  [Symbol.hasInstance]: createHasInstance(Symbol()),
};

/** Two traits whose members conflict. */
export class NamedStringTrait extends ControlledElement {
  name: string = '';
}
export const NamedString: Trait<NamedStringTrait> = {
  [Symbol.hasInstance]: createHasInstance(Symbol()),
};
export class NamedNumberTrait extends ControlledElement {
  name: number = 0;
}
export const NamedNumber: Trait<NamedNumberTrait> = {
  [Symbol.hasInstance]: createHasInstance(Symbol()),
};
