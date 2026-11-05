/**
 * Free drag's middle tier, mirroring `sortable/feature.js`. An installer runs
 * once while a concrete behavior instance is being constructed. It may create
 * any private runtime, it captures that runtime in the callbacks it returns,
 * and it returns a flat object of named contributions.
 *
 * There are three keys, as in the sortable, no discriminator, and the same
 * closed-world rule. A new semantic call into behavior code needs a coordinated
 * edit to one contribution group, the slot record, the assembler and the
 * behavior's call sites. In exchange, slots are called directly, with no
 * runtime descriptor interpretation.
 *
 * The group that declares a slot sets its cardinality. `constrain` can come
 * from `bounds` and nowhere else, and `landingTiming` from `landing` and
 * nowhere else, so a second writer cannot be represented and needs no check.
 *
 * This module has no runtime exports. Every name here is erased.
 *
 * An installer is externally inert: it may allocate and capture, but it may not
 * attach a listener, write the DOM, or acquire anything that needs release.
 * Every acquisition happens inside a kernel-owned operation lifetime.
 */
import type { Disposer } from '../kernel/lifetimes.ts';
import type { DOMRealm } from '../kernel/realm.ts';
import type {
  FeatureContext,
  LandingContribution,
} from '../shared/composition.ts';

/**
 * The types the middle tier structurally reaches, re-exported. Publishing the
 * contribution groups publishes everything they structurally name, so those
 * types get the same versioning promise whether or not this file lists them.
 * The only choice is whether an installer author can write them down.
 * `tests/docs.node.test.ts` fails on any public type that reaches an unexported
 * one, which keeps the two in step.
 *
 * `FeatureContext` and `LandingContribution` are the same declarations that
 * `sortable/feature.js` publishes: a shared type identity, not a structural
 * coincidence, and not a shared vocabulary. `LandingContribution` joins
 * `FeatureContext` because both behaviors' `landing` key produces exactly that
 * type.
 */
// The composition check's four helpers travel with them: the entry signature
// names `FreeDragComposition`, whose own closure resolves here. Every one of
// them is erased.
export type {
  Composed,
  FeatureContext,
  LandingContribution,
  LandingTiming,
  Misplaced,
  UniqueIn,
  UniqueSlot,
} from '../shared/composition.ts';

// Erased entirely: `declare const` emits no JavaScript, and the brand is a
// property no value ever carries. Its only job is to make the two installer
// types nominal at the parameter position.
declare const FREE_DRAG_FEATURE: unique symbol;

/**
 * The context a free-drag installer receives.
 *
 * It is a {@link FeatureContext} and one compile-time brand. The brand is why a
 * sortable installer is not a free-drag installer. Nothing carries the brand at
 * runtime and nothing reads it. An installer parameter is checked
 * contravariantly, so a function written against the other behavior's context
 * is refused where this one is expected, and the other way round.
 *
 * An author never writes this type. Filling `bounds`, `landing` or a `plugins`
 * entry types the parameter from the slot, and storing an installer in `const
 * install: ConstraintInstaller = (context) => …` types it from the alias.
 */
export type FreeDragFeatureContext = FeatureContext &
  Readonly<{ [FREE_DRAG_FEATURE]: never }>;
export type { Disposer } from '../kernel/lifetimes.ts';
export type { DOMRealm } from '../kernel/realm.ts';
export type { LandingTail } from '../kernel/spec.ts';

/**
 * The scalars a constraint reads and writes, by reference.
 *
 * `apply` writes the clamped values back into an object the behavior owns and
 * passes down, and does not return a point, so a committed sample allocates
 * nothing.
 */
export type MotionDraft = {
  /** The origin-relative delta, in the space `lift.write` consumes. */
  x: number;
  y: number;
};

/**
 * What a constraint may read while clamping. Everything on it is committed or
 * construction-time state, so `apply` performs no layout read of its own. A
 * feature that needs one caches it and refreshes it on `invalidate()`.
 */
export type ConstraintView = Readonly<{
  realm: DOMRealm;
  /**
   * The visual's viewport rect at grab. The basis every clamp is relative to.
   */
  originRect: DOMRectReadOnly;
  visual: HTMLElement;
}>;

// `InsertionGeometry` states the same `this` convention as the block below: an
// author writing against both middle tiers must not meet two conventions.
/**
 * A paired capability. The behavior owns the events that make a bounds rect
 * stale: activation, scroll, resize, `invalidate()`, release. The feature owns
 * the rect. Neither can do the other's part, so a resolver cannot be installed
 * without its invalidator.
 *
 * This slot has a single writer, and that is how the capability extends. A
 * consumer who wants grid snapping, magnetic guides or a custom containment
 * rule writes a middle-tier installer that fills this slot instead of
 * `bounds()`. The library ships none of these.
 *
 * **These members are never invoked with this `MotionConstraint` as `this`, and
 * an author may not depend on `this`.** The forbidden `this` value is this
 * record: the one the members are declared on, the object an installer nests
 * under `constrain`. A constraint written as a class instance, or with any
 * method that reads `this`, is outside the contract. It must close over its
 * state, as the first-party `bounds()` does.
 *
 * What `this` is at any call site is unspecified. Depending on
 * `this === undefined` is as far outside the contract as depending on `this`
 * being the constraint.
 *
 * Where the library reads each member from the record is not part of the
 * contract, and may change while the `this` rule holds.
 */
export type MotionConstraint = Readonly<{
  /** One indirect call per committed sample, and it allocates nothing. */
  apply(motion: MotionDraft, view: ConstraintView): void;
  /**
   * "What you cached is stale." Lazy by contract: it must not read geometry.
   */
  invalidate(): void;
  retire(): void;
}>;

/**
 * What the `bounds` key's installer returns.
 *
 * `constrain` is required. This key is the only place the slot can come from,
 * so a second writer cannot be expressed.
 *
 * The key names are fixed, and there is no `type`, `kind` or `phase`
 * discriminator. There is no member for transactional frame state either: the
 * constraint's rect lives in the feature's own closure.
 */
export type ConstraintContribution = Readonly<{
  constrain: MotionConstraint;
  /** Runs in reverse installation order. */
  retire?: Disposer;
}>;

/**
 * What a `plugins` entry returns. Free drag has no multi-writer slot, so this
 * group is only a lifetime.
 *
 * A plugin here is an installer that allocates per-instance state and needs it
 * disposed. Any number of plugins may be installed, and a plugin cannot reach
 * either of the two unique slots.
 */
export type FreeDragPluginContribution = Readonly<{
  /** Runs in reverse installation order. */
  retire?: Disposer;
}>;

/**
 * The `bounds` key's installer. It is named for the capability and not for
 * `bounds()`, the first-party feature that fills it, because a third party
 * supplies a constraint instead of `bounds()`.
 *
 * It runs once, while a concrete behavior instance is being constructed, and is
 * externally inert.
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
