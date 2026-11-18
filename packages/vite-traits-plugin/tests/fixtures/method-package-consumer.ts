import { impl } from '@ydinjs/core/traits/attributes.js';
import { Forwarding } from '@fixture/forwarding/forwarding.mjs';
import { Base } from './base.ts';

const FooBase = impl(Base, [Forwarding]);

export default class Foo extends FooBase {}
