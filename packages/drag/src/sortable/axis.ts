/** What an axis rule and a displacement sink are, for `y()`, `xy()` and sortable. */
import type { Space } from '@ydinjs/box-quad';
import type { CollectionSnapshot, Insertion } from './domain.ts';

/**
 * Receives what committed moves displaced, and settles the geometry an axis
 * measures. Its members are always called on the sink, so they may read `this`.
 */
export interface DisplacementSink {
  /**
   * Reports one element a committed move displaced, with its travel negated. The
   * vector is a viewport quantity, and `space` is what the collection inherits.
   */
  report(element: HTMLElement, dx: number, dy: number, space: Space): void;
  /**
   * Turns the buffer an axis has just measured into settled geometry, by
   * subtracting what the sink currently holds for each element in the first
   * `count` slots. It computes the answer from animation timing and reads no
   * layout. So no animation is cancelled for a rebuild, and a row never jumps
   * back.
   */
  settle(
    values: Float64Array,
    items: readonly HTMLElement[],
    count: number,
  ): void;
  retire(): void;
}

export type DisplacementInstaller = () => DisplacementSink;

/** Operation state an axis rule reads. */
export type AxisQuery = Readonly<{
  pointerX: number;
  pointerY: number;
  snapshot: CollectionSnapshot;
  /** The committed gap: where the placeholder is. */
  insertion: Insertion | null;
  /** Excluded from the candidates, whose center would otherwise always win. */
  item: HTMLElement;
}>;

export type AxisContext = Readonly<{
  placeholder: HTMLElement;
  /** The geometry source, or `null` to measure each candidate itself. */
  box: ((item: HTMLElement) => HTMLElement) | null;
  /** The composed sink, or `null` with no displacement. */
  displacement: DisplacementSink | null;
  /** The space a displaced element's vector is reported in. */
  space: Space;
}>;

export interface InsertionGeometry {
  /** A new gap, or `null` when the committed one still wins. */
  resolve(query: AxisQuery, context: AxisContext): Insertion | null;
  /** Staleness only, because scroll calls it many times a second. */
  invalidate(): void;
  /** The committed move landed: keep the cache true and report what moved. */
  moved(query: AxisQuery, context: AxisContext): void;
  retire(): void;
}

export type AxisInstaller = () => InsertionGeometry;
