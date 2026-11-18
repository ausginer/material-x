import { impl } from '@ydinjs/core/traits/attributes.js';
import { Forwarding } from '@fixture/forwarding/forwarding.mjs';
import { Base } from './base.ts';

// A consumer with the package's own extension, so the trait's member flattens.
const FooBase = impl(Base, [Forwarding]);

export default class Foo extends FooBase {}
