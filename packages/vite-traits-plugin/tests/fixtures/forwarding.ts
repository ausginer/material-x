import { trait } from '@ydinjs/core/traits/primitives.js';
import type { Base } from './base.ts';

const $forwarding: unique symbol = Symbol('Forwarding');

/** What a forward reached, recorded so a test can read it. */
export type ForwardTarget = { calls: number; options: unknown };

// A private binding that a `use*` function writes and the trait's member
// reads: the flattened member must read this map, not a copy.
const targets = new WeakMap<object, ForwardTarget>();

// A method trait shaped like material-x's focus forward: a method, an
// accessor pair and a TypeScript-only expression in the body.
export const Forwarding = trait(
  (base: new () => Base) =>
    class extends base {
      // An overload signature emits no JavaScript.
      focus(): string;
      focus(options?: unknown): string {
        const target = targets.get(this)!;
        target.calls += 1;
        target.options = options;
        return 'trait';
      }

      get forwarded(): number {
        const { targets: map } = { targets };
        return map.get(this)?.calls ?? 0;
      }

      set forwarded(calls: number) {
        const target = { calls, options: undefined };
        targets.set(this, { ...target });
      }
    },
  $forwarding,
);

export function useForwarding(host: object, target: ForwardTarget): void {
  targets.set(host, target);
}
