/**
 * Free drag, written on the public `draggable` with no private path. A drop asks the
 * consumer: `accept` keeps the element wherever the consumer put it, and `reject`
 * sends it home.
 */
import { draggable, type LiftedDrag } from './draggable.ts';
import type { BoundsInstaller } from './free-drag/bounds.ts';
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

/** Makes `root` draggable anywhere. */
export function freeDrag(
  root: HTMLElement,
  config: FreeDragConfig,
): FreeDragController {
  const view = root.ownerDocument.defaultView!;
  const axis = config.axis ?? 'both';
  const constraint = config.bounds ? config.bounds(view) : null;
  const timing = config.landing ?? null;
  const motion = { x: 0, y: 0 };

  const derive = (drag: LiftedDrag<State>): void => {
    motion.x = drag.x - drag.originX + drag.state.offsetX;
    motion.y = drag.y - drag.originY + drag.state.offsetY;

    if (axis === 'x') {
      motion.y = 0;
    } else if (axis === 'y') {
      motion.x = 0;
    }

    constraint?.apply(motion, drag.rect);
  };

  const geometry = (drag: LiftedDrag<State>): DragGeometry =>
    buildGeometry(
      drag.x,
      drag.y,
      drag.originX,
      drag.originY,
      motion.x,
      motion.y,
      drag.rect,
      drag.visualSpace,
      view,
    );

  const invalidateConstraint = (): void => {
    constraint?.invalidate();
  };

  const panel = draggable<State, FreeDragResolution>(root, {
    lift,
    ...(config.threshold === undefined ? {} : { threshold: config.threshold }),

    admit(event) {
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
    },

    activate(drag) {
      if (constraint) {
        listenForInvalidation(view, drag.signal, invalidateConstraint);
      }

      derive(drag);
      drag.translate(motion.x, motion.y);
    },

    start(drag) {
      config.onStart?.(geometry(drag));
    },

    move(drag) {
      derive(drag);
      drag.translate(motion.x, motion.y);

      if (config.onMove) {
        config.onMove(geometry(drag));
      }
    },

    drop(drag) {
      derive(drag);

      const request = buildRequest(
        { item: root, visual: drag.visual },
        drag.x,
        drag.y,
        motion.x,
        motion.y,
        drag.rect,
        drag.visualSpace,
        view,
      );

      drag.state.request = request;
      drag.translate(motion.x, motion.y);

      return (signal) => config.onDrop(request, { signal });
    },

    settle(drag, outcome) {
      const { state, rect } = drag;
      const { request } = state;
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
        ? config.home({ item: root, visual: drag.visual })
        : { x: rect.left, y: rect.top };

      return {
        x,
        y,
        ...timing(drag.translatedX, drag.translatedY, x - rect.x, y - rect.y),
      };
    },

    end(drag) {
      config.onEnd?.(drag.state.result!);
    },
  });

  return {
    invalidate() {
      panel.requestStep(invalidateConstraint);
    },
    moveTo(point) {
      panel.requestStep((drag) => {
        if (drag) {
          const { rect, state } = drag;

          state.offsetX = point.x - rect.left - (drag.x - drag.originX);
          state.offsetY = point.y - rect.top - (drag.y - drag.originY);
          derive(drag);
          drag.translate(motion.x, motion.y);
        }
      });
    },
    requestCancel(reason) {
      panel.requestCancel(reason);
    },
    requestDestroy() {
      return panel.requestDestroy();
    },
  };
}
