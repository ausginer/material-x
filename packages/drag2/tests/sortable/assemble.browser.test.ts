/**
 * Construction-time assembly (contract 03 §Assembly).
 *
 * Everything here runs once, before a controller exists — there is no kernel,
 * no operation and no frame in sight. What is being pinned is the composition
 * model: single-writer enforcement, the two normalization rules, the two hook
 * orders, and an unwind that is total rather than nearly total.
 */
import { describe, expect, it } from 'vitest';
import { createRealm } from '../../src/kernel/realm.ts';
import type { LandingHandle } from '../../src/kernel/spec.ts';
import { assemble } from '../../src/sortable/assemble.ts';
import {
  brandFeature,
  type FeatureContext,
  type InsertionGeometry,
  type SortableContribution,
  type SortableFeature,
} from '../../src/sortable/feature.ts';
import {
  DEFAULT_THRESHOLD,
  type DisplacementView,
  NOOP_START,
} from '../../src/sortable/slots.ts';

type Fixture = Readonly<{
  context: FeatureContext;
  /** What `context.report` received, in order. */
  reported: unknown[];
}>;

const createFixture = (): Fixture => {
  const root = document.createElement('div');
  const reported: unknown[] = [];

  return {
    reported,
    context: {
      realm: createRealm(root),
      root,
      report: (error): void => {
        reported.push(error);
      },
    },
  };
};

/** A feature contributing exactly what it is handed. */
const feature = (contribution: SortableContribution): SortableFeature =>
  brandFeature(() => contribution);

const geometry = (
  overrides: Partial<InsertionGeometry> = {},
): InsertionGeometry => ({
  resolve: () => null,
  invalidate: (): void => {},
  retire: (): void => {},
  ...overrides,
});

const onReorder = (): never => {
  throw new Error('unreachable: assembly never calls onReorder');
};

/** The required pair, which every valid composition has to contain. */
const required = (): SortableFeature[] => [
  feature({ insertion: geometry() }),
  feature({ callbacks: { onReorder } }),
];

const view = null as unknown as DisplacementView;

describe('assemble', () => {
  it('should flatten the geometry pair into two slot fields', () => {
    // The pairing is a construction-time claim, so the call sites stay one
    // property read and one call rather than `slots.insertion.resolve(…)`.
    const resolve = (): null => null;
    const invalidate = (): void => {};
    const slots = assemble(
      [
        feature({ insertion: geometry({ resolve, invalidate }) }),
        required()[1]!,
      ],
      createFixture().context,
    );

    expect(slots.resolveInsertion).toBe(resolve);
    expect(slots.invalidateInsertion).toBe(invalidate);
  });

  it('should normalize onStart to the shared no-op', () => {
    // Shared and module-level, so the behavior's call site needs no null check
    // and the normalization allocates nothing per controller.
    const slots = assemble(required(), createFixture().context);

    expect(slots.onStart).toBe(NOOP_START);
  });

  it('should leave the terminal callbacks null when uninstalled', () => {
    // Deliberately *not* normalized: their arguments are result objects that
    // would otherwise be constructed only to be discarded.
    const slots = assemble(required(), createFixture().context);

    expect(slots.onFinish).toBeNull();
    expect(slots.onCancel).toBeNull();
    expect(slots.onError).toBeNull();
  });

  it('should take the threshold from callbacks', () => {
    const slots = assemble(
      [required()[0]!, feature({ callbacks: { onReorder, threshold: 3 } })],
      createFixture().context,
    );

    expect(slots.threshold).toBe(3);
  });

  it('should default the threshold when callbacks omits it', () => {
    // `callbacks()` is the sole owner of this default: carrying `threshold` as
    // contribution metadata as well would raise the question of which wins.
    const slots = assemble(required(), createFixture().context);

    expect(slots.threshold).toBe(DEFAULT_THRESHOLD);
  });

  it('should fill the optional single-writer slots from their features', () => {
    const createPlaceholder = (): HTMLElement => document.createElement('div');
    const getHandle = (): null => null;
    const getVisual = (item: HTMLElement): HTMLElement => item;
    const startLanding = (): LandingHandle => ({ destroy: (): void => {} });
    const slots = assemble(
      [
        ...required(),
        feature({ createPlaceholder }),
        feature({ getHandle }),
        feature({ getVisual }),
        feature({ startLanding }),
      ],
      createFixture().context,
    );

    expect(slots.createPlaceholder).toBe(createPlaceholder);
    expect(slots.getHandle).toBe(getHandle);
    expect(slots.getVisual).toBe(getVisual);
    expect(slots.startLanding).toBe(startLanding);
  });

  it('should leave an uninstalled optional slot null', () => {
    const slots = assemble(required(), createFixture().context);

    expect(slots.createPlaceholder).toBeNull();
    expect(slots.getHandle).toBeNull();
    expect(slots.getVisual).toBeNull();
    expect(slots.startLanding).toBeNull();
  });

  it('should collect displacement hooks in installation order', () => {
    const seen: string[] = [];
    const hook = (name: string) => (): void => {
      seen.push(name);
    };
    const slots = assemble(
      [
        ...required(),
        feature({
          beforeInsertionMove: hook('before-1'),
          afterInsertionMove: hook('after-1'),
        }),
        feature({
          beforeInsertionMove: hook('before-2'),
          afterInsertionMove: hook('after-2'),
        }),
      ],
      createFixture().context,
    );

    for (const each of [...slots.beforeMove, ...slots.afterMove]) {
      each(view);
    }

    expect(seen).toEqual(['before-1', 'before-2', 'after-1', 'after-2']);
  });

  it('should expose retire hooks in reverse installation order', () => {
    // Reverse is the natural ownership order: hooks release resources acquired
    // in declaration order. The behavior calls them in the order it is given.
    const seen: string[] = [];
    const push = (name: string) => (): void => {
      seen.push(name);
    };
    const slots = assemble(
      [
        feature({ insertion: geometry({ retire: push('geometry') }) }),
        required()[1]!,
        feature({ retire: push('second') }),
        feature({ retire: push('third') }),
      ],
      createFixture().context,
    );

    for (const hook of slots.retireHooks) {
      hook();
    }

    expect(seen).toEqual(['third', 'second', 'geometry']);
  });

  it('should return the slot record and nothing else', () => {
    // The contribution objects are dropped: no contribution key — `insertion`,
    // `retire`, `beforeInsertionMove` — survives onto the slots.
    const slots = assemble(
      [
        ...required(),
        feature({
          retire: (): void => {},
          beforeInsertionMove: (): void => {},
        }),
      ],
      createFixture().context,
    );

    expect(Object.keys(slots).toSorted()).toEqual([
      'afterMove',
      'beforeMove',
      'createPlaceholder',
      'getHandle',
      'getVisual',
      'invalidateInsertion',
      'measureInsertion',
      'onCancel',
      'onError',
      'onFinish',
      'onReorder',
      'onStart',
      'resolveInsertion',
      'retireHooks',
      'startLanding',
      'threshold',
    ]);
  });
});

describe('assemble validation', () => {
  it('should refuse a composition with no insertion geometry', () => {
    expect(() => assemble([required()[1]!], createFixture().context)).toThrow(
      new TypeError('sortable: vertical() is required'),
    );
  });

  it('should refuse a composition with no callbacks', () => {
    expect(() => assemble([required()[0]!], createFixture().context)).toThrow(
      new TypeError('sortable: callbacks({ onReorder }) is required'),
    );
  });

  it('should refuse a non-function onReorder', () => {
    expect(() =>
      assemble(
        [
          required()[0]!,
          feature({
            callbacks: { onReorder: null as unknown as typeof onReorder },
          }),
        ],
        createFixture().context,
      ),
    ).toThrow(new TypeError('sortable: onReorder must be a function'));
  });

  it('should refuse a single-writer slot claimed twice', () => {
    expect(() =>
      assemble(
        [feature({ insertion: geometry() }), ...required()],
        createFixture().context,
      ),
    ).toThrow(
      new TypeError('sortable: insertion geometry contributed by two features'),
    );
  });

  it('should name the slot that was claimed twice', () => {
    // One diagnostic per slot, so a composition error says which capability
    // collided rather than only that something did.
    expect(() =>
      assemble(
        [
          ...required(),
          feature({ getVisual: (item) => item }),
          feature({ getVisual: (item) => item }),
        ],
        createFixture().context,
      ),
    ).toThrow(new TypeError('sortable: visual() contributed by two features'));
  });
});

describe('assemble unwind', () => {
  it('should retire the hooks already collected when a factory throws', () => {
    const seen: string[] = [];
    const push = (name: string) => (): void => {
      seen.push(name);
    };
    const fixture = createFixture();

    expect(() =>
      assemble(
        [
          feature({ insertion: geometry({ retire: push('geometry') }) }),
          feature({ retire: push('second') }),
          brandFeature(() => {
            throw new Error('factory');
          }),
          feature({ retire: push('never installed') }),
        ],
        fixture.context,
      ),
    ).toThrow(/factory/u);

    // Reverse, and total: a later factory failing must not leak an earlier
    // feature's private state.
    expect(seen).toEqual(['second', 'geometry']);
  });

  it('should retire the rejected contribution of a duplicate axis feature', () => {
    // The second axis feature has already allocated its rect index by the time
    // `claim` throws. Recording cleanup after the claim would leak exactly the
    // contribution whose claim collided.
    const seen: string[] = [];
    const fixture = createFixture();

    expect(() =>
      assemble(
        [
          feature({
            insertion: geometry({
              retire: (): void => {
                seen.push('first');
              },
            }),
          }),
          feature({
            insertion: geometry({
              retire: (): void => {
                seen.push('second');
              },
            }),
          }),
          ...required(),
        ],
        fixture.context,
      ),
    ).toThrow(/contributed by two features/u);

    expect(seen).toEqual(['second', 'first']);
  });

  it('should unwind when validation rejects the composition', () => {
    // The unwind covers the validation throws too, not only factory throws:
    // a composition missing `callbacks()` still allocated a rect index.
    const seen: string[] = [];

    expect(() =>
      assemble(
        [
          feature({
            insertion: geometry({
              retire: (): void => {
                seen.push('geometry');
              },
            }),
          }),
        ],
        createFixture().context,
      ),
    ).toThrow(/callbacks/u);

    expect(seen).toEqual(['geometry']);
  });

  it('should report a throwing unwind hook and continue', () => {
    const seen: string[] = [];
    const nested = new Error('nested');
    const fixture = createFixture();

    expect(() =>
      assemble(
        [
          feature({
            retire: (): void => {
              seen.push('outer');
            },
          }),
          feature({
            retire: (): void => {
              throw nested;
            },
          }),
          brandFeature(() => {
            throw new Error('factory');
          }),
        ],
        fixture.context,
      ),
    ).toThrow(/factory/u);

    // The original error stays primary; the cleanup failure goes to the
    // best-effort channel and does not stop the remaining hooks.
    expect(seen).toEqual(['outer']);
    expect(fixture.reported).toEqual([nested]);
  });

  it('should leave the unwind unused when assembly succeeds', () => {
    const seen: string[] = [];

    assemble(
      [
        ...required(),
        feature({
          retire: (): void => {
            seen.push('retire');
          },
        }),
      ],
      createFixture().context,
    );

    expect(seen).toEqual([]);
  });
});
