/**
 * The sortable behavior's frame part: **its own seven fields and nothing else**
 * (contract 04).
 *
 * **There is no `outcome: number` field, and an eighth one must not return it.**
 * Its only justification in contract 04 was _read to choose a landing target and
 * a terminal callback_, and `finalized()` publishes `current.domain` and nothing
 * else (D-62, D-66), so such a field has four writes and no reader — residue
 * rather than retention. `recovery`, the field beside it, has three readers and
 * stays.
 *
 * The kernel's seven-field slice is not named here and cannot be: `FramePartOf`
 * rejects a part that declares a kernel key at the authoring boundary, which
 * since D-124 is the whole of the enforcement. Reset is split by author for
 * the same reason: probe 1's single behavior-supplied `resetFrame` had to clear
 * kernel fields too, which forced the behavior to know the kernel's field list.
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

export function createSortableFramePart(): SortableFramePart {
  return {
    item: null,
    visual: null,
    snapshot: null,
    insertion: null,
    proposal: null,
    recovery: RECOVERY_IMMEDIATE,
    domain: null,
  };
}

/**
 * Runs on every retirement, **including when the controller stays alive and
 * idle afterwards**: after a commit the inactive frame holds the previous
 * committed state, and an idle controller must not pin the DOM of the drag it
 * just finished (I-20).
 */
export function resetSortableFramePart(part: SortableFramePart): void {
  part.item = null;
  part.visual = null;
  part.snapshot = null;
  part.insertion = null;
  part.proposal = null;
  part.recovery = RECOVERY_IMMEDIATE;
  part.domain = null;
}
