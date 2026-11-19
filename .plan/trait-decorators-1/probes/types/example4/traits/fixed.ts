// The owner's _example4.ts with the fixes P27 to P29 call for, in the form the
// study recommends. Each fix is marked `fix N`; everything else is his.
import type { AbstractConstructor } from 'type-fest';
import { ControlledElement } from '../element.ts';

const BRANDS = new WeakMap<AbstractConstructor<unknown>, symbol>();
const BOUNDS = new WeakSet<AbstractConstructor<unknown>>(); // fix 5

// fix 1: called from the trait's static block, not as a decorator, so no
// tsconfig needs experimentalDecorators and Node runs the module unbuilt.
export function trait(ctr: AbstractConstructor<unknown>): void {
  const $brand = Symbol();
  BRANDS.set(ctr, $brand);

  Object.defineProperty(ctr, Symbol.hasInstance, {
    configurable: true,
    value(o: unknown): boolean {
      return (
        o != null &&
        typeof o === 'object' &&
        (o as { [$brand]: boolean })[$brand]
      );
    },
  });
}

export function impl(
  { prototype }: AbstractConstructor<unknown>,
  ...traits: ReadonlyArray<AbstractConstructor<unknown>>
): void {
  for (const trait of traits) {
    if (BRANDS.has(trait)) {
      Object.defineProperty(prototype, BRANDS.get(trait)!, { value: true });
    }
  }
}

// fix 2: the key under which a bound records what it requires. Type-only.
declare const $bound: unique symbol;

type Statics<T extends ReadonlyArray<AbstractConstructor<unknown>>> =
  T extends readonly [
    infer F extends AbstractConstructor<unknown>,
    ...infer R extends ReadonlyArray<AbstractConstructor<unknown>>,
  ]
    ? Omit<F, 'prototype' | typeof $bound> & Statics<R> // fix 2
    : unknown;

type Instances<T extends ReadonlyArray<AbstractConstructor<unknown>>> =
  T extends readonly [
    infer F extends AbstractConstructor<unknown>,
    ...infer R extends ReadonlyArray<AbstractConstructor<unknown>>,
  ]
    ? InstanceType<F> & Instances<R>
    : unknown;

// fix 2: exported, and it records I and S under $bound.
export type Bound<
  I extends object,
  S extends object = {},
> = AbstractConstructor<I> &
  S & { readonly [$bound]: (instance: I, statics: S) => void };

// fix 3: a class, since a trait extends its bound when its module is evaluated.
export function bound<I extends object, S extends object = {}>(): Bound<I, S> {
  const ctr = class {};
  BOUNDS.add(ctr); // fix 5
  return ctr as any;
}

// fix 2: Applicable restored.
export type Applicable<B extends AbstractConstructor<unknown>> =
  AbstractConstructor<unknown> & {
    readonly [$bound]?: (instance: InstanceType<B>, statics: B) => void;
  };

// fix 4: `B &` keeps the base's own statics.
export type Composed<
  B extends AbstractConstructor<unknown>,
  T extends ReadonlyArray<Applicable<B>>, // fix 2
> = B & AbstractConstructor<InstanceType<B> & Instances<T>> & Statics<T>;

export function compose<
  const B extends AbstractConstructor<unknown>,
  const T extends ReadonlyArray<Applicable<B>>, // fix 2
>(base: B): Composed<B, T> {
  // fix 5: a supertrait composes a bound, and that runs unbuilt; a component's
  // composition is replaced by the flattener, so one that runs is a build error.
  if (!BOUNDS.has(base)) {
    throw new Error('compose() of a component is replaced by the flattener');
  }
  return base as any;
}

/* ----- */

export const AnyElement: Bound<HTMLElement> = bound();
export const ObservedElement: Bound<
  HTMLElement,
  { readonly observedAttributes?: readonly string[] }
> = bound();

export class Disableable extends AnyElement {
  static {
    trait(this); // fix 1
  }
  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }
  set disabled(value: boolean) {
    this.toggleAttribute('disabled', value);
  }
}

/** Overrides a member of its bound, with a type brand. */
const controls = new WeakMap<object, HTMLElement>();

export class FocusForwarding extends AnyElement {
  static {
    trait(this); // fix 1
  }
  override focus(options?: FocusOptions): void {
    controls.get(this)?.focus(options);
  }
}

export class Counted {
  static {
    trait(this); // fix 1
  }
  static zero(): number {
    return 0;
  }
  count: number = 0; // RF-57's shape, for TS2611
}

export type ButtonCoreTraits = readonly [
  typeof Disableable,
  typeof FocusForwarding,
];

const IconButtonBase: Composed<
  typeof ControlledElement,
  [...ButtonCoreTraits, typeof Counted]
> = compose(ControlledElement);

export class IconButton extends IconButtonBase {
  // fix 6: no hand-written `impl`. The flattener derives the list from the
  // annotation, supertraits expanded, and generates
  //   static { impl(this, Disableable, FocusForwarding, Counted); }

  // No `override` here: the real ControlledElement declares no static
  // observedAttributes (the probes' stand-in does, so P25 writes `override`).
  static observedAttributes: readonly string[] = ['disabled'];

  check(): boolean {
    return this.disabled && this.count === IconButton.zero();
  }

  override focus(options?: FocusOptions): void {
    this.disabled = false;
    super.focus(options); // typechecks; the flattener rejects super.<trait key>
  }
}
