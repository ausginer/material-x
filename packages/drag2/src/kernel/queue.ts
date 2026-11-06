/**
 * The FIFO action queue's storage. Entirely kernel-private.
 *
 * Entries are interleaved in one array, a tag followed by its argument, and are
 * not entry objects. So an enqueue is one push with no per-entry allocation,
 * and a tag and its argument stay paired by adjacency and not by an index that
 * two arrays must agree on. Array capacity growth is amortized, so this is not
 * literally allocation-free.
 *
 * The queue owns no semantics. Ordering, run-to-completion, the terminal state
 * and every effect belong to `ExecutionLoop`, which holds the queue. The queue
 * iterates, and the caller decides whether to continue.
 */
export class ActionQueue {
  readonly #queue: unknown[] = [];

  /**
   * Appends one action. Callers must have already rejected the closed case.
   * This is the hot path and does not check again.
   */
  add(action: number, argument: unknown): void {
    this.#queue.push(action, argument);
  }

  /**
   * Passes each entry to `callback` in FIFO order until it returns `false`.
   *
   * The length is read again on every iteration, so an entry appended during
   * the pass is reached in the same pass, after the entry that appended it.
   */
  apply(callback: (action: number, argument: unknown) => boolean): void {
    for (let i = 0; i < this.#queue.length; i += 2) {
      if (!callback(this.#queue[i] as number, this.#queue[i + 1])) {
        break;
      }
    }
  }

  /**
   * Empties the queue and drops every retained argument, so a queued DOM
   * element or consumer value cannot outlive the drain that abandoned it.
   *
   * Truncates in place and does not replace the array, because a drain clears
   * once per pointer sample and truncation allocates nothing.
   */
  clear(): void {
    this.#queue.length = 0;
  }
}
