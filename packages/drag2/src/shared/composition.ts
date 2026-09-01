/**
 * The composition vocabulary **both** middle tiers need, declared once.
 *
 * **One declaration, two publications — and deliberately not a
 * generalization.** `FeatureContext` is structurally identical for the two
 * behaviors, and so are two contribution slots and the installer *shape*, but
 * no cross-behavior composition vocabulary is invented over them.
 *
 * What lands instead is the narrower re-home pattern. This module is internal
 * and is on no entry; `sortable/feature.js` and `free-drag/feature.js` each
 * re-export the name, so the two tiers share a type **identity** rather than a
 * structural coincidence. The declaration suites assert exactly that — same
 * declaration, not same shape.
 *
 * The installer aliases stay per-behavior: their contexts carry different
 * brands, so a shared alias would defeat the separation this module is careful
 * not to invent. What is shared is the one contribution group both behaviors
 * declare **identically** — the landing key's — for that same identity reason
 * rather than as a generalization.
 */
import type { Disposer } from '../kernel/lifetimes.ts';
import type { DOMRealm } from '../kernel/realm.ts';
import type { LandingTail } from '../kernel/spec.ts';

declare const MISPLACED: unique symbol;

export type FeatureContext = Readonly<{
  realm: DOMRealm;
  // No code reads `root`, and the two tiers publish it with different
  // referents, so a reader who assumes the wrong one fails silently. Read as
  // evidence against widening the shared vocabulary, not for it.
  /**
   * **The element the behavior is composed on, and it denotes a different
   * element per tier**: for the sortable it is the **collection root**, the
   * container whose children are the sortable items; for free drag it is the
   * **dragged item itself**, because a free drag composes on one element and
   * has no collection. The name is shared because the *role* is — the
   * composition's own element — not because the referent is.
   */
  root: HTMLElement;
  /**
   * Report a fault that changed nothing. Deliberately **not**
   * `fail(stage, error)`: a feature closure created at construction cannot know
   * which operation is live, so letting it classify a failure would let a late
   * continuation from one operation settle another. A synchronous throw inside
   * a seam is caught and classified by the kernel's driver at that seam's
   * stage.
   *
   * It reaches the consumer's `onError` as a `DraggableWarning` — the only
   * route a composition-time unwind has, since both `assemble` unwinds run
   * before `arm()` when no behavior spec exists at all.
   */
  report(error: unknown): void;
}>;

/**
 * **The tail's timing, resolved once per landing**, or `null` for no tail —
 * which is what a reduced-motion preference answers, and what a policy answers
 * for a drop it does not want interpolated.
 *
 * The four coordinates are the tail's endpoints in the landing space the kernel
 * publishes: origin-relative viewport deltas, where the visual is and where it
 * was pinned. A distance-derived duration therefore needs no DOM read of its
 * own.
 *
 * Declared here rather than beside the shipped policy so that a composition
 * installing no landing still resolves the slot's type without reaching the
 * feature module for it.
 */
export type LandingTiming = (
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
) => LandingTail | null;

// One declaration for both behaviors' `landing` key: imported from either
// middle tier it must be the **same** declaration rather than two structurally
// equal ones, exactly as `LandingOptions` is. What keeps the two landing
// installers apart is their branded context and nothing else.
/**
 * What the `landing` key's installer returns.
 *
 * `landingTiming` is **required**: a landing installer that times no landing
 * has nothing to install, and the key would then be a config slot rather than
 * an installer.
 */
export type LandingContribution = Readonly<{
  landingTiming: LandingTiming;
  /** Run in **reverse** installation order — see either `assemble`. */
  retire?: Disposer;
}>;

// Negative clauses — `insertion?: never` and the rest — must never be written
// onto a multi-writer group: a group carrying negative knowledge of its
// siblings encodes an invariant that is not a property of the group.
/**
 * The refusal value.
 *
 * Never constructed and never present at runtime. Its only job is to carry the
 * sentence below into the compiler's own diagnostic, which is why the message
 * is a template-literal type rather than a comment.
 */
export type Misplaced<K extends string> = Readonly<{
  [MISPLACED]: `installer contributes '${K}', which only its own config key may install`;
}>;

/**
 * The keys a `plugins` entry may not contribute: **every key a sibling group
 * declares and the plugin group does not**.
 *
 * Derived rather than listed, so a capability added later joins the set by
 * being declared and no group has to be told about it. The model rests on no
 * two non-plugin groups declaring the same unique key, which each behavior's
 * declaration suite asserts.
 */
export type UniqueSlot<Groups, PluginGroup> = Exclude<
  Groups extends unknown ? keyof Groups : never,
  keyof PluginGroup
>;

/**
 * The unique slots one installer contributes, or `never`.
 *
 * **Distributive on both unions on purpose**: `keyof` of a union is the
 * *intersection* of its keys, so the non-distributive spelling would report
 * only the members every contribution shares — which is exactly the plugin
 * group's own, and therefore never a violation. A check that cannot fail is
 * worse than no check.
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
 * slot — and left exactly as it is where it does not. **Multi-writer slots are
 * untouched**: an entry naming only members the plugin group declares maps to
 * itself, so any number of features and plugins keep accumulating into `retire`
 * and into whatever else that group declares.
 *
 * Positional, not arithmetic: it counts nothing and knows nothing about the
 * merge. A misplaced installer is wrong whether or not it survives last-wins,
 * because what is wrong with it is its position.
 */
export type Composed<Plugins, Unique extends PropertyKey> = {
  readonly [I in keyof Plugins]: [UniqueIn<Plugins[I], Unique>] extends [never]
    ? Plugins[I]
    : Misplaced<Extract<UniqueIn<Plugins[I], Unique>, string>>;
};
