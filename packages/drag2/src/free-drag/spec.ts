/**
 * Every free-drag transition and behavior callback, as closures over one
 * private runtime.
 *
 * The kernel drives all three phases of every transaction. This module supplies
 * the two mostly pure parts, `prepare` and `effect`. Nothing here calls
 * `begin()` or `commit()`, nothing here reads `current` from a `prepare`, and
 * nothing here can close a lifetime the kernel owns. The arguments enforce
 * these properties; they do not depend on discipline.
 *
 * `Activation` is `true`. Free drag stages nothing at activation: no
 * placeholder, no detached node, no acquired resource. A pinned `HTMLElement`
 * staging type would force `prepare` to return `scope.visual`, an element the
 * kernel already holds, and `effect` would ignore the value it received. That
 * inverts the staged-resource contract.
 */
import {
  type DraggableError,
  DraggableWarning,
  type Notify,
} from '../kernel/errors.ts';
import {
  AT_CONSUMER,
  AT_PROPOSAL,
  CANCEL_FAILED,
  FAILURE_TERMINAL_CALLBACK,
  type FailureStage,
} from '../kernel/failures.ts';
import type { Draft, Frame } from '../kernel/frames.ts';
import { pathOwnsInteraction } from '../kernel/input-policy.ts';
import { createInvalidator } from '../kernel/invalidation.ts';
import { ACTIVATING, ACTIVE } from '../kernel/phases.ts';
import type { PointCache } from '../kernel/point-cache.ts';
import type {
  BehaviorLiftSession,
  InheritedSpace,
} from '../kernel/presentation.ts';
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
  ACCEPTED,
  type DragAxis,
  type FreeDragSubject,
  type RejectedResolution,
} from './domain.ts';
import type {
  ConstraintView,
  MotionConstraint,
  MotionDraft,
} from './feature.ts';
import { type FreeDragFramePart, freeDragFramePart } from './frames.ts';
import { applyAxis, buildGeometry, buildRequest } from './geometry.ts';
import {
  type CapturedPosition,
  FREE_DRAG_ACTION_TAGS,
  TAG_POLICY,
  TAG_POSITION,
} from './runtime.ts';
import type { FreeDragSlots } from './slots.ts';

/**
 * The three states of the progress marker. They are private to this module
 * because they are behavior-internal: nothing outside this file may read how
 * far an operation got, and nothing in the kernel could interpret it.
 */
const CREATED = 0;
const STARTED = 1;
const RESOLVING = 2;

/**
 * The free-drag behavior entity, and the state it owns for one controller.
 *
 * The `BehaviorSpec` this class backs is a protocol record with nested
 * namespaces, so an instance cannot be a spec. This class is the entity behind
 * the spec, and {@link createFreeDragSpec} is the thin adapter that presents it
 * in the shape the kernel reads.
 *
 * The state has three lifetimes. The operation's state and the open
 * transaction's state are named records. Every other field lives as long as the
 * controller.
 */
class FreeDragBehavior {
  readonly #slots: FreeDragSlots;

  readonly #realm: DOMRealm;

  readonly #root: HTMLElement;

  readonly #axis: DragAxis;

  /**
   * `apply` and `invalidate`, read from the constraint once, here. `retire` is
   * not one of them: the assembler reads that one and owns both its call sites.
   *
   * No site below may call these with the constraint record as `this`. The
   * convention on `MotionConstraint` is that an author may not depend on
   * `this`, and the convention holds only while nothing re-attaches a member to
   * the record it came from. Reading them once also keeps each site to one
   * call, and not a record read plus a member read.
   *
   * `tests/free-drag/anchor.browser.test.ts` drives each site alone with a
   * constraint that records the `this` it receives, so re-attaching any one of
   * them fails a row.
   */
  readonly #applyConstraint: MotionConstraint['apply'] | null;

  readonly #invalidateConstraint: MotionConstraint['invalidate'] | null;

  /**
   * One scratch draft per controller, written in place. The constraint writes
   * clamped scalars back into this object and does not return a `Point`, so the
   * per-sample path allocates nothing. That is the reason for the shape of
   * `MotionConstraint.apply`.
   */
  readonly #motion: MotionDraft = { x: 0, y: 0 };

  /**
   * The landing target's return buffer, one per controller. Every
   * `anchorTarget` arm writes these two fields and returns this object. The
   * kernel reads them immediately and retains nothing, which is the borrow that
   * the contract of `anchorTarget` states. Never make this module-level: two
   * controllers on one page must not share one. Nothing may read it between
   * calls.
   */
  readonly #anchor: PointCache = { x: 0, y: 0 };

  /**
   * One operation's state. Every field here lives as long as the operation and
   * is cleared together in `retire()`. The record states that grouping, and it
   * stops a controller-lifetime binding from joining the group by proximity.
   *
   * The record also keeps `moved(current, lift)` unshadowed: the `lift`
   * parameter is the kernel's own session, and the operation's session is
   * reached only through this record.
   */
  readonly #operation: {
    lift: BehaviorLiftSession | null;
    /**
     * The visual's viewport rect at grab. The basis of every clamp and rect.
     */
    originRect: DOMRectReadOnly | null;
    /**
     * The inverse of the inherited linear part, passed down by the kernel from
     * the one pre-lift measurement. Capturing it here would take a second
     * traversal, after acquisition has already moved the visual.
     */
    space: InheritedSpace;
    /** Built once per operation, in `activation.effect`. */
    view: ConstraintView | null;
    /**
     * How far the operation got, as one monotone marker. It exists because the
     * failure path must choose a terminal, and the kernel cannot supply the two
     * facts that decide which one: did the consumer hear this drag start, and
     * was its resolver actually invoked. Both are behavior knowledge.
     */
    progress: number;
  } = {
    lift: null,
    originRect: null,
    space: null,
    view: null,
    progress: CREATED,
  };

  /**
   * One settlement transaction's state. This is a third lifetime and not a
   * short per-operation one: `prepare` clears the slot on entry and `effect`
   * reads it, so only the effect of the transaction whose prepare wrote a value
   * can read that value. This record keeps the slot out of `retire()`, where
   * clearing it would be either redundant or wrong.
   */
  readonly #transaction: {
    /**
     * The failure the open settlement transition is reporting. `prepare` passes
     * it to `effect` here because `PreparedSettlement` carries nothing. The
     * sortable uses the same accepted out-of-band channel.
     */
    failure: Readonly<{ stage: FailureStage; report: DraggableError }> | null;
  } = { failure: null };

  /**
   * Where the spec invokes the consumer's error callback. The behavior's own
   * channel ({@link FreeDragBehavior.#notify}) and the spec's `reportError`
   * both end here. The composition's channel, created in `behavior.ts` before
   * any spec exists, calls `merged.onError` itself.
   *
   * This only forwards. The kernel builds the public error, picks its class and
   * owns the refusal. This neither maps nor attaches context: the mapping is
   * kernel-owned, so it cannot mean two things in two behaviors, and a
   * `domain: null` context is strictly redundant with the terminal.
   *
   * This has no guard and no gate because its callers apply those rules, and
   * they apply them differently. The kernel's own route refuses after
   * destruction is applied and discards a throwing handler. `panic`'s one
   * delivery after closure is a named exception to the refusal, and that
   * exception would be impossible if the refusal were applied here.
   *
   * This is a field and not a method because it is passed on as a value: the
   * spec publishes it as `reportError` and the `warnOnThrow` runner takes it as
   * an argument. An arrow has no `this` to lose on either path.
   */
  readonly #deliver: Notify = (error) => {
    this.#slots.onError?.(error);
  };

  /**
   * The behavior's own channel.
   *
   * This channel and the kernel's own route over the spec's `reportError` both
   * reach {@link FreeDragBehavior.#deliver}. They are one route and one channel
   * over one sink, not two sinks: everything that arrives is a `DraggableError`
   * or a `DraggableWarning`, and neither encodes severity. This channel carries
   * what the behavior reports, which the kernel cannot see: the settlement
   * failure and the cleanup steps.
   *
   * The kernel creates this channel over {@link FreeDragBehavior.#deliver}, so
   * it applies the kernel's refusal after destruction is applied, and a throw
   * from the handler stops there and is not reported through itself.
   */
  readonly #notify: Notify;

  readonly #warnOnThrow: WarnOnThrow;

  /** One per controller. Arming is per operation, on the motion signal. */
  readonly #invalidate: ReturnType<typeof createInvalidator>;

  constructor(kernel: BehaviorContext, slots: FreeDragSlots) {
    this.#slots = slots;
    this.#notify = kernel.channel(this.#deliver);
    this.#warnOnThrow = createWarnOnThrow(this.#notify);
    this.#realm = kernel.realm;
    this.#root = kernel.root;
    this.#axis = slots.axis;
    this.#applyConstraint = slots.constrain ? slots.constrain.apply : null;
    this.#invalidateConstraint = slots.constrain
      ? slots.constrain.invalidate
      : null;
    this.#invalidate = createInvalidator(kernel.realm);
  }

  get reportError(): Notify {
    return this.#deliver;
  }

  get config(): BehaviorSpec<FreeDragFramePart>['config'] {
    return {
      threshold: this.#slots.threshold,
      liftMode: this.#slots.liftMode,
      actionTags: FREE_DRAG_ACTION_TAGS,
    };
  }

  /**
   * The rendered delta, derived and not stored. It is a pure function of the
   * committed sample, the frame's offset and the policy, so every reader
   * derives it and none mirrors the kernel's own record.
   *
   * This writes into the motion draft and returns nothing: a `Point` return
   * would put an allocation on the hot path for a value its callers read field
   * by field and drop.
   */
  #deriveMotion(
    pointerX: number,
    pointerY: number,
    originX: number,
    originY: number,
    offsetX: number,
    offsetY: number,
  ): void {
    const motion = this.#motion;

    motion.x = pointerX - originX + offsetX;
    motion.y = pointerY - originY + offsetY;
    // The axis is core and not a capability: two comparisons and no state.
    applyAxis(motion, this.#axis);
    // One indirect call, only when something filled the slot. A composition
    // without `bounds()` pays one property read and one predictable branch, and
    // carries no clamp arithmetic and no rect resolver at all.
    this.#applyConstraint?.(motion, this.#operation.view!);
  }

  /** The subject `home` is asked about, and the request carries. */
  #subjectOf(visual: HTMLElement): FreeDragSubject {
    return { item: this.#root, visual };
  }

  // -----------------------------------------------------------------------
  // Admission — inside the native `pointerdown` dispatch
  // -----------------------------------------------------------------------

  /**
   * Applies the input policy and the handle scoping, then the visual resolver.
   * Returns a bare element because free drag has no separate geometry source:
   * there is no placeholder, so nothing measures a footprint, and `box ===
   * visual` is not a separate choice.
   *
   * The item is the root. `freeDrag(item, …)` passes the item as the root
   * element, where listeners bind, so the root and the dragged item are the
   * same element without a lookup. That is why there is no composed-path search
   * here and no collection to search.
   */
  admit(
    event: PointerEvent,
    draft: Draft<FreeDragFramePart>,
  ): AdmissionSubject | null {
    // A modifier requests native text selection; its absence means drag. One
    // branch, no state, no disambiguation window.
    if (event.altKey) {
      return null;
    }

    const path = event.composedPath();
    let subject = path.indexOf(this.#root);

    if (subject === -1) {
      return null;
    }

    if (this.#slots.handle) {
      const handle = this.#slots.handle(this.#root);

      if (!handle) {
        return null;
      }

      // The resolved subject governs. A handle inside the item is earlier in
      // the composed path, so scoping to it shortens the segment the opt-out
      // scan walks. A handle inside a marked region admits, because the
      // consumer chose to scope dragging there.
      subject = path.indexOf(handle);

      if (subject === -1) {
        return null;
      }
    }

    // Ask what the event landed on after the subject is known and before
    // anything is seeded. A press reaching a `[data-drag-ignore]` region
    // declines by the ordinary total-decline path: no operation and no phase
    // change. The kernel prevents nothing for a `null`, so focus lands and the
    // caret is placed.
    if (pathOwnsInteraction(path, subject)) {
      return null;
    }

    let visual = this.#root;

    if (this.#slots.visual) {
      visual = this.#slots.visual(this.#root);
    }

    draft.visual = visual;

    return visual;
  }

  // -----------------------------------------------------------------------
  // Activation
  // -----------------------------------------------------------------------

  /** Strict order: register, make visible, publish, then notify. */
  effectActivation(
    current: Readonly<Frame<FreeDragFramePart>>,
    _prepared: true,
    scope: ActivationScope,
  ): void {
    const { visual } = scope;

    // 1 → 2. Everything later behavior code reads that no `prepare` decides.
    this.#operation.lift = scope.lift;
    this.#operation.originRect = scope.originRect;
    // Passed down, not measured. The inverse inherited linear part turns a
    // viewport delta into the local one, with four multiplies written out where
    // the two consumer shapes are built and no coordinate module. This behavior
    // performs no DOM read per activation, because the kernel derived the value
    // from the measurement `acquireLift` took before it moved anything. Reading
    // it here would read a different ancestry: under a lifted mode the visual
    // is `position: fixed` in the top layer by now, so a second traversal
    // reports the viewport and not the transformed stage the drag actually
    // began in.
    this.#operation.space = scope.visualSpace;
    this.#operation.view = {
      realm: this.#realm,
      originRect: scope.originRect,
      visual,
    };

    if (this.#slots.constrain) {
      // The behavior owns the events that make the rect stale; the feature owns
      // the rect. Scroll and resize fire many times a second, so this marks the
      // rect stale and never resolves it. The feature re-reads on the next
      // `apply`.
      //
      // This uses a local `try`/`catch`, not `#warnOnThrow` and not
      // `kernel.fail`. Nothing is pending: this is one call at the end of a
      // native listener, so no later statement must run, and `warnOnThrow`
      // would express a rule this site does not have.
      //
      // Not `kernel.fail`, because a native scroll listener is not a call into
      // behavior code through the runner, so a classified failure raised here
      // would be refused anyway. Unlike the sortable's equivalent there is no
      // action tag to re-raise it through: neither of this behavior's tags
      // carries it. `#invalidate()` is by contract a staleness flag and not a
      // resolve, so the throw it would report is a defect in a constraint and
      // not in consumer data.
      this.#invalidate(scope.motion.signal, () => {
        try {
          this.#invalidateConstraint!();
        } catch (error: unknown) {
          this.#notify(
            new DraggableWarning('drag: constraint/invalidate-failed', {
              cause: error,
            }),
          );
        }
      });
    }

    // 3. Place the visual at the delta the pointer has already accumulated.
    // Parity: no jump on the first move after activation. Crossing the
    // threshold is what activates, so the pointer is already some distance from
    // the grab. Leaving the visual at zero until the next sample would show
    // that distance as a jump.
    this.#deriveMotion(
      current.pointerX,
      current.pointerY,
      current.originX,
      current.originY,
      current.offsetX,
      current.offsetY,
    );

    scope.lift.write(this.#motion.x, this.#motion.y);

    // Advance the marker before the call, not after. A throw from `onStart` is
    // classified, and the consumer has by then been told the drag began, so the
    // consumer must receive an end.
    this.#operation.progress = STARTED;

    // 4. Consumer code last. Everything the activation owns is in place above,
    // so a throw from `onStart`, classified as this transition's failure,
    // leaves no step of the effect undone. The consumer hears of the drag only
    // once the lift is acquired and the visual placed. A cancellation or
    // destruction that `onStart` requests is applied after this unit, so it
    // does not affect the order.
    if (this.#slots.onStart) {
      this.#slots.onStart(
        buildGeometry(
          current.pointerX,
          current.pointerY,
          current.originX,
          current.originY,
          this.#motion.x,
          this.#motion.y,
          scope.originRect,
          this.#operation.space,
          this.#realm,
        ),
      );
    }
  }

  // -----------------------------------------------------------------------
  // The hot path
  // -----------------------------------------------------------------------

  /**
   * Applies the raw delta from the committed sample plus the frame's offset,
   * the axis, the constraint when installed, and the write. `onMove` runs after
   * that, so the callback observes a visual that has already moved.
   */
  moved(
    current: Readonly<Frame<FreeDragFramePart>>,
    lift: BehaviorLiftSession,
  ): void {
    this.#deriveMotion(
      current.pointerX,
      current.pointerY,
      current.originX,
      current.originY,
      current.offsetX,
      current.offsetY,
    );
    lift.write(this.#motion.x, this.#motion.y);

    // Build the geometry object inside the branch: a composition with no
    // `onMove` pays no allocation and no derived rect per sample. That is why
    // the slot stays nullable and is not normalized.
    if (this.#slots.onMove) {
      this.#slots.onMove(
        buildGeometry(
          current.pointerX,
          current.pointerY,
          current.originX,
          current.originY,
          this.#motion.x,
          this.#motion.y,
          this.#operation.originRect!,
          this.#operation.space,
          this.#realm,
        ),
      );
    }
  }

  // -----------------------------------------------------------------------
  // Behavior actions
  // -----------------------------------------------------------------------
  prepareAction(
    tag: number,
    argument: unknown,
    draft: Draft<FreeDragFramePart>,
  ): {} | null {
    // Phase legality per tag. Free drag owns writable geometry in exactly two
    // phases: `ACTIVATING`, so a `moveTo()` from `onStart` retargets and is not
    // dropped, and `ACTIVE`. From `RELEASING` on, the kernel's own vocabulary
    // says that input is closed and geometry is final: the request is built,
    // the landing origin is about to be sampled, and `BehaviorLiftSession`
    // already declares a write after that point out of contract.
    //
    // The two tags share the set of phases but not the reason, so the
    // comparison is written once here. `TAG_POSITION` is refused for
    // correctness: from `onEnd` it is ahead of `RETIRE` in FIFO order, so it
    // writes through an already-disposed lift and leaves a stray inline
    // transform on an element whose presentation is disposed. `TAG_POLICY` is
    // refused for hygiene: it writes no geometry, but it re-enters a
    // third-party `constrain.invalidate()` when no later sample exists to be
    // affected. The two coincide only because free drag takes no sample after
    // release.
    //
    // This is a no-op and not a rejection. `null` is this transition's existing
    // discard value, so a late `moveTo()` costs one comparison and produces no
    // failure, no report and no terminal. A consumer calling it from `onEnd`
    // has not made an error the library should classify.
    //
    // This is not in the kernel: the sortable intentionally accepts a
    // collection `invalidate()` in these same phases, because a collection
    // change during settlement is real information and a position write is not.
    // Action legality is behavior knowledge.
    if (draft.phase !== ACTIVATING && draft.phase !== ACTIVE) {
      return null;
    }

    if (tag === TAG_POLICY) {
      // One consumer-reachable call, and nothing to publish. `#invalidate()` is
      // a staleness flag: the constraint re-resolves on its own next `apply`,
      // so there is no staged value, no commit and no `effect` branch.
      this.#invalidateConstraint?.();

      return null;
    }

    if (tag === TAG_POSITION) {
      // `moveTo` re-bases. The offset is chosen so that the visual is at
      // `point` on the next committed frame. Later pointer motion continues
      // relative to that point, so the move composes with a live pointer and
      // does not fight it.
      //
      // The offset is an input and not a derivation, so it is a frame field and
      // only a `prepare` may write it.
      const origin = this.#operation.originRect;

      if (!origin) {
        return null;
      }

      const { x, y, fault } = argument as CapturedPosition;

      // Throw before anything is written. A malformed `point` (`null`, missing
      // fields, a throwing accessor) failed the copy `moveTo` made at the call,
      // and its error is thrown here, so it is classified
      // `FAILURE_ACTION_PREPARE` without further work. It is not checked: that
      // would be argument validation, and this transition already classifies
      // the throw.
      if (fault) {
        throw fault.error;
      }

      // Finiteness is not checked. `moveTo`'s own doc comment publishes that
      // both coordinates must be finite, so a non-finite one is outside the
      // contract and the reachability gate closes before ownership is asked.
      // What the offsets then poison (`deriveMotion`, every geometry object,
      // the pinned `anchorTarget`, and through the rendered delta the
      // `distance` the library creates) is the undefined behavior of that
      // misuse, not a second harm that makes it the library's.
      draft.offsetX = x - origin.left - (draft.pointerX - draft.originX);
      draft.offsetY = y - origin.top - (draft.pointerY - draft.originY);

      return true;
    }

    return null;
  }

  effectAction(
    _tag: number,
    _argument: unknown,
    current: Readonly<Frame<FreeDragFramePart>>,
  ): void {
    // Render from `action.effect`: there is no way to make the kernel emit a
    // `moved` for a position it did not sample, so the write happens here,
    // after the commit, from the committed offset.
    this.#deriveMotion(
      current.pointerX,
      current.pointerY,
      current.originX,
      current.originY,
      current.offsetX,
      current.offsetY,
    );
    this.#operation.lift?.write(this.#motion.x, this.#motion.y);
  }

  // -----------------------------------------------------------------------
  // Release
  prepareRelease(draft: Draft<FreeDragFramePart>): ResolutionCommand {
    const { visual } = draft;
    const origin = this.#operation.originRect;

    // Never `invoke: null`: free drag has no proven semantic no-op, so
    // `SETTLED_SKIPPED` has no producer in this behavior. A release that finds
    // no visual has a broken invariant, and reporting it as a successful no-op
    // drop would tell the consumer the drag completed normally.
    if (!visual || !origin) {
      throw new Error('drag: free-drag/release-no-visual');
    }

    this.#deriveMotion(
      draft.pointerX,
      draft.pointerY,
      draft.originX,
      draft.originY,
      draft.offsetX,
      draft.offsetY,
    );

    const request = buildRequest(
      this.#subjectOf(visual),
      draft.pointerX,
      draft.pointerY,
      this.#motion.x,
      this.#motion.y,
      origin,
      this.#operation.space,
      this.#realm,
    );

    draft.request = request;

    return {
      invoke: (signal) => {
        // First statement of the closure. The kernel runs this only after
        // `release.effect` returns normally, so reaching it proves the
        // consumer's resolver is being invoked. That makes a later failure
        // `AT_CONSUMER` and not `AT_PROPOSAL`.
        this.#operation.progress = RESOLVING;
        return this.#slots.onDrop(request, { signal });
      },
    };
  }

  /**
   * There is no placeholder, but there is still one write. `pointerup` need not
   * carry the coordinates of the last processed `pointermove`, and
   * `prepareRelease` built the request from the committed release point.
   * Without this write the visual, and so the whole landing trajectory, would
   * start from a stale position while `anchorTarget` reports the fresh one.
   *
   * `#motion` still holds the release delta `prepare` derived, and nothing
   * between the two phases can have changed it.
   */
  effectRelease(): void {
    this.#operation.lift?.write(this.#motion.x, this.#motion.y);
  }

  // -----------------------------------------------------------------------
  // Settlement
  /** The settlement mapping, covered exhaustively. */
  prepareSettlement(
    draft: Draft<FreeDragFramePart>,
    input: SettlementInput,
  ): PreparedSettlement {
    this.#transaction.failure = null;

    const { request } = draft;

    // No `default`: an exhaustive switch over the discriminant makes a new
    // settlement case a compile error here, not a silent fall-through to some
    // plausible outcome.
    // oxlint-disable-next-line default-case
    switch (input.type) {
      case SETTLED_SKIPPED: {
        // No producer in this behavior: `release.prepare` never returns
        // `invoke: null`. Reaching this case means the kernel skipped a round
        // trip this behavior never declined, which is a broken invariant and
        // not a drop.
        throw new Error('drag: free-drag/settled-skipped');
      }

      case SETTLED_FULFILLED: {
        const { value } = input;

        // The resolution is the library's own value, not the consumer's:
        // `accept()` returns a shared sentinel and `reject()` a one-slot
        // carrier, so this is an identity comparison and a plain data read.
        // There is nothing to validate: a value that is neither came from
        // outside the types.
        const accepted = value === ACCEPTED;

        draft.domain = accepted
          ? { type: 'accepted', request: request! }
          : {
              type: 'rejected',
              request: request!,
              reason: (value as RejectedResolution)[0],
            };

        return true;
      }

      case SETTLED_REJECTED: {
        // A rejected thenable is a resolver malfunction, not a considered
        // consumer verdict, so it is a named classified failure and not an
        // inferred rejection. It still ends the operation, but as a fault
        // reported through `onError`, with the terminal saying `canceled` and
        // not `rejected`.
        //
        // The caught cause travels unchanged. What was caught here is the
        // consumer's own rejection value, so nothing is added to it: no
        // identity and no wrapper. The transition is already open at
        // `FAILURE_RESOLUTION`, so re-raising classifies it there.
        throw input.error;
      }

      case SETTLED_CANCELED: {
        draft.domain = {
          type: 'canceled',
          request,
          reason: input.reason,
          origin: input.origin,
          stage: input.stage,
        };

        return true;
      }

      case SETTLED_FAILED: {
        this.#transaction.failure = {
          stage: input.stage,
          report: input.report,
        };

        // A terminal-callback failure arrives after the operation finalized, so
        // rewriting the result now would relabel a drop that has already been
        // reported.
        if (input.stage !== FAILURE_TERMINAL_CALLBACK) {
          // An existing result wins; otherwise `canceled`. This is a lookup on
          // the frame and not a branch per stage. A transaction opens with
          // `Object.assign(draft, current)`, so a settlement that already
          // committed a result arrives here still carrying it, and `??=` is the
          // tie-break. This lookup makes the terminal total, so it stays
          // whatever the producer set looks like: a `settlement.effect` that
          // throws is classified from the committed state, which reaches this
          // line with a result present and before any terminal has been
          // published. The value kept here is then the operation's only
          // terminal.
          //
          // The marker decides the stage, and it also decides whether to
          // publish at all. At `CREATED` the consumer never heard this drag
          // start, and an end for a beginning it has no record of is worse than
          // no end.
          draft.domain ??=
            this.#operation.progress === CREATED
              ? null
              : {
                  type: 'canceled',
                  request,
                  reason: input.error,
                  // The one origin a behavior creates: the kernel writes every
                  // other origin onto the `SETTLED_CANCELED` input, and this
                  // arm is the fallback that gives a classified failure a
                  // terminal. `reason` still carries the caught throw. `origin`
                  // tells it apart from a consumer who deliberately passed an
                  // `Error`.
                  origin: CANCEL_FAILED,
                  stage:
                    this.#operation.progress === RESOLVING
                      ? AT_CONSUMER
                      : AT_PROPOSAL,
                };
        }

        return true;
      }
    }
  }

  effectSettlement(
    _current: Readonly<Frame<FreeDragFramePart>>,
    _prepared: PreparedSettlement,
  ): void {
    const { failure } = this.#transaction;

    this.#transaction.failure = null;

    // Consumer callbacks last. A failed settlement reports through `onError`
    // here and also publishes its terminal from the failure path's own step.
    // The report and the terminal are independent, and neither suppresses the
    // other.
    if (failure) {
      // The error carries the stage the kernel classified with, and this member
      // neither reads it nor derives anything from it.
      //
      // Report through `#notify`, so a throwing handler stops here and does not
      // become a new library fault that reports itself back. The kernel built
      // the error, and no `domain` travels with it: `finalized` publishes that
      // same `current.domain` to `onEnd` unconditionally, so a copy here would
      // be redundant at best and stale at worst, since a second failure
      // arriving between `REPORTING` and `FINALIZING` moves it.
      this.#notify(failure.report);
    }
  }

  // -----------------------------------------------------------------------
  // Landing target and the terminal callback
  // -----------------------------------------------------------------------

  /**
   * Accepted: where the visual already is. Rejected or canceled: `home`, or the
   * grab position when none is configured.
   *
   * A throwing or non-finite `home` is an error, not a cancel. The kernel runs
   * this through `runCallbackWarningOnFailure`, so the landing is skipped and
   * not faked, and a drop that already committed is not re-settled. No stage is
   * attached and none is needed: the fault is non-consequential, so it reaches
   * `onError` as a `DraggableWarning` carrying `drag:
   * landing/target-unavailable`, and a warning needs no stage to be delivered.
   */
  anchorTarget(current: Readonly<Frame<FreeDragFramePart>>): PointCache {
    const origin = this.#operation.originRect!;

    if (current.domain?.type === 'accepted') {
      // The accepted arm answers from arithmetic the frame already holds: no
      // consumer call and no DOM read. The answer is the visual's current
      // position.
      //
      // Read `#motion`; do not re-derive it. This arm must not call
      // `deriveMotion`: its last statement is `constrain.apply`, so the
      // statement above about no consumer call would be false whenever any
      // constraint is installed, and this callback would become another `apply`
      // site.
      //
      // A re-derivation computes the same numbers from the same committed
      // frame, so the read costs nothing. The read rests on this invariant:
      // `#motion` still holds the delta `release.prepare` derived and
      // `release.effect` wrote, and nothing may change it in between, because
      // both behavior tags are deterministic no-ops after `ACTIVE`.
      this.#anchor.x = origin.left + this.#motion.x;
      this.#anchor.y = origin.top + this.#motion.y;

      return this.#anchor;
    }

    if (this.#slots.home) {
      const home = this.#slots.home(this.#subjectOf(current.visual!));
      // Read, check and copy here, inside the call the kernel attributes. The
      // kernel's warning wrapper covers this call and reads the point's fields
      // later, outside it. Without the reads here, a `null`, a missing field or
      // a throwing accessor panics outside the call its own contract names.
      //
      // The reads happen; finiteness is not checked. A non-finite pair is
      // accepted and passes undetected into target composition or a renderer.
      // Refusing it here is wrong: a landing target is a point, and a point's
      // coordinates are finite by the same obvious semantics that makes a
      // duration finite, so that value is outside the contract and the gate
      // closes on it.
      //
      // The copy is not defensive and is not part of that check. The returned
      // object is consumer-owned and its accessors may be live, so composing
      // against it twice could read two different points. The library takes
      // ownership of a value it reads across this boundary and pins geometry
      // with. A getter-backed `Point` is a legitimate shape and not misuse.
      //
      // Read each axis exactly once, before the writes. The cache removes the
      // allocation and nothing else: reading `home` twice, or writing
      // `#anchor.x = home.x` and then `#anchor.y = home.y`, would still be two
      // reads of a live accessor, the second separated from the first by a
      // field write. The destructuring below is the copy this callback must
      // make.
      const { x } = home;
      const { y } = home;

      this.#anchor.x = x;
      this.#anchor.y = y;

      return this.#anchor;
    }

    // The grab position, which is the origin rect itself: the answer for a
    // rejected or canceled drop with no `home` configured.
    this.#anchor.x = origin.left;
    this.#anchor.y = origin.top;

    return this.#anchor;
  }

  /**
   * The landing animation runs only when the visual has to travel. An accepted
   * drop stays where it landed: `anchorTarget` answers with the position the
   * visual is already at, so an animation for it would follow a path of no
   * length. Rejected and canceled arms return to a home, configured or the grab
   * spot, and that is real travel.
   *
   * A `null` domain is the no-start case, treated as travelling: the visual is
   * somewhere the consumer never approved.
   */
  landingTail(
    current: Readonly<Frame<FreeDragFramePart>>,
    fromX: number,
    fromY: number,
    targetX: number,
    targetY: number,
  ): LandingTail | null {
    const { landingTiming } = this.#slots;

    return landingTiming && current.domain?.type !== 'accepted'
      ? landingTiming(fromX, fromY, targetX, targetY)
      : null;
  }

  /**
   * Publishes `current.domain` and nothing else. The arms are the consumer's to
   * discriminate. With one `onEnd` there is no routing predicate to get wrong.
   *
   * `null` means one thing only: the operation failed before `onStart` ran, so
   * the consumer has no record of it beginning.
   */
  finalized(current: Readonly<Frame<FreeDragFramePart>>): void {
    const { domain } = current;

    if (domain) {
      this.#slots.onEnd?.(domain);
    }
  }

  retire(): void {
    this.#operation.progress = CREATED;
    this.#operation.lift = null;
    this.#operation.originRect = null;
    this.#operation.space = null;
    this.#operation.view = null;

    // Stored in installation order, walked backwards. Each hook is wrapped
    // individually, so one throwing hook cannot stop a later one from disposing
    // what it holds.
    for (let i = this.#slots.retireHooks.length - 1; i >= 0; i -= 1) {
      this.#warnOnThrow(this.#slots.retireHooks[i]!);
    }
  }
}

/**
 * The thin protocol adapter. `BehaviorSpec` is a record with nested namespaces,
 * so an instance cannot be one. Every member here forwards to the entity and
 * adds nothing. Keeping the namespaces in the adapter lets the entity be a flat
 * class without the kernel learning a second shape.
 */
export function createFreeDragSpec(
  kernel: BehaviorContext,
  slots: FreeDragSlots,
): BehaviorSpec<FreeDragFramePart> {
  const behavior = new FreeDragBehavior(kernel, slots);

  return {
    createFramePart: freeDragFramePart,
    // One function fills both slots: called with no argument it allocates a
    // part at its defaults, and called with one it resets that part to them.
    // The reset returns the part it received, which the kernel has and ignores.
    // eslint-disable-next-line @typescript-eslint/strict-void-return
    resetFramePart: freeDragFramePart,
    config: behavior.config,

    admit(event, draft) {
      return behavior.admit(event, draft);
    },

    /**
     * No `command` member. Free drag has no discrete input path: `arm()` binds
     * `pointerdown` and nothing else. Keyboard free drag has no counterpart in
     * `@ydinjs/drag`, so it is not added here.
     */

    activation: {
      /**
       * Stages nothing. There is no placeholder to create, no node to detach
       * and nothing to acquire, so the return value only means "proceed". That
       * is a protocol constant and not entity behavior, so it is answered here
       * and not forwarded.
       */
      prepare() {
        return true;
      },
      effect(current, prepared, scope) {
        behavior.effectActivation(current, prepared, scope);
      },
    },

    moved(current, lift) {
      behavior.moved(current, lift);
    },

    action: {
      prepare(tag, argument, draft) {
        return behavior.prepareAction(tag, argument, draft);
      },
      effect(tag, argument, current) {
        behavior.effectAction(tag, argument, current);
      },
    },

    release: {
      prepare(draft) {
        return behavior.prepareRelease(draft);
      },
      effect() {
        behavior.effectRelease();
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

    reportError: behavior.reportError,

    retire() {
      behavior.retire();
    },
  };
}
