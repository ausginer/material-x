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
import { runDragDisposer } from './drag.ts';
import { Session } from './session.ts';

/** Each method works when detached from the controller. */
export interface DraggableController<Operation> {
  /**
   * As `Drag.requestStep`, for whichever operation is current: the step receives
   * the operation `activate` returned, from the end of activation until the drop
   * or the decision, and `null` otherwise.
   */
  readonly requestStep: (step: (operation: Operation | null) => void) => void;
  /** The first decision wins. Nothing happens on an idle controller. */
  readonly requestCancel: (reason?: unknown) => void;
  /** Every call returns one promise, settled after teardown. */
  readonly requestDestroy: () => Promise<void>;
  /** Controller-lifetime cleanup: runs on destruction, last in first out. */
  readonly use: (dispose: () => void) => void;
}

const DEFAULT_THRESHOLD = 8;

/** What the gate runs as the first step of a pass: the work for one input event. */
export interface InputHandler {
  /** Called only by the gate, inside the pass it opened for `event`. */
  handleInput(event: Event): void;
}

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
 * admission, the gate, the deferred steps, destruction, the reader and the slot
 * that holds the current session. Its members without `#` are the
 * session's way in and the public methods; `draggable` hands out only the latter.
 */
export class Gesture<
  State,
  Verdict,
  Operation extends BehaviorOperation<Verdict>,
> implements InputHandler {
  readonly #root: HTMLElement;
  readonly #behavior: Behavior<State, Verdict, Operation>;
  readonly #window: Window & typeof globalThis;
  readonly #threshold: number;
  readonly #listeners = new AbortController();
  readonly #disposers: Array<() => void> = [];

  /** Deferred steps, in request order. Empty on the hot path. */
  readonly #steps: Array<(operation: Operation | null) => void> = [];

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
   * The gate for input: runs `handler`'s work for `event` as the first step of a
   * new pass, then the reader. A running pass or a closed controller refuses the
   * input. Nothing is allocated here, so a pointer sample allocates nothing.
   */
  enter(handler: InputHandler, event: Event): void {
    if (this.#running || this.#destroyed) {
      if (__DEV__ && this.#running) {
        countRefused(event);
      }

      return;
    }

    this.#running = true;

    try {
      try {
        handler.handleInput(event);
      } catch (error) {
        this.raise(error);
      }

      this.#applyRequests();
    } finally {
      this.#running = false;
    }
  }

  handleEvent(event: KeyboardEvent | PointerEvent): void {
    this.enter(this, event);
  }

  /** The root listens only for `pointerdown` and `keydown`. */
  handleInput(event: KeyboardEvent | PointerEvent): void {
    if (event.type === 'pointerdown') {
      this.#press(event as PointerEvent);
    } else {
      this.#command(event as KeyboardEvent);
    }
  }

  /**
   * The gate for requests: a request has filled its slot, and this applies it
   * now unless a pass is running, whose reader applies it (DRI-1). Nothing is
   * refused.
   */
  apply(): void {
    if (!this.#running) {
      this.#run(null, null);
    }
  }

  /**
   * Opens a pass that no input started: `first`, if any, is its first step, and
   * the reader follows. The caller has checked that no pass is running. `first`
   * is a function only where the work is one already: the consumer's step, or
   * `raise`.
   */
  #run<A>(first: ((argument: A) => void) | null, argument: A): void {
    this.#running = true;

    try {
      if (first) {
        try {
          first(argument);
        } catch (error) {
          this.raise(error);
        }
      }

      this.#applyRequests();
    } finally {
      this.#running = false;
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

        if (this.#steps.length > 0) {
          const step = this.#steps.shift()!;

          step(this.#session ? this.#session.stepTarget() : null);
        } else if (!this.#session?.advance()) {
          return;
        }
      } catch (error) {
        this.raise(error);
      }
    }
  }

  /**
   * Reports when caught, and decides if nothing has. The slot is filled before
   * the report, because `reportError` dispatches synchronously and a listener's
   * cancel must find the outcome already decided.
   */
  readonly raise = (error: unknown): void => {
    const fault = new DragFault(error);

    this.#session?.decide(fault, 'fault');
    reportError(fault);
  };

  /**
   * A verdict's fault: raised in the running pass, whose reader then applies it,
   * or else in a new pass.
   */
  raiseInPass(error: unknown): void {
    if (this.#running) {
      this.raise(error);
    } else {
      this.#run(this.raise, error);
    }
  }

  /** Clears the slot. The session calls it when its operation ends. */
  detach(): void {
    this.#session = null;
  }

  readonly requestStep = (
    step: (operation: Operation | null) => void,
  ): void => {
    if (this.#destroyed) {
      return;
    }

    if (this.#running) {
      if (!this.#steps.includes(step)) {
        this.#steps.push(step);
      }
    } else {
      // Requested while idle, the step is the first step of its own pass. The
      // list stays empty, so an idle request allocates nothing.
      this.#run(step, this.#session ? this.#session.stepTarget() : null);
    }
  };

  readonly requestCancel = (reason?: unknown): void => {
    if (this.#session) {
      this.#session.decide(reason, 'request');
      this.apply();
    }
  };

  readonly requestDestroy = (): Promise<void> => {
    if (!this.#destroyed) {
      this.#destroyed = new Promise((resolve) => {
        this.#resolveDestroyed = resolve;
      });
      this.apply();
    }

    return this.#destroyed;
  };

  readonly use = (dispose: () => void): void => {
    if (this.#destroyed && !this.#resolveDestroyed) {
      runDragDisposer(dispose, null, this.raise);
    } else {
      this.#disposers.push(dispose);
    }
  };

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
    this.#steps.length = 0;
    session?.terminate();

    while (this.#disposers.length > 0) {
      runDragDisposer(this.#disposers.pop()!, null, this.raise);
    }

    this.#listeners.abort();
    resolveDestroyed();
  }
}
