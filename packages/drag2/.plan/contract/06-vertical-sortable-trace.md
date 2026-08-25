# 6. One complete vertical-sortable lifecycle

This trace is illustrative. Document 02 is the normative lifecycle protocol; if a trace sentence drifts from it, document 02 wins and this trace must be fixed.

A successful downward reorder in a controlled React application, with `layoutAnimation()` and `landing({ duration: 200 })` installed.

**This is the pointer path.** D-32 added a second, pointerless admission, and everything from `ACTIVATE` onward is the same code this trace walks — which is the claim the revision rests on and the reason there is no second trace here. A discrete trace lands with Phase 16, where there is an implementation to trace; writing one now would be prose asserting what only a lifecycle can show, which is precisely what contract 00 says a type fixture cannot do.

`>` is a queue drain step. Indentation is direct calls. `[K]` is kernel-private work, `[B]` behavior, `[F]` feature. Bracketed markers on the right name the invariant or decision being satisfied.

## Construction

```text
const controller = sortable(
  list,
  {
    items: () => items,
    placeholder,                           ← plain config KEYS, written
    onReorder, onStart, onEnd,               directly. No callbacks() and
  },                                         no placeholder() wrapper. [D-56]
  y(), layoutAnimation(), landing({ duration: 200 }),
)                              ← ONE consumer call, returning a
                                 SortableController directly       [D-48]
                               ← the surviving fragment factories are exactly
                                 the four that INSTALL something: y(), xy(),
                                 landing(), layoutAnimation().      [D-56]

[S] sortable() calls draggable(list, factory) ITSELF               [D-48]
      ← the two-phase handshake is not skipped, it is moved inside. Everything
        below is `draggable()`'s body, unchanged, and it is exactly what makes
        D-48 safe: the host exists before the factory returns, and ingress
        arms only after `{ spec, controller }` comes back.        [D-1, D-47]
[K] createKernel(list)
      queue = ([], []), running = false, closed = false
      current = draft = null            ← not yet armed
[B] behavior(host)
      [B] merge the config fragments, THEN materialize             [D-45]
            each argument is a PLAIN partial config object. A fragment
            installs nothing when it is constructed; it names a slot.
              { items, placeholder, onReorder, … }
                                     → those slots verbatim   [D-44, D-56]
              y()                    → { axis:     installYAxis }
              layoutAnimation()      → { plugins: [installLayoutAnimation()] }
              landing({200})         → { landing:  installLanding({200}) }
            merge by SLOT, not by provenance: scalar and capability slots
            last-wins as one whole slot, `plugins` appends in fragment order
            validate the MERGED CONFIG: axis ✔  items ✔  onReorder ✔
                                        threshold: none given ✔     [D-56]
              ← the onReorder requirement and the threshold check used to be
                callbacks()'s, at ITS construction. They move here, and they
                now fire for a config supplied any way at all rather than only
                through a factory — so deleting the factory tightened the
                check rather than losing it.                        [D-56]
            derive defaults AFTER the merge: threshold → 8
            ── only now are the installers invoked ──               [D-45]
              installYAxis           → { insertion: { resolve, invalidate,
                                                      retire } }   private: RectIndex
              installLayoutAnimation → { beforeInsertionMove,
                                         afterInsertionMove, retire } private: Map
              installLanding         → { startLanding }             private: timing
            ← installation order is SCHEMA order, and `plugins` install in
              array order. D-45 erases provenance, so "declaration order" —
              what retirement used to be defined against — no longer names
              anything. Schema order is deterministic, independent of how the
              consumer spread their fragments, and stable across a refactor
              that reorders arguments.                              [D-57]
            flatten: resolveInsertion, invalidateInsertion
            retireHooks = the REVERSE of installation order:
              [layoutAnimation, y]                                  [D-57]
            → SortableSlots; the merged config object is now unreachable
      [B] rt = { host, slots, frame: createFrameTask(realm, …),
                 snapshot, view: null, placeholder: null, lift: null,
                 spatialSeq: 0, pendingSpatial: 0 }                  [H-2]
                 ← `snapshot` is taken from `config.items()` and re-taken only
                   when that call returns a NEW array identity.       [D-44]
                 ← this literal carried `pendingRequest: null` until Revision 2,
                   published at release.effect and cleared at retire. C4-08's
                   correction — that a field written by later steps must appear
                   in the literal that constructs the runtime — was right and
                   still is; D-41 deletes the field it was about.  [D-41, C4-08]
                 ← the coalesced frame task is created ONCE, here. It is not
                   nullable and not per-operation; retire and destroy cancel it.
      [B] spec = createSortableSpec(rt)      ← ~16 closures over `rt`  [F-4]
      → { spec, controller }
[K] kernel.arm(spec)
      current = Object.assign(frame(), createFramePart())
      draft   = Object.assign(frame(), createFramePart())
             ← NEITHER result is validated (D-124, D-122, D-128). The part is
               still *defined* as a plain enumerable writable string-keyed
               record, and that definition is the published type's to state.
               The factory is not proven deterministic (F-2) and nothing
               compares the two results.                             [I-5]
                ← same code path twice → one hidden class            [D-15, I-27]
      ── if any step here throws: spec.retire() best-effort, scrub, abort
         ingress, rethrow. No half-armed controller escapes. ──
      list.addEventListener('pointerdown', …, { signal: ingress.signal })
→ controller
```

**The merge is the whole of the composition step, and it happens before anything is constructed.** That is the part of D-45 this trace exists to show: a fragment that loses a slot — a second `y()`, a preset's `landing()` overridden by an explicit one — never has its installer invoked, so there is no half-built capability to unwind and no provenance to remember. The earlier form of this block ran a factory per feature and then reconciled the contribution objects it got back, which is why it needed `validate` to run over contributions rather than over config, and why a losing capability had to be torn down after it existed. Config slots merge; installers run once, on the winner.

**Four factories left the call entirely, and their disappearance is D-45 finishing its own argument.** `callbacks()`, `handle()`, `visual()` and `placeholder()` had already become identity wrappers under D-45 — functions whose entire behavior was to return a public config slot the consumer can write by hand — which is exactly the ceremony D-45 exists to remove, and which voided the stated reason their subpaths existed: _a separate subpath per optional feature is what makes the measurement honest_, and a subpath carrying no runtime machinery measures nothing. So `{ createPlaceholder, handle, visual, box, onReorder, threshold }` are plain keys, four exports and four subpaths go, and what survives as a factory is precisely what installs something. **[D-56]**

**`sortable()` receives `root`, and `draggable()` moves to the kernel tier.** D-45 wrote the call as `sortable(root, config, y(), landing())` while the contract still composed `draggable(list, sortable(items, …))`, which named the element twice; **D-48 resolves it by moving the public boundary rather than by picking a spelling.** `sortable()` and `freeDrag()` are the ordinary entry points and return their controllers directly; `draggable()`, `BehaviorFactory` and the behavior-construction types are published at `@ydinjs/drag/kernel`, where D-47's `draggable(root, (host) => ({ spec, controller }))` is literally the supported form. That is not a leak of the low-level vocabulary C4-03 objected to — at the kernel tier that vocabulary _is_ the surface. The handshake itself is untouched; only who calls it changes, which is why nothing from `ACTIVATE` onward moves a line.

What the kernel now holds of the behavior: **one `spec` reference.** No runtime, no slots, no rect index, no placeholder. What the behavior holds of the kernel: one `host` with six members, none of which drives a transition — it said _seven_ between Phase 14 and Revision 2, and D-41 deletes `presentationCommitted()`.

## Admission

```text
pointerdown on item 2

[K] listener: !closed ✔  current.operation === null ✔  isPrimaryPress ✔
[K] begin()                                    Object.assign(draft, current)
[B] spec.admit(event, draft) → { visual, box? }                 [D-5, D-59]
      resolve the pressed item from rt.snapshot via composedPath()
      the composed path holds no interactive or editable descendant
      between the press and the row, so admission does NOT decline   [D-46]
      slots.getHandle — not installed, skip
      draft.item = item2                       ← BEHAVIOR state, in the
      draft.snapshot = rt.snapshot               behavior's own frame part
      return item2                             ← the element to lift; `box` is
                                                 omitted here, so it defaults
                                                 to the visual        [D-43]
[K] store visual and box in the KERNEL's OWN frame slice, beside
    originRect — not read back out of a behavior-authored draft  [D-59]
      ← D-52's first form had the behavior stash `box` in the draft for the
        kernel to read before acquireLift. That contradicts H-2 — the kernel
        does not know, store, extend or type the behavior's part — and D-15,
        which exists so the kernel cannot name behavior fields. It is not a
        cosmetic exception: "the kernel learns one sortable-shaped thing" is
        the defect Checkpoint C found four times.
      ← D-5's principle is intact. The kernel still gets what it needs from
        admission and nothing else; it now needs TWO things rather than one,
        which changes the count, not the rule. Admission runs once per press
        and is not the hot path, so the pair costs nothing measurable.
[K] the default is NOT prevented here            ← it MOVES to activation
      ← this line read `event.preventDefault()` until Revision 2, called
        exactly when an admission member returned non-null [C-03]. The press
        has not crossed the threshold and no drag exists yet; consuming the
        native default now spends it on a drag that may never happen.
                                                            [D-46, D-54]
[K] recheck !closed && operation === null      ← POST-CALLBACK CHECK      [F-30]
      a consumer handle/visual resolver runs inside native dispatch and can
      close over this controller and synchronously destroy() it. Without this
      recheck the listener would mint an operation on a terminal controller.
[K] mint OperationIdentity
[K] create the three lifetimes; arm motion + cancellation ingress
[K] draft.phase = PENDING; pointerId, originX/Y, pointerX/Y = the press
[K] commit()                                   swap two references
```

`draft.phase` is written by the kernel, after `admit` returned. The behavior could not have written it: it saw `Draft<Part>`, where the kernel slice is `Readonly`. **[I-5, tier A]**

No pointer capture yet — capture is acquired at activation, so a below-threshold press never captures and never retargets later pointer events to `root`. **[D-17]**

**Nothing native has been consumed at this point, and that is D-46's whole correction.** The previous trace prevented the default here on the strength of the behavior's non-null answer, and treated whether a _click_ still fires as a question the contract does not decide. Probe E measured it: the prevented `pointerdown` suppresses the compatibility `mousedown` — focus, caret placement, selection start, form-control operation — while `click`, `href` navigation and ctrl/meta-click survive, because they are defaults of `pointerup`. **Six of probe E's ten cases were destroyed with no drag ever activating**, which is the sharpest statement of the defect: the press was not reserved for a drag that might happen, it was spent on one that provably did not. Two things carry the policy instead, and neither is new machinery — **declining is already total** (an admission member returning `null` leaves the native meaning completely intact), and default admission now declines on interactive and editable descendants. **[D-46, F-48]**

**The call is not deleted, it is relocated — to the threshold crossing.** D-46 withdrew it from admission and named no replacement, which left the policy incomplete in a consumer-visible way; **D-54 completes it.** `preventDefault()` fires when the activation threshold is crossed, and the two consequences of moving it later are carried by the same decision rather than left as residue: at that moment the library **clears any selection the pre-threshold press began**, and after an **activated** drag it **suppresses exactly one subsequent `click`, in the capture phase** — without which a drag that ends on a link navigates. Both are consequences of the relocation, not pre-existing defects.

**Scroll suppression is `touch-action`, not `preventDefault()`.** D-54 names this explicitly because `preventDefault()` on `pointerdown` was never a reliable scroll suppressor, and treating it as one is how the touch story silently breaks. The consumer sets `touch-action` in CSS; the library does not attempt it here. **Evidence limit, stated because the rule is unconditional: probe E is Chromium and mouse only.** Touch adds long-press context menus and tap highlighting that the admission-time call also consumed, and nothing has measured them — an owed measurement, not a settled case. **[D-54]**

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
        [K] event.preventDefault()          ← HERE, not at admission  [D-54]
        [K] clear any selection the pre-threshold press began
              ← the press was allowed to do its native work precisely because
                it might never become a drag. It has now become one, so the
                selection it started is undone at the same moment.   [D-54]
        [K] arm the trailing-`click` suppressor: exactly ONE subsequent
            click, capture phase, for this ACTIVATED drag only
              ← only `pointerdown` was ever prevented, so click, `href` and
                ctrl-click always survived — which is correct for a press that
                stayed a press and wrong for a drag that ends on a link.
                A sub-threshold press arms nothing.                  [D-54]
        [K] originRect = visual.getBoundingClientRect()
              ← still required, and still a rect: it is the landing offset and
                the candidate rect. It is NOT the footprint.          [D-43]
        [K] boxPre = the BOX's offset box            ← WINDOW 1 of 2  [D-43]
              ← read from the KERNEL's own slice, which admission populated.
                Nothing here reaches into the behavior's frame part. [D-59]
              ← an offset-box read, not getBoundingClientRect(): a running
                layoutAnimation() translate offsets the box's position by the
                full in-flight delta and leaves its height untouched, so a
                rect read would carry a transform the footprint must not see.
              ← box defaults to the visual; here they are the same element,
                which is exactly the case where one window looks sufficient.
        [K] lift = acquireLift(visual, config.liftMode, …)
              ← the visual leaves flow HERE. Everything the footprint rule
                needs is on opposite sides of this line.
        [K] root.isConnected ✔ → root.setPointerCapture(pointerId)    [D-17]
              ← validated, not assumed: `admit` may return any element and a
                consumer resolver can detach things. A capture failure is
                FAILURE_ACTIVATION, not a silently degraded drag.
        [K] begin()
        [B] spec.activation.prepare(draft, scope) → HTMLElement    [prepare]
              scope = { visual, box, originRect, boxPre, lift,
                        motion, presentation }
                      ← the kernel HANDS these down, which is the whole of how
                        the behavior sees them. It does not read them back out
                        of the draft, and the behavior never wrote them. [D-59]
              boxPost = the BOX's offsetHeight ← WINDOW 2 of 2, and the FIRST
                        thing this seam does. Read after acquireLift, from the
                        same element and in the same units as boxPre.
                        ONE EXTENT: the cross axis never subtracts, because the
                        box surrenders nothing there. [F-58]
                        SKIPPED when box === visual: the lifted element's own
                        offset box does not change across the lift. [D-43, F-55]
              footprint.width  = boxPre.width          ← always; nothing
                                                         collapsed on this axis
              footprint.height = box === visual ? boxPre.height
                                                : boxPre.height − boxPost
                                             ← what the visual actually
                                               removed from the layout
              placeholder = slots.createPlaceholder({ item, visual, box, rect })   ← from config.placeholder (D-65)
              size it from the FOOTPRINT, not from the visual's offset box
              copy `item`'s `slot` attribute onto the placeholder
                        ← from the ITEM, not the box: the placeholder stands in
                          for the item's position in the light tree, and an
                          unassigned placeholder is not rendered at all — it
                          measures 0×0 at the origin and that zero rect would
                          become the landing target.                  [D-43]
              draft.pointerId !== -1 → draft.insertion = home insertion
                                     ← the POINTER branch. A pointerless
                                       operation leaves `insertion` alone: it
                                       already holds the gap `command.admit`
                                       wrote, and seeding home here destroys
                                       the only state carrying it.  [D-32, C4-01]
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
                                               ← `item.after()`, RETAINED, not
                                                 `box.after()`: measured
                                                 byte-identical under
                                                 `display: contents`   [D-43]
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

**Two windows, because one is wrong in a case that looks like the common one — and the common case takes the first window alone.** ~~Here `box === visual`, so `boxPre − boxPost` is just the visual's own height and a single pre-lift capture would have agreed.~~ **Corrected during implementation (F-55): that subtraction is `0`, not the visual's height.** `boxPre − boxPost` measures the footprint only when the box _stays in flow_ while the visual leaves it, which is what api-1 measured with a nested pair. Under `box === visual` there is no such pair: the one element **is** the thing being lifted, and `LIFT_FAITHFUL` promotes it with `position: fixed` and an explicit width and height, so its offset box is **unchanged** across `acquireLift` and the difference is zero. The rule is therefore stated on the identity: **`box === visual` ⇒ the footprint is `boxPre`; otherwise its height is `boxPre.height − boxPost` and its width is `boxPre.width`** — one-dimensional, because F-58 found the second axis subtracting a collapse that never happened. The identity branch is not an optimisation — it is the second half of the rule, and the pre-lift capture is the whole answer there, which is what the library did before two windows existed. The subtraction earns its place the moment the box keeps a sibling in flow: api-1 measured `boxPre 62 − boxPost 32 = 30`, and the list collapsed by exactly 30 — while the box's own height (62) over-sizes by double-counting the residue and the visual's height (60) over-sizes by 30. Probe C1 then reproduced it inside a live drag with `layoutAnimation()` running: sizing from `visual.offsetHeight` runs the list `180 → 210`, **30 px too tall for the entire drag**, not just at landing. No single-window rule is correct in both nested cases, which is why the rule takes two. The timing costs nothing structurally — `acquireLift` and this seam are forty lines apart — and buys one additional forced layout per activation. **[D-43, F-50]**

`activation.prepare` performs no mutation the _layout_ can see: it never inserts, it measures, and capture is the kernel's. Insertion, disposer registration and the private-runtime writes are all post-commit. But it does mutate — `createPlaceholder` is a **consumer** slot, the element it returns is **consumer-owned**, and `applyMechanics` writes library-authored attributes, styles and state onto it before `prepare` returns. **[I-17 — not vacuous for this behavior, corrected by D-39]**

**Consequently `activation.rollback` is required.** ~~It is unnecessary — a discarded prepare leaves only a detached element for the collector.~~ That reading survived into Revision 2 and D-39 reverses it. Detachment is not disposal when the element is not the library's to collect: `prepare` completes, `preparationValid()` then returns `false`, the seam reports `SEAM_INVALIDATED`, and **adoption never happens** — so the disposer `effect` would have registered is never registered and never becomes responsible for the attributes already written. The consumer is handed back its own element carrying the library's marks. Deferring physical teardown (D-36) does not help and was never going to: it changes _when_ teardown runs, not _whether_ adoption occurred, and this is a local acquisition property with a mechanism that already exists. It is **not** a reason to reinstate statement-level liveness. **[D-39]**

Had `createPlaceholder` thrown, the kernel would have released capture and disposed the lift, queued `FAILURE_ACTIVATION`, and published nothing — no element ever came back, so there is nothing to roll back. Had it reentrantly called `destroy()`, `prepare` would still have returned the element and `preparationValid()` would have returned `false`; **that is the case `rollback` now owns.** **[I-16, tier B]**

**An activation discard retires the operation.** Unlike an action discard, it is not "nothing happened and we carry on": there is no such thing as a committed operation with no presentation. The activation driver releases capture, disposes the lift and returns the controller to `IDLE`. The post-effect `preparationValid()` above is likewise activation-specific — the shared core does not have it, which is why each seam has its own wrapper.

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
              lift.write(dx, dy)              compose, then assign; the
                                              session records the delta   [D-35]
              rt.spatialSeq += 1
              rt.frame.schedule(rt.spatialSeq)
```

The earlier version of this section claimed **"zero allocations, two indirect calls"** and then, two lines later, acknowledged the transform string. Both numbers were wrong, and the headline is withdrawn rather than repaired (F-24). Counted honestly, with "indirect call" defined to include calls through stable closure methods:

**Allocations: one string, plus one object in the in-place lift mode.** The transform string is unavoidable — it is the value the CSSOM requires. The shipped in-place strategy additionally allocates a `{ x, y }` projection because its mapping goes through the consumer's coordinate mapper (`packages/drag/src/kernel/presentation.ts:190-224`); the two lifted modes project identically and take `compose`'s scalar path. **Every supported lift mode must retain a scalar projection path**; making the in-place mode allocation- free is an implementation obligation, not a claim already met.

Nothing else allocates a wrapper: the native event is queued by reference under a narrow `PointerCoordinates` contract (`pointerId`, `clientX`, `clientY`) and is not retained past the drain, and the spatial attempt is a `number`, not an object (D-11). The enqueue itself is two array pushes — **no per-entry object, and capacity growth is amortized**, which is the phrasing every document uses.

**DOM reads: none.** Everything the move path needs is already committed as scalars; measurement happens on the coalesced frame.

**DOM writes: one.** The transform on the lifted visual.

**Indirect calls: three, and the boundary is stated.** The metric is _calls after `MOVE` dispatch, for the scalar lift modes_: `spec.moved()`, `lift.write()`, `rt.frame.schedule()`. It deliberately excludes the listener → `dispatch` → drain-handler path the queue requires, and it excludes the in-place mode's coordinate mapper; `requestAnimationFrame` scheduling is conditional on the frame task not already being armed.

Probe 1 spent the same three on the same work within the same boundary, which is why D-8 — the behavior owning the write, so a future free drag can clamp before writing — still costs nothing. **Comparing equal scoped work is the point; the end-to-end number is M-1's job, not this section's.**

**Scheduling:** at most one `requestAnimationFrame` per animation frame, coalesced by the frame task holding the latest value with a presence flag.

**Forbidden per move:** context objects, candidate objects, tuples, result messages, temporary arrays, plugin descriptors, normalized event wrappers, `Point` allocations on the lifted paths, feature iteration, feature filtering, view materialization, `Array.prototype` helpers over the collection.

**The `Object.assign` frame copy: measured, and kept** (M-1, 2026-08-02 — [measurements/m1.md](../measurements/m1.md)). It is fixed-shape, 15 fields, monomorphic within the controller and allocation-free, and it is what makes a preparation failure unable to corrupt `current`. That justification is strong for a fallible `prepare` and weaker for a pointer sample, which only publishes kernel-owned scalars before calling a post-commit renderer — so it was benchmarked against a specialized pointer-publication path that writes the two fields in place, with an equivalence check first.

**At the shipped frame the copy is 0.098 µs of a 2.64 µs sample: 3.7%, and the sample is 0.017% of a 16 ms frame.** The copy stays.

**The number comes with a bound the earlier text could not have known.** The cost is flat to ~12 behavior-part fields and then jumps 10× between 12 and 16 — 0.147 µs to 1.465 µs — an engine cliff this frame sits 4 fields below. A larger part, or two behaviors sharing the call site, crosses it and the copy becomes roughly 55% of a sample. The claim is therefore _the copy is free at this frame size_, with the size named.

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
                      [F] y: refresh rects if dirty — candidates are
                             measured as `box`, NOT `visual`          [D-58]
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

`draft` satisfies `y.ts`'s own `InsertionFrameView` structurally, and `rt.view` satisfies its `InsertionRuntimeView`; `y.ts` imports no runtime type from the behavior. **[D-13]** The displacement hooks receive a `DisplacementView` — the same `rt.view` object — and have no access to `SettlementScope`, so displacement structurally cannot become a lifecycle gate. **[I-10, tier A]**

The two features read **different** things around this one move, and that is Q-7/M-4's landed answer rather than an open cost (Phase 11; this paragraph still described the pre-answer expectation until Checkpoint D review 5, C5-04). The axis rebuild reads every candidate's **`box`** — Checkpoint D's parity D2 chose `visual` because no `box` concept existed, and **D-58 supersedes that choice**: insertion is a geometry question, `box` is the geometry source, and leaving candidates on `visual` while the placeholder occupies the box's _removed footprint_ would put the two sides of the same comparison on different rects, differing by 30 px in api-1's case A. That is hysteresis, not rounding — the incumbent placeholder measured one way and its challengers another. Under the default `box === visual` nothing changes, so the common case pays nothing. The displacement bracket reads only the **crossed span**. Measured at 800 rows: 0.156 ms for the span against 2.3 ms for a destination-view bracket, so there is no duplicate _full-list_ read left to eliminate and **no shared read phase is needed** — `DisplacementView.insertion` is what makes the span expressible without either feature learning about the other.

Had `resolveInsertion` returned `null` — the pointer is still nearest the placeholder's own slot — `prepare` returns `null`, the draft is abandoned, the current insertion stays authoritative and no placeholder move happens. **[I-15]**

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
              draft.pointerId !== -1 →                      ← the POINTER branch
                slots.invalidateInsertion()
                slots.resolveInsertion(draft, rt.view)         synchronous,
                                                               from the committed
                                                               release point
                fall back: resolved → incumbent → home
                draft.insertion = final gap
              draft.pointerId === -1 →                  ← the POINTERLESS branch
                draft.insertion stands as committed. NO invalidation and NO
                spatial resolve: there is no release sample, the pointer
                scalars are still zero, and resolving would pick a gap from
                pointerY === 0. A null insertion here is a broken invariant →
                SeamRejection, never a home fallback.          [D-32, C4-01]
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
                                                    inert when already correct.
                                                    UNCONDITIONAL: a command
                                                    reorders too.       [C4-01]
              draft.pointerId !== -1 →            ← the POINTER branch
                lift.write(dx, dy)                ← the FINAL sample, from the
                                                    committed release point
              draft.pointerId === -1 →       ← the POINTERLESS branch: NO lift
                                               write at all. No release sample
                                               exists and the visual has not
                                               moved since acquisition, so
                                               `lift.rendered` stays (0, 0) and
                                               that is the correct landing
                                               origin.           [D-35, C4-01]
              ← nothing is published for a later acknowledgement to match.
                This step read `rt.pendingRequest = current.proposal.request`
                until Revision 2, so that a consumer holding the request could
                acknowledge its render after the resolution returned. The
                serial order removes the window it existed for.       [D-41]
        [K] execute the command — `invoke` is non-null
                [K] attempt = createResolutionAttempt()
                [K] cancellation.useWhile(() => !attempt.completed, abort)
                [B] onReorder(request, { signal })
                      consumer: setItems((items) => applyReorder(items, request))
                      consumer: await committed    ← the consumer's OWN commit
                                                     barrier, awaited INSIDE
                                                     onReorder. A framework
                                                     barrier is integration
                                                     code, not a drag
                                                     protocol.          [D-41]
                      consumer: return ReorderResolution.accept()
                      ← the resolution does not RETURN until the authored DOM is
                        final. Nothing is declared, nothing is acknowledged, and
                        no identity has to be compared, because there is no
                        interval between the two events to identify. [D-41]
                      ← a consumer that commits synchronously simply does not
                        await, and the ordinary Promise machinery is what makes
                        the two cases one code path.
                [K] settleResolution(attempt, { ok: true, value })
                    ← `value` is `unknown` to the kernel                [F-9]
                    ← note the order: consumer code runs BEFORE anything can be
                      enqueued for it. Anything the consumer dispatches from
                      inside `onReorder` is therefore AHEAD of
                      RESOLUTION_SETTLED in FIFO.                       [F-25]
```

Commit 1 exists so that no irreversible physical action — here, closing motion ingress — happens while the committed frame still says `ACTIVE`. If `release.prepare` throws, returns a `SeamRejection`, or reentrantly destroys, the committed state is `RELEASING`, which is true, rather than `ACTIVE` with no ingress and no path forward. **[I-13]** It cannot return `null`; that is not expressible.

The final `lift.write` render above is **normative**, not decoration: the `UP` action committed the release point, and `pointerup` need not carry the same coordinates as the last processed `pointermove`. Rendering only the placeholder would leave the visual — and the entire landing trajectory — starting from a stale point while the proposal describes a newer one. **[review 6, §7]**

Had `release.effect` thrown while moving the placeholder, the staged command would **not** be executed: the consumer never sees `onReorder` for a release whose committed presentation effect failed. **[F-27]**

The kernel closes motion between the two commits, so the behavior cannot get release stability wrong by sequencing its own seam badly. **[I-11, tier B]**

**The rest of this trace is one serial line, and it is materially shorter than it used to be.** The order is _release → freeze proposal → `onReorder` → authored commit → consumer resolution → restore library presentation invariants → authoritative landing measurement → landing → terminal_. Every step is a consequence of the one before it, and no step waits on a second party to say it is finished. What stood here before was a readiness protocol — `accept({ presentation: true })`, a published request, `controller.ready(request)` compared by object identity, an early-acknowledgement latch copied onto the settlement attempt, a `READINESS_SETTLED` transition, a 500 ms deadline, a readiness-time re-anchor and a nine-row matrix of ways an acknowledgement could contradict its own resolution. **The reasoning behind it was sound and its premise is gone.** D-33 solved _how a consumer acknowledges a render that happens after the resolution returns_; awaiting the commit inside `onReorder` means the resolution does not return until the render is done, so the window has no interior and the protocol has no producer. The shortening is the result, not a loss. **[D-41, F-46]**

**A resolution the library stops waiting for is still safe.** If the user cancels while `onReorder` is outstanding, the operation abandons the wait, restores and retires its presentation, and terminates as **`canceled`** — one terminal, not a new `aborted` one. The consumer's own already-started work may still commit, and the library has never claimed otherwise: `canceled` says the _drag operation_ was abandoned, never that consumer side effects were rolled back. The late settlement or rejection from the abandoned resolver is consumed safely — no unhandled rejection, no second terminal, no revival. `onError` stays the orthogonal diagnostic channel. **[D-40]**

## Settlement

```text
> RESOLUTION_SETTLED  [K] attempt current ✔  phase RELEASING ✔  settlement present ✔
                      [K] consume the settlement once; clear the payload
                      [K] begin()
                      [B] spec.settlement.prepare(draft, { type: FULFILLED, value })
                            validate: is this an explicit ReorderResolution?  ✔
                                      (a non-resolution, or a REJECTED input,
                                       returns a SeamRejection at
                                       FAILURE_RESOLUTION — never a
                                       silent accept and never an inferred
                                       onEnd)
                            draft.outcome  = OUTCOME_ACCEPTED
                            draft.recovery = RECOVERY_DESTINATION
                            draft.domain   = { ACCEPTED, proposal }
                            return PreparedSettlement
                                   ← it carried `{ presentation: boolean }`
                                     until Revision 2 — is an authored
                                     presentation expected? There is no such
                                     question now: the authored DOM is already
                                     final when this seam runs.        [D-41]
                      [K] preparationValid(); draft.phase = SETTLING; commit()
                      [K] attempt = { holds: 0,
                                      start: null, landing: null,
                                      landingHeld: false,
                                      relinquished: true,
                                      completed: false, failed: false,
                                      sealed: false }                    [D-7]
                            ↑ five fields shorter. `readinessHeld`,
                              `readinessSettled`, `presentationLatched` and
                              `authoredReady` all go with the protocol; there is
                              no early-acknowledgement latch to copy from the
                              resolution attempt, because nothing can arrive
                              early when nothing arrives separately.   [D-41]
                      [K] lifetimes.cancellation.dispose()

                      ── REQUEST: the scope records, it arms nothing ──
                      [B] spec.settlement.effect(current, prepared, scope)
                            slots.startLanding && recovery !== IMMEDIATE →
                              scope.holdForLanding(slots.startLanding)
                                [K] holds = 1; start = fn; landingHeld = true
                            ← ONE gate. `holdForReadiness()` no longer exists.
                                                                       [D-41]

                      ── SEAL ──
                      [K] attempt.sealed = true
                      [K] if settlement.effect had THROWN, or the operation were
                          invalidated: drop every unarmed request, arm nothing,
                          and let the queued checkpoint decide.          [F-27]

                      ── ARM: the complete gate plan is now known ──
                      ── RESTORE the library's presentation invariants ──
                      [B] the guarded item-relative re-anchor, run ONCE:
                            recovery === DESTINATION ✔
                            if (item2.isConnected
                                && item2.parentElement
                                   === placeholder.parentElement
                                && placeholder.nextElementSibling !== item2) {
                              item2.before(placeholder);          ← the repair
                            }                                          [F-15]
                      ── the AUTHORITATIVE landing measurement ──
                      [B] precondition, TWO READS, O(1):         [D-42, D-49]
                            placeholder.isConnected
                              && placeholder.parentElement
                                 === item2.parentElement
                            ← **[B], not [K]** — corrected in implementation
                              (F-56). The kernel cannot perform these reads: a
                              placeholder is behavior state and `item2` is a
                              frame field the kernel may not name (H-2, D-15).
                              The check therefore opens `anchorTarget`, and the
                              kernel treats a failed check and a throw
                              identically, which is what D-49 already required
                              of them.
                            ✗ → report through onError, SKIP the landing
                                animation entirely, and join immediately.
                                The settlement does NOT fail; the drop
                                terminates normally with its domain result,
                                because the DOM commit already happened and
                                the reorder is real.                  [D-49]
                      [K] target = spec.anchorTarget(current)
                            ↳ throws → same treatment: report, skip, join.
                              A measurement that failed is not a target to
                              animate toward.                         [D-49]
                            [B] measure the placeholder where the authored
                                commit left it. This measurement is
                                AUTHORITATIVE, not provisional: `onReorder` did
                                not return until the commit was done, so there
                                is no interval in which it can go stale, and no
                                second reading to correct it with.  [D-41, D-16]
                            ← the second argument was `authoredReady`, which was
                              false here by construction and is why probe C1
                              found the provisional target stale in ALL FIVE
                              commit strategies, including the two that
                              otherwise hold. 02 owns the surviving signature;
                              this trace follows it.
                      [K] from = lift.rendered      ← the delta the session
                                                        last wrote, not a
                                                        pointer delta    [D-35]
                      [K] context = { visual, compose, from, target, realm }
                      [F] WAAPI animation, 200 ms → LandingHandle
                      [K] revalidate: still current, still sealed, still held?
                            ← `start` could have destroyed the controller and
                              STILL returned this live handle. If stale:
                              handle.destroy() best-effort, never publish. [F-30]
                      [K] attempt.landing = handle
                      [K] arm outcome = ARM_ARMED
                      [K] advanceSettlement: holds === 1 → return
                          ← ARM_FAILED would return before this call; the original
                            settlement would not finalize.
```

The hold is reserved **before** `start` is called and the handle is stored **after** it returns. A `landing({ duration: 0 })` or custom runner that calls `done()` from inside `start` therefore always finds its hold, and its queued completion can never be applied before the handle exists. Had `start` thrown, or had the runner called `fail()` synchronously, the reserved hold would be rolled back and the failure classified `FAILURE_LANDING_CREATE`. Arm would return `ARM_FAILED`: the original settlement would not advance or call its terminal callback; the queued failure checkpoint would take over while presentation remains owned. **[D-28, F-35]**

**A failed measurement is not one of those cases, and D-49 is why.** Collapsing two measurement sites into one silently converted a tolerated fault into a fatal one: the old contract survived a failed `anchorTarget` per drop, because F-17 and I-29 make it best-effort and the join's pin decides correctness — with one site, `ARM_FAILED` would tolerate none. So a measurement that throws, or a precondition check that finds the placeholder detached, **reports, skips the landing, and joins immediately**. That restores F-17's tier — the failure is **quality only**, exactly as F-16 classifies a visually abrupt correction — and keeps I-31's single terminal. **It also unifies with D-42**, replacing that decision's weaker "lands from the unrepaired position": the unrepaired position _is_ the viewport origin, and probe C1 shows what animating toward it looks like — twelve frames to `(0,0)` and a teleport back. **A jump cut is honest; a confident animation to `(0,0)` is not.** **[D-49, D-42, F-16, F-17]**

**The measurement is taken once, and the ordering above is the whole of why it can be.** The re-anchor is the library restoring _its own_ presentation invariant after the consumer moved DOM around it; the measurement then reads a placeholder that is where the authored order says it should be. C1 measured what happens without that ordering: `authoredReady` is false at arm **by construction**, so the pre-redesign reading was taken before the re-anchor even when the consumer had committed synchronously inside `onReorder` — 40 px stale in case 3, 40 px stale the other way in case 4, and at the viewport origin in the three that detach the placeholder. A conforming custom runner that omits `retarget()` — which `landing()`'s own contract calls trajectory quality only — animated toward that stale target for the entire landing. **[D-41, D-16, F-13]**

**The precondition check is not renderer detection.** It is two reads validating something the measurement already depends on, and it exists because probe C1's three destructive strategies — `replaceChildren`, an `innerHTML` rebuild, and replacing the container — each detach the placeholder, which then measures `0×0` at `(0, 0)`; the row travels `(46,133) → (0,0)` over twelve frames and teleports back into its slot when the join pins. **All five strategies reported `onEnd` once, `onError` zero times and left zero residue**, so the worst integration bug in the package was also its most silent. D-42 declines to recover: destructive rerenders during an active operation are **out of contract**, supported commits move existing item nodes, and buying recovery would mean relaxing D-27's cross-container refusal for a case that is now outside the contract anyway. **[D-42, F-49]**

The repair is guarded three ways, and each guard earns its place. The `nextElementSibling` test makes it inert when the placeholder is already adjacent — the common case — because `before()` on an already-correct position is a remove-and-reinsert that resets CSS transitions and forces a reflow. The connectivity and parentage tests stop a consumer that unmounted or re-keyed the item from having the placeholder dragged into a detached tree. It acts when the authored commit inserted a new keyed item into the destination gap, and C1 showed it also repairs both supported commit strategies: an append loop leaves the placeholder at index 0, a morphdom-style patch strands it at the tail, and the same repair closes the arithmetic in both.

The item is the anchor because after the commit it is a connected, consumer-owned keyed child the renderer has placed at its authored final slot. **[I-25]** The visual may be a different element; the anchor is always the item.

**With no `landing()` feature installed**, `slots.startLanding` is `null`, so **no landing hold is taken and no animation module is in the bundle** — `holds` is 0 at seal, and the settlement finalizes in this same drain. That is now the whole of the rule, because there is one gate: same-drain finalization needs no landing feature, or an immediate recovery, and nothing else. It used to need _both_ halves — no landing **and** no declared presentation — and the independence of the two was the property that let the render and the animation overlap. **With readiness deleted there is nothing left to be independent of**, and probe 1's underlying requirement is untouched, because it was always the _default-open_ rule rather than the gate count. **[I-9, I-8, D-41, D-7]**

Note that no gate release will be a frame transition: gate state is on the attempt, not the frame. The only remaining transition is `phase = FINALIZING`.

**What stood between here and the join, and no longer does.** A `## Readiness — the authoritative re-anchor` section traced `controller.ready(pendingRequest.current)` from a `useLayoutEffect`, compared by object identity against the request `release.prepare` built and `release.effect` published, dispatched `READINESS_SETTLED` with the once-only latch claimed _before_ the dispatch (C4-04, C5-02), released the readiness hold, set `authoredReady`, ran a readiness-time re-anchor and offered the result to `handle.retarget?.()`. **Every mechanism in it was correct for the problem it had** — the identity comparison in particular is the best record of why per-operation identity on a controller method is hard, which is why D-33 is kept in full in the ledger. What it does not have any more is a problem: the authored commit now completes inside `onReorder`, so there is no render to acknowledge after the fact, no interval for a late or duplicate acknowledgement to land in, and no 500 ms deadline to bound the silence. **[D-41, D-33, I-35]**

## The join

```text
landing animation finishes (200 ms)

> LANDING_SETTLED    [K] attempt current ✔  phase SETTLING ✔  no error ✔
                     [K] landingHeld ✔ → landingHeld = false; holds = 0
                           the handle itself is retained for the join
                     [K] advanceSettlement: holds === 0 ✔
                           [K] begin(); draft.phase = FINALIZING; commit()
                           [K] try {
                           [K]   target = spec.anchorTarget(current)
                                 [B]   defensive repeat of the guarded repair,
                                       then measure — covers layout movement
                                       during a long landing
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
                                 STOP *here*. The queued checkpoint drives
                                 REPORTING, and its own settlement seam
                                 (SETTLED_FAILED) builds the canceled result
                                 before `finalized` runs from there. Calling
                                 `finalized` at this point would publish the
                                 stale ACCEPTED frame. [F-27, D-66]
                                 ── the terminal is deferred, not skipped:
                                    it was skipped until D-66.
                           [B] spec.finalized(current)
                                 slots.onEnd({ ACCEPTED, proposal })   ← one terminal (D-62)
                                 ← the consumer observes its own authored DOM,
                                   not the drag presentation            [I-23]
                                 ↳ throws → FAILURE_TERMINAL_CALLBACK; the
                                   operation still retires
                           [K] dispatch(RETIRE, operation)
```

Ordering is normative: `anchorTarget` → `destroy()` → pin → release. The runner must relinquish the transform before the pin, or a running WAAPI animation overrides the inline style.

**Every call before the release is fallible, and the release is in a `finally`.** Three of the four steps here run code the kernel does not own — a behavior measurement, a possibly-custom runner handle, and a DOM write — and none of them may strand temporary presentation. That is why I-24 is stated _conditionally_ on **three** things: the measurement succeeding, the pin succeeding, **and runner control being successfully relinquished**. A `destroy()` that throws is only reported, so the runner may still be writing the transform after the pin — the pin is performed but is no longer known to be authoritative. When any of the three fails, the placeholder is still removed and the inline styles are still restored. **[F-22]**

**The pin at the join survives the redesign, and it is now the only correction there is.** This paragraph used to say the gates never awaited each other and that both completion orders produce the same pinned target — true, and no longer the interesting property, because there is one gate and one order. What still matters is the surviving clause of D-16: the kernel performs the final pin **at the join, before releasing presentation**, so layout that moved during a 200 ms landing is absorbed by a measurement taken after it. Correctness was never coming from every runner being retargetable; it came from this pin. **[D-16, D-41]**

Had `anchorTarget` thrown **here**, the kernel would report `FAILURE_LANDING_TARGET`, skip the pin, and **still** release presentation. A measurement failure must not strand the controller.

Had the **arm-time** measurement thrown instead, the landing is **skipped and the join runs immediately** — not `ARM_FAILED`, and not an animation toward a target the library does not trust. The advisory readiness-time `anchorTarget` that F-17 and I-29 were written against does not exist any more, but D-49 keeps its **tier**: a failed measurement is quality-only, reported through `onError`, and the drop still terminates normally with its domain result. **[D-49, F-17, I-29 — narrowed by D-41]**

## Retirement

```text
> RETIRE  [K] operation current ✔
          [K] retire kernel attempts (idempotent, already done)
          [B] spec.retire()                        wrapped in try/catch  [F-12]
                rt.frame.cancel(); rt.pendingSpatial = 0
                rt.placeholder = null; rt.lift = null; rt.view = null
                ← `rt.pendingRequest = null` stood here until Revision 2. Its
                  reason was twofold and only half of it was about readiness:
                  a request holds identity NEIGHBOURS, so leaving it retains
                  elements past retirement. The field is deleted, so the
                  retention it caused is deleted with it.              [D-41]
                for slots.retireHooks:            ← reverse installation order,
                                                    each wrapped individually
                  [F] layoutAnimation: restore every touched element exactly once
                  [F] y: empty the rect index element array, mark dirty
                  ← one throwing hook does not stop the rest         [F-22]
          [K] dispose all three lifetimes (latched, idempotent, best-effort LIFO)
          [K] scrub(current); scrub(draft)
                frame(target)       → the kernel's 7 to defaults
                spec.resetFramePart → the behavior's 8 cleared
          [K] phase = IDLE
```

`rt.frame` survives: it is per-controller, so retirement cancels a pending schedule rather than discarding the task.

The controller now retains **no DOM**: not in either frame, not on the private behavior runtime, not in the rect index, not in the displacement map. **[I-20]**

**That claim is about the completion of this sequence, not about the stack that requested it** — a distinction Revision 2 forces, because teardown can now defer. D-36 separates logical closure from physical teardown: `destroy()` closes the controller logically and immediately, and if synchronous library execution is in progress the seven physical steps run at the boundary of the outermost library transaction rather than on the closing stack. D-29's totality is rescoped accordingly — the same steps with the same individual wrapping, wherever they run — so I-20 still holds **once the sequence has run**, and no longer holds _by the time `destroy()` returns_. `destroy()` returns `Promise<void>` and settles once, after physical teardown, which is the only way to observe the difference. **[D-36, D-29]**

**Do not read the residue as a liveness answer.** Inside the deferral window the controller is closed and still holds elements, an undisposed presentation and an unaborted signal. `signal.aborted`, a disposed session and a detached node all **lag** logical closure now, and each was previously a legitimate — indeed strictly stronger — liveness reading, because it also caught a kernel-internal panic. Under deferral that same property makes them strictly weaker. Liveness is read from the logical latch or from transaction validity, never from a physical-teardown observation. **[D-38, I-37]**

## Counterfactuals

What the same trace does under each difficult case, without adding a branch anywhere above.

| Event | Where it lands |
| --- | --- |
| `onStart` calls `destroy()` | `preparationValid()` after `activation.effect` fails → no `START_COMMITTED`; the drain sees `closed` on its next iteration and stops. |
| `onReorder` calls `cancel()` | **The cancel wins.** `invoke` must run consumer code before it has a value to settle, and a nested `dispatch` appends in call order — so `CANCEL` is enqueued from inside `onReorder`, and `RESOLUTION_SETTLED` only after it returns. The cancel transition runs first; the completion is then stale for a decided operation and is dropped. This is `CANCEL > FAILURE_CHECKPOINT` and FIFO working as specified. An earlier version of this row asserted the opposite ordering and was simply wrong. **[F-25]** |
| `onReorder` calls `destroy()` | `closed` is re-read each iteration; the drain stops before `RESOLUTION_SETTLED`. **The controller is closed from that statement onward; physical teardown runs at the boundary of the outermost library transaction, so it has not necessarily completed when `destroy()` returns.** The returned Promise settles once, after it has. **[D-36]** |
| `destroy()` during the 200 ms landing | `LandingHandle.destroy()` — silent, never dispatches. Presentation disposes. A late `done()` finds no attempt and is inert at both validation points. |
| The consumer commits **synchronously** — `flushSync`, or a non-React renderer | Nothing special happens. `onReorder` does not await, returns its resolution, and the rest of the trace is byte-identical. The pre-redesign row here described an early `controller.ready(request)` latched on the resolution attempt, copied onto the settlement and dispatched at arm; the synchronous and asynchronous consumers are now one code path, which is the point of awaiting inside `onReorder`. **[D-41]** |
| The consumer's own commit **never settles** | The library waits, exactly as it waits for any pending resolution: the cancellation lifetime's `useWhile` still aborts the signal handed to `onReorder`, and a cancel or a `destroy()` ends the operation. There is no 500 ms readiness deadline any more, because there is no separate acknowledgement to time out — the bound the consumer has is the one it wrote. **[D-41, F-46]** |
| The consumer's commit **throws or rejects** | `SETTLED_REJECTED` → `SeamRejection(FAILURE_RESOLUTION)`, the same path as any rejected resolver. An `await` that throws is ordinary Promise failure behavior, which is the whole of what replaced four consumer obligations whose only failure signal used to be a 500 ms silence. **[F-46, F-29]** |
| The user cancels while `onReorder` is outstanding | The operation stops waiting, restores and retires presentation, and reaches **one** terminal, `canceled`. The consumer's already-started work may still commit; the library never promised to undo it. The late settlement or rejection from the abandoned resolver is consumed safely — no unhandled rejection, no second terminal, no revival. **[D-40]** |
| The authored commit **detaches or replaces** the placeholder | Out of contract: `replaceChildren`, an `innerHTML` rebuild and container replacement are unsupported during an active operation. The two-read precondition at the authoritative measurement fails, the library **reports through `onError`, skips the landing animation and joins immediately** — a jump cut, not a confident twelve-frame flight to `(0,0)`. The settlement does not fail and the drop terminates normally, because the DOM commit already happened and the reorder is real. **So this operation fires `onError` once _and_ `onEnd` once** (D-60). Nothing is recovered — C1 showed `request.before`/`after` survive in four of five strategies, so a repair is buildable, and buying it would mean relaxing D-27's cross-container refusal for a case that is now outside the contract. **[D-42, D-49, D-60, F-49]** |
| The authoritative measurement **throws** | Identical treatment, and that is the point of D-49 unifying the two: report, skip the landing, join immediately, **`onError` once and `onEnd` once**. Quality only — the drop is unaffected. **[D-49, D-60]** |
| Reading the two channels as mutually exclusive | **False, and worth stating because probe C1's finding is phrased the other way.** C1's defect was _`onEnd` once, `onError` **zero**_; the fixed behavior is _`onEnd` once, `onError` **once**_. `onError` is orthogonal to the terminal: it reports a **classified stage**, not an operation outcome. `FAILURE_LANDING_TARGET` under D-49 is the first stage that is classified, **non-consequential, and has no recovery** — the settlement is not failed and the domain result stands. The contract carried an unstated biconditional, `onError ⇒ consequential`, that nothing had ever tested; D-49 falsifies it, so any assertion of mutual exclusivity between the two channels is now wrong. **[D-60]** |
| Recovery is home or immediate | No re-anchor. Re-anchoring follows the **recovery** — that clause of D-16 is one of the two that survive. |
| The authored commit inserts a new keyed item into the destination gap | The guarded `item.before(placeholder)` repair, run once before the authoritative measurement, fixes the semantic gap; the repaired rect equals the item's actual landed rect. **[F-15]** |
| `controller.invalidate()` at `ACTIVE`, `items()` returns the **same** array identity | Geometry and presentation invalidation only. No snapshot, no reconcile, no O(n) copy — which is what a resize, a zoom or a scroll produces, and it is the common case. **[D-44]** |
| `controller.invalidate()` at `ACTIVE`, **new** array identity, neighbours still adjacent | The structural branch: `action.prepare(1)` rebases the insertion into the draft and stages the snapshot; `effect` publishes it and invalidates geometry. The shallow copy happens **here only**. **[D-44]** |
| `controller.invalidate()` at `ACTIVE`, new identity, gap broken | `prepare` stages the snapshot **and** `cancelReason`. `effect` publishes the new collection, invalidates geometry, then dispatches the cancel last. FIFO runs the cancel transition next. **The consumer's update is not lost.** **[F-28]** |
| `controller.invalidate()` from inside `onStart` | Applied at `ACTIVATING`, exactly like `ACTIVE` — FIFO puts it ahead of `START_COMMITTED`, and I-30 has already published `rt.view`. There is no deferral. **[F-32]** |
| `controller.invalidate()` at `SETTLING` | `prepare` stages the snapshot with `bindsFrame: false`; `effect` publishes it. The operation's frame snapshot is **not** rewritten — it freezes the _semantic transaction_, not the geometry, and after release the proposal is frozen and structural invalidation does not reinterpret it. **[D-44]** |
| `controller.invalidate()` at `IDLE` | Published in `effect`; `draft.snapshot` is left alone, so an idle frame retains no item elements. **[I-20]** |
| The consumer mutates the **same** array in place and calls `invalidate()` | Outside the contract. Array identity is the structural signal, so the library reads no structural change and invalidates geometry only. React, Vue and Svelte all return a new array when order changes, which is why the signal is free. **[D-44]** |
| The consumer unmounts the dragged item as part of the reorder | ~~`anchorTarget` finds no connected anchor and falls back to the placeholder's rect. Degraded, not stranded.~~ **Superseded by D-42/D-49 at Phase R, and the row was a stale residue: it predates the precondition.** The re-anchor is still skipped, and then the precondition's second conjunct fails — the placeholder is no longer in the item's container, because the item has no container — so the **landing is skipped rather than measured**: one `onError`, no animation, and the drop still terminates with its accepted result. Q-12's answer survives in the half that mattered, "not stranded"; what it got wrong is "with nothing classified or reported", which is the silence D-49 exists to end. **[Q-12, D-42, D-49, D-60]** |
| `LandingHandle.destroy()` throws at the join | Best-effort report. The pin still happens and presentation is still released — a custom runner cannot strand the controller. **[F-22]** |
| `lift.write()` throws at the join | `FAILURE_RENDERER_WRITE`; the visual stays where landing left it; presentation is **still** released. **[F-22]** |
| `spec.finalized()` throws | `FAILURE_TERMINAL_CALLBACK`; the operation still retires. **[F-22]** |
| A landing runner calls `done()` synchronously inside `start` | The hold was reserved before `start` was called, so the completion is queued against a real hold; the handle is stored before the queued completion can be applied. **[F-21]** |
| `startLanding` throws | The reserved hold is rolled back, `FAILURE_LANDING_CREATE` is classified, arm returns `ARM_FAILED`, and the original settlement neither advances nor calls its terminal callback. The failure checkpoint owns recovery while presentation remains held. **[D-28, F-35]** |
| An arrow key on an edge item | `command.admit` computes the destination gap, finds `null`, returns `null`. The kernel does not prevent the default, so no operation is minted, no phase changes, and the key keeps its native meaning. Feasibility was answered inside the listener, which is the whole of what D-32 buys. **[D-32, I-32]** |
| An arrow key inside a **text input, `contenteditable` or native control** in a row | `command.admit` **declines**, because it now asks what the event landed on: text inputs keep caret arrows, `contenteditable` keeps editing navigation, native controls keep their keys. Declining is total, so the keystroke keeps its native meaning entirely. Probe E measured the alternative — a single `ArrowRight` at caret offset 5 in a nested input froze the caret, reported `defaultPrevented`, and produced `onStart` ×1, `{from:2,to:3}` and `onFinish` ×1 (probe E's own vocabulary; `onEnd` since D-62): **a complete accepted reorder from one keystroke in a form field.** **[D-46, F-48]** |
| An arrow key during **IME composition** | `event.isComposing === true` never admits. In every CJK IME an arrow navigates the candidate list; probe E observed a real Chromium composition (`"にほ"`, `isComposing: true`) reordering the collection instead, mid-word, with the user not interacting with the list at all. **[D-46, F-48]** |
| A press that never crosses the threshold | Nothing native is consumed: no `preventDefault()`, no selection cleared, and **no trailing-`click` suppressor armed**, so the click, the `href` and ctrl-click all behave exactly as they would with no library present. The suppressor is armed at activation, so it cannot fire for a press that stayed a press. **[D-54, D-46]** |
| A drag that **activates** and ends on a link or button | The default was prevented at the threshold crossing, the selection the press began was cleared there, and exactly **one** subsequent `click` is suppressed in the capture phase — so the drop does not also navigate. One click, not a latch: the next genuine click on that element works. **[D-54]** |
| A touch drag that should not scroll the page | **Not this trace's job, and not `preventDefault()`'s.** Scroll suppression is `touch-action`, which the consumer sets in CSS. Probe E is Chromium and mouse only; touch's long-press context menu and tap highlighting are an **owed measurement**, recorded rather than assumed settled. **[D-54]** |
| An arrow key on a movable item, from a focusable drag control | `command.admit` writes item, snapshot and destination gap into the draft and returns the visual. It mints a pointerless operation (`pointerId === -1`), commits `PENDING`, queues `ACTIVATE`; `START_COMMITTED` queues `RELEASE`. A command has no threshold to cross, so admission and activation are one turn and the default is prevented at activation exactly as D-54 states. **Three seams branch on `pointerId` and the rest of this trace applies verbatim:** `activation.prepare` preserves the command's gap instead of seeding home, `release.prepare` takes it as committed instead of re-resolving spatially, and `release.effect` moves the placeholder but performs no lift write. An earlier version of this row said the trace applied verbatim _from `release.prepare` on_, which was wrong at both ends — the seed had already overwritten the gap and the re-resolve would have replaced it from `pointerY === 0` — and then said "two seams" while the branch was already three. **[D-32, C4-01, C5-05]** |
| A handle resolver calls `controller.invalidate()` from inside `command.admit` | Enqueued without draining, exactly as from inside `admit`: the ingress boundary is one shared latch across both listeners, and the queue drains once admission has committed or abandoned. **The phase behavior is unchanged from the `updateItems()` this row named before Revision 2 — only the delivery is.** **[I-1, D-32, D-44]** |
| A feature retire hook throws | Reported; the remaining hooks still run, in reverse installation order. **[F-22]** |
| An **installer** throws during materialization | The installers that already ran are retired in reverse, each wrapped, and the error propagates. No controller is returned. This row said "a feature factory throws mid-`assemble()`" before Revision 2; under D-45 constructing a fragment installs nothing, so a throwing _fragment_ is an ordinary expression throwing before the library is ever called, and the case with anything to unwind is a throwing **installer** — which runs after the merge, on the winning slot only. **[F-19, D-45]** |
| A behavior part declares `phase` | Rejected at `arm()` in production, and unconstructible at the authoring boundary via `FramePartOf`. **[I-5]** |
| ~~`retarget()` throws~~ | **`LandingHandle.retarget` is removed.** D-41 deletes its only producer, and probe C1 separately flagged it as a hazard: `landing()` documents it as optional, so a conforming custom runner that omits it animated toward a stale target for the whole landing in every case C1 measured. A member the library never invokes must not be published. The reasoning underneath the row survives as the general rule for foreign code at the join — best-effort report, the runner is _not_ destroyed, the join destroys it anyway and the pin is computed fresh, so a misbehaving runner cannot affect the final position. **[D-41, I-29]** |
| `activation.effect` throws after the placeholder is inserted | The removal disposer was registered first, so the presentation lifetime still owns it. **[I-30, F-18]** |
| A `beforeMove` hook throws | `FAILURE_ACTION_EFFECT` from the _committed_ state — the insertion stands, the transition is not reverted, recovery is home. **[I-18]** |
| `spec.retire()` throws | Reported; the remaining teardown steps still run. **[F-12]** |
| `LandingHandle.destroy()` throws during `controller.destroy()` | Reported; lifetimes, the frame task, ingress and queue state are still released. Per-attempt cleanup is individually wrapped, same policy as the join. |
| `release.effect` throws | `FAILURE_RELEASE` from the committed state, and the staged command is **not** executed — `onReorder` never runs. **[F-27]** |
| `activation.prepare` throws | `FAILURE_ACTIVATION` is queued and the operation stays live for its checkpoint. It is **not** retired here; retiring would make the queued entry stale and swallow the `onError`. **[F-27]** |
| `settlement.effect` requests the landing hold, then throws | The scope seals, the request is dropped unarmed, and no runner starts. The rule is unchanged; there is one request to drop rather than two. **[F-27]** |
| `startLanding` destroys the controller and returns a live handle | Revalidation after `start` finds the attempt stale, destroys the handle once, best-effort, and never publishes it. **[F-30]** |
| The consumer resolution is a no-op proposal | `{ invoke: null }` → `SETTLED_SKIPPED` → `OUTCOME_NOOP` with **immediate** recovery and `onEnd({ type: 'noop' })`. It read `onFinish`. Not a rejection, and not a home recovery. **[F-29]** |
| The `onReorder` promise rejects | `SETTLED_REJECTED` → `SeamRejection(FAILURE_RESOLUTION)`. A resolver malfunction is never reported as `onEnd({ type: 'canceled' })`. It read `onCancel`. **[F-29]** |
| The insertion is a **start** gap | `movePlaceholder` anchors on `insertion.after`, so the placeholder reaches the head of the list. The old `before?.after(…)` writer was a silent no-op here. **[F-31]** |