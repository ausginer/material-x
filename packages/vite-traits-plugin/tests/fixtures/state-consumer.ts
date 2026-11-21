// oxlint-disable max-classes-per-file -- the components of one fixture, which the tests construct
import { compose, type Composed } from '@ydinjs/core/traits/composition.js';
import { StateBase } from './state-base.ts';
import { record } from './state-order.ts';
import type { Counter, E, First, Left, Right, Second, Third } from './state.ts';

// A trait with private state and a constructor. The component's constructor
// parameter has the name of a const in the trait's body, and the component
// reads what the trait's body set up after super().
const CountedBase: Composed<typeof StateBase, [typeof Counter]> =
  compose(StateBase);

export class Counted extends CountedBase {
  readonly given: number;
  readonly countAtStart: number;

  constructor(value: number) {
    super(value);
    this.given = value;
    this.countAtStart = this.count;
  }
}

// A hand-written subclass whose field reads what the trait's body set up.
export class CountedSub extends Counted {
  readonly cached = this.cache.get('counter');
}

// Two traits that each declare #x, and a component that declares #x too, with
// a statement before super() and an argument that records.
const OrderedBase: Composed<typeof StateBase, [typeof First, typeof Second]> =
  compose(StateBase);

export class Ordered extends OrderedBase {
  #x = record('component field');

  constructor() {
    record('before super');
    super(record('super argument'));
    record('after super');
  }

  get own(): string {
    return this.#x;
  }

  set own(value: string) {
    this.#x = value;
  }
}

// A hand-written subclass with a field and a constructor.
export class OrderedSub extends Ordered {
  readonly sub = record('subclass field');

  constructor() {
    super();
    record('subclass body');
  }
}

// Two traits that share a supertrait, and no constructor of the component's
// own.
const SidedBase: Composed<typeof StateBase, [typeof Left, typeof Right]> =
  compose(StateBase);

export class Sided extends SidedBase {}

// A component whose base is a flattened component.
const OuterBase: Composed<typeof Ordered, [typeof Third]> = compose(Ordered);

export class Outer extends OuterBase {
  readonly outer = record('Outer field');

  constructor() {
    super();
    record('Outer body');
  }
}

// A trait whose initialized private field nothing references.
const KEBase: Composed<typeof StateBase, [typeof E]> = compose(StateBase);

export class KE extends KEBase {}
