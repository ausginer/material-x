import type {
  BehaviorOperation,
  Drag,
  Outcome,
  VerdictAwaiter,
} from '../draggable.ts';
import type { Lift } from '../lift.ts';
import type { FreeDragBehavior } from './behavior.ts';
import {
  ACCEPTED,
  type DragGeometry,
  type FreeDragRequest,
  type FreeDragResolution,
  type FreeDragResult,
  type Point,
  type RejectedResolution,
} from './domain.ts';
import type { DropTargetTracker } from './drop-targets.ts';
import { buildGeometry, buildRequest } from './geometry.ts';

/**
 * One activated free drag, from `start` to `end`. The kernel calls each hook as a
 * method of this instance.
 */
export class FreeDragOperation implements BehaviorOperation<FreeDragResolution> {
  readonly #behavior: FreeDragBehavior;
  readonly #drag: Drag<FreeDragOperation>;
  readonly #lift: Lift;
  /** `config.targets`' state for this operation, released with it. */
  readonly #targets: DropTargetTracker | null;
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
    targets: DropTargetTracker | null,
  ) {
    this.#behavior = behavior;
    this.#drag = drag;
    this.#lift = lift;
    this.#targets = targets;
  }

  /**
   * The scroll and resize listener, also called by the drop: the bounds and the
   * drop targets are re-read at their next read.
   */
  handleEvent(): void {
    this.#behavior.bounds?.invalidate();
    this.#targets?.invalidate();
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
    this.#behavior._config.onStart?.(this.#geometry());
  }

  move(): void {
    this.translate();
    this.#targets?.move();

    if (this.#behavior._config.onMove) {
      this.#behavior._config.onMove(this.#geometry());
    }
  }

  drop(): VerdictAwaiter<FreeDragResolution> | null {
    // A scroll after the last rendering update dispatches its `scroll` event only
    // at the next update, which the drop does not wait for. So the drop clamps and
    // resolves against the bounds and targets as they are now.
    this.handleEvent();
    this.#computeMotion();
    // `pointerup` moved the pointer, and a drop may follow no frame at all.
    this.#targets?.drop();

    const request = buildRequest(
      this.#behavior._root,
      this.#drag,
      this.#lift,
      this.#motion,
      this.#home(),
      this.#targets?.current ?? null,
      this.#behavior._window,
    );

    this.#request = request;
    this.#lift.translate(this.#motion.x, this.#motion.y);

    return (signal: AbortSignal) =>
      this.#behavior._config.onDrop(request, { signal });
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
    this.#behavior._config.onEnd?.(this.#result!);
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
      this.#behavior._window,
    );
  }

  /** `config.home()` now, or the visual's rect at the grab without it. */
  #home(): Point {
    return this.#behavior._config.home
      ? this.#behavior._config.home({
          item: this.#behavior._root,
          visual: this.#lift.visual,
        })
      : { x: this.#lift.rect.left, y: this.#lift.rect.top };
  }
}
