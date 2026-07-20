/**
 * Chooses how one active sortable gesture responds to a new collection snapshot,
 * before proposal creation. Pure: it never mutates the collection, placeholder,
 * cache, or FSM. Collection replacement never recomputes consumer intent from the
 * latest pointer — the exact identity gap either survives or the operation cancels.
 */
import type { CollectionSnapshot, Insertion } from './options.ts';

export type CollectionChange =
  | Readonly<{ type: 'rebase'; insertion: Insertion }>
  | Readonly<{ type: 'cancel' }>;

/**
 * `dragged` must remain in `next`; callers classify its removal separately. An
 * internal gap survives only when `before` and `after` remain present and
 * adjacent; a start/end gap survives only when the surviving edge neighbour stays
 * at that edge.
 */
export function reconcileCollection(
  next: CollectionSnapshot,
  dragged: HTMLElement,
  incumbent: Insertion | null,
): CollectionChange {
  const destination = next.items.filter((item) => item !== dragged);

  if (!incumbent) {
    return { type: 'cancel' };
  }

  const { before, after } = incumbent;

  // Start gap: `after` must remain the first destination item.
  if (before === null) {
    if (after !== null && destination[0] === after) {
      return {
        type: 'rebase',
        insertion: { version: next.version, index: 0, before: null, after },
      };
    }

    return { type: 'cancel' };
  }

  // End gap: `before` must remain the last destination item.
  if (after === null) {
    if (destination[destination.length - 1] === before) {
      return {
        type: 'rebase',
        insertion: {
          version: next.version,
          index: destination.length,
          before,
          after: null,
        },
      };
    }

    return { type: 'cancel' };
  }

  // Internal gap: `before` and `after` must remain adjacent.
  const beforeIndex = destination.indexOf(before);

  if (beforeIndex !== -1 && destination[beforeIndex + 1] === after) {
    return {
      type: 'rebase',
      insertion: {
        version: next.version,
        index: beforeIndex + 1,
        before,
        after,
      },
    };
  }

  return { type: 'cancel' };
}
