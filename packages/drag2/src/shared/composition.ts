/**
 * The composition vocabulary **both** middle tiers need, declared once.
 *
 * **One declaration, two publications — and deliberately not a generalization**
 * (F-64). `FeatureContext` is structurally identical for the two behaviors, and
 * so are two contribution slots and the installer *shape*. Phase 18 declined to
 * unify any of it: inventing a cross-behavior composition vocabulary — a
 * generic `Installer<C>`, a shared contribution base — before two behaviors
 * exist is the generalization Checkpoint E is convened to evidence, and
 * building it here would consume the evidence it is meant to produce.
 *
 * What lands instead is the narrower thing that costs nothing and that F-64
 * names by itself: the **D-68 re-home pattern**. This module is internal and is
 * on no entry; `sortable/feature.js` and `free-drag/feature.js` each re-export
 * the name, so the two tiers share a type **identity** rather than a structural
 * coincidence. B-7 asserts exactly that — same declaration, not same shape.
 *
 * The installer and contribution aliases stay per-behavior, because their
 * bodies genuinely differ: three slots against six, and not one of the six in
 * common beyond `startLanding` and `retire`.
 */
import type { DOMRealm } from '../kernel/realm.ts';

export type FeatureContext = Readonly<{
  realm: DOMRealm;
  /**
   * **The element the behavior is composed on, and it denotes a different
   * element per tier** (CE1-10, 03 §A fragment is a plain declarative partial
   * config): for the sortable it is the **collection root**, the container
   * whose children are the sortable items; for free drag it is the **dragged
   * item itself**, because a free drag composes on one element and has no
   * collection. The name is shared because the *role* is — the composition's
   * own element — not because the referent is.
   *
   * It is spelled out on the one declaration both tiers publish precisely
   * because **no code reads it**: an unread member whose meaning changes
   * silently between the two publications is the cheapest possible drift,
   * since nothing fails when a reader eventually assumes the wrong one. Read
   * as evidence *against* widening F-64, not for it — two tiers sharing a
   * member's name while disagreeing on its referent is what a shared
   * declaration must not be taken to promise.
   */
  root: HTMLElement;
  /**
   * Best-effort platform report. Deliberately **not** `fail(stage, error)`: a
   * feature closure created at construction cannot know which operation is
   * live, so letting it classify a failure would let a late continuation from
   * one operation settle another. A synchronous throw inside a seam is caught
   * and classified by the kernel's driver at that seam's stage; a landing
   * runner that must fail an operation gets an attempt-scoped `fail` argument.
   */
  report(error: unknown): void;
}>;
