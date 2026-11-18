import { trait } from '@ydinjs/core/traits/primitives.js';

const $stateful: unique symbol = Symbol('Stateful');

// A class-based trait with a field, outside the method subset: the plugin
// retains its composition.
export const Stateful = trait(
  (base: new () => object) =>
    class extends base {
      count = 0;
    },
  $stateful,
);
