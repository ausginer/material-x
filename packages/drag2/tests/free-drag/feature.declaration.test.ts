/**
 * Free drag's middle tier as a **type surface** — the tier-A half of B-6.
 *
 * The runtime half is `tests/free-drag/lifecycle.browser.test.ts`, where an
 * out-of-line `constrain` installer fills the slot *instead of* the first-party
 * `bounds()` and its `invalidate()` is what makes L-3 discriminating; the
 * packed half is `tests/consumer.node.test.ts`'s `CONSTRAINT` fixture, which
 * compiles the same shape against the published declarations. This file is the
 * part neither can state: what the type **refuses**.
 */
import { describe, expectTypeOf, it } from 'vitest';
import type {
  FreeDragContribution,
  FreeDragInstaller,
  MotionConstraint,
} from '../../src/free-drag/feature.ts';
import type { FreeDragSlots } from '../../src/free-drag/slots.ts';
import type { SettlementScope } from '../../src/kernel/spec.ts';

describe('FreeDragInstaller', () => {
  it('should accept a function literal authored outside the package', () => {
    // The middle tier makes third-party authoring **supported**, not merely
    // possible: no brand, no factory, no registration — a plain function.
    const installer: FreeDragInstaller = () => ({});

    void installer;
  });

  it('should stay nameable and passable', () => {
    const hold = (feature: FreeDragInstaller): FreeDragInstaller => feature;

    expectTypeOf(hold).parameter(0).toEqualTypeOf<FreeDragInstaller>();
  });

  it('should let a contribution fill the constraint slot alone', () => {
    // **Single-writer, and that is the extensibility story** (D-70): a grid
    // snap, a magnetic guide or a custom containment rule is an installer that
    // fills this slot *instead of* `bounds()`, and the library ships none of
    // it. The slot is optional, so an installer that only registers a `retire`
    // hook is equally well-formed.
    const constraint: MotionConstraint = {
      apply: (motion) => {
        motion.x = 0;
      },
      invalidate: (): void => {},
      retire: (): void => {},
    };
    const contribution: FreeDragContribution = { constrain: constraint };

    void contribution;
  });
});

describe('FreeDragContribution', () => {
  it('should carry no discriminator', () => {
    // There is deliberately no `type`, `kind` or `phase` field: a discriminator
    // invites a runtime `switch`, which is what the composition model exists to
    // avoid. Asserting the absence keys off the union of its keys, so adding
    // one fails here rather than being noticed at review.
    //
    // Four of the seven are **not** slots and not discriminators either: they
    // are D-88's exclusions, typed `never`, so none can hold a value to branch
    // on. They appear here because `keyof` cannot tell the two apart — which is
    // why the exclusion has its own row below, and why the key-set equality
    // between the two records lives in `tests/composition.declaration.test.ts`
    // where both are in scope.
    expectTypeOf<keyof FreeDragContribution>().toEqualTypeOf<
      | 'constrain'
      | 'startLanding'
      | 'retire'
      | 'insertion'
      | 'placeholder'
      | 'beforeInsertionMove'
      | 'afterInsertionMove'
    >();
  });

  it('should type every cross-behavior exclusion as never', () => {
    // **D-88's mechanism, asserted as types rather than as keys.** `never` is
    // what makes the record refuse an object carrying one of these at all; an
    // `unknown` or an optional-anything would leave the boundary open while
    // still passing the `keyof` row above. All four, because D-87 asserted one
    // and the other three were open for a decision.
    expectTypeOf<
      FreeDragContribution['insertion']
    >().toEqualTypeOf<undefined>();
    expectTypeOf<
      FreeDragContribution['placeholder']
    >().toEqualTypeOf<undefined>();
    expectTypeOf<
      FreeDragContribution['beforeInsertionMove']
    >().toEqualTypeOf<undefined>();
    expectTypeOf<
      FreeDragContribution['afterInsertionMove']
    >().toEqualTypeOf<undefined>();
  });

  it('should not reach the settlement scope', () => {
    // A middle-tier installer contributes; it does not drive the lifecycle.
    expectTypeOf<FreeDragContribution>().not.toExtend<
      Record<string, SettlementScope>
    >();
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
