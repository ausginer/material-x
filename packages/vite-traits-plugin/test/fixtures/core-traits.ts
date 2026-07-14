import { Checkable } from './checkable.ts';
import { Sizeable } from './sizeable.ts';

// A shared, exported trait-list const referenced (and spread) by consumers,
// mirroring material-x's `*_CORE_TRAITS` arrays.
export const CORE_TRAITS: readonly [typeof Sizeable, typeof Checkable] = [
  Sizeable,
  Checkable,
];
