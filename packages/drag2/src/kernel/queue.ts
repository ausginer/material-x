/**
 * The FIFO action queue's storage. Entirely kernel-private.
 *
 * Entries sit **interleaved in one array** — a tag followed by its argument —
 * rather than as entry objects, so an enqueue is one push with no per-entry
 * allocation, and a tag and its argument stay paired by adjacency rather than
 * by an index two arrays must agree on. Array capacity growth is amortized, so
 * this is not literally allocation-free and is not claimed to be.
 *
 * The queue owns no semantics. Ordering, run-to-completion, the terminal latch
 * and every effect belong to the execution bracket that holds it: the queue
 * iterates, and whether to go on iterating is the caller's answer.
 */
export class ActionQueue {
  readonly #queue: unknown[] = [];

  /**
   * Appends one action. Callers must have already rejected the closed case;
   * this is the hot path and does not re-check.
   */
  add(action: number, argument: unknown): void {
    this.#queue.push(action, argument);
  }

  /**
   * Hands each entry to `callback` in FIFO order until it returns `false`.
   *
   * The length is re-read on every iteration, so an entry appended during the
   * pass is reached in the same pass, after the entry that appended it.
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
   * Truncates in place rather than replacing the array, because a drain
   * clears once per pointer sample and truncation allocates nothing.
   */
  clear(): void {
    this.#queue.length = 0;
  }
}
