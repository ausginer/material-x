/**
 * The FIFO action queue's storage. Entirely kernel-private.
 *
 * Actions are stored as **two parallel arrays** rather than as entry objects,
 * so an enqueue is two pushes with no per-entry allocation. Array capacity
 * growth is amortized, so this is not literally allocation-free and is not
 * claimed to be.
 *
 * The queue owns no semantics. Ordering, run-to-completion, the terminal latch
 * and every effect belong to the execution bracket that holds this record.
 */

export type ActionQueue = {
  /** Pending action tags, FIFO. */
  actions: number[];
  /** Pending action arguments, positionally paired with {@link actions}. */
  args: unknown[];
};

export function createActionQueue(): ActionQueue {
  return { actions: [], args: [] };
}

/**
 * Appends one action. Callers must have already rejected the closed case; this
 * is the hot path and does not re-check.
 */
export function enqueue(
  queue: ActionQueue,
  action: number,
  argument: unknown,
): void {
  queue.actions.push(action);
  queue.args.push(argument);
}

/**
 * Clears the queue and drops every retained argument, so a queued DOM element
 * or consumer value cannot outlive the drain that abandoned it.
 */
export function clearQueue(queue: ActionQueue): void {
  queue.actions.length = 0;
  queue.args.length = 0;
}
