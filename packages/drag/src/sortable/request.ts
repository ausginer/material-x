/**
 * Normalizes a source plus destination into a reorder proposal. Every request
 * field derives from one immutable, version-matching snapshot; mixed-version
 * arithmetic is invalid and foreign/contradictory identities fail construction.
 */
import type { ReorderRequest } from '../kernel/types.ts';
import type {
  CollectionSnapshot,
  Insertion,
  ReorderProposal,
} from './options.ts';

/** A normalized proposal plus whether the reorder is an engine-owned no-op. */
export type ProposalBuild = Readonly<{
  proposal: ReorderProposal;
  noop: boolean;
}>;

export function buildReorderProposal(
  snapshot: CollectionSnapshot,
  item: HTMLElement,
  insertion: Insertion,
): ProposalBuild | null {
  if (insertion.version !== snapshot.version) {
    return null;
  }

  const from = snapshot.items.indexOf(item);

  if (from === -1) {
    return null;
  }

  const destination = snapshot.items.filter((candidate) => candidate !== item);
  const { index } = insertion;

  if (index < 0 || index > destination.length) {
    return null;
  }

  const before = destination[index - 1] ?? null;
  const after = destination[index] ?? null;

  // The proposed gap must match the insertion's captured neighbour identity.
  if (before !== insertion.before || after !== insertion.after) {
    return null;
  }

  const request: ReorderRequest = {
    item,
    version: snapshot.version,
    from,
    to: index,
    before,
    after,
  };

  return { proposal: { snapshot, request }, noop: index === from };
}
