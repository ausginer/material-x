import { FAILED, RESOLUTION_SETTLED } from './actions.ts';
import { ActionQueue } from './queue.ts';

/** The lifecycle request's three states, in the only order they are reached. */
const LIVE = 0;
const REQUESTED = 1;
const CLOSED = 2;

/**
 * The controller-lifetime execution loop: the lifecycle request, the
 * run-to-completion drain, the unit boundary at which a request is applied, and
 * teardown.
 *
 * It holds nothing the kernel models: no frame, operation, spec or DOM node. It
 * invokes no slot the consumer filled. Every consumer-visible action stays
 * behind the callbacks it is constructed with, or behind the report a queued
 * entry carries. It knows which two tags must still report when their entry is
 * discarded, and nothing about what they mean. A behavior action is opaque to
 * it and is discarded whole. So this class can safely hold the lifecycle
 * request: the value every liveness rule depends on belongs to the class that
 * can state its invariant, and the storage under it still owns none.
 *
 * A unit is one synchronous entry into kernel code from outside it:
 * construction, a native event pass, or one queued action. Units do not nest.
 * While one runs, a dispatch appends to the queue and returns, and a native
 * event pass is refused before it touches anything, so whether a unit is
 * running is one boolean. A request made while a unit runs is applied when that
 * unit ends and never inside it. With no unit running, the request call is
 * itself the boundary.
 */
export class ExecutionLoop {
  /**
   * Pending work. The storage iterates and decides nothing. This class supplies
   * every semantic, including what becomes of an entry once destruction is
   * requested.
   */
  readonly #queue = new ActionQueue();

  /**
   * The lifecycle request: `LIVE`, `REQUESTED` while a unit that requested
   * destruction runs to completion, and `CLOSED` once destruction has been
   * applied. Only application and panic write `CLOSED`, and nothing reopens.
   */
  #lifecycle = LIVE;

  /** Whether a unit is running. */
  #running = false;

  /**
   * The promise {@link requestClose} hands back, allocated on the first call
   * and returned by every later one, so repeated requests are idempotent and
   * every returned promise still settles exactly once.
   */
  #settled: Promise<void> | null = null;
  #settle: (() => void) | null = null;

  readonly #handle: (action: number, argument: unknown) => void;
  readonly #panic: (error: unknown) => void;
  readonly #teardown: () => void;
  readonly #beginPass: () => void;

  /**
   * One drain step, passed to the queue. Created once per loop and not per
   * drain, because a drain runs on every pointer sample.
   *
   * The lifecycle request is read before each action, including the first entry
   * of a drain, and never inside one. A destruction requested by an action
   * therefore lets that action finish, and the next entry is the boundary: from
   * there on nothing is handled, and the request is applied when the drain
   * ends.
   *
   * A discarded entry must still report the fault it carries. Destruction
   * removes a failure's effect on the operation but does not remove the fault.
   * So the walk continues to the end of the queue and calls the report on each
   * `FAILED` entry and each rejected `RESOLUTION_SETTLED` entry, in FIFO order.
   * Destruction is still not applied, so the report passes the refusal while
   * native events stay refused, and what it dispatches is appended and walked
   * past. The tag decides, because `ERROR_REPORTED` queues the same record with
   * its fault already delivered.
   */
  readonly #step = (action: number, argument: unknown): boolean => {
    if (this.#lifecycle !== LIVE) {
      if (action === FAILED || action === RESOLUTION_SETTLED) {
        (argument as { discard?(): void }).discard?.();
      }

      return true;
    }

    this.#handle(action, argument);
    return true;
  };

  /**
   * Every callback is controller-invariant and supplied once, so the
   * per-action and per-sample paths allocate nothing.
   *
   * @param handle - Runs one action. Must be total: an action it does not
   *   recognise in the current phase is ignored, never thrown on.
   * @param panic - Receives a throw escaping `handle`, which is an invariant
   *   violation. The loop has already closed when it is called and tears down
   *   once it returns, so it only reports, and it must not throw.
   * @param teardown - The caller's own physical release, invoked once, after
   *   the loop has released its own storage.
   * @param beginPass - The caller's preparation for a native event pass,
   *   invoked only on a pass this loop did not refuse.
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

  /**
   * Whether destruction has been applied. A request not yet applied reads
   * `false`: the unit that made it completes as a live controller's unit.
   */
  get closed(): boolean {
    return this.#lifecycle === CLOSED;
  }

  /**
   * Whether a native event pass would be admitted: no unit is running and the
   * controller is live.
   *
   * Exposed so that the caller can keep work it does before a pass, which must
   * happen even when it opens none, behind the same refusal.
   */
  get idle(): boolean {
    return !this.#running && this.#lifecycle === LIVE;
  }

  /**
   * Enqueues one action and, when no unit is running, runs the queue to
   * completion as a sequence of units.
   *
   * A dispatch made while a unit runs appends to the live queue and returns;
   * it never interrupts the running unit. The running unit's owner reaches the
   * appended entry in the same drain.
   */
  dispatch(action: number, argument: unknown): void {
    if (this.#lifecycle === CLOSED) {
      return;
    }

    this.#queue.add(action, argument);

    if (this.#running) {
      return;
    }

    this.#running = true;

    try {
      this.#drain();
    } finally {
      this.#leave();
    }
  }

  /**
   * Runs one native event pass as a unit around `admit`, then drains what it
   * dispatched.
   *
   * A refused pass prepares nothing, so the refusal must come before the
   * preparation. A nested press that reached the caller's preparation would
   * rebuild the draft a running unit is writing and commit its own origin. So
   * the refusal precedes `beginPass`, and the caller may hold only
   * preconditions of the call on its own side.
   *
   * The drain after admission is unconditional. When admission requested
   * destruction, the drain handles nothing, because its step handles no entry
   * from the first on.
   */
  runNativeEvent(admit: () => void): void {
    if (!this.idle) {
      return;
    }

    this.#running = true;

    try {
      this.#beginPass();
      admit();
      this.#drain();
    } finally {
      this.#leave();
    }
  }

  /**
   * Runs controller construction as a unit and returns what `build` returns.
   *
   * Construction is a unit like any other: what it dispatches is drained after
   * `build` returns, and a destruction it requests is applied after that,
   * before this call returns. A throw from `build` clears the queue and
   * propagates, so nothing construction queued outlives the failed attempt.
   */
  construct<T>(build: () => T): T {
    this.#running = true;

    try {
      const built = build();

      this.#drain();
      return built;
    } catch (error) {
      this.#queue.clear();
      throw error;
    } finally {
      this.#leave();
    }
  }

  /**
   * Requests destruction. Applied at once when no unit is running, otherwise
   * when the running unit ends.
   *
   * The returned promise settles once, after application, which includes
   * physical teardown. Every call returns the same promise.
   */
  requestClose(): Promise<void> {
    this.#settled ??= new Promise<void>((resolve) => {
      this.#settle = resolve;
    });

    if (this.#lifecycle === LIVE) {
      if (this.#running) {
        this.#lifecycle = REQUESTED;
      } else {
        this.#apply();
      }
    }

    return this.#settled;
  }

  /**
   * Drains to completion, then clears. Only a unit's owner calls it, so a
   * drain is never re-entered.
   *
   * Panic is the one immediate application, in the order close, report, tear
   * down. The throw has already abandoned the unit, so nothing is left to
   * complete before applying.
   */
  #drain(): void {
    try {
      this.#queue.apply(this.#step);
    } catch (error) {
      this.#lifecycle = CLOSED;
      this.#panic(error);
      this.#runTeardown();
    } finally {
      this.#queue.clear();
    }
  }

  /** Ends the running unit and applies a destruction it requested. */
  #leave(): void {
    this.#running = false;

    if (this.#lifecycle === REQUESTED) {
      this.#apply();
    }
  }

  /** Applies destruction: closed first, then the release. */
  #apply(): void {
    this.#lifecycle = CLOSED;
    this.#runTeardown();
  }

  /**
   * Releases the loop's own storage, then the caller's.
   *
   * Clear first to keep the argument-release invariant: no queued argument,
   * such as a DOM element or a consumer value, outlives the drain that
   * abandoned it. The settle is a `finally` around the callback, so the promise
   * settles once per controller whether the caller's release returns or throws.
   *
   * A release nobody requested still leaves a settled promise. Panic applies
   * without a request, and a later {@link requestClose} finds the lifecycle
   * `CLOSED` and applies nothing. So it must find the promise already settled,
   * and must not allocate one that nothing would ever settle.
   */
  #runTeardown(): void {
    try {
      this.#queue.clear();
      this.#teardown();
    } finally {
      this.#settle?.();
      this.#settle = null;
      this.#settled ??= Promise.resolve();
    }
  }
}
