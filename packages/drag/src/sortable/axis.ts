/** What an axis rule and a displacement sink are, for `y()`, `xy()` and sortable. */
import type { Space } from '@ydinjs/box-quad';
import type { CollectionSnapshot, Insertion } from './domain.ts';

/**
 * Receives what committed moves displaced, and answers what each displaced element
 * carries. Its members are always called on the sink, so they may read `this`.
 */
export interface DisplacementSink {
  /**
   * Reports one element a committed move displaced, with its travel negated. The
   * vector is a viewport quantity, and `space` is what the collection inherits.
   */
  report(element: HTMLElement, dx: number, dy: number, space: Space): void;
  /**
   * Whether a running animation currently displaces `element`. When it does, `dx`
   * and `dy` hold what it carries, in viewport units, until the next call. A
   * measurement subtracts them to get settled geometry. It computes the answer from
   * animation timing and reads no layout. So no animation is cancelled for a
   * rebuild, and a row never jumps back.
   */
  displaced(element: HTMLElement): boolean;
  readonly dx: number;
  readonly dy: number;
  retire(this: DisplacementSink): void;
}

export type DisplacementInstaller = () => DisplacementSink;

/** Operation state an axis rule reads. */
export type AxisQuery = Readonly<{
  pointerX: number;
  pointerY: number;
  snapshot: CollectionSnapshot;
  /** The committed gap: where the placeholder is. */
  insertion: Insertion;
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
  invalidate(this: InsertionGeometry): void;
  /**
   * Before a pointer drop's resolution: measures one cached slot again, and calls
   * `invalidate` when it moved. A scroll whose event has not arrived yet moves every
   * row, and the drop has no later frame to correct it.
   */
  confirm(query: AxisQuery, context: AxisContext): void;
  /** The committed move landed: keep the cache true and report what moved. */
  moved(query: AxisQuery, context: AxisContext): void;
  retire(this: InsertionGeometry): void;
}

export type AxisInstaller = () => InsertionGeometry;
