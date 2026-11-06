/** What an axis rule and a displacement sink are, for `y()`, `xy()` and sortable. */
import type { Space } from '@ydinjs/box-quad';
import type { CollectionSnapshot, Insertion } from './domain.ts';
import type { DisplacementSettle } from './rect-index.ts';

/**
 * Reports one element a committed move displaced, with its travel negated. The
 * vector is a viewport quantity, and `space` is what the collection inherits.
 */
export type DisplacementReport = (
  element: HTMLElement,
  dx: number,
  dy: number,
  space: Space,
) => void;

export type DisplacementSink = Readonly<{
  report: DisplacementReport;
  settle: DisplacementSettle;
  retire(): void;
}>;

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
  settle: DisplacementSettle | null;
  /** The space a displaced element's vector is reported in. */
  space: Space;
}>;

export type InsertionGeometry = Readonly<{
  /** A new gap, or `null` when the committed one still wins. */
  resolve(query: AxisQuery, context: AxisContext): Insertion | null;
  /** Staleness only, because scroll calls it many times a second. */
  invalidate(): void;
  /** The committed move landed: keep the cache true and report what moved. */
  moved(
    query: AxisQuery,
    context: AxisContext,
    report: DisplacementReport | null,
  ): void;
  retire(): void;
}>;

export type AxisInstaller = () => InsertionGeometry;
