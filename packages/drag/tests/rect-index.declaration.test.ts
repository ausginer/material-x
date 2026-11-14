/**
 * `drag:DRD-62`: the field and axis parameters of `RectIndex` and
 * `RetainingRectIndex` accept only their constants. Checked by `tsc`, with no run.
 */
import { describe, it } from 'vitest';
import {
  BOTTOM,
  CENTER_X,
  CENTER_Y,
  LEFT,
  RectIndex,
  RetainingRectIndex,
  RIGHT,
  STRIDE,
  TOP,
} from '../src/sortable/rect-index.ts';

/** A field the compiler knows only as a number. */
const unknownField: number = LEFT;

describe('RectIndex fields', () => {
  it("should accept only the six geometry fields as at's field", () => {
    const index = new RectIndex();

    index.at(0, LEFT);
    index.at(0, TOP);
    index.at(0, RIGHT);
    index.at(0, BOTTOM);
    index.at(0, CENTER_X);
    index.at(0, CENTER_Y);
    // @ts-expect-error `STRIDE` is a slot's length, not a field.
    index.at(0, STRIDE);
    // @ts-expect-error A number may be any field or none.
    index.at(0, unknownField);
  });

  it("should accept only LEFT or TOP as retained's field", () => {
    const index = new RetainingRectIndex();

    index.retained(0, LEFT);
    index.retained(0, TOP);
    // @ts-expect-error `RIGHT` is not retained.
    index.retained(0, RIGHT);
    // @ts-expect-error A number may be any field or none.
    index.retained(0, unknownField);
  });

  it("should accept only LEFT or TOP as the constructor's axis", () => {
    const indexes: RectIndex[] = [];

    indexes.push(new RectIndex());
    indexes.push(new RectIndex(LEFT));
    indexes.push(new RectIndex(TOP));
    // @ts-expect-error `RIGHT` is not the near edge of an axis.
    indexes.push(new RectIndex(RIGHT));
    // @ts-expect-error A number may be any field or none.
    indexes.push(new RectIndex(unknownField));
  });
});
