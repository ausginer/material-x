/**
 * The discrete-input adapter: one keyboard command mapped into the shared
 * proposal protocol (D-32).
 *
 * A command is a **complete one-slot move**, not an interactive drag. This
 * module is pure — it never touches the DOM, the placeholder or the frame — and
 * produces the same {@link Insertion} shape the pointer path feeds to
 * `buildReorderProposal`, which is what makes request semantics unable to
 * diverge between the two input modes rather than merely equal in practice.
 *
 * **It is not axis-specific, and must not become so** (ledger L-4).
 * `ArrowLeft` and `ArrowUp` are one command; `ArrowRight` and `ArrowDown` are
 * the other. A keyboard reorder moves an item one slot through the
 * *collection*, which is one-dimensional whatever the layout does — so this
 * lives in the behavior, beside `homeInsertion`, and not inside `y()` or
 * any successor axis feature, which therefore inherits no keyboard question.
 */
import {
  type CollectionSnapshot,
  type Insertion,
  insertionAt,
} from './domain.ts';

/** Toward the start of the collection. */
export const DIRECTION_UP = 110;
/** Toward the end. */
export const DIRECTION_DOWN = 111;

export type KeyboardDirection = typeof DIRECTION_UP | typeof DIRECTION_DOWN;

const ARROW_UP = 'ArrowUp';
const ARROW_LEFT = 'ArrowLeft';
const ARROW_DOWN = 'ArrowDown';
const ARROW_RIGHT = 'ArrowRight';

/** The command a key names, or `null` for every other key. */
export function directionOf(key: string): KeyboardDirection | null {
  if (key === ARROW_UP || key === ARROW_LEFT) {
    return DIRECTION_UP;
  }

  if (key === ARROW_DOWN || key === ARROW_RIGHT) {
    return DIRECTION_DOWN;
  }

  return null;
}

/**
 * The destination gap for moving `item` one slot toward the start or the end.
 *
 * Returns `null` when the item is missing from the snapshot or is already at
 * that edge — which is what makes the command **inert** rather than a no-op
 * reorder, and is the whole reason feasibility has to be answerable inside the
 * native listener: the kernel prevents the default only when this returns a
 * gap, so an arrow key at the edge keeps its native meaning (I-32).
 *
 * Indices are computed in the **destination view** — the snapshot with `item`
 * removed — so `index`, `before` and `after` all describe one immutable
 * snapshot, exactly as the spatial path's do. The gap is built by
 * {@link insertionAt}, which is what makes _exactly as the spatial path's do_
 * one shared expression rather than two that happen to agree (F-91, D-119).
 */
export function keyboardInsertion(
  snapshot: CollectionSnapshot,
  item: HTMLElement,
  direction: KeyboardDirection,
): Insertion | null {
  const { items } = snapshot;
  const from = items.indexOf(item);

  if (from === -1) {
    return null;
  }

  const up = direction === DIRECTION_UP;

  if (up ? from === 0 : from === items.length - 1) {
    return null; // already at that edge
  }

  // Elements before `from` keep their index; elements after it shift down by
  // one. Moving up means taking the predecessor's destination slot (`from - 1`);
  // moving down means passing the successor, which has *already* shifted into
  // `from`, so the target gap is `from + 1`.
  const destination = items.filter((candidate) => candidate !== item);

  return insertionAt(destination, up ? from - 1 : from + 1, snapshot);
}
