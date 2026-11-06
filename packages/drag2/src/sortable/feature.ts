// Construction-time composition of a closed set of slots, not an open plugin
// architecture. Every new semantic slot is a coordinated edit to one
// contribution group, `SortableSlots`, `assemble`, the behavior's call sites
// and the exports. That closed set allows direct slot calls, prebuilt pipelines
// and no runtime descriptor interpretation.
//
// The group that declares a slot sets the slot's cardinality. A unique slot is
// declared on the group of the one config key that can produce it. So two
// writers are unrepresentable and nothing has to detect them: there is no
// arbitration, no label string and no construction-time collision to diagnose.
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

// These re-exports are the structural closure of the middle tier. Publishing
// the contribution groups and `FeatureContext` gives every type they
// structurally name the same versioning promise, so narrowing the tier means
// narrowing this list. `SortableSlots` is not here, and the closure stops at
// that type: an installer returns a contribution and never sees the flat record
// that the behavior builds from it. `tests/docs.node.test.ts` fails on any
// public type that reaches an unexported one.
export type { Disposer } from '../kernel/lifetimes.ts';
// `DisplacementReport` names `InheritedSpace`, so this tier publishes it under
// the rule above: an installer author must be able to name any type that this
// entry's surface reaches. The declaration is the kernel's own, because a sink
// and a behavior refer to one projection, not two of the same shape.
export type { InheritedSpace } from '../kernel/presentation.ts';
export type { DOMRealm } from '../kernel/realm.ts';
export type { LandingTail } from '../kernel/spec.ts';

export type { Insertion } from './domain.ts';
export type { DisplacementSettle } from './rect-index.ts';
export type {
  DisplacementReport,
  InsertionFrameView,
  InsertionRuntimeView,
} from './slots.ts';

// The only runtime export at this tier, so `sortable/feature` is a runtime
// entry in `files.json` and not a `typeOnly` one. `insertion` is the only slot
// that produces an `Insertion`, so an axis installer is its only third-party
// producer and must be able to import `insertionAt`, which constructs one.
export { insertionAt } from './domain.ts';

// Declared in `src/shared/composition.ts` and published here. The free-drag
// middle tier needs the identical types, so the two tiers share a declaration
// and do not rely on a structural match. `LandingContribution` is declared
// there for the same reason: the `landing` key of both behaviors produces
// exactly that type.
export type {
  FeatureContext,
  LandingContribution,
  LandingTiming,
} from '../shared/composition.ts';

// `declare const` emits no JavaScript, and no value ever carries the brand
// property. The brand only makes the two installer types nominal at the
// parameter position.
declare const SORTABLE_FEATURE: unique symbol;

/**
 * The context passed to a sortable installer.
 *
 * It is a {@link FeatureContext} plus one compile-time brand. The brand stops a
 * free-drag installer from being accepted as a sortable installer. Nothing
 * carries the brand at runtime and nothing reads it. An installer parameter is
 * checked contravariantly, so a function written against the other behavior's
 * context is refused where this one is expected, and the other way round.
 *
 * An author never writes this type. Filling `axis`, `landing` or `displacement`
 * types the parameter from the slot, and moving the function into
 * `const install: AxisInstaller = (context) => …` types the parameter from the
 * alias. The brand is reachable only by naming this type, and there is no
 * reason to name it.
 */
export type SortableFeatureContext = FeatureContext &
  Readonly<{ [SORTABLE_FEATURE]: never }>;

// A declared slot whose parameter is a published view must be a named function
// alias, because of variance. Method shorthand is checked bivariantly even
// under `strict`, so TypeScript silently accepts an axis whose own narrower
// view demands a member that the published view does not carry. The boundary
// that this tier exists to check then goes unchecked. A named alias is checked
// contravariantly in the parameter and refuses that axis. The two names are
// exported so that an axis author filling `InsertionGeometry` can move a slot
// into a typed `const`. `InsertionGeometry` already names both signatures
// structurally, so the exports add no structural surface. `sortable/config.ts`
// and `free-drag/config.ts` state the same rule for their own callback slots.
export type ResolveInsertion = (
  frame: InsertionFrameView,
  runtime: InsertionRuntimeView,
) => Insertion | null;
/**
 * Called once, immediately after the one DOM write that moves the committed
 * placeholder.
 *
 * This hook has two obligations, and only the first is unconditional. First, it
 * must leave the rule's own cache, and the placeholder position in that cache,
 * describing the tree that the write produced. It can advance the cache
 * arithmetically or rebuild it. Second, it must pass `report` every element
 * that the move displaced, together with the vector that element travelled,
 * negated.
 *
 * `report` is `null` whenever no displacement feature is composed. A rule that
 * measures only in order to report should then neither measure nor report: this
 * argument says whether anything will consume the answer. Nothing is returned
 * and nothing need be allocated, so a committed move can cost one traversal and
 * no object at all.
 *
 * This hook may read geometry. It is the one member that may.
 *
 * A prediction may consume only a same-element temporal difference of presented
 * geometry. A difference between the measured rects of two different elements
 * carries the difference of their authored `translate`, `rotate` or `scale`.
 * That difference is not a flow quantity, so it must not drive a prediction.
 */
export type MovedInsertion = (
  frame: InsertionFrameView,
  runtime: InsertionRuntimeView,
  report: DisplacementReport | null,
) => void;

// The forbidden `this` is this record, the one the members are declared on, not
// the contribution object that carries it. The assembler copies these members
// into flat slot fields, but that copy is mechanism and not a promise.
// `MotionConstraint` in `free-drag/feature.ts` states the same obligation, on
// both published declarations and not in one place.
/**
 * Insertion geometry, contributed by an axis installer as a pair of
 * capabilities and not as a single read. The behavior owns the events that make
 * geometry stale: activation, scroll, resize, a committed placeholder move,
 * collection publication and release. The feature owns the cache. So a resolver
 * may not be installed without its invalidator.
 *
 * These members are never called with this `InsertionGeometry` as `this`, and
 * an implementation may not depend on `this`. The value of `this` at any call
 * site is unspecified, so depending on `this === undefined` is as far outside
 * the contract as depending on `this` being the geometry. A geometry written as
 * a class instance, or with any member that reads `this`, is outside the
 * contract. It must close over its state.
 */
export type InsertionGeometry = Readonly<{
  resolve: ResolveInsertion;
  /**
   * "The geometry you cached is stale." Lazy by contract: scroll and resize
   * raise this signal many times a second, so this member must not read
   * geometry.
   */
  invalidate(): void;
  moved: MovedInsertion;
  retire(): void;
}>;

// A discriminator field would invite a runtime `switch`, which the composition
// model exists to avoid. There is no member for transactional frame state: a
// frame field is committed state, so only a `prepare` may write it, and both
// pipelines here run after commit in `action.effect`.
/**
 * What the `axis` key's installer returns.
 *
 * `insertion` is required. This slot can be produced from this key and no
 * other, so a second writer cannot be expressed, and no construction-time throw
 * has to catch one.
 */
export type AxisContribution = Readonly<{
  insertion: InsertionGeometry;
  /** Runs in reverse installation order. */
  retire?: Disposer;
}>;

/**
 * What the `displacement` key's installer returns: the consumer of an axis's
 * plan, with no geometry of its own.
 *
 * This key accepts one installer, because two displacement mechanisms writing
 * additive `translate` on the same rows would collide.
 */
export type DisplacementContribution = Readonly<{
  /**
   * Starts one contribution for an element that a committed move displaced.
   *
   * The vector is what the element travelled, negated, so a contribution that
   * starts there and decays to zero shows the element moving. Contributions are
   * additive and each ends at zero, so they sum. A second move that arrives
   * mid-flight needs no measurement, no release and no replay, because the
   * element is already exactly where the previous contribution left it.
   */
  report: DisplacementReport;
  /**
   * Turns a buffer that an axis has just measured into settled geometry, by
   * subtracting what this sink currently holds for each element that the buffer
   * names.
   *
   * It must answer from its own bookkeeping, such as animation timing or a
   * stored vector, and must not read layout. So a rebuild can obtain settled
   * geometry while contributions are still running, and nothing here is ever
   * released only so that something else can measure.
   *
   * Called once per rebuild, not once per candidate. The walk and the lookups
   * belong to the party that knows what it holds. A composition that installs
   * no sink pays one null test, not a subtraction per row.
   */
  settle: DisplacementSettle;
  /** Runs in reverse installation order. */
  retire?: Disposer;
}>;

// Published at the middle tier. A fragment is a plain object literal. What
// stays opaque is the installer value, not the record that carries it.
/**
 * A sortable feature installer, in the shape shared by every config key that
 * takes one. It runs once, while a concrete behavior instance is being
 * constructed. It may create any private runtime, capture that runtime in the
 * callbacks it returns, and return a plain object of named contributions.
 *
 * An installer must have no external effects. It may allocate, but it may not
 * attach a listener, write the DOM, or acquire anything that needs release:
 * every acquisition happens inside an operation lifetime that the kernel owns.
 *
 * Each key names its own alias, and the contribution group is what differs. The
 * context is the same branded type for all of them, which keeps a free-drag
 * installer out of every key.
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
