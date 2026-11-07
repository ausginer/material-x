/**
 * Free drag, written on the public `draggable` with no private path. A drop asks the
 * consumer: `accept` keeps the element wherever the consumer put it, and `reject`
 * sends it home.
 */
import {
  draggable,
  type DraggableController,
  type Landing,
  type LiftedBehavior,
  type LiftedDrag,
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
import { lift } from './lift.ts';
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
  /** Commit the position, then resolve. An accepted drag does not move back. */
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

type State = {
  offsetX: number;
  offsetY: number;
  request: FreeDragRequest | null;
  result: FreeDragResult | null;
};

type Kernel = DraggableController<LiftedDrag<State>>;

/**
 * The behavior `draggable` runs for one root. The kernel calls each hook as a
 * method of this instance. Operation values live in `drag.state`; the instance
 * holds only controller-lifetime ones and the `#motion` scratch, which is written
 * before every read.
 */
class FreeDragBehavior implements LiftedBehavior<State, FreeDragResolution> {
  readonly lift: typeof lift = lift;
  declare readonly threshold?: number;

  /** What `freeDrag()` returns. Its methods do not depend on `this`. */
  readonly controller: FreeDragController;

  readonly #root: HTMLElement;
  readonly #config: FreeDragConfig;
  readonly #window: Window & typeof globalThis;
  readonly #axis: DragAxis;
  readonly #bounds: MotionConstraint | null;
  readonly #landing: LandingTiming | null;
  /** The visual's viewport delta, axis-projected and clamped. */
  readonly #motion = { x: 0, y: 0 };

  constructor(root: HTMLElement, config: FreeDragConfig) {
    if (config.threshold !== undefined) {
      this.threshold = config.threshold;
    }

    this.#root = root;
    this.#config = config;
    this.#window = root.ownerDocument.defaultView!;
    this.#axis = config.axis ?? 'both';
    this.#bounds = config.bounds ? config.bounds(this.#window) : null;
    this.#landing = config.landing ?? null;

    const kernel: Kernel = draggable<State, FreeDragResolution>(root, this);

    this.controller = {
      invalidate: () => {
        kernel.requestStep(this.#invalidateBounds);
      },
      moveTo: (point) => {
        // One step per call: it carries the point, and DRI-8 keeps calls in order.
        kernel.requestStep((drag) => {
          if (drag) {
            const { rect, state } = drag;

            state.offsetX = point.x - rect.left - (drag.x - drag.originX);
            state.offsetY = point.y - rect.top - (drag.y - drag.originY);
            this.#translate(drag);
          }
        });
      },
      requestCancel: (reason) => {
        kernel.requestCancel(reason);
      },
      requestDestroy: () => kernel.requestDestroy(),
    };
  }

  /** Writes the delta the pointer and the operation's offset give into `#motion`. */
  #computeMotion(drag: LiftedDrag<State>): void {
    const motion = this.#motion;

    motion.x = drag.x - drag.originX + drag.state.offsetX;
    motion.y = drag.y - drag.originY + drag.state.offsetY;

    if (this.#axis === 'x') {
      motion.y = 0;
    } else if (this.#axis === 'y') {
      motion.x = 0;
    }

    this.#bounds?.apply(motion, drag.rect);
  }

  /** Computes the motion and moves the visual by it. */
  #translate(drag: LiftedDrag<State>): void {
    this.#computeMotion(drag);
    drag.translate(this.#motion.x, this.#motion.y);
  }

  #geometry(drag: LiftedDrag<State>): DragGeometry {
    const motion = this.#motion;

    return buildGeometry(
      drag.x,
      drag.y,
      drag.originX,
      drag.originY,
      motion.x,
      motion.y,
      drag.rect,
      drag.visualSpace,
      this.#window,
    );
  }

  /** Step and invalidation listener: the bounds are re-read on the next sample. */
  readonly #invalidateBounds = (): void => {
    this.#bounds?.invalidate();
  };

  admit(event: PointerEvent) {
    const root = this.#root;
    const config = this.#config;

    if (event.altKey) {
      return null;
    }

    let handle: HTMLElement | undefined;

    if (config.handle) {
      const named = config.handle(root);

      if (!named || !event.composedPath().includes(named)) {
        return null;
      }

      handle = named;
    }

    return {
      item: root,
      visual: config.visual ? config.visual(root) : root,
      handle: handle ?? root,
      state: { offsetX: 0, offsetY: 0, request: null, result: null },
    };
  }

  activate(drag: LiftedDrag<State>): undefined {
    if (this.#bounds) {
      listenForInvalidation(this.#window, drag.signal, this.#invalidateBounds);
    }

    this.#translate(drag);
    return undefined;
  }

  start(drag: LiftedDrag<State>): void {
    this.#config.onStart?.(this.#geometry(drag));
  }

  move(drag: LiftedDrag<State>): void {
    this.#translate(drag);

    if (this.#config.onMove) {
      this.#config.onMove(this.#geometry(drag));
    }
  }

  drop(drag: LiftedDrag<State>) {
    const motion = this.#motion;
    const config = this.#config;

    this.#computeMotion(drag);

    const request = buildRequest(
      { item: this.#root, visual: drag.visual },
      drag.x,
      drag.y,
      motion.x,
      motion.y,
      drag.rect,
      drag.visualSpace,
      this.#window,
    );

    drag.state.request = request;
    drag.translate(motion.x, motion.y);

    return (signal: AbortSignal) => config.onDrop(request, { signal });
  }

  settle(
    drag: LiftedDrag<State>,
    outcome: Outcome<FreeDragResolution>,
  ): Landing | null {
    const { state, rect } = drag;
    const { request } = state;
    const timing = this.#landing;
    const config = this.#config;
    let home = true;

    if (outcome.type === 'canceled') {
      state.result = {
        type: 'canceled',
        request,
        reason: outcome.reason,
        origin: outcome.origin,
      };
      home = outcome.origin !== 'fault';
    } else if (outcome.type === 'verdict' && outcome.value !== ACCEPTED) {
      state.result = {
        type: 'rejected',
        request: request!,
        reason: (outcome.value as RejectedResolution)[0],
      };
    } else {
      state.result = { type: 'accepted', request: request! };
      home = false;
    }

    if (!timing || !home) {
      return null;
    }

    const { x, y } = config.home
      ? config.home({ item: this.#root, visual: drag.visual })
      : { x: rect.left, y: rect.top };

    return {
      x,
      y,
      ...timing(drag.translatedX, drag.translatedY, x - rect.x, y - rect.y),
    };
  }

  end(drag: LiftedDrag<State>): void {
    this.#config.onEnd?.(drag.state.result!);
  }
}

/** Makes `root` draggable anywhere. */
export function freeDrag(
  root: HTMLElement,
  config: FreeDragConfig,
): FreeDragController {
  return new FreeDragBehavior(root, config).controller;
}
