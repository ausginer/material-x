/**
 * Free drag's **middle tier** (D-61, D-70), mirroring `sortable/feature.js`: an
 * installer runs once while a concrete behavior instance is being constructed,
 * may create whatever private runtime it likes, captures that runtime in the
 * callbacks it returns, and hands back a flat object of named contributions.
 *
 * **Three slots against the sortable's six, no discriminator, and the same
 * closed-world rule**: a new semantic seam is a coordinated edit to this type,
 * the slot record, the assembler and the behavior's call sites. That closed
 * world is what buys direct slot calls with no runtime descriptor
 * interpretation.
 *
 * **No runtime exports.** Every name here is erased, which is the honest
 * measurement statement for the entry, as it is for the sortable's.
 *
 * An installer is **externally inert**: it may allocate and capture, but it may
 * not attach a listener, write the DOM, or acquire anything needing release.
 * Every acquisition happens inside a kernel-owned operation lifetime.
 */
import type { Disposer } from '../kernel/lifetimes.ts';
import type { DOMRealm } from '../kernel/realm.ts';
import type { LandingStart } from '../kernel/spec.ts';
import type { FeatureContext } from '../shared/composition.ts';

/**
 * **The structural closure of the middle tier, re-exported deliberately**
 * (D-61). Publishing `FreeDragContribution` publishes everything it
 * structurally names, so those types acquire the same versioning promise
 * whether or not this file lists them — the only choice is whether an installer
 * author can *write them down*. `tests/docs.node.test.ts` fails on any public
 * type that reaches an unexported one, which keeps the two in step.
 *
 * **`FeatureContext` is the same declaration `sortable/feature.js` publishes**
 * (F-64) — a shared type identity, not a structural coincidence, and
 * deliberately not a shared *vocabulary*.
 */
export type { FeatureContext } from '../shared/composition.ts';
export type { Disposer } from '../kernel/lifetimes.ts';
export type { DOMRealm } from '../kernel/realm.ts';
export type {
  LandingContext,
  LandingHandle,
  LandingStart,
} from '../kernel/spec.ts';

/**
 * The scalars a constraint reads and writes, **by reference**.
 *
 * `apply` writes the clamped values back into an object the behavior owns and
 * passes down, rather than returning a point, so a committed sample allocates
 * nothing.
 */
export type MotionDraft = {
  /** The origin-relative delta, in the space `lift.write` consumes. */
  x: number;
  y: number;
};

/**
 * What a constraint may read while clamping. Everything on it is committed or
 * construction-time state, so `apply` performs **no** layout read of its own —
 * a feature that needs one caches it and refreshes it on `invalidate()`.
 */
export type ConstraintView = Readonly<{
  realm: DOMRealm;
  /** The visual's viewport rect at grab. The basis every clamp is relative to. */
  originRect: DOMRectReadOnly;
  visual: HTMLElement;
}>;

// The receiver convention below is stated verbatim on `InsertionGeometry` too:
// an author writing against both middle tiers must not meet two conventions
// (D-94).
/**
 * **A paired capability.** The behavior owns the events that make a bounds rect
 * stale — activation, scroll, resize, `invalidate()`, release — and the feature
 * owns the rect. Neither can do the other's half, so installing a resolver
 * without its invalidator is impossible rather than discouraged.
 *
 * **Single-writer, and that is the extensibility story.** A consumer wanting
 * grid snapping, magnetic guides or a custom containment rule writes a
 * middle-tier installer that fills this slot *instead of* `bounds()`, and the
 * library ships none of it. It is the first capability in this package a third
 * party can supply in place of a first-party one rather than beside it.
 *
 * **These members are never invoked with this `MotionConstraint` as their
 * receiver, and an author may not depend on `this`.** The forbidden receiver is
 * **this record — the one the members are declared on**, the object an
 * installer nests under `constrain`. A constraint written as a class instance —
 * or with any method that reads `this` — is **outside contract**; it must close
 * over its state, as the first-party `bounds()` does.
 *
 * **What the receiver _is_ at any site is unspecified**, and that is the whole
 * of the promise rather than a gap in it. Depending on `this === undefined` is
 * as far outside contract as depending on the record.
 *
 * **Where each member is lifted is mechanism, not promise**, and is free to
 * change while the receiver negative holds.
 */
export type MotionConstraint = Readonly<{
  /** One indirect call per committed sample, and it allocates nothing. */
  apply(motion: MotionDraft, view: ConstraintView): void;
  /** "What you cached is stale." Lazy by contract: it must not read geometry. */
  invalidate(): void;
  retire(): void;
}>;

/**
 * One flat type, fixed key names, **no discriminator**. There is deliberately
 * no `type`, `kind` or `phase` field: a discriminator invites a runtime
 * `switch`, which is exactly what the composition model exists to avoid.
 *
 * There is no member for transactional frame state. The constraint's rect
 * lives in the feature's own closure.
 */
export type FreeDragContribution = Readonly<{
  /* single-writer slots */
  constrain?: MotionConstraint;
  startLanding?: LandingStart;

  /** Run in **reverse** installation order — see `assemble`. */
  retire?: Disposer;

  // The two contribution records must declare equal key sets;
  // `tests/composition.declaration.test.ts` asserts it, so a slot added
  // without its twin fails at the moment it is added (D-88).
  /**
   * **Mutual exclusion, not slots.**
   *
   * The rule is **key-set totality**: both contribution records declare the
   * same key set, and a key a behavior does not implement it declares
   * `?: never`. Free drag implements three of the seven and excludes these
   * four; the sortable implements six and excludes `constrain`. **The boundary
   * is asymmetric because the slot sets are.**
   *
   * Each name is the **defining capability of the other behavior** rather than
   * an arbitrary marker, so the type says the true thing: a free-drag
   * contribution has no insertion, no placeholder and no displacement hooks,
   * and an object carrying one is not one. Without the exclusions a hoisted
   * **unannotated** installer carrying `{ placeholder, retire }` would compile
   * into free drag's public `plugins` and be silently discarded.
   *
   * An installer returning `{}` stays assignable to both, correctly — an empty
   * contribution genuinely is valid for either behavior.
   */
  insertion?: never;
  placeholder?: never;
  beforeInsertionMove?: never;
  afterInsertionMove?: never;
}>;

export type FreeDragInstaller = (
  context: FeatureContext,
) => FreeDragContribution;
