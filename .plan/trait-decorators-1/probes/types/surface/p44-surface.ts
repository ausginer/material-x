// P44. The two declaration-surface differences that RD-26's proof 3 left, read
// through the built declarations of core and material-x. Build both packages
// (`just build` in each), then, from the repository root:
//   node_modules/.bin/tsc -p .plan/trait-decorators-1/probes/types/surface
//   node_modules/.bin/tsc6 -p .plan/trait-decorators-1/probes/types/surface
// Each case states its expected result in a comment.
import type { ControlledElement } from '@ydinjs/core/element.js';
import type { Composed } from '@ydinjs/core/traits/composition.js';
import type { Disableable } from '@ydinjs/core/traits/disableable.js';
import type Button from '@ydinjs/material-x/button/button.js';
import type IconButton from '@ydinjs/material-x/button/icon-button.js';
import type SwitchIconButton from '@ydinjs/material-x/button/switch-icon-button.js';
import type { FocusForwarding } from '@ydinjs/material-x/core/traits/focus-forwarding.js';

type Ctor<T = object> = abstract new (...args: any[]) => T;
type Equals<A, B> =
  (<G>() => G extends A ? 1 : 2) extends <G>() => G extends B ? 1 : 2
    ? true
    : false;

// §1. `static [$bound]` on a trait class: the key isn't exported.
// @ts-expect-error -- expected: TS2459, $bound is declared but not exported
import type { $bound } from '@ydinjs/core/traits/composition.js';
export type BoundKey = typeof $bound;

// §2. FocusForwarding's `focus` on an adopter: two equal signatures.
declare const button: Button;
button.focus();
button.focus({ preventScroll: true });
export const asOne: (options?: FocusOptions) => void = button.focus; // expected: no error
export const twoSignatures: Equals<Button['focus'], HTMLElement['focus']> =
  false; // expected: no error, the intersection isn't HTMLElement's type
export class AdopterOverride extends (Object as unknown as Ctor<Button>) {
  override focus(options?: FocusOptions): void {
    void options;
  } // expected: no error
}
export class AdopterWrong extends (Object as unknown as Ctor<Button>) {
  override focus(options: number): void {
    void options;
  } // expected: TS2416; no error at 2bf0418ab, the lost check
}
export class ElementWrong extends HTMLElement {
  override focus(options: number): void {
    void options;
  } // expected: TS2416
}

// §3. Two traits that share a key, with commit 7's Composed.
declare class Host extends HTMLElement {
  get acc(): number;
  set acc(value: number);
  meth(): void;
}
declare class First extends Host {
  shared(): void;
  get flag(): boolean;
  set flag(value: boolean);
}
declare class Second extends Host {
  shared(): string;
}
declare const Pair: Composed<typeof Host, [typeof First, typeof Second]>;
export class PairBaseMethod extends Pair {
  override meth(): void {
    super.meth();
  } // expected: no error; TS2425 at 2bf0418ab
}
export class PairBaseAccessor extends Pair {
  override acc = 1; // expected: TS2610; no error at 2bf0418ab
}

// §3b. The same on the real compositions that trim a trait (P43 (a), (b)).
export class IconButtonClick extends (Object as unknown as Ctor<IconButton>) {
  override click(): void {
    void 0;
  } // expected: no error; TS2425 at 2bf0418ab
}
export class SwitchIconButtonClick extends (Object as unknown as Ctor<SwitchIconButton>) {
  override click(): void {
    void 0;
  } // expected: no error; TS2425 at 2bf0418ab
}
export class ButtonClick extends (Object as unknown as Ctor<Button>) {
  override click(): void {
    void 0;
  } // expected: no error, no trait trimmed
}

// §4. The same pair, with the fix: when a trait goes through Omit, the base's
// keys go too, so the mapped type holds only the trait's own keys.
type Without<I, K extends PropertyKey, X> = [K] extends [never]
  ? I
  : Omit<I, K | (X & PropertyKey)>;
type Instances<
  T extends readonly Ctor[],
  X,
  Later = never,
> = T extends readonly [
  ...infer R extends readonly Ctor[],
  infer L extends Ctor,
]
  ? Instances<R, X, Later | keyof InstanceType<L>> &
      Without<InstanceType<L>, Exclude<keyof InstanceType<L> & Later, X>, X>
  : unknown;
type Fixed<B extends Ctor, T extends readonly Ctor[]> = B &
  Ctor<InstanceType<B> & Instances<T, keyof InstanceType<B>>>;
declare const FixedPair: Fixed<typeof Host, [typeof First, typeof Second]>;
export class FixedBaseMethod extends FixedPair {
  override meth(): void {
    super.meth();
  } // expected: no error
}
export class FixedBaseAccessor extends FixedPair {
  override acc = 1; // expected: TS2610
}
export class FixedEarlierAccessor extends FixedPair {
  override flag = true; // expected: no error, P40 (c)'s accepted cost
}
export const lastWins: string = new (class extends FixedPair {})().shared(); // expected: no error
declare const FixedAdopter: Fixed<
  typeof ControlledElement,
  [typeof Disableable, typeof FocusForwarding]
>;
export class FixedAdopterField extends FixedAdopter {
  override disabled = true; // expected: TS2610, as commit 7
}

// §5. The rejected fix for §2: drop from a trait each key of the base that it
// declares with another type, so that the base's `focus` is the only one.
type Restated<I, Base> = {
  [K in keyof I & keyof Base]: Equals<I[K] & Base[K], Base[K]> extends true
    ? never
    : K;
}[keyof I & keyof Base];
type Dropping<T extends readonly Ctor[], Base> = T extends readonly [
  ...infer R extends readonly Ctor[],
  infer L extends Ctor,
]
  ? Dropping<R, Base> &
      Without<InstanceType<L>, Restated<InstanceType<L>, Base>, never>
  : unknown;
declare const DroppingAdopter: typeof ControlledElement &
  Ctor<
    ControlledElement &
      Dropping<[typeof Disableable, typeof FocusForwarding], ControlledElement>
  >;
export class DroppingOverride extends DroppingAdopter {
  override focus(options?: FocusOptions): void {
    super.focus(options);
  } // expected: TS2425, a legitimate override refused
}
export class DroppingField extends DroppingAdopter {
  override disabled = true; // expected: TS2610; no error, the check is lost
}
