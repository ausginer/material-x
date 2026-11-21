// oxlint-disable max-classes-per-file
import { compose, type Composed } from '@ydinjs/core/traits/composition.js';
import { RvBase } from './rv-base.ts';
import { rec } from './rv-log.ts';
import type { A, B, C, D, E, S } from './rv-traits.ts';

const KBase: Composed<typeof RvBase, [typeof A, typeof B, typeof C]> =
  compose(RvBase);
export class K extends KBase {
  #x = rec('K field', 'k');
  constructor(value: string) {
    rec('before super');
    super(rec('super arg', value));
    rec('after super');
  }
  get kx(): string {
    return this.#x;
  }
  set kx(v: string) {
    this.#x = v;
  }
}

// No constructor of its own.
const GBase: Composed<typeof RvBase, [typeof B]> = compose(RvBase);
export class G extends GBase {}

// A flattened base.
const K3Base: Composed<typeof K, [typeof D]> = compose(K);
export class K3 extends K3Base {
  readonly k3 = rec('K3 field');
  constructor() {
    super('k3');
    rec('K3 after super');
  }
}

// A hand-written subclass.
export class Sub extends K {
  readonly sub = rec('Sub field');
  constructor() {
    super('sub');
    rec('Sub body');
  }
}

// A supertrait listed again after its subtrait, and before.
const LaterBase: Composed<typeof RvBase, [typeof A, typeof S]> =
  compose(RvBase);
export class Later extends LaterBase {}
const EarlierBase: Composed<typeof RvBase, [typeof S, typeof A]> =
  compose(RvBase);
export class Earlier extends EarlierBase {}

// super() without a semicolon, then a line that starts with (.
const AsiBase: Composed<typeof RvBase, [typeof D]> = compose(RvBase);
export class Asi extends AsiBase {
  constructor() {
    super();
    (globalThis as { asi?: number }).asi = 1;
    rec('Asi after super');
  }
}

const KEBase: Composed<typeof RvBase, [typeof E]> = compose(RvBase);
export class KE extends KEBase {}
