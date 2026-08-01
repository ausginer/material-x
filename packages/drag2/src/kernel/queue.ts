/**
 * The FIFO run-to-completion action queue. Entirely kernel-private.
 *
 * Actions are stored as **two parallel arrays** rather than as entry objects, so
 * an enqueue is two pushes with no per-entry allocation. Array capacity growth
 * is amortized, so this is not literally allocation-free and is not claimed to
 * be (contract 02 §Queue semantics).
 *
 * A nested dispatch appends to the live queue and returns; it never interrupts
 * the action already running. The outermost frame owns the pass and reaches the
 * appended entry in the same drain.
 *
 * The queue owns no semantics. Validation, transitions and effects belong to
 * the kernel's action handler, which must be **total**: an action it does not
 * recognise in the current phase is ignored, never thrown on.
 *
 * `drain` takes `handle` and `panic` as arguments so the kernel can hoist both
 * to one closure per controller. The shipped package allocated a fresh handler
 * and panic arrow on every outer dispatch; contract 02 §Queue names that as a
 * required change rather than an inherited property.
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
 * Clears the queue and drops every retained argument, so a queued DOM element
 * or consumer value cannot outlive the drain that abandoned it.
 */
export function clearQueue(queue: ActionQueue): void {
  queue.actions.length = 0;
  queue.args.length = 0;
}

/**
 * Drains to completion, then clears. Re-entrant calls return immediately
 * because the outermost frame owns the drain and will reach the newly appended
 * work.
 *
 * A throw escaping `handle` is an invariant violation and goes to `panic`,
 * which must terminalize the controller.
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
