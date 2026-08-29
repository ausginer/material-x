/**
 * **Cross-behavior installers do not compile** — D-138, closing E-06 on a
 * nominal boundary.
 *
 * The two middle tiers publish behavior-specific installer aliases because
 * their contribution records differ. TypeScript did not agree: every real slot
 * on both records is optional, so the records were mutually assignable and free
 * drag's public `plugins` slot accepted an `AxisInstaller` whose `insertion`
 * the assembler then silently discarded.
 *
 * **The boundary is on the context, not on the contribution.** Each middle tier
 * declares a `unique symbol` brand and hands its installers a
 * `FeatureContext & { [brand]: never }`. An installer's parameter is checked
 * **contravariantly**, so a function written against one behavior's context is
 * refused where the other's is expected — in both directions, from one
 * mechanism, with nothing to keep in step.
 *
 * **What that buys is the reason it is on the context** (D-138): the two
 * contribution records are now independent. Free drag names no sortable
 * capability and the sortable names no motion constraint, where the previous
 * mechanism — key-set totality, every unimplemented key declared `?: never` —
 * required each record to enumerate the other behavior's vocabulary and keep
 * that enumeration current.
 *
 * **The brand is never authored.** Every row below that writes an installer
 * writes an ordinary function; the parameter's type arrives from the slot or
 * from the alias, and a `unique symbol` cannot be forged by an author who wants
 * to try.
 *
 * **What the boundary states is the identity of an installer, and the scope is
 * narrower than the mechanism it replaced** (D-138, F-117). A value *typed* for
 * one behavior is refused where the other's is expected, in both directions,
 * and that is total. It says nothing about **what a correctly-typed function
 * returns**: a literal returned from an arrow already contextually typed as a
 * `FreeDragPlugin` is not excess-property-checked, so one carrying `insertion`
 * compiles and the assembler ignores the slot. Contributing a slot the behavior
 * does not implement is unsupported integrator usage — refusing it would cost
 * exactly what D-138 deleted, each record enumerating the other's vocabulary —
 * and it is not asserted here in either direction, because a row pinning what
 * today's compiler happens to do would state a guarantee the contract does not
 * make.
 *
 * **What *is* asserted, one tier out, is a different property** (D-151): an
 * installer may contribute only the slots its position is read for, checked at
 * `freeDrag()` where the argument's own type still remembers which installer it
 * is. That is about position rather than about shape, so it refuses
 * `plugins: [y()]` without either group naming the other's vocabulary.
 * `tests/free-drag/feature.declaration.test.ts` carries those rows. The
 * sortable no longer has an unbounded position for them to be about (D-157):
 * every one of its slots arrives through the single key that declares it, so
 * the sortable installers below are named by their own keys.
 *
 * **One accepted hole, and it is about whose function it is**: a zero-parameter
 * installer declares no context, so a function written for neither behavior
 * stays assignable to both. That is asserted below, because it is a decision
 * rather than a gap.
 *
 * `@ts-expect-error` is the assertion. It fails the typecheck if the line ever
 * *starts* compiling, which is the direction that matters here.
 */
import { describe, expect, expectTypeOf, it } from 'vitest';
import type {
  ConstraintContribution,
  ConstraintInstaller,
  FreeDragFeatureContext,
  FreeDragLandingInstaller,
  FreeDragPlugin,
  FreeDragPluginContribution,
  LandingStart,
  FeatureContext as FreeDragSharedContext,
} from '../src/free-drag/feature.ts';
import { FreeDragResolution, freeDrag } from '../src/free-drag.ts';
import type {
  AxisInstaller,
  DisplacementContribution,
  SortableDisplacementInstaller,
  SortableFeatureContext,
  SortableLandingInstaller,
  FeatureContext as SortableSharedContext,
} from '../src/sortable/feature.ts';
import { ReorderResolution } from '../src/sortable.ts';

declare const axisInstaller: AxisInstaller;
declare const displacementInstaller: SortableDisplacementInstaller;
declare const constraintInstaller: ConstraintInstaller;
declare const freeDragLandingInstaller: FreeDragLandingInstaller;
declare const sortableLandingInstaller: SortableLandingInstaller;

describe('an axis installer', () => {
  it('should not be assignable to a free-drag installer', () => {
    // **The strongest falsifier E-06 names**, and the one reachable through a
    // supported public API: `freeDrag(item, config, { plugins: [y()] })`.
    // @ts-expect-error — D-138: a free-drag context is not a sortable one.
    const free: FreeDragPlugin = axisInstaller;

    void free;
  });
});

describe('a sortable displacement installer', () => {
  it('should not be assignable to a free-drag plugin', () => {
    // ~~`sortablePlugin`~~ **re-pointed by D-157** at the key that replaced the
    // sortable's unbounded position; the property is the one the row always
    // stated. It fails for the same reason as the axis row rather than for a
    // second one: the boundary does not depend on which slots the contribution
    // happens to carry. `DisplacementContribution` is *assignable* to
    // `FreeDragPluginContribution` — both declare `retire` and neither checks a
    // typed value for excess — so the brand is asserted here where it is the
    // *only* thing that could refuse.
    // @ts-expect-error — D-138: a free-drag context is not a sortable one.
    const free: FreeDragPlugin = displacementInstaller;

    void free;
  });
});

describe('a free-drag installer', () => {
  // **The reverse direction has lost its brand-only subject** (D-157).
  // ~~`const sortable: SortablePlugin = freeDragPlugin`~~ was the row where one
  // contravariant parameter stated both directions at once, without the return
  // types helping. Every sortable key left declares a required member a
  // free-drag plugin's contribution does not carry, so re-pointing it would
  // give the refusal a second cause and stop it testing the brand — so the
  // `freeDragPlugin` subject is gone with it. The direction is still pinned
  // where it is still sharp: the landing crossing below refuses it with the
  // *same* return type on both sides, and the axis row here refuses it with the
  // brand plus the missing `insertion` it names.

  it('should not be assignable to an axis installer', () => {
    // @ts-expect-error — D-138, and the missing required `insertion` besides.
    const axis: AxisInstaller = constraintInstaller;

    void axis;
  });
});

describe('the branded contexts', () => {
  it('should not be mutually assignable', () => {
    // The boundary asserted at its source rather than through the aliases, so
    // a reader can see that one property carries it. Removing either brand
    // fails here first and the three installer rows second.
    expectTypeOf<FreeDragFeatureContext>().not.toExtend<SortableFeatureContext>();
    expectTypeOf<SortableFeatureContext>().not.toExtend<FreeDragFeatureContext>();
  });

  it('should each still be the shared context plus the brand', () => {
    // **What the brand must not do is fork the tier** (F-64, B-7). The shared
    // `FeatureContext` is still one declaration re-exported by both middle
    // tiers, and each branded context extends it — so `realm`, `root` and
    // `report` stay one type and a fix that separated the tiers wholesale would
    // fail here.
    expectTypeOf<FreeDragSharedContext>().toEqualTypeOf<SortableSharedContext>();
    expectTypeOf<FreeDragFeatureContext>().toExtend<FreeDragSharedContext>();
    expectTypeOf<SortableFeatureContext>().toExtend<SortableSharedContext>();
  });
});

describe('the two resolutions', () => {
  it("should not answer the other behavior's round trip", () => {
    // **The second boundary D-138's reasoning applies to, arrived at from the
    // other end** (D-143). The two resolutions are the same two words over the
    // same representation, and making each opaque behind its own `unique
    // symbol` makes them nominal for free — so a config that returns the wrong
    // behavior's acceptance is a compile error rather than a value the other
    // behavior's identity comparison silently reads as a rejection.
    // @ts-expect-error: a reorder resolution is not a free-drag one
    const drop: FreeDragResolution = ReorderResolution.accept();
    // @ts-expect-error: and the refusal runs both ways
    const reorder: ReorderResolution = FreeDragResolution.accept();

    void [drop, reorder];
  });
});

describe('the two behaviors\u2019 groups', () => {
  it('should declare independent key sets', () => {
    // **The property that replaced key-set totality, and it is its opposite.**
    // Each group is exactly its own behavior's slots. A slot added to either
    // needs no twin on the other, and neither has to know the other exists.
    expectTypeOf<keyof ConstraintContribution>().toEqualTypeOf<
      'constrain' | 'retire'
    >();
    expectTypeOf<keyof DisplacementContribution>().toEqualTypeOf<
      'apply' | 'contribution' | 'settle' | 'retire'
    >();
  });

  it('should give the unbounded position no unique slot', () => {
    // **The cardinality rule, and only free drag still has a position for it to
    // be about** (D-146, D-157). The plugin group declares no unique slot,
    // which is what makes an unbounded number of writers safe without
    // arbitration — the property `claim` used to enforce at construction time,
    // now a fact about one declaration.
    //
    // ~~`.not.toEqualTypeOf<'insertion'>()` for the sortable half.~~ **Vacuous,
    // and F-133 is the record of it**: `keyof` of a three-member group is not
    // the single literal `'insertion'` whatever those members are, so the
    // assertion could not fail for the reason it named. Its exact replacement
    // is gone with the position it measured: the sortable states the same
    // cardinality by naming one key per slot, which is asserted one `it` above
    // and in `tests/sortable/feature.declaration.test.ts`.
    expectTypeOf<keyof FreeDragPluginContribution>().toEqualTypeOf<'retire'>();
  });

  it('should still refuse the two landing installers to each other', () => {
    // **The crossing D-146 created and no suite asserted** (F-133). Both
    // behaviors' `landing` key returns the *same* declaration — one
    // `LandingContribution` in `shared/composition.ts` — so the return type
    // contributes nothing to the separation here and the branded parameter
    // carries it alone. That makes this the sharpest test of D-138 in the
    // package, and it was the one crossing left unpinned.
    // @ts-expect-error — D-138: the context brand, with no help from the return
    const free: FreeDragLandingInstaller = sortableLandingInstaller;
    // @ts-expect-error — and it refuses in the other direction too
    const sorted: SortableLandingInstaller = freeDragLandingInstaller;

    void [free, sorted];
  });

  it('should return one declaration from both landing installers', () => {
    // The control for the row above: without it the refusal could be read as
    // the return types differing, which is exactly what D-146 removed.
    expectTypeOf<ReturnType<FreeDragLandingInstaller>>().toEqualTypeOf<
      ReturnType<SortableLandingInstaller>
    >();
  });
});

describe('third-party authoring', () => {
  const item = document.createElement('div');
  const config = { onDrop: () => FreeDragResolution.accept() };
  const dispose = (): void => {};
  /** A sink that holds nothing, which is all these declaration probes need. */
  const noContribution = (_element: HTMLElement, out: Float64Array): void => {
    out[0] = 0;
    out[1] = 0;
  };

  it('should type a plugin parameter from the slot it fills', () => {
    // **The authoring shape the brand has to stay out of the way of.** The
    // parameter is never annotated and the brand is never written; filling the
    // slot is what types it, and `realm` is reachable through it exactly as
    // before.
    const controller = freeDrag(item, config, {
      plugins: [
        (context) => {
          expectTypeOf(context).toEqualTypeOf<FreeDragFeatureContext>();
          expectTypeOf(context.realm.document).toEqualTypeOf<Document>();

          return { retire: dispose };
        },
      ],
    });

    expect(controller).toBeTypeOf('object');

    void controller.destroy();
  });

  it('should type a hoisted installer from its alias', () => {
    // The other supported form (D-78): a `const` an author can name, pass and
    // re-use. The annotation is the alias, never the context.
    const install: FreeDragPlugin = (context) => {
      expectTypeOf(context).toEqualTypeOf<FreeDragFeatureContext>();

      return { retire: dispose };
    };

    void freeDrag(item, config, { plugins: [install] }).destroy();
  });

  it('should accept the same contribution when the context is its own', () => {
    // **The control F-74 requires**, and it is what makes the row above mean
    // what it says. A contribution typed for the sortable is *assignable* to
    // the free-drag group — `retire` is a slot both records genuinely declare,
    // and `apply`/`settle` are excess members no check looks at on a typed
    // value — so if this failed too, the negative would be passing on the
    // contribution's shape rather than on the parameter's brand, which is
    // precisely the mechanism CE1-01 caught the first probe on.
    const contribution: DisplacementContribution = {
      apply: () => {},
      contribution: noContribution,
      settle: () => {},
      retire: dispose,
    };
    const install: FreeDragPlugin = () => contribution;

    void freeDrag(item, config, { plugins: [install] }).destroy();
  });

  it('should still reach the landing key with only shared vocabulary', () => {
    // **The positive control**, kept from the previous mechanism and re-pointed
    // by D-146 at the key that now owns the slot: `startLanding` and `retire`
    // are legitimately shared between the behaviors, so an installer
    // contributing them is valid free-drag middle-tier code and must stay so.
    // Without it the boundary could be widened into a general separation
    // without anything noticing. It moved off `plugins` because the unbounded
    // position no longer reaches a unique slot — which is the decision, not a
    // weakening of this control.
    const install: FreeDragLandingInstaller = () => ({
      startLanding: ((_context, done) => {
        done();
        return { destroy: dispose };
      }) satisfies LandingStart,
      retire: dispose,
    });
    const controller = freeDrag(item, config, { landing: install });

    expect(controller).toBeTypeOf('object');

    void controller.destroy();
  });

  it('should stay assignable to both behaviors when it declares no context', () => {
    // **The accepted hole, asserted so it is a decision rather than a gap**
    // (D-138). A brand on the parameter cannot bind a function that declares no
    // parameter, so nothing separates the behaviors here — the sortable's slot
    // takes a function written for neither of them, exactly as free drag's
    // does. The sortable side is a `displacement` installer since D-157, and it
    // carries that group's required members rather than ~~`() => ({})`~~: what
    // the hole is about is whose function it is, not how empty its
    // contribution is, and free drag's half still states the empty case.
    const free: FreeDragPlugin = () => ({});
    const sorted: SortableDisplacementInstaller = () => ({
      apply: () => {},
      contribution: noContribution,
      settle: () => {},
    });

    void free;
    void sorted;
  });

  it('should refuse a hoisted contribution typed for the other behavior', () => {
    // **The direction that does hold, driven through the public slot** — which
    // is where CE1-01's silent discard was reachable and is therefore the
    // position worth pinning, rather than only the alias-to-alias rows above.
    // A `const` typed as the sortable's contribution cannot be returned from a
    // free-drag installer, because the annotation makes it a typed value and
    // typed values are exactly what the brand refuses.
    const contribution: DisplacementContribution = {
      apply: () => {},
      contribution: noContribution,
      settle: () => {},
      retire: dispose,
    };
    // @ts-expect-error — D-138: the parameter's brand refuses the installer, so
    // the slot never sees the contribution.
    const install: FreeDragPlugin = (_context: SortableFeatureContext) =>
      contribution;

    void freeDrag(item, config, { plugins: [install] }).destroy();
  });
});
