/**
 * Every sortable seam, as closures over one private runtime.
 *
 * The kernel drives all three phases of every transaction; this module supplies
 * the two pure-ish halves. Nothing here calls `begin()` or `commit()`, nothing
 * here reads `current` from a `prepare`, and nothing here can close a lifetime
 * the kernel owns — those are properties of the arguments, not of discipline.
 */
import type { DraggableError, Notify } from '../kernel/errors.ts';
import {
  AT_CONSUMER,
  AT_PROPOSAL,
  CANCEL_FAILED,
  FAILURE_INVALIDATION,
  FAILURE_SCHEDULED_FRAME,
  FAILURE_TERMINAL_CALLBACK,
  type FailureStage,
} from '../kernel/failures.ts';
import type { Draft, Frame } from '../kernel/frames.ts';
import { pathOwnsInteraction } from '../kernel/input-policy.ts';
import { createFrameTask, createInvalidator } from '../kernel/invalidation.ts';
import { ACTIVATING, ACTIVE, IDLE, RELEASING } from '../kernel/phases.ts';
import type { PointCache } from '../kernel/point-cache.ts';
import {
  type BehaviorLiftSession,
  LIFT_FAITHFUL,
} from '../kernel/presentation.ts';
import { KEY_DOWN } from '../kernel/protocol.ts';
import {
  type AdmissionSubject,
  type BehaviorSpec,
  type KernelHost,
  type PreparedSettlement,
  SETTLED_CANCELED,
  SETTLED_FAILED,
  SETTLED_FULFILLED,
  SETTLED_REJECTED,
  SETTLED_SKIPPED,
  type SettlementScope,
} from '../kernel/spec.ts';
import { createUnwind } from '../kernel/unwind.ts';
import {
  buildReorderProposal,
  CHANGE_CANCEL,
  homeInsertion,
  reconcileCollection,
} from './collection.ts';
import {
  ACCEPTED,
  CANCEL_COLLECTION_INVALIDATED,
  CANCEL_ITEM_REMOVED,
  type CollectionSnapshot,
  type Insertion,
  RECOVERY_DESTINATION,
  RECOVERY_HOME,
  RECOVERY_IMMEDIATE,
  type RejectedResolution,
  type ReorderTransactionResult,
} from './domain.ts';
import { type SortableFramePart, sortableFramePart } from './frames.ts';
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
  TAG_INVALIDATION,
  TAG_SPATIAL,
} from './runtime.ts';
import type { SortableSlots } from './slots.ts';

/** What `action.prepare(COLLECTION)` stages. It never discards. */
type PreparedCollection = Readonly<{
  /**
   * `null` on the **geometry-only** branch: `items()` returned the same array
   * identity, so there is no structural change, nothing to publish and no O(n)
   * copy to pay. The effect invalidates geometry and ends.
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

/**
 * The spatial action's staged value. Exported so the legality guard can be
 * driven directly in a test: no producer can reach the illegal phases, so the
 * guard is otherwise unobservable.
 */
export const STAGED = true;

/**
 * The three states of the progress marker, module-private because they are
 * behavior-internal: nothing outside this file may read how far an operation
 * got, and nothing in the kernel could interpret it if it did.
 */
const MINTED = 0;
const STARTED = 1;
const RESOLVING = 2;

/**
 * `source` is the consumer's own array and `items` is the validated copy of it.
 * **Both are supplied rather than derived here**: the validation belongs at the
 * construction boundary, ahead of the first installer, because this function
 * runs inside `install` — after `assemble` has returned — and a throw from here
 * would leave every recorded `retire` hook unrun.
 */
export function createSortableSpec(
  host: KernelHost,
  initialSource: readonly HTMLElement[],
  items: readonly HTMLElement[],
  slots: SortableSlots,
): BehaviorSpec<SortableFramePart, HTMLElement> {
  const { realm } = host;
  /**
   * **The one place this behavior invokes the consumer's error callback.** Both
   * routes below end here, so there is exactly one statement to find when
   * asking *where does `onError` get called*.
   *
   * Unguarded and ungated on purpose: its two callers apply those rules, and
   * they apply them differently — `panic`'s delivery is a named exception to
   * the latch, which is impossible if the latch is read here.
   */
  const deliver: Notify = (error) => {
    slots.onError?.(error);
  };

  /**
   * **The behavior's own route to the one channel.**
   *
   * Two callers reach {@link deliver} and they are two entries to one channel
   * rather than two channels: everything that arrives is a `DraggableError` or
   * a `DraggableWarning`, and neither entry encodes severity. The kernel's
   * `notify` covers what the *kernel* reports, because it owns the latch. This
   * covers what the *behavior* reports — the settlement failure below and the
   * unwind steps, which the kernel cannot see.
   *
   * Both apply the same two rules. The latch refuses a declared consumer slot
   * after logical closure, and a throw from the handler stops here rather than
   * being reported through itself.
   */
  const notify: Notify = (error) => {
    if (host.closed) {
      return;
    }

    try {
      deliver(error);
    } catch {
      // The terminus, for the same reason the kernel's channel has one.
    }
  };
  const unwind = createUnwind(notify);

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
   * **`host.closed` is the reading, and nothing else may stand in for it.**
   * Physical teardown is deferred to the transaction boundary, so a disposed
   * lifetime, an aborted signal, a nulled slot and a detached node all lag the
   * logical close and none of them may answer a liveness question.
   */
  const live = (): boolean => !host.closed;
  /**
   * **The landing target's return buffer, one per controller.** Both
   * `anchorTarget` arms write these two fields and return this object; the
   * kernel reads them immediately and retains nothing, which is the borrow the
   * seam's own contract states. Never module-level: two controllers on one page
   * must not share one.
   *
   * **Nothing may read it between calls**, and the closed-controller arm is why
   * that sentence is here rather than implied: it writes a `(0, 0)` sentinel
   * the kernel discards, so *the cache holds the last landing target* is false
   * in exactly that arm.
   */
  const anchor: PointCache = { x: 0, y: 0 };
  /**
   * **Minted here and monotonic per controller**, and deliberately **not**
   * derived from the published `version`. Two structural invalidations applied
   * inside one drain would both read the same *published* version and stamp two
   * distinct collections identically, which destroys version's only job: being
   * the identity of a snapshot. Seeded from the initial snapshot's own zero, so
   * the sequence stays continuous with it.
   *
   * It advances on the structural branch only — a geometry-only invalidation
   * produces no collection, so it must not consume an identity.
   */
  let version = 0;

  /**
   * The rollback ledger for a **prepared but unadopted** placeholder.
   *
   * Per-operation, and it lives here rather than on the runtime because it is
   * not runtime state: it exists only between `activation.prepare` returning
   * and the seam committing, which is the one window in which the element is
   * mutated and not yet owned. `activePlaceholder` is written by `effect`, on
   * the far side of that window.
   *
   * `null` whenever there is nothing staged — including for the library's own
   * `<div>`, whose undo is being dropped.
   */
  let placeholderUndo: PlaceholderUndo = null;

  /**
   * **The behavior's private state, as spec locals.** Closure-local state
   * satisfies *the kernel can neither name nor type it* more literally than a
   * named container does — there is nothing to name.
   *
   * Everything per-operation below is cleared in `retire()`, and that is the
   * only place it is cleared.
   */

  /** The published collection. Replaced wholesale, never mutated. */
  let snapshot: CollectionSnapshot = { items, version: 0 };
  /**
   * **The last array identity `items()` returned**, and the whole of the
   * structural-change test.
   *
   * The consumer's *own* array, held by reference and never read from — only
   * compared. `snapshot.items` cannot stand in for it: that is the library's
   * shallow copy, so its identity moves on every structural update and never
   * matches what the consumer hands back. Seeded with the array the caller
   * pulled, so the precondition holds from construction rather than only from
   * the first `invalidate()`.
   */
  let sourceIdentity = initialSource;
  /** Null when idle. */
  let presentation: PresentationView | null = null;
  let activePlaceholder: HTMLElement | null = null;
  /**
   * Handed in at activation, cleared at retire.
   *
   * The **projection**: `rendered` is the kernel's own reading and `dispose` is
   * the kernel's own sequencing, so this behavior can do neither through the
   * capability it was handed.
   */
  let lift: BehaviorLiftSession | null = null;
  /** Monotonic; the identity of the latest coalesced spatial attempt. */
  let spatialSeq = 0;
  /** The attempt the frame task actually dispatched. Zero when none is live. */
  let pendingSpatial = 0;

  /**
   * Created once per **controller**, not per operation, and cancelled at
   * retirement and at destroy. Created *here* rather than handed in, so the
   * state its body reads is in the same closure and needs no self-reference.
   *
   * Per-controller removes both the nullability and an allocation from the
   * activation path, and costs nothing in staleness handling: the task's
   * identity is never operation-scoped, because staleness is carried by the
   * monotonic attempt number it schedules.
   *
   * **Measured against both alternatives.** Eager costs 148 B more on a
   * controller that never drags, and wins everywhere else: an active controller
   * is *cheaper* than under lazy-retained or per-operation (281 B against 309
   * B), because their nullable slot and initialization branch cost more than
   * the task they defer, and `schedule` is half the price with no null check.
   */
  const spatialFrame = createFrameTask<number>(realm, (attempt) => {
    // The producer-side half of the double validation: a frame that fires after
    // the operation lost its presentation has nothing to resolve against.
    // `action.prepare` validates the attempt again when it applies.
    if (!presentation) {
      return;
    }

    pendingSpatial = attempt;
    host.dispatch(TAG_SPATIAL, attempt);
  });

  /**
   * **How far the operation got, as one monotone marker.** Per operation,
   * cleared in `retire()`.
   *
   * It exists because the failure path owes a terminal and the kernel cannot
   * supply the two facts that decide which one: *did the consumer hear this
   * drag start*, and *was the consumer's resolver actually invoked*. Both are
   * behavior knowledge, and both are already written at sites the behavior owns
   * — so this is a marker rather than an SPI member.
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
   * Shared by both ingresses so that "a handle gates the keyboard path too" is
   * one rule in one place rather than two implementations that agree.
   */
  const resolveItem = (
    event: Event,
    snapshot: CollectionSnapshot,
  ): HTMLElement | null => {
    const path = event.composedPath();
    let item: HTMLElement | null = null;
    // **The index, not just the element.** The opt-out scan runs over the hops
    // between the event target and the resolved subject, so the walk that finds
    // the item has to report where it stopped.
    let subject = 0;

    for (; subject < path.length; subject += 1) {
      if (snapshot.items.includes(path[subject] as HTMLElement)) {
        item = path[subject] as HTMLElement;
        break;
      }
    }

    if (!item) {
      return null;
    }

    if (slots.handle) {
      const handle = slots.handle(item);

      // **The terminal barrier on the admission sequence.** `handle` is
      // consumer code, and `seedDraft` calls a *second* consumer resolver right
      // after this returns — so a handle resolver that destroyed the controller
      // would otherwise have `visual()` called after `destroy()` returned. The
      // kernel's own post-`admit` recheck stops the operation from being
      // minted, but it runs after the whole callback and cannot make that
      // second call un-happen.
      //
      // It **declines**, it does not throw: a throw reaches
      // `reportFailure(FAILURE_ADMISSION)` and would tell the consumer that its
      // own `destroy()` was a library failure. Declining leaves the controller
      // idle, mints nothing, and — on the command path — leaves the arrow key
      // its native meaning, which is right for a controller that no longer
      // exists.
      //
      // A handle *narrows* admission; it never replaces the item.
      if (host.closed || !handle) {
        return null;
      }

      // `indexOf` rather than `includes`: the same containment test, and the
      // position is what the opt-out scan needs. **The resolved subject
      // governs** — a handle inside the item sits *earlier* in the composed
      // path, so scoping to it shortens the segment the opt-out scan walks, and
      // a handle inside a marked region admits, because the consumer scoped
      // dragging there on purpose.
      subject = path.indexOf(handle);

      if (subject === -1) {
        return null;
      }
    }

    // **What did the event land on**, asked after the subject is known and
    // before anything is seeded. A press or a key that reaches a
    // `[data-drag-ignore]` region declines by the ordinary total-decline path:
    // no operation, no phase change, and — since the kernel prevents nothing
    // for a `null` — focus lands, the caret places, the slider tracks and the
    // arrow key keeps its native meaning.
    return pathOwnsInteraction(path, subject) ? null : item;
  };

  /**
   * The second half of admission: resolve the visual and the box, and seed the
   * draft with an item **already resolved**. Returns the admission subject.
   *
   * Split from {@link admitFrom} for the command path, which needs the item
   * before it can decide feasibility. Resolving twice would call the consumer's
   * `handle()` resolver twice for one keydown — observable, because a resolver
   * is stateful in general and is explicitly allowed to queue `invalidate()`,
   * so the side effect would be queued twice and the operation could reconcile
   * through two snapshots for one native command.
   */
  const seedDraft = (
    item: HTMLElement,
    snapshot: CollectionSnapshot,
    draft: Draft<SortableFramePart>,
  ): AdmissionSubject | null => {
    let visual = item;

    if (slots.visual) {
      visual = slots.visual(item);

      // **The terminal barrier on the visual resolver**, inside the branch
      // because with no resolver composed there is no call here for it to stand
      // behind. `runAdmission` revalidates after this whole callback and
      // declines the operation — but it does not scrub the draft it declined,
      // and teardown scrubbed both frames *before* returning into this line, so
      // the three writes below would pin the item, its visual and the whole
      // snapshot in an inactive frame nothing will clear again. It **declines**
      // for the same reason `resolveItem` does: destroying your own controller
      // is not a library failure.
      if (host.closed) {
        return null;
      }
    }

    draft.item = item;
    draft.visual = visual;
    draft.snapshot = snapshot;

    // **The box is resolved here and returned, never written to the draft.**
    // The kernel needs it before `acquireLift` to take window 1, and the only
    // two carriers are this return value and a behavior-authored draft field
    // the kernel reads back — and the kernel reads no behavior-authored field.
    // So it travels as the second half of the admission subject.
    //
    // Two ways the box is already known, and neither may call anything. `null`
    // means the config named neither slot, so the item is its own box.
    // **Reference equality means the assembler defaulted `box` to `visual`** —
    // and calling it again here would invoke one consumer resolver twice for a
    // single admission, which a stateful resolver can observe.
    if (!slots.box || slots.box === slots.visual) {
      return visual;
    }

    const box = slots.box(item);

    // The terminal barrier on the box resolver, for the same reason the visual
    // resolver carries one two statements up: it is consumer code, and a
    // resolver that destroys its own controller must not have its result minted
    // into an operation.
    if (host.closed) {
      return null;
    }

    // Returned as a bare element when the two coincide, so the kernel's `box`
    // and `visual` are the *same reference* and `activation.prepare`'s identity
    // branch can recognise the default case. There is exactly one encoding of
    // "the box is the visual", and this is it.
    return box === visual ? visual : { visual, box };
  };

  /**
   * The half of admission both ingresses share: resolve the item, the visual
   * and the box, and seed the draft. Returns the admission subject — a bare
   * visual, or the `{ visual, box }` pair when the two differ — or `null` to
   * decline.
   *
   * No `preventDefault()` — the kernel owns that call in both modes. It makes
   * it at the **threshold crossing** on the pointer path and inside the
   * listener on the command path, but never here and never by the behavior.
   */
  const admitFrom = (
    event: PointerEvent,
    draft: Draft<SortableFramePart>,
  ): AdmissionSubject | null => {
    // **A modifier requests native text selection; its absence means drag.** A
    // gesture across prose inside a draggable region is longer than the
    // threshold by construction, so both readings — "select this text" and
    // "drag this row" — fit the same input and no evidence distinguishes them.
    // The contract does not try: `Alt` held at `pointerdown` declines, and the
    // press keeps its full native meaning by the ordinary decline path. One
    // branch, no state, no disambiguation window, no deferred
    // `preventDefault()`.
    if (event.altKey) {
      return null;
    }

    const item = resolveItem(event, snapshot);

    return item ? seedDraft(item, snapshot, draft) : null;
  };

  /**
   * The failure the open settlement seam is reporting, handed from `prepare` to
   * `effect` because `PreparedSettlement` carries only the gate declaration.
   *
   * **This is an accepted out-of-band channel, not an oversight** — deliberate,
   * rather than widening the frozen `PreparedSettlement`. What makes it
   * transaction-safe is not "seams do not currently re-enter" but a stronger,
   * enforced property:
   *
   * 1. `runCore` is the only driver of this seam and always runs `prepare`
   * before `effect`, and `prepare` **clears the slot on entry** (below). So a
   * value can only ever be read by the effect of the very transaction whose
   * prepare wrote it — there is no window in which one settlement's effect
   * could observe another's failure.
   * 2. Every path that abandons a transaction between the two phases —
   * `prepare` throwing, `SEAM_INVALIDATED` from a held cancel latch, a
   * reentrant `destroy()` — skips the effect and therefore leaves the slot set;
   * the *next* prepare's clear is what collects it. Staleness is impossible by
   * construction, not by timing.
   * 3. The driver refuses a nested seam outright (`refuseReentry`), so no
   *    third party can interleave a write between the pair.
   *
   * The cost of the alternative is a change to a frozen SPI type with no
   * failing executable case behind it. Revisit only if a real case appears; the
   * invariant to preserve if this is ever touched is (1) — **prepare must clear
   * before it can write**.
   */
  let pendingFailure: Readonly<{
    stage: FailureStage;
    report: DraggableError;
  }> | null = null;

  /**
   * `invalidateInsertion()` narrowed to its own stage.
   *
   * Every call site below is inside a kernel-driven seam, so the surrounding
   * phase would otherwise classify a throw as *its* stage — an activation
   * failure, a placeholder-move failure — and `SortableErrorContext.stage`
   * would name the wrong thing. `host.fail` narrows from the inside, which is
   * the mechanism for exactly this.
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

  /** The gap the item came from, recomputed rather than stored. */
  const homeGap = (frame: Readonly<Frame<SortableFramePart>>): void => {
    const home = homeInsertion(frame.snapshot!, frame.item!);

    if (home) {
      movePlaceholder(activePlaceholder!, home);
    }
  };

  return {
    createFramePart: sortableFramePart,
    // **One function fills both slots**: called with no argument it allocates a
    // part at its defaults, called with one it returns that part to them. The
    // reset's return is the part it was handed, which the kernel has and
    // ignores.
    // eslint-disable-next-line @typescript-eslint/strict-void-return
    resetFramePart: sortableFramePart,

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
     * The **second ingress**, sharing every admission rule with the press: the
     * same composed-path search, the same handle narrowing, the same visual
     * resolver. `handle()` therefore gates the keyboard path too, which is
     * deliberate parity rather than incidental.
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
        // target.** It is not a special case of the target rules below: a real
        // Chromium composition otherwise admits the drag, reordering the
        // collection while the user is mid-word and not interacting with the
        // list at all. The test is a property of the keyboard event, so it
        // needs no target inspection and costs nothing.
        if (keys.isComposing) {
          return null;
        }

        const direction = directionOf(keys.key);

        if (direction === null) {
          return null;
        }

        // **Resolved exactly once per keydown.** `resolveItem` invokes the
        // consumer's `handle()` resolver, so the destination and the draft seed
        // are both derived from this one item rather than from two independent
        // resolutions of the same event.
        //
        // **The target question is asked here, and it is asked first.** Order
        // is normative — *what did the event land on*, then *is the move
        // feasible* — and asking feasibility first makes the outcome
        // unstateable: a `contenteditable` in the last row would keep
        // ArrowRight only because the edge decline happened to fire.
        //
        // **Both ingresses ask one question of one attribute**, so there is no
        // per-key owner table to consult and none is to return. The order above
        // still holds and still matters — the item is what feasibility is asked
        // about — but that asymmetry returns for an *unmarked* field, and
        // `data-drag-ignore` is what answers it.
        const item = resolveItem(event, snapshot);

        if (!item) {
          return null;
        }

        const insertion = keyboardInsertion(snapshot, item, direction);

        // The edge case, and the whole reason the decision is synchronous.
        // Checked before the draft is seeded, so an infeasible command resolves
        // no visual either — the press path resolves one only for an admission
        // it is going to make, and the command path matches it.
        if (!insertion) {
          return null;
        }

        const subject = seedDraft(item, snapshot, draft);

        if (!subject) {
          return null; // a consumer resolver destroyed the controller
        }

        // The destination travels in the draft, exactly as `item` does for a
        // press. No staged value crosses the ingress boundary, which is what
        // keeps the second ingress to one SPI member.
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
       * DOM insertion, no acquisition, nothing externally visible.
       *
       * **Nothing visible is not nothing to undo, and the two cases divide on
       * ownership.** The library's own `<div>` is created here and discarded
       * whole with the preparation, so `placeholderUndo` stays `null` for it
       * and `rollback` has nothing to spend. An element from a `placeholder`
       * slot is the consumer's and is only *mutated* here, so those writes are
       * recorded — which is the case `rollback` below is required for.
       */
      prepare(draft, scope) {
        const item = draft.item!;
        const { box, visual, boxPre } = scope;
        // **Window 2 of 2, and the first thing this seam does.** The kernel
        // took window 1 immediately before `acquireLift`; this one reads the
        // same element in the same units on the far side of it, and the
        // difference is the space the visual's removal actually freed.
        //
        // **One extent, not two.** `boxPre − boxPost` measures a *collapse*,
        // which is a scalar on the list's flow axis; the footprint it feeds is
        // a *box*, which is two extents. Subtracting on both conflated them,
        // and on the cross axis the box surrenders nothing — a block-level box
        // in a vertical list takes its width from its containing block on both
        // sides of the lift — so the difference there is `0`: arithmetically
        // correct and the wrong quantity. Nothing was lost on that axis, so
        // there is nothing to restore, and what the placeholder still owes is
        // to stand where the row stood. That is `boxPre.width`, always.
        //
        // Spelled `height` rather than "the block axis" deliberately: `y()` is
        // written on `pointerY`, `CENTRE_Y` and `rect.top/bottom`, so a
        // logical-axis footprint would give this rule a writing-mode dependency
        // the axis module it serves does not have. `box !== visual` is
        // supported with `y()` alone.
        //
        // **The identity branch is the degenerate case rather than a second
        // rule.** `boxPre − boxPost` is only the footprint when the box *stays
        // in flow* while the visual leaves it, which is the nested-pair case
        // (`box = .row-box` wrapping `visual = .card`: 62 → 32, so 30). Under
        // the default `box === visual` there is no such pair — the one element
        // is the thing being lifted, and `LIFT_FAITHFUL` promotes it with
        // `position: fixed` and an explicit width and height, so its offset box
        // is *unchanged* by the lift and the collapse is zero.
        // `footprint = boxPre` falls out as a consequence of the rule rather
        // than an exception to it.
        const footprint =
          box === visual
            ? boxPre
            : {
                width: boxPre.width,
                height: boxPre.height - box.offsetHeight,
              };

        // **The pointer branch.** A press has no destination yet, so the grab
        // slot is the origin the spatial path resolves away from. A *command*
        // already wrote its destination in `command.admit`, and seeding home
        // here would destroy the only state carrying it.
        if (draft.pointerId !== -1) {
          const home = homeInsertion(draft.snapshot!, item);

          if (!home) {
            return null; // the item left the collection between press and move
          }

          draft.insertion = home;
        }

        // **The ledger is opened only for a consumer-owned element.** With no
        // `placeholder` slot composed the element is the library's own `<div>`,
        // which `prepare` created, nothing outside has seen, and a discarded
        // preparation drops — so an undo for it would be work with no observer.
        // With a slot composed every write below lands on someone else's node.
        placeholderUndo = slots.placeholder ? [] : null;

        return createPlaceholder(
          realm,
          { item, visual, box, rect: scope.originRect },
          footprint,
          slots.placeholder,
          live,
          placeholderUndo,
        );
      },

      /**
       * **Required, and non-vacuous.** A discarded prepare leaves only a
       * detached element for the collector while the placeholder is the default
       * `<div>`, and stops doing so the moment a `placeholder` slot exists:
       * `prepare` writes `data-drag-placeholder`, `aria-hidden`, the copied
       * `slot` and three inline style properties onto an element the
       * **consumer** created, and `preparationValid()` does not reverse a
       * `setAttribute`. It discards the *preparation*; the element is not the
       * library's to discard.
       *
       * Reverse order, and each undo guarded on its own: one throwing revert —
       * a custom element with an overridden `setAttribute` — must not strand
       * the writes recorded before it.
       */
      rollback() {
        const ledger = placeholderUndo;

        placeholderUndo = null;

        if (!ledger) {
          return;
        }

        for (let i = ledger.length - 1; i >= 0; i -= 1) {
          unwind(ledger[i]!);
        }
      },

      /** Strict order: register, make visible, publish, then notify. */
      effect(current, placeholder, scope) {
        // **Adoption is what closes the rollback window.** From the line below
        // the element is the library's: the disposer removes it, moves relocate
        // it, teardown takes the attributes off with it. A ledger left here
        // would be a set of reverts for an element nobody may revert, and the
        // *next* operation's discarded preparation would run them.
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
        // reentrancy guard above sees it. If it destroyed the controller, the
        // controller is logically closed. Everything below would then register
        // against lifetimes that are closing, republish this operation's DOM
        // into the runtime for the *next* drag to find, and call `onStart`
        // after `destroy()` — the terminal barrier forbids crossing.
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
        // published or notified. Two conjuncts, each catching what the other
        // cannot. Adjacency alone already implies same-parent, so a separate
        // parentage test would be unfalsifiable; but adjacency holds inside a
        // detached fragment too, so connectivity is not implied by it.
        const item = current.item!;

        if (
          !placeholder.isConnected ||
          item.nextElementSibling !== placeholder
        ) {
          throw new Error('drag: sortable/insertion-placeholder-lost');
        }

        // **The pre-publication revalidation, and the one reading that covers
        // this whole stretch.** The alternative is a pair of readings — one
        // after `after()`, one after the survival conjuncts — of
        // `scope.presentation.signal.aborted`, which is strictly *stronger*
        // than the controller's latch in that it also fires for a
        // kernel-internal `panic()` destroy.
        //
        // That property inverts here: physical teardown runs at the transaction
        // boundary, so the signal **lags** the close it would stand in for, and
        // the stronger reading is the wrong one for exactly the reason that
        // made it attractive. `host.closed` is the latch itself, and since a
        // panic closes logically first it sees that too, so one reading placed
        // immediately before the publication block loses nothing. Every
        // consumer-reachable accessor in the stretch — `connectedCallback`,
        // `isConnected`, `nextElementSibling` on a consumer-owned placeholder —
        // is covered by it, because everything below is the publication and
        // nothing above it is consequential.
        if (host.closed) {
          return;
        }

        // Listeners bound to the signal are self-releasing, so the signal *is*
        // the registration; the explicit disposer cancels a scheduled frame.
        scope.motion.use(spatialFrame.cancel);
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
        activePlaceholder = placeholder;
        ({ lift } = scope);
        presentation = {
          realm,
          placeholder,
          item,
          box: slots.box,
          settle: slots.settle,
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
          // above outranks this classified failure, so the operation settles as
          // *canceled* for a drag `onStart` never announced. Either fault alone
          // is fine: without the cancel this reports through `onError`, and
          // without the throw `onStart` still runs. An admitted gap, rather
          // than closed with a per-operation "started" flag.
          return;
        }

        // **The last barrier of the activation sequence.** `invalidateInSeam`
        // calls a third-party `invalidateInsertion` — the axis installer's,
        // which is middle-tier code — and it reports only whether that call
        // *threw*, never whether it destroyed the controller on its way out.
        // Without this reading an installer that closed its own controller
        // still gets a start published for it.
        //
        // It is the same shape as free drag's and is deliberately not shared:
        // the two barriers guard different calls in different sequences, and
        // extracting them would build a common activation runtime out of a
        // coincidence of shape.
        if (host.closed) {
          return;
        }

        // **The marker advances before the call, not after.** A throw from
        // `onStart` itself is classified, and the consumer has by then been
        // told the drag began — so it is owed an end. Advancing after the call
        // would publish nothing for exactly the operation the consumer most
        // recently heard about.
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
      // `FAILURE_SCHEDULED_FRAME` has no producer at all. The spatial search is
      // coalesced to one per frame; pointer input is not.
      spatialSeq += 1;

      try {
        spatialFrame.schedule(spatialSeq);
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
          // The applied half of the double validation. The `view` test is what
          // bites today; the attempt comparison is unreachable as things stand,
          // because the frame task coalesces and dispatches the latest sequence
          // synchronously, so a queued attempt is always current when it
          // applies. It is kept because the contract states the check, and
          // because anything that later queues a spatial action from outside
          // the frame task reopens the window it closes. The spatial action is
          // inert outside `ACTIVE`, and `presentation` cannot stand in for
          // that: it is cleared only at retirement, so it stays non-null
          // through `RELEASING`, `SETTLING` and `FINALIZING`. No producer can
          // reach those phases today — the frame task is cancelled when motion
          // closes at release, and no other call site dispatches this tag — so
          // this guard is unreachable by construction rather than by luck. It
          // is here so that a future producer (a replayed action, a flush from
          // a hook) cannot commit a placeholder move into a decided
          // transaction.
          if (
            draft.phase !== ACTIVE ||
            argument !== pendingSpatial ||
            !presentation
          ) {
            return null;
          }

          const resolved = slots.resolveInsertion(draft, presentation);

          // `resolved === null`: the incumbent slot still wins — commit
          // nothing. `host.closed`: a candidate `visual()` resolver destroyed
          // the controller during the rebuild. The kernel would discard the
          // transition anyway — `preparationValid()` no longer holds — but
          // stopping one branch earlier means the behavior never writes
          // `draft.insertion` for an operation that no longer exists.
          if (resolved === null || host.closed) {
            return null;
          }

          draft.insertion = resolved;
          return STAGED;
        }

        // **The pull happens here, not at the controller.** `items()` is
        // consumer code, and this is the one place that has a transaction open,
        // a phase to branch on, and a stage to classify a throw against — the
        // controller member is reachable from inside a seam and could only have
        // called it at an arbitrary reentrant point.
        const source = slots.items();

        // The terminal barrier on the pull. `items()` may destroy the
        // controller; discarding here means the behavior neither copies nor
        // publishes for an operation that no longer exists.
        if (host.closed) {
          return null;
        }

        // **Array identity is the whole structural test.** An unchanged
        // identity is a resize, a zoom or a scroll — the warm, common case —
        // and it stages no snapshot, so it never reaches the phase branch below
        // and never pays the copy.
        if (source === sourceIdentity) {
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
        // **Copied first, numbered second.** The copy refuses nothing, so
        // nothing here throws — but the order still matters, because it is what
        // keeps the version a dense identity for the collections that actually
        // exist: a pull that produces no collection must not consume a number,
        // or a consumer sees the next successful update numbered as though an
        // invisible one had happened in between.
        const items = [...source];

        version += 1;

        const next: CollectionSnapshot = { items, version };
        const { phase } = draft;

        // `IDLE`: publish, but bind nothing — an idle frame must retain no DOM.
        // `RELEASING` and later: the operation's semantic snapshot is frozen
        // and the transaction is decided, so the replacement publishes without
        // rewriting what the release resolved against.
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

        // **The test is the insertion, not the phase.** A *press* at `PENDING`
        // has none to rebase — home is seeded at activation — so the item
        // surviving is the whole question. A **command** commits `PENDING` with
        // its destination already written by `command.admit`, and
        // short-circuiting on the phase would carry that gap, unrebased, into a
        // release that then fails to build a proposal against the new snapshot.
        //
        // So a command gap is either rebased here or the operation is cancelled
        // before release ever runs. No command-specific revalidator exists, and
        // none is needed, because this one generalizes.
        //
        // `ACTIVATING` reconciles exactly like `ACTIVE`, because the runtime is
        // published and the home insertion committed before `onStart` could
        // queue this action.
        if (!draft.insertion) {
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
          const placeholder = activePlaceholder!;
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

          const view = presentation!;

          // Published before the write, so the axis is told which gap the
          // placeholder now occupies.
          //
          // Cleared in a `finally` covering every exit, because the field is
          // meaningful **only** inside the bracket: a value left behind would
          // be a stale destination gap that outlives the move it described.
          view.insertion = insertion;

          /**
           * **The cache does not describe the DOM.** Raised before anything can
           * touch the rule's arrays and lowered only once the cache and the
           * tree agree again, so every exit in between — a placeholder
           * reaction that destroyed the controller, a hook that threw — leaves
           * it set and invalidates in the `finally`.
           *
           * That invalidation is load-bearing rather than defensive. There is
           * no invalidation on the happy path at all: the axis either advances
           * its cache arithmetically or rebuilds it. So the only thing standing
           * between a failed move and a cache describing a tree that never
           * existed is this flag.
           */
          let stale = true;

          try {
            // 1 — the one write.
            movePlaceholder(placeholder, insertion);

            // **The terminal barrier on the placeholder-reaction window** — the
            // same hazard `activation.effect` already guards one line after
            // `item.after(placeholder)`, reached through the other door.
            // `movePlaceholder` moves a node, so a custom-element placeholder's
            // `disconnectedCallback`/`connectedCallback` runs synchronously
            // inside that call; it is consumer code the `placeholder()` factory
            // supplied, and no seam wraps it. If it destroyed the controller,
            // the hook below would read consumer-owned rows and the sink would
            // start WAAPI animations against a retired feature.
            if (host.closed) {
              return;
            }

            // 2 — tell the axis, and hand it the sink. One call: the cache
            // advance does not depend on the DOM, so there was never a reason
            // for it to precede the write it describes, and the sink's visitor
            // arrives as an argument rather than a plan coming back — which is
            // what leaves a composition with no displacement feature allocating
            // nothing at all here.
            //
            // **Narrowed to `FAILURE_INVALIDATION` by its own `try`**, for the
            // same reason as `invalidateInSeam`: this is geometry-cache
            // maintenance, and the enclosing phase would otherwise classify a
            // throw the way it classifies the write above it — which is what
            // the write's own throw must stay. The `finally` below invalidates
            // either way, because `stale` is still set.
            try {
              slots.movedInsertion(current, view, slots.report);
            } catch (error) {
              host.fail(FAILURE_INVALIDATION, error);
              return;
            }

            stale = false;
          } finally {
            if (stale) {
              invalidateInSeam();
            }

            view.insertion = null;
          }

          return;
        }

        const staged = prepared as PreparedCollection;
        const { phase } = current;
        const next = staged.snapshot;

        // **The geometry-only branch ends here**: nothing to publish, no
        // reconcile, no cancel — the rect index is stale and that is all.
        // Reached by a resize, a zoom or a scroll, which is why keeping it off
        // the publication path is what makes the pull source cheap rather than
        // merely tidy.
        if (!next) {
          invalidateInSeam();
          return;
        }

        // Publication is an effect, not a preparation: a reentrant cancel or
        // destroy must not be able to invalidate a preparation whose private
        // runtime has already been replaced.
        snapshot = next;
        // The identity the structural test compares against, advanced with the
        // snapshot it produced and never before it — a preparation that was
        // discarded must not move the baseline, or the next invalidation would
        // read the change as already applied.
        sourceIdentity = staged.source;

        if (presentation) {
          presentation.snapshot = next;
        }

        if (phase === ACTIVATING || phase === ACTIVE) {
          // Not gated on success: publication already happened above, and the
          // consumer's update must never be thrown away by a failing
          // invalidation. The latched failure still decides the seam.
          invalidateInSeam();
        }

        // Last, and only after publication: an invalid collection ends the
        // current drag, but it must never throw away the consumer's update.
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
        const view = presentation;
        const { item } = draft;
        const { snapshot } = draft;

        if (!view || !item || !snapshot) {
          throw new Error('drag: sortable/release-no-presentation');
        }

        // **The branch is where the insertion comes from, never how the
        // proposal is built.** Both paths hand the same `insertion` to the same
        // `buildReorderProposal` against the same snapshot, which is what makes
        // "a keyboard and a pointer reorder to the same gap produce identical
        // proposals" a statement about one code path rather than a coincidence
        // between two.
        let insertion: Insertion;

        if (draft.pointerId === -1) {
          const { insertion: commanded } = draft;

          // **The pointerless branch.** The committed insertion *is* the
          // command's destination: there is no release sample, so a spatial
          // resolve would select a gap from `pointerY === 0` — the top of the
          // viewport — and silently replace it.
          //
          // A `null` here is a broken invariant, never a home fallback: the
          // pointer path's fallback exists because a spatial resolve can
          // legitimately find nothing, while a command that reached `RELEASING`
          // with no destination has lost state the kernel guaranteed to carry.
          // Reporting that as a home-gap reorder would tell the consumer a drop
          // completed normally.
          if (!commanded) {
            throw new Error('drag: sortable/release-no-destination');
          }

          insertion = commanded;
        } else {
          // **Invalidated, then measured**, and nothing is cancelled first.
          // Motion is already closed, so this search runs against final
          // geometry — and "final" has to mean settled flow geometry, not rows
          // still carrying a contribution, because the gap it commits is not an
          // intermediate artefact: it is the `ReorderRequest` the consumer is
          // asked to apply.
          //
          // **The rebuild settles the buffer instead of the rows.** The sink
          // subtracts what it is holding as part of the scan, so a row still in
          // transit measures where flow puts it while continuing to travel.
          // Cancelling here would land the same numbers and snap every
          // displaced row at the one instant the user is watching the item
          // land.
          if (!invalidateInSeam()) {
            return { invoke: null };
          }

          // **No terminal barrier here, deliberately.** This resolve reaches
          // the candidate loop too, and on an aborted traversal it falls back
          // to `draft.insertion`, builds a proposal and stages an `invoke`
          // closure — which is never executed: `runCore` stages nothing when
          // `preparationValid()` is false, and `runReleaseSeam` runs only a
          // non-null command, so `onReorder` cannot fire for an operation
          // `destroy()` retired. A guard here would be a second copy of a
          // decision the kernel already owns, and two copies can disagree.
          const resolved =
            slots.resolveInsertion(draft, view) ?? draft.insertion;

          // **The terminal barrier on the frame writes**, and it is a
          // *different* guard from the one declined above: that one was about
          // `onReorder` firing, which the kernel owns. This one is about what
          // the **draft** holds. The consumer-reaching stretch that ends here
          // is the axis's own rebuild — a `box` resolver and a
          // `getBoundingClientRect` per candidate, then the consumer-owned
          // placeholder — and every statement below writes a frame teardown has
          // already scrubbed and will not scrub again: `draft.insertion`, then
          // `draft.proposal`, whose request pins the item and the whole
          // released snapshot in an inactive frame.
          if (host.closed) {
            return { invoke: null };
          }

          if (!resolved) {
            throw new Error('drag: sortable/release-no-insertion');
          }

          draft.insertion = resolved;
          insertion = resolved;
        }

        const built = buildReorderProposal(snapshot, item, insertion);

        if (!built) {
          // A release that finds no coherent proposal has a broken invariant.
          // Reporting it as a successful no-op drop would tell the consumer the
          // drag completed normally.
          throw new Error('drag: sortable/release-no-proposal');
        }

        draft.proposal = built.proposal;

        if (built.noop) {
          // The **only** legitimate skip: a proven `from === to`.
          return { invoke: null };
        }

        const { request } = built.proposal;

        return {
          invoke: (signal) => {
            // **First statement of the closure.** The kernel runs this only
            // after `release.effect` returns normally, so reaching it is proof
            // the consumer's resolver is being invoked — which is what makes a
            // later failure `AT_CONSUMER` rather than `AT_PROPOSAL`.
            progress = RESOLVING;
            return slots.onReorder(request, { signal });
          },
        };
      },

      effect(current) {
        // **Unconditional**: a command reorders too, and its placeholder
        // reaches the same final gap by the same single writer.
        movePlaceholder(activePlaceholder!, current.insertion!);

        // **The terminal barrier on the release write.** The move above runs a
        // custom-element placeholder's callbacks, and `retire()` has then
        // already nulled `lift` — so without this the very next line is
        // `null.write(...)`, a `TypeError` classified as `FAILURE_RELEASE`
        // against a controller that no longer exists.
        //
        // It covers the `lift!.write` alone: there is no publication below it
        // to guard, because nothing here holds a pending request for the
        // readiness protocol to acknowledge.
        if (host.closed) {
          return;
        }

        if (current.pointerId !== -1) {
          // Normative, not decoration: `pointerup` need not carry the last
          // processed `pointermove`'s coordinates, and the proposal was
          // computed from the committed release point. Rendering the
          // placeholder alone would leave the visual — and the whole landing
          // trajectory — starting from a stale point.
          lift!.write(
            current.pointerX - current.originX,
            current.pointerY - current.originY,
          );
        }
        // **The pointerless branch writes nothing**, and that is not a
        // shortcut: there is no release sample to write. The pointer scalars
        // are still at their admission values, so writing `pointerX - originX`
        // here would render `(0, 0)` — where the visual already is, so it would
        // look harmless while making this branch depend on the very fields it
        // is defined not to read. The landing then opens from `(0, 0)`, which
        // is correct because the visual has not moved since acquisition.

        // **Nothing is published here.** There is no acknowledgement protocol
        // to publish a request for — no `ready()` to check an object's identity
        // against, and so no reason to publish last and inside this effect. The
        // ordering that does bind is the kernel's: the staged command runs
        // *after* this returns, so a throw from the write above classifies
        // `FAILURE_RELEASE` and the round-trip never opens.
        //
        // **The render is a consumer-reachable call**, which is what makes that
        // ordering matter here rather than only in the kernel: this is the seam
        // the `AT_PROPOSAL`/`AT_CONSUMER` split turns on, and a throw from this
        // effect is `AT_PROPOSAL` because the marker only reaches `RESOLVING`
        // inside the `invoke` closure.
      },
    },

    // -----------------------------------------------------------------------
    // Settlement
    // -----------------------------------------------------------------------

    settlement: {
      /** The five-case mapping, covered exhaustively. */
      prepare(draft, input): PreparedSettlement {
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
            draft.recovery = RECOVERY_IMMEDIATE;
            draft.domain = { type: 'noop', proposal: proposal! };
            return true;
          }

          case SETTLED_FULFILLED: {
            const { value } = input;

            // **The resolution is the library's own value, not the
            // consumer's**: `accept()` returns a shared sentinel and `reject()`
            // a one-slot carrier, so this is an identity comparison and a plain
            // data read. There is nothing to validate — a value that is neither
            // came from outside the types.
            const accepted = value === ACCEPTED;

            // **The barrier stands.** Nothing between this seam's entry and the
            // write reaches consumer code, but the round trip is a
            // `PromiseLike`: the consumer may have destroyed the controller
            // while it was pending, and publishing into a frame teardown has
            // already scrubbed would pin the whole proposal in an inactive
            // frame nothing clears again.
            if (host.closed) {
              return true;
            }

            const domain: ReorderTransactionResult = accepted
              ? { type: 'accepted', proposal: proposal! }
              : {
                  type: 'rejected',
                  reason: (value as RejectedResolution)[0],
                  proposal: proposal!,
                };

            draft.recovery = accepted ? RECOVERY_DESTINATION : RECOVERY_HOME;
            draft.domain = domain;

            return true;
          }

          case SETTLED_REJECTED: {
            // A rejected thenable is a resolver malfunction, not a considered
            // consumer verdict, so it is a named classified failure rather than
            // an inferred rejection. It still *ends* the operation, but as a
            // fault reported through `onError`, with the terminal saying
            // `canceled` rather than `rejected`.
            //
            // **The caught cause travels verbatim.** Something *was* caught
            // here — the consumer's own rejection value — so nothing is added
            // to it: no identity, no wrapper. The seam is already open at
            // `FAILURE_RESOLUTION`, so re-raising it classifies there.
            throw input.error;
          }

          case SETTLED_CANCELED: {
            draft.recovery = RECOVERY_HOME;
            draft.domain = {
              type: 'canceled',
              reason: input.reason,
              origin: input.origin,
              stage: input.stage,
              proposal,
            };
            return true;
          }

          case SETTLED_FAILED: {
            pendingFailure = { stage: input.stage, report: input.report };

            // A terminal-callback failure has recovery "none": the operation
            // already finalized, and rewriting the recovery now would move a
            // visual whose drop has already been reported as accepted. Every
            // other stage replaces the transaction — the *presentation*
            // transaction, which is a different question from what the consumer
            // is told.
            if (input.stage !== FAILURE_TERMINAL_CALLBACK) {
              draft.recovery = RECOVERY_IMMEDIATE;
              // **The fallback, and the whole of the terminal's carrier.**
              // Assigning `draft.domain = null` here is what would make the
              // library's most serious failures its quietest: `finalized`
              // publishes `current.domain` and nothing else, so a null is no
              // terminal at all.
              //
              // **Existing result wins, otherwise `canceled`** — a lookup on
              // the frame, not a branch per stage. A transaction opens with
              // `Object.assign(draft, current)`, so a settlement that already
              // committed a result arrives here still carrying it, and `??` is
              // the whole tie-break.
              //
              // **An unconditional `draft.domain = …` here is wrong.** It rests
              // on a terminal-callback throw being the only failure that
              // arrives after a result exists, and that is false, unavoidably:
              // `FAILURE_LANDING_INTERRUPTED` has one producer and it can only
              // fire *after* a runner was armed, which is after the settlement
              // committed. Such an assignment overwrites a committed result 100
              // % of the time it fires, and tells a consumer whose data really
              // was reordered that the drop was `canceled`. The stage exclusion
              // above stands on its own reason — recovery, not the result — and
              // carries no weight in this tie-break.
              //
              // **The marker decides the stage, and it also decides whether to
              // publish at all.** At `MINTED` the consumer never heard this
              // drag start, and an end for a beginning it has no record of is
              // worse than publishing nothing.
              draft.domain ??=
                progress === MINTED
                  ? null
                  : {
                      type: 'canceled',
                      reason: input.error,
                      // **The one origin a behavior mints.** The kernel writes
                      // the other three onto the `SETTLED_CANCELED` input; this
                      // arm is the fallback that gives a classified failure a
                      // terminal, so the behavior is the only party that can
                      // say so. `reason` still carries the caught throw, and
                      // `origin` is what tells it apart from a consumer who
                      // passed an `Error` deliberately.
                      origin: CANCEL_FAILED,
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

        if (!failure) {
          // Requests only — nothing is armed here, and a request is recorded at
          // most once. **One gate**: the authored-presentation hold has no
          // producer under the serial commit.
          if (slots.startLanding && current.recovery !== RECOVERY_IMMEDIATE) {
            scope.holdForLanding(slots.startLanding);
          }
        }

        // 4 — consumer callbacks last. A failed settlement reports through
        // `onError` here **and** publishes its terminal from the failure path's
        // own `ERROR_REPORTED` step — the two channels are orthogonal and
        // neither suppresses the other.
        if (failure) {
          // The error carries the stage the kernel classified with, and this
          // member neither reads it nor derives anything from it. It goes
          // through `notify`, so a throwing handler stops here instead of
          // becoming a fresh library fault that reports itself back. The kernel
          // built the error, and nothing is copied into `domain` here:
          // `finalized` publishes that same `current.domain` to `onEnd`,
          // unconditionally, so a copy would be redundant at best and **stale**
          // at worst, since a second failure arriving between `REPORTING` and
          // `FINALIZING` moves it.
          notify(failure.report);
        }
      },
    },

    // -----------------------------------------------------------------------
    // Landing target and the terminal callback
    // -----------------------------------------------------------------------

    anchorTarget(current): PointCache {
      const placeholder = activePlaceholder!;
      const item = current.item!;
      const { recovery } = current;

      if (recovery === RECOVERY_DESTINATION) {
        // Re-anchoring follows the **recovery**, which is committed behavior
        // state. There is no `authoredReady` gate in front of this and none is
        // needed: under the serial commit the authored DOM is already final
        // when this runs, so there is no pending render to wait for.

        // Each conjunct earns its place. `nextElementSibling` makes the repair
        // inert when the placeholder is already adjacent — `before()` on an
        // already-correct position is a remove-and-reinsert that resets CSS
        // transitions and forces a reflow. `isConnected` and the parent test
        // stop a consumer that unmounted or re-keyed the item from having the
        // placeholder dragged into a detached tree, which would destroy the
        // very element the fallback measures.
        if (
          item.isConnected &&
          item.parentElement === placeholder.parentElement &&
          placeholder.nextElementSibling !== item &&
          // **The terminal barrier on the re-anchor's own conjuncts.** All
          // three above are accessors on consumer-owned elements. Teardown has
          // already *removed* this placeholder, so `before()` after a destroy
          // would re-insert a footprint the operation has finished with — back
          // into the consumer's list, where nothing will remove it again. Last
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

      // **The terminal barrier on the re-anchor.** Both branches above move a
      // node — `item.before(placeholder)` here, `movePlaceholder` inside
      // `homeGap` — so a custom-element placeholder's
      // `disconnectedCallback`/`connectedCallback` runs synchronously inside
      // them, and it is consumer code. The measurement below is a *second*
      // consumer call on the same element. The kernel revalidates around
      // `anchorTarget` and never starts a landing for a destroyed controller,
      // so the point is discarded either way; what this stops is the read
      // itself.
      if (host.closed) {
        anchor.x = 0;
        anchor.y = 0;

        return anchor;
      }

      // **The precondition, two O(1) reads, immediately before the
      // measurement.** It runs *after* the re-anchor above, because the repair
      // is what the authored commit is allowed to have made necessary; checking
      // before it would report a fault the library was about to fix.
      //
      // Each conjunct names a real consumer strategy. `isConnected` catches
      // `replaceChildren` and an `innerHTML` rebuild, which detach the
      // placeholder outright: a detached placeholder reads `0×0` at the
      // viewport origin, and the row visibly travels to `(0,0)` over twelve
      // frames before teleporting back. The parent test catches container
      // replacement, where the placeholder survives in a tree the list no
      // longer contains.
      //
      // **It throws rather than returning a sentinel**, and the kernel treats
      // the throw and a failed check identically: a target that cannot be
      // produced and one that cannot be trusted are the same fault. The
      // diagnostic is authored here because this is the tier that knows what a
      // placeholder and an item are — the kernel would have to say "something
      // was wrong" instead.
      if (
        !placeholder.isConnected ||
        placeholder.parentElement !== item.parentElement
      ) {
        // The landing target cannot be measured. The reorder itself already
        // committed and is unaffected.
        throw new Error('drag: sortable/landing-placeholder-lost');
      }

      const rect = placeholder.getBoundingClientRect();

      anchor.x = rect.left;
      anchor.y = rect.top;

      return anchor;
    },

    /**
     * **It publishes `current.domain` and nothing else.**
     *
     * **An exhaustive switch on the domain discriminant does not belong here.**
     * A switch routes arms to callbacks, and there is one `onEnd` to route to:
     * the arms are the consumer's to discriminate. That is what makes a binary
     * accepted-vs-everything predicate — one that would send the no-op result
     * to a cancel callback — unexpressible.
     *
     * `null` still publishes nothing, and it means one thing only: the
     * operation failed **before** `onStart` ran, so the consumer has no record
     * of it beginning. Every started operation reaches here with a result — its
     * own, or the `canceled` fallback `settlement.prepare` wrote.
     */
    finalized(current) {
      const { domain } = current;

      if (domain) {
        slots.onEnd?.(domain);
      }
    },

    /**
     * **Forward, and nothing else.** The kernel builds the public error, picks
     * its class and owns the latch; this member is the last hop, and it is
     * {@link deliver} itself.
     *
     * **Neither a classification nor a `domain: null` context belongs here**,
     * so this member neither derives anything from the stage nor attaches a
     * context: construction is kernel-owned so a classification cannot mean two
     * things in two behaviors, and the context is strictly redundant with the
     * terminal. There is no stage-to-code mapping to call either way.
     *
     * Its one caller is the kernel's `notify`, which gates on the latch and
     * discards a throwing handler for every route it owns — including `panic`'s
     * post-closure delivery, which is exactly why neither rule can live here.
     */
    reportError: deliver,

    retire() {
      progress = MINTED;
      spatialFrame.cancel();
      pendingSpatial = 0;
      activePlaceholder = null;
      lift = null;
      presentation = null;

      // **Stored in installation order, walked backwards**, like the undo
      // ledger above. Each is wrapped individually, so one throwing hook cannot
      // stop a later one from restoring its DOM.
      for (let i = slots.retireHooks.length - 1; i >= 0; i -= 1) {
        unwind(slots.retireHooks[i]!);
      }
    },
  };
}
