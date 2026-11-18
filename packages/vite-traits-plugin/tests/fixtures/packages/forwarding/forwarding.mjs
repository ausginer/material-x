import { trait } from '@ydinjs/core/traits/primitives.js';
import { record } from './record.mjs';

// The built JavaScript of another package's method trait: no types, and a
// relative import that a consumer reaches through the package's name.
const $forwarding = Symbol('Forwarding');
const targets = new WeakMap();

// A private function binding that the member links, beside the private map.
const targetOf = (host) => {
  let target = targets.get(host);
  if (!target) {
    target = { calls: 0, options: undefined };
    targets.set(host, target);
  }
  return target;
};

export const Forwarding = trait(
  (base) =>
    class extends base {
      focus(options) {
        record(targetOf(this), options);
        return 'package';
      }

      get target() {
        return targetOf(this);
      }
    },
  $forwarding,
);
