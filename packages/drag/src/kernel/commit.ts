/**
 * Observes the consumer's commit of a proposed reorder.
 *
 * The engine never reorders the collection itself; it captures the dragged
 * item's landing neighbour at drop and watches for the consumer to actually
 * place the item there. Anchoring to a neighbour identity rather than a raw index
 * survives the collection changing while the (possibly async) commit lands.
 *
 * The observation is fed back through the session's finite state machine as a
 * `commit-observed` transition rather than resolved privately, so a committed
 * reorder and a timed-out one settle through the same, testable path.
 *
 * Ported and generalized from `@ydinjs/core`'s reorderable trait.
 */
import { neighbor } from './geometry.ts';

/**
 * How long to keep waiting for the consumer to commit before settling anyway. A
 * normal consumer commits synchronously or within a render or two, so this grace
 * is only spent when a commit lands late (or never); it bounds how long the
 * session stays busy rather than hanging forever. A wait that ends on the timeout
 * reports the commit as *not* observed so the consumer can tell an accepted-and-
 * committed reorder from an accepted-but-uncommitted one.
 */
const COMMIT_TIMEOUT = 500;

export type CommitTracker = Readonly<{
  /** Captures the item's landing anchor from the current anchor position. */
  capture(anchor: Element): void;
  /**
   * Begins watching for the consumer's commit. `onSettled(observed)` fires
   * exactly once: `observed` is `true` if the commit landed, `false` if the wait
   * timed out first. If the commit has already landed it fires synchronously.
   */
  watch(onSettled: (observed: boolean) => void): void;
  /** A collection change happened: settle the watch if the item has landed. */
  notify(): void;
  /** Abandons a pending watch without notifying (torn-down gesture). */
  release(): void;
}>;

export function createCommitTracker(
  items: () => readonly HTMLElement[],
  item: HTMLElement,
): CommitTracker {
  // The item the dragged one should end up before once committed (null = last).
  let landingAnchor: HTMLElement | null = null;
  // Callback for the in-flight watch, if any, and its timeout handle.
  let settle: ((observed: boolean) => void) | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const committed = (): boolean => {
    const list = items();
    const index = list.indexOf(item);

    // Removed by the consumer — treat as committed rather than wait forever.
    if (index === -1) {
      return true;
    }

    return landingAnchor
      ? list[index + 1] === landingAnchor
      : index === list.length - 1;
  };

  const finish = (observed: boolean): void => {
    if (!settle) {
      return;
    }

    clearTimeout(timer);
    const done = settle;
    settle = null;
    done(observed);
  };

  return {
    capture(anchor) {
      landingAnchor = neighbor(items(), item, anchor, true);
    },

    watch(onSettled) {
      if (committed()) {
        onSettled(true);
        return;
      }

      settle = onSettled;
      timer = setTimeout(() => {
        finish(false);
      }, COMMIT_TIMEOUT);
    },

    notify() {
      if (settle && committed()) {
        finish(true);
      }
    },

    release() {
      clearTimeout(timer);
      settle = null;
    },
  };
}
