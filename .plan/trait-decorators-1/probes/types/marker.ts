// Form D's marker, as in p11-type-argument.ts, without that probe's error
// cases, so other probes can import it.
import { ControlledElement } from './element.ts';

type Intersect<T extends readonly object[]> = T extends readonly [
  infer H,
  ...infer R extends readonly object[],
]
  ? H & Intersect<R>
  : unknown;

export type Traited<T extends readonly ControlledElement[]> =
  ControlledElement & Intersect<T>;

export const Traits: typeof ControlledElement &
  (new <const T extends readonly ControlledElement[]>() => Traited<T>) =
  ControlledElement as any;

export type Converter<T> = Readonly<{
  from(value: string | null): T;
  to(value: T): string | null;
}>;
export declare const Bool: Converter<boolean>;
export declare const Str: Converter<string | null>;

/**
 * A trait's attribute table: one converter per attribute member, typed
 * against the member. Methods and the base's members are excluded.
 */
export type AttributeTable<T> = {
  readonly [
    K in keyof T as K extends keyof ControlledElement
      ? never
      : T[K] extends (...args: never[]) => unknown
        ? never
        : K
  ]?: Converter<T[K]>;
};

/** P5's accessor decorator, for probes that need one. */
export function attr<T>(
  _converter: Converter<T>,
): <This extends HTMLElement>(
  target: ClassAccessorDecoratorTarget<This, T>,
  context: ClassAccessorDecoratorContext<This, T>,
) => void {
  throw new Error('removed by the flattener');
}
