import {
  impl,
  type TraitedConstructor,
} from '@ydinjs/core/traits/attributes.js';
import { Base } from './base.ts';
import { Checkable } from './checkable.ts';
import { Forwarding, useForwarding, type ForwardTarget } from './forwarding.ts';

const FooBase: TraitedConstructor<
  Base,
  typeof Base,
  [typeof Checkable, typeof Forwarding]
> = impl(Base, [Checkable, Forwarding]);

export default class Foo extends FooBase {
  readonly target: ForwardTarget = { calls: 0, options: undefined };

  constructor() {
    super();
    useForwarding(this, this.target);
  }
}

// A subclass outside the composition reaches the flattened member through
// `super`, as a subclass of a material-x host reaches the focus forward.
export class Sub extends Foo {
  override focus(options?: unknown): string {
    return `sub+${super.focus(options)}`;
  }
}
