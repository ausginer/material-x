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
import type { DisplacementSettle } from './rect-index.ts';
import type {
  DisplacementReport,
  InsertionFrameView,
  InsertionRuntimeView,
} from './slots.ts';

// The structural closure of the middle tier. Publishing the contribution groups
// and `FeatureContext` gives every type they structurally name the same
// versioning promise, so narrowing the tier means narrowing this list.
// `SortableSlots` is not here, and that is where the closure stops: an
// installer returns a contribution and never sees the flattened record the
// behavior builds from it. `tests/docs.node.test.ts` fails on any public type
// that reaches an unexported one.
export type { Disposer } from '../kernel/lifetimes.ts';
// `DisplacementReport` names it, so this tier publishes it under the rule the
// list above states: a type this entry's surface reaches is a type an installer
// author must be able to name. The declaration is the kernel's own — a sink and
// a behavior are talking about one projection, not two of the same shape.
export type { InheritedSpace } from '../kernel/presentation.ts';
export type { DOMRealm } from '../kernel/realm.ts';
export type {
  LandingContext,
  LandingHandle,
  LandingStart,
} from '../kernel/spec.ts';
export type { Insertion } from './domain.ts';
export type { DisplacementSettle } from './rect-index.ts';
export type {
  DisplacementReport,
  InsertionFrameView,
  InsertionRuntimeView,
} from './slots.ts';

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
   * **The committed placeholder move has landed** — one hook, called once,
   * immediately after the one DOM write.
   *
   * Two obligations, and only the first is unconditional. It must leave the
   * rule's own cache — and the placeholder position it holds — describing the
   * tree the write produced, either by advancing it arithmetically or by
   * rebuilding it. And it must hand `report` every element the move displaced,
   * together with the vector that element travelled, **negated**.
   *
   * **`report` is `null` whenever no displacement feature is composed**, and a
   * rule that measures only in order to report should then do neither: it is
   * the argument that says whether anything will consume the answer. Nothing is
   * returned and nothing need be allocated, so a committed move can cost one
   * traversal and no object at all.
   *
   * It may read geometry — it is the one member that may — and each `report`
   * call reaches consumer-owned code, so the `live` argument it is handed must
   * be passed on and is read by the sink between calls.
   *
   * **A prediction may consume only a same-element temporal difference of
   * presented geometry** (G5). A difference between two *different* elements'
   * measured rects carries the difference of their authored `translate`,
   * `rotate` or `scale` and is not a flow quantity, so it must not drive one.
   */
  moved(
    frame: InsertionFrameView,
    runtime: InsertionRuntimeView,
    report: DisplacementReport | null,
  ): void;
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
   * Start one contribution for an element a committed move displaced.
   *
   * The vector is what the element **travelled, negated**, so a contribution
   * that starts there and decays to zero shows it moving. Contributions are
   * additive and each ends at zero, so they **sum**: a second move arriving
   * mid-flight needs no measurement, no release and no replay, because the
   * element is already exactly where the previous contribution left it.
   *
   * **The axis calls it, so the axis cannot guard it.** `live` is read at the
   * head of every call and again after each consumer-reachable step inside one:
   * `animate()` on a consumer-owned row is a consumer call, as is the
   * `finished` accessor on what it returns, so a reading taken before the walk
   * says nothing about the calls inside it.
   */
  report: DisplacementReport;
  /**
   * **Turn a buffer an axis has just measured into settled geometry**, by
   * subtracting what this sink is currently holding for each element it names.
   *
   * It must answer from its own bookkeeping — animation timing, a stored vector
   * — and **must not read layout**. Doing so is what lets a rebuild obtain
   * *settled* geometry while contributions are still running, which is why
   * nothing here is ever released merely so that something else can measure.
   *
   * Called **once per rebuild**, not once per candidate: the walk and the
   * lookups belong to the party that knows what it holds, and a composition
   * installing no sink then pays one null test rather than a subtraction per
   * row.
   */
  settle: DisplacementSettle;
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
