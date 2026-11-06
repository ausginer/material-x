/**
 * The composition vocabulary that both middle tiers need, declared once.
 *
 * There is one declaration and two publications, and this is not a
 * generalization. `FeatureContext` is structurally identical for the two
 * behaviors, and so are two contribution slots and the installer shape, but no
 * cross-behavior composition vocabulary is built over them.
 *
 * This module is internal and is on no entry. `sortable/feature.js` and
 * `free-drag/feature.js` each re-export the name, so the two tiers share a type
 * identity and not a structural coincidence. The declaration suites assert
 * this: same declaration, not same shape.
 *
 * The installer aliases stay per-behavior. Their contexts carry different
 * brands, so a shared alias would defeat the separation that this module keeps.
 * What is shared is the one contribution group both behaviors declare
 * identically, the landing key's, for that same identity reason and not as a
 * generalization.
 */
import type { Disposer } from '../kernel/lifetimes.ts';
import type { DOMRealm } from '../kernel/realm.ts';
import type { LandingTail } from '../kernel/spec.ts';

declare const MISPLACED: unique symbol;

export type FeatureContext = Readonly<{
  realm: DOMRealm;
  // No code reads `root`, and the two tiers publish it with different
  // referents, so a reader who assumes the wrong one fails silently. Read this
  // as evidence against widening the shared vocabulary, not for it.
  /**
   * The element the behavior is composed on. It is a different element per
   * tier. For the sortable, it is the collection root, the container whose
   * children are the sortable items. For free drag, it is the dragged item
   * itself, because a free drag composes on one element and has no collection.
   * The name is shared because the role is shared, the composition's own
   * element, and not because the element is.
   */
  root: HTMLElement;
  /**
   * Reports a fault that changed nothing. This is not `fail(stage, error)`,
   * because a feature closure created at construction cannot know which
   * operation is live. If it could classify a failure, a late continuation from
   * one operation could settle another. The kernel catches a synchronous throw
   * inside a behavior callback and classifies it at that callback's stage.
   *
   * It reaches the consumer's `onError` as a `DraggableWarning`. This is the
   * only route a composition-time rollback has, since an `assemble` rollback
   * runs before arming, when no behavior spec exists at all.
   *
   * The report is delivered until the controller's destruction is applied, and
   * dropped from then on. A report made while the controller is being
   * constructed, or between a destruction request and its application, is
   * delivered. One made after application, from a retire hook as teardown runs
   * it or from a continuation an installer kept, is dropped silently.
   */
  report(error: unknown): void;
}>;

/**
 * The landing animation's timing, resolved once per landing, or `null` for no
 * animation. A policy returns `null` for a drop it does not want interpolated.
 * A reduced-motion preference does not produce this `null`: it reduces the
 * duration to zero, so a policy that reads the duration still runs exactly once
 * per landing either way.
 *
 * The four coordinates are the animation's endpoints in the landing space the
 * kernel publishes: origin-relative viewport deltas, where the visual is and
 * where the drop decided it belongs. A distance-derived duration therefore
 * needs no DOM read of its own.
 *
 * Declared here and not beside the shipped policy, so that a composition that
 * installs no landing still resolves the slot's type without reaching the
 * feature module for it.
 */
export type LandingTiming = (
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
) => LandingTail | null;

// One declaration for both behaviors' `landing` key: imported from either
// middle tier it must be the same declaration and not two structurally equal
// ones, exactly as `LandingOptions` is. Only their branded contexts keep the
// two landing installers apart.
/**
 * What the `landing` key's installer returns.
 *
 * `landingTiming` is required. A landing installer that times no landing has
 * nothing to install, and the key would then be a config slot and not an
 * installer.
 */
export type LandingContribution = Readonly<{
  landingTiming: LandingTiming;
  /** Run in reverse installation order. See each `assemble`. */
  retire?: Disposer;
}>;

// Never write negative clauses, such as `insertion?: never`, onto a
// multi-writer group: a group with negative knowledge of its siblings encodes
// an invariant that is not a property of the group.
/**
 * The refusal value.
 *
 * Never constructed and never present at runtime. Its only job is to carry the
 * sentence below into the compiler's own diagnostic, so the message is a
 * template-literal type and not a comment.
 */
export type Misplaced<K extends string> = Readonly<{
  [MISPLACED]: `installer contributes '${K}', which only its own config key may install`;
}>;

/**
 * The keys a `plugins` entry may not contribute: every key a sibling group
 * declares and the plugin group does not.
 *
 * Derived and not listed, so a capability added later joins the set by being
 * declared, and no group has to be told about it. The model requires that no
 * two non-plugin groups declare the same unique key, which each behavior's
 * declaration suite asserts.
 */
export type UniqueSlot<Groups, PluginGroup> = Exclude<
  Groups extends unknown ? keyof Groups : never,
  keyof PluginGroup
>;

/**
 * The unique slots one installer contributes, or `never`.
 *
 * This is distributive on both unions, because `keyof` of a union is the
 * intersection of its keys. The non-distributive form would report only the
 * members every contribution shares. Those are the plugin group's own members,
 * so it would never report a violation. A check that cannot fail is worse than
 * no check.
 */
export type UniqueIn<
  Installer,
  Unique extends PropertyKey,
> = Installer extends (context: never) => infer C
  ? C extends unknown
    ? Extract<keyof C, Unique>
    : never
  : never;

/**
 * Each `plugins` entry, replaced by a refusal where it contributes a unique
 * slot and left unchanged where it does not. Multi-writer slots are untouched.
 * An entry naming only members the plugin group declares maps to itself, so any
 * number of features and plugins keep accumulating into `retire` and into
 * whatever else that group declares.
 *
 * This check is positional and not arithmetic: it counts nothing and knows
 * nothing about the merge. A misplaced installer is wrong whether or not it
 * survives last-wins, because its position is what is wrong.
 */
export type Composed<Plugins, Unique extends PropertyKey> = {
  readonly [I in keyof Plugins]: [UniqueIn<Plugins[I], Unique>] extends [never]
    ? Plugins[I]
    : Misplaced<Extract<UniqueIn<Plugins[I], Unique>, string>>;
};
