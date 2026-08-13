/**
 * The consumer surface: one feature, because these are one coherent set and
 * splitting them buys no tree-shaking — a `null` check on an uninstalled
 * callback costs nothing.
 *
 * It is also the **sole owner of the `threshold` default**. The assembler
 * applies it; nothing else may carry a second copy, or the question of which
 * one wins becomes real.
 *
 * Acceptance is never inferred — not from callback silence, not from DOM
 * mutation, not from collection order, not from elapsed time, not from a
 * framework eventually rendering something. `onReorder` says so explicitly or
 * the operation does not complete as accepted.
 */
import {
  brandFeature,
  type SortableCallbacks,
  type SortableFeature,
} from './feature.ts';

export type { OnReorder } from './domain.ts';
export type { SortableCallbacks };

export function callbacks(options: SortableCallbacks): SortableFeature {
  // Held by reference, not copied: the object is the consumer's, and
  // `assemble()` reads each field exactly once at construction. Validating
  // `onReorder` belongs to the assembler, which is where "a required slot is
  // unfilled" is known.
  return brandFeature(() => ({ callbacks: options }));
}
