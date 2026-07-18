/** Public option, controller, and result types for the sortable entry. */
import type {
  AnimationTiming,
  DragController,
  MoveResult,
  ReorderRequest,
  ReorderResult,
} from '../kernel/types.ts';

/** The result an `onReorder` callback may produce (or nothing, meaning accept). */
export type ReorderOutcome = ReorderResult | Promise<ReorderResult> | undefined;

/**
 * How a reorder gesture concluded, reported to `onFinish`:
 * - `committed` — accepted, and the consumer's DOM commit was observed;
 * - `accepted` — accepted, but no commit was observed before the timeout (the
 *   item may still sit in its original slot);
 * - `rejected` — the consumer rejected the proposal, or the drop was a no-op;
 * - `canceled` — the gesture was cancelled, escaped, or destroyed.
 */
export type ReorderFinish = 'committed' | 'accepted' | 'rejected' | 'canceled';

/** Geometry passed to a consumer's placeholder factory. */
export type PlaceholderContext = Readonly<{
  item: HTMLElement;
  visual: HTMLElement;
  rect: DOMRectReadOnly;
}>;

export type SortableOptions = Readonly<{
  /** The current ordered item collection. */
  items(): readonly HTMLElement[];
  /** The lifted element for an item; defaults to the item itself. */
  getVisual?(item: HTMLElement): HTMLElement;
  /** Whether an item requires its press to land on a handle. */
  getHandle?(item: HTMLElement): HTMLElement | null;
  /**
   * Builds the visible placeholder occupying the dragged item's slot. Optional:
   * when omitted, the engine uses an internal, non-styleable anchor purely for
   * geometry, and no placeholder DOM is exposed to the consumer.
   */
  createPlaceholder?(context: PlaceholderContext): HTMLElement;
  /** `touch-action` applied to the item for the gesture. */
  touchAction?: string;
  /** Activation travel, in viewport pixels. Defaults to 8. */
  threshold?: number;
  /** Landing animation timing, read at drop time. */
  landingTiming?(): AnimationTiming;
  onStart?(item: HTMLElement): void;
  onReorder?(request: ReorderRequest): ReorderOutcome;
  onCancel?(item: HTMLElement, reason: unknown): void;
  onFinish?(item: HTMLElement, outcome: ReorderFinish): void;
  onError?(error: unknown): void;
}>;

/** A sortable controller adds collection updates and programmatic moves. */
export type SortableController = DragController &
  Readonly<{
    updateItems(items: readonly HTMLElement[]): void;
    move(
      item: HTMLElement,
      destination: {
        before: HTMLElement | null;
        after: HTMLElement | null;
      },
    ): Promise<MoveResult>;
  }>;
