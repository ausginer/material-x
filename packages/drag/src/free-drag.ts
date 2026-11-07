/**
 * Free drag, written on the public `draggable` with no private path. A drop asks the
 * consumer: `accept` keeps the element wherever the consumer put it, and `reject`
 * sends it home.
 */
import {
  draggable,
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

type State = {
  offsetX: number;
  offsetY: number;
  request: FreeDragRequest | null;
  result: FreeDragResult | null;
};

/**
 * The behavior `draggable` runs for one root. The kernel calls each hook as a
 * method of this instance. Operation values live in `drag.state`; the instance
 * holds only controller-lifetime ones and the `#motion` scratch, which is written
 * before every read.
 */
class FreeDragBehavior implements LiftedBehavior<State, FreeDragResolution> {
  readonly lift: typeof lift = lift;
  declare readonly threshold?: number;

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
  }

  /** Step and invalidation listener: the bounds are re-read on the next sample. */
  invalidate = (): void => {
    this.#bounds?.invalidate();
  };

  /** Computes the motion and moves the visual by it. */
  translate(drag: LiftedDrag<State>): void {
    this.#computeMotion(drag);
    drag.translate(this.#motion.x, this.#motion.y);
  }

  admit(event: PointerEvent) {
    if (event.altKey) {
      return null;
    }

    let handle: HTMLElement | undefined;

    if (this.#config.handle) {
      const named = this.#config.handle(this.#root);

      if (!named || !event.composedPath().includes(named)) {
        return null;
      }

      handle = named;
    }

    return {
      item: this.#root,
      visual: this.#config.visual
        ? this.#config.visual(this.#root)
        : this.#root,
      ...(handle ? { handle } : {}),
      state: { offsetX: 0, offsetY: 0, request: null, result: null },
    };
  }

  activate(drag: LiftedDrag<State>): undefined {
    if (this.#bounds) {
      listenForInvalidation(this.#window, drag.signal, this.invalidate);
    }

    this.translate(drag);
    return undefined;
  }

  start(drag: LiftedDrag<State>): void {
    this.#config.onStart?.(this.#geometry(drag));
  }

  move(drag: LiftedDrag<State>): void {
    this.translate(drag);

    if (this.#config.onMove) {
      this.#config.onMove(this.#geometry(drag));
    }
  }

  drop(drag: LiftedDrag<State>) {
    this.#computeMotion(drag);

    const request = buildRequest(
      this.#root,
      drag,
      this.#motion,
      this.#home(drag),
      this.#window,
    );

    drag.state.request = request;
    drag.translate(this.#motion.x, this.#motion.y);

    return (signal: AbortSignal) => this.#config.onDrop(request, { signal });
  }

  settle(
    drag: LiftedDrag<State>,
    outcome: Outcome<FreeDragResolution>,
  ): Landing | null {
    const timing = this.#landing;
    let home = true;

    if (outcome.type === 'canceled') {
      drag.state.result = {
        type: 'canceled',
        request: drag.state.request,
        reason: outcome.reason,
        origin: outcome.origin,
      };
      home = outcome.origin !== 'fault';
    } else if (outcome.type === 'verdict' && outcome.value !== ACCEPTED) {
      drag.state.result = {
        type: 'rejected',
        request: drag.state.request!,
        reason: (outcome.value as RejectedResolution)[0],
      };
    } else {
      drag.state.result = { type: 'accepted', request: drag.state.request! };
      home = false;
    }

    if (!timing || !home) {
      return null;
    }

    const { x, y } = this.#home(drag);

    return {
      x,
      y,
      ...timing(
        drag.translatedX,
        drag.translatedY,
        x - drag.rect.x,
        y - drag.rect.y,
      ),
    };
  }

  end(drag: LiftedDrag<State>): void {
    this.#config.onEnd?.(drag.state.result!);
  }

  /** Writes the delta the pointer and the operation's offset give into `#motion`. */
  #computeMotion(drag: LiftedDrag<State>): void {
    this.#motion.x = drag.x - drag.originX + drag.state.offsetX;
    this.#motion.y = drag.y - drag.originY + drag.state.offsetY;

    if (this.#axis === 'x') {
      this.#motion.y = 0;
    } else if (this.#axis === 'y') {
      this.#motion.x = 0;
    }

    this.#bounds?.apply(this.#motion, drag.rect);
  }

  #geometry(drag: LiftedDrag<State>): DragGeometry {
    return buildGeometry(drag, this.#motion, this.#window);
  }

  /** `config.home()` now, or the visual's rect at the grab without it. */
  #home(drag: LiftedDrag<State>): Point {
    return this.#config.home
      ? this.#config.home({ item: this.#root, visual: drag.visual })
      : { x: drag.rect.left, y: drag.rect.top };
  }
}

/** Makes `root` draggable anywhere. */
export function freeDrag(
  root: HTMLElement,
  config: FreeDragConfig,
): FreeDragController {
  const behavior = new FreeDragBehavior(root, config);
  const kernel = draggable<State, FreeDragResolution>(root, behavior);

  return {
    invalidate: () => kernel.requestStep(behavior.invalidate),
    moveTo: (point) =>
      // One step per call: it carries the point, and DRI-8 keeps calls in order.
      kernel.requestStep((drag) => {
        if (drag) {
          drag.state.offsetX =
            point.x - drag.rect.left - (drag.x - drag.originX);
          drag.state.offsetY =
            point.y - drag.rect.top - (drag.y - drag.originY);
          behavior.translate(drag);
        }
      }),
    requestCancel: (reason) => kernel.requestCancel(reason),
    requestDestroy: () => kernel.requestDestroy(),
  };
}
