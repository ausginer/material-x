import type { Checkable } from './checkable.ts';
import type { Nameable } from './nameable.ts';

// A shared list, as a tuple type that a composition spreads.
export type CoreTraits = readonly [typeof Checkable, typeof Nameable];
