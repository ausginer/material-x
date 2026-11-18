import { impl } from '@ydinjs/core/traits/attributes.js';
import { trait } from '@ydinjs/core/traits/primitives.js';
import { Base } from './base.ts';

const $first: unique symbol = Symbol('First');
const $second: unique symbol = Symbol('Second');

const prefix = 'local:';

// Two method traits in the consumer module itself, linked in place. Both
// declare `label`, so the later layer's definition wins.
export const First = trait(
  (base: new () => Base) =>
    class extends base {
      label(): string {
        return this.getAttribute('label') ?? `${prefix}first`;
      }

      first(): string {
        return this.getAttribute('first') ?? { prefix }.prefix;
      }
    },
  $first,
);

export const Second = trait(function second(base: new () => Base) {
  return class extends base {
    label(): string {
      return this.getAttribute('label') ?? `${prefix}second`;
    }
  };
}, $second);

const FooBase = impl(Base, [First, Second]);

export default class Foo extends FooBase {}
