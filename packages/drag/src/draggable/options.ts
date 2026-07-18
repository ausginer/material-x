/** Public option, controller, and result types for the free-drag entry. */
import type {
  AnimationTiming,
  CoordinateMapper,
  DragAxis,
  DragController,
  DragGeometry,
  FreeDropRequest,
  FreeDropResult,
  Point,
} from '../kernel/types.ts';

/** A source of drag bounds, expressed in viewport space. */
export type DragBounds =
  | 'viewport'
  | HTMLElement
  | (() => DOMRectReadOnly | null);

/** The result an `onDrop` callback may produce (or nothing, meaning accept). */
export type DropOutcome = FreeDropResult | Promise<FreeDropResult> | undefined;

export type DraggableOptions = Readonly<{
  /** Element (or resolver) that must be pressed to start the drag. */
  handle?: HTMLElement | ((item: HTMLElement) => HTMLElement | null);
  /** The element actually lifted; defaults to the item itself. */
  getVisual?(item: HTMLElement): HTMLElement;
  /**
   * How the visual is promoted during a drag. Defaults to `'top-layer'`.
   *
   * - `'top-layer'` — lift into the top layer (escaping ancestor transforms,
   *   clipping, and stacking) and track in viewport space. The visual paints
   *   above everything but flattens: ancestor `zoom`/`transform` is dropped.
   * - `'top-layer-transformed'` — lift into the top layer, then re-apply the
   *   element's captured local→viewport matrix so it keeps its ancestor
   *   `zoom`/`transform` while still escaping clipping and stacking. Best of
   *   both, at the cost of one matrix computation at grab.
   * - `'none'` — drag in place: the visual stays inside its container, keeping
   *   ancestor `zoom`/`transform` but subject to that container's clipping and
   *   stacking. Movement is mapped through the coordinate space so the pointer
   *   stays anchored under a scaled or rotated container.
   */
  lift?: 'top-layer' | 'top-layer-transformed' | 'none';
  /** Which axes movement is allowed on. Defaults to `'both'`. */
  axis?: DragAxis;
  /** Optional movement bounds, in viewport space. */
  bounds?: DragBounds;
  /** Maps viewport space to the consumer's coordinate space. */
  coordinateSpace?: CoordinateMapper;
  /** `touch-action` applied to the handle/item for the gesture. */
  touchAction?: string;
  /** Activation travel, in viewport pixels. Defaults to 8. */
  threshold?: number;
  /** Landing animation timing, read at drop time. */
  landingTiming?(): AnimationTiming;
  onStart?(geometry: DragGeometry): void;
  onMove?(geometry: DragGeometry): void;
  onDrop?(request: FreeDropRequest): DropOutcome;
  onCancel?(reason: unknown): void;
  onFinish?(accepted: boolean): void;
  onError?(error: unknown): void;
}>;

/**
 * Options accepted by {@link FreeDragController.update}. `threshold` and
 * `getVisual` are omitted: both are captured at construction and cannot change
 * for a live controller.
 */
export type DragUpdate = Readonly<
  Partial<Omit<DraggableOptions, 'threshold' | 'getVisual'>> & {
    /** A new controlled position, in the consumer coordinate space. */
    position?: Point;
  }
>;

/** Controller returned by `draggable`. */
export type FreeDragController = DragController &
  Readonly<{
    /** Revises runtime options and/or retargets a controlled position. */
    update(options: DragUpdate): void;
  }>;
