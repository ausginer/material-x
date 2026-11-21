import type { Stateful } from '@fixture/forwarding/stateful.mjs';
import { compose, type Composed } from '@ydinjs/core/traits/composition.js';
import { StateBase } from './state-base.ts';

const PackagedBase: Composed<typeof StateBase, [typeof Stateful]> =
  compose(StateBase);

export default class Packaged extends PackagedBase {}
