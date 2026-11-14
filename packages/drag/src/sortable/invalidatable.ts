export interface Invalidatable {
  /** Staleness only, because scroll calls it many times a second. */
  invalidate(this: Invalidatable): void;
}
