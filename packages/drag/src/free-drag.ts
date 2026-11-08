/**
 * Free drag, written on the public `draggable` with no private path. A drop asks the
 * consumer: `accept` keeps the element wherever the consumer put it, and `reject`
 * sends it home.
 */
import {
  draggable,
  type Admission,
  type Behavior,
  type BehaviorOperation,
  type Drag,
  type Outcome,
} from './draggable.ts';
import type { BoundsInstaller, MotionConstraint } from './free-drag/bounds.ts';
import {
  ACCEPTED,
  type DragAxis,
  type DragGeometry,
  type FreeDragAcceptedResult,
  type FreeDragCanceledResult,
  type FreeDragRejectedResult,
  type FreeDragRequest,
  FreeDragResolution,
  type FreeDragResult,
  type OnDrop,
  type Point,
  type RejectedResolution,
  type ResolveHome,
} from './free-drag/domain.ts';
import { buildGeometry, buildRequest } from './free-drag/geometry.ts';
import { Lifter, type Lift } from './lift.ts';
import { listenForInvalidation } from './shared/invalidation.ts';
import type { LandingTiming } from './shared/landing.ts';

export { FreeDragResolution };
export type {
  DragGeometry,
  FreeDragAcceptedResult,
  FreeDragCanceledResult,
  FreeDragRejectedResult,
  FreeDragRequest,
  FreeDragResult,
  OnDrop,
  Point,
};

export type FreeDragConfig = Readonly<{
  /**
   * Decides the drop: accept to keep the visual where it was dropped, reject to
   * send it home. Commit an accepted position in `onEnd`, after the lift has
   * released the visual's inline styles. A position written here is restored
   * away at release.
   */
  onDrop: OnDrop;
  onStart?(geometry: DragGeometry): void;
  onMove?(geometry: DragGeometry): void;
  onEnd?(result: FreeDragResult): void;
  threshold?: number;
  axis?: DragAxis;
  handle?(root: HTMLElement): HTMLElement | null;
  /** The node that is lifted. Defaults to the root. */
  visual?(root: HTMLElement): HTMLElement;
  home?: ResolveHome;
  bounds?: BoundsInstaller;
  landing?: LandingTiming;
}>;

export type FreeDragController = Readonly<{
  /** The bounds are stale: re-read them on the next sample. */
  invalidate(): void;
  /** Places the visual at a viewport point and keeps following the pointer. */
  moveTo(point: Point): void;
  requestCancel(reason?: unknown): void;
  requestDestroy(): Promise<void>;
}>;

/**
 * One activated free drag, from `start` to `end`. The kernel calls each hook as a
 * method of this instance.
 */
class FreeDragOperation implements BehaviorOperation<FreeDragResolution> {
  readonly #behavior: FreeDragBehavior;
  readonly #drag: Drag<FreeDragOperation>;
  readonly #lift: Lift;
  /** The visual's viewport delta, axis-projected and clamped. */
  readonly #motion = { x: 0, y: 0 };
  #offsetX = 0;
  #offsetY = 0;
  /** `null` until the drop: a cancel before it has none. */
  #request: FreeDragRequest | null = null;
  /** Recorded at `settle` and reported at `end`. */
  #result: FreeDragResult | null = null;

  constructor(
    behavior: FreeDragBehavior,
    drag: Drag<FreeDragOperation>,
    lift: Lift,
  ) {
    this.#behavior = behavior;
    this.#drag = drag;
    this.#lift = lift;
  }

  /** Computes the motion and moves the visual by it. */
  translate(): void {
    this.#computeMotion();
    this.#lift.translate(this.#motion.x, this.#motion.y);
  }

  /** Places the visual at a viewport point and keeps following the pointer. */
  moveTo(point: Point): void {
    this.#offsetX =
      point.x - this.#lift.rect.left - (this.#drag.x - this.#drag.originX);
    this.#offsetY =
      point.y - this.#lift.rect.top - (this.#drag.y - this.#drag.originY);
    this.translate();
  }

  start(): void {
    this.#behavior.config.onStart?.(this.#geometry());
  }

  move(): void {
    this.translate();

    if (this.#behavior.config.onMove) {
      this.#behavior.config.onMove(this.#geometry());
    }
  }

  drop() {
    this.#computeMotion();

    const request = buildRequest(
      this.#behavior.root,
      this.#drag,
      this.#lift,
      this.#motion,
      this.#home(),
      this.#behavior.window,
    );

    this.#request = request;
    this.#lift.translate(this.#motion.x, this.#motion.y);

    return (signal: AbortSignal) =>
      this.#behavior.config.onDrop(request, { signal });
  }

  settle(outcome: Outcome<FreeDragResolution>): void {
    let home = true;

    if (outcome.type === 'canceled') {
      this.#result = {
        type: 'canceled',
        request: this.#request,
        reason: outcome.reason,
        origin: outcome.origin,
      };
      home = outcome.origin !== 'fault';
    } else if (outcome.type === 'verdict' && outcome.value !== ACCEPTED) {
      this.#result = {
        type: 'rejected',
        request: this.#request!,
        reason: (outcome.value as RejectedResolution)[0],
      };
    } else {
      this.#result = { type: 'accepted', request: this.#request! };
      home = false;
    }

    if (!this.#behavior.landing || !home) {
      return;
    }

    const { x, y } = this.#home();

    this.#lift.land(x, y, this.#behavior.landing);
  }

  end(): void {
    this.#behavior.config.onEnd?.(this.#result!);
  }

  /** Writes the delta the pointer and the operation's offset give into `#motion`. */
  #computeMotion(): void {
    this.#motion.x = this.#drag.x - this.#drag.originX + this.#offsetX;
    this.#motion.y = this.#drag.y - this.#drag.originY + this.#offsetY;

    if (this.#behavior.axis === 'x') {
      this.#motion.y = 0;
    } else if (this.#behavior.axis === 'y') {
      this.#motion.x = 0;
    }

    this.#behavior.bounds?.apply(this.#motion, this.#lift.rect);
  }

  #geometry(): DragGeometry {
    return buildGeometry(
      this.#drag,
      this.#lift,
      this.#motion,
      this.#behavior.window,
    );
  }

  /** `config.home()` now, or the visual's rect at the grab without it. */
  #home(): Point {
    return this.#behavior.config.home
      ? this.#behavior.config.home({
          item: this.#behavior.root,
          visual: this.#lift.visual,
        })
      : { x: this.#lift.rect.left, y: this.#lift.rect.top };
  }
}

/**
 * The behavior `draggable` runs for one root: admission and activation. It holds
 * only controller-lifetime values, which the operation reads through it.
 */
class FreeDragBehavior implements Behavior<
  HTMLElement,
  FreeDragResolution,
  FreeDragOperation
> {
  readonly threshold?: number;
  readonly root: HTMLElement;
  readonly config: FreeDragConfig;
  readonly window: Window & typeof globalThis;
  readonly axis: DragAxis;
  readonly bounds: MotionConstraint | null;
  readonly landing: LandingTiming | null;
  readonly #lifter: Lifter;

  constructor(root: HTMLElement, config: FreeDragConfig, lifter: Lifter) {
    this.threshold = config.threshold;
    this.root = root;
    this.config = config;
    this.window = root.ownerDocument.defaultView!;
    this.#lifter = lifter;
    this.axis = config.axis ?? 'both';
    this.bounds = config.bounds?.(this.window) ?? null;
    this.landing = config.landing ?? null;
  }

  /** Step and invalidation listener: the bounds are re-read on the next sample. */
  invalidate = (): void => {
    this.bounds?.invalidate();
  };

  /** The admission's `state` is the visual: `config.visual`, or the root. */
  admit(event: PointerEvent): Admission<HTMLElement> | null {
    if (event.altKey) {
      return null;
    }

    let handle: HTMLElement | undefined;

    if (this.config.handle) {
      const named = this.config.handle(this.root);

      if (!named || !event.composedPath().includes(named)) {
        return null;
      }

      handle = named;
    }

    return {
      item: this.root,
      ...(handle ? { handle } : {}),
      state: this.config.visual ? this.config.visual(this.root) : this.root,
    };
  }

  activate(
    drag: Drag<FreeDragOperation>,
    visual: HTMLElement,
  ): FreeDragOperation {
    // First, so that its release is the operation's first disposer and runs last.
    const lift = this.#lifter.acquire(drag, visual);

    if (this.bounds) {
      listenForInvalidation(this.window, drag.signal, this.invalidate);
    }

    const operation = new FreeDragOperation(this, drag, lift);

    operation.translate();
    return operation;
  }
}

/** Makes `root` draggable anywhere. */
export function freeDrag(
  root: HTMLElement,
  config: FreeDragConfig,
): FreeDragController {
  const lifter = new Lifter(root.ownerDocument.defaultView!);
  const behavior = new FreeDragBehavior(root, config, lifter);
  const kernel = draggable(root, behavior);

  kernel.use(lifter.cancelLanding);

  return {
    invalidate: () => kernel.requestStep(behavior.invalidate),
    moveTo: (point) =>
      // One step per call: it carries the point, and DRI-8 keeps calls in order.
      kernel.requestStep((operation) => {
        operation?.moveTo(point);
      }),
    requestCancel: (reason) => kernel.requestCancel(reason),
    requestDestroy: () => kernel.requestDestroy(),
  };
}
