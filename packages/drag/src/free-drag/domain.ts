/**
 * Free drag's vocabulary: what a drop is, what the consumer is asked, what it may
 * answer and what it is told afterwards. Every point is in viewport space. Only a
 * delta is also offered in the space a transform authored on the visual acts in.
 */
import type { CancelOrigin } from '../draggable.ts';

export type DragAxis = 'both' | 'x' | 'y';

export type Point = Readonly<{ x: number; y: number }>;

export type FreeDragSubject = Readonly<{
  item: HTMLElement;
  visual: HTMLElement;
}>;

/** What `onStart` and `onMove` receive. Derived, with no layout read. */
export type DragGeometry = Readonly<{
  pointerX: number;
  pointerY: number;
  originPointerX: number;
  originPointerY: number;
  /** What the visual was actually translated by. */
  viewportDeltaX: number;
  viewportDeltaY: number;
  /** The same delta in the space a transform authored on the visual acts in. */
  localDeltaX: number;
  localDeltaY: number;
  originRect: DOMRectReadOnly;
  currentRect: DOMRectReadOnly;
}>;

/** Where a free drag was released: the question `onDrop` answers. */
export type FreeDragRequest = FreeDragSubject &
  Readonly<{
    pointerX: number;
    pointerY: number;
    /** The visual's top-left at release. */
    positionX: number;
    positionY: number;
    /**
     * From the visual's top-left at home to its top-left at the drop. Home is
     * `home()`, read once at the drop, or the visual's rect at the grab. Without
     * `home`, this is exact only when nothing moved the home during the drag, such
     * as a scrolling ancestor.
     */
    viewportDeltaX: number;
    viewportDeltaY: number;
    /**
     * The same offset in the space a transform authored on the visual acts in:
     * write it to the visual's `translate` in `onEnd` to commit the drop.
     */
    localDeltaX: number;
    localDeltaY: number;
    visualRect: DOMRectReadOnly;
    /**
     * The drop target under the pointer at the drop, or `null` outside every
     * target and without `targets`.
     */
    target: HTMLElement | null;
  }>;

/**
 * The viewport position of the visual's top-left at home, now. A rejected or
 * canceled drag lands there, and the request's offset is measured from it. Give
 * it when a scrolling container can move the home during a drag.
 */
export type ResolveHome = (subject: FreeDragSubject) => Point;

// No runtime value carries this key: it keeps the shape unwritable except
// through the factories.
declare const RESOLUTION: unique symbol;

/** Opaque: `onDrop` returns it and only the library reads it. */
export type FreeDragResolution = Readonly<{ [RESOLUTION]: never }>;

export type RejectedResolution = FreeDragResolution &
  readonly [reason?: unknown];

/** Identity is the discriminant, so an accepted drop allocates nothing. */
export const ACCEPTED: FreeDragResolution = [] as never;

export const FreeDragResolution = {
  accept: (): FreeDragResolution => ACCEPTED,
  reject: (reason?: unknown): FreeDragResolution => [reason] as never,
} as const;

export type OnDrop = (
  request: FreeDragRequest,
  context: Readonly<{ signal: AbortSignal }>,
) => FreeDragResolution | PromiseLike<FreeDragResolution>;

export type FreeDragAcceptedResult = Readonly<{
  type: 'accepted';
  request: FreeDragRequest;
}>;

export type FreeDragRejectedResult = Readonly<{
  type: 'rejected';
  request: FreeDragRequest;
  reason: unknown;
}>;

export type FreeDragCanceledResult = Readonly<{
  type: 'canceled';
  /** `null` when the drag ended before release built one. */
  request: FreeDragRequest | null;
  /** The `requestCancel` value, or the reported `DragFault`. */
  reason: unknown;
  origin: CancelOrigin;
}>;

export type FreeDragResult =
  | FreeDragAcceptedResult
  | FreeDragRejectedResult
  | FreeDragCanceledResult;
