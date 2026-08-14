# Test matrix coverage

Every row of [05 §Test matrix](../.plan/contract/05-lifecycle-invariants.md) against the file that closes it and the invariant it is about. Phase 10's _done when_ is this table: **every row maps to a passing test or to a written, justified exclusion.**

Paths are relative to `packages/drag2`. Where a row is closed by several tests the entry names the one that would fail first.

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
| a pointer `admit` returning `null` likewise, and one returning an element has the default prevented **by the kernel** | `tests/kernel/kernel.browser.test.ts` — _should prevent the default for a press only when it is admitted_ | C-03 |
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
| `handle()` gates the keyboard path too | `tests/sortable/keyboard.browser.test.ts` — _should gate the keyboard path through handle()_ | L-4 |
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
| **axis exclusivity with two real axes**, in either order | `tests/sortable/assemble.browser.test.ts` — _should refuse two real axis features, not only a feature and its copy_ | D-19 |
| the rejected axis feature's private state is cleaned, in either order | `tests/sortable/assemble.browser.test.ts` — _should retire the rejected real axis feature, in either order_ | F-19 |
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
| update during settlement | `tests/sortable/react.browser.test.ts` — the fixture signals `invalidate()` from every layout effect, including the commit that resolves readiness | I-12, D-25 |
| `invalidate()` after `destroy()` is a no-op for a **valid** replacement | `tests/sortable/sortable.browser.test.ts` — _should stay inert for a valid replacement_ | D3 |
| `invalidate()` after `destroy()` is a no-op for an **invalid** one, and does not throw | `tests/sortable/sortable.browser.test.ts` — _should not throw for an invalid replacement_ | D3 |
| a post-`destroy()` replacement queued from a callback is not classified as an activation failure | `tests/sortable/sortable.browser.test.ts` — _should not classify a post-destroy replacement as an activation failure_ | D3, I-6 |

## Styling and animation

| Row | Test | ID |
| --- | --- | --- |
| no-animation default | `tests/sortable/composition.browser.test.ts` — the minimal composition installs neither `landing()` nor `layoutAnimation()` | 03 §composition |
| CSS layout transition | `tests/sortable/composition.browser.test.ts` — _should propose the same gap when the rows carry a CSS transition_ | D-7 |
| long landing duration | `tests/sortable/features.browser.test.ts` — _should hold settlement open until the animation finishes_ | I-9 |
| custom animation runner | `tests/sortable/features.browser.test.ts` — _should let a custom runner replace the default entirely_ | I-24 |
| the default landing timing is the retained shipped `{ duration: 200, easing: 'ease' }` | `tests/sortable/features.browser.test.ts` — _should default the easing to the retained shipped value_, _…the duration…_ | D6, ledger §7 |
| a `duration` thunk is resolved and validated **once per landing, before** the reduced-motion collapse | `tests/sortable/features.browser.test.ts` — _should read a duration thunk under a reduced-motion preference too_; _should classify an invalid thunk result under a reduced-motion preference_ | D4, L-6 |
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
| no `landing()` but a declared authored presentation still holds one gate | `tests/sortable/composition.browser.test.ts` — _should hold settlement open for a declared authored presentation_ | I-9 |
| neither gate held finalizes in the resolution drain | `tests/kernel/kernel.browser.test.ts` — _should finalize in the resolution drain when neither gate is held_ | I-9 |
| a duplicate `holdForReadiness` is ignored and reported | `tests/kernel/kernel.browser.test.ts` — _should ignore and report a duplicate hold_ | F-6 |
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
| `done()` followed by a throw | `tests/kernel/kernel.browser.test.ts` — _should retain a synchronously completed handle for the join_ | F-30 |
| `start` itself throws | `tests/kernel/kernel.browser.test.ts` — _should roll the hold back and classify when start throws_ | F-27 |
| `start` calls `destroy()` and returns a live handle | `tests/kernel/kernel.browser.test.ts` — _should destroy a handle returned by a start that destroyed the controller_ | F-30 |
| `settlement.effect` requests a hold then throws | `tests/kernel/kernel.browser.test.ts` — _should arm nothing when the effect throws after requesting a hold_ | F-27 |
| a returned handle whose `destroy()` throws | `tests/kernel/kernel.browser.test.ts` — _should report a throwing runner destroy and still pin_ | F-22 |
| the final `lift.write` throws | `tests/kernel/kernel.browser.test.ts` — _should release presentation and skip the callback when the pin throws_ | F-22 |
| `spec.finalized` throws | `tests/kernel/kernel.browser.test.ts` — _should retire after a throwing terminal callback_ | F-22 |

## Collection staging — new

| Row | Test | ID |
| --- | --- | --- |
| a reentrant `cancel()` during `action.prepare(COLLECTION)` leaves `rt.snapshot` unchanged | `tests/sortable/sortable.browser.test.ts` — _should publish and then cancel when the gap cannot survive_ | F-19, F-28 |
| a discarded collection action is not observable by a later queued action | `tests/sortable/sortable.browser.test.ts` — _should give two updates queued in one drain distinct versions_ | D-25 |
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
| join **write** failure → presentation releases, no terminal, one `onError` | `tests/kernel/kernel.browser.test.ts` — _should release presentation and skip the callback when the pin throws_ | F-22 |
| join **measurement** failure → presentation releases, **one `onError` and one terminal** | `tests/kernel/kernel.browser.test.ts` — _should skip the landing and still terminate when the measurement throws_ | D-49, D-60 |
| `finalized` throws → `FAILURE_TERMINAL_CALLBACK`, still retires | `tests/kernel/kernel.browser.test.ts` — _should retire after a throwing terminal callback_ | F-22 |
| an admission resolver calls `destroy()` → no operation is minted | `tests/kernel/kernel.browser.test.ts` — _should not mint an operation when admit destroyed the controller_ | F-30 |

## Settlement mapping — new

| Row | Test | ID |
| --- | --- | --- |
| a skipped resolution → `OUTCOME_NOOP`, immediate recovery, `onFinish` | `tests/sortable/sortable.browser.test.ts` — _should skip the round-trip for a proven no-op_ | F-29, F-37 |
| a rejected resolution _promise_ → `FAILURE_REORDER_RESOLUTION` | `tests/sortable/sortable.browser.test.ts` — _should classify a rejected round-trip promise_ | F-20 |
| a fulfilled non-resolution → `FAILURE_REORDER_RESOLUTION` | `tests/sortable/sortable.browser.test.ts` — _should classify a fulfilled non-resolution_ | F-20 |
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
| a failure checkpoint produces immediate recovery and no `finalized` call | `tests/sortable/sortable.browser.test.ts` — _should hold no landing gate for an immediate recovery_ | F-27 |
| a no-op settlement calls `onFinish`, never `onCancel` | `tests/sortable/composition.browser.test.ts` — _should finish a drop that never left its own gap as a no-op_ | F-37 |
| a rejected `ReorderResolution` value calls `onCancel` with a reason | `tests/sortable/composition.browser.test.ts` — _should cancel a rejected reorder_ | F-33 |
| a rejected resolution _promise_ is `FAILURE_REORDER_RESOLUTION`, not `onCancel` | `tests/sortable/sortable.browser.test.ts` — _should classify a rejected round-trip promise_ | F-20 |
| public results narrow without an internal constant, carrying version/from/to/neighbours | `tests/consumer.node.test.ts` — the packed-consumer fixture narrows on `type` alone | F-41, D-31 |

## Explicit failure latching — new

| Row | Test | ID |
| --- | --- | --- |
| each seam calls `host.fail` and returns normally → no success continuation | `tests/kernel/seams.node.test.ts` — _should treat host.fail in prepare as a prepare failure_, _should not run the effect after a latched prepare failure_, _should never invoke the consumer after a latched release failure_, _should not dispatch the checkpoint on a latched effect failure_ | F-34 |
| arm-time `anchorTarget` throws → the settlement never finalizes | `tests/kernel/kernel.browser.test.ts` — _should classify an arm-time anchorTarget failure and never start_ | F-35 |
| `LandingStart` calls `fail()` synchronously and returns a live handle | `tests/kernel/kernel.browser.test.ts` — _should destroy the handle and refuse to finalize after a synchronous fail()_ | F-30 |
| `fail()` then `done()`, and `done()` then `fail()` | `tests/kernel/kernel.browser.test.ts` — _should let the first completion win_ | I-24 |
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
| a consequential failure still publishes no terminal | `tests/sortable/sortable.browser.test.ts` — _should publish no terminal for a consequential failure_ | D-23 |
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
| `layoutAnimation()`'s **after** pass: a row's geometry destroys → **zero** `animate()` calls, and no further row measured | `tests/sortable/displacement.browser.test.ts` — _should start no animation once an after-pass measurement closes the controller_, _should measure no further row…_ | I-36 |
| a destroy raised from `animate()` **itself** leaves that animation cancelled — it is not in the feature's map, so `retire()` cannot have seen it | `tests/sortable/displacement.browser.test.ts` — _should cancel an animation whose own start closed the controller_ | I-36, I-20 |
| the after pass **through the real composition**, `lazyY()` + `layoutAnimation()`, destroy armed on the post-move DOM state | `tests/sortable/features.browser.test.ts` — _should start no displacement after an afterMove measurement destroyed_ | I-36 |
| the behavior's own reading between the `beforeMove` pipeline and `movePlaceholder` → the write never happens and nothing is reported | `tests/sortable/features.browser.test.ts` — _should not write the placeholder after a beforeMove hook destroyed_ | I-36 |
| **conformance pin, passes against current source — the bracket-discharge witness** — the `landing()` residue's blast radius, not a barrier: a `landing({ duration })` thunk destroys the controller, and `visual.animate()` is called **exactly once**, counted on the element, with no animation, no transform and no placeholder surviving, nothing reported, and **no** terminal callback. `getAnimations() === []` and `style.transform === ''` are what witness the bracket's **undo**, condition (ii) of I-36 (1) | `tests/sortable/features.browser.test.ts` — _should leave nothing behind when the duration thunk destroys the controller_ | I-36 (1), I-6, F-30 |
| **conformance pin, passes against current source** — the kernel's admitted post-terminal relinquishment: a `landing({ run })` runner destroys the controller and still returns a handle, and F-30 calls that consumer-authored handle's `destroy` **exactly once**, after `destroy()` returned, with `retarget` never called and nothing surviving. This is what I-6 clause 3's qualified headline admits | `tests/sortable/features.browser.test.ts` — _should destroy a consumer runner's handle exactly once when the runner destroyed the controller_ | I-6, I-20, F-30 |
| **C5-01** — subscription is part of the acquisition: an `animation.finished` **accessor** that destroys and returns normally leaves no live displacement, and neither does an overridden **thenable** `then`. Both are consumer-reachable through an overridden `animate()`, and neither throws, so the acquisition `catch` never saw them | `tests/sortable/displacement.browser.test.ts` — _should cancel an animation whose `finished` accessor closed the controller_, _…whose `finished` thenable closed the controller_ | I-36 (2), I-20 |
| **C5-02** — the placeholder mechanics stop at the destroying write: a consumer placeholder whose first `setAttribute` destroys receives **exactly** `['data-drag-placeholder']`, and a `visual.offsetWidth`/`offsetHeight` getter that destroys leaves **no** write at all — on a custom element and on the default composition alike, because every read is taken before any write | `tests/sortable/placement.browser.test.ts` — _should write no further attribute once a mechanics write closes the controller_, _…no attribute at all once a visual offset read closes the controller_, _…no mechanics to the default placeholder…_ | I-36 (2) |
| **the stretch sweep** (C5-03 §7) — `placeholder()`'s own class write: a `create` factory that destroys leaves **no** class on the element it returned, which is the consumer's and is adopted by nothing | `tests/sortable/features.browser.test.ts` — _should add no class once the factory destroys the controller_ | I-36 (2) |
| **the stretch sweep** — the draft seed: a `visual()` resolver that destroys leaves `item`, `visual` and `snapshot` unwritten on the draft, on the press ingress and on the command ingress, whose destination is the fourth field | `tests/sortable/sortable.browser.test.ts` — _should seed no draft…_, _should seed no command draft…_ | I-36 (2), I-20 |
| **the stretch sweep** — the activation survival conjuncts: `isConnected`/`nextElementSibling` are consumer accessors, and a destroy from either publishes nothing and calls no `onStart` | `tests/sortable/sortable.browser.test.ts` — _should start nothing when a survival conjunct destroys the controller_ | I-36 (2), I-20 |
| **the stretch sweep** — the release frame writes: a `beforeMove` hook that destroys, and an axis that destroys while resolving the release, both leave `draft.proposal` null | `tests/sortable/sortable.browser.test.ts` — _should build no proposal when a displacement hook destroys…_, _…when the axis destroys…_ | I-36 (2), I-20 |
| **the stretch sweep** — the release request publication: `lift.write` composes onto `visual.style`, an accessor a custom element may define, so a destroy from the render leaves `rt.pendingRequest` null | `tests/sortable/sortable.browser.test.ts` — _should publish no request when the release render destroys the controller_ | I-36 (2), I-20 |
| **the stretch sweep** — the settlement domain: `isReorderResolution` is a duck-type test, so a resolution whose own `type` accessor destroys publishes no `draft.domain` | `tests/sortable/sortable.browser.test.ts` — _should publish no domain when the resolution's own accessor destroys the controller_ | I-36 (2), I-20 |
| **the stretch sweep** — the destination re-anchor: a conjunct accessor that destroys leaves the placeholder where it is, rather than re-inserting a footprint the operation has finished with | `tests/sortable/sortable.browser.test.ts` — _should re-anchor nothing when a re-anchor conjunct destroys the controller_ | I-36 (2) |

Four things these fixtures made concrete:

1. **`layoutAnimation()`'s two passes are indistinguishable through the composition**, because the axis rebuild reads the same rows between them. The pass-specific rows are therefore driven **directly**, with a hand-built `DisplacementView`; the composed row uses `lazyY()` to withhold the eager rebuild so that "post-`movePlaceholder`" is a sound arming condition.
2. **The instrumented rect must be returned _shifted_ in the composed after-pass row.** Teardown removes the placeholder and drops the lift, which puts the row back exactly where the pass measured it — so an honest rect makes `delta === 0`, `animate()` is skipped for a reason unrelated to the barrier, and the assertion stops discriminating. This is the same trap as the call-list rule, one level down.
3. **The `beforeMove` row's observable is the DOM write, not the resulting order.** Teardown detaches the placeholder, so its final position proves nothing; pre-fix the write reached `movePlaceholder` with a detached placeholder and threw `FAILURE_PLACEHOLDER_MOVE`, so the discriminating assertion is that **nothing is reported**.
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

- `tests/support/gates.ts` — armed by `tests/sortable/react.browser.test.ts`. Fails the `afterEach` if a terminal callback was delivered with a declared authored presentation still unacknowledged, or if `landing()` is installed and no runner ever started. Both arms are mutation-verified: suppressing `scope.holdForLanding` fails 10 of 11 tests with the F-6 message.
- The recording runners in `tests/sortable/landing-space.browser.test.ts` and `tests/sortable/features.browser.test.ts` assert on what the runner captured, so a runner that never started fails those suites on the recorded value.

## Q-12 — the degraded re-anchor, judged

> A consumer that unmounts or re-keys the dragged item leaves `anchorTarget` with no anchor. The fallback measures the still-connected placeholder where it stands. **The fallback is sufficient and Q-12 is closed in its favour** (Phase 10; status corrected at Checkpoint D review 5, C5-04 — this section previously still read as open and closed with a recommendation).

Fixtures: `tests/sortable/react.browser.test.ts` › _that unmounts the dragged item (Q-12)_.

**The finding: the fallback is sufficient, and the drop is undramatic.** The operation finishes accepted, the placeholder is removed, no failure is classified, nothing is reported on the platform channel, and the controller admits the next press. There is nothing left to strand — the element the pin would have moved is the element the consumer discarded.

Two things the fixtures made concrete that the contract stated abstractly:

1. **A row React merely drops cannot exercise the guard at all.** A removed node is parentless, and `ChildNode.before()` on a parentless node is already a no-op, so guarded and unguarded re-anchoring are indistinguishable. The hazard needs a _disconnected node that still has a parent_ — a recycle pool, a keep-alive cache, a virtualizer's spare list — or a _connected_ node under a different parent, which is a row moved to a second list. Both shapes are now fixtures.
2. **The re-anchor happens at the join, not at arm time.** With readiness pending, `authoredReady` is false and the re-anchor is skipped entirely, so the guard is unreachable until the gate settles. Any test hoping to discriminate it through the provisional landing target measures the wrong moment; the discriminating probe is a `MutationObserver` on the container the consumer moved the row into.

Cancelling the settlement outright — the alternative Q-12 left open — would buy nothing here and would turn a consumer's own unmount into a reported failure. **Q-12 is closed in favour of the fallback as specified**; §[05](../.plan/contract/05-lifecycle-invariants.md) records the landed answer and this section is its evidence, not a pending recommendation.

## Equivalent mutants — guards no test can falsify

Recorded rather than removed, so a later reader does not mistake them for coverage gaps. Each was confirmed by mutation: the source change is behaviour- preserving on every path the suite (or any fixture we could construct) reaches.

| Guard | Why it cannot be falsified |
| --- | --- |
| `item.isConnected` in `anchorTarget`'s destination re-anchor (`src/sortable/spec.ts`) | Strictly implied by the parentage conjunct beside it. A disconnected item either has no parent (blocked, and `before()` would be a no-op anyway) or a different parent (blocked). The only case it alone would catch — item and placeholder in the _same_ detached tree — measures the origin either way. The parentage conjunct **is** falsifiable: _should not re-anchor into a container the consumer moved the row to_. |
| `rt.closed` in `action.prepare(TAG_SPATIAL)` after `resolveInsertion` (`src/sortable/spec.ts`) | Unreachable through any first-party composition. The candidate-loop barrier already makes a destroyed traversal produce `count === 0`, so `nearest === -1` and the axis rule returns `null` — the `resolved === null` disjunct beside it always fires first. It is defence in depth against an axis rule that reaches consumer code by some other route, and is kept deliberately rather than left to be rediscovered as dead code. |
| `settlement !== attempt` in `watchReadiness` **and** in `handleReadinessSettled` (`src/kernel/kernel.ts`) | Two nested identity checks plus the `readinessHeld` flag and the `SETTLING` phase test. Every route that makes an attempt stale also clears `readinessHeld` or leaves the phase, so removing either identity check individually changes nothing. Defense in depth, deliberately kept. |

The precedent for _removing_ an unfalsifiable conjunct rather than recording it (Checkpoint B's placeholder parentage/adjacency pair) applies when the conjunct is dead weight in the only shape that reaches it. These two are cheap, and one of them is a second line of defence on a staleness rule — so they stay, named.