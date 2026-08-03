# 6. One complete vertical-sortable lifecycle

This trace is illustrative. Document 02 is the normative lifecycle protocol; if
a trace sentence drifts from it, document 02 wins and this trace must be fixed.

A successful downward reorder in a controlled React application, with
`layoutAnimation()` and `landing({ duration: 200 })` installed.

`>` is a queue drain step. Indentation is direct calls. `[K]` is kernel-private
work, `[B]` behavior, `[F]` feature. Bracketed markers on the right name the
invariant or decision being satisfied.

## Construction

```text
draggable(list, sortable(items, vertical(), placeholder({ className: 'ghost' }),
                         layoutAnimation(), landing({ duration: 200 }),
                         callbacks({ onReorder, onStart, onFinish })))

[K] createKernel(list)
      queue = ([], []), running = false, closed = false
      current = draft = null            ← not yet armed
[B] behavior(host)
      [B] assemble(features, ctx)
            vertical()          → { insertion: { resolve, invalidate,
                                                 retire } }         private: RectIndex
            placeholder(opts)   → { createPlaceholder }             private: options
            layoutAnimation()   → { beforeInsertionMove,
                                    afterInsertionMove, retire }    private: Map
            landing({200})      → { startLanding }                  private: timing
            callbacks({...})    → { callbacks }                     no threshold given
            validate: insertion ✔  onReorder ✔                      [D-12]
            flatten: resolveInsertion, invalidateInsertion
            normalize: onStart → the consumer's; threshold → 8 (default)
            retireHooks reversed: [layoutAnimation, vertical]
            → SortableSlots; every contribution object now unreachable
      [B] rt = { host, slots, frame: createFrameTask(realm, …),
                 snapshot, view: null, placeholder: null, lift: null,
                 spatialSeq: 0, pendingSpatial: 0 }                  [H-2]
                 ← the coalesced frame task is created ONCE, here. It is not
                   nullable and not per-operation; retire and destroy cancel it.
      [B] spec = createSortableSpec(rt)      ← ~16 closures over `rt`  [F-4]
      → { spec, controller }
[K] kernel.arm(spec)
      current = composeFrame()   → createFramePart(); validateFramePart(part)
      draft   = composeFrame()   → createFramePart(); validateFramePart(part)
             ← BOTH results are validated: no kernel-key collision, no
               `__proto__`, no symbols, no accessors, plain enumerable
               writable string keys. The factory is not proven deterministic
               (F-2), so checking only the first would let the second
               introduce a collision.                                [I-5]
                ← same code path twice → one hidden class            [D-15, I-27]
      __DEV__: key sets match ✔  (captured as armedKeys for scrub checks)
      ── if any step here throws: spec.retire() best-effort, scrub, abort
         ingress, rethrow. No half-armed controller escapes. ──
      list.addEventListener('pointerdown', …, { signal: ingress.signal })
→ controller
```

What the kernel now holds of the behavior: **one `spec` reference.** No runtime,
no slots, no rect index, no placeholder. What the behavior holds of the kernel:
one `host` with six members, none of which drives a transition.

## Admission

```text
pointerdown on item 2

[K] listener: !closed ✔  current.operation === null ✔  isPrimaryPress ✔
[K] begin()                                    Object.assign(draft, current)
[B] spec.admit(event, draft) → HTMLElement                            [D-5]
      resolve the pressed item from rt.snapshot via composedPath()
      slots.getHandle — not installed, skip
      draft.item = item2
      draft.visual = item2                     (slots.getVisual absent → identity)
      draft.snapshot = rt.snapshot
      event.preventDefault()
      return item2                             ← the element the kernel will lift
[K] recheck !closed && operation === null      ← POST-CALLBACK CHECK      [F-30]
      a consumer handle/visual resolver runs inside native dispatch and can
      close over this controller and synchronously destroy() it. Without this
      recheck the listener would mint an operation on a terminal controller.
[K] mint OperationIdentity
[K] create the three lifetimes; arm motion + cancellation ingress
[K] draft.phase = PENDING; pointerId, originX/Y, pointerX/Y = the press
[K] commit()                                   swap two references
```

`draft.phase` is written by the kernel, after `admit` returned. The behavior
could not have written it: it saw `Draft<Part>`, where the kernel slice is
`Readonly`. **[I-5, tier A]**

No pointer capture yet — capture is acquired at activation, so a below-threshold
press never captures and never retargets later pointer events to `root`.
**[D-17]** Whether a *click* still fires is a separate question the contract
does not decide: admission already called `preventDefault()` here.

## Below threshold

```text
pointermove (+3 px)
> MOVE  [K] phase PENDING ✔  pointerId matches ✔
        [K] begin(); pointerX/Y = sample; commit()
        [K] |Δ| < config.threshold (8) → nothing further
```

## Activation

```text
pointermove (+11 px)
> MOVE  [K] begin(); pointerX/Y = sample; commit()
        [K] |Δ| ≥ threshold → open the activation transition
        [K] originRect = visual.getBoundingClientRect()
        [K] lift = acquireLift(visual, config.liftMode, …)
        [K] root.isConnected ✔ → root.setPointerCapture(pointerId)    [D-17]
              ← validated, not assumed: `admit` may return any element and a
                consumer resolver can detach things. A capture failure is
                FAILURE_ACTIVATION, not a silently degraded drag.
        [K] begin()
        [B] spec.activation.prepare(draft, scope) → HTMLElement    [prepare]
              scope = { visual, originRect, lift, motion, presentation }
              placeholder = slots.createPlaceholder({ item, visual, rect })
              size it from visual.offsetWidth / offsetHeight
                            (offset box, not the transformed rect)
              draft.insertion = home insertion
              return placeholder            ← DETACHED. no DOM insertion,
                                              no acquisition, no rt write
        [K] preparationValid() ✔        ← nothing reentrant happened  [I-3, tier B]
        [K] draft.phase = ACTIVATING; commit()
        [B] spec.activation.effect(current, placeholder, scope)  [post-commit]
              ── 1. register the release, THEN make it visible ──      [I-30]
              scope.presentation.use(() => placeholder.remove())
              item.after(placeholder)          ← the placeholder's DOM position
                                                 is written only post-commit,
                                                 here and at every later move
              scope.motion.use(() => rt.frame.cancel())
              onScrollResize(scope.motion.signal,
                             () => slots.invalidateInsertion())
                             ← the behavior owns the staleness events; the
                               feature owns the cache. `invalidate()` is the
                               contributed capability that joins them.
              ── 3. publish private references, now that all are owned ──
              rt.placeholder = placeholder
              rt.lift = scope.lift
              rt.view = { realm, placeholder, container: placeholder.parentElement,
                          snapshot: current.snapshot }
                        ← one object per OPERATION. Both feature views bind to
                          it; it exists because they need a non-null
                          placeholder, which the controller-lifetime runtime
                          cannot promise before now.
              slots.invalidateInsertion()
              ── 4. consumer callback last: it may cancel or destroy ──
              slots.onStart(item2)
        [K] preparationValid() ✔ → dispatch(START_COMMITTED, operation)

> START_COMMITTED  [K] phase ACTIVATING ✔  operation current ✔
                   [K] begin(); draft.phase = ACTIVE; commit()
```

`activation.prepare` performs **no externally visible mutation**: it creates a
detached element and measures. Capture is the kernel's; insertion, disposer
registration and the private-runtime writes are all post-commit. **[I-17, vacuous
for this behavior]**

Consequently `activation.rollback` is unnecessary — a discarded prepare leaves
only a detached element for the collector. Had `createPlaceholder` thrown, the
kernel would have released capture and disposed the lift, queued
`FAILURE_ACTIVATION`, and published nothing. Had it reentrantly called
`destroy()`, `prepare` would still have returned the element,
`preparationValid()` would have returned `false`, and nothing would have been
published. The behavior has no branch for either case. **[I-16, tier B]**

**An activation discard retires the operation.** Unlike an action discard, it is
not "nothing happened and we carry on": there is no such thing as a committed
operation with no presentation. The activation driver releases capture, disposes
the lift and returns the controller to `IDLE`. The post-effect
`preparationValid()` above is likewise activation-specific — the shared core does
not have it, which is why each seam has its own wrapper.

## The hot path

```text
pointermove × N

> MOVE  [K] phase ACTIVE ✔  pointerId matches ✔
        [K] begin()                     Object.assign, 15 fields, monomorphic
        [K] draft.pointerX = e.clientX; draft.pointerY = e.clientY
        [K] commit()                    two reference assignments
        [B] spec.moved(current, lift)                                  [D-8]
              dx = current.pointerX - current.originX
              dy = current.pointerY - current.originY
              lift.visual.style.transform = lift.composeXY(dx, dy)
              rt.spatialSeq += 1
              rt.frame.schedule(rt.spatialSeq)
```

The earlier version of this section claimed **"zero allocations, two indirect
calls"** and then, two lines later, acknowledged the transform string. Both
numbers were wrong, and the headline is withdrawn rather than repaired (F-24).
Counted honestly, with "indirect call" defined to include calls through stable
closure methods:

**Allocations: one string, plus one object in the in-place lift mode.** The
transform string is unavoidable — it is the value the CSSOM requires. The
shipped in-place strategy additionally allocates a `{ x, y }` projection because
its mapping goes through the consumer's coordinate mapper
(`packages/drag/src/kernel/presentation.ts:190-224`); the two lifted modes
project identically and take `composeXY`'s scalar path. **Every supported lift
mode must retain a scalar projection path**; making the in-place mode allocation-
free is an implementation obligation, not a claim already met.

Nothing else allocates a wrapper: the native event is queued by reference under
a narrow `PointerCoordinates` contract (`pointerId`, `clientX`, `clientY`) and
is not retained past the drain, and the spatial attempt is a `number`, not an
object (D-11). The enqueue itself is two array pushes — **no per-entry object,
and capacity growth is amortized**, which is the phrasing every document uses.

**DOM reads: none.** Everything the move path needs is already committed as
scalars; measurement happens on the coalesced frame.

**DOM writes: one.** The transform on the lifted visual.

**Indirect calls: three, and the boundary is stated.** The metric is *calls
after `MOVE` dispatch, for the scalar lift modes*: `spec.moved()`,
`lift.composeXY()`, `rt.frame.schedule()`. It deliberately excludes the listener
→ `dispatch` → drain-handler path the queue requires, and it excludes the
in-place mode's coordinate mapper; `requestAnimationFrame` scheduling is
conditional on the frame task not already being armed.

Probe 1 spent the same three on the same work within the same boundary, which is
why D-8 — the behavior owning the write, so a future free drag can clamp before
writing — still costs nothing. **Comparing equal scoped work is the point; the
end-to-end number is M-1's job, not this section's.**

**Scheduling:** at most one `requestAnimationFrame` per animation frame,
coalesced by the frame task holding the latest value with a presence flag.

**Forbidden per move:** context objects, candidate objects, tuples, result
messages, temporary arrays, plugin descriptors, normalized event wrappers,
`Point` allocations on the lifted paths, feature iteration, feature filtering,
view materialization, `Array.prototype` helpers over the collection.

**The `Object.assign` frame copy: measured, and kept** (M-1, 2026-08-02 —
[measurements/m1.md](../measurements/m1.md)). It is fixed-shape, 15 fields,
monomorphic within the controller and allocation-free, and it is what makes a
preparation failure unable to corrupt `current`. That justification is strong for
a fallible `prepare` and weaker for a pointer sample, which only publishes
kernel-owned scalars before calling a post-commit renderer — so it was benchmarked
against a specialized pointer-publication path that writes the two fields in
place, with an equivalence check first.

**At the shipped frame the copy is 0.098 µs of a 2.64 µs sample: 3.7%, and the
sample is 0.017% of a 16 ms frame.** The copy stays.

**The number comes with a bound the earlier text could not have known.** The
cost is flat to ~12 behavior-part fields and then jumps 10× between 12 and 16 —
0.147 µs to 1.465 µs — an engine cliff this frame sits 4 fields below. A larger
part, or two behaviors sharing the call site, crosses it and the copy becomes
roughly 55% of a sample. The claim is therefore *the copy is free at this frame
size*, with the size named.

## The coalesced spatial frame

```text
rAF fires → dispatch(behavior tag 0, attempt)

> BEHAVIOR 0  [K] begin()
              [B] spec.action.prepare(0, attempt, draft)
                    rt.pendingSpatial === attempt ✔                [producer-side
                    draft.phase === ACTIVE ✔                        already checked]
                    slots.resolveInsertion(draft, rt.view)         [I-4]
                      ← two arguments: the FRAME the seam was handed, and the
                        per-operation runtime view. `prepare` never reaches
                        for `current`.
                      [F] vertical: refresh rects if dirty
                            one Float64Array rebuild, stride 6
                      [F] nearest centre beats the placeholder's own slot → gap 4
                      [F] → Insertion { version, index: 4, before, after }
                    draft.insertion = gap 4
                    return true
              [K] preparationValid() ✔; commit()
              [B] spec.action.effect(0, attempt, current, true)
                    for slots.beforeMove   → [F] measure neighbour rects
                    movePlaceholder(view, insertion)  ← the SOLE writer of the
                                     placeholder's position, always post-commit.
                                     Anchors on `insertion.after`, appending to
                                     the container when it is null, so a start
                                     gap and an end gap both work.       [F-31]
                                     Returns false and does nothing when the
                                     placeholder is already in place — a
                                     remove-and-reinsert would reset CSS
                                     transitions and force layout.       [F-33]
                    slots.invalidateInsertion()   ← only if a move happened
                    for slots.afterMove    → [F] re-measure, write inverted
                                                 transforms, play
```

`draft` satisfies `vertical.ts`'s own `InsertionFrameView` structurally, and
`rt.view` satisfies its `InsertionRuntimeView`; `vertical.ts` imports no runtime
type from the behavior. **[D-13]** The displacement hooks receive a
`DisplacementView` — the same `rt.view` object — and have no access to
`SettlementScope`, so displacement structurally cannot become a lifecycle gate.
**[I-10, tier A]**

The two features measure the same list around this one move. That duplicate
layout read is the open cost in Q-7/M-4, and it is expected to dominate
everything counted in §The hot path for a large list.

Had `resolveInsertion` returned `null` — the pointer is still nearest the
placeholder's own slot — `prepare` returns `null`, the draft is abandoned, the
current insertion stays authoritative and no placeholder move happens. **[I-15]**

## Release — two commits

```text
pointerup

> UP    [K] phase ACTIVE ✔  pointerId matches ✔
        [K] begin()
        [K] draft.phase = RELEASING; pointerX/Y = the release point
        [K] commit()                                   ← commit 1        [D-6]
              ── the committed frame now matches what is about to be true ──
        [K] lifetimes.motion.dispose()                                   [I-11]
              → root.releasePointerCapture(pointerId)   (guarded)
              → move/up/cancel listeners removed
              → scroll/resize invalidation removed
              → rt.frame.cancel()  (registered at activation)
            ── nothing queued or scheduled can move the result from here ──
        [K] begin()
        [B] spec.release.prepare(draft) → ResolutionCommand     [prepare]
              slots.invalidateInsertion()
              slots.resolveInsertion(draft, rt.view)           synchronous,
                                                               from the committed
                                                               release point
              fall back: resolved → incumbent → home
              draft.insertion = final gap
              draft.proposal  = buildReorderProposal(snapshot, item2, insertion)
                                                               immutable, frozen
              return { invoke: (signal) =>
                         slots.onReorder(request, { signal }) }
              ← the resolution CHOICE is the staged value. A no-op proposal
                returns { invoke: null }. There is no `null` return and no
                gate to call zero or twice.                            [F-20]
        [K] preparationValid() ✔; commit()             ← commit 2
        [B] spec.release.effect(current, command)      [post-commit]
              movePlaceholder(view, insertion)    ← the same single writer,
                                                    inert when already correct
              lift.visual.style.transform = lift.composeXY(dx, dy)
                                                  ← the FINAL sample, from the
                                                    committed release point
        [K] execute the command — `invoke` is non-null
                [K] attempt = createResolutionAttempt()
                [K] cancellation.useWhile(() => !attempt.completed, abort)
                [B] onReorder(request, { signal })
                      consumer: setPendingRequest(request)
                      consumer: setItems((items) => applyReorder(items, request))
                      consumer: return ReorderResolution.accept(readiness.promise)
                [K] settleResolution(attempt, { ok: true, value })
                    ← `value` is `unknown` to the kernel                [F-9]
                    ← note the order: consumer code runs BEFORE anything can be
                      enqueued for it. Anything the consumer dispatches from
                      inside `onReorder` is therefore AHEAD of
                      RESOLUTION_SETTLED in FIFO.                       [F-25]
```

Commit 1 exists so that no irreversible physical action — here, closing motion
ingress — happens while the committed frame still says `ACTIVE`. If
`release.prepare` throws, returns a `SeamRejection`, or reentrantly destroys,
the committed state is `RELEASING`, which is true, rather than `ACTIVE` with no
ingress and no path forward. **[I-13]** It cannot return `null`; that is not
expressible.

The final `lift.composeXY` render above is **normative**, not decoration: the
`UP` action committed the release point, and `pointerup` need not carry the same
coordinates as the last processed `pointermove`. Rendering only the placeholder
would leave the visual — and the entire landing trajectory — starting from a
stale point while the proposal describes a newer one. **[review 6, §7]**

Had `release.effect` thrown while moving the placeholder, the staged command
would **not** be executed: the consumer never sees `onReorder` for a release
whose committed presentation effect failed. **[F-27]**

The kernel closes motion between the two commits, so the behavior cannot get
release stability wrong by sequencing its own seam badly. **[I-11, tier B]**

## Settlement

```text
> RESOLUTION_SETTLED  [K] attempt current ✔  phase RELEASING ✔  settlement present ✔
                      [K] consume the settlement once; clear the payload
                      [K] begin()
                      [B] spec.settlement.prepare(draft, { type: FULFILLED, value })
                            validate: is this an explicit ReorderResolution?  ✔
                                      (a non-resolution, or a REJECTED input,
                                       returns a SeamRejection at
                                       FAILURE_REORDER_RESOLUTION — never a
                                       silent accept and never an inferred
                                       onCancel)
                            draft.outcome  = OUTCOME_ACCEPTED
                            draft.recovery = RECOVERY_DESTINATION
                            draft.domain   = { ACCEPTED, proposal }
                            return { ready: resolution.presentationReady }
                                   ← the readiness promise travels through
                                     `Prepared`, not a private-runtime write
                      [K] preparationValid(); draft.phase = SETTLING; commit()
                      [K] attempt = { holds: 0, readiness: null,
                                      readinessHeld: false, start: null,
                                      landing: null, landingHeld: false,
                                      authoredReady: false, relinquished: true,
                                      completed: false, failed: false,
                                      sealed: false }                    [D-7]
                      [K] lifetimes.cancellation.dispose()

                      ── REQUEST: the scope records, it arms nothing ──
                      [B] spec.settlement.effect(current, prepared, scope)
                            prepared.ready !== null →
                              scope.holdForReadiness(prepared.ready)
                                [K] holds = 1; readiness = p; readinessHeld = true
                            slots.startLanding && recovery !== IMMEDIATE →
                              scope.holdForLanding(slots.startLanding)
                                [K] holds = 2; start = fn; landingHeld = true

                      ── SEAL ──
                      [K] attempt.sealed = true
                      [K] if settlement.effect had THROWN, or the operation were
                          invalidated: drop every unarmed request, arm nothing,
                          and let the queued checkpoint decide.          [F-27]
                      [K] attempt.authoredReady = (readiness === null)
                            → false here, because this resolution DID carry a
                              presentationReady promise

                      ── ARM: the complete gate plan is now known ──
                      [K] watch readiness, bounded by 500 ms
                      [K] target = spec.anchorTarget(current, false)
                            [B] authoredReady === false → measure the
                                placeholder as it stands. React has NOT
                                committed yet, so re-anchoring here would drag
                                the placeholder back beside the item's OLD
                                slot.                                   [D-16]
                      [K] context = { visual, compose, from, target, realm }
                      [F] WAAPI animation, 200 ms → LandingHandle
                      [K] revalidate: still current, still sealed, still held?
                            ← `start` could have destroyed the controller and
                              STILL returned this live handle. If stale:
                              handle.destroy() best-effort, never publish. [F-30]
                      [K] attempt.landing = handle
                      [K] arm outcome = ARM_ARMED
                      [K] advanceSettlement: holds === 2 → return
                          ← ARM_FAILED would return before this call; the original
                            settlement would not finalize.
```

The hold is reserved **before** `start` is called and the handle is stored
**after** it returns. A `landing({ duration: 0 })` or custom runner that calls
`done()` from inside `start` therefore always finds its hold, and its queued
completion can never be applied before the handle exists. Had `start` or the
provisional `anchorTarget` thrown, or had the runner called `fail()`
synchronously, the reserved hold would be rolled back and the failure classified
`FAILURE_LANDING_CREATE`. Arm would return `ARM_FAILED`: the original settlement
would not advance or call its terminal callback; the queued failure checkpoint
would take over while presentation remains owned. **[D-28, F-35]**

**With no `landing()` feature installed**, `slots.startLanding` is `null`, so
**no landing hold is taken and no animation module is in the bundle** — but the
readiness hold above is unaffected, `holds` is 1, and settlement does **not**
finalize in this drain. Same-drain finalization happens only when *neither* gate
is held — which, in **this** composition, an accepted resolution with no
readiness would still not achieve, because `landing({ duration: 200 })` is
installed and holds the landing gate. It needs both: no landing feature (or an
immediate recovery) *and* no readiness promise. The two gates are independent in
both directions. **[I-9, I-8]**

Note that no gate release will be a frame transition: gate state is on the
attempt, not the frame. The only remaining transition is `phase = FINALIZING`.

## Readiness — the authoritative re-anchor

```text
React commits the accepted order; useLayoutEffect resolves readiness

> READINESS_SETTLED  [K] attempt current ✔  phase SETTLING ✔  no error ✔
                     [K] attempt.readinessHeld = false; readiness = null; holds = 1
                     [K] attempt.authoredReady = true
                     [K] attempt.landingHeld && attempt.landing !== null →
                           ← the guard is on the HOLD, not the handle: the
                             handle outlives its gate release so the join can
                             destroy() it, and a runner that already reported
                             done() must never be retargeted            [F-16]
                           [B] spec.anchorTarget(current, true)         [D-16]
                                 recovery === DESTINATION ✔
                                 if (item2.isConnected
                                     && item2.parentElement
                                        === placeholder.parentElement
                                     && placeholder.nextElementSibling
                                        !== item2) {
                                   item2.before(placeholder);      ← the repair
                                 }                                      [F-15]
                                 return placeholder rect
                           [F] handle.retarget?.(target)  ← quality only; a
                                                            runner without it
                                                            is still correct
                     [K] advanceSettlement: holds === 1 → return
```

The repair is guarded three ways, and each guard earns its place. The
`nextElementSibling` test makes it inert when the placeholder is already
adjacent — the common case — because `before()` on an already-correct position
is a remove-and-reinsert that resets CSS transitions and forces a reflow. The
connectivity and parentage tests stop a consumer that unmounted or re-keyed the
item from having the placeholder dragged into a detached tree, which would
destroy the fallback target the degraded path measures **[Q-12]**. It acts only
when the authored commit inserted a new keyed item into the destination gap,
leaving the placeholder on the wrong side of it.

The item is the anchor because after the commit it is a connected,
consumer-owned keyed child that React has placed at its authored final slot.
**[I-25]** The visual may be a different element; the anchor is always the item.

## The join

```text
landing animation finishes (200 ms)

> LANDING_SETTLED    [K] attempt current ✔  phase SETTLING ✔  no error ✔
                     [K] landingHeld ✔ → landingHeld = false; holds = 0
                           the handle itself is retained for the join
                     [K] advanceSettlement: holds === 0 ✔
                           [K] begin(); draft.phase = FINALIZING; commit()
                           [K] try {
                           [K]   target = spec.anchorTarget(current, true)
                                 [B]   defensive repeat of the guarded repair,
                                       then measure — covers layout movement
                                       between readiness and a long landing
                                 ↳ throws → FAILURE_LANDING_TARGET, no target
                           [K]   attempt.landing.destroy()
                                 [F]   animation.cancel() — relinquish the
                                       transform so the pin is not overridden
                                 ↳ throws → best-effort report; continue, BUT
                                   attempt.relinquished = false and I-24 no
                                   longer holds for this operation: the runner
                                   may keep writing after the pin.        [§8]
                           [K]   lift.write(target.x - originRect.x,
                                            target.y - originRect.y)
                                 ← the authoritative pin, kernel-owned    [I-24]
                                 ↳ throws → FAILURE_RENDERER_WRITE, continue
                           [K] } finally {
                           [K]   lifetimes.presentation.dispose()
                                 → placeholder.remove()   (behavior's disposer)
                                 → lift.dispose()         (inline styles restored,
                                                           latched: exactly once)
                           [K] }
                           [K] if a consequential failure was classified above:
                                 STOP. The queued checkpoint drives REPORTING
                                 and then retirement — calling `finalized` here
                                 would fire onFinish for a failed drop, because
                                 the committed frame still says ACCEPTED. [F-27]
                           [B] spec.finalized(current)
                                 slots.onFinish({ ACCEPTED, proposal })
                                 ← the consumer observes its own authored DOM,
                                   not the drag presentation            [I-23]
                                 ↳ throws → FAILURE_TERMINAL_CALLBACK; the
                                   operation still retires
                           [K] dispatch(RETIRE, operation)
```

Ordering is normative: `anchorTarget` → `destroy()` → pin → release. The runner
must relinquish the transform before the pin, or a running WAAPI animation
overrides the inline style.

**Every call before the release is fallible, and the release is in a `finally`.**
Three of the four steps here run code the kernel does not own — a behavior
measurement, a possibly-custom runner handle, and a DOM write — and none of them
may strand temporary presentation. That is why I-24 is stated *conditionally* on
**three** things: the measurement succeeding, the pin succeeding, **and runner
control being successfully relinquished**. A `destroy()` that throws is only
reported, so the runner may still be writing the transform after the pin — the
pin is performed but is no longer known to be authoritative. When any of the
three fails, the placeholder is still removed and the inline styles are still
restored. **[F-22]**

The gates never awaited each other; React rendering and the 200 ms animation
overlapped. **Both completion orders produce the same pinned target**, because
the target that matters is measured at the join, not when landing started.

Had `anchorTarget` thrown **here**, the kernel would report
`FAILURE_LANDING_TARGET`, skip the pin, and **still** release presentation. A
measurement failure must not strand the controller.

Had it thrown at *readiness* instead, nothing above would change: that call is
advisory — it only feeds an optional `retarget()` — so the failure is a
best-effort report, the runner keeps running toward its provisional target,
no hold moves, and this join still measures and pins authoritatively.
**[I-29, F-17]**

Had readiness never settled, the 500 ms timeout would have replaced the
settlement: presentation stays owned, outcome becomes `OUTCOME_FAILED` with the
domain result preserved, recovery restarts as immediate,
`attempt.authoredReady` stays `false` so no re-anchor happens, and it reports
through `onError` **only** — no `onFinish`, no `onCancel`. **[I-8]**

## Retirement

```text
> RETIRE  [K] operation current ✔
          [K] retire kernel attempts (idempotent, already done)
          [B] spec.retire()                        wrapped in try/catch  [F-12]
                rt.frame.cancel(); rt.pendingSpatial = 0
                rt.placeholder = null; rt.lift = null; rt.view = null
                for slots.retireHooks:            ← reverse installation order,
                                                    each wrapped individually
                  [F] layoutAnimation: restore every touched element exactly once
                  [F] vertical: empty the rect index element array, mark dirty
                  ← one throwing hook does not stop the rest         [F-22]
          [K] dispose all three lifetimes (latched, idempotent, best-effort LIFO)
          [K] scrub(current); scrub(draft)
                resetKernelFields  → 7 fields to defaults
                spec.resetFramePart → the behavior's 8 cleared
                __DEV__: key set still equals armedKeys ✔
          [K] phase = IDLE
```

`rt.frame` survives: it is per-controller, so retirement cancels a pending
schedule rather than discarding the task.

The controller now retains **no DOM**: not in either frame, not on the private
behavior runtime, not in the rect index, not in the displacement map. **[I-20]**

## Counterfactuals

What the same trace does under each difficult case, without adding a branch
anywhere above.

| Event | Where it lands |
| --- | --- |
| `onStart` calls `destroy()` | `preparationValid()` after `activation.effect` fails → no `START_COMMITTED`; the drain sees `closed` on its next iteration and stops. |
| `onReorder` calls `cancel()` | **The cancel wins.** `invoke` must run consumer code before it has a value to settle, and a nested `dispatch` appends in call order — so `CANCEL` is enqueued from inside `onReorder`, and `RESOLUTION_SETTLED` only after it returns. The cancel transition runs first; the completion is then stale for a decided operation and is dropped. This is `CANCEL > FAILURE_CHECKPOINT` and FIFO working as specified. An earlier version of this row asserted the opposite ordering and was simply wrong. **[F-25]** |
| `onReorder` calls `destroy()` | `closed` is re-read each iteration; the drain stops before `RESOLUTION_SETTLED`. Presentation is released synchronously before `destroy()` returns. |
| `destroy()` during the 200 ms landing | `LandingHandle.destroy()` — silent, never dispatches. Presentation disposes. A late `done()` finds no attempt and is inert at both validation points. |
| No `presentationReady` supplied | `attempt.authoredReady` is `true` **from sealing** — an absent promise means the consumer asserts its presentation is ready synchronously, which is what an optional promise means and what the shipped package does. So the arm-time `anchorTarget(current, true)` re-anchors immediately for a destination recovery, and the readiness gate is never held. An earlier version read absence as "the authored DOM never changed" and forbade the re-anchor; that was wrong. |
| `presentationReady` rejects or times out | `authoredReady` stays `false`, the settlement is replaced, recovery restarts as immediate, and no re-anchor happens. |
| Recovery is home or immediate | No re-anchor regardless of `authoredReady`. Re-anchoring follows the **recovery**, not the readiness. |
| Landing completes before readiness | The join still measures authoritatively after the readiness re-anchor, so the pin is correct. The visible arrival is a step rather than a smooth stop. **[F-16 — quality, not correctness]** |
| The authored commit inserts a new keyed item into the destination gap | `item.before(placeholder)` at readiness repairs the semantic gap; the repaired rect equals the item's actual landed rect. **[F-15]** |
| `updateItems()` at `ACTIVE`, neighbours still adjacent | `action.prepare(1)` rebases the insertion into the draft and stages the snapshot; `effect` publishes it and invalidates geometry. |
| `updateItems()` at `ACTIVE`, gap broken | `prepare` stages the snapshot **and** `cancelReason`. `effect` publishes the new collection, invalidates geometry, then dispatches the cancel last. FIFO runs the cancel transition next. **The consumer's update is not lost.** **[F-28]** |
| `updateItems()` from inside `onStart` | Applied at `ACTIVATING`, exactly like `ACTIVE` — FIFO puts it ahead of `START_COMMITTED`, and I-30 has already published `rt.view`. There is no deferral. **[F-32]** |
| `updateItems()` at `SETTLING` | `prepare` stages the snapshot with `bindsFrame: false`; `effect` publishes it. The operation's frame snapshot is **not** rewritten — it freezes the *semantic transaction*, not the geometry. Geometry correctness comes from the join measurement. |
| `updateItems()` at `IDLE` | Published in `effect`; `draft.snapshot` is left alone, so an idle frame retains no item elements. **[I-20]** |
| The consumer unmounts the dragged item as part of the reorder | `anchorTarget` finds no connected anchor and falls back to the placeholder's rect. Degraded, not stranded. **[Q-12 — the one open mechanism]** |
| `anchorTarget` throws at readiness | Best-effort report. Landing continues, holds untouched, `authoredReady` still `true`; the join measures again and pins. **[I-29]** |
| `LandingHandle.destroy()` throws at the join | Best-effort report. The pin still happens and presentation is still released — a custom runner cannot strand the controller. **[F-22]** |
| `lift.write()` throws at the join | `FAILURE_RENDERER_WRITE`; the visual stays where landing left it; presentation is **still** released. **[F-22]** |
| `spec.finalized()` throws | `FAILURE_TERMINAL_CALLBACK`; the operation still retires. **[F-22]** |
| A landing runner calls `done()` synchronously inside `start` | The hold was reserved before `start` was called, so the completion is queued against a real hold; the handle is stored before the queued completion can be applied. **[F-21]** |
| `startLanding` throws | The reserved hold is rolled back, `FAILURE_LANDING_CREATE` is classified, arm returns `ARM_FAILED`, and the original settlement neither advances nor calls its terminal callback. The failure checkpoint owns recovery while presentation remains held. **[D-28, F-35]** |
| A feature retire hook throws | Reported; the remaining hooks still run, in reverse installation order. **[F-22]** |
| A feature factory throws mid-`assemble()` | The retire hooks collected so far run in reverse, each wrapped, and the error propagates. No controller is returned. **[F-19]** |
| A behavior part declares `phase` | Rejected at `arm()` in production, and unconstructible at the authoring boundary via `FramePartOf`. **[I-5]** |
| `retarget()` throws | Best-effort report. The runner is *not* destroyed — the join destroys it anyway and the pin is computed fresh, so a misbehaving runner cannot affect the final position. **[I-29]** |
| Landing completes, *then* readiness settles | `landingHeld` is already `false`, so `retarget()` is not called. The join re-anchors and pins. **[F-16]** |
| `activation.effect` throws after the placeholder is inserted | The removal disposer was registered first, so the presentation lifetime still owns it. **[I-30, F-18]** |
| A `beforeMove` hook throws | `FAILURE_PLACEHOLDER_MOVE` from the *committed* state — the insertion stands, the transition is not reverted, recovery is home. **[I-18]** |
| `spec.retire()` throws | Reported; the remaining teardown steps still run. **[F-12]** |
| `LandingHandle.destroy()` throws during `controller.destroy()` | Reported; lifetimes, the frame task, ingress and queue state are still released. Per-attempt cleanup is individually wrapped, same policy as the join. |
| `release.effect` throws | `FAILURE_RELEASE` from the committed state, and the staged command is **not** executed — `onReorder` never runs. **[F-27]** |
| `activation.prepare` throws | `FAILURE_ACTIVATION` is queued and the operation stays live for its checkpoint. It is **not** retired here; retiring would make the queued entry stale and swallow the `onError`. **[F-27]** |
| `settlement.effect` requests readiness, then throws | The scope seals, both requests are dropped unarmed, and no watch or runner starts. **[F-27]** |
| `startLanding` destroys the controller and returns a live handle | Revalidation after `start` finds the attempt stale, destroys the handle once, best-effort, and never publishes it. **[F-30]** |
| The consumer resolution is a no-op proposal | `{ invoke: null }` → `SETTLED_SKIPPED` → `OUTCOME_NOOP` with **immediate** recovery and `onFinish`. Not a rejection, and not a home recovery. **[F-29]** |
| The `onReorder` promise rejects | `SETTLED_REJECTED` → `SeamRejection(FAILURE_REORDER_RESOLUTION)`. A resolver malfunction is never reported as `onCancel`. **[F-29]** |
| The insertion is a **start** gap | `movePlaceholder` anchors on `insertion.after`, so the placeholder reaches the head of the list. The old `before?.after(…)` writer was a silent no-op here. **[F-31]** |
