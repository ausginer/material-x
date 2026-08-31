# 2. The behavior–kernel callback contract

## The tri-phase transition

The shipped package and probe 1 both state the same rule in prose:

> Every substantial action is three stages. **Prepare** — validation, pure calculation, DOM reads, _local_ acquisition; must not mutate `current`. **Commit** — short, effectively non-throwing. **Post-commit effects** — DOM writes, lifetime closes, continuations, callbacks.

Probe 1 asked the behavior to obey it, including calling `kernel.begin()`, `kernel.preparationValid()` and `kernel.commit()` in the right order inside each seam. Here it is the shape of the contract. (D-3)

Every signature in this document is compiled. The **type fixture** is [`packages/drag/docs/contract-probe-2/contract.ts`](../../../../packages/drag/docs/contract-probe-2/contract.ts), covered by `npx just typecheck` from `packages/drag`. It is not an executable copy — it has no queue, cancellation machine or failure checkpoint — and where it and this document disagree, **this document wins**. It carries `@ts-expect-error` assertions for each tier-A claim that is _expressible_ as a type error, so those cannot silently degrade to discipline.

```ts
type Frame<Part extends object> = KernelFrame & Part;

/**
 * What a `prepare` may write: its own part, plus a read-only kernel slice.
 * The `Omit` is not cosmetic — see §04 §Write protection.
 */
type Draft<Part extends object> = Omit<Part, keyof KernelFrame> &
  Readonly<KernelFrame>;

type Transition<
  Part extends object,
  // `extends {}` excludes `null` and `undefined` while still admitting the
  // `true` sentinel, an element, or any object. It keeps `Prepared | null`
  // unambiguous as the discard signal without leaving it to prose.
  Prepared extends {} = true,
  Capability = void,
> = Readonly<{
  /**
   * Prepare. Returns the staged value, or `null` to discard. Must not touch
   * `current`, must not perform DOM writes, and must keep every acquisition
   * local — everything it acquires travels out through `Prepared`.
   *
   * Seams that stage nothing use `Prepared = true` and return the literal.
   * `BehaviorSpec` used to override that default with `HTMLElement` for
   * activation; since D-34 the behavior chooses, and `true` is the default
   * there too.
   */
  prepare(draft: Draft<Part>, capability: Capability): Prepared | null;

  /**
   * Post-commit effects, for an already-published transition. A throw here
   * becomes a classified failure from the committed state; the transition is
   * not reverted.
   */
  effect(
    current: Readonly<Frame<Part>>,
    prepared: Prepared,
    capability: Capability,
  ): void;

  /**
   * Called instead of `effect` when the kernel discards a successful `prepare`
   * because a reentrant `cancel()` or `destroy()` invalidated it. Releases
   * whatever `prepare` staged. Publishes nothing, reports nothing.
   *
   * ~~Unused by the sortable behavior, because after D-17 nothing it stages
   * holds an external resource.~~ **Required by D-39, and doubly so after
   * D-52.** The staged placeholder may be a *consumer-owned* element returned
   * from the `placeholder` slot, and `prepare` writes library attributes,
   * styles and sizing onto it — sizing that D-52 keeps in `prepare` precisely
   * so this ledger covers it. Adoption never happens on the discard path, so
   * the disposer `effect` would have registered never becomes responsible.
   * Deferred teardown (D-36) does not dissolve the residue: it changes when
   * teardown runs, not whether adoption occurred.
   */
  rollback?(prepared: Prepared): void;
}>;
```

### The shared core, and why it is not the whole driver

There is one core routine. **No seam is only the core** — the discard policy and the failure policy differ per seam, and pretending otherwise hid four real gaps (review 4, §8).

#### The core returns an outcome, not a boolean

A `boolean` conflates five outcomes, and each caller needs a different continuation for each. Worse, it conflates _discarded_ with _failed_, which made the failure model internally inconsistent: classification happened, and then success work continued anyway (review 5, §1).

```ts
const SEAM_DISCARDED = 0; // `prepare` returned null — nothing happened
const SEAM_INVALIDATED = 1; // reentrant cancel/destroy after a good prepare
const SEAM_PREPARE_FAILED = 2; // classified; nothing committed
const SEAM_COMMITTED = 3; // committed, effect returned normally
const SEAM_EFFECT_FAILED = 4; // classified, from the committed state

const seamFailed = (o: SeamOutcome): boolean =>
  o === SEAM_PREPARE_FAILED || o === SEAM_EFFECT_FAILED;
```

**Classification is not sufficient on its own. A classified failure must also stop incompatible continuation**, because the failure checkpoint is _queued_ — so between the throw and the checkpoint there is a window in which the driver was still doing success work:

| Seam | What the boolean caused | Rule now |
| --- | --- | --- |
| activation | A classified `prepare` failure returned `false`, which the wrapper read as an ordinary discard and retired the operation — making the queued `FAILED` entry stale, so `onError` might never fire | Retire on `SEAM_DISCARDED`/`SEAM_INVALIDATED` **only**. On a failure the operation stays live for its checkpoint. |
| release | `openResolution(command)` ran unconditionally, so the consumer could receive `onReorder` for a release whose committed presentation effect had thrown, racing the failure through the same queue | Execute the command **only** on `SEAM_COMMITTED`. |
| settlement | A `effect` that requested a hold and then threw still got sealed and armed, starting a runner for an already-failed settlement | On `SEAM_EFFECT_FAILED`, seal, then **discard every unarmed request** and arm nothing. |
| join | `spec.finalized(current)` ran after a classified target or renderer failure, and the committed frame still said `OUTCOME_ACCEPTED` — so `onFinish` fired for a drop about to be reported through `onError` | Always release presentation; **skip the terminal callback** after a consequential failure. |

That last row is a direct contradiction of the rule that a failed operation reports through `onError` only, and it is the reason **F-19 was not actually resolved** by catching throws. **The rule it contradicts is itself retracted by D-66**, and the row is a defect anyway for the reason that outlives it: the frame said `OUTCOME_ACCEPTED` for a drop the checkpoint was about to report as failed. Under D-66 that state is still wrong — what changed is that the answer is to make the frame tell the truth, not to publish nothing.

#### Every classification entrypoint latches

Throwing is not the only way a seam classifies. The contract also permits:

```ts
host.fail(stage, error);
return normally;
```

and an earlier driver had no state connecting that call to its result, so it returned `SEAM_COMMITTED` and **every continuation D-23 forbids ran anyway** — activation queued `START_COMMITTED`, release invoked `onReorder`, settlement armed its gate plan, an action's committed transition carried on (review 6, §2).

The kernel therefore keeps one private `seamFailureRequested` latch, cleared as each seam phase opens and set by `host.fail`. **A latched failure is indistinguishable from a throw at the driver boundary.** Enqueuing a checkpoint is not enough on its own: the checkpoint is queued, and the window before it applies is exactly what the latch closes.

```ts
const runCore = <P extends {}, C>(
  t: Transition<Part, P, C>,
  capability: C,
  stage: FailureStage,
): SeamOutcome => {
  begin(); // Object.assign(draft, current)
  let prepared: P | null;
  seamFailureRequested = false;
  inSeam = true;
  try {
    prepared = t.prepare(draft, capability);
  } catch (error) {
    fail(stage, error);
    return SEAM_PREPARE_FAILED; // nothing staged escaped
  } finally {
    inSeam = false;
  }

  if (seamFailureRequested) {
    return SEAM_PREPARE_FAILED;
  } // explicit fail
  if (prepared === null) {
    return SEAM_DISCARDED;
  } // draft abandoned

  if (!preparationValid()) {
    // reentrant destroy/cancel
    inSeam = true;
    try {
      t.rollback?.(prepared);
    } catch (error) {
      report(error);
    } finally {
      // never classified — see below
      inSeam = false;
    }
    return SEAM_INVALIDATED;
  }

  commit(); // swap two references
  seamFailureRequested = false;
  inSeam = true;
  try {
    t.effect(current, prepared, capability);
  } catch (error) {
    fail(stage, error); // classified, from the committed state
    return SEAM_EFFECT_FAILED;
  } finally {
    inSeam = false;
  }
  return seamFailureRequested ? SEAM_EFFECT_FAILED : SEAM_COMMITTED;
};
```

Non-transition seams get the same treatment through a `runLeaf` wrapper, so `moved`, `anchorTarget` and `finalized` all behave identically whether the behavior throws or calls `host.fail`.

Two things this makes explicit that the earlier sketch did not:

- **`effect` is wrapped.** Its throw was promised to be a classified failure, but nothing caught it, so under the queue contract it escaped to panic and destroyed the controller. It is now caught at the seam that owns the stage.
- **A `rollback` throw is a best-effort report, never classified.** `rollback` runs only when the operation is _already_ invalid; classifying its failure would open a transition against an operation the kernel has just decided to abandon.

Per seam:

| Seam | Discard | Failure policy |
| --- | --- | --- |
| `action` | Normal. Nothing published, operation continues. | Stage per tag (`INSERTION`, `PLACEHOLDER_MOVE`). |
| `activation` | **Retires the operation** — the kernel releases capture, disposes the lift and returns to `IDLE`; there is no such thing as a pending operation with no presentation. On `SEAM_COMMITTED` the kernel re-checks `preparationValid()` and only then dispatches `START_COMMITTED`. | `ACTIVATION`, and **no retirement** — the queued checkpoint owns it. |
| `release` | **Not expressible.** `prepare` returns `ResolutionCommand` — motion is already closed, so "changed my mind" has no meaning. A `prepare` that cannot build one **throws** (D-152). | `RELEASE`, the seam's own stage; the staged command is **not** executed. |
| `settlement` | **Not expressible.** `prepare` returns `PreparedSettlement`, and **throws** when there is no coherent settlement to prepare (D-152). | `RESOLUTION`, the seam's own stage; on an `effect` failure the gate plan is discarded unarmed. |

The last two close a hole the generic driver had: `release.prepare` returning `null` left a truthful but stranded `RELEASING` operation with no resolution, no failure and no retirement, and `settlement.prepare` returning `null` depended on the behavior having queued a failure first — which the kernel could not check, after the resolution payload was already consumed.

**Implemented (D-152): `SeamRejection` is deleted and both seams fail by throwing.** ~~`SeamRejection` is shared by both, because both are non-discardable seams that still need to say _this is a failure, at this stage_:~~ The hole the last two rows close is real and stays closed — `null` from either `prepare` is still not a way to fail — but a **throw** closes it as well as a returned record does, and does so the way the other four seams already do. `runPhase` catches and calls `context.fail(stage, raised)` with the seam's own stage, which is the stage all **eight** return sites named (the census said six; the two `SETTLED_REJECTED` arms built the shape as a bare literal and a search for the helper missed them); `host.fail` remains for a behavior that needs a different one; and `requestFailure` already states the equivalence — _a latched failure and a throw are the same event on this path too_ (D-49). What the union expressed was _these two seams may fail in a second way_, not _a seam may fail_. Record [`rejection-transport-claude.md`](../reviews/phase-23/rejection-transport-claude.md).

```ts
// Deleted 2026-08-28. Kept as the shape the two arms carried, so the rows above
// read against something.
type SeamRejection = Readonly<{ stage: FailureStage; error: unknown }>;
```

#### The staged value never outlives its transaction

A committed transition leaves its `Prepared` value in the driver's staging slot, for the seams whose staged value the _kernel_ needs after the seam returns — today only the release seam's `ResolutionCommand`. That slot is consume-and-clear, and cleared again as every seam opens. Two further rules make it impossible for a command to survive the transaction that produced it:

- **Staging is conditional on the preparation still being valid.** The assignment is deliberately _after_ `effect`, so nothing the effect triggers can observe or clear it — which is also exactly when a reentrant `destroy()` has already run. Clearing the slot inside teardown cannot help, because the write that repopulates it comes next. So a transition whose effect abandoned the operation stages `null`, and the release seam reads `null` on an otherwise committed outcome and **does not execute the command**: the consumer round-trip must not open for an operation the terminal barrier has retired. This is the same shape as the `SEAM_COMMITTED`-only rule above, one step later.
- **Every seam consumes its staged value or drops it.** The two seam policies drop it for their callers; the seams the kernel drives directly — settlement, the failure report, behavior actions — drop it themselves. Otherwise a later seam that commits _without_ staging anything would hand its caller the previous seam's command, which is the precise failure the clear-on-read exists to prevent. A value still sitting in the slot as the next seam opens is a bug in the seam that left it there, and is **reported in `DEV`** rather than silently dropped.

### Post-callback revalidation

A rule the reserve-before-call discipline does not cover on its own:

> **Reserving a resource before a reentrancy-capable callback protects only resources that already exist. A resource returned _from_ that callback needs its own stale-return disposal path.**

Two places this bites, at opposite ends of the lifecycle:

- **`admit`** runs consumer-supplied handle and visual resolvers during native dispatch, and a resolver can close over the already-returned controller and synchronously `destroy()` it. The kernel therefore rechecks terminal state **after `admit` returns** and before minting identity or acquiring anything. Without it, a terminal controller publishes a new operation.
- **`LandingStart`** can `destroy()` the controller and _then_ return a live handle. Teardown, running first, sees no published handle and retires the attempt; the arm code would then store a live runner on a stale attempt with nothing owning it. The kernel revalidates after `start` returns and, if the attempt is stale, **destroys the returned handle immediately, best-effort, and never publishes it**. That destruction happens after logical closure, and D-51 is what makes it legal: it is a **relinquishing invocation**, the sole member of D-37 (a)'s named list. Without that row D-37's finite liveness domain would be false in exactly the place it must not be — the kernel would either leak the runner (I-20, F-30) or breach its own quantifier, and **a finite domain with an unstated exception is not finite**. **This is the call site D-51's deferral clause governs**: reached after logical closure, it is part of physical teardown and defers with it under D-36. The join's `landing.destroy()` is not — same member, live controller, unchanged position.

The same shape applies to any future seam that returns a resource from a callback the consumer can reach.

### What this actually guarantees

| Tier | Property | Mechanism |
| --- | --- | --- |
| **A** | Preparation cannot mutate committed frame state | `prepare` never receives `current` |
| **A** | An effect cannot assign a **top-level** frame slot | `effect` receives `Readonly<Frame<Part>>` |
| **A** | The behavior cannot write kernel frame fields | `Draft<Part>` omits them, then re-adds them `readonly` |
| **A** | A post-commit failure cannot revert a committed transition | `effect` runs after the swap and has no way to express a revert |
| **A** | Release and settlement cannot discard | Non-nullable `prepare` return types |
| **B** | Revalidate-then-commit is never skipped | The kernel drives it; there is no behavior-callable `commit()` |
| **B** | A discarded transition's staged value reaches exactly one of `effect` or `rollback` | The driver branches; the behavior does not |
| **B** | A seam throw is classified, never a panic | Every `prepare`/`effect` call is wrapped by the driver |
| **B** | **A phase never opens while foreign code is on the stack** | Two enforcement points, at different levels: `drain` returns while `queue.running`, so every behavior- and consumer-facing entry appends instead of interrupting; and `refuseReentry` refuses at the driver, ahead of `begin()`. **Scoped to the foreign-code window, which is the whole of what `openStage` marks** (F-167): it is cleared before `runPhase` classifies, so it is not a general nesting interlock |
| **C** | Preparation performs no externally visible mutation | Discipline. `prepare` can call anything. |
| **C** | Frame _referents_ are immutable or replace-on-write | Discipline. `Readonly` is shallow — §04 §The shallow-copy contract. |
| **C** | Ownership transfers only at commit | Discipline. Physical acquisition inside `prepare` precedes the swap. |

**Non-reentrancy has two enforcement points and they are not redundant** (D-153). The queue's is the one that runs: a nested `dispatch`, `cancel`, `fail`, `destroy`, `done()` or resolution settling from inside a callback appends and returns, constantly, in ordinary operation. The driver's never runs — the eleven phase-opening call sites all sit in the action handler's call tree, so no behavior-facing entry can open a nested phase (F-85) — and it is kept because **it is what keeps that true**.

**The driver's point covers the window it marks, and no more** (F-167). `openStage` is set as a phase opens and cleared **before** `runPhase` classifies, so a phase opened from the classification path would not be refused. The guard is _is foreign code on the stack_, which is where a nested call can originate; reading it as _nothing may nest, ever_ claims coverage it does not have and was never written to have.

**Consumer code does run past the clear, and the other enforcement point is what covers it** (F-171). `context.notify` reaches the kernel's `notify`, then `spec.reportError`, then the consumer's `onError` — foreign code, outside the window, on the classification path. What stops a `dispatch` from there opening a nested phase is **`drain` returning while `queue.running`**, not `context.fail` enqueuing: `context.fail` covers only the classification the driver itself performs. Of the five `context.notify` sites in `seams.ts` exactly **one** is inside the window — `requestFailure`'s `UNCLASSIFIED` arm; `runPhase`'s two classification arms follow the clear, `runCore`'s `staged-unconsumed` precedes the assignment, and `requestFailure`'s second arm is guarded on `openStage === NO_STAGE`. ~~The two `context.notify` arms that D-152 routed onto that path are still inside the window~~ asserted the opposite of the paragraph's own point, and is withdrawn.

**The runtime is not widened for this**: the two points together already cover both halves — the window for the stack, the queue for anything the reporting path provokes — so a wider `openStage` would be machinery for a state nothing produces. The claim is a property of a call graph that no test holds; the guard fails loudly at the first edit that breaks it, where the alternative is silent. **What a nested phase actually does, measured rather than reasoned** (F-169): `begin()` refills the draft in place and `commit()` swaps, so the swaps cancel — nested from `prepare` **neither** transaction lands and the published frame is untouched; nested from `effect` the outer's committed frame is replaced wholesale by the inner's, while the staged command executed against it belongs to the outer. Both seams return `SEAM_COMMITTED` and neither path reports anything. Four other pieces of kernel state are written against this guarantee — the single `actionTag`/`actionArgument` slots, the phase-scoped `failureRequested` and `unclassifiedReason`, `runStamped`'s stamp-clearing `finally`, and `consumeStaged`'s clear-on-open — which is why it is a stated guarantee rather than an incidental property.

**`Readonly<Frame<Part>>` is shallow.** It prevents `current.insertion = x`; it does not prevent `current.insertion.index = 4`. Since `begin()` shallow-copies, both frames reference the same nested objects, so mutating a referent mutates committed state. That is why the shallow-copy contract exists, and why it is tier C for every part author including a custom behavior the kernel cannot inspect.

The third and fourth rows of tier C matter. **The kernel revalidates once, after `prepare` returns — not after every callback boundary inside it.** Probe 1's prose claimed per-boundary revalidation; its own trace shows the same single check. This model makes that check unforgettable, which is a real but smaller gain.

~~What makes tier C _vacuous for the sortable behavior_ is D-17 plus the placement of the placeholder insertion: after both, `activation.prepare` creates a detached element, measures, and returns it. It performs no externally visible mutation at all.~~

**D-39 reverses that, and the reversal is narrow.** The claim held only for the **default** placeholder, which the behavior creates itself. A consumer `placeholder` slot returns an element the **consumer** owns, and `prepare` writes library attributes, styles and the D-52 sizing onto it — a mutation that is externally visible in the only sense that matters, because the element outlives the discarded preparation. So `activation.rollback` is **required, not vacuous**, and I-17's "vacuous for the sortable behavior" is corrected with it. What survives is the smaller true statement: `prepare` performs no mutation of anything the **library** owns, and it inserts nothing into the document.

## `BehaviorSpec`

```ts
/**
 * What an admission member returns when it admits. (D-59, widened by D-165)
 *
 * ~~A bare `HTMLElement` is the common form and means `box === visual`, which
 * is `box(item) = visual(item)`'s default (D-43) written as the absence of a
 * choice rather than as a repeated one. The pair form names a separate
 * geometry source.~~ **D-165 makes it three roles.** The **item** is what the
 * operation is about and what a behavior's own plan visits and writes on; the
 * **visual** is what leaves flow and travels; the **box** is what the layout
 * loses. A bare `HTMLElement` is the common form and means
 * `item === box === visual`, which is `box(item) = visual(item)`'s default
 * (D-43) written as the absence of a choice rather than as a repeated one.
 * The object form names a separate geometry source and a separate item, and
 * all three members are required inside it so that *they are one element* has
 * exactly one encoding. Both admission members return this type — see
 * §Admission returns a subject for why the shape is settled here and why `box`
 * is required rather than optional inside the object form.
 *
 * The type read ~~`HTMLElement | Readonly<{ visual: HTMLElement; box:
 * HTMLElement }>`~~ until **D-165** added the item as a third required member.
 */
type AdmissionSubject =
  | HTMLElement
  | Readonly<{ visual: HTMLElement; box: HTMLElement; item: HTMLElement }>;

type BehaviorSpec<
  Part extends object,
  /**
   * What `activation.prepare` stages. Defaults to the `true` sentinel, so a
   * behavior that acquires nothing at activation says so; the sortable
   * behavior declares `HTMLElement` because it stages a detached placeholder.
   * (D-34)
   */
  Activation extends {} = true,
> = Readonly<{
  /* ---- the behavior's frame part (§04) ---- */
  /** `FramePartOf` rejects a part that declares a kernel frame key. */
  createFramePart(): FramePartOf<Part>;
  resetFramePart(frame: Part): void;

  /* ---- static configuration ---- */
  config: Readonly<{
    /** Activation travel in viewport pixels. The kernel owns the distance test. */
    threshold: number;
    /** Which lift strategy the kernel acquires at activation. */
    liftMode: number;
    /**
     * `readinessTimeout` was here until **D-41**. It bounded the
     * authored-presentation acknowledgement, and the serial authored commit
     * leaves that acknowledgement no producer — so the deadline it bounded has
     * nothing to expire. See §The serial authored commit.
     */
    /** How many behavior action tags exist. `arm()` validates it once and
     *  `dispatch` bounds-checks every tag against it. */
    actionTags: number;
  }>;

  /* ---- admission (native dispatch, not queued) ---- */
  /**
   * Runs synchronously inside `pointerdown`, after the kernel's own guards,
   * with the draft open. ~~Returns the element the kernel should lift —
   * optionally paired with the element the kernel should measure — or `null`
   * to leave the controller idle. (D-5, widened by D-59)~~ Returns the element
   * the kernel should lift when the item, the visual and the box are one
   * element, the three named separately when they are not, or `null` to leave
   * the controller idle. (D-5, widened by D-59 and D-165)
   *
   * `composedPath()` is valid here and nowhere else. **`preventDefault()` is
   * the kernel's** and an admission member must not call it itself (D-32,
   * C-03) — that ownership is unchanged.
   *
   * **What changed is where the kernel calls it.** ~~Exactly when an admission
   * member returns non-null.~~ D-54 moves the pointer path's call to the
   * **activation threshold crossing**, so an admitted press that never becomes
   * a drag consumes nothing. D-46 additionally narrows what may be admitted at
   * all: a press whose composed path reaches a `[data-drag-ignore]` region
   * **declines**, unless the consumer scoped dragging there (D-50). ~~an
   * interactive or editable descendant~~ — the element-type inference is
   * withdrawn (D-129). See §Input policy.
   */
  admit(event: PointerEvent, draft: Draft<Part>): AdmissionSubject | null;

  /**
   * Discrete, pointerless admission (D-32). Absent means the kernel binds no
   * second ingress listener and no discrete lifecycle exists — the I-9 shape:
   * an unused capability creates no work.
   */
  command?: CommandAdmission<Part>;

  /* ---- transactional seams ---- */
  activation: Transition<Part, Activation, ActivationScope>;
  release: ReleaseTransition<Part>;
  settlement: SettlementTransition<Part>;
  action: ActionTransition<Part>;

  /* ---- non-transactional seams ---- */
  /**
   * The committed pointer sample changed. The hot path.
   *
   * **The kernel wraps this call** and classifies a throw as
   * `FAILURE_RENDERER_WRITE`. It is not a transition, so without a wrapper a
   * CSSOM or scheduling throw escaped the handler and became a *panic* that
   * destroyed the controller — contradicting the existence of both
   * `FAILURE_RENDERER_WRITE` and `FAILURE_SCHEDULED_FRAME`, and diverging from
   * the shipped implementation's classified handling (review 6, §8).
   *
   * Rendering and scheduling stay **one callback with two stages**, narrowed
   * from the inside via `host.fail(FAILURE_SCHEDULED_FRAME, …)` rather than
   * split into two seams: splitting would add an indirect call to the one path
   * that counts them, and the failure latch makes the narrowing visible to the
   * driver anyway. If the render succeeded and only scheduling threw, the
   * committed pointer and the visual are still truthful and the checkpoint
   * chooses recovery from there.
   */
  moved(current: Readonly<Frame<Part>>, lift: BehaviorLiftSession): void;

  /**
   * Produce the viewport point the lifted visual should end at. (D-16, as
   * narrowed by D-41.)
   *
   * Called **once per settlement**, at arm — which, under the serial authored
   * commit, is after the consumer's DOM is final and after the library has
   * restored its own presentation invariants. There is no provisional call and
   * no advisory second call, so there is no `authoredReady` argument either.
   *
   * Whether to re-anchor still follows the **recovery**, which is the
   * behavior's own committed frame state and always was the clause that
   * decided it.
   *
   * **The result is borrowed** (D-144, F-123): both fields are read on return,
   * converted once into the origin-relative delta the settlement carries, and
   * the object is dropped. An implementation may therefore return one mutable
   * buffer per controller, and both first-party behaviors do — what it may not
   * do is write that buffer before its last call into foreign code.
   */
  anchorTarget(current: Readonly<Frame<Part>>): Point;

  /** Presentation is released and the landing gate is complete. Terminal callback. */
  finalized(current: Readonly<Frame<Part>>): void;

  /**
   * Forward the finished error to `onError`, and do nothing else (D-130).
   * ~~`reportFailure(stage: FailureStage, error: unknown)`.~~ The kernel builds
   * the public error and picks its class; a `DraggableWarning` means the
   * operation was not affected and its terminal still follows.
   */
  reportError(error: DraggableError | DraggableWarning): void;

  /** Drop per-operation references. Idempotent, best-effort. */
  retire(): void;
}>;
```

Thirteen top-level members plus one optional, ~18 functions once the transitions expand. Probe 1: fifteen. The count is still a wash; the difference is that each phase of each seam has one job.

**Two of those members ratify Part I deviations rather than deciding anything new.** `config.actionTags` and the reporting member have existed in the implementation since phases 4 and 5 and are described in this document's prose; the listing above simply stops disagreeing with it. The reporting member is load-bearing for D-32 — a throwing `command.admit` has exactly the Q-1 shape a throwing `admit` has — so leaving it out of the normative listing while the revision depends on it would be incoherent.

### Admission returns a subject, not an element (D-59)

**This is an SPI seam-signature change, and it is the second one in Revision 2** — the other is D-53's added `KernelHost` member. Revision 2 is a consumer-surface redesign, so a change that crosses into the SPI owes the freeze rule a failing executable case rather than a preference. "It repairs D-52" is not that case. The chain is:

```text
api-1 measured that NO single-window rule reproduces the removed
footprint in both nested cases
    → D-43 needs two measurement windows
    → the second window needs the box element BEFORE `acquireLift`
    → the only two carriers are the behavior's draft or admission's return
    → the draft form has the kernel read a behavior-authored field,
      contradicting H-2 and D-15
    → admission's return is what remains
```

The failing executable case is **api-1's**, and D-59 is where it lands. Every step after the first is forced: nothing in the chain is a choice between comparable options, which is what makes this a discharge rather than a justification.

**Why not the draft.** D-52's first form had the behavior stash `box` in its frame part for the kernel to read back. That contradicts **H-2** — _the kernel does not know, store, extend or type_ the behavior's part — and **D-15**, which exists precisely so the kernel cannot name behavior fields. The contradiction is not cosmetic: an exception here is the "kernel learns one sortable-shaped thing" defect Checkpoint C found four separate times, and it would have been the fifth. Widening the return keeps **D-5**'s principle verbatim — _the kernel gets what it needs from admission and nothing else_ — while changing the count from one thing to two. **The count is not the rule.**

**The spelling, settled here so 06 can follow it.**

| Form                                      | Verdict  |
| ----------------------------------------- | -------- |
| ~~`HTMLElement \| { visual, box } \| null`~~ **`HTMLElement \| { visual, box, item } \| null`** (D-165) | **this** |
| `{ visual, box? } \| null`                | rejected |
| `HTMLElement \| { visual, box? } \| null` | rejected |

Three reasons, in order of weight:

- **One spelling per meaning.** An optional `box` gives _"the box is the visual"_ two encodings — omit the key, or set it to the visual — and this document refuses that shape everywhere else it appears (`invoke: null` asserts a proven no-op _and nothing else_; `movePlaceholder` is _one canonical_ writer). Under the chosen form the bare element is the only way to say "same", and the pair is the only way to say "different". The pair with `box === visual` is legal, inert and pointless; that is tier-C discipline, not a second encoding the kernel must branch on.
- **The common case allocates nothing.** `box === visual` is the default and will be the overwhelming majority of admissions. The bare-element form is exactly what the reference behavior returns today, so the widening costs the common path zero allocations and zero edits. An always-object form would allocate on every press to express the absence of a choice.
- **It is additive.** Every existing `admit` returning an element still typechecks, so the SPI crossing costs no migration for a behavior that does not need a separate box.

**D-165 widens the object form again and leaves every reason above standing.** The item joins as a third **required** member, for the same *one spelling per meaning* reason `box` is required rather than optional: the bare element stays the only way to say *these are one element*, and the object form stays the only way to say they are not. The common case still allocates nothing, and the change is still additive for a behavior that separates none of the three. **Read _the pair_ above as _the object form_ from here on**: the reasons are unchanged, the cardinality in the name is not.

**Narrowing is realm-safe and is not `instanceof`.** The kernel discriminates with `'visual' in subject`. `instanceof HTMLElement` would be wrong here for a reason this document already contemplates: it is realm-sensitive, and `DOMRealm` exists in the landing context precisely because an element may come from another document. One property lookup, once per press.

**`null` is still the only way to decline, and that is load-bearing.** The widened admitting form has no falsy member — an `HTMLElement` is always truthy and the pair is an object — so `AdmissionSubject | null` stays unambiguous by type rather than by prose, which is the same property `Prepared extends {}` buys for the discard signal in `Transition`. The kernel's decline test is `subject === null`. Nothing else declines, `undefined` is unexpressible, and **I-32's "a declined admission leaves everything untouched" and the whole of D-46's policy route through that single value** — a second decline spelling would give the input policy two paths to keep total instead of one.

**Both admission members take the same shape.** `command.admit` returns `AdmissionSubject | null` identically. D-32's whole claim is a second _admission_ rather than a second _protocol_, and a keyboard-driven sortable removes exactly the same footprint and needs exactly the same two-window arithmetic. Giving the pointerless path a narrower return would make the box a pointer-path concept, which it is not.

### Seam-by-seam, for the sortable behavior

| Seam | Phase in | Phase out | What sortable does |
| --- | --- | --- | --- |
| `admit` | `IDLE` | `PENDING` | Resolve the pressed item against the published snapshot; **decline** if the composed path reaches a `[data-drag-ignore]` region (§Input policy, D-46, D-129), unless the consumer scoped dragging there (D-50); apply the `handle` slot; write `item`, `visual` and `snapshot` into its part; ~~**return the subject** — the visual (via the `visual` slot or identity), paired with the box (via the `box` slot) when the two differ (D-59).~~ **return the subject** — the bare item when the `visual` and `box` slots resolve to it, and the three named separately when any of them differs (D-59, D-165). |
| `activation.prepare` | `PENDING` | `ACTIVATING` | **Read `boxPost` first**, off `scope.box`, before anything else in the seam (D-52) — **one extent, `box.offsetHeight`** (F-58), and **skipped entirely when `box === visual`** (F-55). Create the placeholder **detached** (default mechanics or the `placeholder` slot), size it from the **removed footprint** — `width` is `scope.boxPre.width` always, `height` is `box === visual ? scope.boxPre.height : scope.boxPre.height − boxPost` — not the visual's offset box (D-43) — and return the element. No DOM insertion, no acquisition. The sizing writes land on an element the consumer may own, so they are **on D-39's rollback ledger**. **Insertion is branched on `draft.pointerId`**: a pointer operation seeds the home insertion; a pointerless one _preserves_ what `command.admit` wrote. See §The command destination. |
| `activation.effect` | `ACTIVATING` | — | Register removal on `scope.presentation`, **then** `item.after(placeholder)` — retained by D-43 on measurement, not by default; arm scroll/resize invalidation and the frame-task cancel on `scope.motion`; publish `rt.placeholder`, `rt.lift` and the per-operation `rt.view`; `slots.invalidateInsertion()`; `slots.onStart(item)` last. See §Post-commit ordering. |
| `activation.rollback` | — | — | Undo everything `prepare` wrote onto the staged placeholder — attributes, styles, sizing, state — and drop it. **Required, not vacuous** (D-39): the element may be consumer-owned and adoption never happened, so nothing else becomes responsible for it. |
| `moved` | `ACTIVE` | — | `lift.write(dx, dy)`; `spatialSeq += 1`; `frame.schedule(spatialSeq)`. **Kernel-wrapped** — see below. |
| `action.prepare(SPATIAL)` | `ACTIVE` | — | `slots.resolveInsertion(draft, rt.view)`; write `insertion`, or return `null`. |
| `action.effect(SPATIAL)` | — | — | `beforeMove` pipeline → placeholder DOM move (sole writer) → `slots.invalidateInsertion()` → `afterMove` pipeline. |
| `action.prepare(COLLECTION)` | any | — | **Stage only, and never discard.** Reconcile against the replacement, rebase the insertion into the draft where the phase allows it, and return a `PreparedCollection` — carrying `cancelReason` when the gap cannot survive. Nothing private is written here. |
| `action.effect(COLLECTION)` | — | — | Publish `rt.snapshot` and `rt.view.snapshot` from the staged value; `slots.invalidateInsertion()`; **then**, last, `host.cancel(staged.cancelReason)` if one was staged. |
| `release.prepare` | `RELEASING` | — | **Branched on `pointerId`.** _Pointer:_ `slots.invalidateInsertion()`; re-resolve the insertion synchronously from the committed release point; fall back to incumbent, then home. _Pointerless:_ no invalidation and **no spatial re-resolution** — the committed `insertion` is the answer, and a `null` one is a broken invariant, not a home fallback. Both then: build the immutable proposal — **whose `request` is the object the round-trip carries to the consumer**; write both; **return the `ResolutionCommand`** whose `invoke` closes over that exact request. |
| `release.effect` | — | — | Move the placeholder to the final gap — **both paths**. Then **branched on `pointerId`**: a _pointer_ release writes the committed pointer delta through `lift.write` (F-39); a _pointerless_ release performs **no lift write** at all, because there is no release sample and the visual has not moved since acquisition. The kernel executes the staged command afterwards. **Nothing is published for an acknowledgement to identify** — D-41 deleted the acknowledgement. |
| `settlement.prepare` | `RELEASING` | `SETTLING` | Map the discriminated `SettlementInput` exhaustively to `outcome`, `recovery`, `domain`. A non-resolution **throws** the library's own diagnostic and a rejected thenable **re-raises the consumer's rejection value verbatim** (D-152); either way the kernel classifies at `FAILURE_RESOLUTION`, the stage this seam is already open at. There is no gate plan to stage: the one remaining gate is requested in `effect`. |
| `settlement.effect` | — | — | _Request_ the one hold: `scope.holdForLanding(start)` when a `landing()` slot exists and recovery is not immediate. Nothing is armed here. |
| `anchorTarget` | `SETTLING` | — | Re-anchor when the recovery is destination; measure; return the point. **Once**, at arm. See §Landing. |
| `finalized` | `FINALIZING` | — | **`onEnd`, exactly once, for every operation whose `onStart` ran, on a live controller** (D-62 for the name, D-66 for the totality) — it publishes `current.domain` and nothing else. The failure path supplies a `canceled` result through `settlement.prepare`; an operation that failed **before** `onStart` supplies none and this publishes nothing (§No start, no terminal). It read "`onFinish` for accepted/no-op, `onCancel` for rejected/canceled" until Revision 2.1; the split is gone and the predicate that produced F-37 with it. The `failed` case **is** changed: it published nothing until D-66, which is what Q-14 resolved. |
| `retire` | → `IDLE` | — | Cancel the frame task, clear `pendingSpatial`, drop `placeholder` and `lift`, run feature retire hooks. (`pendingRequest` was here until D-41; nothing holds a request past the resolution now.) |

### Discrete admission — a second ingress, not a second protocol (D-32)

Probe [13a](../probes/13a-discrete-input.md) produced the failing executable case this document had been predicting since §`ActionTransition`. The gap it found is narrower than "keyboard does not fit": everything downstream of a live operation already works (13a P-1…P-3), and what is missing is confined to **ingress and admission**.

The load-bearing half of the case is not the absence of a pointer. It is that a command's **feasibility must be answered synchronously, inside the native listener**, so that `preventDefault()` is called only when the command is possible — an arrow key on an edge item must keep its native meaning. Every behavior-initiated entry in the frozen SPI is fire-and-forget: `dispatch` returns `void` and the decision would be made on the drain, after the listener returned (13a N-3).

```ts
type CommandAdmission<Part extends object> = Readonly<{
  /**
   * The event types the kernel binds on `root`, for the controller's life,
   * inside the same ingress abort that owns `pointerdown`. Static spec data:
   * `arm()` validates it once, exactly as it validates `config.actionTags`,
   * and refuses one shape — an entry colliding with the kernel's own pointer
   * ingress (D-118). **An empty array is a supported spelling of binding no
   * discrete listener**, identical to omitting this member.
   */
  types: readonly string[];

  /**
   * Runs synchronously inside the native listener, after the kernel's own
   * guards, with the draft open — the position `admit` occupies, and the only
   * position from which feasibility can still reach the producer.
   *
   * Returns the subject to lift, or `null` to decline. Declining is total: no
   * operation, no phase change, and the kernel does not prevent the default.
   *
   * The D-59 widening applies here identically, and `null` remains the single
   * decline value: a command lifts a visual and the footprint it removes is
   * measured from a box, so both admission members answer the same question
   * with the same type. See §Admission returns a subject.
   */
  admit(event: Event, draft: Draft<Part>): AdmissionSubject | null;
}>;
```

**Why this is one member and not a vocabulary.** Checkpoint C asks whether the lifecycle-intent vocabulary is the smallest one that works or has become a generic behavior-to-kernel protocol, which this document declined to reserve. The answer is that a _second admission_ is the whole requirement. The probe's candidate carried a staged `Prepared` from the listener to the release seam; that is not needed, because **`admit` already hands the behavior the open draft**, and a command's destination gap is ordinary behavior frame state (13a P-2). Routing it through the draft rather than a staged value is what keeps this change to one member — see §Where the four changes touch each other, below.

**The lifecycle a command runs, and what it reuses.**

```text
native listener (a declared type)
    refuse if closed, if an ingress transaction is already open, or if
      current.operation !== null                        ← first condition
    open the ingress queue boundary (enqueue without draining)
    begin()
    spec.command.admit(event, draft)     → AdmissionSubject, or null
        ← the behavior writes its own part: item, snapshot, destination gap,
          and answers feasibility with the return value alone
    null      → abandon; nothing committed; the default is NOT prevented
    non-null  → event.preventDefault()          ← the kernel's, not the
                                                    behavior's      [C-03]
                                                ← STILL HERE, and D-54 does not
                                                  move it: see §Input policy,
                                                  "the relocation is the pointer
                                                  path's"
                revalidate (D-26: a resolver may have destroyed the controller)
                mint identity; arm the cancellation channel only
                draft.phase = PENDING; draft.pointerId = -1
                commit()
                dispatch(ACTIVATE)
    close the boundary in a `finally`; drain once
```

From `ACTIVATE` on, nothing is new. The activation seam, `START_COMMITTED`, `RELEASE`, the resolution round-trip, settlement, the gates, the join and retirement are the same code the pointer path runs, which is what 13a P-3 established and what keeps the revision small.

Five rules make the pointerless half well defined:

- **No kernel geometry is derived from the pointer fields.** `originX/Y` and `pointerX/Y` stay at their admission values — zero — and nothing reads them. `ActivationScope.originRect` is measured from the _visual_ and is pointer-independent already, as are `box` and `boxPre` (D-59); the landing origin comes from the lift session (D-35). **This is a dependency, not a coincidence**: before D-35 the landing origin was `pointerX - originX`, which for a command would have been `(-originX, -originY)` — a landing that opens from off-screen. D-32 could not have been added correctly on its own.
- **`pointerId === -1` is normative, not a sentinel.** A committed operation whose `pointerId` is `-1` is _pointerless_: the kernel arms **no** pointer sample listeners and acquires **no** pointer capture for it, so `MOVE`, `UP` and `lostpointercapture` are structurally unreachable rather than defended by a comparison (13a R-4). Escape-to-cancel is armed exactly as for a press. This answers "what identity does a pointerless operation carry" without widening the kernel slice: identity is the `OperationIdentity` object it always was (D-11), and the frame stays seven fields.
- **`PENDING` is redefined**, from _admitted, below the activation threshold_ to **admitted, activation not yet committed**. The threshold test is a property of the pointer path, not of the phase. No ninth phase is introduced; a ninth phase would cost a column in the legality table, a case in every teardown and precedence path, and a trace, to express something two existing phases already express.
- **A command is one slot.** The kernel dispatches `RELEASE` once `START_COMMITTED` has run for a pointerless operation, because a command with no pointer has no other producer of a release. This is the shipped package's keyboard semantics and the ledger's retained behavior (§4). It is also the one thing this shape cannot express: a _multi-press_ keyboard drag — pick up, move with several arrows, drop — needs an operation that stays `ACTIVE` across further discrete events, and that is a new failing case, recorded in [00](00-index.md) §What would falsify this model rather than speculatively reserved here.
- **`preventDefault()` is the kernel's, and the behavior answers feasibility only.** The behavior decides _whether the command is possible_; the ingress owner performs the browser effect. For a **command** that call is still made in the listener, when the member returns non-null — D-54 moves the _pointer_ path's call to the threshold crossing and cannot move this one, because a `keydown` default cannot be prevented after its listener has returned. This is the ownership split that makes I-32 enforceable instead of aspirational: an earlier draft of this revision left the call to the behavior and then claimed as tier A that a declined admission leaves the event untouched, which a member holding the real `Event` can trivially violate (Checkpoint C, C-03).

  **The rule applies to `admit` too**, not only to `command.admit` — the _ownership_ half of that sentence stands, and D-46 does not touch it. The _observational_ half is **falsified**, and the original text follows so the claim and its refutation stay side by side:

  > ~~The reference behavior called `preventDefault()` itself, on the feasible path, immediately before returning the visual; moving the call one frame outward produces the same observable result for the same events, and makes one party responsible in both input modes.~~

  **Probe E ([`api-3-input-policy.md`](../probes/api-3-input-policy.md)) falsified it by observation.** "The same events" was the load-bearing phrase and it was wrong: admission fires on `pointerdown`, which is _before_ the activation threshold, so the set of events the kernel prevents is not the set of events that become drags. Of the ten cases the probe ran, **six consumed a native interaction with no drag ever activating** — `onStart` never fired, no placeholder was ever inserted, no reorder was ever requested (R-2). A press on a nested `<button>` lost `mousedown`, focus and `:focus-visible` while its `click` still fired live; a nested `<input type="text">` could not be focused and could not take a caret; a `contenteditable` produced no `beforeinput` at all. Moving the call outward is therefore not observationally neutral — it is exactly the act that spends a press on a drag that provably did not happen.

  What survives is that **one party is responsible in both input modes** — the repair changes the kernel's own call site and the kernel's own admission policy, never who makes the call. It is both halves: D-54 relocates the pointer path's call to the threshold crossing, and D-46 narrows what admission returns non-null for. Relocation alone leaves every above-threshold gesture wrong; the policy alone leaves every sub-threshold tap wrong. §Input policy states both and divides the probe's ten cases between them.

  A behavior that wants to swallow an event _without_ minting an operation has no first-class way to say so, and does not need one: it holds the `Event`. That is discipline the contract permits rather than a capability it grants, and it is the residue I-32 is honest about.

`arm()` rejects exactly one `command.types` shape: an entry the kernel binds for its own pointer ingress (`pointerdown`) — the construction-time `TypeError` policy of §[03](03-feature-composition.md) §Public option domains. **Four other shapes were once refused here and are now accepted** — a non-string entry and a duplicate entry (2026-08-22), then an empty array and an empty-string entry (D-118). An **empty array binds no discrete listener**, which is the state a behavior omitting the member already reaches, so it is a second spelling of it rather than a new one. An **empty-string entry** binds an ordinary, distinct listener for a type nothing dispatches: the author's discrete ingress is inert, the kernel's is untouched. Only the collision costs the kernel its own state, and only the collision survives.

#### The command destination — where it lives, and what must not touch it

D-32 says the destination gap travels in the draft, as ordinary behavior frame state, and that from `ACTIVATE` on the command reuses the pointer path. Both are true of the _kernel_. Neither was true of the **sortable seams** as this document specified them, and Checkpoint C pass 4 (C4-01) found the gap: the same normative activation seeded home unconditionally, and the same normative release re-resolved spatially from a pointer sample a command does not have. A command's destination was written into the draft and then destroyed twice.

Nothing about the SPI changes here. `pointerId` is already on the frame, already kernel-written, already normative as the pointerless discriminant (I-33), and already visible to the behavior through `Draft`'s readonly kernel slice. **The branch is the behavior's, and it is three seams** — `activation.prepare`, `release.prepare` and `release.effect`:

```text
activation.prepare
    pointer     draft.insertion = home insertion        ← the grab is the origin
    pointerless leave draft.insertion alone             ← command.admit wrote it

release.prepare
    pointer     invalidateInsertion(); resolveInsertion(draft, view)
                fall back: resolved → incumbent → home
    pointerless draft.insertion stands; no invalidation, no spatial resolve
                null here throws, never a home fallback (D-152)

release.effect
    both        movePlaceholder(view, insertion)     ← home becomes destination
    pointer     lift.write(pointerX - originX, pointerY - originY)
    pointerless — no lift write —
```

Three consequences worth stating, because each is a place the naive reading goes wrong:

- **Staleness is already handled, and not by a second validator.** Between the command's admission and its `ACTIVATE`, a queued `controller.invalidate()` carrying a new `items()` identity may land — the ingress boundary enqueues without draining and drains once admission commits (I-1). `action.prepare(COLLECTION)` already rebases a live insertion into the draft, and already stages a `cancelReason` when the gap cannot survive the replacement. So a command gap is either rebased or the operation is cancelled before release ever runs. Adding a command-specific revalidation would duplicate a mechanism that exists and is tested. **D-44 renames the producer, not the mechanism:** the replacement no longer arrives as an `updateItems(payload)` argument but is pulled from `items()` on invalidation, and only a **new array identity** takes the structural branch that reaches this action at all. A same-identity invalidation dirties geometry and never reconciles, so it cannot move a command gap.
- **`null` at a pointerless release is a broken invariant.** The pointer path's home fallback exists because a spatial resolve can legitimately find nothing. A command that reached `RELEASING` with no insertion has lost state the kernel guaranteed to carry, and reporting that as a home-gap reorder would tell the consumer a drop completed normally. This is the same rule `ResolutionCommand.invoke: null` already states for the no-op case.
- **The branch is where the insertion comes from, never how the proposal is built.** Both paths hand the same `insertion` to the same `buildReorderProposal` against the same snapshot. That is what makes 05's _"a keyboard and a pointer reorder to the same destination gap produce identical proposals"_ an assertion about one code path rather than a coincidence between two — and it is why that row is asserted directly in Phase 16 rather than inferred.

**`release.effect` branches too, and the branch is only the lift write.**

```text
release.effect
    both        movePlaceholder(view, insertion)     ← the same single writer
    pointer     lift.write(pointerX - originX, pointerY - originY)
                                                     ← the final sample  [F-39]
    pointerless — no lift write —
```

The placeholder move is unconditional: a command reorders, so its placeholder reaches the same final gap by the same writer. The lift write is not, and omitting it is not a shortcut — there is **no release sample to write**. The pointer scalars are still at their admission values, so `lift.write(pointerX - originX, …)` on that path would render `(0, 0)`… which happens to be where the visual already is, and would therefore look harmless while making the pointerless branch depend on the pointer fields it is defined not to read (§Discrete admission). The session then reports `(0, 0)` as the landing origin because nothing wrote it (D-35), and the landing travels from the item's grab box to the anchor of its new gap — the shipped keyboard behavior.

#### Feasibility is not the whole question, and R-5 is the proof

D-32 defines a command's admission as a **feasibility** answer: `keyboardInsertion` returns an insertion when a one-slot move exists, and `null` at a collection edge, and the kernel prevents the default exactly when the answer is non-null. §Discrete admission calls this "an arrow key on an edge item must keep its native meaning", and as far as it goes it is correct — probe E confirms the decline path is total (R-8's "what works correctly today").

**But feasibility is the wrong axis, and the probe measured the consequence.** Because the edge test is the _only_ test, the same key in the same field behaves differently depending on which row the field is in (R-5):

| Focus location | Key | `keydown.defaultPrevented` | `onStart` | Caret |
| --- | --- | --- | --- | --- |
| text input in row **0** (first) | `ArrowUp` | `false` | 0 | native |
| the same input | `ArrowDown` | `true` | 1 | frozen |
| `contenteditable` in row **7** (last) | `ArrowRight` | `false` | 0 | 5 → 6 |
| the same field | `ArrowLeft` | `true` | 1 | frozen |

A user editing text in the first row learns that Up works and Down does not, and **there is no rule here a consumer could document**. The asymmetry is not a bug in `keyboardInsertion` — the edge decline is right — it is evidence that a second, independent question was never asked: _what did the event land on_. D-46 adds it, at §Input policy, and the two questions compose in a fixed order: **target first, feasibility second.** Asking feasibility first is what produced the table above.

**D-129 keeps the question and changes its answer, and the table above is the honest way to see the cost.** For an **unmarked** field the target question now answers _the drag's_ on both ingresses, so every row of R-5 returns exactly as measured — Up works, Down does not, and the caret freezes on the feasible direction. For a **marked** one the whole region declines and all four rows read `false`/`0`/native. So the rule a consumer could not document is now one they write: **mark the field.** That is a different claim from D-46's — D-46 asserted the library could tell, D-129 asserts it cannot and says so — and R-5 is the measurement that makes the difference legible rather than a matter of taste.

**What this does not change.** D-32 adds **no** `KernelHost` member: no `activate`, no `move`, no ingress registration (13a N-2, N-5 stay unexpressible, and the probe's assertions still fail to compile). ~~The host does grow by one in this revision — `presentationCommitted`, from D-33.~~ **The attribution needs restating twice over.** D-41 deletes `presentationCommitted()` with the rest of the readiness protocol, so Phase 14's addition is gone; **D-53 then adds a different member** — the logical-liveness reader D-38 forces, since after that prohibition there was no sanctioned reading left. The net count is unchanged and the membership is not, which is the honest way to state it. **Neither addition is D-32's**, and that is the claim this paragraph exists to protect: a second input mode still costs the host nothing. The behavior still never drives a transition — `command.admit` returns a _value_, and the kernel mints, lifts, commits phases and owns the envelope exactly as it does for a press. H-3 is intact, and the queue's run-to-completion property is untouched because the discrete path adds a queue _boundary_, not a queue exception.

### Input policy (D-46, as revised by D-129)

Ownership of `preventDefault()` is settled and neither decision reopens it: the kernel calls it, once, exactly when an admission member returns non-null. What is settled here is the question that ownership left open — **when a member may return non-null at all** — and the reason it must be settled here rather than left to each behavior is that the consequence of returning non-null is a browser effect the behavior does not perform and cannot see.

The governing rule is one sentence and is unchanged:

> **Ingress must not consume interaction it does not use.**

**Two mechanisms serve it.** D-54 moves _when_ the pointer path prevents; the admission policy narrows _what_ may be admitted. D-46 wrote the second as an **inference from element type**, with a pointer table of fourteen selectors, a narrower command table of five, and an `isContentEditable` capability test. ~~That inference is the policy.~~ **D-129 withdraws it.** The policy is now one attribute:

> **A descendant is draggable by default. `[data-drag-ignore]` on any hop strictly before the resolved subject declines the interaction, and nothing else does.**

The tables and the capability test are gone from the code and from this section; what stays is everything D-46 decided that was not the inference — the governing rule, the total-decline mechanism, the order the command path asks its two questions in, the `isComposing` rule, the modifier convention, and D-50's precedence.

#### Why the inference was withdrawn

**The two tables could not both be right, and their difference was the evidence.** D-46 stated the command table as _narrower than the pointer one and not a simplification of it_, and defended the difference correctly: a `<button>` owns a press and owns no arrow key. But a rule that needs a different table per ingress is a rule about **what an element is for**, and the library does not know that. A `<button>` inside a row may be a delete affordance the user must be able to press, or decoration inside a drag surface; a `<span>` may be a chart that owns its own gestures. Neither the tag nor `isContentEditable` distinguishes them, so every table entry is right for some consumers and wrong for others, and the ones it is wrong for **have no way to say so** — the tables were library-internal, and the only escape hatch was `[data-drag-ignore]`, which the consumer already had to reach for.

**The cost is stated rather than absorbed, because it is real.** The behavior probe E measured as its sharpest case — one `ArrowRight` in a nested text input producing a complete accepted reorder `{from: 2, to: 3}` with the caret frozen — is reachable again for a consumer who marks nothing. It is recorded in `tests/sortable/input-policy.browser.test.ts`, by the row titled _should reorder from an unmarked nested text input_, field for field, rather than deleted with the rule that declined it. **What makes that acceptable is that it is now stateable**: the consumer marks the field, the test beside it proves the mark works on both ingresses, and the answer is one attribute rather than an enumeration the consumer cannot read, extend or override per element.

**D-54 carries more of probe E than it used to, and that is the largest part of the repair.** Six of the ten cases never crossed the activation threshold at all, and none of them was ever fixed by the decline: a sub-threshold tap on a nested `<button>`, `<a href>`, text input, range, `<select>` or `contenteditable` keeps its focus, caret, selection and form-control operation because nothing is prevented, not because the element was on a list. Those six are unaffected by D-129 and their snapshots did not move.

| Probe E case | Answered by | Because |
| --- | --- | --- |
| 1, 2, 6 — tap on `<button>`, `<a href>`, `contenteditable`; 3's focus half; 4's tap half | **D-54**, relocation | the press never crosses the threshold, so nothing is prevented and `mousedown`, focus and caret all survive |
| 5 — drag across prose | **D-46**, the modifier convention | both readings are consistent with the input and no evidence distinguishes them |
| 9 — IME composition | **D-46**, `isComposing` | a property of the keyboard event, so the test needs no target inspection |
| 3, 4's thumb-drag half, 7 — drag-select in a text input, slider thumb, arrow keys in a descendant | ~~**D-46**, decline~~ **the consumer, via `[data-drag-ignore]`** (D-129) | the gesture crosses the threshold or has none to cross, so the library must either infer intent or be told it — and D-129 chooses being told |
| 10 — `handle()` | unchanged; it remains an override (D-50), not the answer |  |

The mechanism has not changed and is still correct. Probe E's R-8 measured the decline path end to end: when an admission member returns `null`, `preventDefault()` is never called, `mousedown` fires, focus lands, the caret places, a range slider tracks, a `<select>` option selects, a `contenteditable` takes text, and the keyboard event keeps its native meaning. **Declining is total** — I-32 in [05](05-lifecycle-invariants.md) already says so. What D-129 changes is only which inputs reach it.

#### Both ingresses decline on an explicitly marked region

Default `admit` — pointer and command alike — returns `null` when the event's composed path, between the target and the resolved drag subject, reaches an element matching `[data-drag-ignore]`.

| Category | Members |
| --- | --- |
| explicit opt-out | any hop strictly before the resolved subject carrying `data-drag-ignore` |

~~form controls; activation; editing; media with controls.~~ **One row, and it is the row that was never a platform element.** The attribute pairs with the `data-drag-placeholder` the default placeholder already carries, and it now names every region a consumer wants left alone rather than only the ones no table could describe.

**One table for both ingresses, where D-46 had two.** The question the command path asks is no longer _does this element own this key_ — which needed the narrower list — but _did the consumer mark this region_, which is a statement about a region and not about a key. That is why D-46's own justification for the opt-out row appearing in both tables generalises to the whole policy.

**A marked region is not a prohibition.** The scan terminates at the resolved subject and never inspects it, so a `handle` resolving _into_ a marked region still admits (D-50, below) — which is what lets a consumer mark a rich-text block and put a grip inside it.

**`matches` is reached optionally, and that is a type test rather than a guard.** `composedPath()` yields documents, shadow roots and the window as well as elements; a `ShadowRoot` strictly before the subject is ordinary for any consumer with a shadow-DOM row, and it has no `matches`. `path[i].matches?.(…)` answers _is this an element that matches_ in one access, where `realm.isElement` would answer half of it more expensively.

**Explicit consumer scoping wins (D-50).** If a `handle` slot resolves the pressed element to a handle inside a marked region, the press admits: the consumer scoped dragging to that interaction on purpose. The scan runs between the event target and the **resolved subject**, so a handle narrows the path it walks. The consequence is that `handle()` stops being the _only_ descendant-scoping mechanism — the claim 03 carried — and becomes the **override** for a policy that now exists by default.

**This costs nothing on the admitted path.** The walk is the `composedPath()` traversal `resolveItem` already performs; the test is one `matches()` per hop on a path that terminates at the subject.

#### The pointer path prevents at activation, not at admission (D-54)

D-46 withdraws the admission call and names no replacement, which would leave nothing preventing the default at all. **The call moves to the activation threshold crossing.** Three consequences travel with it, and each is a consequence of moving it later rather than a pre-existing defect, so the policy has to carry all three:

- **A selection may already have started, and prevention cannot undo it.** What is prevented at the crossing is the `pointermove` that carried the drag past the threshold — selection extension, and the native drag-and-drop start where a browser fires one. The `pointerdown` has already been dispatched un-prevented, so the focus and the caret it produced are real and are supposed to be: that is the whole point of the relocation. What is _not_ wanted is the half-made selection the press began on its way to becoming a drag, so **at the crossing the library clears it explicitly.** Clearing is the only instrument available once the event that started it has returned.
- **The trailing `click` is suppressed, exactly once, in the capture phase.** `click` is generated from an un-prevented `pointerup` (probe E R-1), which is why link activation and ctrl/meta-click survived the old policy — and why, once a drag has actually activated, a drop that lands on an `<a href>` would navigate. After an **activated** drag the library suppresses one subsequent `click`, capture-phase, one-shot. Only after activation: a press that never became a drag must keep its click, which is the case R-2 shows the library was already getting right by accident.

##### The suppressor is ingress-shaped and armed at activation

It belongs to neither of the two sections that would naturally claim it, and forcing it into either would misstate its lifetime, so it is specified here:

| Question | Answer |
| --- | --- |
| armed when | the activation threshold is crossed — the same moment the `pointermove` is prevented |
| owned by | the **controller's ingress lifetime**, not the operation's |
| disarmed by | the first `click`, the next `pointerdown`, or teardown — whichever comes first |
| after a cancel | **still suppresses.** The browser synthesizes the `click` regardless, and a cancellation is a library verdict, not evidence the user meant to click |
| pointerless operations | never armed; a command produces no `click` |

**The lifetime is the load-bearing row.** The `click` arrives _after_ the operation ends — that is what makes it trailing — so an operation-scoped listener would be disposed before the event it exists to catch. Binding it to ingress is not a convenience: it is the only lifetime that outlives the operation and still dies with the controller. The three disarm conditions exist because a one-shot that never fires must not survive to eat an unrelated click: a press that begins a _new_ interaction is as good a signal that the old one is over as the click itself.

The cancel row is the one a reader will want to argue with. A drag cancelled after activation still had a real `pointerdown` on a real target, and the browser will still synthesize a `click` from the `pointerup`; suppressing only on the happy path would make an Escape-cancelled drag over a link navigate, which is the exact defect the suppressor exists to prevent.

- **Scroll suppression is `touch-action`, and is the consumer's.** It is CSS, set on the draggable region. `preventDefault()` on `pointerdown` was never a reliable scroll suppressor, and relocating it makes that plainer rather than newly true — treating the moved call as a scroll policy is how the touch story silently breaks.

**The relocation is the pointer path's, and D-54 is explicit that it does not reach `command.admit`.** A command has no threshold to relocate to — D-32 redefined `PENDING` as _activation not yet committed_ precisely because the threshold is a pointer-path property — and a `keydown` default cannot be prevented after its listener has returned. So `command.admit` keeps preventing in the listener, and that is sound rather than an exception: the pointer path needs a later call site because `pointerdown` cannot know intent, and the command path does not, because under D-46 its admission **is** the intent question. A non-null return already means the key was meant for the drag.

**Evidence limit, stated because the rule is unconditional.** Probe E is **Chromium and mouse only**. Touch adds long-press context menus and tap highlighting that admission's `preventDefault()` was also consuming, and nothing has measured what the relocation does to them. That is an **owed measurement**, recorded here rather than assumed away.

#### Command admission asks what the event landed on

The command's `admit` answers **two** questions, in this order:

```text
1. what did the event land on?      ← D-46. If the answer owns this key, decline.
2. is the move feasible?            ← D-32. keyboardInsertion, edges included.
```

Order is normative, and §Feasibility is not the whole question is the evidence for it — **and the order survives D-129 even though the disagreement it protected does not.** `resolveItem` still runs before `keyboardInsertion`, and it must, because the item is what feasibility is asked about. What is gone is the case where the two questions gave different answers for the same keystroke in different rows: that came from the command table, and with one attribute answering both ingresses there is no input a test can construct that distinguishes the orders. The order is normative and is no longer separately asserted (`tests/COVERAGE.md` §Input policy).

The first question's rule, stated so a consumer can document it:

- **A marked region keeps its keys.** An `input`, a `textarea`, a `contenteditable`, a `select`, a radio group, a range input, a media element with controls — each keeps every key it natively owns when the consumer marks it or an ancestor with `data-drag-ignore`, and none of them keeps any key when nothing is marked. ~~Probe E R-4's `{from: 2, to: 3}` from one `ArrowRight` at caret offset 5 is what the command table existed to prevent.~~ **It is reachable again by decision (D-129)**, is recorded rather than hidden, and the mark is what answers it.
- **`event.isComposing === true` never admits.** This is unconditional and is **not** a special case of the rule above — it is the one command-side test D-129 does not touch, because it is a property of the keyboard event rather than an inference about the target. It is checked first, on every declared command type, whatever the target and whatever is marked. Probe E R-7 established that composition is faithfully synthesizable — a real Chromium composition, `compositionstart` and `compositionupdate` observed, `input.value` `"にほ"`, `keydown.isComposing` `true` — and that the drag admitted anyway, reordering the collection while the user was mid-word and not interacting with the list at all. `isComposing` needs no target inspection, which is why withdrawing the target inference leaves it standing.

~~**The command table is narrower than the pointer one, and Phase R states it rather than deriving it.**~~ **Both tables are withdrawn (D-129), and the argument that separated them is why.** Phase R was right that the pointer list was the wrong list to reuse — a `button`, an `a[href]`, a `summary`, a `label` and a `progress` navigate by no arrow, and declining on them would silently remove keyboard reordering from a focused control inside a row, a false decline on exactly the accessibility path D-46 exists to protect. Two lists that disagree about the same element are two guesses about what that element is for, and the consumer is the only party who knows. So the opt-out row's own justification — _a consumer statement about a **region**, not about a key_ — is now the whole policy, and it is stated once for both ingresses at §Both ingresses decline on an explicitly marked region.

`Shift` is read as part of the first question, not as a modifier policy: `Shift+Arrow` inside a **marked** text input extends a selection because the whole region declines, and inside an unmarked one it reaches the drag like any other arrow. D-46 adds no other modifier reading; probe E R-6 recorded that `src/` reads none today, and the owner's direction does not reopen modifiers beyond selection.

#### Plain-text selection is requested, not inferred

A drag gesture across prose inside a draggable non-interactive region is, by construction, longer than the activation threshold, so it always crosses it (R-3). Both readings — "select this text" and "drag this row" — are consistent with the same input, and **no evidence in the probe distinguishes them**.

So the contract does not try. **A modifier requests native text selection; the absence of one means drag.** `Alt` is the default request. Held at `pointerdown`, admission declines and the press keeps its full native meaning by the ordinary decline path — one branch, no state, no gesture disambiguation window, no deferred `preventDefault()`.

The owner's direction is explicit that elaborate selection-intent detection is not to be built unless evidence requires it, and there is none: the alternative designs — deferring the prevention until the threshold, replaying a suppressed `mousedown`, or timing a press to guess intent — each add a state machine to the one path that runs on every press, to serve an intent the user can state in one keystroke.

#### `handle()` is a mitigation, not the accessibility answer

Probe E R-8 measured `handle()` against the same ten cases and it resolves **seven** of them completely — every pointer case and every keyboard-in-a-descendant case — because a press outside the resolved handle declines and the kernel then never prevents anything. That is a real result and it is why `handle()` stays.

**It is not the answer on its own, and the reason is a regression it introduces.** `resolveItem` requires the handle to be in the event's composed path, so once a handle is composed the keyboard command becomes reachable **only when focus is inside the handle** — and nothing in the library makes a handle focusable. Probe E had to set `grip.tabIndex = 0` by hand before `ArrowUp` from the grip admitted at all. So composing `handle()` **silently removes keyboard reordering** unless the consumer independently makes the grip focusable.

That is a stated consumer obligation, not a footnote: **a consumer composing `handle()` must make the grip focusable and labelled, or it has traded a correctness defect for an accessibility one.** The default policy above exists precisely so that the correctness defect has a fix that does not require the trade.

## The kernel tier's public vocabulary (D-68)

**The tier was not authorable from its own entry, and not marginally.** `BehaviorConfig.liftMode` requires a `LIFT_*` **value**; `settlement.prepare` requires the `SETTLED_*` values to discriminate the input D-66 travels on; D-66's own fallback requires `AT_PROPOSAL`/`AT_CONSUMER`. `kernel.js` published none of them, and no path under `kernel/` is a declared package export, so there was no supported specifier that reached them. The entry could **describe** a behavior and not **construct** one (F-59).

### The rule

> **A name is published at the kernel tier if and only if it is in the structural closure of `BehaviorFactory`, or the SPI hands a behavior a value whose domain it could not otherwise name.**

Three justification classes, and each one answers a different question. They are named because the list below is long enough that a reader will otherwise assume it was assembled by reachability alone.

| Class | Test | What it admits |
| --- | --- | --- |
| **P — produce** | the SPI demands a value the author must originate, and a closed constant union has no other spelling | `LIFT_*`, `SETTLED_*`, `AT_*` |
| **A — annotate** | the name types a position the author implements, stores or returns, and no already-public name expresses it | the type closure of `BehaviorFactory` |
| **I — interpret** | the kernel hands over a value whose legal domain has no public name | the eight phases ~~; `toDraggableError`~~ (deleted by D-132) |

**Minimality is a property of the declarations, not of the export list.** That is D-61's rule at the other rung, and `sortable/feature.js` already states it in the file: publishing a type publishes everything it structurally names, so the only ways to make this surface smaller are to make `BehaviorSpec` smaller or to accept its closure. D-68 accepts it and eliminates nothing, because every candidate for elimination is a name a behavior of the sortable's size writes out of line — `Disposer` at every `scope.use`, `FramePartOf` on `createFramePart`, `BehaviorInstall` on a hoisted `install()`, `KernelFrame` on any helper that reads the kernel slice.

**Published is not must-name.** A behavior whose seams sit inline in one object literal is contextually typed throughout and names **three to eight**: `draggable`, one `LIFT_*`, and the `SETTLED_*` arms it handles. A behavior whose seams live in their own modules names about **thirty**. Neither number is the size of the published list, and that gap is the reason the closure is published at all — so the second style is _possible_, not so anyone types it.

### The vocabulary

**Values — 35, and the count is derived from the table below rather than carried** (F-174, 2026-08-29). `1 + 12 + 3 + 5 + 2 + 4 + 8`, enumerated at runtime by importing `kernel.js`. ~~32, and 33 until D-132 deleted `toDraggableError`~~: that total was one high before D-154 as well — the table summed to 31 while the sentence said 32 — so the four cancel origins were added to a base nobody had re-derived. **The table has been right throughout; only the sentence drifted**, which is the argument for deriving the total from it rather than incrementing it. Erased types cannot carry any of these, which is the whole of F-59.

| Group | Names | Class |
| --- | --- | --- |
| Construction | `draggable` | — (shipped) |
| Failure stages — 12 | `FAILURE_ADMISSION` … `FAILURE_TERMINAL_CALLBACK` | shipped at D-64; **also published from `drag.js` since D-132**, one declaration and two publication points |
| Lift modes — 3 | `LIFT_FAITHFUL`, `LIFT_FLAT`, `LIFT_IN_PLACE` | **P** — `config.liftMode` is mandatory and has no default |
| Settlement inputs — 5 | `SETTLED_FULFILLED`, `SETTLED_REJECTED`, `SETTLED_SKIPPED`, `SETTLED_CANCELED`, `SETTLED_FAILED` | **P** — the behavior discriminates its own input, and D-24 requires the switch to be exhaustive |
| Cancel stages — 2 | `AT_PROPOSAL`, `AT_CONSUMER` | **P** — read from a `canceled` input, and **written** into D-66's fallback |
| Cancel origins — 4 | `CANCEL_SUPPLIED`, `CANCEL_ABORTED`, `CANCEL_INTERRUPTED`, `CANCEL_FAILED` | **P** — read from a `canceled` input, and `CANCEL_FAILED` is **written** into D-66's fallback, which is the one origin a behavior mints (D-154) |
| Phases — 8 | `IDLE`, `PENDING`, `ACTIVATING`, `ACTIVE`, `RELEASING`, `SETTLING`, `REPORTING`, `FINALIZING` | **I** — see §The phase is handed over, below |
| ~~Classification~~ | ~~`toDraggableError`~~ | **Deleted at D-132** — see §The mapping is library-owned, below |

**Types — 35, derived as `12 + 23`** (F-174, 2026-08-29). All erased. ~~Thirteen~~ **Twelve since D-152** are shipped (`ActivationScope`, `AdmissionSubject`, `BehaviorConfig`, `BehaviorFactory`, `BehaviorSpec`, `CommandAdmission`, `FailureStage`, `KernelHost`, `PreparedSettlement`, `ResolutionCommand`, ~~`SeamRejection`~~, `SettlementInput`, `SettlementScope`); ~~**twenty-two**~~ **twenty-three since D-154** are added.

**35 was the written total before D-154 too, and it was wrong then** — the two lists summed to 34. `CancelOrigin` makes the sentence true for the first time, and by re-derivation rather than by the addition landing on a correct base. The count is **descriptive, not normative**: the rule above is the contract, and the sentence below said what this correction is.

**The two additions were each ratified and neither updated this number.** `BehaviorLiftSession` is 07 §K-1's — _the type surface gains exactly `BehaviorLiftSession`_ — and `InheritedSpace` is D-85's, which says in as many words that it _publishes at `kernel.js` as part of the scope's closure (D-68)_. **So the rule held and the count did not**: both are reached through `ActivationScope`, which is exactly what the class-A test admits, and D-68's surface has never contained a name its own rule does not derive. What failed is that the rule is executable and the total is prose. `tests/kernel/vocabulary.node.test.ts` checks its list _against the entries_ and so tracked both additions silently; nothing anywhere compares either against a written total. **The count is therefore descriptive, not normative** — the rule above is the contract, and a future addition that satisfies it does not need this sentence's permission, only its correction.

| Group | Names | Reached through |
| --- | --- | --- |
| Frame | `Draft`, `Frame`, `KernelFrame`, `OperationIdentity`, `FramePartOf` | every seam signature; `createFramePart` |
| Seam envelopes | `Transition`, `ReleaseTransition`, `SettlementTransition`, `ActionTransition` | `BehaviorSpec`'s four transactional members |
| Construction | `BehaviorInstall` | `BehaviorFactory`'s return |
| Activation capability | `LifetimeScope`, `Disposer`, `VisualLiftSession`, **`BehaviorLiftSession`**, **`InheritedSpace`**, `OffsetBox` | `ActivationScope`; `moved` |
| Config | `LiftMode`, `Phase` | `BehaviorConfig.liftMode`; `KernelFrame.phase` |
| Settlement | `CancelStage`, **`CancelOrigin`**, `LandingStart`, `LandingContext`, `LandingHandle` | `SettlementInput`'s canceled arm; `SettlementScope.holdForLanding` |

**Four of these are re-homed, not added.** `Disposer`, `LandingStart`, `LandingContext` and `LandingHandle` are published at `sortable/feature.js` today, and `CancelStage`/`AT_*` at `sortable.js` — as `CancelOrigin` and its four values are, from the day they landed. Every one is declared in `src/kernel/`, so the tier that owns them is the kernel; each keeps its existing publication as a **re-export**, so no ordinary or middle-tier consumer loses a specifier. The direction matters and is the point of the correction: `SettlementScope.holdForLanding` is kernel SPI, so a kernel-tier author reaching `sortable/feature.js` for `LandingStart` is importing the sortable behavior in order to author a **non**-sortable behavior — the inversion D-48 and D-64 both exist to prevent, arrived at a third time and by a third route.

### What stays internal, and what an author does instead

The other half of the decision, and the half that keeps it from being a mechanical dump of `src/kernel/`. **The discriminating rule: the kernel never hands one of these to a behavior and never accepts one from it.**

| Not published | Substitute |
| --- | --- |
| `SeamOutcome`, `SEAM_*`, `SeamContext`, `SeamDriver`, `ArmOutcome` | none needed — the driver's own vocabulary. A behavior returns `Prepared \| null` — or, on a non-discardable seam, throws (D-152) — and never sees an outcome. **03 §Internal to the ordinary tier lists `SeamOutcome` and `ArmOutcome` as kernel-tier published; that is wrong and D-68 corrects it** — neither is in the closure |
| `Lifetime` (the full type), `createLifetime` | `LifetimeScope`, which is D-21's projection and exists precisely so `dispose` is unreachable |
| `composeFrame`, `beginFrame`, `scrubFrame`, `KERNEL_FRAME_KEYS` | none — the kernel composes the frame (D-15). A behavior authors its part and nothing else |
| `acquireLift`, `captureInlineStyles`, `acquireTopLayer` | the kernel acquires the lift; the behavior receives a **`BehaviorLiftSession`**, which is published for the same reason everything else on this list is not — the kernel hands one to every behavior twice, as `ActivationScope.lift` and as `moved`'s second argument. `VisualLiftSession` stays published because that alias's definition names it. (This row read _the behavior receives `VisualLiftSession`_ until D-35's projection landed; §`ActivationScope`, below, had been the correct spelling since C5-01.) |
| ~~`report`~~ (deleted, D-130), `createUnwind` | `host.fail(stage, error)` inside a seam. Outside one it is reported as a `DraggableWarning`, which is the same destination — there is only one |
| `createInvalidator`, `createFrameTask`, `FrameTask`, `Invalidator` | `realm.window` — scheduling is the behavior's own, and `FAILURE_SCHEDULED_FRAME` exists so it can classify its own coalescing |
| `POINTER_DOWN`, `KEY_DOWN` and the rest of `protocol.ts` | string literals. `CommandAdmission.types` is `readonly string[]` |
| `pathOwnsInteraction` (~~`POINTER_OWNERS`, `COMMAND_OWNERS`~~, deleted by D-129) | **none, and this is a stated cost** — see below |

**`__DEV__` is not on this table, and the omission is the decision (D-101).** The build-time flag is declared in `src/globals.d.ts` at **package scope**, not in `kernel/`. ~~`kernel/dev.ts`~~'s `DEV` was the kernel's own local binding of it and stayed internal — **the kernel binds it nowhere since D-108**, whose author-facing checks are production checks; the package's one binding is `src/sortable/rect-index.ts`'s. Either way it is not a name the behavior tier substitutes for, because there is nothing to substitute: **each tier binds the ambient itself**, and neither reaches the other. So `DEV` belongs in neither column. Adding it to the internal groups would assert that the behavior tier reaches into `kernel/` for it, which is exactly what must not happen; publishing it would put a flag with no runtime meaning into the vocabulary a third-party behavior compiles against.

**The discriminating rule still applies and still gives the same answer.** A third-party behavior author has no `__DEV__` define unless they configure one, so the ambient is not something the tier boundary hands over in either direction — it is a property of _this package's_ build, and `src/globals.d.ts` states that a missing define must fail loudly at import rather than silently ship the assertions. **A second behavior-tier site in a second module is what triggers a tier-local binding module inside `sortable/`**, which is the behavior tier's own binding and still imports nothing from `kernel/` — and there is no longer a kernel-tier binding for it to import.

**The input-policy helper is the one honest gap, and D-129 makes it a smaller one.** D-46's policy is behavior-owned by construction — the kernel binds ingress and the behavior answers — and a canvas or a free-drag behavior may legitimately want a different one. A third-party behavior that wants _the library's_ policy must reimplement it, and D-46 §`handle()` is a mitigation is explicit that getting this wrong is an accessibility defect rather than a cosmetic one. ~~It must reimplement the interactive/editable descendant walk~~ — since D-129 what it must reimplement is a loop that reads one attribute, which is four lines and is fully specified at §Both ingresses decline on an explicitly marked region. **Publishing it is still not decided here**: it is a policy helper rather than SPI vocabulary, nothing in the closure names it, and shipping a runtime helper at the kernel tier is an addition with a bundle consequence that this decision otherwise does not have. Recorded as a candidate for a later `kernel/policy.js`, owner's call, and flagged in the handoff rather than absorbed.

### The phase is handed over, so its domain is published

`Draft` and `Frame` carry `phase`, and a behavior reads it: the reference behavior tests it in three places, all of them in seams the kernel calls at times the behavior cannot predict — `command.admit` on any bound event, and `action.prepare` on a collection replacement that may arrive in any phase. `KernelHost.closed` answers liveness (D-53) and does not answer _where in the operation this is_.

So the constants ship, all eight. A partial export would reintroduce the defect 03 §The export topology names in as many words — **a numeric union whose members are unnameable is not a public type** — and ordering tests like `phase >= RELEASING` are only meaningful over the whole vocabulary.

**And `KernelFrame.phase` narrows from `number` to `Phase`.** Same argument that made `FailureStage` a closed union rather than a bare `number`: a participant should not be able to forge an invalid or kernel-private value, and the behavior only ever reads this one. The kernel's internal `stamp` becomes `Phase | typeof NO_STAMP`, which narrows correctly at the one write site through the sentinel test already there. **Cost:** the eight-phase vocabulary acquires a versioning promise. D-14 has carried it verbatim since probe 1 and through two revisions, which is as much evidence of stability as anything in this contract has.

### ~~The mapping is library-owned, so the library publishes it~~ There is no mapping

~~D-64 requires the stage → code mapping to be **total and library-owned**. Publishing thirteen stages and a four-member `DraggableErrorCode` without the mapping between them makes the second half false: each behavior would re-own the mapping, and `code` — the thing an ordinary consumer switches on — would mean something different depending on which behavior raised it, with nothing in the type system to notice. `toDraggableError(stage, error)` is therefore published at the kernel tier, the one entry on this list justified by an **obligation** rather than by expressibility.~~

**Retired in two steps, and the order matters.** D-130 made the **kernel** the only constructor of a public error, which removes the divergence risk _structurally_ rather than by publishing a mapping — a behavior cannot re-own what it cannot build. That left `toDraggableError` unpublished but alive, doing one remaining job: turning twelve stages into four codes. D-132 then deleted the codes, and the function with them.

**So this section's obligation is discharged, not abandoned.** The concern was real — one vocabulary meaning different things depending on which behavior raised it — and the answer is now construction ownership plus a single vocabulary, which is stronger than a published mapping over two. Nothing on this list is justified by an obligation any more; every entry is there because a behavior must name it.

### Self-contained, defined

**`kernel.js` and `drag.js`, with no deep path and no import from another tier.** `drag.js` is not a tier — §The public/internal boundary in [03](03-feature-composition.md) has it spanning all three — so an author reaching it reaches sideways. Reaching `sortable.js` or `sortable/feature.js` is the inversion above.

This says nothing about whether `drag.js` survives as a root; see 00 §D-68 §What self-contained means, and what it does not settle.

## Post-commit ordering

`prepare` gets rollback. An `effect` does not: it runs after the swap, and a throw inside it opens a _new_ failure transition from the committed state (I-18). So a partially completed effect must never leave a resource that is externally visible but not yet owned by cleanup.

**The rule, for every `effect`, in this order:**

```text
1. register the release      — for each resource, before it can be observed
2. make it externally visible
3. publish private-runtime references
4. invoke consumer callbacks — last, because they may cancel or destroy
```

Applied to `activation.effect`:

```ts
// 1 → 2, per resource. Registering first is free: removing a detached node
// is a no-op, so an over-eager disposer can never over-release.
scope.presentation.use(() => placeholder.remove());
item.after(placeholder);

// listeners bound to `motion.signal` are self-releasing, so the signal *is*
// the registration; the explicit disposer cancels a scheduled frame
scope.motion.use(() => rt.frame.cancel());
invalidate(scope.motion.signal, () => slots.invalidateInsertion());

// 3 — every resource above is now owned
rt.placeholder = placeholder;
rt.lift = scope.lift;
rt.view = { realm, placeholder, snapshot: current.snapshot };
slots.invalidateInsertion();

// 4
slots.onStart(item);
```

`rt.frame` is **not** created here. The coalesced frame task is created once per _controller_, at behavior construction, and cancelled on retirement and destroy (review 4, §3). Nothing in the earlier draft created it at all, which made the first active pointer move a null dereference. Per-controller is chosen over per-operation because it removes both the nullability and an allocation from the activation path, and the task's identity is never operation-scoped — staleness is carried by the monotonic spatial attempt number it schedules.

`rt.view` **is** per-operation. It is the object both feature views bind to, and it exists because they need a non-null `placeholder`, which a controller-lifetime runtime cannot promise before activation (§[03](03-feature-composition.md) §Consumer-declared views). One small object per drag, written twice per operation, never per call.

Why each step sits where it does:

- **Registration before insertion.** If registration or any later step throws once the placeholder is in the DOM but unregistered, the operation fails with a visible orphan the presentation lifetime does not own. Reversing the two costs nothing.
- **The anchor is `item.after(placeholder)`, and it survived Revision 2 on evidence.** D-43 reopened it — `box()` and `visual()` become separate, so `box.after(placeholder)` was the obvious alternative anchor for the geometry source — and api-1 ([`api-1-box-anchor.md`](../probes/api-1-box-anchor.md)) **measured the two as byte-identical under `display: contents`**. There is no case in which the box anchor places the footprint differently, so the anchoring is retained because it was tested against its replacement, not because nobody proposed one. The copied `slot` attribute stays for the same reason: without it a slotted layout does not render the placeholder at all. D-27's rationale is unchanged and now has a measurement under it.
- **Private references after all registrations.** `rt.placeholder` and `rt.lift` are how `retire()` and the feature hooks find their targets. Publishing them before ownership is established would let a throw produce a runtime that points at resources nothing will release.
- **Validation between insertion and publication.** `after()` _connects_ the placeholder, and a custom element's `connectedCallback` runs synchronously inside that call. It is consumer code reached from a plain DOM write, so no seam wraps it and no reentrancy guard sees it — and it can remove the placeholder, move it, or reparent the item. The reentrant-`destroy()` check already sits here; it is not enough on its own, because a `connectedCallback` that only rearranges the DOM leaves the controller alive and nothing downstream knows the footprint is wrong.

  So the effect **validates that the insertion took** before publishing runtime state or notifying: the placeholder is connected, and it is still the item's next element sibling. Two conjuncts, each catching what the other cannot — adjacency already implies same-parent, so a separate parentage test would be unfalsifiable, but adjacency holds inside a detached fragment too, so connectivity is not implied by it. Failing it is `FAILURE_ACTIVATION` from the committed state: the placeholder disposer registered in step 1 removes the element, nothing is published, `onStart` never runs, and the consumer learns through `onError` with the activation stage. Everything after this point assumes the insertion took — `placeholderAt` reads siblings, `movePlaceholder` relocates relative to them, the landing measures a rect — so it is checked rather than assumed and repaired later.

- **Consumer callbacks last.** `onStart` may reentrantly `cancel()` or `destroy()`. Everything must be owned before that becomes possible, or teardown races an incomplete effect.

This is **I-29's sibling, I-30**, and it is tier C — the API does not enforce ordering inside an effect. It is stated here because it is the one place where post-commit failure has a non-obvious correct answer.

### I-31 — once a start is notified, exactly one terminal callback follows

**D-40 qualifies the heading, and the qualification is a clause, not a caveat.** The invariant reads:

> If `onStart` fires **and the controller remains alive**, the operation eventually produces one terminal `onEnd`.

`destroy()` terminates the **subscription relationship itself** and publishes no later terminal. That is not a missed terminal: there is no longer a party to publish one to, and inventing a synthetic `onEnd` at teardown would tell a consumer that has just torn itself down to run its own unwind. The pairing is between a live subscription's start and its end, and `destroy()` ends the subscription.

**This is a second gap, not the one recorded below.** The two are different in kind and both are stated so neither is mistaken for the other:

|  | Cause | Terminal | Consumer's position |
| --- | --- | --- | --- |
| **D-40's clause** | `destroy()` after `onStart` | none, by design | the consumer asked for it, on its own stack |
| **the admitted gap below** | two faults in `activation.effect` | one, for an unnotified start | the consumer was told nothing and then told it ended |

The gap below is a terminal callback with **no** start; D-40's clause is a start with **no** terminal, and it is deliberate. Neither subsumes the other, and the invariant table in [05](05-lifecycle-invariants.md) carries both rows.

`onStart` is **post-commit**, not a preview: it runs inside `activation.effect`, after `ACTIVATING` is committed, the placeholder is in the DOM and the lift is acquired. A cancellation raised from inside it — directly, or by a collection replacement that invalidates the gap — therefore **settles as canceled** rather than retiring the operation silently, at stage `AT_PROPOSAL` and with a null proposal. The phase table above says so; this says why.

An earlier draft abandoned `ACTIVATING` cancels with no callbacks, on the grounds that there was "nothing to tell the consumer about yet". That is true at `PENDING`, which still retires, and false here: the consumer has been told a drag began, and abandoning leaves it with state to unwind and no event that says to unwind it. Settling costs nothing structurally — nothing is un-committed, and the settlement transition stamps `SETTLING` from whatever phase preceded it.

**The one admitted gap.** A cancellation latched from a custom placeholder's `connectedCallback` — which runs synchronously inside `item.after(placeholder)`, _before_ the start notification — combined with a `slots.invalidateInsertion()` that then throws, produces a terminal callback for a drag whose start was never notified. Both faults are required: alone, the first still reaches `onStart` and the second reports its own classified failure. Recorded rather than closed, because closing it means carrying a per-operation "started" flag for a two-fault path that already reports through the error channel.

## Capabilities passed at call time

The kernel grants exactly what a seam needs, as arguments. Behavior code _can_ stash one — nothing stops it retaining an `ActivationScope` — so the guarantee is not "it cannot be kept" but that a retained capability is **inert or self-reporting** once its operation ends. That holds for the two lifetime-shaped ones: a `LifetimeScope` whose lifetime has disposed invokes a late `use()` disposer immediately, and a `SettlementScope` past sealing ignores and reports a late hold.

**It does not hold for `BehaviorLiftSession.write`, and this document previously implied it did** (Checkpoint C, C6-01). A retained `write` stays callable and stays effective: it composes against the session's base transform and assigns, with no phase test and no operation check. Calling it after `LandingContext.from` has been sampled fights the landing runner for the same property; calling it after retirement writes a transform onto an element the kernel no longer manages. Neither is refused, and **the kernel will not refuse them** — see §The temporal rule on `write` under §The landing origin for why a guard is the wrong instrument here.

So the honest statement is: **two of the three retained capabilities are late-use-safe; the lift capability is governed by a temporal rule instead.**

### `ActivationScope`

```ts
/** The same physical `Lifetime`, with `dispose` projected away. */
type LifetimeScope = Readonly<Pick<Lifetime, 'signal' | 'use' | 'useWhile'>>;

/**
 * The same physical `VisualLiftSession`, **positively projected** to the four
 * members a behavior may use. `rendered` and `dispose` are kernel-only.
 */
type BehaviorLiftSession = Readonly<
  Pick<VisualLiftSession, 'visual' | 'baseTransform' | 'compose' | 'write'>
>;

/**
 * The inverse inherited linear part, or `null` for the identity, a singular
 * space, or a non-finite one — `null` means *the local delta is the viewport
 * delta*, which is the right answer for an untransformed ancestry and the
 * honest one for a space that cannot be inverted. (D-85)
 */
type InheritedSpace = Readonly<{
  a: number;
  b: number;
  c: number;
  d: number;
}> | null;

type ActivationScope = Readonly<{
  /**
   * The element the kernel is lifting — what `admit` returned as the `visual`
   * member of its subject, or the element itself when it returned a bare one,
   * which names it as the item and the box as well (D-59, D-165).
   */
  visual: HTMLElement;
  /** Its viewport rect at grab. Basis for every landing measurement. */
  originRect: DOMRectReadOnly;
  /**
   * The geometry source — what `admit` returned as the ~~box half~~ `box`
   * member of its subject, or `visual` when it returned a bare element (D-59,
   * renamed with D-165's third member). Held by the
   * kernel from admission, never read out of the behavior's frame part.
   */
  box: HTMLElement;
  /**
   * `box`'s offset box, read by the kernel beside `originRect` and before
   * `acquireLift`. (D-43, D-52)
   *
   * **An offset box, not a `DOMRectReadOnly`** — corrected during
   * implementation (F-55), because D-43's own rationale demands it: a running
   * translate corrupts a bounding rect's top by the full travel and leaves its
   * height alone, so the two windows are only comparable as
   * `offsetWidth`/`offsetHeight`. It is therefore **not** the same read as
   * `originRect`, which is and stays the visual's bounding rect at grab; the
   * earlier claim that the two coincide under `box === visual` conflated a
   * bounding rect with an offset box.
   *
   * No position, deliberately: the windows are only ever subtracted.
   *
   * The **second** window is not here: `boxPost` is the behavior's own read of
   * `box.offsetHeight` — **one extent** (F-58) — at the top of
   * `activation.prepare`, **skipped when `box === visual`**. The width is never
   * subtracted, so this pair is still an `OffsetBox`: the `width` is consumed
   * whole. See §The footprint needs two windows.
   */
  boxPre: OffsetBox;
  /**
   * The inverse of the linear part the visual **inherits** — everything
   * strictly above it, its own transform and zoom excluded — or `null` for the
   * identity, which is the common case. (D-85)
   *
   * ~~**Derived from the measurement `acquireLift` has already taken, before
   * it mutates anything.** No second traversal, no DOM read, no `Box` crossing
   * the seam: the kernel reads four coefficients out of the buffer it filled,
   * and a behavior that needs a local delta multiplies rather than
   * measures.~~ **Read before `acquireLift` mutates anything**, from a
   * first-class ancestry value the kernel takes for this element and no other
   * (D-165). No layout-facing read and no `Box` crosses the seam; a behavior
   * that needs a local delta multiplies rather than measures. The walk itself
   * is no longer shared with the measurement — D-165 spends that property
   * deliberately, once per lift, to obtain the item's space without a boundary.
   *
   * **Not the same value as the lift session's own projection**, and the two
   * must never be conflated: `compose`'s is the space an *in-place* translate
   * acts in and is `null` for both lifted modes, because a lifted visual is
   * repositioned into the viewport. This one is a fact about the **ancestry at
   * grab** and is computed for every mode.
   *
   * **A delta, never a point.** The linear part alone maps a delta; a point
   * would additionally need the translation, and box-quad exposes none (D-72).
   *
   * The member was one and was named ~~`inheritedSpace`~~ until **D-165** split
   * it, because which element a `translate` is written on decides which space
   * it is spent in.
   */
  visualSpace: InheritedSpace;
  /**
   * The same inverse for the space above the **item**, or `null` for the
   * identity. (D-165)
   *
   * A behavior displacing the item's siblings writes `translate` on items, not
   * on visuals. Where `visual` resolves to a descendant of the item the two
   * spaces differ by every linear contribution between them, the item's own
   * included, so publishing one value for both would divide a transform out of
   * a delta it was never in.
   *
   * **The same object as `visualSpace` whenever the item is the visual**,
   * which is the default: the kernel reads one ancestry and shares one buffer,
   * so the identity is object identity rather than agreement.
   */
  itemSpace: InheritedSpace;
  /** The lift capability. The behavior keeps it for `moved`. */
  lift: BehaviorLiftSession;
  /** Closed at release, cancel, destroy, panic. */
  motion: LifetimeScope;
  /** Closed at finalization, after the landing gate. */
  presentation: LifetimeScope;
}>;
```

#### Why the inherited space is on the scope and not on the session (D-85, D-165, E-01)

~~Why `inheritedSpace` is on the scope and not on the session (D-85, E-01)~~ — the heading named the single field **D-165** split; the placement argument below is unchanged by that split and applies to both members.

The review proposed carrying it "most naturally through `BehaviorLiftSession`". **It is the wrong home, on three counts, and the third is a live trap.**

- **The session is a `Pick`, positively selected**, so a member added to it must first be added to `VisualLiftSession` — putting a pre-lift ancestry fact inside the post-lift _write_ capability, whose whole documented purpose is what a behavior may do to the visual **after** acquisition.
- **The lifetime is wrong.** Every other member of the session describes the lifted state; this describes the state acquisition destroyed. A behavior reading it off the session would reasonably expect it to track `write`.
- **The session already holds a projection with the same four fields and the same arithmetic, and a different value** — `compose`'s, which is `null` for both lifted modes by design. Two projections in one object, one mode-dependent and one not, is a defect waiting to be written; and reusing the existing one would hand free drag the identity under `LIFT_FLAT`, which is silently wrong rather than loudly wrong.

`ActivationScope` is where the other pre-lift facts already live — `originRect` and `boxPre` are both measured before acquisition and handed down for exactly this reason. ~~The new member joins them~~ **The two members join them** — `visualSpace` and `itemSpace` since D-165 — and the rule the scope already follows extends unchanged: **the kernel measures, the behavior derives.** ~~The four coefficients are a fact about the visual's ancestry~~ **Each set of four coefficients is a fact about one element's ancestry**, the visual's and the item's, not about any behavior's geometry, which is what keeps this an SPI addition rather than a behavior-specific one. The argument above is indifferent to the count: every count of it holds member by member.

~~**One failure policy, because there is now one read.** `acquireLift` already throws `FAILURE_ACTIVATION` for an unreadable space, and the projection derives from that same successful measurement — so _unreadable_ cannot diverge. Singular and non-finite spaces resolve to `null`, the identity, which the kernel already does for the in-place case. The split policy E-01 found — one read refusing what the other silently substituted — has no second read left to disagree with.~~

**One failure policy, and the count of reads was never what secured it.** What E-01 found was two _policies_, not two reads: `acquireLift` refused an unreadable space while the behavior's own `captureLocalSpace` silently substituted the identity. Deleting the behavior's traversal is what closed the split, and no reading outside `acquireLift` has existed since. **D-165 therefore does not reopen it, and it does add a read**: the kernel takes the visual's ancestry, the item's when the two are different elements, and the visual's box measured through the first — three observations, one policy. Any of them failing throws, the caller classifies `FAILURE_ACTIVATION`, and a singular or non-finite space resolves to `null`, the identity, exactly as the in-place case already did. The reads are all taken before anything is mutated, which is D-85's actual acceptance ground and is what a later traversal would break.

**The lift is projected for the same reason the lifetime is** (Checkpoint C, C5-01). An earlier version of this revision handed the behavior the whole `VisualLiftSession` and asserted in prose that `rendered` was "kernel-read only" and that the kernel owned disposal. Neither was true of the type. `dispose()` in particular is not a reading hazard but a **sequencing** one: a behavior that calls it from `activation.effect` or `moved` restores the inline-style lease — and, in a lifted mode, the top-layer lease — while the session's recorded delta still describes its last `write`. The landing then samples `from` for a visual that is no longer lifted. That is I-34 broken **through a first-class SPI method**, not through a documented residue, and the difference matters: a residue is a rule the contract states and a participant may break, while this was the API handing out the thing it claims to own.

The projection removes `rendered` and `dispose`. It does **not** remove the two residues that remain, and this section no longer claims a count: writing `visual.style.transform` directly, and calling `write` outside its window (§The temporal rule on `write`).

The projection is a type-level `Pick`; the kernel passes the _same physical object_ under the narrower type, so it costs no allocation — the identical argument (§What stays internal) already makes for `Lifetime`.

**Positively selected, not `Omit`-ed.** The list says what a behavior may do rather than what it may not, so a member added to `VisualLiftSession` later is kernel-only by default instead of leaking until someone remembers to exclude it.

The direct `style.transform` write stays the honest tier-C residue (I-34). The disposer does not.

One object per operation. `prepare` reads `visual`, `originRect`, `box` and `boxPre`, and takes `boxPost` off `box` itself; `effect` uses the rest. `Lifetime` is unchanged from the shipped package: an `AbortSignal`, a disposer stack, a latched best-effort LIFO `dispose()`, `use(disposer)` and `useWhile(guard, disposer)`.

**`dispose()` is projected away** (review 4, §15). An earlier draft passed the full `Lifetime` and justified it by saying a restricted façade would cost an object per lifetime per operation — which was simply wrong: a `Pick` is a type-level projection and the kernel passes the _same physical object_ under the narrower type. Zero allocations, and I-11's "the behavior has no opportunity to sequence release incorrectly" becomes true instead of aspirational.

**Registration after closure.** `use(disposer)` on a lifetime that has already disposed **invokes the disposer immediately** and reports a `DraggableWarning` (~~through the platform reporter~~, D-130), rather than silently registering something that can never run. A late registration is always a bug, but the resource it names is real, so dropping it leaks and running it does not.

#### The footprint needs two windows, and one of them is not free (D-43)

`originRect` was the only rect on this scope until Revision 2, and the placeholder was sized from the visual's offset box. **api-1 measured that wrong in both directions.** With a sibling remaining in the box, `boxPre` was 62, `boxPost` 32, and the list collapsed by exactly 30 — while `box` (62) and `visual` (60) were each wrong, in different directions in different cases. Probe C1 then reproduced it live against the shipped `visual()` sizing and found the list running **30 px too tall for an entire drag**. There is no single-window rule that reproduces the removed footprint in both nested cases; that is the measured result, not a preference.

So the footprint's **height** is `boxPre.height − boxPost` **when the two are different elements**, and it needs a second window because what leaves flow is the **visual**, while what the layout loses is the **box**. Its **width is `boxPre.width` on every composition** (F-58): the subtraction measures a _collapse_, which is a scalar on the list's flow axis, and the box surrenders no cross extent — a block-level box in a vertical list takes its width from its containing block on both sides of the lift. Subtracting there is arithmetically correct and the wrong quantity, and it shipped `width: 0px` on every composed `box`. `box !== visual` is declared supported with `y()` alone (03 §Scope limits), which is what makes `height` the right spelling for the flow axis.

**Under the default `box(item) = visual(item)` the footprint is `boxPre` alone, and the second window is skipped.** F-55 corrects the earlier claim that the subtraction "would have agreed" there: it would not, it would yield `0`. The subtraction measures a _collapse_, and the box only collapses because it stays in flow while its descendant leaves. When the box **is** the lifted element there is no collapse to measure — `LIFT_FAITHFUL` promotes it with `position: fixed` and an explicit width and height, so its offset box is identical on both sides of `acquireLift`. api-1 measured only nested pairs, which is why this did not surface until implementation.

**The two windows have different owners, and D-52 assigns them rather than leaving the seam to guess:**

```text
admit                    behavior RETURNS { visual, box, item }← D-59; the
                                                                 kernel's own
                                                                 vocabulary,
                                                                 not a draft
                                                                 field it reads
                                                                 back
kernel, pre-lift         holds `box`; reads originRect and boxPre
acquireLift
activation.prepare       behavior reads box.offsetHeight off scope.box, first
                         thing (skipped when box === visual)
                         sizes the placeholder from
                           width  = boxPre.width
                           height = box === visual
                                      ? boxPre.height
                                      : boxPre.height − boxPost
```

**The admission line is D-165's as well as D-59's.** It read ~~`RETURNS { visual, box }`~~ until the item joined as a third required member. Nothing below it moves: the item is neither window, and the two the diagram assigns are still `boxPre` to the kernel and `boxPost` to the behavior. A fenced block carries no strike, so the retired form is recorded here.

D-39 and D-43 legislate the same code and neither said which seam owns which write, so they could not both be implemented as written. The ordering makes the assignment free rather than arbitrary — `acquireLift` already precedes the activation seam, so `boxPost` is available exactly where `prepare` measures today.

**The delivery route is D-59's correction to D-52's first form**, and it is worth stating because the shorter route was wrong for a structural reason rather than a stylistic one. Having the behavior stash `box` in the draft and the kernel read it back would have made the kernel name one behavior-authored field — the "kernel learns one sortable-shaped thing" defect Checkpoint C found four separate times, and the exact thing H-2 and D-15 exist to prevent. **`box` is kernel-held per-operation state, not a frame field.** It is written once at admission, read once before `acquireLift` and once by `prepare`, and never participates in a transaction — the same argument that keeps gate state on the settlement attempt rather than on the frame, so the kernel's transactional slice stays seven fields.

Three things then fix the shape of the windows:

- **Both must be offset-box reads.** A running translate corrupts a border-box read by the drag delta — api-1 measured the top off by 60 px with the height correct — so a `getBoundingClientRect()` pair would produce a footprint whose position is a function of where the pointer happened to be.
- **The sizing writes stay in `prepare`, on D-39's ledger.** Keeping them there is what puts them under `activation.rollback`: they may land on a consumer-owned placeholder, and a discarded preparation must not leave library sizing on it. Moving them to `effect` to "simplify" would silently take them off the ledger.
- **The cost is one extra forced layout per activation, and it is stated rather than absorbed.** `boxPost` is read immediately after the lift's style writes, so it cannot batch with anything. F-58 narrows the read to `offsetHeight` alone — the same forced layout, one fewer value taken, none discarded — which is a reduction and not a saving worth claiming. It is once per drag, not per frame, and it does not touch M-1's move budget — but it is a real read and this document does not claim otherwise. Under the default `box === visual` the post-lift read is skipped entirely (F-55), so the common composition adds **no** extra layout — the cost is paid only by a composition that names a distinct `box`.

`originRect` is **not** derived from either window. It stays the visual's grab rect: it is the basis of the origin-relative landing space frozen at phase 9 (§One coordinate space), which is about **where the visual was**, not about what the layout lost. Deriving it from a `box()` the consumer picked for layout reasons would make the frozen coordinate space a function of that choice.

### Pointer capture is not here (D-17)

The kernel acquires pointer capture on **`root`** at activation and registers its release on the motion lifetime. The behavior is not involved and the admission result does not identify a capture target.

Why `root` rather than the pressed item:

- The kernel already owns pointer identity, ingress, the motion lifetime, release ordering, cancellation and teardown. Capture is the same concern.
- `root` is the ingress boundary, so in the reference behavior it is the connected ancestor of every admissible subject. The API does not _enforce_ that — `admit` may return any `HTMLElement`, and a consumer resolver can detach or move either element — so the kernel validates `root.isConnected` immediately before capture, and **a capture failure is an activation failure** (`FAILURE_ACTIVATION`, recovery immediate) rather than a silently degraded drag.
- Capturing the **item** loses capture (and fires `lostpointercapture`) if the item leaves the DOM — which a mid-drag structural collection change can cause. Capturing `root` makes that path a clean `CANCEL_ITEM_REMOVED` rather than a capture loss racing a cancellation. **D-44 renames the cause, not the hazard:** the item no longer leaves the DOM because `updateItems(payload)` was called — that member is deleted — but because the consumer committed a new presentation and signalled it with `controller.invalidate()`, whereupon `items()` returns a **new array identity** and the structural branch reconciles against a collection the item is no longer in. The capture argument is unchanged; only the producer is renamed.
- Capture is acquired at **activation**, never at admission, so a below-threshold press never captures and never retargets subsequent pointer events to `root`. It does **not** follow that a click always survives — but the platform question this bullet declined to decide is now **answered by observation**, and the answer is favourable. Probe E R-1: only `pointerdown` is ever prevented, and the split is exact — what dies is the compatibility `mousedown` and everything that is a default action of it (focus, caret placement, selection start, form-control operation), while `click` is generated from the un-prevented `pointerup` and reaches the document with its default intact, `href` navigation and ctrl/meta-click included. So the click survives; the **focus** does not, which is why §Input policy exists. The guarantee here is still about capture.

No semantic reason was found that requires a behavior-chosen capture target. The sortable behavior performs no hit testing during a drag — its geometry is a packed rect scan — so the fact that capture retargets `event.target` to `root` costs nothing. A behavior that needed `document.elementFromPoint()` would be unaffected, since capture does not change hit testing.

The residual: releasing capture for a pointer that no longer exists throws `NotFoundError`, so the disposer is guarded. That is a kernel detail.

**A pointerless operation acquires none of this** (D-32). There is no pointer to capture, so activation skips capture entirely rather than capturing a `-1` identity, and the guarded release disposer is simply never registered. The lift, `originRect`, `box`, `boxPre` and both lifetimes are acquired identically — none of them is a function of the pointer, and D-59's widened return is the same type on both admission members for that reason.

### `ResolutionCommand` — the choice is staged, not called

The kernel does not know what a reorder resolution is. An earlier draft passed a `ResolutionGate` with `open()` and `skip()` and left "exactly one of these, once" to discipline: zero calls stranded `RELEASING`, two calls created competing attempts, and `open()` then `skip()` was undefined (review 4, §9).

Making the choice the _staged value_ removes the whole class of problem.

```ts
type ResolutionCommand = Readonly<{
  /**
   * The consumer round-trip, or `null` to settle immediately with no round-trip
   * (a no-op proposal). The kernel creates the attempt, arms the guarded abort
   * on the cancellation lifetime, invokes it, and queues the settled value back
   * to `settlement.prepare` as an opaque `unknown`.
   */
  invoke: ((signal: AbortSignal) => unknown) | null;
}>;

type ReleaseTransition<Part extends object> = Readonly<{
  prepare(draft: Draft<Part>): ResolutionCommand; // throws to fail (D-152)
  effect(current: Readonly<Frame<Part>>, prepared: ResolutionCommand): void;
}>;
```

Exactly one choice, made exactly once, executed by the kernel after `release.effect` returns **and only if it returned normally**. No `unused → used → sealed` state machine, no duplicate-call policy, no missing-call failure stage. There is one object and at most one closure per drag — not a hot path.

**`invoke: null` asserts a _proven semantic no-op_, and nothing else.** It is not a fallback for missing state. A release that finds no published view, no item, no snapshot or no insertion has a broken invariant, and reporting that as a successful no-op drop would tell the consumer the drag completed normally (review 5, §4). Those paths **throw** (D-152), and the kernel classifies at `FAILURE_RELEASE` because that is the stage the release seam is already open at — the behavior names the condition, never the stage. The only legitimate skip is `proposal.from === proposal.to`.

The kernel treats a thenable as asynchronous and anything else as immediately settled, then hands the result to `settlement.prepare` with a status code. It never names `ReorderResolution`, `accept` or `reject`. It named one more thing until D-41 — the presentation declaration the resolution carried — and that is deleted with `ResolutionOptions`.

Acceptance is still **never inferred**: `settlement.prepare` is where a fulfilled value that is not an explicit resolution becomes `FAILURE_RESOLUTION`. That check lives with the party that can perform it — and it is returned as a value rather than announced through a side call:

```ts
/**
 * Settlement stages nothing. It used to carry the gate plan — a `presentation`
 * boolean saying whether an authored presentation was expected — and D-41
 * deleted the gate that boolean planned for. The one remaining gate is
 * requested in `effect`, from committed frame state, so `Prepared` is the
 * `true` sentinel `Transition` defaults to and D-34 established as the way a
 * seam says it stages nothing.
 */
type PreparedSettlement = true;

type SettlementTransition<Part extends object> = Readonly<{
  prepare(draft: Draft<Part>, input: SettlementInput): PreparedSettlement; // throws to fail (D-152)
  effect(
    current: Readonly<Frame<Part>>,
    prepared: PreparedSettlement,
    scope: SettlementScope,
  ): void;
}>;
```

The alternative was to keep a one-field record whose field is always the same value, which is the shape D-41 is deleting everywhere else in this document.

### The settlement input is discriminated and exhaustive

An earlier draft passed `(value: unknown, status: number)` across five statuses and never defined a total mapping from them to outcome, recovery, domain result, callbacks and failure stage. The compiled behavior then did the predictable thing and mapped **every** non-fulfilled status to rejection with home recovery — which turned `SETTLED_SKIPPED`, produced by `{ invoke: null }` for a semantic no-op, into a rejected drop that animates home and calls `onCancel` (review 4, §4).

The fix for that was the discriminant, **not** removing cases. A subsequent draft also dropped `canceled` and `failed` on the grounds that they are kernel-_triggered_, and that was wrong (review 5, §1): `outcome`, `recovery` and `domain` are fields of the **behavior's** frame part, which the kernel cannot name or write, and `BehaviorSpec` has no other terminal-classification hook. A kernel `CANCEL` could commit `SETTLING` and then had no way to produce the canceled result `onCancel` requires.

**Ownership of the trigger and ownership of the resulting domain state are different things.** All five cases go to the behavior:

```ts
type SettlementInput =
  | Readonly<{ type: SETTLED_FULFILLED; value: unknown }>
  | Readonly<{ type: SETTLED_REJECTED; error: unknown }>
  | Readonly<{ type: SETTLED_SKIPPED }>
  | Readonly<{ type: SETTLED_CANCELED; reason: unknown; stage: CancelStage }>
  | Readonly<{ type: SETTLED_FAILED; stage: FailureStage; error: unknown }>;
```

The complete mapping, which the behavior must cover exhaustively:

| Input | Outcome | Recovery | Domain result | Callback |
| --- | --- | --- | --- | --- |
| `skipped` | `OUTCOME_NOOP` | **immediate** — the placeholder is already where the item belongs | `{ type: 'noop', proposal }` | `onEnd` |
| `fulfilled`, an accepted `ReorderResolution` | `OUTCOME_ACCEPTED` | destination | `{ type: 'accepted', proposal }` | `onEnd` |
| `fulfilled`, a rejected `ReorderResolution` | `OUTCOME_REJECTED` | home | `{ type: 'rejected', reason, proposal }` | `onEnd` |
| `fulfilled`, not a resolution at all | — | — | — | **throws** `drag: <behavior>/settled-skipped`; classified at `FAILURE_RESOLUTION` (D-152) |
| `rejected` (the thenable rejected or `invoke` threw) | — | — | — | **re-raises `input.error` verbatim**; classified at `FAILURE_RESOLUTION` (D-152) |
| `canceled` | `OUTCOME_CANCELED` | home | `{ type: 'canceled', reason, origin, stage, proposal }` | `onEnd` |
| `failed` | `OUTCOME_FAILED` | immediate | **the seam builds one**: `settlement.prepare` stages `{ type: 'canceled', reason: <`input.error`>, origin: `CANCEL_FAILED`, stage: <derived, §The join>, proposal }` and `effect` writes it to `domain`, so `finalized` finds a result where it used to find `null` (D-66) | `onError` **and** `onEnd`. It read _"`onError` only; `finalized` is never called"_ until Revision 2.1 |

A rejected thenable is a **resolver malfunction, not a considered consumer verdict**, so it is a named classified failure rather than an inferred `{ type: 'rejected' }`. Acceptance is still never inferred, and now neither is rejection.

**The `failed` row is the one whose _domain_ column changed, and it changed because the row was already wired for it.** `SETTLED_FAILED` reaches this table through the failure checkpoint, which opens a settlement and runs this same seam stamped `REPORTING`; the input has always carried `{ stage, error }`. Before D-66 the behavior used that only to pick a recovery and left `domain` null. Now it also builds the result. **No input, no seam and no frame field changes** — one branch of the behavior's settlement `prepare` stops returning early.

**The callback column collapsed to one name at Revision 2.1 (D-62) and the mapping did not change.** That is the point of the row: the five settlement inputs map to four domain arms and one failure, exactly as D-24 established, and what disappears is the library's job of routing four arms into two callbacks. The consumer's `switch (result.type)` is the same exhaustive switch, checked by their compiler instead of by F-37's test.

**The union is unchanged by D-40. No `aborted` case is added, and none is contemplated.** A sixth case would encode _provenance_ — where the abandonment came from — and provenance is not a different consumer obligation: in both the pre-release and the post-release cancellation the consumer must not assume its own started work was undone, because the library never had a way to undo it. Splitting the name would oblige every consumer to write two handlers that do the same thing. What changes is only what the `canceled` row **means**, and one rule about what happens after it.

**`canceled` says the _drag operation_ was abandoned. It has never promised that consumer side effects were rolled back**, and after release it must not be read as one. Before release the two readings coincide, which is why the distinction went unstated for so long: nothing outside the library has run yet, so "the operation was abandoned" and "nothing happened" are the same sentence. After release they diverge, and the divergence is the ordinary case rather than an edge:

```text
onReorder(request) {
  setOrder(next);          ← consumer work, already started
  await committed;         ← the user cancels HERE
  return accept();
}
```

The library stops waiting, restores or retires its own presentation, and terminates as `canceled`. The consumer's `setOrder(next)` may still commit. That is not a defect being tolerated: the library has no handle on `setOrder` and never claimed one, and a terminal name cannot manufacture a rollback capability the library does not have.

**The post-release rule, which the resolver's own settlement then needs.** A resolution that arrives from a resolver the operation has already abandoned is **consumed safely**:

| Property | Rule |
| --- | --- |
| unhandled rejection | never. The kernel keeps its `catch` on the resolution attempt for the attempt's whole life, not only while the attempt is current, so a late rejection is caught and dropped rather than escaping to the platform |
| a second terminal | never. The terminal latch has already fired for the `canceled` settlement; the late arrival finds no live attempt and dispatches nothing |
| revival | never. There is no path from a settled operation back to `SETTLING`; the arrival is discarded at the attempt-identity check, which is the same double validation (§Attempts and stale continuation rejection) already requires |

This **extends** §The settlement input is discriminated and exhaustive — _a rejected thenable is a resolver malfunction_ — rather than contradicting it, and the two rules are about different windows. While the attempt is live, a rejection is a malfunction and classifies as `FAILURE_RESOLUTION` — that is unchanged. Once the attempt has been abandoned there is no operation left to classify against, and classifying anyway would be `fail` outside a seam of the current operation, which §Failure classification already downgrades to a platform report. So the late rejection takes the non-consequential channel by the rule that is already there; what D-40 adds is the requirement that it be **caught at all**, which is a property of where the `catch` is installed rather than of the failure model.

`CancelStage` is `AT_PROPOSAL` or `AT_CONSUMER`, carried through to the public cancel result — probe 1's preserved product requirement, which the intermediate draft had no constructor for. It is a **diagnostic discriminant on one terminal**, and D-40 is why that is the right shape: the two stages differ in what the consumer may have already started, not in what the consumer must do next.

## The settlement gate (D-7, narrowed by D-41)

The gate starts **complete**. The behavior _holds_ it if it needs it, and only during `settlement.effect`. Gate state lives on a **kernel-private settlement attempt**, not on the transactional frame: nothing outside `advanceSettlement` reads it, it is unobservable, and it is per-settlement rather than per-operation.

**This section said "both gates" until Revision 2. There is one.** §The serial authored commit, immediately below, is why.

```ts
// kernel-private
type SettlementAttempt = {
  holds: number;
  /** Requested during `effect`, invoked after sealing. */
  start: LandingStart | null;
  /** Retained past its gate release, so the join can `destroy()` it. */
  landing: LandingHandle | null;
  landingHeld: boolean;
  /**
   * The one authoritative landing target, measured at arm — **two scalars**
   * since D-145, with the presence sentinel `Point | null` carried on the X. `targetX === null` means the measurement was skipped;
   * `0` is an ordinary abscissa, so it is never read as truthiness.
   */
  targetX: number | null;
  targetY: number;
  /** False once a `destroy()` throw leaves runner control unrelinquished (I-24). */
  relinquished: boolean;
  /** Once-only completion latch: the first `done()`/`fail()` wins. */
  completed: boolean;
  /** Set when landing creation or the runner reported a consequential failure. */
  failed: boolean;
  sealed: boolean;
};

type SettlementScope = Readonly<{
  /** Hold the landing gate. The kernel builds the context and owns the attempt.
   *  At most once. */
  holdForLanding(start: LandingStart): void;
}>;
```

#### The serial authored commit (D-41)

The authored commit is **serial**, and one order governs every drop:

```text
release
  → freeze proposal
  → onReorder
  → authored commit
  → consumer resolution
  → restore library presentation invariants
  → authoritative landing measurement
  → landing
  → terminal
```

Everything below follows from reading that list once. **The readiness gate has no producer in it.** There is no point between `onReorder` and the landing measurement at which the library is waiting for a render it has not already been handed: the resolution does not return until the commit is done, because a consumer that must render first `await`s its own commit inside `onReorder`, which is what a Promise-returning resolver already expresses. A gate with no producer is not a gate that is rarely used — it is a gate nothing can ever release, kept alive by a deadline.

**So the protocol is deleted rather than amended.** Deleted in full: `ReorderResolution.accept({ presentation: true })` and the whole `ResolutionOptions` argument; `controller.ready(request)`; `KernelHost.presentationCommitted()`; `rt.pendingRequest` and the request-identity comparison the behavior performed on it; `PreparedSettlement.presentation`; `SettlementScope.holdForReadiness()`; `attempt.readinessHeld`, `attempt.readinessSettled`, `attempt.presentationLatched` and `attempt.authoredReady`; the early-acknowledgement latch on the resolution attempt and its discard-at-seal branch; the once-only claim-then-dispatch rule and the four-row invalid-acknowledgement matrix; the `READINESS_SETTLED` action; the acknowledgement deadline and `config.readinessTimeout`; `FAILURE_PRESENTATION_READY`; and the readiness-time re-anchor with `LandingHandle.retarget()`.

D-33's reasoning is **not** deleted with it. It is kept in full in [00](00-index.md)'s ledger row, because it is the best record the project has of why per-operation identity on a controller method is hard — a question D-47's published kernel surface will meet again. Two sentences of it are load-bearing enough to restate here rather than leave behind a link: **an acknowledgement capability minted by the settlement is younger than the render it acknowledges**, which is why the kernel-minted token failed; and the request is older than the render **by construction**, because it is what asked for it. That is a lesson about capability _age_. The serial order makes it moot by removing the window, not by answering it.

##### Four consequences, and each is a narrowing rather than a loss

**1 — Settlement holds one gate.** Landing. §The settlement gate is written for one throughout, and the independence property D-7 claimed is not weakened but vacated: independence was what let readiness and landing overlap, and with readiness deleted there is nothing to be independent of. The property probe 1 actually preserved — _no fake asynchronous work when landing is absent_ — is untouched, because it was always the **default-open** rule and never the gate count. With no `landing()` feature installed the behavior holds nothing and finalizes in the same drain, which is I-9's shape.

**2 — D-7's request-seal-arm survives unchanged, and not by inertia.** It would be easy to read the three-step arm as readiness machinery and delete it alongside; it is not, and the reason is `duration: 0`. A `landing({ duration: 0 })` runner — or any custom runner that finishes synchronously — calls `done()` from **inside `start`**. If the hold were installed after `start` returned, that completion would find no hold and strand the gate. Reserving the hold before calling `start`, sealing the plan before arming it, and publishing the handle only after `start` returns is what makes a synchronous completion safe. **That has nothing to do with readiness**, holds for a single gate exactly as it held for two, and is the reason this document keeps a three-step arm for one hold.

**3 — The landing target is measured once, authoritatively.** The serial order guarantees the authored DOM is final before the measurement is taken, so there is no interval during which a target is provisional. `anchorTarget` is called **once per settlement**, at arm, and the point it returns is converted once and recorded on the attempt as `attempt.targetX`/`.targetY`; the runner receives the same two numbers as `LandingContext.targetX`/`.targetY` and the join pins to that pair. **The returned point itself is borrowed** (D-144): both fields are read on return and the object is never retained, which is what lets a behavior answer every arm from one reusable buffer. Consequently there is no second, advisory `anchorTarget` call, no `retarget()` producer, and no readiness-time re-anchor. F-16 — the visible step when a short landing completes before readiness — dissolves rather than being accepted, because the completion order it describes no longer exists.

Two clauses of D-16 survive, and they are the ones that were load-bearing: **the kernel performs the final pin at the join**, through the lift session it owns, before releasing presentation; and **whether to re-anchor follows the recovery**, which is committed behavior state.

The measurement's own precondition is checked there rather than assumed — an authored commit that detached the placeholder or moved it away from its item makes the measurement meaningless, and D-42 requires the two `O(1)` reads that catch it. ~~Landing from the unrepaired position~~ — **D-49 supersedes that clause**: the unrepaired position is the viewport origin, so the landing is **skipped** and the drop joins immediately with its domain result intact. That is the only thing the "restore library presentation invariants" step in the order above defends.

**4 — A consumer that needs an asynchronous commit `await`s it inside `onReorder`.** Plainly, and with no library vocabulary:

```ts
async onReorder(request) {
  setOrder(next);
  await committed;      // whatever the framework's commit barrier is
  return accept();
}
```

A framework-specific commit barrier is **integration code, not a drag protocol**. That is the whole of the migration: the four consumer obligations D-33 enumerated — create a promise before knowing a render will happen, supersede without dropping, acknowledge from a layout effect, never lose one — do not move to another owner. They stop existing, because the thing they coordinated is now sequential.

##### Deleting the provisional half removes a hazard, it does not merely simplify

This is the part worth keeping, because "the protocol had no producer" argues only that the readiness gate was **useless**, and probe C1 established that its geometric half was **wrong**.

`authoredReady` is `false` at `armSettlement` **by construction**: arm runs synchronously at the end of the settlement drain, and the acknowledgement it waits for cannot have arrived, because the render it acknowledges has not been asked for at that point in any strategy. So `anchorTarget(current, false)` was the measurement every landing actually opened from — and C1 found the resulting target **stale in all five commit strategies it probed, including the two that otherwise work**. The two working strategies were not working because the provisional target was right; they were working because the join's authoritative pin corrected it, which is the exact signature of this bug class: **the landing opens with a jump and still ends correctly** (§The landing origin, and phase 11 before it).

A "provisional" value that is wrong on 5 of 5 paths is not a useful approximation being refined. It is a second, worse answer kept alive so that a gate could exist to improve it. Deleting the gate and deleting the provisional measurement are therefore the same deletion, and the remaining single measurement is strictly the one that was already deciding correctness.

##### What the deletion vacates, and what it does not

**`abandon()` becomes vacuous, and its argument does not.** This document carried a paragraph explaining that there is no `abandon()` — no way for a consumer to say _no presentation is coming after all_ — because for an accepted destination settlement it produced a drop reporting `onFinish` over an authored DOM still showing the old order, and _a state that is illegal in the only case anyone would reach for it should not exist at all_. With readiness deleted there is no gate to abandon, so the paragraph has nothing left to prohibit and is removed. **The sentence in italics is D-41's own reasoning**, applied one level up: a gate whose only producer is a protocol nobody can be relied on to enter is the same species of state, and it is deleted for the same reason it was refused an escape hatch.

**F-6 loses its consumer half.** A consumer can no longer forget a hold, because it never had one to take. What survives is first-party and unchanged: a behavior installing `landing()` and never taking the corresponding hold, which stays a **test obligation** for the reason it always was — sealing detects a _late_ hold and never a _missing_ one.

**I-35 goes with the protocol.** It was the invariant stating that cross-operation acknowledgement safety is a behavior obligation rather than a kernel one, and there is no acknowledgement.

**The overlap property is not lost, it is re-owned.** I-8 and 13b P-1 wanted the authored re-render to overlap the landing animation rather than serialize behind it. Under the serial order the authored render happens _before_ the landing starts, so there is nothing left to overlap it with — the render is no longer a thing the landing waits on, which is a stronger outcome than overlapping it. What the landing still must not do is block on anything: `settlement.effect` still returns `void` and nothing awaits anything.

**`KernelHost` loses the member Phase 14 added, and D-53 adds a different one.** `presentationCommitted()` goes with the protocol. The count returns to its pre-Phase-14 value, but the membership does not: D-53 adds the logical-liveness reader D-38 forces. Stating this as "the host shrinks back" would be a net-zero arithmetic that hides an SPI addition, so it is not stated that way. What survives intact is the narrower claim D-32 made: **neither member is a cost of the second input mode.**

### Request, seal, then arm

The gate method **records a request; it arms nothing** (review 4, §6, §10). Arming happens once, after the scope seals, when the complete plan is known. **D-41 narrowed the plan to one gate and left this sequence alone** — see §The serial authored commit, consequence 2, for why the three steps are `duration: 0`'s and never were readiness's.

```text
> RESOLUTION_SETTLED
    begin()
    spec.settlement.prepare(draft, input)           → outcome, recovery, domain
                                                    ← a throw here is classified
                                                      at the seam's own stage and
                                                      nothing below runs
    preparationValid(); draft.phase = SETTLING; commit()
    attempt = { holds: 0, start: null, landing: null, landingHeld: false,
                target: null, relinquished: true, sealed: false }
    lifetimes.cancellation.dispose()

    spec.settlement.effect(current, prepared, scope)
        scope.holdForLanding(start) → holds += 1; attempt.start = start; landingHeld = true
        ── record only. A second call is ignored and reported. ──

    attempt.sealed = true

    ── if `settlement.effect` threw, or the operation was invalidated:
       drop the unarmed request, arm NOTHING, and let the queued failure
       checkpoint decide. Arming a half-requested plan starts a runner for an
       already-failed settlement.                                  [review 5 §1]

    arm → ARM_ARMED | ARM_STALE | ARM_FAILED
          precondition (D-42): placeholder still connected, still the item's
                               sibling — two O(1) reads
          attempt.targetX/targetY = spec.anchorTarget(current) - originRect
                          ── THE authoritative landing measurement, and the only
                             one (D-41). Unconditional: the join pins from this
                             value whether or not a runner exists, so it is not
                             inside the `start` branch below. The authored DOM is
                             final here by the serial order, which is what makes
                             one measurement sufficient.                      ──
                          ↳ the precondition fails, or anchorTarget throws or
                             latches → report FAILURE_LANDING_TARGET through
                             onError; attempt.target stays null; roll back the
                             landing hold; SKIP `start` entirely; ARM_ARMED
                          ── D-49: a landing that cannot be measured is SKIPPED,
                             not faked. The settlement is NOT failed and the
                             domain result stands — the DOM commit already
                             happened and the reorder is real — so the operation
                             joins immediately and terminates normally. See
                             §A landing that cannot be measured is skipped. ──
          if (stale)      roll the hold back, ARM_STALE, no `start`
                          ── revalidate BEFORE `start`: `anchorTarget` is
                             behavior code and may have destroyed the
                             controller. Calling the consumer's runner after
                             that violates I-6.                            ──
          if (start)      handle = start(context, done, fail)
                          ↳ throws → roll the hold back, FAILURE_LANDING_CREATE,
                             ARM_FAILED
                          ── revalidate AFTER `start`: it may have destroyed
                             the controller or called `fail()` and STILL
                             returned a live handle ──
                          if (stale) handle.destroy() best-effort; never publish
                          else       attempt.landing = handle

    if (arm === ARM_FAILED) return    ← the settlement is REPLACED; do not
                                        advance, and never let the original
                                        accepted/rejected outcome finalize
    advanceSettlement()               ← may finalize in this drain
```

### Arming has three outcomes, and one of them is consequential

An earlier draft classified an arm-time `anchorTarget` or `start` throw as `FAILURE_LANDING_CREATE`, rolled the landing hold back, "opened the gate" and **continued the original settlement** (review 6, §3). With a second gate also open the hold count then reached zero and the accepted settlement finalized — calling `onFinish` — before the queued failure checkpoint ran.

That is the exact continuation D-23 prohibits. A consequential landing-create failure cannot both become `OUTCOME_FAILED` _and_ carry the original accepted outcome through to `finalized`. **Unchanged by D-66**, which is worth saying because D-66 makes `finalized` run on this path: it runs on the **failed** frame and publishes what that frame holds, which is precisely not the stale accepted outcome this paragraph is about.

**With one gate the arithmetic that produced it is gone, and the rule is not.** A single rolled-back hold takes the count to zero on its own, so `ARM_FAILED` still has to suppress `advanceSettlement` explicitly. Deleting the second gate removed a way to reach the bug, not the need for the guard.

```ts
const ARM_ARMED = 0; // the plan is live
const ARM_STALE = 1; // the operation went away; nothing armed, nothing failed
const ARM_FAILED = 2; // classified; the settlement is replaced
```

`ARM_FAILED` suppresses `advanceSettlement` and every terminal callback for the original settlement. Presentation is still owned and still released — by the failure path's own recovery, which is `RECOVERY_IMMEDIATE` — so returning from the arm helper is not by itself sufficient, and the outcome has to be visible to the caller.

### The landing completion latch

`LandingStart` receives `done` and `fail`. Both route through one **once-only** latch on the attempt:

```text
completeLanding(attempt, error):
    if (attempt.completed) return          ← duplicate, or done-after-fail
    attempt.completed = true
    if (error)  attempt.failed = true; fail(FAILURE_LANDING_INTERRUPTED, error); return
    if (producer-side validation passes)   dispatch(LANDING_SETTLED, attempt)
```

Three properties this fixes at once:

- **First completion wins.** `done()` then `fail()`, `fail()` then `done()`, and a duplicate `done()` all resolve to the first call.
- **A synchronous `fail()` inside `start` is honoured.** It sets `attempt.failed` _before_ `start` returns, so the post-`start` revalidation destroys the returned handle and never publishes it. Without the latch there was no attempt field recording the failure, so the handle was published anyway.
- **The completion is queued, then revalidated again when applied** (I-4), so a completion for a retired attempt is inert at both points.

**Reserve-before-call and revalidate-after-return are two different fixes.** The first makes a synchronous `done()` safe; the second makes a synchronous `destroy()` safe. A `start` that destroys the controller and _then_ returns a live handle would otherwise leak that runner: teardown runs first, sees no published handle, retires the attempt, and the arm code stores a live runner on a stale attempt with nothing owning it (review 5, §3). Reserving a resource before a callback protects resources that already exist; it does nothing for one the callback _returns_.

Why the split matters: a `landing({ duration: 0 })` runner, or any custom runner that finishes synchronously, calls `done()` **from inside `start`**. In the earlier ordering the hold was installed _after_ `start` returned, so the completion either found no hold (and was dropped, stranding the gate) or applied against a half-built attempt. Reserving the hold before calling `start`, and publishing the handle only after `start` returns, makes both safe: the completion is queued, so it cannot be applied before the handle is stored. **This is the whole justification for request-seal-arm, and it is untouched by D-41.**

If `start` throws, or the attempt-scoped `fail()` wins synchronously, the reserved hold is rolled back deterministically and the failure is `FAILURE_LANDING_CREATE`. `armSettlement` returns `ARM_FAILED`: the original settlement is replaced, `advanceSettlement()` is not called, and no terminal callback from the original accepted/rejected/no-op result may run. Presentation remains owned until the queued failure checkpoint enters failed immediate recovery.

**The arm-time measurement is not in that sentence, and used to be.** D-49 takes it off the classified path entirely: a failed measurement rolls the hold back the same way, but reports through `onError`, arms nothing, and lets the settlement advance to its own normal terminal. The hold rollback is shared; the outcome is not.

Consequences:

1. **A gate release is not a frame transition.** Probe 1 ran `begin(); flag = true; commit()` per gate. The only transition in settlement is `phase = FINALIZING`.
2. **A hold count is still the right shape for one hold.** The release is guarded by `attempt.landingHeld`, so it is idempotent and duplicate-proof, and the guard names which gate is outstanding for a diagnostic. The count is kept rather than collapsed to the boolean because consequence 6 is a real possibility and the count is one integer. The landing _handle_ outlives its gate release, because the join needs it to `destroy()` the runner before the pin.
3. **Staleness handling is free.** A `done()` for a retired attempt finds no attempt.
4. **The hold may be requested at most once, and only before sealing.** A duplicate or late request is ignored and reported as a **`DraggableWarning`** — the same non-consequential tier as a failing disposer (~~the platform reporter, not `onError`, which this document reserves for classified failures~~; D-130 makes `onError` the one destination and the _class_ the tier). It never overwrites a watch, never double-increments, and never panics, because a bookkeeping error should not destroy a live drop.
5. **With no `landing()` feature the behavior holds nothing and finalizes in the same drain.** This row said the opposite until D-41, and the correction is a real reversal rather than a rewording: the earlier text was right _while readiness existed_, because a settlement with no landing gate could still be holding readiness for the consumer's authored commit, and finalizing in the same drain would have released presentation before that commit landed. Under the serial order the commit has already landed by the time the settlement exists, so there is nothing left for an empty plan to wait on. I-9's _no fake asynchronous work when landing is absent_ is restored to the unqualified form probe 1 stated it in.
6. **One gate is v1 product vocabulary, not a generic mechanism.** Adding a second means touching the attempt record, the scope API, the arm step, teardown, diagnostics and tests. Revision 2 is the demonstration in the other direction: removing one touched every one of those places.

## Landing (D-16)

The kernel computes nothing about geometry beyond the delta arithmetic; it owns the _attempt_, the _timing of measurement_, and the _final pin_.

**The types below are unchanged by D-63 and their audience has narrowed.** `LandingStart`, `LandingContext` and `LandingHandle` are **not** ordinary-tier consumer vocabulary any more: the sortable's `landing()` takes `{ duration, easing }` and installs the library's own WAAPI runner. They are published to the **middle** tier (`sortable/feature.js`, D-61) and to the **kernel** tier, where a behavior author supplies a runner — which review 3 §10 leaves open in as many words. **Nothing in this section changes shape.** That is the substance of the claim that D-63 is a tier move: the reserve-seal-arm protocol, the once-only completion latch, the relinquishment obligation on `destroy()` and the kernel's final pin are all what make the _library's own_ runner correct, and would all still be here if no third party ever wrote one.

```ts
type Point = Readonly<{ x: number; y: number }>;

type LandingStart = (
  context: LandingContext,
  done: () => void,
  fail: (error: unknown) => void,
) => LandingHandle;

type LandingContext = Readonly<{
  visual: HTMLElement;
  /** Full transform string for a viewport delta, including the lift's base. */
  compose(x: number, y: number): string;
  /**
   * Where the visual **is**: the delta the lift session last rendered, read
   * from the session the kernel owns. Not a pointer delta (D-35).
   */
  fromX: number;
  fromY: number;
  /**
   * **Authoritative** (D-41). Measured once, at arm, from an authored DOM the
   * serial order has already made final. It is not superseded, and the join
   * pins to this same pair — so a runner that lands exactly on it is
   * indistinguishable from one the kernel had to correct.
   *
   * **Scalars since D-145**: every read in the package splits the pair
   * immediately, `compose` and `write` take scalars, and the context already
   * allocates.
   */
  targetX: number;
  targetY: number;
  realm: DOMRealm;
}>;

type LandingHandle = Readonly<{
  /**
   * Stop, and relinquish control of the visual's transform so the kernel's
   * final pin is not overridden. A WAAPI runner cancels its animation here.
   * Never writes a final position, never dispatches.
   *
   * **This is not `controller.destroy()` and D-36 does not reach it.** It stays
   * synchronous and `void`: the join calls it immediately before the pin,
   * inside one `try`/`finally`, and the pin is only correct because
   * relinquishment has already happened when `lift.write` runs. A thenable here
   * would put an `await` between `destroy()` and the pin, which is the one
   * ordering §Landing (D-16) states as normative.
   *
   * **It is the sole member of D-51's relinquishing list** — the one call into a
   * declared consumer slot that D-37 (a) permits after logical closure, because
   * it *returns* a resource rather than *asking* anything of the consumer. It
   * performs no operation work, publishes nothing, its return value is ignored,
   * and it is wrapped. Adding a second member to that list is a contract change.
   *
   * **D-51's deferral clause is about closure, not about relinquishment as
   * such.** It reaches a relinquishing call made *after* logical closure — the
   * stale-return disposal in §Post-callback revalidation — where the call is
   * part of physical teardown and defers with it under D-36. The join's call is
   * a normal-path step on a live controller and **keeps its position**, between
   * the measurement and the pin. Deferring it would put the pin before
   * relinquishment and invert the one ordering §Landing (D-16) states as normative.
   */
  destroy(): void;

  /**
   * `retarget?()` was here until D-41. Its only producer was the readiness
   * release — the second, better target that arrived when the consumer's DOM
   * finally committed — and with one authoritative measurement there is no
   * second target for a runner to be given. An optional member with no caller
   * is the same dead protocol D-41 deletes everywhere else.
   */
}>;
```

There is deliberately no `pin()` on the handle. **The kernel performs the authoritative pin through the lift session it already owns**, which makes correctness independent of the runner:

```text
arm (after sealing)
    attempt.target = spec.anchorTarget(current)  ← THE measurement. Once.
             ← the authored DOM is final here by the serial order (D-41), so
               there is no earlier, worse answer for this one to supersede and
               no `authoredReady` to condition it on. Whether to re-anchor
               follows the recovery, which is committed frame state.
    from    = lift.rendered                     ← what the lift last rendered,
                                                  NOT a pointer delta (D-35)
    context = { visual, compose, from, target: attempt.target, realm }
    handle  = start(context, done, fail)
    attempt.landing = handle

join — the landing hold released, or never taken
    begin(); draft.phase = FINALIZING; commit()
    failed = false
    try {
      attempt.landing?.destroy()               ← relinquish the transform
              ↳ throws → best-effort report; attempt.relinquished = false
              ── the one RELINQUISHING invocation (D-51): it releases a resource
                 the library holds and cannot release itself, performs no
                 operation work, publishes nothing, and its return value is
                 ignored. It is the sole member of D-37 (a)'s named list. Here
                 the controller is LIVE, so D-51's deferral clause does not
                 apply and this call keeps its position ahead of the pin; the
                 clause reaches the post-closure call site only. It is also why
                 this member stays synchronous and `void` — see
                 §Landing (D-16)'s `LandingHandle`. ──
      target = attempt.target                  ← the SAME point, not re-measured
      if (target) lift.write(target.x - originRect.x, target.y - originRect.y)
              ↳ throws → FAILURE_RENDERER_WRITE; failed = true
              ── null target means the measurement was skipped (D-49): no pin,
                 no animation ran, and the `finally` below produces the jump
                 cut. `finalized` still runs. ──
    } finally {
      lifetimes.presentation.dispose()         ← placeholder removed, inline
                                                 styles restored once
    }
    if (failed) return                         ← the queued checkpoint drives
                                                 REPORTING, then retirement
    spec.finalized(current)                    ← throws → FAILURE_TERMINAL_CALLBACK
    dispatch(RETIRE, operation)
```

~~**The terminal callback is skipped after a consequential failure.**~~ **Retracted by D-66 (Revision 2.1). The terminal is published, exactly once, on this path too.**

> **`onEnd` is exactly-once domain disposition.** A started operation on a still-live controller publishes one terminal whatever happened to it. The argument is **the domain result the frame already holds; `canceled` when it holds none**, carrying the classifying error as its `reason`. `onError` is orthogonal and neither implies nor suppresses it (D-60).

The struck sentence's reasoning was: the committed frame still says `OUTCOME_ACCEPTED`, so calling `finalized` would announce a successful drop that the queued checkpoint is about to report as failed. **That reason inverts into the new rule rather than surviving it.** When the failure arrives after the authored commit, the drop _is_ accepted — the consumer's data is reordered and the DOM is committed — so announcing it is not a lie, it is the one fact the consumer must have. What was wrong was treating `onEnd` as a verdict on the **operation** when it is a report on the **domain**. `onError` is the verdict on the operation.

**Continuation versus disposition, because D-23 turns on it.** A classified failure still stops every kind of continuation D-23 lists: no retirement past the failure, no gate arming, no seam success path, no consumer invocation that constitutes further operation work. What it no longer stops is the **disposition** — the single statement of how the operation ended. D-23's list loses that one clause and keeps the others; F-27's defect was that success _work_ ran after a classified throw, and that stays fixed.

**The mapping is a lookup, not a branch per stage.** `finalized` reads the committed frame:

```text
frame holds a domain result   →  publish it            (accepted / noop / rejected / canceled)
frame holds none             →  publish canceled      reason = the classifying error
```

Nothing else is consulted. That is what makes the rule total: every consequential failure reaches one of the two lines, and no stage needs its own terminal policy.

**It needs no SPI change, and the carrier is one this contract already specifies.** An earlier wording of D-66 named `reportFailure(stage, error)`, and that was wrong: §Failure classification and the member's own contract confine it to _a failure with **no operation to settle**_ — `admit` threw, identity was never minted, there is no checkpoint to queue. It cannot carry an in-operation failure because by construction it only fires when there is no operation.

**The in-operation carrier is `SettlementInput` with `SETTLED_FAILED`**, and it needs nothing added to it:

```ts
{
  type: SETTLED_FAILED;
  stage: FailureStage;
  error: unknown;
}
```

The failure checkpoint opens a settlement with that input and runs **the same settlement seam** as any other input, stamped `REPORTING` rather than `SETTLING`. That is what makes D-66 total rather than post-release only: the checkpoint applies to whatever classified failure a live operation raised, wherever it was raised, so an `activation.prepare` throw and a landing failure arrive by the same route with the same shape. **D-24 built this and F-33 is the reason** — _all five settlement cases return to the behavior_, precisely because `outcome`, `recovery` and `domain` are fields of the behavior's part that the kernel cannot name or write.

**Where the fallback lives, and which seam writes it.** `SettlementTransition` is:

```ts
prepare(draft: Draft<Part>, input: SettlementInput):
  PreparedSettlement; // throws to fail (D-152)
effect(current: Readonly<Frame<Part>>, prepared, scope): void;
```

So the write is **`prepare`'s, and only `prepare`'s**: it writes the fallback into `draft.domain` and returns the **existing `PreparedSettlement` sentinel** unchanged — this row adds nothing to that type and returns no new value. `effect` receives `Readonly<Frame<Part>>` and **cannot write frame state at all**; an earlier wording of this section said the behavior "publishes it in `effect`", which is unimplementable against the seam. The kernel commits between the two, and `finalized` then reads `current.domain`.

That is what makes _existing result wins, otherwise `canceled`_ a **lookup**: by the time the terminal runs, the fallback has been committed into the same field a successful drop writes, so `finalized` publishes `current.domain` and consults nothing else.

**Therefore [04](04-frame-slicing.md)'s frame model is unchanged by D-66, and that is a finding rather than an omission.** No part field is added, no `createFramePart` initialiser changes, no `resetFramePart` obligation is created, and F-11's exhaustiveness surface does not grow. Had the fallback needed the raw error stored for later, it would have needed a new field and 04 would have had to change; constructing the result **at the failure site** instead is what avoids it.

**The fallback needs two facts the kernel does not hand it, and one behavior-private marker carries both.**

`SETTLED_FAILED` carries a `FailureStage`. The fallback needs (1) whether a terminal may be published at all, and (2) a `CancelStage`, which the kernel computes only for `SETTLED_CANCELED`. Both are answered by a **monotone per-operation marker in the behavior's private runtime**, advanced at two sites the behavior already writes and cleared in `retire()`:

| State | Advanced when | The fallback |
| --- | --- | --- |
| `MINTED` | the operation exists | **publishes nothing** — see §No start, no terminal |
| `STARTED` | **immediately before invoking `onStart`** | `canceled` at **`AT_PROPOSAL`** |
| `RESOLVING` | as the **first statement of the `ResolutionCommand.invoke` closure** | `canceled` at **`AT_CONSUMER`** |

**Why `STARTED` advances _before_ the call and not after.** If `onStart` itself throws, the consumer **has** been told the drag began, so it is owed an end — and advancing afterwards would skip it, reintroducing the exact silence D-66 retracts one paragraph up. Advancing before also makes the marker mean what its name says: _the consumer knows_. There is no window in which the call has been made and the marker disagrees, because the assignment and the call are adjacent statements with nothing fallible between them.

**Why the `invoke` closure and not a frame field.** `ResolutionCommand.invoke` is executed by the kernel _"after `release.effect` returns and only if it returned normally"_, and `invoke: null` means no round-trip at all. So the closure's first statement runs **exactly when the consumer round-trip opens, and never otherwise** — it is truthful by construction rather than by inference, and the behavior authors that closure already.

**An earlier wording derived it from `proposal !== null`, and that is false.** The proposal is committed in `release.prepare`, well before the round-trip; a throw in `release.effect` therefore leaves a committed proposal with `onReorder` never called — §Every classification entrypoint latches, whose `release` row says the staged command is **not** executed — so the rule would have reported `AT_CONSUMER` for a drop the consumer never saw. The two events are one seam apart and it is the wrong seam.

**Why a marker rather than widening the input.** Adding a `CancelStage` to `SETTLED_FAILED` would be an SPI change for information the behavior already holds, and it would ask the kernel to compute a **domain** concept — which is the thing F-33 exists to keep on the behavior's side.

**The marker is private runtime, not frame state.** It is per-operation, non-transactional, read in `prepare` (a read is externally inert) and written from `activation.effect` and the `invoke` closure — both post-commit. It is strictly smaller than the `rt.pendingRequest` D-41 deleted: a state, not an identity, with nothing to compare.

### No start, no terminal (D-66)

The owner's guarantee is an implication and **must not be read as a biconditional**:

> If `onStart` fires **and the controller remains alive**, the operation eventually produces one terminal `onEnd`.

It says nothing about an operation that never started, and D-66 does not extend it to one. **Pinned explicitly: a failure classified before the behavior's `onStart` call publishes `onError` and no `onEnd`.** The marker is at `MINTED`, `settlement.prepare` writes no fallback, `domain` stays null, and `finalized` publishes nothing.

Two paths reach that state and they are different in kind:

- **`FAILURE_ADMISSION`** — no operation was ever minted, so there is nothing to settle and no checkpoint to queue. It takes `reportFailure` and is outside this rule entirely (Q-1);
- **`FAILURE_ACTIVATION`, or any classification inside `activation.effect` before the `onStart` call** — an operation exists and the checkpoint does run, so the fallback path is reached and must decline. This is the case the marker exists to catch.

A failure in `activation.effect` **at or after** the `onStart` call publishes a terminal — **including a throw from `onStart` itself**, which is classified `FAILURE_TERMINAL_CALLBACK`'s sibling at the start boundary and still owes an end. The split is exact because the marker advances immediately **before** the call rather than after it or at the seam boundary. **Silently publishing for an operation the consumer never heard start would be worse than the skip D-66 retracts**: the consumer would receive an end for a drag it has no record of beginning.

**Ordering, where both channels fire.** `onError` reports a fault when it is **classified**; the terminal is published at the operation's **disposition**. Classification precedes disposition for every stage except one, so `onError` precedes `onEnd` in every case a consumer will meet — and the exception is unavoidable rather than chosen: a fault raised **by the terminal callback itself** (`FAILURE_TERMINAL_CALLBACK`) is necessarily reported after it. Stating it this way avoids a rule that would have to be broken; stating it as _"`onError` always comes first"_ would not survive its own first counterexample.

Ordering is normative, and D-41 shortens the join without weakening it. `destroy()` precedes the pin so a running WAAPI animation cannot override the inline transform — unchanged, and now the **first** fallible step rather than the second. The measurement no longer happens here: it happened at arm, while presentation was owned and the authored DOM was final, and the join reads the value it recorded. **This is what "the kernel performs the authoritative pin at the join" always meant** — the pin is the join's, the measurement never had to be, and separating them is what lets the runner and the pin agree on one target instead of two.

The rule that `anchorTarget` may never be called after `presentation.dispose()` still holds and is now structural rather than a warning: there is no call site after arm.

**Presentation release is in a `finally`, and every step before it is individually fallible** (review 4, §12). The join calls into two pieces of code the kernel does not own — a possibly-custom runner handle and a lift write — and an earlier draft let either of them skip the pin _and_ strand temporary presentation. Now a thrown `destroy()` from a custom runner costs a report; a failed final write costs a classified failure; neither prevents the placeholder from being removed and the inline styles from being restored. A terminal-callback throw still leads to retirement. The third piece — the behavior measurement — moved to arm with D-41, and D-49 governs it there: it neither fails the settlement nor strands presentation, because the join runs regardless and its `finally` is what releases.

**Runner obligation.** A landing runner drives the lift's transform and nothing else. After `destroy()` it must leave no committed animation that overrides inline style.

### A landing that cannot be measured is skipped, not faked (D-49)

D-41 collapses two measurement sites into one, and that silently converts a tolerated fault into a fatal one. The old contract survived a failed `anchorTarget` per drop, because F-17 and I-29 made it **best-effort** and the join's own pin decided correctness. With one site, failing the settlement would tolerate none — and an earlier draft of this revision did exactly that, returning `ARM_FAILED` and replacing the settlement for a measurement throw. **That is the wrong trade and D-49 reverses it.**

> A failed measurement — a throw from `anchorTarget`, or D-42's precondition check finding the placeholder detached or no longer the item's sibling — **reports through `onError`, skips the landing animation, and joins immediately.** The settlement is not failed. The domain result stands.

The domain result stands because it is **true**: the DOM commit already happened, the consumer's resolution was accepted, and the reorder is real. Failing the settlement would tell a consumer whose reorder succeeded that it did not, over a fault that is entirely presentational.

**This unifies with D-42 and strengthens it.** D-42's landing clause said the library "lands from the unrepaired position". Probe C1 shows what that position is: a detached placeholder measures `0×0` at the viewport origin, and the row visibly travels to `(0,0)` over twelve frames before teleporting back. So the unrepaired position is not a degraded target, it is a **wrong** one, and animating confidently toward it is worse than not animating at all. A detached placeholder is precisely the case where no animation should run. **A jump cut is honest; a confident animation to `(0,0)` is not.** D-49 supersedes that clause of D-42; the rest of D-42 — the precondition check itself, its `O(1)` cost, and the refusal to recover — is unchanged.

**The channel is `onError`, and the tier is quality.** These two normally travel together in this document and here they do not, so both halves are stated:

- **It is not a classified failure.** Nothing is settled `OUTCOME_FAILED`, no recovery is selected, `finalized` still runs, and I-31's single terminal is intact. That is F-17's tier restored — the same tier F-16 gives a visually abrupt correction.
- **It still goes to `onError` rather than the platform reporter.** The audience decides the channel, and the audience here is the **consumer's integration**, not the library author: the fault is almost always a destructive rerender the consumer performed (D-42), and C1's finding is that this is _the worst integration bug in the package and also its most silent_ — all five commit strategies reported `onFinish` once and `onError` zero times. A `DEV`-gated platform report would reproduce the silence in exactly the builds where it did the damage.

> **This section is the seed of D-130 and reads differently after it.** The sentence that made the generalization inevitable is _the channel and the tier are chosen independently here_. D-130 applies it to the whole population: there **is** no second destination to choose between, so the second bullet is now vacuously true of everything the library reports, and what carries the tier is the **class**. `FAILURE_LANDING_TARGET` is deleted with the `QUALITY` sentinel that produced it — a stage that existed to be _classified, non-consequential and recovery-less_ was a shape forced by the old coupling, and a `DraggableWarning` says it directly.

**So `onError` no longer implies a failed operation, and D-60 makes that normative.**

> **`onError` is orthogonal to the terminal.** One operation may produce `onError` **and** `onEnd` (D-62). ~~`FAILURE_LANDING_TARGET` is the first stage that is _classified, non-consequential, and has no recovery_.~~ **Since D-130 the class says it**: a `DraggableWarning` reaching `onError` never implies a failed operation, and the terminal still follows.

§Failure classification's "a failed operation reports through `onError` only" was always a one-way implication, and **D-66 retracts even that**: a failed operation now reports through `onError` **and** publishes one `onEnd`, whose argument is the frame's own result or a derived `canceled`. What D-60 found first is that the converse — which this document nowhere stated but everywhere **assumed** — is false. `onError` means _something the consumer should know about_; `OUTCOME_FAILED` remains the only thing that means _the drop did not complete_.

The owner had already decided this in the API review's §4 — _diagnostics remain orthogonal; do not create a second terminal taxonomy merely to encode diagnostic provenance_ — and it is the same sentence that keeps D-40 to one `canceled`. It is written down here because nothing in the model had ever needed to test it, and an assumption a reader re-derives from six consistent examples is indistinguishable from a rule until the seventh arrives.

**Two things follow that are not stylistic.** The `FailureStage` → recovery mapping must be able to _express_ a stage with no recovery rather than treat it as a gap — a missing entry and a deliberately absent one are different, and only one of them is a bug. And any assertion of mutual exclusivity between `onError` and the terminal is now false: probe C1's defect reads _`onFinish` once, `onError` zero_, and the **fixed** behavior reads _`onFinish` once, `onError` once_.

### The landing origin is what was rendered, not what was pointed at (D-35)

Probe [13c](../probes/13c-free-drag.md) N-2 found `LandingContext.from` computed as `pointerX - originX` and documented as _"where the visual is now"_. Those are the same number for **one** behavior: the sortable behavior's `moved` writes the raw pointer delta, on either axis. They are different numbers for any behavior that constrains its visual — an axis lock, a bounds clamp, a snap, an externally controlled position — and a command operation has no pointer at all, so the pointer form would compute a landing origin from a `-1` sentinel and two zeroes.

The consequence is the signature of this bug class: **the landing opens with a jump and still ends correctly**, because the _target_ is behavior-supplied through `anchorTarget` and the kernel re-pins at the join. Phase 11 found the same shape in the lift geometry, where every test passed throughout.

**The fix adds no seam.** `VisualLiftSession` is the kernel's own object and `write(x, y)` — compose, then assign — is the library's only rendering entry point during an operation, so the session records the delta it last wrote and the kernel reads it. `compose(x, y)` remains a pure string builder for a runner and records nothing: composing is not rendering.

**And the behavior never holds the whole session.** It is handed a `BehaviorLiftSession` — `visual`, `baseTransform`, `compose`, `write` — so it can neither read `rendered` nor call `dispose()`. Both would falsify the recorded delta rather than merely observe it, and the second would do so through a first-class method. See §`ActivationScope`.

#### The temporal rule on `write`

`write` is the one granted capability whose correctness depends on **when** it is called, not only on who holds it. Structural projection cannot express that: the member has to exist, because rendering is what a behavior is for. A retained `BehaviorLiftSession` therefore stays callable and stays _effective_ — `write` composes against the base transform and assigns, with no phase test and no operation check.

> **A behavior may call `lift.write` only before `LandingContext.from` is sampled.** After the landing context is built, the runner is the deliberate writer until its `destroy()`; after retirement, the session belongs to no live operation. A `write` in either window is **outside the contract**, and `from`, the landing trajectory and the join pin are not defined for it.

This is **tier C**, and it is a _second_ tier-C rule rather than a restatement of the first. The two are different mistakes: a direct `style.transform` write is _rendering by another route_; a late `write` is _rendering at the wrong time_ through the sanctioned route. Both leave the visual and the kernel's model of it disagreeing, and neither is prevented.

**No guard is added, and that is a decision** (Checkpoint C, C6-01). A phase or operation test inside `write` would put a branch on the one path M-1 measures and F-8 accounts for, to defend against a bug no reference behavior has — and it would convert a contract violation into a **silent** no-op. Silent is the worse failure: a behavior that writes late and sees nothing happen has a harder defect to find than one whose visual visibly fights the landing. If a real behavior ever does this, the cheap instrument is a `DEV`-only report at the call site, not a production branch. Recorded, not built.

The reference behavior obeys the rule by construction: every `lift.write` it issues is inside `moved` or `release.effect`, and the kernel calls both before the settlement arms — therefore before `from` exists.

Earlier drafts of this document and of [06](06-vertical-sortable-trace.md) showed the behavior composing and assigning in two steps (`lift.visual.style.transform = lift.composeXY(dx, dy)`). The implementation has had one `write(x, y)` since phase 6 and the prose had not caught up; the correction is recorded here because D-35 depends on it. The hot-path accounting is unchanged — three post-`MOVE` indirect calls, now `spec.moved`, `lift.write`, `frame.schedule` — and F-8's number stands.

This is stated as a rule rather than an implementation note, because it is what makes the recorded value _mean_ anything. **The rule is scoped to the interval the value is needed for, and no further** (Checkpoint C, C4-02):

> **From acquisition until `LandingContext.from` is sampled, conforming behavior rendering goes through `lift.write`, and the session records that delta.** After the context is created, the **landing runner is the explicit writer exception**, until its `destroy()` relinquishes the transform for the join pin.

An earlier wording said the session was the sole writer "between acquisition and the join". That is both wider than the property needed and **false against this document's own landing contract**, which requires the runner to drive the transform before the join. What correctness depends on is one sample, taken once, before control is handed over.

**What the behavior can still do, stated plainly.** It receives the real element through `ActivationScope.visual` and again through the lift session, so it can write `visual.style.transform` itself. Doing so leaves the recorded delta stale and the landing opens from the wrong place. That is **tier-C discipline the API permits, not a tier-B property the kernel enforces** — the same shape as "a `prepare` performs no externally visible mutation". Rating it B would repeat the mistake I-32 made in the first draft of this revision: claiming enforcement for a prohibition that a member holding the real object can trivially violate.

What _is_ enforced is narrower and is the half that matters: the behavior supplies no origin, and `from` is by construction the delta the session last composed. A behavior cannot make those two disagree; it can only render behind the session's back. I-34 is rated accordingly.

Three properties follow, and they are why this beats the `renderedDelta(current): Point` seam 13c sketched as the obvious candidate:

- **Two scalar field writes are added to the hot path, and nothing else** — no seam, no call, no allocation — against one more indirect call per drop plus a member on every behavior. M-1's frame-copy budget is untouched because the frame is untouched. This is **not** the same claim as "nothing is added", which is what an earlier draft said (C4-02); the writes are real and are **unmeasured** until Phase 21 re-runs M-1 over the revised runtime.
- **It is correct for writes that do not come from `moved`.** A controlled position written from an `action.effect` (13c N-4) still goes through `lift.write`, so the recorded delta tracks it. A `renderedDelta` seam reading committed frame state would have needed the behavior to mirror every write into its part, which is exactly the duplication that produced the defect.
- **The sortable implements nothing.** A seam would have made every behavior answer a question only some behaviors have an interesting answer to.

13c N-2's compile assertion — that no `BehaviorSpec` member reports the rendered delta — therefore **stays failing to compile after the revision**, and that is the intended outcome rather than an oversight: no seam reports it because no seam needs to.

**One coordinate space, frozen at phase 9.** `LandingContext.from` and `LandingContext.target` are both **origin-relative viewport deltas**: CSS pixels to translate the visual by, measured from where its border box sat at admission. That is exactly the space `compose(x, y)` and the kernel's own `lift.write(x, y)` consume, so a runner converts nothing — `compose(from.x, from.y)` reproduces the transform the drag last wrote. (`LandingHandle.retarget()`'s argument was a third member of this list until D-41 deleted it; the space is unchanged by its removal.)

Earlier listings in this document show `anchorTarget`'s raw viewport point being handed to the runner. It is not: the kernel converts first. A runner's only writer is `compose`, which cannot convert a point, because the context carries no origin rect and is deliberately not given one — handing over a point would make every runner re-derive the grab basis the kernel already holds. The space is also unaffected by lift mode: both lifted modes translate the delta directly and the in-place mode projects it inside `compose`, so a runner sees the same numbers either way.

**Acquisition is all-or-nothing.** A runner that starts something and then fails to return a handle must leave nothing running. Starting the animation is not the same as _acquiring_ the runner: with WAAPI, `animate()` succeeding is followed by reading `finished` — an accessor — and calling `then` on it, and either can throw. The handle being built never reaches the kernel in that case, so an animation left playing keeps writing the transform with nothing able to stop it: the kernel's `destroy()`-then-pin ordering has no handle to destroy, and the pin loses to the running effect. The runner must cancel what it started and let the throw travel, where `FAILURE_LANDING_CREATE` classifies it. This is the same obligation as the stale-return disposal above, at the other end: there the kernel destroys a handle it cannot own, here the runner cancels an animation the kernel cannot see.

### Re-anchoring follows the recovery, and nothing else

This section was `authoredReady` is not "a presentation was declared", and it separated two questions an earlier draft had conflated (review 4, §6):

1. ~~**Is the authored presentation final now?** That is `authoredReady`.~~ **The question is deleted with D-41.** Under the serial order the authored presentation is final at every point the library measures anything, so the question has one answer everywhere it could be asked and no field records it. The reasoning that made it a _separate_ question from the second one was correct and is why the second one survives intact.
2. **Should this outcome re-anchor at all?** That follows the **recovery**, which is committed behavior state. Only `RECOVERY_DESTINATION` re-anchors to the semantic item. `RECOVERY_HOME` deliberately returns the placeholder to the home slot, and `RECOVERY_IMMEDIATE` deliberately keeps the placeholder where it stands.

The earlier reading — "no readiness declaration means the authored DOM never changed, so never re-anchor" — was wrong for a reason worth keeping, because it is the reason the recovery is the right discriminant: **re-anchoring is a question about what the drop decided, not about who rendered it.** A consumer that applied the reorder imperatively before returning `accept()` has an accepted destination recovery and needs the re-anchor exactly as much as an asynchronous one does. The shipped package agreed, treating an absent promise as ready (`packages/drag/src/sortable/runtime/actions.ts:1133-1148`).

| Recovery | Target | Held? |
| --- | --- | --- |
| destination (accepted) | the placeholder, re-anchored to the semantic item | yes, if `landing()` is installed |
| home (rejected, cancelled, most failures) | the home slot; the behavior returns the placeholder there before measuring | yes, if `landing()` is installed |
| immediate (no-op, landing failure) | the placeholder as it stands | no |

The `immediate` row lost one member: **readiness failure**, which was the deadline expiring. There is no deadline.

**Correctness vs quality, and the quality problem is gone.** Correctness is _the final pin agrees with the authored DOM before presentation is released_, and it holds for every runner. The quality caveat this paragraph carried — F-16, a visible step at the join when a short landing completed before readiness — described a completion order that no longer exists: the runner is given the authoritative target at `start`, so a runner that reaches it produces a pin that changes nothing. **F-16 is resolved by deletion, not accepted.**

### Failure on the quality track versus the correctness track

`anchorTarget()` is called at **one** point since D-41, so the table below is shorter than it was and its organizing principle is unchanged: the failure response follows the **dependency, not the function**.

| Call site | The result is | On throw |
| --- | --- | --- |
| arm, D-42's precondition check | whether the measurement is meaningful at all | **a `DraggableWarning` on `onError`, not classified** (D-49, D-130); skip the landing, join immediately, domain result stands |
| arm, `anchorTarget(current)` | **authoritative** — it feeds both the runner and the pin | **the same warning** (D-49, D-130); identical treatment — a target that cannot be produced and one that cannot be trusted are the same fault |
| arm, `start(context, done, fail)` | the runner handle | classified `FAILURE_LANDING_CREATE`; hold rolled back; `ARM_FAILED` |
| join, `landing.destroy()` | relinquishment of the transform (D-51) | **a `DraggableWarning`** (D-130; ~~a best-effort platform report~~). A custom runner must not be able to strand presentation; the pin proceeds — but `attempt.relinquished` goes false and **I-24 no longer holds**, see below |
| join, `lift.write(...)` | the pin itself | classified `FAILURE_RENDERER_WRITE`; **still** release presentation; **skip** `finalized` |
| join, `spec.finalized(current)` | the terminal callback | classified `FAILURE_TERMINAL_CALLBACK`; the operation still retires |

**Two rows left with D-41 and one arrived with D-42.** The readiness-time `anchorTarget(current, true)` and the `landing.retarget?.()` it fed were the only two "best-effort report; not classified" measurement rows; the precondition check takes their place on the same tier, which is why D-49 can be read as _restoring_ the quality track rather than inventing one.

**`start` is the one arm-time call that still replaces the settlement, and the asymmetry is deliberate.** A measurement that fails leaves the library with no target and a perfectly good drop, which D-49 lands as a jump cut. A `start` that throws leaves the library with a **runner it may not own** — the acquisition-is-all-or-nothing obligation below exists because a half-started animation keeps writing the transform with nothing able to stop it — so there is a live resource in an unknown state, which is a different kind of fault and keeps `ARM_FAILED`.

**A thrown `destroy()` costs the final-position guarantee, not just tidiness.** "Report and continue" is the right _cleanup_ policy — a custom runner must never strand presentation — but if `destroy()` threw before cancelling its WAAPI animation or stopping its rAF loop, that runner may keep writing the transform after `lift.write`. So I-24 is conditional on **three** things, not two: authoritative measurement, a successful pin, _and_ successful relinquishment of runner control. The kernel cannot independently detach a runner it did not create; making the guarantee unconditional would require redesigning runner ownership so the kernel holds an infallible detach, which no first-iteration runner needs.

"Best-effort report" was the channel used for a failing disposer: ~~the platform reporter, no `REPORTING` phase, no `onError`, no `pendingContinuation`~~. **There is one destination since D-130**, so the phrase now names a _tier_ and nothing else: no `REPORTING` phase, no `pendingContinuation`, and a `DraggableWarning` on the consumer's `onError`. It is deliberately not a classified failure, because every classified failure in this model is consequential — it settles the operation with `OUTCOME_FAILED` or retires it.

**~~D-49's rows are a third state.~~ There are two states, and D-130 is what collapsed the third.** D-49's row was `onError` without classification, and best-effort was the platform without classification; once the destination stopped being a choice the two differed in nothing, and the `QUALITY` and `BEST_EFFORT` sentinels became one. What remains is exactly the distinction that was always doing the work: **classified or not**, and the class the consumer receives says which.

**I-29 keeps its subjects, and D-49 gives it back the one D-41 took.** It reads: _no failure on the trajectory-quality path may change the settlement outcome, release or add a hold, or destroy the runner._ D-41 deleted the readiness-time measurement and retarget, leaving `landing.destroy()` as its only subject; D-49 restores the arm-time measurement and adds the precondition check to it. So the invariant now governs three sites and states the rule all of them obey — which is a better position than the one-subject invariant it was briefly reduced to. It also gains a corollary worth stating: **the trajectory-quality path may report through `onError`.** I-29 constrains what a quality failure may _do_, never which channel tells the consumer about it. **That sentence is D-130's whole premise, generalized**: the constraint on _doing_ is the tier, the class is what publishes it, and the destination was never carrying information at all.

### `ActionTransition`

Behavior action tags get the same envelope, which is what makes "the behavior never calls `begin()`/`commit()`" hold for behavior-initiated work too.

```ts
type ActionTransition<Part extends object> = Readonly<{
  prepare(tag: number, argument: unknown, draft: Draft<Part>): {} | null;
  effect(
    tag: number,
    argument: unknown,
    current: Readonly<Frame<Part>>,
    prepared: {},
  ): void;
  rollback?(tag: number, prepared: {}): void;
}>;
```

`Prepared` is opaque to the kernel, which threads it. The behavior narrows it by tag: the spatial tag stages the sentinel `true`, the collection tag stages a `PreparedCollection`.

**Actions stage; they do not publish.** An earlier draft had `action.prepare(COLLECTION)` write `rt.snapshot` and dirty feature geometry _before_ returning its discard signal (review 4, §4). That contradicted D-3 outright — `Prepared` exists precisely so a discarded transition need never have touched the private runtime — and it was not merely an external-effect nicety: a reentrant `cancel()` or `destroy()` can invalidate the preparation after the private runtime has already been replaced, and a later queued action then observes a replacement belonging to a transaction that was discarded.

```ts
type PreparedCollection = Readonly<{
  snapshot: CollectionSnapshot;
  rebased: Insertion | null;
  /** Non-null ends the operation — dispatched by `effect`, after publication. */
  cancelReason: unknown;
  /** False at IDLE and from RELEASING on: the frame snapshot is not rebound. */
  bindsFrame: boolean;
}>;
```

`prepare` computes against the replacement and writes only the draft; `effect` publishes `rt.snapshot`, updates `rt.view.snapshot`, invalidates geometry, and **then** dispatches the cancellation if one was staged.

### An invalidating collection replacement must not be lost

The collection action is the one action that **never discards**. An earlier draft had the invalid paths call `host.cancel(reason)` and return `null` — which skips `effect` entirely, so the cancellation landed but **the consumer's collection update was thrown away** (review 5, §2). `rt.snapshot` and `rt.view.snapshot` kept the old collection, and after retirement the next press started against stale items unless the consumer happened to repeat the update.

An invalid collection ends the **current drag**. It does not un-happen the consumer's update. Staging `cancelReason` and dispatching it last from `effect` keeps all three properties at once: the update is published, publication stays post-commit, and FIFO still runs the cancel transition next.

An action that needs to end the operation _and_ has nothing to publish may still call `host.cancel(reason)` and return `null`. Cancellation precedence stays entirely inside the kernel either way, and **`host.cancel` latches synchronously** — see §[03](03-feature-composition.md) §`ACTIVATING` is handled, not deferred, for why that matters when the caller is `onStart`.

The sortable behavior needs **three** tags: the coalesced spatial frame, the collection replacement, and an invalidation tag that carries a failure raised from a native scroll/resize listener back into a seam — the only place a stage can be classified. It declares `config.actionTags: 3`.

**This document said two until now, and the implementation has said three since Checkpoint B.** The third tag was reviewed and accepted there as the right mechanism — it uses the frozen behavior-action protocol rather than adding an SPI member, which is precisely what Q-4 asks a new tag to justify — but the contract was never corrected, and the Phase 14 revision initially repeated the stale number as evidence that nothing had grown. Corrected here, with Q-4 updated in [05](05-lifecycle-invariants.md): the third tag arrived, it was investigated, and it did not indicate a misplaced boundary. It is also the answer to a question the number alone cannot settle — a tag that exists to _re-enter a seam so a stage can be classified_ is not a lifecycle request in disguise, which is what Q-4 is actually watching for.

**The tag count is static spec data**, because otherwise there is nothing for `arm()` to validate: `BehaviorSpec` listed no tags and `dispatch(tag, argument)` accepts an arbitrary number (review 5, §13). `arm()` checks the declared count once; `dispatch` bounds-checks each tag against it — one integer comparison, because the kernel computes `BEHAVIOR_BASE + tag` and a negative or fractional tag would otherwise alias a kernel action. An out-of-range tag is reported and dropped, never enqueued.

**These tags cannot request a kernel lifecycle transition.** A behavior action enters `ActionTransition` and nothing else — it cannot ask for admission, activation or release. That was recorded as a known pressure point, with keyboard sorting named as the case expected to revise the kernel contract rather than to be worked around with a third tag.

**Phase 13a produced that case and Phase 14 answered it — and the answer left this boundary exactly where it was.** The keyboard gap was never about a behavior needing to _request_ a transition; it was about a behavior needing to be _asked_ a question synchronously, in a native listener, before anything is queued. The revision therefore adds a second admission member (D-32, §Discrete admission) and no behavior-to-kernel intent protocol. D-32 adds no `KernelHost` member, an action still enters `ActionTransition` and nothing else, and **the concrete pressure that motivated Q-4 did not turn into a tag** — which is the data point Q-4 was waiting for, and it is a favourable one.

## Phases and legality

Kept verbatim (D-14):

```ts
const IDLE = 0; // No operation. The only phase that admits input.
const PENDING = 1; // Admitted; activation not yet committed.
const ACTIVATING = 2; // Activation committed; presentation/start effect in flight.
const ACTIVE = 3; // Live, tracking input.
const RELEASING = 4; // Input closed, geometry final, consumer resolving.
const SETTLING = 5; // Outcome committed; awaiting the landing gate.
const REPORTING = 6; // onError in flight.
const FINALIZING = 7; // Finalization in progress: measure, pin, release, report.
```

Two of these were named for a state they describe only _after_ their effect runs. `ACTIVATING` is committed **before** `activation.effect` inserts the placeholder, and `FINALIZING` is committed **before** the join measures, destroys the runner, pins and releases presentation. The names above describe the phase from its commit, which is when it becomes observable.

**`PENDING` was redefined by D-32**, from _below the activation threshold_ to _activation not yet committed_. The threshold is a property of the pointer path, not of the phase: a command reaches `PENDING` with no travel to measure and leaves it on the next drain.

`—` means ignored deterministically. Ignoring is never an error; a handler is total.

| Action | IDLE | PENDING | ACTIVATING | ACTIVE | RELEASING | SETTLING | REPORTING | FINALIZING |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ADMIT` | → PENDING | — | — | — | — | — | — | — |
| `MOVE` | — | commit sample; maybe activate | — | commit sample; `moved()` | — | — | — | — |
| `ACTIVATE` | — | → ACTIVATING | — | — | — | — | — | — |
| `UP` | — | retire (below threshold) | — | → RELEASING | — | — | — | — |
| `RELEASE` | — | — | — | → RELEASING | — | — | — | — |
| `CANCEL` | — | retire | → SETTLING (canceled) | → SETTLING (canceled) | → SETTLING (canceled) | — | — | — |
| `START_COMMITTED` | — | — | → ACTIVE | — | — | — | — | — |
| behavior tag 0 (spatial) | — | — | — | `action` envelope | — | — | — | — |
| behavior tag 1 (collection) | `action` envelope in every phase — the behavior decides per phase |  |  |  |  |  |  |  |
| `RESOLUTION_SETTLED` | — | — | — | — | `settlement` → SETTLING | — | — | — |
| `LANDING_SETTLED` | — | — | — | — | — | release hold | — | — |
| `FAILED` | — | ✔ | ✔ | ✔ | ✔ | ✔ | — | ✔ |
| `ERROR_REPORTED` | — | — | — | — | — | — | continue | — |
| `RETIRE` | — | — | — | — | — | — | — | → IDLE |

**The table lost a row in Revision 2.** `READINESS_SETTLED` sat between `RESOLUTION_SETTLED` and `LANDING_SETTLED`, releasing the readiness hold or replacing the settlement on the deadline. D-41 deletes the action along with the gate it served; nothing else in the table moves, which is a fair measure of how contained a queue action is.

**`ACTIVATE` and `RELEASE` are the discrete path's producers of two transitions the pointer path already reaches** (D-32). `ACTIVATE` is queued by the command ingress boundary and enters the same activation seam the threshold crossing enters inline from `MOVE` — inline for the pointer path, because queuing it there would add an entry to every activation and change the drain shape for no gain. `RELEASE` is queued once `START_COMMITTED` has run for a pointerless operation and enters the same release transition `UP` enters at `ACTIVE`. Neither is reachable for a pointer operation and neither is reachable from a behavior: `KernelHost` still has no lifecycle entry.

## Release ordering (D-6)

Two commits, in a fixed order the kernel owns:

```text
> UP  begin(); draft.phase = RELEASING; draft.pointerX/Y = release point
      commit()                                  ← commit 1: state matches reality
      lifetimes.motion.dispose()                ← capture released, listeners
                                                   removed, invalidation removed,
                                                   the behavior's frame task
                                                   cancelled
      begin(); spec.release.prepare(draft)      → insertion + proposal
                                                  + ResolutionCommand
      preparationValid(); commit()              ← commit 2
      spec.release.effect(current, command)     ← placeholder to the final gap,
                                                  AND the final lift render
      execute the command                       ← open resolution, or settle
                                                  immediately when `invoke` is null
                                                  (only on SEAM_COMMITTED)
```

**The final lift render is normative, not a trace embellishment.** `pointerup` need not carry the same coordinates as the last processed `pointermove` — the `UP` action commits the release point, and the proposal is computed from it. An earlier draft showed the render only in the trace while the seam table and the reference behavior moved the placeholder alone (review 6, §7), which would leave the visual and the entire landing trajectory starting from a stale point while the committed transaction describes a newer one. A compose or style failure here is classified `FAILURE_RENDERER_WRITE`.

The one extra 15-field `Object.assign` per `pointerup` buys a general invariant: **no kernel-ordered irreversible action occurs while the committed frame describes a state that action has invalidated.** Committing `RELEASING` first means a `release.prepare` that throws or reentrantly destroys never leaves a committed `ACTIVE` operation with no ingress and no path forward. It cannot return `null` — that is not expressible.

Release stability is tier **B**: the kernel closes motion between the two commits, so nothing pending — a queued sample, a scheduled frame, an invalidation — can alter the proposal, and the behavior has no opportunity to sequence it wrongly.

**A pointerless release commits no release point.** For a `RELEASE` action (D-32) commit 1 writes `phase = RELEASING` and nothing else: there is no sample to commit, and the pointer fields stay as admission left them. Commit 2, the motion disposal between them, the staged `ResolutionCommand` and the `SEAM_COMMITTED`-only execution rule are all identical.

**And `release.prepare` must not resolve spatially on that path.** The pointer scalars are still zero, so a spatial resolve would select a gap from `pointerY === 0` — the top of the viewport — and silently replace the destination the command authored. The branch is normative and is specified at §The command destination; this section states only the kernel half, which is that commit 1 writes no sample and therefore offers the behavior nothing to resolve _from_.

The final lift render inside `release.effect` (F-39) is behavior code and stays behavior code, and it is **branched on the same discriminant**: the pointer path writes the committed release delta, the pointerless path writes nothing. `(0, 0)` is then the correct landing origin because the visual has not moved since acquisition. Both paths still move the placeholder — see §The command destination for the full effect.

## Queue semantics

Ported unchanged from the shipped package. Entirely kernel-private.

- **Two parallel arrays** (`actions: number[]`, `args: unknown[]`). An enqueue is two pushes with **no per-entry object allocation**; array capacity growth is amortized, so this is not literally allocation-free and is not claimed to be.
- **The drain handler and the panic callback are created once per controller.** The shipped `dispatch` allocates a fresh handler arrow and a fresh panic arrow on every _outer_ dispatch (`packages/drag/src/sortable/runtime/actions.ts:151-174`). Since probe 2 ports the queue unchanged, this is called out as a required change rather than an inherited property: hoist both, or inline the drain loop.
- **FIFO.** Entries process in order; each retains its own argument.
- **Run-to-completion.** A nested `dispatch` during a drain appends and returns. The outermost frame owns the pass and reaches the appended entry in the same drain. Nested calls never interrupt an action midway.
- **Terminal latch.** `closed` is re-read every iteration, so a consumer calling `destroy()` from inside a callback stops the drain immediately.
- **Panic.** A throw escaping a handler is an invariant violation: clear the queue, tear down exactly once, then report the initiating error.
- **No internal steps are queued.** One pointer move is one action that validates, prepares, commits, renders and notifies — not six.
- **Behavior tags share the queue** and are offset from `BEHAVIOR_BASE` by the kernel, so a behavior declares `0`, `1` and `2` — the sortable's three, per §An invalidating collection replacement, above — and never learns a kernel tag value. This bullet said "`0` and `1`" after that section was corrected to three (C4-08).
- **Every native admission is a queue boundary.** Run-to-completion above says a nested `dispatch` appends and returns because the outermost frame owns the pass — which presumes a drain is on the stack. Admission is the one kind of transaction the kernel drives _outside_ the seam driver: it mutates the draft directly across the whole of an admission member and commits at the end, so the driver's re-entry refusal cannot see it, and there is no drain to append to. A handle or visual resolver calling `controller.invalidate()` — the D-44 replacement for `updateItems()`, and equally reentrant — would therefore start a _new_ drain underneath a half-written admission — `begin()`, `commit()`, a frame-pair swap — after the member has already captured the draft by reference. The item and snapshot land on one frame, the phase and operation on the other, and the committed operation has no item at all.

  **This applies to `admit` and to `command.admit` identically** (D-32), and the refusal below is one shared latch across both listeners rather than one per listener. A `keydown` dispatched from inside a `pointerdown` resolver, or a second press dispatched from inside a command's handle resolver, is the same half-written-transaction hazard with the two ingresses swapped.

  So dispatch **enqueues without draining for the whole of admission**, and the boundary drains once, after admission has either committed (`PENDING`) or abandoned. `destroy()` is exempt and unchanged: it is not queued, so it stays the synchronous terminal barrier I-6 requires, and the queue it closes drops whatever a resolver appended. The arming is cleared in a `finally`, so a throw escaping admission cannot leave later dispatches queued with nothing to drain them.

  **A nested ingress event is refused for the same reason, and must be refused before anything else runs.** A resolver can dispatch a second eligible press or a declared command type, which re-enters an ingress handler synchronously — and the ordinary "an operation is already live" guard does not stop it, because the outer admission has not committed and `current.operation` is still `null`. The nested pass would `begin()` (rebuilding the draft the outer member holds by reference, discarding whatever it had already staged there), run an admission member a second time, mint an identity and commit its own origin; control would then return to the outer member, which finishes writing _its_ item and visual into the object that is now `current`. The result is one committed operation carrying one event's coordinates and the other's behavior state.

  The refusal is therefore the **first** condition in each handler — ahead of the frame rebuild, ahead of the admission member, ahead of any pointer write — and the nested pass returns without reaching the `finally`, so the outer boundary's ownership is never cleared out from under it. It is a refusal, not a latch: the controller admits the next press normally.

Only two things coalesce: the behavior's rAF frame task and, inside it, the single latest spatial attempt. Pointer input and collection replacement never coalesce.

## Attempts and stale continuation rejection

| Attempt | Owner | Identity | Validated |
| --- | --- | --- | --- |
| Resolution | kernel | object | producer boundary + on `RESOLUTION_SETTLED` |
| Settlement (the landing gate) | kernel | object | producer boundary + on gate release |
| Spatial frame | behavior | monotonic `number` (D-11) | producer boundary + in `action.prepare` |

Identity is validated **twice** in every case: once before dispatching and again when the queued action is applied. The two layers guard different windows — an attempt slot may be reset at a different moment than the frame phase changes — so both are required.

A resolution attempt still distinguishes `completed` from `settlement`: `settlement` is the discriminated payload, cleared once consumed, so a fulfilled `undefined` and a rejected `undefined` stay distinguishable; `completed` records that the resolver produced a result at all. The abort guard keys off `completed`, because keying it off the payload aborts a finished resolver's own signal.

## Failure classification

The behavior calls `host.fail(stage, error)` without an operation identity — the kernel holds it. Stages reachable from the sortable behavior, with recovery:

`ADMISSION` (none) · `ACTIVATION` (immediate) · `RENDERER_WRITE` (home) · `INSERTION` (home) · `PLACEHOLDER_MOVE` (home) · `INVALIDATION` (home) · `SCHEDULED_FRAME` (home) · `REORDER_RESOLUTION` (home) · `RELEASE` (home) · `LANDING_CREATE`, `LANDING_INTERRUPTED` (immediate) · `LANDING_TARGET` (**no recovery — the settlement is not failed**) · `TERMINAL_CALLBACK` (none, retire).

Two entries moved in Revision 2. `PRESENTATION_READY` was in this list until D-41; it classified the acknowledgement deadline, and there is no acknowledgement. **`LANDING_TARGET` became the model's first non-consequential classified stage** (D-49, made normative by D-60): it names the one authoritative measurement and D-42's precondition check, both at arm, and both report through `onError` without settling the operation. It stays in the `FailureStage` union because it is the stage the report carries; what it no longer carries is a recovery.

**`—` here means _no recovery, by decision_, and the mapping must be able to say that.** Every other stage in the list names one because every other stage settles or retires the operation. Leaving this one blank as though the row were unfinished is the reading D-60 forbids: a stage with no recovery and a stage whose recovery nobody has chosen look identical in a table and are opposite in meaning.

`stage` is typed as the closed `FailureStage` union of those constants, not a bare `number`, so a participant cannot forge an invalid or kernel-private stage.

### ~~The stage is internal; the consumer gets a code (D-64)~~ The stage is what the consumer gets (D-132)

Everything above is **kernel-tier and middle-tier vocabulary**, and the stage vocabulary is _also_ ordinary-tier public. ~~It was ordinary-tier public until Revision 2.1, and it is not any more: `onError` hands the consumer a `DraggableError` carrying a coarse `code` — `'consumer' | 'interaction' | 'presentation' | 'platform'`, names not frozen — and never a stage.~~ **D-132 reversed that half of D-64.** `onError` hands the consumer a `DraggableError` carrying `stage: FailureStage | null`, and `drag.js` publishes the type and the twelve constants as a second publication point over the one declaration in `kernel/failures.ts`. The classification machinery is still unchanged; what narrowed and then widened again is its audience.

~~**The library therefore owns a stage → code mapping, and it must be total in the type.** This is the second total mapping this section carries, and the first one — stage → recovery — is the reason to insist: D-60 exists because a gap in that mapping was read as an unfinished row rather than as a decision. A `default:` arm that assigns `'platform'` to whatever is left would reproduce exactly that defect, silently, on the channel a consumer actually reads.~~ **There is no second mapping.** D-130 removed its anti-divergence job structurally by making the kernel the only constructor, and D-132 deleted what remained — a step whose sole surviving function was to discard information. **The D-60 argument is kept because it is still true of the mapping this section does carry**, stage → recovery, and because it is what a future second mapping would have to answer.

~~**The axis is fault attribution, not pipeline position** (review 3 §12). The current list already encodes it, badly: `ADMISSION`, `REORDER_RESOLUTION` and the terminal-callback stages are consumer-caused; `SCHEDULED_FRAME`, `RENDERER_WRITE` and `INVALIDATION` are not. The mapping's job is to state that split rather than to compress the pipeline names.~~ **The observation is right and the conclusion drawn from it was wrong** (D-81, D-132). Some stages do name a caller and others name a seam position — which makes the list _two_ axes, not one badly-encoded axis, and a mapping cannot state a split that its input does not carry. `ADMISSION`, `RESOLUTION` and `TERMINAL_CALLBACK` still name a caller, and that is the one grouping a consumer can act on; it computes it from the stage rather than receiving it pre-computed and wrong.

**`FailureStage` remains public at the kernel tier**, because a behavior author calls `host.fail(stage, error)` and cannot do so without naming one. That is the same rule this contract has run on since phase 9 — export what the tier's public surface structurally depends on — applied at the tier that now depends on it.

**`fail` is valid only inside a kernel-driven seam of the current operation.** Because it targets "whichever operation the kernel currently holds", a late asynchronous callback belonging to operation A could otherwise classify a failure against operation B — which contradicts the double-validation rule the rest of the model depends on. The kernel keeps a private `inSeam` latch that the driver sets around every `prepare`/`effect` call; a `fail` outside one is downgraded to a platform report and never classified. That makes the rule tier **B** rather than discipline.

Two consequences for who gets what:

- **A feature's long-lived context carries `report(error)`, not `fail`.** A feature closure created at construction has no way to know which operation is live, so it must not be able to classify against one. Anything it throws synchronously inside a seam is caught and classified by the driver, at the stage that seam owns; anything it wants to surface asynchronously is a `DraggableWarning` on the one channel (D-130).
- **Asynchronous work that legitimately needs to fail an operation receives an operation-scoped callback.** The landing runner's `fail(error)` argument is exactly this: it is minted per attempt and becomes inert once the attempt is retired.

Precedence, for one operation, highest first:

```text
DESTROY  >  CANCEL  >  FAILURE_CHECKPOINT
```

`onError` runs in `REPORTING`, exactly once per failure, and never replaces the initiating error. **It does not imply a terminal, and does not suppress one** (D-60; and after D-66 the second half is unconditional — no failure of any tier suppresses the terminal): a D-49 measurement failure reports through this channel and the operation still reaches `onEnd` with its true domain result (D-62).

This paragraph carried a second sentence about the readiness **deadline** — that it replaced the settlement, kept presentation owned and reported through `onError` only, and was the one classified readiness outcome (D-33). It is deleted with the deadline. The shape it described survives at a different site: an `ARM_FAILED` measurement replaces the settlement, keeps presentation owned until the failure path's immediate recovery releases it, and reports through `onError` with no `onFinish` and no `onCancel` following.

## Where the four changes touch each other

Phase 14 revises the contract **once**, against three probes together, and the reason that is a single revision rather than four is written here. Each change below was cheap on its own; three of the four decisions were made differently than they would have been in isolation.

**D-32 needed D-35 to be correct at all.** A command operation has no pointer: its committed `pointerId` is `-1` and its pointer fields are zero. Under the old rule, `LandingContext.from` = `pointerX - originX` would have computed a landing origin of `-originX, -originY` for every keyboard reorder — a landing that opens from off-screen. Patched independently, D-32 would have shipped with that bug and D-35 would have been "a free-drag concern"; taken together, D-35 is what makes a pointerless operation's geometry _defined_ rather than accidentally survivable. This is the strongest argument in the revision for the single-pass rule 00 sets.

**D-32 shrank because the draft was already the carrier.** 13a's candidate vocabulary carried a staged `Prepared` from the native listener to the release seam. Threading it would have meant a staged value that survives across queue entries, which §The staged value never outlives its transaction forbids outright, _and_ a second staged type parameter on `BehaviorSpec` alongside D-34's. Both disappear once the command writes its destination gap into the open draft the way `admit` already writes `item`, `visual` and `snapshot`. The interaction runs the other way too: had D-34 not been on the table, the pressure to add a second staged parameter would have been easier to miss.

**D-34 is one parameter and not two, and that is a consequence of the above.** `BehaviorSpec<Part, Activation>` parameterizes exactly the one place where the sortable's shape was written into the kernel. The kernel itself still treats the staged value as `{}` and drops it; the parameter exists so a behavior that stages nothing can _say so_ instead of returning an element it does not own.

**D-33 was the only change that did not touch the other three, and Revision 2 retracted it.** The observation is left standing because it is the one that aged well: precisely because D-33 was confined to the settlement scope, the prepared gate plan, the arm step and one host member, deleting it in Revision 2 cost nothing outside those four places. **A change that touches nothing else can also be _removed_ without touching anything else**, and that is a stronger argument for isolation than the original paragraph made. What the original claimed — that the two gates' independence (I-8) and the render/landing overlap were structural rather than disciplinary — is now vacated rather than falsified: see §The serial authored commit, "the overlap property is not lost, it is re-owned".

**D-33's first form was wrong, and the way it was wrong is worth keeping** — more so now that the second form is gone too, because the lesson outlived both. The revision originally answered 13b with a kernel-minted `PresentationToken` delivered at arm time — candidate C-2, chosen because it inverts _creation_. Checkpoint C found that it inverts creation to a point _after_ the mutation it is meant to acknowledge has already begun, so a synchronous commit acknowledges nothing and the gate times out (C-01); and that the `abandon()` state it needed produced an accepted `onFinish` over an authored DOM showing the old order (C-02). Both defects trace to the same root: **an acknowledgement capability minted by the settlement is younger than the render it acknowledges.** The request is older than the render by construction, because it is what asked for it.

D-41's serial order is the third answer to that question and the only one that does not need a capability at all: if the render happens _inside_ the call that asked for it, nothing has to be older than anything. Two forms of this protocol were built and both were retracted; **the residue is a lesson about capability age**, and it is recorded here rather than in the deleted section because D-47's published kernel surface will meet the same question the next time something has to be acknowledged per operation.

**Two things stayed out, deliberately.** Settle-time landing timing already fits through `landing({ run })` and its residue is a public-option ergonomics question (13b B-2) — **and D-63 removes `run`, so what it fits through now is the `duration` thunk alone, which is why L-6 is under pressure (03 §Public option domains)**; public lift modes and coordinate-space ownership are surface decisions the seams already express (13c P-2, P-4). Carrying either into a contract revision is how a revision grows.

### What the second behavior validated without changing

An unchanged seam that a second behavior exercised is a stronger claim than an unexamined one, and 13c is the first time the behavior-agnosticism claim had any evidence at all. These six rows are that evidence, and they are normative in the same sense the rest of this document is: a later change that breaks one of them owes a case.

| # | Question | Result |
| --- | --- | --- |
| P-1 | Clamp to `bounds` before writing — does "P-2 resolved at no hot-path cost" survive? | **Fits as a shape.** The constraint is arithmetic over fields the frame already holds; a bounds rect caches in the behavior's part with a version, so a thunk source resolves on invalidation rather than per sample. Whether it is _affordable_ is Phase 21's number. |
| P-2 | Where does a consumer coordinate space live? | **Behavior-private.** A `CoordinateMapper` is pure and lives in the behavior runtime; the kernel commits viewport coordinates and is never told. No seam changes. |
| P-3 | A per-sample consumer callback (`onMove`) | **Fits.** One call at the end of `moved`. Affordability is an M-1 question. |
| P-4 | Three lift modes as a public option | **A surface decision.** `config.liftMode` is static spec data the behavior chooses at install, so a feature can supply it; whether a kernel-internal enum becomes public is Phase 18's. |
| P-5 | Does `anchorTarget` cover a synchronous `resolveHomeTarget`? | **Yes, and more cleanly after D-41.** It returns a viewport point. The `authoredReady` argument this row cited as the match for the shipped synchronous home-target contract is deleted — under the serial order the presentation is always final when `anchorTarget` runs, so the synchronous case is no longer a special value of a parameter, it is the only case. |
| P-6 | `controller.update()` with live policy | **Fits.** An ordinary behavior action: `update` dispatches, `action.prepare` writes the new policy into the draft. The _controlled position_ half is D-35's, not this row's. |

The honest summary of 13c is that the kernel **is** behavior-agnostic except in two named places, both now fixed: activation staged an `HTMLElement` because the sortable stages a placeholder (D-34), and the landing origin was a pointer delta because the sortable's visual tracks the pointer (D-35). That is a claim Checkpoint E can evaluate; "the kernel is behavior-agnostic" was not.