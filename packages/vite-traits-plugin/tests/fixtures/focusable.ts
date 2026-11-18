import { trait } from '@ydinjs/core/traits/primitives.js';

const $focusable: unique symbol = Symbol('Focusable');

// A method trait: a class-based trait with only a method, which the plugin
// flattens.
export const Focusable = trait(
  (base: new () => object) =>
    class extends base {
      focus(): this {
        return this;
      }
    },
  $focusable,
);
