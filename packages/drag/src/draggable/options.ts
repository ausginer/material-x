/** Public option, controller, and result types for the free-drag entry. */
import {
  OUTCOME_ACCEPTED,
  OUTCOME_CANCELED,
  OUTCOME_REJECTED,
  type CancellationReason,
  type DragErrorContext,
  type ResolutionContext,
} from '../kernel/protocol.ts';
import type {
  AnimationTiming,
  CoordinateMapper,
  DragAxis,
  DragGeometry,
  FreeDropRequest,
  MaybePromise,
  Point,
  DragSubject,
} from '../kernel/types.ts';
import type { BOUNDS_VIEWPORT } from './bounds.ts';

/* PUBLIC */

/** A source of drag bounds, expressed in viewport space. */
export type DragBounds =
  | typeof BOUNDS_VIEWPORT
  | HTMLElement
  | (() => DOMRectReadOnly | null);

/** How the visual is promoted during a drag. */
export type LiftMode =
  | typeof LIFT_TOP_LAYER
  | typeof LIFT_FLATTEN
  | typeof LIFT_NONE;

/**
 * The explicit consumer response to a free drop.
 *
 * Both responses optionally carry `presentationReady` — see
 * {@link AcceptedFreeDropResolution}.
 */
export const FreeDropResolution = {
  accept: (
    presentationReady?: PromiseLike<void>,
  ): AcceptedFreeDropResolution =>
    presentationReady
      ? { type: OUTCOME_ACCEPTED, presentationReady }
      : { type: OUTCOME_ACCEPTED },
  reject: (
    reason?: unknown,
    presentationReady?: PromiseLike<void>,
  ): RejectedFreeDropResolution =>
    presentationReady
      ? { type: OUTCOME_REJECTED, reason, presentationReady }
      : { type: OUTCOME_REJECTED, reason },
} as const;

export type FreeDropResolution =
  | AcceptedFreeDropResolution
  | RejectedFreeDropResolution;

export type FreeDropFinishResult = AcceptedFreeDropResult;

export type FreeDropCancelResult =
  | RejectedFreeDropResult
  | CanceledFreeDropResult;

export const FreeDropResult = {
  isAccepted: (result: FreeDropResult): result is AcceptedFreeDropResult =>
    result.type === OUTCOME_ACCEPTED,
  isRejected: (result: FreeDropResult): result is RejectedFreeDropResult =>
    result.type === OUTCOME_REJECTED,
  isCanceled: (result: FreeDropResult): result is CanceledFreeDropResult =>
    result.type === OUTCOME_CANCELED,
} as const;

/** A finite viewport-space rollback target: the visual's target border-box origin. */
export type FreeHomeTarget = Readonly<{
  position: Point;
  space: 'viewport';
}>;

export type DraggableOptions = Readonly<{
  /** Element (or resolver) that must be pressed to start the drag. */
  handle?: HTMLElement | ((item: HTMLElement) => HTMLElement | null);
  /** The element actually lifted; defaults to the item itself. */
  getVisual?(item: HTMLElement): HTMLElement;
  /** How the visual is promoted during a drag. Defaults to `'top-layer'`. */
  lift?: LiftMode;
  /** Which axes movement is allowed on. Defaults to `'both'`. */
  axis?: DragAxis;
  /** Optional movement bounds, in viewport space. */
  bounds?: DragBounds;
  /** Maps viewport space to the consumer's coordinate space. */
  coordinateSpace?: CoordinateMapper;
  /** Activation travel, in viewport pixels. Defaults to 8. */
  threshold?: number;
  /** Landing animation timing, read at settle time. */
  landingTiming?(): AnimationTiming;
  /** Required: the explicit consumer drop resolution. */
  onDrop: OnDrop;
  /** Optional synchronous rollback target for rejected/canceled drops. */
  resolveHomeTarget?: ResolveFreeHomeTarget;
  onStart?(geometry: DragGeometry): void;
  onMove?(geometry: DragGeometry): void;
  onFinish?(result: FreeDropFinishResult): void;
  onCancel?(result: FreeDropCancelResult): void;
  onError?(error: unknown, context: DragErrorContext<FreeDropResult>): void;
}>;

/** Options accepted by {@link FreeDragController.update}. */
export type DragUpdate = Readonly<{
  axis?: DragAxis;
  bounds?: DragBounds;
  coordinateSpace?: CoordinateMapper;
  landingTiming?(): AnimationTiming;
  onMove?(geometry: DragGeometry): void;
  /** A new controlled position, in the consumer coordinate space. */
  position?: Point;
}>;

/* PRIVATE */

export const LIFT_TOP_LAYER = 'top-layer';
export const LIFT_FLATTEN = 'flatten';
export const LIFT_NONE = 'none';

/** How a free drop's coordinate space defined its request values. */
export type FreeDropProposal = Readonly<{
  request: FreeDropRequest;
  coordinateSpace: CoordinateMapper;
}>;

export type AcceptedFreeDropResolution = Readonly<{
  type: typeof OUTCOME_ACCEPTED;
  /**
   * Resolves once the consumer's *authored* presentation for this outcome has
   * actually been committed. The engine keeps the lift pinned until it settles
   * (bounded by `PRESENTATION_READY_TIMEOUT`), so the authored DOM is never
   * revealed before it exists.
   *
   * Apply the change from the resolution callback and return the promise here —
   * do not `await` it before returning, which would serialize the render ahead
   * of the landing animation instead of overlapping it.
   */
  presentationReady?: PromiseLike<void>;
}>;

export type RejectedFreeDropResolution = Readonly<{
  type: typeof OUTCOME_REJECTED;
  reason?: unknown;
  /** As {@link AcceptedFreeDropResolution.presentationReady}, for async rollback. */
  presentationReady?: PromiseLike<void>;
}>;

/** The terminal free-drop result carried through settlement. */
export type AcceptedFreeDropResult = Readonly<{
  type: typeof OUTCOME_ACCEPTED;
  proposal: FreeDropProposal;
}>;

export type RejectedFreeDropResult = Readonly<{
  type: typeof OUTCOME_REJECTED;
  proposal: FreeDropProposal;
  reason?: unknown;
}>;

export type FreeDropResult =
  | AcceptedFreeDropResult
  | RejectedFreeDropResult
  | CanceledFreeDropResult;

export type CanceledFreeDropResult = Readonly<{
  type: typeof OUTCOME_CANCELED;
  reason: CancellationReason;
  proposal: FreeDropProposal | null;
}>;

/** Dedicated signal handed to the drop resolver. */
export type OnDrop = (
  request: FreeDropRequest,
  context: ResolutionContext,
) => MaybePromise<FreeDropResolution>;

/** Request handed to the optional home-target resolver. */
export type FreeHomeRequest = DragSubject;

export type ResolveFreeHomeTarget = (
  request: FreeHomeRequest,
) => FreeHomeTarget;
