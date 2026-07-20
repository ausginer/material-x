/** Public option, controller, and result types for the free-drag entry. */
import type {
  CancellationReason,
  DragErrorContext,
  ResolutionContext,
} from '../kernel/protocol.ts';
import type {
  AnimationTiming,
  CoordinateMapper,
  DragAxis,
  DragGeometry,
  FreeDropRequest,
  MaybePromise,
  Point,
} from '../kernel/types.ts';

/** A source of drag bounds, expressed in viewport space. */
export type DragBounds =
  | 'viewport'
  | HTMLElement
  | (() => DOMRectReadOnly | null);

/** How a free drop's coordinate space defined its request values. */
export type FreeDropProposal = Readonly<{
  request: FreeDropRequest;
  coordinateSpace: CoordinateMapper;
}>;

/** The explicit consumer response to a free drop. */
export type FreeDropResolution =
  | Readonly<{ type: 'accepted' }>
  | Readonly<{ type: 'rejected'; reason?: unknown }>;

/** The terminal free-drop result carried through settlement. */
export type FreeDropResult =
  | Readonly<{ type: 'accepted'; proposal: FreeDropProposal }>
  | Readonly<{
      type: 'rejected';
      proposal: FreeDropProposal;
      reason?: unknown;
    }>;

export type FreeDragFinishResult = Extract<
  FreeDropResult,
  { type: 'accepted' }
>;

export type FreeDragCancelResult =
  | Extract<FreeDropResult, { type: 'rejected' }>
  | Readonly<{
      type: 'canceled';
      reason: CancellationReason;
      proposal: FreeDropProposal | null;
    }>;

/** Dedicated signal handed to the drop resolver. */
export type OnDrop = (
  request: FreeDropRequest,
  context: ResolutionContext,
) => MaybePromise<FreeDropResolution>;

/** A finite viewport-space rollback target: the visual's target border-box origin. */
export type FreeHomeTarget = Readonly<{
  position: Point;
  space: 'viewport';
}>;

/** Request handed to the optional home-target resolver. */
export type FreeHomeRequest = Readonly<{
  item: HTMLElement;
  visual: HTMLElement;
}>;

export type ResolveFreeHomeTarget = (
  request: FreeHomeRequest,
) => FreeHomeTarget;

export type DraggableOptions = Readonly<{
  /** Element (or resolver) that must be pressed to start the drag. */
  handle?: HTMLElement | ((item: HTMLElement) => HTMLElement | null);
  /** The element actually lifted; defaults to the item itself. */
  getVisual?(item: HTMLElement): HTMLElement;
  /** How the visual is promoted during a drag. Defaults to `'top-layer'`. */
  lift?: 'top-layer' | 'flatten' | 'none';
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
  onFinish?(result: FreeDragFinishResult): void;
  onCancel?(result: FreeDragCancelResult): void;
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

/** Controller returned by `draggable`. */
export type FreeDragController = Readonly<{
  /** Revises runtime options and/or retargets a controlled position. */
  update(options: DragUpdate): void;
  /** Cancels any live gesture. */
  cancel(reason?: unknown): void;
  /** Terminal, idempotent teardown. */
  destroy(): void;
}>;
