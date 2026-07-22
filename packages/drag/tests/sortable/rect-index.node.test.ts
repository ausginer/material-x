import { describe, expect, it } from 'vitest';
import type { Point } from '../../src/kernel/types.ts';
import {
  createRectIndex,
  nearestSlot,
  rebuildRectIndex,
} from '../../src/sortable/rect-index.ts';

/** A stand-in element exposing only the rect the index reads. */
const box = (
  label: string,
  left: number,
  top: number,
  right: number,
  bottom: number,
): HTMLElement =>
  ({
    label,
    getBoundingClientRect: () => ({
      left,
      top,
      right,
      bottom,
      width: right - left,
      height: bottom - top,
    }),
  }) as unknown as HTMLElement;

const identity = (item: HTMLElement): HTMLElement => item;

describe('rebuildRectIndex', () => {
  it('should populate one slot per non-dragged item', () => {
    const a = box('a', 0, 0, 10, 10);
    const dragged = box('d', 0, 20, 10, 30);
    const b = box('b', 0, 40, 10, 50);
    const index = createRectIndex();

    rebuildRectIndex(index, [a, dragged, b], dragged, identity);

    expect(index.count).toBe(2);
    expect(index.items).toEqual([a, b]);
  });

  it('should keep destination items in DOM order', () => {
    const a = box('a', 0, 0, 10, 10);
    const b = box('b', 0, 20, 10, 30);
    const c = box('c', 0, 40, 10, 50);
    const index = createRectIndex();

    rebuildRectIndex(index, [a, b, c], b, identity);

    expect(index.items).toEqual([a, c]);
  });

  it('should reuse the buffer and truncate on a smaller collection', () => {
    const items = Array.from({ length: 5 }, (_, i) =>
      box(String(i), 0, i * 10, 10, i * 10 + 10),
    );
    const index = createRectIndex();

    rebuildRectIndex(index, items, items[0]!, identity);
    const buffer = index.values;

    rebuildRectIndex(index, items.slice(0, 3), items[0]!, identity);

    // The 4-slot buffer already fits 2 items, so it is not reallocated, and the
    // stale slots from the larger build are dropped.
    expect(index.values).toBe(buffer);
    expect(index.count).toBe(2);
    expect(index.items).toHaveLength(2);
  });

  it('should grow capacity to the next power of two', () => {
    const items = Array.from({ length: 6 }, (_, i) =>
      box(String(i), 0, i * 10, 10, i * 10 + 10),
    );
    const index = createRectIndex();

    rebuildRectIndex(index, items, items[0]!, identity);

    // Five non-dragged items need at least five slots; capacity rounds up to 8.
    expect(index.capacity).toBe(8);
  });
});

describe('nearestSlot', () => {
  const a = box('a', 0, 0, 10, 10); // centre (5, 5)
  const b = box('b', 0, 100, 10, 110); // centre (5, 105)
  const c = box('c', 0, 200, 10, 210); // centre (5, 205)

  const build = (): ReturnType<typeof createRectIndex> => {
    const index = createRectIndex();
    rebuildRectIndex(index, [a, b, c], b, identity);
    return index;
  };

  it('should return -1 when the anchor slot is nearest', () => {
    const index = build();
    const anchor: Point = { x: 5, y: 105 };
    const pointer: Point = { x: 6, y: 106 };

    // The pointer sits on the anchor's own slot, so no item beats it.
    expect(nearestSlot(index, anchor, pointer)).toBe(-1);
  });

  it('should return the slot whose centre is nearest the pointer', () => {
    const index = build();
    const anchor: Point = { x: 5, y: 105 };
    const pointer: Point = { x: 5, y: 205 };

    // Destination is [a, c]; the pointer is on c's centre, slot 1.
    expect(nearestSlot(index, anchor, pointer)).toBe(1);
  });

  it('should require an item to strictly beat the anchor', () => {
    // A single item centred at (10, 0), the anchor at (0, 0), pointer halfway:
    // both are exactly 25 away, so the incumbent anchor must win the tie.
    const item = box('t', 5, -5, 15, 5); // centre (10, 0)
    const dragged = box('d', 100, 100, 110, 110);
    const index = createRectIndex();
    rebuildRectIndex(index, [item, dragged], dragged, identity);

    const anchor: Point = { x: 0, y: 0 };
    const pointer: Point = { x: 5, y: 0 };

    expect(nearestSlot(index, anchor, pointer)).toBe(-1);
  });
});
