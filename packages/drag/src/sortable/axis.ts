/** What an axis rule and a displacement sink are, for `y()`, `xy()` and sortable. */
import type { Space } from '@ydinjs/box-quad';
import type {
  CollectionSnapshot,
  Insertion,
  ReorderRequest,
} from './domain.ts';
import type { Invalidatable } from './invalidatable.ts';
import type { Retirable } from './retirable.ts';

/**
 * Receives what committed moves displaced, and answers what each displaced element
 * carries. Its members are always called on the sink, so they may read `this`.
 */
export interface DisplacementSink extends Retirable {
  readonly dx: number;
  readonly dy: number;
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
  /**
   * Moves the placeholder into `insertion` where no resolution measured the move,
   * and reports each of `rows` that it displaced. It reads the rows before and
   * after its write: every row, or, when `isLinear`, those it crosses. With a
   * `request`, the consumer may have moved the rows around the placeholder since the
   * drop, and the rows are read from the request's gap.
   */
  relocate(
    rows: readonly HTMLElement[],
    isLinear: boolean,
    insertion: Insertion,
    context: AxisContext,
    request: ReorderRequest | null,
  ): void;
  /** Ends the animation that displaces `element`, if any. */
  release(element: HTMLElement): void;
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
  box?: ((item: HTMLElement) => HTMLElement) | null;
  /** The composed sink, or `null` with no displacement. */
  displacement?: DisplacementSink | null;
  /** The space a displaced element's vector is reported in. */
  space: Space;
}>;

export interface InsertionGeometry extends Invalidatable, Retirable {
  /** Whether a placeholder move displaces only the rows it crosses. */
  readonly isLinear: boolean;
  /** A new gap, or `null` when the committed one still wins. */
  resolve(query: AxisQuery, context: AxisContext): Insertion | null;
  /**
   * Before a pointer drop's resolution: measures one cached slot again, and calls
   * `invalidate` when it moved. A scroll whose event has not arrived yet moves every
   * row, and the drop has no later frame to correct it.
   */
  confirm(query: AxisQuery, context: AxisContext): void;
  /** The committed move landed: keep the cache true and report what moved. */
  moved(query: AxisQuery, context: AxisContext): void;
}

export type AxisInstaller = () => InsertionGeometry;
