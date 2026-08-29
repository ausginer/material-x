/**
 * The two-dimensional axis rule, driven directly.
 *
 * `y.browser.test.ts` is the model for this file, and the split is the point:
 * two rules, two suites, one shared cache whose invalidation contract is
 * asserted in both. What is tested *here* is only what is different — the metric
 * and the gap-side derivation — because everything else is `rect-index.ts` and
 * is already pinned next door.
 *
 * ## The field
 *
 * A 2×2 grid of 100×40 boxes, laid out absolutely so the geometry is exact and
 * independent of flow:
 *
 * ```text
 *   (0,0)      (120,0)          centres: P (50,20)   1 (170,20)
 *   [   P   ]  [   1   ]                 2 (50,80)   3 (170,80)
 *   (0,60)     (120,60)
 *   [   2   ]  [   3   ]
 * ```
 *
 * `P` is the placeholder, standing in for the dragged item's slot, and it is the
 * incumbent candidate — the same hysteresis `y()` has. Destination slots are
 * `[1, 2, 3]`, so slot indices are 0, 1, 2.
 */
import { afterEach, describe, expect, it } from 'vitest';
import type {
  CollectionSnapshot,
  Insertion,
} from '../../src/sortable/domain.ts';
import type {
  SortableFeatureContext,
  InsertionGeometry,
} from '../../src/sortable/feature.ts';
import { xy } from '../../src/sortable/xy.ts';
import { y } from '../../src/sortable/y.ts';
import {
  type ReorderRequest,
  ReorderResolution,
  type SortableController,
  sortable,
} from '../../src/sortable.ts';

const CELL_W = 100;
const CELL_H = 40;
const GAP_X = 20;
const GAP_Y = 20;

const cleanup: HTMLElement[] = [];

afterEach(() => {
  for (const element of cleanup.splice(0)) {
    element.remove();
  }
});

type Field = Readonly<{
  geometry: InsertionGeometry;
  /** The three destination cells, in DOM order. */
  items: HTMLElement[];
  /** The lifted member of the collection. Never inserted. */
  dragged: HTMLElement;
  placeholder: HTMLElement;
  snapshot(
    version?: number,
    items?: readonly HTMLElement[],
  ): CollectionSnapshot;
  resolve(
    x: number,
    y: number,
    snapshot?: CollectionSnapshot,
    getBox?: ((item: HTMLElement) => HTMLElement) | null,
    live?: () => boolean,
  ): Insertion | null;
}>;

/** The default liveness: a controller nobody destroyed. */
const ALIVE = (): boolean => true;

/**
 * The placeholder occupies cell `slot`; the other three cells are the
 * destination view, in grid **and** DOM order — which is what makes the
 * `compareDocumentPosition` derivation meaningful rather than accidental.
 *
 * The dragged element is created but **never inserted**, the way the top-layer
 * lift leaves it: it is a member of the snapshot, the index skips it, and the
 * placeholder holds its box.
 */
function createField(slot = 0): Field {
  const root = document.createElement('div');

  Object.assign(root.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    width: '300px',
    height: '150px',
  });
  document.body.append(root);
  cleanup.push(root);

  const cell = (i: number, attach: boolean): HTMLElement => {
    const element = document.createElement('div');

    Object.assign(element.style, {
      position: 'absolute',
      width: `${CELL_W}px`,
      height: `${CELL_H}px`,
      left: `${(i % 2) * (CELL_W + GAP_X)}px`,
      top: `${Math.floor(i / 2) * (CELL_H + GAP_Y)}px`,
    });

    if (attach) {
      root.append(element);
    }

    return element;
  };

  const dragged = cell(slot, false);
  const items: HTMLElement[] = [];
  let placeholder!: HTMLElement;

  // Appended in grid order, so the placeholder lands at its own grid position
  // in the document too.
  for (let i = 0; i < 4; i += 1) {
    if (i === slot) {
      placeholder = cell(i, true);
    } else {
      items.push(cell(i, true));
    }
  }

  const geometry = xy()(null as unknown as SortableFeatureContext).insertion;

  // The snapshot is the whole collection, dragged member included, in grid
  // order. The index skips the dragged one, so destination slots are `items`.
  const collection = [...items];

  collection.splice(slot, 0, dragged);

  const field: Field = {
    geometry,
    items,
    dragged,
    placeholder,
    snapshot: (version = 0, list = collection) => ({ items: list, version }),
    resolve: (x, y, snapshot = field.snapshot(), getBox = null, live = ALIVE) =>
      geometry.resolve(
        { pointerX: x, pointerY: y, insertion: null, item: dragged },
        {
          snapshot,
          placeholder,
          box: getBox,
          live,
          insertion: null,
          contribution: null,
        },
      ),
  };

  return field;
}

describe('xy', () => {
  it('should resolve nothing while no item is being dragged', () => {
    const field = createField();

    expect(
      field.geometry.resolve(
        { pointerX: 50, pointerY: 20, insertion: null, item: null },
        {
          snapshot: field.snapshot(),
          placeholder: field.placeholder,
          box: null,
          live: ALIVE,
          insertion: null,
          contribution: null,
        },
      ),
    ).toBeNull();
  });

  it('should keep the incumbent gap when its own centre is nearest', () => {
    // The placeholder is a candidate, and that is the entire hysteresis: a new
    // gap is proposed only once another cell's centre is genuinely closer.
    const field = createField();

    expect(field.resolve(50, 20)).toBeNull();
  });

  it('should measure candidate visuals rather than candidate items', () => {
    // Parity D2, the two-dimensional mirror of `y()`'s case. A 60x40 visual
    // pinned to each cell's left edge puts its centre 20px left of the cell's,
    // so cell 1's centre moves from (170, 20) to (150, 20).
    const field = createField();
    const visuals = new Map<HTMLElement, HTMLElement>();

    for (const item of field.items) {
      const inner = document.createElement('div');

      Object.assign(inner.style, {
        position: 'absolute',
        left: '0',
        top: '0',
        width: '60px',
        height: `${CELL_H}px`,
      });
      item.append(inner);
      visuals.set(item, inner);
    }

    const getBox = (item: HTMLElement): HTMLElement =>
      visuals.get(item) ?? item;

    // At (105, 20) the pointer has not yet passed the midpoint between the
    // placeholder's centre and cell 1's *item* centre, so an item-measured scan
    // holds the incumbent. Cell 1's *visual* centre is already the nearest, so
    // a visual-measured scan proposes the gap on its far side.
    expect(field.resolve(105, 20)).toBeNull();
    expect(field.resolve(105, 20, field.snapshot(1), getBox)?.index).toBe(1);
  });

  it('should choose the nearest cell across both axes', () => {
    // The row that `y()` cannot express. The pointer sits at the same Y as the
    // placeholder — so a one-dimensional rule sees *no* candidate closer than
    // the incumbent and holds — but far to the right, where cell 1's centre is.
    const field = createField();

    // Cell 1's centre is (170, 20). A Y-only metric measures |20 - 20| = 0 for
    // every cell in that row and never beats the incumbent's own 0, so it would
    // hold the incumbent gap and answer `null`.
    //
    // Cell 1 follows the placeholder in the document, so the gap is on its far
    // side: destination index 1, between cell 1 and cell 2.
    expect(field.resolve(170, 20)?.index).toBe(1);
  });

  it('should let the X term decide between two cells at the same Y', () => {
    const field = createField();

    // Just past the midpoint between the placeholder (50) and cell 1 (170).
    expect(field.resolve(115, 20)?.index).toBe(1);
    // Just short of it, the incumbent still wins.
    expect(field.resolve(105, 20)).toBeNull();
  });

  it('should let the Y term decide between two cells at the same X', () => {
    const field = createField();

    // Cell 2's centre is (50, 80): the same column, the row below. It follows
    // the placeholder, so the gap is past it — destination index 2.
    expect(field.resolve(50, 80)?.index).toBe(2);
  });

  it('should derive the gap from DOM order, not from a coordinate', () => {
    // The second thing that differs from `y()`. With the placeholder in the last
    // cell, the nearest candidate *precedes* it in the document, so the gap is
    // on the near side — `nearest`, not `nearest + 1`. A rule that compared
    // centres would have to pick an axis to compare on, and a candidate up and
    // to the left has no unambiguous side.
    const field = createField(3);

    // Placeholder at cell 3 (170, 80), so the destination view is cells 0, 1, 2
    // and the placeholder is **last** in the document. Cell 2 sits at (50, 80)
    // — same row, to the left, and earlier in the document — so the gap is on
    // the *near* side: index 2, not 3.
    const insertion = field.resolve(50, 80);

    expect(insertion?.index).toBe(2);
    expect(insertion?.before).toBe(field.items[1]);
    expect(insertion?.after).toBe(field.items[2]);
  });

  it('should carry the destination neighbours and the snapshot version', () => {
    const field = createField();
    const insertion = field.resolve(170, 20)!;

    expect(insertion.version).toBe(0);
    expect(insertion.index).toBe(1);
    expect(insertion.before).toBe(field.items[0]);
    expect(insertion.after).toBe(field.items[1]);
  });

  it('should re-measure when the collection version moves', () => {
    // The shared cache's contract, asserted through this rule as well: a new
    // version is a new scan even when nothing was invalidated.
    const field = createField();

    expect(field.resolve(170, 20)?.index).toBe(1);

    // Cell 1 moves far off to the right, so the nearest candidate to (170, 20)
    // becomes cell 3 in the row below — a different gap. A cache keyed on the
    // old version would still answer from the old geometry.
    field.items[0]!.style.left = '1000px';

    expect(field.resolve(170, 20, field.snapshot(1))?.index).toBe(3);
  });

  it('should not re-measure while nothing invalidated it', () => {
    // The other half, and the one only a direct test can see: geometry moving
    // under a stale cache must *not* change the answer until something says so.
    const field = createField();

    expect(field.resolve(170, 20)?.index).toBe(1);

    field.items[0]!.style.left = '1000px';

    // Same version, no `invalidate()`: the previous scan still stands, and the
    // rule still believes cell 1 is where it was.
    expect(field.resolve(170, 20)?.index).toBe(1);

    field.geometry.invalidate();

    // Now it re-measures and cell 3 is the nearest candidate instead.
    expect(field.resolve(170, 20)?.index).toBe(3);
  });

  it('should drop its element references at retire', () => {
    const field = createField();

    expect(field.resolve(170, 20)?.index).toBe(1);

    field.geometry.retire();

    // Nothing measured, so nothing can beat the incumbent — and no element from
    // the previous operation is still reachable from the index.
    expect(
      field.resolve(170, 20, field.snapshot(0, [field.dragged])),
    ).toBeNull();
  });
});

describe('the composed two-dimensional collection', () => {
  it('should reorder across a row from real pointer events', async () => {
    // The rule through the public entrypoint, on the shape it exists for: a
    // wrapping field where the destination is sideways, not below. The composed
    // `y()` suite cannot express this drag at all.
    //
    // **A flow layout, deliberately.** The direct-drive fixtures above position
    // cells absolutely so the geometry is exact, which is right for a single
    // `resolve` call — but it makes the placeholder inert: moving it in the
    // document moves nothing on screen, so the incumbent never catches up with
    // the pointer and the rule oscillates between two gaps. In a real wrapping
    // grid the committed move reflows the field and the placeholder *becomes*
    // the slot under the pointer, which is the whole hysteresis.
    const root = document.createElement('div');

    Object.assign(root.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      display: 'flex',
      flexWrap: 'wrap',
      // Exactly two 100px cells with a 20px gutter per row.
      width: `${CELL_W * 2 + GAP_X}px`,
      gap: `${GAP_Y}px ${GAP_X}px`,
    });
    document.body.append(root);
    cleanup.push(root);

    const items: HTMLElement[] = [];

    for (let i = 0; i < 4; i += 1) {
      const item = document.createElement('div');

      Object.assign(item.style, {
        width: `${CELL_W}px`,
        height: `${CELL_H}px`,
      });
      root.append(item);
      items.push(item);
    }

    const requests: ReorderRequest[] = [];
    const controller = sortable(root, {
      items: () => items,
      axis: xy(),
      onReorder(request) {
        requests.push(request);
        return ReorderResolution.accept();
      },
    });

    root.setPointerCapture = (): void => {};
    root.releasePointerCapture = (): void => {};
    cleanup.push({ remove: () => void controller.destroy() } as HTMLElement);

    const pointer = (type: string, x: number, y: number): void => {
      const target = type === 'pointerdown' ? items[0]! : document;

      target.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          composed: true,
          cancelable: true,
          pointerId: 77,
          isPrimary: true,
          button: 0,
          buttons: 1,
          clientX: x,
          clientY: y,
        }),
      );
    };

    const frame = (): Promise<void> =>
      new Promise((resolve) => {
        requestAnimationFrame(() => {
          resolve();
        });
      });

    // Grab cell 0 and carry it **sideways** onto cell 1's centre. A vertical
    // rule sees no Y travel at all and proposes nothing.
    pointer('pointerdown', 50, 20);
    pointer('pointermove', 70, 20);
    pointer('pointermove', 170, 20);
    await frame();
    pointer('pointerup', 170, 20);

    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ from: 0, to: 1 });
  });

  it('should propose nothing for the same drag under the y rule', async () => {
    // The control, and the reason `xy()` is a separate rule rather than a
    // parameter: the identical sideways drag under `y()` never leaves the
    // incumbent gap, because every candidate in the row shares the pointer's Y.
    const root = document.createElement('div');

    Object.assign(root.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      display: 'flex',
      flexWrap: 'wrap',
      width: `${CELL_W * 2 + GAP_X}px`,
      gap: `${GAP_Y}px ${GAP_X}px`,
    });
    document.body.append(root);
    cleanup.push(root);

    const items: HTMLElement[] = [];

    for (let i = 0; i < 4; i += 1) {
      const item = document.createElement('div');

      Object.assign(item.style, {
        width: `${CELL_W}px`,
        height: `${CELL_H}px`,
      });
      root.append(item);
      items.push(item);
    }

    const requests: ReorderRequest[] = [];
    const controller = sortable(root, {
      items: () => items,
      axis: y(),
      onReorder(request) {
        requests.push(request);
        return ReorderResolution.accept();
      },
    });

    root.setPointerCapture = (): void => {};
    root.releasePointerCapture = (): void => {};
    cleanup.push({ remove: () => void controller.destroy() } as HTMLElement);

    const pointer = (type: string, x: number, y2: number): void => {
      const target = type === 'pointerdown' ? items[0]! : document;

      target.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          composed: true,
          cancelable: true,
          pointerId: 78,
          isPrimary: true,
          button: 0,
          buttons: 1,
          clientX: x,
          clientY: y2,
        }),
      );
    };

    pointer('pointerdown', 50, 20);
    pointer('pointermove', 70, 20);
    pointer('pointermove', 170, 20);
    await new Promise((resolve) => {
      requestAnimationFrame(() => {
        resolve(null);
      });
    });
    pointer('pointerup', 170, 20);

    // A proven no-op: `from === to`, so no round-trip runs at all.
    expect(requests).toEqual([]);
  });
});

describe('the terminal barrier in the candidate loop', () => {
  /**
   * I-36. The check lives in `rect-index.ts`, shared by both axes, but the
   * **threading** is per axis — `xy()` has to hand `live` to `refresh` exactly
   * as `y()` does, and a future axis can forget to. So this group mirrors
   * `y.browser.test.ts`'s, deliberately, rather than trusting the shared cache.
   */
  const closingAt =
    (
      target: HTMLElement,
      asked: HTMLElement[],
      close: () => void,
    ): ((item: HTMLElement) => HTMLElement) =>
    (item) => {
      asked.push(item);

      if (item === target) {
        close();
      }

      return item;
    };

  it('should stop resolving candidates once the controller closes', () => {
    const field = createField();
    const asked: HTMLElement[] = [];
    let alive = true;
    const getBox = closingAt(field.items[1]!, asked, () => {
      alive = false;
    });

    expect(
      field.resolve(170, 20, field.snapshot(), getBox, () => alive),
    ).toBeNull();

    // The third cell is never resolved: no `visual()` call crosses the terminal
    // barrier. The other half — that no geometry is read after it either — is a
    // separate concern and is asserted below.
    expect(asked).toEqual([field.items[0], field.items[1]]);
  });

  it('should read no placeholder geometry once the controller closes', () => {
    // Mirrors `y.browser.test.ts`, and for the same reason the resolver-list
    // assertion is mirrored: the barrier is shared but the threading is per
    // axis. The placeholder is consumer-owned, so measuring it after the close
    // is an indirect consumer call (I-36).
    const field = createField();
    const asked: HTMLElement[] = [];
    let alive = true;
    let measured = 0;
    const { placeholder } = field;
    const native = placeholder.getBoundingClientRect.bind(placeholder);

    placeholder.getBoundingClientRect = (): DOMRect => {
      measured += 1;

      return native();
    };

    expect(
      field.resolve(
        170,
        20,
        field.snapshot(),
        closingAt(field.items[1]!, asked, () => {
          alive = false;
        }),
        () => alive,
      ),
    ).toBeNull();

    expect(measured).toBe(0);
  });

  it('should leave the cache retired rather than clean and partial', () => {
    // The half a `break` gets wrong; see `y.browser.test.ts` for the reasoning.
    const field = createField();
    const asked: HTMLElement[] = [];
    let alive = true;

    field.resolve(
      170,
      20,
      field.snapshot(),
      closingAt(field.items[1]!, asked, () => {
        alive = false;
      }),
      () => alive,
    );

    asked.length = 0;

    field.resolve(170, 20, field.snapshot(), (item) => {
      asked.push(item);
      return item;
    });

    expect(asked).toEqual([field.items[0], field.items[1], field.items[2]]);
  });

  it('should stop the traversal of a composed drag at the destroying candidate', async () => {
    // The same rule through real pointer input, on the two-dimensional rule's
    // own field. **The assertion is the resolver's call list, not the resulting
    // insertion**: the frame is discarded upstream either way, so a state
    // assertion would pass against unfixed source.
    const root = document.createElement('div');

    Object.assign(root.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      display: 'flex',
      flexWrap: 'wrap',
      width: `${CELL_W * 2 + GAP_X}px`,
      gap: `${GAP_Y}px ${GAP_X}px`,
    });
    document.body.append(root);
    cleanup.push(root);

    const items: HTMLElement[] = [];

    for (let i = 0; i < 4; i += 1) {
      const item = document.createElement('div');

      Object.assign(item.style, {
        width: `${CELL_W}px`,
        height: `${CELL_H}px`,
      });
      root.append(item);
      items.push(item);
    }

    const asked: HTMLElement[] = [];
    let controller: SortableController | null = null;

    controller = sortable(root, {
      items: () => items,
      axis: xy(),
      visual: (item) => {
        asked.push(item);

        // The **first** candidate destroys. `items[0]` is the dragged one and
        // was resolved at admission, before any candidate.
        if (item === items[1]) {
          void controller!.destroy();
        }

        return item;
      },
      onReorder: () => ReorderResolution.accept(),
    });

    root.setPointerCapture = (): void => {};
    root.releasePointerCapture = (): void => {};
    cleanup.push({ remove: () => void controller.destroy() } as HTMLElement);

    const pointer = (type: string, x: number, y2: number): void => {
      const target = type === 'pointerdown' ? items[0]! : document;

      target.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          composed: true,
          cancelable: true,
          pointerId: 79,
          isPrimary: true,
          button: 0,
          buttons: 1,
          clientX: x,
          clientY: y2,
        }),
      );
    };

    pointer('pointerdown', 50, 20);
    pointer('pointermove', 70, 20);
    pointer('pointermove', 170, 20);
    await new Promise((resolve) => {
      requestAnimationFrame(() => {
        resolve(null);
      });
    });

    expect(asked).toEqual([items[0], items[1]]);
  });
});

/**
 * I-36's **indirect-invocation clause**, mirrored from `y.browser.test.ts` and
 * extended by the one call `y()` does not make (C4-01).
 *
 * The discriminating candidate is the **last** one, for the reason written up
 * next door: an earlier candidate's destroy was already caught by the next
 * iteration's reading, while the last one fell through to the trailing
 * bookkeeping and to the placeholder read.
 *
 * `xy()` also touches the consumer-owned placeholder **twice** per resolution —
 * the anchor rect, then `compareDocumentPosition` to decide which side the gap
 * sits on — where `y()` derives the side from two centres it has already
 * measured. So this axis owns a barrier its sibling does not need.
 */
describe('the terminal barrier on candidate geometry', () => {
  const measuringAt = (
    elements: readonly HTMLElement[],
    target: HTMLElement,
    measured: HTMLElement[],
    close: () => void,
  ): void => {
    for (const element of elements) {
      const native = element.getBoundingClientRect.bind(element);

      element.getBoundingClientRect = (): DOMRect => {
        measured.push(element);

        if (element === target) {
          close();
        }

        return native();
      };
    }
  };

  it('should read no placeholder geometry once the last candidate closed the controller', () => {
    // No `visual()` composed: the cell is its own visual, so the geometry read
    // is the only consumer call in the loop — and it is still one.
    const field = createField();
    const measured: HTMLElement[] = [];
    let alive = true;
    let anchorReads = 0;
    const { placeholder } = field;
    const native = placeholder.getBoundingClientRect.bind(placeholder);

    placeholder.getBoundingClientRect = (): DOMRect => {
      anchorReads += 1;

      return native();
    };
    measuringAt(field.items, field.items[2]!, measured, () => {
      alive = false;
    });

    expect(
      field.resolve(170, 20, field.snapshot(), null, () => alive),
    ).toBeNull();

    expect(anchorReads).toBe(0);
  });

  it('should leave the cache retired after the last candidate closed the controller', () => {
    const field = createField();
    const measured: HTMLElement[] = [];
    let alive = true;

    measuringAt(field.items, field.items[2]!, measured, () => {
      alive = false;
    });
    field.resolve(170, 20, field.snapshot(), null, () => alive);

    const asked: HTMLElement[] = [];

    field.resolve(170, 20, field.snapshot(), (item) => {
      asked.push(item);
      return item;
    });

    expect(asked).toEqual([field.items[0], field.items[1], field.items[2]]);
  });

  it('should resolve no further visual once a candidate closed the controller', () => {
    const field = createField();
    const measured: HTMLElement[] = [];
    const asked: HTMLElement[] = [];
    let alive = true;

    measuringAt(field.items, field.items[0]!, measured, () => {
      alive = false;
    });

    field.resolve(
      170,
      20,
      field.snapshot(),
      (item) => {
        asked.push(item);
        return item;
      },
      () => alive,
    );

    expect(asked).toEqual([field.items[0]]);
  });

  it('should call no resolver at all when the controller is already closed', () => {
    // The entry barrier: a dirty cache can be entered on a controller a
    // `beforeMove` hook already destroyed.
    const field = createField();
    const asked: HTMLElement[] = [];

    expect(
      field.resolve(
        170,
        20,
        field.snapshot(),
        (item) => {
          asked.push(item);
          return item;
        },
        () => false,
      ),
    ).toBeNull();

    expect(asked).toEqual([]);
  });

  it('should not compare document position once the anchor read closed the controller', () => {
    // The barrier `y()` has no counterpart for. The anchor rect above is a
    // consumer call on a consumer-owned element; `compareDocumentPosition`
    // below is a second one on the same element, and it runs only on a frame
    // that proposes a gap change — which this one does.
    const field = createField();
    let alive = true;
    let compares = 0;
    const { placeholder } = field;
    const nativeRect = placeholder.getBoundingClientRect.bind(placeholder);
    const nativeCompare = placeholder.compareDocumentPosition.bind(placeholder);

    placeholder.getBoundingClientRect = (): DOMRect => {
      alive = false;

      return nativeRect();
    };
    placeholder.compareDocumentPosition = (node: Node): number => {
      compares += 1;

      return nativeCompare(node);
    };

    expect(
      field.resolve(170, 20, field.snapshot(), null, () => alive),
    ).toBeNull();

    expect(compares).toBe(0);
  });
});
