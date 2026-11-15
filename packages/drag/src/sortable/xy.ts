/**
 * The two-dimensional axis rule, for a field of rectangles: the nearest center by
 * squared Euclidean distance, the placeholder's own as the incumbent, and DOM
 * order deciding the gap side, because a candidate up and to the right has no
 * unambiguous side. A list consumer does not carry this module's metric.
 *
 * This axis does not predict: a cellular move's displacement is a difference
 * between two elements' presented geometry, which no single measurement recovers.
 * With a displacement sink, a committed move rebuilds the cache once. Without
 * one, it invalidates, and the next frame rebuilds against a laid-out tree. A
 * resolution with nothing stale reads no layout.
 */
import type {
  AxisContext,
  AxisInstaller,
  AxisQuery,
  DisplacementSink,
  InsertionGeometry,
} from './axis.ts';
import type { CollectionSnapshot, Insertion } from './domain.ts';
import {
  CENTER_X,
  CENTER_Y,
  LEFT,
  PLACEHOLDER,
  type RectIndex,
  RetainingRectIndex,
  TOP,
} from './rect-index.ts';

/**
 * Measures every slot, only when something marked the cache stale or the collection
 * version changed. An empty window after `collect` is a rebuild, or a collection
 * with no slot.
 */
function refresh(
  index: RectIndex,
  snapshot: CollectionSnapshot,
  dragged: HTMLElement,
  getBox: ((item: HTMLElement) => HTMLElement) | null | undefined,
  placeholder: HTMLElement,
  displacement: DisplacementSink | null | undefined,
): void {
  index.collect(snapshot, dragged, placeholder, 0);

  if (index.first === index.end) {
    index.measure(0, index.count, getBox, displacement);
  }
}

class XYAxisGeometry implements InsertionGeometry {
  readonly #index = new RetainingRectIndex();
  #last = -1;

  resolve(query: AxisQuery, context: AxisContext): Insertion | null {
    refresh(
      this.#index,
      query.snapshot,
      query.item,
      context.box,
      context.placeholder,
      context.displacement,
    );
    this.#last = query.insertion.index;

    const dxAnchor = query.pointerX - this.#index.at(PLACEHOLDER, CENTER_X);
    const dyAnchor = query.pointerY - this.#index.at(PLACEHOLDER, CENTER_Y);

    let best = dxAnchor * dxAnchor + dyAnchor * dyAnchor;
    let nearest = -1;

    for (let i = 0; i < this.#index.count; i += 1) {
      const dx = query.pointerX - this.#index.at(i, CENTER_X);
      const dy = query.pointerY - this.#index.at(i, CENTER_Y);
      const distance = dx * dx + dy * dy;

      if (distance < best) {
        best = distance;
        nearest = i;
      }
    }

    if (nearest === -1) {
      return null;
    }

    const position = context.placeholder.compareDocumentPosition(
      this.#index.item(nearest),
    );

    return this.#index.insertion(
      // oxlint-disable-next-line no-bitwise -- a documented bitfield
      (position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
        ? nearest + 1
        : nearest,
    );
  }

  confirm(query: AxisQuery, context: AxisContext): void {
    if (
      !this.#index.holds(
        query.insertion.index,
        query.snapshot,
        context.box,
        context.displacement,
      )
    ) {
      this.invalidate();
    }
  }

  moved(query: AxisQuery, context: AxisContext): void {
    // Taken before the refresh below rewrites the count.
    const held = this.#index.count;

    if (
      !context.displacement ||
      this.#last < 0 ||
      this.#last === query.insertion.index ||
      held === 0
    ) {
      this.invalidate();
      return;
    }

    // Before the refresh rewrites the slots.
    this.#index.retain();
    this.#index.invalidate();
    refresh(
      this.#index,
      query.snapshot,
      query.item,
      context.box,
      context.placeholder,
      context.displacement,
    );
    this.#last = query.insertion.index;

    // Moving the placeholder reorders nothing in the destination view, so
    // slot `i` is the same element on both sides of the write.
    const span = this.#index.count < held ? this.#index.count : held;

    for (let i = 0; i < span; i += 1) {
      const dx = this.#index.retained(i, LEFT) - this.#index.at(i, LEFT);
      const dy = this.#index.retained(i, TOP) - this.#index.at(i, TOP);

      if (dx !== 0 || dy !== 0) {
        context.displacement.report(this.#index.item(i), dx, dy, context.space);
      }
    }
  }

  invalidate(): void {
    this.#last = -1;
    this.#index.invalidate();
  }

  retire(): void {
    this.#last = -1;
    this.#index.retire();
  }
}

/** The axis rule for a wrapping field of items. */
export function xy(): AxisInstaller {
  return () => new XYAxisGeometry();
}
