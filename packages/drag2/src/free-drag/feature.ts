/**
 * Free drag's **middle tier** (D-61, D-70), mirroring `sortable/feature.js`: an
 * installer runs once while a concrete behavior instance is being constructed,
 * may create whatever private runtime it likes, captures that runtime in the
 * callbacks it returns, and hands back a flat object of named contributions.
 *
 * **Three keys against the sortable's three, no discriminator, and the same
 * closed-world rule**: a new semantic seam is a coordinated edit to one
 * contribution group, the slot record, the assembler and the behavior's call
 * sites. That closed world is what buys direct slot calls with no runtime
 * descriptor interpretation.
 *
 * **Which group a slot is declared on is its cardinality** (D-146): `constrain`
 * is producible from `bounds` and nowhere else, `startLanding` from `landing`
 * and nowhere else, so a second writer is unrepresentable rather than caught.
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
import type {
  FeatureContext,
  LandingContribution,
} from '../shared/composition.ts';

/**
 * **The structural closure of the middle tier, re-exported deliberately**
 * (D-61). Publishing the contribution groups publishes everything they
 * structurally name, so those types acquire the same versioning promise
 * whether or not this file lists them — the only choice is whether an installer
 * author can *write them down*. `tests/docs.node.test.ts` fails on any public
 * type that reaches an unexported one, which keeps the two in step.
 *
 * **`FeatureContext` and `LandingContribution` are the same declarations
 * `sortable/feature.js` publishes** (F-64) — a shared type identity, not a
 * structural coincidence, and deliberately not a shared *vocabulary*. The
 * second joins the first because both behaviors' `landing` key produces exactly
 * it (D-146).
 */
export type {
  FeatureContext,
  LandingContribution,
} from '../shared/composition.ts';

// Erased entirely: `declare const` emits no JavaScript, and the brand is a
// property no value ever carries. Its only job is to make the two installer
// types nominal at the parameter position (D-138).
declare const FREE_DRAG_FEATURE: unique symbol;

/**
 * The context a free-drag installer is handed.
 *
 * It is a {@link FeatureContext} and one compile-time brand, and **the brand is
 * why a sortable installer is not a free-drag installer**. Nothing carries the
 * brand at runtime and nothing reads it: an installer parameter is checked
 * contravariantly, so a function written against the other behavior's context
 * is refused where this one is expected, and the other way round.
 *
 * **An author never writes it.** Filling `bounds`, `landing` or a `plugins`
 * entry types the parameter from the slot, and hoisting into a
 * `const install: ConstraintInstaller = (context) => …` types it from the
 * alias.
 */
export type FreeDragFeatureContext = FeatureContext &
  Readonly<{ [FREE_DRAG_FEATURE]: never }>;
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
 * as far outside contract as depending on `this` being the constraint.
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

// The cardinality model this group states, and the arbitration it replaces:
// D-146.
/**
 * What the `bounds` key's installer returns.
 *
 * **`constrain` is required, and that is the whole of the key's cardinality**:
 * the slot is producible here and nowhere else, so a second writer cannot be
 * expressed rather than being caught by a construction-time throw.
 *
 * Fixed key names, **no discriminator**. There is deliberately no `type`, `kind`
 * or `phase` field: a discriminator invites a runtime `switch`, which is exactly
 * what the composition model exists to avoid. There is no member for
 * transactional frame state either — the constraint's rect lives in the
 * feature's own closure.
 */
export type ConstraintContribution = Readonly<{
  constrain: MotionConstraint;
  /** Run in **reverse** installation order — see `assemble`. */
  retire?: Disposer;
}>;

// D-146.
/**
 * What a `plugins` entry returns, and free drag has **no multi-writer slot**, so
 * the group is a lifetime and nothing else.
 *
 * A plugin here is an installer that allocates per-instance state and needs it
 * released: the position exists, its arity is unbounded, and neither of the two
 * unique slots is reachable from it.
 */
export type FreeDragPluginContribution = Readonly<{
  /** Run in **reverse** installation order — see `assemble`. */
  retire?: Disposer;
}>;

/**
 * The `bounds` key's installer — named for the capability rather than for
 * `bounds()`, the first-party feature that fills it, because a third party
 * supplies a constraint **instead of** it.
 *
 * It runs **once**, while a concrete behavior instance is being constructed, and
 * is externally inert.
 */
export type ConstraintInstaller = (
  context: FreeDragFeatureContext,
) => ConstraintContribution;

/** The `landing` key's installer. See {@link LandingContribution}. */
export type FreeDragLandingInstaller = (
  context: FreeDragFeatureContext,
) => LandingContribution;

/** A `plugins` entry. See {@link FreeDragPluginContribution}. */
export type FreeDragPlugin = (
  context: FreeDragFeatureContext,
) => FreeDragPluginContribution;
