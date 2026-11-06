/**
 * The sortable behavior's frame part: its own seven fields and nothing else.
 *
 * Do not add an eighth field, `outcome: number`. The only use for one would be
 * to read it when choosing a landing target and a terminal callback, and
 * `finalized()` publishes `current.domain` and nothing else. So such a field
 * would have four writes and no reader. `recovery`, the related field, has
 * three readers and stays.
 *
 * The kernel's seven-field slice is not named here and cannot be: `FramePartOf`
 * rejects a part that declares a kernel key at the authoring boundary, and that
 * rejection is the only enforcement. Reset is split by author for the same
 * reason: a single behavior-supplied `resetFrame` would have to clear kernel
 * fields too, which would force the behavior to know the kernel's field list.
 */
import {
  type CollectionSnapshot,
  type Insertion,
  RECOVERY_IMMEDIATE,
  type ReorderProposal,
  type ReorderTransactionResult,
} from './domain.ts';

export type SortableFramePart = {
  item: HTMLElement | null;
  visual: HTMLElement | null;
  snapshot: CollectionSnapshot | null;
  insertion: Insertion | null;
  proposal: ReorderProposal | null;
  recovery: number;
  domain: ReorderTransactionResult | null;
};

// The part's defaults, written once. A create/reset pair cannot hold the
// invariant that every field is both allocated and cleared. Only a shared
// source can, and `kernel/frames.ts` uses the same shape for the kernel's own
// slice.
const DEFAULT_PART: SortableFramePart = {
  item: null,
  visual: null,
  snapshot: null,
  insertion: null,
  proposal: null,
  recovery: RECOVERY_IMMEDIATE,
  domain: null,
};

/**
 * Both frame-part operations this behavior must provide to the kernel. Called
 * with no argument, it allocates a part at its defaults. Called with one
 * argument, it returns that part to its defaults. So one function fills both
 * `createFramePart` and `resetFramePart`.
 *
 * The reset runs on every retirement, including when the controller stays alive
 * and idle afterwards. After a commit the inactive frame holds the previous
 * committed state, and an idle controller must not pin the DOM of the drag it
 * just finished.
 */
export function sortableFramePart(
  existing?: SortableFramePart,
): SortableFramePart {
  return Object.assign(existing ?? {}, DEFAULT_PART);
}
