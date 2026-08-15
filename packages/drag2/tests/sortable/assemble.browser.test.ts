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
  mergeFragments,
  type SortableConfig,
} from '../../src/sortable/config.ts';
import type {
  AxisInstaller,
  FeatureContext,
  InsertionGeometry,
  SortableContribution,
  SortableInstaller,
} from '../../src/sortable/feature.ts';
import {
  DEFAULT_THRESHOLD,
  type DisplacementView,
  NOOP_START,
} from '../../src/sortable/slots.ts';
import { xy } from '../../src/sortable/xy.ts';
import { y } from '../../src/sortable/y.ts';

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
const feature =
  (contribution: SortableContribution): SortableInstaller =>
  () =>
    contribution;

/**
 * The same, typed as the **axis** slot's installer (D-77). `AxisInstaller`
 * differs from `SortableInstaller` in one place — `insertion` is required — and
 * that difference is what replaced the assembler's construction-time check for
 * an axis that contributed no geometry.
 */
const axisFeature =
  (
    contribution: SortableContribution &
      Readonly<{ insertion: InsertionGeometry }>,
  ): AxisInstaller =>
  () =>
    contribution;

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

/**
 * A merged config, which is what `assemble` takes since D-45. The axis slot is
 * the one required installer; everything a fragment used to contribute through
 * a `callbacks()` feature is now an ordinary config key, and every other
 * installer is a plugin.
 */
const config = (
  extra: Partial<SortableConfig> = {},
  ...plugins: readonly SortableInstaller[]
): SortableConfig =>
  mergeFragments(
    {
      items: (): readonly HTMLElement[] => [],
      onReorder,
      axis: axisFeature({ insertion: geometry() }),
    },
    [extra, { plugins }],
  );

/** The bare valid composition. */
const required = (): SortableConfig => config();

const view = null as unknown as DisplacementView;

describe('assemble', () => {
  it('should flatten the geometry pair into two slot fields', () => {
    // The pairing is a construction-time claim, so the call sites stay one
    // property read and one call rather than `slots.insertion.resolve(…)`.
    const resolve = (): null => null;
    const invalidate = (): void => {};
    const slots = assemble(
      config({
        axis: axisFeature({ insertion: geometry({ resolve, invalidate }) }),
      }),
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
    // would otherwise be constructed only to be discarded. Two slots until
    // D-62 collapsed `onFinish`/`onCancel` into one `onEnd`.
    const slots = assemble(required(), createFixture().context);

    expect(slots.onEnd).toBeNull();
    expect(slots.onError).toBeNull();
  });

  it('should take the threshold from the merged config', () => {
    const slots = assemble(config({ threshold: 3 }), createFixture().context);

    expect(slots.threshold).toBe(3);
  });

  it('should default the threshold when the config omits it', () => {
    // The **config** is the sole owner of this default (D-56, moved off
    // `callbacks()`): carrying `threshold` as contribution metadata as well
    // would raise the question of which wins.
    const slots = assemble(required(), createFixture().context);

    expect(slots.threshold).toBe(DEFAULT_THRESHOLD);
  });

  it('should fill the optional single-writer slots from their features', () => {
    const createPlaceholder = (): HTMLElement => document.createElement('div');
    const getHandle = (): null => null;
    const getVisual = (item: HTMLElement): HTMLElement => item;
    const startLanding = (): LandingHandle => ({ destroy: (): void => {} });
    // **Three of these four moved from a contribution to a config key**
    // (D-56, D-65): `handle`, `visual` and `placeholder` are things a consumer
    // writes, not things an installer contributes. `startLanding` stays a
    // contribution, because only an installer can build a runner.
    const slots = assemble(
      config(
        {
          placeholder: createPlaceholder,
          handle: getHandle,
          visual: getVisual,
        },
        feature({ startLanding }),
      ),
      createFixture().context,
    );

    expect(slots.createPlaceholder).not.toBeNull();
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
      config(
        {},
        feature({
          beforeInsertionMove: hook('before-1'),
          afterInsertionMove: hook('after-1'),
        }),
        feature({
          beforeInsertionMove: hook('before-2'),
          afterInsertionMove: hook('after-2'),
        }),
      ),
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
      config(
        {
          axis: axisFeature({
            insertion: geometry({ retire: push('geometry') }),
          }),
        },
        feature({ retire: push('second') }),
        feature({ retire: push('third') }),
      ),
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
      config(
        {},
        feature({
          retire: (): void => {},
          beforeInsertionMove: (): void => {},
        }),
      ),
      createFixture().context,
    );

    expect(Object.keys(slots).toSorted()).toEqual([
      'afterMove',
      'beforeMove',
      'createPlaceholder',
      'getBox',
      'getHandle',
      'getVisual',
      'invalidateInsertion',
      'items',
      'measureInsertion',
      'onEnd',
      'onError',
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
  it('should no longer diagnose a missing axis with a library message', () => {
    // **Three checks deleted (D-77)**, and the deletion is asserted here rather
    // than assumed: `items`, `onReorder` and `axis` are required by the type of
    // `sortable()`'s first argument, so a missing one is a compile error —
    // pinned by the `@ts-expect-error` fixtures in `docs/revision/revision-2.ts`
    // — and restating it at runtime is the byte `CODE_OF_SIZE.md` §1.3 refuses.
    //
    // **The failure survives the message.** A JS consumer with no axis reaches
    // the resolver dereference, which throws by itself; what is gone is the
    // library's own diagnostic, which is all the check ever added.
    //
    // ~~Diagnosed before anything is constructed (D-45).~~ The two-stage split
    // still buys what it bought; what it no longer has to buy is this.
    const missingAxis = (): unknown =>
      assemble(
        mergeFragments(
          {
            items: (): readonly HTMLElement[] => [],
            onReorder,
          } as unknown as SortableConfig,
          [],
        ),
        createFixture().context,
      );

    expect(missingAxis).toThrow(TypeError);
    expect(missingAxis).not.toThrow(/an axis — y\(\) or xy\(\) — is required/u);
  });

  it('should no longer refuse a composition with no onReorder', () => {
    expect(() =>
      assemble(
        mergeFragments(
          {
            items: (): readonly HTMLElement[] => [],
            axis: axisFeature({ insertion: geometry() }),
          } as unknown as SortableConfig,
          [],
        ),
        createFixture().context,
      ),
    ).not.toThrow();
  });

  it('should no longer refuse a non-function items source', () => {
    // What answers instead is the construction-time pull in `behavior.ts`,
    // which calls `items()` unguarded: a non-callable source is a required-slot
    // *type* violation and breaks the consumer's own call, rather than being
    // re-diagnosed here. Only a later throw from a **valid** source — one that
    // is a function and raises during an `invalidate()` — is a library
    // classification, and that one lands at `FAILURE_ACTION_PREPARE`.
    expect(() =>
      assemble(
        config({ items: [] as unknown as SortableConfig['items'] }),
        createFixture().context,
      ),
    ).not.toThrow();
  });

  it('should refuse a single-writer slot claimed twice', () => {
    expect(() =>
      assemble(
        config({}, feature({ insertion: geometry() })),
        createFixture().context,
      ),
    ).toThrow(new TypeError('sortable: insertion geometry contributed twice'));
  });

  it('should name the slot that was claimed twice', () => {
    // **Narrowed by the merge** (D-45): named capability slots can no longer
    // collide, because the merge resolved them before anything ran. What is
    // left is two *plugins* contributing the same single-writer member, and the
    // diagnostic still names the slot rather than only the second writer.
    const startLanding = (): LandingHandle => ({ destroy: (): void => {} });

    expect(() =>
      assemble(
        config({}, feature({ startLanding }), feature({ startLanding })),
        createFixture().context,
      ),
    ).toThrow(new TypeError('sortable: landing contributed twice'));
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
        config(
          {},
          feature({ retire: push('first') }),
          feature({ retire: push('second') }),
          () => {
            throw new Error('factory');
          },
          feature({ retire: push('never installed') }),
        ),
        fixture.context,
      ),
    ).toThrow(/factory/u);

    // Reverse, and total: a later factory failing must not leak an earlier
    // feature's private state.
    expect(seen).toEqual(['second', 'first']);
  });

  it('should retire the rejected contribution of a colliding installer', () => {
    // The plugin has already allocated its rect index by the time `claim`
    // throws. Recording cleanup after the claim would leak exactly the
    // contribution whose claim collided.
    //
    // **The pair is axis-versus-plugin now, not axis-versus-axis** (D-45): two
    // `axis` fragments last-win at the merge and the loser is never
    // constructed, so the only way to reach `claim` on this slot is an
    // installer that contributes geometry without owning the slot.
    const seen: string[] = [];
    const fixture = createFixture();

    expect(() =>
      assemble(
        config(
          {
            axis: axisFeature({
              insertion: geometry({
                retire: (): void => {
                  seen.push('axis');
                },
              }),
            }),
          },
          feature({
            insertion: geometry({
              retire: (): void => {
                seen.push('plugin');
              },
            }),
          }),
        ),
        fixture.context,
      ),
    ).toThrow(/insertion geometry contributed twice/u);

    expect(seen).toEqual(['plugin', 'axis']);
  });

  it('should let the last axis fragment win, in either order', () => {
    // **Inverted by D-45, and the inversion is the decision.** Two axis
    // features used to be a `claim` collision; `axis` is an atomic capability
    // slot now, so the second fragment simply last-wins — and the loser is
    // **never constructed**, which is what makes last-wins a merge rule rather
    // than a lifecycle problem. Phase 17's point survives: `y()` and `xy()` are
    // two genuinely different modules, exercised in both orders.
    const yThenXy = assemble(
      mergeFragments(
        { items: (): readonly HTMLElement[] => [], onReorder, axis: y() },
        [{ axis: xy() }],
      ),
      createFixture().context,
    );
    const xyThenY = assemble(
      mergeFragments(
        { items: (): readonly HTMLElement[] => [], onReorder, axis: xy() },
        [{ axis: y() }],
      ),
      createFixture().context,
    );

    expect(yThenXy.resolveInsertion).toBeTypeOf('function');
    expect(xyThenY.resolveInsertion).toBeTypeOf('function');
    // Different modules, so different closures: the winner is not the loser.
    expect(yThenXy.resolveInsertion).not.toBe(xyThenY.resolveInsertion);
  });

  it('should construct nothing for a losing axis fragment', () => {
    // The half of last-wins that matters. A capability that loses its slot
    // allocates no rect index and appears in no `retireHooks` entry — so the
    // hook count is the same as a composition that never named it.
    const loser = assemble(
      mergeFragments(
        { items: (): readonly HTMLElement[] => [], onReorder, axis: y() },
        [{ axis: xy() }],
      ),
      createFixture().context,
    );
    const alone = assemble(
      mergeFragments(
        { items: (): readonly HTMLElement[] => [], onReorder, axis: xy() },
        [],
      ),
      createFixture().context,
    );

    expect(loser.retireHooks).toHaveLength(alone.retireHooks.length);
  });

  it('should unwind when an axis installer contributes no insertion geometry', () => {
    // **The one deletion that carries an ordering obligation** (D-77, 05 §The
    // required first argument). The explicit
    // `contributed no insertion geometry` check is gone — `AxisInstaller`
    // declares `insertion` required, so this composition does not typecheck and
    // is reachable only by a JS consumer, which the cast below stands in for.
    //
    // What replaced it is the flat slot record's dereference of the resolver,
    // and **where that dereference happens is the whole test**: it is built
    // inside the unwind bracket, so a plugin that allocated before it fires is
    // still retired. Building the record after the bracket would still throw
    // and would leak every installer that already ran — which is why asserting
    // the throw alone is not enough, and why this assertion is paired.
    const seen: string[] = [];

    expect(() =>
      assemble(
        config(
          { axis: (() => ({})) as unknown as SortableConfig['axis'] },
          feature({
            retire: (): void => {
              seen.push('plugin');
            },
          }),
        ),
        createFixture().context,
      ),
    ).toThrow(TypeError);

    expect(seen).toEqual(['plugin']);
  });

  it('should report a throwing unwind hook and continue', () => {
    const seen: string[] = [];
    const nested = new Error('nested');
    const fixture = createFixture();

    expect(() =>
      assemble(
        config(
          {},
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
          () => {
            throw new Error('factory');
          },
        ),
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
      config(
        {},
        feature({
          retire: (): void => {
            seen.push('retire');
          },
        }),
      ),
      createFixture().context,
    );

    expect(seen).toEqual([]);
  });
});
