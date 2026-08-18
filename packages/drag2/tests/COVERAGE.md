# Test matrix coverage

Every row of [05 §Test matrix](../.plan/contract/05-lifecycle-invariants.md) against the file that closes it and the invariant it is about. Phase 10's _done when_ is this table: **every row maps to a passing test or to a written, justified exclusion.**

Paths are relative to `packages/drag2`. Where a row is closed by several tests the entry names the one that would fail first.

**Every citation here is checked mechanically.** `tests/coverage.node.test.ts` matches each italicised test name against the suites, in the file the same row names, and fails the build on a citation that does not resolve. That check exists because at the end of Revision 2 **twenty of 242 did not** (review 2, B-2): rows a rename left behind, rows whose subject a decision deleted, and six consecutive rows in §Landing completion for kernel-tier properties that had **never** had a test. A dangling citation is worse than a missing row — it answers the question a reviewer came to ask — so the check is on the cheap half (the test exists) precisely because that is the half that rots unattended.

Two rows were **removed** rather than re-pointed in that pass, both from §The indirect half: `placeholder()`'s own class write, whose subject `placeholderClassName` D-65 deleted (the surviving write is the mechanics row above), and the release request publication, whose subject `rt.pendingRequest` D-41 deleted with the readiness protocol.

---

## Basic flow

| Row | Test | ID |
| --- | --- | --- |
| press below threshold | `tests/sortable/composition.browser.test.ts` — _should not activate before the threshold is crossed_ | D-1 |
| activation after threshold | `tests/sortable/composition.browser.test.ts` — _should activate on a press that crosses the threshold_ | D-1 |
| placeholder insertion | `tests/sortable/sortable.browser.test.ts` — _should create the placeholder detached and insert it after the item_ | I-17, D-27 |
| continuous pointer following | `tests/sortable/sortable.browser.test.ts` — _should render the committed sample and coalesce the spatial search_ | I-26 |
| downward reorder | `tests/sortable/composition.browser.test.ts` — _should move the gap once another centre is nearer_ | — |
| upward reorder | `tests/sortable/composition.browser.test.ts` — _should return to an earlier gap when the pointer comes back_ | — |
| release at the current insertion | `tests/sortable/composition.browser.test.ts` — _should propose the gap the pointer settled on_ | I-12 |
| no-op release | `tests/sortable/composition.browser.test.ts` — _should finish a drop that never left its own gap as a no-op_ | F-29, F-37 |
| immediate landing | `tests/sortable/features.browser.test.ts` — _should hold the gate even with a zero duration_ | I-9 |

## Boundary

| Row | Test | ID |
| --- | --- | --- |
| no oscillation at an insertion threshold | `tests/sortable/y.browser.test.ts` — _should keep the incumbent gap on a tie_; `tests/sortable/displacement.browser.test.ts` — _should not propose a reversal while a displacement is running_ | D-7 |
| rapid alternating samples preserve FIFO | `tests/sortable/sortable.browser.test.ts` — _should render the committed sample and coalesce the spatial search_ (three samples, one frame) | 02 §Queue |
| release uses the final synchronous geometry | `tests/sortable/sortable.browser.test.ts` — _should render the final sample, not the last processed move_ | I-12 |
| pending frame work cannot alter the released proposal | `tests/sortable/sortable.browser.test.ts` — _should discard a spatial action at RELEASING_ | I-4, I-12 |

## Readiness — deleted (D-41)

**The entire readiness protocol is gone, and with it both sections that used to stand here.** `accept({ presentation: true })`, `controller.ready(request)`, `KernelHost.presentationCommitted()`, the acknowledgement deadline, `readinessTimeout`, `FAILURE_PRESENTATION_READY` and the readiness-time re-anchor with `LandingHandle.retarget()` no longer exist, so `tests/sortable/acknowledgement.browser.test.ts` was deleted rather than migrated: every row in it named a member of a protocol with no producer.

What replaced the rows is not another suite. Under the serial authored commit a consumer that must render before the drop lands `await`s its own commit barrier inside `onReorder`, so the obligations these rows checked stopped existing rather than moving owner. The one row that survived in substance is the React integration's, re-pointed at the barrier: `tests/sortable/react.browser.test.ts` now returns a promise from `onReorder` that resolves on the next commit, which is the whole of the migration.

Two rows moved rather than went:

| Case | Where it is now |
| --- | --- |
| the gate's request/seal/arm bookkeeping — a duplicate or post-seal hold is ignored and reported | `tests/kernel/kernel.browser.test.ts` — _should ignore and report a duplicate hold_, _should ignore and report a hold requested after sealing_, re-pointed at the surviving landing gate |
| the landing target is measured once, authoritatively | `tests/kernel/kernel.browser.test.ts` — _should measure once, at arm, under SETTLING_; `tests/sortable/commit-window.browser.test.ts` — the two strategies that leave the placeholder in place, which now assert the first target **is** the row's final rect |

## Discrete input — new (D-32)

Implemented in Phase 16. The consumer-facing rows are `tests/sortable/keyboard.browser.test.ts`, driven through the public entrypoint; the ingress and construction rows need a spec the test controls, so they are in `tests/kernel/kernel.browser.test.ts`.

**How the destination rows are made falsifiable.** A pointerless operation's pointer scalars are zero, so a spatial resolve would run from `pointerY === 0` — the first gap. Every destination row therefore commands an item **downward**, where the two answers visibly disagree; an assertion that the gap survived is an assertion that nothing re-resolved it.

| Row | Test | ID |
| --- | --- | --- |
| no `command` member ⇒ no discrete listener is bound at all | `tests/kernel/kernel.browser.test.ts` — _should bind no discrete listener when the spec declares no command_ | D-32 |
| a `command.admit` returning `null` mints nothing and the kernel does **not** prevent the default | `tests/kernel/kernel.browser.test.ts` — _should not prevent the default when the command declines_; `tests/sortable/keyboard.browser.test.ts` — _should leave an edge item inert and keep the key native_ | I-32 |
| a pointer `admit` returning `null` likewise, and an admitted press is left **unprevented** — since D-54 the kernel prevents the **move** that crosses the threshold instead, so a press that never activates stays native | `tests/kernel/kernel.browser.test.ts` — _should leave an admitted press unprevented_, _should prevent the move that crosses the activation threshold_, _should not prevent a move for an operation that never activates_ | C-03, D-54 |
| a `command.admit` returning an element mints a pointerless operation and reaches `ACTIVE` with no pointer travel | `tests/kernel/kernel.browser.test.ts` — _should mint a pointerless operation and queue ACTIVATE_ | D-32 |
| a pointerless operation is never advanced by a synthetic pointer event and holds no capture | `tests/sortable/keyboard.browser.test.ts` — _should never be advanced by a synthetic pointer event_, _should acquire no pointer capture_ | I-33 |
| a command reaches `RELEASING` without an `UP`, and its settlement and terminal callback are the pointer path's | `tests/sortable/keyboard.browser.test.ts` — _should run a complete one-slot operation from a single arrow key_, _should reach the terminal callback through the pointer path_ | D-32 |
| **a keyboard and a pointer reorder to the same gap produce identical proposals** | `tests/sortable/keyboard.browser.test.ts` — _should produce identical proposals for the same destination gap_ | D-32 |
| the command destination **survives activation** instead of being reseeded to home | `tests/sortable/keyboard.browser.test.ts` — _should survive activation instead of being reseeded to home_ | C4-01 |
| **and survives release** instead of being re-resolved spatially | `tests/sortable/keyboard.browser.test.ts` — _should survive release instead of being re-resolved spatially_ | C4-01 |
| `release.effect` moves the placeholder but performs **no lift write**, so the landing origin is `(0, 0)` | `tests/sortable/keyboard.browser.test.ts` — _should build the landing origin from a visual that never moved_ | D-35, C5-03 |
| a pointerless `release.prepare` reaching a `null` insertion returns a `SeamRejection` and does **not** fall back to home | `tests/sortable/sortable.browser.test.ts` — _should reject rather than fall back to home_ (driven directly; see below) | D-32 |
| a command gap invalidated by an `invalidate()` queued from inside the listener is rebased or cancels — **no command-specific revalidation** | `tests/sortable/keyboard.browser.test.ts` — _should enqueue an invalidate() rather than drain it_ | I-1, D-32 |
| command admission is refused whenever an operation is already live, at `PENDING`, `ACTIVE` and `SETTLING` | `tests/sortable/keyboard.browser.test.ts` — the _a command against a live operation_ group | C4-07 |
| a `pointerdown` from inside `command.admit`, and a `keydown` from inside `admit`, are both refused by the shared latch | `tests/sortable/keyboard.browser.test.ts` — _should refuse a press dispatched from inside the command listener_, _…from inside the press listener_ | D-32 |
| a throwing `command.admit` reaches `reportFailure(FAILURE_ADMISSION)` with no operation and leaves the controller usable | `tests/kernel/kernel.browser.test.ts` — _should report a throwing command.admit with no operation_ | Q-1 |
| `destroy()` releases every ingress listener, discrete ones included | `tests/kernel/kernel.browser.test.ts` — _should release the discrete listeners on destroy_; `tests/sortable/keyboard.browser.test.ts` — _should release every ingress listener on destroy_ | D-29 |
| `arm()` rejects an empty, non-string, duplicate or `pointerdown`-colliding `command.types` | `tests/kernel/kernel.browser.test.ts` — _should reject an invalid command.types at arm_ | D-32 |
| `Escape` cancels a command exactly as it cancels a press | `tests/sortable/keyboard.browser.test.ts` — _should be cancelled by Escape exactly as a press is_ | D-32 |
| `ArrowLeft` ≡ `ArrowUp` and `ArrowRight` ≡ `ArrowDown` — keyboard is not axis-specific | `tests/sortable/keyboard.browser.test.ts` — _should treat ArrowLeft as ArrowUp and ArrowRight as ArrowDown_ | L-4 |
| `handle()` gates the keyboard path too | `tests/sortable/keyboard.browser.test.ts` — _should gate the keyboard path through handle() as well_ | L-4 |
| the keyboard path resolves the item — and therefore the consumer's `handle()` — **exactly once** per keydown, admitted or declined | `tests/sortable/keyboard.browser.test.ts` — _should resolve the handle exactly once per admitted keydown_, _…for a declined keydown_, _…the same number of times as a press does_ | D1 |
| an admission resolver that queues `invalidate()` queues it **once** per keydown | `tests/sortable/keyboard.browser.test.ts` — _should queue an admission-resolver invalidate() exactly once per keydown_ | D1, D-25 |

### One row is driven at the seam, and why

**A pointerless release with a `null` insertion has no producer.** `command.admit` always writes a gap before returning non-null, and a replacement that invalidates one cancels the operation rather than nulling it — so the guard is unreachable through the public surface. It is asserted by calling `release.prepare` directly, because the reason it is a rejection and not a home fallback is a _correctness_ reason the contract states, and a guard nothing can reach still should not read as tested when it is not.

### A row that documents an abandon rather than a terminal

A command whose gap is invalidated between admission and `ACTIVATE` is **abandoned silently** — no `onStart`, no `onCancel`, no `onError`. That is the phase table's `CANCEL at PENDING → retire` row, which D-32 kept deliberately: no start was notified, so none is owed (I-31), and the observable is the same one an edge-item command already produces. The row asserts the _absence_ of a classified failure, because that is what the defect it caught produced.

---

## Two-dimensional insertion — new (Phase 17)

The 2-D rule is a **sibling axis feature**, `xy()` on `sortable/xy.js`, beside the renamed `y()` on `sortable/y.js`. The rule itself is pinned directly in `tests/sortable/xy.browser.test.ts` — the metric and the gap-side derivation are the only things that differ from `y()`, because everything else is the shared `rect-index.ts` and is asserted next door.

| Row | Test | ID |
| --- | --- | --- |
| the metric spans both axes — a candidate at the same Y wins on X alone | `tests/sortable/xy.browser.test.ts` — _should choose the nearest cell across both axes_, _should let the X term decide between two cells at the same Y_ | L-8 |
| …and on Y alone at the same X | `tests/sortable/xy.browser.test.ts` — _should let the Y term decide between two cells at the same X_ | L-8 |
| the placeholder is the incumbent candidate, so the hysteresis is the same one `y()` has | `tests/sortable/xy.browser.test.ts` — _should keep the incumbent gap when its own centre is nearest_ | I-15 |
| **the gap side is DOM order**, not a coordinate comparison | `tests/sortable/xy.browser.test.ts` — _should derive the gap from DOM order, not from a coordinate_ | L-8 |
| the shared cache's contract holds through this rule too — re-measure on a version change, and **not** while nothing invalidated it | `tests/sortable/xy.browser.test.ts` — _should re-measure when the collection version moves_, _should not re-measure while nothing invalidated it_ | D-19 |
| retire drops the element references | `tests/sortable/xy.browser.test.ts` — _should drop its element references at retire_ | D-19 |
| **the composed rule reorders sideways from real pointer events** | `tests/sortable/xy.browser.test.ts` — _should reorder across a row from real pointer events_ | L-8 |
| **and the identical drag under `y()` proposes nothing** — the control that makes the split a capability rather than a preference | `tests/sortable/xy.browser.test.ts` — _should propose nothing for the same drag under the y rule_ | L-8 |
| **two real axes resolve to one**, in either order. Composition **refused** the pair until D-45 dropped the feature brand; the last fragment now wins, which is the same exclusivity claim with a different remedy | `tests/sortable/assemble.browser.test.ts` — _should let the last axis fragment win, in either order_ | D-19, D-45 |
| the losing axis feature's private state is never built, in either order | `tests/sortable/assemble.browser.test.ts` — _should construct nothing for a losing axis fragment_ | F-19, D-45 |
| a `y()` composition physically cannot reach `xy()`… | `tests/packaging.node.test.ts` — _should keep the minimal composition out of every optional feature_ | 03 §Tree-shaking |
| …**and an `xy()` composition cannot reach `y()`**, which is what makes it an exclusivity claim rather than a one-way absence | `tests/packaging.node.test.ts` — _should keep the two-dimensional composition out of the y axis_ | 03 §Tree-shaking |
| the export topology carries both subpaths, per-subpath surface asserted as an equality | `tests/exports.node.test.ts`, `tests/consumer.node.test.ts` | 03 §Export topology |

### The composed fixture needs a flow layout, and that is a finding

The direct-drive fixtures position cells absolutely so the geometry is exact — right for a single `resolve` call, and **wrong for a drag**. An absolutely-positioned placeholder is inert: moving it in the document moves nothing on screen, so the incumbent's centre never catches up with the pointer and the rule oscillates between two gaps on successive resolutions. The composed rows therefore use a real wrapping flex field, and the comment says why. This is not a defect in the rule; it is what the placeholder-as-incumbent hysteresis _is_, and it only becomes visible when the placeholder can reflow.

---

## Reentrancy

| Row | Test | ID |
| --- | --- | --- |
| `onStart` cancels → canceled at `AT_PROPOSAL`, null proposal, never `ACTIVE` | `tests/sortable/composition.browser.test.ts` — _should settle a cancel from inside onStart as canceled_ | I-31, F-33 |
| `onStart` destroys | `tests/sortable/composition.browser.test.ts` — _should destroy from inside onStart without leaving presentation behind_ | I-6 |
| `onReorder` cancels → the cancel wins | `tests/kernel/kernel.browser.test.ts` — _should let a cancel raised from inside invoke win_ | F-25, I-22 |
| `onReorder` destroys | `tests/sortable/composition.browser.test.ts` — _should tear down without a terminal callback when onReorder destroys_ | I-6 |
| a callback queues work and then throws | `tests/sortable/composition.browser.test.ts` — _should apply work a callback queued before it threw_ | I-22, I-31 |
| a terminal callback destroys | `tests/sortable/composition.browser.test.ts` — _should tolerate a destroy from inside the terminal callback_ | I-6 |

## Async attempts

| Row | Test | ID |
| --- | --- | --- |
| late reorder resolution after a newer operation | `tests/sortable/composition.browser.test.ts` — _should ignore a resolution that settles after a newer operation began_ | F-25 |
| late landing completion | `tests/kernel/kernel.browser.test.ts` — _should make a completion for a retired attempt inert_ | I-24 |
| interrupted landing | `tests/sortable/features.browser.test.ts` — _should not report a cancelled animation as a failure_ | I-24 |
| stale layout-animation completion | `tests/sortable/displacement.browser.test.ts` — _should release a row still running from an earlier move_ | D-7 |

## Resource cleanup

| Row | Test | ID |
| --- | --- | --- |
| partial activation failure | `tests/sortable/sortable.browser.test.ts` — _should stop when the placeholder insertion destroyed the controller_ | I-17, F-22 |
| placeholder factory throws | `tests/sortable/features.browser.test.ts` — _should classify a factory that throws and leave nothing acquired_ | I-17 |
| presentation acquisition throws | `tests/kernel/presentation.browser.test.ts` — _should restore the inline styles when top-layer acquisition throws_ | I-17 |
| animation creation throws | `tests/sortable/features.browser.test.ts` — _should cancel the animation when subscribing to it throws_ | F-22 |
| destroy during active movement | `tests/sortable/composition.browser.test.ts` — _should tear down an in-flight drag on destroy_ | I-6 |
| destroy during consumer resolution | `tests/kernel/kernel.browser.test.ts` — _should drop a resolution that settles after the controller was destroyed_ | I-6, F-25 |
| destroy during long landing | `tests/kernel/kernel.browser.test.ts` — _should destroy a live runner when the controller is destroyed_ | I-6, I-24 |
| disposer failure does not prevent remaining cleanup | `tests/kernel/lifetimes.node.test.ts` — _should run the remaining disposers when one throws_ | D-21, F-22 |

## Collection

| Row | Test | ID |
| --- | --- | --- |
| update during active movement | `tests/sortable/sortable.browser.test.ts` — _should rebase a surviving gap during an active drag_ | D-25 |
| dragged item disappears | `tests/sortable/sortable.browser.test.ts` — _should cancel with item-removed when the dragged item vanishes_ | D-25, F-28 |
| neighbour identity changes | `tests/sortable/sortable.browser.test.ts` — _should cancel when an internal gap loses its adjacency_ | F-31 |
| update during release | `tests/sortable/sortable.browser.test.ts` — _should not rewrite the frozen snapshot after release_ | I-12 |
| update during settlement | `tests/sortable/react.browser.test.ts` — the fixture signals `invalidate()` from every layout effect, including the commit the resolver is awaiting | I-12, D-25 |
| `invalidate()` after `destroy()` is a no-op for a **valid** replacement | `tests/sortable/sortable.browser.test.ts` — _should stay inert for a valid replacement_ | D3 |
| `invalidate()` after `destroy()` is a no-op for an **invalid** one, and does not throw | `tests/sortable/sortable.browser.test.ts` — _should not throw for an invalid replacement_ | D3 |
| a post-`destroy()` replacement queued from a callback is not classified as an activation failure | `tests/sortable/sortable.browser.test.ts` — _should not classify a post-destroy replacement as an activation failure_ | D3, I-6 |

## Styling and animation

| Row | Test | ID |
| --- | --- | --- |
| no-animation default | `tests/sortable/composition.browser.test.ts` — the minimal composition installs neither `landing()` nor `layoutAnimation()` | 03 §composition |
| CSS layout transition | `tests/sortable/composition.browser.test.ts` — _should propose the same gap when the rows carry a CSS transition_ | D-7 |
| long landing duration | `tests/sortable/features.browser.test.ts` — _should hold settlement open until the animation finishes_ | I-9 |
| custom animation runner | `tests/sortable/features.browser.test.ts` — _should let a middle-tier runner replace the default entirely_ | I-24, D-63 |
| the default landing timing is the retained shipped `{ duration: 200, easing: 'ease' }` | `tests/sortable/features.browser.test.ts` — _should default the easing to the retained shipped value_, _…the duration…_ | D6, ledger §7 |
| a `duration` thunk is resolved and validated **once per landing, before** the reduced-motion collapse | `tests/sortable/features.browser.test.ts` — _should read a duration thunk under a reduced-motion preference too_; _should classify an unbounded thunk result under a reduced-motion preference_ | D4, L-6, D-77 |
| interrupted and retargeted displacement | `tests/sortable/displacement.browser.test.ts` — _should replay a still-running row from where it visually is_ | D-7 |

## Construction model — new

| Row | Test | ID |
| --- | --- | --- |
| a discarded `activation.prepare` leaves nothing behind and retires | `tests/kernel/seams.node.test.ts` — _should retire the operation when activation discards_ | I-17 |
| a reentrant `destroy()` from the placeholder factory discards the prepare | `tests/sortable/sortable.browser.test.ts` — _should stop when the placeholder insertion destroyed the controller_ | I-6 |
| `spec.retire()` throwing does not prevent lifetime disposal or ingress abort | `tests/kernel/kernel.browser.test.ts` — _should complete every later step after spec.retire throws_ | F-12 |
| one throwing retire hook does not prevent the rest, reverse order | `tests/sortable/sortable.browser.test.ts` — _should run the retire hooks, each wrapped_; `tests/sortable/assemble.browser.test.ts` — _should expose retire hooks in reverse installation order_ | F-22 |
| a feature factory throwing mid-`assemble` unwinds collected hooks | `tests/sortable/assemble.browser.test.ts` — _should retire the hooks already collected when a factory throws_ | F-19 |
| `arm()` throwing leaves no half-armed controller | `tests/kernel/kernel.browser.test.ts` — _should unwind and rethrow when a frame factory throws_ | F-2 |
| both frames share a key set | `tests/kernel/frames.node.test.ts` — _should produce two frames with an identical key set_ | F-2 |
| a `resetFramePart` that adds or deletes a key is caught in `__DEV__` | `tests/kernel/frames.node.test.ts` — _should reject a reset that adds a key_ / _deletes a key_ | F-2 |
| a frame part declaring `phase` is rejected in production | `tests/kernel/frames.node.test.ts` — _should reject a part declaring a kernel frame key_ | F-20 |
| a symbol-keyed frame part is rejected | `tests/kernel/frames.node.test.ts` — _should reject a symbol key_ | F-20 |
| a displacement hook cannot reach `SettlementScope` | `tests/sortable/feature.declaration.test.ts` — _should not reach the settlement scope_ | I-10 |
| `arm()` validates the tag count; `dispatch()` rejects a bad tag before enqueue | `tests/kernel/kernel.browser.test.ts` — _should drop a tag outside the declared range_ | 02 §ActionTransition |

## Gates and drivers — new

| Row | Test | ID |
| --- | --- | --- |
| neither gate held finalizes in the resolution drain | `tests/kernel/kernel.browser.test.ts` — _should finalize in the resolution drain when neither gate is held_ | I-9 |
| a duplicate hold is ignored and reported | `tests/kernel/kernel.browser.test.ts` — _should ignore and report a duplicate hold_ | F-6 |
| a hold requested after sealing is ignored and reported | `tests/kernel/kernel.browser.test.ts` — _should ignore and report a hold requested after sealing_ | F-6 |
| `settlement.prepare` returning a `SeamRejection` classifies at the named stage | `tests/kernel/kernel.browser.test.ts` — _should classify a prepare rejection at the stage it names_ | F-20 |
| an `effect` that throws is classified, not a panic | `tests/kernel/seams.node.test.ts` — _should classify a throwing effect from the committed state_ | F-19 |
| a `rollback` that throws is reported, not classified | `tests/kernel/seams.node.test.ts` — _should report a throwing rollback without classifying it_ | F-19 |
| `use()` on a disposed lifetime invokes the disposer immediately | `tests/kernel/lifetimes.node.test.ts` — _should invoke a disposer registered after dispose immediately_ | D-21 |

## Landing completion — new

| Row | Test | ID |
| --- | --- | --- |
| synchronous `done()` from inside `start` | `tests/kernel/kernel.browser.test.ts` — _should honour a done() called synchronously inside start_ | F-30 |
| synchronous `fail()` from inside `start` | `tests/kernel/kernel.browser.test.ts` — _should destroy the handle and refuse to finalize after a synchronous fail()_ | F-30 |
| duplicate completion is inert | `tests/kernel/kernel.browser.test.ts` — _should ignore a duplicate completion_ | I-24 |
| `done()` followed by a throw — the completion does **not** survive it: `start` threw, so the runner's state is unknown and the classification retires the attempt the queued completion would have joined | `tests/kernel/kernel.browser.test.ts` — _should classify a start that throws after completing rather than joining_ | F-30, I-4 |
| `start` itself throws | `tests/kernel/kernel.browser.test.ts` — _should roll the hold back and classify when start throws_ | F-27 |
| `start` calls `destroy()` and returns a live handle | `tests/kernel/kernel.browser.test.ts` — _should destroy a handle returned by a start that destroyed the controller_ | F-30 |
| `settlement.effect` requests a hold then throws | `tests/kernel/kernel.browser.test.ts` — _should arm nothing when the effect throws after requesting a hold_ | F-27 |
| a returned handle whose `destroy()` throws | `tests/kernel/kernel.browser.test.ts` — _should report a throwing runner destroy and still pin_ | F-22 |
| the final `lift.write` throws | `tests/kernel/kernel.browser.test.ts` — _should release presentation and still publish a terminal when the pin throws_ | F-22, D-66 |
| `spec.finalized` throws | `tests/kernel/kernel.browser.test.ts` — _should retire after a throwing terminal callback_ | F-22 |

## Landing origin — new (D-35)

**The kernel step before Phase 19 (D-76), landed against the sortable alone.** `LandingContext.from` was `pointerX - originX` and documented as _where the visual is now_. Those are the same number for exactly one behavior — one whose `moved` writes the raw pointer delta on both axes, which is what this package's only shipping behavior does. That is why every suite was green through it: the defect's whole signature is that **the landing jumps at its start and still ends correctly**, because the target is behavior-supplied and the kernel re-pins at the join. Phase 11 met the same shape in the lift geometry and only a demo exposed it.

Two rows below do **not** discriminate, and each says so in the test rather than being quietly counted: the pointer-following fixture is the agreement case by construction, and a pointerless operation mints at `(0, 0)`, so the subtracted form arrives at the right answer by coincidence. The other five fail against the pre-D-35 kernel; verified by reverting the computation and re-running.

| Row | Test | ID |
| --- | --- | --- |
| `compose(from.x, from.y)` reproduces the transform the drag last wrote, pinned at a **non-zero offset on both axes** | `tests/kernel/kernel.browser.test.ts` — _should reproduce the transform the drag last wrote_ | I-34, D-35 |
| a behavior whose `moved` writes something other than the pointer delta — an axis lock — reports **that** delta | `tests/kernel/kernel.browser.test.ts` — _should report the constrained delta rather than the pointer delta_ | I-34, D-35 |
| a write issued from an `action.effect` rather than from `moved` is still the recorded delta | `tests/kernel/kernel.browser.test.ts` — _should track a write issued from an action effect_ | D-35 |
| an operation that never rendered reports `(0, 0)` | `tests/kernel/kernel.browser.test.ts` — _should report the origin for an operation that never rendered_ | D-35 |
| a pointerless operation's `from` is `(0, 0)`, never `-originX` | `tests/kernel/kernel.browser.test.ts` — _should report the origin for a pointerless operation_ | D-32, D-35 |
| `compose()` alone records nothing — composing is not rendering | `tests/kernel/kernel.browser.test.ts` — _should record nothing for a compose without a write_ | D-35 |
| **the adversarial case, documenting discipline rather than a guarantee**: a direct `visual.style.transform` write leaves the record stale and the landing opens from the record | `tests/kernel/kernel.browser.test.ts` — _should leave the recorded delta stale when a behavior writes behind it_ | I-34 (tier C) |
| the structural limits, typed: `ActivationScope.lift` and `moved`'s argument expose neither `rendered` nor `dispose`, and the kernel's own session keeps both | `tests/kernel/spec.declaration.test.ts` — _should not expose the recorded delta on the activation scope_, _should not expose the disposer on the activation scope_, _should hand `moved` the same projection and not the session_, _should keep both members on the kernel's own session_ | I-34, C5-01 |
| the same projection, asserted **out of line** against the packed declarations | `tests/consumer.node.test.ts` — _should compile a consumer against the packed declarations_ | C5-01 |

**The temporal limit is deliberately not a row.** A retained `lift.write` called after `from` is sampled still renders and fights the runner; called after `retire()` it writes onto an element no live operation owns. Both are outside the contract and **neither is refused**, so a test asserting today's behavior would read as a promise. The kernel adds no phase guard on purpose: a branch on the one path M-1 measures, defending against a bug no reference behavior has, converting a violation into a _silent_ no-op — which is the harder defect to find. The `describe` carries the reasoning where a row would have been (C6-01).

## Activation staged type — new (D-34)

| Row | Test | ID |
| --- | --- | --- |
| a `BehaviorSpec` that stages `true` at activation compiles, and its `effect` receives `true` | `tests/kernel/spec.declaration.test.ts` — _should default to staging nothing_, _should hand a staging-nothing effect the sentinel_ | F-44, D-34 |
| the sortable's `HTMLElement` staging is unchanged and its `effect` still receives the placeholder | `tests/kernel/spec.declaration.test.ts` — _should hand a staging-element effect the element_ | D-34 |
| `@ts-expect-error`: a spec declaring `Activation = true` cannot return an element, and one declaring `HTMLElement` cannot return `true` | `tests/kernel/spec.declaration.test.ts` — _should reject an element from a spec that declared it stages nothing_, _should reject the sentinel from a spec that declared it stages an element_ | D-34 |
| the parameter reaches the **construction** types, so it is not erased at the handshake (C-04) | `tests/consumer.node.test.ts` — _should compile a consumer against the packed declarations_ | D-34, C-04 |
| the probe that found it now compiles as a positive | `docs/probes/13c-free-drag.ts` — `n1`, asserted by `npx just typecheck` | F-44 |

## The renamed stages and the deferred-decision instrument — new (D-74, K-5)

| Row | Test | ID |
| --- | --- | --- |
| the three renamed stages keep their **numeric** values 4, 5 and 8 | `tests/kernel/errors.node.test.ts` — _should keep the three renamed stages on their original numbers_ | D-74 |
| the renamed constants are what `kernel.js` publishes, by value, and the old names are gone | `tests/exports.node.test.ts` — _should export exactly the frozen runtime surface_ | D-68, D-74 |
| every decision the ledger marks unimplemented is listed, and every listed decision is marked | `tests/decisions.node.test.ts` — _should list every decision its own row marks as unimplemented_, _should mark every decision it lists_ | F-63, K-5 |
| a listed decision that has quietly landed fails its own row | `tests/decisions.node.test.ts` — _should hold every witness it claims_ | F-63, K-5 |
| the three destinations — `Phase <n>`, `Before Phase <n>`, `Remediation` — are read by **both** halves | `tests/decisions.node.test.ts` — _should read a numbered phase from both halves_, _should read a pre-phase destination from both halves_, _should read a remediation destination from both halves_ | F-70 |
| a destination outside the closed vocabulary **fails** rather than being skipped by both halves at once | `tests/decisions.node.test.ts` — _should refuse a marker destination outside the vocabulary_, _should refuse a row destination outside the vocabulary_, _should spell every destination in the closed vocabulary_ | F-70 |
| a marker or a deferred row that does not parse is a failure, and `\| D-nn \|` outside the section is not one | `tests/decisions.node.test.ts` — _should refuse a marker it cannot parse rather than skipping it_, _should refuse a table row it cannot parse rather than skipping it_, _should not read the decision tables as deferred rows_ | F-70 |

## Collection staging — new

| Row | Test | ID |
| --- | --- | --- |
| a reentrant `cancel()` during `action.prepare(COLLECTION)` leaves `rt.snapshot` unchanged | `tests/sortable/sortable.browser.test.ts` — _should publish and then cancel when the gap cannot survive_ | F-19, F-28 |
| a discarded collection action is not observable by a later one: each accepted update takes its own version, and a refused one consumes none | `tests/sortable/sortable.browser.test.ts` — _should keep versions increasing across separate drains_, _should not consume a version for an update it refused_ | D-25 |
| a collection replacement at `SETTLING` publishes in `effect`, not `prepare` | `tests/sortable/sortable.browser.test.ts` — _should not rewrite the frozen snapshot after release_ | I-12 |
| an invalidating replacement publishes **and then** cancels | `tests/sortable/composition.browser.test.ts` — _should cancel when the replacement invalidates the gap_ | F-28 |
| a replacement at `IDLE` publishes but leaves no item elements in either frame | `tests/sortable/sortable.browser.test.ts` — _should publish an idle replacement without binding it to a frame_ | I-20 |
| a replacement at `RELEASING`/`SETTLING` does not rewrite the frozen snapshot | `tests/sortable/sortable.browser.test.ts` — _should refuse to build a proposal across versions_ | I-12 |
| `onStart` calls `invalidate()` → applied at `ACTIVATING` | `tests/sortable/sortable.browser.test.ts` — _should apply an update from inside onStart at ACTIVATING_ | F-32 |

## Failure continuation — new

| Row | Test | ID |
| --- | --- | --- |
| `activation.prepare` throws → one `onError`, retirement after failure handling | `tests/kernel/kernel.browser.test.ts` — _should not retire a failed activation_ | F-27 |
| `release.effect` throws → `onReorder` never invoked | `tests/kernel/seams.node.test.ts` — _should never invoke the consumer after a failed release effect_ | F-34 |
| join **write** failure → presentation releases, one `onError` **and** a terminal. It carried _no terminal_ until D-66 made the terminal total over started operations | `tests/kernel/kernel.browser.test.ts` — _should release presentation and still publish a terminal when the pin throws_ | F-22, D-66 |
| join **measurement** failure → presentation releases, **one `onError` and one terminal** | `tests/kernel/kernel.browser.test.ts` — _should skip the landing and still terminate when the measurement throws_ | D-49, D-60 |
| `finalized` throws → `FAILURE_TERMINAL_CALLBACK`, still retires | `tests/kernel/kernel.browser.test.ts` — _should retire after a throwing terminal callback_ | F-22 |
| an admission resolver calls `destroy()` → no operation is minted | `tests/kernel/kernel.browser.test.ts` — _should not mint an operation when admit destroyed the controller_ | F-30 |

## Settlement mapping — new

| Row | Test | ID |
| --- | --- | --- |
| a skipped resolution → `OUTCOME_NOOP`, immediate recovery, `onFinish` | `tests/sortable/sortable.browser.test.ts` — _should skip the round-trip for a proven no-op_ | F-29, F-37 |
| a rejected resolution _promise_ → `FAILURE_RESOLUTION` | `tests/sortable/sortable.browser.test.ts` — _should classify a rejected round-trip promise_ | F-20 |
| a fulfilled non-resolution → `FAILURE_RESOLUTION` | `tests/sortable/sortable.browser.test.ts` — _should classify a fulfilled non-resolution_ | F-20 |
| an accepted resolution → destination recovery | `tests/sortable/sortable.browser.test.ts` — _should map an accepted resolution to a destination recovery_ | D-16 |
| a rejected `ReorderResolution` value → home recovery and `onCancel` | `tests/sortable/sortable.browser.test.ts` — _should map a rejected resolution to onCancel with its reason_ | F-33 |

## Placeholder movement — new

| Row | Test | ID |
| --- | --- | --- |
| move to a **start** gap (`before === null`) | `tests/sortable/sortable.browser.test.ts` — _should reach a start gap_ | F-31, D-27 |
| move to an **end** gap (`after === null`) | `tests/sortable/placement.browser.test.ts` — _should append for an end gap_ | F-31, D-27 |
| `homeInsertion` carries the item's real neighbours | `tests/sortable/sortable.browser.test.ts` — _should recover to the home gap of the frozen transaction_ | F-31 |
| release and the spatial action produce identical placement | `tests/sortable/sortable.browser.test.ts` — _should move the placeholder to the final gap before resolving_ | D-27 |

## Terminal protocol — new

| Row | Test | ID |
| --- | --- | --- |
| a kernel `CANCEL` produces a complete canceled result | `tests/sortable/composition.browser.test.ts` — _should cancel an active drag on demand_ | F-33 |
| a failure checkpoint produces immediate recovery and **holds no landing gate** — it no longer implies no `finalized` call, which D-66 retracts | `tests/sortable/sortable.browser.test.ts` — _should hold no landing gate for an immediate recovery_ | F-27, D-66 |
| a no-op settlement reaches `onEnd` with the `noop` arm, never the `canceled` one | `tests/sortable/composition.browser.test.ts` — _should finish a drop that never left its own gap as a no-op_ | F-37, D-62 |
| a rejected `ReorderResolution` value reaches `onEnd` with the `rejected` arm and its reason | `tests/sortable/composition.browser.test.ts` — _should cancel a rejected reorder_ | F-33, D-62 |
| a rejected resolution _promise_ is `FAILURE_RESOLUTION` — a fault, not a consumer's chosen rejection; **it now also publishes a `canceled` terminal** (D-66) | `tests/sortable/sortable.browser.test.ts` — _should classify a rejected round-trip promise_ | F-20, D-66 |
| public results narrow without an internal constant, carrying version/from/to/neighbours | `tests/consumer.node.test.ts` — the packed-consumer fixture narrows on `type` alone | F-41, D-31 |

## Explicit failure latching — new

| Row | Test | ID |
| --- | --- | --- |
| each seam calls `host.fail` and returns normally → no success continuation | `tests/kernel/seams.node.test.ts` — _should treat host.fail in prepare as a prepare failure_, _should not run the effect after a latched prepare failure_, _should never invoke the consumer after a latched release failure_, _should not dispatch the checkpoint on a latched effect failure_ | F-34 |
| arm-time `anchorTarget` throws → the landing is **skipped** and the settlement still finalizes. It failed the settlement until D-49 put the measurement on the quality track: the reorder was already committed and accepted, so a presentational fault must not tell the consumer it failed | `tests/kernel/kernel.browser.test.ts` — _should skip the landing and still terminate when the measurement throws_, _should skip the runner entirely when the measurement throws_ | F-35, D-49 |
| `LandingStart` calls `fail()` synchronously and returns a live handle | `tests/kernel/kernel.browser.test.ts` — _should destroy the handle and refuse to finalize after a synchronous fail()_ | F-30 |
| `fail()` then `done()`, and `done()` then `fail()` | `tests/kernel/kernel.browser.test.ts` — _should let a done() win over a later fail()_, _should let a fail() win over a later done()_ | I-24 |
| `anchorTarget` destroys before `start` → `start` is never called | `tests/kernel/kernel.browser.test.ts` — _should never call start after anchorTarget destroyed the controller_ | F-38 |
| `moved` throws from compose, the style write and `schedule` | `tests/kernel/kernel.browser.test.ts` — _should classify a throwing moved instead of panicking_; `tests/sortable/sortable.browser.test.ts` — _should classify a scheduling failure as SCHEDULED_FRAME_ | F-40 |

## Teardown totality — new

| Row | Test | ID |
| --- | --- | --- |
| `resetFramePart(current)` throws → the draft is still scrubbed and ingress aborted | `tests/kernel/kernel.browser.test.ts` — _should scrub the draft after the current frame reset throws_ | F-36 |
| `resetFramePart(draft)` throws → ingress is still aborted | `tests/kernel/kernel.browser.test.ts` — _should release ingress after a reset throws_ | F-36 |
| a reset throw during a failed `arm()` unwind does not replace the arm error | `tests/kernel/kernel.browser.test.ts` — _should scrub both frames when the shape assertion throws_ | F-36 |
| the reset error is reported, never substituted for the destroy error | `tests/kernel/kernel.browser.test.ts` — _should report a reset failure rather than swallow it_ | F-36 |

---

## The skipped landing and the orthogonal channels — new (D-39, D-42, D-49, D-60)

| Row | Test | ID |
| --- | --- | --- |
| a detached placeholder skips the landing rather than measuring `0×0` | `tests/sortable/commit-window.browser.test.ts` — _should skip the landing when replaceChildren detaches the placeholder_ | D-42, D-49 |
| the row does not travel to the viewport origin | `tests/sortable/commit-window.browser.test.ts` — _should not travel to the viewport origin while the landing runs_ | D-49 |
| a replaced container skips the landing | `tests/sortable/commit-window.browser.test.ts` — _should skip the landing when the commit removes the placeholder container_ | D-42 |
| a commit that leaves the placeholder in place still lands | `tests/sortable/commit-window.browser.test.ts` — _should still land when an append loop pushes the placeholder to index 0_ | D-42 |
| the runner is never started for a skipped landing | `tests/kernel/kernel.browser.test.ts` — _should skip the runner entirely when the measurement throws_ | D-49 |
| one operation produces `onError` **and** a terminal | `tests/sortable/react.browser.test.ts` — _should finish and report, both_ | D-60 |
| the same, on the cancel arm | `tests/sortable/sortable.browser.test.ts` — _should refuse a home recovery whose anchor left the container and still cancel_ | D-60 |
| a consequential failure publishes **both** channels — `onError` and a terminal. It published no terminal until D-66 made the terminal total over started operations | `tests/sortable/sortable.browser.test.ts` — _should publish both channels for a consequential failure_ | D-23, D-66, D-60 |
| a discarded preparation returns a consumer placeholder clean | `tests/sortable/features.browser.test.ts` — _should roll back every library write when a cancelling factory discards the preparation_ | D-39 |
| …with no `style=""` residue | `tests/sortable/features.browser.test.ts` — _should leave no style attribute behind on a rolled-back element that had none_ | D-39, F-57 |
| a destroying factory writes nothing to roll back | `tests/sortable/features.browser.test.ts` — _should write no mechanics once the factory destroys the controller_ | I-36 |

**One row is deliberately absent.** The library's own `<div>` records no rollback, and there is no test for it because there is nothing observable to assert: with no `placeholder` slot composed there is no consumer hook from which to invalidate the preparation, and the element the assertion would examine is unreachable. The ledger is `null` on that path by construction.

**And one changed verdict rather than moving**: `tests/sortable/react.browser.test.ts` §_that unmounts the dragged item_ used to assert Q-12's degraded re-anchor — measure the placeholder where it stands, report nothing. D-42's precondition supersedes it, and the suite now asserts the skip plus the report.

---

## Input policy — new (D-46, D-50, D-54)

The 05 row is closed by `tests/sortable/input-policy.browser.test.ts`, which **is probe E promoted**: the same ten cases, the same real Chromium input, with every snapshot re-recorded against the repaired behavior. The rows below name the case that would fail first; the kernel-level mechanics — where the prevention lands and what the click suppressor's lifetime is — are pinned separately, because they are the kernel's and not the sortable's.

| Row | Test | ID |
| --- | --- | --- |
| a press that never activates keeps focus, caret and click | `tests/sortable/input-policy.browser.test.ts` — _should place focus and a caret in a nested text input_ | D-54 |
| an admitted press is not prevented | `tests/kernel/kernel.browser.test.ts` — _should leave an admitted press unprevented_ | D-54, C-03 |
| the crossing move is prevented | `tests/kernel/kernel.browser.test.ts` — _should prevent the move that crosses the activation threshold_ | D-54 |
| admission declines on interactive and editable descendants | `tests/sortable/input-policy.browser.test.ts` — _should decline a drag-select inside a nested text input_ | D-46, I-32 |
| a slider thumb is not a drag handle | `tests/sortable/input-policy.browser.test.ts` — _should decline a drag on the thumb of a nested `<input type="range">`_ | D-46 |
| arrow keys in a text input do not reorder | `tests/sortable/input-policy.browser.test.ts` — _should leave ArrowRight to a nested text input_ | D-46 |
| target first, feasibility second | `tests/sortable/input-policy.browser.test.ts` — _should ask what the event landed on before asking whether the move is feasible_ | D-46 |
| `isComposing` never admits | `tests/sortable/input-policy.browser.test.ts` — _should never admit while an IME composition is in progress_ | D-46 |
| the explicit opt-out attribute | `tests/sortable/input-policy.browser.test.ts` — _should decline a press inside a `[data-drag-ignore]` region_ | D-46 |
| plain-text selection is requested, not inferred | `tests/sortable/input-policy.browser.test.ts` — _should decline an Alt-held press and admit under every other modifier_ | D-46 |
| explicit scoping wins over the decline | `tests/sortable/input-policy.browser.test.ts` — _should admit from a handle that is itself an interactive element_ | D-50 |
| `handle()` still narrows both ingresses | `tests/sortable/input-policy.browser.test.ts` — _should admit only from the grip for the pointer cases with `{ handle: … }` composed_ | D-50 |
| one trailing `click` is suppressed after activation | `tests/kernel/kernel.browser.test.ts` — _should suppress exactly one trailing click after an activated drag_ | D-54 |
| a press that never activated keeps its click | `tests/kernel/kernel.browser.test.ts` — _should not arm the suppressor for a press that never activated_ | D-54 |
| a cancelled drag still suppresses | `tests/kernel/kernel.browser.test.ts` — _should suppress the trailing click after a cancelled drag too_ | D-54 |
| the suppressor is ingress-scoped, not operation-scoped | `tests/kernel/kernel.browser.test.ts` — _should disarm the suppressor at teardown_; _…on the next pointerdown_ | D-54 |

**Two rows are owed rather than closed.** Probe E is Chromium and mouse only, so touch long-press and tap-highlight behavior under the relocated `preventDefault()` is an **owed measurement** (02 §Input policy), not a passing row. And the focusable-grip obligation a `handle` carries is a documented consumer obligation with no library-side assertion available — a fixture can only observe that an unfocusable grip receives no keydown, which pins the platform rather than the library.

---

## The terminal, whole — new (D-66, D-62, D-63, D-67)

**D-66 is the load-bearing one and it is a retraction**, so the rows below are mostly rows that _changed verdict_ rather than rows that arrived. The package had an unstated rule — a classified failure publishes no terminal — which nothing had ever decided and seven tests asserted as `not.toContain(…)`. D-66 replaces it with an implication: **every operation that _started_ on a live controller publishes exactly one terminal, the failure path included.** Operations that never started still publish nothing, and that half is a separate row because a guarantee widened by accident is indistinguishable from one that was designed.

| Row | Test | ID |
| --- | --- | --- |
| a failure before `onStart` publishes no terminal | `tests/sortable/sortable.browser.test.ts` — _should publish no terminal when activation.prepare throws_ | D-66, Q-15 |
| `onStart` itself throwing **does** publish one | `tests/sortable/sortable.browser.test.ts` — _should publish a terminal when onStart itself throws_ | D-66 |
| a failure before the round-trip carries `AT_PROPOSAL` | `tests/sortable/sortable.browser.test.ts` — _should carry AT_PROPOSAL for a failure before the round-trip opens_ | D-66 |
| …and so does a `release.effect` throw, which a `proposal !== null` derivation would have got wrong | `tests/sortable/sortable.browser.test.ts` — _should carry AT_PROPOSAL for a release.effect throw_ | D-66 |
| a failure during the round-trip carries `AT_CONSUMER` | `tests/sortable/sortable.browser.test.ts` — _should map a cancel during the round-trip to the consumer stage_ | D-66 |
| a consequential failure publishes the terminal **and** reports | `tests/sortable/sortable.browser.test.ts` — _should publish both channels for a consequential failure_ | D-66, D-60 |
| a throwing terminal callback publishes exactly once, not forever | `tests/sortable/sortable.browser.test.ts` — _should publish exactly one terminal when the terminal callback throws_ | D-66 |
| the kernel side: presentation is released before the terminal on the failure path too | `tests/kernel/kernel.browser.test.ts` — _should release presentation and still publish a terminal when the pin throws_ | D-66, I-14 |
| …and the operation still retires afterwards | `tests/kernel/kernel.browser.test.ts` — _should retire after a throwing terminal callback_ | D-66 |
| a skipped landing still terminates normally | `tests/kernel/kernel.browser.test.ts` — _should skip the landing and still terminate when the measurement throws_ | D-49, D-66 |
| **one** `onEnd`, four arms, told apart by the discriminant alone | `tests/consumer.node.test.ts` — the packed-consumer fixture switches on `result.type` | D-62, F-41 |
| the terminal slot is one slot and defaults to null | `tests/sortable/assemble.browser.test.ts` — _should leave the terminal callbacks null when uninstalled_ | D-62 |
| a custom runner is authorable from the middle tier, without `landing()` | `tests/sortable/features.browser.test.ts` — _should let a middle-tier runner replace the default entirely_ | D-63, D-61 |
| ~~both `duration` forms are judged at the **same instant**, against the one value that can hang the gate~~ · **the cited tests assert construction non-throwing, which is a deletion assertion, not this one** (P18A-19) — restated as the two rows below | `tests/sortable/options.node.test.ts` — _should not refuse Infinity at construction either_, _should no longer refuse a negative duration at construction_ | D-63, D-77 |
| the retained `=== Infinity` guard refuses **both** input forms at settlement, by message and by code | `tests/sortable/features.browser.test.ts` — _should refuse an unbounded fixed duration at settlement_, _should refuse an unbounded contextual duration at settlement_ | D-77, P18A-19 |
| refusing it is what keeps the terminal reachable — the operation still publishes exactly one | `tests/sortable/features.browser.test.ts` — _should still publish exactly one terminal for a refused duration_ | D-66, D-77, P18A-19 |
| the deleted domain checks are asserted **as deleted**, each paired with what answers instead | `tests/sortable/options.node.test.ts` — _should no longer refuse a negative distance_, _should no longer refuse a non-finite distance_, _should not be checked for being functions_, _should no longer refuse a negative duration_ (layoutAnimation) | D-77 |
| a missing axis loses its **message**, not its failure, and the dereference that replaces it retires every installer that already ran | `tests/sortable/assemble.browser.test.ts` — _should no longer diagnose a missing axis with a library message_, _should unwind when an axis installer contributes no insertion geometry_ | D-77 |
| a later `Partial` fragment cannot clear a required slot with `undefined` | `tests/sortable/options.node.test.ts` — _should not let a later fragment clear a required slot with undefined_, _should not let a later fragment clear items or onReorder either_ | D-77, B-9 |
| …and the same, **through the public entry**, paired with a positive so it cannot pass vacuously | `tests/sortable/composition.browser.test.ts` — _should not let a later fragment clear a required slot_, _should let a later fragment through to the merge_ | D-77, B-9 (c), P18A-15 |

## The D-77 landing remediation — new (D-78, D-79, D-80)

| Row | Test | ID |
| --- | --- | --- |
| `AxisInstaller` is **hoistable** from `sortable.js` by a consumer importing nothing deeper, while its closure stays at the middle tier | `tests/consumer.node.test.ts` — _should compile a consumer against the packed declarations_ (the `hoistedAxis` const and the surviving `@ts-expect-error`s on `SortableContribution`/`InsertionGeometry`/`FeatureContext`) | D-78 |
| the ordinary tier's closure resolves within `sortable.js ∪ drag.js ∪ sortable/feature.js` | `tests/docs.node.test.ts` — _should close the ordinary tier over the ordinary tier and the ones below it_ | D-78 |
| a duplicated element is refused **before any installer runs** — asserted as _nothing ran_, not as _everything was retired_ | `tests/sortable/composition.browser.test.ts` — _should refuse a duplicated element before any installer runs_ | D-80 (b), F-68 |
| a throwing `items()` is refused before any installer runs, by statement order rather than by argument position | `tests/sortable/composition.browser.test.ts` — _should refuse a throwing pull source before any installer runs_ | D-80 (b), F-69 |
| installers that **did** run are still retired on `destroy()`, so the guarantee is not met by recording nothing | `tests/sortable/composition.browser.test.ts` — _should retire every installer it ran when the controller is destroyed_ | D-80 (b) |
| **negative controls:** both pre-D-80 arrangements are reconstructed and shown stranding every hook | `tests/sortable/composition.browser.test.ts` — _should be discriminated by the pre-D-80 validation position_, _should be discriminated by the pre-D-80 argument order_ | D-80 (b), F-68, F-69 |
| the platform's refusal of `-1` arrives at the stage the deleted check reached — the premise of the deletion | `tests/sortable/features.browser.test.ts` — _should classify an out-of-domain contextual result at settlement_ | D-79 |
| both axis modules return the **installer**, hoisted into a typed const, and the fixed landing form compiles | `docs/revision/revision-2.ts` (type fixture) | B-9 (b), P18A-14 |
| `duration` is called once per landing, with the trajectory | `tests/sortable/features.browser.test.ts` — _should invoke duration once per landing, with the trajectory_ | D-67 |
| a shipped zero-argument thunk still works | `tests/sortable/features.browser.test.ts` — _should keep a zero-argument thunk working_ | D-67, F-52, L-6 |
| an out-of-domain contextual result classifies at settlement | `tests/sortable/features.browser.test.ts` — _should classify an out-of-domain contextual result at settlement_ | D-67 |

**The other line of the lookup, added at application review 1 (A-1, A-2).** Every row above exercises _frame holds none_; these exercise _frame holds a result_, which is the line a defect had been shipping against — `settlement.prepare` overwrote a committed result with the `canceled` fallback, so a drop whose data really was reordered reported `{ type: 'canceled' }` on both channels.

| Row | Test | ID |
| --- | --- | --- |
| a landing runner failing after the commit keeps `accepted` | `tests/sortable/sortable.browser.test.ts` — _should keep the accepted result when the landing runner fails_ | D-66, A-1 |
| …and so does a runner that cannot be created | `tests/sortable/sortable.browser.test.ts` — _should keep the accepted result when the runner cannot be created_ | D-66 |
| …and the pin throwing at the join | `tests/sortable/sortable.browser.test.ts` — _should keep the accepted result when the pin throws at the join_ | D-66 |
| the tie-break is _existing result wins_, not _accepted wins_ | `tests/sortable/sortable.browser.test.ts` — _should keep a rejected result too, not just an accepted one_ | D-66 |
| the fallback's `reason` **is** the classifying error, by identity | `tests/sortable/sortable.browser.test.ts` — _should publish both channels for a consequential failure_ | D-66 |

**Three post-commit stages, which is the whole set rather than a sample.** `LANDING_CREATE` and `LANDING_INTERRUPTED` both require an armed gate and arming happens after `prepare` returns; the pin runs at the join. Handoff §3 asked for the failure-stage set to be covered rather than sampled, and this is the half that was missing: the stages the sortable suite already drove — `RENDERER_WRITE` on the hot path, `REORDER_RESOLUTION`, `TERMINAL_CALLBACK` — are all pre-commit, so every one of them was a _frame holds none_ case.

**Why the gap was invisible.** The nearest existing row, `tests/kernel/kernel.browser.test.ts` — _should release presentation and still publish a terminal when the pin throws_ — is driven by the kernel harness's stub behavior, so it never reaches `settlement.prepare` and asserts only _that_ a terminal fired, never _which_. A row that asserts a callback happened is not a row that asserts what it was handed.

**Three things these rows made concrete.**

1. **D-66 needed a kernel site the contract did not name.** The contract assigns the fallback to `settlement.prepare` and the publication to `finalized`, but the failure path never reaches `finalized` — it runs REPORTING → `ERROR_REPORTED` → retire. The terminal is published from `ERROR_REPORTED`, **after presentation is released**, so a consumer's terminal sees the same world on both routes; a consumer must not have to know which route its drag took to know whether the placeholder is still in the list.
2. **`FAILURE_TERMINAL_CALLBACK` is excluded, and the exclusion is the difference between one terminal and an infinite loop.** `finalized` has already run at that stage, so re-publishing would deliver a second end and — throwing again — do so forever. The behavior's own `settlement.prepare` makes the same exclusion from the other side, which is why the pair is asserted rather than either half.
3. **D-67's compatibility row cannot be a type assertion.** A zero-parameter function is assignable to any signature (F-52), so `duration: () => 200` is not a compile error and no `@ts-expect-error` can pin it. It is asserted as behavior instead: the shipped form is still invoked, once, per landing.

**Seven rows changed verdict rather than moving**, and each names the retracted assertion in its own comment: five in `tests/sortable/sortable.browser.test.ts` and two in `tests/kernel/kernel.browser.test.ts` read `toEqual([])` or `not.toContain('finalized')` until D-66. They were not wrong when written — nothing had decided the question — which is why the retraction is recorded at each site instead of the diff being left to explain itself.

---

## Kernel vocabulary — new (D-68)

The tier published no value at all, so it could **describe** a behavior and not **construct** one (F-59). The first row is the only one that tests self-containment as a _property_; the rest pin the list and the boundary.

| Row | Test | ID |
| --- | --- | --- |
| a behavior compiles from `kernel.js` + `drag.js` alone, every seam **out of line** | `tests/consumer.node.test.ts` — the `BEHAVIOR` fixture, compiled against the packed declarations | D-68, F-59 |
| the 33 values, asserted **by value** | `tests/exports.node.test.ts` — _should export exactly the frozen runtime surface_; `tests/consumer.node.test.ts` — _should expose exactly the intended runtime surface, per subpath_ | D-68 |
| `kernel.js`'s closure resolves within `kernel.js ∪ drag.js` | `tests/docs.node.test.ts` — _should close the kernel tier over the kernel tier_ | F-60 |
| `intentionallyNotExported` is empty | `typedoc.json`, enforced by the same run — TypeDoc fails a listed name that becomes exported | D-68 |
| the behavior reaches nothing unpublished and unenumerated | `tests/kernel/vocabulary.node.test.ts` — _should reach nothing from the behavior that is neither published nor a named internal_ | D-68 |
| `ActionTransition` and `SeamRejection` resolve to one declaration each | `tests/kernel/vocabulary.node.test.ts` — _should declare the doubly-declared seam types exactly once_ | F-61 |
| `KernelFrame.phase` is `Phase` | `tests/kernel/frames.declaration.test.ts` — _should expose the kernel slice for reading_ | D-68 |
| the re-homed names keep their old specifiers, by identity | `tests/kernel/vocabulary.node.test.ts` — _should keep the re-homed cancel stages as one declaration on two entries_, _…should re-export the middle tier's landing seam types from the kernel's own modules_ | D-68 |
| the hand-written type allow-list holds no name the entries stopped exporting | `tests/kernel/vocabulary.node.test.ts` — _should list only types the entries still export_ | D-68, review 2 B-6 |

**Out of line is the whole assertion in the first row.** An inline factory is contextually typed throughout, so it names three to eight things and would have compiled against the pre-D-68 surface — `docs/revision/revision-2.ts` is exactly that shape and is why it could not be the acceptance case. Hoisting each seam into its own `const` forces the closure to be nameable, and filling `config.liftMode` forces a value that no type can supply. Falsified by removing one value (`LIFT_IN_PLACE`) and one type (`BehaviorInstall`) from the entry: the packed compile fails on both, at the fixture.

**The per-entry docs run is F-60's row, and the whole-run form cannot make it.** TypeDoc resolves across every entry at once, so `LandingStart`, `LandingHandle`, `LandingContext`, `Disposer` and `CancelStage` resolved through `sortable/feature.js` and `sortable.js` — a clean report while the kernel entry's closure ran through the **behavior** tier. Restricting the run to the kernel's own tier asks the question the boundary needs.

**The type half of the allow-list is checked in both directions now.** `PUBLISHED_NAMES` reflects over the entries for values, so that half self-maintains; the types are written out because they erase in Node, and a stale name there silently _widens_ the boundary the file exists to hold. The last row matches each name against the entries' export statements with block comments stripped — every one of them also appears in the prose above its own export, so an unstripped match would pass on the name having been _documented_ rather than exported. Falsified by adding a name the entries do not export.

**Three residues the empty exemption list forced out**, each a declaration change rather than an export: `FrameKeyCollision` inlined into `FramePartOf`, `LifetimeScope` declared as the base with `Lifetime` extending it (it was `Pick<Lifetime, …>`, so publishing the projection dragged the member the projection exists to remove into the closure), and one `{@link}` in `FramePartOf`'s comment turned into prose because it pointed at a deliberately unpublished name.

---

## The footprint's cross axis — new (F-58, resolution A-3)

The two-window rule subtracted on **both** axes, so `footprint.width` was `0` for every composition where `box !== visual` — and the fixture written to prove the rule had `footprint.width === 0` inside it while asserting only the height. The correction is one expression: the width is `boxPre.width` always, and only the height subtracts.

| Row | Test | ID |
| --- | --- | --- |
| the footprint's height is the collapse | `tests/sortable/features.browser.test.ts` — _should size the placeholder from the footprint, not the visual, when a box is composed_ | D-43 |
| …and **both extents** are asserted, in that same fixture | the same row's `rect.width` assertion | F-58 |
| a composed box under a non-stretch cross alignment stands where the row stood | `tests/sortable/features.browser.test.ts` — _should stand on the box's own width under a centred cross alignment_ | F-58 |
| the identity branch is unchanged, and pins the degeneracy | `tests/sortable/features.browser.test.ts` — the default-composition placeholder rows | F-55 |

**The centred row is the one that reaches `anchorTarget`.** A zero-width placeholder has the same `left` as a full-width one in a start- or stretch-aligned list, so a width assertion alone cannot show what the defect costs; under `align-items: center` the placeholder centres on its own width, so `0` puts it on the container's centre line — 60 px from where the row's box stood — and that element is what the landing target's `x` is read from. Both rows fail against the two-axis subtraction and nothing else does.

**Scope, asserted as a limit rather than repaired.** A composed `box !== visual` is supported with `y()` only. `xy()` over a wrapping flex row is outside the declared scope: the rule fixes the flow axis to `height`, so that composition gets the full pre-lift width and a spurious height delta. The failure is bounded and in the same direction as the pre-D-43 behavior — a placeholder too large — rather than the unbounded `width: 0` collapse, and it is declared instead of detected, which is the treatment rule-placed layouts already get.

---

## Probe A's two unpinned rows, and two totality belts — new (A-5…A-8)

Named in handoff §3 and absent from the suite until application review 1 found them. Each is an **observable** whose mechanism was already covered — which is exactly how they stayed missing.

| Row | Test | ID |
| --- | --- | --- |
| an abandoned resolver's late rejection never reaches the page | `tests/kernel/kernel.browser.test.ts` — _should not surface an abandoned resolver's late rejection to the page_, with a real `unhandledrejection` listener and a **newer** operation owning the controller | D-40, probe A |
| a panic closes, then reports, then tears down | `tests/kernel/kernel.browser.test.ts` — _should close, report and only then tear down on a panic_ | D-36, probe A |
| every published stage maps to a fault class | `tests/kernel/errors.node.test.ts` — _should assign a code to every published stage_ | D-64 |
| the fault-class set is closed at four | `tests/kernel/errors.node.test.ts` — _should assign no code outside the four fault classes_ | D-64 |
| `landing({ run })` does not compile at the ordinary tier | `tests/consumer.node.test.ts` — the `@ts-expect-error` on `landing({ run })`, against the **packed** declarations | D-63 |

**The rejection row asserts the consequence, not the guard.** Every other row about an abandoned resolver asserts the slot comparison `resolution !== attempt`, which is how the library _ignores_ a stale settlement. What a consumer sees if that ignoring is ever done by declining to subscribe is an `unhandledrejection` in their console. Falsified by dropping the rejection handler from the kernel's `then.call`: two rows fail, this one among them.

**The panic row is the only one that reaches the kernel's `panic()`** rather than the seam driver's in isolation, and it is worth having because the ordering is **non-local** — `void destroy(); report(error)` produces _report before teardown_ only because the drain sits inside a transaction that defers the physical steps. Falsified twice: reversing the two statements breaks the `closed:true` reading taken from inside the report, and removing the drain's transaction bracket breaks this row plus the two bracket rows.

**The stage → code rows are a belt, and say so.** The `Record<FailureStage, DraggableErrorCode>` in `errors.ts` already makes the mapping total in the type. What the enumeration adds is a **code per stage, written out** — the `Record` proves each stage has _a_ code and D-64's content is which one. Totality is a separate row (_should enumerate every stage the module publishes_) that derives the stage list by reflecting over `failures.ts`'s own `FAILURE_*` exports, so a stage that ships without reaching the mapping fails a test. That row is new: this paragraph and the suite's header both claimed the derivation before it existed, and thirteen hand-written tuples behind a `toHaveLength(13)` pinned only the local table (review 2, B-4). The count is **thirteen** — `FAILURE_PRESENTATION_READY = 13` went with D-41 and its number was not reused — and D-64's row said fourteen until an earlier pass corrected it.

---

## Terminal barrier in a resolver sequence — new (C2-01)

> A participant that invokes consumer code more than once inside one seam, or inside one native admission, reads the terminal latch **between** invocations and stops on the first closed reading (I-36, F-47). The obligation is provisioning in two forms — a reading, or a named kernel bracket that revalidates and undoes (I-36 (1)) — over a five-act floor everywhere, plus stronger promises at named sites (I-36 (2), (3)). Holding a reading is not discharging: C5-01 and C5-02 were both at provisioned modules. The rows below split accordingly: floor rows and **ceiling** rows.

**Every row asserts the resolver's call list or an instrumented element, never the resulting insertion or the final DOM.** The frame is discarded upstream regardless — `action.prepare` returns `null` on a `null` resolve, and `preparationValid()` would invalidate the transition anyway — so a state assertion passes against unfixed source. This is C4-04's lesson applied to a different mechanism.

**The call list is not the whole condition, and Checkpoint D review 3 (C3-01) found the gap.** I-36 requires the barrier to invoke no further consumer code **including indirectly through a consumer-owned object**, and the placeholder is the consumer's element: an overridden `getBoundingClientRect()` is a consumer call. A resolver-list assertion cannot see that, so the two rows that read _"no geometry is read after it"_ were passing without checking it. The geometry half is now its own row per axis, instrumented **on the element**, and both were verified to fail against pre-fix source.

| Row | Test | ID |
| --- | --- | --- |
| a `handle()` resolver destroys → `visual()` is never called, nothing is minted, `defaultPrevented` is false, nothing is reported | `tests/sortable/features.browser.test.ts` — _should not resolve a visual after the handle resolver destroyed_ | I-36 |
| the same on the **command** ingress, which runs the whole of admission inside the native listener (D-32) | `tests/sortable/features.browser.test.ts` — _should not resolve a visual after a keydown handle resolver destroyed_ | I-36 |
| a candidate `visual()` destroys during a composed drag → the call list stops at that candidate, `y()` axis | `tests/sortable/features.browser.test.ts` — _should stop the candidate traversal at the destroying candidate_ | I-36 |
| the same through real input on the `xy()` axis — the check is shared but the **threading** is per-axis | `tests/sortable/xy.browser.test.ts` — _should stop the traversal of a composed drag at the destroying candidate_ | I-36 |
| direct drive: `live` flips false during the second candidate → `resolve` returns `null` and no later candidate is asked | `tests/sortable/{y,xy}.browser.test.ts` — _should stop resolving candidates once the controller closes_ | I-36 |
| **the geometry half**: the same abort reads **zero** `getBoundingClientRect()` calls on the consumer-supplied placeholder, counted on the element — mirrored per axis because `refresh`'s abort signal is threaded per axis | `tests/sortable/{y,xy}.browser.test.ts` — _should read no placeholder geometry once the controller closes_ | I-36, I-6 |
| **the retired-state half a `break` gets wrong**: a second `resolve` at the **same** snapshot version rebuilds from scratch, which is only possible if the aborted traversal left the cache empty, dirty and at `measured === -1` | `tests/sortable/{y,xy}.browser.test.ts` — _should leave the cache retired rather than clean and partial_ | I-36, I-20 |
| the **eager** rebuild inside the committed-move bracket destroys → no `afterMove` hook runs | `tests/sortable/features.browser.test.ts` — _should not run the eager rebuild past a destroying candidate_ | I-36 |
| a custom-element placeholder's `disconnectedCallback` destroys during a committed `movePlaceholder` → nothing after the reaction runs, and the `finally` still clears `view.insertion` | `tests/sortable/features.browser.test.ts` — _should not run the bracket past a placeholder reaction that destroyed_ | I-36 |

### The indirect half — new (Checkpoint D review 4, C4-01)

> I-36's indirect-invocation clause reaches DOM methods the library calls on consumer-owned nodes and not only the named resolver slots — bounded, since review 4, by I-36's floor and register: these rows are **ceiling** rows for the candidate loop, whose no-geometry promise is stated at `contract/03` and in the README. The barrier had been sitting between `getVisual` and the candidate's own `getBoundingClientRect()`; that read is a consumer call too.

**The discriminating candidate is the last one.** A destroy raised from an _earlier_ candidate's geometry was already caught by the next iteration's reading, so a case built on one is not a regression at all — it passes against pre-fix source. Only the last candidate falls through to the trailing bookkeeping and to the placeholder read. Every row below was verified to fail against pre-C4-01 source — **except the last**, which is a conformance pin added at review 4 and is labelled as one: it passes against current source, guards no barrier, and pins the size of a residue I-36 (2) classifies as conforming. It was verified to be **sensitive** rather than vacuous by removing the kernel's F-30 handle disposal, against which it fails.

| Property | Where | Invariant |
| --- | --- | --- |
| a candidate's own `getBoundingClientRect()` destroys with **no `visual()` composed** → **zero** placeholder reads. The composition that could not abort at all before, because the item is its own visual | `tests/sortable/{y,xy}.browser.test.ts` — _should read no placeholder geometry once the last candidate closed the controller_ | I-36 |
| the same → the cache is left dirty and empty, so the **same** snapshot version rebuilds from scratch | `tests/sortable/{y,xy}.browser.test.ts` — _should leave the cache retired after the last candidate closed the controller_ | I-36, I-20 |
| a candidate's geometry destroys **with** a resolver composed → the resolver list stops at that candidate, which the pre-C4-01 ordering could not do | `tests/sortable/{y,xy}.browser.test.ts` — _should resolve no further visual once a candidate closed the controller_ | I-36 |
| **the entry barrier**: a `refresh` entered already closed calls the resolver **zero** times — the release path, where `settleDisplacement`'s hooks run immediately before `resolveInsertion` | `tests/sortable/{y,xy}.browser.test.ts` — _should call no resolver at all when the controller is already closed_ | I-36 |
| **`xy()` only**: a destroy from the placeholder's anchor rect is followed by **zero** `compareDocumentPosition` calls on the same element. `y()` has no counterpart because it makes no second call | `tests/sortable/xy.browser.test.ts` — _should not compare document position once the anchor read closed the controller_ | I-36 |
| `layoutAnimation()`'s **before** pass: a row's geometry destroys → no further row is measured | `tests/sortable/displacement.browser.test.ts` — _should measure no further row once a before-pass measurement closes the controller_ | I-36 |
| the same → no animation is started for that bracket | `tests/sortable/displacement.browser.test.ts` — _should start no animation once a before-pass measurement closes the controller_ | I-36 |
| `layoutAnimation()`'s **after** pass: a row's geometry destroys → **zero** `animate()` calls, and no further row measured | `tests/sortable/displacement.browser.test.ts` — _should start no animation once an after-pass measurement closes the controller_, _should measure no further row once an after-pass measurement closes the controller_ | I-36 |
| a destroy raised from `animate()` **itself** leaves that animation cancelled — it is not in the feature's map, so `retire()` cannot have seen it | `tests/sortable/displacement.browser.test.ts` — _should cancel an animation whose own start closed the controller_ | I-36, I-20 |
| the after pass **through the real composition**, `lazyY()` + `layoutAnimation()`, destroy armed on the post-move DOM state | `tests/sortable/features.browser.test.ts` — _should start no displacement after an afterMove measurement destroyed_ | I-36 |
| the behavior's own reading between the `beforeMove` pipeline and `movePlaceholder` → the write never happens and nothing is reported | `tests/sortable/features.browser.test.ts` — _should not write the placeholder after a beforeMove hook destroyed_ | I-36 |
| **conformance pin, passes against current source — the bracket-discharge witness** — the `landing()` residue's blast radius, not a barrier: a `landing({ duration })` thunk destroys the controller, and `visual.animate()` is called **exactly once**, counted on the element, with no animation, no transform and no placeholder surviving, nothing reported, and **no** terminal callback. `getAnimations() === []` and `style.transform === ''` are what witness the bracket's **undo**, condition (ii) of I-36 (1) | `tests/sortable/features.browser.test.ts` — _should leave nothing behind when the duration thunk destroys the controller_ | I-36 (1), I-6, F-30 |
| **conformance pin, passes against current source** — the kernel's admitted post-terminal relinquishment: a **middle-tier installer's** runner (D-63 withdrew `landing({ run })`; the fixture supplies `startLanding` through a `SortableInstaller`, which is where a consumer-authored runner lives now) destroys the controller and still returns a handle, and F-30 calls that consumer-authored handle's `destroy` **exactly once**, after `destroy()` returned, with `retarget` never called and nothing surviving. This is what I-6 clause 3's qualified headline admits | `tests/sortable/features.browser.test.ts` — _should destroy a consumer runner's handle exactly once when the runner destroyed the controller_ | I-6, I-20, F-30 |
| **C5-01** — subscription is part of the acquisition: an `animation.finished` **accessor** that destroys and returns normally leaves no live displacement, and neither does an overridden **thenable** `then`. Both are consumer-reachable through an overridden `animate()`, and neither throws, so the acquisition `catch` never saw them | `tests/sortable/displacement.browser.test.ts` — _should cancel an animation whose `finished` accessor closed the controller_, _…whose `finished` thenable closed the controller_ | I-36 (2), I-20 |
| **C5-02** — the placeholder mechanics stop at the destroying write: a consumer placeholder whose first `setAttribute` destroys receives **exactly** `['data-drag-placeholder']`, and a `visual.offsetWidth`/`offsetHeight` getter that destroys leaves **no** write at all — on a custom element and on the default composition alike, because every read is taken before any write | `tests/sortable/placement.browser.test.ts` — _should write no further attribute once a mechanics write closes the controller_, _…no attribute at all once a visual offset read closes the controller_, _…no mechanics to the default placeholder…_ | I-36 (2) |
| **the stretch sweep** — the draft seed: a `visual()` resolver that destroys leaves `item`, `visual` and `snapshot` unwritten on the draft, on the press ingress and on the command ingress, whose destination is the fourth field | `tests/sortable/sortable.browser.test.ts` — _should seed no draft when the visual resolver destroys the controller_, _should seed no command draft when the visual resolver destroys the controller_ | I-36 (2), I-20 |
| **the stretch sweep** — the activation survival conjuncts: `isConnected`/`nextElementSibling` are consumer accessors, and a destroy from either publishes nothing and calls no `onStart` | `tests/sortable/sortable.browser.test.ts` — _should start nothing when a survival conjunct destroys the controller_ | I-36 (2), I-20 |
| **the stretch sweep** — the release frame writes: a `beforeMove` hook that destroys, and an axis that destroys while resolving the release, both leave `draft.proposal` null | `tests/sortable/sortable.browser.test.ts` — _should build no proposal when a displacement hook destroys the controller_, _should build no proposal when the axis destroys the controller while resolving the release_ | I-36 (2), I-20 |
| **the stretch sweep** — the settlement domain: `isReorderResolution` is a duck-type test, so a resolution whose own `type` accessor destroys publishes no `draft.domain` | `tests/sortable/sortable.browser.test.ts` — _should publish no domain when the resolution's own accessor destroys the controller_ | I-36 (2), I-20 |
| **the stretch sweep** — the destination re-anchor: a conjunct accessor that destroys leaves the placeholder where it is, rather than re-inserting a footprint the operation has finished with | `tests/sortable/sortable.browser.test.ts` — _should re-anchor nothing when a re-anchor conjunct destroys the controller_ | I-36 (2) |

Four things these fixtures made concrete:

1. **`layoutAnimation()`'s two passes are indistinguishable through the composition**, because the axis rebuild reads the same rows between them. The pass-specific rows are therefore driven **directly**, with a hand-built `DisplacementView`; the composed row uses `lazyY()` to withhold the eager rebuild so that "post-`movePlaceholder`" is a sound arming condition.
2. **The instrumented rect must be returned _shifted_ in the composed after-pass row.** Teardown removes the placeholder and drops the lift, which puts the row back exactly where the pass measured it — so an honest rect makes `delta === 0`, `animate()` is skipped for a reason unrelated to the barrier, and the assertion stops discriminating. This is the same trap as the call-list rule, one level down.
3. **The `beforeMove` row's observable is the DOM write, not the resulting order.** Teardown detaches the placeholder, so its final position proves nothing; pre-fix the write reached `movePlaceholder` with a detached placeholder and threw `FAILURE_ACTION_EFFECT`, so the discriminating assertion is that **nothing is reported**.
4. **Review 4 recorded three of its readings as uncovered defence in depth. Two of the three now have discriminating fixtures, and finding them is what made C5-02 and four of the sweep's findings visible** (C5-03 §7). The `createPlaceholder` reading was recorded as uncovered because the preparation is discarded whole — but the first consumer-reachable call _inside_ `applyMechanics` discriminates, and once a fixture existed the mechanics turned out to breach the floor six statements deep. The `anchorTarget` and `release.effect` readings were recorded as uncovered because the placeholder is torn down along the same edge — but the discriminating fixture is a **direct drive** with a consumer accessor that destroys, and both turned out to have a second, unguarded stretch behind the landed reading. The lesson is recorded rather than the excuse: _"no discriminating fixture was found"_ is a statement about the fixtures tried, and at a floor-level barrier it should be read as a reason to try a different level rather than as coverage.

Three things the fixtures made concrete that the decision stated abstractly:

1. **`layoutAnimation()` cannot witness "no `afterMove` hook ran".** Its own `retire()` empties the span map, so its `afterMove` is _already_ inert on a destroyed controller and reports no animation whether the barrier exists or not. The rows above use a test-authored displacement feature that records each half of the bracket pipeline instead.
2. **The bracket guard needs an axis feature with no eager `measure`** to be observable at all. With one installed — and both first-party axes install one — `measureInSeam`'s own `!rt.closed` covers the same continuation, so the two guards are redundant and neither can be seen alone. A lazy axis rule is explicitly supported by the contract, and composing one is what isolates the outer guard.
3. **One specified guard is genuinely unfalsifiable** and is recorded below rather than removed.

**Non-regression, unchanged and still passing:** D2's call-exactness rows (_should resolve each candidate visual once per rebuild_, and the warm-cache silence beside it) and D3's collection-channel-after-destroy rows. The latch moved from the controller's closure to `SortableRuntime.closed`; its behavior did not.

---

## The F-6 obligation

> Any fixture installing `landing()` or declaring an authored presentation fails loudly if the corresponding hold is never taken.

Sealing catches a hold taken _late_; nothing structural catches one never taken, because the observable end state is identical — the operation just finalizes sooner. Two mechanisms discharge it:

- `tests/support/gates.ts` — armed by `tests/sortable/react.browser.test.ts`. Fails the `afterEach` if `landing()` is installed and no runner ever started, or if a terminal was delivered while the fixture's own authored commit was still outstanding. Both arms are mutation-verified: suppressing `scope.holdForLanding` fails 10 of 11 tests with the F-6 message. **Two changes since it was written.** D-41 deleted the readiness gate, so the second arm brackets the _consumer's_ commit barrier rather than a library declaration — the failure it catches is unchanged, its owner moved. And D-49 added `faultReported()`, which exempts an operation from the landing arm: a skipped landing starts no runner, and the report is the same signal the consumer gets.
- The recording runners in `tests/sortable/landing-space.browser.test.ts` and `tests/sortable/features.browser.test.ts` assert on what the runner captured, so a runner that never started fails those suites on the recorded value.

## Q-12 — the degraded re-anchor, judged

> A consumer that unmounts or re-keys the dragged item leaves `anchorTarget` with no anchor. The fallback measures the still-connected placeholder where it stands. **The fallback is sufficient and Q-12 is closed in its favour** (Phase 10; status corrected at Checkpoint D review 5, C5-04 — this section previously still read as open and closed with a recommendation).

Fixtures: `tests/sortable/react.browser.test.ts` › _that unmounts the dragged item (Q-12)_.

**The finding: the fallback is sufficient, and the drop is undramatic.** The operation finishes accepted, the placeholder is removed, no failure is classified, nothing is reported on the platform channel, and the controller admits the next press. There is nothing left to strand — the element the pin would have moved is the element the consumer discarded.

Two things the fixtures made concrete that the contract stated abstractly:

1. **A row React merely drops cannot exercise the guard at all.** A removed node is parentless, and `ChildNode.before()` on a parentless node is already a no-op, so guarded and unguarded re-anchoring are indistinguishable. The hazard needs a _disconnected node that still has a parent_ — a recycle pool, a keep-alive cache, a virtualizer's spare list — or a _connected_ node under a different parent, which is a row moved to a second list. Both shapes are now fixtures.
2. **The re-anchor happens at the join, not at arm time.** ~~With readiness pending, `authoredReady` is false and the re-anchor is skipped entirely~~ — D-41 removed the pending state, and under the serial commit the re-anchor runs once, at the join, with the authored DOM already final. The observation that survives is the one that matters to a fixture: a test hoping to discriminate the guard through the provisional landing target measures the wrong moment; the discriminating probe is a `MutationObserver` on the container the consumer moved the row into.

Cancelling the settlement outright — the alternative Q-12 left open — would buy nothing here and would turn a consumer's own unmount into a reported failure. **Q-12 is closed in favour of the fallback as specified**; §[05](../.plan/contract/05-lifecycle-invariants.md) records the landed answer and this section is its evidence, not a pending recommendation.

## Equivalent mutants — guards no test can falsify

Recorded rather than removed, so a later reader does not mistake them for coverage gaps. Each was confirmed by mutation: the source change is behaviour- preserving on every path the suite (or any fixture we could construct) reaches.

| Guard | Why it cannot be falsified |
| --- | --- |
| `item.isConnected` in `anchorTarget`'s destination re-anchor (`src/sortable/spec.ts`) | Strictly implied by the parentage conjunct beside it. A disconnected item either has no parent (blocked, and `before()` would be a no-op anyway) or a different parent (blocked). The only case it alone would catch — item and placeholder in the _same_ detached tree — measures the origin either way. The parentage conjunct **is** falsifiable: _should not re-anchor into a container the consumer moved the row to_. |
| `rt.closed` in `action.prepare(TAG_SPATIAL)` after `resolveInsertion` (`src/sortable/spec.ts`) | Unreachable through any first-party composition. The candidate-loop barrier already makes a destroyed traversal produce `count === 0`, so `nearest === -1` and the axis rule returns `null` — the `resolved === null` disjunct beside it always fires first. It is defence in depth against an axis rule that reaches consumer code by some other route, and is kept deliberately rather than left to be rediscovered as dead code. |
| ~~`settlement !== attempt` in `watchReadiness` **and** in `handleReadinessSettled`~~ | **Retired, not reclassified.** D-41 deleted both functions with the readiness protocol, so the mutant has no subject. Recorded rather than dropped because this table is the register a later reader checks against the source: an entry that silently vanished would look like a guard that was never examined. |

The precedent for _removing_ an unfalsifiable conjunct rather than recording it (Checkpoint B's placeholder parentage/adjacency pair) applies when the conjunct is dead weight in the only shape that reaches it. These two are cheap, and one of them is a second line of defence on a staleness rule — so they stay, named.

## Free drag — new (Phase 19, D-69…D-76)

**The implementation's own verification.** ~~The adversarial rows, the restored stories and the per-lift-mode geometry fixtures under transform and zoom are Phase 20 deliverables and are deliberately absent.~~ **They landed 2026-08-16** and are the three sections below; this one is unchanged, because the distinction is still worth keeping — these rows say the seams are wired, and the Phase 20 rows say what happens when a consumer, a source or a platform misbehaves.

| Row | Test | ID |
| --- | --- | --- |
| a press that crosses the threshold starts the drag, and one that does not starts nothing | `tests/free-drag/free-drag.browser.test.ts` — _should start on a press that crosses the threshold_, _should not start for a press that never crosses the threshold_ | D-69 |
| `onStart` reports the **accumulated grab delta**, and the visual is placed at it rather than at zero | _should report the accumulated grab delta to onStart_, _should place the visual at that delta rather than at zero_ | ledger §6.2 |
| every committed sample writes the visual, and `onMove` fires **after** the write | _should write the visual on every committed sample_, _should notify onMove after the write_ | D-69 |
| the reported rect is derived, never measured | _should derive the visual rect without measuring it_ | D-72 |
| the round-trip opens on release and publishes **exactly one** terminal, for accept, reject, async accept and an invalid resolution | _should open the round-trip on release and publish one terminal_, _should publish a rejected terminal for a rejected drop_, _should await an async acceptance_, _should treat an invalid resolution as an error, never an acceptance_ | D-62, D-66 |
| the request is built from the **committed release sample**, not the last move | _should build the request from the committed release sample_ | F-39 |
| `Escape` cancels with one terminal; a press that never started publishes **none** | _should publish exactly one canceled terminal for an Escape_, _should publish no terminal for a press that never started_ | D-66, Q-15 |
| an axis scalar locks the cross axis; a source is read at activation and on `invalidate()`, never per sample | _should lock the cross axis when a scalar names one_, _should read a source at activation rather than per sample_, _should re-read the source on invalidate()_ | D-71 |
| an unknown `axis` string is **silent**: a normal, successful, unconstrained drag | _should complete a normal unconstrained drag for an unknown axis string_ | 07 §Validation |
| `bounds()` clamps to the viewport, to an element and to a thunk, re-resolves after `invalidate()`, and leaves a `null` source unconstrained | _should clamp the delta to the source rect_, _should contain the visual inside an element source_, _should re-resolve a thunk source after invalidate()_, _should leave the drag unconstrained when the source returns null_ | D-70 |
| `moveTo()` places the visual at a viewport point and **re-bases**, so later pointer motion continues relative to it and the release request opens from it | _should place the visual at the requested viewport point_, _should re-base, so later pointer motion continues relative to it_, _should open the release request from the re-based position_ | D-71, L-4 |
| `destroy()` tears down with **no** terminal — D-66's _live controller_ qualifier — while `cancel()` publishes one | _should tear down an in-flight drag on destroy, with no terminal_, _should publish one canceled terminal for cancel() mid-drag_ | D-36, D-66 |
| a landing still publishes exactly one terminal | _should still publish exactly one terminal with a landing installed_ | D-63 |
| construction throws **nothing** for any config the compiler accepts, garbage spread into the first argument | _should throw nothing for any config the compiler accepts_ | B-4 (a), D-77 |
| a later fragment cannot clear the required slot, through the public entry | _should not let a later fragment clear the required slot_ | B-9 (c) |
| two installers claiming the motion constraint is the one construction-time throw | _should refuse two installers claiming the motion constraint_ | D-77 |
| the two behaviors reach **no** module of each other, in both directions | `tests/packaging.node.test.ts` — _should keep the two behaviors out of each other_ | B-1 |
| an unconstrained free drag carries no clamp and no rect resolver | `tests/packaging.node.test.ts` — _should keep an unconstrained free drag out of the clamp_ | B-2 |
| both landing entries reach the **same** internal runner and neither reaches the other behavior | `tests/packaging.node.test.ts` — _should share the landing runner between the two behaviors_ | F-64, B-7 |
| the four new entries' runtime surface, by value | `tests/exports.node.test.ts`, `tests/consumer.node.test.ts` | B-3 |

## Free drag — validation (Phase 20, B-4)

**Two tables, asserted differently, and the split is the criterion.** A value in 07 §Validation's _classified_ table surfaces at a named seam with that row's coarse code; a value in the _silent_ table produces **no `onError`, no terminal and no classification at all**. Asserting the second the way one asserts the first is how a deleted check gets quietly re-added.

Every code is read from `STAGE_TO_CODE` through `toDraggableError(stage, null).code`, never retyped, so a remap fails these rows instead of passing them.

| Row | Test | ID |
| --- | --- | --- |
| construction throws **nothing** for any config the compiler accepts | `tests/free-drag/free-drag.browser.test.ts` — _should throw nothing for any config the compiler accepts_ | B-4 (a) |
| a throwing `handle` is a **consumer** fault, and publishes no terminal because no operation was minted | `tests/free-drag/validation.browser.test.ts` — _should classify a throwing handle resolver as a consumer fault_, _should publish no terminal for a fault that lands before any operation is minted_ | B-4 (b), D-66, F-75 |
| a throwing `visual` is classified at **admission**, not at activation as the table says | _should classify a throwing visual resolver at admission, not at activation_ | F-76 |
| a throwing `onStart` is an **interaction** fault with exactly one terminal | _should classify a throwing onStart as an interaction fault with one terminal_ | B-4 (b) |
| a throwing `onMove` is a **presentation** fault with exactly one terminal | _should classify a throwing onMove as a presentation fault with one terminal_ | B-4 (b) |
| a throwing `home` runs on the **quality track**: reported, landing skipped, drop still standing | _should classify a throwing home on the quality track and leave the drop standing_ | B-4 (b), D-49 |
| a throwing `onEnd` is a **consumer** fault | _should classify a throwing onEnd as a consumer fault_ | B-4 (b) |
| a non-function `onDrop` reaches the designed `SeamRejection` rather than a construction throw | _should classify a non-function onDrop as a consumer fault with one terminal_ | B-4 (b), D-77 |
| a throwing `onError` leaves through the **un-classified** channel and nothing recurses | _should send a throwing onError to the platform channel rather than classifying it_ | 07 §Validation |
| a garbage `bounds` source surfaces at **all four** seams it can reach, with the two codes they map to | _should surface at activation as an interaction fault on its first resolve_, _should surface from a committed sample as a presentation fault_, _should surface from a moveTo effect as a presentation fault_, _should surface from the release as an interaction fault_ | D-81, F-71, F-73 |
| and **never** from the action that marks the rect stale — `FAILURE_ACTION_PREPARE` is unreachable from the row | _should never surface from the action that marks it stale_ | D-81 |
| each bounds path publishes one terminal, or **none** when it fails before `onStart` | _should publish exactly one terminal for each path that reaches one_ | D-66, F-75 |
| a `NaN` `threshold` starts **no operation**: no report, no terminal, nothing on the platform channel | _should start no operation at all for a NaN threshold_ | B-4 (c), Q-15 |
| an unknown `axis` string completes a normal **unconstrained** drag | `tests/free-drag/free-drag.browser.test.ts` — _should complete a normal unconstrained drag for an unknown axis string_ | B-4 (c) |
| an unknown `lift` string completes a normal drag | `tests/free-drag/validation.browser.test.ts` — _should complete a normal drag for an unknown lift string_ | B-4 (c), D-73 |
| a landing `duration` of `Infinity` is refused, and the **committed rejected verdict** survives the refusal | `tests/free-drag/validation.browser.test.ts` — _should refuse Infinity and let the committed rejected verdict survive it_ | B-4 (d), D-24, D-79, E-07 |
| `NaN`, `-1`, `-Infinity` and `'fast'` are left to `animate()` and arrive at the same stage | _should leave a NaN duration to the platform_, _should leave a negative duration to the platform_, _should leave a -Infinity duration to the platform_, _should leave a string duration to the platform_ | B-4 (e), D-79 |
| `'auto'` lands normally, which is what pins the guard to `=== Infinity` rather than to a finiteness test | _should land normally for the auto duration_ | B-4 (e), D-79 |

## Free drag — lifecycle (Phase 20, L-1…L-4)

**Two of these rows need a middle-tier installer to be falsifiable at all** (D-81, F-74). With the first-party `bounds()` the L-3 barrier stands between one consumer call and a flag write, so a `bounds()`-based fixture passes whether or not the barrier exists; and `LandingContext.from` is the only place that answers _where the landing opened_. Both fixtures are authored out of line against `free-drag/feature.js`, which is B-6 exercised rather than merely typed.

| Row | Test | ID |
| --- | --- | --- |
| the visual is **restored before** the terminal, and an idle controller retains nothing | `tests/free-drag/lifecycle.browser.test.ts` — _should be restored before the terminal is published_, _should retain nothing from a completed drag_ | L-1, I-20 |
| nothing reacts to document motion after the operation terminated, and the next press still drags | _should ignore document motion once the operation has terminated_, _should admit a second drag after the first completed_ | L-1 |
| `pointercancel` disarms a pending press with **no** terminal, and does not disable the next one | _should be disarmed by pointercancel with no terminal_, _should be disarmed without disabling the next press_ | L-1, Q-15 |
| a late acceptance is ignored after `cancel()` — which already published — and after `destroy()`, which publishes none | _should be ignored after cancel(), which already published its terminal_, _should be ignored after destroy(), which publishes none_ | L-1, L-2, D-36 |
| the `TAG_POLICY` barrier: an `axis` source that destroys its own controller does **not** reach a third-party `invalidate()` | _should not reach a third-party invalidate() when the axis source destroys the controller_ | L-3, I-36, F-47 |
| the positive control — a source that leaves the controller alive **does** reach it | _should reach it when the axis source leaves the controller alive_ | L-3 |
| the recorded **non**-discriminating control, so a `bounds()`-based fixture is not mistaken for coverage | _should be non-discriminating with the first-party bounds()_ | F-74 |
| the landing opens from the **constrained** delta: under an axis lock, under a clamp, and after a `moveTo()` | _should open from the axis-locked delta rather than the pointer_, _should open from the clamped delta under a bounds constraint_, _should open from the re-based delta after a moveTo()_ | L-4, D-35 |
| and from the **release point** rather than the last processed move — reported and rendered | _should open from the release point rather than the last processed move_, _should render the release point, not only report it_ | L-4, F-39, D-81 |
| the middle tier accepts a function literal authored outside the package, carries **no discriminator**, and does not reach the settlement scope | `tests/free-drag/feature.declaration.test.ts` — _should accept a function literal authored outside the package_, _should carry no discriminator_, _should not reach the settlement scope_ | B-6, D-61 |
| a free-drag consumer compiles against the **packed** declarations, with the terminal switch exhaustive and `never` on the fall-through | `tests/consumer.node.test.ts` — _should compile a consumer against the packed declarations_ | B-5 |
| the two shared declarations are published from **one module each**, which is identity rather than shape | `tests/packaging.node.test.ts` — _should publish the two shared declarations from one module each_ | B-7, F-64 |

## Lift geometry — the box, not the transform (Phase 20, L-5)

**Phase 11's lesson, made executable.** A lift-mode regression passed 644 tests because none of them compared the lifted visual's **on-screen box** to what it should be; it was caught by driving a demo. These rows are that comparison, and `src/free-drag.stories.tsx` is the demo restored beside them.

| Row | Test | ID |
| --- | --- | --- |
| `faithful` keeps the stage geometry and travels by the **viewport** delta, under a transform and under zoom | `tests/free-drag/geometry.browser.test.ts` — _should keep the stage geometry and travel by the viewport delta under a transform_, _should keep the stage geometry and travel by the viewport delta under zoom_ | L-5, D-73 |
| `flat` drops the ancestor transform and the inherited zoom, keeping its natural size | _should drop the ancestor transform and keep its natural size_, _should drop the inherited zoom and keep its natural size_ | L-5 |
| `in-place` keeps the authored transform and **still** travels by the viewport delta — the row a projection bug fails | _should keep the authored transform and still travel by the viewport delta_, _should keep the authored transform and still travel by the viewport delta under zoom_ | L-5, D-72 |
| `localDelta` is the viewport delta in the stage's own space, and is the delta itself when the ancestry is untransformed | _should report the local delta in the stage space under a transform_, _should report the viewport delta itself when the ancestry is untransformed_ | D-72 |
| the reported rect is derived from the origin rect even under a transform | _should derive the current rect from the origin rect under a transform_ | D-72 |
| the **sortable's** lifted row occupies the placeholder's box at activation, under a transform and under zoom | `tests/sortable/lift-geometry.browser.test.ts` — _should occupy the placeholder box at activation under an ancestor transform_, _should occupy the placeholder box at activation under zoom_ | L-5, Phase 11 |
| and travels by the viewport delta in both, reporting nothing on the platform channel | _should travel by the viewport delta under an ancestor transform_, _should travel by the viewport delta under zoom_, _should report nothing through the platform channel while doing it_ | L-5 |

## Checkpoint E remediation (2026-08-16, D-85…D-87 and E-02/E-03/E-05)

**Six blockers, and the rows are grouped by what each one changes rather than by which file they landed in.** Three needed a decision and three were implementation fixes under contracts that already said what to do — and both kinds are asserted the same way here, because a rule that already existed and was not implemented is not better covered than a new one.

**Every permanent regression below was falsified against the pre-fix tree**, which is the only thing that distinguishes a fix from a fixture that agrees with whatever is there. The D-85 rows are the sharpest: the pre-fix implementation reports `localDelta { x: 10, y: 7.5 }` where the corrected one reports `{ x: 20, y: 15 }`.

| Row | Test | ID |
| --- | --- | --- |
| the reported local delta comes from the **pre-lift** measurement when the ancestry changes during activation, under a transform and under zoom | `tests/free-drag/activation-snapshot.browser.test.ts` — _should come from the pre-lift measurement when the ancestry changes during activation_, _should come from the pre-lift measurement under zoom as well_ | E-01, D-85 |
| and for an in-place lift, and for a **lifted** mode — where the session's own projection is `null`, so reusing it would report the identity silently | _should come from the pre-lift measurement for an in-place lift_, _should be reported for a lifted mode, where the session projection is null_ | D-85 |
| the release request is built in the same space, so a fix applied to the movement path alone would leave `onDrop` disagreeing with the `onMove` before it | _should report the release delta in the same space_ | D-85 |
| an **unreadable** space is still `FAILURE_ACTIVATION` rather than the identity — the split failure policy is what the single read removes | _should still fail activation rather than resolving to the identity_ | D-85 |
| no behavior module reaches box-quad or carries a box index of its own | `tests/packaging.node.test.ts` — _should keep the geometry package out of every behavior_ | D-85 |
| free drag publishes **no start** when a `bounds` source destroys the controller, and still does when it does not | `tests/free-drag/lifecycle.browser.test.ts` — _should publish no start when a bounds source destroys the controller_, _should still publish a start when the same source leaves the controller alive_ | E-02, I-36 |
| the sortable publishes **no start** when an insertion invalidator destroys the controller, and still does when it does not | `tests/sortable/activation-barrier.browser.test.ts` — _should publish no start when an insertion invalidator destroys the controller_, _should still publish a start when the invalidator leaves the controller alive_ | E-02, I-36 |
| an admission resolver that destroys and **then** throws reaches no `onError`; one that only throws still does | `tests/free-drag/lifecycle.browser.test.ts` — _should reach no onError from admission_, _should still report when it throws without destroying_ | E-03, I-31, D-53 |
| and the **quality** route the same way: a `home` resolver that destroys and then throws reaches no `onError` and no terminal | `tests/free-drag/validation.browser.test.ts` — _should reach no onError when the resolver destroys and then throws_ | E-03, D-49 |
| a late `moveTo()` from `onEnd` leaves **no inline transform** — the one path that writes through an already-disposed lift | `tests/free-drag/actions.browser.test.ts` — _should leave no inline transform when it comes from onEnd_ | E-04, D-86 |
| and from `onDrop` and from a landing runner, neither of which moves the visual — **both held open across the queue drain**, so the reading is a fact about the action rather than about the settlement's timing | _should not move the visual when it comes from onDrop_, _should not move the visual when it comes from a landing runner_ | D-86 |
| a `moveTo()` from `onStart` **does** retarget — the positive control that stops the fix being written as _refuse everything late_ | _should retarget when it comes from onStart_ | D-86 |
| a late action is a **no-op, not a rejection**: no `onError`, one terminal, nothing on the platform channel | _should publish no failure for the late calls it discards_ | D-86 |
| a late `invalidate()` re-enters neither the `axis` source nor a third-party `constrain.invalidate()`, and both are re-entered while the operation is live | _should re-enter neither the axis source nor a third-party constraint_, _should still re-enter both while the operation is active_ | D-86 |
| an installed landing completes undisturbed by a queued late position write | _should complete undisturbed by a late position write_ | D-86 |
| the **sortable's** late collection `invalidate()` in the same phases still works — the row a kernel-side fix would have broken | `tests/sortable/activation-barrier.browser.test.ts` — _should still reach the axis rule while the sortable is settling_ | D-86 |
| an invalid `home` result is attributed to its own quality seam: `null`, non-finite, and a throwing accessor | `tests/free-drag/validation.browser.test.ts` — _should attribute a null result to the landing target seam_, _should attribute a non-finite result to the same seam_, _should attribute a result with a throwing accessor to the same seam_ | E-05, D-49 |
| the drop still ends **once** despite the invalid target, and a finite result still travels | _should end the operation once despite the invalid target_, _should accept a finite result and travel to it_ | E-05, D-49 |
| cross-behavior installers do not compile in **either** direction, `AxisInstaller → FreeDragInstaller` named explicitly | `tests/composition.declaration.test.ts` — _should not be assignable to a free-drag installer_ (twice), _should not be assignable to a sortable installer_, _should not be assignable to an axis installer_ | E-06, D-87 |
| an installer returning `{}` **stays** assignable to both, and the exclusions are the capability facts rather than a general boundary | _should stay assignable to both behaviors_, _should exclude the other behavior capabilities by name_ | D-87, D-88 |
| `FeatureContext` is still one declaration across the two middle tiers | _should stay one declaration across the two middle tiers_ | D-87, F-64, B-7 |
| the free-drag entry's documentation closes over its **own** tier and the ones below it — the isolated run B-3 asks for and free drag did not have, gated on the **exit code** under `--treatWarningsAsErrors` and on the emitted artifact's module list rather than on captured stdout | `tests/docs.node.test.ts` — _should close the free-drag tier over the ordinary tier and the ones below it_ | E-08, B-3, D-78 |

## The second Checkpoint E audit (2026-08-16, D-88…D-91 and CE1-05…CE1-09)

**The first row is the one to read**: D-87's mechanism was recorded as sufficient and was not, and the suite that was supposed to evidence it could not see the gap — every row started from an annotated installer **alias**, which is the one form the two exclusions already caught. What escaped was the unannotated hoisted literal D-78 says an ordinary author writes, refused not by the exclusions but by TypeScript's weak-type check, which `retire` defeats. So the new rows drive real literals through `freeDrag`'s public `plugins`, and **every one carries `retire`** — without it the row passes for a mechanism other than the one under test.

**D-88 and D-91 were falsified against the pre-fix tree.** Removing the three exclusions turns the escaped-form rows into unused `@ts-expect-error` directives; removing the finiteness check fails the two `moveTo` rows. D-89 needed its fixture rebuilt before it discriminated at all — see the row's own note.

| Row | Test | ID |
| --- | --- | --- |
| both contribution records declare the **same key set**, so a slot added without its twin fails at the moment it is added | `tests/composition.declaration.test.ts` — _should declare the same key set_ | D-88, CE1-01 |
| free drag excludes four capabilities by name and the sortable one — the boundary is asymmetric because the slot sets are | _should exclude the other behavior capabilities by name_ | D-88 |
| an **unannotated** installer carrying `placeholder`, `beforeInsertionMove` or `afterInsertionMove` plus `retire` does not reach free drag's public `plugins` | _should not reach free drag plugins carrying a placeholder_, _should not reach free drag plugins carrying a beforeInsertionMove hook_, _should not reach free drag plugins carrying an afterInsertionMove hook_ | D-88, CE1-01 |
| and one carrying only the genuinely shared slots still does — the control that keeps the exclusions from being read as a general separation | _should still reach free drag plugins carrying only shared slots_ | D-88 |
| the accepted anchor calls **no constraint** between the release write and the join, with the resolver held pending so the join is isolated | `tests/free-drag/anchor.browser.test.ts` — _should call no constraint between the release write and the join_ | D-89, CE1-02 |
| the `home` arms still answer from the committed geometry, under a clamp and unconfigured — **the accepted arm's own value has no public observable**, which the file records rather than works around | _should leave the home anchor at the clamped delta_, _should leave the unconfigured home anchor at the grab position_ | D-89 |
| each of the constraint's four call sites is driven **alone** and hands its member no receiver, so binding any one site fails one row — the fixture records the `this` it is given instead of ignoring it, which is what the reverted row could not do | _should hand the apply site no receiver_, _should hand the scroll invalidator no receiver_, _should hand the policy invalidator no receiver_, _should hand the retire hook no receiver_ | D-90, CE1-03 |
| the constraint retires at both retirement points, and the first-party `bounds()` is the recorded non-discriminating control | _should retire detached as well_, _should leave the first-party bounds() working through the same sites_ | D-90, F-74 |
| a non-finite `moveTo()` writes nothing into committed frame state and surfaces on the platform channel | _should write nothing into the committed frame_, _should surface the misuse on the platform channel_ | D-91, CE1-04 |
| the operation completes normally afterwards, and a finite point still retargets — the two controls that make the discard a decision rather than a refusal | _should let the operation complete normally_, _should still retarget for a finite point_ | D-91 |
| a **malformed** point still reaches `FAILURE_ACTION_PREPARE`, which keeps the check from being read as general argument validation | _should classify a malformed point rather than discarding it_ | D-91 |
| the **sortable's** throwing `visual` resolver is a `consumer` fault at admission, with no terminal owed | `tests/sortable/sortable.browser.test.ts` — _should classify a throwing visual resolver as a consumer fault_ | CE1-07, D-84 |

## The calling convention's second tier (2026-08-18, D-92)

The sortable's half of the convention D-90 stated for free drag. `tests/sortable/calling-convention.browser.test.ts` throughout.

**The rows assert the receiver is never the record the installer returned, not that it is `undefined`.** Measured rather than assumed: the four lifted members disagree on what `this` _is_ — `resolve` and `invalidate` are called off the behavior's flat slot record and receive it, while `measure` is read into a local and `retire` is pushed into `retireHooks`, so both receive `undefined`. Free drag's rows can assert `undefined` because every one of its members is lifted into a local; porting that assertion here would fail the conforming tree at two sites and would pin the flattening's shape instead of the obligation.

| Row | Test | ID |
| --- | --- | --- |
| each of the four lifted members is driven **alone** and is never handed the installer's own record, so re-binding a single lift in `assemble` fails a single row | _should hand the resolve site a foreign receiver_, _should hand the invalidate site a foreign receiver_, _should hand the optional measure site a foreign receiver_, _should hand the retire site a foreign receiver_ | D-92 |
| the aggregate the recorded falsifier is stated against — all four lifts re-bound must not leave the suite green | _should never hand any site the installer record_ | D-92 |
| the first-party axis rules still work through the same lifted sites — **recorded as non-discriminating controls, not as evidence**, since both close over their state and pass under the reversion that fails every row above | _should leave y() working through the same lifted sites_, _should leave xy() working through the same lifted sites_ | D-92, F-74 |