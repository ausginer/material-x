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
  DisplacementContribution,
  InsertionGeometry,
  SortableLandingInstaller,
} from '../../src/sortable/feature.ts';

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

  it('should carry the geometry and its disposer and nothing else', () => {
    // **D-157 emptied this group of everything but its one slot.**
    // ~~`beforeInsertionMove` / `afterInsertionMove`~~ were the multi-writer
    // half the per-key model kept; the displacement feature now consumes a plan
    // the geometry itself projects, so the axis declares the capability and no
    // hooks around it. What is left is the cardinality statement and the
    // installer's own teardown.
    expectTypeOf<keyof AxisContribution>().toEqualTypeOf<
      'insertion' | 'retire'
    >();
  });
});

/**
 * **The sortable's `plugins` position is withdrawn** (D-157). Three rows stood
 * here — that the group carried multi-writer slots only, that it did not refuse
 * a unique slot at the group alone, and that it accepted a hook it declared.
 * All three were properties of an unbounded position, and there is no unbounded
 * position left to have them: the one feature that used it arrives through the
 * named `displacement` key below, whose cardinality is the key rather than a
 * check. The rows are deleted rather than re-pointed, because re-pointing them
 * would assert of a single-writer key a property only a multi-writer one can
 * have. Free drag keeps its `plugins`, and
 * `tests/composition.declaration.test.ts` keeps that half.
 */

describe('SortableDisplacementInstaller', () => {
  it('should carry the plan consumer, the probe, the cancel and nothing else', () => {
    // **The named key's cardinality, stated as its group.** The group is
    // exactly the three calls the behavior and the axis make — `apply` inside
    // the committed-move bracket, `contribution` from a rebuild that has to see
    // through what this sink is currently drawing, `settle` before release
    // measures — plus the installer's own teardown. It declares no geometry of
    // its own: it consumes the plan and answers for its own offsets, which is
    // why two of them would be a collision rather than an accumulation and why
    // this is a key instead of an array entry.
    expectTypeOf<keyof DisplacementContribution>().toEqualTypeOf<
      'apply' | 'contribution' | 'settle' | 'retire'
    >();
  });
});

/**
 * **The composition check has no sortable subject** (D-157). Nine rows stood
 * here: that `UniqueSlot` derived the unique slots from the groups themselves,
 * that no two non-plugin groups declared the same one, that `plugins: [axis]`
 * and `plugins: [landing]` were refused by name in a config and in a fragment,
 * that one offender among legitimate entries kept its identity, and the three
 * controls that kept the refusal from becoming shape validation.
 *
 * Every one of them was about **a position** (D-151) — an installer contributing
 * a slot the assembler never reads there. Deleting the sortable's `plugins`
 * deletes the position, and with it the only way to be misplaced: each
 * remaining slot arrives through the single key that declares it, so a second
 * writer is unrepresentable and a misplaced one has nowhere to be written. The
 * rows are deleted rather than migrated, because migrating them would mean
 * asserting a refusal against a call that can no longer be spelled.
 *
 * `Composed`, `Misplaced`, `UniqueIn` and `UniqueSlot` are unchanged in
 * `shared/composition.ts` and still guard free drag's `plugins`;
 * `tests/free-drag/feature.declaration.test.ts` is where the equivalent rows
 * now live in full.
 */

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

describe('DisplacementContribution', () => {
  it('should not reach the settlement scope', () => {
    // I-10, re-pointed by D-157 at the group that replaced ~~`DisplacementView`~~:
    // a displacement feature structurally cannot become a lifecycle gate.
    // `SettlementScope` is passed only to `settlement.effect`, so an in-flight
    // displacement can never delay release, settlement or teardown — `settle()`
    // is called *by* release rather than awaited by it.
    const displacement = null as unknown as DisplacementContribution;

    // @ts-expect-error: no gate is reachable from a displacement contribution
    const scope: SettlementScope = displacement;

    void scope;
  });
});
