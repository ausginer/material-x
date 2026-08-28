// Construction-time composition of a closed set of seams, not an open plugin
// architecture. Every new semantic seam is a coordinated edit to one
// contribution group, `SortableSlots`, `assemble`, the behavior's call sites and
// the exports; that closed world is what buys direct slot calls, prebuilt
// pipelines and no runtime descriptor interpretation.
//
// **Which group is the slot's cardinality** (D-146). A unique slot is declared
// on the group of the one config key that can produce it, so two writers are
// unrepresentable rather than detected — there is no arbitration, no label
// string and no construction-time collision left to diagnose.
import type { Disposer } from '../kernel/lifetimes.ts';
import type {
  FeatureContext,
  LandingContribution,
} from '../shared/composition.ts';
import type { Insertion } from './domain.ts';
import type {
  DisplacementHook,
  InsertionFrameView,
  InsertionRuntimeView,
} from './slots.ts';

// The structural closure of the middle tier. Publishing the contribution groups
// and `FeatureContext` gives every type they structurally name the same
// versioning promise, so narrowing the tier means narrowing this list (D-61).
// `SortableSlots` is not here, and that is where the closure stops: an installer
// returns a contribution and never sees the flattened record the behavior builds
// from it. `tests/docs.node.test.ts` fails on any public type that reaches an
// unexported one.
export type { Disposer } from '../kernel/lifetimes.ts';
export type { DOMRealm } from '../kernel/realm.ts';
export type {
  LandingContext,
  LandingHandle,
  LandingStart,
} from '../kernel/spec.ts';
export type { Insertion } from './domain.ts';
export type {
  DisplacementHook,
  DisplacementView,
  InsertionFrameView,
  InsertionRuntimeView,
} from './slots.ts';

// The one runtime export at this tier, which makes `sortable/feature` a runtime
// entry in `files.json` rather than a `typeOnly` one (D-123). `insertion` is the
// only slot that produces an `Insertion`, so an axis installer is its only
// third-party producer and must be able to import the construction owner.
export { insertionAt } from './domain.ts';

// Declared in `src/shared/composition.ts` and published here: the free-drag
// middle tier needs the identical types, so the two tiers share a declaration
// rather than a structural coincidence (F-64). `LandingContribution` joins
// `FeatureContext` there for the same reason — both behaviors' `landing` key
// produces exactly it (D-146).
// The composition check's four helpers travel with them (D-151): the entry
// signature names `SortableComposition`, whose own closure resolves here, which
// is the tier-scoped rule D-78 already states. Every one of them is erased.
export type {
  Composed,
  FeatureContext,
  LandingContribution,
  Misplaced,
  UniqueIn,
  UniqueSlot,
} from '../shared/composition.ts';

// Erased entirely: `declare const` emits no JavaScript, and the brand is a
// property no value ever carries. Its only job is to make the two installer
// types nominal at the parameter position (D-138).
declare const SORTABLE_FEATURE: unique symbol;

/**
 * The context a sortable installer is handed.
 *
 * It is a {@link FeatureContext} and one compile-time brand, and **the brand is
 * why a free-drag installer is not a sortable installer**. Nothing carries the
 * brand at runtime and nothing reads it: an installer parameter is checked
 * contravariantly, so a function written against the other behavior's context
 * is refused where this one is expected, and the other way round.
 *
 * **An author never writes it.** Filling `axis`, `landing` or a `plugins` entry
 * types the parameter from the slot, and hoisting into a
 * `const install: AxisInstaller = (context) => …` types it from the alias.
 * The brand is reachable only by naming this type, and there is no reason to.
 */
export type SortableFeatureContext = FeatureContext &
  Readonly<{ [SORTABLE_FEATURE]: never }>;

// The forbidden receiver is this record — the one the members are declared on —
// and not the contribution object carrying it (D-92). The assembler's lift of
// these members into flat slot fields is mechanism, not promise (D-94).
// `MotionConstraint` in `free-drag/feature.ts` states the same obligation, on
// both published declarations rather than in one place (D-90).
/**
 * Insertion geometry, contributed by an axis installer as a **paired
 * capability, not a lone read**. The behavior owns the events that make geometry
 * stale — activation, scroll, resize, a committed placeholder move, collection
 * publication, release — and the feature owns the cache, so a resolver may not
 * be installed without its invalidator.
 *
 * **These members are never invoked with this `InsertionGeometry` as their
 * receiver, and an implementation may not depend on `this`.** What the receiver
 * is at any call site is unspecified, so depending on `this === undefined` is as
 * far outside contract as depending on it being the geometry. A geometry written
 * as a class instance — or with any member that reads `this` — is outside
 * contract; it must close over its state.
 */
export type InsertionGeometry = Readonly<{
  resolve(
    frame: InsertionFrameView,
    runtime: InsertionRuntimeView,
  ): Insertion | null;
  /**
   * "The geometry you cached is stale." **Lazy by contract** — scroll and
   * resize raise it many times a second, so it must not read geometry.
   */
  invalidate(): void;
  /**
   * Optional: "re-read your geometry **now**."
   *
   * The behavior calls this at exactly one instant — inside the committed-move
   * bracket, once the placeholder has been written and every displacement
   * feature has released its visual offsets. That is the only window in an
   * active drag that yields **settled presentation geometry**, which is what
   * the insertion rule is defined against. A feature that omits it stays lazy
   * and measures on its next `resolve`, which is correct only while nothing
   * displaces items.
   */
  measure?(frame: InsertionFrameView, runtime: InsertionRuntimeView): void;
  retire(): void;
}>;

// A discriminator field would invite a runtime `switch`, which is what the
// composition model exists to avoid. There is no member for transactional frame
// state: a frame field is committed state, so only a `prepare` may write it, and
// both pipelines here run post-commit in `action.effect` (D-10).
// The cardinality model these groups state, and the arbitration they replace:
// D-146.
/**
 * What the `axis` key's installer returns.
 *
 * **`insertion` is required, and that is the whole of the axis key's
 * cardinality**. The slot is producible from this key and no other, so a second
 * writer cannot be expressed rather than being caught by a construction-time
 * throw.
 *
 * The two displacement hooks are here as well as on {@link SortablePluginContribution}:
 * they are multi-writer, so every group that can reasonably fill them may.
 */
export type AxisContribution = Readonly<{
  insertion: InsertionGeometry;

  /* multi-writer pipelines */
  beforeInsertionMove?: DisplacementHook;
  afterInsertionMove?: DisplacementHook;
  /** Run in **reverse** installation order. */
  retire?: Disposer;
}>;

/**
 * What a `plugins` entry returns: **multi-writer slots only**.
 *
 * A plugin is the one position with unbounded arity, so it is the one group
 * that may name no unique slot. `layoutAnimation()` is the shape this exists
 * for — two hooks and a `retire` over one private `Map` and one `Set`.
 */
export type SortablePluginContribution = Readonly<{
  beforeInsertionMove?: DisplacementHook;
  afterInsertionMove?: DisplacementHook;
  /** Run in **reverse** installation order. */
  retire?: Disposer;
}>;

// Published at the middle tier; a fragment is a plain object literal, and what
// stays opaque is the installer value rather than the record carrying it
// (D-61). The shared branded context is D-138's.
/**
 * A sortable feature installer, in the shape every config key that takes one
 * shares. It runs **once**, while a concrete behavior instance is being
 * constructed. It may create whatever private runtime it likes, capture that
 * runtime in the callbacks it returns, and hand back a plain object of named
 * contributions.
 *
 * **An installer is externally inert.** It may allocate, but it may not attach
 * a listener, write the DOM, or acquire anything needing release: every
 * acquisition happens inside a kernel-owned operation lifetime.
 *
 * **Each key names its own alias**, and the group is what differs. The context
 * is the same branded one throughout, which is what keeps a free-drag installer
 * out of every one of them.
 */
export type AxisInstaller = (
  context: SortableFeatureContext,
) => AxisContribution;

/** The `landing` key's installer. See {@link LandingContribution}. */
export type SortableLandingInstaller = (
  context: SortableFeatureContext,
) => LandingContribution;

/** A `plugins` entry. See {@link SortablePluginContribution}. */
export type SortablePlugin = (
  context: SortableFeatureContext,
) => SortablePluginContribution;
