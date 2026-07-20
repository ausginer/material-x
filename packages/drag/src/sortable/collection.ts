/**
 * Publishes the latest ordered item snapshot and version. `replace(items)`
 * shallow-copies the caller's array (so published order cannot mutate without a
 * version change), increments the version, and notifies subscribers.
 *
 * It does not invalidate geometry, rebase insertion, derive indices, or cancel
 * gestures.
 */
import type { CollectionSnapshot } from './options.ts';

export type SortableCollection = Readonly<{
  snapshot(): CollectionSnapshot;
  replace(items: readonly HTMLElement[]): void;
  subscribe(listener: (snapshot: CollectionSnapshot) => void): void;
}>;

export function createCollection(
  initial: readonly HTMLElement[],
): SortableCollection {
  let current: CollectionSnapshot = { items: [...initial], version: 0 };
  const listeners = new Set<(snapshot: CollectionSnapshot) => void>();

  return {
    snapshot() {
      return current;
    },

    replace(items) {
      current = { items: [...items], version: current.version + 1 };

      for (const listener of listeners) {
        listener(current);
      }
    },

    subscribe(listener) {
      listeners.add(listener);
    },
  };
}
