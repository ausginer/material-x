/**
 * **The rect cache's reader view, which is one field carrying two types.**
 *
 * The class writes elements, reallocates the packed buffer, empties the element
 * array and assigns the count through its own declarations with no cast and no
 * second field; through a binding declared as {@link RectIndexView} every one
 * of those writes is refused. There are no accessors between a read and the
 * field, so **the refusals are the whole of the encapsulation** — a widening of
 * any member here restores nothing and warns nobody, which is why the view owes
 * an instrument rather than a docblock.
 *
 * Both halves are asserted. The refusals alone would be satisfied by a view
 * that had narrowed to nothing, so each is paired with the owner's write
 * compiling against the class, and the member set is pinned in both directions.
 */
import { describe, expectTypeOf, it } from 'vitest';
import type {
  ReadonlyFloat64Array,
  RectIndex,
  RectIndexView,
} from '../../src/sortable/rect-index.ts';

const view = null as unknown as RectIndexView;
const index = null as unknown as RectIndex;
const item = null as unknown as HTMLElement;

describe('the rect index reader view', () => {
  it('should re-declare exactly the four data members', () => {
    // In both directions: a fifth member added to the view is as much a
    // widening of the boundary as a fourth one loosened, and the view carries
    // **no method members**, so the repository's detached-method gate keeps the
    // coverage it had before the accessors were deleted.
    expectTypeOf<keyof RectIndexView>().toEqualTypeOf<
      'values' | 'hole' | 'items' | 'count'
    >();
  });

  it('should refuse a count assignment through the reader', () => {
    // @ts-expect-error: `count` is readonly on the view
    view.count = 0;
  });

  it('should refuse a packed-buffer write through the reader', () => {
    // `readonly` on the field would protect the reference only, so it is the
    // member's **type** that refuses this: an index signature that is readonly
    // rather than a `Float64Array`.
    // @ts-expect-error: `values` carries no writable index signature
    view.values[0] = 1;
  });

  it('should refuse a hole write through the reader', () => {
    // The placeholder's own rect is packed in the same six fields and is
    // reachable by exactly the same route, so it owes its own row.
    // @ts-expect-error: `hole` carries no writable index signature
    view.hole[0] = 1;
  });

  it('should refuse an element-array mutation through the reader', () => {
    // @ts-expect-error: `items` is a `readonly HTMLElement[]`
    view.items.length = 0;
  });

  it('should refuse an element assignment through the reader', () => {
    // Emptying the array and replacing one entry are two different writes and
    // `readonly T[]` is what refuses both.
    // @ts-expect-error: `items` admits no element write
    view.items[0] = item;
  });

  it('should let the owner write all four through its own declarations', () => {
    // **The half that makes the refusals mean something.** Without it a view
    // narrowed to nothing, or a class that had itself gone readonly, would
    // satisfy every row above; the deleted accessors are justified only if the
    // owner still writes with no cast and through no second field.
    index.values = new Float64Array(0);
    index.values[0] = 1;
    index.hole[0] = 1;
    index.items.length = 0;
    index.items[0] = item;
    index.count = 0;
  });

  it('should hand the class’s own buffers to the reader unchanged', () => {
    // One field, two declarations of its type at different sites — not two
    // fields kept in step. The class's `Float64Array` has to satisfy the
    // reader's type, and this is the assignment that says so.
    expectTypeOf<RectIndex['values']>().toExtend<ReadonlyFloat64Array>();
    expectTypeOf<RectIndex['hole']>().toExtend<ReadonlyFloat64Array>();
    expectTypeOf<RectIndex['items']>().toExtend<readonly HTMLElement[]>();
  });
});
