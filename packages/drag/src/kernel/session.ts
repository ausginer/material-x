import type { Writable } from 'type-fest';
import type { Landing, LiftHold } from '../lift.ts';
import { deepActiveElement } from '../shared/focus.ts';
import type { LiftedAdmission } from './admission.ts';
import type { AnyBehavior } from './behavior.ts';
import {
  runDragDisposer,
  type Drag,
  type DragDisposer,
  type LiftedDrag,
} from './drag.ts';
import type { Gesture } from './gesture.ts';
import type { CancelOrigin, Outcome, SkippedOutcome } from './outcome.ts';

const COMMAND_POINTER_ID = -1;

const PENDING = 1;
const ACTIVE = 2;
const DROPPING = 3;
const CONCLUDED = 4;

const SKIPPED: SkippedOutcome = { type: 'skipped' };

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

const NOOP = (): void => {};

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
export class Session<State, Verdict> {
  readonly #gesture: Gesture<State, Verdict>;
  readonly #behavior: AnyBehavior<State, Verdict>;
  readonly #root: HTMLElement;
  readonly #window: Window & typeof globalThis;
  readonly #threshold: number;

  readonly #drag: Writable<LiftedDrag<State>>;
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
    x: number,
    y: number,
    pointerId: number = COMMAND_POINTER_ID,
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
          runDragDisposer(dispose, this.#releasedWith, gesture.raise);
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

    this.#drag = drag as unknown as Writable<LiftedDrag<State>>;

    // A lift fills the rest before `activate`, and only a behavior composed with
    // `lift` can name them.

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
      runDragDisposer(this.#disposers.pop()!, outcome, this.#gesture.raise);
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
