import { impl } from '@ydinjs/core/traits/attributes.js';
import { Base } from './base.ts';
import { Forwarding } from './forwarding.ts';

const FooBase = impl(Base, [Forwarding]);

// The class's own method replaces the trait's, which it never calls.
export default class Foo extends FooBase {
  override focus(): string {
    return 'class';
  }
}
