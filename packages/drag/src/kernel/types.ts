/**
 * Shared value types for the drag kernel. Every geometry value is an immutable
 * plain object so it can be passed to consumer callbacks and compared without
 * risk of mutation.
 */

/** A coordinate pair. The space (viewport vs local) is documented per use. */
export type Point = Readonly<{
  x: number;
  y: number;
}>;

/** The zero point, reused to avoid churning allocations. */
export const ORIGIN: Point = { x: 0, y: 0 };

/**
 * Geometry snapshot handed to movement callbacks. The `viewport*` values are raw
 * viewport space; `localDelta` (and `localPosition` on a drop) carry the consumer
 * coordinate space, mapped through the active {@link CoordinateMapper}.
 */
export type DragGeometry = Readonly<{
  /** Current pointer position, viewport space. */
  pointer: Point;
  /** Pointer position at grab, viewport space. */
  originPointer: Point;
  /** `pointer - originPointer`, viewport space. */
  viewportDelta: Point;
  /** The same delta mapped into the consumer coordinate space. */
  localDelta: Point;
  /** The visual's rect at grab, viewport space. */
  originRect: DOMRectReadOnly;
  /** The visual's current rect, viewport space. */
  currentRect: DOMRectReadOnly;
}>;

/** Which axes a free drag may move along. */
export type DragAxis = 'both' | 'x' | 'y';

/**
 * Maps points and deltas between viewport space and a consumer-selected local
 * space. The default is derived at grab time from the element's layout context
 * via a `DOMMatrix` compositor that accounts for cumulative `zoom` and nested
 * CSS transforms (translate, scale, rotate, skew, `matrix()`, custom origins); a
 * consumer may supply its own mapper through `coordinateSpace`.
 */
export type CoordinateMapper = Readonly<{
  toViewport(point: Point): Point;
  fromViewport(point: Point): Point;
  deltaFromViewport(delta: Point): Point;
}>;

/** A proposed insertion position within a sortable collection. */
export type Insertion = Readonly<{
  index: number;
  before: HTMLElement | null;
  after: HTMLElement | null;
}>;

/** Geometry describing where a free drag was released. */
export type FreeDropRequest = Readonly<{
  item: HTMLElement;
  visual: HTMLElement;
  pointer: Point;
  viewportPosition: Point;
  localPosition: Point;
  viewportDelta: Point;
  localDelta: Point;
  visualRect: DOMRectReadOnly;
}>;

/** Consumer response to a free drop. */
export type FreeDropResult = Readonly<{
  accepted: boolean;
  /** Overrides the landing position, in the consumer coordinate space. */
  position?: Point;
}>;

/** A proposed reorder, carrying both indices and stable neighbour identity. */
export type ReorderRequest = Readonly<{
  item: HTMLElement;
  from: number;
  to: number;
  before: HTMLElement | null;
  after: HTMLElement | null;
}>;

/** Consumer response to a reorder. */
export type ReorderResult = Readonly<{
  accepted: boolean;
}>;

/** Outcome of a programmatic move. */
export type MoveResult = Readonly<{
  accepted: boolean;
}>;

/** Timing shared by lift and landing animations. */
export type AnimationTiming = Pick<EffectTiming, 'duration' | 'easing'>;

/** Base controller shared by both entry points. */
export type DragController = Readonly<{
  cancel(reason?: unknown): Promise<void>;
  destroy(): void;
}>;
