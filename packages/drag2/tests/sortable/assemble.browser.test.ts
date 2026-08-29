/**
 * Construction-time assembly (contract 03 §Assembly).
 *
 * Everything here runs once, before a controller exists — there is no kernel,
 * no operation and no frame in sight. What is being pinned is the composition
 * model: the two normalization rules, the two hook orders, the ledger's
 * storage order, and an unwind that is total rather than nearly total.
 *
 * ~~single-writer enforcement~~ — deleted with `claim` (D-146). A unique slot
 * is declared on one contribution group, so a second writer is unrepresentable
 * rather than arbitrated here; the declaration suites are where that is
 * asserted now.
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
  AxisContribution,
  AxisInstaller,
  FeatureContext,
  InsertionGeometry,
  LandingContribution,
  SortableLandingInstaller,
  SortablePlugin,
  SortablePluginContribution,
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

/**
 * A **plugin** contributing exactly what it is handed, and since D-146 the type
 * is what says so: the unbounded position declares multi-writer slots and
 * nothing else, so no fixture here can express the collision `claim` used to
 * arbitrate.
 */
const feature =
  (contribution: SortablePluginContribution): SortablePlugin =>
  () =>
    contribution;

/**
 * The same, typed as the **axis** key's installer (D-77, D-146). Its group
 * requires `insertion`, and that requirement is both the replacement for the
 * assembler's construction-time check and the whole of the slot's cardinality:
 * no other key's group declares it.
 */
const axisFeature =
  (contribution: AxisContribution): AxisInstaller =>
  () =>
    contribution;

/** The `landing` key's installer, the one producer of `startLanding`. */
const landingFeature =
  (contribution: LandingContribution): SortableLandingInstaller =>
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
  ...plugins: readonly SortablePlugin[]
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
  it('should flatten the geometry members into slot fields', () => {
    // The pairing is a construction-time claim, so the call sites stay one
    // property read and one call rather than `slots.insertion.resolve(…)`.
    // All four members are flattened; the two required ones are asserted by
    // identity here, and `retire` is covered where the unwind drives it.
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
    const handle = (): null => null;
    const visual = (item: HTMLElement): HTMLElement => item;
    const startLanding = (): LandingHandle => ({ destroy: (): void => {} });
    // **Three of these four are config keys, not contributions** (D-56, D-65):
    // `handle`, `visual` and `placeholder` are things a consumer writes, not
    // things an installer contributes — and since D-146 `placeholder` is only
    // that, with no contribution half left to lose a precedence question to.
    // `startLanding` stays a contribution, because only an installer can build
    // a runner, and it arrives from the one key that produces it.
    const slots = assemble(
      config({
        placeholder: createPlaceholder,
        handle,
        visual,
        landing: landingFeature({ startLanding }),
      }),
      createFixture().context,
    );

    expect(slots.placeholder).not.toBeNull();
    expect(slots.handle).toBe(handle);
    expect(slots.visual).toBe(visual);
    expect(slots.startLanding).toBe(startLanding);
  });

  it('should leave an uninstalled optional slot null', () => {
    const slots = assemble(required(), createFixture().context);

    expect(slots.placeholder).toBeNull();
    expect(slots.handle).toBeNull();
    expect(slots.visual).toBeNull();
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

  it('should expose retire hooks in installation order', () => {
    // **The array holds installation order and every reader walks it
    // backwards** (D-147): reverse is the natural ownership order, because
    // hooks release resources acquired in declaration order, and normalizing
    // the storage so one reader could iterate forwards left the package holding
    // two representations of that one fact. The loop below applies the rule it
    // checks; the guarantee itself is driven at the spec, by
    // _should run the retire hooks, each wrapped_.
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

    for (let i = slots.retireHooks.length - 1; i >= 0; i -= 1) {
      slots.retireHooks[i]!();
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
      'box',
      'handle',
      'invalidateInsertion',
      'items',
      'measureInsertion',
      'onEnd',
      'onError',
      'onReorder',
      'onStart',
      'placeholder',
      'resolveInsertion',
      'retireHooks',
      'startLanding',
      'threshold',
      'visual',
    ]);
  });
});

describe('assemble validation', () => {
  it('should no longer diagnose a missing axis with a library message', () => {
    // **Three checks deleted (D-77)**, and the deletion is asserted here rather
    // than assumed: `items`, `onReorder` and `axis` are required by the type of
    // `sortable()`'s first argument, so a missing one is a compile error —
    // pinned by the `@ts-expect-error` fixtures in `tests/revision/revision-2.ts`
    // — and restating it at runtime is the byte `CONTRIBUTING.md` §1.3 refuses.
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

  // ~~*should refuse a single-writer slot claimed twice*~~ and ~~*should name
  // the slot that was claimed twice*~~ — **deleted 2026-08-27 with `claim`
  // itself** (D-146). Both drove two plugins at one unique slot, and a plugin's
  // group no longer declares one: the composition they constructed does not
  // typecheck, so there is no runtime behavior left to assert. What replaced
  // them is `tests/sortable/feature.declaration.test.ts` — *should refuse a
  // unique slot from the unbounded position* — which is the same property one
  // tier earlier.
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

  // ~~*should retire the rejected contribution of a colliding installer*~~ —
  // **deleted 2026-08-27** (D-146). It drove an axis against a plugin
  // contributing geometry, and a plugin cannot contribute geometry any more.
  // The property it was really pinning — cleanup recorded before anything
  // below it can throw, so a later failure unwinds every earlier installer —
  // is what *should retire the hooks already collected when a factory throws*
  // asserts, through the only thrower left: an installer body.

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
