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
  FAILURE_ACTION_EFFECT,
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
import type { DOMRealm } from '../kernel/realm.ts';
import {
  type ActivationScope,
  type AdmissionSubject,
  type BehaviorContext,
  type BehaviorSpec,
  type LandingTail,
  type PreparedSettlement,
  type ResolutionCommand,
  type SettlementInput,
  SETTLED_CANCELED,
  SETTLED_FAILED,
  SETTLED_FULFILLED,
  SETTLED_REJECTED,
  SETTLED_SKIPPED,
} from '../kernel/spec.ts';
import {
  createWarnOnThrow,
  type WarnOnThrow,
} from '../kernel/warn-on-throw.ts';
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
} from './placement.ts';
import {
  SORTABLE_ACTION_TAGS,
  type SortableActivation,
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
const CREATED = 0;
const STARTED = 1;
const RESOLVING = 2;

/**
 * `source` is the consumer's own array and `items` is the validated copy of it.
 * **Both are supplied rather than derived here**: the validation belongs at the
 * construction boundary, ahead of the first installer, because this function
 * runs inside `install` — after `assemble` has returned — and a throw from here
 * would leave every recorded `retire` hook unrun.
 */
/**
 * **The sortable behavior entity**, and the state it owns for one controller.
 *
 * The `BehaviorSpec` this backs is a **protocol record with nested
 * namespaces**, so an instance cannot be one: what becomes the class is the
 * entity behind the spec, and {@link createSortableSpec} is the thin adapter
 * that presents it in the shape the kernel reads.
 *
 * **Three lifetimes, and only one of them is the class's own field list.** The
 * operation's state and the open transaction's state are named records; every
 * other field here lives exactly as long as the controller — which is how the
 * field list is arrived at, by subtraction rather than by transcription.
 *
 * Every field is private. Nothing outside reads or writes one.
 */
class SortableBehavior {
  readonly #kernel: BehaviorContext;

  readonly #slots: SortableSlots;

  readonly #realm: DOMRealm;

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
  #version = 0;

  /**
   * **The behavior's private state, and there are three lifetimes in it, not
   * one.** Each is named by the record it lives in, so a binding's lifetime is
   * something the type says rather than something a banner over a run of
   * locals asserts. The three below are the controller's own, and they survive
   * every operation this controller runs.
   */

  /** The published collection. Replaced wholesale, never mutated. */
  #snapshot: CollectionSnapshot;

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
  #sourceIdentity: readonly HTMLElement[];

  /**
   * Monotonic; the identity of the latest coalesced spatial attempt. **Minted
   * once per controller and never reset** — the same reason `#version` is not
   * reset, and the reason neither belongs in the operation record.
   */
  #spatialSeq = 0;

  /**
   * **The landing target's return buffer, one per controller.** Both
   * `anchorTarget` arms write these two fields and return this object; the
   * kernel reads them immediately and retains nothing, which is the borrow the
   * seam's own contract states. Never module-level: two controllers on one page
   * must not share one.
   *
   * **Nothing may read it between calls**: it holds the last landing target
   * only until the next `anchorTarget` writes it.
   */
  readonly #anchor: PointCache = { x: 0, y: 0 };

  /**
   * **One operation's state, named as one.** Every field here lives exactly as
   * long as the operation and is cleared together in `retire()`, and
   * membership is the claim the name makes: `snapshot`, `sourceIdentity` and
   * the frame task sit outside it because they outlive an operation by design.
   *
   * **Three fields, and only one of them is a record.** What activation
   * acquires is complete or absent; the two scalars beside it are markers this
   * behavior owns and writes per operation, which is why they are here and not
   * inside the record — a record admitting a mutable member cannot promise
   * completeness to the sites that read it.
   */
  readonly #operation: {
    /**
     * **What activation acquired, complete or absent.** Null when idle, and
     * every member present the moment it is not — so a site reading one member
     * is reading a record whose other members are there too.
     */
    activation: SortableActivation | null;
    /** The attempt the frame task actually dispatched. Zero when none is live. */
    pendingSpatial: number;
    /**
     * **How far the operation got, as one monotone marker.**
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
    progress: number;
  } = {
    activation: null,
    pendingSpatial: 0,
    progress: CREATED,
  };

  /**
   * **The third lifetime: one open transaction's state.** Neither field belongs
   * in the operation record, and naming that is what keeps `retire()` from
   * either clearing them redundantly or — worse — looking like the place they
   * are collected. Each is cleared by the phase that owns it.
   */
  readonly #transaction: {
    /**
     * The failure the open settlement seam is reporting, handed from `prepare`
     * to `effect` because `PreparedSettlement` carries nothing.
     *
     * **This is an accepted out-of-band channel, not an oversight** —
     * deliberate, rather than widening the frozen `PreparedSettlement`. What
     * makes it transaction-safe is not "seams do not currently re-enter" but a
     * stronger, enforced property:
     *
     * 1. `runTransition` is the only driver of this seam and always runs
     * `prepare` before `effect`, and `prepare` **clears the slot on entry**. So
     * a value can only ever be read by the effect of the very transaction whose
     * prepare wrote it — there is no window in which one settlement's effect could
     * observe another's failure.
     * 2. Every path that abandons a transaction between the two phases —
     * `prepare` throwing — skips the effect and therefore leaves the slot
     * set; the *next* prepare's clear is what collects it. Staleness is
     * impossible by construction, not by timing.
     * 3. The driver refuses a nested seam outright, so no third party can
     * interleave a write between the pair.
     *
     * The cost of the alternative is a change to a frozen SPI type with no
     * failing executable case behind it. Revisit only if a real case appears;
     * the invariant to preserve if this is ever touched is (1) — **prepare must
     * clear before it can write**.
     */
    failure: Readonly<{ stage: FailureStage; report: DraggableError }> | null;
  } = { failure: null };

  /**
   * **Where the spec invokes the consumer's error callback.** The behavior's
   * own channel and the spec's `reportError` both end here. The composition's
   * channel, minted in `behavior.ts` before any spec exists, calls
   * `merged.onError` itself.
   *
   * Unguarded and ungated on purpose: its callers apply those rules, and they
   * apply them differently.
   *
   * **A field rather than a method**, because it is handed on as a value: the
   * spec publishes it as `reportError` and the unwind runner takes it as an
   * argument, and an arrow has no receiver to lose on either path.
   */
  readonly #deliver: Notify = (error) => {
    this.#slots.onError?.(error);
  };

  /**
   * **The behavior's own channel**: what the *behavior* reports, which the
   * kernel cannot see. Minted by the kernel over
   * {@link #deliver}, so it applies the kernel's refusal after applied
   * destruction and stops a throw from the handler.
   */
  readonly #notify: Notify;

  readonly #warnOnThrow: WarnOnThrow;

  readonly #invalidate: ReturnType<typeof createInvalidator>;

  readonly #spatialFrame: ReturnType<typeof createFrameTask<number>>;

  constructor(
    kernel: BehaviorContext,
    initialSource: readonly HTMLElement[],
    items: readonly HTMLElement[],
    slots: SortableSlots,
  ) {
    this.#kernel = kernel;
    this.#slots = slots;
    this.#notify = kernel.channel(this.#deliver);
    this.#warnOnThrow = createWarnOnThrow(this.#notify);
    this.#realm = kernel.realm;
    this.#snapshot = { items, version: 0 };
    this.#sourceIdentity = initialSource;
    this.#invalidate = createInvalidator(kernel.realm);
    /**
     * Created once per **controller**, not per operation, and cancelled at
     * retirement and at destruction.
     *
     * Per-controller removes both the nullability and an allocation from the
     * activation path, and costs nothing in staleness handling: the task's
     * identity is never operation-scoped, because staleness is carried by the
     * monotonic attempt number it schedules.
     *
     * **Measured against both alternatives.** Eager costs more on a
     * controller that never drags, and wins everywhere else: an active
     * controller is *cheaper* than under lazy-retained or per-operation,
     * because their nullable slot and initialization branch cost more than the
     * task they defer, and `schedule` is cheaper with no null check.
     */
    this.#spatialFrame = createFrameTask<number>(kernel.realm, (attempt) => {
      // The producer-side half of the double validation: a frame that fires
      // after the operation lost its activation record has nothing to
      // resolve against. `action.prepare` validates the attempt again when it
      // applies.
      if (!this.#operation.activation) {
        return;
      }

      this.#operation.pendingSpatial = attempt;
      this.#kernel.dispatch(TAG_SPATIAL, attempt);
    });
  }

  /** The channel the spec publishes as `reportError`. */
  get reportError(): Notify {
    return this.#deliver;
  }

  get config(): BehaviorSpec<SortableFramePart, HTMLElement>['config'] {
    return {
      threshold: this.#slots.threshold,
      // **Faithful, not flat.** A sortable row must look the same the instant
      // it is lifted as it did the instant before: the top layer escapes an
      // ancestor `transform` but *not* an ancestor `zoom`, so a flat lift —
      // which drives net zoom to 1 and sizes the visual from its untransformed
      // border box — visibly shrinks the row inside any zoomed or scaled
      // container, while the placeholder it left behind keeps the on-screen
      // box. The faithful matrix reproduces the composed ancestor space
      // exactly, so lift and placeholder agree. `LIFT_FLAT` is for a free drag
      // that deliberately straightens out; it is wrong here.
      liftMode: LIFT_FAITHFUL,
      actionTags: SORTABLE_ACTION_TAGS,
    };
  }

  /**
   * The admitted item, from the event's **composed path** rather than
   * `event.target`: the press may land inside a shadow root, and the item is
   * whichever ancestor the snapshot knows.
   *
   * Shared by both ingresses so that "a handle gates the keyboard path too" is
   * one rule in one place rather than two implementations that agree.
   */
  #resolveItem(event: Event, snapshot: CollectionSnapshot): HTMLElement | null {
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

    if (this.#slots.handle) {
      const handle = this.#slots.handle(item);

      // A handle *narrows* admission; it never replaces the item.
      if (!handle) {
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
  }

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
  #seedDraft(
    item: HTMLElement,
    snapshot: CollectionSnapshot,
    draft: Draft<SortableFramePart>,
  ): AdmissionSubject {
    let visual = item;

    if (this.#slots.visual) {
      visual = this.#slots.visual(item);
    }

    draft.item = item;
    draft.visual = visual;
    draft.snapshot = snapshot;

    // **The box is resolved here and returned, never written to the draft.**
    // The kernel needs it before `acquireLift` to take window 1, and the only
    // two carriers are this return value and a behavior-authored draft field
    // the kernel reads back — and the kernel reads no behavior-authored field.
    // So it travels as a named member of the admission subject.
    //
    // Two ways the box is already known, and neither may call anything. `null`
    // means the config named neither slot, so the item is its own box.
    // **Reference equality means the assembler defaulted `box` to `visual`** —
    // and calling it again here would invoke one consumer resolver twice for a
    // single admission, which a stateful resolver can observe.
    if (!this.#slots.box || this.#slots.box === this.#slots.visual) {
      return visual === item ? item : { visual, box: visual, item };
    }

    const box = this.#slots.box(item);

    // Returned as a bare element when all three coincide, so the kernel's
    // `box` and `visual` are the *same reference* and `activation.prepare`'s
    // identity branch can recognise the default case. There is exactly one
    // encoding of "the box is the visual is the item", and this is it.
    return box === visual && visual === item ? item : { visual, box, item };
  }

  /**
   * The half of admission both ingresses share: resolve the item, the visual
   * and the box, and seed the draft. Returns the admission subject — a bare
   * element when all three coincide, or the triple when they do not — or
   * `null` to decline.
   *
   * No `preventDefault()` — the kernel owns that call in both modes. It makes
   * it at the **threshold crossing** on the pointer path and inside the
   * listener on the command path, but never here and never by the behavior.
   */
  #admitFrom(
    event: PointerEvent,
    draft: Draft<SortableFramePart>,
  ): AdmissionSubject | null {
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

    const item = this.#resolveItem(event, this.#snapshot);

    return item ? this.#seedDraft(item, this.#snapshot, draft) : null;
  }

  /**
   * `invalidateInsertion()` narrowed to its own stage.
   *
   * Every call site below is inside a kernel-driven seam, so the surrounding
   * phase would otherwise classify a throw as *its* stage — an activation
   * failure, a placeholder-move failure — and `SortableErrorContext.stage`
   * would name the wrong thing. `kernel.fail` narrows from the inside, which is
   * the mechanism for exactly this.
   *
   * Returns whether it succeeded, because the latched failure already decides
   * the seam's outcome: a caller that would go on to publish or to notify must
   * stop instead.
   */
  #invalidateInsertion(): boolean {
    try {
      this.#slots.invalidateInsertion();
      return true;
    } catch (error) {
      this.#kernel.fail(FAILURE_INVALIDATION, error);
      return false;
    }
  }

  /** The gap the item came from, recomputed rather than stored. */
  #homeGap(frame: Readonly<Frame<SortableFramePart>>): void {
    const home = homeInsertion(frame.snapshot!, frame.item!);

    if (home) {
      movePlaceholder(this.#operation.activation!.placeholder, home);
    }
  }

  // -----------------------------------------------------------------------
  // Admission — inside the native `pointerdown` dispatch
  // -----------------------------------------------------------------------

  admit(
    event: PointerEvent,
    draft: Draft<SortableFramePart>,
  ): AdmissionSubject | null {
    return this.#admitFrom(event, draft);
  }

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

  admitCommand(
    event: Event,
    draft: Draft<SortableFramePart>,
  ): AdmissionSubject | null {
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
    // per-key owner table to consult. The order above
    // still holds and still matters — the item is what feasibility is asked
    // about — but that asymmetry returns for an *unmarked* field, and
    // `data-drag-ignore` is what answers it.
    const item = this.#resolveItem(event, this.#snapshot);

    if (!item) {
      return null;
    }

    const insertion = keyboardInsertion(this.#snapshot, item, direction);

    // The edge case, and the whole reason the decision is synchronous.
    // Checked before the draft is seeded, so an infeasible command resolves
    // no visual either — the press path resolves one only for an admission
    // it is going to make, and the command path matches it.
    if (!insertion) {
      return null;
    }

    const subject = this.#seedDraft(item, this.#snapshot, draft);

    // The destination travels in the draft, exactly as `item` does for a
    // press. No staged value crosses the ingress boundary, which is what
    // keeps the second ingress to one SPI member.
    draft.insertion = insertion;
    return subject;
  }

  // -----------------------------------------------------------------------
  // Activation
  // -----------------------------------------------------------------------
  /**
   * Creates the placeholder **detached** and seeds the home insertion. No
   * DOM insertion, no acquisition, nothing externally visible.
   *
   * A successful preparation always commits, so the element it returns is
   * always adopted by `effect`. Nothing between the two can discard it.
   */
  prepareActivation(
    draft: Draft<SortableFramePart>,
    scope: ActivationScope,
  ): HTMLElement | null {
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

    return createPlaceholder(
      this.#realm,
      { item, visual, box, rect: scope.originRect },
      footprint,
      this.#slots.placeholder,
    );
  }

  /** Strict order: register, make visible, publish, then notify. */
  effectActivation(
    current: Readonly<Frame<SortableFramePart>>,
    placeholder: HTMLElement,
    scope: ActivationScope,
  ): void {
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
    // reentrancy guard above sees it. A destruction it requests is applied
    // after this unit, so the activation completes as a live controller's.
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
    //
    // That is the single-fault outcome. If consumer code in this activation
    // also registered a cancellation, the two-fault class stated where
    // `#invalidateInsertion` fails below applies instead: the cancel supersedes
    // this failure, the drag settles as *canceled* without a start
    // notification, and the landing looks for an activation record this
    // throw left unpublished.
    const item = current.item!;

    if (!placeholder.isConnected || item.nextElementSibling !== placeholder) {
      throw new Error('drag: sortable/insertion-placeholder-lost');
    }

    // Listeners bound to the signal are self-releasing, so the signal *is*
    // the registration; the explicit disposer cancels a scheduled frame.
    scope.motion.use(this.#spatialFrame.cancel);
    this.#invalidate(scope.motion.signal, () => {
      try {
        this.#slots.invalidateInsertion();
      } catch (error) {
        // A native scroll/resize listener is **not** a seam, so `kernel.fail`
        // here would be downgraded to a platform report and the stage would
        // never reach `onError` — one input path silently bypassing the
        // classified-failure mechanism entirely. Queuing it as a behavior
        // action gives it a seam: the action's own `prepare` runs against
        // the live operation, which is where `FAILURE_INVALIDATION` can be
        // classified with the recovery the contract gives it. A destruction
        // requested in the same unit discards the action with its fault, and
        // only an event dispatched synchronously inside a library callback can
        // reach that: the platform delivers scroll and resize outside any unit.
        this.#kernel.dispatch(TAG_INVALIDATION, error);
      }
    });

    // 3 — every resource above is now owned.
    this.#operation.activation = {
      placeholder,
      lift: scope.lift,
      box: this.#slots.box,
      settle: this.#slots.settle,
      // **Handed down, not measured, and the item's rather than the
      // visual's.** A displacement writes its `translate` on an item, so
      // the space it is spent in is the one above an item. The kernel read
      // it before `acquireLift` mutated anything, so it describes the
      // ancestry the drag began in; a read taken here would describe a tree
      // activation has already changed.
      space: scope.itemSpace,
    };

    if (!this.#invalidateInsertion()) {
      // Classified; the operation is failing, so do not start it.
      //
      // This is one instance of a class of two-fault paths that reach a
      // terminal callback without a start notification; the adjacency throw
      // above is another. The class needs both faults: consumer code reached
      // during this activation before `onStart` registers a cancellation —
      // the placeholder factory in `prepare` and the placeholder's
      // `connectedCallback` above are examples, not a complete list — and
      // the effect then fails before `onStart`. The registered cancel
      // outranks the classified failure, so the operation settles as
      // *canceled* for a drag `onStart` never announced, and the failure
      // reaches `onError` as superseded by the cancel. Either fault alone is
      // fine: without the cancel the failure reports through `onError`, and
      // without the failure `onStart` still runs. The gap is admitted and
      // open.
      return;
    }

    // **The marker advances before the call, not after.** A throw from
    // `onStart` itself is classified, and the consumer has by then been
    // told the drag began — so it is owed an end. Advancing after the call
    // would publish nothing for exactly the operation the consumer most
    // recently heard about.
    this.#operation.progress = STARTED;

    // 4 — consumer code last. Everything the activation owns is registered
    // and published above, so a throw from `onStart`, classified as this
    // seam's failure, leaves no step of the effect undone, and the consumer
    // hears of the drag only once it exists. A cancellation or destruction
    // it requests is applied after this unit, so it does not bear on the
    // order.
    this.#slots.onStart(item);
  }

  // -----------------------------------------------------------------------
  // The hot path
  // -----------------------------------------------------------------------

  moved(
    current: Readonly<Frame<SortableFramePart>>,
    lift: BehaviorLiftSession,
  ): void {
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
    this.#spatialSeq += 1;

    try {
      this.#spatialFrame.schedule(this.#spatialSeq);
    } catch (error) {
      this.#kernel.fail(FAILURE_SCHEDULED_FRAME, error);
    }
  }

  // -----------------------------------------------------------------------
  // Behavior actions
  // -----------------------------------------------------------------------
  prepareAction(
    tag: number,
    argument: unknown,
    draft: Draft<SortableFramePart>,
  ): {} | null {
    if (tag === TAG_INVALIDATION) {
      // Re-raised where it can be classified; see the listener in
      // `activation.effect`. `kernel.fail` latches, so the seam ends as a
      // failure and the `null` below is never the deciding value.
      this.#kernel.fail(FAILURE_INVALIDATION, argument);
      return null;
    }

    if (tag === TAG_SPATIAL) {
      // The applied half of the double validation. The activation test is
      // the producer's own — the frame task tests the record before it
      // dispatches — and here it cannot fail once the phase test passes,
      // because the record is published before `ACTIVE` is committed and
      // cleared only at retirement. The attempt comparison cannot fail
      // either, because the frame task coalesces and dispatches the latest
      // sequence synchronously, so a queued attempt is always current when
      // it applies. It is kept because the contract states the check, and
      // because anything that queues a spatial action from outside the
      // frame task reopens the window it closes. The spatial action is
      // inert outside `ACTIVE`, and the activation record cannot stand in
      // for that: it is cleared only at retirement, so it stays non-null
      // through `RELEASING`, `SETTLING` and `FINALIZING`. No producer
      // reaches those phases — the frame task is cancelled when motion
      // closes at release, and no other call site dispatches this tag — so
      // the phase test is unreachable by construction. It keeps any new
      // producer (a replayed action, a flush from a hook) from committing a
      // placeholder move into a decided transaction.
      if (
        draft.phase !== ACTIVE ||
        argument !== this.#operation.pendingSpatial ||
        !this.#operation.activation
      ) {
        return null;
      }

      const resolved = this.#slots.resolveInsertion(
        draft,
        this.#operation.activation,
      );

      // `resolved === null`: the incumbent slot still wins — commit
      // nothing.
      if (resolved === null) {
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
    const source = this.#slots.items();

    // **Array identity is the whole structural test.** An unchanged
    // identity is a resize, a zoom or a scroll — the warm, common case —
    // and it stages no snapshot, so it never reaches the phase branch below
    // and never pays the copy.
    if (source === this.#sourceIdentity) {
      return {
        snapshot: null,
        source,
        cancelReason: null,
      } satisfies PreparedCollection;
    }

    // Copied on the structural branch **only**, which is the point of the
    // split: the copy is what keeps a queued snapshot safe from a later
    // caller mutation, and it is paid when membership changes rather than
    // on every invalidation.
    //
    // **Copied first, numbered second.** The copy refuses nothing, so
    // nothing here throws — but the order still matters, because it is what
    // keeps the version a dense identity for the collections that actually
    // exist: a pull that produces no collection must not consume a number,
    // or a consumer sees the next successful update numbered as though an
    // invisible one had happened in between.
    const pulled = [...source];

    this.#version += 1;

    const next: CollectionSnapshot = {
      items: pulled,
      version: this.#version,
    };
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
  }

  effectAction(
    tag: number,
    _argument: unknown,
    current: Readonly<Frame<SortableFramePart>>,
    prepared: {},
  ): void {
    if (tag === TAG_SPATIAL) {
      const view = this.#operation.activation!;
      const insertion = current.insertion!;

      // Decided **before** anything else in the bracket, and by asking the
      // DOM rather than by acting and reporting back. An already-correct
      // gap is the common case, not the rare one, and everything below this
      // line — the write, the axis advance, the sink's contributions and
      // the invalidation the `finally` owes — exists only for a frame that
      // actually moves the hole.
      if (placeholderAt(view.placeholder, insertion)) {
        return;
      }

      /**
       * **The cache does not describe the DOM.** Raised before anything can
       * touch the rule's arrays and lowered only once the cache and the
       * tree agree again, so every exit in between leaves it set and
       * invalidates in the `finally`. The exits are `movePlaceholder`'s throw
       * (`drag: sortable/anchor-outside-container`, or a DOM exception) and
       * the `return` after a caught `movedInsertion` throw. A custom
       * element's reaction to the move that throws is reported to the global
       * object and does not leave this bracket.
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
        movePlaceholder(view.placeholder, insertion);

        // 2 — tell the axis, and hand it the sink. One call: the cache
        // advance does not depend on the DOM, so there is no reason for it
        // to precede the write it describes, and the sink's visitor
        // arrives as an argument rather than a plan coming back — which is
        // what leaves a composition with no displacement feature allocating
        // nothing at all here.
        //
        // **A stage says where the library was standing**, and that is
        // the action seam's effect — the stage this bracket's own write
        // reports, and the one a throw escaping here would be classified
        // as anyway. The invalidation stage is raised only on the
        // invalidation path, so reporting it here would send a consumer to
        // their `invalidate()` calls and their scroll handling for a fault
        // that was in a `box` resolver, an overridden
        // `getBoundingClientRect` or an overridden `animate` reached from a
        // committed move.
        //
        // **What the `catch` still decides is which error is latched.**
        // The `finally` below invalidates whether or not this threw, and an
        // invalidation that throws in turn would otherwise be the failure
        // the consumer sees; reporting here means the hook's own error is
        // already the one recorded.
        try {
          this.#slots.movedInsertion(current, view, this.#slots.report);
        } catch (error) {
          this.#kernel.fail(FAILURE_ACTION_EFFECT, error);
          return;
        }

        stale = false;
      } finally {
        if (stale) {
          this.#invalidateInsertion();
        }
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
      this.#invalidateInsertion();
      return;
    }

    // Publication is an effect, not a preparation: a preparation that is
    // discarded must not publish.
    this.#snapshot = next;
    // The identity the structural test compares against, advanced with the
    // snapshot it produced and never before it — a preparation that was
    // discarded must not move the baseline, or the next invalidation would
    // read the change as already applied.
    this.#sourceIdentity = staged.source;

    if (phase === ACTIVATING || phase === ACTIVE) {
      // Not gated on success: publication already happened above, and the
      // consumer's update must never be thrown away by a failing
      // invalidation. The latched failure still decides the seam.
      this.#invalidateInsertion();
    }

    // Last, and only after publication: an invalid collection ends the
    // current drag, but it must never throw away the consumer's update.
    if (staged.cancelReason !== null) {
      this.#kernel.requestCancel(staged.cancelReason);
    }
  }

  // -----------------------------------------------------------------------
  // Release
  // -----------------------------------------------------------------------
  prepareRelease(draft: Draft<SortableFramePart>): ResolutionCommand {
    const view = this.#operation.activation;
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
      if (!this.#invalidateInsertion()) {
        return { invoke: null };
      }

      // **No lifecycle guard here, deliberately.** This resolve reaches
      // the candidate loop too, and on an aborted traversal it falls back
      // to `draft.insertion`, builds a proposal and stages an `invoke`
      // closure — which is never executed: the kernel opens the round-trip
      // in a unit of its own, and a destruction requested in this one is
      // applied at its boundary and discards it, so `onReorder` cannot fire
      // for an operation whose destruction was requested. A guard here would
      // be a second copy of a decision the kernel already owns, and two
      // copies can disagree.
      const resolved =
        this.#slots.resolveInsertion(draft, view) ?? draft.insertion;

      if (!resolved) {
        throw new Error('drag: sortable/release-no-insertion');
      }

      draft.insertion = resolved;
      insertion = resolved;
    }

    // The frame's own committed snapshot, not `#snapshot`: the insertion
    // carries the version it was resolved against, and the pointer branch's
    // `resolveInsertion` read this same value. `buildReorderProposal` answers
    // `null` on a version mismatch, so a behavior-private snapshot republished
    // since the resolve is the one input that turns a coherent release into a
    // throw.
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
        this.#operation.progress = RESOLVING;
        return this.#slots.onReorder(request, { signal });
      },
    };
  }

  effectRelease(current: Readonly<Frame<SortableFramePart>>): void {
    const activation = this.#operation.activation!;

    // **Unconditional**: a command reorders too, and its placeholder
    // reaches the same final gap by the same single writer.
    movePlaceholder(activation.placeholder, current.insertion!);

    if (current.pointerId !== -1) {
      // Normative, not decoration: `pointerup` need not carry the last
      // processed `pointermove`'s coordinates, and the proposal was
      // computed from the committed release point. Rendering the
      // placeholder alone would leave the visual — and the whole landing
      // trajectory — starting from a stale point.
      activation.lift.write(
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

    // **Nothing is published here**, and the effect ends at the write. The
    // ordering that binds is the kernel's: the staged command runs in a later
    // unit of its own, so a throw from the write above classifies
    // `FAILURE_RELEASE` and the round-trip never opens.
    //
    // **The render is a consumer-reachable call**, which is what makes that
    // ordering matter here rather than only in the kernel: this is the seam
    // the `AT_PROPOSAL`/`AT_CONSUMER` split turns on, and a throw from this
    // effect is `AT_PROPOSAL` because the marker only reaches `RESOLVING`
    // inside the `invoke` closure.
  }

  // -----------------------------------------------------------------------
  // Settlement
  // -----------------------------------------------------------------------
  /** One arm per `SettlementInput` type, covered exhaustively. */
  // eslint-disable-next-line @typescript-eslint/consistent-return
  prepareSettlement(
    draft: Draft<SortableFramePart>,
    input: SettlementInput,
  ): PreparedSettlement {
    this.#transaction.failure = null;

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
        this.#transaction.failure = {
          stage: input.stage,
          report: input.report,
        };

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
          // **An unconditional `draft.domain = …` here is wrong, and the
          // reason is the mapping rather than any one producer.** *Existing
          // result wins, otherwise `canceled`* is what makes the terminal
          // total: it collapses a failure arriving before any result and
          // one arriving after the authored commit into a single lookup, so
          // no stage carries a terminal policy of its own. An assignment
          // reinstates exactly that per-stage policy — a total mapping
          // stops being total when the lookup becomes a branch, never when
          // one of its inputs grows rare.
          //
          // **And the input is not rare on the path where the value
          // decides.** The settlement seam commits between `prepare` and
          // `effect`, so an `effect` that throws is classified *from the
          // committed state*: it arrives here with a result present and
          // before any terminal has been published, and what this lookup
          // keeps is the operation's only terminal. An assignment would
          // overwrite it every time that path fires and tell a consumer
          // whose list really was reordered that the drop was `canceled`. A
          // `kernel.fail` raised from inside the terminal callback reaches
          // this line too, though by then the terminal is published and the
          // value is no longer observed.
          //
          // The stage exclusion above stands on its own reason — recovery,
          // not the result — and carries no weight in this tie-break.
          //
          // **The marker decides the stage, and it also decides whether to
          // publish at all.** At `CREATED` the consumer never heard this
          // drag start, and an end for a beginning it has no record of is
          // worse than publishing nothing.
          draft.domain ??=
            this.#operation.progress === CREATED
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
                  stage:
                    this.#operation.progress === RESOLVING
                      ? AT_CONSUMER
                      : AT_PROPOSAL,
                  proposal: draft.proposal,
                };
        }

        return true;
      }
    }
  }

  effectSettlement(
    _current: Readonly<Frame<SortableFramePart>>,
    _prepared: PreparedSettlement,
  ): void {
    const { failure } = this.#transaction;

    this.#transaction.failure = null;

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
      this.#notify(failure.report);
    }
  }

  // -----------------------------------------------------------------------
  // Landing target and the terminal callback
  // -----------------------------------------------------------------------

  anchorTarget(current: Readonly<Frame<SortableFramePart>>): PointCache {
    const { placeholder } = this.#operation.activation!;
    const item = current.item!;
    const { recovery } = current;

    if (recovery === RECOVERY_DESTINATION) {
      // Re-anchoring follows the **recovery**, which is committed behavior
      // state. Under the serial commit the authored DOM is already final
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
        placeholder.nextElementSibling !== item
      ) {
        item.before(placeholder);
      }
    } else if (recovery === RECOVERY_HOME) {
      // Rejected, cancelled and most failures return the placeholder to the
      // grab slot before measuring. The home gap is recomputed from the
      // committed snapshot, so it needs no per-operation slot.
      this.#homeGap(current);
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

    this.#anchor.x = rect.left;
    this.#anchor.y = rect.top;

    return this.#anchor;
  }

  /**
   * **The tail travels only where the drop was a journey.** An immediate
   * recovery is a failure repair: the visual belongs at its home now, not
   * two hundred milliseconds from now, and interpolating one would animate
   * the consequences of a fault the consumer has already been told about.
   *
   * Without a `landing()` feature there is no timing and no tail at all, so
   * the collection pays nothing for the capability it did not install.
   */
  landingTail(
    current: Readonly<Frame<SortableFramePart>>,
    fromX: number,
    fromY: number,
    targetX: number,
    targetY: number,
  ): LandingTail | null {
    const { landingTiming } = this.#slots;

    return landingTiming && current.recovery !== RECOVERY_IMMEDIATE
      ? landingTiming(fromX, fromY, targetX, targetY)
      : null;
  }

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
  finalized(current: Readonly<Frame<SortableFramePart>>): void {
    const { domain } = current;

    if (domain) {
      this.#slots.onEnd?.(domain);
    }
  }

  retire(): void {
    this.#operation.progress = CREATED;
    this.#spatialFrame.cancel();
    this.#operation.pendingSpatial = 0;
    this.#operation.activation = null;

    // **Stored in installation order, walked backwards.** Each is wrapped
    // individually, so one throwing hook cannot
    // stop a later one from restoring its DOM.
    for (let i = this.#slots.retireHooks.length - 1; i >= 0; i -= 1) {
      this.#warnOnThrow(this.#slots.retireHooks[i]!);
    }
  }
}

/**
 * **The thin protocol adapter.** `BehaviorSpec` is a record with nested
 * namespaces, so an instance cannot be one; every member here forwards to the
 * entity and adds nothing.
 */
export function createSortableSpec(
  kernel: BehaviorContext,
  initialSource: readonly HTMLElement[],
  items: readonly HTMLElement[],
  slots: SortableSlots,
): BehaviorSpec<SortableFramePart, HTMLElement> {
  const behavior = new SortableBehavior(kernel, initialSource, items, slots);

  return {
    createFramePart: sortableFramePart,
    // **One function fills both slots**: called with no argument it allocates a
    // part at its defaults, called with one it returns that part to them. The
    // reset's return is the part it was handed, which the kernel has and
    // ignores.
    // eslint-disable-next-line @typescript-eslint/strict-void-return
    resetFramePart: sortableFramePart,
    config: behavior.config,

    admit(event, draft) {
      return behavior.admit(event, draft);
    },

    command: {
      types: [KEY_DOWN],
      admit(event, draft) {
        return behavior.admitCommand(event, draft);
      },
    },

    activation: {
      prepare(draft, scope) {
        return behavior.prepareActivation(draft, scope);
      },
      effect(current, placeholder, scope) {
        behavior.effectActivation(current, placeholder, scope);
      },
    },

    moved(current, lift) {
      behavior.moved(current, lift);
    },

    action: {
      prepare(tag, argument, draft) {
        return behavior.prepareAction(tag, argument, draft);
      },
      effect(tag, argument, current, prepared) {
        behavior.effectAction(tag, argument, current, prepared);
      },
    },

    release: {
      prepare(draft) {
        return behavior.prepareRelease(draft);
      },
      effect(current) {
        behavior.effectRelease(current);
      },
    },

    settlement: {
      prepare(draft, input) {
        return behavior.prepareSettlement(draft, input);
      },
      effect(current, prepared) {
        behavior.effectSettlement(current, prepared);
      },
    },

    anchorTarget(current) {
      return behavior.anchorTarget(current);
    },

    landingTail(current, fromX, fromY, targetX, targetY) {
      return behavior.landingTail(current, fromX, fromY, targetX, targetY);
    },

    finalized(current) {
      behavior.finalized(current);
    },

    /**
     * **Forward, and nothing else.** The kernel builds the public error, picks
     * its class and owns the refusal; this member is the last hop, the sink
     * every channel delivers to.
     *
     * **Neither a classification nor a `domain: null` context belongs here**,
     * so it neither derives anything from the stage nor attaches a context:
     * construction is kernel-owned so a classification cannot mean two things
     * in two behaviors, and the context is strictly redundant with the
     * terminal.
     *
     * Its callers are the kernel's own route, which refuses after applied
     * destruction and discards a throwing handler, and `panic`'s one delivery
     * after closure, which is exactly why neither rule can live here.
     */
    reportError: behavior.reportError,

    retire() {
      behavior.retire();
    },
  };
}
