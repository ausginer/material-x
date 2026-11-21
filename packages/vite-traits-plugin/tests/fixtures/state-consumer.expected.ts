// oxlint-disable typescript/no-unsafe-assignment, typescript/no-unsafe-member-access -- the build-only export has no declaration
import { impl } from '@ydinjs/core/traits/composition.js';
import { StateBase } from './state-base.ts';
import { record } from './state-order.ts';
import {
  $counter,
  START,
  __mxflat_prefix_b4ebfe34 as prefix,
} from './state.ts';

// What state-consumer.ts flattens Counted to, written by hand: the trait's
// private fields and members before the class's own, its constructor's body
// after super(), and the brand. The private names are the class's own, and
// the private binding is reached through its build-only export.

export class Counted extends StateBase {
  #count = START;
  readonly #cache = new Map<string, number>();
  readonly #label = `${prefix}:${record('Counter field')}`;

  #bump(by: number): void {
    this.#count += by;
  }

  get #doubled(): number {
    return this.#count * 2;
  }

  set #doubled(value: number) {
    this.#count = value / 2;
  }

  get count(): number {
    return this.#count;
  }

  get doubled(): number {
    return this.#doubled;
  }

  set doubled(value: number) {
    this.#doubled = value;
  }

  get cache(): ReadonlyMap<string, number> {
    return this.#cache;
  }

  get label(): string {
    return this.#label;
  }

  increment(): number {
    this.#bump(1);
    return this.#count;
  }

  static {
    impl(this, $counter);
  }

  readonly given: number;
  readonly countAtStart: number;

  constructor(value: number) {
    super(value);
    {
      const value = this.#count + START;
      this.#cache.set(prefix, value);
      this.#bump(1);
      record(`Counter body reads ${this.baseField}`);
    }
    this.given = value;
    this.countAtStart = this.count;
  }
}

// What KE flattens to, written by hand: both of E's fields, the one nothing
// references included.
export class KEHand extends StateBase {
  readonly #unused = record('E unused field');
  readonly #used = record('E used field');

  get ex(): string {
    return this.#used;
  }
}
