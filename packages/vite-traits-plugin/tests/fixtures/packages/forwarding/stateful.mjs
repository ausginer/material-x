// oxlint-disable typescript/prefer-optional-chain, typescript/no-unsafe-member-access, typescript/prefer-readonly -- the brand install and the fields as the build emits them, in JavaScript
import { bound } from '@ydinjs/core/traits/composition.js';
import { RECORD_KIND, record } from './record.mjs';

// Another package's built JavaScript of a trait with private state and a
// constructor, as its own build emits it: field initializers and a
// constructor that read a relative import, an exported binding and a private
// binding, which is exported under its build-only name.
const $stateful = Symbol('Stateful');
const STATEFUL_START = 1;
const step = 2;
const AnyBase = bound();

class Stateful extends AnyBase {
  static [Symbol.hasInstance](o) {
    return o != null && o[$stateful] === true;
  }

  #hits = STATEFUL_START + step;
  #target = { calls: 0, options: undefined };
  #kind = RECORD_KIND;

  constructor() {
    super();
    record(this.#target, step + STATEFUL_START);
  }

  get kind() {
    return this.#kind;
  }

  get hits() {
    return this.#hits;
  }

  get target() {
    return this.#target;
  }
}

export {
  $stateful,
  STATEFUL_START,
  Stateful,
  step as __mxflat_step_bd370d1b,
  step,
};
