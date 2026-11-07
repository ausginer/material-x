/**
 * The public authoring API and the single-pass kernel behind it.
 *
 * The library runs only inside a pass: one synchronous run from a native event,
 * a frame, a settled verdict or a request made while idle. Passes do not nest. A
 * pass is a sequence of steps. Foreign code reached during a step can only fill
 * a request slot, and `#applyRequests` is the one reader of the slots, between
 * steps.
 *
 * A behavior receives `Drag`, which has no path to the session.
 */
import { DragFault } from '../fault.ts';
import type { Admission } from './admission.ts';
import type { Behavior } from './behavior.ts';
import { runDragDisposer, type Drag } from './drag.ts';
import { Session } from './session.ts';

/** Each method works when detached from the controller. */
export type DraggableController<Operation> = Readonly<{
  /**
   * As `Drag.requestStep`, for whichever operation is current: the step receives
   * its `Drag` from the end of activation until the drop or the decision, and
   * `null` otherwise.
   */
  requestStep(step: (drag: Operation | null) => void): void;
  /** The first decision wins. Nothing happens on an idle controller. */
  requestCancel(reason?: unknown): void;
  /** Every call returns one promise, settled after teardown. */
  requestDestroy(): Promise<void>;
  /** Controller-lifetime cleanup: runs on destruction, last in first out. */
  use(dispose: () => void): void;
}>;

const DEFAULT_THRESHOLD = 8;

const NOOP = (): void => {};

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

/** Development only: how many events a running pass refused, for the suite. */
function countRefused(argument: unknown): void {
  const trusted = (argument as Event | null | undefined)?.isTrusted;

  if (trusted !== undefined) {
    const refused = ((globalThis as Record<string, unknown>)[
      '__dragRefused'
    ] ??= { trusted: 0, untrusted: 0 }) as {
      trusted: number;
      untrusted: number;
    };

    if (trusted) {
      refused.trusted += 1;
    } else {
      refused.untrusted += 1;
    }
  }
}

/**
 * What exists across operations or with no operation: the root's listeners,
 * admission, the gate, the deferred steps, destruction, the reader and the slot
 * that holds the current session. Its members without `#` are the
 * session's way in and the public methods; `draggable` hands out only the latter.
 */
export class Gesture<State, Verdict> {
  readonly #root: HTMLElement;
  readonly #behavior: Behavior<State, Verdict>;
  readonly #window: Window & typeof globalThis;
  readonly #threshold: number;
  readonly #listeners = new AbortController();
  readonly #disposers: Array<() => void> = [];

  #session: Session<State, Verdict> | null = null;
  #running = false;

  /** Deferred steps, in request order. Empty on the hot path. */
  readonly #steps: Array<(drag: Drag<State> | null) => void> = [];

  /** Set by the first destruction request, which also closes the controller. */
  #destroyed: Promise<void> | null = null;
  /** The destruction request slot: non-null until teardown has been applied. */
  #resolveDestroyed: (() => void) | null = null;

  constructor(root: HTMLElement, behavior: Behavior<State, Verdict>) {
    this.#root = root;
    this.#behavior = behavior;
    this.#window = root.ownerDocument.defaultView!;
    this.#threshold = behavior.threshold ?? DEFAULT_THRESHOLD;

    root.addEventListener('pointerdown', this.#onPress, {
      signal: this.#listeners.signal,
    });

    if (behavior.command) {
      root.addEventListener('keydown', this.#onCommand, {
        signal: this.#listeners.signal,
      });
    }
  }

  /**
   * The one entry into library work. `step` is a stable function, so a pointer
   * sample allocates nothing here.
   */
  enter<A>(step: (argument: A) => void, argument: A): void {
    if (this.#running || this.#destroyed) {
      if (__DEV__ && this.#running) {
        countRefused(argument);
      }

      return;
    }

    this.#running = true;

    try {
      try {
        step(argument);
      } catch (error) {
        this.raise(error);
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
          this.#runStep(this.#steps.shift()!);
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
      this.enter(this.raise, error);
    }
  }

  /** Clears the slot. The session calls it when its operation ends. */
  detach(): void {
    this.#session = null;
  }

  readonly requestStep = (step: (drag: Drag<State> | null) => void): void => {
    if (this.#destroyed) {
      return;
    }

    if (!this.#running) {
      this.enter(this.#runStep, step);
    } else if (!this.#steps.includes(step)) {
      this.#steps.push(step);
    }
  };

  readonly #runStep = (step: (drag: Drag<State> | null) => void): void => {
    step(this.#session ? this.#session.stepTarget() : null);
  };

  readonly requestCancel = (reason?: unknown): void => {
    if (this.#session) {
      this.#session.decide(reason, 'request');
      this.enter(NOOP, null);
    }
  };

  readonly requestDestroy = (): Promise<void> => {
    if (!this.#destroyed) {
      this.#destroyed = new Promise((resolve) => {
        this.#resolveDestroyed = resolve;
      });

      if (!this.#running) {
        this.#teardown();
      }
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

  readonly #onPress = (event: PointerEvent): void => {
    this.enter(this.#press, event);
  };

  readonly #press = (event: PointerEvent): void => {
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
  };

  readonly #onCommand = (event: KeyboardEvent): void => {
    this.enter(this.#command, event);
  };

  readonly #command = (event: KeyboardEvent): void => {
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
  };

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
