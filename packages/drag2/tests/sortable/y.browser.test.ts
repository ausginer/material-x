/**
 * The axis rule and its private rect cache, driven directly.
 *
 * The composed suite proves the rule works through real pointer events; this
 * one pins the parts that are invisible from there — when the cache re-measures
 * and when it deliberately does not. A stale-by-design cache is only correct if
 * the invalidation contract is exact, so "did not re-measure" has to be as
 * testable as "did".
 */
import { afterEach, describe, expect, it } from 'vitest';
import type {
  CollectionSnapshot,
  Insertion,
} from '../../src/sortable/domain.ts';
import {
  type FeatureContext,
  type InsertionGeometry,
  unbrandFeature,
} from '../../src/sortable/feature.ts';
import { y } from '../../src/sortable/y.ts';

const ITEM_HEIGHT = 40;

const cleanup: HTMLElement[] = [];

afterEach(() => {
  for (const element of cleanup.splice(0)) {
    element.remove();
  }
});

type Field = Readonly<{
  geometry: InsertionGeometry;
  items: HTMLElement[];
  /** Stands in for the dragged item's slot, and is the incumbent candidate. */
  placeholder: HTMLElement;
  snapshot(
    version?: number,
    items?: readonly HTMLElement[],
  ): CollectionSnapshot;
  resolve(
    pointerY: number,
    snapshot?: CollectionSnapshot,
    getVisual?: ((item: HTMLElement) => HTMLElement) | null,
    live?: () => boolean,
  ): Insertion | null;
}>;

/** The default liveness: a controller nobody destroyed. */
const ALIVE = (): boolean => true;

/**
 * Three 40px boxes from y=0. The dragged item is `items[0]`, out of flow the way
 * the top-layer lift leaves it, with the placeholder holding its box — so the centres
 * are placeholder 20, `items[1]` 60, `items[2]` 100.
 */
function createField(count = 3): Field {
  const root = document.createElement('div');

  root.style.width = '200px';
  document.body.append(root);
  cleanup.push(root);

  const placeholder = document.createElement('div');

  placeholder.style.height = `${ITEM_HEIGHT}px`;
  root.append(placeholder);

  const items: HTMLElement[] = [];

  for (let i = 0; i < count; i += 1) {
    const item = document.createElement('div');

    item.style.display = 'block';
    item.style.height = `${ITEM_HEIGHT}px`;

    if (i > 0) {
      root.append(item);
    }

    items.push(item);
  }

  const geometry = unbrandFeature(y())(
    null as unknown as FeatureContext,
  ).insertion!;

  const field: Field = {
    geometry,
    items,
    placeholder,
    snapshot: (version = 0, list = items) => ({ items: list, version }),
    resolve: (
      pointerY,
      snapshot = field.snapshot(),
      getVisual = null,
      live = ALIVE,
    ) =>
      geometry.resolve(
        { pointerX: 0, pointerY, insertion: null, item: items[0]! },
        { snapshot, placeholder, getVisual, live },
      ),
  };

  return field;
}

describe('y', () => {
  it('should resolve nothing while no item is being dragged', () => {
    // The destination view is the collection minus the dragged item, so without
    // one there is no index space to resolve into.
    const field = createField();

    expect(
      field.geometry.resolve(
        { pointerX: 0, pointerY: 60, insertion: null, item: null },
        {
          snapshot: field.snapshot(),
          placeholder: field.placeholder,
          getVisual: null,
          live: ALIVE,
        },
      ),
    ).toBeNull();
  });

  /**
   * Inset visuals: a 20px absolute child at `top: 20px` inside each attached
   * item, so an item's centre and its visual's centre differ by 10px. The item
   * boxes are untouched, which is what makes the two measurements comparable.
   */
  const insetVisuals = (
    items: readonly HTMLElement[],
  ): ((item: HTMLElement) => HTMLElement) => {
    const visuals = new Map<HTMLElement, HTMLElement>();

    for (const item of items.slice(1)) {
      const inner = document.createElement('div');

      item.style.position = 'relative';
      Object.assign(inner.style, {
        position: 'absolute',
        left: '0',
        right: '0',
        top: '20px',
        height: '20px',
      });
      item.append(inner);
      visuals.set(item, inner);
    }

    return (item) => visuals.get(item) ?? item;
  };

  it('should measure candidate visuals rather than candidate items', () => {
    // Parity D2. Item centres are placeholder 20, items[1] 60, items[2] 100;
    // the inset *visual* centres are 70 and 110. At pointer 42 the two
    // measurements disagree about whether a gap was even crossed: items[1]'s
    // item centre is 18 away and beats the placeholder's 22, while its visual
    // centre is 28 away and loses to it.
    const field = createField();
    const getVisual = insetVisuals(field.items);

    expect(field.resolve(42)?.index).toBe(1);
    expect(field.resolve(42, field.snapshot(1), getVisual)).toBeNull();
  });

  it('should resolve each candidate visual once per rebuild', () => {
    // The resolver is on the geometry hot path now, so "once per candidate per
    // rebuild, and not at all on a warm cache" is a contract and not an
    // implementation detail.
    const field = createField();
    const resolve = insetVisuals(field.items);
    const seen: HTMLElement[] = [];
    const getVisual = (item: HTMLElement): HTMLElement => {
      seen.push(item);
      return resolve(item);
    };

    field.resolve(42, field.snapshot(), getVisual);

    // Two destination candidates, the dragged item excluded.
    expect(seen).toEqual([field.items[1], field.items[2]]);

    // Same version, nothing dirtied: the previous scan stands and the resolver
    // is not consulted again.
    field.resolve(44, field.snapshot(), getVisual);

    expect(seen).toHaveLength(2);
  });

  it('should keep the incumbent gap when its own centre is nearest', () => {
    // The placeholder is a candidate, and that is the entire hysteresis.
    expect(createField().resolve(25)).toBeNull();
  });

  it('should keep the incumbent gap on a tie', () => {
    // Ties go to the incumbent: the search improves strictly or not at all,
    // which is what makes oscillation unreachable rather than merely unlikely.
    expect(createField().resolve(40)).toBeNull();
  });

  it('should take the gap after an item that sits below the placeholder', () => {
    const field = createField();

    expect(field.resolve(55)).toMatchObject({
      index: 1,
      before: field.items[1],
      after: field.items[2],
    });
  });

  it('should take the gap before an item that sits above the placeholder', () => {
    // Same rule from the other side: the gap is on the side the placeholder is
    // travelling from, which on a y axis is a comparison of centres.
    const field = createField();

    field.placeholder.remove();
    field.items[2]!.after(field.placeholder);

    expect(field.resolve(55)).toMatchObject({
      index: 1,
      before: field.items[1],
      after: field.items[2],
    });
  });

  it('should resolve the end gap with a null neighbour', () => {
    const field = createField();

    expect(field.resolve(110)).toMatchObject({
      index: 2,
      before: field.items[2],
      after: null,
    });
  });

  it('should carry the version of the snapshot it measured', () => {
    // Mixed-version arithmetic is invalid downstream, so the version travels
    // with the insertion rather than being reattached by the caller.
    const field = createField();

    expect(field.resolve(55, field.snapshot(4))?.version).toBe(4);
  });

  it('should not re-measure while the cache is clean', () => {
    // The point of the cache: a frame where the pointer merely travels inside
    // the same slot reads no geometry at all.
    const field = createField();

    field.resolve(55);
    field.items[1]!.style.height = '200px';

    expect(field.resolve(55)).toMatchObject({ index: 1 });
  });

  it('should re-measure after an invalidation', () => {
    const field = createField();

    field.resolve(55);
    // Collapsing the first destination item moves the second one up under the
    // pointer, so the gap becomes 2 — but only if the cache actually rebuilt.
    field.items[1]!.style.height = '0px';
    field.geometry.invalidate();

    expect(field.resolve(55)).toMatchObject({ index: 2 });
  });

  it('should re-measure when the collection version moves', () => {
    // A publication is an invalidation in its own right: the behavior does not
    // have to remember to call `invalidate()` as well.
    const field = createField();

    field.resolve(55);
    field.items[1]!.style.height = '0px';

    expect(field.resolve(55, field.snapshot(1))).toMatchObject({ index: 2 });
  });

  it('should re-measure after retirement', () => {
    const field = createField();

    field.resolve(55);
    field.items[1]!.style.height = '0px';
    field.geometry.retire();

    expect(field.resolve(55)).toMatchObject({ index: 2 });
  });

  it('should not name an item a shrunken collection dropped', () => {
    // The parallel element array is truncated on rebuild, so a larger previous
    // measurement cannot leak an element into a neighbour lookup.
    const field = createField();

    field.resolve(110);

    const shrunk = field.snapshot(1, [field.items[0]!, field.items[1]!]);

    expect(field.resolve(110, shrunk)).toMatchObject({
      index: 1,
      before: field.items[1],
      after: null,
    });
  });
});

describe('the terminal barrier in the candidate loop', () => {
  /**
   * I-36, at the level only a direct drive can reach. `RectIndex.refresh` calls
   * the consumer's `visual()` resolver once per candidate, and a resolver is
   * allowed to call `controller.destroy()` — which runs teardown to completion
   * synchronously and returns into the middle of the loop.
   *
   * The check lives in `rect-index.ts`, but the **threading** is per axis, so
   * both sibling suites pin it: a future axis can forget to pass `live`.
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
    const field = createField(4);
    const asked: HTMLElement[] = [];
    let alive = true;
    const getVisual = closingAt(field.items[2]!, asked, () => {
      alive = false;
    });

    // Three destination candidates; the second one destroys.
    expect(
      field.resolve(55, field.snapshot(), getVisual, () => alive),
    ).toBeNull();

    // `items[3]` is never resolved: no consumer callback crosses the terminal
    // barrier, and no geometry is read after it either.
    expect(asked).toEqual([field.items[1], field.items[2]]);
  });

  it('should leave the cache retired rather than clean and partial', () => {
    // The half a `break` gets wrong. `destroy()` has already run `retire()` on
    // this cache; falling through to the trailing bookkeeping would mark a
    // half-filled index clean at the snapshot's own version, so the **same**
    // version below would find it warm, skip the rebuild and keep pinning the
    // rows of a destroyed controller (I-20).
    const field = createField(4);
    const asked: HTMLElement[] = [];
    let alive = true;

    field.resolve(
      55,
      field.snapshot(),
      closingAt(field.items[2]!, asked, () => {
        alive = false;
      }),
      () => alive,
    );

    asked.length = 0;

    // Same version, nothing invalidated: only a cache left dirty at
    // `measured === -1` rebuilds, and only an emptied one asks for all three.
    field.resolve(55, field.snapshot(), (item) => {
      asked.push(item);
      return item;
    });

    expect(asked).toEqual([field.items[1], field.items[2], field.items[3]]);
  });
});
