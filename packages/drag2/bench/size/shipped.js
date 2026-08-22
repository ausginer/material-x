/**
 * M-3 baseline B — **the shipped `@ydinjs/drag` `sortable.js`**. Answers *what
 * does migrating cost*, and nothing else.
 *
 * It is not feature-equivalent to any fixture here and must never be reported
 * as though it were (05 §Measurements — landed 2026-08-02). The shipped
 * entry is one
 * non-tree-shakable module with its own feature set; the number it produces is
 * the size a consumer is moving *from*, not the price of composition.
 */
import { sortable } from '@ydinjs/drag/sortable.js';

export { sortable };
