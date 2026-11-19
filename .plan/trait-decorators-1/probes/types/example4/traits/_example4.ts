import type { AbstractConstructor } from 'type-fest';
import { ControlledElement } from '../element.ts';

const BRANDS = new WeakMap<AbstractConstructor<unknown>, symbol>();

export function trait<T extends AbstractConstructor<unknown>>(ctr: T): T {
  const $brand = Symbol();
  BRANDS.set(ctr, $brand);

  return Object.defineProperty(ctr, Symbol.hasInstance, {
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

type Statics<T extends ReadonlyArray<AbstractConstructor<unknown>>> =
  T extends readonly [
    infer F extends AbstractConstructor<unknown>,
    ...infer R extends ReadonlyArray<AbstractConstructor<unknown>>,
  ]
    ? Omit<F, 'prototype'> & Statics<R>
    : unknown;

type Instances<T extends ReadonlyArray<AbstractConstructor<unknown>>> =
  T extends readonly [
    infer F extends AbstractConstructor<unknown>,
    ...infer R extends ReadonlyArray<AbstractConstructor<unknown>>,
  ]
    ? InstanceType<F> & Instances<R>
    : unknown;

type Bound<I extends object, S extends object = {}> = AbstractConstructor<I> &
  S;

export function bound<I extends object, S extends object = {}>(): Bound<I, S> {
  return {} as any;
}

export type Composed<
  B extends AbstractConstructor<unknown>,
  T extends ReadonlyArray<AbstractConstructor<unknown>>,
> = AbstractConstructor<InstanceType<B> & Instances<T>> & Statics<T>;

export function compose<
  const B extends AbstractConstructor<unknown>,
  const T extends ReadonlyArray<AbstractConstructor<unknown>>,
>(base: B): Composed<B, T> {
  return base as any;
}

/* ----- */

export const AnyElement: Bound<HTMLElement> = bound();
export const ObservedElement: Bound<
  HTMLElement,
  { readonly observedAttributes?: readonly string[] }
> = bound();

@trait
export class Disableable extends AnyElement {
  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }
  set disabled(value: boolean) {
    this.toggleAttribute('disabled', value);
  }
}

/** Overrides a member of its bound, with a type brand. */
const controls = new WeakMap<object, HTMLElement>();

@trait
export class FocusForwarding extends AnyElement {
  override focus(options?: FocusOptions): void {
    controls.get(this)?.focus(options);
  }
}

@trait
export class Counted {
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
  static {
    impl(this, Disableable, FocusForwarding, Counted);
  }

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
