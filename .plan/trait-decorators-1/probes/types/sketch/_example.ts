import type { Constructor } from 'type-fest';
import attribute, { Str } from '../attribute.ts';

declare const trait: ClassDecorator;

interface Trait<T extends object> {
  [Symbol.hasInstance](o: unknown): o is T;
}

type TraitInstance<T extends Trait<any>> = T extends Trait<infer I> ? I : never;

// oxlint-disable-next-line typescript/no-unnecessary-type-parameters
function createHasInstance<T extends object>(
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

export function impl<
  B extends Constructor<any>,
  T extends ReadonlyArray<Trait<any>>,
>(base: B, ...traits: T): InstanceType<B> & TraitInstance<T> {
  return base;
}
