// oxlint-disable typescript/no-unsafe-type-assertion
/**
 * The tier-A half of the composition model: properties that are compile errors
 * rather than runtime checks (contract 03 §Fragments are public, installers are
 * opaque; D-30, I-10).
 */
import { describe, expectTypeOf, it } from 'vitest';
import type { LandingStart, SettlementScope } from '../../src/kernel/spec.ts';
import type {
  LandingContribution,
  UniqueSlot,
} from '../../src/shared/composition.ts';
import type { ItemSource } from '../../src/sortable/config.ts';
import type { OnReorder } from '../../src/sortable/domain.ts';
import type {
  AxisContribution,
  AxisInstaller,
  InsertionGeometry,
  SortableLandingInstaller,
  SortablePlugin,
  SortablePluginContribution,
} from '../../src/sortable/feature.ts';
import type { DisplacementView } from '../../src/sortable/slots.ts';
import { sortable } from '../../src/sortable.ts';

declare const insertion: InsertionGeometry;
declare const start: LandingStart;
declare const dispose: () => void;
declare const axisInstaller: AxisInstaller;
declare const landingInstaller: SortableLandingInstaller;
declare const plugin: SortablePlugin;
declare const otherPlugin: SortablePlugin;
declare const root: HTMLElement;
declare const items: ItemSource;
declare const onReorder: OnReorder;

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

  it('should not refuse a unique slot at the group alone', () => {
    // **F-132, stated rather than papered over.** ~~`should refuse a unique
    // slot from the unbounded position`~~ asserted that `() => ({ insertion })`
    // is rejected here, and it is — by **weak-type detection**, which fires
    // only because that literal shares *no* member with an all-optional target.
    // F-74/CE1-01 records that as not a boundary, and this row is the
    // falsifying control the old one lacked: add the one member the two groups
    // genuinely share and the same literal compiles.
    //
    // The group is not where the property lives. **The position is** (D-151),
    // and `the composition check` below is where it is asserted.
    const installer: SortablePlugin = () => ({ insertion, retire: dispose });

    void installer;
  });

  it('should accept a hook it does declare', () => {
    // The F-74 control for the key-set row above: a group that refused this
    // would be refusing multi-writer contribution, which is the whole point of
    // the unbounded position.
    const installer: SortablePlugin = () => ({
      beforeInsertionMove: (): void => {},
    });

    void installer;
  });
});

describe('the composition check', () => {
  it('should derive the unique slots from the groups themselves', () => {
    // **A unique slot is a key a sibling group declares and the plugin group
    // does not** (D-151) — the definition, not a restatement of it, so a
    // capability added later joins the set by being declared and no list has to
    // be kept current.
    expectTypeOf<
      UniqueSlot<
        AxisContribution | LandingContribution,
        SortablePluginContribution
      >
    >().toEqualTypeOf<'insertion' | 'startLanding'>();
  });

  it('should hold the precondition the positional model rests on', () => {
    // No two non-plugin groups declare the same unique key. If a later edit
    // broke it, one slot would have two owning positions and the positional
    // statement would stop implying the cardinality one — which is the point at
    // which an accumulated fold becomes the answer.
    type Disjoint<A, B, Plugin> = [
      Exclude<keyof A & keyof B, keyof Plugin>,
    ] extends [never]
      ? true
      : never;

    expectTypeOf<
      Disjoint<
        AxisContribution,
        LandingContribution,
        SortablePluginContribution
      >
    >().toEqualTypeOf<true>();
  });

  it('should refuse an axis installer from the plugins position', () => {
    // **The refusal the group cannot make**, and the diagnostic names the slot:
    // _installer contributes 'insertion', which only its own config key may
    // install_. It is not a second writer — `axis` is atomic and last-wins — it
    // is one writer at a position the assembler never reads.
    const refused = (): void => {
      sortable(root, {
        items,
        onReorder,
        axis: axisInstaller,
        // @ts-expect-error — D-151: `insertion` is installable from `axis` alone
        plugins: [axisInstaller],
      });
    };

    void refused;
  });

  it('should refuse a landing installer from the plugins position', () => {
    const refused = (): void => {
      sortable(root, {
        items,
        onReorder,
        axis: axisInstaller,
        // @ts-expect-error — D-151: `startLanding` is installable from `landing`
        plugins: [landingInstaller],
      });
    };

    void refused;
  });

  it('should refuse one offender among legitimate plugins', () => {
    // **The case `const` type parameters exist for** (F-145). Without them the
    // array literal's element type widens to `SortablePlugin` before the check
    // sees it — every installer is assignable to it — and the offender's
    // identity is gone.
    const refused = (): void => {
      sortable(root, {
        items,
        onReorder,
        axis: axisInstaller,
        // @ts-expect-error — D-151: the middle element, by name
        plugins: [plugin, axisInstaller, otherPlugin],
      });
    };

    void refused;
  });

  it('should refuse an offender in a fragment', () => {
    const refused = (): void => {
      sortable(
        root,
        { items, onReorder, axis: axisInstaller },
        // @ts-expect-error — D-151: fragments are checked as the config is
        { plugins: [landingInstaller] },
      );
    };

    void refused;
  });

  it('should accumulate several legitimate plugins', () => {
    // **The control that keeps the check from becoming shape validation.** A
    // multi-writer slot is contributed by as many entries as the consumer
    // likes, in one array and across fragments, and none of them is touched.
    const accepted = (): void => {
      sortable(
        root,
        {
          items,
          onReorder,
          axis: axisInstaller,
          plugins: [plugin, otherPlugin],
        },
        { plugins: [plugin] },
      );
    };

    void accepted;
  });

  it('should accept an installer the axis key legitimately takes', () => {
    // The second control: the refusal is about the *position*, so the same
    // installer in its own key is untouched.
    const accepted = (): void => {
      sortable(root, {
        items,
        onReorder,
        axis: axisInstaller,
        landing: landingInstaller,
      });
    };

    void accepted;
  });

  it('should accept a widened installer, which is the documented residual', () => {
    // **The accepted boundary** (D-151 §5). An explicit annotation forgets the
    // provenance the check reads, and the call site cannot recover it. What
    // survives is a consumer who annotated away their own information and then
    // finds the capability silently absent, which is a documentation obligation
    // on the slot rather than a type one.
    const widened: SortablePlugin = axisInstaller;
    const accepted = (): void => {
      sortable(root, {
        items,
        onReorder,
        axis: axisInstaller,
        plugins: [widened],
      });
    };

    void accepted;
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
