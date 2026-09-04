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
import type {
  SortableFeatureContext,
  InsertionGeometry,
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
    getBox?: ((item: HTMLElement) => HTMLElement) | null,
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

  // The axis slot **is** the installer now (D-45): `y()` returns a partial
  // config, and the installer is called with a context the geometry never
  // dereferences at construction.
  const geometry = y()(null as unknown as SortableFeatureContext).insertion;

  const field: Field = {
    geometry,
    items,
    placeholder,
    snapshot: (version = 0, list = items) => ({ items: list, version }),
    resolve: (
      pointerY,
      snapshot = field.snapshot(),
      getBox = null,
      live = ALIVE,
    ) =>
      geometry.resolve(
        { pointerX: 0, pointerY, insertion: null, item: items[0]! },
        {
          snapshot,
          placeholder,
          box: getBox,
          live,
          insertion: null,
          settle: null,
          space: null,
        },
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
          box: null,
          live: ALIVE,
          insertion: null,
          settle: null,
          space: null,
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
    const getBox = insetVisuals(field.items);

    expect(field.resolve(42)?.index).toBe(1);
    expect(field.resolve(42, field.snapshot(1), getBox)).toBeNull();
  });

  it('should resolve each candidate visual once per rebuild', () => {
    // The resolver is on the geometry hot path now, so "once per candidate per
    // rebuild, and not at all on a warm cache" is a contract and not an
    // implementation detail.
    const field = createField();
    const resolve = insetVisuals(field.items);
    const seen: HTMLElement[] = [];
    const getBox = (item: HTMLElement): HTMLElement => {
      seen.push(item);
      return resolve(item);
    };

    field.resolve(42, field.snapshot(), getBox);

    // Two destination candidates, the dragged item excluded.
    expect(seen).toEqual([field.items[1], field.items[2]]);

    // Same version, nothing dirtied: the previous scan stands and the resolver
    // is not consulted again.
    field.resolve(44, field.snapshot(), getBox);

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
    const getBox = closingAt(field.items[2]!, asked, () => {
      alive = false;
    });

    // Three destination candidates; the second one destroys.
    expect(field.resolve(55, field.snapshot(), getBox, () => alive)).toBeNull();

    // `items[3]` is never resolved: no `visual()` call crosses the terminal
    // barrier. The other half of the barrier — that no geometry is read after
    // it either — is a separate concern and is asserted below.
    expect(asked).toEqual([field.items[1], field.items[2]]);
  });

  it('should read no placeholder geometry once the controller closes', () => {
    // **It passes because a candidate remained**, and the reading before that
    // candidate's `visual()` is what stops the rebuild — not because measuring
    // the placeholder is itself forbidden after a close. Measuring a
    // consumer-owned node is a platform read rather than a declared-slot
    // invocation, so the property this pins is the *shortest* stop: a close
    // raised inside the loop is caught before the next declared call, and the
    // trailing placeholder read is never reached because the loop never
    // finishes. Close on the **last** candidate and the rebuild completes, by
    // design; that case is below.
    const field = createField(4);
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
        55,
        field.snapshot(),
        closingAt(field.items[2]!, asked, () => {
          alive = false;
        }),
        () => alive,
      ),
    ).toBeNull();

    expect(measured).toBe(0);
  });

  it('should leave the cache retired rather than clean and partial', () => {
    // The half a `break` gets wrong. Teardown is deferred to the outermost
    // transaction boundary, so at this instant the retire hooks have **not**
    // run; falling through to the trailing bookkeeping would mark a half-filled
    // index clean at the snapshot's own version, and the **same** version below
    // would then find it warm, skip the rebuild and serve a partial buffer.
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

/**
 * **A close raised from a candidate's own geometry read**, and what the rule is
 * — and is not — obliged to do about it.
 *
 * The obligation is over **declared consumer slots**: `visual()` must not be
 * invoked once the controller has closed. A candidate's
 * `getBoundingClientRect()` is a platform member on a consumer-owned node, so a
 * close raised from inside one is caught by the reading before the **next**
 * `visual()` — which is the discriminating case, and the only one.
 *
 * On the **last** candidate there is no next invocation, so nothing is owed and
 * the rebuild completes: the buffer is whole, the placeholder is read once, and
 * the cache is clean at a version whose data is right. The cases below pin that
 * as the outcome. They previously pinned its opposite, against a whole-program
 * ceiling on consumer calls that has since been withdrawn, and they are
 * retargeted here rather than deleted so the reversal stays visible.
 */
describe('the terminal barrier on candidate geometry', () => {
  /**
   * Instruments `getBoundingClientRect()` on each element, recording who was
   * measured and closing the controller from `target`'s own read.
   */
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

  it('should still read the placeholder once the last candidate closed the controller', () => {
    // No `visual()` composed, so this loop invokes **no** declared slot at all
    // and takes no reading. The close arrives from the last candidate's own
    // geometry read, nothing is owed after it, and the placeholder read that
    // finishes the rebuild happens exactly once.
    const field = createField(4);
    const measured: HTMLElement[] = [];
    let alive = true;
    let anchorReads = 0;
    const { placeholder } = field;
    const native = placeholder.getBoundingClientRect.bind(placeholder);

    placeholder.getBoundingClientRect = (): DOMRect => {
      anchorReads += 1;

      return native();
    };
    measuringAt(field.items, field.items[3]!, measured, () => {
      alive = false;
    });

    expect(
      field.resolve(55, field.snapshot(), null, () => alive),
    ).not.toBeNull();

    expect(anchorReads).toBe(1);
  });

  it('should leave the cache clean after the last candidate closed the controller', () => {
    // The trailing-bookkeeping half, and it is now the completion that is
    // pinned: the buffer is whole and correct, so marking it clean at this
    // version is right, and the **same** version below finds it warm and asks
    // for nothing. The rows it holds are released by the transaction boundary
    // that runs the retire hooks, not by this loop.
    const field = createField(4);
    const measured: HTMLElement[] = [];
    let alive = true;

    measuringAt(field.items, field.items[3]!, measured, () => {
      alive = false;
    });
    field.resolve(55, field.snapshot(), null, () => alive);

    const asked: HTMLElement[] = [];

    field.resolve(55, field.snapshot(), (item) => {
      asked.push(item);
      return item;
    });

    expect(asked).toEqual([]);
  });

  it('should resolve no further visual once a candidate closed the controller', () => {
    // The other half of the same ordering defect: the barrier sat *before* the
    // geometry read, so the next iteration reached `getBox` before the next
    // reading was taken.
    const field = createField(4);
    const measured: HTMLElement[] = [];
    const asked: HTMLElement[] = [];
    let alive = true;

    measuringAt(field.items, field.items[1]!, measured, () => {
      alive = false;
    });

    field.resolve(
      55,
      field.snapshot(),
      (item) => {
        asked.push(item);
        return item;
      },
      () => alive,
    );

    expect(asked).toEqual([field.items[1]]);
  });

  it('should call no resolver at all when the controller is already closed', () => {
    // The entry barrier. A committed move invalidates on every failing path
    // and `release.prepare` resolves immediately afterwards, so a rebuild can
    // be entered on a controller that consumer code already destroyed — and the
    // first `getBox` of that rebuild would be a consumer call after
    // `destroy()`.
    const field = createField(4);
    const asked: HTMLElement[] = [];

    expect(
      field.resolve(
        55,
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
});
