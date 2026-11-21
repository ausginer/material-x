// oxlint-disable max-classes-per-file, class-methods-use-this, typescript/class-literal-property-style -- the traits of one fixture, whose members return what a test reads
import {
  bound,
  compose,
  trait,
  type Bound,
  type Composed,
} from '@ydinjs/core/traits/composition.js';
import type { StateBase } from './state-base.ts';
import { record } from './state-order.ts';

const AnyBase: Bound<StateBase> = bound();

// An exported binding and a private one, which initializers and bodies read.
export const START = 10;
const prefix = 'counter';

// Private fields with initializers, a private method and a private accessor
// pair, a constructor that reads them, and a private field that nothing reads.
@trait
export class Counter extends AnyBase {
  #count = START;
  readonly #cache = new Map<string, number>();
  readonly #label = `${prefix}:${record('Counter field')}`;
  readonly #brand!: true;

  constructor() {
    super();
    const value = this.#count + START;
    this.#cache.set(prefix, value);
    this.#bump(1);
    record(`Counter body reads ${this.baseField}`);
  }

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
}

// Two traits that each declare #x, with a field and a constructor that
// record when they run.
@trait
export class First extends AnyBase {
  #x = record('First field');

  constructor() {
    super();
    record('First body');
  }

  get first(): string {
    return this.#x;
  }

  set first(value: string) {
    this.#x = value;
  }
}

@trait
export class Second extends AnyBase {
  #x = record('Second field');

  constructor() {
    super();
    record('Second body');
  }

  get second(): string {
    return this.#x;
  }

  set second(value: string) {
    this.#x = value;
  }
}

// A supertrait that two traits extend, with a private field, a constructor,
// and a method that one of them overrides.
@trait
export class Shared extends AnyBase {
  readonly #visits = 0;
  readonly #entered = record('Shared field');

  constructor() {
    super();
    this.#visits += 1;
    record('Shared body');
  }

  get visits(): number {
    return this.#visits;
  }

  get entered(): string {
    return this.#entered;
  }

  greet(): string {
    return 'shared';
  }
}

const LeftBase: Composed<typeof AnyBase, [typeof Shared]> = compose(AnyBase);

@trait
export class Left extends LeftBase {
  readonly #side = 'left';

  constructor() {
    super();
    record(`Left body sees ${this.visits}`);
  }

  override greet(): string {
    return this.#side;
  }
}

const RightBase: Composed<typeof AnyBase, [typeof Shared]> = compose(AnyBase);

@trait
export class Right extends RightBase {
  get right(): string {
    return 'right';
  }
}

// A trait for a component whose base is itself a flattened component.
@trait
export class Third extends AnyBase {
  readonly #third = record('Third field');

  constructor() {
    super();
    record('Third body');
  }

  get third(): string {
    return this.#third;
  }
}

// From RD-33's feature proof: a private field with an initializer that
// nothing references, beside one that a getter reads.
@trait
export class E extends AnyBase {
  readonly #unused = record('E unused field');
  readonly #used = record('E used field');

  get ex(): string {
    return this.#used;
  }
}
