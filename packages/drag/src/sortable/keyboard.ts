/**
 * One keyboard command as a gap. A keyboard reorder moves an item one slot
 * through the collection, which is one-dimensional whatever the layout does, so
 * this is not axis-specific.
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
 * The destination gap for moving `item` one slot, or `null` at the edge, which
 * makes the command inert so that the arrow key keeps its native meaning. Moving
 * up takes the predecessor's slot. Moving down passes the successor, which has
 * already shifted into `from`, so the gap is `from + 1`. `item` is in `snapshot`.
 */
export function keyboardInsertion(
  snapshot: CollectionSnapshot,
  item: HTMLElement,
  direction: KeyboardDirection,
): Insertion | null {
  const { items } = snapshot;
  const from = items.indexOf(item);
  const up = direction === DIRECTION_UP;

  if (up ? from === 0 : from === items.length - 1) {
    return null;
  }

  const destination = items.filter((candidate) => candidate !== item);

  return insertionAt(destination, up ? from - 1 : from + 1);
}
