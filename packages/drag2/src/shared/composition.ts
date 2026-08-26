/**
 * The composition vocabulary **both** middle tiers need, declared once.
 *
 * **One declaration, two publications — and deliberately not a generalization**
 * (F-64). `FeatureContext` is structurally identical for the two behaviors, and
 * so are two contribution slots and the installer *shape*, but no cross-behavior
 * composition vocabulary is invented over them.
 *
 * What lands instead is the narrower re-home pattern (D-68). This module is
 * internal and is on no entry; `sortable/feature.js` and `free-drag/feature.js`
 * each re-export the name, so the two tiers share a type **identity** rather
 * than a structural coincidence. B-7 asserts exactly that — same declaration,
 * not same shape.
 *
 * The installer and contribution aliases stay per-behavior, because their
 * bodies genuinely differ: three slots against six, and not one of the six in
 * common beyond `startLanding` and `retire`.
 */
import type { DOMRealm } from '../kernel/realm.ts';

export type FeatureContext = Readonly<{
  realm: DOMRealm;
  // No code reads `root`, and the two tiers publish it with different
  // referents, so a reader who assumes the wrong one fails silently. Read as
  // evidence against widening the shared vocabulary, not for it (F-64).
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
   * Report a fault that changed nothing. Deliberately **not** `fail(stage,
   * error)`: a feature closure created at construction cannot know which
   * operation is live, so letting it classify a failure would let a late
   * continuation from one operation settle another. A synchronous throw inside
   * a seam is caught and classified by the kernel's driver at that seam's
   * stage; a landing runner that must fail an operation gets an
   * attempt-scoped `fail` argument.
   *
   * It reaches the consumer's `onError` as a `DraggableWarning` — the only
   * route a composition-time unwind has, since both `assemble` unwinds run
   * before `arm()` when no behavior spec exists at all.
   */
  report(error: unknown): void;
}>;
