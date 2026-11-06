/**
 * The discrete-input adapter: one keyboard command mapped into the shared
 * proposal protocol.
 *
 * A command is a complete one-slot move, not an interactive drag. This module
 * is pure: it never touches the DOM, the placeholder or the frame. It produces
 * the same {@link Insertion} shape the pointer path feeds to
 * `buildReorderProposal`, so request semantics cannot diverge between the two
 * input modes.
 *
 * This module is not axis-specific and must not become so. `ArrowLeft` and
 * `ArrowUp` are one command, and `ArrowRight` and `ArrowDown` are the other. A
 * keyboard reorder moves an item one slot through the collection, which is
 * one-dimensional whatever the layout does. So this code lives in the behavior,
 * beside `homeInsertion`, and not inside `y()` or any successor axis feature,
 * and those features inherit no keyboard question.
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
 * that edge. This makes the command inert, not a no-op reorder. It is also why
 * feasibility must be answerable inside the native listener: the kernel
 * prevents the default only when this returns a gap, so an arrow key at the
 * edge keeps its native meaning.
 *
 * Indices are computed in the destination view, which is the snapshot with
 * `item` removed. So `index`, `before` and `after` all describe one immutable
 * snapshot, exactly as the spatial path's do. {@link insertionAt} builds the
 * gap, so both paths share one expression.
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
    return null;
  }

  // Elements before `from` keep their index, and elements after it shift down
  // by one. Moving up means taking the predecessor's destination slot
  // (`from - 1`). Moving down means passing the successor, which has already
  // shifted into `from`, so the target gap is `from + 1`.
  const destination = items.filter((candidate) => candidate !== item);

  return insertionAt(destination, up ? from - 1 : from + 1, snapshot);
}
