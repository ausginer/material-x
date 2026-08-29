// Construction-time composition of a closed set of seams, not an open plugin
// architecture. Every new semantic seam is a coordinated edit to one
// contribution group, `SortableSlots`, `assemble`, the behavior's call sites
// and the exports; that closed world is what buys direct slot calls, prebuilt
// pipelines and no runtime descriptor interpretation.
//
// **Which group is the slot's cardinality.** A unique slot is declared on the
// group of the one config key that can produce it, so two writers are
// unrepresentable rather than detected — there is no arbitration, no label
// string and no construction-time collision left to diagnose.
import type { Disposer } from '../kernel/lifetimes.ts';
import type {
  FeatureContext,
  LandingContribution,
} from '../shared/composition.ts';
import type { Insertion } from './domain.ts';
import type { DisplacementPlan } from './linear-shift.ts';
import type { DisplacementProbe } from './rect-index.ts';
import type { InsertionFrameView, InsertionRuntimeView } from './slots.ts';

// The structural closure of the middle tier. Publishing the contribution groups
// and `FeatureContext` gives every type they structurally name the same
// versioning promise, so narrowing the tier means narrowing this list.
// `SortableSlots` is not here, and that is where the closure stops: an
// installer returns a contribution and never sees the flattened record the
// behavior builds from it. `tests/docs.node.test.ts` fails on any public type
// that reaches an unexported one.
export type { Disposer } from '../kernel/lifetimes.ts';
export type { DOMRealm } from '../kernel/realm.ts';
export type {
  LandingContext,
  LandingHandle,
  LandingStart,
} from '../kernel/spec.ts';
export type { Insertion } from './domain.ts';
export type { DisplacementPlan } from './linear-shift.ts';
export type { DisplacementProbe } from './rect-index.ts';
export type { InsertionFrameView, InsertionRuntimeView } from './slots.ts';

// The one runtime export at this tier, which makes `sortable/feature` a runtime
// entry in `files.json` rather than a `typeOnly` one. `insertion` is the only
// slot that produces an `Insertion`, so an axis installer is its only
// third-party producer and must be able to import the construction owner.
export { insertionAt } from './domain.ts';

// Declared in `src/shared/composition.ts` and published here: the free-drag
// middle tier needs the identical types, so the two tiers share a declaration
// rather than a structural coincidence. `LandingContribution` joins
// `FeatureContext` there for the same reason — both behaviors' `landing` key
// produces exactly it. **The composition check's four helpers no longer travel
// with them**: they were published because this entry's signature named
// `SortableComposition`, and with every slot a named key of one writer there is
// no positional check left for them to serve.
export type {
  FeatureContext,
  LandingContribution,
} from '../shared/composition.ts';

// Erased entirely: `declare const` emits no JavaScript, and the brand is a
// property no value ever carries. Its only job is to make the two installer
// types nominal at the parameter position.
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
 * **An author never writes it.** Filling `axis`, `landing` or `displacement`
 * types the parameter from the slot, and hoisting into a
 * `const install: AxisInstaller = (context) => …` types it from the alias. The
 * brand is reachable only by naming this type, and there is no reason to.
 */
export type SortableFeatureContext = FeatureContext &
  Readonly<{ [SORTABLE_FEATURE]: never }>;

// The forbidden receiver is this record — the one the members are declared on —
// and not the contribution object carrying it. The assembler's lift of these
// members into flat slot fields is mechanism, not promise. `MotionConstraint`
// in `free-drag/feature.ts` states the same obligation, on both published
// declarations rather than in one place.
/**
 * Insertion geometry, contributed by an axis installer as a **paired
 * capability, not a lone read**. The behavior owns the events that make
 * geometry stale — activation, scroll, resize, a committed placeholder move,
 * collection publication, release — and the feature owns the cache, so a
 * resolver may not be installed without its invalidator.
 *
 * **These members are never invoked with this `InsertionGeometry` as their
 * receiver, and an implementation may not depend on `this`.** What the receiver
 * is at any call site is unspecified, so depending on `this === undefined` is
 * as far outside contract as depending on it being the geometry. A geometry
 * written as a class instance — or with any member that reads `this` — is
 * outside contract; it must close over its state.
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
   * **Predict the committed move, and say what it displaces** — optional,
   * because not every rule can.
   *
   * The behavior calls this at exactly one instant — inside the committed-move
   * bracket, **immediately before the one DOM write** — and it must advance the
   * rule's own cache, and the placeholder position it holds, to the geometry
   * that write is about to produce. It performs **no DOM read**: everything it
   * needs is the cache it already holds plus per-operation constants it has
   * already established.
   *
   * It returns the plan — every element the move displaces and the vector that
   * element is about to travel, negated — or **`null`, meaning "I cannot
   * predict this one; measure me"**, which sends the behavior to `measure`
   * after the write. A rule with no prediction at all simply omits this
   * member.
   *
   * **A prediction may consume only a same-element temporal difference of
   * presented geometry** (G5). A difference between two *different* elements'
   * measured rects carries the difference of their authored `translate`,
   * `rotate` or `scale` and is not a flow quantity, so it must not drive one.
   */
  project?(
    frame: InsertionFrameView,
    runtime: InsertionRuntimeView,
  ): DisplacementPlan | null;
  /**
   * **Say what the committed move displaced**, measured, immediately after the
   * DOM write.
   *
   * Called when `project` is absent or returned `null`. It may read geometry —
   * it is the one member that may — and it must leave
   * the rule's cache describing the tree the write produced, either by
   * advancing it or by rebuilding it.
   *
   * **Required, and that is the axis key's side of the bargain.** The behavior
   * invalidates on every path between the projection and a completed write, so
   * a rule that can neither predict nor measure returns a plan that visits
   * nothing and invalidates itself.
   */
  measure(
    frame: InsertionFrameView,
    runtime: InsertionRuntimeView,
  ): DisplacementPlan;
  retire(): void;
}>;

// A discriminator field would invite a runtime `switch`, which is what the
// composition model exists to avoid. There is no member for transactional frame
// state: a frame field is committed state, so only a `prepare` may write it,
// and both pipelines here run post-commit in `action.effect`.
/**
 * What the `axis` key's installer returns.
 *
 * **`insertion` is required, and that is the whole of the axis key's
 * cardinality**. The slot is producible from this key and no other, so a second
 * writer cannot be expressed rather than being caught by a construction-time
 * throw.
 */
export type AxisContribution = Readonly<{
  insertion: InsertionGeometry;
  /** Run in **reverse** installation order. */
  retire?: Disposer;
}>;

/**
 * What the `displacement` key's installer returns: **the consumer of an axis's
 * plan**, and no geometry of its own.
 *
 * **A named key rather than an unbounded position**, which is the whole of this
 * slot's cardinality. Two displacement mechanisms writing additive `translate`
 * on the same rows is exactly the collision the assembler's rule makes
 * unrepresentable, and a second producer would return as a second named key
 * rather than as another array entry.
 */
export type DisplacementContribution = Readonly<{
  /**
   * Start one contribution per element the plan visits.
   *
   * The vectors are what each element is **about to travel, negated**, so a
   * contribution that starts there and decays to zero shows the element
   * moving. Contributions are additive and each ends at zero, so they **sum**:
   * a second move arriving mid-flight needs no measurement, no release and no
   * replay, because the element is already exactly where the previous
   * contribution left it.
   *
   * `live` is read between iterations: `animate()` on a consumer-owned row is
   * a consumer call, and the behavior cannot guard the interior of a loop it
   * only starts.
   */
  apply(plan: DisplacementPlan, live: () => boolean): void;
  /**
   * **What this sink is currently holding for one element**, written into `out`
   * as `[dx, dy]` and zero when it holds nothing.
   *
   * It must answer from its own bookkeeping — animation timing, a stored vector
   * — and **must not read layout**, because an axis calls it once per candidate
   * inside a rebuild. Subtracting it is what lets a rebuild obtain *settled*
   * geometry while contributions are still running, which is why nothing here
   * is ever released merely so that something else can measure.
   */
  contribution: DisplacementProbe;
  /**
   * Cancel every contribution in flight.
   *
   * Called by release **before** it measures. Cancelling an additive
   * contribution that decays to zero lands the element exactly where it
   * belongs, so this is a plain cancel and not a release-and-replay.
   */
  settle(): void;
  /** Run in **reverse** installation order. */
  retire?: Disposer;
}>;

// Published at the middle tier; a fragment is a plain object literal, and what
// stays opaque is the installer value rather than the record carrying it.
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

/** The `displacement` key's installer. See {@link DisplacementContribution}. */
export type SortableDisplacementInstaller = (
  context: SortableFeatureContext,
) => DisplacementContribution;
