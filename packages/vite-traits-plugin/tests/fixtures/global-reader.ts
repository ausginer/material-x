import { trait } from '@ydinjs/core/traits/primitives.js';
import type { Base } from './base.ts';

const $globalReader: unique symbol = Symbol('GlobalReader');

// A method trait whose member reads a global, which keeps its name once the
// member is copied into a consumer.
export const GlobalReader = trait(
  (base: new () => Base) =>
    class extends base {
      now(): this {
        performance.mark('now');
        return this;
      }
    },
  $globalReader,
);
