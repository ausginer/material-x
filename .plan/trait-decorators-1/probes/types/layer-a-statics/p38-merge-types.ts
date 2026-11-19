// P38. How Statics<T> types two traits' statics of one key, against the value
// the generic merge builds at runtime.
import { ControlledElement } from '../../../../../packages/core/src/element.ts';
import { compose, trait, type Composed } from '../layer-b/piirre.ts';

export class ColoredNames {
  static {
    trait(this);
  }
  static readonly observedAttributes: readonly ('color' | 'size')[] = [
    'color',
    'size',
  ];
}
export class DisabledNames {
  static {
    trait(this);
  }
  static readonly observedAttributes: readonly 'disabled'[] = ['disabled'];
}
export class ColoredOptions {
  static {
    trait(this);
  }
  static readonly options: { readonly delegates: boolean } = {
    delegates: true,
  };
}
export class DisabledOptions {
  static {
    trait(this);
  }
  static readonly options: {
    readonly delegates: string;
    readonly extra: number;
  } = { delegates: 'no', extra: 1 };
}
export class ColoredPair {
  static {
    trait(this);
  }
  static readonly pair: readonly ['a', 'b'] = ['a', 'b'];
}
export class DisabledPair {
  static {
    trait(this);
  }
  static readonly pair: readonly ['c'] = ['c'];
}
export class ColoredMode {
  static {
    trait(this);
  }
  static readonly mode: 'open' = 'open';
}
export class DisabledMode {
  static {
    trait(this);
  }
  static readonly mode: 'closed' = 'closed';
}

// One composition per kind, so that one kind's conflict doesn't hide another's.
const ArraysBase: Composed<
  typeof ControlledElement,
  [typeof ColoredNames, typeof DisabledNames]
> = compose(ControlledElement);
export class Arrays extends ArraysBase {}
// Runtime: ['color', 'size', 'disabled'].
export const names: readonly string[] = Arrays.observedAttributes; // expected: ok
export const element: never = Arrays.observedAttributes[0]!; // expected: ok — the element type is never

const ObjectsBase: Composed<
  typeof ControlledElement,
  [typeof ColoredOptions, typeof DisabledOptions]
> = compose(ControlledElement);
export class Objects extends ObjectsBase {}
// Runtime: { delegates: 'no', extra: 1 }.
export const delegates: never = Objects.options.delegates; // expected: TS2339 — the intersection is reduced to never, since delegates conflicts
export const extra: number = Objects.options.extra; // expected: TS2339 — the same never hides extra too

const TuplesBase: Composed<
  typeof ControlledElement,
  [typeof ColoredPair, typeof DisabledPair]
> = compose(ControlledElement);
export class Tuples extends TuplesBase {}
// Runtime: ['a', 'b', 'c'].
export const third: 'c' = Tuples.pair[2]; // expected: ok — the intersection of two tuples is never, so any index reads as never

const ModesBase: Composed<
  typeof ControlledElement,
  [typeof ColoredMode, typeof DisabledMode]
> = compose(ControlledElement);
export class Modes extends ModesBase {} // expected: TS2507 — two literal statics reduce the constructor to never

// A merged type that matches the runtime value: arrays union their elements,
// objects spread, other kinds take the last.
type Spread<A, B> = Omit<A, keyof B> & B;
type MergeValue<A, B> = A extends readonly (infer EA)[]
  ? B extends readonly (infer EB)[]
    ? readonly (EA | EB)[]
    : B
  : A extends object
    ? B extends object
      ? A extends (...args: never[]) => unknown
        ? B
        : Spread<A, B>
      : B
    : B;
type MergeStatics<A, B> = {
  [K in keyof A | keyof B]: K extends keyof B
    ? K extends keyof A
      ? MergeValue<A[K], B[K]>
      : B[K]
    : K extends keyof A
      ? A[K]
      : never;
};
type Pick4<C> = Omit<C, 'prototype'>;
type Merged = MergeStatics<
  Pick4<typeof ColoredNames> &
    Pick4<typeof ColoredOptions> &
    Pick4<typeof ColoredPair> &
    Pick4<typeof ColoredMode>,
  Pick4<typeof DisabledNames> &
    Pick4<typeof DisabledOptions> &
    Pick4<typeof DisabledPair> &
    Pick4<typeof DisabledMode>
>;
declare const merged: Merged;
export const mergedNames: readonly ('color' | 'size' | 'disabled')[] =
  merged.observedAttributes; // expected: ok
export const mergedDelegates: string = merged.options.delegates; // expected: ok
export const mergedMode: 'closed' = merged.mode; // expected: ok
export const mergedPair: readonly ('a' | 'b' | 'c')[] = merged.pair; // expected: ok, a tuple merged as an array
