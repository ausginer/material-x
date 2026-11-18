import { trait } from '@ydinjs/core/traits/primitives.js';

const $focusable: unique symbol = Symbol('Focusable');

// A class-based trait: the plugin doesn't flatten it.
export const Focusable = trait(
  (base: new () => object) =>
    class extends base {
      focus(): this {
        return this;
      }
    },
  $focusable,
);
