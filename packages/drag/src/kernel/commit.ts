/**
 * Observes the consumer's commit of a proposed reorder.
 *
 * The engine never reorders the collection itself; it captures the dragged
 * item's landing neighbour at drop and watches for the consumer to actually
 * place the item there. Anchoring to a neighbour identity rather than a raw index
 * survives the collection changing while the (possibly async) commit lands.
 *
 * Ported and generalized from `@ydinjs/core`'s reorderable trait.
 */
import { neighbor } from './geometry.ts';

/**
 * How long, after the landing animation, to keep waiting for the consumer to
 * commit before settling anyway. A normal consumer commits during the animation,
 * so this grace is only spent when a render lands late; it bounds how long the
 * session stays busy rather than hanging forever.
 */
const COMMIT_TIMEOUT = 500;

export type CommitTracker = Readonly<{
  /** Captures the item's landing anchor from the current anchor position. */
  capture(anchor: Element): void;
  /** Resolves once the consumer has committed, or after the commit timeout. */
  wait(): Promise<void>;
  /** A collection change happened: resolve the wait if the item has landed. */
  notify(): void;
  /** Force-resolves a pending wait unconditionally (abandoned gesture). */
  release(): void;
}>;

export function createCommitTracker(
  items: () => readonly HTMLElement[],
  item: HTMLElement,
): CommitTracker {
  // The item the dragged one should end up before once committed (null = last).
  let landingAnchor: HTMLElement | null = null;
  // Resolver for the in-flight "consumer has committed" wait, if any.
  let resolve: (() => void) | null = null;

  const committed = (): boolean => {
    const list = items();
    const index = list.indexOf(item);

    // Removed by the consumer — treat as resolved rather than wait forever.
    if (index === -1) {
      return true;
    }

    return landingAnchor
      ? list[index + 1] === landingAnchor
      : index === list.length - 1;
  };

  return {
    capture(anchor) {
      landingAnchor = neighbor(items(), item, anchor, true);
    },

    wait() {
      if (committed()) {
        return Promise.resolve();
      }

      return new Promise<void>((res) => {
        let timer: ReturnType<typeof setTimeout>;

        const done = (): void => {
          clearTimeout(timer);
          resolve = null;
          res();
        };

        resolve = done;
        timer = setTimeout(done, COMMIT_TIMEOUT);
      });
    },

    notify() {
      if (resolve && committed()) {
        resolve();
      }
    },

    release() {
      resolve?.();
    },
  };
}
