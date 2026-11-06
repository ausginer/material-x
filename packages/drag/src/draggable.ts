/**
 * The public authoring API and the single-pass kernel behind it.
 *
 * The library runs only inside a pass: one synchronous run from a native event,
 * a frame, a settled verdict or a request made while idle. Passes do not nest. A
 * pass is a sequence of steps. Foreign code reached during a step can only fill
 * a request slot, and `#applyRequests` is the one reader of the slots, between
 * steps.
 *
 * A behavior receives `Drag`, a view with no path to the session.
 */
import type { Space } from '@ydinjs/box-quad';
import { DragFault } from './fault.ts';
import type { lift } from './lift.ts';
import { deepActiveElement } from './shared/focus.ts';

export type CancelOrigin = 'request' | 'escape' | 'interrupted' | 'fault';

/** `drop` returned nothing to ask, or the behavior has no `drop`. */
export type SkippedOutcome = Readonly<{ type: 'skipped' }>;

export type VerdictOutcome<Verdict> = Readonly<{
  type: 'verdict';
  value: Verdict;
}>;

/** A fault decides as `origin: 'fault'`, with the reported `DragFault`. */
export type CanceledOutcome = Readonly<{
  type: 'canceled';
  reason: unknown;
  origin: CancelOrigin;
}>;

export type Outcome<Verdict = unknown> =
  | SkippedOutcome
  | VerdictOutcome<Verdict>
  | CanceledOutcome;

/** What `admit` and `command` name. */
export type Admission<State> = Readonly<{
  item: HTMLElement;
  /**
   * Where the press must land. A hop before it marked `data-drag-ignore` owns
   * its own interaction and refuses the admission. Defaults to `item`.
   */
  handle?: HTMLElement;
  state?: State;
  /** Needs `lift`. */
  visual?: never;
  /** Needs `lift`. */
  box?: never;
}>;

/** An admission for a behavior composed with `lift`. */
export type LiftedAdmission<State> = Omit<Admission<State>, 'visual' | 'box'> &
  Readonly<{
    /** The element lifted and translated. Defaults to `item`. */
    visual?: HTMLElement;
    /** The element whose offset size `boxWidth`/`boxHeight` report. */
    box?: HTMLElement;
  }>;

/** Viewport position for the visual's top-left, and the animation's timing. */
export type Landing = Readonly<{
  x: number;
  y: number;
  duration?: number;
  easing?: string;
}>;

/**
 * Cleanup for an operation. It receives the outcome, or `null` on destruction,
 * where neither `settle` nor `end` runs. A disposer added after release runs at
 * once.
 */
export type DragDisposer = (outcome: Outcome | null) => void;

/**
 * One operation, as a behavior sees it. The coordinates change between hooks, so
 * read them when needed.
 */
export type Drag<State = undefined> = Readonly<{
  item: HTMLElement;
  /** The behavior's own value from admission. */
  state: State;
  /** `-1` for an operation `command` admitted, which has no pointer. */
  pointerId: number;
  x: number;
  y: number;
  originX: number;
  originY: number;
  /** Aborts when the operation releases its presentation. */
  signal: AbortSignal;
  use(dispose: DragDisposer): void;
  /**
   * Runs `step` in a pass: at once when no pass is running, otherwise between
   * steps, in request order. The same function requested again before it runs
   * runs once. The step receives the running operation's `Drag` from the end of
   * activation until the drop or the decision, and `null` otherwise.
   *
   * Code outside a hook, such as a consumer's method or a frame callback, must
   * write behavior state through this. Foreign code can run during any DOM write
   * the kernel makes, and a direct write would change the running step.
   */
  requestStep(step: (drag: Drag<State> | null) => void): void;
  /** Does nothing after this operation's decision. */
  requestCancel(reason?: unknown): void;
}>;

/** The members of `Drag` whose types name the view itself. */
type SelfNamingMembers = 'requestStep';

/** `Drag` for a behavior composed with `lift`. */
export type LiftedDrag<State = undefined> = Omit<
  Drag<State>,
  SelfNamingMembers
> &
  Readonly<{
    /** See `Drag.requestStep`. */
    requestStep(step: (drag: LiftedDrag<State> | null) => void): void;
    visual: HTMLElement;
    box: HTMLElement;
    /** The visual's rect at the grab. */
    rect: DOMRectReadOnly;
    boxWidth: number;
    boxHeight: number;
    /** What the visual inherits. Pass it to `localDelta` from `@ydinjs/box-quad`. */
    visualSpace: Space;
    /** What the item inherits. */
    itemSpace: Space;
    /** The viewport delta last translated to. */
    translatedX: number;
    translatedY: number;
    /** Moves the lifted visual to a viewport delta from the grab. */
    translate(x: number, y: number): void;
  }>;

type Hooks<View, Admitted, Settled, Verdict> = Readonly<{
  /** Pointer travel that activates, in viewport pixels. Defaults to 8. */
  threshold?: number;
  /** A primary press on the root. Return `null` to decline. */
  admit(event: PointerEvent): Admitted | null;
  /**
   * A key on the root. An admission runs one complete operation with no pointer:
   * activate, start, drop, settle and end. The key's default is then prevented.
   */
  command?(event: KeyboardEvent): Admitted | null;
  /**
   * Everything that can fail. `false` declines quietly and a throw is a fault.
   * Neither gets `start` or `end`.
   */
  activate?(drag: View): false | undefined;
  /** The consumer's notification. From here `end` is guaranteed. */
  start?(drag: View): void;
  move?(drag: View): void;
  /** Returns the verdict to wait for, or `null` to skip it. */
  drop?(
    drag: View,
  ): ((signal: AbortSignal) => Verdict | PromiseLike<Verdict>) | null;
  /**
   * The outcome is decided and the presentation is still held. Runs only if
   * `start` was reached.
   */
  settle?(drag: View, outcome: Outcome<Verdict>): Settled;
  /** Runs after release, in the same task. A landing does not delay it. */
  end?(drag: View, outcome: Outcome<Verdict>): void;
}>;

/** A behavior with no top layer and no measurement. It renders by itself. */
export type Behavior<State = undefined, Verdict = unknown> = Hooks<
  Drag<State>,
  Admission<State>,
  null | undefined,
  Verdict
> &
  Readonly<{ lift?: undefined }>;

/**
 * A behavior whose visual the library promotes to the top layer. `settle` names
 * where the visual lands, or `null`.
 */
export type LiftedBehavior<State = undefined, Verdict = unknown> = Hooks<
  LiftedDrag<State>,
  LiftedAdmission<State>,
  Landing | null | undefined,
  Verdict
> &
  Readonly<{ lift: typeof lift }>;

export type DraggableController<View> = Readonly<{
  /** See `Drag.requestStep`. */
  requestStep(step: (drag: View | null) => void): void;
  /** The first decision wins. Nothing happens on an idle controller. */
  requestCancel(reason?: unknown): void;
  /** Every call returns one promise, settled after teardown. */
  requestDestroy(): Promise<void>;
  /** Controller-lifetime cleanup: runs on destruction, last in first out. */
  use(dispose: () => void): void;
}>;

/** How the kernel holds a lift. The lift's code stays in its own module. */
export type LiftHold = Readonly<{
  /** Restores the visual's inline declarations and popover state. */
  release(): void;
  /** Starts the landing, and returns how to cancel it if one runs. */
  land(landing: Landing): (() => void) | null;
}>;

/** The kernel's view. A lift adds its own members to the same object. */
type SessionView<State> = {
  -readonly [K in keyof LiftedDrag<State>]: LiftedDrag<State>[K];
};

type AnyBehavior<State, Verdict> = Hooks<
  LiftedDrag<State>,
  LiftedAdmission<State>,
  Landing | null | undefined,
  Verdict
> &
  Readonly<{ lift?: typeof lift }>;

const PENDING = 1;
const ACTIVE = 2;
const DROPPING = 3;
const CONCLUDED = 4;

const COMMAND_POINTER_ID = -1;
const DEFAULT_THRESHOLD = 8;

const SKIPPED: SkippedOutcome = { type: 'skipped' };

const NOOP = (): void => {};

/** One operation. Its absence means idle, so a late request reaches nothing. */
type Session<State, Verdict> = {
  view: SessionView<State>;
  readonly admission: LiftedAdmission<State>;
  /** Pointer samples, closed at the drop or the decision. */
  readonly motion: AbortController;
  /** Escape and `drag.signal`, closed when the presentation is released. */
  readonly operation: AbortController;
  readonly disposers: DragDisposer[];
  phase: typeof PENDING | typeof ACTIVE | typeof DROPPING | typeof CONCLUDED;
  /** The first cancel, fault or verdict. Whichever arrives first decides. */
  decision: Outcome<Verdict> | null;
  /** The sequence's next step, run unless a request outranks it. */
  next: (() => void) | null;
  /** Aborts the verdict in flight. Never aborted after a completion. */
  verdictAborter: AbortController | null;
  lift: LiftHold | null;
  /** `start` was reached. No start, no settle and no end. */
  started: boolean;
  /** The element to give focus back to, recorded at the drop or the decision. */
  focused: HTMLElement | null;
};

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

/** The focused element when it is `item` or inside it, through shadow roots. */
function focusedWithin(item: HTMLElement): HTMLElement | null {
  const active = deepActiveElement(item.ownerDocument);
  let node: Node | null = active;

  while (node) {
    if (node === item) {
      return active as HTMLElement;
    }

    node = node.parentNode ?? (node as Partial<ShadowRoot>).host ?? null;
  }

  return null;
}

/**
 * An activated drag swallows its own trailing click, and only that.
 *
 * The guard outlives its session and its controller, because a cancel or a
 * destruction can arrive with the button held. So it is a free function with
 * only the pointer identity to hold. It expires at the first of: the click, the
 * task after that pointer's release (the platform dispatches the click in the
 * release's task), that pointer's `pointercancel`, or the next primary press,
 * which covers a release that never reached the window.
 */
function armClickGuard(target: Window, pointerId: number): void {
  const guard = new AbortController();
  const options = { capture: true, signal: guard.signal };
  const expire = (): void => {
    guard.abort();
  };

  target.addEventListener(
    'pointerup',
    (event) => {
      if (event.pointerId === pointerId) {
        setTimeout(expire);
      }
    },
    options,
  );
  target.addEventListener(
    'pointercancel',
    (event) => {
      if (event.pointerId === pointerId) {
        expire();
      }
    },
    options,
  );
  target.addEventListener(
    'pointerdown',
    (event) => {
      if (event.isPrimary && event.button === 0) {
        expire();
      }
    },
    options,
  );
  target.addEventListener(
    'click',
    (event) => {
      // WebKit's click is a `MouseEvent` with no `pointerId`, whatever the
      // library type says.
      if (
        ((event.pointerId as number | undefined) ?? pointerId) === pointerId
      ) {
        expire();
        event.preventDefault();
        event.stopPropagation();
      }
    },
    options,
  );
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

class Gesture<State, Verdict> {
  readonly #root: HTMLElement;
  readonly #behavior: AnyBehavior<State, Verdict>;
  readonly #window: Window & typeof globalThis;
  readonly #threshold: number;
  readonly #listeners = new AbortController();
  readonly #disposers: Array<() => void> = [];

  #session: Session<State, Verdict> | null = null;
  #running = false;

  /** Deferred steps, in request order. Empty on the hot path. */
  readonly #steps: Array<(drag: LiftedDrag<State> | null) => void> = [];

  /** Set by the first destruction request, which also closes the controller. */
  #destroyed: Promise<void> | null = null;
  /** The destruction request slot: non-null until teardown has been applied. */
  #resolveDestroyed: (() => void) | null = null;

  #cancelLanding: (() => void) | null = null;

  constructor(root: HTMLElement, behavior: AnyBehavior<State, Verdict>) {
    this.#root = root;
    this.#behavior = behavior;
    this.#window = root.ownerDocument.defaultView!;
    this.#threshold = behavior.threshold ?? DEFAULT_THRESHOLD;

    const { signal } = this.#listeners;

    root.addEventListener('pointerdown', this.#onPress, { signal });

    if (behavior.command) {
      root.addEventListener('keydown', this.#onCommand, { signal });
    }
  }

  /**
   * The one entry into library work. `step` is a stable function, so a pointer
   * sample allocates nothing here.
   */
  #enter<A>(step: (argument: A) => void, argument: A): void {
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
        this.#raise(error);
      }

      this.#applyRequests();
    } finally {
      this.#running = false;
    }
  }

  /**
   * Between steps, the one reader of the slots. Precedence is statement order:
   * destruction, deferred steps, the decision, the sequence's next step. A
   * request made by anything run here is seen on the next turn.
   */
  #applyRequests(): void {
    for (;;) {
      const session = this.#session;

      try {
        if (this.#resolveDestroyed) {
          this.#teardown();
          return;
        }

        if (this.#steps.length > 0) {
          this.#runStep(this.#steps.shift()!);
        } else if (session?.decision && session.phase !== CONCLUDED) {
          this.#conclude(session, session.decision);
        } else if (session?.next) {
          const { next } = session;

          session.next = null;
          next();
        } else {
          return;
        }
      } catch (error) {
        this.#raise(error);
      }
    }
  }

  /**
   * Reports when caught, and decides if nothing has. The slot is filled before
   * the report, because `reportError` dispatches synchronously and a listener's
   * cancel must find the outcome already decided.
   */
  readonly #raise = (error: unknown): void => {
    const fault = new DragFault(error);

    if (this.#session) {
      this.#session.decision ??= {
        type: 'canceled',
        reason: fault,
        origin: 'fault',
      };
    }

    reportError(fault);
  };

  readonly requestStep = (
    step: (drag: LiftedDrag<State> | null) => void,
  ): void => {
    if (this.#destroyed) {
      return;
    }

    if (!this.#running) {
      this.#enter(this.#runStep, step);
    } else if (!this.#steps.includes(step)) {
      this.#steps.push(step);
    }
  };

  readonly #runStep = (
    step: (drag: LiftedDrag<State> | null) => void,
  ): void => {
    const session = this.#session;

    step(session?.phase === ACTIVE && !session.decision ? session.view : null);
  };

  requestCancel(reason?: unknown): void {
    this.#cancel(reason, 'request');
  }

  #cancel(reason: unknown, origin: CancelOrigin): void {
    const session = this.#session;

    if (session) {
      session.decision ??= { type: 'canceled', reason, origin };
      this.#enter(NOOP, null);
    }
  }

  requestDestroy(): Promise<void> {
    if (!this.#destroyed) {
      this.#destroyed = new Promise((resolve) => {
        this.#resolveDestroyed = resolve;
      });

      if (!this.#running) {
        this.#teardown();
      }
    }

    return this.#destroyed;
  }

  use(dispose: () => void): void {
    if (this.#destroyed && !this.#resolveDestroyed) {
      this.#dispose(dispose, null);
    } else {
      this.#disposers.push(dispose);
    }
  }

  /** Runs one disposer. Whatever it throws, the caller's walk continues. */
  #dispose(dispose: DragDisposer, outcome: Outcome | null): void {
    try {
      dispose(outcome);
    } catch (error) {
      this.#raise(error);
    }
  }

  readonly #onPress = (event: PointerEvent): void => {
    this.#enter(this.#press, event);
  };

  readonly #press = (event: PointerEvent): void => {
    if (event.button === 0 && event.isPrimary && !this.#session) {
      const admitted = this.#behavior.admit(event);

      if (
        admitted &&
        !ownsInteraction(event, admitted.handle ?? admitted.item)
      ) {
        this.#open(admitted, event.pointerId, event.clientX, event.clientY);
      }
    }
  };

  readonly #onCommand = (event: KeyboardEvent): void => {
    this.#enter(this.#command, event);
  };

  /** A press and an activation, whose last act names the release. */
  readonly #command = (event: KeyboardEvent): void => {
    if (this.#session) {
      return;
    }

    const admitted = this.#behavior.command!(event);

    if (admitted && !ownsInteraction(event, admitted.handle ?? admitted.item)) {
      event.preventDefault();

      const session = this.#open(admitted, COMMAND_POINTER_ID, 0, 0);

      session.next = () => {
        this.#activate(session);
      };
    }
  };

  #open(
    admission: LiftedAdmission<State>,
    pointerId: number,
    x: number,
    y: number,
  ): Session<State, Verdict> {
    const motion = new AbortController();
    const operation = new AbortController();
    const session: Session<State, Verdict> = {
      // Filled below, because its methods close over this record.
      view: null as never,
      admission,
      motion,
      operation,
      disposers: [],
      phase: PENDING,
      decision: null,
      next: null,
      verdictAborter: null,
      lift: null,
      started: false,
      focused: null,
    };
    const view: Drag<State> = {
      item: admission.item,
      state: admission.state as State,
      pointerId,
      x,
      y,
      originX: x,
      originY: y,
      signal: operation.signal,
      use: (dispose) => {
        if (operation.signal.aborted) {
          this.#dispose(dispose, this.#destroyed ? null : session.decision);
        } else {
          session.disposers.push(dispose);
        }
      },
      requestStep: this.requestStep,
      requestCancel: (reason) => {
        if (this.#session === session) {
          this.#cancel(reason, 'request');
        }
      },
    };

    // A lift fills the rest before `activate`, and only a behavior composed with
    // `lift` can name them.
    session.view = view as unknown as SessionView<State>;

    const { document } = this.#window;

    if (pointerId !== COMMAND_POINTER_ID) {
      for (const type of [
        'pointermove',
        'pointerup',
        'pointercancel',
        'lostpointercapture',
      ]) {
        document.addEventListener(type, this.#onPointer as EventListener, {
          signal: motion.signal,
        });
      }
    }

    document.addEventListener('keydown', this.#onEscape, {
      signal: operation.signal,
    });

    this.#session = session;
    return session;
  }

  readonly #onEscape = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      this.#cancel(undefined, 'escape');
    }
  };

  readonly #onPointer = (event: PointerEvent): void => {
    if (event.pointerId !== this.#session?.view.pointerId) {
      return;
    }

    if (event.type === 'pointermove') {
      this.#enter(this.#move, event);
    } else if (event.type === 'pointerup') {
      this.#enter(this.#up, event);
    } else if (
      event.type === 'pointercancel' ||
      // Taking a touch's implicit capture from the pressed element also fires
      // this event, and it bubbles here. The root then holds the capture.
      !this.#root.hasPointerCapture(event.pointerId)
    ) {
      this.#cancel(undefined, 'interrupted');
    }
  };

  readonly #move = (event: PointerEvent): void => {
    const session = this.#session!;
    const { view } = session;

    view.x = event.clientX;
    view.y = event.clientY;

    if (session.phase === ACTIVE) {
      this.#behavior.move?.(view);
      return;
    }

    const dx = view.x - view.originX;
    const dy = view.y - view.originY;

    if (
      session.phase === PENDING &&
      dx * dx + dy * dy >= this.#threshold * this.#threshold
    ) {
      event.preventDefault();
      this.#window.getSelection()?.removeAllRanges();
      armClickGuard(this.#window, view.pointerId);
      this.#activate(session);
    }
  };

  readonly #up = (event: PointerEvent): void => {
    const session = this.#session!;

    if (session.phase === PENDING) {
      session.motion.abort();
      session.operation.abort();
      this.#session = null;
      return;
    }

    session.view.x = event.clientX;
    session.view.y = event.clientY;
    this.#drop(session);
  };

  #activate(session: Session<State, Verdict>): void {
    const { view, admission } = session;

    // The consumer removed the item during the press, so there is nothing to
    // drag. This is not a fault, and a lift could not measure it.
    if (!view.item.isConnected) {
      session.decision ??= SKIPPED;
      return;
    }

    this.#cancelLanding?.();
    this.#cancelLanding = null;

    if (this.#behavior.lift) {
      session.lift = this.#behavior.lift(
        view,
        admission,
        this.#window,
        this.#raise,
      );
    }

    if (view.pointerId !== COMMAND_POINTER_ID) {
      this.#root.setPointerCapture(view.pointerId);
    }

    if (this.#behavior.activate?.(view) === false) {
      session.decision ??= SKIPPED;
      return;
    }

    session.started = true;
    this.#behavior.start?.(view);
    session.phase = ACTIVE;

    // A pointerless operation has no `pointerup`, so the sequence produces its
    // own release, after anything the hooks above requested.
    if (view.pointerId === COMMAND_POINTER_ID) {
      session.next = () => {
        this.#drop(session);
      };
    }
  }

  #drop(session: Session<State, Verdict>): void {
    session.phase = DROPPING;
    this.#closeMotion(session);
    session.focused = focusedWithin(session.view.item);

    const invoke = this.#behavior.drop?.(session.view);

    session.next = invoke
      ? () => {
          this.#requestVerdict(session, invoke);
        }
      : () => {
          session.decision = SKIPPED;
        };
  }

  /** `then` is read once, and the first completion wins. */
  #requestVerdict(
    session: Session<State, Verdict>,
    invoke: (signal: AbortSignal) => Verdict | PromiseLike<Verdict>,
  ): void {
    const aborter = new AbortController();
    let done = false;

    const complete = (faulted: boolean, value: unknown): void => {
      if (done) {
        return;
      }

      done = true;
      session.verdictAborter = null;

      // Behind a decision or past its session, a completion reaches nothing.
      if (this.#session !== session || session.decision) {
        return;
      }

      if (!faulted) {
        session.decision = { type: 'verdict', value: value as Verdict };
        this.#enter(NOOP, null);
      } else if (this.#running) {
        this.#raise(value);
      } else {
        this.#enter(this.#raise, value);
      }
    };

    session.verdictAborter = aborter;

    let value: Verdict | PromiseLike<Verdict>;

    try {
      value = invoke(aborter.signal);

      const then = (value as Partial<PromiseLike<Verdict>> | null | undefined)
        ?.then;

      if (typeof then === 'function') {
        // Read once and called on its own value, because a thenable's `then`
        // can be an accessor.

        then.call(
          value,
          (settled: unknown) => {
            complete(false, settled);
          },
          (error: unknown) => {
            complete(true, error);
          },
        );
        return;
      }
    } catch (error) {
      complete(true, error);
      return;
    }

    complete(false, value);
  }

  #closeMotion(session: Session<State, Verdict>): void {
    const { pointerId } = session.view;

    session.motion.abort();

    // A release after the pointer is gone would throw, and a capture the
    // platform already ended has nothing to release.
    if (this.#root.hasPointerCapture(pointerId)) {
      this.#root.releasePointerCapture(pointerId);
    }
  }

  /** Total over foreign code: every disposer runs and each throw is reported. */
  #release(session: Session<State, Verdict>, outcome: Outcome | null): void {
    const { disposers, lift } = session;

    session.operation.abort();

    while (disposers.length > 0) {
      this.#dispose(disposers.pop()!, outcome);
    }

    session.lift = null;

    try {
      lift?.release();
    } catch (error) {
      this.#raise(error);
    }
  }

  /**
   * Applies the decision in its fixed order. The terminal is the next step, so a
   * destruction requested by anything here is applied before it.
   */
  #conclude(session: Session<State, Verdict>, outcome: Outcome<Verdict>): void {
    const { view, lift } = session;
    const dropped = session.phase === DROPPING;

    session.phase = CONCLUDED;

    if (!dropped) {
      session.focused = focusedWithin(view.item);
    }

    try {
      this.#closeMotion(session);
    } catch (error) {
      this.#raise(error);
    }

    if (outcome.type === 'canceled') {
      session.verdictAborter?.abort();
    }

    let landing: Landing | null | undefined = null;

    if (session.started) {
      try {
        landing = this.#behavior.settle?.(view, outcome);
      } catch (error) {
        this.#raise(error);
      }
    }

    this.#release(session, outcome);

    try {
      const { focused } = session;

      if (focused?.isConnected) {
        const { activeElement, body } = focused.ownerDocument;

        // Anything else was focused by the user or the consumer since the drop.
        if (!activeElement || activeElement === body) {
          // A command restores with normal scrolling, so that a row moved by
          // keyboard stays visible.
          focused.focus({
            preventScroll: view.pointerId !== COMMAND_POINTER_ID,
          });
        }
      }

      if (landing && lift) {
        this.#cancelLanding = lift.land(landing);
      }
    } catch (error) {
      // A landing that cannot run is skipped. The outcome stands.
      this.#raise(error);
    }

    if (session.started) {
      session.next = () => {
        this.#session = null;
        this.#behavior.end?.(view, outcome);
      };
    } else {
      this.#session = null;
    }
  }

  /** Destruction applied: closed first, then everything released, once. */
  #teardown(): void {
    const session = this.#session;
    const resolveDestroyed = this.#resolveDestroyed!;

    this.#resolveDestroyed = null;
    this.#session = null;
    this.#steps.length = 0;

    if (session) {
      try {
        this.#closeMotion(session);
        session.verdictAborter?.abort();
      } catch (error) {
        this.#raise(error);
      }

      // A session past its decision has already released, with nothing left to
      // run, and only its terminal is removed.
      this.#release(session, null);
    }

    try {
      this.#cancelLanding?.();
    } catch (error) {
      this.#raise(error);
    }

    this.#cancelLanding = null;

    while (this.#disposers.length > 0) {
      this.#dispose(this.#disposers.pop()!, null);
    }

    this.#listeners.abort();
    resolveDestroyed();
  }
}

/**
 * Makes `root` draggable with one behavior. Compose `lift` from
 * `@ydinjs/drag/lift.js` to promote the visual to the top layer. Without it the
 * bundle holds no lift code, and the behavior renders by itself, reading its
 * coordinate basis with `@ydinjs/box-quad` in `activate`.
 *
 * `root` must be connected and must stay in its document while a drag holds
 * pointer capture on it. A press is never prevented, so give the handle
 * `touch-action: none` for touch input and `user-select: none` for text.
 */
export function draggable<State = undefined, Verdict = unknown>(
  root: HTMLElement,
  behavior: LiftedBehavior<State, Verdict>,
): DraggableController<LiftedDrag<State>>;
export function draggable<State = undefined, Verdict = unknown>(
  root: HTMLElement,
  behavior: Behavior<State, Verdict>,
): DraggableController<Drag<State>>;
export function draggable<State, Verdict>(
  root: HTMLElement,
  behavior: AnyBehavior<State, Verdict>,
): DraggableController<never> {
  return new Gesture(root, behavior) as unknown as DraggableController<never>;
}
