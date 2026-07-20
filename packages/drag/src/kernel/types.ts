/**
 * Primitive geometry and public request/result value types shared by the drag
 * kernel. Every value is an immutable plain object so it can be handed to
 * consumer callbacks and compared without risk of mutation.
 */

/** A coordinate pair. The space (viewport vs local) is documented per use. */
export type Point = Readonly<{
  x: number;
  y: number;
}>;

/** The zero point, reused to avoid churning allocations. */
export const ORIGIN: Point = { x: 0, y: 0 };

/** Whether both coordinates of a point are finite numbers. */
export function isFinitePoint(point: unknown): point is Point {
  return (
    typeof point === 'object' &&
    point !== null &&
    Number.isFinite((point as Point).x) &&
    Number.isFinite((point as Point).y)
  );
}

/** Which axes a free drag may move along. */
export type DragAxis = 'both' | 'x' | 'y';

/**
 * Maps points and deltas between viewport space and a consumer-selected local
 * space. The default is derived at activation from the visual's layout context;
 * a consumer may supply its own mapper through `coordinateSpace`. A mapper is an
 * immutable semantic value: coordinate behaviour changes by supplying a
 * replacement mapper, never by mutating a captured one.
 */
export type CoordinateMapper = Readonly<{
  toViewport(point: Point): Point;
  fromViewport(point: Point): Point;
  deltaFromViewport(delta: Point): Point;
}>;

/** Timing shared by lift and landing animations. */
export type AnimationTiming = Pick<EffectTiming, 'duration' | 'easing'>;

/** Geometry snapshot handed to draggable movement callbacks. */
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

/** A proposed reorder, carrying both indices and stable neighbour identity. */
export type ReorderRequest = Readonly<{
  item: HTMLElement;
  version: number;
  from: number;
  to: number;
  before: HTMLElement | null;
  after: HTMLElement | null;
}>;

/** A value that may be produced synchronously or as a promise. */
export type MaybePromise<T> = T | Promise<T>;
