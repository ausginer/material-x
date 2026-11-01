import { ActionQueue } from './queue.ts';

/** The lifecycle request's three states, in the only order they are reached. */
const LIVE = 0;
const REQUESTED = 1;
const CLOSED = 2;

/**
 * The controller-lifetime execution bracket: the lifecycle request, the
 * run-to-completion drain, the unit boundary at which a request is applied,
 * and teardown.
 *
 * **It names nothing the kernel models.** No frame, operation, spec or DOM
 * node, and it invokes no slot the consumer filled — every consumer-visible act
 * stays behind one of the four callbacks it is constructed with. That is what
 * makes the entity safe to hold the lifecycle request: the datum every liveness
 * rule is indexed on is owned by the thing that can state its own invariant,
 * and the storage under it keeps owning none.
 *
 * A *unit* is one synchronous entry into kernel code from outside it:
 * construction, a native ingress pass, one queued action. **Units do not
 * nest.** While one runs, a dispatch appends to the queue and returns, and a
 * native ingress pass is refused before it touches anything, so whether a unit
 * is running is one boolean. A request made while a unit runs is applied when
 * that unit ends and never inside it; with no unit running, the request call
 * is itself the boundary.
 */
export class ExecutionBracket {
  /**
   * Pending work. The storage iterates and decides nothing; the bracket
   * supplies every semantic it deliberately has none of, including when a
   * drain stops.
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
   * One drain step, handed to the queue. Minted once per bracket rather than
   * per drain, because a drain runs on every pointer sample.
   *
   * The lifecycle request is read before each action, the first entry of a
   * drain included, and never inside one. A destruction requested by an action
   * therefore lets that action finish and stops the drain at the next entry,
   * which is the boundary at which the request is applied.
   */
  readonly #step = (action: number, argument: unknown): boolean => {
    if (this.#lifecycle !== LIVE) {
      return false;
    }

    this.#handle(action, argument);
    return true;
  };

  /**
   * All four callbacks are controller-invariant and supplied once, so the
   * per-action and per-sample paths allocate nothing.
   *
   * @param handle - Runs one action. Must be **total**: an action it does not
   *   recognise in the current phase is ignored, never thrown on.
   * @param panic - Receives a throw escaping `handle`, which is an invariant
   *   violation. The bracket has already closed when it is called and tears
   *   down once it returns, so it only reports, and it must not throw.
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

  /**
   * Whether destruction has been applied. A request not yet applied reads
   * `false`: the unit that made it completes as a live controller's unit.
   */
  get closed(): boolean {
    return this.#lifecycle === CLOSED;
  }

  /**
   * Whether a native ingress pass would be admitted: no unit is running and
   * the controller is live.
   *
   * Exposed so the caller can keep work it does ahead of a pass — work that
   * must happen even when it opens none — behind the same refusal.
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
   * Runs one native ingress pass as a unit around `admit`, then drains what it
   * dispatched.
   *
   * **A refused pass prepares nothing**, which is the whole point of refusing
   * before rather than after: a nested press that reached the caller's
   * preparation would rebuild the draft a running unit is writing and commit
   * its own origin. So the refusal precedes `beginPass`, and the caller may
   * hold only preconditions of the call on its own side.
   *
   * The drain after admission is unconditional. When admission requested
   * destruction it handles nothing, because its step declines the first entry.
   */
  runIngress(admit: () => void): void {
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
   * **Panic is the one immediate application**, in the order close, report,
   * tear down. The throw has already abandoned the unit, so there is nothing
   * left to complete before applying.
   */
  #drain(): void {
    try {
      this.#queue.apply(this.#step);
    } catch (error) {
      this.#lifecycle = CLOSED;
      this.#panic(error);
      this.#release();
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
    this.#release();
  }

  /**
   * Releases the bracket's own storage, then the caller's.
   *
   * Clearing first is the argument-release invariant: no queued argument — a
   * DOM element, a consumer value — outlives the drain that abandoned it. The
   * settle is a `finally` around the callback, so the promise settles once per
   * controller whether the caller's release returns or throws.
   *
   * **A release nobody requested still leaves a settled promise.** Panic
   * applies without a request, and a later {@link requestClose} finds the
   * lifecycle `CLOSED` and applies nothing, so it must find the promise
   * already settled rather than allocate one nothing would ever settle.
   */
  #release(): void {
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
