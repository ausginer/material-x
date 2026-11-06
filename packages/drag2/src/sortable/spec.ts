/**
 * Every sortable transition and behavior callback, as closures over one private
 * runtime.
 *
 * The kernel runs all three phases of every transaction. This module supplies
 * the `prepare` and `effect` functions. Nothing here calls `begin()` or
 * `commit()`, reads `current` from a `prepare`, or can close a lifetime the
 * kernel owns. The arguments these functions receive enforce those rules, so
 * the rules do not depend on discipline.
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
   * `null` on the geometry-only branch: `items()` returned the same array
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
 * The sortable behavior entity and the state it owns for one controller.
 *
 * `BehaviorSpec` is a protocol record with nested namespaces, so an instance of
 * this class cannot be a spec. This class is the entity behind the spec, and
 * {@link createSortableSpec} is the thin adapter that presents it in the shape
 * the kernel reads.
 *
 * The state has three lifetimes: the controller, the operation and the open
 * transaction. The records `#operation` and `#transaction` hold the state of
 * the operation and of the transaction, so the name of a record states the
 * lifetime of its fields. Every other field lives as long as the controller and
 * survives every operation the controller runs.
 *
 * Every field is private. Nothing outside reads or writes one.
 */
class SortableBehavior {
  readonly #kernel: BehaviorContext;

  readonly #slots: SortableSlots;

  readonly #realm: DOMRealm;

  /**
   * Created here, monotonic per controller, and not derived from the published
   * `version`. Two structural invalidations applied inside one drain would both
   * read the same published version and stamp two distinct collections
   * identically. That destroys the only job of `version`: being the identity of
   * a snapshot. The initial snapshot has version zero and this counter starts
   * there, so the sequence stays continuous with it.
   *
   * It advances on the structural branch only. A geometry-only invalidation
   * produces no collection, so it must not consume an identity.
   */
  #version = 0;

  /** The published collection. Replaced wholesale, never mutated. */
  #snapshot: CollectionSnapshot;

  /**
   * The last array identity `items()` returned. This identity is the complete
   * structural-change test.
   *
   * This is the consumer's own array, held by reference and only compared,
   * never read from. `snapshot.items` cannot replace it: `snapshot.items` is
   * the library's shallow copy, so its identity changes on every structural
   * update and never matches what the consumer returns. The constructor stores
   * the array the caller pulled, so the precondition holds from construction
   * and not only from the first `invalidate()`.
   */
  #sourceIdentity: readonly HTMLElement[];

  /**
   * Monotonic; the identity of the latest coalesced spatial attempt. Created
   * once per controller and never reset, for the same reason `#version` is not
   * reset. That is also why neither belongs in the operation record.
   */
  #spatialSeq = 0;

  /**
   * The landing target's return buffer, one per controller. Both `anchorTarget`
   * branches write these two fields and return this object. The kernel reads
   * them immediately and retains nothing, as the `anchorTarget` contract
   * states. This object must not be module-level, because two controllers on
   * one page must not share one.
   *
   * Nothing may read this object between calls: it holds the last landing
   * target only until the next `anchorTarget` writes it.
   */
  readonly #anchor: PointCache = { x: 0, y: 0 };

  /**
   * The state of one operation. Every field here lives exactly as long as the
   * operation and is cleared together in `retire()`. `snapshot`,
   * `sourceIdentity` and the frame task are outside this record because they
   * outlive an operation by design.
   *
   * Only `activation` is a record. What activation acquires is complete or
   * absent. The two numbers beside it are markers this behavior owns and writes
   * per operation. They are not inside the activation record because a record
   * with a mutable member cannot promise completeness to the sites that read
   * it.
   */
  readonly #operation: {
    /**
     * What activation acquired, complete or absent. Null when idle. When it is
     * not null every member is present, so a site reading one member is reading
     * a record whose other members are there too.
     */
    activation: SortableActivation | null;
    /** The attempt the frame task dispatched. Zero when none is live. */
    pendingSpatial: number;
    /**
     * How far the operation got, as one monotonic marker.
     *
     * The failure path must produce a terminal, and the kernel cannot supply
     * the two facts that decide which one: did the consumer hear this drag
     * start, and was the consumer's resolver actually invoked. Both facts are
     * behavior knowledge, and sites the behavior owns already write them. So
     * this is a marker and not an SPI member.
     *
     * `RESOLVING` is accurate by construction: the kernel runs the `invoke`
     * closure only after `release.effect` returns normally, and `invoke: null`
     * means there was no round-trip at all. Deriving it from
     * `proposal !== null` would be false, because the proposal commits one
     * transition earlier, in `release.prepare`.
     */
    progress: number;
  } = {
    activation: null,
    pendingSpatial: 0,
    progress: CREATED,
  };

  /**
   * The third lifetime: the state of one open transaction. It is not in the
   * operation record, so `retire()` neither clears it redundantly nor looks
   * like the place where it is collected. The phase that owns a field clears
   * that field.
   */
  readonly #transaction: {
    /**
     * The failure the open settlement transition is reporting. `prepare` passes
     * it to `effect` here because `PreparedSettlement` carries nothing.
     *
     * This is an accepted out-of-band channel, used instead of widening the
     * frozen `PreparedSettlement`. Its transaction safety does not rest on
     * transitions not re-entering at present. It rests on these stronger,
     * enforced properties:
     *
     * 1. `runTransition` is the only runner of this transition. It always runs
     *    `prepare` before `effect`, and `prepare` clears the slot on entry. So
     *    only the effect of the transaction whose `prepare` wrote a value can
     *    read that value. No window exists in which the effect of one
     *    settlement could observe the failure of another.
     * 2. Every path that abandons a transaction between the two phases
     *    (`prepare` throwing) skips the effect and leaves the slot set. The
     *    clear in the next `prepare` collects the value. Staleness is
     *    impossible by construction, not by timing.
     * 3. `BehaviorRunner` refuses a nested transition outright, so no third
     *    party can interleave a write between the pair.
     *
     * The alternative costs a change to a frozen SPI type with no failing
     * executable case behind it. Revisit only if a real case appears. If this
     * code ever changes, preserve property 1: `prepare` must clear the slot
     * before it can write.
     */
    failure: Readonly<{ stage: FailureStage; report: DraggableError }> | null;
  } = { failure: null };

  /**
   * Where the spec invokes the consumer's error callback. The behavior's own
   * channel and the spec's `reportError` both end here. The composition's
   * channel, created in `behavior.ts` before any spec exists, calls
   * `merged.onError` itself.
   *
   * This callback has no guard and no gate: its callers apply those rules, and
   * they apply them differently.
   *
   * It is a field and not a method because it is passed on as a value: the spec
   * publishes it as `reportError` and the `warnOnThrow` runner takes it as an
   * argument. An arrow has no `this` to lose on either path.
   */
  readonly #deliver: Notify = (error) => {
    this.#slots.onError?.(error);
  };

  /**
   * The behavior's own channel: what the behavior reports, which the kernel
   * cannot see. The kernel creates it over {@link #deliver}, so it applies the
   * kernel's refusal after applied destruction and stops a throw from the
   * handler.
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
     * Created once per controller, not per operation, and cancelled at
     * retirement and at destruction.
     *
     * Per-controller creation removes both the nullability and an allocation
     * from the activation path. It costs nothing in staleness handling: the
     * task's identity is never operation-scoped, because the monotonic attempt
     * number it schedules carries staleness.
     *
     * Measured against both alternatives, eager creation costs more on a
     * controller that never drags and wins everywhere else. An active
     * controller is cheaper than under lazy-retained or per-operation creation,
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
      // Use the faithful lift, not the flat one. A sortable row must look the
      // same the instant it is lifted as it did the instant before. The top
      // layer escapes an ancestor `transform` but not an ancestor `zoom`. A
      // flat lift drives net zoom to 1 and sizes the visual from its
      // untransformed border box, so it visibly shrinks the row inside any
      // zoomed or scaled container, while the placeholder keeps the on-screen
      // box. The faithful matrix reproduces the composed ancestor space
      // exactly, so lift and placeholder agree. `LIFT_FLAT` is for a free drag
      // that intends to straighten out; it is wrong here.
      liftMode: LIFT_FAITHFUL,
      actionTags: SORTABLE_ACTION_TAGS,
    };
  }

  /**
   * Finds the admitted item from the event's composed path and not from
   * `event.target`. The press may land inside a shadow root, and the item is
   * whichever ancestor the snapshot knows.
   *
   * The press and command paths share this method, so "a handle gates the
   * keyboard path too" is one rule in one place and not two implementations
   * that agree.
   */
  #resolveItem(event: Event, snapshot: CollectionSnapshot): HTMLElement | null {
    const path = event.composedPath();
    let item: HTMLElement | null = null;
    // Keep the index as well as the element. The opt-out scan runs over the
    // hops between the event target and the resolved subject, so the walk that
    // finds the item has to report where it stopped.
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

      // A handle narrows admission. It never replaces the item.
      if (!handle) {
        return null;
      }

      // `indexOf` rather than `includes`: the same containment test, and the
      // opt-out scan needs the position. The resolved subject governs. A handle
      // inside the item sits earlier in the composed path, so scoping to it
      // shortens the segment the opt-out scan walks. A handle inside a marked
      // region admits, because the consumer scoped dragging there on purpose.
      subject = path.indexOf(handle);

      if (subject === -1) {
        return null;
      }
    }

    // Ask what the event landed on after the subject is known and before
    // anything is seeded. A press or a key that reaches a `[data-drag-ignore]`
    // region declines by the ordinary total-decline path: no operation and no
    // phase change. The kernel prevents nothing for a `null`, so focus lands,
    // the caret places, the slider tracks and the arrow key keeps its native
    // meaning.
    return pathOwnsInteraction(path, subject) ? null : item;
  }

  /**
   * The second half of admission: resolves the visual and the box, and seeds
   * the draft with an item that is already resolved. Returns the admission
   * subject.
   *
   * This is split from {@link #admitFrom} for the command path, which needs the
   * item before it can decide feasibility. Resolving twice would call the
   * consumer's `handle()` resolver twice for one keydown. That is observable,
   * because a resolver is stateful in general and is explicitly allowed to
   * queue `invalidate()`. The side effect would be queued twice, and the
   * operation could reconcile through two snapshots for one native command.
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

    // Resolve the box here and return it; never write it to the draft. The
    // kernel needs the box before `acquireLift` to take window 1. The only two
    // carriers are this return value and a behavior-authored draft field the
    // kernel reads back, and the kernel reads no behavior-authored field. So
    // the box travels as a named member of the admission subject.
    //
    // In two cases the box is already known, and neither may call anything.
    // `null` means the config named neither slot, so the item is its own box.
    // Reference equality means the assembler defaulted `box` to `visual`.
    // Calling it again here would invoke one consumer resolver twice for a
    // single admission, which a stateful resolver can observe.
    if (!this.#slots.box || this.#slots.box === this.#slots.visual) {
      return visual === item ? item : { visual, box: visual, item };
    }

    const box = this.#slots.box(item);

    // Return a bare element when all three coincide, so the kernel's `box` and
    // `visual` are the same reference and the identity branch of
    // `activation.prepare` can recognize the default case. "The box is the
    // visual is the item" has exactly one encoding, and this is it.
    return box === visual && visual === item ? item : { visual, box, item };
  }

  /**
   * The half of admission the press and command paths share: resolves the item,
   * the visual and the box, and seeds the draft. Returns the admission subject
   * (a bare element when all three coincide, or the triple when they do not) or
   * `null` to decline.
   *
   * This method does not call `preventDefault()`. The kernel owns that call in
   * both modes. The kernel makes it at the threshold crossing on the pointer
   * path and inside the listener on the command path, never here and never
   * through the behavior.
   */
  #admitFrom(
    event: PointerEvent,
    draft: Draft<SortableFramePart>,
  ): AdmissionSubject | null {
    // A modifier requests native text selection; no modifier means drag. A
    // gesture across prose inside a draggable region is necessarily longer than
    // the threshold, so both readings, "select this text" and "drag this row",
    // fit the same input and no evidence distinguishes them. The contract does
    // not try: `Alt` held at `pointerdown` declines, and the press keeps its
    // full native meaning by the ordinary decline path. This is one branch with
    // no state, no disambiguation window and no deferred `preventDefault()`.
    if (event.altKey) {
      return null;
    }

    const item = this.#resolveItem(event, this.#snapshot);

    return item ? this.#seedDraft(item, this.#snapshot, draft) : null;
  }

  /**
   * Calls `invalidateInsertion()` under its own failure stage.
   *
   * Every call site below is inside a kernel-run transition, so the surrounding
   * phase would otherwise classify a throw as its own stage (an activation
   * failure, a placeholder-move failure), and `SortableErrorContext.stage`
   * would name the wrong thing. `kernel.fail` narrows from the inside, which is
   * the mechanism for this case.
   *
   * Returns whether it succeeded, because the recorded failure already decides
   * the transition's outcome: a caller that would go on to publish or to notify
   * must stop instead.
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
   * The command path, which shares every admission rule with the press: the
   * same composed-path search, the same handle narrowing and the same visual
   * resolver. So `handle()` gates the keyboard path too, and this parity is
   * intended.
   *
   * This method adds the one thing a press does not need: a destination,
   * decided here and synchronously, so that feasibility reaches the native
   * listener. An edge item yields `null` and the kernel leaves the arrow key
   * alone.
   */
  admitCommand(
    event: Event,
    draft: Draft<SortableFramePart>,
  ): AdmissionSubject | null {
    const keys = event as KeyboardEvent;

    // Check this first, on every declared command type, whatever the target. It
    // is not a special case of the target rules below. Without it, a real
    // Chromium composition admits the drag and reorders the collection while
    // the user is mid-word and not interacting with the list at all. The test
    // is a property of the keyboard event, so it needs no target inspection and
    // costs nothing.
    if (keys.isComposing) {
      return null;
    }

    const direction = directionOf(keys.key);

    if (direction === null) {
      return null;
    }

    // Resolve exactly once per keydown. `#resolveItem` invokes the consumer's
    // `handle()` resolver, so the destination and the draft seed both derive
    // from this one item and not from two independent resolutions of the same
    // event.
    //
    // Ask the target question here, and ask it first. The order is required:
    // first what the event landed on, then whether the move is feasible. Asking
    // feasibility first makes the outcome impossible to state: a
    // `contenteditable` in the last row would keep ArrowRight only because the
    // edge decline happened to fire.
    //
    // The press and command paths ask one question of one attribute, so there
    // is no per-key owner table to consult. The order above still holds and
    // still matters, because feasibility is asked about the item. That
    // asymmetry returns for an unmarked field, and `data-drag-ignore` answers
    // it.
    const item = this.#resolveItem(event, this.#snapshot);

    if (!item) {
      return null;
    }

    const insertion = keyboardInsertion(this.#snapshot, item, direction);

    // The edge case, and the reason the decision is synchronous. This check
    // runs before the draft is seeded, so an infeasible command resolves no
    // visual either. The press path resolves a visual only for an admission it
    // is going to make, and the command path matches it.
    if (!insertion) {
      return null;
    }

    const subject = this.#seedDraft(item, this.#snapshot, draft);

    // The destination travels in the draft, as `item` does for a press. No
    // staged value leaves this admission call, so the command path adds only
    // one SPI member.
    draft.insertion = insertion;
    return subject;
  }

  // -----------------------------------------------------------------------
  // Activation
  // -----------------------------------------------------------------------
  /**
   * Creates the placeholder detached and seeds the home insertion. No DOM
   * insertion, no acquisition, nothing externally visible.
   *
   * A successful preparation always commits, so `effect` always adopts the
   * element this method returns. Nothing between the two can discard it.
   */
  prepareActivation(
    draft: Draft<SortableFramePart>,
    scope: ActivationScope,
  ): HTMLElement | null {
    const item = draft.item!;
    const { box, visual, boxPre } = scope;
    // Window 2 of 2, and the first thing this transition does. The kernel took
    // window 1 immediately before `acquireLift`. This window reads the same
    // element in the same units after the lift, and the difference is the space
    // the removal of the visual actually freed.
    //
    // Use one extent, not two. `boxPre − boxPost` measures a collapse, which is
    // a scalar on the flow axis of the list. The footprint it feeds is a box,
    // which has two extents. Subtracting on both axes conflates them. On the
    // cross axis the box gives up nothing: a block-level box in a vertical list
    // takes its width from its containing block on both sides of the lift. So
    // the difference there is `0`, which is arithmetically correct and the
    // wrong quantity. Nothing was lost on that axis, so there is nothing to
    // restore, and the placeholder must still stand where the row stood. That
    // width is `boxPre.width`, always.
    //
    // The code says `height` and not "the block axis" for this reason: `y()` is
    // written on `pointerY`, `CENTRE_Y` and `rect.top/bottom`, so a
    // logical-axis footprint would give this rule a writing-mode dependency
    // that the axis module it serves does not have. `box !== visual` is
    // supported with `y()` alone.
    //
    // The identity branch is the degenerate case and not a second rule.
    // `boxPre − boxPost` is the footprint only when the box stays in flow while
    // the visual leaves it, which is the nested-pair case (`box = .row-box`
    // wrapping `visual = .card`: 62 → 32, so 30). Under the default
    // `box === visual` there is no such pair. The one element is the thing
    // being lifted, and `LIFT_FAITHFUL` promotes it with `position: fixed` and
    // an explicit width and height, so the lift does not change its offset box
    // and the collapse is zero. `footprint = boxPre` follows from the rule and
    // is not an exception to it.
    const footprint =
      box === visual
        ? boxPre
        : {
            width: boxPre.width,
            height: boxPre.height - box.offsetHeight,
          };

    // The pointer branch. A press has no destination yet, so the grab slot is
    // the origin the spatial path resolves away from. A command already wrote
    // its destination in `command.admit`, and seeding home here would destroy
    // the only state carrying it.
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
    // Steps 1 and 2, per resource. Registering first costs nothing: removing a
    // detached node is a no-op, so a disposer that runs too early cannot remove
    // too much. It also means a throw below can never leave a visible orphan
    // that the presentation lifetime does not own.
    scope.presentation.use(() => {
      placeholder.remove();
    });
    current.item!.after(placeholder);

    // `after()` connects the placeholder, and a custom element's
    // `connectedCallback` runs synchronously inside that call. That callback is
    // consumer code (the placeholder may come from a `placeholder()` factory)
    // reached from a plain DOM write, so no transition wraps it and no
    // reentrancy guard above sees it. A destruction it requests is applied
    // after this unit, so the activation completes as a live controller's.
    //
    // Everything below assumes the insertion actually took effect, and a
    // `connectedCallback` gets to run between `after()` and this line. It can
    // remove itself, move itself, or reparent the item. A detached or misplaced
    // placeholder is not a footprint: `placeholderAt` would read the siblings
    // of the wrong container, `movePlaceholder` would relocate a node the
    // collection no longer contains, and the landing would measure a rect that
    // is not in the list at all.
    //
    // This check is cheaper than trusting the insertion and repairing later,
    // and it classifies the fault in the right place. A throw here is
    // `FAILURE_ACTIVATION` from the committed state, so the placeholder
    // disposer registered above removes the placeholder, the consumer gets
    // `onError` with the activation stage, and nothing was published or
    // notified. Each of the two conditions catches what the other cannot.
    // Adjacency alone already implies same-parent, so a separate parentage test
    // would be unfalsifiable. But adjacency holds inside a detached fragment
    // too, so adjacency does not imply connectivity.
    //
    // That is the single-fault outcome. If consumer code in this activation
    // also registered a cancellation, the two-fault class described where
    // `#invalidateInsertion` fails below applies instead: the cancel supersedes
    // this failure, the drag settles as canceled without a start notification,
    // and the landing looks for an activation record this throw left
    // unpublished.
    const item = current.item!;

    if (!placeholder.isConnected || item.nextElementSibling !== placeholder) {
      throw new Error('drag: sortable/insertion-placeholder-lost');
    }

    // Listeners bound to the signal remove themselves, so the signal is the
    // registration. The explicit disposer cancels a scheduled frame.
    scope.motion.use(this.#spatialFrame.cancel);
    this.#invalidate(scope.motion.signal, () => {
      try {
        this.#slots.invalidateInsertion();
      } catch (error) {
        // A native scroll or resize listener is not a transition, so
        // `kernel.fail` here would be downgraded to a platform report and the
        // stage would never reach `onError`. One input path would silently
        // bypass the classified-failure mechanism. Queuing the error as a
        // behavior action gives it a transition: the action's own `prepare`
        // runs against the live operation, where `FAILURE_INVALIDATION` can be
        // classified with the recovery the contract gives it. A destruction
        // requested in the same unit discards the action with its fault. Only
        // an event dispatched synchronously inside a library callback can reach
        // that case, because the platform delivers scroll and resize outside
        // any unit.
        this.#kernel.dispatch(TAG_INVALIDATION, error);
      }
    });

    // Step 3: every resource above is now owned.
    this.#operation.activation = {
      placeholder,
      lift: scope.lift,
      box: this.#slots.box,
      settle: this.#slots.settle,
      // Handed down and not measured, and the item's space and not the
      // visual's. A displacement writes its `translate` on an item, so it is
      // applied in the space above an item. The kernel read this space before
      // `acquireLift` mutated anything, so it describes the ancestry the drag
      // began in. A read taken here would describe a tree activation has
      // already changed.
      space: scope.itemSpace,
    };

    if (!this.#invalidateInsertion()) {
      // Classified; the operation is failing, so do not start it.
      //
      // This is one instance of a class of two-fault paths that reach a
      // terminal callback without a start notification. The adjacency throw
      // above is another. The class needs both faults: consumer code reached
      // during this activation before `onStart` registers a cancellation, and
      // the effect then fails before `onStart`. The placeholder factory in
      // `prepare` and the placeholder's `connectedCallback` above are examples
      // of that consumer code, not a complete list. The registered cancel
      // outranks the classified failure, so the operation settles as canceled
      // for a drag `onStart` never announced, and the failure reaches `onError`
      // as superseded by the cancel. Either fault alone is fine: without the
      // cancel the failure reports through `onError`, and without the failure
      // `onStart` still runs. This gap is known and open.
      return;
    }

    // Advance the marker before the call, not after. A throw from `onStart`
    // itself is classified, and the consumer has by then been told the drag
    // began, so the consumer must receive an end. Advancing after the call
    // would publish nothing for the operation the consumer most recently heard
    // about.
    this.#operation.progress = STARTED;

    // Step 4: consumer code last. Everything the activation owns is registered
    // and published above, so a throw from `onStart`, classified as the failure
    // of this transition, leaves no step of the effect undone, and the consumer
    // hears of the drag only once it exists. A cancellation or destruction that
    // `onStart` requests is applied after this unit, so it does not bear on the
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
    // Rendering and scheduling are one callback with two stages. The kernel's
    // wrapper classifies the whole call `FAILURE_RENDERER_WRITE`, so the
    // scheduling half narrows from the inside. Otherwise a scheduling failure
    // is reported to the consumer as a render failure and
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
      // `activation.effect`. `kernel.fail` records the failure, so the
      // transition ends as a failure and the `null` below is never the deciding
      // value.
      this.#kernel.fail(FAILURE_INVALIDATION, argument);
      return null;
    }

    if (tag === TAG_SPATIAL) {
      // The applied half of the double validation. The activation test repeats
      // the producer's own: the frame task tests the record before it
      // dispatches. Here that test cannot fail once the phase test passes,
      // because the record is published before `ACTIVE` is committed and
      // cleared only at retirement. The attempt comparison cannot fail either,
      // because the frame task coalesces and dispatches the latest sequence
      // synchronously, so a queued attempt is always current when it applies.
      // The comparison stays because the contract states the check, and because
      // anything that queues a spatial action from outside the frame task
      // reopens the window it closes.
      //
      // The spatial action is inert outside `ACTIVE`, and the activation record
      // cannot replace the phase test: the record is cleared only at
      // retirement, so it stays non-null through `RELEASING`, `SETTLING` and
      // `FINALIZING`. No producer reaches those phases: the frame task is
      // cancelled when motion closes at release, and no other call site
      // dispatches this tag. So the phase test is unreachable by construction.
      // It keeps any new producer (a replayed action, a flush from a hook) from
      // committing a placeholder move into a decided transaction.
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

      // `resolved === null`: the incumbent slot still wins, so commit nothing.
      if (resolved === null) {
        return null;
      }

      draft.insertion = resolved;
      return STAGED;
    }

    // Pull here and not at the controller. `items()` is consumer code, and this
    // is the one place that has a transaction open, a phase to branch on and a
    // stage to classify a throw against. The controller member is reachable
    // from inside a transition and could only have called `items()` at an
    // arbitrary reentrant point.
    const source = this.#slots.items();

    // Array identity is the complete structural test. An unchanged identity is
    // a resize, a zoom or a scroll, which is the warm, common case. It stages
    // no snapshot, so it never reaches the phase branch below and never pays
    // for the copy.
    if (source === this.#sourceIdentity) {
      return {
        snapshot: null,
        source,
        cancelReason: null,
      } satisfies PreparedCollection;
    }

    // Copy on the structural branch only. The copy keeps a queued snapshot safe
    // from a later caller mutation, and it is paid when membership changes and
    // not on every invalidation.
    //
    // Copy first, then number. The copy refuses nothing, so nothing here
    // throws, but the order still matters: it keeps the version a dense
    // identity for the collections that actually exist. A pull that produces no
    // collection must not consume a number, or a consumer sees the next
    // successful update numbered as though an invisible one had happened in
    // between.
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

    // Test the insertion, not the phase. A press at `PENDING` has no insertion
    // to rebase (home is seeded at activation), so whether the item survives is
    // the complete question. A command commits `PENDING` with its destination
    // already written by `command.admit`, and short-circuiting on the phase
    // would carry that gap, unrebased, into a release that then fails to build
    // a proposal against the new snapshot.
    //
    // So a command gap is either rebased here or the operation is cancelled
    // before release ever runs. No command-specific revalidator exists, and
    // none is needed, because this one generalizes.
    //
    // `ACTIVATING` reconciles exactly like `ACTIVE`, because the runtime is
    // published and the home insertion committed before `onStart` could queue
    // this action.
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

      // Decide this before anything else in the effect, by asking the DOM and
      // not by acting and reporting back. An already-correct gap is the common
      // case, not the rare one. Everything below this line (the write, the axis
      // advance, the sink's contributions and the invalidation the `finally`
      // must run) exists only for a frame that actually moves the hole.
      if (placeholderAt(view.placeholder, insertion)) {
        return;
      }

      /**
       * True while the cache does not describe the DOM. It is set before
       * anything can touch the rule's arrays and cleared only once the cache
       * and the tree agree again, so every exit in between leaves it set and
       * invalidates in the `finally`. The exits are `movePlaceholder`'s throw
       * (`drag: sortable/anchor-outside-container`, or a DOM exception) and the
       * `return` after a caught `movedInsertion` throw. A throw from a custom
       * element's reaction to the move is reported to the global object and
       * does not leave this `try` block.
       *
       * That invalidation is required and not defensive. The happy path has no
       * invalidation at all: the axis either advances its cache arithmetically
       * or rebuilds it. So this flag is the only thing between a failed move
       * and a cache describing a tree that never existed.
       */
      let stale = true;

      try {
        // Step 1: the one write.
        movePlaceholder(view.placeholder, insertion);

        // Step 2: tell the axis and pass it the sink, in one call. The cache
        // advance does not depend on the DOM, so it has no reason to precede
        // the write it describes. The sink's visitor arrives as an argument and
        // no plan comes back, so a composition with no displacement feature
        // allocates nothing at all here.
        //
        // A stage says where the library was standing, and here that is the
        // effect of the action transition: the stage this effect's own write
        // reports, and the one a throw escaping here would be classified as
        // anyway. The invalidation stage is raised only on the invalidation
        // path, so reporting it here would send a consumer to their
        // `invalidate()` calls and their scroll handling for a fault that was
        // in a `box` resolver, an overridden `getBoundingClientRect` or an
        // overridden `animate` reached from a committed move.
        //
        // The `catch` still decides which error is recorded. The `finally`
        // below invalidates whether or not this threw, and an invalidation that
        // throws in turn would otherwise be the failure the consumer sees.
        // Reporting here means the hook's own error is already the one
        // recorded.
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

    // The geometry-only branch ends here: nothing to publish, no reconcile, no
    // cancel. The rect index is stale and nothing else changed. A resize, a
    // zoom or a scroll reaches this branch, so keeping it off the publication
    // path makes the pull source cheap and not merely tidy.
    if (!next) {
      this.#invalidateInsertion();
      return;
    }

    // Publication is an effect, not a preparation: a preparation that is
    // discarded must not publish.
    this.#snapshot = next;
    // The identity the structural test compares against. It advances with the
    // snapshot it produced and never before it. A preparation that was
    // discarded must not move the baseline, or the next invalidation would read
    // the change as already applied.
    this.#sourceIdentity = staged.source;

    if (phase === ACTIVATING || phase === ACTIVE) {
      // Not gated on success: publication already happened above, and a failing
      // invalidation must never discard the consumer's update. The recorded
      // failure still decides the transition's outcome.
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

    // The branch decides where the insertion comes from, never how the proposal
    // is built. Both paths pass the same `insertion` to the same
    // `buildReorderProposal` against the same snapshot. So "a keyboard and a
    // pointer reorder to the same gap produce identical proposals" is a
    // statement about one code path and not a coincidence between two.
    let insertion: Insertion;

    if (draft.pointerId === -1) {
      const { insertion: commanded } = draft;

      // The pointerless branch. The committed insertion is the command's
      // destination. There is no release sample, so a spatial resolve would
      // select a gap from `pointerY === 0`, the top of the viewport, and
      // silently replace it.
      //
      // A `null` here is a broken invariant, never a home fallback. The pointer
      // path's fallback exists because a spatial resolve can legitimately find
      // nothing. A command that reached `RELEASING` with no destination has
      // lost state the kernel guaranteed to carry. Reporting that as a home-gap
      // reorder would tell the consumer a drop completed normally.
      if (!commanded) {
        throw new Error('drag: sortable/release-no-destination');
      }

      insertion = commanded;
    } else {
      // Invalidate, then measure, and cancel nothing first. Motion is already
      // closed, so this search runs against final geometry. "Final" has to mean
      // settled flow geometry and not rows still carrying a contribution,
      // because the gap it commits is not an intermediate value: it is the
      // `ReorderRequest` the consumer is asked to apply.
      //
      // The rebuild settles the buffer instead of the rows. The sink subtracts
      // what it is holding as part of the scan, so a row still in transit
      // measures where flow puts it while it continues to travel. Cancelling
      // here would land the same numbers and snap every displaced row at the
      // one instant the user is watching the item land.
      if (!this.#invalidateInsertion()) {
        return { invoke: null };
      }

      // No lifecycle guard here. This resolve reaches the candidate loop too,
      // and on an aborted traversal it falls back to `draft.insertion`, builds
      // a proposal and stages an `invoke` closure. That closure is never
      // executed: the kernel opens the round-trip in a unit of its own, and a
      // destruction requested in this unit is applied at its boundary and
      // discards the closure. So `onReorder` cannot fire for an operation whose
      // destruction was requested. A guard here would be a second copy of a
      // decision the kernel already owns, and two copies can disagree.
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
      // The only legitimate skip: a proven `from === to`.
      return { invoke: null };
    }

    const { request } = built.proposal;

    return {
      invoke: (signal) => {
        // This is the first statement of the closure. The kernel runs this
        // closure only after `release.effect` returns normally, so reaching it
        // proves the consumer's resolver is being invoked. That makes a later
        // failure `AT_CONSUMER` and not `AT_PROPOSAL`.
        this.#operation.progress = RESOLVING;
        return this.#slots.onReorder(request, { signal });
      },
    };
  }

  effectRelease(current: Readonly<Frame<SortableFramePart>>): void {
    const activation = this.#operation.activation!;

    // Unconditional: a command reorders too, and its placeholder reaches the
    // same final gap by the same single writer.
    movePlaceholder(activation.placeholder, current.insertion!);

    if (current.pointerId !== -1) {
      // Required, not decoration: `pointerup` need not carry the coordinates of
      // the last processed `pointermove`, and the proposal was computed from
      // the committed release point. Rendering the placeholder alone would
      // leave the visual, and the whole landing trajectory, starting from a
      // stale point.
      activation.lift.write(
        current.pointerX - current.originX,
        current.pointerY - current.originY,
      );
    }
    // The pointerless branch writes nothing, because there is no release sample
    // to write. The pointer scalars are still at their admission values, so
    // writing `pointerX - originX` here would render `(0, 0)`. The visual is
    // already there, so the write would look harmless while making this branch
    // depend on the fields it is defined not to read. The landing then opens
    // from `(0, 0)`, which is correct because the visual has not moved since
    // acquisition.

    // Nothing is published here, and the effect ends at the write. The kernel
    // owns the ordering that binds: the staged command runs in a later unit of
    // its own, so a throw from the write above classifies `FAILURE_RELEASE` and
    // the round-trip never opens.
    //
    // Consumer code can be reached from the render, so that ordering matters
    // here and not only in the kernel. The `AT_PROPOSAL`/`AT_CONSUMER` split
    // turns on this transition: a throw from this effect is `AT_PROPOSAL`
    // because the marker reaches `RESOLVING` only inside the `invoke` closure.
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

    // No `default`: an exhaustive switch over the discriminant makes a new
    // settlement case a compile error here and not a silent fall-through to
    // some plausible outcome.
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

        // The resolution is the library's own value, not the consumer's:
        // `accept()` returns a shared sentinel and `reject()` a one-slot
        // carrier, so this is an identity comparison and a plain data read.
        // There is nothing to validate: a value that is neither came from
        // outside the types.
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
        // consumer verdict, so it is a named classified failure and not an
        // inferred rejection. It still ends the operation, but as a fault
        // reported through `onError`, with the terminal saying `canceled` and
        // not `rejected`.
        //
        // The caught cause travels verbatim. Something was caught here (the
        // consumer's own rejection value), so nothing is added to it: no
        // identity, no wrapper. The transition is already open at
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
        // already finalized, and rewriting the recovery now would move a visual
        // whose drop has already been reported as accepted. Every other stage
        // replaces the transaction. That is the presentation transaction, which
        // is a different question from what the consumer is told.
        if (input.stage !== FAILURE_TERMINAL_CALLBACK) {
          draft.recovery = RECOVERY_IMMEDIATE;
          // The fallback, and the only carrier of the terminal. Assigning
          // `draft.domain = null` here would make the library's most serious
          // failures its quietest: `finalized` publishes `current.domain` and
          // nothing else, so a null is no terminal at all.
          //
          // An existing result wins; otherwise the result is `canceled`. This
          // is a lookup on the frame and not a branch per stage. A transaction
          // opens with `Object.assign(draft, current)`, so a settlement that
          // already committed a result arrives here still carrying it, and `??`
          // is the complete tie-break.
          //
          // An unconditional `draft.domain = …` here is wrong, and the reason
          // is the mapping and not any one producer. "Existing result wins,
          // otherwise `canceled`" makes the terminal total: it collapses a
          // failure arriving before any result and one arriving after the
          // authored commit into a single lookup, so no stage carries a
          // terminal policy of its own. An assignment reinstates that per-stage
          // policy. A total mapping stops being total when the lookup becomes a
          // branch, never when one of its inputs grows rare.
          //
          // The input is not rare on the path where the value decides. The
          // settlement transition commits between `prepare` and `effect`, so an
          // `effect` that throws is classified from the committed state. It
          // arrives here with a result present and before any terminal has been
          // published, and this lookup keeps the operation's only terminal. An
          // assignment would overwrite it every time that path fires and tell a
          // consumer whose list really was reordered that the drop was
          // `canceled`. A `kernel.fail` raised from inside the terminal
          // callback reaches this line too, though by then the terminal is
          // published and the value is no longer observed.
          //
          // The stage exclusion above has its own reason (recovery, not the
          // result) and has no part in this tie-break.
          //
          // The marker decides the stage, and it also decides whether to
          // publish at all. At `CREATED` the consumer never heard this drag
          // start, and an end for a beginning it has no record of is worse than
          // publishing nothing.
          draft.domain ??=
            this.#operation.progress === CREATED
              ? null
              : {
                  type: 'canceled',
                  reason: input.error,
                  // The one origin a behavior creates. The kernel writes the
                  // other three onto the `SETTLED_CANCELED` input. This branch
                  // is the fallback that gives a classified failure a terminal,
                  // so only the behavior can state this origin. `reason` still
                  // carries the caught throw, and `origin` tells it apart from
                  // a consumer who passed an `Error` deliberately.
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

    // Consumer callbacks last. A failed settlement reports through `onError`
    // here and also publishes its terminal from the failure path's own
    // `ERROR_REPORTED` step. The two channels are orthogonal and neither
    // suppresses the other.
    if (failure) {
      // The error carries the stage the kernel classified with, and this member
      // neither reads it nor derives anything from it. It goes through
      // `#notify`, so a throwing handler stops here and does not become a fresh
      // library fault that reports itself back. The kernel built the error, and
      // nothing is copied into `domain` here: `finalized` publishes that same
      // `current.domain` to `onEnd`, unconditionally. A copy would be redundant
      // at best and stale at worst, since a second failure arriving between
      // `REPORTING` and `FINALIZING` moves it.
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
      // Re-anchoring follows the recovery, which is committed behavior state.
      // Under the serial commit the authored DOM is already final when this
      // runs, so there is no pending render to wait for.

      // Each condition has a purpose. `nextElementSibling` makes the repair do
      // nothing when the placeholder is already adjacent: `before()` on an
      // already-correct position is a remove-and-reinsert that resets CSS
      // transitions and forces a reflow. `isConnected` and the parent test stop
      // a consumer that unmounted or re-keyed the item from having the
      // placeholder moved into a detached tree, which would destroy the element
      // the fallback measures.
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

    // The precondition: two O(1) reads immediately before the measurement. It
    // runs after the re-anchor above, because the authored commit is allowed to
    // have made that repair necessary. Checking before the repair would report
    // a fault the library was about to fix.
    //
    // Each condition matches a real consumer strategy. `isConnected` catches
    // `replaceChildren` and an `innerHTML` rebuild, which detach the
    // placeholder outright. A detached placeholder reads `0×0` at the viewport
    // origin, and the row visibly travels to `(0,0)` over twelve frames before
    // teleporting back. The parent test catches container replacement, where
    // the placeholder survives in a tree the list no longer contains.
    //
    // This code throws and does not return a sentinel, and the kernel treats
    // the throw and a failed check identically: a target that cannot be
    // produced and one that cannot be trusted are the same fault. The
    // diagnostic is written here because this tier knows what a placeholder and
    // an item are. The kernel would have to say "something was wrong" instead.
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
   * Returns the landing animation timing, or `null` for no animation. An
   * immediate recovery has no animation. It is a failure repair: the visual
   * belongs at its home now, not two hundred milliseconds from now, and
   * interpolating one would animate the consequences of a fault the consumer
   * has already been told about.
   *
   * Without a `landing()` feature there is no timing and no animation, so the
   * collection pays nothing for a capability it did not install.
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
   * Publishes `current.domain` and nothing else.
   *
   * An exhaustive switch on the domain discriminant does not belong here. A
   * switch routes branches to callbacks, and there is one `onEnd` to route to:
   * the branches are the consumer's to discriminate. So a binary
   * accepted-vs-everything predicate, one that would send the no-op result to a
   * cancel callback, cannot be expressed.
   *
   * `null` still publishes nothing, and it means one thing only: the operation
   * failed before `onStart` ran, so the consumer has no record of it beginning.
   * Every started operation reaches here with a result: its own, or the
   * `canceled` fallback `settlement.prepare` wrote.
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

    // Stored in installation order, walked backwards. Each is wrapped
    // individually, so one throwing hook cannot stop a later one from restoring
    // its DOM.
    for (let i = this.#slots.retireHooks.length - 1; i >= 0; i -= 1) {
      this.#warnOnThrow(this.#slots.retireHooks[i]!);
    }
  }
}

/**
 * The thin protocol adapter. `BehaviorSpec` is a record with nested namespaces,
 * so an instance cannot be one. Every member here forwards to the entity and
 * adds nothing.
 *
 * `source` is the consumer's own array and `items` is the validated copy of it.
 * The caller supplies both, and this function does not derive them. The
 * validation belongs at the construction boundary, ahead of the first
 * installer, because this function runs inside `install`, after `assemble` has
 * returned. A throw from here would leave every recorded `retire` hook unrun.
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
    // One function fills both slots. Called with no argument it allocates a
    // part at its defaults. Called with one it returns that part to them. The
    // reset's return value is the part it received, which the kernel has and
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
     * Forwards and does nothing else. The kernel builds the public error, picks
     * its class and owns the refusal. This member is the last hop, the sink
     * every channel delivers to.
     *
     * This member derives nothing from the stage and attaches no context,
     * because neither a classification nor a `domain: null` context belongs
     * here. The kernel owns construction so that a classification cannot mean
     * two things in two behaviors, and the context is strictly redundant with
     * the terminal.
     *
     * Its callers are the kernel's own route, which refuses after applied
     * destruction and discards a throwing handler, and `panic`'s one delivery
     * after closure. That difference is why neither rule can live here.
     */
    reportError: behavior.reportError,

    retire() {
      behavior.retire();
    },
  };
}
