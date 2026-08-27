// oxlint-disable typescript/no-unsafe-type-assertion
/**
 * The tier-A half of the composition model: properties that are compile errors
 * rather than runtime checks (contract 03 §Fragments are public, installers are
 * opaque; D-30, I-10).
 */
import { describe, expectTypeOf, it } from 'vitest';
import type { LandingStart, SettlementScope } from '../../src/kernel/spec.ts';
import type { LandingContribution } from '../../src/shared/composition.ts';
import type {
  AxisContribution,
  AxisInstaller,
  InsertionGeometry,
  SortableLandingInstaller,
  SortablePlugin,
  SortablePluginContribution,
} from '../../src/sortable/feature.ts';
import type { DisplacementView } from '../../src/sortable/slots.ts';

declare const insertion: InsertionGeometry;
declare const start: LandingStart;
declare const dispose: () => void;

describe('AxisInstaller', () => {
  it('should accept a function literal authored outside the package', () => {
    // **Inverted by D-45 and D-61, and the inversion is the decision.** The
    // brand made third-party authoring *impossible*; the middle tier makes it
    // supported. ~~Opacity is now a property of which entry you imported — an
    // ordinary consumer on `sortable.js` still cannot write this.~~ **Retracted
    // by D-78**: contextual typing resolves a parameter's type structurally
    // whether or not its alias is re-exported, so an ordinary consumer can
    // write it inline. What the tier decides is where the name is declared and
    // what you import to **hoist** one — which is what the row below tests.
    const installer: AxisInstaller = () => ({ insertion });

    void installer;
  });

  it('should stay nameable and passable', () => {
    // A consumer can hold one and hand it to `sortable()`; it just cannot make
    // one. Losing that would make the type useless rather than opaque.
    const hold = (feature: AxisInstaller): AxisInstaller => feature;

    expectTypeOf(hold).parameter(0).toEqualTypeOf<AxisInstaller>();
  });

  it('should require the geometry it exists to install', () => {
    // **The axis key's cardinality, stated as its group** (D-146): `insertion`
    // is required here and declared nowhere else, so a second writer is
    // unrepresentable rather than caught by `claim` at construction time.
    // @ts-expect-error — `insertion` is required on `AxisContribution`
    const installer: AxisInstaller = () => ({ retire: dispose });

    void installer;
  });

  it('should carry the displacement hooks, which are multi-writer', () => {
    // The half the per-key model deliberately keeps: a multi-writer slot may be
    // declared on more than one group, because more than one writer is the
    // point.
    expectTypeOf<keyof AxisContribution>().toEqualTypeOf<
      'insertion' | 'beforeInsertionMove' | 'afterInsertionMove' | 'retire'
    >();
  });
});

describe('SortablePlugin', () => {
  it('should carry multi-writer slots only', () => {
    // **The unbounded position reaches no unique slot** (D-146), and it reaches
    // none because it declares none — `layoutAnimation()` is the shape this
    // group exists for.
    expectTypeOf<keyof SortablePluginContribution>().toEqualTypeOf<
      'beforeInsertionMove' | 'afterInsertionMove' | 'retire'
    >();
  });

  it('should refuse a unique slot from the unbounded position', () => {
    // @ts-expect-error — `insertion` is not a member of a plugin's group
    const installer: SortablePlugin = () => ({ insertion });

    void installer;
  });

  it('should accept a hook it does declare', () => {
    // The F-74 control: without it the row above would pass on the literal's
    // shape rather than on the slot's absence from the group.
    const installer: SortablePlugin = () => ({
      beforeInsertionMove: (): void => {},
    });

    void installer;
  });
});

describe('SortableLandingInstaller', () => {
  it('should return the same declaration free drag returns', () => {
    // **B-7's rule at the group** (F-64): both behaviors' `landing` key produces
    // exactly `LandingContribution`, so it is declared once in
    // `shared/composition.ts` rather than twice structurally. What keeps the two
    // installers apart is the branded context and nothing else, which is the
    // separation D-138 designed — `tests/composition.declaration.test.ts` is
    // where that half is asserted.
    expectTypeOf<
      ReturnType<SortableLandingInstaller>
    >().toEqualTypeOf<LandingContribution>();
  });

  it('should refuse the axis geometry from the landing key', () => {
    // Two keys cannot both drive `insertion`, because only one declares it.
    // Asserted on an annotated `const` rather than on an installer's return,
    // for F-117's reason: a fresh literal in a return position is not
    // excess-property-checked, so the installer-shaped form would compile.
    const contribution: LandingContribution = {
      startLanding: start,
      // @ts-expect-error — `insertion` is not a member of this group
      insertion,
    };

    void contribution;
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
