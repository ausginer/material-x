/**
 * The public authoring API and the single-pass kernel behind it.
 *
 * The library runs only inside a pass: one synchronous run from a native event,
 * a frame, a settled verdict or a request made while idle. Passes do not nest. A
 * pass is a sequence of steps. Foreign code reached during a step can only fill
 * a request slot, and `#applyRequests` is the one reader of the slots, between
 * steps.
 *
 * A behavior receives `Drag`, which has no path to the session, and a step
 * receives the behavior's operation.
 */
import { DragFault } from '../fault.ts';
import type { Admission } from './admission.ts';
import type { Behavior, BehaviorOperation } from './behavior.ts';
import * as Callbacks from './callbacks.ts';
import { runDisposers, runDragDisposer, type Fallible } from './drag.ts';
import { Session } from './session.ts';

/**
 * Call each method on the controller, as in `controller.requestDestroy()`: a
 * method may depend on the controller as its receiver.
 */
export interface DraggableController<Operation> {
  /**
   * As `Drag.requestStep`, for whichever operation is current: the step receives
   * the operation `activate` returned, from the end of activation until the drop
   * or the decision, and `null` otherwise. Called with no receiver.
   */
  requestStep(
    step: (this: undefined, operation: Operation | null) => void,
  ): void;
  /**
   * As above, with `step` called on `receiver`. The same step requested again
   * before it runs runs once only when it comes with the same receiver.
   */
  requestStep<Receiver extends object>(
    step: (this: Receiver, operation: Operation | null) => void,
    receiver: Receiver,
  ): void;
  /** The first decision wins. Nothing happens on an idle controller. */
  requestCancel(reason?: unknown): void;
  /** Every call returns one promise, settled after teardown. */
  requestDestroy(): Promise<void>;
  /**
   * Controller-lifetime cleanup: runs on destruction, last in first out. Added
   * after teardown, it runs at once. Called with no receiver.
   */
  use(dispose: (this: undefined) => void): void;
  /**
   * As above, with `dispose` called on `receiver`. Every call is its own
   * registration, so the same disposer registered twice runs twice.
   */
  use<Receiver extends object>(
    dispose: (this: Receiver) => void,
    receiver: Receiver,
  ): void;
}

const DEFAULT_THRESHOLD = 8;

/**
 * Events a controller of this library copy has admitted. Bubbling reaches the
 * innermost root first, so the innermost admitting root wins and an outer root
 * sees only what its inner roots declined.
 */
const admitted = new WeakSet<Event>();

/**
 * Whether a hop before the subject is marked `data-drag-ignore`. The consumer
 * owns that attribute, and the library infers nothing about element types.
 */
function ownsInteraction(event: Event, subject: EventTarget): boolean {
  for (const hop of event.composedPath()) {
    if (hop === subject) {
      return false;
    }

    // A path also holds the shadow roots, the document and the window.
    if ((hop as Partial<Element>).matches?.('[data-drag-ignore]')) {
      return true;
    }
  }

  return false;
}

/**
 * Development only: how many events a running pass refused, for the suite. An
 * event refused by both the window's and the root's listener counts once.
 */
const countedRefusals = new WeakSet<Event>();

function countRefused(event: Event): void {
  if (countedRefusals.has(event)) {
    return;
  }

  countedRefusals.add(event);

  const refused = ((globalThis as Record<string, unknown>)['__dragRefused'] ??=
    { trusted: 0, untrusted: 0 }) as {
    trusted: number;
    untrusted: number;
  };

  if (event.isTrusted) {
    refused.trusted += 1;
  } else {
    refused.untrusted += 1;
  }
}

/**
 * What exists across operations or with no operation: the root's listeners,
 * admission, the pass, the deferred steps, destruction, the reader and the slot
 * that holds the current session. Its members without `#` are the public
 * methods and the session's way in. `draggable` returns the instance typed as
 * `DraggableController`, which names only the public methods.
 */
export class Gesture<
  State,
  Verdict,
  Operation extends BehaviorOperation<Verdict>,
>
  implements DraggableController<Operation>, Fallible
{
  readonly #root: HTMLElement;
  readonly #behavior: Behavior<State, Verdict, Operation>;
  readonly #window: Window & typeof globalThis;
  readonly #threshold: number;
  readonly #listeners = new AbortController();
  /** Controller-lifetime cleanup, each with its receiver, run at teardown. */
  readonly #disposers = Callbacks.stack<null>();

  /**
   * Deferred steps with their receivers, in request order. Empty on the hot
   * path.
   */
  readonly #steps = Callbacks.queue<Operation | null>();

  #session: Session<State, Verdict, Operation> | null = null;
  #running = false;

  /** Set by the first destruction request, which also closes the controller. */
  #destroyed: Promise<void> | null = null;
  /** The destruction request slot: non-null until teardown has been applied. */
  #resolveDestroyed: (() => void) | null = null;

  constructor(
    root: HTMLElement,
    behavior: Behavior<State, Verdict, Operation>,
  ) {
    this.#root = root;
    this.#behavior = behavior;
    this.#window = root.ownerDocument.defaultView!;
    this.#threshold = behavior.threshold ?? DEFAULT_THRESHOLD;

    root.addEventListener('pointerdown', this, {
      signal: this.#listeners.signal,
    });

    if (behavior.command) {
      root.addEventListener('keydown', this, {
        signal: this.#listeners.signal,
      });
    }
  }

  /**
   * The one pass: runs `step`, if any, as its first step, called on `receiver`,
   * then the reader. A throw from `step` is a fault.
   *
   * - **Input** passes the receiving object's private method, the event and that
   *   object. A running pass refuses it, and it is lost.
   * - **A request** that has filled its slot passes nothing. A running pass's
   *   reader applies it.
   * - **A step requested while idle** passes the receiver it was requested with,
   *   if any.
   * - **A verdict's fault while idle** passes `raise` and the controller.
   *
   * After teardown, everything is refused. Destruction requested while idle is
   * not refused, because its slot is still filled. Nothing is allocated here, so
   * a pointer sample allocates nothing.
   */
  enter(): void;
  enter<A>(step: (argument: A) => void, argument: A): void;
  enter<A, R extends object>(
    step: (this: R, argument: A) => void,
    argument: A,
    receiver: R | undefined,
  ): void;
  enter(
    step?: (this: object | undefined, argument: unknown) => void,
    argument?: unknown,
    receiver?: object,
  ): void {
    if (this.#running || (this.#destroyed && !this.#resolveDestroyed)) {
      // While a pass runs, only input arrives here with a step: a request has
      // none, and a step or a fault requested in a pass does not enter.
      if (__DEV__ && this.#running && step) {
        countRefused(argument as Event);
      }

      return;
    }

    this.#running = true;

    try {
      if (step) {
        try {
          step.call(receiver, argument);
        } catch (error) {
          this.raise(error);
        }
      }

      this.#applyRequests();
    } finally {
      this.#running = false;
    }
  }

  handleEvent(event: KeyboardEvent | PointerEvent): void {
    if (event.type === 'pointerdown') {
      this.enter(this.#press, event as PointerEvent, this);
    } else {
      this.enter(this.#command, event as KeyboardEvent, this);
    }
  }

  /**
   * Reports when caught, and decides if nothing has. The slot is filled before
   * the report, because `reportError` dispatches synchronously and a listener's
   * cancel must find the outcome already decided.
   */
  raise(error: unknown): void {
    const fault = new DragFault(error);

    this.#session?.decide(fault, 'fault');
    reportError(fault);
  }

  /**
   * A verdict's fault: raised in the running pass, whose reader then applies it,
   * or else in a new pass.
   */
  raiseInPass(error: unknown): void {
    if (this.#running) {
      this.raise(error);
    } else {
      this.enter(this.raise, error, this);
    }
  }

  /** Clears the slot. The session calls it when its operation ends. */
  detach(): void {
    this.#session = null;
  }

  requestStep(
    step: (this: undefined, operation: Operation | null) => void,
  ): void;
  requestStep<Receiver extends object>(
    step: (this: Receiver, operation: Operation | null) => void,
    receiver: Receiver,
  ): void;
  /** The session's `Drag` forwards a step with its receiver, or with none. */
  requestStep(
    step: (this: object | undefined, operation: Operation | null) => void,
    receiver: object | undefined,
  ): void;
  requestStep(
    step: (this: object | undefined, operation: Operation | null) => void,
    receiver?: object,
  ): void {
    if (this.#destroyed) {
      return;
    }

    if (this.#running) {
      // Steps coalesce by step and receiver. A running step is no longer
      // waiting, so a request it makes for itself adds it again.
      if (!this.#steps.has(step, receiver)) {
        this.#steps.add(step, receiver);
      }
    } else {
      // Requested while idle, the step is the first step of its own pass. The
      // list stays empty, so an idle request allocates nothing.
      this.enter(
        step,
        this.#session ? this.#session.stepTarget() : null,
        receiver,
      );
    }
  }

  requestCancel(reason?: unknown): void {
    if (this.#session) {
      this.#session.decide(reason, 'request');
      this.enter();
    }
  }

  requestDestroy(): Promise<void> {
    if (!this.#destroyed) {
      this.#destroyed = new Promise((resolve) => {
        this.#resolveDestroyed = resolve;
      });
      this.enter();
    }

    return this.#destroyed;
  }

  use(dispose: (this: undefined) => void): void;
  use<Receiver extends object>(
    dispose: (this: Receiver) => void,
    receiver: Receiver,
  ): void;
  use(dispose: (this: object | undefined) => void, receiver?: object): void {
    if (this.#destroyed && !this.#resolveDestroyed) {
      runDragDisposer(dispose, null, this, receiver);
    } else {
      // Every registration is its own entry, so the same pair runs once per
      // call.
      this.#disposers.add(dispose, receiver);
    }
  }

  /**
   * Between steps, the one reader of the slots. Precedence is statement order:
   * destruction, deferred steps, then the session's decision and its next step.
   * A request made by anything run here is seen on the next turn.
   */
  #applyRequests(): void {
    for (;;) {
      try {
        if (this.#resolveDestroyed) {
          this.#teardown();
          return;
        }

        if (!this.#steps.empty) {
          this.#steps.run(this.#session ? this.#session.stepTarget() : null);
        } else if (!this.#session?.advance()) {
          return;
        }
      } catch (error) {
        this.raise(error);
      }
    }
  }

  #press(event: PointerEvent): void {
    if (
      event.button === 0 &&
      event.isPrimary &&
      !this.#session &&
      !admitted.has(event)
    ) {
      const admission = this.#behavior.admit(event);

      if (
        admission &&
        !ownsInteraction(event, admission.handle ?? admission.item)
      ) {
        admitted.add(event);
        this.#open(admission, event.clientX, event.clientY, event.pointerId);
      }
    }
  }

  #command(event: KeyboardEvent): void {
    if (this.#session || admitted.has(event)) {
      return;
    }

    const admission = this.#behavior.command!(event);

    if (
      admission &&
      !ownsInteraction(event, admission.handle ?? admission.item)
    ) {
      admitted.add(event);
      event.preventDefault();
      this.#open(admission, 0, 0);
    }
  }

  #open(
    admission: Admission<State>,
    x: number,
    y: number,
    pointerId?: number,
  ): void {
    this.#session = new Session(
      this,
      this.#behavior,
      this.#root,
      this.#window,
      this.#threshold,
      admission,
      x,
      y,
      pointerId,
    );
  }

  /** Destruction applied: closed first, then everything released, once. */
  #teardown(): void {
    // Taken before they are cleared.
    const session = this.#session;
    const resolveDestroyed = this.#resolveDestroyed!;

    this.#resolveDestroyed = null;
    this.#session = null;
    this.#steps.clear();
    session?.terminate();

    runDisposers(this.#disposers, null, this);

    this.#listeners.abort();
    resolveDestroyed();
  }
}
