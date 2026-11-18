import { impl } from '@ydinjs/core/traits/attributes.js';
import { Base } from './base.ts';
import { Checkable } from './checkable.ts';

const FooBase = impl(Base, [Checkable]);

// Overrides both halves of the trait's `checked` accessor, so the flattened
// class keeps the class's pair.
export default class Foo extends FooBase {
  #checked = 'unset';

  get checked(): string {
    return this.#checked;
  }

  set checked(value: string) {
    this.#checked = `set:${value}`;
  }
}
