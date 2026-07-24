/**
 * The FIFO run-to-completion action queue.
 *
 * Actions are stored as two parallel arrays rather than as entry objects, so an
 * enqueue costs two array pushes and no allocation. A nested dispatch appends to
 * the live queue and returns; it never interrupts the action already running.
 *
 * The queue owns no semantics. Validation, transitions and effects belong to the
 * feature's action handler.
 */

/**
 * The queue fields a runtime container must provide. They live directly on the
 * container so there is one runtime object rather than a container plus a queue
 * object.
 */
export type ActionQueue = {
  /** Pending action tags, FIFO. */
  actions: number[];
  /** Pending action arguments, positionally paired with {@link actions}. */
  args: unknown[];
  /** Whether a drain is already in progress on the stack. */
  running: boolean;
  /** Terminal latch. Once set, nothing is admitted and nothing is drained. */
  closed: boolean;
};

/** Initial queue field values, spread into a runtime container at creation. */
export function createActionQueue(): ActionQueue {
  return { actions: [], args: [], running: false, closed: false };
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
 * Clears the queue and drops every retained argument, so a queued DOM element or
 * consumer value cannot outlive the drain that abandoned it.
 */
export function clearQueue(queue: ActionQueue): void {
  queue.actions.length = 0;
  queue.args.length = 0;
}

/**
 * Drains to completion, then clears. Re-entrant calls return immediately because
 * the outermost frame owns the drain and will reach the newly appended work.
 *
 * `handle` is expected to be total: an action it does not recognise in the
 * current phase must be ignored, not thrown on. A throw that does escape is an
 * invariant violation and goes to `panic`, which must terminalize the runtime.
 */
export function drain(
  queue: ActionQueue,
  handle: (action: number, argument: unknown) => void,
  panic: (error: unknown) => void,
): void {
  if (queue.running) {
    return;
  }

  queue.running = true;

  try {
    // `handle` can close the queue synchronously (a consumer callback calling
    // `destroy()`), so the terminal latch is re-read every iteration.
    // oxlint-disable-next-line no-unmodified-loop-condition
    for (let i = 0; !queue.closed && i < queue.actions.length; i += 1) {
      handle(queue.actions[i]!, queue.args[i]);
    }
  } catch (error) {
    panic(error);
  } finally {
    clearQueue(queue);
    queue.running = false;
  }
}
