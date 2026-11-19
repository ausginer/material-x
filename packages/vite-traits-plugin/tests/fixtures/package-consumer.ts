import type { Forwarding } from '@fixture/forwarding/forwarding.mjs';
import { compose, type Composed } from '@ydinjs/core/traits/composition.js';
import { Base } from './base.ts';

const FooBase: Composed<typeof Base, [typeof Forwarding]> = compose(Base);

export default class Foo extends FooBase {}
