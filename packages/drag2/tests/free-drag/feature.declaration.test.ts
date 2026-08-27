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
import type {
  ConstraintContribution,
  ConstraintInstaller,
  FreeDragPlugin,
  FreeDragPluginContribution,
  MotionConstraint,
} from '../../src/free-drag/feature.ts';
import type { FreeDragSlots } from '../../src/free-drag/slots.ts';
import type { LandingStart, SettlementScope } from '../../src/kernel/spec.ts';
import type { LandingContribution } from '../../src/shared/composition.ts';

declare const constraint: MotionConstraint;
declare const start: LandingStart;
declare const dispose: () => void;

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
    // **Two keys, and the landing is not one of them** (D-146). The record
    // carried `startLanding` while every position accepted every slot; it is
    // the `landing` key's group now, which is what makes two writers
    // unrepresentable.
    expectTypeOf<keyof ConstraintContribution>().toEqualTypeOf<
      'constrain' | 'retire'
    >();
  });

  it('should not reach the settlement scope', () => {
    // A middle-tier installer contributes; it does not drive the lifecycle.
    expectTypeOf<ConstraintContribution>().not.toExtend<
      Record<string, SettlementScope>
    >();
  });
});

describe('FreeDragLandingInstaller', () => {
  it('should carry the landing and its lifetime', () => {
    expectTypeOf<keyof LandingContribution>().toEqualTypeOf<
      'startLanding' | 'retire'
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
      startLanding: start,
      // @ts-expect-error — `constrain` is not a member of this group
      constrain: constraint,
    };

    void contribution;
  });

  it('should accept the group without it', () => {
    // The F-74 control for the row above.
    const contribution: LandingContribution = { startLanding: start };

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

  it('should refuse a unique slot from the unbounded position', () => {
    // @ts-expect-error — neither unique slot is reachable from `plugins`
    const installer: FreeDragPlugin = () => ({ startLanding: start });

    void installer;
  });

  it('should accept the lifetime it does declare', () => {
    // The F-74 control: without it the row above would pass on the shape of the
    // literal rather than on the slot's absence from the group.
    const installer: FreeDragPlugin = () => ({ retire: dispose });

    void installer;
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
