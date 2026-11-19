import { compose, type Composed } from '@ydinjs/core/traits/composition.js';
import { Base } from './base.ts';
import {
  useForwarding,
  type Forwarding,
  type ForwardTarget,
} from './forwarding.ts';
import type { CoreTraits } from './lists.ts';

const FooBase: Composed<typeof Base, [...CoreTraits, typeof Forwarding]> =
  compose(Base);

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
