// oxlint-disable typescript/no-unsafe-type-assertion
/**
 * The tier-A half of the composition model: properties that are compile errors
 * rather than runtime checks (contract 03 §Closed for real, D-30, I-10).
 */
import { describe, expectTypeOf, it } from 'vitest';
import type { SettlementScope } from '../../src/kernel/spec.ts';
import type { SortableInstaller } from '../../src/sortable/feature.ts';
import type { DisplacementView } from '../../src/sortable/slots.ts';

describe('SortableInstaller', () => {
  it('should accept a function literal authored outside the package', () => {
    // **Inverted by D-45 and D-61, and the inversion is the decision.** The
    // brand made third-party authoring *impossible*; the middle tier makes it
    // supported. Opacity is now a property of which entry you imported — an
    // ordinary consumer on `sortable.js` still cannot write this, because the
    // alias has no structure there.
    const installer: SortableInstaller = () => ({});

    void installer;
  });

  it('should stay nameable and passable', () => {
    // A consumer can hold one and hand it to `sortable()`; it just cannot make
    // one. Losing that would make the type useless rather than opaque.
    const hold = (feature: SortableInstaller): SortableInstaller => feature;

    expectTypeOf(hold).parameter(0).toEqualTypeOf<SortableInstaller>();
  });
});

/**
 * **`Behavior` is withdrawn** (D-55). The two rows that stood here asserted the
 * brand's opacity — that a bare install function is not assignable, and that a
 * branded value stays nameable and passable. Neither is expressible now, and
 * neither should be: with `sortable()` returning its controller and
 * `draggable()` taking a plain `BehaviorFactory`, the opaque type had no
 * producer, and an exported opaque type nothing constructs is a boundary marker
 * with no boundary to mark. The rows are deleted rather than migrated, because
 * migrating them would mean re-asserting a property the decision removed.
 */

describe('DisplacementView', () => {
  it('should not reach the settlement scope', () => {
    // I-10: a displacement hook structurally cannot become a lifecycle gate.
    // `SettlementScope` is passed only to `settlement.effect`, so an in-flight
    // displacement can never delay release, settlement or teardown.
    const displacement = null as unknown as DisplacementView;

    // @ts-expect-error: no gate is reachable from a displacement hook
    const scope: SettlementScope = displacement;

    void scope;
  });
});
