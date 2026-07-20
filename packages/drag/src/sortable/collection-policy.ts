/**
 * Chooses how one active sortable gesture responds to a new collection snapshot,
 * before proposal creation. Pure: it never mutates the collection, placeholder,
 * cache, or FSM. Collection replacement never recomputes consumer intent from the
 * latest pointer — the exact identity gap either survives or the operation cancels.
 */
import type { CollectionSnapshot, Insertion } from './options.ts';

// Local to this file: `type` here is a `CollectionChange` discriminant, a
// concept unrelated to the shared kernel `CANCEL` lifecycle-event kind, even
// though `CHANGE_CANCEL`'s value happens to coincide with it.
export const CHANGE_REBASE: unique symbol = Symbol('rebase');
export const CHANGE_CANCEL: unique symbol = Symbol('cancel');

export type CollectionChange =
  | Readonly<{ type: typeof CHANGE_REBASE; insertion: Insertion }>
  | Readonly<{ type: typeof CHANGE_CANCEL }>;

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
    return { type: CHANGE_CANCEL };
  }

  const { before, after } = incumbent;

  // Start gap: `after` must remain the first destination item.
  if (before === null) {
    if (after !== null && destination[0] === after) {
      return {
        type: CHANGE_REBASE,
        insertion: { version: next.version, index: 0, before: null, after },
      };
    }

    return { type: CHANGE_CANCEL };
  }

  // End gap: `before` must remain the last destination item.
  if (after === null) {
    if (destination[destination.length - 1] === before) {
      return {
        type: CHANGE_REBASE,
        insertion: {
          version: next.version,
          index: destination.length,
          before,
          after: null,
        },
      };
    }

    return { type: CHANGE_CANCEL };
  }

  // Internal gap: `before` and `after` must remain adjacent.
  const beforeIndex = destination.indexOf(before);

  if (beforeIndex !== -1 && destination[beforeIndex + 1] === after) {
    return {
      type: CHANGE_REBASE,
      insertion: {
        version: next.version,
        index: beforeIndex + 1,
        before,
        after,
      },
    };
  }

  return { type: CHANGE_CANCEL };
}
