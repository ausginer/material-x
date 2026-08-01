/**
 * The sortable behavior's frame part: **its own eight fields and nothing else**
 * (contract 04).
 *
 * The kernel's seven-field slice is not named here and cannot be — `FramePartOf`
 * rejects a part that declares a kernel key at the authoring boundary, and
 * `validateFramePart` rejects one in production. Reset is split by author for
 * the same reason: probe 1's single behavior-supplied `resetFrame` had to clear
 * kernel fields too, which forced the behavior to know the kernel's field list.
 */
import {
  type CollectionSnapshot,
  type Insertion,
  OUTCOME_ACCEPTED,
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
  outcome: number;
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
    outcome: OUTCOME_ACCEPTED,
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
  part.outcome = OUTCOME_ACCEPTED;
  part.recovery = RECOVERY_IMMEDIATE;
  part.domain = null;
}
