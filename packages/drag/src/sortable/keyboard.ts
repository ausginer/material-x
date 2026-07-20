/**
 * Internal keyboard-intent adapter. It maps one discrete keyboard command into
 * the shared proposal protocol: a single command is a complete one-slot move,
 * not an interactive drag. It is pure — it never touches the DOM, placeholder,
 * or FSM — and produces the same {@link Insertion} shape the pointer path feeds
 * into {@link buildReorderProposal}, so request semantics cannot diverge.
 */
import type { CollectionSnapshot, Insertion } from './options.ts';

/** Which way a command moves the item through the collection. */
export type KeyboardDirection = 'up' | 'down';

/**
 * The destination gap for moving `item` one slot toward the start (`up`) or end
 * (`down`). Returns `null` when the item is missing or already at that edge, so
 * the command is inert rather than a no-op reorder.
 *
 * Indices are computed in the destination view — the snapshot with `item`
 * removed — so `before`/`after`/`index` all describe one immutable snapshot.
 */
export function keyboardInsertion(
  snapshot: CollectionSnapshot,
  item: HTMLElement,
  direction: KeyboardDirection,
): Insertion | null {
  const { items, version } = snapshot;
  const from = items.indexOf(item);

  if (from === -1) {
    return null;
  }

  // Destination view: every element except the dragged item. Elements before
  // `from` keep their index; elements after it shift down by one.
  const destination = items.filter((candidate) => candidate !== item);

  if (direction === 'up') {
    if (from <= 0) {
      return null;
    }
    // Move ahead of the current predecessor, at destination index `from - 1`.
    const index = from - 1;
    return {
      version,
      index,
      before: destination[index - 1] ?? null,
      after: destination[index] ?? null,
    };
  }

  if (from >= items.length - 1) {
    return null;
  }
  // Move past the current successor. That successor sits at destination index
  // `from` (it shifted down by one), so the target gap is `from + 1`.
  const index = from + 1;
  return {
    version,
    index,
    before: destination[index - 1] ?? null,
    after: destination[index] ?? null,
  };
}
