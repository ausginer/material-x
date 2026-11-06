/**
 * The public authoring API and the single-pass kernel behind it.
 *
 * The library runs only inside a pass: one synchronous run from a native event,
 * a frame, a settled verdict or an idle request. Passes do not nest. A pass is a
 * sequence of steps. Foreign code reached during a step can only fill a request
 * slot, and `#applyRequests` is the one reader of the slots, between steps.
 *
 * A behavior receives `Drag`, a view with no path to the session: the slots, the
 * state and the next step stay in this module.
 */
import {
  acquireLift,
  type InheritedSpace,
  type Lift,
} from './draggable/presentation.ts';
import { DragFault } from './fault.ts';

export type { InheritedSpace };

export type CancelOrigin = 'request' | 'escape' | 'interrupted' | 'fault';

export type Outcome<Verdict = unknown> =
  /** `drop` returned nothing to ask, or the behavior has no `drop`. */
  | Readonly<{ type: 'skipped' }>
  | Readonly<{ type: 'verdict'; value: Verdict }>
  /** A fault decides as `origin: 'fault'`, with the reported `DragFault`. */
  | Readonly<{ type: 'canceled'; reason: unknown; origin: CancelOrigin }>;

/** What `admit` and `command` name. Everything but `item` is optional. */
export type Admission<State> = Readonly<{
  item: HTMLElement;
  /** The element lifted and translated. Defaults to `item`. */
  visual?: HTMLElement;
  /** The element whose offset size `boxWidth`/`boxHeight` report. */
  box?: HTMLElement;
  /**
   * Where the press must land. A hop before it marked `data-drag-ignore` owns
   * its own interaction and refuses the admission. Defaults to `item`.
   */
  handle?: HTMLElement;
  state?: State;
}>;

/** Viewport position for the visual's top-left, and the animation's timing. */
export type Landing = Readonly<{
  x: number;
  y: number;
  duration?: number;
  easing?: string;
}>;

/**
 * One operation, as a behavior sees it. The coordinates change between hooks, so
 * read them when needed. The fields from `rect` to `itemSpace` are filled when
 * lifted, before `activate`.
 */
export type Drag<State = undefined> = Readonly<{
  item: HTMLElement;
  visual: HTMLElement;
  box: HTMLElement;
  /** The behavior's own value from admission. */
  state: State;
  /** `-1` for an operation `command` admitted, which has no pointer. */
  pointerId: number;
  x: number;
  y: number;
  originX: number;
  originY: number;
  /** The visual's rect at the grab. */
  rect: DOMRectReadOnly;
  boxWidth: number;
  boxHeight: number;
  visualSpace: InheritedSpace;
  itemSpace: InheritedSpace;
  /** The viewport delta last translated to. */
  translatedX: number;
  translatedY: number;
  /** Aborts when the operation releases its presentation. */
  signal: AbortSignal;
  /** Moves the lifted visual by a viewport delta. Only when lifted. */
  translate(x: number, y: number): void;
  /**
   * Cleanup, last in first out, when the operation releases its presentation:
   * after `settle`, before the landing and `end`. It also runs on destruction,
   * where `settle` and `end` do not.
   */
  use(dispose: () => void): void;
}>;

export type Behavior<State = undefined, Verdict = unknown> = Readonly<{
  /** Pointer travel that activates, in viewport pixels. */
  threshold?: number;
  /** `false`: no top layer and no measurement, the behavior renders. */
  lift?: boolean;
  /** A primary press on the root. Return `null` to decline. */
  admit(event: PointerEvent): Admission<State> | null;
  /**
   * A key on the root. An admission runs one complete operation with no pointer:
   * activate, start, drop, settle and end. The key's default is then prevented.
   */
  command?(event: KeyboardEvent): Admission<State> | null;
  /** Everything that can fail. A throw means no `start` and no `end`. */
  activate?(drag: Drag<State>): void;
  /** The consumer's notification, last. From here `end` is guaranteed. */
  start?(drag: Drag<State>): void;
  move?(drag: Drag<State>): void;
  /** Returns the verdict to wait for, or `null` to skip it. */
  drop?(
    drag: Drag<State>,
  ): ((signal: AbortSignal) => Verdict | PromiseLike<Verdict>) | null;
  /**
   * The outcome is decided and the presentation is still held. Runs only if
   * `start` was reached. Return where a lifted visual lands, or `null`.
   */
  settle?(drag: Drag<State>, outcome: Outcome<Verdict>): Landing | null;
  end?(drag: Drag<State>, outcome: Outcome<Verdict>): void;
  /**
   * Runs between steps after `requestApply`, or at once when idle. A method
   * reachable from foreign code defers its writes to behavior state through
   * this.
   */
  apply?(drag: Drag<State> | null): void;
}>;

export type DraggableController<State = undefined> = Readonly<{
  /**
   * Runs `step` as a pass, from the behavior's own frame or listener. Refused
   * when a pass is already running, so foreign code uses `requestApply` instead.
   */
  run(step: (drag: Drag<State> | null) => void): void;
  requestApply(): void;
  /** The first decision wins. Nothing happens on an idle controller. */
  requestCancel(reason?: unknown): void;
  /** Every call returns one promise, settled after teardown. */
  requestDestroy(): Promise<void>;
  /** Controller-lifetime cleanup: runs on destruction, last in first out. */
  use(dispose: () => void): void;
}>;

const PENDING = 1;
const ACTIVE = 2;
const RELEASING = 3;

const DEFAULT_THRESHOLD = 8;
const DEFAULT_LANDING_DURATION = 200;
const DEFAULT_LANDING_EASING = 'ease';

const NOOP = (): void => {};

type WritableDrag<State> = {
  -readonly [K in keyof Drag<State>]: Drag<State>[K];
};

/** One operation. Its absence means idle, so a late request has nothing to reach. */
type Session<State, Verdict> = {
  readonly view: WritableDrag<State>;
  /** Pointer samples, closed at release. */
  readonly motion: AbortController;
  /** Escape and `drag.signal`, closed when the presentation is released. */
  readonly operation: AbortController;
  readonly disposers: Array<() => void>;
  state: typeof PENDING | typeof ACTIVE | typeof RELEASING;
  /** The first cancel, fault or verdict. Whichever arrives first decides. */
  decision: Outcome<Verdict> | null;
  /** The sequence's next step, run unless a request outranks it. */
  next: (() => void) | null;
  /** The in-flight verdict's aborter, which never fires on a completed one. */
  aborter: AbortController | null;
  lift: Lift | null;
  captured: boolean;
  /** `start` was reached. No start, no settle and no end. */
  started: boolean;
  /** The decision has been applied. */
  concluded: boolean;
  /** The disposers have run, so a late `use` runs at once. */
  released: boolean;
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

    if ((hop as Element).matches?.('[data-drag-ignore]')) {
      return true;
    }
  }

  return false;
}

class Gesture<State, Verdict> implements DraggableController<State> {
  readonly #root: HTMLElement;
  readonly #behavior: Behavior<State, Verdict>;
  readonly #window: Window & typeof globalThis;
  readonly #lifted: boolean;
  readonly #threshold: number;

  #session: Session<State, Verdict> | null = null;
  #running = false;
  #closed = false;

  /* The controller-scope request slots. */
  #destroyRequested = false;
  #applyRequested = false;

  #destroyed: Promise<void> | null = null;
  #resolveDestroyed: (() => void) | null = null;

  #landing: Animation | null = null;
  readonly #uses: Array<() => void> = [];
  readonly #listeners = new AbortController();

  constructor(root: HTMLElement, behavior: Behavior<State, Verdict>) {
    this.#root = root;
    this.#behavior = behavior;
    this.#window = root.ownerDocument.defaultView!;
    this.#lifted = behavior.lift ?? true;
    this.#threshold = behavior.threshold ?? DEFAULT_THRESHOLD;

    const { signal } = this.#listeners;

    root.addEventListener('pointerdown', this.#onPress, { signal });

    if (behavior.command) {
      root.addEventListener('keydown', this.#onCommand, { signal });
    }
  }

  /* -------- the pass -------- */

  /**
   * The one entry into library work. `step` is a stable function, so a pointer
   * sample allocates nothing here.
   */
  #enter<A>(step: (argument: A) => void, argument: A): void {
    if (this.#running || this.#closed) {
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
   * destruction, deferred behavior work, the decision, the sequence's next step.
   * A request made by anything run here is seen on the next turn.
   */
  #applyRequests(): void {
    for (;;) {
      const session = this.#session;

      try {
        if (this.#destroyRequested) {
          this.#teardown();
          return;
        }

        if (this.#applyRequested) {
          this.#applyRequested = false;
          this.#behavior.apply?.(session ? session.view : null);
        } else if (session?.decision && !session.concluded) {
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
    const session = this.#session;

    if (session) {
      session.decision ??= {
        type: 'canceled',
        reason: fault,
        origin: 'fault',
      };
    }

    reportError(fault);
  };

  /* -------- requests -------- */

  run(step: (drag: Drag<State> | null) => void): void {
    this.#enter(this.#runStep, step);
  }

  readonly #runStep = (step: (drag: Drag<State> | null) => void): void => {
    step(this.#session ? this.#session.view : null);
  };

  requestApply(): void {
    this.#applyRequested = true;
    this.#enter(NOOP, null);
  }

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
    this.#destroyed ??= new Promise((resolve) => {
      this.#resolveDestroyed = resolve;
    });

    if (!this.#closed && !this.#destroyRequested) {
      this.#destroyRequested = true;

      if (!this.#running) {
        this.#teardown();
      }
    }

    return this.#destroyed;
  }

  use(dispose: () => void): void {
    this.#uses.push(dispose);
  }

  /* -------- admission -------- */

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

      const session = this.#open(admitted, -1, 0, 0);

      session.next = () => {
        this.#activate(session);
      };
    }
  };

  #open(
    admitted: Admission<State>,
    pointerId: number,
    x: number,
    y: number,
  ): Session<State, Verdict> {
    const { item, visual = item } = admitted;
    const motion = new AbortController();
    const operation = new AbortController();
    const view: WritableDrag<State> = {
      item,
      visual,
      box: admitted.box ?? visual,
      state: admitted.state as State,
      pointerId,
      x,
      y,
      originX: x,
      originY: y,
      rect: null as unknown as DOMRectReadOnly,
      boxWidth: 0,
      boxHeight: 0,
      visualSpace: null,
      itemSpace: null,
      translatedX: 0,
      translatedY: 0,
      signal: operation.signal,
      translate(toX, toY) {
        session.lift!.write(toX, toY);
        view.translatedX = toX;
        view.translatedY = toY;
      },
      use(dispose) {
        if (session.released) {
          dispose();
        } else {
          session.disposers.push(dispose);
        }
      },
    };
    const session: Session<State, Verdict> = {
      view,
      motion,
      operation,
      disposers: [],
      state: PENDING,
      decision: null,
      next: null,
      aborter: null,
      lift: null,
      captured: false,
      started: false,
      concluded: false,
      released: false,
    };
    const { document } = this.#window;

    if (pointerId !== -1) {
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

    document.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Escape') {
          this.#cancel(undefined, 'escape');
        }
      },
      { signal: operation.signal },
    );

    this.#session = session;
    return session;
  }

  /* -------- motion -------- */

  readonly #onPointer = (event: PointerEvent): void => {
    if (event.pointerId !== this.#session?.view.pointerId) {
      return;
    }

    if (event.type === 'pointermove') {
      this.#enter(this.#move, event);
    } else if (event.type === 'pointerup') {
      this.#enter(this.#up, event);
    } else {
      // `pointercancel` and `lostpointercapture`: one fact, two spellings.
      this.#cancel(undefined, 'interrupted');
    }
  };

  readonly #move = (event: PointerEvent): void => {
    const session = this.#session!;
    const { view } = session;

    view.x = event.clientX;
    view.y = event.clientY;

    if (session.state === ACTIVE) {
      this.#behavior.move?.(view);
      return;
    }

    const dx = view.x - view.originX;
    const dy = view.y - view.originY;

    if (
      session.state === PENDING &&
      dx * dx + dy * dy >= this.#threshold * this.#threshold
    ) {
      event.preventDefault();
      this.#window.getSelection()?.removeAllRanges();
      this.#armClickGuard(view.pointerId);
      this.#activate(session);
    }
  };

  readonly #up = (event: PointerEvent): void => {
    const session = this.#session!;

    if (session.state === PENDING) {
      this.#closeMotion(session);
      this.#release(session);
      this.#session = null;
      return;
    }

    session.view.x = event.clientX;
    session.view.y = event.clientY;
    this.#drop(session);
  };

  /**
   * An activated drag swallows its own trailing click, and only that. The guard
   * outlives its session, because a cancel can arrive with the button held, so
   * it keeps its own pointer identity and expires in the task after that
   * pointer's release: the platform dispatches the click in the release's task.
   */
  #armClickGuard(pointerId: number): void {
    const guard = new AbortController();
    const signal = AbortSignal.any([guard.signal, this.#listeners.signal]);
    const options = { capture: true, signal };
    const target = this.#window;

    target.addEventListener(
      'pointerup',
      (event) => {
        if (event.pointerId === pointerId) {
          setTimeout(() => {
            guard.abort();
          });
        }
      },
      options,
    );
    target.addEventListener(
      'pointercancel',
      (event) => {
        if (event.pointerId === pointerId) {
          guard.abort();
        }
      },
      options,
    );
    target.addEventListener(
      'click',
      (event) => {
        // WebKit's click is a `MouseEvent` with no `pointerId`.
        if ((event.pointerId ?? pointerId) === pointerId) {
          guard.abort();
          event.preventDefault();
          event.stopPropagation();
        }
      },
      options,
    );
  }

  /* -------- activation -------- */

  #activate(session: Session<State, Verdict>): void {
    const { view } = session;

    this.#landing?.cancel();
    this.#landing = null;

    if (this.#lifted) {
      const { visual, box, item } = view;

      view.rect = visual.getBoundingClientRect();
      view.boxWidth = box.offsetWidth;
      view.boxHeight = box.offsetHeight;
      session.lift = acquireLift(visual, item, this.#window, this.#raise);
      view.visualSpace = session.lift.visualSpace;
      view.itemSpace = session.lift.itemSpace;
    }

    if (view.pointerId !== -1) {
      this.#root.setPointerCapture(view.pointerId);
      session.captured = true;
    }

    this.#behavior.activate?.(view);
    session.started = true;
    this.#behavior.start?.(view);
    session.state = ACTIVE;

    // A pointerless operation has no `pointerup`, so the sequence produces its
    // own release, after anything the hooks above requested.
    if (view.pointerId === -1) {
      session.next = () => {
        this.#drop(session);
      };
    }
  }

  /* -------- the drop -------- */

  #drop(session: Session<State, Verdict>): void {
    session.state = RELEASING;
    this.#closeMotion(session);

    const invoke = this.#behavior.drop?.(session.view);

    session.next = invoke
      ? () => {
          this.#roundTrip(session, invoke);
        }
      : () => {
          session.decision = { type: 'skipped' };
        };
  }

  /** The verdict. `then` is read once, and the first completion wins. */
  #roundTrip(
    session: Session<State, Verdict>,
    invoke: (signal: AbortSignal) => Verdict | PromiseLike<Verdict>,
  ): void {
    const aborter = new AbortController();
    let done = false;

    const complete = (fault: boolean, value: unknown): void => {
      if (done) {
        return;
      }

      done = true;
      session.aborter = null;

      // Behind a decision or past its session, a completion reaches nothing.
      if (this.#session !== session || session.decision) {
        return;
      }

      if (!fault) {
        session.decision = { type: 'verdict', value: value as Verdict };
        this.#enter(NOOP, null);
      } else if (this.#running) {
        this.#raise(value);
      } else {
        this.#enter(this.#raise, value);
      }
    };

    session.aborter = aborter;

    let value: Verdict | PromiseLike<Verdict>;

    try {
      value = invoke(aborter.signal);

      const then = (value as PromiseLike<Verdict> | null | undefined)?.then;

      if (typeof then === 'function') {
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

  /* -------- the ways an operation ends -------- */

  #closeMotion(session: Session<State, Verdict>): void {
    session.motion.abort();

    if (session.captured) {
      session.captured = false;

      try {
        this.#root.releasePointerCapture(session.view.pointerId);
      } catch {
        // The pointer is gone, which is what releasing asks for.
      }
    }
  }

  /** Total over foreign code: every disposer runs and each throw is reported. */
  #release(session: Session<State, Verdict>): void {
    session.released = true;
    session.operation.abort();

    const { disposers, lift } = session;

    while (disposers.length > 0) {
      try {
        disposers.pop()!();
      } catch (error) {
        this.#raise(error);
      }
    }

    session.lift = null;

    try {
      lift?.dispose();
    } catch (error) {
      this.#raise(error);
    }
  }

  /**
   * Applies the decision: motion closes, the behavior names the landing, the
   * presentation is released, the landing starts. The terminal is the next step,
   * so a destruction requested by anything here is applied before it.
   */
  #conclude(session: Session<State, Verdict>, outcome: Outcome<Verdict>): void {
    const { view } = session;

    session.concluded = true;
    this.#closeMotion(session);

    if (outcome.type === 'canceled') {
      session.aborter?.abort();
    }

    let landing: Landing | null = null;

    if (session.started) {
      try {
        landing = this.#behavior.settle?.(view, outcome) ?? null;
      } catch (error) {
        this.#raise(error);
      }
    }

    const lifted = session.lift !== null;

    this.#release(session);

    if (landing && lifted) {
      this.#startLanding(view, landing);
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

  /** Additive, so it composes with whatever else animates the visual. */
  #startLanding(view: WritableDrag<State>, landing: Landing): void {
    const { rect, visualSpace: space, translatedX, translatedY } = view;
    const dx = translatedX - (landing.x - rect.x);
    const dy = translatedY - (landing.y - rect.y);

    if (dx === 0 && dy === 0) {
      return;
    }

    try {
      this.#landing = view.visual.animate(
        [
          {
            translate: space
              ? `${space.a * dx + space.c * dy}px ${space.b * dx + space.d * dy}px`
              : `${dx}px ${dy}px`,
          },
          { translate: '0 0' },
        ],
        {
          duration: landing.duration ?? DEFAULT_LANDING_DURATION,
          easing: landing.easing ?? DEFAULT_LANDING_EASING,
          composite: 'add',
        },
      );
    } catch (error) {
      // A landing that cannot run is skipped. The outcome stands.
      this.#raise(error);
    }
  }

  /** Destruction applied: closed first, then everything released, once. */
  #teardown(): void {
    const session = this.#session;

    this.#closed = true;
    this.#session = null;

    if (session) {
      this.#closeMotion(session);
      session.aborter?.abort();

      if (!session.released) {
        this.#release(session);
      }
    }

    try {
      this.#landing?.cancel();
    } catch (error) {
      this.#raise(error);
    }

    this.#landing = null;

    const uses = this.#uses;

    while (uses.length > 0) {
      try {
        uses.pop()!();
      } catch (error) {
        this.#raise(error);
      }
    }

    this.#listeners.abort();
    this.#resolveDestroyed?.();
    this.#destroyed ??= Promise.resolve();
  }
}

/** Dev only: how many events a running pass refused, for the focused checks. */
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
 * Makes `root` draggable with one behavior. `sortable` and `freeDrag` are written
 * on this with no private path.
 */
export function draggable<State = undefined, Verdict = unknown>(
  root: HTMLElement,
  behavior: Behavior<State, Verdict>,
): DraggableController<State> {
  return new Gesture(root, behavior);
}
