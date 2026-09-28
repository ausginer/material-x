import { clearQueue, createActionQueue, enqueue } from './queue.ts';

/**
 * The controller-lifetime execution bracket: the terminal latch, the
 * run-to-completion drain, the admission boundary, and deferred teardown.
 *
 * **It names nothing the kernel models.** No frame, operation, spec or DOM
 * node, and it invokes no slot the consumer filled — every consumer-visible act
 * stays behind one of the four callbacks it is constructed with. That is what
 * makes the entity safe to hold the latch: the datum every liveness rule is
 * indexed on is owned by the thing that can state its own invariant, and the
 * storage under it keeps owning none.
 *
 * A *library transaction* is one synchronous entry into kernel code from
 * outside it: a native ingress pass, a drain, an async continuation that
 * dispatches. Nesting is real — a consumer callback inside a drain can dispatch
 * again, and an admission resolver can open a second ingress — so the boundary
 * that owns deferred teardown is the **outermost** one, which is what a depth
 * counter names and a boolean cannot.
 */
export class ExecutionBracket {
  /**
   * Pending work. Two parallel arrays operated on by free functions; the
   * bracket supplies every semantic the storage deliberately has none of.
   */
  readonly #queue = createActionQueue();

  /**
   * Terminal latch. Set exactly once, on the statement requesting closure, so
   * from that statement every guard fails. Read live at every site: a captured
   * boolean would be a copy of a liveness answer.
   */
  #closed = false;

  /** Whether a drain is already in progress on the stack. */
  #running = false;

  /** How many library transactions are open on the stack. */
  #depth = 0;

  /** A logical close is done and its physical teardown is owed to the boundary. */
  #teardownPending = false;

  /**
   * True for the whole of native admission — the caller's `admit`, its
   * consumer-supplied handle and visual resolvers, and the frame write that
   * publishes the pending operation.
   *
   * **Admission is a queue boundary.** It is the one transaction driven outside
   * the drain: it mutates the caller's draft directly and commits at the end,
   * so draining underneath it would run an action against a half-written
   * admission and have admission commit the stale outcome over it. So dispatch
   * enqueues and returns while this is set, and the boundary drains once, after
   * admission has either committed or abandoned. Closure is unaffected: it is
   * not queued, so it stays a synchronous terminal barrier, and the queue it
   * closes drops everything a resolver appended.
   */
  #admitting = false;

  /**
   * The promise {@link close} hands back, allocated on the first call and
   * returned by every later one, so repeated closure is idempotent and every
   * returned promise still settles exactly once.
   */
  #settled: Promise<void> | null = null;
  #settle: (() => void) | null = null;

  readonly #handle: (action: number, argument: unknown) => void;
  readonly #panic: (error: unknown) => void;
  readonly #teardown: () => void;
  readonly #beginPass: () => void;

  /**
   * All four callbacks are controller-invariant and supplied once, so the
   * per-action and per-sample paths allocate nothing.
   *
   * @param handle - Runs one action. Must be **total**: an action it does not
   *   recognise in the current phase is ignored, never thrown on.
   * @param panic - Receives a throw escaping `handle`, which is an invariant
   *   violation. Must terminalize the controller.
   * @param teardown - The caller's own physical release, invoked once, after
   *   the bracket has released its own storage.
   * @param beginPass - The caller's preparation for an ingress pass, invoked
   *   only on a pass this bracket did not refuse.
   */
  constructor(
    handle: (action: number, argument: unknown) => void,
    panic: (error: unknown) => void,
    teardown: () => void,
    beginPass: () => void,
  ) {
    this.#handle = handle;
    this.#panic = panic;
    this.#teardown = teardown;
    this.#beginPass = beginPass;
  }

  /** The latch itself, read live. */
  get closed(): boolean {
    return this.#closed;
  }

  /**
   * Enqueues one action and, unless a pass already owns the drain, runs it to
   * completion.
   *
   * A nested dispatch appends to the live queue and returns; it never
   * interrupts the action already running. The outermost frame owns the pass
   * and reaches the appended entry in the same drain.
   */
  dispatch(action: number, argument: unknown): void {
    if (this.#closed) {
      return;
    }

    enqueue(this.#queue, action, argument);

    if (this.#admitting) {
      return; // the admission boundary owns the drain
    }

    this.#depth += 1;

    try {
      this.#drain();
    } finally {
      this.#leave();
    }
  }

  /**
   * Opens a native ingress pass around `admit`, drains what it dispatched, and
   * closes the transaction.
   *
   * **A refused pass prepares nothing**, which is the whole point of refusing
   * before rather than after: a nested press that reached the caller's
   * preparation would rebuild its draft from the committed frame, discarding
   * whatever the outer `admit` had already staged in it, and then commit its
   * own origin. So both guards precede `beginPass`, and the caller may hold
   * only preconditions of the call on its own side.
   *
   * A native ingress pass is a library transaction the drain cannot see: it
   * runs outside one, so a closure raised by an admission resolver would
   * otherwise tear down physically with the outer admission still half-written.
   */
  runIngress(admit: () => void): void {
    if (this.#closed || this.#admitting) {
      return;
    }

    this.#depth += 1;
    this.#beginPass();
    this.#admitting = true;

    try {
      try {
        admit();
      } finally {
        // Cleared in a `finally` so a throw escaping admission — a panicking
        // resolver, a re-entry refusal — cannot leave every later dispatch
        // silently queued with nothing to drain it.
        this.#admitting = false;
      }

      // Whatever a resolver dispatched now runs against the committed outcome
      // of admission, and not at all when the resolver closed the controller.
      if (!this.#closed) {
        this.#drain();
      }
    } finally {
      this.#leave();
    }
  }

  /**
   * Logical closure is **immediate**; physical teardown is **deferrable**.
   *
   * The latch is set on this statement, not at the end of the teardown
   * sequence, so from here on every guard fails and nothing is admitted or
   * drained. The returned promise does not promise that physical release
   * completed before it was handed back — only that the latch is set, and the
   * release may be one transaction late.
   *
   * Outside a reentrant transaction the two events coincide, which makes
   * immediate physical release the common case rather than the guarantee.
   */
  close(): Promise<void> {
    this.#settled ??= new Promise<void>((resolve) => {
      this.#settle = resolve;
    });

    if (!this.#closed) {
      // Every guard now fails, on the closing statement itself.
      this.#closed = true;

      if (this.#depth === 0) {
        this.#runTeardown();
      } else {
        this.#teardownPending = true;
      }
    }

    return this.#settled;
  }

  /**
   * Drains to completion, then clears. Re-entrant calls return immediately
   * because the outermost frame owns the drain and will reach the newly
   * appended work.
   */
  #drain(): void {
    if (this.#running) {
      return;
    }

    this.#running = true;

    try {
      // `handle` can close the bracket synchronously (a consumer callback
      // destroying the controller), so the terminal latch is re-read every
      // iteration.
      // oxlint-disable-next-line no-unmodified-loop-condition
      for (let i = 0; !this.#closed && i < this.#queue.actions.length; i += 1) {
        this.#handle(this.#queue.actions[i]!, this.#queue.args[i]);
      }
    } catch (error) {
      this.#panic(error);
    } finally {
      clearQueue(this.#queue);
      this.#running = false;
    }
  }

  /**
   * Runs deferred teardown when the **outermost** transaction closes.
   *
   * Read at the boundary rather than latched at entry: a closure raised from
   * anywhere inside the transaction — including one nested many frames deep —
   * is owed teardown by this frame and no other.
   */
  #leave(): void {
    this.#depth -= 1;

    if (this.#depth === 0 && this.#teardownPending) {
      this.#teardownPending = false;
      this.#runTeardown();
    }
  }

  /**
   * Releases the bracket's own storage, then the caller's.
   *
   * Clearing first is the argument-release invariant: no queued argument — a
   * DOM element, a consumer value — outlives the drain that abandoned it. The
   * settle is a `finally` around the callback, so the promise settles once per
   * controller whether the caller's release returns or throws.
   */
  #runTeardown(): void {
    try {
      clearQueue(this.#queue);
      this.#teardown();
    } finally {
      const settle = this.#settle;

      if (settle) {
        this.#settle = null;
        settle();
      }
    }
  }
}
