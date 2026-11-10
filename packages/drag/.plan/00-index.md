# `@ydinjs/drag` record: decisions

The register for scope `drag`, under `repo:RD-1`: decisions are `DRD-n`, invariants `DRI-n`, owner decisions `DRO-n`. Numbering starts at 1. drag2's bare `D-` series is separate. To read one entry:

```sh
awk -v re="^#### DRD-1( —|$)" \
  '$0 ~ re {f=1;print;next} f && /^#{1,4} /{exit} f' \
  packages/drag/.plan/00-index.md
```

**Input:** the prototype read at `26f82fbb1`. That commit is on no ref now. Its `packages/drag` tree is byte-identical to `599684791` on `drag/prototype`, so later citations use `599684791`. Evidence: [`prototype-report.md`](prototype-report.md), [`probes/prototype/`](probes/prototype/README.md), [`probes/final-design/`](probes/final-design/README.md). The comparison and earlier evidence are in [`architecture-plan.md`](architecture-plan.md).

**Status, 2026-11-07:** production was built at `d7e7b0d3a` on `drag/production` and reviewed twice at that commit: a [review round](reviews/production/production-summary.md) and an [architecture challenge](reviews/architecture/production-design-challenge.md). `DRD-14` to `DRD-23` decide every finding and question from both. Where they change an earlier decision, its status row names the amendment. The required behavior is in [`contract.md`](contract.md). The [remediation](remediation-report.md) implemented them at `b91db2818`, and no independent review has read it yet. The owner's composition refactor at `3084191bb` and the implementer's findings on it are decided by `DRD-24` and `DRD-25`. `DRD-24` was revised to the owner's ownership model, and its [prototype](probes/session-owner/README.md) met it at `b54832a0e`. The owner approved its cost in `DRO-6`, and the [composition unit](composition-report.md) adopted it at `276947f82` and fixed the built-ins at `2506dcbb6`. The owner then split the kernel into modules at `bb644d6d7`, whose typecheck fails. `DRD-26` to `DRD-28` decide the ownership and lifecycle questions that the split exposed, and [`ownership-handoff.md`](ownership-handoff.md) implements them. The owner then required that the kernel know no lift, and `DRD-27` was revised on `6d5ba89e7`'s text before any of it was implemented. Their costs are `DRO-7`. The [ownership unit](ownership-report.md) implemented `DRD-26` to `DRD-28` at `039e8e153`, `433a0e06c` and `89995c27e`, and reported at `ff69cb8d7`. The architect read it at that commit: the three items conform, and its two instrument findings go to [`instrument-repair-handoff.md`](instrument-repair-handoff.md) (§Disposition of the ownership report). A third instrument finding is open as `DRF-1`. The combined review follows the instrument repair. On 2026-11-08 the architect proposed a change to the `Lift` in [`lift-representation-proposal.md`](lift-representation-proposal.md). With the owner's clarifications it is decided as `DRD-29`. [`lift-representation-handoff.md`](lift-representation-handoff.md) implements it, after repairing `DRF-2`, and reports its figures for `DRO-7`. The kernel's per-sample reading from the instrument repair stays open, apart from that unit. The [lift representation report](lift-representation-report.md) was read at `d258573fa`, in [`operation-lifetime-assessment.md`](operation-lifetime-assessment.md): `DRF-2` is closed, and `DRD-29` conforms except `DRF-3`, whose repair is that record's §3. The owner then proposed that `activate` return the behavior's operation, decided as `DRD-30`, which replaces that record's recommendation. [`activation-result-handoff.md`](activation-result-handoff.md) implements it after `DRF-3`'s repair, and its costs are `DRO-8`. `DRF-3` was repaired at `d7828a280`. `DRD-30` was implemented at `da139407e` and `3a67df0ea` and reported at `d99ebd304`. The architect read both at `d99ebd304`, in [`activation-result-assessment.md`](activation-result-assessment.md). `DRD-30` conforms, and is amended so that `freeDrag`'s motion belongs to its operation. `DRF-3` is closed, and `DRF-4` is open. That record's §6 is the remediation before the combined review. The owner then directed that `sortable` stop copying the `items()` array, decided as `DRD-31` from [`items-copy-assessment.md`](items-copy-assessment.md). [`items-borrowing-handoff.md`](items-borrowing-handoff.md) implements it. The owner approved the gate's revision in [`execution-boundary-assessment.md`](execution-boundary-assessment.md), decided as `DRD-32` with its cost in `DRO-9`. It was implemented from `8943f14e5` at `a8327a7c8`, inside `DRO-9`'s figures, and [`execution-boundary-report.md`](execution-boundary-report.md) reports it. The owner inspects it before any review. On 2026-11-09 the owner accepted closed, named capability slots for v1 from [`feature-composition-assessment.md`](feature-composition-assessment.md), decided as `DRD-33`, which amends `DRD-2`. The slot's charge is `DRO-10`, an accepted drop's landing into its target is `DRO-11`, and the `bounds` defect found there is `DRF-5`. [`feature-composition-handoff.md`](feature-composition-handoff.md) implements them. On the same day the owner withdrew the detached-call guarantee for `DraggableController` and let `draggable` return its `Gesture`, with one shared pass implementation. That is decided as `DRD-34` from the owner's uncommitted edit on `39af0ef44`, and [`gesture-receiver-handoff.md`](gesture-receiver-handoff.md) completes the edit. It was implemented at `fd7ae3e43` and reported at `03d1449e2`. The architect read both at `03d1449e2`, in [`gesture-receiver-assessment.md`](gesture-receiver-assessment.md): `DRD-34` conforms, and no cost is accepted. The owner inspects it before any review. Later that day the owner chose receiver-aware `requestStep` and `use` through one internal `CallbackList`, from the model at `9f885b9a9` on `drag/step-queue-model` and the owner's uncommitted edit on it. That is decided as `DRD-35`, which amends `DRD-34`, with its costs in `DRO-12`. [`callback-list-handoff.md`](callback-list-handoff.md) ports it to production. No combined review starts before the owner has read its report. It was implemented at `53c87f988` and reported at `f06a99c4f`, and the architect read the report at `2bec0c431` (§Disposition of the callback list report). The owner then chose the uncommitted `CallbackList` edit on `2bec0c431`, which inserts with `push` or `unshift` and runs with `pop`, decided as `DRD-36`. The owner also turned `@typescript-eslint/unbound-method` off for this package, decided as `DRD-37`, and clarified CONTRIBUTING so that `Drag` and `Lift` are types, decided as `DRD-38`. `DRO-12` is amended for `DRD-36`, and `DRO-13` asks about the other declarations. [`callback-list-completion-handoff.md`](callback-list-completion-handoff.md) implements the three decisions. No combined review starts before the owner has read its report. They were implemented at `50ed18a17` and reported at `36dbd55db`. On 2026-11-10 the owner accepted `DRO-12` and deferred `DRO-13`, and the architect read the report in [`callback-list-completion-assessment.md`](callback-list-completion-assessment.md): the three decisions conform. That record's §6 gives the revision, the scope and the open obligations for the combined review, which the owner directs next. The [combined review](reviews/combined-ownership/combined-ownership-summary.md) read `b01a0283d` and registered `DRF-6` to `DRF-18`. The owner had accepted `DRO-7` and `DRO-8` before it. The architect read it at `92fbb93e1`, after the owner's type-only `Fallible` commit, in [`combined-review-assessment.md`](combined-review-assessment.md) (§Disposition of the combined review). `DRF-4`, `DRF-5` and `DRF-11` are closed, `DRD-39` decides `DRF-10`, and [`combined-review-remediation-handoff.md`](combined-review-remediation-handoff.md) is the last unit before merge. That record's §7 lists the owner's remaining decisions. The remediation was implemented from `d1a262306` to `83f472624` and reported at `f2ac81bc5`, and a feature proof read it at `26919a938`. The architect read both at `26919a938`, in [`combined-review-remediation-assessment.md`](combined-review-remediation-assessment.md) (§Disposition of the combined review remediation). `DRF-6`, `DRF-8`, `DRF-9`, `DRF-10`, `DRF-12` and `DRF-16` are closed, and `DRD-39` is implemented. The proof's two title findings are `DRF-19`, owed before merge, and [`test-title-follow-up-handoff.md`](test-title-follow-up-handoff.md) repairs it. That record's §5 replaces the earlier §7 as the list of merge conditions and owner decisions.

**Status, 2026-11-10, after the merge:** the architect read the [test title follow-up report](test-title-follow-up-report.md) at `377264b3d` and the diff of `60680eb75`, and closed `DRF-19` (§Disposition of the test title follow-up). `drag/feature-composition` was squash-merged to `main` as `a9c323f6a` (#14). The six size rows stay red with unchanged budgets, as the pull request states. The record holds no answer to decisions 1 and 2 of [`combined-review-remediation-assessment.md`](combined-review-remediation-assessment.md) §5.2. On the same day the owner opened the runtime-performance phase on `drag/performance` from `a9c323f6a`: runtime speed first, bundle size second. `DRD-40` decides how it measures, [`performance-plan.md`](performance-plan.md) is its plan, and [`performance-instrument-handoff.md`](performance-instrument-handoff.md) is its first unit. That unit repairs `DRF-1` and `DRF-7`.

**Neither the prototype's approval nor the 2026-11-06 reading established a performance result.** `DRD-13` and `DRD-22` say what does.

## Decisions

#### DRD-1 — Single-pass control

**One `Session` record, with idle as its absence. `#running` refuses a nested pass, and one reader applies requests between steps, with precedence destroy, deferred steps, decision, next step.**

Foreign code runs synchronously inside DOM writes, and the independent model's commit order failed there (architecture plan §3). The prototype held this through the public API in three engines, in 10 scenarios. One decision slot replaces three because the first of cancel, fault and verdict always wins. FIFO between kinds of request is rejected. The two booleans `concluded` and `released` are accepted: nothing reads them as a phase, and the implementer may remove them.

#### DRD-2 — One public authoring API

**`draggable` is public, and `sortable` and `freeDrag` use only its public values and types. A behavior never receives the session. A built-in behavior and the lift are extended by capabilities: each declares a closed set of named slots, and a capability imported on its own fills one, with the properties C1 to C10 of `DRD-33`. A third party may fill a slot whose type is published. A new slot is a library decision, and its call-site cost on compositions that omit it is the owner's. There is no plugin list, no generic hook seam and no kernel hook. A whole behavior on `draggable` remains the way to get what no slot offers. The `axis` and `displacement` slots' interfaces are not published.**

Owner requirement, with possible Readymag use. The prototype showed no private kernel path was needed, and `Drag` has no reference to the session. Its additions are accepted: `command`, `handle` with `data-drag-ignore`, `settle` returning timing, `panel.use`, and `onEnd` carrying `request`. An axis seam stays out because no example wanted one, and adding it later breaks nothing. `createFrameTask` and `listenForInvalidation` stay private (CONTRIBUTING §4), because a behavior or a capability can write each in a few lines. A kernel frame hook is rejected for the same reason: every composition would pay for it.

**Amended 2026-11-09 by `DRD-33`,** on the owner's acceptance of closed, named slots for v1 with a whole behavior as the fallback (`DRO-10`). The rule used to end: "Extension is by whole behavior. No third-party `axis` or plugin seam is published." Its rationale used to keep "the landing policy" private beside `createFrameTask` and `listenForInvalidation`. The landing is now the `Landing` capability, whose type is published. The `axis` and `displacement` interfaces stay private for the original reason: no example wants one, and publishing them later breaks nothing.

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
- **The `Drag` is built when the session opens, as at `0dcb80fb1`.** Every member it has exists for every behavior, so its type is honest from construction. The kernel holds it under a kernel-internal type whose members are writable, declared in `src/kernel/drag.ts`, and assigns the object literal to it with no assertion. **`6d5ba89e7`'s construction at activation is withdrawn,** because it existed only to build the view first. **Corrected 2026-11-08:** this used to say "`type-fest` and `Writable` leave the package". That was a consequence of the code at the time, not a rule. CONTRIBUTING's TypeScript section prefers a `type-fest` utility over a handwritten type that does the same, and `DRD-29` applies it to this type.
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

- **Packaging.** The build is unbundled, so it writes `kernel/*.js` beside `shared/`. `package.json`'s `files` and `files.json`'s `clean.extras` list `kernel` as they list `shared`. **Corrected 2026-11-08:** this used to say "`type-fest` leaves the dependencies (`DRD-27`)". The package declares `type-fest` as `DRD-29` states.
- **The four assertions return as they were at `0dcb80fb1`.**
- **Tests change only where the layout requires it.** The size test's exact module list for `draggable` alone becomes the new graph. That list is the kernel's modules that have code, and still no lift, `box-quad`, sortable or landing module.

#### DRD-29 — The lift's displacement is private, and `land` composes the landing

**`Lift` keeps its acquisition snapshot, read-only and set once: `visual`, `box`, `rect`, `boxWidth`, `boxHeight`, `visualSpace` and `itemSpace`. It loses `translatedX` and `translatedY`. `land(x, y, timing?)` calls the timing with the private displacement and records the landing. `lift.js`'s value is the owner's class `Lifter`. Nothing else in acquisition, release, failed acquisition or the kernel changes.**

Decided on 2026-11-08 on the owner's clarifications. The reading, the questions and the rejected directions are in [`lift-representation-proposal.md`](lift-representation-proposal.md). Its first version is at `793bb6713`.

**The owner's clarifications:**

- `type-fest`'s utilities are preferred over equivalent handwritten types.
- The displacement becomes private, and `land` composes the landing.
- The goal is stable data that is immutable from outside, not a new object on every update. Private mutation and DOM writes are fine.
- The `Lifter` class stays.
- No incidental behavior change or performance cost is authorized.

**Public surface of `lift.js`.** This amends `DRD-27`'s public types and `DRD-28`'s export table:

| Values | Types |
| --- | --- |
| `Lifter`, a class with `constructor(window)`, `acquire(drag, visual?, box?): Lift` and a read-only `cancelLanding` | `Lifter`, `Lift`, and `LandingTiming` as a type re-export |

`Landing` is no longer exported. `createLifter` goes.

**Required properties:**

- **Only `translate` writes the displacement, and no public member exposes it.** It isn't an own property of the `Lift`. Every public member of the `Lift` is set in `acquire` and never written again.
- **`land(x, y, timing?)`:**
  - `x` and `y` are the viewport position of the visual's top-left;
  - `timing` is called once, when `land` is called, with the displacement and then `x - rect.x` and `y - rect.y`. Those are the arguments the built-ins pass now;
  - without `timing`, the default duration and easing apply;
  - when `timing` throws, nothing is recorded;
  - the last call wins, and without a call nothing lands;
  - **the record copies the timing's `duration` and `easing` at the call, and keeps no object that the caller or the timing returned.** So code that runs between `land` and the release can't change a recorded landing. Added on 2026-11-08 for `DRF-3`. At `89995c27e` the built-ins copied these values with a spread in `settle`.
- **The landing disposer reads the displacement at release,** as now. So a `translate` after `land` moves where the flight starts, as at `b5f5f4046`. Reduced motion and the restored position are read there too, as now.
- **`acquire`, the release, the failed-acquisition path and the composition rules are `DRD-27`'s, unchanged.** That includes "`acquire` as the first statement of `activate`", measuring `itemSpace` inside `acquire`, and the cancel of the running landing in its `finally`.
- **Types:**
  - `lift.ts` uses `type-fest`'s `Writable` wherever it needs a writable view of a read-only type, and writes no handwritten equivalent.
  - `KernelDrag` in `src/kernel/drag.ts` becomes `Writable<Drag<State>>` if that type checks at the kernel's generic sites with no new assertion. If it doesn't, the handwritten type stays and the report says why.
  - The package declares `type-fest` at `5.10.0`: in `dependencies` when an emitted declaration imports it, and otherwise in `devDependencies`.
- **No new cost on every sample.** `translate` allocates only its CSS string, also at a non-integer displacement. `DRF-2`'s repaired test has to show this.
- **A cost on every operation is reported, not accepted.** A private displacement record adds about one object header, by reading. It goes to the owner with `DRO-7`'s figures.
- **The kernel doesn't change,** apart from the `KernelDrag` type. The lift grep stays empty.

**Changes a consumer sees:**

- `Lift` loses `translatedX` and `translatedY`.
- `land(landing)` becomes `land(x, y, timing?)`.
- `createLifter(window)` becomes `new Lifter(window)`.
- `Landing` is no longer exported.

No change to event order, hooks, outcomes, the built-ins' landings or timing is intended.

**Rejected:**

- **A new immutable value on every update.** It allocates an object on every sample. The disposers would still need a mutable reference, and every caller would have to write the value back.
- **The operations on the `Lifter`.** A retained `Drag`'s step would act on a later operation, which `DRD-27` already rejected.
- **Moving the snapshot's caller-only members to the callers.** It changes the failed-acquisition path and gains only fewer members.
- **Computing the flight's geometry in `land`.** It changes a `translate` after `land`.
- **Keeping `Landing`, an object argument, or two argument forms.**

**Before implementation:** `DRF-2`'s repair, so that the per-sample property can be shown.

#### DRD-30 — `activate` returns the behavior's operation

**`Behavior` keeps what lasts as long as its controller: `threshold`, `admit`, `command` and `activate`. `activate(drag, state)` returns a `BehaviorOperation`, which holds the hooks `start`, `move`, `drop`, `settle` and `end` for that operation, or `null` to decline. The kernel keeps the operation `activate` returned, calls those hooks on it, and gives it to steps. The `Drag` loses `state`. The kernel names no lift and no behavior resource. `sortable` and `freeDrag` implement `SortableOperation` and `FreeDragOperation`.**

Decided on 2026-11-08 on the owner's proposal. It replaces [`operation-lifetime-assessment.md`](operation-lifetime-assessment.md) §2, where each hook forwarded through one nullable operation reference with an assertion. **The owner's terms:** nothing is published, so a public authoring change is allowed and compatibility is no reason to keep the current shape. The kernel stays independent of the lift and of behavior resources. The behavior need not acquire every resource or pass every resource to a constructor.

**Why it fits.** At `f40c32f32`, 16 of the 23 non-null assertions in the built-ins read a value that exists exactly from the end of a successful `activate` to the release (assessment §2). The kernel already runs `start` to `end` and gives a step its target only in that interval. A return value from `activate` is the type of that interval. The behavior never needs the operation outside it, so neither side holds a nullable reference to it.

**The contract.** Type parameters are illustrative. The implementer may arrange them differently if inference needs it, and reports why:

```ts
type Behavior<State, Verdict, Operation extends BehaviorOperation<Verdict>> = {
  threshold?: number;
  admit(event: PointerEvent): Admission<State> | null;
  command?(event: KeyboardEvent): Admission<State> | null;
  /** `null` declines quietly. A throw is a fault. Neither gets `start`. */
  activate(drag: Drag<Operation>, state: State): Operation | null;
};

type BehaviorOperation<Verdict> = {
  start?(): void;
  move?(): void;
  drop?(): ((signal: AbortSignal) => Verdict | PromiseLike<Verdict>) | null;
  settle?(outcome: Outcome<Verdict>): void;
  end?(outcome: Outcome<Verdict>): void;
};

type Drag<Operation> = {
  item: HTMLElement;
  pointerId: number;
  x: number;
  y: number;
  originX: number;
  originY: number;
  signal: AbortSignal;
  use(dispose: DragDisposer): void;
  requestStep(step: (operation: Operation | null) => void): void;
  requestCancel(reason?: unknown): void;
};

type DraggableController<Operation> = {
  requestStep(step: (operation: Operation | null) => void): void;
  requestCancel(reason?: unknown): void;
  requestDestroy(): Promise<void>;
  use(dispose: () => void): void;
};
```

- **`Admission` is unchanged.** Its `state` is passed to `activate` by identity, and the kernel never reads it.
- **`activate` is required,** because without it no operation exists.
- **The operation's hooks take no `Drag`.** An operation that needs the `Drag` keeps it from `activate`.
- **A step receives the operation `activate` returned,** from the end of activation until the drop or the decision, and `null` otherwise. This holds through the controller and through a `Drag`.
- **`draggable.js` also exports the type `BehaviorOperation`.** `lift.js` is unchanged.

**The lifecycle.** Every row keeps the order the kernel has at `f40c32f32`. Only where a hook lives changes.

| Case | What happens |
| --- | --- |
| Item disconnected at activation | `activate` isn't called. The operation is skipped quietly, as now |
| `activate` returns `null` | Skipped, unless a decision was already recorded, which then stands. No `start`, `settle` or `end`. The disposers `activate` registered run at release with the outcome |
| `activate` throws | A fault, unless a decision was already recorded. Released as above. An operation constructed before the throw never reaches the kernel |
| Partial acquisition | Each resource's release is registered with `drag.use` when that resource is acquired, before the next acquisition. Either `activate` or the operation's constructor may do this. The kernel never calls the operation to clean up. `BehaviorOperation` has no release member |
| A step requested during `activate` | Deferred. It runs after the step that called `activate`, and receives the returned operation if that operation is then active and undecided |
| A cancel during `activate` | Recorded. If `activate` returns an operation, `start` still runs, then `settle` and `end` with the cancel, as now |
| Destruction during `activate` | Applied after that step. `start` has run, and `settle` and `end` don't run (DRI-10) |
| Verdict | `drop` returns it, and the operation's `settle` and `end` receive its outcome. A completion behind a decision or after the end reaches nothing |
| After release | `end` runs as the next step, after every disposer. So the operation's resources are already released, and `end` uses only the outcome and its own values. A disposer added after release runs at once |

**Kernel requirements:**

- **One gate, one reader, its precedence, the three points where the slot is cleared, and DRI-9's order all stay** (`DRD-1`, `DRD-24`, `DRD-26`).
- **The session keeps the operation from `activate`'s return.** "`start` was reached" is the same as holding it. So the reference may replace `#started`, and no field holds both.
- **No new non-null assertion or cast in the kernel.** Where a phase test now guards a hook call, it may become a test of the reference only where the two agree. The report gives the argument for each such site.
- **Hooks are called as methods,** read when called: `admit`, `command` and `activate` on the behavior, and the rest on the operation.
- **Nothing per sample:** `move` is called with no argument. DRI-17 holds.
- **The admission's `state` is kept by the session until `activate`.** The kernel's one cast, `as State`, moves with it.
- `grep -rniE 'lift|landing' src/kernel src/draggable.ts` stays empty.

**The built-ins:**

- **Two classes in each built-in, both module-private.**
  - The behavior, `FreeDragBehavior` or `SortableBehavior`, keeps the controller-lifetime values that `DRD-20` lists, and admits and activates.
  - The operation, `FreeDragOperation` or `SortableOperation`, owns one activated operation: its `Drag`, its `Lift`, its resources, its transitions and its steps.
  - No base class is shared (`DRD-20`).
- **`activate` acquires the lift as its first statement** (`DRD-27`). In `sortable` it then pulls again and declines with `null`, before any operation exists.
  - The remaining resources may be acquired in `activate` or in the operation's constructor, in the order they have at `f40c32f32`, statement by statement.
  - That order is the placeholder and its removal, its insertion and check, the frame task and its cancel, the axis retirement, the invalidation listener, and then the axis invalidation.
- **No activation resource is nullable.** `insertion` isn't either. `request` may stay nullable, because a cancel before the drop has none. Whether `result` stays a field or is built in `end` is the implementer's choice.
- **The admission's `state` holds only what `activate` needs from the press:**
  - `freeDrag`: the visual, which needs no object;
  - `sortable`: the visual, the box and the direction. The admission's snapshot isn't kept, because activation pulls again.
- **Function identities follow `DRD-20`.**
  - Controller steps such as `invalidate` stay one per controller, and receive the operation or `null`.
  - A step or callback that belongs to the operation is created once per operation.
  - `moveTo` stays one step per call (`DRD-25`).
- **The operation doesn't own controller-lifetime state.** It receives the references it uses at construction. `sortable`'s collection version stays on the behavior.
- **Amended on 2026-11-08 at `d99ebd304`** ([assessment](activation-result-assessment.md) §2):
  - **The behavior keeps no state of an operation's.** A scratch buffer belongs to the object whose work writes it. The behavior keeps scratch only for its own admission and activation, and an operation writes no member of its behavior. `FreeDragOperation` owns its motion, as a private `{ x, y }` field.
  - **The operation may keep its behavior** and read, through it, configuration and collaborators that last as long as the controller. Each such member is `readonly`. No behavior member refers to an operation.
  - **Type arguments.** A class instance infers its operation. A literal behavior names `draggable`'s type arguments when its steps read its operation's own members or its hooks need the verdict's type. That is because a literal's unannotated `activate` fixes the operation type before its return is read, and the verdict occurs only in the operation's constraint. No type-parameter redesign is decided (assessment §4).
- **`SortableOperation` may serve as the `AxisQuery` and the `AxisContext`,** which would remove the context literal. That needs `AxisContext`'s internal `settle` member renamed, because it would collide with the hook. The implementer chooses, and reports the allocation either way.
- **Option callbacks receive what they receive now** (`DRD-25`).

**Changes a consumer sees:**

- the hooks after activation move to the operation that `activate` returns;
- `activate` is required, receives the admission's `state` and declines with `null`;
- `Drag` has no `state`, and a step receives the operation;
- `BehaviorOperation` is exported.

The built-ins' options and controllers don't change.

**Rejected:**

- **One nullable operation reference in `state`, with an assertion in each hook** (assessment §2). The owner's proposal removes both.
- **Hooks that also receive the `Drag`.** That gives each hook two ways to reach the same values, and typing the `Drag` inside a hook needs a self-referential type. It would let a behavior share one operation across activations. Without it, a behavior whose hooks need the `Drag` allocates its operation each activation. That cost is reported.
- **Keeping `drag.state`.** Only `activate` reads it. After activation it would be a second per-operation record beside the operation.
- **Steps that receive the `Drag`.** A controller step such as `invalidate` or `moveTo` would then reach the operation only through a field on `state`, which is the nullable forward this decision removes.
- **Different targets for a step through a `Drag` and one through the controller.** The step list would need a tag, which `DRD-6` excludes.
- **A release hook on the operation.** `drag.use` already orders every release, including a failed acquisition's. A second mechanism would split that order.
- **Any knowledge of the lift or of a behavior's resources in the kernel.**

**Costs: `DRO-8`.** None is accepted here, and timing stays deferred. **Before implementation:** the `DRF-3` repair ([`operation-lifetime-assessment.md`](operation-lifetime-assessment.md) §3), as its own unit. [`activation-result-handoff.md`](activation-result-handoff.md) implements this decision.

#### DRD-31 — `sortable` borrows the `items()` array, and saves the home gap at each pull it keeps

**`sortable` doesn't copy the array that `items()` returns. The operation keeps the array from activation, or from its last rebase, until the drop: this is the retained array. The consumer keeps it consistent under the rule in the contract's `DRI-14`. The operation saves the item's home gap at activation and at every rebase, from the same pull, and the landing reads only that saved gap. `DRD-25`'s `items()` copy bullet is superseded.**

Decided on 2026-11-08 on the owner's direction, from [`items-copy-assessment.md`](items-copy-assessment.md). **The owner's terms:** an option may carry an explicit expectation that the integrator leaves it unchanged, and aliasing alone does not justify a defensive copy (CONTRIBUTING §1.1 and §9). The API is unpublished, so the current tests and promises describe the design, and they don't forbid changing it.

**Why the copy is no longer needed.**

- **The admission pull is read only within its call.** No consumer code that can change the collection correctly runs between the pull and its reads.
- **After the drop, the landing's home was the only read.** It runs after `onReorder` may have changed the consumer's model. The witness "should land a canceled drag at home when the consumer reordered its own array" failed in three engines without the copy ([composition report](composition-report.md) line 59).
- **A cancel before the drop read the same home from the array.** That includes a synchronous `requestCancel()`, which applies before it returns (`DRI-1`).

A saved gap answers both of these reads with two element references and the index, from the pull that decided them. Every other read of the retained array happens in a step the library runs for the drag before the drop, and the consistency rule covers those steps.

**The home gap:**

- **At activation,** the gap the item occupies in the activation pull. A pointer operation's first insertion is that gap, and may be the same object. A command computes it beside its keyboard target.
- **At each rebase,** the gap in the new pull. It is assigned where the new pull becomes the operation's snapshot, before the item test, so a removed item's rebase saves what today's read at `settle` computes.
- **At `settle`,** a cancel or a reject that lands goes to the saved gap. No decision, verdict, release or destruction reads the retained array.

**The consistency rule.** The contract's `DRI-14` states it, and this is its reason. Whether the consumer changes the collection in place or by replacement depends on one condition: **can the library read the retained array before consistency is restored?** Here consistency means the array changed, the DOM showing the change, and `invalidate()` called.

- **Code the library runs inside one of its steps continues that step when it returns.** Examples are `onStart`, the placeholder factory, and listeners that the library's own DOM writes trigger synchronously. A command runs `start` and its drop in one synchronous pass, and the drop reads the retained array. So code in that position completes an in-place change before it returns, or replaces the array. A microtask is too late. An `invalidate()` called there is a deferred step, which runs before the library's next step (`DRI-2`).
- **Code outside the library's steps can complete in its microtasks.** Examples are an event handler, a timer, and an `await` continuation. The library reads a retained array only in steps that a frame, a pointer event, a request of the consumer's, or the drag's own sequence starts. Before the drop, no microtask of the library's reads it. So an `await` is not the criterion: what matters is whether a frame or pointer event can reach the library between the change and `invalidate()`.
- **`handle`, `visual`, `box` and the placeholder element's own callbacks run in the middle of a read.** No in-place change is made there.
- **Deferred rendering requires replacement.** The retained array is left unchanged, so it keeps matching the DOM until `invalidate()`.

**Outside the contract,** and not detected: an in-place change that the library can read before `invalidate()`, and a change during a drag without `invalidate()`. By reading, the operation may then resolve a wrong gap, propose a request whose `from` comes from the changed array (a command can become a no-op that way), or fault on an anchor outside the container.

**Preserved:**

- the cancel and reject landing before and after the drop;
- rebase, with a surviving gap rebased and a lost adjacency or a removed item cancelling;
- `DRI-14`'s activation decline, and a command's target from the activation pull;
- `DRD-30`'s `activate` order and every kernel order;
- the axis caches' rule that a version names a fixed list, which now holds under the consumer's rule rather than by the copy.

**Rejected:**

- **Keeping the copies.** Normal use doesn't need them once the home gap is saved, and the one integration style they protect has a findable alternative.
- **Capturing the home only at the drop.** A cancel before the drop would still read the array.
- **"One task, microtasks included" as the rule.** A command's drop follows `onStart` synchronously.
- **"Never change the retained array in place" as the rule.** It forbids synchronous in-place updates, which are correct and common, and buys nothing over the stated condition.

**Costs, by reading, not accepted here:**

- **Saved:** one array of `n` references per pull.
- **Added:** one `Insertion` per command activation and per rebase.
- **Unchanged:** nothing changes per sample or per frame.

The unit reports its size and allocation under CONTRIBUTING §15. No ceiling is re-based, and no timing is run. [`items-borrowing-handoff.md`](items-borrowing-handoff.md) implements it.

#### DRD-32 — Input enters the gate with its handler, and requests through one named entry

**`Gesture.enter(handler, event)` takes input only, and calls the handler's `handleInput(event)` as the pass's first step. A request fills its slot and calls `apply()`, which applies it now unless a pass is running. A step requested while idle, `apply()` and a verdict's fault share one private pass. Its optional first step is a function only where the work is one already: the consumer's step, or `raise`. The reader applies every request, including destruction requested while idle. Development builds count each refused event once. Pass execution stays the controller's.**

Decided on 2026-11-08 on the owner's approval of v3 from [`execution-boundary-assessment.md`](execution-boundary-assessment.md) §3, with its reported cost (`DRO-9`) and counting each refused event once. The prototype is [`probes/execution-boundary/`](probes/execution-boundary/README.md).

**Why.** The owner asked whether preventing nested passes and applying deferred requests deserve a separate owner, because `enter(fn, argument)` made `Gesture` and `Session` hand internal work to the gate as functions.

- **No separate owner.** The gate's state has the controller's lifetime, and its reader is where destruction, the deferred steps and the operation's decision meet. A separate owner would need a two-way interface with `Gesture` and wouldn't change how work is passed in (assessment §2).
- **The signature was the gap.** One `enter(fn, argument)` served four kinds of entry. So internal work had to be arrow fields, "no work" needed `NOOP`, "refused" meant "lost" for input and "deferred" for a request, and destruction requested while idle was applied outside the reader (assessment §1).

**The required properties,** G1 to G8 of the assessment's §3:

- **Input:** one gate, `enter(handler, event)`. A running pass or a closed controller refuses it. A throw from the work is a fault, the reader follows, and the gate reopens in `finally`.
- **`Gesture` and `Session` are each the platform's listener object and the gate's handler.** `handleEvent` runs outside a pass: it filters, and it turns `Escape`, `pointercancel` and `lostpointercapture` into requests. `handleInput` runs inside the pass and dispatches on `event.type` to private methods.
- **Requests:** `requestCancel`, the session's cancel, a verdict's acceptance and `requestDestroy` fill their slots and call `apply()`. It refuses nothing and counts nothing.
- **A step requested while idle is the first step of its own pass, and never enters the list.** Through the list it allocated on every sample (assessment §3, G4).
- **A verdict's fault** is raised at once in a running pass, and is otherwise the first step of a new pass.
- **One private pass** serves idle steps, requests and faults. `#running` is set there and in the input gate, and nowhere else.
- **The reader is unchanged:** its precedence, its catch on each turn, and a step's argument computed when the step runs.
- **The development count counts each refused event once.** A nested primary press during `activate` or `start` reaches the session's pending-press listener and the root's listener. It counts once, through a set that exists only in development builds.

**What this amends:**

- **`DRD-24`'s interface table.** From the session to the controller, the gate's row becomes "the input gate: `enter(handler, event)` runs the handler's `handleInput` as the first step of a new pass, or refuses". A row is added for `apply()`, which applies the requests now unless a pass is running and replaces `enter(NOOP, null)`. The handler interface has one method, in method syntax, and stays inside the kernel. Its required property "a step passed to the gate is a stable function" becomes: the gate receives no function for input, and the only function that opens a pass is the consumer's step or `raise`.
- **`DRD-26`'s member list.** The session reaches the controller through `enter`, `apply`, `raise`, `raiseInPass`, `detach` and `requestStep`.
- **`DRD-1`.** One reader applies every request, including destruction requested while idle, which used to tear down outside the reader.
- **`DRO-6`'s accepted cost.** The three functions per operation, `#move`, `#up` and `#endPending`, are no longer created.
- **The contract's `DRI-6`:** development builds count each event a running pass refuses once.

**Unchanged:** the public types, `DraggableController`, every other contract entry, the reader's precedence, and `raise` as an arrow field, because `runDragDisposer` receives it detached.

**Rejected,** in the assessment's §2 and §6: a separate pass owner, a receiver argument `enter(step, receiver, argument)`, a bracket at each call site, running all of `handleEvent` inside the gate, an idle step through the list, and four explicit brackets.

**Implementation.** One unit, recipient `implementer`, **based on `8943f14e5`** on `drag/production`.

- **v3's diff was written against `ef8c6cd96` and doesn't apply verbatim at `8943f14e5`.** That commit already makes `Gesture` the root's listener object: its `handleEvent` dispatches on `event.type` to `enter(this.#press, …)` and `enter(this.#command, …)`. The unit ports v3's properties onto it, and the dispatch belongs in `handleInput`.
- **One commit, with no test edited.**
- **Checks:** the suite in Chromium, Firefox and WebKit, the per-sample test, typecheck, and the handoff loop on each changed file.
- **Mutations,** each run, shown to fail, reverted and not committed, as the assessment's §7 lists: an idle step through the list, no per-event set in the count, `apply` refusing on a closed controller, and `enter` not refusing during a pass.
- **A report,** `execution-boundary-report.md`, with the diff, each mutation's failing assertion, and size and allocation at `8943f14e5` and after the commit, against `DRO-9`'s figures.
- **Not authorized:** timing, a re-based ceiling, or any test or instrument edit beyond the counting change.

The `unbound-method` gap in the assessment's §1, point 5, is a repository instrument question, and it isn't part of this unit.

#### DRD-33 — Capability slots extend the built-ins and the lift

**A host, which is `freeDrag`, `sortable` or the lift, declares a closed set of named, typed slots. A capability is a value imported on its own that fills one slot, and it meets C1 to C10 below. The landing animation leaves the lift and becomes the `Landing` capability, which `land` requires. `freeDrag` gains the `targets` slot, which `dropTargets()` fills. Its state for one operation is an object that operation holds. `freeDrag` invalidates its `bounds` at each activation. The kernel doesn't change.**

Decided on 2026-11-09, on the owner's acceptance of closed, named slots for v1, with a whole behavior as the fallback (`DRO-10`). The reading, the alternatives and the evidence are in [`feature-composition-assessment.md`](feature-composition-assessment.md), and the revised prototype is [`probes/feature-composition/`](probes/feature-composition/README.md) at `5cf267d6d`. **The owner's terms:** a lift without its landing animation, and drag and drop added to `freeDrag` with nothing charged to a composition that omits it beyond the slot's call sites. The terms also keep:

- one configuration reused across controllers;
- the single pass, the separation of requests from their effects, and resource ownership;
- CONTRIBUTING's class-encapsulation rule;
- the owner's closure-based `layoutAnimation`;
- no runtime readonly enforcement.

**Required properties of every capability and slot:**

|  | Property |
| --- | --- |
| C1 | **Closed slots.** A host declares each slot by name and type. One value fills a slot. There is no list of extensions, no registry, no runtime discriminator and no merge. A new slot is a library decision |
| C2 | **A slot value holds no controller or operation state.** It is one of three things: a stateless value, such as `landing()`; an installer that the host calls once per controller, such as `bounds()`; or a factory that the host calls once per operation, such as `dropTargets()`. So one configuration serves any number of controllers |
| C3 | **Inert installation.** An installer allocates. It attaches no listener, writes no DOM and acquires nothing that needs release. A per-operation factory acquires only what that operation releases (C4) |
| C4 | **Ownership by lifetime.** See below |
| C5 | **Single pass.** A capability's code runs only when its host calls it from a hook or a step, or in a step it requested through the operation's `requestStep`. It never opens a pass, listens for input or calls the gate |
| C6 | **Requests and effects.** A capability's foreign callback, such as a frame, only requests a step, and its effect runs in that step (DRI-8). **One exception:** a scroll or resize listener may set a staleness flag directly. A staleness flag only makes the next read measure again, so nothing observes the write before that read |
| C7 | **Tree-shaking.** The host names only the slot's type. A capability's code reaches a bundle only through the consumer's import. A composition that omits it pays only the host's call sites. Each new slot's call-site cost is measured and is the owner's to accept |
| C8 | **The hot path.** A capability reads no layout on a sample, and coalesces any spatial search to a frame (DRI-17). It allocates nothing per sample |
| C9 | **Types grant, and nothing enforces.** A capability receives the operation's `Drag` narrowed by type, such as `Pick<Drag, 'x' \| 'y' \| 'use' \| 'requestStep'>`. Nothing wraps or freezes it at runtime |
| C10 | **The kernel doesn't change.** `draggable alone` stays byte-identical |

**C4, ownership by lifetime.** It separates what an operation must release from what a controller may keep and reuse.

- **Operation references and resources are released with the operation.**
  - An operation reference is the operation, its `Drag` or its `Lift`, or an element pulled from the consumer for that operation, such as `items()` or `targets()`.
  - A resource is anything that needs release, such as a listener, a frame request, an animation, a placeholder, or an attribute or inline style the library wrote.
  - Each resource is released by a disposer registered with the operation's `drag.use` when it is acquired. When a capability calls consumer code after acquiring something, the release of that thing is registered before the call. So a throw from consumer code faults the operation under DRI-7, and the operation's release frees what was acquired.
  - **A controller-lifetime runtime never holds the operation, its `Drag` or its `Lift`.** It may hold an operation's elements only while that operation runs. The operation's release drops them, as `sortable`'s axis retirement empties its element array. It never keeps an operation's reference in a field that is `null` between operations and read with a non-null assertion.
  - A per-operation object, such as the drop-target tracker, may hold any of these. It becomes unreachable with its operation, and its release disposes its resources.
- **Reusable geometry caches are invalidated, not discarded.**
  - Numeric state derived from layout may live as long as the controller and be reused by later operations without being discarded, zeroed or reallocated. Examples are buffers, boxes, distances and staleness flags, such as `RectIndex`'s `Float64Array` and `bounds`' box.
  - What such a cache owes is validity. **No operation uses a value that was measured before that operation activated.** So the host invalidates the cache at activation, as `sortable` does for its axis, and the invalidation listener invalidates it during the operation.
  - Invalidating only marks the cache stale, and it releases nothing. Discarding or resetting numeric state at release is allowed and never required.
- **How a capability receives operation state.** Either the host passes it as arguments, as `sortable`'s axis receives its query and context, or the operation holds an object the capability created for it, as with `dropTargets`.
- **A controller-lifetime runtime that holds a resource** is disposed through the controller's `use`, registered in the factory that installed it (`DRD-25`).

**The landing capability:**

- **`Landing` is `{ timing, start }`.**
  - `timing(fromX, fromY, toX, toY)` returns `{ duration, easing }`, as `LandingTiming` did.
  - `start(visual, visualSpace, dx, dy, duration, easing, window)` starts the animation and returns its cancel, or `null` when nothing animates.
  - `landing(options)` returns one. Its `start` is the animation that `lift.ts` held: additive flight, separate elevation, and zero duration under reduced motion. It returns a new object per call, and holds no state.
- **`Lift.land(x, y, landing)` requires its `Landing`.** It calls `landing.timing` once and copies `duration` and `easing`. It keeps the `Landing` value, which is configuration under C2, and keeps no object that `timing` returned. When `timing` throws, nothing is recorded. The last call wins, and without a call nothing lands.
- **The lift's release disposer calls the recorded `Landing`'s `start` right after the release,** with the offset of the visual from where it lands, read at release as now. The `Lifter` keeps the returned cancel. Its next `acquire`, after measuring, and its `cancelLanding` both cancel it, as now.
- **The lift holds no animation code, no elevation constant and no default timing.** A lifted composition that composes no landing carries none of them.
- The built-ins pass `config.landing` as before, and call `land` only when a landing is composed.
- Custom behaviors import `landing` from `lift/landing.js`, as `free-drag/landing.js` and `sortable/landing.js` re-export it.

**The drop-target capability:**

- **`dropTargets({ targets })`** returns a `DropTargets`, `(drag: DropTargetDrag, window: Window) => DropTargetTracker`.
- **`freeDrag`'s `activate` calls it once per operation,** after acquiring the lift. The `FreeDragOperation` holds the tracker in a read-only private field, and nothing else holds it. `FreeDragBehavior` gains no field.
- **The factory runs in this order:**
  1. it allocates its state and the frame task, neither of which acquires anything;
  2. it registers its release with `drag.use`. The release cancels the frame and removes the mark;
  3. it pulls the consumer's `targets()`.
- **The tracker:**
  - `move()` only schedules the frame;
  - the frame's callback only requests a step, and the step measures the targets when stale, hit-tests `drag.x` and `drag.y` against the cached rects, and moves the `data-drop-over` mark;
  - `drop()` cancels the frame and resolves at once;
  - `invalidate()` sets the staleness flag;
  - `current` is the marked target, or `null`.
- **Invalidation reaches the operation.** The scroll and resize listener is the `FreeDragOperation`, through a `handleEvent` method that invalidates the bounds and the tracker. It is registered when `bounds` or `targets` is configured. The behavior's `invalidate` step receives the current operation under DRI-8, and reaches the operation's `handleEvent` as well as the bounds.
- **`FreeDragRequest.target`** is `HTMLElement | null`, so `onDrop` and `onEnd`'s result carry it. It is `null` without the capability.

**The `bounds` repair (`DRF-5`).** `freeDrag`'s `activate` invalidates `bounds` before its first read in the operation. That is C4 applied to an existing controller-lifetime cache. `bounds` holds no operation reference, so it needs no retirement.

**Settled here,** from the assessment's §9, so that none goes to the owner:

- **Choice 2, where custom behaviors import `landing`:** `lift/landing.js`. It follows the pattern of the two existing landing entries, and keeps `lift.js` a one-value entry.
- **Choice 3, `land` without a landing:** the argument is required. Without a call nothing lands, so an optional argument would be a second way to say the same thing. `DRD-29` already rejected two argument forms.
- **Choice 4, how a target is shown:** the `data-drop-over` attribute only, whose release the capability owns. A consumer callback would run consumer code once per frame, and its cleanup would be the consumer's. One can be added later without breaking anything. A third party that needs another presentation fills the slot with its own tracker.
- **Choice 6, how the targets' staleness is set:** directly, as `bounds` does, under C6's exception. A step per scroll event cost bytes on every composition in the first draft.
- **Choice 7, a scroll with the pointer still:** the mark is updated at the next sample, as `sortable`'s insertion is. A sample does no work without movement (DRI-17). **The drop is always correct:** `drop()` resolves at the release position and measures again after any invalidation.
- **Choice 8, published slot interfaces:** `Landing`, `LandingOptions` and `LandingTimingContext` from each landing entry. `DropTargets`, `DropTargetTracker`, `DropTargetDrag` and `DropTargetsOptions` from `free-drag/drop-targets.js`. `bounds.js` keeps exporting its types as now. The `axis` and `displacement` interfaces stay private (`DRD-2`).
- **Choice 9, `RectIndex`:** private fields read through getters typed as read-only views, as measured in [`rect-index.diff.txt`](probes/feature-composition/rect-index.diff.txt). CONTRIBUTING's class-encapsulation rule requires the change, and this is the form chosen. A closure is also allowed, but a class keeps the development check's access in one declaration.
- **Choice 10, names:** `targets`, `free-drag/drop-targets.js`, `dropTargets`, `target`, `data-drop-over`, `DropTargets`, `DropTargetTracker`, `DropTargetDrag` and `DropTargetsOptions`, as prototyped. They may change only for clarity.

**Returned to the owner:** choice 5, an accepted drop's landing into its target, is `DRO-11`. Choice 1, the slot's cost, is `DRO-10`.

**What this amends:**

- **`DRD-2`'s rule and rationale,** in place.
- **`DRD-27`:**
  - the table row "The landing after release": the release disposer calls the recorded `Landing`'s `start`;
  - the public types, through `DRD-29`'s.
- **`DRD-28`'s export table:**
  - `lift.js` exports `Lifter` and the types `Lift` and `Landing`;
  - `lift/landing.js` and `free-drag/drop-targets.js` are new entries.
- **`DRD-29`:**
  - `land(x, y, landing)` replaces `land(x, y, timing?)`;
  - `Landing` replaces `LandingTiming`;
  - the default timing leaves the lift;
  - the `DRF-3` bullet now reads: the record copies `duration` and `easing` at the call, keeps the `Landing` value that the caller passed, and keeps no object that `timing` returned.
- **The contract:** the vocabulary, the public surface, DRI-9, DRI-13, DRI-17, DRI-18, DRI-20, and the new DRI-21.

**Unchanged:**

- `DRD-25`. `targets` is not a controller-lifetime installer: its factory runs once per operation, and its state is the operation's.
- `DRD-1`, `DRD-30`, `DRD-32` and every kernel order.

**Rejected,** with reasons in the assessment's §2, §3.3 and §3.5:

- an open extension list on a behavior;
- drag2's `plugins`, fragments and `mergeFragments`;
- a capability that wraps the operation;
- a kernel hook for capabilities;
- a hit test on each sample;
- a default animation kept in the lift;
- runtime enforcement of what a capability may use;
- the first prototype's controller-held drop-target state, and its pull of `targets()` before registering the release;
- the first draft's per-sample hit test and step-routed invalidation.

**Costs:** `DRO-10` approves the slot's charge. Every other cost is reported and not accepted, and timing and optimization stay deferred. [`feature-composition-handoff.md`](feature-composition-handoff.md) implements this decision.

#### DRD-34 — `draggable` returns its `Gesture`, and one pass serves every entry

**`DraggableController`'s members are methods, and a caller calls them on the controller. `draggable` returns its `Gesture` typed as `DraggableController`. One private pass implementation serves input, requests, a step requested while idle and a verdict's fault, and internal work enters it with its receiver. The `sortable` and `freeDrag` controllers, `Lifter.cancelLanding`, steps and disposers keep their current calling rules.**

Decided on 2026-11-09 on the owner's direction, from the owner's uncommitted edit to `src/draggable.ts`, `src/free-drag.ts`, `src/free-drag/behavior.ts`, `src/kernel/gesture.ts` and `src/lift.ts` on `39af0ef44`. The architect read that edit and saved it as [`owner-edit.diff.txt`](probes/gesture-receiver/owner-edit.diff.txt) (SHA-256 `b65152c5…aed53`). Its typecheck output is [`typecheck.txt`](probes/gesture-receiver/typecheck.txt). [`gesture-receiver-handoff.md`](gesture-receiver-handoff.md) completes the edit.

**The owner's direction:**

- **The detached-call guarantee for `DraggableController` is withdrawn.** Its methods may require the controller as their receiver.
- **`draggable` may return the `Gesture` through that interface.** It no longer builds a separate record.
- **Keep the intent to share one pass implementation.** At `39af0ef44`, `enter` and the private `#run` each contain the same bracket: they set `#running`, run a first step whose throw is a fault, run the reader, and clear `#running` in `finally`.
- **Not in this decision:** receiver support for `requestStep` or `use`, automatic binding helpers, and any other change to how callbacks are represented. Existing call sites keep working without them.

**Required properties:**

1. **The public type.** `DraggableController`'s four members are declared as methods, as CONTRIBUTING's TypeScript section requires for a member that depends on its receiver. The JSDoc tells the caller to call them on the controller. No exported type names another `Gesture` member.
2. **What `draggable` returns.** It returns the `Gesture` instance. At runtime that object also has the members that the session calls. Only `Session` calls them, and calling them from consumer code is outside the contract (CONTRIBUTING §1.1). The session stays unreachable from the controller object, because `#session` is private.
3. **One pass implementation.** `#running` is set in one place. The bracket is written once, and every kind of entry runs through it:
   - **Input:** `Gesture`'s press and command, and `Session`'s sample, release and the primary press that ends a pending press. The work is a private method of the class that receives the event, and the pass calls it with that object as its receiver. No arrow field and no function per operation is created for this.
   - **A request that filled its slot:** `requestCancel`, the session's cancel, a verdict's acceptance and `requestDestroy`. It opens a pass with no first step when no pass is running. A running pass's reader applies it.
   - **A step requested while idle:** the first step of its own pass. It never enters the list (`DRD-32`, DRI-17).
   - **A verdict's fault while idle:** `raise` is the first step of a new pass, called on the controller.
4. **Refusal applies to input only.** A running pass refuses input, and that input is lost (DRI-6). After teardown, input is refused. **A request is never lost.** `requestDestroy` on an idle controller opens the pass whose reader tears it down. The controller being closed by that same request must not refuse it.
5. **The development count** counts each refused input event once, including a nested press that the session's listener and the root's listener both refuse (`DRD-32`, DRI-6). It counts no request and no step argument.
6. **A consumer's step is called with no receiver,** both as the first step of an idle pass and from the list. No step, `Drag` member, hook argument or disposer receives the controller or the session as `this`.
7. **Fault reports reach `raise` on the controller.** Wherever a disposer runs, a throw is reported once through `raise` called on the controller, and the walk continues to the next disposer (DRI-7, DRI-9, DRI-10). No function is created per disposer call or per report for this.
8. **Unchanged calling rules:**
   - **The `sortable` and `freeDrag` controllers** keep their members as function-type properties that work when detached. `requestCancel` passes its `reason` to the kernel unchanged.
   - **A step passed by identity stays one stable function** that works with no receiver. That includes `sortable`'s and `freeDrag`'s `invalidate` steps, so that DRI-8's coalescing by identity still holds.
   - **`Lifter.cancelLanding`** works when detached, as the contract's public surface says. It is passed to `use` as it is now.
9. **Lint.** No file-wide `unbound-method` suppression. At most one line-scoped suppression is allowed, with its reason, at the site that passes `raise` to the pass together with the controller as its receiver.
10. **Every other guarantee holds:** DRI-1 to DRI-10, DRI-17 and DRI-18, the reader's precedence, and `requestDestroy`'s one promise by identity. The per-sample test still passes.

**What this amends:**

- **`DRD-20`.** Its bullet "Controller methods don't depend on `this`" now applies to the `sortable` and `freeDrag` controllers. `draggable`'s controller is the `Gesture` instance, and its methods take it as their receiver. "The returned object is not the instance" now applies only to the built-ins' controllers.
- **`DRD-24`.** In the table of withdrawn restrictions, `draggable()` returns the `Gesture` instead of a separate object, so the controller's interface for the session is reachable at runtime and named by no exported type. The required property "Neither the controller object, a `Drag` nor any hook argument reaches the session or the controller's interface" now reads: no `Drag`, hook argument or step receiver reaches the session or the controller. The controller object reaches the controller's interface only at runtime. The session class itself stays unreachable.
- **`DRD-32`.** The input gate and the request entry become one entry into one shared pass. Internal work is passed as the caller's private method together with its receiver. That replaces `enter(handler, event)`, the `InputHandler` interface with `handleInput`, `apply()` and `#run`. **The rejection of "a receiver argument" in `DRD-32` and in the assessment's §6 is withdrawn,** on the owner's direction:
  - "One signature for four kinds of entry." Properties 3 to 5 now state each kind's rule.
  - "Binding by hand at every call site." Accepted for internal work. The work stays a method with no arrow field, which was `DRD-32`'s goal.
  - "The lint can't check private methods." Accepted: the receiver is passed at the call, so a private method passed this way is correct.

  `DRD-32`'s other properties stand. Its "`raise` as an arrow field" is withdrawn: `raise` is a method (property 7).

- **The contract's public surface.** "No controller method depends on `this`" is replaced (see its change record).

**Rejected:**

- **Keeping `raise` and the four controller members as arrow fields** next to prototype methods. The owner's direction is that the controller's methods take it as their receiver.
- **Extending the withdrawal to the `sortable` and `freeDrag` controllers, and to `cancelLanding`, in this decision.** The owner named `DraggableController`. Each built-in pays two closures per controller to keep its detached members (`requestCancel` and `requestDestroy`). Withdrawing that guarantee too would save them, and it is a separate decision for the owner.
- **A wrapper closure per call around `invalidate`.** It would break coalescing by identity under DRI-8.

**Cost.** By reading, a controller creates 5 fewer functions: the four public arrow fields and `raise`. `draggable` creates no separate record, and each built-in creates 2 closures. Nothing changes per operation or per sample. The owner has approved no size figure for this decision. The handoff measures each composition at `39af0ef44` and after the change, and reports the difference without re-basing.

**Amended 2026-11-09 by `DRD-35`.** Properties 6, 8 and 9 and the "Not in this decision" bullet are amended there. The text above is unchanged.

#### DRD-35 — `requestStep` and `use` take a receiver, and one `CallbackList` holds each list

**`requestStep` and `use`, on the controller and on a `Drag`, accept an optional receiver, which is an object, and call the callback on it. Steps coalesce by step and receiver. Each `use` call is its own registration. One internal class, `CallbackList`, holds each list as callback and receiver in adjacent slots. `CallbackList.queue()` makes a list whose `run()` calls its first entry, and `CallbackList.stack()` one whose `run()` calls its last, and `empty` says that no entry waits. `Gesture` keeps pass control and precedence.**

Decided on 2026-11-09 on the owner's direction, from the model at `9f885b9a9` on `drag/step-queue-model` and the owner's uncommitted edit on it. The architect read that edit and saved it as [`owner-edit.diff.txt`](probes/callback-list/owner-edit.diff.txt) (SHA-256 `a5b8feec…46358`). Its typecheck and lint output are [`typecheck.txt`](probes/callback-list/typecheck.txt) and [`lint.txt`](probes/callback-list/lint.txt). [`callback-list-handoff.md`](callback-list-handoff.md) ports the model and the edit to production.

**The owner's direction:**

- **Proceed with `CallbackList`,** in the shape `CallbackList.queue()` and `CallbackList.stack()`, `empty` and `run()`.
- **This architecture is chosen.** Alternative representations are deferred until a concrete cost warrants reconsideration. No further comparative prototype is made.
- **The per-list direction function is intentional.** Each list that `queue()` or `stack()` creates holds its own direction function. It is not replaced by a shared function, and it is counted in the allocation figures.
- **Record** receiver-aware `requestStep` and `use`, coalescing of steps by pair, and distinct disposer registrations.
- **Lint policy stays unchanged** for this unit.
- **The keyed model is not adopted.**
- **Timing stays deferred, and budgets stay unchanged.**

**Required properties:**

1. **Signatures.** `Drag.requestStep`, `Drag.use`, `DraggableController.requestStep` and `DraggableController.use` each have two overloads:
   - the callback alone, which declares `this: undefined`;
   - the callback and a receiver of a type `Receiver extends object`, where the callback declares `this: Receiver`.

   A callback that declares a receiver is refused without one, and a receiver of another type is refused. The argument types stay separate: a step receives `Operation | null`, an operation disposer `Outcome | null`, and a controller disposer nothing. **The receiver is an object or absent at every internal signature too:** `Gesture`'s members and `enter`, the session's `Drag`, `CallbackList` and `runDragDisposer`. No signature takes an `unknown` receiver. `DragDisposer` stays exported.

   _Why `object`:_ the owner's edit types the internal receiver as `object | undefined`, and `undefined` is the list's marker for no receiver. A public `Receiver` with no constraint would admit a primitive that no internal type describes, and nothing needs one.

2. **Calling.** A callback passed with a receiver is called on that receiver on every path: a step requested while idle, which is the first step of its own pass; a step from the list; a disposer in a release walk or in teardown; and a late `use`, which runs at once. A callback passed alone is called with no receiver. The kernel supplies no receiver of its own.
3. **Steps coalesce by pair.** A step requested during a pass is dropped when the same step is waiting with the same receiver, or with none when none is passed. The same step with a different receiver, or with a receiver against none, is a separate entry. An entry is removed before its step is called, so a step that requests its own pair again is added again. Request order is kept. A step requested while idle runs at once and enters no list (DRI-17).
4. **Disposers are distinct registrations.** Every `use` call adds an entry, whether or not the same pair is waiting, so the same pair registered twice runs twice. A walk runs last in first out, runs every disposer whatever another one throws, and reports each throw once through `raise` called on the controller. **A late `use` runs its disposer at once,** and is not added and then walked, because a nested walk would run the remaining disposers before the rest of the disposer that added it.
5. **`CallbackList`.** One internal class in `src/kernel/callback-list.ts`. No entry exports it.
   - It keeps each entry as a callback and a receiver in two adjacent slots of one private array, so an entry allocates no object.
   - It is created only by `CallbackList.queue()` and `CallbackList.stack()`. Its constructor is private.
   - **Each factory call creates that list's own direction function,** which `run(argument)` calls. `queue()`'s removes the first entry and calls it, and `stack()`'s the last. There is no shared function, no direction flag and no branch on direction in `run`.
   - `empty` is true when no entry waits. `run` is called only when an entry waits. `has(callback, receiver)` checks for a pair apart from insertion, `add` always appends, and `clear` drops every entry.
   - The list decides nothing about when or whether its entries run, and handles no throw.
   - **Three instances:** `Gesture`'s steps, made by `queue()`; `Gesture`'s controller disposers, made by `stack()`; and each `Session`'s operation disposers, made by `stack()`.
6. **`Gesture` keeps pass control.** The reader's precedence is unchanged: destruction, deferred steps, the decision, the next step. The reader runs one step per turn with `run`. Teardown clears the steps and walks the controller disposers. **`DRD-6`'s stop condition holds:** one reader, one kind of entry in each list, nothing tagged and nothing reordered. The receiver is the receiver of the call, not a tag.
7. **The built-in call sites.** `sortable` passes its capabilities with their receivers, as the model does: `drag.requestStep(this.axis.invalidate, this.axis)`, `drag.use(this.axis.retire, this.axis)` and `kernel.use(displacement.retire, displacement)`. `#invalidateGeometry`, `#retireAxis` and the wrapper around `displacement.retire` are removed.
   - **`InsertionGeometry.invalidate`, `InsertionGeometry.retire` and `DisplacementSink.retire` declare their `this`,** so the overload without a receiver refuses them, and removing the receiver at one of these sites fails typecheck. _Why:_ the model's mutations C11 to C13 removed that receiver and kept the line's lint disable. Only a spy test failed, because the built-in axes and sink never read `this`. The declaration is type-only.
   - **Every other step and disposer keeps its form,** including `sortable`'s and `freeDrag`'s `invalidate` and `moveTo` steps (`DRD-34` property 8), `cancelLanding`, `placeholder.remove` and `frame.cancel`.
8. **Lint.** The lint configuration and policy are unchanged. `@typescript-eslint/unbound-method` reports a method passed with its receiver, because it doesn't read the second argument. Each such site carries one line-scoped disable with its reason, and no file has a file-wide disable. `CallbackList`'s own types pass lint without a disable, so the `Function` type is not used.
9. **Every other guarantee holds:** DRI-1 to DRI-10, DRI-17 and DRI-18, `DRD-16`'s scope, `DRD-34` as amended below, and `requestDestroy`'s one promise. Nothing is allocated per sample or per step requested while idle, and no object per entry. The per-sample test passes.

**What this amends:**

- **`DRD-34` property 6** now reads: a step or a disposer passed alone is called with no receiver, and one passed with a receiver is called on that receiver. The kernel supplies no receiver of its own, so no step, `Drag` member, hook argument or disposer receives the controller or the session as `this` unless a caller passes it.
- **`DRD-34` property 8's** "A step passed by identity stays one stable function that works with no receiver" applies to a step passed alone. A step may also be a stable method passed with a stable receiver, and then it coalesces by the pair.
- **`DRD-34` property 9** also allows one line-scoped `unbound-method` disable, with its reason, at each site that passes a method with its receiver (property 8 above).
- **`DRD-34`'s "Not in this decision"** bullet, on receiver support for `requestStep` and `use`, is superseded by this decision. Automatic binding helpers stay out.
- **`DRD-16`'s** "the list still holds untagged functions" now reads: the list holds steps with their receivers, untagged by operation. Its reasoning is unchanged.
- **The contract's** public surface, DRI-8, DRI-9 and DRI-10 (see its change record).

**Not adopted:**

- **The models' recommendations.** `packages/drag/.plan/step-queue-model.md` and `callback-list-model.md` at `9f885b9a9` recommended against a queue object and against a shared list. The owner's choice supersedes them. The owner puts one stated ownership of callback lists ahead of the bytes those reports measured, and `DRO-12` reports the bytes of the version chosen.
- **Deferred, not rejected:** step and receiver pairs inline in the controller's array (`454d7412d`), and the `StepQueue` (`72ae8d715`), both on `drag/step-queue-model`. **What reopens the representation:** a cost under `DRO-12` that the owner declines, or a timing reading, once timing is taken, that attributes a regression to the list. Until then no comparative prototype is made.
- **Rejected on the owner's direction:** the keyed model at `732c7a8df` on `drag/step-key-model`, `requestStep(step, key = step)`. Its branch stays as a record.

**Cost.** `DRO-12`. The model's figures at `d50e4b67a` were +338 to +362 B minified and +102 to +119 B Brotli over `25a67d4a9`, and +32 B retained per operation. They measured a different version, with `runFirst` and `runLast` and no per-list direction function, so they don't establish this version's costs.

**Amended 2026-11-09 by `DRD-36` and `DRD-37`.** `DRD-36` replaces property 5's direction function and supersedes the owner's direction that kept it. `DRD-37` supersedes property 8. The text above is unchanged.

#### DRD-36 — A `CallbackList` inserts at its kind's end and runs from the array's end

**Each list holds the name of the array method it inserts with. `CallbackList.queue()` makes a list that adds with `unshift`, and `CallbackList.stack()` one that adds with `push`. `run` is the same for both: it removes the last entry with `pop` and calls it. No list holds a function of its own.**

Decided on 2026-11-09 on the owner's direction, from the owner's uncommitted edit to `src/kernel/callback-list.ts` on `2bec0c431`. The architect saved it as [`insertion-edit.diff.txt`](probes/callback-list/insertion-edit.diff.txt) (SHA-256 `8b3b9b97…ff58`) and checked it with the edit in place, changing nothing ([probe README](probes/callback-list/README.md#the-owners-insertion-edit-as-read-for-drd-36)). Typecheck, `oxlint` and ESLint pass, and the list, request, release and `classes` tests pass in Chromium. [`callback-list-completion-handoff.md`](callback-list-completion-handoff.md) completes and commits it.

**The owner's direction:**

- **The current uncommitted `CallbackList` is chosen:** insertion by `push` or `unshift`, and one `pop`-based run.
- **It replaces the per-list direction function** that `DRD-35` required.
- **No alternative prototype, no timing, and no budget re-base.**

**Required properties:**

1. **Insertion decides the order.** `queue()` gives the private constructor `'unshift'` and `stack()` gives it `'push'`, and the list keeps that name in a private read-only field. `add` inserts the callback and its receiver with that method in one call, so they stay adjacent and in that order. A queue holds its newest entry first, and a stack holds it last.
2. **One `run` for both.** `run(argument)` removes the receiver and then the callback from the end of the array, and calls the callback on the receiver. So a queue runs its oldest entry and a stack its newest. `run` doesn't branch on the kind, and it is called only when an entry waits.
3. **No function per list.** The factories create no closure, and a list holds no function. The method's name is a string literal, so a list is its object and its array.
4. **Unchanged from `DRD-35` property 5:** callback and receiver in two adjacent slots of one private array, with no object per entry; the private constructor and the two factories; `empty`; `has`, which finds a pair whatever the order; `add`, which always adds; `clear`; removal before the call, so a throw leaves the list consistent; a list that decides nothing about when its entries run and handles no throw; and the three instances.
5. **A step that requests its own pair again while it runs** is added as a new entry. In a queue it runs after every entry already waiting, as before.
6. **The comments state this representation.** The class comment and `add`'s JSDoc say where each kind inserts and that `run` takes the last entry. No comment says that a list holds a direction function, or that `add` appends for both kinds.
7. **Every other property of `DRD-35` holds,** as `DRD-37` amends it. DRI-8, DRI-9 and DRI-10 are unchanged.

**What this amends in `DRD-35`:**

- **Its direction "The per-list direction function is intentional"** is superseded by the owner's later choice.
- **Property 5's third bullet,** the per-list direction function, is replaced by properties 1 to 3 above.
- **Property 5's fourth bullet:** "`add` always appends" now reads "`add` always adds".

**Not adopted:** the per-list direction function implemented at `53c87f988`. The representations that `DRD-35` deferred stay deferred, on the same conditions. This decision compares nothing and reopens nothing.

**Cost.** `DRO-12`, as amended. By reading, a list loses its direction function. A queue's `add` now moves the waiting entries, where the previous version's `run` moved them. Timing stays deferred, so nothing measures that.

#### DRD-37 — `@typescript-eslint/unbound-method` is off for `packages/drag`

**ESLint doesn't apply `@typescript-eslint/unbound-method` to `packages/drag`'s TypeScript files, and no file in the package carries a directive for it. Every other package keeps the rule at `error`.**

Decided on 2026-11-09 on the owner's direction: disable the rule only for `packages/drag`, and remove the package's suppressions that this makes obsolete. The repository's configuration and `CONTRIBUTING.md` are unchanged.

_Why, as the architect reads it:_ `DRD-34` and `DRD-35` make passing a method with its receiver part of the package's API, for internal work through `enter` and for consumers through `requestStep` and `use`. The rule doesn't read the receiver argument, so it reports every such call, and each call needed a disable that restated it.

**Required properties:**

1. **Where.** The setting is in `packages/drag/eslint.config.ts`, the configuration that the package's `just lint` and `just lint-fix` load. It is a block after the shared configuration, scoped to the package's TypeScript files, with a comment that gives the reason and cites `drag:DRD-37`. The root `eslint.config.ts`, `.oxlintrc.json` and every other package's configuration are unchanged.
2. **Its reach.** With the package's configuration, `eslint --print-config` gives the rule as off for a file in `src/`, in `tests/` and in `.plan/probes/`. With another package's configuration, for example `packages/core`'s, it still gives `error` for that package's files.
3. **No directive remains.** No `eslint-disable`, `eslint-disable-next-line` or `eslint-enable` comment in `packages/drag` names `@typescript-eslint/unbound-method`. Every directive for another rule stays. The package's lint reports no unused directive.
4. **The types still guard the built-in sites.** `DRD-35` property 7 holds: `InsertionGeometry.invalidate`, `InsertionGeometry.retire` and `DisplacementSink.retire` declare their `this`, so removing the receiver at one of `sortable`'s three sites fails typecheck. The overloads without a receiver keep `this: undefined`.

**Clarified 2026-11-10,** from the completion's M8 ([assessment](callback-list-completion-assessment.md) §4): property 3 is checked by reading lint's output. ESLint reports an unused directive as a warning, which is its default and is not set in any configuration, so `just lint` exits with status 0 with one. Making it fail lint is a repository question, outside this decision. The properties are unchanged.

**Accepted consequence:** in `packages/drag`, lint no longer reports a method read without its receiver. Typecheck reports it where the method declares `this`, and otherwise only a test can. The root configuration's reason for enforcing the rule still governs every other package.

**What this amends:**

- **`DRD-34` property 9** is superseded: the package has no `unbound-method` directive.
- **`DRD-35` property 8** is superseded, except its last sentence: `CallbackList`'s types pass lint without a disable and don't use the `Function` type.
- **`DRD-35`'s direction "Lint policy stays unchanged for this unit"** applied to that unit, which is complete.

#### DRD-38 — `Drag` and `Lift` are types of values the library creates

**`Drag` and `Lift` are declared with `type`, as shapes wrapped in `Readonly<>`, and not as interfaces. The library creates both and gives them to a behavior, and no other code is expected to implement them.**

Decided on 2026-11-09 on the owner's direction, applying CONTRIBUTING's TypeScript section as the owner clarified it at `2bec0c431`. An interface is a contract that other code is expected to implement. The shape of a concrete value that the library creates and gives to callers is a `type`, also when it has function members. Neither the presence of methods nor lint behavior decides the kind.

**Required properties:**

1. **The declarations.** `Drag<Operation = unknown>` in `src/kernel/drag.ts` and `Lift` in `src/lift.ts` are `type` aliases of an object type wrapped in `Readonly<>`. The member-level `readonly` modifiers, which `Readonly<>` makes redundant, are dropped. Members, overloads, the generic default and JSDoc are otherwise unchanged.
2. **No new promise about the members.** They stay declared as methods. This decision doesn't promise that a member of a `Drag` or a `Lift` works when detached, and the contract still doesn't.
3. **Every user typechecks without change:** `KernelDrag<Operation>` as `Writable<Drag<Operation>>`, which the session writes; `DropTargetDrag`'s `Pick`; `Behavior.activate`; the built-ins; and the tests. The declaration tests that assert what a `Drag` lacks still pass. The public entries export the same names.
4. **No other declaration changes kind in this unit.** `DRO-13` puts the others to the owner.

**What this amends:** the contract's public surface, which now says that `Drag` and `Lift` are values the library creates (see its change record). A consumer could augment an interface by declaration merging, and can't augment a type, so the change is recorded there.

**Cost:** none in bytes, because types emit nothing.

#### DRD-39 — A type that a published signature names is exported from an entry

**Each type that a published signature names is exported from the entry that publishes the signature. The exception is the installer types of the `axis` and `displacement` slots, which stay unpublished.** In this package that adds `VerdictAwaiter` to `draggable.js`, and `DragAxis`, `FreeDragSubject` and `ResolveHome` to `free-drag.js`.

Decided on 2026-11-10 by the architect, on `DRF-10` from the combined review ([assessment](combined-review-assessment.md) §3).

**Why:**

- **CONTRIBUTING §4's test is met.** An author who writes a class operation under `DRD-30` writes `drop()`'s return type, as both built-in operations do. A consumer who types a `home` callback or an `axis` value apart from the call writes the other three.
- **Only surface is added.** Types emit nothing. The published signatures already fix these shapes, so the export adds a name and makes no new promise.
- **The alternative costs more.** It would inline the types and record the names as unpublished. Authors would then repeat a function type that the library's own operations name, and DRI-18 would need an exception for the operations that the README offers as the model.
- **The installers keep `DRD-2`'s reason, as `DRD-33` amended it.** No example wants a third-party axis or displacement, and publishing later breaks nothing. A consumer passes what `y()`, `xy()` or `layoutAnimation()` returns, and never writes the installer type.

**Required properties:**

1. **The exports.** `draggable.js` exports the type `VerdictAwaiter`. `free-drag.js` exports the types `DragAxis`, `FreeDragSubject` and `ResolveHome`. No name changes.
2. **DRI-18 holds without an exception.** `sortable` and `freeDrag` import `VerdictAwaiter` from `draggable.ts`. Outside `src/kernel/`, only `src/draggable.ts` imports from `kernel/`.
3. **The instrument.** `typedoc` for this package warns only about `AxisInstaller` and `DisplacementInstaller`.
4. **A witness.** A declaration test imports each new export from its entry. Removing one export fails typecheck.
5. **Published JSDoc.** Each new export has a JSDoc that says what it is.

**What this amends:** the contract's public surface (see its change record). **Cost:** none in bytes. [`combined-review-remediation-handoff.md`](combined-review-remediation-handoff.md) item 1 implemented it at `d1a262306`.

#### DRD-40 — The performance phase measures before it optimizes, and a reading decides each change

**No production change is made for speed or size before the instruments are repaired and proven and a baseline is recorded. After that, each change is accepted on a same-session reading against the baseline commit. Runtime comes first and bundle size second.** [`performance-plan.md`](performance-plan.md) applies this decision.

Decided on 2026-11-10 by the architect, on the owner's request to open the runtime-performance phase on `drag/performance` from `a9c323f6a`.

**Why:**

- **The instruments can't show a result today.** `DRF-1` and `DRF-7` are open, the last `--prove` run was at `b91db2818`, and the kernel's per-sample test passes or fails by how it is launched ([`instrument-repair-report.md`](instrument-repair-report.md) §Item 1). An optimization measured with them could not be told apart from noise or from a broken selection.
- **The detection floor is not known at the size of a likely optimization.** At `b91db2818` production's script time was about 192 µs per move and 2.5 ms per cycle at 20 items, against A/A bounds of 44 µs and 387 µs ([`2026-11-07-compare.json`](measurements/2026-11-07-compare.json)). The proof injected 1 ms per cycle and about 900 µs per move. A 10 % saving is below both bounds, so the floor must be measured before a "no difference shown" or a "faster" can be read.
- **`DRD-13` and `DRD-22` already require same-session, paired readings with a noise control.** This decision applies them to optimization, where the "before" arm is the baseline commit and not drag2.

**Required properties:**

1. **Order.** The instrument unit ([`performance-instrument-handoff.md`](performance-instrument-handoff.md)) comes first, then the baseline, then optimization units. Each optimization unit is one bounded change with its own reading.
2. **A result is a verdict of the unchanged `judge`.** It compares the candidate with the baseline through `compare.ts --before <baseline commit>` in one browser process, with the A/A control. "No difference shown" is not a result in either direction. A row's verdict is read against that row's measured detection floor.
3. **Thresholds, rules and budgets don't move with a reading.** This covers the per-sample test's `< 16`, the bytes rule's 16 B per function, `judge`'s sign counts and A/A bounds, every size ceiling and control figure, and the instrument's scenarios. A change to any of them is a decision in this register that names the reading it rests on, made before the change lands. `DRO-4` holds the size re-base, and the owner decides it.
4. **Raw readings are kept.** Every run whose figures a report uses is saved unedited under `measurements/`, with the commit, the Chrome and Node versions, the CPU count and the load average before and after. A discarded run is kept and labeled with the reason.
5. **Sensitivity is demonstrated, not assumed.** Each judged row type has a detection floor from graded injected regressions, recorded with the instrument that measured it. The floor is measured again when the instrument, the judge or the machine changes. `DRD-23`'s rule for an instrument repair still applies.
6. **Runtime first.** A size change that costs runtime on a hot path, as CONTRIBUTING §0 and §14 define it, is reported to the owner and not taken by default. A size change is measured with `bench/size/measure.ts` and with the timing rows it could affect.
7. **Correctness and ownership hold.** An optimization keeps the contract's invariants and the ownership decisions (`DRD-24`, `DRD-26`, `DRD-27`, `DRD-33`): what the kernel, a behavior, its operation and the lift each own doesn't move. A change that needs to move one is a decision first. The three-engine suite passes with only the known failures.

**What this amends:** `DRO-4`'s timing deferral ends, because the owner asked for timing. `DRD-23`'s instrument rule is unchanged and applies to every instrument change in the phase.

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

## Disposition of the callback list report

The [callback list report](callback-list-report.md) at `f06a99c4f`, on the implementation at `53c87f988`, read against [`callback-list-handoff.md`](callback-list-handoff.md). **Method:** the architect read the report, `callback-list.ts`, `drag.ts` and the session's `Drag` at `2bec0c431`, and ran the checks in the [probe README](probes/callback-list/README.md#the-owners-insertion-edit-as-read-for-drd-36) with the owner's insertion edit in place. The architect ran no suite or mutation at `53c87f988`, and didn't review the rest of the code. Those results are the implementer's.

| Item | Disposition |
| --- | --- |
| Gaps L1 to L9 | Closed as reported. Typecheck passes at `2bec0c431` with the owner's later edit in place, which covers L1 to L5. The comments that L9 required are superseded where `DRD-36` changes the representation |
| `Gesture.requestStep`'s third overload, which the session's `Drag` calls to forward a step with its receiver or with none | Ratified. `DraggableController` doesn't declare it, so no exported type names it (`DRD-34` property 1) |
| The duplicate test's changed assertion | Ratified. A list has one order, so the test runs a queue three times |
| M4 and M5, which mutated the direction functions | Done at `53c87f988`. `DRD-36` removes those functions, so the completion handoff restates them on the insertion method |
| Finding 1: four size rows that passed at `25a67d4a9` fail at `53c87f988`, and three failing rows fail by more | `DRO-12`. Those figures measure the direction-function version. The completion handoff measures `DRD-36`'s version. Nothing is re-based |
| Finding 2: the contract's sketch types the overloads without a receiver with no `this` | Confirmed. The contract is corrected to `this: undefined`, as `DRD-35` property 1 and the code have it. The contract's change record states it |
| Finding 3: `DragDisposer` is exported and no signature uses it | **Decided: it stays exported and unchanged,** as `(outcome: Outcome \| null) => void`. A value of that type is accepted by `Drag.use`'s overload without a receiver. Removing or changing an export is a change to the public surface, and no decision asks for one |
| The report says that `just lint` reports nothing in `src/` and `tests/` | Accurate, but the package's `just lint` exits with status 1 at `f06a99c4f`, because `oxlint` lints `.plan/` and reports three errors in [`allocation.ts`](probes/callback-list/allocation.ts). The handoff required that lint pass. The report disclosed the errors. The completion handoff repairs the probe |
| A used stack retains about 70 B more than a used queue | An observation, not a `DRO-12` figure. `DRD-36` changes how a queue inserts, so the completion handoff measures it again as an observation |

**Unresolved at this commit:** `DRO-12`, as amended, and `DRO-13`.

## Disposition of the callback list completion report

The [completion report](callback-list-completion-report.md) at `36dbd55db`, on the implementation at `50ed18a17`, read against [`callback-list-completion-handoff.md`](callback-list-completion-handoff.md). The reading, the checks the architect repeated and the status for the review are in [`callback-list-completion-assessment.md`](callback-list-completion-assessment.md).

| Item | Disposition |
| --- | --- |
| Items 1 to 6, `DRD-36` to `DRD-38` | Conform |
| Deviation 1: the package's tsconfig includes the allocation probe | Accepted, as the owner authorized. A later `.ts` file under `.plan/` needs its own entry, or the package's lint fails |
| Deviation 2: two comments in `callback-list.declaration.test.ts` | Accepted. No assertion changed |
| `run`'s JSDoc, changed under item 1 and not listed as a deviation | Accepted. A comment only, and it agrees with `DRD-36` property 6 |
| M1 to M7 | Fail their named checks, as reported |
| M8 and finding 1: an unused directive is a warning, and lint exits with status 0 | `DRD-37` conforms. Its property 3 is clarified as checked by the output |
| Finding 2: size | `DRO-12`, accepted by the owner on 2026-11-10. Nothing is re-based |
| Finding 3: ESLint would also have failed on the probe at `f06a99c4f` | Confirmed. The row in §Disposition of the callback list report names only `oxlint`, and is left as written |

**Unresolved at this commit:** nothing from this unit. The obligations before merge are in the assessment's §6.

## Disposition of the combined review

The [round summary](reviews/combined-ownership/combined-ownership-summary.md) at `7afece05a`, on `b01a0283d`, read by the architect at `92fbb93e1` in [`combined-review-assessment.md`](combined-review-assessment.md). That record gives each reason.

| Item | Disposition |
| --- | --- |
| `DRF-4`, `DRF-5` | Closed at `b01a0283d` on the reviewer's result |
| `DRO-7`, `DRO-8` | Accepted by the owner on 2026-11-10, before the round. The entries now record it |
| [`callback-list-completion-assessment.md`](callback-list-completion-assessment.md) §6 | Corrected in the assessment's §2, and left as written: `DRO-7` and `DRO-8` are accepted, the instrument repair's item 2 is `DRF-7`, and the kernel's per-sample reading is closed as a cost under `DRO-7` |
| `DRF-6`, `DRF-8`, `DRF-9`, `DRF-12`, `DRF-16` | Required before merge. [`combined-review-remediation-handoff.md`](combined-review-remediation-handoff.md) |
| `DRF-10` | Decided by `DRD-39`. Required before merge, in the same handoff |
| `DRF-11` | Closed at this commit. The contract's DRI-9 now states `DRD-27`'s rule |
| `DRF-7` | Deferred with `DRF-1`, before the next `compare.ts --prove` run |
| `DRF-13`, `DRF-14`, `DRF-15`, `DRF-17`, `DRF-18` | Optional. Open, with no merge condition |
| Declaration kinds in `packages/drag`'s tests and bench (`reviewer-4`, `cleanup-9`) | Outside `DRO-13`. No unit is owed. A unit that edits such a file for another reason applies the rule there |
| Declaration kinds in `core`, `tproc` and `vite-traits-plugin` | Routed to the repository register with the architect's reading (assessment §5). No id is allocated here |
| The repository register's stale `RF-22` high-water mark | Routed to that register's owner (assessment §6) |
| The owner's `92fbb93e1` (`Fallible`) | Type-only. No finding. The focused review's range includes it |

**Unresolved at this commit:** the handoff's six items, `DRF-1`, `DRF-7`, the optional findings, and the owner's decisions in the assessment's §7.

## Disposition of the combined review remediation

The [remediation report](combined-review-remediation-report.md) at `f2ac81bc5` and its [feature proof](reviews/combined-ownership/remediation-reviewer.md) at `26919a938`, read by the architect at `26919a938` in [`combined-review-remediation-assessment.md`](combined-review-remediation-assessment.md). That record gives each reason.

| Item | Disposition |
| --- | --- |
| `DRF-6`, `DRF-8`, `DRF-9`, `DRF-10`, `DRF-12`, `DRF-16` | Closed at `f2ac81bc5` on the proof's result |
| `DRD-39` | Implemented at `d1a262306` |
| The proof's `RR-a` and `RR-b` | Registered as `DRF-19`, owed before merge. [`test-title-follow-up-handoff.md`](test-title-follow-up-handoff.md) repairs it |
| `shared/invalidation.js`'s JSDoc difference | Authorized by the owner. No finding |
| The `no-extraneous-class` directive in `operation-lifecycle` | Kept. A test-style choice, no finding |
| [`combined-review-assessment.md`](combined-review-assessment.md) §7 | Replaced by the new assessment's §5, which separates the merge conditions, the cost decisions and the permission to merge with failing checks |

**Unresolved at this commit:** `DRF-19`, `DRF-1`, `DRF-7`, the optional findings, and the owner's decisions in the assessment's §5.2.

## Disposition of the test title follow-up

The [report](test-title-follow-up-report.md) at `377264b3d` and its implementation commit `60680eb75`, read by the architect on 2026-11-10 at `a9c323f6a`, which has the same `packages/drag` tree apart from the report.

| Item | Disposition |
| --- | --- |
| `DRF-19` | Closed at `60680eb75`. The diff changes only the two titles, the case values and one assertion. The required properties hold by reading, and M3a and M3b fail as the handoff requires |
| [`combined-review-remediation-assessment.md`](combined-review-remediation-assessment.md) §5.1 | Condition 1 holds. Condition 2 (`DRO-5`) holds at `a9c323f6a`. The merge happened, so conditions 3 and 4 aren't checked again here |

**Unresolved at this commit:** `DRF-1` and `DRF-7`, now scheduled by `DRD-40`; the optional findings; and decisions 1 and 2 of the assessment's §5.2, for which the record holds no answer.

## Findings

Findings for scope `drag`, under `DRD-23`'s first bullet. High-water mark: **`DRF-19`**.

#### DRF-1 — `compare.ts`'s bytes rule selects the kernel by function name

Tier B, open. Found by the architect while reading `compare.ts` at `ff69cb8d7`.

- **Current behavior:** the bytes rule flags a function at 16 B per move or more when `isKernelFunction` names it. That is, the name starts with `#`, or is `requestStep` or `requestCancel`. The profile keys a frame by its function name only, because each arm is one bundled script.
- **Why it is a problem:**
  - Since `276947f82`, the kernel's pass runs through `enter` and `advance`, which aren't private. The rule can't flag an allocation in them, although every sample runs both.
  - It also counts a behavior's private member as kernel: `sortable`'s `#updateInsertion` read 2 to 4 B per move in the proof run recorded at `b91db2818`, under the rule's limit.
- **Evidence:** `isKernelFunction` in `bench/compare.ts`. `Gesture.enter` and `Session.advance` are in `src/kernel/`.
- **Required property:** as `DRD-23`'s last bullet states, the rule selects the kernel by module location: every function in `src/kernel/` or `src/draggable.ts`, and nothing else. An allocation injected into `Gesture.enter` must flag.
- **When:** before the next `compare.ts` run that launches a browser. Timing is deferred, so the instrument repair leaves it open, and the combined review doesn't wait for it.
- **Scheduled on 2026-11-10** by `DRD-40`: [`performance-instrument-handoff.md`](performance-instrument-handoff.md) item 2.

#### DRF-2 — The per-sample test doesn't bound the lift's bytes

Tier B, **closed at `8c5ace665`**, read by the architect at `d258573fa`. Found by the architect while reading the lift at `b5f5f4046` for [`lift-representation-proposal.md`](lift-representation-proposal.md).

**Closure:** a new Chromium test bounds `lift.ts:translate` at 153 B per move, at a non-integer displacement ([report](lift-representation-report.md) item 2). An object `{ x, y }` of two non-integer numbers per sample, about 54 B per move, failed it in 5 of 5 runs, and the existing test passed. Unmutated, 15 runs read 135.87 to 144.85 B per move. **The demonstrated sensitivity is that mutation's size.** No mutation shows a smaller allocation failing. [`operation-lifetime-assessment.md`](operation-lifetime-assessment.md) §1 states what the spread implies.

- **Current behavior:** `hot-path` › "should allocate per sample only the CSS string a lifted write needs" requires that the only `lift.ts` key with sampled bytes is `lift.ts:translate`. It doesn't bound that key's bytes.
- **Why it is a problem:** the title says the lift allocates only the CSS string on each sample, and the test checks only which lift function allocates. An object or a boxed number allocated in `translate` on every sample would pass. So the test can't judge whether a change to the lift's representation adds a per-sample cost.
- **Evidence:** the `liftFunctions` assertion in `tests/hot-path.browser.test.ts`.
- **Required property:** an allocation of one small object per sample in `translate` fails the test, shown by a mutation as `DRD-23`'s last bullet requires. The bound comes from the unmutated figure at a non-integer displacement. It is set in the repair's handoff, not by the implementer.
- **When:** before any change to the lift's per-sample path is accepted. `DRD-29` is such a change.

#### DRF-3 — `land` keeps the object the timing returned

Tier A, **closed at `d7828a280`**, read by the architect at `d99ebd304`. Found by the architect while reading `b33890461` at `d258573fa` ([`operation-lifetime-assessment.md`](operation-lifetime-assessment.md) §1).

**Closure:** `land` calls the timing once and copies `duration` and `easing` into its record, and the landing disposer reads the copies. The witness, "should keep the timing values returned at the land call when the timing reuses its object", failed in Chromium, Firefox and WebKit against `d258573fa`'s `src/lift.ts`, and passes at `d7828a280` ([report](operation-lifetime-assessment.md) §3). Its size is `DRO-7`'s.

- **Current behavior:** `land` records `{ x, y, timing: timing(...) }`, and the landing disposer reads that object's `duration` and `easing` at release.
- **Why it is a problem:** foreign code runs between `settle` and that read. That includes `drag.signal`'s abort, the disposers added after `acquire`, and `hidePopover`'s synchronous `beforetoggle`. A consumer's timing may reuse its result object, and the `Readonly` return type allows that. A call to the same timing in that window, or a write to the object, then changes a landing already recorded. At `89995c27e` the built-ins copied the values in `settle`, so this is an incidental behavior change under `DRD-29`. The library's `landing()` returns a new object per call and isn't affected.
- **Evidence:** `land` and `startLandingAnimation` in `src/lift.ts` at `b33890461`. Against `landingTarget` in `src/sortable.ts` and `settle` in `src/free-drag.ts` at `89995c27e`. By reading, not run.
- **Required property:** `DRD-29`'s added `land` bullet. A test whose timing's object is changed by a disposer after `land` must see the values from the call. That test must fail before the repair.
- **When:** next. [`operation-lifetime-assessment.md`](operation-lifetime-assessment.md) §3 is its handoff.

#### DRF-4 — The class-inference claim and the session-reach witness after `DRD-30`

Tier C, **closed at `b01a0283d`**, repaired at `79be2c938` ([`activation-result-assessment.md`](activation-result-assessment.md) §7).

**Closure:** at `b01a0283d` the class witness and both built-ins call `draggable` without type arguments. The witness calls `nudge()`, which only its class operation has, from a controller step. The session-reach test's three `@ts-expect-error` lines are on the `Drag` that `activate` receives, and each can fail ([`proof-reviewer.md`](reviews/combined-ownership/proof-reviewer.md) §Repaired findings). The architect closed it in [`combined-review-assessment.md`](combined-review-assessment.md) §2.

Found by the architect while reading `d99ebd304` ([`activation-result-assessment.md`](activation-result-assessment.md) §3).

- **Current behavior:**
  - (a) The [report](activation-result-report.md) and a comment in `authoring.declaration` say a class instance gives no inference site for its operation. The test and both built-ins name `draggable`'s three type arguments.
  - (b) `authoring.declaration` › "should not let a controller or a drag reach the session" asserts that a step's operation has no `phase`, `next` or `decision`. It used to assert that about the step's `Drag`.
- **Why it is a problem:**
  - (a) The claim is false. A copy of `src/` at `d99ebd304` with the built-ins' type arguments removed type-checks, including `freeDrag`'s `moveTo` step, which calls a member only `FreeDragOperation` has. The code shows a requirement that doesn't exist.
  - (b) `BehaviorOperation` is the author's type and never had those members, so the assertion can't fail. No type-level witness covers the `Drag` any more. The runtime key test still does.
- **Evidence:** the class witness and the session-reach test in `tests/authoring.declaration.test.ts`. The `draggable` calls in `src/free-drag.ts` and `src/sortable.ts`. The type probes in the assessment §4.
- **Required property:**
  - (a) The class witness and the built-ins call `draggable` without type arguments. The witness calls a member only its class operation has, from a controller step.
  - (b) The session-reach test asserts that the `Drag` `activate` receives has no `phase`, `next` or `decision`.
- **When:** before the combined review, in [`activation-result-assessment.md`](activation-result-assessment.md) §6.

#### DRF-5 — `bounds` clamps against a box read before a scroll between operations

Tier A, **closed at `b01a0283d`**, repaired at `8626b04fd` ([`feature-composition-report.md`](feature-composition-report.md) item 1).

**Closure:** with `this.bounds?.invalidate()` removed, the regression test fails in Chromium, Firefox and WebKit, with `boxTop` 200 where 50 is expected, and it asserts the scroll through `arenaAfter: 50`. It passes with the line ([`proof-reviewer.md`](reviews/combined-ownership/proof-reviewer.md) §Repaired findings). The mutation is the reviewer's, and nobody repeated it. The architect closed it in [`combined-review-assessment.md`](combined-review-assessment.md) §2.

Found by the architect while revising the feature-composition prototype on 2026-11-09 ([`feature-composition-assessment.md`](feature-composition-assessment.md) §10).

- **Current behavior:** `bounds`' runtime is per controller, and so are its cached box and its staleness flag. Only the invalidation listener and the controller's `invalidate()` set the flag, and the listener exists only during an operation. So a scroll or resize between two operations leaves the next operation clamping against the box from before it.
- **Why it is a problem:** a correctly integrated `freeDrag` with `bounds` lets the visual leave its bounds, or stops it short of them, on the first drag after a scroll. The consumer did nothing wrong: `invalidate()` is documented for changes during a drag.
- **Evidence:** `bounds()` in `src/free-drag/bounds.ts` and `FreeDragBehavior.activate` in `src/free-drag/behavior.ts` at `688613863`. A scratch witness at that source, not kept and recorded in the probe's `results.txt`, puts a box in a 300 × 300 arena at `top: 200px` inside a scrolling container. It drags and releases once, scrolls the container by 150 px, and then drags 400 px up. **In Chromium, Firefox and WebKit,** the arena's top is at 50 and the box stops at 200. With one `this.bounds?.invalidate()` added to `activate` after the lift's acquisition, the witness and `tests/free-drag.browser.test.ts` pass in all three engines.
- **Required property:** C4 of `DRD-33`. No operation clamps against a box read before it activated. The regression test must fail at `688613863` in all three engines, and it must assert that the scroll happened, so that it can't pass with no scroll.
- **When:** the first commit of [`feature-composition-handoff.md`](feature-composition-handoff.md), as a repair of its own.

#### DRF-6 — The README and the accessibility record give every landing the reduced-motion guarantee that DRI-13 limits to `landing()`

Tier B, **closed on 2026-11-10**. Found by the combined review at `b01a0283d` (`reviewer-3`, `integrity-2`; [summary](reviews/combined-ownership/combined-ownership-summary.md)).

**Closure:** repaired at `561f2b5af`. The README, `.agents/docs/accessibility.md` and the landing test's title state `landing()`'s scope, and the README and the accessibility record say that a custom `Landing` owns the preference ([proof](reviews/combined-ownership/remediation-reviewer.md) §Item 2, [assessment](combined-review-remediation-assessment.md) §2).

- **Current behavior:** `README.md` § Focus and landing limits says "With `prefers-reduced-motion: reduce`, every landing has zero duration." `.agents/docs/accessibility.md`'s fulfilled requirements say the same, "including one a custom behavior returned with no timing", a path `DRD-33` removed.
- **Why it is a problem:** since `DRD-33`, DRI-13 covers only "every landing that `landing()` starts", and "a third-party `Landing` owns its own animation". The reduced-motion check is in `landing()`'s `start`, and `land` calls a third-party `start` as it is. An integrator who writes a `Landing` is told that the library already honors the preference.
- **Evidence:** `README.md:251`, `.agents/docs/accessibility.md:73`, `contract.md:266` and `:271`, `src/shared/landing.ts`.
- **Required property:** each statement about reduced motion for landings covers the landings `landing()` starts, and says that a custom `Landing` owns the preference.
- **When:** before merge, [`combined-review-remediation-handoff.md`](combined-review-remediation-handoff.md) item 2. That item adds `landing.browser.test.ts`'s reduced-motion test title, which makes the same claim.

#### DRF-7 — `compare.ts --prove` has no injection that applies, and the dry check `DRD-23` states doesn't exist

Tier B, open. Found by the combined review at `b01a0283d` (`integrity-1`). Recorded as not run in [`instrument-repair-report.md`](instrument-repair-report.md) §Not run, item 2. The combined review's handover, [`callback-list-completion-assessment.md`](callback-list-completion-assessment.md) §6, says the instrument repair is done.

- **Current behavior:** none of the six `find` strings in `INJECTIONS` occurs in the file it names (`src/sortable.ts`, `src/draggable.ts`). `prove()` applies them one at a time inside the browser run, and has no earlier pass and no dry option.
- **Why it is a problem:** `DRD-23`'s last bullet states that `--prove` checks every injection before it runs any scenario. The first `--prove` after the timing deferral fails at its first injection after a browser has launched, and the proof that the comparison can see a cost isn't available.
- **Evidence:** a text search of each `find` literal against its file at `b01a0283d`, repeated by the consolidator: 0 of 6 apply. [`activation-result-report.md`](activation-result-report.md) recorded the same at `da139407e`.
- **Required property:** as [`instrument-repair-handoff.md`](instrument-repair-handoff.md) §2: every injection applies to the current source exactly once, and `--prove` finds one that doesn't before it runs any scenario.
- **When:** before the next `compare.ts --prove` run. Timing stays deferred. **Decided on 2026-11-10** ([`combined-review-assessment.md`](combined-review-assessment.md) §4.1): it is not owed before merge. It is repaired with `DRF-1`, as the instrument unit that starts the first timing reading, because the optimization that timing starts would move the injection sites again. **Scheduled on 2026-11-10** by `DRD-40`: [`performance-instrument-handoff.md`](performance-instrument-handoff.md) item 1. At `a9c323f6a` the sortable sites are in `src/sortable/operation.ts` and the kernel sites in `src/kernel/session.ts` and `src/kernel/gesture.ts`.

#### DRF-8 — The DRI-3 "no terminal" tests assert on hooks the kernel never receives

Tier C, **closed on 2026-11-10**. Found by the combined review at `b01a0283d` (`reviewer-1`).

**Closure:** repaired at `18ba9ab58`. The five `log` assertions are removed, and every remaining assertion can fail ([proof](reviews/combined-ownership/remediation-reviewer.md) §Item 3). One new case label doesn't describe its body, and `DRF-19` (a) carries it ([assessment](combined-review-remediation-assessment.md) §3.1).

- **Current behavior:** in `terminals.browser.test.ts`, "should deliver no terminal without a start" (three cases) and "should deliver no start or end when activate declines" put `start` and `end` on a local operation that `activate` discards before it throws or returns `null`, then assert `expect(log).toEqual([])`. At `d7e7b0d3a` the hooks were the behavior's, which the kernel could call.
- **Why it is a problem:** the `log` assertion can't fail, whatever the kernel does, and the tests present it as DRI-3's witness. The defect class is `DRF-4` (b)'s. The same assertion appears in three `operation-lifecycle` tests and the failed-acquisition block of `faults`, whose other assertions carry their subject.
- **Evidence:** `tests/terminals.browser.test.ts` L33–91. `git show d7e7b0d3a:packages/drag/tests/terminals.browser.test.ts`.
- **Required property:** every assertion in a DRI-3 terminal test can fail when the kernel violates the property its title names. An assertion that can't fail under the current API isn't presented as its witness.
- **When:** before merge, [`combined-review-remediation-handoff.md`](combined-review-remediation-handoff.md) item 3, with the five instances.

#### DRF-9 — Two test titles name properties their bodies can't fail on

Tier C, **closed on 2026-11-10**. Found by the combined review at `b01a0283d` (`reviewer-2`).

**Closure:** repaired at `04c522bb0`. The `classes` title lost its `cancelLanding` clause. The `sortable` test asserts the landing at home: mutation M2 fails its count assertion and the proof's M2b fails its position assertion ([proof](reviews/combined-ownership/remediation-reviewer.md) §Verification run).

- **Current behavior:** `classes` › "…with cancelLanding passed detached" starts no landing and checks no fault. A prototype `cancelLanding` would throw when detached, be reported as a fault, and leave the test passing. `sortable` › "should land at home when a cancel comes between an in-place change and invalidate" checks no position.
- **Why it is a problem:** each title claims a guarantee its body doesn't witness. The detached `cancelLanding` is still witnessed by `destruction` › "should cancel a running landing and the row animations".
- **Evidence:** `tests/classes.browser.test.ts` L37–70, `tests/sortable.browser.test.ts` L150–172, and `tests/support/harness.ts`, whose `afterEach` checks no fault.
- **Required property:** a test's title names only properties that its assertions can fail on.
- **When:** before merge, [`combined-review-remediation-handoff.md`](combined-review-remediation-handoff.md) item 4. The `classes` title loses its clause. The `sortable` test gains the position assertion it names.

#### DRF-10 — The built-ins import a kernel type no entry exports, and published signatures name unexported types

Tier C, **closed on 2026-11-10**. Found by the combined review at `b01a0283d` (`cleanup-5`, `integrity-3`).

**Closure:** `DRD-39` was implemented at `d1a262306`. The four types are exported, only `src/draggable.ts` imports from `kernel/` outside it, `typedoc` warns only for the two installers, and M1 fails for each export ([proof](reviews/combined-ownership/remediation-reviewer.md) §Item 1).

- **Current behavior:** `src/sortable/operation.ts` and `src/free-drag/operation.ts` import `VerdictAwaiter` from `../kernel/behavior.ts`. `draggable.ts` doesn't export it, and `BehaviorOperation.drop` names it. `typedoc` also warns that `FreeDragSubject`, `DragAxis` and `ResolveHome` are named by published `freeDrag` types and not exported.
- **Why it is a problem:** DRI-18 says the built-ins import only public kernel types, which is false in two places, and a consumer can't name a type a published signature uses. Type-only: no module-graph effect.
- **Evidence:** the two import lines. `contract.md:324`. `typedoc` output: 6 warnings, of which `AxisInstaller` and `DisplacementInstaller` are deliberately unpublished (`contract.md:40`).
- **Required property:** the built-ins' kernel imports agree with DRI-18, or DRI-18 names the exception. A type a published signature names is exported from an entry or recorded as unpublished. Which side changes is a surface decision.
- **Decided by `DRD-39`** on 2026-11-10: export the four types, and keep the two installers unpublished.
- **When:** before merge, [`combined-review-remediation-handoff.md`](combined-review-remediation-handoff.md) item 1.

#### DRF-11 — DRI-9 steps 5 and 6 describe one release disposer, and `acquire` registers two

Tier C, **closed on 2026-11-10** by a correction to the contract. Found by the combined review at `b01a0283d` (`integrity-4`).

**Closure:** `DRD-27`'s release bullet already requires this order: the landing starts after the release, even when the release threw, and each throw is reported separately. It leaves one or two disposers to the implementer. So only DRI-9's text was wrong. Steps 5 and 6 now state the two disposers, and the contract's change record gives the old wording. No code changes. `landing` › "should start a named landing when releasing the top layer throws, and let the outcome stand" witnesses it ([`combined-review-assessment.md`](combined-review-assessment.md) §3).

- **Current behavior:** `contract.md` DRI-9 step 5 says the lift is released as the last disposer, and step 6 that the landing starts "in the same disposer". `Lifter.acquire` registers the landing's start and then the release, so the release runs first and the start runs last, even when the release throws. The README and `acquire`'s JSDoc agree with the code.
- **Why it is a problem:** the contract implies that a throwing release stops the landing. The code starts it and reports each throw once.
- **Evidence:** `contract.md:224-225`. `src/lift.ts`, the two `drag.use` calls in `acquire` and the comment above them.
- **Required property:** DRI-9 states the order the code has: the release, then the landing's start as its own disposer, and what a throw in the release does to the start.

#### DRF-12 — `RectIndexView` has one implementer and no use, and its comment describes writable fields

Tier C, **closed on 2026-11-10**. Found by the combined review at `b01a0283d` (`cleanup-1`).

**Closure:** repaired at `a19fd81c6`. The interface and its comment are deleted, and `RectIndex`'s getters are the read-only view.

- **Current behavior:** `src/sortable/rect-index.ts` declares `RectIndexView`, which only `RectIndex` implements and nothing names as a type. Its comment says the owner writes through the class's own declarations, which `11950690f` made private fields behind getters.
- **Why it is a problem:** an abstraction with no consumer, whose comment states an arrangement the code no longer has.
- **Evidence:** `grep -rn RectIndexView src tests bench` matches lines 38 and 60 only.
- **Required property:** the cache's read-only view has one declaration, and its comment describes the code.
- **When:** before merge, [`combined-review-remediation-handoff.md`](combined-review-remediation-handoff.md) item 5, which deletes the interface.

#### DRF-13 — `AxisQuery.insertion` admits `null`, which no producer supplies

Tier C, open. Found by the combined review at `b01a0283d` (`cleanup-2`). Noted earlier in [`operation-lifetime-assessment.md`](operation-lifetime-assessment.md) item 8.

- **Current behavior:** `AxisQuery.insertion` is `Insertion | null`. `SortableOperation` holds it as `SetNonNullable`, `y.ts` and `xy.ts` test it for `null`, and both assert it with `!`.
- **Why it is a problem:** branches and a type-level narrowing serve a state that correct use can't reach. The axis types aren't published.
- **Evidence:** `src/sortable/axis.ts:38`, `operation.ts:49`, `y.ts:42` and `:76`, `xy.ts:48` and `:85`.
- **Required property:** the committed gap's type says whether it can be absent, and the producer and the consumers agree.
- **When:** optional, with no merge condition ([`combined-review-assessment.md`](combined-review-assessment.md) §4). A later unit that changes the axis rules may take it.

#### DRF-14 — `freeDrag`'s invalidation calls `handleEvent()` with no event and invalidates the bounds twice

Tier C, open. Found by the combined review at `b01a0283d` (`cleanup-3`).

- **Current behavior:** `FreeDragBehavior.invalidate` calls `this.bounds?.invalidate()` and then `operation?.handleEvent()`, which invalidates the bounds again and the tracker.
- **Why it is a problem:** the stale-marking entry carries the DOM listener's name where it is called as a method, and one of the two bounds calls is redundant. Idempotent: no behavior changes.
- **Evidence:** `src/free-drag/behavior.ts:76-79`, `src/free-drag/operation.ts:52-55`.
- **Required property:** each cache is marked stale once per invalidation, and the entry is named for what it does where it is called outside a listener.
- **When:** optional, with no merge condition ([`combined-review-assessment.md`](combined-review-assessment.md) §4).

#### DRF-15 — `shared/timing.ts` has one importer since the lift stopped using the defaults

Tier C, open. Found by the combined review at `b01a0283d` (`cleanup-4`).

- **Current behavior:** only `src/shared/landing.ts` imports it. It was drawn so that the lift and the landing shared the defaults, and `DRD-33` took the animation out of the lift.
- **Why it is a problem:** the boundary's reason has expired. No bytes change.
- **Evidence:** `grep -rn timing.ts src`.
- **Required property:** a module boundary has a reason that the one module using it couldn't own.
- **When:** optional, with no merge condition ([`combined-review-assessment.md`](combined-review-assessment.md) §4).

#### DRF-16 — Comments name a parameter, a flag and a contract that the code no longer has

Tier C, **closed on 2026-11-10**. Found by the combined review at `b01a0283d` (`cleanup-6`).

**Closure:** repaired at `83f472624`. The three comments name `listener`, `__DEV__` and "`false` is not an operation". The JSDoc change appears in the emitted `shared/invalidation.js`, which the owner authorized.

- **Current behavior:** `src/shared/invalidation.ts:1` names `onInvalidate`, now `listener`. `src/sortable/linear-shift.ts:84` says `DEV` for `__DEV__`. `tests/authoring.declaration.test.ts:215` says "`false` no longer declines".
- **Why it is a problem:** a comment's factual claim disagrees with the code, or argues about what was.
- **Evidence:** the three lines.
- **Required property:** each comment names the code as it is and states the property it checks.
- **When:** before merge, [`combined-review-remediation-handoff.md`](combined-review-remediation-handoff.md) item 6.

#### DRF-17 — The `tap` browser command has no caller

Tier C, open. Found by the combined review at `b01a0283d` (`cleanup-7`).

- **Current behavior:** `tests/support/commands.node.ts:80` defines `tap`, and `tests/support/browser-commands.ts:13` declares it. No test or bench calls it.
- **Why it is a problem:** harness machinery a reader must understand and keep compiling, for no test.
- **Evidence:** `grep -rnw tap tests bench`.
- **Required property:** the harness declares the commands that a test uses.
- **When:** optional, with no merge condition ([`combined-review-assessment.md`](combined-review-assessment.md) §4).

#### DRF-18 — Test and bench helpers have several definitions

Tier C, open. Found by the combined review at `b01a0283d` (`cleanup-8`).

- **Current behavior:** `row` is in the `activation`, `focus`, `landing` and `order` tests. `focusableList` is in `focus` and `order`. `makeBox` and `mount` are in `free-drag` and `commit`. Heap-snapshot reading is in `tests/support/commands.node.ts` and `bench/heap-snapshot.ts`. `PROTOTYPE_REVISION` is in `bench/compare.ts` and `bench/size/measure.ts`.
- **Why it is a problem:** a change to one helper or to the pinned revision has to find every copy. `tests/support/harness.ts` is already the shared place for the test helpers.
- **Evidence:** `grep -n "^const row\|^function focusableList\|^function makeBox\|^function mount" tests/*.ts`, and the two `PROTOTYPE_REVISION` lines.
- **Required property:** each shared helper and the pinned revision have one definition, or the file says why it stays standalone.
- **When:** optional, with no merge condition ([`combined-review-assessment.md`](combined-review-assessment.md) §4). If `DRO-5` retires the prototype arm, `PROTOTYPE_REVISION` may go with it.

#### DRF-19 — Two test titles describe a step or a source of a fault that their bodies don't have

Tier C, **closed at `60680eb75`**, read by the architect on 2026-11-10 at `a9c323f6a`. Found by the feature proof of the combined review remediation at `f2ac81bc5` (`RR-a`, `RR-b`; [proof](reviews/combined-ownership/remediation-reviewer.md) §Findings).

**Closure:** the [report](test-title-follow-up-report.md) at `377264b3d`. (a) The cases are `{ kind, before }` and the title interpolates `$before`: `requestCancel`, `requestDestroy` and `nothing`, which is what each body does before its throw. (b) The title is "should report one fault when the lift acquires a visual with no box, and keep the controller", and `expect(faultMessages()).toEqual(['lift/visual-no-box-space'])` replaces the count. M3a, a different message from the box check, fails the new assertion, which the old count would have passed. M3b, no throw, fails the first `log` assertion. The architect read the diff, not the runs.

- **Current behavior:**
  - **(a)** `terminals` › "should report a throw from activate once and leave the list clean: %s before the throw" renders "fault before the throw" for a case in which nothing runs before the throw. `18ba9ab58` introduced the label. The earlier "%s before start" read correctly for all three cases.
  - **(b)** `faults` › "should report a platform throw and keep the controller: a hidden visual has no box" produces the library's own `lift/visual-no-box-space` from `Lifter.acquire`, and no platform call throws. Its `expect(faults).toHaveLength(1)` passes for any one fault. The title is the same at `b01a0283d`.
- **Why it is a problem:** each title states something the body doesn't do. That is `DRF-9`'s class, which [`combined-review-assessment.md`](combined-review-assessment.md) §4 makes owed before merge. No program behavior is affected. DRI-7's platform-call source is witnessed by the `showPopover` tests in `drag:DRI-7 a failed acquisition`.
- **Evidence:** `tests/terminals.browser.test.ts`, the first `it.each` in `drag:DRI-3 terminals`, and `tests/faults.browser.test.ts:242-274` at `f2ac81bc5`. `src/lift.ts:262-269`. The proof's probes H1 to H3: the hidden-visual test's first `log` assertion can fail, when `acquire` returns for a visual with no box, so (b) is not a `DRF-8` instance.
- **Required property:** each title names only what its assertions can fail on. Each case of (a) describes what its body does before the throw. (b) names no platform call, and identifies the reported fault as `lift/visual-no-box-space`.
- **When:** before merge, [`test-title-follow-up-handoff.md`](test-title-follow-up-handoff.md) ([assessment](combined-review-remediation-assessment.md) §3).

## Owner decisions

None blocks the remediation. Each has a default the handoff builds. `DRO-6`, `DRO-9` and `DRO-10` are approved, and `DRO-7`, `DRO-8` and `DRO-12` are accepted. **What remains the owner's before merge** is in [`combined-review-assessment.md`](combined-review-assessment.md) §7: `DRO-10`'s excess, the reported costs that no approval covers, and whether to merge with the known failures that unchanged budgets leave.

**2026-11-10, after the merge:** that list was replaced by [`combined-review-remediation-assessment.md`](combined-review-remediation-assessment.md) §5.2. The owner merged at `a9c323f6a` with the size rows failing, which answers its decision 3. The record holds no answer to decision 1 (`DRO-10`'s excess) or decision 2 (the costs no approval covers). They stay open, and the performance phase doesn't depend on them. `DRO-4`'s size re-base stays the owner's.

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

**Timing reopened, 2026-11-10.** The owner opened the runtime-performance phase (`DRD-40`). The baseline in [`performance-instrument-handoff.md`](performance-instrument-handoff.md) item 5 gives the per-cycle time against drag2 and the prototype that this entry asked for, at `a9c323f6a`'s source. It comes back to the owner with that reading. The size re-base stays open, and no reading moves a ceiling by itself.

#### DRO-5 — Keep `599684791` reachable after the squash merge

**The repository allows only squash merges, so `main` won't contain `599684791`.** Once `drag/production` is squashed and its branch deleted, the commit stays reachable only through another ref. On 2026-11-07 that ref is `origin/drag/prototype`, whose tip `a1d31e0d2` descends from `599684791`. `origin/drag/production` holds it too, but merging normally deletes that branch. The `compare` instrument's prototype arm and `measure.ts --prototype` read the commit with `git archive`, and fail without it.

**Default: keep `drag/prototype` as the ref that preserves it.** No tag and no settings change is needed.

- **Before merge:** `git branch -r --contains 599684791` must list `origin/drag/prototype`.
- **While either instrument names the commit:** don't delete, rewrite or force-push `drag/prototype`.
- **On a checkout of `main` alone,** which includes a single-branch clone: run `git fetch origin drag/prototype` before either instrument.

**The alternative is to retire the prototype arm** from both instruments before merge, after the remediation's validation has read it. The branch then stops mattering, and the 2026-11-06 and remediation readings keep the arm's figures. **Recommendation: keep the branch until the owner has read `DRO-4`, then decide whether to retire the arm.**

**Held after the merge, 2026-11-10:** `git branch -r --contains 599684791` lists `origin/drag/prototype`. The performance baseline uses the prototype arm, so the branch stays.

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

**Status, 2026-11-07:** the figures are in the [ownership report](ownership-report.md), measured at `039e8e153`, `433a0e06c` and `89995c27e`. One is incomplete. **The per-sample test passed, but its kernel assertion couldn't fail** (§Disposition of the ownership report). So that result covers only the lift's `translate`. The kernel's per-sample figure comes from [`instrument-repair-handoff.md`](instrument-repair-handoff.md) item 1's unmutated runs. The size and allocation figures don't depend on it. **Added 2026-11-08:** `DRD-29`'s figures come from [`lift-representation-handoff.md`](lift-representation-handoff.md) item 4: size, allocation by reading, and the lift's bytes per sample before and after, which `DRF-2`'s repair makes measurable. They are reported apart from the kernel's per-sample reading, which is still open. **Added 2026-11-08, after the unit:** the [report](lift-representation-report.md) has them, and the architect reviewed them in [`operation-lifetime-assessment.md`](operation-lifetime-assessment.md) §1, without accepting any. The size table is consistent. The allocation count by reading agrees: one function less per lifted controller, one object more per lifted activation, and no change per landing. Per sample, the result is only that `DRD-29` adds no allocation the size of `DRF-2`'s mutation.

**Accepted by the owner on 2026-11-10,** before the combined review: "да, принимаем. Трейдофф вполне очевидный" ("yes, we accept. The trade-off is quite obvious"), relayed in the [round summary](reviews/combined-ownership/combined-ownership-summary.md). The acceptance covers the figures above: the ownership report's, `DRD-29`'s in the lift representation report, and the kernel's per-sample figure, 13.33 to 17.49 B per move ([`instrument-repair-report.md`](instrument-repair-report.md) §Item 1). **The acceptance re-bases nothing.** That includes the per-sample test's `< 16` threshold. The accepted figure spans the threshold, so that test fails on accepted source in some runs. It is a known failure until a reading under `DRO-4` re-bases the threshold, or until optimization lowers the figure ([`combined-review-assessment.md`](combined-review-assessment.md) §2).

#### DRO-8 — The costs of the activation result

**Default: none is accepted until you read it.** [`activation-result-handoff.md`](activation-result-handoff.md) implements `DRD-30`, and its report gives these figures, each with the commit it measured:

- **Size:** every row of `just size`, minified and Brotli, at the unit's base and at each of its commits.
- **Allocation, counted by reading with the method of the ownership report:** per press that never activates, per activation, per controller and per landing. The kernel, `freeDrag`, `sortable` and each example in the size table are counted separately.
- **Per sample:** the `DRF-2` test's `lift.ts:translate` figures, and the kernel per-sample test's results as the suites report them, not interpreted.

**Expected by reading, not measured:**

- `freeDrag`: one object less per press, because its admission's `state` is the visual, and one more per activation, the operation.
- `sortable`: no change per activation if the operation also serves as the axis context. Otherwise one more.
- The examples: one operation per activation where the example has no state object today.
- The kernel: no change per operation. The admission's `state` moves from the `Drag` to the session.
- Size: the operation classes' member names aren't shortened by the minifier. No figure is estimated. `freeDrag` is already over its ceiling.

**What reading decides:** you accept the figures, or name a part to remove before merge.

**Added 2026-11-08, after the unit:** the [report](activation-result-report.md) has the figures, measured at `1d5d3fa13` and `da139407e`. The architect read them in [`activation-result-assessment.md`](activation-result-assessment.md) §5 and accepted none.

- **Size.** The kernel: −29 B minified and +16 B Brotli. `freeDrag`: +102 B minified and +96 B Brotli, now 152 B over its ceiling. `sortable`: −80 B minified and +62 to +69 B Brotli. How much of this comes from member names isn't separated, because no ablation was run.
- **Allocation.** It agrees with reading for the kernel and the built-ins. The examples also allocate one function per hook on each activation, because a literal operation's hooks close over the `Drag`.
- **Per sample.** The `DRF-2` figures are 136.73 to 140.09 B per move, inside the earlier unmutated range. So no added allocation the size of `DRF-2`'s mutation.
- **The amendment's motion object.** It adds one object per `freeDrag` activation and removes one per controller. Its size comes from the assessment's §6 unit.

**Accepted by the owner on 2026-11-10,** with `DRO-7` and in the same words. The acceptance covers the figures above, measured at `1d5d3fa13` and `da139407e`, with the example closures and the motion object. **The acceptance re-bases nothing.**

#### DRO-9 — The costs of the execution boundary

**Approved by the owner on 2026-11-08: `DRD-32` at the cost the [assessment](execution-boundary-assessment.md) §5 reports, and counting each refused event once.** The figures were measured on the v3 prototype at `ef8c6cd96`.

- **Size, Brotli:** `draggable alone` +13 B. The other compositions +16 to +23 B. `example: drop zone` goes over its 4431 B ceiling by 11 B. `freeDrag`, `freeDrag + bounds + landing` and the control row were over at the base.
- **Allocation, by reading:** 5 fewer functions per controller, 3 fewer per operation, pointer or command, and the two module-level `NOOP`s removed. Nothing per sample, which the per-sample test showed. A sample makes one more string comparison. No timing was taken.
- **The instrument:** `DRI-6`'s development count counts each refused event once. The set it uses exists only in development builds, and the production bundle doesn't contain it.

**What the approval covers:** those figures. **It re-bases nothing.** The drop-zone row lands red, as the `freeDrag` rows do, until a re-base under `DRO-4`. The implementation's report measures at `8943f14e5` and after its commit. A figure beyond those above isn't covered and goes back to the owner: more than +23 B Brotli on a row, or any allocation per sample.

#### DRO-10 — The capability model and the `targets` slot's charge

**Approved by the owner on 2026-11-09:**

- closed, named capability slots are v1's extension model, and a whole new behavior remains the fallback when the existing slots are insufficient (`DRD-2`, `DRD-33`);
- the `targets` slot's charge to `freeDrag` without `dropTargets`: **45 B Brotli**, measured on the revised prototype ([assessment](feature-composition-assessment.md) §7 and §8).

**How the charge is read.** It is the slot's call sites, including the invalidation listener's move to the operation. It is measured over the state with the landing capability and without the slot. On the prototype it was +45 B on `freeDrag`, +44 B on `freeDrag + landing` and +35 B on `freeDrag + bounds + landing`, and +209 B minified on `freeDrag`. The architect reads the approval as covering each `freeDrag` composition that omits `dropTargets`, up to 45 B. The owner corrects that reading if it is wrong.

**Not covered,** reported and not accepted:

- the landing capability: +2 to +27 B on compositions that compose a landing, −172 to −240 B on lifted compositions that don't, and +90 B on the drop-zone fixture;
- the drop-target capability when composed: 261 B Brotli, and its allocation per operation;
- the `bounds` repair (`DRF-5`);
- `RectIndex`'s encapsulation, +13 to +16 B.

**Optimization and timing stay deferred.** The approval re-bases nothing. A port whose slot charge is above 45 B Brotli on a composition that omits `dropTargets` isn't covered, and the report puts that figure to the owner.

#### DRO-11 — An accepted drop's landing into its target

**Default: no landing into the target.** With `dropTargets`, an accepted drop keeps `freeDrag`'s accepted semantics: the visual stays where it was dropped, and the consumer commits the new position or parent in `onEnd` (DRI-9, DRI-20). A rejected drop or a cancel lands home, as now. The handoff builds the default.

**The alternative** is to land the visual into the target, for example at its origin or center, before the consumer commits. The target would then have to be measured before the release, and `freeDrag` would name that landing in `settle`. The drop-zone fixture does this with a stand-in element.

**Recommendation: keep the default for v1.** It needs no new option, and a landing into the target can be added later as an option without breaking anything. This is a product choice, because it decides what the user sees at an accepted drop.

#### DRO-12 — The costs of the callback list

**Default: none is accepted until you read it.** [`callback-list-completion-handoff.md`](callback-list-completion-handoff.md) implements `DRD-36`, `DRD-37` and `DRD-38`, and its report gives these figures, each with the commit it measured:

- **Size:** every row of `node bench/size/measure.ts`, minified and Brotli, at `25a67d4a9` and at the implementation commit, with each row's difference. A row that the change puts over its ceiling, or further over it, is named.
- **Allocation, measured in V8:** the retained bytes of a list made by `queue()` and of one made by `stack()`, as made, against a bare array. The method and the Node version are stated.
- **Allocation, counted by reading:** per controller, per admitted press or command, per `sortable` controller with and without `displacement`, per step requested during a pass, and per `use` call.
- **Per sample:** the per-sample test's result.

**Expected by reading, not measured:**

- **Per controller (kernel):** two lists and their two arrays, where the base has two arrays.
- **Per admitted press or command:** the session's list and its array, where the base has one array. A press that never activates pays it too, because the session opens at admission.
- **Per `sortable` controller:** two functions fewer, `#invalidateGeometry` and `#retireAxis`, and a third fewer with `displacement`, the wrapper around `retire`.
- **Per step requested during a pass, and per `use` call:** two array slots where the base uses one. No object.
- **Per sample, and per step requested while idle:** nothing.
- **Size:** every composition imports the kernel, so every row grows. `DRD-37` and `DRD-38` change no emitted code.

**Reported for the version that `DRD-36` replaced,** at `53c87f988` against `25a67d4a9` ([report](callback-list-report.md#costs-dro-12)): +424 to +448 B minified and +129 to +152 B Brotli. `example: resize handle`, `example: canvas group`, `freeDrag` and `complete` went over their ceilings, and three rows already over went further. A list as made retained 128 B against 32 B for a bare array. These figures don't establish `DRD-36`'s costs.

**No timing is taken,** and the approval re-bases nothing. **What reading decides:** you accept the figures, or you name a part to remove before merge. Declining a figure is also what `DRD-35` names as reopening the representation.

**Amended 2026-11-09 by `DRD-36`.** It asked for each list's direction function to be measured and counted. `DRD-36` removes those functions, and the figures come from the completion handoff instead of [`callback-list-handoff.md`](callback-list-handoff.md).

**Accepted by the owner on 2026-11-10,** at the figures that the [completion report](callback-list-completion-report.md#costs-dro-12) measured at `50ed18a17` against `25a67d4a9`: +392 to +416 B minified and +130 to +146 B Brotli on every row; `draggable alone`, `example: resize handle`, `freeDrag` and `complete` newly over their ceilings, and `example: drop zone`, `freeDrag + bounds + landing` and `draggable alone`'s control further over; 72 B retained by a list as made, against 32 B for a bare array; and the counts by reading in that report. **The acceptance re-bases nothing.** The rows stay red until a re-base under `DRO-4`. No cost under `DRO-12` is declined, so `DRD-35`'s representation reopens only on a timing reading.

#### DRO-13 — The declaration kind of the other values the library creates

**Default: nothing changes kind beyond `Drag` and `Lift` (`DRD-38`).** By CONTRIBUTING's TypeScript section as clarified at `2bec0c431`, the architect reads these declarations as shapes of values the library creates, still declared as interfaces:

- **The controllers:** `DraggableController`, which `draggable` returns, `SortableController` and `FreeDragController`. `Gesture implements DraggableController`, and CONTRIBUTING says that the possibility of writing `implements` doesn't make a value shape a contract.
- **Internal values:** `FrameTask` and `LinearShift`.

**These stay interfaces,** because a capability slot takes them and other code may implement them: `Landing`, `MotionConstraint`, `DisplacementSink`, `InsertionGeometry` and `DropTargetTracker`. A third party may supply its own `DropTargets`, which returns a `DropTargetTracker`.

**Recommendation: convert the first two groups in a later unit,** so that the package follows one rule. It costs no bytes. The controllers are on the public surface, so the contract records that change as it records `DRD-38`. Nothing in the current unit depends on this.

**Deferred by the owner on 2026-11-10.** The default holds: nothing changes kind beyond `Drag` and `Lift`. **Amended the same day, on the owner's note:** `DropTargetTracker` is a contract for third-party `DropTargets` implementations, so it is not a value only the library creates. It used to be listed with the internal values. A later reading checks each remaining declaration for the same reason before it changes kind, and none changes kind only because the library also creates it.

**Its reach, stated on 2026-11-10** after the combined review ([`combined-review-assessment.md`](combined-review-assessment.md) §5):

- This entry covers the declarations in `src/` that it names.
- The interfaces in `tests/` and `bench/` are outside it: `GroupMove`, `CanvasGroup`, `ReactFixture`, `CdpSession`, `Page`, `Lifted`, `Named`, `Held`, `PageContext` and `Scenario`. They are unpublished, some describe host-provided objects, and no unit is owed for them. A unit that edits one of those files for another reason applies CONTRIBUTING's rule there.
- The other packages' declarations belong to the repository register.

## Decision status

| Decision | Status |
| --- | --- |
| DRD-1 | active. `DRD-32`: the reader also applies destruction requested while idle |
| DRD-2 | active. `DRD-30` changes the authoring API: the hooks after activation are on the operation that `activate` returns. Amended in place on 2026-11-09 by `DRD-33`: extension is by capability slots, with a whole behavior as the fallback |
| DRD-3 | active |
| DRD-4 | active, amended by `DRD-27`: the lift is no longer a behavior member. A behavior composes it with `createLifter`, and its members are on the `Lift` that the behavior keeps in its state. Its purpose holds: without that import, no lift code |
| DRD-5 | active |
| DRD-6 | active, scoping amended by `DRD-16`. Under `DRD-30` a step receives the behavior's operation instead of the `Drag`. Under `DRD-35` a step may come with a receiver and coalesces by the pair. Its stop condition holds |
| DRD-7 | active |
| DRD-8 | active |
| DRD-9 | active, the restore's place amended by `DRD-15` |
| DRD-10 | active, a grab during a landing amended by `DRD-18` |
| DRD-11 | active. `DRD-18` applies the activation pull to commands. Under `DRD-30`, `activate` declines with `null` |
| DRD-12 | active |
| DRD-13 | active, its performance rules amended by `DRD-22`. `DRD-40` applies them to optimization against a baseline commit |
| DRD-14 | active, implemented at `b91db2818`. Under `DRD-27` the release is the lift's own disposer, in the same place |
| DRD-15 | active, implemented at `b91db2818` |
| DRD-16 | active, implemented at `b91db2818`. Under `DRD-35` the list holds steps with their receivers, untagged by operation |
| DRD-17 | active, implemented at `b91db2818` |
| DRD-18 | active, implemented at `b91db2818`. Under `DRD-27` the lifter measures and then cancels its own running landing |
| DRD-19 | active, implemented at `b91db2818` |
| DRD-20 | active, implemented at `b91db2818`. `DRD-24` amends its sentence on the class that holds a session. Under `DRD-30`, operation values live in the behavior's operation, the hooks after activation are its methods, and the operation may keep its `Drag`. `DRD-30`'s amendment of 2026-11-08 limits its "scratch buffers rewritten before every read" to the behavior's own work. A buffer that only an operation writes belongs to the operation. `DRD-34` limits "Controller methods don't depend on `this`" to the `sortable` and `freeDrag` controllers: `draggable` returns its `Gesture`, whose methods take it as their receiver |
| DRD-21 | active, implemented at `b91db2818` |
| DRD-22 | active, applied in the remediation's validation |
| DRD-23 | active. Its last bullet, on instrument selection, was added on 2026-11-07. [`instrument-repair-handoff.md`](instrument-repair-handoff.md) applies it. `DRF-1` is open under it. The bullet's dry injection check for `compare.ts --prove` isn't implemented: `DRF-7` is open under it, and is deferred with `DRF-1`. On 2026-11-10 `DRD-40` scheduled both in [`performance-instrument-handoff.md`](performance-instrument-handoff.md) |
| DRD-24 | active, adopted at `276947f82` under `DRO-6`. `DRD-26` removes `isCurrent` from its interface. `DRD-27` removes `takeLanding` and `keepLanding`, and the landing leaves the controller. `DRD-32` changes the gate's row, adds `apply`, and removes the three per-operation gate steps that `DRO-6` accepted. `DRD-34`: `draggable()` returns the `Gesture`, so the controller's interface for the session is reachable at runtime and named by no exported type. The session stays unreachable |
| DRD-25 | active, implemented at `2506dcbb6`. `DRD-31` supersedes its `items()` copy bullet |
| DRD-26 | active, implemented at `433a0e06c` ([`ownership-report.md`](ownership-report.md) item 2). `DRD-32` adds `apply` to the session's members on the controller |
| DRD-27 | active, revised on 2026-11-07 from the text at `6d5ba89e7`, implemented at `89995c27e` ([`ownership-report.md`](ownership-report.md) item 3). Amends `DRD-4`, `DRD-24` and the contract's DRI-9, DRI-10, DRI-13, DRI-17 and DRI-18. Its `type-fest` sentence was corrected on 2026-11-08. `DRD-29` amends its `lift.js` types and its "Only `translate` writes `translatedX` and `translatedY`". Under `DRD-30` the operation that `activate` returns keeps the `Lift`, instead of `drag.state`. `DRD-33` amends its row "The landing after release": the release disposer calls the recorded `Landing`'s `start`. On 2026-11-10 the contract's DRI-9 was corrected to its release bullet: two disposers, and the landing starts even when the release threw (`DRF-11`) |
| DRD-28 | active, implemented at `039e8e153` ([`ownership-report.md`](ownership-report.md) item 1). Its `type-fest` packaging line was corrected on 2026-11-08. `DRD-29` amends its `lift.js` row. `DRD-33` amends it again and adds `lift/landing.js` and `free-drag/drop-targets.js` |
| DRD-29 | active, decided on 2026-11-08 on the owner's clarifications. Implemented at `b33890461` ([`lift-representation-report.md`](lift-representation-report.md) item 3). Read by the architect at `d258573fa`: it conforms except `DRF-3`, whose required property was added to its `land` bullets on 2026-11-08. Amends `DRD-27`'s public types and lift properties and `DRD-28`'s `lift.js` row. `DRD-33` amends it: `land(x, y, landing)` requires a `Landing`, which replaces `LandingTiming`, the default timing leaves the lift, and the `DRF-3` bullet keeps the caller's `Landing` value |
| DRD-30 | active, decided on 2026-11-08 on the owner's proposal. Implemented at `da139407e` and `3a67df0ea` ([report](activation-result-report.md)). Read by the architect at `d99ebd304` ([assessment](activation-result-assessment.md)): conforms. Amended the same day: the behavior keeps no operation state, the operation may keep its behavior, and the type-argument rule. [`activation-result-assessment.md`](activation-result-assessment.md) §6 implements the amendment, with `DRF-4`. Amends `DRD-2`, `DRD-6`, `DRD-11`, `DRD-20`, `DRD-27`, and the contract's vocabulary, public surface, DRI-3, DRI-8, DRI-9 and DRI-18. Replaces [`operation-lifetime-assessment.md`](operation-lifetime-assessment.md) §2 |
| DRD-31 | active, decided on 2026-11-08 on the owner's direction, from [`items-copy-assessment.md`](items-copy-assessment.md). Supersedes `DRD-25`'s `items()` copy bullet and amends the contract's DRI-14. Implemented at `4ef33b96e`, after `a390dfa29` and `0e7e1c7ef`, from [`items-borrowing-handoff.md`](items-borrowing-handoff.md), and reported at `72f669ce1` ([report](items-borrowing-report.md)). When this row was written no review had read it. The combined review read it at `b01a0283d` (corrected on 2026-11-10) |
| DRD-32 | active, decided on 2026-11-08 on the owner's approval of v3, from [`execution-boundary-assessment.md`](execution-boundary-assessment.md), with its cost in `DRO-9`. Amends `DRD-1`, `DRD-24`, `DRD-26`, `DRO-6`'s accepted functions and the contract's DRI-6. Implemented at `a8327a7c8` from `8943f14e5`. Reported in [`execution-boundary-report.md`](execution-boundary-report.md), with every row inside `DRO-9`. When this row was written no review had read it. The combined review read it at `b01a0283d` (corrected on 2026-11-10). `DRD-34` merges the input gate and the request entry into one shared pass that receives internal work with its receiver, removes `InputHandler`, `apply()` and `#run`, makes `raise` a method, and withdraws the rejection of a receiver argument |
| DRD-33 | active, decided on 2026-11-09 on the owner's acceptance of the slot model, from [`feature-composition-assessment.md`](feature-composition-assessment.md), with the slot's charge in `DRO-10`. Amends `DRD-2` in place, `DRD-27`, `DRD-28`, `DRD-29`, and the contract's vocabulary, public surface, DRI-9, DRI-13, DRI-17, DRI-18 and DRI-20, and adds DRI-21. Repairs `DRF-5`. Implemented at `8626b04fd`, `59cc79e74`, `bfc2bfb0e` and `11950690f` from [`feature-composition-handoff.md`](feature-composition-handoff.md), and reported at `0bb03f3ea` ([report](feature-composition-report.md)). The `targets` slot's +78 B and +59 B are above `DRO-10`'s 45 B and wait for the owner. When this row was written no review had read it. The combined review read it at `b01a0283d` (corrected on 2026-11-10) |
| DRD-34 | active, decided on 2026-11-09 on the owner's direction, from the owner's uncommitted edit on `39af0ef44` ([`owner-edit.diff.txt`](probes/gesture-receiver/owner-edit.diff.txt)). Amends `DRD-20`, `DRD-24`, `DRD-32` and the contract's public surface. Implemented at `fd7ae3e43` from [`gesture-receiver-handoff.md`](gesture-receiver-handoff.md), reported at `03d1449e2` ([report](gesture-receiver-report.md)). Read by the architect at `03d1449e2` ([assessment](gesture-receiver-assessment.md)): conforms. Its costs are reported and not accepted. When this row was written no review had read it. The combined review read it at `b01a0283d` (corrected on 2026-11-10). `DRD-35` amends its properties 6, 8 and 9 and supersedes its exclusion of receiver support. `DRD-37` supersedes its property 9 |
| DRD-35 | active, decided on 2026-11-09 on the owner's direction, from the model at `9f885b9a9` and the owner's uncommitted edit on it ([`owner-edit.diff.txt`](probes/callback-list/owner-edit.diff.txt)), with its costs in `DRO-12`. Amends `DRD-16`, `DRD-34` and the contract's public surface, DRI-8, DRI-9 and DRI-10. Implemented at `53c87f988` from [`callback-list-handoff.md`](callback-list-handoff.md), reported at `f06a99c4f` ([report](callback-list-report.md)). The architect read the report at `2bec0c431` (§Disposition of the callback list report). `DRD-36` replaces its property 5's direction function, and `DRD-37` supersedes its property 8. Its costs are accepted under `DRO-12` |
| DRD-36 | active, decided on 2026-11-09 on the owner's direction, from the owner's uncommitted edit on `2bec0c431` ([`insertion-edit.diff.txt`](probes/callback-list/insertion-edit.diff.txt)). Amends `DRD-35`, and `DRO-12`'s figures. Implemented at `50ed18a17` from [`callback-list-completion-handoff.md`](callback-list-completion-handoff.md), reported at `36dbd55db` ([report](callback-list-completion-report.md)). Read by the architect ([assessment](callback-list-completion-assessment.md)): conforms. Its costs are accepted under `DRO-12` |
| DRD-37 | active, decided on 2026-11-09 on the owner's direction. Supersedes `DRD-34` property 9 and `DRD-35` property 8. Implemented at `50ed18a17`, reported at `36dbd55db`. Read by the architect ([assessment](callback-list-completion-assessment.md)): conforms. Property 3 was clarified on 2026-11-10: it is checked by reading lint's output |
| DRD-38 | active, decided on 2026-11-09 on the owner's direction, under CONTRIBUTING's TypeScript section as clarified at `2bec0c431`. Amends the contract's public surface. `DRO-13` holds the other declarations, and the owner deferred it on 2026-11-10. Implemented at `50ed18a17`, reported at `36dbd55db`. Read by the architect ([assessment](callback-list-completion-assessment.md)): conforms |
| DRD-39 | active, decided on 2026-11-10 by the architect on `DRF-10`, from [`combined-review-assessment.md`](combined-review-assessment.md) §3. Amends the contract's public surface. [`combined-review-remediation-handoff.md`](combined-review-remediation-handoff.md) item 1 implemented it at `d1a262306`, reported at `f2ac81bc5` ([report](combined-review-remediation-report.md)). Proven by the [feature proof](reviews/combined-ownership/remediation-reviewer.md) at `26919a938`, and read by the architect ([assessment](combined-review-remediation-assessment.md)): conforms. `DRF-10` is closed |
| DRD-40 | active, decided on 2026-11-10 by the architect on the owner's request to open the runtime-performance phase. Ends `DRO-4`'s timing deferral. Applied by [`performance-plan.md`](performance-plan.md). Its first unit is [`performance-instrument-handoff.md`](performance-instrument-handoff.md) |