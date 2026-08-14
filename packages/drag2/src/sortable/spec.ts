/**
 * Every sortable seam, as closures over one private runtime (D-4).
 *
 * The kernel drives all three phases of every transaction; this module supplies
 * the two pure-ish halves. Nothing here calls `begin()` or `commit()`, nothing
 * here reads `current` from a `prepare`, and nothing here can close a lifetime
 * the kernel owns — those are properties of the arguments, not of discipline.
 */
import { toDraggableError } from '../kernel/errors.ts';
import {
  AT_CONSUMER,
  AT_PROPOSAL,
  FAILURE_INVALIDATION,
  FAILURE_RELEASE,
  FAILURE_REORDER_RESOLUTION,
  FAILURE_SCHEDULED_FRAME,
  FAILURE_TERMINAL_CALLBACK,
  type FailureStage,
} from '../kernel/failures.ts';
import type { Draft, Frame } from '../kernel/frames.ts';
import {
  COMMAND_OWNERS,
  pathOwnsInteraction,
  POINTER_OWNERS,
} from '../kernel/input-policy.ts';
import { createInvalidator } from '../kernel/invalidation.ts';
import { ACTIVATING, ACTIVE, IDLE, RELEASING } from '../kernel/phases.ts';
import { LIFT_FAITHFUL } from '../kernel/presentation.ts';
import { KEY_DOWN } from '../kernel/protocol.ts';
import { guarded } from '../kernel/reporter.ts';
import {
  type AdmissionSubject,
  type BehaviorSpec,
  type PreparedSettlement,
  type SeamRejection,
  SETTLED_CANCELED,
  SETTLED_FAILED,
  SETTLED_FULFILLED,
  SETTLED_REJECTED,
  SETTLED_SKIPPED,
  type SettlementScope,
} from '../kernel/spec.ts';
import type { Point } from '../kernel/types.ts';
import {
  buildReorderProposal,
  CHANGE_CANCEL,
  copyUniqueItems,
  homeInsertion,
  reconcileCollection,
} from './collection.ts';
import {
  CANCEL_COLLECTION_INVALIDATED,
  CANCEL_ITEM_REMOVED,
  type CollectionSnapshot,
  type Insertion,
  isReorderResolution,
  OUTCOME_ACCEPTED,
  OUTCOME_CANCELED,
  OUTCOME_FAILED,
  OUTCOME_NOOP,
  OUTCOME_REJECTED,
  RECOVERY_DESTINATION,
  RECOVERY_HOME,
  RECOVERY_IMMEDIATE,
  type ReorderTransactionResult,
} from './domain.ts';
import {
  createSortableFramePart,
  resetSortableFramePart,
  type SortableFramePart,
} from './frames.ts';
import { directionOf, keyboardInsertion } from './keyboard.ts';
import {
  createPlaceholder,
  movePlaceholder,
  placeholderAt,
  type PlaceholderUndo,
} from './placement.ts';
import {
  type PresentationView,
  SORTABLE_ACTION_TAGS,
  type SortableRuntime,
  TAG_INVALIDATION,
  TAG_SPATIAL,
} from './runtime.ts';
import type { DisplacementView } from './slots.ts';

/** What `action.prepare(COLLECTION)` stages. It never discards (D-25). */
type PreparedCollection = Readonly<{
  /**
   * `null` on the **geometry-only** branch (D-44): `items()` returned the same
   * array identity, so there is no structural change, nothing to publish and no
   * O(n) copy to pay. The effect invalidates geometry and ends.
   */
  snapshot: CollectionSnapshot | null;
  /**
   * The consumer's own array, carried through so the effect can advance the
   * structural baseline. `snapshot.items` is the library's copy and can never
   * match what `items()` returns next.
   */
  source: readonly HTMLElement[];
  /** Non-null when the gap could not survive the replacement. */
  cancelReason: unknown;
}>;

/** A staged value that carries nothing. */
/**
 * The spatial action's staged value. Exported so the legality guard can be
 * driven directly in a test: no producer can reach the illegal phases, so the
 * guard is otherwise unobservable.
 */
export const STAGED = true;

/**
 * The three states of D-66's progress marker, module-private because they are
 * behavior-internal: nothing outside this file may read how far an operation
 * got, and nothing in the kernel could interpret it if it did.
 */
const MINTED = 0;
const STARTED = 1;
const RESOLVING = 2;

const rejection = (stage: FailureStage, message: string): SeamRejection => ({
  stage,
  error: new Error(message),
});

export function createSortableSpec(
  rt: SortableRuntime,
): BehaviorSpec<SortableFramePart> {
  const { host, slots } = rt;
  const { realm } = host;
  // One per controller. Arming is per operation, on the motion signal.
  const invalidate = createInvalidator(realm);
  /**
   * The terminal latch as a predicate, for the barriers that cannot reach
   * `host`: the candidate loop inside the feature's private `RectIndex`, the
   * displacement hooks' own measurement loops, and `createPlaceholder`'s
   * post-factory mechanics. Every barrier written *in this file* reads
   * `host.closed` directly instead; this closure is created once per controller
   * and copied by reference onto each per-operation view.
   *
   * **D-53 supplies the reading; D-38 rules out the alternatives.** Physical
   * teardown is deferred to the transaction boundary (D-36), so a disposed
   * lifetime, an aborted signal, a nulled slot and a detached node all lag the
   * logical close and none of them may answer a liveness question (I-37).
   */
  const live = (): boolean => !host.closed;
  /**
   * **Minted here and monotonic per controller** (D-44 moved it off the
   * controller with the payload), and deliberately **not** derived from
   * `rt.snapshot.version`. Two structural invalidations applied inside one
   * drain would both read the same *published* version and stamp two distinct
   * collections identically, which destroys version's only job: being the
   * identity of a snapshot. Seeded from the initial snapshot so the sequence
   * stays continuous with it.
   *
   * It advances on the structural branch only — a geometry-only invalidation
   * produces no collection, so it must not consume an identity.
   */
  let { version } = rt.snapshot;

  /**
   * The rollback ledger for a **prepared but unadopted** placeholder (D-39).
   *
   * Per-operation, and it lives here rather than on the runtime because it is
   * not runtime state: it exists only between `activation.prepare` returning
   * and the seam committing, which is the one window in which the element is
   * mutated and not yet owned. `rt.placeholder` is written by `effect`, on the
   * far side of that window.
   *
   * `null` whenever there is nothing staged — including for the library's own
   * `<div>`, whose undo is being dropped.
   */
  let placeholderUndo: PlaceholderUndo = null;

  /**
   * **How far the operation got, as one monotone marker** (D-66 §The progress
   * marker). Per operation, cleared in `retire()`.
   *
   * It exists because the failure path owes a terminal and the kernel cannot
   * supply the two facts that decide which one: *did the consumer hear this
   * drag start*, and *was the consumer's resolver actually invoked*. Both are
   * behavior knowledge, and both are already written at sites the behavior
   * owns — so this is a marker rather than an SPI member.
   *
   * `RESOLVING` is truthful **by construction**: the kernel runs the `invoke`
   * closure only after `release.effect` returns normally, and `invoke: null`
   * means there was no round-trip at all. Deriving it from `proposal !== null`
   * would be false — the proposal commits one seam earlier, in
   * `release.prepare`.
   */
  let progress = MINTED;

  /**
   * The admitted item, from the event's **composed path** rather than
   * `event.target`: the press may land inside a shadow root, and the item is
   * whichever ancestor the snapshot knows.
   *
   * Shared by both ingresses (D-32) so that "a handle gates the keyboard path
   * too" is one rule in one place rather than two implementations that agree.
   */
  const resolveItem = (
    event: Event,
    snapshot: CollectionSnapshot,
    owners: string,
  ): HTMLElement | null => {
    const path = event.composedPath();
    let item: HTMLElement | null = null;
    // **The index, not just the element** (D-46). The decline test runs over
    // the hops between the event target and the resolved subject, so the walk
    // that finds the item has to report where it stopped.
    let subject = 0;

    for (; subject < path.length; subject += 1) {
      if (snapshot.items.includes(path[subject] as HTMLElement)) {
        item = path[subject] as HTMLElement;
        break;
      }
    }

    if (item === null) {
      return null;
    }

    if (slots.getHandle !== null) {
      const handle = slots.getHandle(item);

      // **The terminal barrier on the admission sequence** (I-36). `getHandle`
      // is consumer code, and `seedDraft` calls a *second* consumer resolver
      // right after this returns — so a handle resolver that destroyed the
      // controller would otherwise have `visual()` called after `destroy()`
      // returned. The kernel's own post-`admit` recheck stops the operation
      // from being minted, but it runs after the whole callback and cannot make
      // that second call un-happen.
      //
      // It **declines**, it does not throw: a throw reaches
      // `reportFailure(FAILURE_ADMISSION)` and would tell the consumer that its
      // own `destroy()` was a library failure. Declining leaves the controller
      // idle (I-32), mints nothing, and — on the command path — leaves the
      // arrow key its native meaning, which is right for a controller that no
      // longer exists.
      //
      // A handle *narrows* admission; it never replaces the item.
      if (host.closed || handle === null) {
        return null;
      }

      // `indexOf` where this used to read `includes`: the same containment
      // test, and the position is what D-50 needs. **The resolved subject
      // governs** — a handle inside the item sits *earlier* in the composed
      // path, so scoping to it shortens the segment the decline test walks,
      // and a handle that is itself an interactive element admits, because
      // the consumer scoped dragging there on purpose.
      subject = path.indexOf(handle);

      if (subject === -1) {
        return null;
      }
    }

    // **What did the event land on** (D-46), asked after the subject is known
    // and before anything is seeded. The press that reaches an interactive or
    // editable descendant declines by the ordinary total-decline path (I-32):
    // no operation, no phase change, and — since the kernel prevents nothing
    // for a `null` — focus lands, the caret places, the slider tracks and the
    // arrow key keeps its native meaning.
    return pathOwnsInteraction(path, subject, owners) ? null : item;
  };

  /**
   * The second half of admission: resolve the visual and the box, and seed the
   * draft with an item **already resolved**. Returns the admission subject.
   *
   * Split from {@link admitFrom} for the command path, which needs the item
   * before it can decide feasibility. Resolving twice would call the consumer's
   * `handle()` resolver twice for one keydown (D1, Checkpoint D) — observable,
   * because a resolver is stateful in general and is explicitly allowed to
   * queue `invalidate()`, so the side effect would be queued twice and the
   * operation could reconcile through two snapshots for one native command.
   */
  const seedDraft = (
    item: HTMLElement,
    snapshot: CollectionSnapshot,
    draft: Draft<SortableFramePart>,
  ): AdmissionSubject | null => {
    let visual = item;

    if (slots.getVisual !== null) {
      visual = slots.getVisual(item);

      // **The terminal barrier on the visual resolver** (I-36 (2) acts 1 and 2,
      // C5-03's stretch sweep), inside the branch because with no resolver
      // composed there is no call here for it to stand behind. `runAdmission`
      // revalidates after this whole callback and declines the operation — but
      // it does not scrub the draft it declined, and teardown scrubbed both
      // frames *before* returning into this line, so the three writes below
      // would pin the item, its visual and the whole snapshot in an inactive
      // frame nothing will clear again (I-20). It **declines** for the same
      // reason `resolveItem` does: destroying your own controller is not a
      // library failure.
      if (host.closed) {
        return null;
      }
    }

    draft.item = item;
    draft.visual = visual;
    draft.snapshot = snapshot;

    // **The box is resolved here and returned, never written to the draft**
    // (D-43, D-59). The kernel needs it before `acquireLift` to take window 1,
    // and the only two carriers are this return value and a behavior-authored
    // draft field the kernel reads back — which would contradict H-2 and D-15.
    // So it travels as the second half of the admission subject.
    //
    // Two ways the box is already known, and neither may call anything.
    // `null` means the config named neither slot, so the item is its own box.
    // **Reference equality means the assembler defaulted `box` to `visual`**
    // (D-43) — and calling it again here would invoke one consumer resolver
    // twice for a single admission, which a stateful resolver can observe and
    // which the candidate-traversal tests caught immediately.
    if (slots.getBox === null || slots.getBox === slots.getVisual) {
      return visual;
    }

    const box = slots.getBox(item);

    // The terminal barrier on the box resolver, for the same reason the visual
    // resolver carries one two statements up: it is consumer code, and a
    // resolver that destroys its own controller must not have its result
    // minted into an operation.
    if (host.closed) {
      return null;
    }

    // Returned as a bare element when the two coincide, so the kernel's `box`
    // and `visual` are the *same reference* and `activation.prepare`'s identity
    // branch can recognise the default case. Two encodings of "the box is the
    // visual" is exactly what D-59 refused for the optional-`box` spelling.
    return box === visual ? visual : { visual, box };
  };

  /**
   * The half of admission both ingresses share: resolve the item, the visual
   * and the box, and seed the draft. Returns the admission subject — a bare
   * visual, or the `{ visual, box }` pair when the two differ (D-59) — or
   * `null` to decline.
   *
   * No `preventDefault()` — the kernel owns that call in both modes. Since
   * D-54 it makes it at the **threshold crossing** on the pointer path and
   * still inside the listener on the command path, but never here and never by
   * the behavior (C-03).
   */
  const admitFrom = (
    event: PointerEvent,
    draft: Draft<SortableFramePart>,
  ): AdmissionSubject | null => {
    // **A modifier requests native text selection; its absence means drag**
    // (D-46). A gesture across prose inside a draggable region is longer than
    // the threshold by construction, so both readings — "select this text" and
    // "drag this row" — fit the same input and no evidence distinguishes them
    // (probe E R-3). The contract does not try: `Alt` held at `pointerdown`
    // declines, and the press keeps its full native meaning by the ordinary
    // decline path. One branch, no state, no disambiguation window, no
    // deferred `preventDefault()`.
    if (event.altKey) {
      return null;
    }

    const { snapshot } = rt;
    const item = resolveItem(event, snapshot, POINTER_OWNERS);

    return item === null ? null : seedDraft(item, snapshot, draft);
  };

  /**
   * The failure the open settlement seam is reporting, handed from `prepare` to
   * `effect` because `PreparedSettlement` carries only the gate declaration.
   *
   * **This is an accepted out-of-band channel, not an oversight** — reviewed
   * and deliberately kept rather than widening the frozen `PreparedSettlement`
   * (checkpoint A, A-13). What makes it transaction-safe is not "seams do not
   * currently re-enter" but a stronger, enforced property:
   *
   * 1. `runCore` is the only driver of this seam and always runs `prepare`
   *    before `effect`, and `prepare` **clears the slot on entry** (below).
   *    So a value can only ever be read by the effect of the very transaction
   *    whose prepare wrote it — there is no window in which one settlement's
   *    effect could observe another's failure.
   * 2. Every path that abandons a transaction between the two phases —
   *    `prepare` returning a `SeamRejection`, `SEAM_INVALIDATED` from a held
   *    cancel latch, a reentrant `destroy()` — skips the effect and therefore
   *    leaves the slot set; the *next* prepare's clear is what collects it.
   *    Staleness is impossible by construction, not by timing.
   * 3. The driver refuses a nested seam outright (`refuseReentry`), so no
   *    third party can interleave a write between the pair.
   *
   * The cost of the alternative is a change to a frozen SPI type with no
   * failing executable case behind it, which contract 00 forbids. Revisit only
   * if a real case appears; the invariant to preserve if this is ever touched
   * is (1) — **prepare must clear before it can write**.
   */
  let pendingFailure: Readonly<{ stage: FailureStage; error: unknown }> | null =
    null;

  /**
   * `invalidateInsertion()` narrowed to its own stage.
   *
   * Every call site below is inside a kernel-driven seam, so the surrounding
   * phase would otherwise classify a throw as *its* stage — an activation
   * failure, a placeholder-move failure — and `DragErrorContext.stage` would
   * name the wrong thing. `host.fail` narrows from the inside, which is the
   * mechanism the contract specifies for exactly this (contract 02 §Failure
   * classification: `INVALIDATION` (home)).
   *
   * Returns whether it succeeded, because the latched failure already decides
   * the seam's outcome: a caller that would go on to publish or to notify must
   * stop instead.
   */
  const invalidateInSeam = (): boolean => {
    try {
      slots.invalidateInsertion();
      return true;
    } catch (error) {
      host.fail(FAILURE_INVALIDATION, error);
      return false;
    }
  };

  /**
   * `measureInsertion()` narrowed to `FAILURE_INVALIDATION`, for the same
   * reason as {@link invalidateInSeam}: it is geometry-cache maintenance, and
   * the surrounding phase would otherwise classify a throw as a
   * placeholder-move failure. It is the eager half of the same concern and
   * shares the stage — and therefore the recovery — with the lazy half.
   */
  const measureInSeam = (
    frame: Readonly<Frame<SortableFramePart>>,
    view: PresentationView,
  ): boolean => {
    const measure = slots.measureInsertion;

    if (measure === null) {
      return true;
    }

    try {
      measure(frame, view);

      // **The terminal barrier on the eager rebuild** (I-36). `measure` walks
      // the candidate list through the consumer's `visual()` resolver, so a
      // destroy raised from inside it takes the same exit `action.effect`
      // already has for a classified measure failure — nothing after it in the
      // bracket runs, and no `afterMove` hook starts an animation on a
      // torn-down controller.
      return !host.closed;
    } catch (error) {
      host.fail(FAILURE_INVALIDATION, error);
      return false;
    }
  };

  /**
   * Releases every displacement offset before release measures anything.
   *
   * Release re-resolves after motion closes, and it does so while the last
   * committed move's displacement is still in flight — so without this it
   * measures items mid-animation and can propose a different gap from the one
   * settled geometry gives. That gap is not an intermediate artefact: it is the
   * `ReorderRequest` the consumer is asked to apply.
   *
   * `beforeMove` is reused rather than given a call site of its own, because it
   * already means exactly this: *the placeholder is about to move, hand back
   * what you are holding.* `release.effect` does move it. The gap passed is the
   * incumbent one — the honest best estimate before resolution supersedes it,
   * and the only cost of it being superseded is one element measured for
   * nothing.
   *
   * **A deliberate, bounded exception to "prepare performs no DOM writes."**
   * What it writes is the release of temporary offsets this library itself
   * applied; it publishes nothing, changes no tree, and leaves every row at the
   * position it was already animating towards. Release cannot discard, and a
   * *failed* release retires the operation — where the feature's own `retire`
   * would cancel these animations anyway. So the side effect is exactly what
   * teardown would have done, one moment earlier.
   */
  const settleDisplacement = (
    view: PresentationView,
    insertion: SortableFramePart['insertion'],
  ): void => {
    if (insertion === null || slots.beforeMove.length === 0) {
      return;
    }

    view.insertion = insertion;

    try {
      for (const hook of slots.beforeMove) {
        hook(view as DisplacementView);
      }
    } finally {
      view.insertion = null;
    }
  };

  /** The gap the item came from, recomputed rather than stored. */
  const homeGap = (frame: Readonly<Frame<SortableFramePart>>): void => {
    const home = homeInsertion(frame.snapshot!, frame.item!);

    if (home !== null) {
      movePlaceholder(rt.placeholder!, home);
    }
  };

  return {
    createFramePart: createSortableFramePart,
    resetFramePart: resetSortableFramePart,

    config: {
      threshold: slots.threshold,
      // **Faithful, not flat.** A sortable row must look the same the instant
      // it is lifted as it did the instant before: the top layer escapes an
      // ancestor `transform` but *not* an ancestor `zoom`, so a flat lift —
      // which drives net zoom to 1 and sizes the visual from its untransformed
      // border box — visibly shrinks the row inside any zoomed or scaled
      // container, while the placeholder it left behind keeps the on-screen
      // box. The faithful matrix reproduces the composed ancestor space
      // exactly, so lift and placeholder agree. `LIFT_FLAT` is for a free drag
      // that deliberately straightens out; it was never right here.
      liftMode: LIFT_FAITHFUL,
      actionTags: SORTABLE_ACTION_TAGS,
    },

    // -----------------------------------------------------------------------
    // Admission — inside the native `pointerdown` dispatch
    // -----------------------------------------------------------------------

    admit(event, draft) {
      return admitFrom(event, draft);
    },

    /**
     * The **second ingress** (D-32), sharing every admission rule with the
     * press: the same composed-path search, the same handle narrowing, the same
     * visual resolver. `handle()` therefore gates the keyboard path too, which
     * is parity with the shipped package rather than incidental.
     *
     * What it adds is the one thing a press does not need — a **destination**,
     * decided here, synchronously, so that feasibility reaches the native
     * listener. An edge item yields `null` and the kernel leaves the arrow key
     * alone.
     */
    command: {
      types: [KEY_DOWN],

      admit(event, draft): AdmissionSubject | null {
        const keys = event as KeyboardEvent;

        // **Checked first, on every declared command type, whatever the
        // target** (D-46). It is not a special case of the target rules below:
        // probe E R-7 synthesized a real Chromium composition and the drag
        // admitted anyway, reordering the collection while the user was
        // mid-word and not interacting with the list at all. The test is a
        // property of the keyboard event, so it needs no target inspection and
        // costs nothing.
        if (keys.isComposing) {
          return null;
        }

        const direction = directionOf(keys.key);

        if (direction === null) {
          return null;
        }

        const { snapshot } = rt;
        // **Resolved exactly once per keydown** (D1). `resolveItem` invokes the
        // consumer's `handle()` resolver, so the destination and the draft seed
        // are both derived from this one item rather than from two independent
        // resolutions of the same event.
        //
        // **The target question is asked here, and it is asked first** (D-46).
        // Order is normative — *what did the event land on*, then *is the move
        // feasible* — and asking feasibility first is what produced probe E's
        // unstateable R-5 table, where a `contenteditable` in the last row kept
        // ArrowRight only because the edge decline happened to fire.
        //
        // The table is `COMMAND_OWNERS` rather than the pointer one, because
        // the question is whether the target owns *this key*.
        const item = resolveItem(event, snapshot, COMMAND_OWNERS);

        if (item === null) {
          return null;
        }

        const insertion = keyboardInsertion(snapshot, item, direction);

        // The edge case, and the whole reason the decision is synchronous.
        // Checked before the draft is seeded, so an infeasible command resolves
        // no visual either — the press path resolves one only for an admission
        // it is going to make, and the command path matches it.
        if (insertion === null) {
          return null;
        }

        const subject = seedDraft(item, snapshot, draft);

        if (subject === null) {
          return null; // a consumer resolver destroyed the controller
        }

        // The destination travels in the draft, exactly as `item` does for a
        // press. No staged value crosses the ingress boundary, which is what
        // keeps D-32 to one SPI member.
        draft.insertion = insertion;
        return subject;
      },
    },

    // -----------------------------------------------------------------------
    // Activation
    // -----------------------------------------------------------------------

    activation: {
      /**
       * Creates the placeholder **detached** and seeds the home insertion. No
       * DOM insertion, no acquisition, nothing externally visible — which is
       * why `rollback` is unnecessary here and why I-17 is vacuous for this
       * behavior.
       */
      prepare(draft, scope) {
        const item = draft.item!;
        const { box, visual, boxPre } = scope;
        // **Window 2 of 2, and the first thing this seam does** (D-43, D-52).
        // The kernel took window 1 immediately before `acquireLift`; this one
        // reads the same element in the same units on the far side of it, and
        // the difference is the space the visual's removal actually freed.
        //
        // **The identity branch is not an optimisation.** `boxPre − boxPost` is
        // only the footprint when the box *stays in flow* while the visual
        // leaves it, which is what api-1 measured with a nested pair
        // (`box = .row-box` wrapping `visual = .card`: 62 → 32, so 30). Under
        // the default `box === visual` there is no such pair — the one element
        // is the thing being lifted, and `LIFT_FAITHFUL` promotes it with
        // `position: fixed` and an explicit width and height, so its offset box
        // is *unchanged* by the lift and the difference would be zero rather
        // than its height. The pre-lift capture is the whole answer there, and
        // taking it is what the library did before two windows existed.
        const footprint =
          box === visual
            ? boxPre
            : {
                width: boxPre.width - box.offsetWidth,
                height: boxPre.height - box.offsetHeight,
              };

        // **The pointer branch** (D-32, C4-01). A press has no destination yet,
        // so the grab slot is the origin the spatial path resolves away from. A
        // *command* already wrote its destination in `command.admit`, and
        // seeding home here would destroy the only state carrying it.
        if (draft.pointerId !== -1) {
          const home = homeInsertion(draft.snapshot!, item);

          if (home === null) {
            return null; // the item left the collection between press and move
          }

          draft.insertion = home;
        }

        // **The ledger is opened only for a consumer-owned element** (D-39).
        // With no `placeholder` slot composed the element is the library's own
        // `<div>`, which `prepare` created, nothing outside has seen, and a
        // discarded preparation drops — so an undo for it would be work with no
        // observer. With a slot composed every write below lands on someone
        // else's node.
        placeholderUndo = slots.createPlaceholder === null ? null : [];

        return createPlaceholder(
          realm,
          { item, visual, box, rect: scope.originRect },
          footprint,
          slots.createPlaceholder,
          live,
          placeholderUndo,
        );
      },

      /**
       * **Required, and non-vacuous** (D-39). ~~A discarded prepare leaves only
       * a detached element for the collector~~ — true of the default `<div>`,
       * and false the moment a `placeholder` slot exists: `prepare` writes
       * `data-drag-placeholder`, `aria-hidden`, the copied `slot` and three
       * inline style properties onto an element the **consumer** created, and
       * `preparationValid()` does not reverse a `setAttribute`. It discards the
       * *preparation*; the element is not the library's to discard.
       *
       * Reverse order, and each undo guarded on its own: one throwing revert —
       * a custom element with an overridden `setAttribute` — must not strand
       * the writes recorded before it.
       */
      rollback() {
        const ledger = placeholderUndo;

        placeholderUndo = null;

        if (ledger === null) {
          return;
        }

        for (let i = ledger.length - 1; i >= 0; i -= 1) {
          guarded(ledger[i]!);
        }
      },

      /** Strict I-30 order: register, make visible, publish, then notify. */
      effect(current, placeholder, scope) {
        // **Adoption is what closes the rollback window** (D-39). From the line
        // below the element is the library's: the disposer removes it, moves
        // relocate it, teardown takes the attributes off with it. A ledger left
        // here would be a set of reverts for an element nobody may revert, and
        // the *next* operation's discarded preparation would run them.
        placeholderUndo = null;

        // 1 → 2, per resource. Registering first is free — removing a detached
        // node is a no-op, so an over-eager disposer cannot over-release — and
        // it means a throw below can never leave a visible orphan that the
        // presentation lifetime does not own.
        scope.presentation.use(() => {
          placeholder.remove();
        });
        current.item!.after(placeholder);

        // `after()` **connects** the placeholder, and a custom element's
        // `connectedCallback` runs synchronously inside that call. It is
        // consumer code — the placeholder may come from a `placeholder()`
        // factory — reached from a plain DOM write, so no seam wraps it and no
        // reentrancy guard above sees it. If it destroyed the controller,
        // the controller is logically closed. Everything below would then
        // register against lifetimes that are closing, republish this
        // operation's DOM into the runtime for the *next* drag to find, and
        // call `onStart` after `destroy()` — the terminal barrier I-6 forbids
        // crossing (D-26).
        //
        // Everything below assumes the insertion actually took, and a
        // `connectedCallback` gets to run between `after()` and this line. It
        // can remove itself, move itself, or reparent the *item* — and a
        // detached or misplaced placeholder is not a footprint: `placeholderAt`
        // would read the wrong container's siblings, `movePlaceholder` would
        // relocate a node the collection no longer contains, and the landing
        // would measure a rect that is not in the list at all.
        //
        // Cheaper than trusting it and repairing later, and classified where it
        // belongs: a throw here is `FAILURE_ACTIVATION` from the committed
        // state, so the placeholder disposer registered above removes it, the
        // consumer gets `onError` with the activation stage, and nothing was
        // published or notified.
        // Two conjuncts, each catching what the other cannot. Adjacency alone
        // already implies same-parent, so a separate parentage test would be
        // unfalsifiable; but adjacency holds inside a detached fragment too, so
        // connectivity is not implied by it.
        const item = current.item!;

        if (
          !placeholder.isConnected ||
          item.nextElementSibling !== placeholder
        ) {
          throw new Error(
            'drag: the placeholder did not survive insertion — it was removed or reparented before activation completed',
          );
        }

        // **The pre-publication revalidation, and the one reading that covers
        // this whole stretch** (D-38, I-37). Two readings stood here before
        // Revision 2 — one after `after()`, one after the survival conjuncts —
        // and both read `scope.presentation.signal.aborted`, chosen because it
        // is strictly *stronger* than the controller's latch: it also fires for
        // a kernel-internal `panic()` destroy.
        //
        // D-36 inverts that property. Physical teardown now runs at the
        // transaction boundary, so the signal **lags** the close it stood in
        // for — a reading that was right for a stated reason became wrong for
        // that same reason. `host.closed` is the latch itself (D-53), and since
        // a panic closes logically first it sees that too, so nothing is lost
        // by collapsing the pair into one reading placed immediately before the
        // publication block. Every consumer-reachable accessor in the stretch —
        // `connectedCallback`, `isConnected`, `nextElementSibling` on a
        // consumer-owned placeholder — is covered by it, because everything
        // below is the publication and nothing above it is consequential.
        if (host.closed) {
          return;
        }

        // Listeners bound to the signal are self-releasing, so the signal *is*
        // the registration; the explicit disposer cancels a scheduled frame.
        scope.motion.use(rt.frame.cancel);
        invalidate(scope.motion.signal, () => {
          try {
            slots.invalidateInsertion();
          } catch (error) {
            // A native scroll/resize listener is **not** a seam, so `host.fail`
            // here would be downgraded to a platform report and the stage would
            // never reach `onError` — one input path silently bypassing the
            // classified-failure mechanism entirely. Queuing it as a behavior
            // action gives it a seam: the action's own `prepare` runs against
            // the live operation, which is where `FAILURE_INVALIDATION` can be
            // classified with the recovery the contract gives it.
            host.dispatch(TAG_INVALIDATION, error);
          }
        });

        // 3 — every resource above is now owned.
        rt.placeholder = placeholder;
        rt.lift = scope.lift;
        rt.view = {
          realm,
          placeholder,
          item,
          getBox: slots.getBox,
          live,
          snapshot: current.snapshot!,
          insertion: null,
        };

        if (!invalidateInSeam()) {
          // Classified; the operation is failing, so do not start it.
          //
          // This is the one path that reaches a terminal callback without a
          // start notification — and only in combination with a second fault: a
          // cancellation latched from the placeholder's `connectedCallback`
          // above outranks this classified failure (I-22), so the operation
          // settles as *canceled* for a drag `onStart` never announced. Either
          // fault alone is fine: without the cancel this reports through
          // `onError`, and without the throw `onStart` still runs. Recorded in
          // contract 02 §I-31 as an admitted gap rather than closed with a
          // per-operation "started" flag.
          return;
        }

        // **The marker advances before the call, not after** (D-66). A throw
        // from `onStart` itself is classified, and the consumer has by then
        // been told the drag began — so it is owed an end. Advancing after the
        // call would publish nothing for exactly the operation the consumer
        // most recently heard about.
        progress = STARTED;

        // 4 — last, because it may reentrantly cancel or destroy.
        slots.onStart(item);
      },
    },

    // -----------------------------------------------------------------------
    // The hot path
    // -----------------------------------------------------------------------

    moved(current, lift) {
      lift.write(
        current.pointerX - current.originX,
        current.pointerY - current.originY,
      );
      // Rendering and scheduling are one callback with **two stages**. The
      // kernel's wrapper classifies the whole call `FAILURE_RENDERER_WRITE`, so
      // the scheduling half narrows from the inside — otherwise a scheduling
      // failure is reported to the consumer as a render failure and
      // `FAILURE_SCHEDULED_FRAME` has no producer at all (contract 02 §F-40).
      // The spatial search is coalesced to one per frame; pointer input is not.
      rt.spatialSeq += 1;

      try {
        rt.frame.schedule(rt.spatialSeq);
      } catch (error) {
        host.fail(FAILURE_SCHEDULED_FRAME, error);
      }
    },

    // -----------------------------------------------------------------------
    // Behavior actions
    // -----------------------------------------------------------------------

    action: {
      prepare(tag, argument, draft) {
        if (tag === TAG_INVALIDATION) {
          // Re-raised where it can be classified; see the listener in
          // `activation.effect`. `host.fail` latches, so the seam ends as a
          // failure and the `null` below is never the deciding value.
          host.fail(FAILURE_INVALIDATION, argument);
          return null;
        }

        if (tag === TAG_SPATIAL) {
          // The applied half of the double validation (I-4). The `view` test is
          // what bites today; the attempt comparison is unreachable as things
          // stand, because the frame task coalesces and dispatches the latest
          // sequence synchronously, so a queued attempt is always current when
          // it applies. It is kept because the contract states the check, and
          // because anything that later queues a spatial action from outside
          // the frame task reopens the window it closes.
          // The legality table declares the spatial action inert outside
          // `ACTIVE`, and `rt.view` cannot stand in for that: it is cleared
          // only at retirement, so it stays non-null through `RELEASING`,
          // `SETTLING` and `FINALIZING`. No producer can reach those phases
          // today — the frame task is cancelled when motion closes at release,
          // and no other call site dispatches this tag — so this guard is
          // unreachable by construction rather than by luck. It is here so
          // that a future producer (a replayed action, a flush from a hook)
          // cannot commit a placeholder move into a decided transaction.
          if (
            draft.phase !== ACTIVE ||
            argument !== rt.pendingSpatial ||
            rt.view === null
          ) {
            return null;
          }

          const resolved = slots.resolveInsertion(draft, rt.view);

          // `resolved === null`: the incumbent slot still wins — commit
          // nothing. `host.closed`: a candidate `visual()` resolver destroyed the
          // controller during the rebuild (I-36). The kernel would discard the
          // transition anyway — `preparationValid()` no longer holds — but
          // stopping one branch earlier means the behavior never writes
          // `draft.insertion` for an operation that no longer exists.
          if (resolved === null || host.closed) {
            return null;
          }

          draft.insertion = resolved;
          return STAGED;
        }

        // **The pull happens here, not at the controller** (D-44). `items()` is
        // consumer code, and this is the one place that has a transaction open,
        // a phase to branch on, and a stage to classify a throw against — the
        // controller member is reachable from inside a seam and could only have
        // called it at an arbitrary reentrant point.
        const source = slots.items();

        // The terminal barrier on the pull (I-36). `items()` may destroy the
        // controller; discarding here means the behavior neither copies nor
        // publishes for an operation that no longer exists.
        if (host.closed) {
          return null;
        }

        // **Array identity is the whole structural test** (D-44). An unchanged
        // identity is a resize, a zoom or a scroll — the warm, common case —
        // and it stages no snapshot, so it never reaches the phase branch
        // below and never pays the copy.
        if (source === rt.source) {
          return {
            snapshot: null,
            source,
            cancelReason: null,
          } satisfies PreparedCollection;
        }

        // Copied on the structural branch **only**, which is the point of the
        // split: the copy is what keeps a queued snapshot safe from a later
        // caller mutation, and it is now paid when membership changes rather
        // than on every invalidation.
        //
        // **Copied first, numbered second.** A duplicate item throws from
        // `copyUniqueItems`, and a refused pull produced no collection — so it
        // must not consume a version either, or the counter stops being a dense
        // identity for the collections that actually exist and a consumer that
        // fixes its data sees the next successful update numbered as though an
        // invisible one had happened in between.
        //
        // The throw is classified by the kernel rather than raised at a call
        // site: under `updateItems` this was a `TypeError` thrown back at the
        // consumer, and a pull source has no such site to throw at.
        const items = copyUniqueItems(source);

        version += 1;

        const next: CollectionSnapshot = { items, version };
        const { phase } = draft;

        // `IDLE`: publish, but bind nothing — an idle frame must retain no DOM
        // (I-20). `RELEASING` and later: the operation's semantic snapshot is
        // frozen and the transaction is decided, so the replacement publishes
        // without rewriting what the release resolved against.
        if (phase === IDLE || phase >= RELEASING) {
          return {
            snapshot: next,
            source,
            cancelReason: null,
          } satisfies PreparedCollection;
        }

        draft.snapshot = next;

        if (!next.items.includes(draft.item!)) {
          return {
            snapshot: next,
            source,
            cancelReason: CANCEL_ITEM_REMOVED,
          } satisfies PreparedCollection;
        }

        // **The test is the insertion, not the phase** (D-32). A *press* at
        // `PENDING` has none to rebase — home is seeded at activation — so the
        // item surviving is the whole question, and this reads exactly as the
        // phase test it replaced. A **command** commits `PENDING` with its
        // destination already written by `command.admit`, and short-circuiting
        // on the phase would carry that gap, unrebased, into a release that
        // then fails to build a proposal against the new snapshot.
        //
        // This is the mechanism contract 02 §The command destination relies on
        // when it says a command gap is "either rebased or the operation is
        // cancelled before release ever runs" — no command-specific revalidator
        // exists, and none is needed, precisely because this one generalized.
        //
        // `ACTIVATING` reconciles exactly like `ACTIVE`, because I-30 has
        // already published the runtime and committed the home insertion before
        // `onStart` could queue this action (F-32).
        if (draft.insertion === null) {
          return {
            snapshot: next,
            source,
            cancelReason: null,
          } satisfies PreparedCollection;
        }

        const change = reconcileCollection(next, draft.item!, draft.insertion);

        if (change.type === CHANGE_CANCEL) {
          return {
            snapshot: next,
            source,
            cancelReason: CANCEL_COLLECTION_INVALIDATED,
          } satisfies PreparedCollection;
        }

        draft.insertion = change.insertion;
        return {
          snapshot: next,
          source,
          cancelReason: null,
        } satisfies PreparedCollection;
      },

      effect(tag, _argument, current, prepared) {
        if (tag === TAG_SPATIAL) {
          const placeholder = rt.placeholder!;
          const insertion = current.insertion!;

          // Decided **before** the hooks run, not by the writer's return value.
          // The pipelines bracket the write, so a `beforeMove` hook that
          // measures the whole list would otherwise be paid in full for a write
          // that never happens — and with `layoutAnimation()` that is two
          // list-wide measurements and a cache rebuild per inert frame. An
          // already-correct gap is the common case, not the rare one.
          if (placeholderAt(placeholder, insertion)) {
            return;
          }

          const view = rt.view!;

          // Published before the bracket, so a hook knows *which* elements the
          // move affects rather than having to measure the whole destination
          // view to find out (M-4).
          //
          // Cleared in a `finally` covering every exit: the hooks succeeding,
          // the placeholder write refusing a cross-container anchor, the eager
          // measurement failing, and a `beforeMove`/`afterMove` hook throwing.
          // The field is documented as meaningful **only** inside the bracket
          // and the hook-facing view declares it non-null on that basis, so a
          // value left behind would be a stale destination gap that outlives
          // the move it described — readable by the next bracket's `collect`
          // before it is overwritten, and by anything that reaches the
          // per-operation view between moves.
          view.insertion = insertion;

          try {
            // Three steps, and the order between them is the whole
            // composition rule. `beforeMove` captures each element where it
            // currently *looks* — offsets applied, which is what makes an
            // interrupted displacement replay from where it visually is — and
            // then releases every offset it owns. So between here and
            // `afterMove` there is exactly one window in which nothing the
            // library applied is visible, and the axis rebuild below lands in
            // it. Reading lazily on the next spatial frame instead measures
            // items mid-animation, which pits a freshly positioned placeholder
            // against stale item centres and oscillates.
            for (const hook of slots.beforeMove) {
              hook(view as DisplacementView);
            }

            // **The terminal barrier on the `beforeMove` pipeline** (I-36,
            // C4-01). A displacement hook measures consumer-owned rows, and an
            // overridden `getBoundingClientRect()` is a consumer call — so a
            // hook can return into this line on a destroyed controller. The
            // hook takes its own reading for its own interior; this one stops
            // the **behavior's** next act, which is a DOM mutation on the
            // consumer's tree that would run a placeholder custom element's
            // callbacks after `destroy()` returned.
            if (host.closed) {
              return;
            }

            movePlaceholder(placeholder, insertion);

            // **The terminal barrier on the placeholder-reaction window**
            // (I-36) — the same hazard `activation.effect` already guards one
            // line after `item.after(placeholder)`, reached through the other
            // door. `movePlaceholder` moves a node, so a custom-element
            // placeholder's `disconnectedCallback`/`connectedCallback` runs
            // synchronously inside that call; it is consumer code the
            // `placeholder()` factory supplied, and no seam wraps it. If it
            // destroyed the controller, everything below would run on a
            // torn-down one: the eager rebuild resolving candidate visuals, and
            // every `afterMove` hook — which with `layoutAnimation()` composed
            // starts WAAPI animations against a retired feature.
            //
            // Returned from **inside** the `try`, so the `finally` still clears
            // `view.insertion` and no stale destination gap outlives the move.
            if (host.closed) {
              return;
            }

            if (!invalidateInSeam()) {
              return; // classified; the geometry the hooks would read is stale
            }

            if (!measureInSeam(current, view)) {
              return; // classified; the axis index is neither old nor new
            }

            for (const hook of slots.afterMove) {
              hook(view as DisplacementView);
            }
          } finally {
            view.insertion = null;
          }

          return;
        }

        const staged = prepared as PreparedCollection;
        const { phase } = current;
        const next = staged.snapshot;

        // **The geometry-only branch ends here** (D-44): nothing to publish,
        // no reconcile, no cancel — the rect index is stale and that is all.
        // Reached by a resize, a zoom or a scroll, which is why keeping it off
        // the publication path is what makes the pull source cheaper than the
        // push method it replaces rather than merely tidier.
        if (next === null) {
          invalidateInSeam();
          return;
        }

        // Publication is an effect, not a preparation: a reentrant cancel or
        // destroy must not be able to invalidate a preparation whose private
        // runtime has already been replaced.
        rt.snapshot = next;
        // The identity the structural test compares against, advanced with the
        // snapshot it produced and never before it — a preparation that was
        // discarded must not move the baseline, or the next invalidation would
        // read the change as already applied.
        rt.source = staged.source;

        if (rt.view !== null) {
          rt.view.snapshot = next;
        }

        if (phase === ACTIVATING || phase === ACTIVE) {
          // Not gated on success: publication already happened above, and the
          // consumer's update must never be thrown away by a failing
          // invalidation (D-25, F-28). The latched failure still decides the
          // seam.
          invalidateInSeam();
        }

        // Last, and only after publication: an invalid collection ends the
        // current drag, but it must never throw away the consumer's update
        // (D-25, F-28).
        if (staged.cancelReason !== null) {
          host.cancel(staged.cancelReason);
        }
      },
    },

    // -----------------------------------------------------------------------
    // Release
    // -----------------------------------------------------------------------

    release: {
      prepare(draft) {
        const { view } = rt;
        const { item } = draft;
        const { snapshot } = draft;

        if (view === null || item === null || snapshot === null) {
          return rejection(
            FAILURE_RELEASE,
            'drag: released an operation with no published presentation',
          );
        }

        // **The branch is where the insertion comes from, never how the
        // proposal is built.** Both paths hand the same `insertion` to the same
        // `buildReorderProposal` against the same snapshot, which is what makes
        // "a keyboard and a pointer reorder to the same gap produce identical
        // proposals" a statement about one code path rather than a coincidence
        // between two (D-32, C4-01).
        let insertion: Insertion;

        if (draft.pointerId === -1) {
          const { insertion: commanded } = draft;

          // **The pointerless branch** (D-32, C4-01). The committed insertion
          // *is* the command's destination: there is no release sample, so a
          // spatial resolve would select a gap from `pointerY === 0` — the top
          // of the viewport — and silently replace it.
          //
          // A `null` here is a broken invariant, never a home fallback: the
          // pointer path's fallback exists because a spatial resolve can
          // legitimately find nothing, while a command that reached `RELEASING`
          // with no destination has lost state the kernel guaranteed to carry.
          // Reporting that as a home-gap reorder would tell the consumer a drop
          // completed normally.
          if (commanded === null) {
            return rejection(
              FAILURE_RELEASE,
              'drag: a command reached release with no destination',
            );
          }

          insertion = commanded;
        } else {
          // Settled first, then measured: motion is already closed, so this
          // search runs against final geometry — and "final" has to mean settled
          // presentation geometry, not wherever the last displacement happens to
          // have reached.
          settleDisplacement(view, draft.insertion);

          if (!invalidateInSeam()) {
            return { invoke: null };
          }

          // **No I-36 barrier here, deliberately.** This resolve reaches the
          // candidate loop too, and on an aborted traversal it falls back to
          // `draft.insertion`, builds a proposal and stages an `invoke`
          // closure — which is never executed: `runCore` stages nothing when
          // `preparationValid()` is false, and `runReleaseSeam` runs only a
          // non-null command, so `onReorder` cannot fire for an operation
          // `destroy()` retired. A guard here would be a second copy of a
          // decision the kernel already owns, and two copies can disagree.
          const resolved =
            slots.resolveInsertion(draft, view) ?? draft.insertion;

          // **The terminal barrier on the frame writes** (I-36 (2) acts 1 and
          // 2, C5-03's stretch sweep), and it is a *different* guard from the
          // one declined above: that one was about `onReorder` firing, which
          // the kernel owns. This one is about what the **draft** holds. Two
          // consumer-reaching stretches end here — a `beforeMove` hook
          // measuring consumer-owned rows in `settleDisplacement`, and the
          // axis's own read of the consumer-owned placeholder after its
          // candidate loop — and every statement below writes a frame teardown
          // has already scrubbed and will not scrub again: `draft.insertion`,
          // then `draft.proposal`, whose request pins the item and the whole
          // released snapshot in an inactive frame (I-20).
          if (host.closed) {
            return { invoke: null };
          }

          if (resolved === null) {
            return rejection(
              FAILURE_RELEASE,
              'drag: released with no insertion',
            );
          }

          draft.insertion = resolved;
          insertion = resolved;
        }

        const built = buildReorderProposal(snapshot, item, insertion);

        if (built === null) {
          // A release that finds no coherent proposal has a broken invariant.
          // Reporting it as a successful no-op drop would tell the consumer the
          // drag completed normally.
          return rejection(
            FAILURE_RELEASE,
            'drag: the resolved insertion does not describe a gap in the released snapshot',
          );
        }

        draft.proposal = built.proposal;

        if (built.noop) {
          // The **only** legitimate skip: a proven `from === to`.
          return { invoke: null };
        }

        const { request } = built.proposal;

        return {
          invoke: (signal) => {
            // **First statement of the closure** (D-66). The kernel runs this
            // only after `release.effect` returns normally, so reaching it is
            // proof the consumer's resolver is being invoked — which is what
            // makes a later failure `AT_CONSUMER` rather than `AT_PROPOSAL`.
            progress = RESOLVING;
            return slots.onReorder(request, { signal });
          },
        };
      },

      effect(current) {
        // **Unconditional**: a command reorders too, and its placeholder
        // reaches the same final gap by the same single writer (C4-01).
        movePlaceholder(rt.placeholder!, current.insertion!);

        // **The terminal barrier on the release write** (I-36, C4-01). The
        // move above runs a custom-element placeholder's callbacks, and
        // `retire()` has then already nulled `rt.lift` — so without this the
        // very next line is `null.write(...)`, a `TypeError` classified as
        // `FAILURE_RELEASE` against a controller that no longer exists. The
        // publication below is the other half: a request written after
        // `retire()` cleared it outlives the operation and pins its DOM (I-20).
        if (host.closed) {
          return;
        }

        if (current.pointerId !== -1) {
          // Normative, not decoration: `pointerup` need not carry the last
          // processed `pointermove`'s coordinates, and the proposal was computed
          // from the committed release point. Rendering the placeholder alone
          // would leave the visual — and the whole landing trajectory — starting
          // from a stale point (F-39).
          rt.lift!.write(
            current.pointerX - current.originX,
            current.pointerY - current.originY,
          );
        }
        // **The pointerless branch writes nothing**, and that is not a shortcut:
        // there is no release sample to write. The pointer scalars are still at
        // their admission values, so writing `pointerX - originX` here would
        // render `(0, 0)` — where the visual already is, so it would look
        // harmless while making this branch depend on the very fields it is
        // defined not to read. The landing then opens from `(0, 0)`, which is
        // correct because the visual has not moved since acquisition.

        // **Published last, and inside this effect** (D-33, C3-04). Last,
        // because a throwing write above classifies `FAILURE_RELEASE` and the
        // staged command is never executed — a request published first would
        // name a round-trip that cannot happen. Inside, because the kernel runs
        // the command *after* this returns, so the request the consumer is
        // about to receive is already the one `ready()` will be checked
        // against, including under a synchronous commit.
        //
        // Reached through the **committed frame**, which is what makes it the
        // same object the staged `invoke` closure captured. `ResolutionCommand`
        // does not carry it and must not: a sortable domain value on a kernel
        // SPI type is the mistake D-34 and D-35 corrected.
        //
        // **And the render is itself a consumer-reachable call** (I-36 (2) acts
      },
    },

    // -----------------------------------------------------------------------
    // Settlement
    // -----------------------------------------------------------------------

    settlement: {
      /** The five-case mapping, covered exhaustively (D-24, F-29). */
      prepare(draft, input): PreparedSettlement | SeamRejection {
        pendingFailure = null;

        const { proposal } = draft;

        // No `default`, deliberately: an exhaustive switch over the
        // discriminant is what makes a new settlement case a *compile* error
        // here rather than a silent fall-through to some plausible outcome.
        // oxlint-disable-next-line default-case
        switch (input.type) {
          case SETTLED_SKIPPED: {
            // The placeholder is already where the item belongs, so recovery is
            // immediate. A no-op finishes; it is never a rejection.
            draft.outcome = OUTCOME_NOOP;
            draft.recovery = RECOVERY_IMMEDIATE;
            draft.domain = { type: 'noop', proposal: proposal! };
            return true;
          }

          case SETTLED_FULFILLED: {
            const { value } = input;

            if (!isReorderResolution(value)) {
              return rejection(
                FAILURE_REORDER_RESOLUTION,
                'drag: onReorder resolved with a value that is not a ReorderResolution',
              );
            }

            // **Every read of the consumer's resolution before any write**
            // (I-36 (2) acts 1 and 2, C5-03's stretch sweep).
            // `isReorderResolution` is a duck-type test on `.type`, so `type`
            // and `reason` are accessors on an object the consumer built and
            // either may destroy the controller. The
            // domain value is a local until the barrier passes; publishing it
            // into a frame teardown has already scrubbed would pin the whole
            // proposal in an inactive frame nothing clears again (I-20).
            const domain: ReorderTransactionResult =
              value.type === 'accepted'
                ? { type: 'accepted', proposal: proposal! }
                : {
                    type: 'rejected',
                    reason: value.reason,
                    proposal: proposal!,
                  };
            if (host.closed) {
              return true;
            }

            const accepted = domain.type === 'accepted';

            draft.outcome = accepted ? OUTCOME_ACCEPTED : OUTCOME_REJECTED;
            draft.recovery = accepted ? RECOVERY_DESTINATION : RECOVERY_HOME;
            draft.domain = domain;

            return true;
          }

          case SETTLED_REJECTED: {
            // A rejected thenable is a resolver malfunction, not a considered
            // consumer verdict, so it is a named classified failure rather than
            // an inferred rejection. It still *ends* the operation — D-66 —
            // but as a fault reported through `onError`, with the terminal
            // saying `canceled` rather than `rejected`.
            return {
              stage: FAILURE_REORDER_RESOLUTION,
              error: input.error,
            };
          }

          case SETTLED_CANCELED: {
            draft.outcome = OUTCOME_CANCELED;
            draft.recovery = RECOVERY_HOME;
            draft.domain = {
              type: 'canceled',
              reason: input.reason,
              stage: input.stage,
              proposal,
            };
            return true;
          }

          case SETTLED_FAILED: {
            pendingFailure = { stage: input.stage, error: input.error };

            // A terminal-callback failure has recovery "none": the operation
            // already finalized, and rewriting the outcome now would relabel a
            // drop that has been reported as accepted. Every other stage
            // replaces the transaction.
            if (input.stage !== FAILURE_TERMINAL_CALLBACK) {
              draft.outcome = OUTCOME_FAILED;
              draft.recovery = RECOVERY_IMMEDIATE;
              // **The fallback, and the whole of D-66's carrier** (D-66).
              // `draft.domain = null` stood here, and it is what made the
              // library's most serious failures its quietest: `finalized`
              // publishes `current.domain` and nothing else, so a null meant
              // no terminal at all.
              //
              // **Existing result wins, otherwise `canceled`.** The tie-break
              // is what makes the rule one lookup rather than two cases: a
              // failure that arrives *after* a domain result exists — a
              // terminal-callback throw is the only one, and it is excluded
              // above — must not relabel it, and a failure that arrives before
              // one honestly reports an abandoned drag with the classifying
              // error as its reason.
              //
              // **The marker decides the stage, and it also decides whether to
              // publish at all.** At `MINTED` the consumer never heard this
              // drag start, and an end for a beginning it has no record of is
              // worse than the skip D-66 retracts (§No start, no terminal).
              draft.domain =
                progress === MINTED
                  ? null
                  : {
                      type: 'canceled',
                      reason: input.error,
                      stage: progress === RESOLVING ? AT_CONSUMER : AT_PROPOSAL,
                      proposal: draft.proposal,
                    };
            }

            return true;
          }
        }
      },

      effect(current, _prepared, scope: SettlementScope) {
        const failure = pendingFailure;

        pendingFailure = null;

        if (failure === null) {
          // Requests only — nothing is armed here, and a request is recorded at
          // most once. **One gate since D-41**: the authored-presentation hold
          // had no producer under the serial commit.
          if (
            slots.startLanding !== null &&
            current.recovery !== RECOVERY_IMMEDIATE
          ) {
            scope.holdForLanding(slots.startLanding);
          }
        }

        // 4 — consumer callbacks last. A failed settlement reports through
        // `onError` here **and** publishes its terminal from the failure path's
        // own `ERROR_REPORTED` step (D-66) — the two channels are orthogonal
        // and neither suppresses the other.
        if (failure !== null) {
          // D-64: the consumer branches on a fault class, never on a stage.
          slots.onError?.(toDraggableError(failure.stage, failure.error), {
            domain: current.domain,
          });
        }
      },
    },

    // -----------------------------------------------------------------------
    // Landing target and the terminal callback
    // -----------------------------------------------------------------------

    anchorTarget(current): Point {
      const placeholder = rt.placeholder!;
      const item = current.item!;
      const { recovery } = current;

      if (recovery === RECOVERY_DESTINATION) {
        // Re-anchoring follows the **recovery**, which is committed behavior
        // state — one of the two clauses of D-16 that survive D-41. The
        // `authoredReady` gate this used to sit behind is gone with the
        // protocol: under the serial commit the authored DOM is already final
        // when this runs, so there is no pending render to wait for.

        // Each conjunct earns its place. `nextElementSibling` makes the
        // repair inert when the placeholder is already adjacent — `before()`
        // on an already-correct position is a remove-and-reinsert that resets
        // CSS transitions and forces a reflow. `isConnected` and the parent
        // test stop a consumer that unmounted or re-keyed the item from
        // having the placeholder dragged into a detached tree, which would
        // destroy the very element the fallback measures (F-15, Q-12).
        if (
          item.isConnected &&
          item.parentElement === placeholder.parentElement &&
          placeholder.nextElementSibling !== item &&
          // **The terminal barrier on the re-anchor's own conjuncts** (I-36
          // (2) act 3, C5-03's stretch sweep). All three above are accessors
          // on consumer-owned elements. Teardown has already *removed* this
          // placeholder, so `before()` after a destroy would re-insert a
          // footprint the operation has finished with — back into the
          // consumer's list, where nothing will remove it again. Last
          // conjunct, so it is read only on the frame that would mutate.
          !host.closed
        ) {
          item.before(placeholder);
        }
      } else if (recovery === RECOVERY_HOME) {
        // Rejected, cancelled and most failures return the placeholder to the
        // grab slot before measuring. The home gap is recomputed from the
        // committed snapshot, so it needs no per-operation slot.
        homeGap(current);
      }

      // **The terminal barrier on the re-anchor** (I-36, C4-01). Both branches
      // above move a node — `item.before(placeholder)` here, `movePlaceholder`
      // inside `homeGap` — so a custom-element placeholder's
      // `disconnectedCallback`/`connectedCallback` runs synchronously inside
      // them, and it is consumer code. The measurement below is a *second*
      // consumer call on the same element. The kernel revalidates around
      // `anchorTarget` (F-38) and never starts a landing for a destroyed
      // controller, so the point is discarded either way; what this stops is
      // the read itself.
      if (host.closed) {
        return { x: 0, y: 0 };
      }

      // **The precondition, two O(1) reads, immediately before the
      // measurement** (D-42). It runs *after* the re-anchor above, because the
      // repair is what the authored commit is allowed to have made necessary;
      // checking before it would report a fault the library was about to fix.
      //
      // Each conjunct names a real strategy probe C1 ran. `isConnected` catches
      // `replaceChildren` and an `innerHTML` rebuild, which detach the
      // placeholder outright — C1 measured the consequence: a detached
      // placeholder reads `0×0` at the viewport origin, and the row visibly
      // travels to `(0,0)` over twelve frames before teleporting back. The
      // parent test catches container replacement, where the placeholder
      // survives in a tree the list no longer contains.
      //
      // **It throws rather than returning a sentinel**, and the kernel treats
      // the throw and a failed check identically (D-49): a target that cannot
      // be produced and one that cannot be trusted are the same fault. The
      // diagnostic is authored here because this is the tier that knows what a
      // placeholder and an item are — the kernel would have to say "something
      // was wrong" instead.
      if (
        !placeholder.isConnected ||
        placeholder.parentElement !== item.parentElement
      ) {
        throw new Error(
          'drag: the placeholder was detached or moved out of the list during the reorder commit, so the landing target cannot be measured; the reorder itself is unaffected',
        );
      }

      const rect = placeholder.getBoundingClientRect();

      return { x: rect.left, y: rect.top };
    },

    /**
     * **It publishes `current.domain` and nothing else** (D-62, D-66).
     *
     * ~~An exhaustive switch on the domain discriminant~~ stood here, routing
     * two arms to `onFinish` and two to `onCancel` — and the switch existed
     * only because there were two callbacks to route between. With one
     * `onEnd` the arms are the consumer's to discriminate, and F-37's defect,
     * a binary accepted-vs-everything predicate that sent the no-op result to
     * `onCancel`, becomes unexpressible rather than merely fixed.
     *
     * `null` still publishes nothing, and since D-66 it means one thing only:
     * the operation failed **before** `onStart` ran, so the consumer has no
     * record of it beginning (§No start, no terminal). Every started operation
     * reaches here with a result — its own, or the `canceled` fallback
     * `settlement.prepare` wrote.
     */
    finalized(current) {
      const { domain } = current;

      if (domain !== null) {
        slots.onEnd?.(domain);
      }
    },

    /**
     * The un-classified report channel, for **both** of its callers.
     *
     * `admit` threw, so identity was never minted and there is no checkpoint to
     * queue (Q-1) — the controller stays idle and usable; **or** the landing
     * measurement failed on a reorder that already committed (D-49), in which
     * case an operation is very much live, its result stands, and its terminal
     * publishes after this returns (D-60, D-66).
     *
     * `domain: null` for both. The hook is handed no frame, so this callback
     * cannot see the result the second caller's operation carries; a consumer
     * that needs it reads the `onEnd` that follows. The non-null case comes
     * from the settlement failure path, which reports from `settlement.effect`
     * with the frame in hand.
     */
    reportFailure(stage, error) {
      slots.onError?.(toDraggableError(stage, error), { domain: null });
    },

    retire() {
      progress = MINTED;
      rt.frame.cancel();
      rt.pendingSpatial = 0;
      rt.placeholder = null;
      rt.lift = null;
      rt.view = null;

      // Already in reverse installation order. Each is wrapped individually, so
      // one throwing hook cannot stop a later one from restoring its DOM.
      for (const hook of slots.retireHooks) {
        guarded(hook);
      }
    },
  };
}
