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

/** Options accepted by {@link FreeDragController.update}. */
export type DragUpdate = Readonly<
  Partial<DraggableOptions> & {
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
