// oxlint-disable max-classes-per-file, class-methods-use-this
import {
  bound,
  compose,
  trait,
  type Bound,
  type Composed,
} from '@ydinjs/core/traits/composition.js';
import type { RvBase } from './rv-base.ts';
import { rec } from './rv-log.ts';

const B0: Bound<RvBase> = bound();
const tag = 'private-binding';

@trait
export class S extends B0 {
  #x = rec('S field', 's');
  #ready = false;
  constructor() {
    super();
    this.#ready = true;
    rec('S body');
  }
  get sReady(): boolean {
    return this.#ready;
  }
  get sx(): string {
    return this.#x;
  }
  set sx(v: string) {
    this.#x = v;
  }
  who(): string {
    return 'S';
  }
  #m(): string {
    return 'S#m';
  }
  get sm(): string {
    return this.#m();
  }
}

const SB: Composed<typeof B0, [typeof S]> = compose(B0);

@trait
export class A extends SB {
  #x = rec('A field', 'a');
  constructor() {
    super();
    rec(`A body sReady=${this.sReady}`);
  }
  get ax(): string {
    return this.#x;
  }
  set ax(v: string) {
    this.#x = v;
  }
  override who(): string {
    return 'A';
  }
  #m(): string {
    return 'A#m';
  }
  get am(): string {
    return this.#m();
  }
}

@trait
export class B extends B0 {
  #x = rec('B field', 'b');
  constructor() {
    super();
    const value = `${tag}`;
    rec(`B body ${value}`);
  }
  get bx(): string {
    return this.#x;
  }
  set bx(v: string) {
    this.#x = v;
  }
  #m(): string {
    return 'B#m';
  }
  get bm(): string {
    return this.#m();
  }
}

const CB: Composed<typeof B0, [typeof S]> = compose(B0);

@trait
export class C extends CB {
  #x = rec('C field', 'c');
  constructor() {
    super();
    rec(`C body sReady=${this.sReady}`);
  }
  get cx(): string {
    return this.#x;
  }
}

@trait
export class D extends B0 {
  #d = rec('D field', 'd');
  constructor() {
    super();
    rec('D body');
  }
  get dx(): string {
    return this.#d;
  }
}

// A private field that nothing reads, whose initializer has an effect.
@trait
export class E extends B0 {
  #unused = rec('E unused field');
  #used = rec('E used field', 'e');
  get ex(): string {
    return this.#used;
  }
}
