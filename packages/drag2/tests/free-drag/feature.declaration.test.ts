/**
 * Free drag's middle tier as a **type surface** — the tier-A half of B-6.
 *
 * The runtime half is `tests/free-drag/lifecycle.browser.test.ts`, where an
 * out-of-line `constrain` installer fills the slot *instead of* the first-party
 * `bounds()` and its `invalidate()` is what makes L-3 discriminating; the
 * packed half is `tests/consumer.node.test.ts`'s `CONSTRAINT` fixture, which
 * compiles the same shape against the published declarations. This file is the
 * part neither can state: what the type **refuses**.
 *
 * **Since D-146 the refusals are the model.** Each config key carries its own
 * installer and its own contribution group, so a unique slot has exactly one
 * producing position — and the rows below are what makes that a fact about the
 * types rather than a sentence in a comment. There is no `claim`, no label and
 * no `duplicate-contribution` identity left to assert against.
 */
import { describe, expectTypeOf, it } from 'vitest';
import type { OnDrop } from '../../src/free-drag/domain.ts';
import type {
  ConstraintContribution,
  ConstraintInstaller,
  FreeDragLandingInstaller,
  FreeDragPlugin,
  FreeDragPluginContribution,
  MotionConstraint,
} from '../../src/free-drag/feature.ts';
import type { FreeDragSlots } from '../../src/free-drag/slots.ts';
import { freeDrag } from '../../src/free-drag.ts';
import type {
  LandingContribution,
  LandingTiming,
  UniqueSlot,
} from '../../src/shared/composition.ts';

declare const constraint: MotionConstraint;
declare const timing: LandingTiming;
declare const dispose: () => void;
declare const constraintInstaller: ConstraintInstaller;
declare const landingInstaller: FreeDragLandingInstaller;
declare const plugin: FreeDragPlugin;
declare const otherPlugin: FreeDragPlugin;
declare const item: HTMLElement;
declare const onDrop: OnDrop;

describe('ConstraintInstaller', () => {
  it('should accept a function literal authored outside the package', () => {
    // The middle tier makes third-party authoring **supported**, not merely
    // possible: no brand, no factory, no registration — a plain function.
    const installer: ConstraintInstaller = () => ({ constrain: constraint });

    void installer;
  });

  it('should stay nameable and passable', () => {
    const hold = (feature: ConstraintInstaller): ConstraintInstaller => feature;

    expectTypeOf(hold).parameter(0).toEqualTypeOf<ConstraintInstaller>();
  });

  it('should require the constraint it exists to install', () => {
    // **D-45's rule as a type** (D-146): a key whose installer constructs
    // nothing is a config key, so an installer that fills no slot has no reason
    // to be one. It is also the whole of the slot's cardinality — `constrain`
    // is producible here and nowhere else.
    // @ts-expect-error — `constrain` is required on `ConstraintContribution`
    const installer: ConstraintInstaller = () => ({ retire: dispose });

    void installer;
  });
});

describe('ConstraintContribution', () => {
  it('should carry no discriminator', () => {
    // There is deliberately no `type`, `kind` or `phase` field: a discriminator
    // invites a runtime `switch`, which is what the composition model exists to
    // avoid. Asserting the absence keys off the union of its keys, so adding
    // one fails here rather than being noticed at review.
    //
    // **Two keys, and the landing is not one of them** (D-146).
    // `landingTiming` belongs to the `landing` key's group, which is what makes
    // two writers unrepresentable.
    expectTypeOf<keyof ConstraintContribution>().toEqualTypeOf<
      'constrain' | 'retire'
    >();
  });
});

describe('FreeDragLandingInstaller', () => {
  it('should carry the landing and its lifetime', () => {
    expectTypeOf<keyof LandingContribution>().toEqualTypeOf<
      'landingTiming' | 'retire'
    >();
  });

  it('should refuse a constraint from the landing key', () => {
    // The cardinality rule in the direction that used to need `claim`: two keys
    // cannot both drive `constrain`, because only one of them declares it.
    //
    // **Asserted on an annotated `const`, not on an installer's return**, and
    // the reason is F-117's: a fresh literal returned from a
    // contextually-typed arrow is not excess-property-checked, so the
    // installer-shaped form of this row would compile and the directive would
    // be unused. What the model guarantees is that `constrain` is not a member
    // of this group — which is what this asserts.
    const contribution: LandingContribution = {
      landingTiming: timing,
      // @ts-expect-error — `constrain` is not a member of this group
      constrain: constraint,
    };

    void contribution;
  });

  it('should accept the group without it', () => {
    // The F-74 control for the row above.
    const contribution: LandingContribution = { landingTiming: timing };

    void contribution;
  });
});

describe('FreeDragPlugin', () => {
  it('should carry a lifetime and nothing else', () => {
    // **Free drag has no multi-writer slot**, so the one position with
    // unbounded arity contributes a `retire` and nothing at all besides
    // (D-146). That is the cardinality rule at its sharpest: the unbounded
    // position cannot reach a unique slot because it declares none.
    expectTypeOf<keyof FreeDragPluginContribution>().toEqualTypeOf<'retire'>();
  });

  it('should not refuse a unique slot at the group alone', () => {
    // **F-132, stated rather than papered over.** ~~`should refuse a unique
    // slot from the unbounded position`~~ asserted that
    // `() => ({ landingTiming: timing })` is rejected here, and it is — by
    // **weak-type detection**, which fires only because that literal shares
    // *no* member with an all-optional target. F-74/CE1-01 records that as not
    // a boundary, and this row is the falsifying control the old one lacked:
    // add `retire`, the one member both groups declare, and the same literal
    // compiles.
    //
    // The group is not where the property lives. **The position is** (D-151),
    // and `the composition check` below is where it is asserted.
    const installer: FreeDragPlugin = () => ({
      landingTiming: timing,
      retire: dispose,
    });

    void installer;
  });

  it('should accept the lifetime it does declare', () => {
    // The F-74 control for the key-set row above.
    const installer: FreeDragPlugin = () => ({ retire: dispose });

    void installer;
  });
});

describe('the composition check', () => {
  it('should derive the unique slots from the groups themselves', () => {
    // **A unique slot is a key a sibling group declares and the plugin group
    // does not** (D-151) — derived, so a capability added later joins the set
    // by being declared.
    expectTypeOf<
      UniqueSlot<
        ConstraintContribution | LandingContribution,
        FreeDragPluginContribution
      >
    >().toEqualTypeOf<'constrain' | 'landingTiming'>();
  });

  it('should hold the precondition the positional model rests on', () => {
    // No two non-plugin groups declare the same unique key: they intersect in
    // `retire` alone, which the plugin group also declares.
    type Disjoint<A, B, Plugin> = [
      Exclude<keyof A & keyof B, keyof Plugin>,
    ] extends [never]
      ? true
      : never;

    expectTypeOf<
      Disjoint<
        ConstraintContribution,
        LandingContribution,
        FreeDragPluginContribution
      >
    >().toEqualTypeOf<true>();
  });

  it('should refuse a constraint installer from the plugins position', () => {
    // **The refusal the group cannot make**, and the diagnostic names the slot:
    // _installer contributes 'constrain', which only its own config key may
    // install_. `bounds()` composed as a plugin installed a clamp nothing
    // applied and a `retire` nothing recorded.
    const refused = (): void => {
      // @ts-expect-error — D-151: `constrain` is installable from `bounds` alone
      freeDrag(item, { onDrop, plugins: [constraintInstaller] });
    };

    void refused;
  });

  it('should refuse a landing installer from the plugins position', () => {
    const refused = (): void => {
      // @ts-expect-error — D-151: `landingTiming` is installable from `landing`
      freeDrag(item, { onDrop, plugins: [landingInstaller] });
    };

    void refused;
  });

  it('should refuse one offender among legitimate plugins', () => {
    // **The case `const` type parameters exist for** (F-145): without them the
    // array literal widens to `FreeDragPlugin` before the check sees it.
    const refused = (): void => {
      freeDrag(item, {
        onDrop,
        // @ts-expect-error — D-151: the middle element, by name
        plugins: [plugin, constraintInstaller, otherPlugin],
      });
    };

    void refused;
  });

  it('should refuse an offender in a fragment', () => {
    const refused = (): void => {
      freeDrag(
        item,
        { onDrop },
        { plugins: [plugin] },
        // @ts-expect-error — D-151: fragments are checked as the config is
        { plugins: [constraintInstaller] },
      );
    };

    void refused;
  });

  it('should accumulate several legitimate plugins', () => {
    // **The control that keeps the check from becoming shape validation.** The
    // unbounded position stays unbounded: as many entries as the consumer
    // likes, in one array and across fragments, none of them touched.
    const accepted = (): void => {
      freeDrag(
        item,
        { onDrop, plugins: [plugin, otherPlugin] },
        { plugins: [plugin] },
      );
    };

    void accepted;
  });

  it('should accept an installer the bounds key legitimately takes', () => {
    // The second control: the refusal is about the *position*, so the same
    // installer in its own key is untouched.
    const accepted = (): void => {
      freeDrag(item, {
        onDrop,
        bounds: constraintInstaller,
        landing: landingInstaller,
      });
    };

    void accepted;
  });

  it('should accept a widened installer, which is the documented residual', () => {
    // **The accepted boundary** (D-151 §5). An explicit annotation forgets the
    // provenance the check reads; what survives is a consumer who annotated
    // away their own information and then finds the capability silently absent.
    const widened: FreeDragPlugin = constraintInstaller;
    const accepted = (): void => {
      freeDrag(item, { onDrop, plugins: [widened] });
    };

    void accepted;
  });
});

describe('FreeDragSlots', () => {
  it('should be flat, with no reference to a contribution object', () => {
    // The assembler drops the contributions, which is what makes an installer's
    // private state unreachable from the behavior, the kernel or a sibling.
    expectTypeOf<
      FreeDragSlots['constrain']
    >().toEqualTypeOf<MotionConstraint | null>();
  });
});
