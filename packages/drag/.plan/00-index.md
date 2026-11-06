# `@ydinjs/drag` record: decisions

The register for scope `drag`, under `repo:RD-1`: decisions are `DRD-n`, invariants `DRI-n`, owner decisions `DRO-n`. Numbering starts at 1. drag2's bare `D-` series is separate. To read one entry:

```sh
awk -v re="^#### DRD-1( —|$)" \
  '$0 ~ re {f=1;print;next} f && /^#{1,4} /{exit} f' \
  packages/drag/.plan/00-index.md
```

**Input:** the prototype read at `26f82fbb1`. That commit is on no ref now. Its `packages/drag` tree is byte-identical to `599684791` on `drag/prototype`, so later citations use `599684791`. Evidence: [`prototype-report.md`](prototype-report.md), [`probes/prototype/`](probes/prototype/README.md), [`probes/final-design/`](probes/final-design/README.md). The comparison and earlier evidence are in [`architecture-plan.md`](architecture-plan.md).

**Status, 2026-11-06:** the owner tried the prototype, supports the direction and closed the prototype checkpoint. All decisions below are unimplemented. The next step is [`implementation-handoff.md`](implementation-handoff.md). The required behavior is in [`contract.md`](contract.md).

**Approving the prototype did not establish a performance result.** `DRD-13` says what does.

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

## Owner decisions

None blocks the implementation. Each has a default the handoff builds.

#### DRO-1 — Press cost under CONTRIBUTING §0

**Default: pull at admission.** The prototype's press at 2,000 items cost about 440 µs more script than at 20, once per press with no layout, and that figure wasn't separated from the consumer's own `[...root.children]`. The handoff separates them. **Recommendation: approve, unless the library's own share is large.** The alternative is a cached membership check at the press, which adds a cache and a miss path. Decide when the before/after report arrives.

#### DRO-2 — A landing can be clipped

**Default: DRD-10.** An item released outside a scrolling list slides back clipped by it, and can pass under a later positioned panel, for the length of the landing. Holding the top layer removes this and brings the costs in DRD-10. **Recommendation: keep the default.** Say so if the clipped flight is unacceptable once you see it, because the change is contained in the lift and `sortable`.

#### DRO-3 — Real devices

**Default: Chromium's emulated touch runs in the suite, and physical touch and pen are stated as unverified.** The implementer has no hardware. **Recommendation: try one touch device and one pen before calling the package released.** The case most likely to differ is `pointercancel` from touch scrolling.

## Decision status

| Decision | Status |
| -------- | ------ |
| DRD-1    | active |
| DRD-2    | active |
| DRD-3    | active |
| DRD-4    | active |
| DRD-5    | active |
| DRD-6    | active |
| DRD-7    | active |
| DRD-8    | active |
| DRD-9    | active |
| DRD-10   | active |
| DRD-11   | active |
| DRD-12   | active |
| DRD-13   | active |