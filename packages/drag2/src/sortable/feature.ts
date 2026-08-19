/**
 * What a feature *is*: a function factory run once at construction, and the
 * flat contribution object it hands back (contract 03 §A feature is a function
 * factory, §The contribution).
 *
 * This is **construction-time composition of a closed set of seams**, not an
 * open plugin architecture. Every new semantic seam is a coordinated edit to
 * `SortableContribution`, `SortableSlots`, `assemble`, the behavior's call
 * sites and the exports — and that closed world is what buys direct slot calls,
 * prebuilt pipelines, and no runtime descriptor interpretation.
 */
import type { Disposer } from '../kernel/lifetimes.ts';
import type { LandingStart } from '../kernel/spec.ts';
import type { FeatureContext } from '../shared/composition.ts';
import type { Insertion } from './domain.ts';
import type { PlaceholderSlot } from './placement.ts';
import type {
  DisplacementHook,
  InsertionFrameView,
  InsertionRuntimeView,
} from './slots.ts';

/**
 * **The structural closure of the middle tier, re-exported deliberately**
 * (D-61, 03 §Published at the middle tier). Publishing `SortableContribution`
 * and `FeatureContext` publishes everything they structurally name, so those
 * types acquire the same versioning promise whether or not this file names
 * them — the only choice is whether an installer author can *write them down*.
 *
 * They are listed here rather than left implicit because that is the whole of
 * the cost D-61 accepts: narrowing the middle tier means narrowing this list,
 * and a list is reviewable in a way that a reachability closure is not.
 * `tests/docs.node.test.ts` fails on any public type that reaches an
 * unexported one, which is what keeps the two in step.
 *
 * `SortableSlots` is **not** here, and that is where the closure stops: an
 * installer returns a contribution and never sees the flattened record the
 * behavior builds from it.
 */
export type { Disposer } from '../kernel/lifetimes.ts';
export type { DOMRealm } from '../kernel/realm.ts';
export type {
  LandingContext,
  LandingHandle,
  LandingStart,
} from '../kernel/spec.ts';
export type { Insertion } from './domain.ts';
export type { PlaceholderSlot } from './placement.ts';
export type {
  DisplacementHook,
  DisplacementView,
  InsertionFrameView,
  InsertionRuntimeView,
} from './slots.ts';

/**
 * **Declared in `src/composition.ts`, published here** (F-64, the D-68 re-home
 * pattern). The free-drag middle tier needs the identical type, and Phase 18
 * declined to invent a shared composition vocabulary before Checkpoint E can
 * read the evidence for one — so the two tiers share a **declaration** rather
 * than a structural coincidence, and B-7 asserts the identity.
 */
export type { FeatureContext } from '../shared/composition.ts';

/**
 * Geometry is a **paired capability, not a lone read**. The behavior owns the
 * events that make geometry stale — activation, scroll, resize, a committed
 * placeholder move, collection publication, release — and the feature owns the
 * cache. Neither can do the other's half, so installing a resolver without its
 * invalidator has to be impossible rather than merely discouraged.
 *
 * **These members are never invoked with this `InsertionGeometry` as their
 * receiver, and an author may not depend on `this`** (D-92, referent corrected
 * by D-94). The forbidden receiver is **this record — the one the members are
 * declared on**, the object an `AxisInstaller` nests under `insertion`, and not
 * the contribution object carrying it: a bound `contribution.insertion.resolve(…)`
 * never uses the contribution object either, so naming that one would forbid
 * nothing. A geometry written as a class instance — or with any method that
 * reads `this` — is **outside contract**; it must close over its state, as the
 * first-party `y()` and `xy()` already do.
 *
 * **What the receiver _is_ at any site is unspecified** (D-93), and that is the
 * whole of the promise rather than a gap in it. The sites do not agree on the
 * value, so any claim naming one would describe the calling code's current
 * shape rather than the guarantee, and would have to be re-derived at every
 * refactor — while the single negative holds at all of them and is the only
 * part an author can act on. Depending on `this === undefined` is as far
 * outside contract as depending on the record.
 *
 * **The flattening is mechanism, not promise** (D-94). The assembler currently
 * lifts these members into direct slot fields so each call site stays one
 * property read and one call, and that is why the receiver negative is easy to
 * hold — but it is measured code rather than a guarantee, and a later
 * representation that stops lifting a member while still never using this
 * record as its receiver is conforming. The lift locations and the value each
 * site hands over today are recorded in `.plan`, as evidence.
 *
 * `MotionConstraint` in `free-drag/feature.js` states the same obligation
 * (D-90), and it is stated on both published declarations rather than in one
 * place because the reader is the third-party installer author, who meets the
 * type and not the assembler — and because one statement beside one silence
 * would be positive evidence of a distinction this package does not make.
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
   * the insertion rule is defined against (contract 03). A feature that omits
   * it stays lazy and measures on its next `resolve`, which is correct only
   * while nothing displaces items.
   *
   * It exists as a second method rather than as an eager `invalidate()`
   * because the two callers want opposite things: the scroll listener must not
   * measure, and the bracket must.
   */
  measure?(frame: InsertionFrameView, runtime: InsertionRuntimeView): void;
  retire(): void;
}>;

/**
 * ~~`SortableCallbacks`~~ is deleted. It was the consumer-facing callback
 * surface and the sole owner of the `threshold` default; **`SortableConfig` in
 * `config.ts` is both now** (D-45), which is the point — the callbacks were
 * never a *feature* concern, and keeping them here made the middle tier part of
 * the ordinary consumer's vocabulary. F-51 also applies to the replacement: its
 * slots are named aliases, not the method shorthand this used, so they are
 * checked contravariantly.
 */

/**
 * One flat type, fixed key names, **no discriminator**. There is deliberately
 * no `type`, `kind` or `phase` field: a discriminator invites a runtime
 * `switch`, which is exactly what the composition model exists to avoid.
 *
 * There is no member for transactional frame state (D-10). A frame field is
 * committed state, so only a `prepare` may write it — and both pipelines here
 * run post-commit, in `action.effect`. Admitting feature frame state would mean
 * designing a prepare-phase pipeline as well, and no feature needs either.
 */
export type SortableContribution = Readonly<{
  /* single-writer slots */
  insertion?: InsertionGeometry;
  /**
   * D-65 — named as the config slot is. Two names for one factory would be a
   * puzzle rather than a distinction now that a middle-tier author reads both.
   */
  placeholder?: PlaceholderSlot;
  startLanding?: LandingStart;

  /* multi-writer pipelines */
  beforeInsertionMove?: DisplacementHook;
  afterInsertionMove?: DisplacementHook;
  /** Run in **reverse** installation order — see `assemble`. */
  retire?: Disposer;

  /**
   * **Mutual exclusion, not a slot** (D-88, E-06). The sortable's whole half of
   * the boundary — it implements six of the seven keys and excludes one: a
   * sortable contribution has no motion constraint, and an object carrying one
   * is not one. Without the pair, a `FreeDragInstaller` was assignable here and
   * its free-drag-only capability data would be erased by this assembler.
   *
   * **The rule is key-set totality** and it is checked rather than promised:
   * `tests/composition.declaration.test.ts` asserts `keyof` equality between
   * the two records, so a slot added here without its `?: never` twin on
   * `FreeDragContribution` fails at the moment it is added. See that type for
   * why the mechanism changed from D-87's _one exclusion per direction_.
   */
  constrain?: never;
}>;

/**
 * The authoring shape — internal and unstable, and unexported from the package
 * for that reason. A factory is **externally inert**: it may allocate and
 * capture, but it may not attach a listener, write the DOM, or acquire anything
 * needing release. Every acquisition happens inside a kernel-owned operation
 * lifetime.
 */
/**
 * **The middle tier** (D-61). An installer runs **once**, while a concrete
 * behavior instance is being constructed. It may create whatever private
 * runtime it likes, capture that runtime in the callbacks it returns, and hand
 * back a plain object of named contributions.
 *
 * ~~`SortableFeature`, an opaque brand nothing outside this package could
 * construct.~~ **D-45 withdraws the brand and D-61 publishes the type.** There
 * is no branded feature value to hold — a fragment is a plain object literal.
 *
 * ~~Opacity is a property of *which entry you imported*: an ordinary consumer
 * writing only `sortable.js` can write `axis: y().axis` and still cannot write
 * `axis: (ctx) => ({ … })`.~~ **Retracted by D-78, and it was false when
 * written** — twice over. `y()` **is** the installer since D-77, so the first
 * half no longer compiles; and contextual typing resolves a parameter's type
 * structurally whether or not its alias is re-exported, so the second half
 * never held: a file importing only `sortable.js` compiles the inline literal
 * today. **A tier decides where a name is declared and what you import to
 * hoist a part — never what the compiler lets you write inline.**
 *
 * **An installer is externally inert.** It may allocate, but it may not attach
 * a listener, write the DOM, or acquire anything needing release: every
 * acquisition happens inside a kernel-owned operation lifetime.
 */
export type SortableInstaller = (
  context: FeatureContext,
) => SortableContribution;

/**
 * The `axis` slot's own installer type (D-77).
 *
 * It differs from `SortableInstaller` in exactly one place — `insertion` is
 * **required** rather than optional — and that difference is what replaced a
 * construction-time check. The assembler used to throw
 * `the axis installer contributed no insertion geometry` after every installer
 * had run; the slot's type now refuses a plugin-shaped installer outright, so
 * the check paid runtime bytes for a diagnostic the compiler gives for free
 * (`CODE_OF_SIZE.md` §1.3).
 *
 * **Published from `sortable.js` as well** (D-78): `SortableConfig` names this
 * slot, so an ordinary consumer must be able to hoist an installer into a typed
 * `const`. The names *this* type reaches stay declared here.
 *
 * **The type is total for a TypeScript consumer; the runtime dereference exists
 * for a JavaScript one, and it checks that the object exists** (D-80 (a)). A
 * violator contributing no `insertion` at all reaches the flat slot record's
 * dereference of the resolver, which throws by itself — inside `assemble`'s
 * unwind bracket, so every installer that already ran is still retired (03
 * §Validation). A violator contributing a **malformed** one — `{ insertion: {}
 * }` — passes assembly, because the object is truthy, and surfaces at the seam
 * that calls the resolver. That is acceptable under D-77's rule: a seam
 * classifying a JS-authored violation is not a defect. The deleted check had
 * the same blind spot; what would be wrong is describing the backstop as
 * though it matched the type's whole promise.
 */
export type AxisInstaller = (
  context: FeatureContext,
) => SortableContribution & Readonly<{ insertion: InsertionGeometry }>;
