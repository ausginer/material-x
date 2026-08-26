/**
 * **The consumer-facing fault vocabulary** (D-64, D-130, D-132).
 *
 * ~~`FailureStage` is how a *behavior* classifies, which is kernel-tier work.
 * An ordinary consumer receives a `DraggableError` carrying a coarse `code`
 * instead, and never a stage.~~ **Reversed at D-132.** The stage *is* the
 * classification, at both tiers: `DraggableError` carries the one the kernel
 * classified with, and `drag.js` publishes the vocabulary so an ordinary
 * consumer can name it without reaching the kernel entry.
 *
 * **Why the coarse code went.** It answered *whose fault* from data that
 * answers *where the library was standing*, and D-81 had already settled that
 * those are different questions — one consumer-supplied `bounds` source
 * surfaces as `ACTIVATION`, `RENDERER_WRITE`, `ACTION_EFFECT` or `RELEASE`
 * depending only on which seam resolved the rect first, and the mapping turned
 * every one of those into a code that said *not yours*. That is not coarseness;
 * a coarse answer is right and imprecise. Twelve stages fold to four codes and
 * four codes recover nothing, so the derivation was pure one-way loss on top of
 * an axis change (D-132 §2).
 *
 * **Two classes, one channel** (D-130). ~~A consequential failure reaches
 * `onError` and everything else reaches the platform reporter.~~ The
 * destination no longer encodes severity: every fault the library surfaces
 * reaches the consumer's `onError`, and **which class arrives** says whether
 * the operation was affected. The discriminator is *outcome, not effect*: a
 * fault is consequential when it changes the operation's terminal result, its
 * phase sequence or its settlement, and trajectory, timing and presentation
 * quality are none of those.
 */

import type { FailureStage } from './failures.ts';

/**
 * **The stage in words, for the message and nothing else** (D-132 §5.3).
 *
 * `err.stage === 4` in a logged payload is worse than a word, and D-132 pays
 * that cost here rather than in the type: `message` is the human channel and
 * `stage` the machine one, explicitly split, instead of one string union trying
 * to be both (which is the twelve-member `code` union §4.4 refused).
 *
 * **This is not `STAGE_TO_CODE` under a new name.** That table derived a
 * *published, branchable* attribution from a seam position and was wrong to;
 * this one renders a number a consumer already holds. Nothing reads it back, no
 * consumer is invited to parse it, and a reworded entry breaks no caller — so
 * the twelve name/constant pairs it creates carry none of the never-diverge
 * obligation D-74 is this package's worked example of.
 *
 * Positional and padded for the same reason the code map was: the tuple is
 * indexed by the wire value, so an unpadded hole would silently shift every
 * later name by one. Slots 0, 12 and 13 are unreachable — 12 is D-130's hole
 * and 13 is D-41's — and hold `''`, which is cheap to repeat and reads as *no
 * stage has this number*. The `satisfies` keeps the mapping total: adding a
 * stage without naming it does not compile.
 */
const STAGE_NAMES = [
  '', // 0 — unused
  'admission', // 1  FAILURE_ADMISSION
  'activation', // 2  FAILURE_ACTIVATION
  'renderer write', // 3  FAILURE_RENDERER_WRITE
  'action prepare', // 4  FAILURE_ACTION_PREPARE
  'action effect', // 5  FAILURE_ACTION_EFFECT
  'invalidation', // 6  FAILURE_INVALIDATION
  'scheduled frame', // 7  FAILURE_SCHEDULED_FRAME
  'resolution', // 8  FAILURE_RESOLUTION
  'release', // 9  FAILURE_RELEASE
  'landing create', // 10 FAILURE_LANDING_CREATE
  'landing interrupted', // 11 FAILURE_LANDING_INTERRUPTED
  '', // 12 — the D-130 hole
  '', // 13 — the D-41 hole
  'terminal callback', // 14 FAILURE_TERMINAL_CALLBACK
] as const satisfies Record<FailureStage, string>;

/**
 * A class, therefore a **runtime value** rather than an erased type: a consumer
 * writes `err instanceof DraggableError`, and so does a kernel-tier behavior
 * author. That is what keeps it on `drag.js`, the shared root — putting it on
 * `sortable.js` would make a kernel author import the sortable behavior to
 * recognise an error the kernel raised, and putting it on `kernel.js` would
 * make an ordinary consumer import the kernel to recognise an error its own
 * handler was given (D-64).
 *
 * **`stage` replaces `code`, and the rename is the point** (D-132 §5.1).
 * `failures.ts` forbids a rename that repoints a value precisely because a name
 * surviving a meaning change makes the break silent; keeping `code` while
 * changing both its type and its axis would leave `err.code === 'consumer'`
 * compiling to a comparison that is now always false. Under the rename it is a
 * missing property. This was available exactly once — the package is
 * `private: true` at `0.1.0` — and D-132 spent it.
 *
 * **`null` means the controller is destroyed, and it is the only value that
 * does.** It is `panic`'s, and it is an improvement on the `platform` code it
 * replaces rather than a concession: `FailureStage` classifies faults *within*
 * an operation, and panic ends the controller, so there is nothing to classify.
 * Manufacturing a thirteenth stage for it would reproduce on the fatal class
 * exactly the defect D-130 forbade on the other one. It is **not** *unknown*,
 * and it must not become a bucket — a second stage-less consequential fault is
 * one of the things D-132 records as reversing it (§11).
 *
 * `cause` is the native ES2022 property and is deliberately not redeclared.
 */
export class DraggableError extends Error {
  readonly stage: FailureStage | null;

  constructor(stage: FailureStage | null, cause: unknown) {
    super(
      // Preserved rather than flattened: the classifying error is the only
      // thing that says *what* went wrong, and the stage says only where the
      // library was standing when it did.
      cause instanceof Error
        ? cause.message
        : stage === null
          ? 'drag: controller destroyed'
          : `drag: ${STAGE_NAMES[stage]} failure`,
      { cause },
    );
    this.name = 'DraggableError';
    this.stage = stage;
  }
}

/**
 * **A fault that must be surfaced and did not replace the outcome** (D-130).
 *
 * A failing disposer, a rollback that threw on its way out, a landing
 * measurement that could not be trusted, a duplicate gate hold. The operation
 * terminated exactly as it would have: same terminal result, same phase
 * sequence, same settlement. What the consumer lost is trajectory, timing or a
 * released resource — never an answer.
 *
 * **It does not extend {@link DraggableError}, and that is the load-bearing
 * part of the design.** `err instanceof DraggableError` is published and
 * already means *my operation was affected*; a warning that satisfied it would
 * silently turn every existing handler into one that treats advisory
 * diagnostics as failures — the coupling D-130 exists to remove, reintroduced
 * through the type graph. Both extend `Error` directly, and there is **no
 * shared base**: the callback's parameter is a two-member union, which needs no
 * supertype to be written down.
 *
 * **No discriminator, and D-132 did not give it one.** `DraggableError.stage`
 * is a position a consumer may branch on because something follows from it;
 * nothing follows from a warning — by construction the outcome did not change,
 * so there is no decision to take (D-132 §4.3). ~~`DraggableError.code` is a
 * coarse fault attribution a consumer might branch on.~~ That was the D-130
 * contrast and the field it named is gone; the argument is unaffected, because
 * it never rested on how *fine* the fatal class's discriminator was. So the
 * payload is the message and `cause`, and the message carries the weight a
 * discriminator would: it **names the reason** while `cause` carries whatever
 * was caught. Adding a field later is additive; publishing one now freezes it.
 */
export class DraggableWarning extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'DraggableWarning';
  }
}

/**
 * The one channel, as seen by a module that does not own it (D-130).
 *
 * Kernel-internal. It is threaded to the four sites that hold no controller
 * reference — the lifetimes, the top-layer acquisition and both composition
 * unwinds — rather than published, because a behavior reaches the consumer
 * through its own callbacks slot and never through this.
 */
export type Notify = (error: DraggableError | DraggableWarning) => void;
