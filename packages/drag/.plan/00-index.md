# `@ydinjs/drag` record: decisions

The register for scope `drag`, under `repo:RD-1`: decisions are `DRD-n`, invariants `DRI-n`, owner decisions `DRO-n`. Numbering starts at 1. drag2's bare `D-` series is separate. To read one entry:

```sh
awk -v re="^#### DRD-1( —|$)" \
  '$0 ~ re {f=1;print;next} f && /^#{1,4} /{exit} f' \
  packages/drag/.plan/00-index.md
```

**Input:** the prototype read at `26f82fbb1`. That commit is on no ref now. Its `packages/drag` tree is byte-identical to `599684791` on `drag/prototype`, so later citations use `599684791`. Evidence: [`prototype-report.md`](prototype-report.md), [`probes/prototype/`](probes/prototype/README.md), [`probes/final-design/`](probes/final-design/README.md). The comparison and earlier evidence are in [`architecture-plan.md`](architecture-plan.md).

**Status, 2026-11-07:** production was built at `d7e7b0d3a` on `drag/production` and reviewed twice at that commit: a [review round](reviews/production/production-summary.md) and an [architecture challenge](reviews/architecture/production-design-challenge.md). `DRD-14` to `DRD-23` decide every finding and question from both. Where they change an earlier decision, its status row names the amendment. The required behavior is in [`contract.md`](contract.md). The [remediation](remediation-report.md) implemented them at `b91db2818`, and no independent review has read it yet. The owner's composition refactor at `3084191bb` and the implementer's findings on it are decided by `DRD-24` and `DRD-25`. `DRD-24` was revised to the owner's ownership model, and its [prototype](probes/session-owner/README.md) met it at `b54832a0e`. The owner approved its cost in `DRO-6`, and the [composition unit](composition-report.md) adopted it at `276947f82` and fixed the built-ins at `2506dcbb6`. The owner then split the kernel into modules at `bb644d6d7`, whose typecheck fails. `DRD-26` to `DRD-28` decide the ownership and lifecycle questions that the split exposed, and [`ownership-handoff.md`](ownership-handoff.md) implements them. The owner then required that the kernel know no lift, and `DRD-27` was revised on `6d5ba89e7`'s text before any of it was implemented. Their costs are `DRO-7`. The [ownership unit](ownership-report.md) implemented `DRD-26` to `DRD-28` at `039e8e153`, `433a0e06c` and `89995c27e`, and reported at `ff69cb8d7`. The architect read it at that commit: the three items conform, and its two instrument findings go to [`instrument-repair-handoff.md`](instrument-repair-handoff.md) (§Disposition of the ownership report). A third instrument finding is open as `DRF-1`. The combined review follows the instrument repair.

**Neither the prototype's approval nor the 2026-11-06 reading established a performance result.** `DRD-13` and `DRD-22` say what does.

## Decisions

#### DRD-1 — Single-pass control

**One `Session` record, with idle as its absence. `#running` refuses a nested pass, and one reader applies requests between steps, with precedence destroy, deferred steps, decision, next step.**

Foreign code runs synchronously inside DOM writes, and the independent model's commit order failed there (architecture plan §3). The prototype held this through the public API in three engines, in 10 scenarios. One decision slot replaces three because the first of cancel, fault and verdict always wins. FIFO between kinds of request is rejected. The two booleans `concluded` and `released` are accepted: nothing reads them as a phase, and the implementer may remove them.

#### DRD-2 — One public authoring API

**`draggable` is public, and `sortable` and `freeDrag` use only its public values and types. A behavior never receives the session. Extension is by whole behavior. No third-party `axis` or plugin seam is published.**

Owner requirement, with possible Readymag use. The prototype showed no private kernel path was needed, and `Drag` has no reference to the session. Its additions are accepted: `command`, `handle` with `data-drag-ignore`, `settle` returning timing, `panel.use`, and `onEnd` carrying `request`. An axis seam stays out because no example wanted one, and adding it later breaks nothing. `createFrameTask`, `listenForInvalidation` and the landing policy stay private (CONTRIBUTING §4), because a behavior can write each in a few lines. A kernel frame hook is rejected for the same reason: every composition would pay for it.

#### DRD-3 — Faults through `reportError`

**`onError` is removed. Every report is one `DragFault`, sent through the library realm's `reportError` when caught, with `cause` by identity. The decision slot is filled before the report.**

Owner requirement. Eight hostile values and both listener cases passed in three engines. The fault's message keeps the original's text, because `event.message` omits `cause`. How each engine's DevTools prints `cause` is still unobserved, and that can change only the message wording. No step or root field is added.

#### DRD-4 — The lift is an imported value

**`lift` replaces `lift: false`. With no `lift` key, the bundle has no `presentation` or `box-quad` code from the kernel. `startLanding` and the lift's view fields belong to the lift module, and their types appear only when `lift` is composed.**

`presentation` and `box-quad` are 4,389 of `draggable`'s 10,119 minified bytes, and a no-lift behavior never runs them (report §Size). A boolean can't be shaken, so the prototype's design violates CONTRIBUTING §7. A value also fixes the report's type defect, where `rect` was non-null but unset. **Cost:** one more export and one more import for a lifted custom behavior. `draggable` alone should fall to about 5.7 KB minified, **estimated**.

#### DRD-5 — `box-quad` is the one coordinate model

**Behaviors with and without the lift use `Space`, `Box` and a new `localDelta` from `@ydinjs/box-quad`. `InheritedSpace` and the canvas example's size ratio are removed. A no-lift behavior imports `box-quad` itself and pays only for what it uses. Recorded in that package as `box-quad:BQ-10`.**

Owner requirement. Both linear parts sit in the same four slots, so one pure function serves both. A throwaway function with this signature gave zero error across rotate, scale, skew, zoom, own rotate and resize, in three engines ([results](probes/final-design/results.json.txt)). The one miss was the element's own `zoom`, which a `Space` excludes by definition, and DRI-16 states it. The kernel does not read a basis for a no-lift behavior: which element and which basis are the behavior's knowledge, and a resize handle in an untransformed page should not pay for an ancestor walk.

#### DRD-6 — `requestStep` replaces `run`, `requestApply` and `apply`

**One request runs behavior code in a pass: at once when idle of a pass, between steps otherwise. The step receives the `Drag` only while the operation is active and undecided, and `null` otherwise. Hooks also get `drag.requestStep` and `drag.requestCancel`.**

This resolves four difficulties in the report. `run` was refused silently inside a pass. `requestApply` needed a holding variable outside the drag. Both built-ins wrote the same `released` flag. Hooks named a controller declared after them, the source of the 8 `no-use-before-define` errors. It also fixes the `moveTo` defect, where a write behind a cancel moved the visual and the landing's start.

**This is a short list, and it does not bring back the queue.** It holds only steps, on one precedence level, and is empty on the hot path. Destruction and the decision remain slots, nothing is tagged or reordered, and no pointer sample enters it. **I withdraw the plan's "the kernel grows a queue" stop condition for this one list.** The condition's concern, a second reader or FIFO across kinds, still holds as a stop condition. Identity coalescing keeps change 5, where two `invalidate()` calls pull once. A cancel followed by `invalidate()` no longer pulls first, which removes the report's one visible FIFO difference.

The rule that an author must not write directly from foreign code stays a documented rule. Nothing can detect a violation.

#### DRD-7 — A disposer receives the outcome

**`drag.use` disposers receive the `Outcome`, or `null` on destruction. A late `use`, on an operation or a controller, runs at once.**

Rollback had to live in `use` because `end` doesn't run on destruction, and `use` couldn't see the outcome, so the canvas example needed a flag set in `settle`. With the argument, one disposer states the rollback. **This answers open question 5: destruction with no `end` stays,** and the cost it showed is removed.

#### DRD-8 — The click guard outlives destruction

**DRI-11 wins over "all listeners are gone" in DRI-10. The guard stays until it expires, holds no reference to the item or controller, and also expires at the next primary press.**

The defect ran: destroying with the button held delivered the trailing click in all three engines ([results](probes/final-design/results.json.txt)). A stray click is a user-visible effect, and a guard bounded by one gesture runs no consumer code. The new press expiry keeps "no later click is swallowed" when a release never reaches the window. It costs one more listener in the guard.

#### DRD-9 — The kernel keeps focus through an operation

**DRI-12. Implemented in the kernel and the lift, so every behavior gets it with no code. Not on destruction. It never takes focus from an element focused since the drop.**

The probe showed focus goes to `body` after keyboard and pointer reorders in all three engines, and `insertBefore`, which the API encourages, causes it. A second arrow press then does nothing, so keyboard reordering fails unless a consumer repairs it. The lift also moved focus to an `autofocus` descendant in all three engines. **This narrows the "no focus management" boundary in `accessibility.md`** for the new package: the consumer still owns `tabindex`, roles and announcements. Restoring in the consumer would leave a defect in the documented example.

#### DRD-10 — Landing elevation by animation

**The flight animates `z-index` and, for a static item, `position`, in a separate replacing animation. Presentation is still released before the landing and terminal. Reduced motion moves into the lift, so it covers every behavior.**

Results, in three engines: with elevation the item stayed on top of `relative` and `z-index: 5` siblings, and left no inline style. **One additive animation is rejected:** in WebKit, adding to the item's own `z-index: 5` wrapped it to `-2147483648` and the item went under.

**Holding the top layer for the flight is rejected, and `drag:DRO-2` keeps it open as the alternative.** It would fix clipping as well. But a consumer's `insertBefore` already closes the popover in all three engines, so an accepted reorder would have to reopen it, firing `toggle` after `onEnd`. The placeholder and inline styles would also outlive the terminal, while a consumer is most likely to re-render.

**Found by reading, not run:** the prototype's `#startLanding` honors reduced motion only for a behavior that composes `landing()`. A custom behavior's landing ignores it, so the check moves into the lift.

#### DRD-11 — Pull at admission and activation

**`sortable` pulls `items()` at each admission and each activation. `activate` may return `false` to decline quietly.**

The activation pull closes the window between the press and the threshold without a pending flag, since a step before activation now receives `null`. A removed item isn't a fault, so the operation ends with no report. The press cost remains, and `drag:DRO-1` asks the owner to review it with a clean measurement.

#### DRD-12 — The prototype's other results

- **Lint debt:** production passes lint. `then.call` and `composedPath` suppressions need a stated reason.
- **Copied-module vocabulary:** corrected in production under the technical English guide.
- **Example shapes:** the examples stay assumed shapes and become test fixtures. A named Readymag flow is new input and not an open decision.

#### DRD-13 — Completion means correctness, before/after performance and integration

**The handoff's checks are the acceptance. drag2 stays in the tree as reference evidence and is the "before" arm. The deferred integration cleanup is part of completion, and retiring baseline B comes before the new package exports anything. The `prototype/` directory is deleted at completion.**

Earlier cost figures are from other sessions, and two runs of one script differed by about 240 µs on one row, so they can't state a result. Only a same-session comparison with a noise control can. Retirement comes first because a built `@ydinjs/drag` would be measured silently under baseline B's name. Keeping drag2 means the "if drag2 is removed first" exit in `deferred-integration.md` no longer applies.

#### DRD-14 — The lift owns what it writes, until release

**From activation to release the lift owns the visual's inline declarations of every property it writes, and release restores them exactly, including over a write anyone else made during the lift. A commit to one of those properties is made after release, in `end` (built-ins: `onEnd`). A commit the lift does not own may be made in the verdict: DOM order, attributes, classes, custom properties, another element or a model.**

Decides `drag/architecture:challenge-1`. The README's free-drag example commits `translate` in `onDrop`, and release then puts back the value from before the drag, so an accepted drag ends at home in all three engines. `sortable` is unaffected: its commit is DOM order, which the lift doesn't own. `end` runs after release in the decision's task (DRI-9), so a commit there shows no frame at home, which probe `P7c` confirms.

**Rejected: keep a write made during the lift.** A value comparison at release cannot tell a consumer's `top: 0px` from the lift's own `top: 0px`, so a drag to the top edge would lose its commit. Detecting writes as they happen allocates per sample (DRI-17). **Rejected for now: a stylesheet layer** that leaves inline declarations untouched. It would need a sheet in every document and shadow root the visual can live in, which is a redesign of the lift and outside a bounded remediation. It is the route if framework-owned inline styles on a lifted visual become a requirement.

**Cost:** `freeDrag` consumers commit in `onEnd`, and a framework must not write those properties to a lifted visual. The README names the properties.

#### DRD-15 — The landing starts before focus, and focus returns after `end`

**DRI-9's tail becomes: release, then the landing starts, then `end` runs as the next step, and focus is restored when `end` returns or throws, inside that step. An operation without `start` restores right after release. This amends the place `DRD-9` gave the restore, and not its rule.**

Decides `drag/architecture:challenge-5` and `drag/production:reviewer-7`, and gives `reviewer-6`'s missing witness an order to pin.

- **`end` is a hook a behavior may reorder in.** Restoring before it left focus on `body` after a reorder there, in all three engines, so a second arrow press did nothing.
- **The layout:** the recorded trace gives 7 layouts per landed cycle when the landing starts before the focus call, and 7 when a consumer refocuses in `onEnd`, against 8 now. Both before arms read 7. **This is expected, not measured, until the remediation's validation runs.**
- **A destruction applied before the terminal still removes `end` and the restore together (DRI-10).** A destruction requested inside `end` applies after that step, so the restore has run.
- **No `try` is needed around the landing for focus's sake.** The restore no longer follows it in the same block.

#### DRD-16 — Requests through a `Drag` are scoped to its operation

**`drag.requestStep` and `drag.requestCancel` act only while their operation is the controller's current operation. Afterwards both do nothing. The controller's `requestStep` keeps DRI-8 unchanged. A late `use` disposer receives the operation's outcome, and `null` only when destruction released that operation.**

Decides `drag/production:reviewer-1`. The report's choice 4 let a step requested through a retained `Drag` receive a later operation's `Drag`, in three engines. **No tag is needed:** steps drain before the pass that requested them ends, and a new operation opens only as the first step of a new pass, so a step requested while its operation is current can't run under a later one. **`DRD-6`'s stop condition stands:** the list still holds untagged functions.

**Doing nothing was chosen over passing `null`.** A deferred `null` would need a tag per entry. Cleanup after an operation belongs in `use`, which still runs late.

The disposer rule decides the challenge's unprobed hypothesis that a concluded operation's late disposer receives `null` once its controller is destroyed. `Outcome | null` documents `null` as destruction, so any other `null` is a wrong published value.

#### DRD-17 — Input ownership

**The kernel's pointer and `Escape` listening during an operation can't be hidden by a consumer, a press never activates without the button that admitted it, and one event drives at most one operation.**

- **Listening.** The operation's pointer stream and `Escape` are read on the window in the capture phase, so a `stopPropagation` in the page doesn't hide them. The click guard already listens there.
- **Button held.** A pending press reads `buttons` on each sample, and a sample without the admitting button ends the press quietly. A primary press arriving while a press is still pending ends the pending one quietly and is admitted itself. Decides `drag/architecture:challenge-2`. A missed `pointerup` left a press that a hover activated with no button held, and every later press was refused, in all three engines. A release outside the window, with no capture yet, has the same effect, so the `buttons` check is needed even with capture-phase listening.
- **Nested roots.** An event that one controller admitted, by `admit` or `command`, is offered to no other controller. Bubbling reaches the inner root first, so the innermost admitting root wins, and an outer root still admits a press its inner roots declined, such as on a column header. This holds within one copy of the library. Decides `drag/architecture:challenge-3`, where one pointer lifted a card and its column and reordered neither. `data-drag-ignore` is unchanged and is no longer needed for nesting.
- **`Escape`.** An `Escape` that decides an operation that reached `start` has its default prevented, so the platform's close request doesn't also close the dialog or popover that holds the list. The event still propagates. Decides `drag/architecture:challenge-4`. Probe `P3c` shows that preventing the key's default keeps the container open in all three engines. drag2 let the key through, and the contract lists the difference.
- **Native drag is the consumer's.** A natively draggable item or handle, such as a link or an image, needs `draggable="false"`, beside `touch-action` and `user-select`. Decides `drag/architecture:challenge-7`. The library writes no consumer attribute, and preventing `dragstart` would remove a native drag that a consumer might want elsewhere on the same element.
- **The development refusal counter stays scoped** to refusals by a running pass. The new tests witness a missed release directly.
- **Accepted, no change:** a key pressed during a pending keyboard verdict isn't admitted, so its default runs. Activation by time, such as a long press, is not supported. `DRO-3` names where that matters.

#### DRD-18 — Activation

- **The kernel declines quietly for an item disconnected at activation, for every behavior:** no `activate`, `start`, `end` or report. The report's choice 1 is accepted. A lift can't measure a disconnected element, and a behavior without one has nothing to drag. DRI-3 states it.
- **`sortable` pulls `items()` at activation for a command too, and computes the command's target from that pull.** An item missing from that pull, or a move that is no longer possible, declines quietly. Decides `drag/production:reviewer-2`. Foreign code runs between a command's admission and its activation, because the lift opens a popover, and a stale snapshot reported a fault where a pointer declined. One more `items()` call per key press is accepted. The `pointerId !== -1` special case goes with it (`cleanup-3`).
- **A grab during a landing keeps the visual under the pointer.** Activation measures the visual with the flight's current offset, then cancels the flight before the first lifted frame. Decides `drag/architecture:challenge-6`, where the visual sat up to about 80 px from the grab point. The landing is still cancelled by the next activation (DRI-13). A different item's landing is cancelled as before and snaps to its slot, which is not under the pointer.

#### DRD-19 — Free drag measures its offset against home at the drop

**`freeDrag`'s request gives `localDelta*` as the offset from home to the drop position, in the visual's local units. Home is `config.home()`, read once at the drop, or the activation rect when no `home` is given. A home landing uses `home()` at `settle`, as now. `onMove`'s geometry stays pointer travel.**

Decides `drag/architecture:challenge-8`. A scroll during the drag moved the home, and the committed element landed away from the drop by the scroll distance, in all three engines. A rejected landing after such a scroll also starts that far from the drop.

**Rejected: measuring the home inside the library.** The lifted visual has no slot to measure. An ancestor's rect or scroll offset is wrong for a `position: fixed` panel, which a page scroll doesn't move, and for an element whose containing block is outside the scroller. Those are common free-drag subjects. The consumer knows its own scroller. **The limit is documented:** without `home`, the offset is exact only when nothing moved the home during the drag.

#### DRD-20 — The built-ins are internal classes

**Owner requirement, for readability. `sortable()` and `freeDrag()` stay the public factories with unchanged signatures. Each builds one module-private instance, which is the behavior passed to `draggable`, and returns a separate controller object. The single-pass kernel is unchanged.**

**Binding and lifetime:**

- **Hooks need no binding.** The kernel reads each hook from the behavior when it calls it, and calls it as a method of the behavior object. The contract now states this, so it holds for a consumer's class too.
- **Every function passed somewhere that doesn't call it with the instance as `this` has a stable identity.** That covers steps, frame and invalidation callbacks, disposers and controller methods. Each is created once per instance, or once per operation when it closes over the operation, and never per sample, request or call. Coalescing in DRI-8 is by identity, so a step such as `invalidate`'s must be the same function on every request. No `bind` at a call site.
- **Operation values live in the operation's `state`, never in instance fields.** The instance holds controller-lifetime values only: the configuration, the axis and displacement runtimes, the landing timing, the collection version, and scratch buffers rewritten before every read. No instance field holds a `Drag`, an item or an operation's state, so a stale callback can't reach a later operation through the instance.
- **After destruction nothing the library registered references the instance.** The `WeakRef` destruction test covers the instance.
- **Controller methods don't depend on `this`.** This also holds for `draggable`'s own controller. Its `requestCancel`, `requestDestroy` and `use` are prototype methods today and fail when detached, as in `return controller.requestDestroy` from a framework effect. The returned object is not the instance, so `instanceof` and the hook methods stay unreachable.

**Not restored, from the legacy package or drag2:** no base class or inheritance, no superclass shared by the two built-ins, no phase or state machine in a behavior, no registry or emitter, no second request reader, and no `onError`. `Gesture` stays the only class that holds a session.

**CONTRIBUTING §10 holds without amendment:** an instance has the lifecycle identity of one controller. **Its cost is the owner's to read, not accepted here.** The restructure lands as its own behavior-preserving commit, with its size and move cost measured on their own (`DRO-4`).

#### DRD-21 — Internal questions from the discipline pass

- **`LinearShift` and `RectIndex` lose the axis parameters no caller passes** (`cleanup` oq-1). `y()` is the only caller, and no horizontal linear axis is decided. `xy` covers a single row. The parameters come back with such an axis.
- **`sortable/anchor-outside-container` and `sortable/insertion-placeholder-lost` stay** (`cleanup` oq-2). Each guards a state that DRI-15 admits, from a custom-element reaction or a placeholder factory, and so passes CONTRIBUTING §1.1 gate (a). Each needs a test that names its fault.
- **`RectIndex` grows by doubling and no longer shrinks** (`cleanup` oq-3). No measurement ties the shrink policy to a decision. The cache is bounded by the largest list the consumer had and is released with the controller.
- The other `cleanup-*` findings need no decision and are scheduled.

#### DRD-22 — What the 2026-11-06 performance reading established

**The [reading](measurements/2026-11-06-reading.md) and its raw data stand as recorded. Two of its conclusions are withdrawn as acceptance. The rules for the remediation's validation change.**

- **Cycle timing: "no difference" is withdrawn** (`drag/production:reviewer-4`). The verdicts compared the difference of medians with the control's range across rounds, which carries the drift that moves all arms together. Paired within rounds, production's task time is above both before arms in 7 of 7 rounds on 50 cycles at 20 items, by +1,804 µs against drag2 and +1,364 µs against the prototype, which is about 10 to 13 % of a cycle. At 2,000 items it is +3,984 µs against drag2. The A/A pair shows no consistent sign. **Status: unresolved, probably slower.** The reviewer scanned 52 comparisons and could not re-measure on a quiet machine, and the instrument proof never injected into a cycle row. So this is not a measured regression either.
- **Retained heap: the flag stands as the instrument's output** (`drag/production:reviewer-5`). The 0 B floor of an absolute-heap comparison flags any difference in compiled code. The attribution to code and engine tables is plausible, with object and closure totals within 144 B, but its scripts are not in the tree. **Status: decided by manual attribution, not by the instrument.**
- **The landing layout miss** is addressed by `DRD-15` and owes the exact rule.
- **The other rows keep their recorded verdicts until the paired rule re-judges them** from the same raw data. That costs no new run.
- **New rules, fixed before the next run.** Timing is judged by paired differences within rounds against the A/A pair, and a result is reported with its sign count and median whatever the verdict. Retained memory is judged by retained JavaScript objects, separately from code, with the instrument in the tree. The [remediation handoff](remediation-handoff.md) states both, bounds the runs to the affected rows, and requires an injection on a cycle row first.

**No performance tradeoff is accepted here.** A slower row goes to the owner under CONTRIBUTING §0 as `DRO-4`.

#### DRD-23 — Record and instrument policy

- **No findings family for `drag`.** Every finding of the two reviews is closed in this register by a decision or by the remediation handoff, in the commit that reads them, so a register of findings would have no reader. A finding is addressed by its round and local id, such as `drag/production:reviewer-1` or `drag/architecture:challenge-1`. A later round that leaves findings open past its own commit mints `DRF-n` here, under `repo:RD-1`.
- **`entry.sh` resolves `drag`** (`integrity-8`). The scope row is scheduled. CONTRIBUTING's sentence that enumerated the resolved scopes now points to the scope map.
- **A reused path is not a broken citation.** Dated drag2 records that cite a file of the removed package name the commit that holds it. A path the new package has reused resolves to a different file, which the commit disambiguates. No dated record is rewritten.
- **`599684791` must stay reachable** for the prototype arm and `measure.ts --prototype`. A squash merge doesn't keep it, so the `drag/prototype` branch must (`DRO-5`).
- **`bench/lab-drag2.ts` ties `drag`'s typecheck to drag2 source, by design** under `DRD-13`. Removing drag2 removes that arm first.
- **The report's choice 7 is closed.** The owner was told before the legacy output was removed, which the 2026-11-07 request states.
- **An instrument selects the kernel by location, and a repair to it is shown by a mutation it catches.** Added on 2026-11-07, for the ownership report's findings. A check that attributes allocation or cost to the kernel selects every module under `src/kernel/` and `src/draggable.ts`, and no other module. It does not select by a file or function name that a move between kernel modules would change. The per-sample test selected `draggable.ts` and read 0 from the split at `bb644d6d7` onwards. `compare.ts --prove` checks that every injection applies before it runs any scenario, and can stop there, so a stale injection is found without a timing run.

#### DRD-24 — An operation owns its state and transitions, and the controller owns what spans operations

**Owner requirement, 2026-11-07. The controller owns its lifetime across operations. A session owns one operation and performs it. The two talk through a small interface, and neither reads or writes the other's fields. The [prototype](probes/session-owner/README.md) at `b54832a0e` meets this model. The owner approved its cost in `DRO-6`, and it was adopted at `276947f82`. `DRD-26` removes the `isCurrent` member from the interface below, and the fallback is no longer needed.**

Revised after reading `fbe2839c3` and the probe's candidate, which the owner applied on `drag/session-class-preview`. The earlier text decided a record passed to each step as a parameter (`6f8ea3d91`), and then defined the probe of a shared state with a read-only view (`184f430bb`). Those commits hold the superseded text.

**Prototype result, `b54832a0e`: the model meets the requirement.** The [record](probes/session-owner/README.md) built this boundary in `src/draggable.ts` against `e06476d2b`, whose source is production's.

- **Test evidence, recorded by the implementer and not repeated by the architect:**
  - In Chromium, Firefox and WebKit, the base and the candidate fail the same two tests with no test edited. Those tests are `DRD-25`'s displacement defect.
  - `just test` adds failures of the size gate only.
  - The per-sample allocation test passes in Chromium. The scratch heap test counts one session during each operation and none after destruction.
  - Typecheck and lint pass.
- **Verified by the architect's reading, with the diff applied at `e06476d2b` in a scratch worktree:**
  - `Gesture` reaches the session only through its construction, `advance`, `decide`, `stepTarget` and `terminate`. The session reaches the controller only through `enter`, `raise`, `raiseInPass`, `isCurrent`, `detach`, `takeLanding`, `keepLanding` and `requestStep`. Every field of both classes is `#`-private.
  - `#running` is set only in `enter`. `advance` has one caller, `#applyRequests`, whose precedence is unchanged.
  - `#endPending`, both branches of `#conclude`, `#activate`'s landing and `#teardown` keep the base's order statement by statement. Each kept local stays with its comment.
  - `draggable()` returns a separate object with the four members.
  - Two checks now rest on the session's own resources instead of the slot:
    - The pointer listener no longer tests the slot, because motion is aborted before every clearing of the slot. `handleEvent`'s doc comment states this.
    - `Escape` tests `isCurrent` where the base tested the slot for non-null.
    - Both agree with the base on every path. That includes teardown, where a verdict signal's `abort` listener runs after the slot is cleared and motion is closed.
- **Adopted as built:**
  - the member names;
  - the session as its own listener through `handleEvent`, which only the platform calls;
  - `raiseInPass` as a faulted verdict's way in, while an accepted verdict records its decision and enters the gate;
  - the fixed values, copied into the session at construction.
- **No further experiment is owed.** The cost is the owner's decision in `DRO-6`. Timing is read under `DRO-4`.

**The boundary:**

- **The controller, `Gesture`,** holds what exists across operations or with no operation. That is the root, the behavior, the window and the threshold, the root's listeners, controller disposers, admission, the gate, the step list, the destruction slot, the reader, the current-operation slot and the landing. It creates a session, attaches it to the slot, clears the slot when the session asks, and tears down.
- **The session** holds one operation and makes all of its transitions. It holds the operation's `Drag` and admission, the motion and operation signals with the listeners on them, disposers, phase, decision, next step, verdict, lift, focus and release outcome. Its transitions are samples and the threshold, ending a pending press, activation, the drop, the verdict, conclusion, the terminal step, and release when destruction ends it.
- **Each side calls the other's interface below.** Everything else in each class is `#`-private.

**The interface.** This is the smallest set found by reading the kernel at `fbe2839c3`. The prototype needed nothing beyond it.

From the controller to the session:

| Member | What it does | What it replaces at `fbe2839c3` |
| --- | --- | --- |
| Construction | Opens the operation: builds its `Drag` and installs its listeners. A command operation sets its own first step, the activation | `#open`, and `#command`'s write to `next` |
| Advance | One turn of the reader for the operation. It concludes a decision that isn't applied yet, or else takes and runs the next step. It reports whether it did either | The reader's decision and next-step branches |
| Decide | Records an outcome if none is recorded. It enters no pass | `decision ??=` in `#raise` and `#cancel` |
| Step target | The `Drag` that a deferred step receives: the operation's from activation until the drop or the decision, and `null` otherwise | `#runStep`'s condition |
| Terminate | Destruction's part. It closes motion, aborts the verdict and releases with `null` | The session branch of `#teardown` |

From the session to the controller:

| Member | What it does | What it replaces at `fbe2839c3` |
| --- | --- | --- |
| The gate | Enters a pass with a stable step and its argument, or refuses | `#enter`, unchanged. It stays the only entry |
| Raise | Reports a fault, and decides the current operation if nothing has | `#raise`, unchanged. The lift receives it as now |
| Is current | Whether this session is the one in the slot | `this.#session === session` in the `Drag`'s scope checks and in the verdict's completion |
| Detach | Clears the slot. The session calls it at the three points where the base clears it | The three writes of `null` to `#session` outside teardown |
| Take and keep the landing | At activation, takes and clears the landing before the lift measures. At conclusion, stores the new one | `#activate`'s and `#conclude`'s writes to `#cancelLanding` |
| The verdict's way in | Lets a verdict that settles inside a pass be applied by that pass, and one that settles outside enter a new pass. Built as `raiseInPass` for a fault | `complete`'s read of `#running` |
| `requestStep` | The controller's public method, which a `Drag` forwards to | Unchanged |
| The fixed values | The behavior, root, window and threshold | Read only |

**The slot and the landing stay the controller's.** Only controller code writes them, and the session decides when. In the probe, the controller also decided when, and that is the difference.

**What the probe at `fbe2839c3` showed.** The [probe](probes/session-class/README.md) is evidence about the boundary it was told to build. It is not evidence against an operation class. It kept every ordering, and its Chromium results equal the base's. It missed the owner's goal because this entry's earlier text set four restrictions:

| Restriction | What it produced | Now |
| --- | --- | --- |
| Only `Gesture` writes the slot and the landing, so only `Gesture` makes a transition that writes them | A split lifecycle. Ending a pending press, activation, conclusion with focus, the terminal step and the verdict's completion stayed in `Gesture`. Result codes from the sample step told `Gesture` which of them to run | **Withdrawn.** The controller still owns and writes them. The session calls it, inside the step that makes the transition. No step returns a code |
| Only `Gesture` enters a pass | `complete` on the shared record | **Narrowed to one gate.** The gate is the controller's `#enter`, and the session's listeners and its verdict call it. The property is one gate, not one caller |
| An interface between the two classes is the forwarding layer that CONTRIBUTING §2.2 warns against | A shared record in place of calls | **Withdrawn.** §2.2 is about generic mechanisms built to remove duplication. A fixed interface between two lifetimes is the static construction-time topology that §2.2 prefers, and each member names a controller responsibility |
| `draggable()` returns the `Gesture` instance, so a member without `#` is reachable from the controller | The interface had to be a record that the consumer can't reach | **Changed.** `draggable()` returns a separate object with exactly `requestStep`, `requestCancel`, `requestDestroy` and `use`, as `DRD-20` already requires of the built-ins. The controller's interface is then reachable only inside the module |

**Also withdrawn: the claim that under CONTRIBUTING §10 a class "would add methods, not a semantic".** An operation has a meaningful lifecycle identity, which the scope checks compare. Under the owner's boundary the class carries that identity and encapsulates the operation's state. A record whose fields `Gesture` reads does neither.

**Still rejected: moving controller state into the session.** The slot, the landing, the gate, the step list and the destruction slot exist when no operation does:

- **The slot** says whether an operation exists. Admission, `#cancel`, `#runStep` and the scope checks read it when it may be empty.
- **The landing** outlives its operation, and the next activation or destruction cancels it (DRI-13). On the session it would keep the finished operation alive until the next press, which breaks idle as absence (`DRD-1`) and `DRD-20`'s retention rule.
- **The gate, the step list and the destruction slot** also serve passes with no operation: the press that admits one, and `requestStep` or `requestDestroy` on an idle controller.

**Rejected ways for the session to reach the controller:**

- **A class nested in `Gesture`'s body,** which could use `Gesture`'s `#` names. The names would stay mangled, but the two lifetimes would read as one class again.
- **A record of closures created once per controller.** It has the same members and adds one closure for each. It gains nothing over methods once `draggable()` returns a separate object.
- **A shared state with a read-only view,** which is the probe's form. `Readonly` is shallow, and the controller still reads the session's fields.

**Required properties:**

- **One gate and one reader.** The reader's precedence stays destruction, deferred steps, the operation's decision, then its next step. The decision and the next step are applied only during the reader's turn.
- **Requests only fill slots, and only the reader applies them** (`DRD-1`).
- **The slot is cleared at the same three points as at `fbe2839c3`, in the same order.** A pending press clears it after both aborts. Without `start`, it is cleared before focus is restored. With `start`, it is cleared before `end` (DRI-8). Teardown keeps its order.
- **The landing is taken before the lift measures, and cancelled after it.** It is stored at conclusion, so a destruction applied later in the same pass cancels it (DRI-13).
- **Nothing is allocated per sample** (DRI-17). A step passed to the gate is a stable function. The development refusal count still reads the refused event (DRI-6).
- **Neither the controller object, a `Drag` nor any hook argument reaches the session or the controller's interface.**
- **A local that captures a value before its field is cleared or replaced stays, with its comment.** Removing locals is not a goal, and `using` is not introduced.
- **The tests and the public types don't change.** Adoption lands as its own behavior-preserving commit.

**Fallback.** If the owner declines `DRO-6`, `Session` stays a record. `#move` and `#up` then receive the session that `#onPointer` tested, and no `this.#session!` remains. [`composition-handoff.md`](composition-handoff.md) §1a states this form.

**The implementer's safety explanation was checked and is correct.** At `3084191bb`, nothing between the reads of `this.#session` in `#onPointer`, `#move` and `#up` can clear or replace the field, so no assertion fails. But each assertion depends on an invariant of the whole class, which its read site doesn't show. Both forms remove the assertions. In the class form, the session's methods have the operation as `this`. The commit's other inlinings, in `lift.ts`, `sortable.ts`, `free-drag.ts` and the helpers, read fields that nothing writes between the reads, so they preserve behavior.

**Reconciled:**

- **`DRD-1`:** one session object, with idle as its absence. A class instance is that object, and the gate and the reader stay in the controller.
- **`DRD-16`:** the scope check still compares with the slot. The session asks the controller.
- **`DRD-20`:** its sentence "`Gesture` stays the only class that holds a session" becomes: `Gesture` is the only class that holds the current session, and the session class is the operation. `DRD-20` said that a way for an operation class to reach controller state without forwarding would reopen the question. The owner's requirement reopened it, and the interface above answers it. `DRD-20`'s other rules apply to the session class: stable identities for every function passed out, no `bind` at a call site, and nothing retained after destruction.
- **The contract doesn't change.** The members of `DraggableController` stay. The contract already forbids a behavior to reach the session, and no entry says the controller is the `Gesture` instance.

**Size and allocation: `DRO-6`, the owner's.** The prototype adds 103 B Brotli to `draggable` alone, and three functions to each operation. Interface names, which the minifier can't shorten, account for 439 B of the minified growth. The record fields they replaced, which were also unmangled, save 612 B. No timing was taken. `DRO-4`'s reading includes it, under `DRD-22`'s rules.

#### DRD-25 — The built-in factories compose, and pass consumers only documented values

**`sortable()` and `freeDrag()` build the behavior, pass it to `draggable` and return the controller, as `3084191bb` made them do. Each controller-lifetime resource is installed once, in the factory where its disposal is registered. A consumer callback receives its documented values and never the kernel's `Drag`. `items()` is copied at every pull.**

Decides three findings that the implementer reported on the owner's refactor at `3084191bb`.

- **Displacement is installed once.** At `3084191bb` both the constructor and `sortable()` call `config.displacement`. Operations report to the first sink, and destruction retires the second, so row animations outlive the controller. "should cancel a running landing and the row animations" and "should keep a row animation past the terminal, until destruction" fail on it. **`sortable()` calls the installer once, passes the sink to the constructor, and registers its `retire` with the kernel's `use`.** That puts creation and disposal next to each other in the only function that knows both the kernel and the behavior. The constructor keeps installing the axis, because the controller disposes nothing of it. **Rejected: a public `displacement` field that the factory reads.** It would work, but creation and disposal would stay in two places, and that separation is how the defect arose.
- **The `placeholder` factory receives a new object with exactly `item`, `visual`, `box` and `rect`, built once per activation.** At `3084191bb` it receives the operation's `LiftedDrag`, which the type accepts because it has those members too. At runtime the consumer can then call `requestCancel`, `requestStep`, `translate` and `use`, and can read sortable's operation `state`. A factory that keeps its argument also keeps the operation. `freeDrag` already keeps this boundary: `home`, `onStart`, `onMove` and `onDrop` each receive an object of their own. Under CONTRIBUTING §9 the object's reason is that boundary, and it costs one allocation per activation. The contract's public surface now states the rule for every option callback.
- **`items()` is copied at every pull.** The owner withdrew the copy's removal, and `d4286ce64` restores it in `#pull`. CONTRIBUTING §9 names this ownership reason: the snapshot must stay stable when the consumer changes its own array. For example, a consumer updates its model in `onReorder`, and an `Escape` then cancels before the verdict. The landing then reads home from the snapshot. The getter API stays. DRI-14 and the `items` documentation now say that the library copies the array and the consumer keeps ownership. **No test witnessed the copy at `3084191bb`, so its removal passed the suite.** The handoff adds a witness.

**Reconciled with `DRD-20`.** Each factory still builds one module-private instance and returns a separate controller object whose methods don't depend on `this`. The step handed to the kernel, `behavior.invalidate`, is created once per instance. **`moveTo`'s step per call is confirmed**, which answers the remediation report's §Step 2. DRI-8 names it as the case that keeps call order.

#### DRD-26 — A session ends itself, and a request through its `Drag` asks the session

**The session owns its lifetime. It has a final state, ended, which it enters at each point where it stops being the controller's operation. A request through its `Drag`, its `Escape` and its verdict's completion read that state. The controller's `isCurrent` is removed. Deferred execution stays the controller's: a step the session accepts goes to the controller's `requestStep` as now.**

Owner requirement, 2026-11-07, on the decomposition at `bb644d6d7`. There the session asks the controller whether it is still current, in four places. That asks another object about the session's own lifetime.

**Where the session ends.** It ends at the points where the controller's slot stops holding it, in the same order:

| Path | Where the session enters ended |
| --- | --- |
| A press that never activates | In `#endPending`, after both aborts, where it detaches |
| A concluded operation without `start` | After release and the landing, where it detaches, before focus is restored |
| A concluded operation with `start` | In the terminal step, where it detaches, before `end` |
| Destruction | First in `terminate`, before motion closes and the verdict aborts, because the abort runs foreign code. Teardown clears the slot just before it calls `terminate`, with nothing between |

**Why every check keeps its result.** The slot is written only by `#open`, which fills an empty slot, by the three detaches and by teardown. At each of these four points the session enters ended with no foreign code between the two writes. So whenever foreign code runs, "the slot holds this session" and "this session hasn't ended" have the same value, and each check below gives the result it gives at `bb644d6d7`.

| Check | At `bb644d6d7` | Now |
| --- | --- | --- |
| `drag.requestStep`, `drag.requestCancel` | `isCurrent` | the session hasn't ended |
| `Escape` | `isCurrent` | the session hasn't ended |
| A verdict's completion | consumed if not current or decided | consumed if ended or decided |

**Where the checks matter.** The request checks matter whenever a `Drag` is retained after its operation (DRI-8). The `Escape` and completion checks matter only while `terminate` runs foreign code: an `abort` listener on the verdict's signal can dispatch an `Escape`, or settle a thenable that calls its callbacks synchronously. No test reaches those two cases, so the handoff adds witnesses for them.

**Three lifetimes, each with one owner:**

- **The operation's lifetime is the session's.** Its ended state decides whether a request through the `Drag` still acts, whether `Escape` applies and whether a verdict's completion is consumed.
- **Deferred execution is the controller's.** A step the session accepts goes to the controller's step list, which runs it in a pass, coalesces it by identity and drops it at destruction (DRI-8, DRI-10). The session queues nothing.
- **Release is the presentation's lifetime, and stays as it is.** `drag.signal` and a late `use` disposer depend on release (DRI-9), which comes before the end for an operation with `start`.

**A late verdict is consumed:** a completion after the end or after a decision records nothing, reports nothing and enters no pass, as now.

**`DRD-24`'s interface loses one member.** The session reaches the controller through `enter`, `raise`, `raiseInPass`, `detach`, `takeLanding`, `keepLanding` and `requestStep`. `DRD-27` then removes `takeLanding` and `keepLanding`. Everything else in `DRD-24` stands.

**Rejected:**

- **Recording a decision at destruction,** so that the decision alone covers the completion. Destruction delivers no outcome (DRI-10), and an outcome that nothing applies is a false state.
- **An `AbortController` for the operation's lifetime.** It allocates once per operation, and the phase already holds the state.
- **Ending the session at conclusion.** Then a step requested in `settle` or a disposer wouldn't run, and at `bb644d6d7` it runs before `end`, receiving `null`.

#### DRD-27 — The kernel knows no lift, and a behavior composes the lift in its own context

**`Session` and `Gesture` don't name a lift type, read a behavior's `lift`, build a lift view, hold a landing or branch on anything lift-specific. The kernel owns the operation's data, the `Drag`. The behavior owns its context, `drag.state`, and every presentation capability it composes there. A lifted behavior creates one `Lifter` per controller from `lift.js`, calls its `acquire` as the first statement of `activate`, keeps the returned `Lift` in its state, and names the landing from `settle` with `lift.land`. The lift reaches the kernel's ordering only through `drag.use` and the controller's `use`, which every behavior has.**

**Revised 2026-11-07, at the owner's requirement on `6d5ba89e7`.** The text at `6d5ba89e7` had the kernel build the `Drag` at activation with a `lift` member, call `behavior.lift`, and keep the lift's hold and the landing. That removed the cast and the second writer. But the kernel still called the lift, branched on it, named `Lift` in its types and ordered the lift's release and landing itself. The owner's requirement is that the kernel's operation model is the same whether or not a behavior uses the lift. None of the text at `6d5ba89e7` was implemented.

**Does `drag.state` already provide the boundary? Yes.** drag2 split each frame into the kernel's slice and a part that the behavior owns, and the kernel copied the part without reading it. `drag.state` is that part:

- **The behavior creates it,** in `admit` or `command`. The kernel carries it to the `Drag` by identity and never reads or writes it.
- **Its lifetime is the operation's.** A retained `Drag` keeps its own state, and a later operation has a new one.
- **It already holds what activation creates.** The built-ins keep their placeholder, frame task and cache context there.
- **A hook writes it directly.** drag2 needed a draft and a current frame because a step's writes had to be applied as a transaction. Here requests only fill slots and one reader applies them (`DRD-1`), so no copy is needed (DRI-8).

What it doesn't hold is a value that outlives the operation. The running landing is the only such value of the lift. It belongs on an object with the controller's lifetime, which the behavior's composition creates and disposes through the controller's `use`. `sortable`'s displacement sink already works this way (`DRD-25`).

drag2 is the reference for this split only. Its kernel itself held the lift: `BehaviorConfig.liftMode`, `ActivationScope.lift` and `kernel/presentation.ts`.

**Where the lift's coordination goes.** Each row is kernel code at `bb644d6d7`:

| Coordination | At `bb644d6d7`, in the kernel | Now, in the lift and the behavior |
| --- | --- | --- |
| Acquisition | The session calls `behavior.lift` after the decline for a disconnected item, before capture and `activate` | The behavior calls `lifter.acquire(drag, visual, box)` as the first statement of `activate`, before its second pull and before any `drag.use` |
| A grab during a landing (DRI-13, `DRD-18`) | The session takes the controller's landing before the lift measures, and cancels it in a `finally` | The lifter holds its running landing. `acquire` measures, then cancels that landing in a `finally` |
| Release after the disposers (DRI-9, `DRD-14`) | The session releases the hold after the `use` disposers | `acquire` registers the release with `drag.use` before its first write. Acquired first, the release is the operation's first disposer, so it runs last |
| The landing after release | `settle` returns a `Landing`. The session starts it after release, and the controller keeps its cancel | `settle` calls `lift.land(landing)`. The lift starts the landing right after its release, in the disposer walk, and stores the cancel on the lifter |
| Landing cancel at destruction (DRI-10) | A teardown step between the operation's release and the controller disposers | The composition passes `lifter.cancelLanding` to the controller's `use`. The built-ins register it last, so it runs first, where the teardown step ran |
| A failed acquisition (DRI-7) | The lift restores what it changed, reports a failure to restore through the kernel's `raise`, and rethrows | The acquisition throws, and that fault decides. The release, registered before the first write, restores at the operation's release. A throw there is reported as a later fault |
| `lift`'s window | The controller's | The window passed to `createLifter`, which the built-ins already hold |

**How a behavior gets each guarantee.** The kernel provides these mechanisms to every behavior. None of them knows what a disposer releases:

| Guarantee | The kernel's mechanism | The lift's part |
| --- | --- | --- |
| Everything that can fail is in `activate`, and a throw is a fault with no `start` or `end` | `activate` | Acquisition is in `activate` |
| Release after cleanup | `drag.signal` aborts, then `use` disposers run last in first out, every one whatever another throws, each throw reported once | The release is the first registration, so it runs last |
| The landing starts after release and before `end` | Disposers run in the conclusion step. `end` is the next step, in the same task | The release disposer starts the landing after restoring |
| Focus after `end` | The terminal step restores focus when `end` returns or throws | Nothing |
| Destruction releases everything and delivers no terminal | `terminate` releases with `null`. Controller disposers run last in first out | No landing was named, because `settle` doesn't run. `cancelLanding` is a controller disposer |
| A late `use` | Runs at once | Not used |

**Required properties of the kernel:**

- **No kernel module or `draggable.ts` names the lift or the landing.** `grep -rniE 'lift|landing' src/kernel src/draggable.ts` finds nothing, comments included.
- **`Gesture` has no landing slot.** `takeLanding`, `keepLanding` and `#cancelLanding` go. Teardown closes the controller, clears the slot and the steps, terminates the session, runs the controller disposers and aborts the root's listeners, in that order.
- **`Session` keeps no lift and no admission for one.** Activation is the decline for a disconnected item, capture, `activate`, then `start`. Conclusion closes motion, aborts the verdict on a cancel, runs `settle` if `start` was reached, releases, and then detaches or sets the terminal step, as `DRD-26` states.
- **The `Drag` is built when the session opens, as at `0dcb80fb1`.** Every member it has exists for every behavior, so its type is honest from construction. The kernel holds it under a kernel-internal type whose members are writable, declared in `src/kernel/drag.ts`, and assigns the object literal to it with no assertion. **`6d5ba89e7`'s construction at activation is withdrawn,** because it existed only to build the view first. `type-fest` and `Writable` leave the package.
- **`DRD-1`, `DRD-24` and `DRD-26` stand:** one gate, one reader with its precedence, requests that only fill slots, the slot's three detaches and teardown's order. Nothing is allocated per sample (DRI-17).

**Public types:**

- `draggable.js`: one `Behavior<State, Verdict>` with no `lift` member, whose hooks receive `Drag<State>` and whose `settle` returns `void`. `Admission<State>` has `item`, `handle?` and `state?`. `Drag<State>` has the kernel's members only, with no `lift` key. `draggable` has one signature and no assertion. `LiftedBehavior`, `LiftedDrag`, `LiftedAdmission` and `AnyBehavior` go.
- `lift.js`: `createLifter(window): Lifter`. `Lifter` has `acquire(drag, visual?, box?): Lift` and `cancelLanding()`. `Lift` has `visual`, `box`, `rect`, `boxWidth`, `boxHeight`, `visualSpace`, `itemSpace`, `translatedX`, `translatedY`, `translate(x, y)` and `land(landing)`. `Landing` is unchanged.

**Required properties of the lift:**

- **`acquire`** reads all geometry before any write, as now. It registers the release with `drag.use` before the first write. It creates the `Lift` with every member set. After measuring, it cancels the lifter's running landing, also when acquisition throws.
- **The release** restores the top layer and then the inline declarations, as now. It is total over a partial acquisition. **The landing starts after the release.** It is attempted even when the release threw, and each throw is reported separately. Two disposers registered in that order meet this, and so does one disposer that reports through a second registration. The choice is the implementer's.
- **`land`** records the landing, and the last call wins. Without a call, nothing lands. Only `translate` writes `translatedX` and `translatedY`.
- **`cancelLanding`** cancels the running landing, if any. It works when detached and when called twice.
- **Nothing in the lift reaches the kernel's interface.** The lift receives the `Drag` that every hook receives, and nothing else from the kernel.

**Changes a consumer sees, against `bb644d6d7`:**

- **A lifted behavior composes the lift in its own code.** It creates a `Lifter` with its controller and passes `cancelLanding` to the controller's `use`. It calls `acquire` first in `activate` and keeps the `Lift` in its state. It reads the ten members from that `Lift`, and calls `land` in `settle` where it used to return a `Landing`.
- **`Behavior.lift`, the lifted types and `Admission`'s `visual` and `box` are removed.** `settle` returns nothing. `lift` is replaced by `createLifter`. `Landing` moves to `lift.js` (`DRD-28`).
- **A `Drag`'s own keys lose the ten lifted members.**
- **Pointer capture is now set before the lift's acquisition.** It used to be set after it. When acquisition fails, capture is set and then released at conclusion. No other effect is intended.
- **A failed acquisition is restored at the operation's release,** in the same pass, instead of inside the acquisition. A failure to restore is now reported after the acquisition's fault, and the acquisition's fault decides the outcome. At `bb644d6d7` the restore failure was reported first and decided. The number of reports doesn't change. No test reaches this case, so the handoff adds witnesses.
- **For the built-ins,** a landing's cancel at destruction runs as the first controller disposer, where the teardown step ran. Their consumer callbacks `visual`, `box` and `placeholder` are called when they are called now.
- **No change to event order, hooks, outcomes or timing is intended beyond these.**

**DRI-18 changes.** The kernel's guarantees still hold with no code beyond the hooks. The lift's guarantees, which are DRI-9's release and landing, DRI-12's focus during promotion and DRI-13, hold for a behavior that composes the lift as `lift.js` documents. That means one `Lifter` per controller with its `cancelLanding` passed to `use`, and `acquire` first in `activate`. Nothing stops a behavior that composes it otherwise, and no check is added (CONTRIBUTING: write for a truthful developer).

**Rejected:**

- **The text at `6d5ba89e7`.** The kernel built `drag.lift`, held the hold and the landing, and branched on `behavior.lift`.
- **A generic presentation hook,** such as `present?(drag)` returning `{ release, land }`, which the kernel would order. It moves the same coupling behind a plugin seam (`DRD-2`), and the kernel would still order a landing it doesn't own.
- **A `lifted(behavior)` wrapper from `lift.js`** that adds acquisition to `activate`. It is a composition framework, and it hides the order of the behavior's own disposers from its author.
- **Keeping an opaque controller-lifetime cancel slot in `Gesture`.** Its only purpose is the landing, so it is a lift-specific slot under another name.
- **The `Lift` on the behavior instance.** A retained `Drag`'s step would then read a later operation's view.
- **A kernel-provided per-operation slot for the behavior's context.** `drag.state` already is that slot.
- **Computing `visual` and `box` at activation.** That would move the consumer's `visual` and `box` callbacks from admission to activation. They stay where they are, and the built-ins carry the elements in their state.

**Verified by a type check, not by production code.** The [type check](probes/drag-ownership/README.md) now models these types. One `Behavior` type compiles with no overload and no assertion except `admission.state as State`. A kernel-internal writable type holds the `Drag`, and a `Drag<State>` passes to `acquire`. Both of the repository's option sets compile.

**Not decided here:**

- **An admission may omit `state` while the `Drag` types `state` as `State`.** The assertion at the kernel's generic boundary stays. It is the owner's question if wanted.
- **The built-ins' operation state has fields that `activate` or `settle` fills, read with `!`.** `state.lift` joins them: it is `null` from admission and set as `activate`'s first statement. Typing a behavior's state by its phase would change the built-ins, not the kernel.

**Cost: the owner's, `DRO-7`.**

#### DRD-28 — Public entries at the source root, and the kernel's modules internal

**`src/lift.ts` and `src/fault.ts` return to the source root. `src/kernel/` holds only modules that no consumer imports. Each public type is exported from one public entry, and the built-ins, fixtures, tests and instruments import kernel types only through those entries.**

The owner moved `lift` into `src/kernel/` at `bb644d6d7`, and said on 2026-11-07 that the move came from mistaking its role. `lift` is an optional public module that the kernel never imports as a value. `DragFault` is a public entry for the same reason.

**At `bb644d6d7`, by reading:**

- **The typecheck fails, with 48 errors in 24 files.** `src/draggable.ts` exports no type, so neither a consumer nor `sortable/domain.ts`, `free-drag/domain.ts` or `free-drag/geometry.ts` can name `Drag`, `Behavior` or `CancelOrigin`.
- **The test files that import `src/lift.ts` or `src/fault.ts` can't load.** `files.json`, `typedoc.json` and the size instrument still address both modules at the source root.
- **`sortable.ts` and `free-drag.ts` import from `./kernel/*`,** while DRI-18 lets them import only public values and types.
- **Four `!` assertions on the built-ins' state are removed:** three in `sortable.ts` and one in `free-drag.ts`. Each guards a field that an earlier hook of the same operation fills, so behavior doesn't change, but the typecheck fails.

**Decided:**

- **Source layout:**
  - `src/draggable.ts`, `src/lift.ts` and `src/fault.ts` are the kernel's public entries.
  - `src/kernel/` holds `admission`, `behavior`, `drag`, `gesture`, `outcome` and `session`.
- **Exports:**

  | Entry | Values | Types |
  | --- | --- | --- |
  | `draggable.js` | `draggable` | `Behavior`, `Admission`, `Drag`, `DragDisposer`, `DraggableController`, `Outcome`, `SkippedOutcome`, `VerdictOutcome`, `CanceledOutcome`, `CancelOrigin` |
  | `lift.js` | `createLifter` | `Lifter`, `Lift`, `Landing` |
  | `fault.js` | `DragFault` |  |

  The kernel's types are type-only re-exports, so importing `draggable` alone still brings no lift code. This is the table after `DRD-27`. Until `DRD-27` is implemented, `draggable.js` also exports the lifted types and `lift.js` exports `lift`, `Landing` and `LiftHold`.

- **Packaging.** The build is unbundled, so it writes `kernel/*.js` beside `shared/`. `package.json`'s `files` and `files.json`'s `clean.extras` list `kernel` as they list `shared`. `type-fest` leaves the dependencies (`DRD-27`).
- **The four assertions return as they were at `0dcb80fb1`.**
- **Tests change only where the layout requires it.** The size test's exact module list for `draggable` alone becomes the new graph. That list is the kernel's modules that have code, and still no lift, `box-quad`, sortable or landing module.

## Disposition of the 2026-11-07 reviews

Each finding and question of the [review round](reviews/production/production-summary.md) and the [architecture challenge](reviews/architecture/production-design-challenge.md), both read at `d7e7b0d3a`. "Handoff" means [`remediation-handoff.md`](remediation-handoff.md).

| Item | Disposition |
| --- | --- |
| `challenge-1` | `DRD-14` |
| `challenge-2` | `DRD-17` |
| `challenge-3`, `challenge-4`, `challenge-7` | `DRD-17` |
| `challenge-5` | `DRD-15` |
| `challenge-6` | `DRD-18` |
| `challenge-8` | `DRD-19` |
| Challenge hypotheses: activation by time, keys during a pending verdict | Accepted, `DRD-17` and `DRO-3` |
| Challenge hypothesis: a late disposer's `null` | `DRD-16` |
| Challenge hypothesis: a controller created again per list change | Accepted under DRI-10. The README states one controller per root. Handoff |
| `reviewer-1` | `DRD-16` |
| `reviewer-2`, report choice 1 | `DRD-18` |
| `reviewer-3`, `reviewer-6` | Handoff: witnesses and mutations |
| `reviewer-4`, `reviewer-5` | `DRD-22`, handoff validation |
| `reviewer-7` | `DRD-15`, handoff validation |
| `integrity-1` to `integrity-7` | Handoff |
| `integrity-8`, integrity open questions, report choice 7 | `DRD-23`, handoff |
| `cleanup-1` to `cleanup-11` | Handoff. `cleanup-3` goes with `DRD-18` |
| `cleanup` oq-1 to oq-3 | `DRD-21` |
| Owner request: classes | `DRD-20` |

## Disposition of the ownership report

The [ownership report](ownership-report.md) and the code at `ff69cb8d7`, read against [`ownership-handoff.md`](ownership-handoff.md). **Method:** the architect read the diff from `a343b3d45` to `ff69cb8d7` and repeated the handoff's mechanical checks. Both `grep`s find nothing. `git diff 0dcb80fb1 ff69cb8d7 -- package-lock.json` is empty. Outside `src/kernel/`, only `src/draggable.ts` imports from it. The architect ran no suite or mutation. Those results are the implementer's.

| Item | Disposition |
| --- | --- |
| Item 1, `DRD-28` | Conforms. Implemented at `039e8e153` |
| Item 2, `DRD-26` | Conforms. The ended state is a fifth phase value, entered at `DRD-26`'s four points, and `isCurrent` is gone. Implemented at `433a0e06c` |
| Item 3, `DRD-27` | Conforms. Implemented at `89995c27e`. See below |
| The expected key `lift.ts:drag.translate` renamed to `lift.ts:translate`, which the owner approved | Ratified. It is the same function, the `Lift`'s `translate`, under the name V8 now gives it. The assertion means the same |
| Five `return null;` statements removed from plain behaviors' `settle`: three in `requests`, one in `terminals`, one in `order` | Ratified, as a direct consequence of `settle` returning `void` (`DRD-27`). None of the five behaviors composes a lift. At `a343b3d45` the kernel discarded their `null`, because it started a landing only for a landing and a lift, and now it ignores the return value. No expectation depends on it. TypeScript accepts a value where the contextual return type is `void`, and `@typescript-eslint/strict-void-return` refuses it. The handoff's list of allowed edits omitted these edits, and that omission is the architect's. The edit met the handoff's stop condition and was neither returned nor put to the owner. Nothing more is owed |
| The per-sample test's kernel assertion sums `draggable.ts:` keys, and no kernel module has had that name since `bb644d6d7` | Confirmed: the assertion can't fail. [`instrument-repair-handoff.md`](instrument-repair-handoff.md) item 1, under `DRD-23`'s last bullet. Until then the ownership report's per-sample result covers the lift and not the kernel. Its recorded profile has no `session.ts` or `gesture.ts` key, which suggests that the kernel allocated nothing measurable but doesn't prove it |
| Three `compare.ts` injections whose `find` no longer occurs | Confirmed. The drop and the per-move allocation have been stale since `3084191bb`, and the step-list entry since `276947f82`. The instrument handoff's item 2 |
| `freeDrag` 55 B and `freeDrag` + `bounds` + `landing` 62 B over their ceilings, and the `draggable` alone control 83 B off | `DRO-7`. Nothing is re-based |

**Item 3, as read:**

- `Session` and `Gesture` name no lift, and `takeLanding`, `keepLanding` and the landing slot are gone.
- The `Drag` is built when the session opens, as a `KernelDrag<State>`, and its one assertion is `admission.state as State`.
- `acquire` measures, then registers two disposers before its first write: the landing's, then the release. So the release runs first, and the landing starts after it even when the release throws. A `finally` cancels the lifter's running landing after measuring.
- Each built-in acquires first in `activate`, before `sortable`'s second pull, and passes `cancelLanding` to `use`. In `sortable` that comes after the displacement's registration.

**Unresolved at this commit:** `DRF-1`, below, and `DRO-7`.

## Findings

Open findings for scope `drag`, under `DRD-23`'s first bullet. High-water mark: **`DRF-1`**.

#### DRF-1 — `compare.ts`'s bytes rule selects the kernel by function name

Tier B, open. Found by the architect while reading `compare.ts` at `ff69cb8d7`.

- **Current behavior:** the bytes rule flags a function at 16 B per move or more when `isKernelFunction` names it. That is, the name starts with `#`, or is `requestStep` or `requestCancel`. The profile keys a frame by its function name only, because each arm is one bundled script.
- **Why it is a problem:**
  - Since `276947f82`, the kernel's pass runs through `enter` and `advance`, which aren't private. The rule can't flag an allocation in them, although every sample runs both.
  - It also counts a behavior's private member as kernel: `sortable`'s `#updateInsertion` read 2 to 4 B per move in the proof run recorded at `b91db2818`, under the rule's limit.
- **Evidence:** `isKernelFunction` in `bench/compare.ts`. `Gesture.enter` and `Session.advance` are in `src/kernel/`.
- **Required property:** as `DRD-23`'s last bullet states, the rule selects the kernel by module location: every function in `src/kernel/` or `src/draggable.ts`, and nothing else. An allocation injected into `Gesture.enter` must flag.
- **When:** before the next `compare.ts` run that launches a browser. Timing is deferred, so the instrument repair leaves it open, and the combined review doesn't wait for it.

## Owner decisions

None blocks the remediation. Each has a default the handoff builds. `DRO-6` is approved. `DRO-7`'s figures are in the [ownership report](ownership-report.md). Its per-sample kernel figure comes from the instrument repair.

#### DRO-1 — Press cost under CONTRIBUTING §0

**Default: pull at admission.** The prototype's press at 2,000 items cost about 440 µs more script than at 20, once per press with no layout, and that figure wasn't separated from the consumer's own `[...root.children]`. **The 2026-11-06 reading separates them:** with a cached array a press costs 53 µs at 2,000 items and 55 µs at 20, so the library's own share doesn't grow. With `[...root.children]` it costs 337 µs. That is +257 µs against drag2, which doesn't pull at a press, with a floor of 223 µs. `DRD-18` adds one pull per keyboard command and none per press. **Recommendation: approve.** The growth is the consumer's `items()`, which a consumer can cache. The alternative is a cached membership check at the press, which adds a cache and a miss path.

#### DRO-2 — A landing can be clipped

**Default: DRD-10.** An item released outside a scrolling list slides back clipped by it, and can pass under a later positioned panel, for the length of the landing. Holding the top layer removes this and brings the costs in DRD-10. **Recommendation: keep the default.** Say so if the clipped flight is unacceptable once you see it, because the change is contained in the lift and `sortable`.

#### DRO-3 — Real devices

**Default: Chromium's emulated touch runs in the suite, and physical touch and pen are stated as unverified.** The implementer has no hardware. **Recommendation: try one touch device and one pen before calling the package released.** The case most likely to differ is `pointercancel` from touch scrolling. **If a touch list that also scrolls can't be dragged there, activation by a long press becomes a feature decision.** The package has no activation by time (`DRD-17`).

#### DRO-4 — Costs measured after remediation

**Default: none is accepted until you read it.** The remediation report gives, under the rules fixed in `DRD-22`:

- the per-cycle time against both before arms, which the 2026-11-06 rounds show as probably 10 to 13 % slower at 20 items;
- the size and move cost of the class restructure alone (`DRD-20`);
- the size of the remediation as a whole, with causes.

A row that is still slower comes with its attributed cause. You decide under CONTRIBUTING §0 whether to accept it or have it removed. **No recommendation until the figures exist.**

**After `3084191bb`:** the remediation report's readings measured `b91db2818`. `3084191bb` and the composition handoff change the kernel and both built-ins, so those readings describe only `b91db2818`. A size figure the implementer saw on the uncommitted tree after `3084191bb` is not recorded, and isn't a reading. A figure offered for this decision names the commit it measured.

**Timing deferred, 2026-11-07.** When the owner approved `DRO-6`, they deferred timing evaluation and tuning. The size re-base in this entry remains open. No timing reading is owed until the owner asks for one, and none is accepted.

#### DRO-5 — Keep `599684791` reachable after the squash merge

**The repository allows only squash merges, so `main` won't contain `599684791`.** Once `drag/production` is squashed and its branch deleted, the commit stays reachable only through another ref. On 2026-11-07 that ref is `origin/drag/prototype`, whose tip `a1d31e0d2` descends from `599684791`. `origin/drag/production` holds it too, but merging normally deletes that branch. The `compare` instrument's prototype arm and `measure.ts --prototype` read the commit with `git archive`, and fail without it.

**Default: keep `drag/prototype` as the ref that preserves it.** No tag and no settings change is needed.

- **Before merge:** `git branch -r --contains 599684791` must list `origin/drag/prototype`.
- **While either instrument names the commit:** don't delete, rewrite or force-push `drag/prototype`.
- **On a checkout of `main` alone,** which includes a single-branch clone: run `git fetch origin drag/prototype` before either instrument.

**The alternative is to retire the prototype arm** from both instruments before merge, after the remediation's validation has read it. The branch then stops mattering, and the 2026-11-06 and remediation readings keep the arm's figures. **Recommendation: keep the branch until the owner has read `DRO-4`, then decide whether to retire the arm.**

#### DRO-6 — Adopt the operation class at its measured cost

**Approved by the owner on 2026-11-07, and adopted at `276947f82`.** The [composition report](composition-report.md) records the approval as relayed: the costs below are accepted for adoption, the priority is a clear architecture with well-defined ownership, and **timing evaluation and tuning are deferred.** The text below is the decision as it was put. The [prototype](probes/session-owner/README.md) at `b54832a0e` meets `DRD-24`. Its adoption is a single kernel commit, item 1. Its costs below are measured against `e06476d2b`, whose source is production's.

**Size.** Brotli is the figure that governs.

- **`draggable` alone:** +103 B, from 2117 to 2220. Minified, +372 B.
- **Every other row:** +96 to +121 B, because each one imports the kernel.
- **Seven rows then exceed their ceilings:**
  - `draggable` alone by 81 B;
  - `freeDrag` + `bounds` + `landing` by 73 B;
  - `freeDrag` by 68 B;
  - example: canvas group by 52 B;
  - example: drop zone by 31 B;
  - example: resize handle by 27 B;
  - `draggable` + `lift` by 23 B.
- **The three `sortable` rows stay under their ceilings.**
- **The control row** is already 93 B off its 2024 B figure at the base. The adoption moves it another 103 B.
- **The minified +372 B of `draggable` alone has four causes:**
  - +439 B for interface and public member names, which the minifier can't shorten;
  - +128 B for more references to private names;
  - −612 B for the record's field names, which were unmangled and are now `#`-private;
  - +417 B for other code: the second class and its constructor, the interface methods, `handleEvent`'s dispatch, `runDisposer` and the returned controller object.

**Allocation.**

- **Per sample:** none. The per-sample test passes, in Chromium only.
- **Per pointer operation:** 3 more functions, the gate steps `#move`, `#up` and `#endPending`, which the base created once per controller. That makes 9 objects and 6 functions, where the base created 9 and 3.
- **Per keyboard command:** the same 3 more, which a command never calls. That makes 7 objects and 7 functions, where the base created 7 and 4.
- **Per controller:** 5 fewer functions and 1 more object, the returned controller.
- **Per operation, without allocation:** four field writes copy the fixed values into the session.

**Per-sample work, not measured.** A sample now pays:

- one string comparison in `handleEvent`;
- the platform's dispatch through a listener object instead of a function;
- a direct read of `this.#drag`, where the base read through `this.#session!`.

No timing was taken.

**What approval decides:**

- **You accept the size and allocation figures above as the adoption's cost.** The adoption commit lands with those seven rows and the control red. It re-bases nothing.
- **The ceilings and the control are re-based under `DRO-4`,** from the reading at the composition unit's last commit, which names this adoption as a cause.
- **Timing is judged in that reading, under `DRD-22`'s rules.** The composition report names the adoption commit and its parent, so a slower cycle row can be attributed to it.

**If you decline,** `DRD-24`'s fallback lands as item 1, and the ownership model stays recorded as the target. The fallback has no size reading.

**Recommendation: approve.** These figures are the cost of the boundary you set:

- The names the boundary needs cost about as many minified bytes as the unmangled record fields they replace.
- The net growth is the code of a second class.
- The three functions are created once per press, not per sample.

#### DRO-7 — The costs of the ownership revision

**Default: none is accepted until you read it.** [`ownership-handoff.md`](ownership-handoff.md) implements `DRD-26` to `DRD-28`, and its report gives these figures, each with the commit it measured:

- **Size:** every row of `just size`, minified and Brotli, at each of the unit's commits. Each is compared with the figures that the [composition report](composition-report.md) recorded at `2506dcbb6`, whose source equals `0dcb80fb1`'s. `bb644d6d7` has no complete reading, because its lifted rows don't build.
- **Allocation, counted by reading and with the method stated:**
  - per press that never activates;
  - per pointer operation, with and without `lift`;
  - per keyboard command;
  - per lifted activation inside the lift, and per controller for the `Lifter`.
- **Per sample:** the per-sample allocation test result. A lifted behavior's `translate` call now reads the `Lift` from its state, one or two property reads more. That is not measured.

**Expected by reading, not measured. Revised with `DRD-27` on 2026-11-07:**

- **`draggable` alone should shrink:** the session loses the lift's call, hold and landing, and the controller loses the landing slot and two interface members.
- **The lifted rows move by the composition's code,** which each built-in now writes: a `Lifter` per controller, the acquisition and `land`, and `cancelLanding` passed to `use`. The lift itself loses the `report` path and gains the registration of its release.
- **A press that never activates allocates as at `0dcb80fb1`.** `6d5ba89e7`'s expected saving is withdrawn, because the `Drag` is built at the opening again.
- **Each lifted controller allocates a `Lifter`.** Each lifted activation allocates the `Lift`, its `translate` and the release's disposer or disposers. At `bb644d6d7` it allocated the hold, its `land` and `translate`.
- Removing `isCurrent` and adding an ended state should change size by a few bytes in either direction.
- Returning the modules to the root should change no row.

**No timing is taken,** because you deferred timing. **What reading decides:** you accept the figures, or you name a part to remove before merge. **No recommendation until the figures exist.**

**Status, 2026-11-07:** the figures are in the [ownership report](ownership-report.md), measured at `039e8e153`, `433a0e06c` and `89995c27e`. One is incomplete. **The per-sample test passed, but its kernel assertion couldn't fail** (§Disposition of the ownership report). So that result covers only the lift's `translate`. The kernel's per-sample figure comes from [`instrument-repair-handoff.md`](instrument-repair-handoff.md) item 1's unmutated runs. The size and allocation figures don't depend on it.

## Decision status

| Decision | Status |
| --- | --- |
| DRD-1 | active |
| DRD-2 | active |
| DRD-3 | active |
| DRD-4 | active, amended by `DRD-27`: the lift is no longer a behavior member. A behavior composes it with `createLifter`, and its members are on the `Lift` that the behavior keeps in its state. Its purpose holds: without that import, no lift code |
| DRD-5 | active |
| DRD-6 | active, scoping amended by `DRD-16` |
| DRD-7 | active |
| DRD-8 | active |
| DRD-9 | active, the restore's place amended by `DRD-15` |
| DRD-10 | active, a grab during a landing amended by `DRD-18` |
| DRD-11 | active. `DRD-18` applies the activation pull to commands |
| DRD-12 | active |
| DRD-13 | active, its performance rules amended by `DRD-22` |
| DRD-14 | active, implemented at `b91db2818`. Under `DRD-27` the release is the lift's own disposer, in the same place |
| DRD-15 | active, implemented at `b91db2818` |
| DRD-16 | active, implemented at `b91db2818` |
| DRD-17 | active, implemented at `b91db2818` |
| DRD-18 | active, implemented at `b91db2818`. Under `DRD-27` the lifter measures and then cancels its own running landing |
| DRD-19 | active, implemented at `b91db2818` |
| DRD-20 | active, implemented at `b91db2818`. `DRD-24` amends its sentence on the class that holds a session |
| DRD-21 | active, implemented at `b91db2818` |
| DRD-22 | active, applied in the remediation's validation |
| DRD-23 | active. Its last bullet, on instrument selection, was added on 2026-11-07. [`instrument-repair-handoff.md`](instrument-repair-handoff.md) applies it. `DRF-1` is open under it |
| DRD-24 | active, adopted at `276947f82` under `DRO-6`. `DRD-26` removes `isCurrent` from its interface. `DRD-27` removes `takeLanding` and `keepLanding`, and the landing leaves the controller |
| DRD-25 | active, implemented at `2506dcbb6` |
| DRD-26 | active, implemented at `433a0e06c` ([`ownership-report.md`](ownership-report.md) item 2) |
| DRD-27 | active, revised on 2026-11-07 from the text at `6d5ba89e7`, implemented at `89995c27e` ([`ownership-report.md`](ownership-report.md) item 3). Amends `DRD-4`, `DRD-24` and the contract's DRI-9, DRI-10, DRI-13, DRI-17 and DRI-18 |
| DRD-28 | active, implemented at `039e8e153` ([`ownership-report.md`](ownership-report.md) item 1) |