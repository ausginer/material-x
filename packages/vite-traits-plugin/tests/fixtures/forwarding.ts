import { bound, trait, type Bound } from '@ydinjs/core/traits/composition.js';
import type { Base } from './base.ts';

/** What a forward reached, recorded so a test can read it. */
export type ForwardTarget = { calls: number; options: unknown };

const AnyBase: Bound<Base> = bound();

// A private binding that a `use*` function writes and the trait's member
// reads: the flattened member must read this map, not a copy.
const targets = new WeakMap<object, ForwardTarget>();

// A layer (a) trait shaped like material-x's FocusForwarding: a method with an
// overload signature, an accessor pair and a TypeScript-only expression.
export class Forwarding extends AnyBase {
  static {
    trait(this);
  }

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
}

export function useForwarding(host: object, target: ForwardTarget): void {
  targets.set(host, target);
}
