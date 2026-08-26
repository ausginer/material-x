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
 * **The constructed message names the stage as a number** (D-133). ~~A
 * `STAGE_NAMES` tuple rendered it in words, because `err.stage === 4` in a
 * logged payload is worse than `action prepare`.~~ **The symptom is real and
 * this was never on its path.** The message below is the *cause's* whenever a
 * cause is an `Error`, which is every ordinary fault the library reports — so
 * the table ran only when a consumer threw a non-`Error`, and the bare
 * `stage === 4` payload D-132 §5.3 set out to fix never reached it. It cost the
 * shared root 115 B of its 261 to say a word on the one path where the
 * consumer had already thrown something unusual (F-105).
 *
 * **Twelve constants are published so a consumer can name the number.** Doing
 * it for them, in every install, on a path most never reach, is what
 * `CODE_OF_SIZE` §4's install-weight clause refuses. `__DEV__` is not the
 * escape either: it is substituted at *this* package's build time and is
 * `false` in the published bundle, so the only audience for the words would be
 * this repository's own suite.
 *
 * **`null`'s message stays a fixed string**, because it is the one case a
 * number cannot state — there is no stage, and *the controller is destroyed* is
 * what F-104 exists to make sayable. One string is not twelve.
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
          : `drag: failure at stage ${stage}`,
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
