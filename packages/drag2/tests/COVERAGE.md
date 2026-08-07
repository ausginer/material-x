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

## Readiness

| Row | Test | ID |
| --- | --- | --- |
| consumer accepts but the acknowledgement is delayed | `tests/sortable/composition.browser.test.ts` — _should hold settlement open for a declared authored presentation_ | I-9 |
| landing before React | `tests/kernel/kernel.browser.test.ts` — _should not finalize in the resolution drain while readiness is held_ | I-9 |
| React before landing | `tests/kernel/kernel.browser.test.ts` — _should re-anchor and retarget when readiness settles first_ | F-16 |
| both immediate | `tests/kernel/kernel.browser.test.ts` — _should finalize in the resolution drain when neither gate is held_ | I-9 |
| stale acknowledgement from an older operation | `tests/sortable/composition.browser.test.ts` — _should ignore an acknowledgement that arrives after a newer operation began_ | F-25, I-35 |
| the acknowledgement never arrives and the timeout applies | `tests/kernel/kernel.browser.test.ts` — _should replace the settlement when readiness times out_; `tests/sortable/landing-space.browser.test.ts` — _should apply the configured bound rather than the default_ | I-9 |
| **acknowledged from a real `useLayoutEffect()` fixture** | `tests/sortable/react.browser.test.ts` — _should resolve readiness from a real layout effect_, _should not finalize before React has committed_ | I-9, I-25 |

## Authored-presentation acknowledgement — new (D-33)

Implemented in Phase 15. Everything consumer-facing is driven through the public entrypoint in `tests/sortable/acknowledgement.browser.test.ts`, because both halves of the protocol are public; only the row that needs a seam to throw on demand lives in `tests/kernel`.

**What most of these rows actually pin.** A gate released twice is invisible in the final DOM — the drop still completes and the order is still right. What it destroys is the hold count, so the fixtures keep a **second** gate outstanding (a landing runner that never completes) and assert that nothing finalized. The platform report is asserted alongside, never instead: a kernel that swallowed duplicates silently would pass every state assertion on its own.

| Row | Test | ID |
| --- | --- | --- |
| a resolution declaring no presentation holds no gate and is final from sealing | `tests/sortable/acknowledgement.browser.test.ts` — _should hold no readiness gate and finalize in the resolution drain_ | I-35 |
| `accept({ presentation: true })` holds the gate and `ready(request)` releases it | `tests/sortable/acknowledgement.browser.test.ts` — _should hold the settlement open until it is acknowledged_ | I-9, D-33 |
| the release sets `authoredReady`, so the join re-anchors per the recovery | `tests/sortable/acknowledgement.browser.test.ts` — _should re-anchor to the authored destination once acknowledged_ | F-16 |
| **a synchronous commit** — acknowledged from inside `onReorder`, before the settlement exists | `tests/sortable/acknowledgement.browser.test.ts` — _should acknowledge from inside onReorder, before the settlement exists_ | C-01 |
| the early latch is **dispatched**, so a readiness-only settlement does not finalize inside its own arm step | `tests/sortable/acknowledgement.browser.test.ts` — _should not finalize inside its own arm step_ | F-21 |
| a duplicate in the **early** window is inert and reported | `tests/sortable/acknowledgement.browser.test.ts` — _should be inert and reported in the early window_ | C4-04 |
| a duplicate **after the hold settled** releases nothing, moves no count, and reports | `tests/sortable/acknowledgement.browser.test.ts` — _should be inert and reported after the hold has settled_ | C4-04 |
| that duplicate is classified a **duplicate, never a contradiction** — the row order is normative | `tests/sortable/acknowledgement.browser.test.ts` — _should be reported as a duplicate rather than as a contradiction_ | C5-02 |
| **the cross-window case**: latched early, then re-entrantly during arm from the runner's `start` — one dispatch, one release, one duplicate report | `tests/sortable/acknowledgement.browser.test.ts` — _should be inert and reported across the early-to-armed boundary_ | C5-02 |
| a `ready()` for a request the operation never issued is ignored and reported | `tests/sortable/acknowledgement.browser.test.ts` — _should be ignored and reported for a fabricated request_ | I-35 |
| **a structurally identical copy is rejected** — the check is `===`, which typecheck cannot pin | `tests/sortable/acknowledgement.browser.test.ts` — _should reject a structurally identical copy of the live request_ | I-35 |
| `retire()` clears the publication, so the same request is rejected afterwards | `tests/sortable/acknowledgement.browser.test.ts` — _should reject the same request again once the operation retired_ | I-35 |
| a matching request whose resolution declared **no** presentation is reported as contradictory and dropped | `tests/sortable/acknowledgement.browser.test.ts` — _should be reported as contradictory when it arrives at SETTLING_ | C2-01 |
| the same contradiction reached **early** is reported and discarded at seal | `tests/sortable/acknowledgement.browser.test.ts` — _should be reported and discarded at seal when it arrives early_ | C3-01 |
| that discard is scoped to a **successful** seal: a throwing `settlement.effect` kills the latch silently | `tests/kernel/kernel.browser.test.ts` — _should not report a contradictory early latch when the seam failed_ | F-27 |
| **the stale case end to end**: A times out and retires, B is admitted, A's late effect fires | `tests/sortable/composition.browser.test.ts` — _should ignore an acknowledgement that arrives after a newer operation began_ | I-35 |
| an acknowledgement at `IDLE` is ignored and reported | `tests/sortable/acknowledgement.browser.test.ts` — _should be ignored and reported at IDLE_ | I-35 |
| an acknowledgement at `PENDING` and at `ACTIVE` is ignored and reported | `tests/sortable/acknowledgement.browser.test.ts` — _should be ignored and reported at PENDING and at ACTIVE_ | I-35 |
| an acknowledgement after `destroy()` is inert at both validation points | `tests/sortable/acknowledgement.browser.test.ts` — _should be inert after destroy()_ | I-6 |
| the deadline classifies `FAILURE_PRESENTATION_READY`, keeps presentation owned, calls `onError` only | `tests/sortable/acknowledgement.browser.test.ts` — _should classify the deadline when it is never acknowledged_ | I-9 |
| **there is no third readiness outcome** — no `abandon()` on the public surface | `tests/sortable/acknowledgement.browser.test.ts` — _should expose exactly four controller members_ | C-02 |
| a resolution that declares nothing and renders asynchronously anyway is **not** detected | tier C; discharged by the F-6 witness obligation below | C2-01 |
| **the React fixture stores the request, not a library object** | `tests/sortable/react.browser.test.ts` — the whole suite; `createCommitTracker` is gone from both the fixture and `src/sortable.stories.tsx` | 13b B-1 |

### Removed with the pre-revision protocol

Four rows in `tests/kernel/kernel.browser.test.ts` tested `presentationReady`'s **value** channel — a rejecting promise, a hostile `then` accessor, a non-thenable value, and the arm-time skip a synchronously-failing gate caused. `holdForReadiness()` takes no value under D-33, so there is nothing left to be hostile: the channel does not exist rather than being untested. Recorded here because a shrinking test count with no note reads like coverage loss.

The rejection channel itself is a **deliberate narrowing**, not an oversight: what is lost against `presentationReady` is latency only, and `readinessTimeout` is a public option (contract 02 §three outcomes). The smallest addition, if it turns out to matter, is a second argument to `ready()` carrying an error.

---

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
| a command gap invalidated by an `updateItems()` queued from inside the listener is rebased or cancels — **no command-specific revalidation** | `tests/sortable/keyboard.browser.test.ts` — _should enqueue an updateItems() rather than drain it_ | I-1, D-32 |
| command admission is refused whenever an operation is already live, at `PENDING`, `ACTIVE` and `SETTLING` | `tests/sortable/keyboard.browser.test.ts` — the _a command against a live operation_ group | C4-07 |
| a `pointerdown` from inside `command.admit`, and a `keydown` from inside `admit`, are both refused by the shared latch | `tests/sortable/keyboard.browser.test.ts` — _should refuse a press dispatched from inside the command listener_, _…from inside the press listener_ | D-32 |
| a throwing `command.admit` reaches `reportFailure(FAILURE_ADMISSION)` with no operation and leaves the controller usable | `tests/kernel/kernel.browser.test.ts` — _should report a throwing command.admit with no operation_ | Q-1 |
| `destroy()` releases every ingress listener, discrete ones included | `tests/kernel/kernel.browser.test.ts` — _should release the discrete listeners on destroy_; `tests/sortable/keyboard.browser.test.ts` — _should release every ingress listener on destroy_ | D-29 |
| `arm()` rejects an empty, non-string, duplicate or `pointerdown`-colliding `command.types` | `tests/kernel/kernel.browser.test.ts` — _should reject an invalid command.types at arm_ | D-32 |
| `Escape` cancels a command exactly as it cancels a press | `tests/sortable/keyboard.browser.test.ts` — _should be cancelled by Escape exactly as a press is_ | D-32 |
| `ArrowLeft` ≡ `ArrowUp` and `ArrowRight` ≡ `ArrowDown` — keyboard is not axis-specific | `tests/sortable/keyboard.browser.test.ts` — _should treat ArrowLeft as ArrowUp and ArrowRight as ArrowDown_ | L-4 |
| `handle()` gates the keyboard path too | `tests/sortable/keyboard.browser.test.ts` — _should gate the keyboard path through handle()_ | L-4 |
| the keyboard path resolves the item — and therefore the consumer's `handle()` — **exactly once** per keydown, admitted or declined | `tests/sortable/keyboard.browser.test.ts` — _should resolve the handle exactly once per admitted keydown_, _…for a declined keydown_, _…the same number of times as a press does_ | D1 |
| an admission resolver that queues `updateItems()` queues it **once** per keydown | `tests/sortable/keyboard.browser.test.ts` — _should queue an admission-resolver updateItems() exactly once per keydown_ | D1, D-25 |

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
| update during settlement | `tests/sortable/react.browser.test.ts` — the fixture dispatches `updateItems` from every layout effect, including the commit that resolves readiness | I-12, D-25 |
| `updateItems()` after `destroy()` is a no-op for a **valid** replacement | `tests/sortable/sortable.browser.test.ts` — _should stay inert for a valid replacement_ | D3 |
| `updateItems()` after `destroy()` is a no-op for an **invalid** one, and does not throw | `tests/sortable/sortable.browser.test.ts` — _should not throw for an invalid replacement_ | D3 |
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
| `onStart` calls `updateItems()` → applied at `ACTIVATING` | `tests/sortable/sortable.browser.test.ts` — _should apply an update from inside onStart at ACTIVATING_ | F-32 |

## Failure continuation — new

| Row | Test | ID |
| --- | --- | --- |
| `activation.prepare` throws → one `onError`, retirement after failure handling | `tests/kernel/kernel.browser.test.ts` — _should not retire a failed activation_ | F-27 |
| `release.effect` throws → `onReorder` never invoked | `tests/kernel/seams.node.test.ts` — _should never invoke the consumer after a failed release effect_ | F-34 |
| join target or write failure → presentation releases, no `onFinish`, one `onError` | `tests/kernel/kernel.browser.test.ts` — _should release presentation and skip the pin when the measurement throws_ | F-22 |
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

## The F-6 obligation

> Any fixture installing `landing()` or declaring an authored presentation fails loudly if the corresponding hold is never taken.

Sealing catches a hold taken _late_; nothing structural catches one never taken, because the observable end state is identical — the operation just finalizes sooner. Two mechanisms discharge it:

- `tests/support/gates.ts` — armed by `tests/sortable/react.browser.test.ts`. Fails the `afterEach` if a terminal callback was delivered with a declared authored presentation still unacknowledged, or if `landing()` is installed and no runner ever started. Both arms are mutation-verified: suppressing `scope.holdForLanding` fails 10 of 11 tests with the F-6 message.
- The recording runners in `tests/sortable/landing-space.browser.test.ts` and `tests/sortable/features.browser.test.ts` assert on what the runner captured, so a runner that never started fails those suites on the recorded value.

## Q-12 — the degraded re-anchor, judged

> A consumer that unmounts or re-keys the dragged item leaves `anchorTarget` with no anchor. The fallback measures the still-connected placeholder where it stands. **What stays open is whether the fallback is good enough.**

Fixtures: `tests/sortable/react.browser.test.ts` › _that unmounts the dragged item (Q-12)_.

**The finding: the fallback is sufficient, and the drop is undramatic.** The operation finishes accepted, the placeholder is removed, no failure is classified, nothing is reported on the platform channel, and the controller admits the next press. There is nothing left to strand — the element the pin would have moved is the element the consumer discarded.

Two things the fixtures made concrete that the contract stated abstractly:

1. **A row React merely drops cannot exercise the guard at all.** A removed node is parentless, and `ChildNode.before()` on a parentless node is already a no-op, so guarded and unguarded re-anchoring are indistinguishable. The hazard needs a _disconnected node that still has a parent_ — a recycle pool, a keep-alive cache, a virtualizer's spare list — or a _connected_ node under a different parent, which is a row moved to a second list. Both shapes are now fixtures.
2. **The re-anchor happens at the join, not at arm time.** With readiness pending, `authoredReady` is false and the re-anchor is skipped entirely, so the guard is unreachable until the gate settles. Any test hoping to discriminate it through the provisional landing target measures the wrong moment; the discriminating probe is a `MutationObserver` on the container the consumer moved the row into.

Cancelling the settlement outright — the alternative Q-12 left open — would buy nothing here and would turn a consumer's own unmount into a reported failure. **Recommendation: close Q-12 in favour of the fallback as specified.**

## Equivalent mutants — guards no test can falsify

Recorded rather than removed, so a later reader does not mistake them for coverage gaps. Each was confirmed by mutation: the source change is behaviour- preserving on every path the suite (or any fixture we could construct) reaches.

| Guard | Why it cannot be falsified |
| --- | --- |
| `item.isConnected` in `anchorTarget`'s destination re-anchor (`src/sortable/spec.ts`) | Strictly implied by the parentage conjunct beside it. A disconnected item either has no parent (blocked, and `before()` would be a no-op anyway) or a different parent (blocked). The only case it alone would catch — item and placeholder in the _same_ detached tree — measures the origin either way. The parentage conjunct **is** falsifiable: _should not re-anchor into a container the consumer moved the row to_. |
| `settlement !== attempt` in `watchReadiness` **and** in `handleReadinessSettled` (`src/kernel/kernel.ts`) | Two nested identity checks plus the `readinessHeld` flag and the `SETTLING` phase test. Every route that makes an attempt stale also clears `readinessHeld` or leaves the phase, so removing either identity check individually changes nothing. Defense in depth, deliberately kept. |

The precedent for _removing_ an unfalsifiable conjunct rather than recording it (Checkpoint B's placeholder parentage/adjacency pair) applies when the conjunct is dead weight in the only shape that reaches it. These two are cheap, and one of them is a second line of defence on a staleness rule — so they stay, named.