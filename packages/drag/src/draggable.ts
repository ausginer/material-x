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
   * runs once. The step receives this `Drag` from the end of activation until the
   * drop or the decision, and `null` otherwise.
   *
   * Acts only while this operation is the controller's current one, so a
   * retained `Drag` never reaches a later operation. Afterwards it does nothing:
   * cleanup after an operation belongs in `use`.
   *
   * Code outside a hook, such as a consumer's method or a frame callback, must
   * write behavior state through this. Foreign code can run during any DOM write
   * the kernel makes, and a direct write would change the running step.
   */
  requestStep(step: (drag: Drag<State> | null) => void): void;
  /** Acts only while this operation is current and undecided. */
  requestCancel(reason?: unknown): void;
}>;

/** The members of `Drag` whose types name `Drag` itself. */
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

type Hooks<Operation, Admitted, Settled, Verdict> = Readonly<{
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
  activate?(drag: Operation): false | undefined;
  /** The consumer's notification. From here `end` is guaranteed. */
  start?(drag: Operation): void;
  move?(drag: Operation): void;
  /** Returns the verdict to wait for, or `null` to skip it. */
  drop?(
    drag: Operation,
  ): ((signal: AbortSignal) => Verdict | PromiseLike<Verdict>) | null;
  /**
   * The outcome is decided and the presentation is still held. Runs only if
   * `start` was reached.
   */
  settle?(drag: Operation, outcome: Outcome<Verdict>): Settled;
  /**
   * Runs after release and after the landing starts, in the same task. A landing
   * does not delay it. Focus returns after it, so a reorder here keeps focus.
   */
  end?(drag: Operation, outcome: Outcome<Verdict>): void;
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

/** How the kernel holds a lift. The lift's code stays in its own module. */
export type LiftHold = Readonly<{
  /** Restores the visual's inline declarations and popover state. */
  release(): void;
  /** Starts the landing, and returns how to cancel it if one runs. */
  land(landing: Landing): (() => void) | null;
}>;

/** The kernel's `Drag`. A lift writes its own members into the same object. */
export type WritableLiftedDrag<State> = {
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
 * Gives focus back to the element focused inside the item at the drop, unless the
 * user or the consumer has focused anything since. A command restores with normal
 * scrolling, so that a row moved by keyboard stays visible.
 */
function restoreFocus(focused: HTMLElement | null, pointerId: number): void {
  if (focused?.isConnected) {
    if (
      !focused.ownerDocument.activeElement ||
      focused.ownerDocument.activeElement === focused.ownerDocument.body
    ) {
      focused.focus({ preventScroll: pointerId !== COMMAND_POINTER_ID });
    }
  }
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

/** Runs one disposer. Whatever it throws, the caller's walk continues. */
function runDisposer(
  dispose: DragDisposer,
  outcome: Outcome | null,
  raise: (error: unknown) => void,
): void {
  try {
    dispose(outcome);
  } catch (error) {
    raise(error);
  }
}

/**
 * One operation, from admission to its release, and every transition it makes.
 * Its absence from the controller's slot means idle, so a late request reaches
 * nothing.
 *
 * The session reads and writes only its own fields. It reaches the controller
 * through the controller's interface, and the controller reaches it through
 * `advance`, `decide`, `stepTarget` and `terminate`. It is its own listener on
 * the window, through `handleEvent`.
 */
class Session<State, Verdict> {
  readonly #gesture: Gesture<State, Verdict>;
  readonly #behavior: AnyBehavior<State, Verdict>;
  readonly #root: HTMLElement;
  readonly #window: Window & typeof globalThis;
  readonly #threshold: number;

  readonly #drag: WritableLiftedDrag<State>;
  readonly #admission: LiftedAdmission<State>;
  /** Pointer samples, closed at the drop or the decision. */
  readonly #motion = new AbortController();
  /** Escape and `drag.signal`, closed when the presentation is released. */
  readonly #operation = new AbortController();
  readonly #disposers: DragDisposer[] = [];
  #phase: typeof PENDING | typeof ACTIVE | typeof DROPPING | typeof CONCLUDED =
    PENDING;
  /** The first cancel, fault or verdict. Whichever arrives first decides. */
  #decision: Outcome<Verdict> | null = null;
  /** The sequence's next step, run unless a request outranks it. */
  #next: (() => void) | null = null;
  /** Aborts the verdict in flight. Never aborted after a completion. */
  #verdictAborter: AbortController | null = null;
  #lift: LiftHold | null = null;
  /** `start` was reached. No start, no settle and no end. */
  #started = false;
  /** The element to give focus back to, recorded at the drop or the decision. */
  #focused: HTMLElement | null = null;
  /** What a disposer added after release receives: `null` after destruction. */
  #releasedWith: Outcome | null = null;

  /** Opens the operation: builds its `Drag` and installs its listeners. */
  constructor(
    gesture: Gesture<State, Verdict>,
    behavior: AnyBehavior<State, Verdict>,
    root: HTMLElement,
    window: Window & typeof globalThis,
    threshold: number,
    admission: LiftedAdmission<State>,
    pointerId: number,
    x: number,
    y: number,
  ) {
    this.#gesture = gesture;
    this.#behavior = behavior;
    this.#root = root;
    this.#window = window;
    this.#threshold = threshold;
    this.#admission = admission;

    const drag: Drag<State> = {
      item: admission.item,
      state: admission.state as State,
      pointerId,
      x,
      y,
      originX: x,
      originY: y,
      signal: this.#operation.signal,
      use: (dispose) => {
        if (this.#operation.signal.aborted) {
          runDisposer(dispose, this.#releasedWith, gesture.raise);
        } else {
          this.#disposers.push(dispose);
        }
      },
      // Steps drain before the pass that requested them ends, and an operation
      // opens only as the first step of a pass, so a step requested while this
      // operation is current never runs under a later one.
      requestStep: (step) => {
        if (gesture.isCurrent(this)) {
          gesture.requestStep(step);
        }
      },
      requestCancel: (reason) => {
        if (gesture.isCurrent(this)) {
          this.#cancel(reason, 'request');
        }
      },
    };

    // A lift fills the rest before `activate`, and only a behavior composed with
    // `lift` can name them.
    this.#drag = drag as unknown as WritableLiftedDrag<State>;

    // On the window in the capture phase, so that no `stopPropagation` in the page
    // hides the operation's input.
    if (pointerId !== COMMAND_POINTER_ID) {
      const options = { capture: true, signal: this.#motion.signal };

      for (const type of [
        'pointerdown',
        'pointermove',
        'pointerup',
        'pointercancel',
        'lostpointercapture',
      ]) {
        window.addEventListener(type, this, options);
      }
    } else {
      // A command is a press and an activation, whose last act names the release.
      this.#next = () => {
        this.#activate();
      };
    }

    window.addEventListener('keydown', this, {
      capture: true,
      signal: this.#operation.signal,
    });
  }

  /**
   * One turn of the reader for this operation: concludes a decision not yet
   * applied, or else takes and runs the next step. Returns whether it did either.
   */
  advance(): boolean {
    if (this.#decision && this.#phase !== CONCLUDED) {
      this.#conclude(this.#decision);
      return true;
    }

    // Taken before it runs, because it may set the next one.
    const next = this.#next;

    if (next) {
      this.#next = null;
      next();
      return true;
    }

    return false;
  }

  /** Records a cancel as the decision, unless one is recorded. Enters no pass. */
  decide(reason: unknown, origin: CancelOrigin): void {
    this.#decision ??= { type: 'canceled', reason, origin };
  }

  /**
   * What a deferred step receives: the `Drag` from the end of activation until
   * the drop or the decision, and `null` otherwise.
   */
  stepTarget(): LiftedDrag<State> | null {
    return this.#phase === ACTIVE && !this.#decision ? this.#drag : null;
  }

  /**
   * Destruction's part, after the controller cleared its slot. A session past its
   * decision has already released, with nothing left to run, and only its
   * terminal is removed.
   */
  terminate(): void {
    try {
      this.#closeMotion();
      this.#verdictAborter?.abort();
    } catch (error) {
      this.#gesture.raise(error);
    }

    this.#release(null);
  }

  /**
   * The window's pointer events while motion is open, and `keydown` while the
   * presentation is held. Motion closes before the controller clears its slot,
   * so a pointer event here always belongs to the current operation.
   */
  handleEvent(event: Event): void {
    if (event.type === 'keydown') {
      // An `Escape` that decides a started operation is consumed, so the
      // platform's close request doesn't also close the dialog or popover
      // holding the list. It still propagates.
      if (
        (event as KeyboardEvent).key === 'Escape' &&
        this.#gesture.isCurrent(this)
      ) {
        if (this.#started && !this.#decision) {
          event.preventDefault();
        }

        this.#cancel(undefined, 'escape');
      }

      return;
    }

    const pointer = event as PointerEvent;

    // A primary press while one is pending means its release was missed. Whatever
    // the pointer, the pending press ends, and the root may admit the new one.
    if (pointer.type === 'pointerdown') {
      if (
        this.#phase === PENDING &&
        pointer.isPrimary &&
        pointer.button === 0
      ) {
        this.#gesture.enter(this.#endPending, null);
      }

      return;
    }

    if (pointer.pointerId !== this.#drag.pointerId) {
      return;
    }

    if (pointer.type === 'pointermove') {
      this.#gesture.enter(this.#move, pointer);
    } else if (pointer.type === 'pointerup') {
      this.#gesture.enter(this.#up, pointer);
    } else if (
      pointer.type === 'pointercancel' ||
      // Taking a touch's implicit capture from the pressed element also fires
      // this event, and it bubbles here. The root then holds the capture.
      !this.#root.hasPointerCapture(pointer.pointerId)
    ) {
      this.#cancel(undefined, 'interrupted');
    }
  }

  #cancel(reason: unknown, origin: CancelOrigin): void {
    this.decide(reason, origin);
    this.#gesture.enter(NOOP, null);
  }

  readonly #move = (event: PointerEvent): void => {
    // A press never activates without the button that admitted it. A release the
    // window never saw, such as one outside it, leaves samples with no button.
    // oxlint-disable-next-line no-bitwise -- `buttons` is a bitfield
    if (this.#phase === PENDING && (event.buttons & 1) === 0) {
      this.#endPending();
      return;
    }

    this.#drag.x = event.clientX;
    this.#drag.y = event.clientY;

    if (this.#phase === ACTIVE) {
      this.#behavior.move?.(this.#drag);
      return;
    }

    const dx = this.#drag.x - this.#drag.originX;
    const dy = this.#drag.y - this.#drag.originY;

    if (
      this.#phase === PENDING &&
      dx * dx + dy * dy >= this.#threshold * this.#threshold
    ) {
      event.preventDefault();
      this.#window.getSelection()?.removeAllRanges();
      armClickGuard(this.#window, this.#drag.pointerId);
      this.#activate();
    }
  };

  /** A press that never activated ends quietly: no hook, no report. */
  readonly #endPending = (): void => {
    this.#motion.abort();
    this.#operation.abort();
    this.#gesture.detach();
  };

  readonly #up = (event: PointerEvent): void => {
    if (this.#phase === PENDING) {
      this.#endPending();
      return;
    }

    this.#drag.x = event.clientX;
    this.#drag.y = event.clientY;
    this.#drop();
  };

  #activate(): void {
    // The consumer removed the item during the press, so there is nothing to
    // drag. This is not a fault, and a lift could not measure it.
    if (!this.#drag.item.isConnected) {
      this.#decision ??= SKIPPED;
      return;
    }

    const cancelLanding = this.#gesture.takeLanding();

    // The lift measures the visual with a running flight's offset, so a grab
    // during a landing keeps the visual under the pointer. The flight is then
    // cancelled, before the first lifted frame.
    try {
      if (this.#behavior.lift) {
        this.#lift = this.#behavior.lift(
          this.#drag,
          this.#admission,
          this.#window,
          this.#gesture.raise,
        );
      }
    } finally {
      cancelLanding?.();
    }

    if (this.#drag.pointerId !== COMMAND_POINTER_ID) {
      this.#root.setPointerCapture(this.#drag.pointerId);
    }

    if (this.#behavior.activate?.(this.#drag) === false) {
      this.#decision ??= SKIPPED;
      return;
    }

    this.#started = true;
    this.#behavior.start?.(this.#drag);
    this.#phase = ACTIVE;

    // A pointerless operation has no `pointerup`, so the sequence produces its
    // own release, after anything the hooks above requested.
    if (this.#drag.pointerId === COMMAND_POINTER_ID) {
      this.#next = () => {
        this.#drop();
      };
    }
  }

  #drop(): void {
    this.#phase = DROPPING;
    this.#closeMotion();
    this.#focused = focusedWithin(this.#drag.item);

    const invoke = this.#behavior.drop?.(this.#drag);

    this.#next = invoke
      ? () => {
          this.#requestVerdict(invoke);
        }
      : () => {
          this.#decision = SKIPPED;
        };
  }

  /** `then` is read once, and the first completion wins. */
  #requestVerdict(
    invoke: (signal: AbortSignal) => Verdict | PromiseLike<Verdict>,
  ): void {
    const aborter = new AbortController();
    let done = false;

    const complete = (faulted: boolean, value: unknown): void => {
      if (done) {
        return;
      }

      done = true;
      this.#verdictAborter = null;

      // Behind a decision or past its session, a completion reaches nothing.
      if (!this.#gesture.isCurrent(this) || this.#decision) {
        return;
      }

      if (!faulted) {
        // Inside a pass the gate refuses, and that pass's reader applies it.
        this.#decision = { type: 'verdict', value: value as Verdict };
        this.#gesture.enter(NOOP, null);
      } else {
        this.#gesture.raiseInPass(value);
      }
    };

    this.#verdictAborter = aborter;

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

  #closeMotion(): void {
    this.#motion.abort();

    // A release after the pointer is gone would throw, and a capture the
    // platform already ended has nothing to release.
    if (this.#root.hasPointerCapture(this.#drag.pointerId)) {
      this.#root.releasePointerCapture(this.#drag.pointerId);
    }
  }

  /**
   * Total over foreign code: every disposer runs and each throw is reported. Runs
   * once: a destruction after the decision finds the operation released.
   */
  #release(outcome: Outcome | null): void {
    if (this.#operation.signal.aborted) {
      return;
    }

    this.#releasedWith = outcome;
    this.#operation.abort();

    while (this.#disposers.length > 0) {
      runDisposer(this.#disposers.pop()!, outcome, this.#gesture.raise);
    }

    // Taken before it is cleared, so a lift is released once.
    const lift = this.#lift;

    this.#lift = null;

    try {
      lift?.release();
    } catch (error) {
      this.#gesture.raise(error);
    }
  }

  /**
   * Applies the decision in its fixed order. The terminal is the next step, so a
   * destruction requested by anything here is applied before it.
   */
  #conclude(outcome: Outcome<Verdict>): void {
    // Taken before `#release` clears it.
    const lift = this.#lift;
    const dropped = this.#phase === DROPPING;

    this.#phase = CONCLUDED;

    if (!dropped) {
      this.#focused = focusedWithin(this.#drag.item);
    }

    try {
      this.#closeMotion();
    } catch (error) {
      this.#gesture.raise(error);
    }

    if (outcome.type === 'canceled') {
      this.#verdictAborter?.abort();
    }

    let landing: Landing | null | undefined = null;

    if (this.#started) {
      try {
        landing = this.#behavior.settle?.(this.#drag, outcome);
      } catch (error) {
        this.#gesture.raise(error);
      }
    }

    this.#release(outcome);

    if (landing && lift) {
      try {
        this.#gesture.keepLanding(lift.land(landing));
      } catch (error) {
        // A landing that cannot run is skipped. The outcome stands.
        this.#gesture.raise(error);
      }
    }

    // `end` may reorder, and a reorder sends focus to `body`, so focus returns
    // after it, in the same step, whether it returns or throws.
    if (this.#started) {
      this.#next = () => {
        this.#gesture.detach();

        try {
          this.#behavior.end?.(this.#drag, outcome);
        } finally {
          restoreFocus(this.#focused, this.#drag.pointerId);
        }
      };
    } else {
      this.#gesture.detach();
      restoreFocus(this.#focused, this.#drag.pointerId);
    }
  }
}

/**
 * What exists across operations or with no operation: the root's listeners,
 * admission, the gate, the deferred steps, destruction, the reader, the slot that
 * holds the current session, and the landing. Its members without `#` are the
 * session's way in and the public methods; `draggable` hands out only the latter.
 */
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

  isCurrent(session: Session<State, Verdict>): boolean {
    return this.#session === session;
  }

  /** Clears the slot. The session calls it when its operation ends. */
  detach(): void {
    this.#session = null;
  }

  /** Takes the running landing, so the activation that called it cancels it. */
  takeLanding(): (() => void) | null {
    const cancelLanding = this.#cancelLanding;

    this.#cancelLanding = null;
    return cancelLanding;
  }

  /** Keeps a started landing, for the next activation or destruction to cancel. */
  keepLanding(cancelLanding: (() => void) | null): void {
    this.#cancelLanding = cancelLanding;
  }

  readonly requestStep = (
    step: (drag: LiftedDrag<State> | null) => void,
  ): void => {
    if (this.#destroyed) {
      return;
    }

    if (!this.#running) {
      this.enter(this.#runStep, step);
    } else if (!this.#steps.includes(step)) {
      this.#steps.push(step);
    }
  };

  readonly #runStep = (
    step: (drag: LiftedDrag<State> | null) => void,
  ): void => {
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
      runDisposer(dispose, null, this.raise);
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
        this.#open(admission, event.pointerId, event.clientX, event.clientY);
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
      this.#open(admission, COMMAND_POINTER_ID, 0, 0);
    }
  };

  #open(
    admission: LiftedAdmission<State>,
    pointerId: number,
    x: number,
    y: number,
  ): void {
    this.#session = new Session(
      this,
      this.#behavior,
      this.#root,
      this.#window,
      this.#threshold,
      admission,
      pointerId,
      x,
      y,
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

    try {
      this.#cancelLanding?.();
    } catch (error) {
      this.raise(error);
    }

    this.#cancelLanding = null;

    while (this.#disposers.length > 0) {
      runDisposer(this.#disposers.pop()!, null, this.raise);
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
 * `touch-action: none` for touch input, `user-select: none` for text, and
 * `draggable="false"` on a natively draggable element such as a link or an image.
 *
 * The kernel calls each hook as a method of `behavior`, read when it is called,
 * so a behavior may be a class instance. An event one controller admitted is
 * offered to no other, so nested roots need no marking. An `Escape` that cancels
 * a started operation has its default prevented.
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
  const gesture = new Gesture(root, behavior);
  // Not the instance, so the session's way into it stays inside this module.
  const controller: DraggableController<LiftedDrag<State>> = {
    requestStep: gesture.requestStep,
    requestCancel: gesture.requestCancel,
    requestDestroy: gesture.requestDestroy,
    use: gesture.use,
  };

  return controller as DraggableController<never>;
}
