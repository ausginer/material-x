# `@ydinjs/drag` record: decisions

The register for scope `drag`, under `repo:RD-1`: decisions are `DRD-n`, invariants `DRI-n`, owner decisions `DRO-n`. Numbering starts at 1. drag2's bare `D-` series is separate. To read one entry:

```sh
awk -v re="^#### DRD-1( —|$)" \
  '$0 ~ re {f=1;print;next} f && /^#{1,4} /{exit} f' \
  packages/drag/.plan/00-index.md
```

**Input:** the prototype read at `26f82fbb1`. That commit is on no ref now. Its `packages/drag` tree is byte-identical to `599684791` on `drag/prototype`, so later citations use `599684791`. Evidence: [`prototype-report.md`](prototype-report.md), [`probes/prototype/`](probes/prototype/README.md), [`probes/final-design/`](probes/final-design/README.md). The comparison and earlier evidence are in [`architecture-plan.md`](architecture-plan.md).

**Status, 2026-11-07:** production was built at `d7e7b0d3a` on `drag/production` and reviewed twice at that commit: a [review round](reviews/production/production-summary.md) and an [architecture challenge](reviews/architecture/production-design-challenge.md). `DRD-14` to `DRD-23` decide every finding and question from both. Where they change an earlier decision, its status row names the amendment. The required behavior is in [`contract.md`](contract.md). The [remediation](remediation-report.md) implemented them at `b91db2818`, and no independent review has read it yet. The owner's composition refactor at `3084191bb` and the implementer's findings on it are decided by `DRD-24` and `DRD-25`. `DRD-24` was revised to the owner's ownership model, and its [prototype](probes/session-owner/README.md) met it at `b54832a0e`. The owner approved its cost in `DRO-6`, and the [composition unit](composition-report.md) adopted it at `276947f82` and fixed the built-ins at `2506dcbb6`. The owner then split the kernel into modules at `bb644d6d7`, whose typecheck fails. `DRD-26` to `DRD-28` decide the ownership and lifecycle questions that the split exposed, and [`ownership-handoff.md`](ownership-handoff.md) implements them. The owner then required that the kernel know no lift, and `DRD-27` was revised on `6d5ba89e7`'s text before any of it was implemented. Their costs are `DRO-7`. The [ownership unit](ownership-report.md) implemented `DRD-26` to `DRD-28` at `039e8e153`, `433a0e06c` and `89995c27e`, and reported at `ff69cb8d7`. The architect read it at that commit: the three items conform, and its two instrument findings go to [`instrument-repair-handoff.md`](instrument-repair-handoff.md) (§Disposition of the ownership report). A third instrument finding is open as `DRF-1`. The combined review follows the instrument repair. On 2026-11-08 the architect proposed a change to the `Lift` in [`lift-representation-proposal.md`](lift-representation-proposal.md). With the owner's clarifications it is decided as `DRD-29`. [`lift-representation-handoff.md`](lift-representation-handoff.md) implements it, after repairing `DRF-2`, and reports its figures for `DRO-7`. The kernel's per-sample reading from the instrument repair stays open, apart from that unit. The [lift representation report](lift-representation-report.md) was read at `d258573fa`, in [`operation-lifetime-assessment.md`](operation-lifetime-assessment.md): `DRF-2` is closed, and `DRD-29` conforms except `DRF-3`, whose repair is that record's §3. The owner then proposed that `activate` return the behavior's operation, decided as `DRD-30`, which replaces that record's recommendation. [`activation-result-handoff.md`](activation-result-handoff.md) implements it after `DRF-3`'s repair, and its costs are `DRO-8`. `DRF-3` was repaired at `d7828a280`. `DRD-30` was implemented at `da139407e` and `3a67df0ea` and reported at `d99ebd304`. The architect read both at `d99ebd304`, in [`activation-result-assessment.md`](activation-result-assessment.md). `DRD-30` conforms, and is amended so that `freeDrag`'s motion belongs to its operation. `DRF-3` is closed, and `DRF-4` is open. That record's §6 is the remediation before the combined review. The owner then directed that `sortable` stop copying the `items()` array, decided as `DRD-31` from [`items-copy-assessment.md`](items-copy-assessment.md). [`items-borrowing-handoff.md`](items-borrowing-handoff.md) implements it. The owner approved the gate's revision in [`execution-boundary-assessment.md`](execution-boundary-assessment.md), decided as `DRD-32` with its cost in `DRO-9`. It was implemented from `8943f14e5` at `a8327a7c8`, inside `DRO-9`'s figures, and [`execution-boundary-report.md`](execution-boundary-report.md) reports it. The owner inspects it before any review. On 2026-11-09 the owner accepted closed, named capability slots for v1 from [`feature-composition-assessment.md`](feature-composition-assessment.md), decided as `DRD-33`, which amends `DRD-2`. The slot's charge is `DRO-10`, an accepted drop's landing into its target is `DRO-11`, and the `bounds` defect found there is `DRF-5`. [`feature-composition-handoff.md`](feature-composition-handoff.md) implements them. On the same day the owner withdrew the detached-call guarantee for `DraggableController` and let `draggable` return its `Gesture`, with one shared pass implementation. That is decided as `DRD-34` from the owner's uncommitted edit on `39af0ef44`, and [`gesture-receiver-handoff.md`](gesture-receiver-handoff.md) completes the edit. It was implemented at `fd7ae3e43` and reported at `03d1449e2`. The architect read both at `03d1449e2`, in [`gesture-receiver-assessment.md`](gesture-receiver-assessment.md): `DRD-34` conforms, and no cost is accepted. The owner inspects it before any review. Later that day the owner chose receiver-aware `requestStep` and `use` through one internal `CallbackList`, from the model at `9f885b9a9` on `drag/step-queue-model` and the owner's uncommitted edit on it. That is decided as `DRD-35`, which amends `DRD-34`, with its costs in `DRO-12`. [`callback-list-handoff.md`](callback-list-handoff.md) ports it to production. No combined review starts before the owner has read its report. It was implemented at `53c87f988` and reported at `f06a99c4f`, and the architect read the report at `2bec0c431` (§Disposition of the callback list report). The owner then chose the uncommitted `CallbackList` edit on `2bec0c431`, which inserts with `push` or `unshift` and runs with `pop`, decided as `DRD-36`. The owner also turned `@typescript-eslint/unbound-method` off for this package, decided as `DRD-37`, and clarified CONTRIBUTING so that `Drag` and `Lift` are types, decided as `DRD-38`. `DRO-12` is amended for `DRD-36`, and `DRO-13` asks about the other declarations. [`callback-list-completion-handoff.md`](callback-list-completion-handoff.md) implements the three decisions. No combined review starts before the owner has read its report. They were implemented at `50ed18a17` and reported at `36dbd55db`. On 2026-11-10 the owner accepted `DRO-12` and deferred `DRO-13`, and the architect read the report in [`callback-list-completion-assessment.md`](callback-list-completion-assessment.md): the three decisions conform. That record's §6 gives the revision, the scope and the open obligations for the combined review, which the owner directs next. The [combined review](reviews/combined-ownership/combined-ownership-summary.md) read `b01a0283d` and registered `DRF-6` to `DRF-18`. The owner had accepted `DRO-7` and `DRO-8` before it. The architect read it at `92fbb93e1`, after the owner's type-only `Fallible` commit, in [`combined-review-assessment.md`](combined-review-assessment.md) (§Disposition of the combined review). `DRF-4`, `DRF-5` and `DRF-11` are closed, `DRD-39` decides `DRF-10`, and [`combined-review-remediation-handoff.md`](combined-review-remediation-handoff.md) is the last unit before merge. That record's §7 lists the owner's remaining decisions. The remediation was implemented from `d1a262306` to `83f472624` and reported at `f2ac81bc5`, and a feature proof read it at `26919a938`. The architect read both at `26919a938`, in [`combined-review-remediation-assessment.md`](combined-review-remediation-assessment.md) (§Disposition of the combined review remediation). `DRF-6`, `DRF-8`, `DRF-9`, `DRF-10`, `DRF-12` and `DRF-16` are closed, and `DRD-39` is implemented. The proof's two title findings are `DRF-19`, owed before merge, and [`test-title-follow-up-handoff.md`](test-title-follow-up-handoff.md) repairs it. That record's §5 replaces the earlier §7 as the list of merge conditions and owner decisions.

**Status, 2026-11-10, after the merge:** the architect read the [test title follow-up report](test-title-follow-up-report.md) at `377264b3d` and the diff of `60680eb75`, and closed `DRF-19` (§Disposition of the test title follow-up). `drag/feature-composition` was squash-merged to `main` as `a9c323f6a` (#14). The six size rows stay red with unchanged budgets, as the pull request states. The record holds no answer to decisions 1 and 2 of [`combined-review-remediation-assessment.md`](combined-review-remediation-assessment.md) §5.2. On the same day the owner opened the runtime-performance phase on `drag/performance` from `a9c323f6a`: runtime speed first, bundle size second. `DRD-40` decides how it measures, [`performance-plan.md`](performance-plan.md) is its plan, and [`performance-instrument-handoff.md`](performance-instrument-handoff.md) is its first unit. That unit repairs `DRF-1` and `DRF-7`. It returned at `b8f1d1b35` after items 1 and 2: the step-list injection adds no bytes at the current source. `DRD-41` decides the return, and the [handoff](performance-instrument-handoff.md) says how the unit resumes (§Disposition of the performance instrument return). The unit completed at `c279973a3`, and the architect read it on 2026-11-11 in [`performance-instrument-assessment.md`](performance-instrument-assessment.md) (§Disposition of the performance instrument report). `DRF-1` is closed, and the baseline of `a9c323f6a` is recorded. `DRD-42` repairs the kernel per-sample test with a warm pass. `DRD-43` finds that no timing row can resolve an optimization yet and adds in-page rows. [`performance-resolution-handoff.md`](performance-resolution-handoff.md) implements both, and no optimization unit starts before it reports. The baseline's reading for the owner is in `DRO-4`. The unit reported at `39c8b432c` on `drag/performance-resolution`, and the architect read it on 2026-11-11 in [`performance-resolution-assessment.md`](performance-resolution-assessment.md) (§Disposition of the performance resolution report). `DRD-42` conforms. The in-page rows run, and their gate injections don't flag, at a load above the machine's four P-core threads. `DRD-44` attributes that to the machine or the method with one experiment, which [`performance-sensitivity-handoff.md`](performance-sensitivity-handoff.md) runs. The retained excess is attributed to V8's internal arrays and bounded within 400 operations, and its reading for the owner is in `DRO-4`. The experiment ran at `24cdadc48`, and the architect read it on 2026-11-11 in [`performance-sensitivity-assessment.md`](performance-sensitivity-assessment.md) (§Disposition of the performance sensitivity report). Its outcome is not resolved on both gate rows: the speed gauge measures its own first run rather than the machine, and unpinned readings always span both core classes. At the quietest load on record the gates' bounds are still too wide for an optimization unit, so the method changes in any outcome. `DRD-45` withdraws the gauge test, and one same-page check, which [`performance-page-check-handoff.md`](performance-page-check-handoff.md) runs, decides whether the spread comes from the page, the window or the clock. The alias cleanup at `566ebfc65` on `drag/performance` makes 10 of the 23 entries stale, and they are repaired before any campaign on that source. The page check returned at `f344a0ea8` before any browser process: the cycle row's end check counts the page's whole log. The owner then stopped the check. `DRD-46` keeps it for possible later use and redirects the phase to short scenario traces, which [`performance-trace-handoff.md`](performance-trace-handoff.md) records (§Disposition of the page check return). An optimization unit starts on one candidate the architect selects from those traces, and a focused paired measurement confirms it. The traces were recorded at `e92e21eed`, and the architect read them on 2026-11-11 in [`performance-trace-assessment.md`](performance-trace-assessment.md) (§Disposition of the performance trace report). `DRD-47` selects the drop's re-measure in a changed form: the unconditional call protects a scroll whose event hasn't arrived yet, so the drop confirms the cache against one row instead. [`performance-drop-handoff.md`](performance-drop-handoff.md) implements it, once the owner brings `566ebfc65`'s source and this record onto one branch. The bundle's missing module markers are `DRF-21`, and they change no recorded verdict. The branches were joined on `drag/performance` at `093f31c7f`. The unit implemented `DRD-47` at `bf9d1caed` and reported at `8eda874f0`, and the architect read it on 2026-11-12 in [`performance-drop-assessment.md`](performance-drop-assessment.md) (§Disposition of the performance drop report). `DRD-47` conforms and is confirmed: the 2,000-item cycle row is faster by 2,449 µs of script per cycle. The owner approved its geometry rule and accepted its +125 to +140 B Brotli, with no budget change (`DRO-4`). `DRD-48` decides `DRF-22`: `freeDrag`'s drop measures its targets and its bounds again, and [`free-drag-drop-handoff.md`](free-drag-drop-handoff.md) implements it. The unit implemented it at `71f20df20` and reported at `7cb2207ae`, and the architect read it on 2026-11-12 in [`free-drag-drop-assessment.md`](free-drag-drop-assessment.md) (§Disposition of the free drag drop report). `DRD-48` conforms, and `DRF-22` is closed. The owner accepted its +5 B Brotli, with no budget change. `DRD-49` selects the trace report's candidate 1: `y()` measures a window of rows that grows from the placeholder toward the pointer, instead of every row. [`performance-window-handoff.md`](performance-window-handoff.md) implements it. The owner approved its scope and ordering term and deferred virtualized lists until after 1.0.0. The unit implemented it at `501f60ab7` and reported at `56c1c27c3`, and the architect read it on 2026-11-12 in [`performance-window-assessment.md`](performance-window-assessment.md) (§Disposition of the performance window report). `DRD-49` conforms and is confirmed: the 2,000-item cycle row is faster by 2,508 µs of script per cycle. To fit the ceilings, the unit shared `xy()`'s rebuild with `y()`'s code, and with a sink each read allocates a view and a copy. `DRD-50` removes the allocation by range settling, and a paired probe decides whether the shared rebuild stays. [`performance-window-correction-handoff.md`](performance-window-correction-handoff.md) implements it. The unit implemented it at `8d002529a` and reported at `566d4d29e`, and the architect read it on 2026-11-12 in [`performance-window-correction-assessment.md`](performance-window-correction-assessment.md) (§Disposition of the performance window correction report). `DRD-50` conforms. The probe read "no difference shown", so the shared rebuild stays, and its A/A bounds don't limit a possible slowdown. The owner accepted the window's final bytes, with no budget change (`DRO-4`). The trace candidates are done, rejected or decisions first. One attribution probe is recommended and not started: the layout after a row animation ends at 2,000 items. If it finds nothing the library controls, the runtime pass is ready to close. The architect ran it on 2026-11-12 at `bb8e5ebb8` and recorded it in [`animation-end-layout-probe.md`](animation-end-layout-probe.md) (§Disposition of the animation-end layout probe). In Chromium 157, in a block list of fixed-height rows, every tested variant that started or stopped an animation or style of `translate`, `transform` or `opacity` invalidated the row's layout, and that layout cost more at 2,000 rows than at 20. None of the library-controlled forms the probe considered avoided it with the same rendering and cleanup, so the architect recommended closing the runtime pass. **The owner closed the runtime pass on 2026-11-12** ([`performance-plan.md`](performance-plan.md) §2 P3, which lists the confirmed results and the open items). Budgets are unchanged, and the deferred campaigns stay stopped. The owner inspects the code before a pull request is prepared and the phase closes. P4 hasn't started. `drag/performance` was squash-merged to `main` as `0a28f909a` (#15). **On 2026-11-12 the owner opened P4, the size pass, on `drag/size` from `0a28f909a`.** The architect read the package under CONTRIBUTING Part II in [`size-pass-assessment.md`](size-pass-assessment.md), with the probe and patches in [`probes/size-pass/`](probes/size-pass/README.md). No nannying, dead runtime vocabulary or diagnostic prose is left to remove. The measured candidates are worth tens of bytes per row, and no set of them makes a red row green, so `DRO-4`'s re-base stays the owner's. `DRD-51` decides how the pass measures and recommends its first unit, `DRF-13` and `DRF-14` together. `DRO-14` holds the four candidates that move a decision, a boundary or hot-path work. Budgets are unchanged, and the deferred campaigns stay stopped. At the owner's request, the architect revisited C6 at `c0d6b9205` in [`rect-index-ownership-proposal.md`](rect-index-ownership-proposal.md), with the variants in [`probes/rect-index-ownership/`](probes/rect-index-ownership/README.md). `RectIndex` becomes the dimension-neutral cache, each axis module holds its own policy, and `y()`'s prediction writes the slot buffer only through a lend scoped to one call and one range. That replaces C6's form in `DRO-14` item 2, which waits for the owner. The owner's staged `Callbacks` edit was left as it is. **The owner then committed that edit as `1d304128b`, approved P, and rejected C2.** `DRD-52` decides P, with the development check keeping the placeholder's x and the 7 B per committed move provisional. `DRD-53` decides the module factories. [`size-pass-unit-handoff.md`](size-pass-unit-handoff.md) is one unit that implements U1, `DRD-52` and `DRD-53` from `1d304128b`. `DRO-14` items 3 and 4 are unanswered. Budgets are unchanged, and `example: resize handle` is now 8 B over its ceiling. **The unit landed at `237d65d2f`, and the architect accepted its report** in [`size-pass-unit-assessment.md`](size-pass-unit-assessment.md): −62 B Brotli on "sortable + y", −56 B on "sortable + xy" and −65 B on "complete", with the allocation and timing results and their uncertainty under `DRD-52`. [`size-pass-followup-handoff.md`](size-pass-followup-handoff.md) carries the `invalidate` step's repair and the probe's launch documentation. `bench/campaign.ts` is now stated to be the tool for sequencing runs, apart from the deferred campaigns, which stay stopped. The architect then explored property mangling in [`property-mangling-exploration.md`](property-mangling-exploration.md), and `DRO-15` asks the owner whether the build shortens the internal property names. **The follow-up landed at `e22db849c` and `0c13786ea`, reported at `fe529df4c`, and the architect accepted it** (§Disposition of the size pass follow-up report). The owner then answered `DRO-14` items 3 and 4: C1's idle fast path and C5's capture functions stay unchanged. `DRF-20` closes, and P4 has no measured machinery candidate left. On `DRO-15` the owner started its first two steps, each a unit of its own, and holds the mangle until the published build's results exist. `DRD-54` decides the first step, and [`consumer-tests-handoff.md`](consumer-tests-handoff.md) implements it. Budgets are unchanged, and the deferred campaigns stay stopped. **The first step landed at `5ea7bb7e6` and reported at `87288b9d2`, and the architect accepted it on 2026-11-13** in [`consumer-tests-assessment.md`](consumer-tests-assessment.md) (§Disposition of the consumer tests report). 326 public browser tests pass against the emitted tree. The owner found that the consumer resolver lets an absolute path to a non-entry module reach its source. That is `DRF-23`, and `DRD-54` property 2 now decides by the resolved file. The build's clean doesn't target `src/`. On the owner's direction, `DRD-55` decides step 2: the size gate reads the published build through its exports map, one build per run serves both projects, box-quad stays on its source, and every ceiling stays. [`published-gate-handoff.md`](published-gate-handoff.md) repairs `DRF-23`, then implements `DRD-55`. The mangle stays pending, budgets are unchanged, and the deferred campaigns stay stopped. **Step 2 landed at `79b4c3132` and `69c260685`, reported at `2d9a2f482`, and the architect accepted it on 2026-11-13** (§Disposition of the published gate report). `DRF-23` is closed. The gate reads the emitted tree, the figures differ from `src` by −7 to +16 B Brotli, and no verdict changed. **The owner answered `DRO-15` step 3:** explicit `_` prefixes in source for strictly internal properties, then publish-time mangling, with public and platform names unchanged and no selection by type. The type-directed transform is deferred to [`performance-plan.md`](performance-plan.md) §6. `DRD-56` decides the step: one committed map from source name to output name, a step inside `tsdown`'s build, unchanged `.d.ts` files, source maps that lead back to `src`, and a node test that validates the publication. [`publish-mangle-handoff.md`](publish-mangle-handoff.md) implements it. Budgets are unchanged. **Step 3 landed at `f7b7b300b` and `31f92f5a9`, reported at `78797ebf6`, and the architect accepted it on 2026-11-13** in [`publish-mangle-assessment.md`](publish-mangle-assessment.md) (§Disposition of the publish mangle report). `DRD-56`'s properties 1 and 6 are corrected in place: property 1 names the members that a published type declares, and V4 accepts a `readonly` field's upstream mapping to its own member start, within a stated bound. The gain is −31 to −110 B Brotli per row. "example: resize handle" and "freeDrag" turn green and go to `DRO-4`, and four rows stay red. Budgets are unchanged, and the type-directed transform stays deferred. A fresh independent review of the publication pipeline is recommended, and the owner decides whether to start it. **On the owner's request, the architect audited the selection at `436b105c6`:** `DRD-57` adds 30 internal declarations that the starting set missed, because their names are also platform or published members, and [`mangle-selection-handoff.md`](mangle-selection-handoff.md) implements it. The independent review stays pinned to `436b105c6`. **On the owner's direction, `DRD-58` replaces `RectIndex`'s growable `Float64Array` slot buffer with one `number[]` that nothing replaces**, and removes the lifetime and reentrancy rules that replacement required. Fixed-size buffers stay as they are. [`slot-array-handoff.md`](slot-array-handoff.md) implements it after `DRD-57`'s unit, and reports its costs without a timing gate.

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
- **Choice 7, a scroll with the pointer still:** the mark is updated at the next sample, as `sortable`'s insertion is. A sample does no work without movement (DRI-17). **The drop is always correct:** `drop()` resolves at the release position and measures again after any invalidation. **Amended on 2026-11-12 by `DRD-48`:** the drop marks the targets and the bounds stale before it resolves, so it measures every target again. Measuring only after an invalidation missed a scroll whose event hadn't arrived (`DRF-22`).
- **Choice 8, published slot interfaces:** `Landing`, `LandingOptions` and `LandingTimingContext` from each landing entry. `DropTargets`, `DropTargetTracker`, `DropTargetDrag` and `DropTargetsOptions` from `free-drag/drop-targets.js`. `bounds.js` keeps exporting its types as now. The `axis` and `displacement` interfaces stay private (`DRD-2`).
- **Choice 9, `RectIndex`:** private fields read through getters typed as read-only views, as measured in [`rect-index.diff.txt`](probes/feature-composition/rect-index.diff.txt). CONTRIBUTING's class-encapsulation rule requires the change, and this is the form chosen. A closure is also allowed, but a class keeps the development check's access in one declaration. **Amended 2026-11-12 by `DRD-52`:** writes leave the class only through `lend`, which is scoped to one call and one slot range.
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

**Amended 2026-11-12 by `DRD-53`.** Property 5's file is `src/kernel/callbacks.ts`, its class is `List`, which is exported only as a type, and the factories are the module's `queue()` and `stack()`. The text above is unchanged.

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

**Amended 2026-11-12 by `DRD-53`:** properties 1, 3 and 4. A list holds the array method itself, the factories are module functions, and the class is exported only as a type. The text above is unchanged.

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

**Amended on 2026-11-11 by `DRD-46`:**

- Property 2's last sentence applies to a row that has a measured floor. A candidate under `DRD-46` is confirmed by a verdict of "faster" beyond the A/A bound, with no floor.
- Property 5 no longer comes before an optimization unit. A floor is measured when a reading needs one: for an instrument change, or when the architect has to read a "no difference shown" on a selected candidate.

#### DRD-41 — The step-list injection shows that the bytes rule doesn't flag kernel work that allocates nothing

**`compare.ts`'s injection "one entry on the step list per frame" keeps its name, patch and scenario, and is expected not to flag. It is the bytes rule's specificity witness: kernel code that runs on every frame and allocates no object stays under the rule. The rule's sensitivity is shown by "1 KB allocated per move" and by `DRF-1`'s array of four numbers in `Gesture.enter`, which every sample and every frame reach.**

Decided on 2026-11-10 by the architect, on the [instrument unit's return](performance-instrument-report.md) at `b8f1d1b35` (§Returned).

**Why:**

- **The injection's cost was the allocation an entry made, and the step list no longer makes one.** At `b91db2818` the patch pushed onto `#steps` in `draggable.ts`, and the bytes row read 73 to 80 B per move under `requestStep` ([remediation report](remediation-report.md) §Instrument proof). Since `DRD-35` and `DRD-36` the list is a `CallbackList`. It keeps a callback and its receiver in two slots of one array, which it reuses, and `DRD-35` property 9 requires no object per entry. The same route at the current source didn't flag in 3 of 3 rounds. Its kernel keys read 1 to 7 B per move, as base does ([`n3-prove.json`](measurements/2026-11-10-performance-n3-prove.json)). The regression the injection modelled has no byte cost now, so its quiet reading is correct.
- **Making it flag again would test the patch and nothing else.** It would need an allocation added to the route for that reason alone. That allocation would repeat `DRF-1`'s witness, which allocates in `Gesture.enter` on every entry and read 96 to 108 B per move.
- **A path needs no flagging witness of its own under the location rule.** The rule selects by module, so code in a kernel module is selected whichever path calls it. The frame path's functions are keyed under the kernel in every arm of that run, such as `kernel/gesture.ts:requestStep` and `kernel/session.ts:requestStep`. A witness on the frame path was needed while the rule selected by name.
- **The opposite error had no witness.** N3 showed that an allocation outside the kernel doesn't flag. Nothing showed that extra kernel calls with no allocation don't flag. The existing patch is that case, on a route that no scenario otherwise sends through the list.

**Required properties:**

1. The injection's name, file, `find`, `replace` and scenario are unchanged. Its expectation is that no verdict on its row flags.
2. `--prove` passes only when every injection expected to flag flags, and every injection expected to stay quiet doesn't flag. Its printed line and its JSON tell a met quiet expectation from a broken one.
3. The header comment and the injection's comment state what the witness tests.
4. A quiet result counts only from a run in which the bytes row's flagging injections flag. A `--only` run that selects the quiet injection alone shows that it applies, and nothing about the rule.
5. A flag on the quiet injection is a return to the architect. Either the rule flags kernel work that allocates nothing, or the step list allocates per entry, against `DRD-35` property 9. Neither is repaired by changing the expectation.

**Rejected:**

- **Withdraw the injection.** It is the only check that the rule doesn't flag kernel work with no allocation, and the only one that runs `DRD-35` property 9 once per frame. Keeping it costs one bytes run of 3 rounds.
- **Add an allocation to the route**, for the reason above.
- **Move it to a timing row.** An entry costs a few array operations per frame. Item 3's floors will show whether a timing row could see that, and a gate on it would guard no decision.

**What this amends:** [`performance-instrument-handoff.md`](performance-instrument-handoff.md), at its boundary on each injection's expectation, item 2's N2 row and item 5 step 1, and [`performance-plan.md`](performance-plan.md) §2 P1 step 4. `DRD-23`'s last bullet is unchanged.

#### DRD-42 — The kernel per-sample test samples after one unsampled pass of its own loop

**`hot-path` › "should allocate per sample only the CSS string a lifted write needs" runs its 300-move loop once without sampling, waits for frames, and then samples the same loop. Its `< 16`, its 64 B interval and its 300 sampled moves are unchanged. The test bounds what the kernel allocates per sample once its code is warm. The repair is accepted only if M1, M2 and M3 fail with the same warm pass in place.**

Decided on 2026-11-11 by the architect, on [`performance-instrument-report.md`](performance-instrument-report.md) §4 at `c279973a3` ([assessment](performance-instrument-assessment.md) §3).

**Why:**

- **The result depends on what ran before the test.** Launched alone, the kernel reads 14.96 to 18.47 B per move and fails in 8 of 10 runs. After the five earlier tests of its file, or in the Chromium suite, it reads 0 in 15 of 15 runs, with no kernel key. One unsampled pass of the same loop brings the alone figure to 0.28 to 1.31 in 10 of 10 runs, with only `kernel/session.ts:handleEvent` left.
- **The alone figure is spread over every kernel function on the path,** 0.3 to 6.3 B per move each, in `handleEvent`, `#move`, `enter`, `#applyRequests` and both `requestStep` methods. No single function holds an object per sample. That is the pattern of code that hasn't reached its optimized tier and allocates small values as it runs (H1). No optimization trace was taken, so this cause is inferred and not observed. One 64 B sample is 0.21 B per move, so granularity (H2) can't explain a level of 15 to 18 B.
- **The test's claim is about the library's allocation.** What the code allocates before it is optimized depends on V8's tiering, which can change with a Chrome version and with what ran earlier. A test that measures it is order-dependent: a `-t` run and a whole-file run disagree on the same source.
- **Warm code still shows an allocation that escapes.** M1, M2 and M3 store into a module-level variable. In the file context, where the code is already warm, they failed in every run: 41.68 to 101.71 B per move, and 51.85 to 53.97 for M3, the smallest object. That is evidence for the warm pass, not proof of it. Property 4 is the proof.

**Required properties:**

1. Before sampling starts, the test runs the same 300-move loop, at the same positions and in the same operation, without sampling. It then waits for frames as it does before sampling now. Nothing else in the test changes, and the `DRF-2` test doesn't change.
2. `< 16`, the 64 B interval, the 300 sampled moves, the kernel selection by location and the lift assertion are unchanged.
3. The comment says that the first pass lets the kernel's code reach its optimized form, that the test bounds the warm figure, and that an allocation that escapes, such as an object per sample, shows as tens of bytes. It no longer says that a few bytes per move remain from reading an event field: warm, the figure is 0 to 1.31.
4. **Sensitivity under the same warm pass.** With the warm pass in place, M1, M2 and M3 of the [report](performance-instrument-report.md) §4, at the same sites, each fail in every run, launched alone and launched as its file. M3, one object with two number properties per sample, is the smallest that must fail.
5. Launched alone, the unmutated test passes in every run.

**What it withdraws, stated completely:** the test no longer bounds what the kernel allocates before its code is optimized: 15 to 18.5 B per move over the first 300 moves of a page, about 4.5 to 5.5 KB once. It also doesn't bound an allocation that the optimizing compiler removes because the value doesn't escape. The handoff's M4 records whether such an allocation shows. The file and suite runs were already warm, so neither was bounded there before this decision.

**Rejected:**

- **Raise `< 16`.** Alone the figure reaches 18.47, so a limit that passes needs about 24. That limit would follow V8's tiering, not the library, and the reading shows that the level comes from the launch context.
- **Run the test only as part of its file.** Its verdict would still depend on the tests before it, and a `-t` run is a normal way to run one test.
- **Sample more moves to dilute the first ones.** The figure would still depend on when the code is optimized, and each run would take longer.

**What this amends:** [`performance-plan.md`](performance-plan.md) §2 P2, first bullet, which it decides. The test's setup is an instrument scenario under `DRD-40` property 3, so this decision comes before the change, and names the reading.

#### DRD-43 — The timing rows can't resolve an optimization yet, and in-page rows on the move path and the cycle come first

**No optimization unit starts before a timing row it reads has a floor fine enough for its expected effect. The CDP timing rows stay as they are, for the before arms and `DRO-4`. Rows driven from inside the page are added for 300 moves and for 50 activate-and-drop cycles. They are measured and judged as every timing row is, and their floors are measured twice, in separate processes. `judge`, its rounds, and every existing row, injection and floor entry are unchanged.**

Decided on 2026-11-11 by the architect, on [`performance-instrument-report.md`](performance-instrument-report.md) §3 and §5 at `c279973a3` ([assessment](performance-instrument-assessment.md) §4).

**Why:**

- **No timing row resolves a likely optimization.** On "300 moves, one frame each, 20 items" the script A/A bound was 20 to 221 µs per move across seven runs, against production's 163 to 168 µs. The graded entries flagged at 50 µs measured, and missed at 147 µs and at 5 µs. On "50 activate-and-drop cycles, 20 items, no landing" the bound was 334 to 3,283 µs per cycle against 1,792 to 2,120 µs, and the entries missed at 411 µs and 207 µs. On the press and keyboard rows the bound alone was 42 to 624 µs and 101 to 351 µs. Task-time bounds were 151 µs to 31,745 µs.
- **Most of a move row's script isn't the library's.** Each move costs one CDP input command and one page evaluation that awaits a frame. The no-lift `draggable` row reads 102 to 115 µs per move and free drag 106 to 117 µs, against the sortable row's 163 to 168 µs. So `sortable`'s own share at 20 items is at most about 55 to 65 µs, by difference, and a 10 % saving of it is about 6 µs. That is below every floor the row showed. The share that the harness takes isn't measured; the new rows measure it.
- **One disturbed round sets a row's bound.** In the 100 µs per move entry, round 1's A/A difference was 221 µs and the other six were within 35 µs. Across B1's and B2's timing rows, the largest absolute A/A difference was 1.3 to 10.9 times the median one. That is a property of `judge`, which `DRD-40` property 2 keeps. Less noise in each reading lowers the bound with it, so the readings come first and `judge` second.
- **The other instruments are fine enough.** Layout counts are exact. The bytes row flags one two-number object per sample, 30 to 35 B per move over base in 3 of 3 rounds. The retained row flags one two-number object per operation, 5,012 B against a bound of 0 B. The per-sample tests are `DRD-42` and `DRF-2`.

**Required properties:**

1. **No CDP command per event in the timed window.** An in-page row's events are dispatched by one page evaluation, which awaits one animation frame per move as the CDP row's moves do. The positions are those of the CDP row it mirrors. A press and crossing before the window may use CDP input.
2. **The same measure and rule.** Script, task and layouts come from CDP's metrics before and after the window, per event. The rule is `exact-and-floor`, judged by the unchanged `judge` at the same rounds.
3. **The same path.** The events reach the library's listeners as real input does, with no change under `src/`. A gate injection at the CDP row's site flags on the in-page row, and every cycle ends.
4. **Arms built from this package's source only:** production, control, the `--before` arm and injected copies. The rows run under `--before`, `--prove` and `--floors`, are validation rows, and don't run with drag2 and the prototype.
5. **The harness's share is measured.** A report row dispatches the move row's events to a list with no behavior mounted.
6. **Floors, stated before running.** Graded entries of fixed work, at the gate injection's site. A row's floor in one run is the smallest entry that flags script slower, provided every larger entry flags in that run. The floor is stable when two runs in separate processes give the same entry.
7. **Sufficiency, stated before running.** A row is fine enough for an optimization unit when its floor is stable and the floor's measured median is at most 10 % of the library's share of the row's script: production's median per event minus the harness row's, for the move row, and production's median, for the cycle row.
8. **Optimization waits.** [`performance-plan.md`](performance-plan.md) P3 starts only on a row that meets property 7. A unit states that row and its floor.

**Rejected or deferred:**

- **More rounds on the CDP rows.** The bound is the largest absolute A/A difference, which grows with the number of rounds.
- **More events per CDP reading.** The harness's share grows with the events, and each event costs a CDP round trip.
- **A change to `judge`'s bound now.** Deferred. If the in-page floors aren't stable between two runs, their readings decide it, as a decision first.
- **An in-page clock.** `performance.now()` can be coarsened to 100 µs in a page that isn't cross-origin isolated, and a second measure would need rules of its own.
- **Repeating B1 and B2.** The CDP rows are unchanged, so B1 and B2 remain their baseline.

**What this amends:** [`performance-plan.md`](performance-plan.md) §2: it decides P2's second bullet, adds P1b and sets P3's entry condition. `DRD-40` property 5 applies to the new rows, and `DRD-23`'s last bullet to the instrument change.

**Amended on 2026-11-11 by `DRD-46`:** property 8 is superseded. An optimization unit starts on a candidate the architect selects from a trace report, and no row has to meet property 7 first. Properties 1 to 6 still define the in-page rows, and property 7 still says when a row's floor is fine for an effect of a given size.

#### DRD-44 — One experiment separates the machine from the method before the in-page rows' resolution changes

**The in-page gates' failure is attributed by one experiment before anything else changes. The experiment runs the two in-page gate injections and the CDP 20-item move row's A/A, unchanged, in four processes: unpinned, pinned to the E-cores, unpinned, pinned. Each reading records its main thread's run-queue wait, the core class it ran on, and a speed gauge. The outcome table below, fixed before the run, decides what changes next. Until then, F1, F2, `--prove` and B3' aren't repeated, and `judge`, the rounds, events per reading, every row, every injection and the launch are unchanged.**

Decided on 2026-11-11 by the architect, on [`performance-resolution-report.md`](performance-resolution-report.md) at `39c8b432c` ([assessment](performance-resolution-assessment.md) §4).

**Why:**

- **The recorded noise moved with the machine.** The CDP move row at 20 items had script A/A bounds of 20 to 36 µs per move in every run at a one-minute load of 3.8 or less. In this campaign's `--prove`, at 5.6 to 8.3, it was 143 µs. The in-page rows in the same pass were no noisier than their mirrors, at 0.63 to 0.93 of their median against 0.51 to 0.81. In round 6 every arm of 13 of the 15 timing rows read above 1.1 times its row's base median, and in rounds 1 to 5 no row did.
- **The machine has 4 fast threads.** It is an i7-1255U: CPUs 0 to 3 are P-core threads at 4.7 GHz, and CPUs 4 to 11 are E-cores at 3.5 GHz. Every earlier timing run had a load below 4, and this campaign had 4.0 to 9.5. So a reading can run partly on a slower core, or wait for one, by an amount that changes with the load. This is inferred, not observed.
- **The record can't separate that from the method.** The gates' bounds come from differences between pages a few seconds apart, not from the disturbed round. A reading has no time stamp and no record of where it ran. A new page per arm and `judge`'s largest-difference bound could give the same spread on a quiet machine.
- **Each outcome leads to a different change.** A machine limit is removed by a launch condition, and the instrument stays. A method limit needs the remedies `DRD-43` deferred. Choosing either without the attribution would change the instrument on a guess.

**Required properties:**

1. **A probe, not an instrument change.** It is a scratch copy of `bench/compare.ts` at this decision's base, with its main block replaced and a recorder added, as the scale probe was. It uses the unchanged scenarios, `judge`, `openPage`, and the injections "30 µs of script per move, in the page" and "300 µs of script per cycle, in the page". Its source is saved under `measurements/` as text. No tracked file under `bench/`, `src/` or `tests/` changes.
2. **Rows and arms.** Per process, as `--prove` runs them, at 7 rounds each: the 30 µs gate on "in the page: 300 moves, one frame each, 20 items", the 300 µs gate on "in the page: 50 activate-and-drop cycles, 20 items, no landing", each with arms injected, base and injected control, and then the A/A of "300 moves, one frame each, 20 items" with three production arms. Verdicts come from the unchanged `judge` against `base`.
3. **The recorder.** For each reading it records the wall-clock start and end of the window, and the main thread of the renderer process that hosts the page. For that thread it records on-CPU time and run-queue wait over the window, from `schedstat`, and the CPU it last ran on, sampled every 20 ms. When several renderers exist, the page's renderer is the one whose main thread has the most on-CPU time in the window. The recorder also takes the system's CPU pressure, the `some` total of `/proc/pressure/cpu`, over the window, and the one-minute load at its start. It reads `/proc` from Node only, and adds no CDP command and no page evaluation inside the window.
4. **The speed gauge.** Fixed work of the floor entries' loop body, 20 ms nominal at `ITERATIONS_PER_US`, run by its own page evaluation just before and just after the window, outside it. Its duration is measured in the page.
5. **Conditions, in this order, as four steps of one campaign:** U1, E1, U2, E2. U starts the probe as every run so far, and E starts the whole probe, and so Chrome, under `taskset -c 4-11`. The core sets are checked first from `/sys/devices/cpu_core/cpus` and `/sys/devices/cpu_atom/cpus`. No synthetic load is added.
6. **No heavy check from the owner's sessions overlaps a process.** That covers builds, size runs, typechecks and test suites. The unit asks those sessions to hold before the first browser process and releases them after the last one, and records both times. Other load is recorded, not controlled.
7. **Settled, fixed before running.** A reading is settled when three things hold: its main thread's run-queue wait is at most 5 % of its on-CPU time plus wait, at least 90 % of its placement samples are in one core class, and both gauges are within 10 % of the process's median gauge. A round of a row is settled when every arm's reading in it is settled. These thresholds are below the gates' size: 30 µs is 25 % of the move row's 119 µs, and 300 µs is 19 % of the cycle row's 1,582 µs.
8. **The outcome, read per gate row, by the architect.**

   | Outcome | Condition | What follows |
   | --- | --- | --- |
   | **Machine** | The gate flags in every process where its row has at least 6 settled rounds, and at least one such process exists. In every process where it fails, its row has at least 2 unsettled rounds | A decision on the launch and admission condition for timing runs: the core set, and a settled-round or quiet-window rule. Then F1, F2, `--prove` and B3' under that condition. The reason readings were unsettled decides the condition. If it was placement, the condition is pinning. If it was run-queue wait in both conditions, it is admission |
   | **Method** | The gate fails in a process where its row has at least 6 settled rounds | The decision `DRD-43` deferred, on events per reading or `judge`'s bound, from that process's readings |
   | **Not resolved** | No process has 6 settled rounds on the row | Nothing changes. The experiment runs once more in a window the owner provides |

   The CDP row's bound ÷ median in each process is reported beside the table. A settled process whose CDP row reads above B1 to B3's 0.12 to 0.21 is quieter by the recorder than by its readings, and that is reported as a limit of the recorder.

9. **What it doesn't decide.** It measures no floor, and `DRD-43` property 7 is unchanged. The probe's readings aren't a baseline.

**Rejected:**

- **Repeat F1, F2 and `--prove` at a lower load.** The load isn't under control, and a pass or a fail would not show the mechanism or the launch condition that keeps it out.
- **Change `judge`'s bound or events per reading now.** That would change the method before the readings show that the method is the limit. `DRD-43` deferred both for this reason.
- **Pin every timing run to a core set now.** Placement is inferred from the load and the topology, and nothing has shown it.
- **Add a synthetic load.** It slows the other sessions on a shared machine, and the ambient load already varies. The recorder measures it in each reading.
- **A warm pass inside the page now.** It is a method change. If the method outcome follows, it is a candidate there.
- **Pin to the P-core threads.** With a load above 4 they are the most contended CPUs, and two pairs of them share a core.

**What this amends:** `DRD-43`: B3' and the in-page floors wait for this outcome. [`performance-plan.md`](performance-plan.md) §2 P1b gets a fifth step. `DRD-40` property 4: from this decision on, every browser run's machine record also names the CPU model and its core sets. `DRD-23`'s last bullet doesn't apply, because no instrument changes.

**Amended on 2026-11-11 by `DRD-45`:**

- Property 4's gauge and property 7's third test no longer decide whether a reading is settled. The settled flags in the experiment's files stay as recorded.
- Property 8's "not resolved" row no longer leads to a rerun. `DRD-45`'s check replaces it.

#### DRD-45 — The gauge is withdrawn, and one same-page check splits the page, the window and the clock

**`DRD-44`'s outcome is final as not resolved, on both in-page gate rows. Its gauge test is withdrawn, because the gauge measures its own first run and the page's state, not the machine. Its rerun is withdrawn, because an unchanged rerun can't settle a round. One unpinned process measures each in-page gate row in four windows per page across ten pages, and records the clock of the CPU the page's thread runs on. The outcome table below, fixed before the run, reads each row as page, clock or window. F1, F2, `--prove` and B3' still aren't repeated.**

Decided on 2026-11-11 by the architect, on [`performance-sensitivity-report.md`](performance-sensitivity-report.md) at `24cdadc48` ([assessment](performance-sensitivity-assessment.md) §3 and §4).

**Why:**

- **The gauge's first run is slower in every reading, and the machine doesn't explain it.** In each process, the lowest gauge before a window is 20 to 24 % above the lowest after it. Not one of 252 gauges before a window came within 5 % of its process's lowest after. The gauge before is the first run of its function in a fresh renderer, so it carries either its own warm-up or the fresh page's state.
- **It doesn't read the machine at a reading's scale.** Pearson r between a reading's two gauges is +0.03 to +0.26. The gauge's median changes with the row that ran before it, and its correlation with the reading's script is −0.42 to +0.28, with no consistent sign. The one machine property it shows is the core class, and placement records that already.
- **An unchanged rerun can't settle.** Every one of 126 unpinned readings ran under 90 % on one class, at loads of 1.0 to 4.0. The gauge test failed in 16 to 20 of 21 readings per row and process, pinned or not.
- **The pinned readings can't be read now as the method outcome.** With the gauge test dropped, each gate fails in one fully settled pinned process. But the test was there to rule out the clock, which varies on this machine, and a test changed after the verdicts are known would move a rule with a reading (`DRD-40`).
- **The method changes in any outcome.** At loads of 1.0 to 4.0, the gates' bounds were 0.29 to 0.38 and 0.14 to 0.39 of the base median. `DRD-43` property 8 needs a floor of at most 10 % of the library's share. What is still open is which part of the method makes the spread, and whether the clock needs an admission condition besides.
- **Same-page windows separate the page from the machine.** Windows two runs apart are about the same time apart whether they share a page or not, so the machine adds to both alike, and only the page differs.

**Required properties:**

1. **The gauge test is withdrawn.** `DRD-44` property 4's gauge and property 7's third test no longer decide whether a reading is settled, in any process recorded or to come. The gauge stays in this check as a record only (property 8).
2. **`DRD-44`'s outcome is final**, as not resolved, for "30 µs of script per move, in the page" and "300 µs of script per cycle, in the page". Its rerun is replaced by this check.
3. **A probe, not an instrument change.** A scratch copy of the sensitivity probe at `24cdadc48`, with its recorder and gauge as they ran there and its main block replaced. It uses the unchanged scenarios and `openPage`'s page set-up. It has no injection and no `judge`. Its source is saved under `measurements/` as text. No tracked file under `bench/`, `src/` or `tests/` changes.
4. **Pages and windows.** One process, unpinned, as every run before `DRD-44`.
   - The rows are "in the page: 300 moves, one frame each, 20 items" and then "in the page: 50 activate-and-drop cycles, 20 items, no landing", both on the production arm.
   - Each row runs on 10 pages in sequence. Each page is set up as `openPage` sets up an arm.
   - In each page, the row's unchanged `run` runs 4 times, with only `lab.destroy()` between runs. Each run's window is one reading, s(p, k), the script per event of window k in page p.
   - Each window's layout count equals the row's: 83 per window for moves and 250 for cycles. Any other count returns the unit.
5. **The record.**
   - **Each window:** `DRD-44` property 3's record.
   - **The clock:** at each 20 ms placement sample, the recorder reads `cpuinfo_avg_freq` of the CPU the main thread last ran on, from Node. The window's clock is the mean of those reads. A failed read is recorded as missing. A window with fewer than half its reads present returns the unit.
   - **The gauge:** two runs back to back after the page's set-up and before the first `run`, g1 and g2. Each window keeps the sensitivity probe's gauges, b_k before it and a_k after it. Each gauge has its own clock reads, and every gauge runs outside a window.
6. **Machine state.** The hold of `DRD-44` property 6, and the machine record of its amendment to `DRD-40` property 4. The record at the head and the foot also gives each CPU's `scaling_governor` and `energy_performance_preference`.
7. **The outcome, per row, fixed before the run.**
   - **W** is the median over the 10 pages of |s(p, 4) − s(p, 2)|.
   - **B** is the median over the 9 adjacent pairs of |s(p + 1, 2) − s(p, 4)|.
   - **ρ** is Spearman's coefficient between s and the window's clock, over the row's 40 windows.

   W and B both compare warm windows two runs apart. Window 1 of each page carries its own warm-up, so neither uses it.

   | Outcome | Condition | What follows |
   | --- | --- | --- |
   | **Page** | B ≥ 2 W | The method: the new page per reading. The decision `DRD-43` deferred, extended to the page. Candidates include warm windows in one page, the remedy `DRD-44` rejected "now" |
   | **Clock** | B < 2 W and ρ ≤ −0.5 | The machine: an admission condition on the clock record, then F1, F2, `--prove` and B3' under it, and the method decision after them |
   | **Window** | B < 2 W and ρ > −0.5 | The method, inside the window: the decision `DRD-43` deferred, on events per reading or `judge`'s bound |

   ρ ≤ −0.5 means script falls as the clock rises. A busier window can also raise its own clock, which gives a positive ρ, and that doesn't count as the clock outcome.

   Reported beside the table, per row:
   - W and B ÷ the row's median;
   - each page's s(p, 1) ÷ the median of its windows 2 to 4;
   - the median spacing in seconds of the pairs in W and in B;
   - each window's share of samples on CPUs 0 to 3.

8. **The gauge decides nothing here.** If g1 exceeds g2 in at least 18 of the 20 pages, `DRD-44`'s difference between before and after was the gauge's own warm-up. Otherwise it was the fresh page's state. The report gives that count, the medians of g1 − g2, b1 − g2 and a1 − b1, and Spearman's ρ between each gauge and its clock. No reading's status depends on them.
9. **The injection repair for `566ebfc65`.** At `566ebfc65` on `drag/performance`, `MOVE_SITE` no longer occurs, and 10 of the 23 applied entries are stale. Before any campaign on that source or a descendant, a unit repairs them:
   - each stale find text occurs exactly once, in `move()`, before its `#lift.translate` call;
   - `--prove --dry` applies 9 entries and `--floors --dry` applies 14, with no browser;
   - no other entry, rule, scenario, count or wait changes.

   This check doesn't wait for the repair: it runs on this branch's `src`, which is `a9c323f6a`'s, and has no injection.

10. **What it doesn't decide.** It measures no floor, and its readings aren't a baseline. `DRD-43` properties 7 and 8 are unchanged. After each outcome, the architect chooses the remedy from the check's readings.

**Rejected:**

- **Rerun `DRD-44` unchanged.** Unpinned readings fail placement every time, and the gauge test fails on the gauge.
- **Read E1 and E2 as the method outcome with the gauge test dropped.** The test would be chosen after the verdicts, and nothing would then rule out the clock.
- **Warm the gauge and rerun `DRD-44`.** A 20 ms arithmetic loop outside the window still can't see the clock during the window's short bursts of work, or contention for cache and memory. The clock is read inside the window instead.
- **A gauge-only check.** It would confirm the assessment's §4.1, and leave the machine-or-method question open.
- **Pin the check to the E-cores.** `taskset` put all of Chrome on 8 cores and widened the spread on every row. The instrument runs unpinned.
- **Add more events per reading now.** That is a remedy, and the window outcome leads to it.

**What this amends:**

- **`DRD-44`:** properties 4, 7 and 8, as its amendment note states.
- **The plan:** [`performance-plan.md`](performance-plan.md) §2 P1b gets a sixth step.
- **`DRD-43`:** B3' and the in-page floors wait for this outcome.
- **`DRD-23`'s last bullet** doesn't apply, because no instrument changes. The repair in property 9 restores where entries apply, and its dry checks show that.

**Stopped on 2026-11-11 by `DRD-46`,** on the owner's direction, before any browser process: properties 3 to 8, the check. They are kept as written, with the handoff and its return, and resume only on the owner's direction. Properties 1, 2 and 9 stay in force.

#### DRD-46 — Short scenario traces choose the optimization candidates, and a focused paired measurement confirms the one selected

**`DRD-45`'s check is stopped before it ran, and kept for possible later use. The phase now records short, inspectable Chrome traces of named scenarios, with each scenario's set-up outside the traced interaction, and names optimization candidates from them. The first scenarios are `sortable` moves that reorder, at 20 and 2,000 items, and the press and release below the threshold at 2,000 items. The trace unit changes no production source. An optimization unit starts on one candidate that the architect selects from the trace report, and a focused paired measurement of the scenario it targets confirms it. No row has to meet `DRD-43` property 7 first.**

Decided on 2026-11-11 by the architect, on the owner's direction to stop the page check and redirect the performance work to short scenario traces. [`performance-trace-handoff.md`](performance-trace-handoff.md) applies it.

**Why:**

- **The owner's direction.** The owner stopped `DRD-45`'s check, asked for short scenario traces starting with reordering moves and the 2,000-item press, and asked that a selected candidate be confirmed later by a focused paired measurement, not after the timing rows are shown to be sensitive in general.
- **General sensitivity hasn't converged, and one optimization doesn't need it.** P1, P1b and `DRD-44` gave no row the floor that `DRD-43` property 7 asks for. At the quietest load on record the in-page gates' bounds were 0.14 to 0.39 of the base median ([assessment](performance-sensitivity-assessment.md)). A candidate chosen from a trace comes with a scenario and an expected saving, so its measurement only has to see that one effect.
- **The existing attribution can't choose a candidate.** `compare.ts --profile` profiles a whole run, set-up included, and reports self time by function name only. It can't show which event, task or frame the time falls in, which layout a script forces, or how the consumer's and the harness's code compare with the library's. A trace shows all of these, and the owner can open it.
- **Both first scenarios are known costs.** The move rows' positions cross a row boundary about every 7 moves, so reorders are the move path's heaviest events. The press at 2,000 items with `[...root.children]` is the one timing row slower than drag2 in both B1 and B2, by 385 and 472 µs per press. That is `DRO-1`'s pull at a press. The cached-array row at 2,000 items separates the consumer's copy from the library's own work.

**Required properties:**

1. **The check is stopped and kept.** `DRD-45` properties 3 to 8 aren't run. [`performance-page-check-handoff.md`](performance-page-check-handoff.md) and its return stay as written. If the owner resumes the check, the architect first decides the return's blocker, the cycle row's end check, and states the base the check then runs on. `DRD-45` properties 1, 2 and 9 stay in force: property 9's repair comes before any `--prove` or `--floors` on `566ebfc65`'s source or a descendant. A trace and a `--before` comparison apply no injection, so they don't wait for it.
2. **A trace attributes, and measures no difference.** Nothing in a trace report is a verdict, and no threshold, rule, scenario, row, injection or budget changes on one. Trace files that a report cites are kept as `DRD-40` property 4 keeps raw readings, with the machine record of `DRD-44`'s amendment. No hold is required.
3. **The traced code is the measured code.** The trace builds the production arm as `compare.ts` builds it: this branch's `bench/lab.ts`, `__DEV__` false, unminified, from `packages/drag/src` at a named revision. The first unit traces `566ebfc65`, the source after the alias cleanup, which the move path's modules changed. No existing row, injection, floor entry, lab file or mode of `compare.ts` changes.
4. **Set-up is outside the trace.** Tracing starts after the page is set up, the composition is mounted, any untraced warm pass has run and the page is idle. User-timing marks divide the traced interaction into its phases, and each input event can be found in the trace.
5. **The first scenarios.** Each is a short form of an existing `compare.ts` row, with that row's mount options, positions and waits, driven by CDP input as that row is:
   - **Reordering moves, 20 and 2,000 items:** the press and crossing, the move row's positions for i = 0 to 60 with one frame each, the release and the landing.
   - **Press and release below the threshold, 2,000 items:** with `[...root.children]` and with the cached array, and the cached array at 20 items as the reference.

   Each scenario has warm traces after one untraced pass of its interaction in the same page, and one cold trace of the page's first interaction.

6. **Inspectable.** Each trace opens in Chrome DevTools' Performance panel. For the page's main thread it holds the tasks, input dispatch, animation frames, JavaScript samples with stacks that name the bundle's functions and lines, style and layout with the script that forced them, paint, garbage collection and the user-timing marks. The bundle a trace ran is kept with it, so a sample's line resolves to its module.
7. **A candidate is a site with a cost and a mechanism.** The report names, for each candidate: the function and lines at the traced revision, the scenario and phase, how often it runs, its cost per event in the warm and cold traces, the avoidable work and why behavior doesn't change, the expected saving (marked estimated), the existing row that would confirm it, and every decision, invariant or owner decision it touches. A candidate that moves ownership, a contract invariant, or `DRO-1`'s pull is a decision first (`DRD-40` property 7). A cost the library can't change, the consumer's or the browser's, is reported but isn't a candidate.
8. **Confirmation is focused and paired.** The architect selects one candidate and records the selection. Its unit makes one bounded change, then runs `compare.ts --before <baseline revision> --only <rows>` in one browser process, with the unchanged `judge`, rounds and A/A control. The rows are the existing rows that the scenario mirrors, CDP and in the page where both exist, and any existing row on another path that the change reaches. The run is under `DRD-44` property 6's hold, with its machine record.
   - **Confirmed:** the target row's verdict is "faster" in script beyond the A/A bound, or, for a layout candidate, the layout count falls.
   - **Not confirmed:** "no difference shown" is no result. The architect decides what follows: the change doesn't land as an optimization, or one focused injection of the expected size at the candidate's site shows whether the row could see it, or a longer row is added, which is an instrument change and a decision first.
   - **Returned:** a "slower" verdict on any row.
   - The unit also runs the three-engine suite, the per-sample and census tests and the size table, as P3 states.
9. **What it doesn't change.** `judge`, its rounds, every row, injection and floor entry, and `DRD-40` properties 1, 3, 4, 6 and 7. The in-page rows stay as `DRD-43` properties 1 to 6 define them.

**Rejected:**

- **Resume the page check with a remedy for its return.** The owner stopped it. Its readings would decide a method change for every row, which this decision no longer needs before an optimization.
- **`compare.ts --profile` as the attribution.** See above. It stays for its own use.
- **Trace a whole 300-move or 100-press row.** Most of the trace would repeat one event, and the set-up would sit beside the interaction. A short form of the same row keeps the row's positions, so the row can confirm what the trace found.
- **In-page dispatch for the traces.** The in-page rows skip the browser's input path. A trace should show the input path a consumer gets.
- **Prototype candidates in this unit.** The owner asked for no production optimization yet. A saving is estimated from the trace and measured in the candidate's own unit.

**What this amends:**

- **`DRD-45`:** properties 3 to 8 are stopped, as its note states.
- **`DRD-43`:** property 8 is superseded, as its note states.
- **`DRD-40`:** properties 2 and 5, as its note states.
- **The plan:** [`performance-plan.md`](performance-plan.md) §2 gets P1c, and P3's entry condition changes.
- **`DRD-23`'s last bullet** doesn't apply to the trace mode, because it produces no reading and changes no instrument. The handoff's dry checks show that the existing modes are unchanged.

#### DRD-47 — The pointer drop confirms the axis cache against one row instead of measuring every row

**The first optimization unit is candidate 2 of the trace report, in a changed form. The pointer drop's unconditional `axis.invalidate()` protects one supported case: a scroll that moved the rows after the browser's last rendering update, whose `scroll` event hasn't reached the library when the release arrives. So the call isn't deleted. The drop reads one cached row again and measures every row only when that row moved or the cache is already stale. The contract states the sortable drop's geometry rule, and puts a change in the rows' relative geometry with no signal outside it. A focused paired measurement of the 2,000-item cycle rows confirms the change.**

Decided on 2026-11-11 by the architect, on [`performance-trace-report.md`](performance-trace-report.md) at `e92e21eed` ([assessment](performance-trace-assessment.md) §2 and §3), under `DRD-46` property 8. The owner asked for one bounded candidate, with candidate 2's unconditional call treated as a hypothesis to verify.

**Why:**

- **The unconditional call protects exactly one supported path.** A pending frame, a pending step, a dispatched `scroll` or `resize`, and the controller's `invalidate()` each leave the cache either true or marked stale, so the drop would measure without the call ([assessment](performance-trace-assessment.md) §2). A browser dispatches `scroll` in its next rendering update. A scroll made after that update, by a timer, a handler or another frame callback such as a consumer's autoscroll, or by scroll anchoring in that update's layout, reaches the cache one update later. A frame that misses it is corrected at the next frame. The drop has no next frame. `DRI-16` requires scrolling containers, and the library has no autoscroll, so this case is supported.
- **One row detects it.** A scroll of any ancestor, scroll anchoring and a layout shift above the list move every row by one vector. One cached row, measured again and settled as the cache holds it, shows that.
- **The other case the call covered isn't a guarantee.** A row that changes size during a drag with no signal is never seen by a frame, because a resolution with nothing stale reads no layout. The user already sees a misplaced placeholder. `invalidate()` already rebases and invalidates the cache.
- **The saving survives the confirmation.** At 2,000 items the drop's `refresh` is 2,467 [2,097–3,805] \| 3,120 µs sampled, on 16/14/24 \| 20 samples, inside a counted span of 2,742 [2,212–4,158] \| 4,240 µs. The first rect read at the drop forces the pending style and layout in either form, so what leaves is 1,998 reads and the packing loop.
- **The row can see it.** In B3 the no-landing 2,000-item cycle row read 6,401 µs of script per cycle with an A/A bound of 1,920 µs, and the landed row 6,389 µs with 1,337 µs. The estimated saving, 2.1 to 2.5 ms per cycle, is above both, by a narrow margin.
- **The sibling rule.** `DRD-33` choice 7 resolves a drop target at the drop "after any invalidation", with no unconditional measure. The drop-target tracker has the same unsignalled-scroll window, which `DRF-22` records. This decision doesn't change it.

**Required properties:**

1. **Site.** In `SortableOperation.drop`'s pointer branch (`sortable/operation.ts:108–115` at `566ebfc65`), the confirmation replaces `this.#behavior.axis.invalidate()`. The command drop, the frame path, `moved`, `rebase`, activation and the landing don't change.
2. **The confirmation** is one member of the private `InsertionGeometry` interface (`sortable/axis.ts`), which `y()` and `xy()` implement from one shared definition. When the cache is stale it reads nothing. Otherwise it measures one cached slot's element again, through `box` when one is configured, settles that rect through the displacement sink when one is composed, and compares its left and top with the slot's cached values within `EQUIVALENCE_SLACK`. A difference calls the axis's own `invalidate()`, so `linearShift` also discards its row distance. The interface stays private (`DRD-33` choice 8).
3. **Reads.** With a warm cache, a pointer drop reads one slot rect beyond what its resolution reads, whatever the item count. With a stale cache it reads what it reads at `566ebfc65`. No frame, sample or command reads more.
4. **Behavior.** The drop's gap equals the gap a full measurement at the release gives, whenever the cache was stale or the rows moved by one common vector since they were last measured, signalled or not.
5. **Contract and README.** In the same commit as the code, the unit adds this paragraph to `DRI-14` after **Consistency**, with a change record row that names this decision:

   > **Geometry.** `sortable` measures the items at the operation's first resolution, and again after a scroll, a resize or `invalidate()`. A pointer drop resolves at the release position. It first measures one item again, and measures every item when that one moved, so the drop sees a scroll whose event hasn't reached the library yet. A change in the items' sizes or relative positions during a drag that no scroll or resize causes needs `invalidate()`. Without it, the change is outside this contract.

   The README's sortable paragraph says that `invalidate()` is also for rows that change size or position during a drag for a reason other than a scroll or a resize.

6. **Witnesses, each shown by a mutation it catches.**
   - **W1, the unsignalled scroll:** a sortable in a scrolling container, a drag with real input that commits at least one move and waits a frame, and a capture-phase `pointerup` listener on the window, added before the press, that scrolls the container by more than half a row. The reorder is the one under the release position after that scroll. **M1**, the call deleted with no confirmation, fails W1.
   - **W2, the drop's reads:** in `tests/hot-path.browser.test.ts`'s census, the `getBoundingClientRect` calls during a pointer drop with a warm cache, with no landing, are the same at two item counts at least ten times apart. **M2**, the unconditional call restored, fails W2.
   - The existing scroll test in `tests/sortable.browser.test.ts` still passes.
7. **Confirmation,** as `DRD-46` property 8: `compare.ts --before 566ebfc65 --only "activate-and-drop cycles"` in one browser process, under `DRD-44` property 6's hold, with its machine record. That runs the four CDP cycle rows and "in the page: 50 activate-and-drop cycles, 20 items, no landing". No move, press or keyboard row reaches the change.
   - **Confirmed:** "50 activate-and-drop cycles, 2000 items, no landing" is "faster" in `scriptUs`. The landed 2,000-item row is reported beside it.
   - **Not confirmed:** "no difference shown" on the target row goes to the architect, under `DRD-46` property 8.
   - **Returned:** "slower" on any measure of any row, or a layout count above base.
   - The unit runs the three-engine suite, the per-sample and census tests, and the size table. The size change is reported with these rows (`DRD-40` property 6).
8. **What it doesn't change.** `judge`, its rounds, every row, injection and floor entry. Candidates 1, 3, 4 and 5 aren't selected. `DRD-45` property 9's repair is still owed before any `--prove` or `--floors` on `566ebfc65`'s source or a descendant, and a `--before` run applies no injection.

**Rejected:**

- **Delete the call, the report's form.** It loses the unsignalled scroll, which W1 witnesses.
- **Keep it.** About 2.1 to 2.5 ms per drop at 2,000 items, for a case one row detects.
- **Record scroll offsets at measurement and compare them at the drop.** It needs the set of scrolling ancestors, which the library doesn't track, and misses a layout shift above the list.
- **Measure the placeholder instead of a row.** After a committed move the cached placeholder is stale and has no prediction. That is the usual state at a release, because the last frame moved it.
- **Add an in-page cycle row at 2,000 items.** An instrument change, a decision first, and not needed unless the CDP row shows no difference.

**What this amends:**

- **The contract:** `DRI-14` gets property 5's paragraph when the unit lands. Until then the contract states nothing about the sortable drop's geometry, and the code re-measures every row.
- **The plan:** [`performance-plan.md`](performance-plan.md) §2 P3 names this unit, [`performance-drop-handoff.md`](performance-drop-handoff.md).
- **`DRD-23`'s last bullet** doesn't apply, because no instrument changes.

#### DRD-48 — `freeDrag`'s drop measures its drop targets and its bounds again before it resolves

**`DRF-22` is decided. Before `freeDrag`'s drop resolves, the host marks its bounds and its drop-target tracker stale, through the `invalidate` members its scroll and resize listener already calls. So the drop clamps against a box read at the drop, and names the target under the release position in the tree at the drop, even after a scroll whose event hasn't reached the library yet. Drop targets aren't one list, so one target can't confirm the others, and every target is measured. No sample or frame reads more.**

Decided on 2026-11-12 by the architect, on `DRF-22` after `DRD-47`'s unit reported ([assessment](performance-drop-assessment.md) §4). The owner asked for `DRF-22` to be assessed and the next bounded task prepared.

**Why:**

- **The window is the one `DRD-47` closed for `sortable`.** A scroll made after the browser's last rendering update dispatches its `scroll` event at the next update. A consumer's autoscroll usually scrolls in an animation-frame callback, so a release during it falls in that window after most frames. **Inferred from the HTML event loop, not measured.** W1 of `DRD-47` shows the window in all three engines for a scroll made in a `pointerup` listener.
- **The cache can be older than the screen.** When the autoscroll's callback runs after the library's frame, the user saw the scrolled tree, and the cached rects predate it. Keeping them doesn't resolve against what the user saw. The error is one frame's scroll, which names a neighbouring target whenever the release is that close to an edge.
- **One target can't confirm the others.** `targets()` returns any elements: in several scrollers, fixed or sticky ones that a scroll doesn't move, and overlapping ones whose order decides. `sortable`'s rows share one list, and `DRD-47`'s confirmation relies on that.
- **The cost is small and once per operation.** `DRD-47`'s run measures the full scan at about 1.2 µs per row, packing included. A target list is usually far shorter than a sortable list. The first read forces any pending style and layout, which the next frame would otherwise do. Under CONTRIBUTING §0 this is added work at the drop for correctness, so it is reported, and the owner may refuse it before the unit runs.
- **One signal reaches both caches.** The listener's body already invalidates the bounds and the tracker (`DRD-33`, "Invalidation reaches the operation"). A staleness flag only makes the next read measure (`DRD-33` C6), so an extra call at the drop is safe for any implementation. A third-party tracker or constraint receives it through the member it already implements, and no published type gains a member.

**Required properties:**

1. **Site.** In `FreeDragOperation.drop` (`free-drag/operation.ts:89–109` at `8eda874f0`), before the motion is computed and before the tracker's `drop()`, the bounds and the tracker are marked stale through their `invalidate` members. Samples, frames, the listener, activation, `settle`, the landing and `home` don't change. `dropTargets()` and `bounds()` don't change, except their documentation.
2. **Reads.** At a drop, `dropTargets` measures each target once, and `bounds` reads its element once or calls its function once. Without `targets` and `bounds`, a drop reads what it reads at `8eda874f0`. No sample or frame reads more.
3. **Behavior.** The request's `target` is the target under the release position in the tree at the drop, and the drop position is clamped by the bounds box at the drop, whether or not a scroll's event has arrived.
4. **Published types.** `DropTargetTracker` and `MotionConstraint` keep their members. The documentation of each `invalidate` names the drop among its callers.
5. **Contract and README,** in the same commit as the code:

   - `DRI-21`'s drop bullet becomes:

     > - **The drop.** The request's `target` is the target under the release position. The drop measures every target again before it resolves, so it sees a scroll whose event hasn't reached the library yet. It is `null` outside every target. A drop with no frame before it is resolved too.

   - `DRI-20` gets this sentence after "The request's `target` is DRI-21's, and `null` without `dropTargets`.":

     > With `bounds`, the drop reads the box again before it clamps the drop position.

   - A change record row names this decision and `DRF-22`.
   - The README's drop-target paragraph says that the targets are also measured again at the drop.

6. **Witnesses, each shown by a mutation it catches.**
   - **W3, the targets:** `freeDrag` with `dropTargets`, two or more targets in a scrolling container, and a drag with real input that waits a frame with the pointer over one target. A capture-phase `pointerup` listener on the window, added before the press, scrolls the container far enough that another target, or none, is under the release position. The request's `target` is the one under the release position after the scroll. **M3**, the tracker not marked stale at the drop, fails W3, and so does `8eda874f0`'s source.
   - **W4, the bounds:** `freeDrag` with an element `bounds` inside a scrolling container, and a drag that holds the visual clamped at the bounds' edge and waits a frame. The same kind of listener scrolls the container by more than a pixel. The drop position, as the request's `localDeltaX` or `localDeltaY` shows it, is the clamp against the box after the scroll. **M4**, the bounds not marked stale at the drop, fails W4.
   - The existing test "should re-read the targets after a scroll" and the census tests still pass.
7. **Measurement.** No `compare.ts` row reaches a `freeDrag` drop: "free drag, 300 moves, one frame each" reads its metrics before the release and composes neither capability. So the unit runs no paired comparison. A row for it is an instrument change, and the expected cost is far below any row's A/A bound. The unit counts the layout reads at one drop with ten targets and an element `bounds`, and runs the size table. The bytes are the owner's to accept (`DRD-33` C7, `DRD-40` property 6). "draggable alone" and the three `sortable` rows are the control and read 0.
8. **What it doesn't change.** `sortable`, `DRD-47`'s confirmation, the kernel, `judge`, every row, injection, floor entry and recorded reading. `DRF-21` isn't part of it. `DRD-45` property 9's repair is still owed before any `--prove` or `--floors`.

**Rejected:**

- **Keep the cache, and state the window outside the contract.** The cache can be older than the screen, and `sortable`'s drop now sees the pending scroll, so two built-ins would answer the same release differently.
- **Confirm one target, as `DRD-47` does.** Unsound for drop targets, as above.
- **Mark only the tracker stale, inside `dropTargets`' `drop()`.** It leaves `bounds` with the window, and a third-party tracker without the signal.
- **`elementsFromPoint` at the drop.** It skips `pointer-events: none` targets and honors clipping, which the mark's rect test doesn't, so the drop could disagree with the mark.
- **Record scroll offsets at measurement.** `DRD-47`'s reason: the library doesn't track scrolling ancestors, and a layout shift isn't a scroll.

**What this amends:**

- **`DRD-33` choice 7:** "the drop is always correct" now holds by measuring at the drop, and the choice carries a note.
- **The contract:** `DRI-20` and `DRI-21`, by property 5, when the unit lands.
- **The plan:** [`performance-plan.md`](performance-plan.md) §2 P3 names [`free-drag-drop-handoff.md`](free-drag-drop-handoff.md) as the next unit. It is a correctness unit inside the phase, and not an optimization unit under `DRD-46` property 8.

#### DRD-49 — `y()` measures a window of rows that grows from the placeholder toward the pointer

**The second optimization unit is the trace report's candidate 1, in a bounded form. `y()`'s cache no longer measures every row at a resolution after it was marked stale. It measures a contiguous window of slots that starts next to the placeholder and grows toward the pointer until the window brackets the pointer, or reaches an end of the list. The nearest center in that window is the nearest center in the list, provided the rows' centers increase along y in the collection's order. `y()`'s terms say that, and that narrows them. `xy()` doesn't change. A focused paired measurement of the cycle rows confirms the change, and the move rows show that nothing is slower.**

Decided on 2026-11-12 by the architect, on [`performance-trace-report.md`](performance-trace-report.md) at `e92e21eed` ([assessment](free-drag-drop-assessment.md) §2), under `DRD-46` property 8. The owner asked for the next optimization candidate from the existing traces, with budgets unchanged and the deferred campaigns stopped.

**Why:**

- **It is the largest remaining library cost.** The activation's first resolution measures 1,999 rows at 2,000 items: 2,650 [1,932–5,192] \| 3,066 µs sampled at `rect-index.ts:refresh`. `DRD-47` removed the same scan from the drop and saved 2,449 µs per cycle, against an A/A bound of 409 µs on the same row.
- **The rows a resolution needs are next to the placeholder.** After every resolution the placeholder holds the gap nearest the pointer. At activation it holds the dragged item's slot, within the threshold of the pointer. After a scroll it is where it was, and the pointer has moved by the scroll. So a window that starts at the placeholder's gap and grows toward the pointer reads few rows, and no search or per-slot mask is needed.
- **The window gives the full scan's answer, given order.** When the centers increase along y in the slots' order, the nearest center to the pointer is one of the two slots whose centers bracket it. If the window holds both, or reaches the end of the list on the side that lacks one, then the nearest center and its first-in-order tie in the window are the same as in the whole list. The placeholder's incumbency doesn't change.
- **Every user of the cache stays inside the window** ([assessment](free-drag-drop-assessment.md) §2): the scan, `moved`'s crossed slots and probe, `DRD-47`'s confirmation, and the development check. The slots' elements are still known for every slot, so `insertionAt` and the sink's `report` are unchanged.
- **It reads at most what the full scan reads.** Each slot is read at most once per measurement, that is, between two invalidations. During an autoscroll, which invalidates every frame, a frame reads the rows from the placeholder to the pointer instead of all of them. That is inferred, and no row measures it.
- **The order is a narrowing.** `y()`'s terms require a linear flow along one column. They allow an authored transform on a row, and so a center out of order, which a full scan handles. A transform large enough to carry a row's center past a neighbour's isn't a list layout that a column reorder serves, so the term is narrowed and not supported by a slower path. The direction isn't a narrowing: `linearShift` predicts each move after the first with a sign that assumes centers increase in the collection's order, so a `column-reverse` list is already outside `y()`'s terms.

**Required properties:**

1. **The window.** `y()`'s cache holds measured geometry for one contiguous range of slots, and the slots' elements for every slot. A measurement starts with no measured slot. Before the nearest-center scan, a resolution grows the window from the slots next to the placeholder's gap, one slot at a time toward the pointer, until it holds the two slots whose centers bracket the pointer's y, or the list's end on the side that lacks one. The scan runs over the window only. How the first gap is found when the query holds no insertion is the unit's choice.
2. **Reads.** A slot is read at most once between two invalidations. A resolution whose window already brackets the pointer reads no slot, and still reads the placeholder when a committed move marked it stale. The first resolution of an operation reads a number of rows that doesn't depend on the item count, when the pointer is within one row of the placeholder. Each read is settled through the displacement sink when one is composed, as a full scan settles it.
3. **Behavior.** At every resolution, the gap equals the gap the full scan gives against the same tree, under property 5's order.
4. **The cache's other users.** `linearShift.moved`'s crossed slots and its probe are in the window. `DRD-47`'s confirmation reads a slot in the window, and a stale cache or an empty window reads nothing. The development check compares every slot in the window, and the placeholder, with a fresh measurement. It may not compare fewer slots than the window holds. `invalidate`, `retire`, `rebase` and a changed collection version discard the window.
5. **Contract, terms and README,** in the same commit as the code:

   - `DRI-14`'s **Geometry** paragraph becomes:

     > **Geometry.** `sortable` measures an item when a resolution first needs it, and measures again after a scroll, a resize or `invalidate()`. With `xy()`, the operation's first resolution measures every item. With `y()`, a resolution measures the items between the placeholder and the pointer, and one beyond. Their centers increase along y in the collection's order. A reversed column, an item that isn't rendered, or an authored transform that carries an item's center past a neighbour's, is outside this contract. A pointer drop resolves at the release position. It first measures one measured item again, and measures again when that one moved, so the drop sees a scroll whose event hasn't reached the library yet. A change in the items' sizes or relative positions during a drag that no scroll or resize causes needs `invalidate()`. Without it, the change is outside this contract.

   - A change record row names this decision.
   - `y()`'s published documentation (`sortable/y.ts`) states the order term, and says that a resolution reads only rows it hasn't measured.
   - The README's sortable paragraph says that a `y()` list's rows must follow the list's order along y.

6. **Witnesses, each shown by a mutation it catches.**
   - **W5, the activation's reads:** in `tests/hot-path.browser.test.ts`'s census, the layout reads from activation through the first frame after it are equal at two item counts at least ten times apart. **M5**, the window replaced by every slot, fails W5, and so does `71f20df20`'s source.
   - **W6, the window's answer:** rows of at least two heights, and a drag with real input that crosses at least 20 rows down and back up, with a frame after each move. After each frame, the placeholder's gap is the gap that `y()`'s rule gives against a fresh measurement of every row, computed in the test. **M6**, the window grown one slot short of bracketing the pointer, fails W6.
   - **The existing tests still pass:** the scroll test, `DRD-47`'s W1 and W2, and the census tests, including "should read no layout in a sample, and none in a frame with nothing stale".
7. **Confirmation,** as `DRD-46` property 8, in two browser processes run one after the other, under `DRD-44` property 6's hold, each with its machine record:
   - `compare.ts --before 71f20df20 --only "activate-and-drop cycles"`: the four CDP cycle rows and the in-page 20-item cycle row;
   - `compare.ts --before 71f20df20 --only "moves, one frame each"`: the CDP and in-page move rows at 20 and 2,000 items, and "free drag, 300 moves, one frame each" as a control.
   - **Confirmed:** "50 activate-and-drop cycles, 2000 items, no landing" is "faster" in `scriptUs`.
   - **Not confirmed:** "no difference shown" there goes to the architect.
   - **Returned:** "slower" on any measure of any row, or a layout count above base.
   - The unit runs the three-engine suite, the per-sample and census tests, and the size table. The size change is reported with these rows (`DRD-40` property 6).
8. **What it doesn't change.** `xy()` and its full measurement, `DRD-47`'s confirmation apart from its slot choice, `linearShift`'s prediction rule, the placeholder's measurement, the landing, the keyboard path, `judge`, every row, injection, floor entry and ceiling. A row that is green at `71f20df20` and turns red returns the unit. `DRD-45` property 9's repair is still owed before any `--prove` or `--floors`. `DRF-21` isn't part of it. **Amended on 2026-11-12 by `DRD-50`:** `xy()`'s full measurement may share `RectIndex`'s code with `y()`, provided its reads, their values and its settling are unchanged and `DRD-50`'s probe doesn't read "slower". It said that `xy()`'s full measurement doesn't change.

**Rejected:**

- **A binary search with a per-slot mask,** as the trace report sketched. It reads about 11 rows at activation, against two or three for the window, and needs a mask that every user of the cache must check.
- **Candidate 3 alone,** a binary search over a fully measured cache. About 10 µs per move, below its row's bound of 22 µs, and the activation's scan stays.
- **Keep `y()`'s terms, and fall back to a full scan when the window finds centers out of order.** It detects disorder only inside the window, so it isn't a guarantee, and it costs bytes on a row with 155 B left.
- **Change `xy()` too.** A wrapping list's centers aren't ordered along one axis.

**What this amends:**

- **The contract:** `DRI-14`'s **Geometry** paragraph, which `DRD-47` added and the owner approved, when the unit lands.
- **`y()`'s published terms**, by property 5.
- **`DRD-47`:** its properties hold. The unit's slot choice, the window end farther from the gap instead of the list end, changes with the window.
- **The plan:** [`performance-plan.md`](performance-plan.md) §2 P3 names [`performance-window-handoff.md`](performance-window-handoff.md).

#### DRD-50 — A measurement settles a slot range of the cache's own buffer, and a paired probe decides whether `xy()`'s shared rebuild stays

**`DRD-49`'s unit fitted the byte ceilings by sharing `RectIndex`'s measurement between the two axes. That left two runtime costs that no reading covers. With a displacement sink, each row that `y()` reads now allocates a typed-array view and a one-element array, because `settle` works only from the start of what it receives. And `xy()`'s full rebuild is now two passes and a `pack` call per slot, and its runtime is not measured. `settle` takes a slot range, so nothing is allocated per read. A paired probe of `xy()`'s rebuild against `71f20df20`'s decides whether the shared rebuild stays. If the probe reads "slower", one pass comes back, whatever the bytes.**

Decided on 2026-11-12 by the architect, on [`performance-window-report.md`](performance-window-report.md) at `56c1c27c3` ([assessment](performance-window-assessment.md) §2 and §3). The owner asked for these points to be resolved with runtime ahead of the byte ceiling, the confirmed readings preserved, and the deferred campaigns stopped.

**Why:**

- **The allocation is avoidable, and it came with the size fit.** CONTRIBUTING Part II §0 and §14 forbid avoidable allocation on pointer-move paths that is made for bytes without measurement and owner approval. A frame that reads rows allocates it at the activation, when the pointer leaves the window, and after every invalidation, so on every frame of an autoscroll. `DisplacementSink` isn't published (`DRD-39`), and §8 keeps no compatibility for an unreleased API, so its `settle` can take a range. That removes the view and the copy, and probably shortens `rect-index.ts`.
- **`xy()`'s rebuild is a hot path, and §14 asks for a measurement.** With a sink, `xy()` rebuilds at every committed move. Without one, the frame after the move rebuilds. The added work is probably well under 1 % of a rebuild, but that is inferred. No row composes `xy()`, and the cycle rows' A/A bounds are wider than the effect. A probe of the one changed function, in one page against the base's class, can resolve it and changes no instrument.
- **The decision rule comes before the reading.** Runtime comes first, so a "slower" reading restores one pass even when that takes a row over its ceiling. A reading of "no difference shown" or "faster" keeps the shared rebuild, and its bound goes on record.

**Required properties:**

1. **Range settling.** `DisplacementSink.settle` settles exactly the slots in a range it receives, in the buffer and element array as given. `RectIndex`'s measurement passes the cache's own buffer and element array with the range it read, and allocates nothing for the sink. The drop's confirmation and `linearShift`'s probe settle their one-slot scratch with a one-slot range, and read and allocate what they did before. `settle`'s documentation states the range. The type stays internal.
2. **The probe of `xy()`'s rebuild.** It runs in Chromium, under `DRD-44` property 6's hold, with `DRD-40` property 4's machine record and its output kept.
   - **The page:** a laid-out field of 2,000 items that wraps, and a placeholder in it.
   - **The arms:** `before` is `71f20df20`'s `RectIndex`, `production` is the unit's code, and `control` is a second `production` instance for the A/A reading. Each arm has its own instance, and its own sink in the case that composes one.
   - **The cases:** no sink, and `layoutAnimation` with nothing in flight.
   - **The rounds:** 7 rounds. Each round runs the arms in a rotated order. Each arm discards a warm-up batch, then times a batch of rebuilds, each one `invalidate()` and then `refresh`. A batch lasts long enough that the clock's resolution doesn't matter. The reading is the mean per rebuild.
   - **The verdict:** `compare.ts`'s paired rule. "Slower" means `production` is higher than `before` in at least 6 of 7 rounds, and the median difference is above the largest absolute A/A difference. The probe isn't a `bench/` file. Its source is kept beside its output under `measurements/`.
3. **One pass, only on a "slower" reading** in either case. `xy()`'s full measurement then collects, reads and packs each slot in one pass over the snapshot, settles once with the cache's own buffer, and leaves the window at every slot, as `71f20df20` measured. `y()`'s `collect`, `measure` and growth don't change. The probe runs again on that form, and it must not read "slower".
4. **Witnesses, each shown by a mutation it catches.**
   - **W7, no copy:** with a sink composed, every `settle` call that a measurement makes during a `y()` drag and during an `xy()` rebuild receives the cache's buffer and element array, the same two objects across the operation, and the range it read. The drag must grow the window across at least three slots after slot 0. **M7**, `501f60ab7`'s call with a view and a copy, fails W7.
   - **W8, the range is settled:** with `layoutAnimation` and rows in flight, a resolution that grows the window over a row in flight holds that row's settled geometry, and the gap equals the gap of the rows' flow positions. **M8**, a `settle` that ignores the range's start, fails W8.
   - **The existing tests still pass,** including `DRD-49`'s W5 and W6, `DRD-47`'s W1 and W2, "should call the layoutAnimation sink with its receiver, with rows in flight", and the census and allocation tests.
5. **Bytes.** The unit runs the size table at its last code commit and reports each row against `501f60ab7` and `71f20df20`. The seven rows without `sortable` read 0. A `sortable` row that turns red doesn't return the unit, because runtime comes first. It is reported for the owner, and no ceiling moves.
6. **What it doesn't change.** `DRD-49`'s window, growth, scan, confirmation slot and development check. `DRD-49`'s readings stand as its confirmation, and no `compare.ts` run follows. Every row, injection, floor entry, ceiling and `judge` stay as they are. No campaign, `--prove` or `--floors` runs.

**Rejected:**

- **A reusable one-slot scratch in `RectIndex`.** It removes the allocation but copies every read twice, and costs bytes that range settling saves.
- **Restore one pass now.** It would spend up to about 120 B Brotli on each `sortable` row against a cost that is probably under 1 % of a rebuild and that nothing has measured.
- **Accept the shared rebuild by inference.** §14 asks for a measurement.
- **An `xy()` row in `compare.ts`.** It would add an instrument and a lab page, and a cycle row's bound would be wider than the effect.

**What this amends:**

- **`DRD-49` property 8.** `xy()`'s full measurement may share `RectIndex`'s code with `y()`, provided its reads, their values and its settling are unchanged, and property 2's probe doesn't read "slower". `DRD-49`'s rule that a row turning red returns the unit doesn't apply to this correction.
- **The internal `DisplacementSink.settle`**, by property 1.
- **The plan:** [`performance-plan.md`](performance-plan.md) §2 P3 names [`performance-window-correction-handoff.md`](performance-window-correction-handoff.md).

**Result, 2026-11-12** ([report](performance-window-correction-report.md) at `566d4d29e`, [assessment](performance-window-correction-assessment.md)). Implemented at `8d002529a`, and it conforms. A measurement settles a slot range of the cache's own buffer and element array and allocates nothing for the sink. W7 and W8 pass in all three engines, and M7 and M8 each fail their witness in all three. The probe of `xy()`'s rebuild reads "no difference shown" in both cases, so the shared rebuild stays, and property 3 didn't apply. **The reading doesn't bound a slowdown.** The A/A bounds, 650 µs with no sink and 807 µs with `layoutAnimation`, are the rule's thresholds and not limits on how much slower the shared rebuild could be. The rule found no slowdown, and both median differences are negative, −219.5 µs and −135.9 µs. The probe can't resolve the effect this decision inferred, about 20 µs, which remains an inference. The bytes against `71f20df20` are +143 B Brotli on "sortable + y", +36 B on "sortable + xy" and +149 B on "complete", and the owner accepts them (`DRO-4`). The "Why" bullet above said a probe "can resolve it". It could resolve only a slowdown larger than its spread.

#### DRD-51 — The size pass removes what the gate rejects first, and the owner decides each item that moves a decision, a boundary or hot-path work

**P4 measures every row as minified, gzip-9 and Brotli-11 bytes, books only joint readings, and names its control rows before it measures. Its first unit removes the unreachable `null` gap (`DRF-13`) and the duplicate bounds invalidation (`DRF-14`). A candidate that changes an owner-directed decision, a semantic boundary or an accepted encapsulation, or that adds hot-path work, waits for `DRO-14`.** [`performance-plan.md`](performance-plan.md) §2 P4 applies this decision.

Decided on 2026-11-12 by the architect, on the owner's request to open the size pass on `drag/size` from `0a28f909a`, from [`size-pass-assessment.md`](size-pass-assessment.md).

**Why:**

- **The gate removes nothing here.** Three read-only inventories and the architect's reading found every guard reachable through correct use, no runtime vocabulary that isn't folded, and shipped diagnostics that are already identities (assessment §3). Part II's first three classes have no candidate.
- **What remains is small, and most of it is a decision.** The seven measured candidates take 1 to 76 B Brotli off a row (assessment §5). Two of them repair open findings and touch no decision. The others amend `DRD-36`, trade `RectIndex`'s encapsulation, remove a §2.1 boundary, or add per-frame work against §0.
- **No measured set closes a red row.** With every candidate, "complete" is still 216 B over its ceiling and "draggable alone" 32 B over. The excess is the costs the owner accepted, so the re-base is `DRO-4`'s and comes after the pass (§18).

**Required properties:**

1. **Readings.** A unit reports every row of `bench/size/measure.ts` as minified, gzip-9 and Brotli-11 bytes at its base and at its last commit, with the settings of the assessment's §1, through [`size.ts.txt`](probes/size-pass/size.ts.txt) or a tool that reproduces its base figures. Brotli-11 is the figure the ceilings gate. gzip is recorded and not gated. Where the figures disagree in sign, the report says so. Only a joint reading of what lands is booked, and per-candidate ablations only rank.
2. **Control rows.** Before it measures, a unit names the rows that its change can't reach, and each of them must read exactly 0/0/0. A non-zero control is a finding before the unit continues.
3. **Fixed during the pass.** Every ceiling, `draggable alone`'s control figure and `measure.ts` itself stay as they are, and `DRO-4` holds the re-base. The deferred campaigns stay stopped: the page check, B3', the in-page floors, `--prove` and `--floors`.
4. **Runtime.** A change that only removes operations from the paths it touches is checked by the exact instruments: the per-sample tests and the hot-path censuses, with the suite in three engines. It runs no `compare.ts` row. A change that adds or moves work on a per-sample, per-frame, drop or activation path also runs `compare.ts --before <its base> --only <the rows that reach the path>`, and its size and timing go to the owner together under §0.
5. **Owner items.** A candidate in `DRO-14` isn't implemented before the owner answers that item. A new candidate of the same kind goes to the owner the same way.
6. **Correctness and ownership hold,** as `DRD-40` property 7 states. A size change that would move an owner in `DRD-24`, `DRD-26`, `DRD-27` or `DRD-33` isn't a size change (§13).

**First unit: `DRF-13` and `DRF-14`** (patch `U1-recommended-unit`, which leaves out the type changes of item 1):

1. **`DRF-13`.** `AxisQuery.insertion` is `Insertion`. `y.ts` and `xy.ts` read `query.insertion.index` with no `null` arm and no `!`. `SortableOperation`'s query type no longer removes a `null` with `SetNonNullable`, and an import left unused goes. `LinearShift.refresh` receives a gap that is never negative: its `gap < 0 ? 0 : gap` and its `if (gap >= 0)` go, and its JSDoc no longer offers `-1` for that parameter. **What stays:** `lastGap`'s own `-1`, which means no known gap after `retire` or after a move the shift can't predict, `RectIndex.holds`, and `xy.ts`'s `last`.
2. **`DRF-14`.** `FreeDragBehavior.invalidate` calls only `operation?.handleEvent()`, which marks the bounds and the drop targets stale. With no operation, nothing is lost, because each activation marks the bounds stale before its first read. **This decision withdraws `DRF-14`'s naming half:** the scroll and resize listener is the operation object, so its entry must be `handleEvent`, and a second name would cost a member for no behavior. The step's comment says which entry it calls.
3. **Expected:** −17 B Brotli on "sortable + y" and "complete", −2 B on "sortable + xy", −1 B on "freeDrag" and −2 B on "freeDrag + bounds + landing", against `0a28f909a`. **Control rows:** "draggable alone", "draggable + lift" and the three examples read exactly 0/0/0.
4. **Verification:** typecheck, format and lint on the changed files, the full suite in Chromium and in three engines with only the known failures (the five `DRO-4` size rows), the per-sample tests, `measure.ts`, and property 1's readings. By property 4, no `compare.ts` row runs.
5. **Nothing else changes.** `DRF-15`, `DRF-20` and every `DRO-14` item are outside this unit.

**What this amends:** `DRD-40` property 6's last sentence, "A size change is measured with `bench/size/measure.ts` and with the timing rows it could affect", is replaced by property 4 above for this pass. A change that only removes work can't make a timing row slower, and no timing row resolves a change of a few branches (`DRD-43`). The exact instruments can show an allocation or a layout read that a change adds. `DRD-36` and `DRD-32` stand until the owner answers `DRO-14`.

**Amended 2026-11-12 by `DRD-52`:** item 5 of the first unit no longer holds as written. The unit also carries `DRD-52` and `DRD-53`, and runs `compare.ts` by property 4. `DRO-14` items 3 and 4 and `DRF-15` stay outside it.

**Result, 2026-11-12:** the first unit landed in `15e9d1ef2`, `312f4ec32` and `237d65d2f`, reported at `ed4bd589f` and accepted in [`size-pass-unit-assessment.md`](size-pass-unit-assessment.md).

- **Size, against `1d304128b`, Brotli-11:** −62 B on "sortable + y", −56 B on "sortable + xy", −65 B on "complete", −1 B on "freeDrag" and 0 B on "freeDrag + bounds + landing", which is −26 B minified. The five control rows read 0/0/0. gzip and Brotli never disagree in sign. Every row equals the architect's joint reading.
- **No ceiling closes.** Six rows stay over: "freeDrag" by 56 B, "complete" by 219 B, "freeDrag + bounds + landing" by 249 B, and "draggable alone", "example: resize handle" and "example: drop zone" as before. "sortable + y" has 81 B of headroom and "sortable + xy" 76 B. Budgets are unchanged, and `DRO-4` holds the re-base.
- **Runtime:** see `DRD-52`'s result. The suite fails only on the six size rows in Chromium, and passes in three engines.
- **Item 2's lint finding:** `DRF-14`'s change left `FreeDragBehavior.invalidate` reading no `this`, and `class-methods-use-this` reports it. Repaired by the amendment below.

**Amended 2026-11-12, §First unit item 2:** the step that `FreeDragController.invalidate` requests is a function of `free-drag/behavior.ts`'s module, not a member of `FreeDragBehavior`. It calls only `operation?.handleEvent()` and reads no other state. The controller requests the same function on every call, so calls coalesce in its own step list as before. It takes 1 B Brotli off "freeDrag" and 5 B off "freeDrag + bounds + landing", against `ed4bd589f`, and the other eight rows read 0/0/0 (assessment §3). [`size-pass-followup-handoff.md`](size-pass-followup-handoff.md) implements it.

**Amended 2026-11-12, property 3:** "the deferred campaigns" are the measurement work it names, and no other. **`bench/campaign.ts` isn't one of them.** It sequences the runs a unit's handoff asks for, and a unit uses it for that. A unit waits for a process through the process itself, never by searching the process table for a pattern that its own command line contains ([`performance-plan.md`](performance-plan.md) §3, assessment §5).

**Result of the amendment of item 2, 2026-11-12:** landed at `e22db849c`, reported at `fe529df4c` and accepted (§Disposition of the size pass follow-up report).

- **Size, against `d5ab84a83`:** −13/−7/−1 on "freeDrag" and −13/−5/−5 on "freeDrag + bounds + landing", minified/gzip-9/Brotli-11, equal to the architect's reading. The eight control rows read 0/0/0.
- **The lint finding is closed.** `class-methods-use-this` reports nothing on the two files.
- **No ceiling closes.** "freeDrag" is 55 B over and "freeDrag + bounds + landing" 244 B over. The other four red rows and the four green rows read as at `ed4bd589f`.

**P4's machinery candidates are done, 2026-11-12.** U1, C6 (`DRD-52`) and the `invalidate` step landed. The owner rejected C2 (`DRD-53`), and C1 and C5 (`DRO-14` items 3 and 4). No measured candidate remains. What remains of the pass is `DRO-15`'s steps (`DRD-54`), and `DRO-4`'s re-base against figures the owner accepts.

**Amended 2026-11-13 by `DRD-55`, properties 1 and 3.**

- **Property 1:** once `DRD-55` lands, a reading is booked from the gate on the published build, using `measure.ts`'s printed minified, gzip-9 and Brotli-11 figures. `size.ts.txt` reads `src`, so it then ranks candidates and no longer books them.
- **Property 3:** `measure.ts` changes for `DRD-55`'s instrument change. Every ceiling and the control figure stay.
- **What they used to say:**
  - property 1: readings were taken "through `size.ts.txt` or a tool that reproduces its base figures";
  - property 3: "`measure.ts` itself" stayed as it was during the pass.

#### DRD-52 — `RectIndex` is the dimension-neutral cache, and `y()`'s prediction writes it through a lend scoped to one call and one range

**`RectIndex` holds no axis policy. `xy.ts` holds its full rebuild, and `linear-shift.ts` holds `y()`'s prediction, which writes the slot buffer only through `lend(lo, hi, write)`: during the call, and inside the range. The placeholder's re-read is one shared `measurePlaceholder`. The development check still compares the placeholder's x with what the last rebuild measured.** [`size-pass-unit-handoff.md`](size-pass-unit-handoff.md) implements it.

Decided on 2026-11-12 on the owner's approval of proposal P in [`rect-index-ownership-proposal.md`](rect-index-ownership-proposal.md), measured at `c0d6b9205`, with two conditions of the owner's. The architect then measured it again at the unit's base, `1d304128b` ([readings](measurements/2026-11-12-size-unit-base-readings.txt)).

**The owner's direction:**

- **Proposal P is approved.**
- **The existing development check is preserved, including the placeholder's x.**
- **The 7 B more per committed move is provisional.** It is checked again after warm-up, together with the planned timing comparison.
- **One unit carries `DRF-13` and `DRF-14` (U1), this decision and `DRD-53`.** Budgets stay unchanged.

**How the check keeps the placeholder's x.** The proposal re-measured all six fields of the placeholder after a committed move, so its x became the fresh reading and a placeholder moving along x was no longer reported (proposal §3.4). Keeping `RectIndex`'s y-only `remeasurePlaceholder` instead gives back about 30 B Brotli of the saving: with U1, −31 B on "sortable + y" instead of −62 B. **This decision keeps the shared six-field re-read in the shipped code, and gives the development check the placeholder's x as the cache held it before the re-read.** That state is written only inside `__DEV__` branches. Its patch reads 0/0/0 against the proposal's on every row, and a witness shows it reports what the base reports (property 7).

**Required properties:**

1. **`RectIndex`'s responsibilities.** It alone allocates the slot buffer and replaces it, which happens only in `collect`. It writes the element array, the window and the staleness. It makes every measurement: `collect`, `measure`, `measurePlaceholder` and `holds`. It has no `refresh`, `advance` or `remeasurePlaceholder`. Both axes use every member except `lend`.
2. **`measurePlaceholder(placeholder)`** packs the placeholder's rect like a slot, from one `getBoundingClientRect`. `collect` calls it. `linear-shift.ts` calls it on the first refresh after a committed move, as it calls `remeasurePlaceholder` now.
3. **`xy.ts`'s rebuild** is a module function that does what `RectIndex.refresh` does: `collect` with the window at slot 0, then `measure` of every slot when the window is empty. It uses only `RectIndex`'s public members. `DRD-50`'s outcome holds: `xy()` still rebuilds through `collect` and `measure`.
4. **`lend(lo, hi, write)`** calls `write(values, lo, hi)` once, with the writable slot buffer.
   - **Lifetime:** the reference is valid during the call only.
   - **Extent:** `lo` to before `hi` is inside the window, and `write` reads and writes nothing outside it.
   - **Reentrancy:** `write` calls neither `collect` nor `xy.ts`'s rebuild. Any other member may be called.
   - This is the rule that `measure` gives the sink's `settle`, and the JSDoc says so. Nothing checks it at runtime.
5. **The prediction in `linear-shift.ts`.**
   - Its writer is created once per `linearShift`, so a committed move allocates no function.
   - The committed move's displacement along y is rule state, which `moved` sets before it lends.
   - The arithmetic is unchanged: the top and the bottom move by the displacement, and the center is recomputed from the moved edges.
   - The report loop is unchanged.
6. **Reads.** The getters are unchanged, and they return read-only views. The `values` getter states its lifetime: valid until the next `collect`, the only operation that replaces the buffer.
7. **The development check reports what it reports at the base.**
   - After a committed move, it compares the placeholder's left and right with what the cache held before the re-read, which is the last rebuild's measurement.
   - It compares the placeholder's top and bottom with the re-read, and every field of every slot in the window, as now.
   - Its message is unchanged.
   - Its added state is written only inside `__DEV__` branches, and the shipped build of every row is byte-identical to the same change without it.
   - **Witness:** a development-project test in which only the placeholder moves along x, by its position's parity. The drag reports the fault "at the placeholder" at the base and with this decision. With the held x removed from the check, the test fails.
8. **Behavior.** Nothing that `y()` or the confirmation reads changes. `y()` never reads the placeholder's x, and the confirmation reads slots only. In the shipped build, the cached x of the placeholder is the fresh reading after a re-read. Nothing reads it.
9. **Runtime.** Per sample: no change. Per committed move: `lend` and the writer run where one method call ran, and the lend allocates nothing. The proposal read 7 B more per committed move in code that wasn't warm, and **that figure is provisional.** The unit's handoff states how it is read again.

**What this amends:**

- **`DRD-33` choice 9:** `RectIndex`'s private fields are still read through getters typed as read-only views. **Writes leave the class only through `lend`.**
- **`DRD-51` §First unit item 5:** the unit also carries this decision and `DRD-53`. By property 4 it runs `compare.ts`, because this decision moves work on the committed-move path.
- **`DRO-14` item 2** is answered.

**Not adopted:**

- The proposal's §3.4, under which the check no longer compared the placeholder's x.
- `RectIndex`'s y-only `remeasurePlaceholder`, which gives back about 30 B.
- The proposal's variants D to H, for the reasons in its §4.

**Cost.** Against `1d304128b`, with U1 (Brotli-11):

- −62 B on "sortable + y", −56 B on "sortable + xy" and −65 B on "complete";
- −1 B on "freeDrag";
- 0 B on "freeDrag + bounds + landing", which is −26 B minified;
- exactly 0/0/0 on the five other rows.

Without U1: −51, −54 and −47 B. No ceiling changes, and `DRO-4` keeps the re-base.

**Result, 2026-11-12:** implemented in `237d65d2f`, reported at `ed4bd589f` and accepted in [`size-pass-unit-assessment.md`](size-pass-unit-assessment.md). The cost is as stated above.

- **Properties 1 to 6 and 8 hold.** `lend`'s and the `values` getter's JSDoc state property 4's and property 6's rules.
- **Property 7 holds.** The witness, "drag:DRD-52 development equivalence check", passes in Chromium, Firefox and WebKit at the unit and at `1d304128b`'s source, and fails in all three with the held x removed (M1). In the three-engine suite, the check throws in the witness and nowhere else.
- **Property 9: the provisional 7 B is replaced by readings, and their uncertainty is kept** (assessment §2.1). Three runs per tree, heap sampling at 16 B:
  - **warm,** after 2,000 crossings: +0.84 B per committed move. The difference is smaller than the spread inside either tree, so the reading bounds the excess below 7 B and doesn't resolve about 1 B in either direction;
  - **cold,** after 100 crossings: +4.13 B, with every unit run above every base run. A drag with fewer committed moves than that warm-up sees about 4 B more per committed move;
  - **per sample:** +0.80 B for `y()` and +0.55 B for `xy()`, each below the 4 B limit, with spreads of 2 to 3 B;
  - warm, the committed-move code allocates nothing the probe sees, at either tree.
- **Timing:** `compare.ts --before 1d304128b` reads "no difference shown" on all ten move and cycle rows, and every layout count equals the base's. That doesn't show the absence of a slowdown smaller than a row's A/A bound: 8 to 325 µs of script, 51 to 3,305 µs of task time. Four idle background tasks of the implementing session overlapped the first four seconds of the moves process (assessment §2.2). The verdict stands with that overlap recorded.

**Amended 2026-11-13 by `DRD-58`, properties 1, 4 and 6.** The slot buffer is one `number[]` for the index's life, so nothing replaces it.

- **Property 1:** `RectIndex` alone grows the slot array, in `collect`, by appending. Nothing replaces it.
- **Property 4:** `lend` keeps its extent rule, and `write` writes the array only during the call, which is the class-encapsulation rule. The lifetime and reentrancy clauses are removed.
- **Property 6:** the `values` getter returns the same array for the index's life, typed `readonly number[]`, and gives no lifetime.
- **What they used to say:**
  - property 1: "It alone allocates the slot buffer and replaces it, which happens only in `collect`";
  - property 4: "**Lifetime:** the reference is valid during the call only" and "**Reentrancy:** `write` calls neither `collect` nor `xy.ts`'s rebuild. Any other member may be called";
  - property 6: "The `values` getter states its lifetime: valid until the next `collect`, the only operation that replaces the buffer."

#### DRD-53 — Callback lists are made by `queue()` and `stack()` in `kernel/callbacks.ts`, and insert through a stored array method

**`src/kernel/callbacks.ts` exports the factories `queue()` and `stack()`, and its class `List` only as a type. A list holds `Array.prototype.unshift` or `push` and calls it on its array to insert. The owner's commit `1d304128b` is the implementation in `src`, and [`size-pass-unit-handoff.md`](size-pass-unit-handoff.md) completes what refers to the old module outside `src`.**

Decided on 2026-11-12 on the owner's direction, from `1d304128b`, with the owner's dispatch probe at `c0d6b9205` ([README](probes/callback-dispatch/README.md)). In Chromium, adding and running an entry through the stored function was 14 to 16% faster for a queue and 24 to 25% faster for a stack than through the method's name.

**The owner's direction:**

- **The original C2 is rejected.** Its single constructor with `'unshift'` or `'push'` at each call site isn't taken.
- **The named module factories stay.**
- **The owner's source edits are committed unchanged.** The unit finishes the browser test's and the allocation probe's imports and the size test's module path, and fixes the stale comments.

**Required properties:**

1. **The factories.** `queue()` and `stack()` are named exports of `src/kernel/callbacks.ts`. `List` is exported as a type only, so no other module can construct a list. Callers import the factories or the module's namespace, as `gesture.ts` and `session.ts` do.
2. **Insertion.** A queue holds `Array.prototype.unshift` and a stack holds `Array.prototype.push`, each read once when the module is evaluated, in a private read-only field. `add` calls it on the list's array with the callback and the receiver in one call.
3. **Everything else in `DRD-36` holds:**
   - one `pop`-based `run` that doesn't branch on the kind;
   - callback and receiver in two adjacent slots, with no object per entry;
   - `empty`, `has`, `add` and `clear`;
   - removal before the call;
   - a list that decides nothing about when its entries run;
   - the three instances.

   A list owns no function: the array method it holds is the one shared builtin.

4. **The comments state this representation.** No comment says that a list holds a method's name, or names `CallbackList.queue()` or `CallbackList.stack()`.

**What this amends:**

- **`DRD-36` property 1:** "the private constructor" and "the method's name, in a private read-only field" now read: the factory, and the method itself in a private read-only field.
- **`DRD-36` property 3's last sentence** no longer holds, because a list holds the shared method and not its name. Its first two sentences hold.
- **`DRD-36` property 4's** "the private constructor and the two factories" now reads: the two module factories, and a class exported only as a type.
- **`DRD-35` property 5's** file and class names now read `src/kernel/callbacks.ts` and `List`.
- **`DRO-14` item 1** is answered.

**Cost.** The owner's commit against `c0d6b9205`, in Brotli-11:

- −1 B on "draggable alone" and −11 B on "draggable + lift";
- **+11 B on "example: resize handle"**;
- −7 B on "example: drop zone" and −4 B on "example: canvas group";
- −12 B on "freeDrag" and −17 B on "freeDrag + bounds + landing";
- −7 B on "sortable + y", −5 B on "sortable + xy" and −7 B on "complete".

Minified: −2 B on the rows without `sortable`, and +6 B on the three with it. **"example: resize handle" is now 3,321 B, 8 B over its 3,313 B ceiling,** and it joins the rows `DRO-4` holds. The budgets stay unchanged.

**Result, 2026-11-12:** completed in `15e9d1ef2` and accepted in [`size-pass-unit-assessment.md`](size-pass-unit-assessment.md).

- **Properties 1 and 4 hold.** The browser test and the allocation probe import the module's namespace and make every list with `queue()` or `stack()`. The size test expects `src/kernel/callbacks.ts`. `callbacks.ts`'s class comment and `drag.ts`'s `runDisposers` JSDoc no longer name a method's name or `CallbackList.stack()`.
- **The owner's code changed only in those two comments.** The commit reads 0/0/0 against `1d304128b` on every row.
- **The allocation probe,** run once and not gated: `queue()` and `stack()` 72 B each empty and 239 B used, against 32 B and 167 B for a bare array.

#### DRD-54 — A consumer project runs the public browser tests against the package's own build, and the source projects keep every test

**A Chromium browser project, `consumer`, runs the browser tests that observe only the published surface against the files that `tsdown` emits for publication, resolved through the package's exports map. The build runs once per test run, before any of the project's files starts. The source projects keep every test. The tests of internal behavior and of development instruments run only there. The size gate stays on `src` until a separate unit moves it (`DRO-15` step 2).** [`consumer-tests-handoff.md`](consumer-tests-handoff.md) implements it.

Decided on 2026-11-12 by the architect, on the owner's answer to `DRO-15`: start its first two steps, keep source tests for internal behavior and development instruments, and adopt the mangle only after the published build's results exist.

**Why:**

- **Nothing reads the published build now.** Every test and the size gate import `src`. The exploration found the `zIndex` break only when the suite ran against a built tree ([`property-mangling-exploration.md`](property-mangling-exploration.md) §4). The build already differs from what the gate bundles by −7 to +16 B Brotli (§3), so the build and `src` can differ without any mangle.
- **The source projects keep every test.** They run with `__DEV__` true, so every browser test also exercises the development checks, such as the harness's check that no trusted event is refused (`drag:DRI-6`). A test that ran against the build only would lose them. The consumer project adds runs and removes none.
- **A test that reads a development instrument or an internal member can't run against the build.** The build folds `__DEV__` away, and a module that no entry exports isn't published. In the exploration's control, an unmangled build, five tests failed for those reasons alone. A test that reads the refusal count and expects 0 passes against the build without checking anything. For the same reason, the harness's check reads 0 there and checks nothing, and the source projects carry it.
- **Selection is by file.** The consumer project's file list then states exactly what it covers, and no test reads which build it runs against. Vitest 5.0.5's tag filter, `tagsFilter`, is an option of the run's `UserConfig`, not of a project's `InlineConfig`, so it can't select tests per project. A source-only test in a file of public tests moves to a file that the consumer project excludes, with its title and body unchanged.
- **The tests keep importing `src` paths.** The consumer project resolves each published entry's source path to the package's own specifier. Rewriting the imports to package specifiers would make `tsc` and the source run depend on a build.
- **Chromium only, for now.** The build is the same code in every engine, and the three-engine source run covers engine differences. Whether the consumer project also runs in three engines before a mangle ships is decided with `DRO-15` step 3.

**Required properties:**

1. **The build.** The consumer project reads what `just build` emits: `package-files.ts clean`, then `tsdown --config tsdown.config.ts`, unchanged. It runs once per test run, before any consumer file starts, and no test builds the tree or reads it during a build. A failed build fails each consumer file with `tsdown`'s output, and the other projects' verdicts stand, as `DRAG2_NODE_BUILD` does for drag2.
2. **Resolution.** In the consumer project, an import of one of the thirteen published entries' source files, `src/<entry>.ts`, resolves as the specifier `@ydinjs/drag/<entry>.js` resolves for a consumer: through `package.json`'s exports map, to the emitted file. `@ydinjs/box-quad` resolves as it does in the source projects. **Any other module under `src/` is an error at resolution** in that project, and the error names the module.
3. **Selection.** The consumer project runs every file of the Chromium `browser` project except the `shipped` files and the source-only files. The source-only files are one list beside `DRAG_SHIPPED_BROWSER_TESTS`, each with the reason. A test is source-only when it reads a development instrument, such as the refusal count or a development check's report, or an internal member: a module that no entry exports, or a member that no published type declares. A type-only import isn't a reason.
4. **The source projects keep every test.** Each source project runs the same test titles as before. A moved test keeps its title and body, under a `describe` of the same title.
5. **Witnesses.** A runtime import of a non-entry module in a consumer file fails the consumer project at resolution. A fault placed in the emitted tree after the build, and only there, fails at least one consumer test whose source run passes. A failed build fails every consumer file and leaves the source projects' verdicts standing.
6. **Unchanged:** `src`, `bench`, `tsdown.config.ts`, `package.json`, `files.json`, the size gate and every ceiling. The `shipped` project and its hot-path census stay on `src` with `__DEV__` false. No three-engine configuration takes the consumer project.

**Step 2, the gate on the published build,** is a separate unit, decided when this one reports. Known now:

- it is an instrument change under `DRD-23`, so an injection shows that the gate catches bytes added to the emitted tree;
- every ceiling and `draggable alone`'s control figure stay as they are. A row whose verdict changes only because the gate reads the build goes to the owner under `DRO-4`, not into a re-base;
- `size.node.test.ts`'s graph assertions and `measure.ts`'s `present` and `absent` lists name `src/` paths, and they need the emitted paths;
- whether `@ydinjs/box-quad` is bundled from its source, as now, or from its build is decided in that unit.

**What this doesn't decide:** the publish step and its mangle (`DRO-15` step 3), whether the `shipped` census moves to the build, and `DRO-4`'s re-base.

**Result, 2026-11-13:** implemented at `5ea7bb7e6`, reported at `87288b9d2` and accepted with one guard gap ([assessment](consumer-tests-assessment.md)).

- The `consumer` project runs 22 files and 326 tests against the emitted tree, and all of them pass.
- The source projects keep their titles and verdicts.
- The source-only list has four files. One test beyond the handoff's list joined it: the sink receiver test reads `report` and `settle`, which only an unpublished installer type declares.
- The Chromium suite went from 58.2 s to 99.6 s.
- **The gap is `DRF-23`.** The resolver handles only relative specifiers, so an absolute path to a non-entry module loads its source.

**Amended 2026-11-13, property 2 (`DRF-23`): the file an import reaches decides, not the form of its specifier.**

- **The rule.** In the consumer project, every import that would reach a file under the package's `src/` ends one of two ways:
  - it reaches the emitted file of the published entry whose source that file is, as `@ydinjs/drag/<entry>.js` resolves;
  - or it is an error at resolution that names the module.
- **The forms it covers:**
  - a relative specifier;
  - an absolute filesystem path;
  - a path from the Vite root;
  - a `/@fs/` path;
  - a `file:` URL;
  - any of these with a query or hash suffix.
- **No module whose file is under `src/` loads in that project.**
- **Property 5's first witness tries every one of those forms.** It runs against the resolver before the repair, where at least the absolute path loads the source module, and against the repair, where every form fails. A witness that only the repaired resolver can pass is the discriminating one.
- **The size gate's resolution follows the same rule** (`DRD-55`).
- **What property 2 used to say:** "an import of one of the thirteen published entries' source files, `src/<entry>.ts`, resolves as the specifier `@ydinjs/drag/<entry>.js` resolves", and "any other module under `src/` is an error at resolution". The handoff's W1 tried only the relative form. [`published-gate-handoff.md`](published-gate-handoff.md) part A implements this amendment.

#### DRD-55 — The size gate measures the package's published build, through its exports map, with every ceiling unchanged

**`tests/size.node.test.ts` and `bench/size/measure.ts` bundle each row from the files that `just build` emits. Entries resolve through `package.json`'s exports map, and the fixtures' imports follow the consumer project's rule. One build per Vitest run serves both the consumer and the node project. `@ydinjs/box-quad` stays bundled from its source. Every row, ceiling and control figure stays. A verdict that changes only because the gate reads the build goes to the owner under `DRO-4`.** [`published-gate-handoff.md`](published-gate-handoff.md) part B implements it. This is `DRO-15` step 2.

Decided on 2026-11-13 by the architect, on the owner's request to decide step 2 after `DRD-54`'s unit reported ([assessment](consumer-tests-assessment.md)).

**Why:**

- **The gate should measure what a consumer installs.**
  - The emulated build differs from `src` by −7 to +16 B Brotli per row ([exploration](property-mangling-exploration.md) §3).
  - A publish-time mangle would change only the build, so its gain can be gated only there.
  - The owner holds the mangle until the published build's results exist, and this unit's per-row figures are those results.
- **One build per run.** `outDir` is the package root, so the build rewrites the files that the consumer project reads. A second build during a run could rewrite them while a file reads them. One build, finished before either project starts, keeps both projects on the same tree ([assessment](consumer-tests-assessment.md) §4).
- **The resolution rule is the consumer project's.**
  - A row exists to measure what importing a published entry brings.
  - A fixture that reached a non-entry module would measure code that a consumer can't import.
  - The rule decides by the resolved file, as `DRD-54` property 2 does since its amendment.
- **box-quad stays on its source:**
  - Drag's run doesn't build box-quad. Its emitted `index.js` is what box-quad's last build left, and nothing in drag's run makes it. Reading it would make drag's gate depend on an artifact that the run doesn't produce.
  - The ceilings were set with box-quad from its source. Keeping it there leaves drag's build as the only thing that changes, so every verdict change is attributable to drag's build.
  - box-quad's publication has no transform beyond erasing types: it is unbundled, with no define and no mangle.
  - **Revisit this** if box-quad's publication gains a transform that changes its code.
- **The graphs keep their meaning.** The build is unbundled, so each module under `src/` has exactly one emitted file. A graph assertion that names `src/<path>` names `<path>.js` instead, and selects the same modules. If a row's graph changed beyond that mapping, the build would be changing what an import brings, which is `DRI-18`'s subject. That is a return condition, not a re-mapping.
- **gzip-9 is printed by the gate itself.** `DRD-51` property 1 books minified, gzip-9 and Brotli-11 readings. Once the gate reads the build, `size.ts.txt`, which reads `src`, can no longer reproduce its figures. The gate printing gzip-9 keeps property 1 satisfiable without a second probe.
- **A changed verdict isn't re-based.** The ceilings and `draggable alone`'s control stay as they are. A row that turns red or green only because the gate reads the build is a measured fact for the owner's re-base (`DRO-4`, `DRD-51` property 3).

**Required properties:**

1. **The build.**
   - It is `just build`'s build, unchanged: `package-files.ts clean`, then `tsdown --config tsdown.config.ts`.
   - In every configuration with `@ydinjs/drag`'s consumer or node project, it runs exactly once per Vitest run. That holds with both projects, and with either one alone. It finishes before any file of either project starts. No file builds the tree.
   - **A failed build** fails the gate's file and every consumer file with `tsdown`'s output. The `browser`, `shipped` and `declaration` projects' verdicts stand.
2. **Resolution.**
   - Each row imports the same entries and named exports as before.
   - An entry resolves as `@ydinjs/drag/<entry>.js` does for a consumer, through the exports map, to the emitted file.
   - A fixture's import follows `DRD-54` property 2's rule, as amended.
   - `@ydinjs/box-quad` resolves to `packages/box-quad/src/index.ts`.
   - `--prototype` is unchanged.
3. **The graphs.** Each row's module list at the build equals its list from `src`, with each `src/<path>.ts` read as `<path>.js`, and box-quad's module unchanged. Every `present` and `absent` fragment, and "draggable alone"'s expected list, selects the emitted counterparts of what it selected before.
4. **Fixed:** every row's name and imports, every `budget` and `control`, Rolldown's options, `minify: true`, the `__DEV__` define and the Brotli settings.
5. **Figures.**
   - `measure.ts` prints minified, gzip-9 and Brotli-11 bytes per row. Brotli-11 is gated, and gzip-9 is recorded only.
   - Two readings of one build agree to the byte.
   - `npx just size` builds, then measures. `node bench/size/measure.ts` measures the tree in the package root and says so in its header.
6. **Injection (`DRD-23`).**
   - Bytes added to one emitted module after the build, and to nothing else, raise the Brotli figure of every row whose graph contains that module. They move "draggable alone"'s control when its graph contains the module, and leave every other row's figure unchanged.
   - The same bytes added only to that module's source file leave every figure unchanged.
   - A fixture's runtime import of a non-entry module fails its row with an error that names the module.
7. **Readings.** The unit reports every row at its base, read from `src`, and at its end, read from the build, as minified, gzip-9 and Brotli-11, with the difference and the verdict at each.

**What this amends:**

- **`DRD-51` property 1.** Once this decision lands, a size reading is booked from the gate on the published build, using `measure.ts`'s printed figures. A candidate's joint reading builds the candidate tree first. `size.ts.txt` reads `src`, so it ranks candidates and no longer books them.
- **`DRD-51` property 3.** "`measure.ts` itself" stays as it is, except for this decision's instrument change. Every ceiling and the control figure stay.

**What this doesn't decide:**

- the publish step and its mangle (`DRO-15` step 3);
- whether the consumer project runs in three engines (`DRD-54`);
- whether the `shipped` census moves to the build;
- `DRO-4`'s re-base.

**Result, 2026-11-13:** part A landed at `79b4c3132` and part B at `69c260685`. Both were reported at `2d9a2f482` and accepted (§Disposition of the published gate report).

- **Size.** The gate reads the emitted tree, and every row's graph equals its graph from `src` under the path mapping.
- **Readings.** The figures moved by −7 to +16 B Brotli against `src`: +4 B on "freeDrag", +16 B on "freeDrag + bounds + landing", −7 B on each `sortable` row, −1 B on "complete", and 0 on the five other rows.
- **No row's verdict changed,** so nothing goes to `DRO-4` from this unit. The six rows over their ceilings are the same six as before.
- **Witnesses.** Bytes added to an emitted module raise exactly the rows whose graphs contain it, and the same bytes in `src` change nothing.
- **One build per run** serves both projects, counted by tracing the processes the run started.
- **`DRF-23` is closed at `79b4c3132`.**

#### DRD-56 — Internal properties carry a `_` prefix in source, and the publication build shortens exactly those names through one committed map

**A property that only this package's own code reads or writes, and that the publication build should shorten, is named with a `_` prefix in `src`. The `tsdown` build renames every such property in the emitted JavaScript, using one committed map from source name to output name. Public names, names the platform reads or calls, and `#private` members keep their names. No tool picks the names from types. The `.d.ts` output doesn't change, each module's source map still leads back to `src`, and a test validates the publication that the build actually produces. Budgets are unchanged.** This is `DRO-15` step 3, and [`publish-mangle-handoff.md`](publish-mangle-handoff.md) implements it.

Decided on 2026-11-13 by the architect, on the owner's answer to `DRO-15`:

- explicit underscore prefixes in source for strictly internal properties, followed by publish-time mangling;
- public and platform names unchanged;
- the mangled set is not inferred from types.

The owner's direction is in [`performance-plan.md`](performance-plan.md) §2 at `3b8f2d788`, and the type-directed transform is deferred in its §6.

**Why:**

- **The prefix makes each choice visible, and a person makes it.** The exploration chose names by type analysis, and the analysis was wrong about `zIndex` ([exploration](property-mangling-exploration.md) §2). With a prefix, the name in `src` states that the property is internal, a reviewer sees each one in a diff, and the build needs no analysis.
- **The prefix removes the platform risk by construction.** `src` itself runs with `_config`, so a prefixed key that reached a platform API would already fail in the source projects. Renaming `_config` to a short name can only break something that reads the name as text: a string key, a computed key, or an enumeration whose result depends on the names. Property 1 forbids those, and validation V1 finds them.
- **One committed map keeps the modules consistent.** The build is unbundled, so the modules that share an object are renamed separately. Using one fixed map from source name to output name means every module renames `_config` the same way. Committing the map makes a build reproducible, and a new prefixed name shows up as a change to the map.
- **An output name must not equal a name that stays.** The renamer sees one module at a time, so on its own it could give a prefixed member a short name that another module uses unprefixed on the same object, such as `x`. The map is built with the whole publication in view, and V3 checks it.
- **The step belongs to `tsdown`'s build.** Every path that builds the publication then includes it: `just build`, the consumer project, the gate, and a publish. A separate step after the build could be skipped. `tsdown` composes the source map that a plugin returns with its own, so the published maps lead back to `src`.
- **This fits CONTRIBUTING.** §11 says to let the minifier shorten identifiers. The prefix is a marker for the tool, not a shortened name. Part I's priorities already rely on `#private` names being mangled, so those take no prefix. The class encapsulation rules still apply to a prefixed member: mutable state stays in `#private` fields.
- **Tier 2 isn't taken.** Its names are members of `DRD-39`'s installer types, and those types are declared in the emitted `.d.ts` files. The exploration recommended against it, and the owner didn't choose it.

**Required properties:**

1. **The marker.**
   - A property name of one `_` followed by a letter, `^_[A-Za-z]`, marks an internal property that the publication build shortens. It covers class members, object literal keys, member accesses and destructuring keys.
   - `src` uses no such name for anything else: not for a binding, a parameter, a module export, a string or a computed key, or a property that code enumerates by name.
   - Names with two leading underscores, such as `__DEV__` and `__dragRefused`, are not markers.
   - **These keep their names:**
     - `#private` members;
     - every member that an emitted `.d.ts` declares;
     - every name the platform reads, writes or calls, such as `handleEvent` and a keyframe's keys;
     - every property stored on a platform object;
     - every property of an object that a consumer creates, and every member that a published type declares on an object that a consumer receives;
     - every member of a development instrument that tests read through a global, such as the refusal count's `trusted` and `untrusted`.
2. **The selection is explicit, and made by reading the code.**
   - **The starting set** is the exploration's tier 1 that the bundle contains: `advance`, `animation`, `collect`, `config`, `count`, `decide`, `detach`, `direction`, `dx`, `dy`, `empty`, `enter`, `first`, `holds`, `lend`, `measure`, `measurePlaceholder`, `placeholderRect`, `raise`, `raiseInPass`, `rebase`, `refresh`, `root`, `run`, `schedule`, `stepTarget`, `terminate`, `updateInsertion` and `window`. That is 29 names.
   - **The prefix applies to a declaration, not to every use of a name.** For each name, every internal declaration with that name is renamed together with its uses. A parameter or local binding with the same name, such as `root: HTMLElement`, stays.
   - **Each declaration is confirmed by reading its use sites against property 1.** One that fails stays unprefixed, and the report gives the reason.
   - **No tool selects or adds a name.** A later prefixed name is added by hand, in a diff that also changes the map.
3. **The source rename changes no behavior.**
   - Each declaration is renamed with the type checker's rename, and `tsc` checks the result.
   - A test, bench or probe that names a renamed member follows the rename and changes nothing else. That includes `@ts-expect-error` lines that assert a published type lacks the member.
   - `compare.ts`'s injection texts follow the rename. **The rename makes no injection stale:** `--prove --dry` and `--floors --dry` report the same entries applying at the base and at the end. Entries that `DRD-45` property 9 already lists as stale stay as they are. The dry checks start no browser and measure nothing, so they aren't the deferred campaigns of `DRD-51` property 3.
4. **The map.**
   - One committed file, kept out of the publication, maps each prefixed name to its output name.
   - Its keys are exactly the prefixed property names in `src`, found by reading the syntax, and a test fails when the two differ.
   - Its output names are distinct, valid identifier names, unprefixed, and equal to no property name that stays in the publication.
   - A committed script generates it deterministically from the unrenamed publication, and a person reviews the diff.
5. **The step.**
   - It is part of the `tsdown` build, so `just build`'s two commands produce the renamed publication.
   - It renames properties in each emitted JavaScript module using the committed map, and changes nothing else in the module: its statements, its comments that bundlers read (`@__PURE__`, `#__PURE__`, `@__NO_SIDE_EFFECTS__`) and its `sourceMappingURL` stay.
   - **A prefixed name that the map lacks fails the build,** and the error names it.
   - The `.d.ts` and `.d.ts.map` output is byte-identical to a build without the step.
   - The step adds no runtime code.
6. **Source maps.**
   - Every emitted module's map is valid.
   - Every renamed property's position in the emitted code maps to the position in `src` where the prefixed name is written.
     - **One exception:** the renamed name is a class member, and the build without the step already maps that token to the start of the member that declares it. The mapping then stays at the member start. From that position, the `src` text holds only class member modifiers and whitespace, and then the same prefixed name. No other form passes: not a different name, a decorator, a comment, or a position in another member.
   - Every other token in the emitted code maps to the same `src` position as the corresponding token does without the step.
7. **The publication is validated.** A node test reads the run's one build (`DRD-55` property 1) and checks every file that `package.json`'s `files` selects:
   - **V1:** no emitted `.js` file holds a property name or a string literal that matches `^_[A-Za-z]`;
   - **V2:** no emitted `.d.ts` file holds an identifier that matches `^_[A-Za-z]`;
   - **V3:** the map satisfies property 4 against this build;
   - **V4:** each renamed position maps back as property 6 states;
   - **V5:** two builds of one tree give byte-identical `.js`, `.js.map`, `.d.ts` and `.d.ts.map` files. The handoff checks this once, outside the test.

   The consumer project's tests run against the renamed build and must all pass.

8. **Engines.** The consumer project stays Chromium only, which settles `DRD-54`'s open question. The renaming touches no name that an engine treats differently, by property 1. A one-time run of the consumer files in Firefox and WebKit against the renamed build validates that, and isn't added to the suite.
9. **Budgets.** Every ceiling and the control figure stay. The unit reports every row as read by the gate on the renamed build, against the build without the renaming. A verdict that changes goes to the owner under `DRO-4`.

**Expected:** the exploration's emulated publication read −30 to −66 B Brotli on the rows without `sortable`, and −103 to −119 B on the three `sortable` rows, at `b0287f1ae`. It also read that "freeDrag" and "example: resize handle" would fall below their ceilings. Those are estimates. The gate's joint reading is the booked figure (`DRD-51` property 1, as amended).

**What this amends:** `DRD-51` property 3 is clarified: `--prove --dry` and `--floors --dry` aren't campaigns. `DRD-54`'s question on three engines is answered by property 8.

**What this doesn't decide:**

- the type-directed transform ([`performance-plan.md`](performance-plan.md) §6, deferred);
- whether the `shipped` census moves to the build;
- `DRO-4`'s re-base;
- prefixes for any package other than `@ydinjs/drag`. That would be a CONTRIBUTING change.

**Corrected on 2026-11-13, in place** ([assessment](publish-mangle-assessment.md) §3 and §4):

- **Property 6, the class member exception.** Rolldown 1.2.15 maps a `readonly` class field to the start of its member, with or without the step, and a map that `renderChunk` returns can't move that mapping. Property 6's second bullet then contradicted its third for four renamed fields. On the owner's answer during the unit, the third bullet governs, within the bound that the exception states. V4 refers to property 6, so it applies the same bound. Before the correction, the second bullet had no exception.
- **Property 1, objects that a consumer receives.** The bullet read "every property of an object that a consumer creates, or receives under a published type". It now names the members that the published type declares. That is how the selection and the handoff read it: `Gesture`'s `enter`, `raise`, `raiseInPass` and `detach` aren't declared by `DraggableController`, and are prefixed. No selection changes.

**Result, 2026-11-13:** commit A at `f7b7b300b` and commit B at `31f92f5a9`, reported at `78797ebf6` and accepted ([assessment](publish-mangle-assessment.md), §Disposition of the publish mangle report).

- **Selection.** All 37 declarations of the 29 names are prefixed. Each was read against property 1, and none stays.
- **Rename.** With each `_name` read as `name`, `src` doesn't differ. The `.d.ts` files are byte-identical, and the dry checks apply the same entries as at the base.
- **Step.** It renames 145 names in the emitted modules through 29 map entries, and changes nothing else. All 6,902 mappings keep their `src` positions. Four of them use property 6's exception.
- **Validation.** The publication test passes, and M1 to M7 fail as required. V5 holds. The consumer project passes 326 of 326 on the renamed build, and its files pass in Firefox and WebKit once.
- **Size, Brotli-11, base → end:** −31 to −66 B on the seven rows without `sortable`, and −102 to −110 B on the three rows with it. "example: resize handle" and "freeDrag" turn green. Ceilings and the control are unchanged, and the verdicts go to `DRO-4`.

**Extended on 2026-11-13 by `DRD-57`:** property 2's selection adds 30 declarations that its starting set missed, and a one-character name isn't selected.

**Superseded in part on 2026-11-13 by `DRD-59`,** on the owner's requirements for the publication, which withdraw the requirement to keep the JavaScript text and the source map segments. Properties 4, 5 and 6 and property 7's V2 to V4 are replaced. Properties 1 to 3, 8 and 9 and V1 stay. The rationale's claims about what V1 finds (`DRF-30`) and about a publish (`DRF-31`) are corrected there.

#### DRD-57 — The prefix selection is made per declaration across `src`, and adds 30 declarations

**Every property declaration in `src` that `DRD-56` property 1 admits carries the `_` prefix, also when a platform member or a published member has the same name. The audit at `436b105c6` adds 30 declarations under 24 new names to `DRD-56`'s 37 declarations. The installer types' members, names of one character, and everything that property 1 keeps stay unprefixed. The step, the publication test and the map's generator don't change, and the map is generated again. Budgets are unchanged.** [`mangle-selection-audit.md`](mangle-selection-audit.md) is the audit, and [`mangle-selection-handoff.md`](mangle-selection-handoff.md) implements it.

Decided on 2026-11-13 by the architect, on the owner's request to audit the selection after `RectIndex.values` was found unprefixed.

**Why:**

- **The starting set came from a rule about names.** The exploration counted a name as eligible only when every use of it resolved to this package, because Rolldown's `mangleProps` renames every occurrence of a name. `DRD-56` renames one declaration and its uses, and its property 2 already says the prefix applies to a declaration. The starting set therefore left out every internal declaration whose name the platform or a published type also uses: `RectIndex.values` beside `Map.values()`, `FrameTask.cancel` beside `Animation.cancel()`, and 28 more ([audit](mangle-selection-audit.md) §1).
- **The extension applies `DRD-56`'s own rule.** Each added declaration passes property 1 for the same reasons as a declaration that is already prefixed on the same class or type, such as `_config` beside `axis`, `_empty` beside `has`, and `_direction` beside `visual`. No step property changes.
- **A name of one character gains nothing.** The map's output names are at least one character, so a prefix on `x` or `y` adds a map entry and the rename's risk, and no bytes.
- **The installer members stay out,** as the owner chose under `DRO-15`. The exclusion is stated by declaration: members of internal types that only share a name with an installer member are selected ([audit](mangle-selection-audit.md) §5).
- **The pipeline doesn't change,** so the independent review pinned to `436b105c6`, which reads `build/` and the publication test, still reads the code that this unit runs.

**Required properties:**

1. **The selection.** The 30 declarations in [audit](mangle-selection-audit.md) §3 are prefixed, each together with its uses, by the type checker's rename at that declaration. A declaration with the same name that isn't in that table keeps its name. With `DRD-56`'s 37 declarations, 67 declarations under 53 names are prefixed.
2. **What stays** is [audit](mangle-selection-audit.md) §4 and §5. This includes every member that an emitted `.d.ts` declares, every class member that implements a member of a published interface, and every member of an installer type or of an object that implements one.
3. **A property whose name is one character isn't prefixed.** This adds to `DRD-56` property 1's list of names that keep their names.
4. **The map.** The committed script generates `build/property-names.json` again. Its keys are exactly the 53 prefixed names in `src`, and a person reviews its diff. **The rename and the map change in one commit,** because the step fails a build on a prefixed name that the map lacks.
5. **Nothing else in the pipeline changes:** `build/*.ts`, `tsdown.config.ts`, `tests/publication.node.test.ts`, `package.json`, `files.json` and `.scripts/`. The `.d.ts` output is byte-identical. `DRD-56` properties 3 and 5 to 9 apply as written.
6. **Budgets.** Every ceiling and the control figure stay. The gate's reading on the published build is the booked figure (`DRD-51` property 1), and a verdict that changes goes to `DRO-4`.

**Estimated:** about 128 occurrences in the emitted modules and about 600 characters before compression, across the whole publication ([audit](mangle-selection-audit.md) §6). Not measured.

**What this amends:** `DRD-56` property 2's starting set. The selection is `DRD-56`'s 37 declarations and these 30. Property 3 adds a rule to `DRD-56` property 1.

**What this doesn't decide:**

- the type-directed transform ([`performance-plan.md`](performance-plan.md) §6, deferred);
- the installer types' names, or any name that a `.d.ts` declares;
- the independent review of `DRD-56`'s pipeline. Its pin, its scope and its passes stay as they are;
- whether the `shipped` census moves to the build, and `DRO-4`'s re-base.

**Implemented on 2026-11-13** at `b50204f66`, and reported at `1719df16c` ([report](mangle-selection-report.md)). The architect hasn't read the report. **Property 4 is superseded by `DRD-59`:** the map is computed in each build, and no file holds it. Properties 1 to 3 and 6 stay.

#### DRD-58 — `RectIndex`'s slot buffer is one `number[]` for the index's life, and the rules that replacement required go

**`RectIndex.#values` is one `number[]`, created with the index and never replaced. It grows only by appending, in `_collect`, so it never has a hole. `#capacity` and `capacityFor` go. The `values` getter returns the same array, typed `readonly number[]`, for the index's life. `_lend` stays the only way a write leaves the class. It keeps its extent rule, and loses its lifetime and reentrancy clauses, which existed only because `_collect` could replace the buffer. The packed layout, the window and every value read from it are unchanged. Fixed-size buffers stay `Float64Array`.** [`slot-array-handoff.md`](slot-array-handoff.md) implements it.

Decided on 2026-11-13 on the owner's direction. The owner chose the simplification for itself: the unit reports its costs, and a speed-up is not required to justify it. The member names below are `436b105c6`'s. `DRD-57` prefixes `values`, `items`, `end`, `invalidate` and `retire`, and the unit runs after it.

**The owner's direction:**

- **Replace the growable `#values` buffer with `number[]`,** and remove manual capacity management and buffer replacement.
- **Simplify the ownership rules that existed because `_collect` replaced the buffer.**
- **Keep the packed geometry and its behavior.**
- **Only the growable slot buffer is in scope.** Fixed-size buffers, such as box-quad's out parameters, are not.
- **Check the affected sink signatures and declarations explicitly.**
- **Use the existing behavior, geometry, allocation and size checks, and report the costs.**
- **The independent review stays pinned to `436b105c6`.**

**Why the rules go.** `DRD-52` gave `_lend` a lifetime ("valid during the call only") and a reentrancy rule ("`write` calls neither `_collect` nor a rebuild that calls it"), and the `values` getter a lifetime ("valid until the next `_collect`"). The owner asked for them because a reference could outlive its buffer ([proposal](rect-index-ownership-proposal.md) §1, §3.1). An array that is never replaced can't be outlived, so all three go. **The class-encapsulation rule doesn't depend on replacement**, so changes still leave the class only through a method: a writer writes during its lend, and a reader gets a read-only view. The extent rule describes the window, not the buffer's lifetime, so it stays.

**Why it must grow by appending.** `y()`'s window starts at the placeholder's slot, so `_measure` writes slots in the middle of the collection first. A write past an array's length leaves a hole. In V8, a write at index 600 of an empty array left it holey, and a write at index 1,026, which is slot 171 at `STRIDE` 6, made it a dictionary ([probe](measurements/2026-11-13-slot-array-kinds.js.txt), [output](measurements/2026-11-13-slot-array-kinds.txt)). Assigning a larger `length` left the array holey too. Appending numbers keeps the array packed, and the engine manages its capacity.

**Required properties:**

1. **The slot array.** `#values` is a `readonly` field holding one `number[]`, created with the index. Nothing assigns it again. No field, function or comment states a capacity. Nothing in `src` allocates a typed array for the slots.
2. **Growth.** Before `_measure` writes a slot, the array's length covers that slot. `_collect` makes it so by appending numbers at the array's end, and only when the collection has more slots than the array holds. No write lands past the array's length, and nothing assigns `length` upward. **The array never shrinks:** it holds the largest collection the index has measured, and `retire` keeps it, as now. The unit shows this property by listing every write and growth site in the report. It adds no instrument.
3. **The geometry.** The layout is `[left, top, right, bottom, centerX, centerY]` per slot, at `STRIDE` 6. `pack`'s arithmetic, the window, `_measure`'s range, `settle`'s range and every read site don't change. A slot inside the window holds the same IEEE double that the `Float64Array` held. A slot outside the window is unspecified, and nothing reads it, as now.
4. **Reads.** The `values` getter returns `readonly number[]`: the same array for the index's life, like `items` and `_placeholderRect`. Its JSDoc says that the contents are valid inside the window. It no longer gives a lifetime. A read site no longer has to read after the `_collect` it depends on.
5. **`_lend(lo, hi, write)`** calls `write(values, lo, hi)` once with the writable `number[]`.
   - **Extent, unchanged:** `lo` to before `hi` is inside the window, and `write` reads and writes nothing outside it.
   - **Ownership:** `write` writes the array only during the call. This is the class-encapsulation rule. It no longer describes when the reference is valid.
   - **Removed:** the lifetime clause and the reentrancy clause.
   - The JSDoc still says that this is the rule `_measure` gives the sink's `settle`, and that nothing checks it at runtime.
6. **Fixed-size buffers stay `Float64Array`.** These are `#placeholderRect`, `_holds`'s one-slot scratch, `linear-shift.ts`'s one-slot probe scratch and `heldPlaceholder`, `ReadonlyFloat64Array`, which still types `_placeholderRect` and `verifyEquivalence`'s `heldPlaceholder`, and everything outside `src/sortable/` (box-quad's out parameters, `free-drag/geometry.ts`, the stories and the fixtures).
7. **Shared signatures.** A function or method that receives both the slot array and a fixed-size buffer takes `number[] | Float64Array`, with no cast, copy or conversion at any call site. A read-only view (`readonly number[]`, `ReadonlyFloat64Array`) is not assignable to it. **The union is written in each parameter and not named,** so that no `.d.ts` gains a declaration (property 8). The affected declarations:

   | Declaration | At `436b105c6` | After |
   | --- | --- | --- |
   | `rect-index.ts` module JSDoc | "one `Float64Array` plus one parallel element array"; "alone allocates the buffer" | One `number[]`; `RectIndex` alone grows it |
   | `pack(target, offset, rect)` | `target: Float64Array` | `number[] \| Float64Array`: the slot array, `#placeholderRect` and `_holds`'s scratch |
   | `capacityFor` | Power-of-two capacity | Removed |
   | `#values` and its JSDoc | `Float64Array`, replaced when outgrown, "never shrinks" | Property 1. "Never shrinks" stays true |
   | `#capacity` | Field | Removed |
   | `get values()` | `ReadonlyFloat64Array`, "valid until the next `_collect`" | `readonly number[]`, property 4 |
   | `_collect` | Replaces the buffer when outgrown | Property 2 |
   | `_lend`'s `write` parameter and JSDoc | `(values: Float64Array, lo, hi) => void`, three rules | `(values: number[], lo, hi) => void`, property 5 |
   | `verifyEquivalence`'s `predicted` | A `Float64Array` copy | A `number[]` copy, by `slice` as now |
   | `axis.ts` `DisplacementSink.settle`'s `values` | `Float64Array` | `number[] \| Float64Array`: `_measure` passes the slot array, and `_holds` and the probe pass a one-slot `Float64Array`. The range rule in its JSDoc is unchanged. **Emitted in `sortable/axis.d.ts`** (property 8) |
   | `layout-animation.ts` `settle`'s `values` | `Float64Array` | As `axis.ts`. The body is unchanged |
   | `linear-shift.ts` `advance`'s `values` | `Float64Array` | `number[]` |
   | `linear-shift.ts`, `xy.ts` and `y.ts` read sites | Untyped destructuring of `values` | Unchanged. A comment whose reason is replacement is rewritten or removed |
   | `xy.ts` `before` | A growable `Float64Array`, replaced when outgrown | **Unchanged.** It isn't the slot buffer (see "What this doesn't decide") |

8. **The publication.**
   - No prefixed name is added or removed, so `build/property-names.json`, generated again, is byte-identical. The publication test passes.
   - **One `.d.ts` line changes:** `settle`'s `values` parameter in the emitted `sortable/axis.d.ts` becomes `number[] | Float64Array`. Every other emitted `.d.ts` is byte-identical, and no `.d.ts` file is added. `DisplacementSink` is one of `DRD-39`'s unpublished installer types, which no entry exports, and CONTRIBUTING Part II §8 keeps no compatibility for it. `DRD-50` changed the same signature on the same ground.
   - `DRD-39` property 3's instrument still holds: `typedoc` warns only about `AxisInstaller` and `DisplacementInstaller`.
9. **Tests.** Only the helpers in `tests/displacement-sink.browser.test.ts` that identify the cache by its `ArrayBuffer` change: they identify it by being an array. `DRD-50`'s W7 still asserts that every measurement's `settle` receives one slot array and one element array, each with the range it read, and no test title changes. **A copy mutation shows that W7 still discriminates:** `_measure` passing `settle` a copy of the slot array fails W7. M8 still fails W8.

**Costs, reported and not gated.** The owner asked for a report, and no reading returns the unit.

- **Size:** every row, minified, gzip-9 and Brotli-11, at the base and at the end. The seven rows without `sortable` are control rows and must read exactly 0/0/0 (`DRD-51` property 2). A non-zero control row is a finding.
- **Allocation:** `DRD-52`'s probes, per sample in each axis and per committed move cold and warm, at the base and at the end.
- **Expected, not measured:** the first `_collect` of each index appends six numbers per slot, where the base allocated one typed array. V8 first holds an array of zeros as small integers, and the first fractional coordinate converts it to doubles once. `pack` and `settle` now receive two representations.
- **Timing isn't measured.** The owner named the checks, and `DRD-50`'s result showed that a paired probe on this cache can't resolve an effect of this size. The report says that timing is unmeasured. `DRD-51` property 4 governs changes made for bytes in the size pass, and this isn't one.

**What this amends:**

- **`DRD-52` properties 1, 4 and 6,** by properties 1, 5 and 4 above. Its §Amendment states what they used to say.
- **`DRD-50` W7's implementation.** The helpers no longer read an `ArrayBuffer`, and the copy mutation stands in for M7, whose view-and-copy call no longer applies to an array.

**What this doesn't decide:**

- **`xy.ts`'s `before`,** the other growable typed buffer in `src/sortable/`. It belongs to `xy()`'s committed move, not to `RectIndex`, so it is outside the owner's scope. The owner may extend this decision to it.
- **Fixed-size buffers as `number[]`.** That would give `pack` and `settle` one representation, and the owner excluded it.
- Removing `_lend`. It is the class's write method, and `DRD-52`'s ownership stands.
- The independent review of `DRD-56`'s pipeline, its pin to `436b105c6`, and `DRO-4`'s re-base.

**Amended on 2026-11-13 by `DRD-59`:** once `DRD-59`'s unit lands, property 8's first bullet reads "the publication test passes", because no file holds the map. Nothing else changes, and the unit stays separate.

#### DRD-59 — The publication is minified by `tsdown`, Oxc renames the internal properties through a map that each build computes, and the declarations come from a build without maps

**`tsdown.config.ts` has two configurations. The JavaScript configuration minifies with `tsdown`'s `minify: true` and writes source maps with `sourcesContent`. The declaration configuration writes `.d.ts` files only, with no maps and no map references. The internal properties that `DRD-56` and `DRD-57` select are renamed by Oxc's own `mangleProps`. One plugin applies it in each module, through a map that a single-chunk build of the same entries computes. The custom renamer, its reader, its generator and the committed map go. The publication test checks the maps and the declarations. Budgets are unchanged.** [`publication-build-proposal.md`](publication-build-proposal.md) is the reasoning and the probes, and [`publication-build-handoff.md`](publication-build-handoff.md) implements it.

Decided on 2026-11-13 by the architect, on the owner's requirements for the publication:

- separate `.js` and `.d.ts` modules;
- JavaScript fully minified, including the approved internal-property mangling;
- declarations that keep every documentation comment;
- a `.js.map` for each module that embeds the complete source through `sourcesContent` and supports debugging the minified code;
- declaration maps optional, and no reference to a map that doesn't exist;
- native `tsdown`, Rolldown and Oxc options first, and a custom plugin only for a demonstrated requirement that native tooling can't meet;
- the annotations that downstream bundlers need, and the required license notices.

**The owner withdrew** the requirement to preserve the previous JavaScript text and identical source map segments.

**Why:**

- **The custom pipeline existed for the withdrawn requirement.** `DRD-56` properties 5 and 6 required the step to change nothing but the names, and every other token to keep its mapping. That is why the step rewrites characters with its own map, why it has its own reader, and why V4 compares positions. With the requirement gone, Oxc renames in its own AST pass and Rolldown composes the maps ([proposal](publication-build-proposal.md) §4.1).
- **One plugin is necessary, and its reason is demonstrated.** Rolldown 1.2.15 refuses `output.minify.mangleProps` when a build has more than one JavaScript chunk, even with a complete `cache` (proposal §2, L1). drag's publication is unbundled. Bundling per entry would duplicate the kernel and split identity across entries, such as `DragFault` and the module-level `admitted` set.
- **Oxc's rename, applied in each chunk, matches the custom renamer.** With the committed map as `cache`, the minified `.js` is byte-identical to the custom renamer followed by native minification. Its maps also name every renamed property access (proposal §2, N2).
- **The map comes from the tools.** A single-chunk Rolldown build of every entry with native `mangleProps` returns a map with the same 53 keys, and it is deterministic. Oxc picks the output names against every property name in that one chunk. That is `DRD-56` property 4's "equal to no name that stays", met without a reader (proposal §2, N3).
- **Oxc doesn't protect a pinned name** from a kept name in the same chunk, and Oxc can list a chunk's kept names. So the build checks each chunk with Oxc's own listing (proposal §2, N4).
- **`quoted: true`** renames a string key in property position together with its property, and keeps plain strings, which V1 catches (proposal §2, N4, `DRF-28`).
- **The rename pass needs `legalComments: 'inline'`.** Native minification keeps legal comments, and Oxc's codegen drops them by default (proposal §2, N5).
- **The declaration reference needs the second configuration.** With the build's `sourcemap` on, no `dts` option stops the `.d.ts` reference to a map that isn't emitted. A declaration-only configuration with `sourcemap: false` writes none, and its `.d.ts` files are otherwise identical to the current ones (proposal §2, L2, N7). `drag2`'s `D-111` reached the same diagnosis and strips the reference with a hook.
- **No declaration maps.** They would point at `src/*.ts`, which the package doesn't publish (proposal §2, N8).
- **The declarations already keep their documentation.** Every JSDoc block on a declaration that a published `.d.ts` declares is in it: 115 of 115, against TypeScript's own emit. The rest are maintainer notes under the [documentation model](../../../.agents/docs/documentation.md) §5 (proposal §2, N9).
- **Size:** the gate moves by −9 to +9 B Brotli per row, and no verdict changes (proposal §6).

**Required properties:**

1. **Two configurations, one `tsdown` run.**
   - Both have the same entries, platform, format, target, `define`, `unbundle` and shared plugin list.
   - **JavaScript:** `minify: true`, `sourcemap: true`, `dts: false`, the rename plugin, and `exports`.
   - **Declarations:** `dts: { emitDtsOnly: true }` and `sourcemap: false`, with no rename plugin and no `exports`.
   - `just build` stays the clean, then `tsdown --config tsdown.config.ts`, so `DRD-55` property 1 is unchanged.
2. **Minification** is `tsdown`'s `minify: true` with Rolldown's comment defaults. No custom code minifies. `keepNames` stays off: function and class `name` values aren't part of the contract.
3. **The internal properties.** `DRD-56` properties 1 to 3 and `DRD-57` properties 1 to 3 stay: the marker `^_[A-Za-z]`, the selection by declaration, and the names that keep their names.
   - **(a) The map.** Before any module renders, one in-memory Rolldown build bundles every runtime entry in `files.json` into one chunk, with the JavaScript configuration's `define` and shared plugins, and `@ydinjs/box-quad` external. It applies native `minify.mangleProps` with `include: /^_[A-Za-z]/` and `quoted: true`, and its `mangleCache` is the map. The build fails when that build gives more than one chunk. The map is written nowhere.
   - **(b) The rename.** In `renderChunk`, for each JavaScript chunk, `rolldown/utils`' `minifySync` runs with compression and identifier mangling off, whitespace kept, `legalComments: 'inline'`, a source map, and `mangleProps` with the same `include`, `quoted: true` and the map as `cache`. The plugin returns the code and the map. Rolldown composes the map and then minifies.
   - **(c) The build fails,** naming the chunk and the names, when a chunk's kept property names include an output name, or when Oxc assigns a name that the map lacks. The kept names are those that Oxc lists with `include: /^/`, the marker as `exclude`, and `quoted: true`.
   - **No other custom build code** for the JavaScript: no reader, no map arithmetic, no committed map and no generator.
4. **Source maps.**
   - Each published `.js` with mappings has a `.js.map` beside it and a `sourceMappingURL` that names it. A module with no mappings, a single re-export, has neither.
   - Each map's `sourcesContent` holds the full text of each source, equal to the file under `src`.
   - Each renamed property in a published module leads to the `src` text of its prefixed name, after class member modifiers. A key that the output writes as shorthand may lead to its value instead.
   - Other mappings are the tools'. Some minified locals carry no `names` entry, as they don't without the rename (proposal §2, L3).
5. **Declarations.**
   - Separate `.d.ts` modules, as now.
   - No `.d.ts` holds a `sourceMappingURL`, and no `.d.ts.map` is emitted.
   - Every JSDoc block on a declaration that a published `.d.ts` declares is kept.
   - No `.d.ts` holds a marker name in any form.
6. **Annotations and license notices.**
   - Each published module keeps every `@__PURE__`, `#__PURE__` and `@__NO_SIDE_EFFECTS__` annotation that its unminified build has, and the minifier may add more.
   - Each legal comment in a source module (`/*!`, `//!`, `@license`, `@preserve`) is kept in its published module. `src` has none today.
   - `LICENSE` is in the package root, and npm packs it whatever `files` lists. `@ydinjs/box-quad` stays external, so the publication bundles no third-party code.
7. **The publication test**, on `DRD-55` property 1's one build:
   - **V1:** unchanged. No published `.js` holds a property name, string literal or template text that matches the marker.
   - **V2:** no published `.d.ts` holds an identifier, string literal or template text that matches the marker.
   - **V3:** property 4's map checks. The test takes the map from the build's own function. It splits `src` lines at CR LF, LF, CR, U+2028 and U+2029.
   - **V4:** property 5's map references.
   - **Removed:** the name-set test, the old V3 and the old V4. V5 stays a one-time check in the unit.
8. **What is publishable.**
   - `just build` alone guarantees properties 1, 2 and 3. Every marker name that Oxc finds in property position is renamed, every module uses the same map, and no output name is a kept name.
   - A tree is publishable only when a Vitest run's node and consumer projects read it and passed.
   - **No publication hook.** No path publishes the package, and `@ydinjs/drag` is `private` ([remediation assessment](mangle-remediation-assessment.md) §2).
   - **Obligation:** the change that makes the package publishable, by removing `"private": true` or by adding a workflow or script that packs or publishes it, makes the packed tree one that those projects read and passed in the same job.
9. **Budgets.** Every ceiling and the control figure stay. The unit reports every row at its base and its end. A changed verdict goes to `DRO-4`. The consumer project stays Chromium only, and the unit runs its files in Firefox and WebKit once, as `DRD-56` property 8 did.

**What this replaces:**

- **`DRD-56` property 4,** the committed map and its generator, by property 3a.
- **`DRD-56` property 5,** a step that changes nothing but names, keeps every comment and leaves the `.d.ts` output byte-identical, by properties 2, 3b, 5 and 6.
- **`DRD-56` property 6,** the renamed positions and every other token's mapping, by property 4.
- **`DRD-56` property 7:**
  - V1 stays;
  - V2 is extended;
  - V3, V4 and the name-set test are replaced by property 3c and the new V3 and V4;
  - V5 becomes the unit's one-time check.
- **`DRD-56`'s rationale bullets** on the committed map and on the step's placement, as far as they argue for them. The step is still part of the `tsdown` build.
- **`DRD-57` property 4:** the regenerated map, and the rule that the rename and the map change in one commit.
- **The remediation proposal at `be151f9ed`** ([assessment](mangle-remediation-assessment.md), [handoff](mangle-remediation-handoff.md)), withdrawn before implementation. Its validation decision never received a number. Its §2 finding and its rule on what is publishable are kept, in property 8 (proposal §4.2).

**Corrections, from the review:**

- **`DRF-30`:** `DRD-56`'s rationale said that V1 finds computed keys and enumerations. V1 finds literal strings and templates only. A key computed at runtime is excluded by `DRD-56` property 1 and by property 2's reading of the use sites.
- **`DRF-31`:** `DRD-56`'s rationale listed a publish among the paths that build the publication. None exists. Property 8 states what is publishable.

**What this amends:** `DRD-58` property 8's first bullet. Once this decision's unit lands, the map doesn't exist, and the bullet reads "the publication test passes". `DRD-58`'s unit stays separate (proposal §8).

**Revisit** when Rolldown accepts `mangleProps` for a build with several chunks. Property 3's plugin and map build then give way to a `minify.mangleProps` option.

**What this doesn't decide:**

- the owner's shared-tooling proposals S1 to S4 (proposal §7): the dangling declaration references in other packages, `classVarCleanupPlugin`, a CONTRIBUTING statement of the marker, and the upstream limitation;
- `DRD-57`'s report at `1719df16c`, whose rename is this decision's base;
- the type-directed transform, `DRO-4`'s re-base and the `shipped` census.

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
| `DRF-13`, `DRF-14`, `DRF-15`, `DRF-17`, `DRF-18` | Optional. Open, with no merge condition. **`DRF-13` and `DRF-14` closed on 2026-11-12** by `312f4ec32` |
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

## Disposition of the performance instrument return

The [report](performance-instrument-report.md) at `b8f1d1b35` and its commits `f50f4a35a` and `ab14380c1`, read by the architect on 2026-11-10. The architect checked that `git diff --stat a9c323f6a..b8f1d1b35 -- src tests` is empty, that `isKernelFunction` is gone, and that `--prove --dry` with no browser lists seven injections as applied and exits 0. The architect also read the kernel keys of the step-list run in [`n3-prove.json`](measurements/2026-11-10-performance-n3-prove.json). The D1 to D3 runs, the key checks and the N runs are the report's.

| Item | Disposition |
| --- | --- |
| Item 1, `DRF-7` | Closed at `f50f4a35a`. All six injections apply at the current source, and D1 to D3 fail as required |
| Item 2, `DRF-1` | Implemented at `ab14380c1`. Properties 1 to 6 hold, and N1, N2's 1 KB and N3 pass in the pre-check. It closes when item 5 step 1 passes at the unit's last commit |
| The return: the step-list injection doesn't flag | `DRD-41`: it becomes the bytes rule's quiet witness. The handoff's §Resumption gives the remaining work |
| `--rejudge` leaves out the bytes rows of earlier recordings | Accepted. It is `DRF-1`'s property 4 |
| `DRD-32`'s reason for the idle branch | Registered as `DRF-20`, outside this unit |

## Disposition of the performance instrument report

The report's §Resumed at `c279973a3` and its commits `676bdd3ba`, `016ba7d5a` and `10e631943`, read by the architect on 2026-11-11 in [`performance-instrument-assessment.md`](performance-instrument-assessment.md). The checks the architect repeated are that record's §1.

| Item | Disposition |
| --- | --- |
| 2a, `DRD-41` | Implemented at `676bdd3ba`. Q1 fails as required, and the quiet witness is quiet and counted in the unit's `--prove` |
| `DRF-1` | Closed at `ab14380c1`. Item 5 step 1 passes at the unit's last code |
| Item 3, the floors | Recorded. The timing floors are too coarse for optimization. `DRD-43` decides the next step |
| Item 4, the per-sample test | The evidence supports H1. `DRD-42` decides the repair |
| Item 5, the baseline | Accepted as the baseline of `a9c323f6a`: B1 and B2 for the CDP rows, and B3 for the `--before` A/A. Its reading for the owner is in `DRO-4` |
| The retained row flags against both before arms | Not attributed: the handoff asked for a profile only on a slower row. [`performance-resolution-handoff.md`](performance-resolution-handoff.md) item 3 attributes it |
| The six red size rows | As expected at `a9c323f6a`. No ceiling moves (`DRO-4`) |

**Next:** [`performance-resolution-handoff.md`](performance-resolution-handoff.md), one implementer unit. No optimization unit starts before it reports (`DRD-43` property 8).

## Disposition of the performance resolution report

The [report](performance-resolution-report.md) at `39c8b432c` and its commits `a600abc51` and `a7b3851c1`, read by the architect on 2026-11-11 in [`performance-resolution-assessment.md`](performance-resolution-assessment.md). The checks the architect repeated are that record's §1, and its §2 corrects the report's environment record and two handoff rows.

| Item | Disposition |
| --- | --- |
| Item 1, `DRD-42` | Implemented at `a600abc51`. Conforms: M1 to M3 fail in 24 of 24 runs under the warm pass, and U-A and U-B pass. M4 shows at about 28 B per move, so the test catches that allocation at Chrome 157 |
| Item 2, `DRD-43` | Implemented at `a7b3851c1`. Properties 1, 2, 4 and 5 hold, and property 3's path holds. Neither gate injection flags. No entry flags in F1 or F2, which isn't a stable floor under property 6 |
| The return: `--prove` exits 1 | `DRD-44`: one experiment attributes it to the machine or the method. F1, F2, `--prove` and B3' aren't repeated before its outcome |
| Item 3, `DRO-4` | Attributed to the snapshot class `array `. It grows about 20.5 B per operation to 200 and not from 200 to 400. The retaining object isn't known. The reading is in `DRO-4` |
| `--attribute` has no control arm | Accepted. The handoff asked for an arm that the diagnostic doesn't build, and the figure needs none |

**Next:** [`performance-sensitivity-handoff.md`](performance-sensitivity-handoff.md), one implementer unit.

## Disposition of the performance sensitivity report

The [report](performance-sensitivity-report.md) at `24cdadc48`, read by the architect on 2026-11-11 in [`performance-sensitivity-assessment.md`](performance-sensitivity-assessment.md). That record's §1 lists the checks the architect repeated, and its §2 corrects the report's count of settled readings, one ratio and the handoff's self-check threshold.

| Item | Disposition |
| --- | --- |
| Items 1 and 2, the probe and the dry checks | Accepted. The self-check's longer loop, which the owner directed, is accepted, and the threshold was the handoff's error |
| Item 3, the four processes | Accepted as run, under the hold, each exiting 0 |
| `DRD-44` property 8 | Not resolved on both gate rows: no process has a settled round. Final by `DRD-45` |
| The gauge | Its first run is slower in every reading, which the machine doesn't explain. Withdrawn as a test by `DRD-45` |
| The rerun that property 8 prescribes | Withdrawn: it can't settle. `DRD-45`'s same-page check replaces it |
| The stale entries at `566ebfc65` | Verified: 10 of 23. Repaired before any campaign on that source (`DRD-45` property 9) |

**Next:** [`performance-page-check-handoff.md`](performance-page-check-handoff.md), one implementer unit.

## Disposition of the page check return

The [handoff](performance-page-check-handoff.md)'s return at `f344a0ea8`, read by the architect on 2026-11-11. No browser process ran, and nothing under `src/`, `tests/`, `bench/` or `measurements/` changed.

| Item | Disposition |
| --- | --- |
| The blocker: the cycle row's `run` reads the page's whole `lab.log` | Verified at [`compare.ts`](../bench/compare.ts) and [`lab.ts`](../bench/lab.ts). Not decided: the owner stopped the check. If it resumes, the architect decides it first (`DRD-46` property 1) |
| The check, `DRD-45` properties 3 to 8 | Stopped on the owner's direction and kept as written (`DRD-46`) |
| `DRD-45` property 9, the stale entries at `566ebfc65` | Still owed before any `--prove` or `--floors` on that source |

**Next:** [`performance-trace-handoff.md`](performance-trace-handoff.md), one implementer unit.

## Disposition of the performance trace report

The [report](performance-trace-report.md) at `e92e21eed`, read by the architect on 2026-11-11 in [`performance-trace-assessment.md`](performance-trace-assessment.md). That record's §1 lists the claims the architect checked again.

| Item | Disposition |
| --- | --- |
| Items 1 and 2, the trace mode and the 20 traces | Accepted. No return condition was met, and no production source changed |
| Item 3, attribution | Accepted, with its limits: sparse samples on every single-event library figure, and tracing overhead probed at 20 items only ([assessment](performance-trace-assessment.md) §4) |
| Candidate 2, the drop's re-measure | **Selected in a changed form, `DRD-47`.** The unconditional call protects an unsignalled scroll, so the drop confirms the cache against one row instead |
| Candidates 1, 3, 4 and 5 | Not selected. 1, 4 and 5 are decisions first, and 3 is below its row's A/A bound |
| The bundle's missing module markers | Verified. `DRF-21`. It changes no recorded verdict. The report's statement that `--profile` shares the gap is incorrect: `--profile` keys by function name |
| Playwright's drag listeners in the CDP move rows | Received, not verified. Both arms of every CDP row carry them, so no paired verdict depends on them |
| The drop-target tracker's drop | Found while reading candidate 2. `DRF-22` |
| The DevTools check of one trace per scenario | Open, the owner's |

**Next:** [`performance-drop-handoff.md`](performance-drop-handoff.md), one implementer unit, after the owner brings `566ebfc65`'s source and this record onto one branch.

## Disposition of the performance drop report

The [report](performance-drop-report.md) at `8eda874f0`, read by the architect on 2026-11-12 in [`performance-drop-assessment.md`](performance-drop-assessment.md). That record's §1 checks each property of `DRD-47` against the code and the records.

| Item | Disposition |
| --- | --- |
| Item 1, the base | Accepted. `093f31c7f` joined the branches, and its `src` equals `566ebfc65`'s |
| Items 2 to 4, the confirmation, W1 and W2, the contract and the README | Accepted. `DRD-47` properties 1 to 6 conform. Three deviations affect no result ([assessment](performance-drop-assessment.md) §1) |
| Item 5, the confirmation run | **Confirmed.** The target row is "faster" in `scriptUs` by −2,449 µs against a bound of 409 µs, lower in 7 of 7 rounds. No row is slower, and no layout count is above base |
| The landed row's smaller saving | Not a fallback at most drops: the two `production` medians differ by 31 µs, and `before` differs by 194 µs. An occasional fallback isn't excluded ([assessment](performance-drop-assessment.md) §2) |
| Item 6, the other checks | Accepted. The three-engine suite passes. The Chromium suite fails only on the five known size rows |
| The geometry rule | Approved by the owner, as the report records |
| The size cost, +125 to +140 B Brotli on the `sortable` rows | **Accepted by the owner** on 2026-11-12. No budget changes (`DRO-4`) |
| `DRF-22` | Decided by `DRD-48` |

**Next:** [`free-drag-drop-handoff.md`](free-drag-drop-handoff.md), one implementer unit on `drag/performance`.

## Disposition of the free drag drop report

The [report](free-drag-drop-report.md) at `7cb2207ae`, read by the architect on 2026-11-12 in [`free-drag-drop-assessment.md`](free-drag-drop-assessment.md). That record's §1 checks each property of `DRD-48`.

| Item | Disposition |
| --- | --- |
| Items 1 to 4, the drop's call, the documentation, W3 and W4, the contract and the README | Accepted. `DRD-48` properties 1 to 6 conform |
| Item 5, 11 reads at the drop and +5 B Brotli on the two `freeDrag` rows | Accepted. The owner approved the reads before the unit, and **accepts the bytes** on 2026-11-12. No budget changes (`DRO-4`) |
| Item 6, the other checks | Accepted. The three-engine suite passes, and the Chromium suite fails only on the five known size rows |
| `DRF-22` | **Closed at `71f20df20`** |
| The report's pending acceptance of the reads | Redundant with its own record of the owner's approval. Corrected in the report |
| The next optimization candidate | Candidate 1 of the trace report, as `DRD-49` |

**Next:** [`performance-window-handoff.md`](performance-window-handoff.md), one implementer unit on `drag/performance`.

## Disposition of the performance window report

The [report](performance-window-report.md) at `56c1c27c3`, read by the architect on 2026-11-12 in [`performance-window-assessment.md`](performance-window-assessment.md). That record's §1 checks each property of `DRD-49`.

| Item | Disposition |
| --- | --- |
| Items 1 to 4, the window, W5 and W6, the contract, the terms and the README | Accepted. `DRD-49` properties 1 to 6 conform |
| Item 5, the confirmation | **Confirmed.** −2,508 µs of script per cycle on the target row, against an A/A bound of 427 µs, in 7 of 7 rounds. No row is slower |
| The owner's approval of the scope and the ordering term | Recorded under `DRD-49`. It was given before the unit and accepted no result |
| `xy()`'s full measurement, shared with `y()` to fit the ceilings | A deviation from `DRD-49` property 8. Its reads and their values are unchanged. Its runtime is decided by `DRD-50`'s probe |
| The view and the copy that each read allocates with a sink | Corrected by `DRD-50` property 1 |
| Item 6, the size table: +155 B Brotli on "sortable + y" and "complete", +51 B on "sortable + xy" | Superseded by `DRD-50`'s figures, which the owner accepts (§Disposition of the performance window correction report). No budget changes (assessment §5) |
| Item 6, the suites | Accepted |

**Next:** [`performance-window-correction-handoff.md`](performance-window-correction-handoff.md), one implementer unit on `drag/performance`.

## Disposition of the performance window correction report

The [report](performance-window-correction-report.md) at `566d4d29e`, read by the architect on 2026-11-12 in [`performance-window-correction-assessment.md`](performance-window-correction-assessment.md). That record's §1 checks each property of `DRD-50`.

| Item | Disposition |
| --- | --- |
| Items 1 and 2, the base and range settling | Accepted. `DRD-50` property 1 conforms |
| Item 3, W7 and W8, with M7 and M8 | Accepted, with M7 adapted to the new signature and W8's two corrections, for the reasons the report gives |
| Item 4, the probe | Accepted. "No difference shown" in both cases, on attempt 2. Attempt 0 failed before any browser started, and attempt 1 broke the batch rule. Both are kept |
| The report's statement that the probe bounds a slowdown | **Corrected in the report.** The A/A bound is the rule's threshold, not a limit on a slowdown (assessment §2) |
| Item 5, one pass | Didn't apply |
| Item 6, the suites and the size table | Accepted |
| The window's bytes: +143 B Brotli on "sortable + y", +36 B on "sortable + xy" and +149 B on "complete", against `71f20df20` | **Accepted by the owner on 2026-11-12.** No budget changes (`DRO-4`) |
| The next runtime task | Recommended, not started: an attribution probe of the layout after a row animation ends at 2,000 items (assessment §4). If it finds nothing the library controls, the runtime pass is ready to close |

**Next:** the owner decides whether the attribution probe runs. The deferred instrument campaigns stay stopped.

## Disposition of the animation-end layout probe

The [probe](animation-end-layout-probe.md), run by the architect on 2026-11-12 at `bb8e5ebb8` under the owner's hold, in one Chromium process, with no production or instrument change.

| Item | Disposition |
| --- | --- |
| What triggers the layout after a row animation ends | **In the tested Chromium scenario and variants** (probe §1 and §2): a row that started or stopped an animated or styled `translate`, `transform` or `opacity` had its layout invalidated. The end's invalidation carries no script stack. The layout lasts 585 to 1,923 µs at 2,000 rows and 121 to 216 µs at 20, and dirties 5 objects in both. The control and every keyframe form lay out the same way. A row whose own style already holds `will-change: translate` or `translate: 0 0` doesn't lay out |
| The assessment's hypothesis (§4.2 there) | Corrected. The `opacity` control lays out too, so the trigger isn't specific to `translate` |
| A library-controlled alternative | None of the forms considered keeps the rendered result and the cleanup in the tested scenario. Holding every row until no row animates would reduce the count, but it extends each row's stacking context and keeps finished animations or inline style, so it is rejected (probe §3) |
| The runtime pass | **Closed by the owner on 2026-11-12**, on the architect's recommendation. The layout is listed as the browser's cost in the tested scenario and variants. P4 and `DRO-4`'s size re-base follow when the owner chooses |
| A README note on long lists | Left to the owner, as a documentation decision that needs its own measurement of the layer cost |

**Corrected on 2026-11-12,** on the owner's request: the first row said that any element that starts or stops such an animation or style has its layout invalidated, the third said that no alternative keeps the rendered result and the cleanup, and the fourth listed the layout as the browser's cost of any displacement animation. The probe tested one scenario in one engine, and the rows now say so. The probe record's wording is corrected the same way.

**Next:** the owner inspects the code before a pull request is prepared and the phase closes. The deferred instrument campaigns stay stopped, and no budget changes.

## Disposition of the size pass unit report

The [report](size-pass-unit-report.md) at `ed4bd589f`, read by the architect on 2026-11-12 in [`size-pass-unit-assessment.md`](size-pass-unit-assessment.md).

| Item | Disposition |
| --- | --- |
| Items 1, 2 and 5: the base, `DRD-53`'s completion and the size readings | Accepted. Every row equals the joint reading |
| Item 3, U1 | Accepted. Its lint finding is repaired by `DRD-51`'s amendment of §First unit item 2 (assessment §3) |
| Item 4, `DRD-52` with the witness and M1 | Accepted |
| Item 6, allocation | Accepted as "stands", with the spreads and the consistent cold excess recorded under `DRD-52` property 9 |
| Item 6's blind launch of `xy()` after `y()` | The documentation allowed it. The next unit corrects it (assessment §4) |
| Item 7, timing | Accepted as "holds". **The hold record is corrected in the report:** four of the session's background tasks overlapped the moves process's first four seconds (assessment §2.2) |
| Item 8, the suites and the check's throw sites | Accepted |
| The `faults` test that failed once at the handoff | It passed in this unit's Chromium run. Nothing is owed unless it fails again |

**Next:** [`size-pass-followup-handoff.md`](size-pass-followup-handoff.md), one implementer unit. The deferred measurement campaigns stay stopped, and `bench/campaign.ts` stays the tool for sequencing runs (`DRD-51` property 3, as amended).

## Disposition of the size pass follow-up report

The [report](size-pass-followup-report.md) at `fe529df4c`, read by the architect on 2026-11-12. The unit's commits are `e22db849c`, the source, and `0c13786ea`, the probe's documentation. The unit is small, so the architect's checks are recorded here and not in a separate assessment.

| What the architect checked | Result |
| --- | --- |
| `git diff --stat d5ab84a83 fe529df4c -- packages/drag` | `src/free-drag.ts`, `src/free-drag/behavior.ts`, the four probe files, the report and `measurements/`. All inside the handoff's §Boundaries |
| `e22db849c`'s source diff against [R1](probes/size-pass/patches/R1-invalidate-step-as-behavior-module-function.diff.txt) | The added and removed lines equal the patch's |
| The [size delta](measurements/2026-11-12-followup-commit1-sizes.txt) | Equal to the report's table: −13/−7/−1 and −13/−5/−5 on the two `freeDrag` rows, and 0/0/0 on the eight control rows |
| [`measure.ts`](measurements/2026-11-12-followup-measure.txt) at `e22db849c` | "freeDrag" 5,022 B Brotli, 55 B over. "freeDrag + bounds + landing" 5,454 B, 244 B over. The four green rows as at the base |
| The [witness](measurements/2026-11-12-followup-witness.txt) and [M2](measurements/2026-11-12-followup-m2.txt) | Passes in three engines. Fails in Chromium under M2 with "expected 300 to be close to 200", and the restore is identical under `cmp` |
| The [suites](measurements/2026-11-12-followup-suites/) | Chromium: 420 tests, 414 passed, and the 6 failures are `size.node.test.ts`'s ceiling rows. Three engines: 1,071 passed, 18 skipped. Hot path: 9 of 9 |
| Item 3's [launches](measurements/2026-11-12-followup-c6-probes/) | Each ran 1 test and skipped 12, with one probe line whose functions are under `sortable/`. Both move lines count `moves=200` |
| `warm-move-probe.test.ts.txt` against `move-probe.test.ts.txt` | The four differences that the report lists, and a fifth: the header comment, which the handoff asked for |

| Item | Disposition |
| --- | --- |
| Item 1, the base | Accepted |
| Item 2, the `invalidate` step | Accepted. `DRD-51`'s amended §First unit item 2 holds, and the unit report's lint finding is closed |
| Item 3, the probe's launch documentation | Accepted. The report says that the warm probe differs "in exactly four places". The header comment is a fifth difference, which the handoff required. Nothing is owed |
| Item 3's readings | Observations, not gated, as the handoff states |

**The owner's decisions, recorded with this disposition on 2026-11-12:**

- **`DRO-14` items 3 and 4 are rejected.** C1's idle fast path and C5's capture functions stay unchanged. `DRF-20` closes.
- **`DRO-15`: steps 1 and 2 start,** each as its own unit. Source tests stay for internal behavior and development instruments. The mangle waits for the published build's results. `DRD-54` decides step 1.
- Budgets are unchanged, and the deferred campaigns stay stopped.

**Next:** [`consumer-tests-handoff.md`](consumer-tests-handoff.md), one implementer unit, `DRO-15` step 1.

## Disposition of the consumer tests report

The [report](consumer-tests-report.md) at `87288b9d2`, read by the architect on 2026-11-13 in [`consumer-tests-assessment.md`](consumer-tests-assessment.md). The unit's code commit is `5ea7bb7e6`.

| Item | Disposition |
| --- | --- |
| Item 1, the base | Accepted |
| Item 2, the source-only tests | Accepted, with the sink receiver test added to the handoff's list (assessment §1) |
| Item 3, the consumer project | Accepted, with one gap. Properties 1 and 3 to 6 hold. Property 2 holds for relative specifiers only: `DRF-23` (assessment §2) |
| W1 | Holds for the form the handoff named. It doesn't discriminate the gap, and that is the handoff's omission |
| W2, W3 | Accepted. W3's first attempt is discarded correctly, because `tsdown` ignores a missing `--config` path |
| The note on the clean | Correct, and about the emitted `sortable/`. The clean doesn't target `src/sortable/` or any other path under `src/` (assessment §3) |

**The owner's direction, 2026-11-13:**

- route `DRF-23`'s repair and a discriminating witness with the next unit, keeping the rule that non-public source imports are rejected;
- decide `DRO-15` step 2;
- record the clean-path clarification in the assessment;
- keep budgets unchanged and the mangle pending.

**Recorded:**

- `DRF-23`;
- `DRD-54` property 2, as amended;
- `DRD-55`, the gate on the published build;
- `DRD-51` properties 1 and 3, as amended.

**Next:** [`published-gate-handoff.md`](published-gate-handoff.md), one implementer unit. Part A repairs `DRF-23`, and part B implements `DRD-55`.

## Disposition of the published gate report

The [report](published-gate-report.md) at `2d9a2f482`, read by the architect on 2026-11-13 at `3b8f2d788`, whose only change after the report is the owner's direction in [`performance-plan.md`](performance-plan.md). The unit's code commits are `79b4c3132` (part A) and `69c260685` (part B). The architect's checks are recorded here, and not in a separate assessment.

| What the architect checked | Result |
| --- | --- |
| `git diff --stat 7154dd4c3 2d9a2f482 -- packages/drag .scripts` | `.scripts/vitest-config.ts`, `packages/drag/vitest.config.ts`, three `tests/support/` files, `bench/size/measure.ts`, `tests/size.node.test.ts`, the report and `measurements/`. All inside the handoff's §Boundaries |
| `tests/support/published-entries.ts` and the configuration diff | Read in full. Every specifier is resolved first, and the file it reaches under `src/` decides. A missing emitted entry is the plugin's error instead of a fallback to `src` |
| The build sharing in `build-package.node.ts` | One promise per process, under a `Symbol.for` key, awaited by every project's global setup |
| `measure.ts` and the expected list | Only the three `src/` fragments and the seven paths changed. The rows, ceilings, controls and bundling settings are as before. gzip-9 is printed and not gated |
| [`gate-end-size`](measurements/2026-11-13-gate-runs/gate-end-size/) and [`gate-base-size`](measurements/2026-11-13-gate-runs/gate-base-size/) | Equal to the report's table on every row. Steps 2 and 3 of the end reading are identical |
| The final suite, the three-engine run and the consumer run after the repair | 746 tests with 740 passed, 1,071 passed with 18 skipped, and 326 of 326, as reported |

| Item | Disposition |
| --- | --- |
| Item 1, the base | Accepted |
| Part A, items 2 to 4 | Accepted. The witness discriminates: F2, F3, F4, F5 and F6b loaded the source at the old resolver, and every form fails at the repair. `DRF-23` is closed |
| Part B, items 5 and 6 | Accepted. `DRD-55` properties 1 to 5 hold |
| Item 7, G1 to G5 | Accepted. The first G1 runs, which joined the `sourceMappingURL` comment, are rightly discarded |
| The size table | Accepted. No verdict changes. gzip-9 and Brotli-11 disagree in sign on "sortable + y" and "complete", as recorded |

**The report's notes:**

- **`.scripts/vitest-config.ts` imports drag's rule from `tests/support/`.** Accepted: the handoff placed the shared rule there, and the rule belongs to the package it resolves.
- **One fixture's non-entry import fails the whole size file.** Accepted. The file stops with an error that names the module, and that is the purpose of G4.
- **The first run of a new consumer configuration** can reload the page while the dependency optimizer fills its cache. Accepted as an environment fact. A witness repeats a run that this disturbs, as the unit did.
- **`npx just test-engines` needs `~/.cache/ms-playwright/webkit-env.sh` in this container.** An environment fact, recorded here. The recipe doesn't change.
- **The architect's note:** the build's promise lives for the process. In watch mode, a rerun therefore reads the first build, as reruns did before this unit. `vitest run` is unaffected.

**The owner's decision, 2026-11-13** (`DRO-15`):

- step 3 uses explicit `_` prefixes in source for strictly internal properties, followed by publish-time mangling;
- public and platform names are unchanged;
- the mangled set isn't inferred from types, and the type-directed transform is deferred ([`performance-plan.md`](performance-plan.md) §6);
- budgets are unchanged.

**Recorded:** `DRD-55`'s result, and `DRD-56`. **Next:** [`publish-mangle-handoff.md`](publish-mangle-handoff.md), one implementer unit.

## Disposition of the publish mangle report

The [report](publish-mangle-report.md) at `78797ebf6`, read by the architect on 2026-11-13 in [`publish-mangle-assessment.md`](publish-mangle-assessment.md). The unit's code commits are `f7b7b300b` (A) and `31f92f5a9` (B). The report's runs weren't repeated. The assessment's §1 lists what the architect checked.

| Item | Result |
| --- | --- |
| Items 1 to 8 | Accepted. No return condition was met |
| The V4 exception for `readonly` fields | Recorded in `DRD-56` property 6 as a bounded correction (assessment §3) |
| `Gesture`'s members under property 1 | The report's reading is the decision's. Property 1's wording is corrected (assessment §4) |
| `.plan/probes/callback-list/allocation.ts` | Accepted. `DRD-56` property 3 requires the line, and the handoff's §Boundaries omitted the path (assessment §5) |
| M2's aborted consumer run | Holds as required, and isn't rerun. The mismatched publication that M2 builds can't come from the build, because V1 rejects it in the same run (assessment §6) |
| `classVarCleanupPlugin` | Confirmed inert in drag's build. A repository-level observation, not registered here, and the owner's to open (assessment §8) |

**Recorded:**

- `DRD-56`'s result, and its corrections to properties 1 and 6;
- `DRO-15`'s measured gain;
- the changed verdicts under `DRO-4`, with no budget change.

**Next:** the owner decides whether to start a fresh independent review of the publication pipeline and its validation. Assessment §9 gives the recommended scope: a `consolidator` round with `reviewer`, `integrity`, and `cleanup` limited to `build/` and the publication test. The type-directed transform stays deferred.

## Disposition of the publish mangle review

The [summary](reviews/publish-mangle/publish-mangle-summary.md) at `6e8174f64`, of the tree at `436b105c6`, with no tier A finding. The architect's first reading, [`mangle-remediation-assessment.md`](mangle-remediation-assessment.md) at `be151f9ed`, proposed a remediation of the custom pipeline and was never integrated. On the owner's requirements of 2026-11-13, `DRD-59` replaces that pipeline, and the remediation is withdrawn before implementation ([proposal](publication-build-proposal.md) §4).

| Findings | Under `DRD-59` |
| --- | --- |
| `DRF-24`, `DRF-25` | Withdrawn with the requirement they test. The new V3 checks renamed positions |
| `DRF-26`, `DRF-33` to `DRF-37` | Moot: the machinery they concern goes |
| `DRF-27`, `DRF-28`, `DRF-29` | Decided in `DRD-59` properties 3 and 7. The unit implements them |
| `DRF-30`, `DRF-31` | Decided in `DRD-59`'s corrections and property 8 |
| `DRF-32` | The map workflow goes. A CONTRIBUTING statement of the marker is the owner's proposal S3 |

**Next:** [`publication-build-handoff.md`](publication-build-handoff.md). The findings close when the architect accepts its report.

## Findings

Findings for scope `drag`, under `DRD-23`'s first bullet. High-water mark: **`DRF-37`**.

#### DRF-1 — `compare.ts`'s bytes rule selects the kernel by function name

Tier B, **closed at `ab14380c1`**, read by the architect on 2026-11-11 at `c279973a3` (§Disposition of the performance instrument report). Found by the architect while reading `compare.ts` at `ff69cb8d7`.

**Closure:** the unit's `--prove` at its last code ([`2026-11-10-performance-prove.txt`](measurements/2026-11-10-performance-prove.txt)) exits 0. The four-number array in `Gesture.enter` flags at 96 to 106 B per move under `kernel/gesture.ts:enter`, "1 KB allocated per move" flags under `kernel/session.ts:#move`, and the quiet witness of `DRD-41` stays quiet and is counted. N3 showed that the same array in `sortable/operation.ts:move` doesn't flag.

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

Tier B, **closed at `f50f4a35a`**, read by the architect on 2026-11-10 at `b8f1d1b35` (§Disposition of the performance instrument return). Found by the combined review at `b01a0283d` (`integrity-1`). Recorded as not run in [`instrument-repair-report.md`](instrument-repair-report.md) §Not run, item 2. The combined review's handover, [`callback-list-completion-assessment.md`](callback-list-completion-assessment.md) §6, says the instrument repair is done.

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

Tier C, **closed on 2026-11-12** by `312f4ec32`, `DRD-51`'s first unit ([assessment](size-pass-unit-assessment.md)). Found by the combined review at `b01a0283d` (`cleanup-2`). Noted earlier in [`operation-lifetime-assessment.md`](operation-lifetime-assessment.md) item 8.

- **Current behavior:** `AxisQuery.insertion` is `Insertion | null`. `SortableOperation` holds it as `SetNonNullable`, `y.ts` and `xy.ts` test it for `null`, and both assert it with `!`.
- **Why it is a problem:** branches and a type-level narrowing serve a state that correct use can't reach. The axis types aren't published.
- **Evidence:** `src/sortable/axis.ts:38`, `operation.ts:49`, `y.ts:42` and `:76`, `xy.ts:48` and `:85`.
- **Required property:** the committed gap's type says whether it can be absent, and the producer and the consumers agree.
- **When:** optional, with no merge condition ([`combined-review-assessment.md`](combined-review-assessment.md) §4). A later unit that changes the axis rules may take it.
- **2026-11-12:** `DRD-51`'s recommended first unit repairs it, with the two `gap < 0` branches in `linear-shift.ts` that it makes unreachable: −17 B Brotli on "sortable + y" and "complete" as a joint reading with `DRF-14` ([assessment](size-pass-assessment.md) §5).

#### DRF-14 — `freeDrag`'s invalidation calls `handleEvent()` with no event and invalidates the bounds twice

Tier C, **closed on 2026-11-12** by `312f4ec32`, `DRD-51`'s first unit ([assessment](size-pass-unit-assessment.md)). The step that change left reading no `this` becomes a module function under `DRD-51`'s amendment of §First unit item 2. Found by the combined review at `b01a0283d` (`cleanup-3`).

- **Current behavior:** `FreeDragBehavior.invalidate` calls `this.bounds?.invalidate()` and then `operation?.handleEvent()`, which invalidates the bounds again and the tracker.
- **Why it is a problem:** the stale-marking entry carries the DOM listener's name where it is called as a method, and one of the two bounds calls is redundant. Idempotent: no behavior changes.
- **Evidence:** `src/free-drag/behavior.ts:76-79`, `src/free-drag/operation.ts:52-55`.
- **Required property:** each cache is marked stale once per invalidation, and the entry is named for what it does where it is called outside a listener.
- **When:** optional, with no merge condition ([`combined-review-assessment.md`](combined-review-assessment.md) §4).
- **Amended on 2026-11-12 by `DRD-51`:** the naming half of the required property is withdrawn. The listener is the operation object, so its entry must be `handleEvent`. The required property is now that each cache is marked stale once per invalidation. `DRD-51`'s recommended first unit repairs it.

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

#### DRF-20 — `DRD-32`'s reason for keeping an idle step off the step list no longer holds

Tier C, **closed on 2026-11-12:** the owner kept the branch (`DRO-14` item 3). Found by the architect on 2026-11-10, reading the instrument unit's return at `b8f1d1b35`.

- **Current behavior:** `Gesture.requestStep` on an idle controller passes the step to `enter` as the first step of its own pass, so that the list stays empty. `DRD-32` decided this because "through the list it allocated on every sample" (G4). `DRD-35` property 3 restates the rule.
- **Why it is a question:** since `DRD-35` and `DRD-36` the list keeps its entries in one reused array. The step-list injection sends every idle step through the list, and the bytes row doesn't flag it (`DRD-41`). The rule's stated reason no longer supports it. `DRD-32`'s mutation "an idle step through the list" was shown to fail before `DRD-35`, and hasn't run since. Whether any test fails on it now isn't known.
- **Not a defect.** The branch is correct, and `DRD-32` and `DRD-35` stand.
- **Evidence:** `src/kernel/gesture.ts`, `requestStep`, and the comment "The list stays empty, so an idle request allocates nothing". [`execution-boundary-assessment.md`](execution-boundary-assessment.md) §5, v1. [`n3-prove.json`](measurements/2026-11-10-performance-n3-prove.json), the step-list injection.
- **Required property:** none yet. Whether the branch earns its place is a question for the size pass ([`performance-plan.md`](performance-plan.md) §2 P4), with a reading of the frame path's timing. Removing it would change `DRD-32` and `DRD-35`, so it is a decision first.
- **When:** not before the size pass.
- **2026-11-12, in the size pass:** the removal measured −5 to −15 B Brotli on every row, and it adds work to each idle request, which frame tasks make up to once per frame ([assessment](size-pass-assessment.md) §5, C1). `DRO-14` item 3 puts it to the owner, and the architect recommends keeping the branch. It closes if the owner keeps it.
- **Closed on 2026-11-12.** The owner kept C1's idle fast path. The branch's reason is now the work it saves per idle request (§0), not an allocation. Its comment's claim that an idle request allocates nothing still holds, so no source changes. `DRD-32` and `DRD-35` property 3 stand.

#### DRF-21 — `compare.ts` places a bundle line in a module by comment markers, and two modules have none

Tier B, open. Reported by the trace unit at `e92e21eed`, and verified by the architect on 2026-11-11 ([assessment](performance-trace-assessment.md) §5).

- **Current behavior:** `bundle` records a module's start at each `// <path>` line rolldown writes, and `moduleAt` keys a line by the last start before it. In the arm built from `566ebfc65`, rolldown writes no marker for `sortable/rect-index.ts` or `sortable/keyboard.ts`. `RectIndex`, at line 1540 of [`bundle.js.txt`](measurements/traces/2026-11-11/bundle.js.txt), is keyed under `shared/landing.ts`, and `directionOf` and `keyboardInsertion` under `sortable/collection.ts`.
- **Who uses it:** only `samplingProfile`, which keys the bytes rows. `--profile` keys by function name and line. The trace mode copies the markers into `record.json`, and the trace analysis placed positions through a source map instead, which it checked.
- **What it affects:** no verdict. Every kernel key in the recorded bytes readings names a function of that kernel module, and the kernel modules without a marker have no runtime code, so `DRF-1`'s closure, `DRD-41`'s witness and every bytes verdict hold. Nine recorded readings key `RectIndex`'s methods as `shared/landing.ts:`. No report or decision drew a conclusion from those labels, and the readings stay as written.
- **Why it is a problem:** the kernel selection holds only while no unmarked module's code falls after a kernel module's marker. Nothing checks that, and a bundler change or a new module can break it with no error.
- **Required property:** every line of the lab bundle is placed in the module that holds its source, from the bundle's own mapping, such as a source map or the bundler's module data, and not from comment lines. A line the mapping can't place ends the run with an error. Under `DRD-23`'s last bullet, an allocation injected into `sortable/rect-index.ts` keys under that module, and every bytes injection still flags.
- **When:** before the next bytes reading that a report or decision uses. `DRD-47`'s unit runs no bytes row, so it doesn't wait for this.

#### DRF-22 — The drop-target tracker resolves the drop against targets a pending scroll moved

Tier C, **closed at `71f20df20`** by `DRD-48`, decided on 2026-11-12 ([assessment](performance-drop-assessment.md) §4) and read on the same day ([assessment](free-drag-drop-assessment.md) §1). Found by the architect on 2026-11-11 while reading candidate 2 of the trace report ([assessment](performance-trace-assessment.md) §2).

- **Current behavior:** `dropTargets`' `drop()` cancels its frame and resolves against the cached rects, which are measured again only when stale (`free-drag/drop-targets.ts:121–124` at `566ebfc65`). Its `invalidate()` runs on `scroll` and `resize`.
- **Why it is a question:** a scroll after the browser's last rendering update reaches the tracker one update later, so a release in that window names the target under the release position before the scroll. `DRD-33` choice 7 calls the drop "always correct". `DRD-47` closes the same window for `sortable`.
- **Not a defect today.** `DRI-21` says the drop resolves "against geometry measured after any invalidation", and the tracker does that.
- **Required property:** none yet. A target list is usually short, so measuring every target at the drop may cost less than a confirmation. That is a decision, with its bytes.
- **When:** not before `DRD-47`'s unit reports.

#### DRF-23 — The consumer resolver lets a non-relative import of a non-entry module reach its source

Tier B, **closed at `79b4c3132`**, read by the architect on 2026-11-13 at `2d9a2f482` (§Disposition of the published gate report). Found and reproduced by the owner on 2026-11-13 at `87288b9d2`. Read by the architect on the same day ([assessment](consumer-tests-assessment.md) §2).

**Closure:** the resolver resolves every specifier first and decides by the file it reaches. At the old resolver, F2, F3, F4, F5 and F6b loaded `src/kernel/callbacks.ts`. At the repair, every form fails with an error that names it, and an entry imported by its absolute path gives the emitted module ([report](published-gate-report.md) §2).

- **Current behavior.** `resolvePublishedEntries` in `.scripts/vitest-config.ts` acts only on specifiers that start with `.`. It returns `null` for every other specifier, and Vite then resolves it as in the source projects. In the consumer project, `../src/kernel/callbacks.ts` is rejected, but the absolute filesystem path of the same file loads `src/kernel/callbacks.ts`.
- **The same test, read but not reproduced:**
  - also lets through a path from the Vite root, a `/@fs/` path and a `file:` URL;
  - rejects a relative specifier with a query for the wrong reason, and would reject an entry's source in that form instead of redirecting it.
- **Why it is a defect.** `DRD-54` property 2 requires every non-entry module under `src/` to be an error at resolution in the consumer project. The project exists to show what the build does, and a test that reached source through this gap would pass against `src` while appearing to test the build.
- **Not observed in the suite.** None of the 22 consumer files imports `src` by a non-relative path, so no committed verdict is affected.
- **Required property:** `DRD-54` property 2, as amended on 2026-11-13. The resolved file decides, every specifier form is covered, and no module under `src/` loads in the consumer project. Its witness must load the source module at `87288b9d2`'s resolver and fail at the repair.
- **When:** [`published-gate-handoff.md`](published-gate-handoff.md) part A, before part B, whose fixtures need the same rule.

#### DRF-24 — V4 checks the text at a renamed position's mapping, not the position that `DRD-56` property 6 requires

Tier B, open, **withdrawn by `DRD-59` with the requirement it tests**: V4 and the step go, and the new V3 checks renamed positions. Closes when `DRD-59`'s unit lands. Reported by the publish-mangle round at `436b105c6` as `reviewer-1` ([summary](reviews/publish-mangle/publish-mangle-summary.md), [report](reviews/publish-mangle/proof-reviewer.md)).

- **Current behavior:** `writes` accepts any mapping whose `src` text is `MODIFIERS`, then the key, and it applies that to every occurrence. An access mapped to its declaration's member start (`readonly _root`) passes, and the first form of V4 rejected it. An access mapped to another access of the same name, or a declaration mapped into another member, passes both forms.
- **Why it is a problem:** property 6 says "No other form passes: not … a position in another member", and assessment §3 says that applying the exception to every occurrence isn't weaker than the first form. Both describe a position bound that the test doesn't check.
- **Required property:** V4 rejects what property 6 rejects, or the record states the bound that V4 enforces.

#### DRF-25 — `DRD-56` property 6's mappings for kept tokens have no standing check

Tier B, open, **withdrawn by `DRD-59` with the requirement it tests**: no requirement fixes the mapping of a kept token. Closes when `DRD-59`'s unit lands. Reported by the publish-mangle round at `436b105c6` as `reviewer-2`.

- **Current behavior:** V4 inspects only occurrences of output names. Property 6 bullets 1 and 3, every map valid and every other token at its `src` position, were checked once, by the report's step check.
- **Why it is a problem:** a copy of the step that moved 3,737 of 6,902 mappings passed the build and all five tests.
- **Required property:** property 6 bullets 1 and 3 hold for every build the suite accepts, or the record states that they were a one-time acceptance.

#### DRF-26 — The step's map counts generated lines at LF only

Tier B, open, no instance at `436b105c6`, **moot under `DRD-59`**: the step that counts lines goes. Closes when `DRD-59`'s unit lands. Reported by the publish-mangle round as `reviewer-3`.

- **Current behavior:** `build/rename-properties.ts` starts a line only at `\n`. Rolldown keeps a raw U+2028 in a template literal and counts it as a line break, so every later mapping in that module moves. With no renamed name after the separator, every test passes (7 of 25 mappings moved in the probe).
- **Why it is a problem:** property 6 requires every token to keep its `src` position. `src` has no LS, PS or CR today.
- **Required property:** the step's map keeps every token's position for any module Rolldown can emit, including one with a raw LS or PS.

#### DRF-27 — The publication test resolves positions with lines split at LF only

Tier B, open, no instance at `436b105c6`, fails closed. **Decided by `DRD-59` property 7:** V3 splits `src` lines at every line terminator. Reported by the publish-mangle round as `reviewer-4`.

- **Current behavior:** `positionOf` and the `src` lookup split at `\n` (`tests/publication.node.test.ts:68`, `:70`, `:161`). Rolldown's original lines count CR, LS and PS.
- **Why it is a problem:** a correct source change, such as a CR or a pasted U+2028 in a comment, fails V4 on a correct publication.
- **Required property:** V3 and V4 resolve generated and original positions with the line rule that the maps use.

#### DRF-28 — A kept property written as a string key can share an output name and pass every check

Tier B, open, no instance at `436b105c6`. **Decided by `DRD-59` property 3:** `quoted: true`, and the build's check of each chunk's kept names, which Oxc lists. Reported by the publish-mangle round as `reviewer-5`.

- **Current behavior:** `readNames` doesn't count quoted or computed string keys as property names, and the generator's `kept` set and V3 both use it. With `{ "_size": "k" }`, a class with `_size` and `'k'` passes the name set and V1 to V4, and its result changes from 12 to 22.
- **Why it is a problem:** `DRD-56` property 4 requires that an output name equals no property name that stays. Property 1 doesn't forbid unprefixed string keys.
- **Required property:** no output name equals a property name that stays, however that name is written.

#### DRF-29 — V2 doesn't see prefixed member names written as strings in `.d.ts`

Tier B, open, no instance at `436b105c6`. **Decided by `DRD-59` property 7:** V2 rejects identifiers, string literals and template texts. Reported by the publish-mangle round as `reviewer-6`.

- **Current behavior:** V2 visits `Identifier` nodes only. A quoted key, a computed string key or a string-literal type that declares a prefixed member passes all five tests.
- **Why it is a problem:** the step would rename the uses, and the `.d.ts` would declare a member that doesn't exist at runtime. Property 1 requires every member that a `.d.ts` declares to keep its name.
- **Required property:** no emitted `.d.ts` declares a member under a prefixed name, in any syntax.

#### DRF-30 — `DRD-56`'s rationale says that V1 finds computed keys and enumerations

Tier B, open. **Decided by `DRD-59`'s corrections:** the record states what V1 finds. Closes when `DRD-59`'s unit lands. Reported by the publish-mangle round as `reviewer-7`.

- **Current behavior:** the rationale says string keys, computed keys and enumerations are forbidden, "and validation V1 finds them". V1 finds only prefixed property names and literal strings or template texts that start with the prefix. `o['_' + 'config']`, `JSON.parse('{"_config":1}')` and `Object.keys(o)` pass.
- **Why it is a problem:** a reader relies on V1 for forms that only code reading excludes.
- **Required property:** the record states what V1 detects, or V1 detects what the record says.

#### DRF-31 — A plain build or a publish enforces almost none of `DRD-56` property 7

Tier B, open. **Decided by `DRD-59` property 8:** what `just build` guarantees, what is publishable, and the obligation on a release change. Closes when `DRD-59`'s unit lands. Reported by the publish-mangle round as `reviewer-8`.

- **Current behavior:** `just build` fails only on an unmapped prefixed property name or a prefixed shorthand key. V1's string half, V2, V3, V4 and the name set hold only for a tree that a publication-test run read and passed. `package.json` has no `prepack` or `prepublishOnly` script, so a publish neither builds nor validates. A duplicate output name, a stale key and a prefixed `.d.ts` member all build cleanly.
- **Why it is a problem:** `DRD-56` places the step inside the build because "a separate step after the build could be skipped". The validation has no such placement.
- **Required property:** a tree that a publish can ship satisfies property 7, or the record states that only a tree that a passing test run read is publishable.

#### DRF-32 — The `_` marker and the map workflow are stated only in the record

Tier C, open. **Under `DRD-59`** the map workflow goes. A statement of the marker in CONTRIBUTING is the owner's proposal S3 ([proposal](publication-build-proposal.md) §7). Reported by the publish-mangle round as `integrity-1`.

- **Current behavior:** only `DRD-56` and `build/` name the marker, the map and `build/generate-property-names.ts`. The build's error for an unmapped name names the map, not the script. Regenerating after one new name moved 5 of the 29 existing assignments.
- **Why it is a problem:** a contributor learns the convention from the record or by reading `build/`, and the regeneration diff a person reviews (`DRD-56`, `DRD-57` property 4) is larger than the change.
- **Required property:** a current-state document or the failure itself tells a contributor that a `_` property is renamed, what is owed, and how the map is brought in line.

#### DRF-33 — `DRD-56` property 6 holds only while `classVarCleanupPlugin` is inert in drag's build

Tier C, open, **moot for drag under `DRD-59`**: no requirement depends on a token's exact mapping. The plugin's inertness is the owner's proposal S2. Closes when `DRD-59`'s unit lands. Reported by the publish-mangle round as `integrity-2`.

- **Current behavior:** with `experimental.nativeMagicString` on, the plugin rewrites `var X = class`, the chunk's own map points renamed tokens at statement starts, and V4 fails at 79 positions in 8 modules. Without the step the same token maps to the statement start with the plugin, and to the name without it.
- **Why it is a problem:** the precondition is stated nowhere, and assessment §8 prices enabling the option by size only. The failure is loud, but it isn't attributed to the plugin.
- **Required property:** the condition under which property 6 holds is stated where a change to it is read, or checked where it fails with its cause.

#### DRF-34 — Comments in emitted modules name members by their source names

Tier C, open, **moot under `DRD-59`**: a minified module keeps only legal comments and annotations. Closes when `DRD-59`'s unit lands. Reported by the publish-mangle round as `integrity-3`.

- **Current behavior:** twelve comment lines in six emitted modules name renamed members, for example `_run` in `kernel/callbacks.js:11-12`, beside the method `t` at line 46. Property 5 keeps every comment.
- **Why it is a problem:** within one published file, the comment and the code disagree.
- **Required property:** a published comment that names a renamed member doesn't mislead, or the decision records that it may.

#### DRF-35 — The reserved-word list and the identifier rule are written in the generator and in the test

Tier C, open, **moot under `DRD-59`**: the generator and its rules go. Closes when `DRD-59`'s unit lands. Reported by the publish-mangle round as `cleanup-1`.

- **Current behavior:** `RESERVED` is defined in `build/generate-property-names.ts` and in `tests/publication.node.test.ts`, and the identifier rule is `FIRST`/`REST` in one and `IDENTIFIER_NAME` in the other. Nothing says the second is a deliberate independent oracle.
- **Required property:** one definition, or the second states that it is deliberately independent.

#### DRF-36 — The test recomputes the prefixed names in `src` with the generator's own reader

Tier C, open, **moot under `DRD-59`**: the reader and the name-set test go. Closes when `DRD-59`'s unit lands. Reported by the publish-mangle round as `cleanup-2`.

- **Current behavior:** the name-set test walks `src` with the same `readNames` and `isPrefixed` as the generator, with its own copies of the directory walk. It catches a stale map, not a reader defect. `DRF-28` is a reader defect that neither sees.
- **Required property:** one owner of "the prefixed property names in `src`", or the test states what it checks that the generator can't.

#### DRF-37 — The generator's name sequence handles names of any length, and the map has only one-character names

Tier C, open, **moot under `DRD-59`**: Oxc assigns the output names. Closes when `DRD-59`'s unit lands. Reported by the publish-mangle round as `cleanup-3`.

- **Current behavior:** `candidates()` yields names of any length, and all 29 outputs are one character. Under `DRD-57` property 4 the map has 53 keys, `FIRST` has 53 characters, and `x` and `y` are kept, so the branch is reached on the next regeneration, untested.
- **Required property:** the sequence's extent is justified by the names it serves or by a stated bound. The note on `DRD-57` is the consolidator's, not the pass's.

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

**Baseline reading, 2026-11-11.** B1 and B2 compared `a9c323f6a`'s source with drag2 and the prototype, in two processes ([report](performance-instrument-report.md) §5, [assessment](performance-instrument-assessment.md) §5). A verdict that differs between them is noise at this resolution.

- **Slower in both runs:** script on "press and release below the threshold, 2000 items, `[...root.children]`" against drag2, by 385 and 472 µs per press, with A/A bounds of 357 and 430 µs. This is `DRO-1`'s cost: production pulls `items()` at a press and drag2 doesn't. In the profile the lab's `sortable.items`, which copies 2,000 children, has the most self time in production and in the prototype. Against the prototype, and with a cached array against either arm, no difference is shown.
- **Retains more in both runs:** 4,076 B against drag2 and 3,396 B against the prototype, after 200 operations and destruction, with the same figure in every round. It isn't attributed yet. [`performance-resolution-handoff.md`](performance-resolution-handoff.md) item 3 attributes it.
- **Faster in both runs:** script on "free drag, 300 moves" against drag2, by 15 and 21 µs per move, with bounds of 14 and 7 µs.
- **The per-cycle cost this entry asked for isn't resolved.** No cycle verdict flags in both runs. But no cycle row can show less than about 411 µs per cycle, about 20 % of its script (`DRD-43`), so `DRD-22`'s "probably 10 to 13 % slower" is neither confirmed nor refuted. The in-page cycle row of `DRD-43` compares only this package's arms. If you want this question answered, that row can take the before arms in a later unit, after its floor is known.

**No recommendation yet.** `DRO-1`'s default and recommendation stand for the press. The retained figure waits for its attribution, and the cycle cost for a row that can resolve it.

**Retained attribution, 2026-11-11** ([report](performance-resolution-report.md) §Item 3, [assessment](performance-resolution-assessment.md) §5). Production's excess is in V8's internal arrays, the snapshot class `array `: +4,064 B against both before arms. At 0 operations all three arms are equal. Production grows about 20.5 B per operation up to 200 operations, and not at all from 200 to 400, so the row's figure is a plateau of about 4 KB and not a retention that grows with every operation. **Not known:** the object that retains the arrays, and so whether they are the library's own structure or the engine's data for the library's code. Only the former is something a source change could remove. If you want that answered before you decide, one probe can read the retainer path of the new arrays from two snapshots in the same page. **No recommendation:** the source isn't known.

**The drop confirmation's bytes, accepted on 2026-11-12** ([report](performance-drop-report.md) §Item 6, [assessment](performance-drop-assessment.md) §3). The owner accepts `DRD-47`'s cost: +125 B Brotli on "sortable + y", +140 B on "sortable + xy" and +128 B on "complete", for about 1.9 to 2.4 ms less script per pointer drop at 2,000 items. No budget changes. At `bf9d1caed` five rows are red: "draggable alone", "example: drop zone", "freeDrag", "freeDrag + bounds + landing" and "complete", which is now 142 B over its 7,065 B ceiling. "example: resize handle" went under its ceiling at `566ebfc65` ([alias cleanup report](alias-cleanup-report.md)). The size re-base stays open.

**The free drag drop's bytes, accepted on 2026-11-12** ([report](free-drag-drop-report.md) §Item 5, [assessment](free-drag-drop-assessment.md) §1). The owner accepts `DRD-48`'s +5 B Brotli on "freeDrag" and "freeDrag + bounds + landing", now 69 B and 266 B over their ceilings. Both rows were already red. No budget changes, and the size re-base stays open.

**The window's bytes, accepted on 2026-11-12** ([report](performance-window-correction-report.md) §Item 6, [assessment](performance-window-correction-assessment.md) §3). The owner accepts `DRD-49`'s window as `DRD-50` left it, against `71f20df20`: +143 B Brotli on "sortable + y", +36 B on "sortable + xy" and +149 B on "complete", for about 2.3 to 2.5 ms less script per drag at 2,000 items. "sortable + y" has 12 B left under its ceiling and "sortable + xy" 15 B. "complete" is 291 B over its 7,065 B ceiling, up from 142 B. No budget changes. The five red rows are the same as at `bf9d1caed`, and the size re-base stays open.

**The publish mangle's verdicts, 2026-11-13** ([report](publish-mangle-report.md) §8, [assessment](publish-mangle-assessment.md) §7). `DRD-56` shortens the internal property names in the published build. The gate on that build reads −31 to −66 B Brotli on the rows without `sortable`, and −102 to −110 B on the three rows with it, against `c42c5b084`. **Two verdicts changed:** "example: resize handle" went from 8 B over to 43 B under its 3,313 B ceiling, and "freeDrag" went from 59 B over to 7 B under its 4,967 B ceiling. **Four rows stay red:** "draggable alone", 23 B over, with its control moved by 138 B; "example: drop zone", 137 B over; "freeDrag + bounds + landing", 209 B over; and "complete", 108 B over. This is a saving, so there is no cost to accept. No ceiling or control changes, and the size re-base stays open.

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

#### DRO-14 — The size pass's trade-offs

**Answered on 2026-11-12: item 1 is rejected (`DRD-53`), item 2 is approved as `DRD-52`, and items 3 and 4 are rejected. C1's idle fast path and C5's capture functions stay unchanged.** Each item was measured on `0a28f909a` ([assessment](size-pass-assessment.md) §5, [patches](probes/size-pass/README.md)). Brotli-11 figures, against that commit. Answering an item re-bases nothing, and `DRO-4` keeps the re-base.

1. **C2, `CallbackList`'s factories.** Without `queue()`, `stack()` and the private constructor, the three call sites pass `'unshift'` or `'push'` to the constructor. −12 to −25 B on every row, −62 B minified. Runtime: one construction per controller and per operation, the same as now. **Cost:** `DRD-36`, decided on your direction, names the factories and the private constructor, and the list's kind is then named by its array method at each call site. **Recommendation: take it.** It is the only kernel saving with no runtime cost. A unit would amend `DRD-36` properties 1 and 4. **Rejected by the owner on 2026-11-12.** The named factories stay, as module functions in `kernel/callbacks.ts` that the owner committed at `1d304128b` (`DRD-53`).
2. **C6, `RectIndex`'s ownership and `y()`'s geometry work** ([proposal](rect-index-ownership-proposal.md), [patches](probes/rect-index-ownership/README.md), measured against `c0d6b9205`). **Proposed:**
   - `RectIndex` holds no axis policy, and its placeholder re-read becomes one shared `measurePlaceholder`.
   - `xy()`'s rebuild moves into `xy.ts`.
   - `y()`'s prediction moves into `linear-shift.ts`. It writes the slot buffer only through `lend(lo, hi, write)`: during the call only, and only inside the range, as `measure` already lends the buffer to the sink.

   −46 B on "sortable + y", −57 B on "sortable + xy" and −43 B on "complete". Over your staged `Callbacks` edit: −51, −54 and −47 B. **Cost:**
   - `RectIndex` is no longer the only writer of its slot buffer.
   - Per sample: no change.
   - Per committed move: one more call, and about 7 B more allocated in code that isn't warm.
   - The development check no longer reports a placeholder that moves along x, which `y()` never reads.

   **Recommendation: take the proposal,** and approve its runtime under §14. Its unit also runs `compare.ts` (`DRD-51` property 4). The alternative that lends nothing is the proposal's variant D: the same on "sortable + y", 9 B smaller on "complete", and 39 B larger on "sortable + xy". **Revised on 2026-11-12 at the owner's request:** this item used to recommend C6 as patched in the size pass. That patch had `linear-shift.ts` write both buffers through a cast of the read-only getters, under a required property that only those two modules write them. That form stated no lifetime for a buffer that `collect` replaces. **Approved by the owner on 2026-11-12, with two conditions:** the development check keeps the placeholder's x, and the 7 B per committed move is provisional until it is read after warm-up with the timing comparison. Decided as `DRD-52`.

3. **C1, `DRF-20`.** An idle `requestStep` goes through the step list. −5 to −15 B on every row, −45 B minified. **Cost:** `sortable`'s and `dropTargets`' frame tasks request a step from `requestAnimationFrame`, up to once per frame. Each such request then also scans the empty list, inserts, takes a turn of the reader and removes the entry. It amends `DRD-32` and `DRD-35` property 3. **Recommendation: keep the branch.** By §0 the per-frame work wins over a few bytes. If you keep it, `DRF-20` closes: the branch's reason is now that it does less work per idle request, and its comment's claim that nothing is allocated still holds. **Rejected by the owner on 2026-11-12.** The branch stays, and `DRF-20` is closed.
4. **C5, the lift's capture functions inlined.** −7 to −22 B on the lifted rows, **+2 B on "complete"**, −76 to −80 B minified, and two closures fewer per grab. **Cost:** two named single-purpose boundaries in `lift.ts` go (§2.1, §17), and on the largest row Brotli goes the wrong way. **Recommendation: don't take it.** **Rejected by the owner on 2026-11-12.** The capture functions stay unchanged.

#### DRO-15 — A publish-time mangle of the library's internal property names

**Answered on 2026-11-13. Raised on 2026-11-12 by the architect** from [`property-mangling-exploration.md`](property-mangling-exploration.md). The owner decides whether the package's build shortens its internal property names, and in what order the work runs.

**Answered in part on 2026-11-12.** The owner started option 1's first two steps, each as its own unit: consumer tests against the real `tsdown` output, then the size gate on that output. Source tests stay for internal behavior and development instruments. **Whether the build mangles names, and with which tier, waits for the published build's results.** `DRD-54` decides step 1, and [`consumer-tests-handoff.md`](consumer-tests-handoff.md) implements it. Budgets are unchanged.

**2026-11-13:**

- **Step 1 landed** at `5ea7bb7e6` and was accepted, with the guard gap `DRF-23` ([assessment](consumer-tests-assessment.md)).
- **Step 2 is decided as `DRD-55`:** the gate reads the published build, with every ceiling unchanged.
- [`published-gate-handoff.md`](published-gate-handoff.md) repairs `DRF-23`, then implements `DRD-55`. Its per-row figures, from `src` and from the build, are the results that step 3 waits for.
- The mangle stays pending.

**Answered on 2026-11-13.**

- **Step 2 landed** at `69c260685`, and `DRF-23` closed at `79b4c3132`. The figures from `src` and from the build differ by −7 to +16 B Brotli, and no verdict changed (§Disposition of the published gate report).
- **Step 3: the owner chose explicit `_` prefixes** in source for strictly internal properties, followed by publish-time mangling. Public and platform names stay unchanged, and the mangled set isn't inferred from types.
- **The type-directed transform**, which would prefix chosen types' properties in the build, is deferred ([`performance-plan.md`](performance-plan.md) §6).
- **Budgets are unchanged.**
- **Recorded and handed off:** `DRD-56` decides step 3, and [`publish-mangle-handoff.md`](publish-mangle-handoff.md) implements it. Option 2, the installer types' names, isn't taken.

**Step 3 landed on 2026-11-13** at `f7b7b300b` and `31f92f5a9`, and was accepted ([assessment](publish-mangle-assessment.md)). **The measured gain,** read by the gate on the published build against `c42c5b084`, Brotli-11: −31 to −66 B on the seven rows without `sortable`, and −102 to −110 B on "sortable + y", "sortable + xy" and "complete". That is −221 to −599 B minified. "example: resize handle" and "freeDrag" turn green, as the exploration estimated, and both go to `DRO-4`. Budgets are unchanged. The type-directed transform stays deferred.

**The selection was extended on 2026-11-13** by `DRD-57`, on the owner's request: 30 internal declarations whose names a platform member or a published member also uses. The installer members stay out, and budgets are unchanged.

**The mechanism changed on 2026-11-13 by `DRD-59`,** on the owner's requirements for the publication. The JavaScript is fully minified. Oxc's own `mangleProps` renames the same selection through a map that each build computes, and the custom renamer and the committed map go. The owner withdrew the requirement to keep the previous JavaScript text and source map segments. Budgets are unchanged.

**What was found.** About 950 B of a 28,664 B minified bundle of every entry are internal property names, which no minifier shortens, because they aren't `#private`: such as `config`, `enter`, `raise`, `first`, `collect` and `measurePlaceholder`. Rolldown can shorten them by name, with names the type checker finds eligible. A consumer's bundler doesn't, so the package's own build would have to.

**Measured** at `b0287f1ae`, Brotli-11, the build emulated with Rolldown and the rows bundled from it as a consumer would:

- −30 to −66 B on the rows without `sortable`, and −103 to −119 B on "sortable + y", "sortable + xy" and "complete";
- "freeDrag" (−66 B, 56 B over now) and "example: resize handle" (−54 B, 8 B over) would fall below their ceilings. No other red row would;
- no runtime work: a shorter name is the same property access.

**Costs and risks:**

- **Nothing checks the published build today.** The tests and the gate read `src`. The bundled rows from the unmangled build already differ from the gate's figures by −7 to +16 B.
- **Type analysis isn't enough.** It found `zIndex` eligible, a key of a keyframe object passed to `animate()`. Mangled, four landing tests failed. The suite against the built tree found it.
- **The published modules get harder to read,** and so do stack traces through internal methods.

**Options:**

1. **Take the internal names, in three units** (the architect's recommendation): the suite against the published build; then the gate on the published build, an instrument change under `DRD-23`; then the publish step, with the eligible names computed by the type checker, pinned by a test, and their cache committed.
2. Also take the names reachable only through `DRD-39`'s unpublished installer types: 34 to 37 B more on the `sortable` rows. **Not recommended:** it makes those types' member names a build detail, and it takes less off six of the seven other rows.
3. Take nothing, and keep the record.

**Recommendation: option 1.** Its first unit is worth having without the mangle, because nothing now runs the suite against what a consumer installs. Budgets don't change in the exploration, and `DRO-4` keeps the re-base, which option 1's second unit would move to the published build's figures.

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
| DRD-23 | active. Its last bullet, on instrument selection, was added on 2026-11-07. [`instrument-repair-handoff.md`](instrument-repair-handoff.md) applies it. `DRF-1` is open under it. The bullet's dry injection check for `compare.ts --prove` isn't implemented: `DRF-7` is open under it, and is deferred with `DRF-1`. On 2026-11-10 `DRD-40` scheduled both in [`performance-instrument-handoff.md`](performance-instrument-handoff.md). `DRF-7` closed at `f50f4a35a`. `DRF-1` closed at `ab14380c1`, read on 2026-11-11 after that unit's `--prove` passed. The last bullet is applied in full. `DRD-43`'s in-page rows are an instrument change under it |
| DRD-24 | active, adopted at `276947f82` under `DRO-6`. `DRD-26` removes `isCurrent` from its interface. `DRD-27` removes `takeLanding` and `keepLanding`, and the landing leaves the controller. `DRD-32` changes the gate's row, adds `apply`, and removes the three per-operation gate steps that `DRO-6` accepted. `DRD-34`: `draggable()` returns the `Gesture`, so the controller's interface for the session is reachable at runtime and named by no exported type. The session stays unreachable |
| DRD-25 | active, implemented at `2506dcbb6`. `DRD-31` supersedes its `items()` copy bullet |
| DRD-26 | active, implemented at `433a0e06c` ([`ownership-report.md`](ownership-report.md) item 2). `DRD-32` adds `apply` to the session's members on the controller |
| DRD-27 | active, revised on 2026-11-07 from the text at `6d5ba89e7`, implemented at `89995c27e` ([`ownership-report.md`](ownership-report.md) item 3). Amends `DRD-4`, `DRD-24` and the contract's DRI-9, DRI-10, DRI-13, DRI-17 and DRI-18. Its `type-fest` sentence was corrected on 2026-11-08. `DRD-29` amends its `lift.js` types and its "Only `translate` writes `translatedX` and `translatedY`". Under `DRD-30` the operation that `activate` returns keeps the `Lift`, instead of `drag.state`. `DRD-33` amends its row "The landing after release": the release disposer calls the recorded `Landing`'s `start`. On 2026-11-10 the contract's DRI-9 was corrected to its release bullet: two disposers, and the landing starts even when the release threw (`DRF-11`) |
| DRD-28 | active, implemented at `039e8e153` ([`ownership-report.md`](ownership-report.md) item 1). Its `type-fest` packaging line was corrected on 2026-11-08. `DRD-29` amends its `lift.js` row. `DRD-33` amends it again and adds `lift/landing.js` and `free-drag/drop-targets.js` |
| DRD-29 | active, decided on 2026-11-08 on the owner's clarifications. Implemented at `b33890461` ([`lift-representation-report.md`](lift-representation-report.md) item 3). Read by the architect at `d258573fa`: it conforms except `DRF-3`, whose required property was added to its `land` bullets on 2026-11-08. Amends `DRD-27`'s public types and lift properties and `DRD-28`'s `lift.js` row. `DRD-33` amends it: `land(x, y, landing)` requires a `Landing`, which replaces `LandingTiming`, the default timing leaves the lift, and the `DRF-3` bullet keeps the caller's `Landing` value |
| DRD-30 | active, decided on 2026-11-08 on the owner's proposal. Implemented at `da139407e` and `3a67df0ea` ([report](activation-result-report.md)). Read by the architect at `d99ebd304` ([assessment](activation-result-assessment.md)): conforms. Amended the same day: the behavior keeps no operation state, the operation may keep its behavior, and the type-argument rule. [`activation-result-assessment.md`](activation-result-assessment.md) §6 implements the amendment, with `DRF-4`. Amends `DRD-2`, `DRD-6`, `DRD-11`, `DRD-20`, `DRD-27`, and the contract's vocabulary, public surface, DRI-3, DRI-8, DRI-9 and DRI-18. Replaces [`operation-lifetime-assessment.md`](operation-lifetime-assessment.md) §2 |
| DRD-31 | active, decided on 2026-11-08 on the owner's direction, from [`items-copy-assessment.md`](items-copy-assessment.md). Supersedes `DRD-25`'s `items()` copy bullet and amends the contract's DRI-14. Implemented at `4ef33b96e`, after `a390dfa29` and `0e7e1c7ef`, from [`items-borrowing-handoff.md`](items-borrowing-handoff.md), and reported at `72f669ce1` ([report](items-borrowing-report.md)). When this row was written no review had read it. The combined review read it at `b01a0283d` (corrected on 2026-11-10) |
| DRD-32 | active, decided on 2026-11-08 on the owner's approval of v3, from [`execution-boundary-assessment.md`](execution-boundary-assessment.md), with its cost in `DRO-9`. Amends `DRD-1`, `DRD-24`, `DRD-26`, `DRO-6`'s accepted functions and the contract's DRI-6. Implemented at `a8327a7c8` from `8943f14e5`. Reported in [`execution-boundary-report.md`](execution-boundary-report.md), with every row inside `DRO-9`. When this row was written no review had read it. The combined review read it at `b01a0283d` (corrected on 2026-11-10). `DRD-34` merges the input gate and the request entry into one shared pass that receives internal work with its receiver, removes `InputHandler`, `apply()` and `#run`, makes `raise` a method, and withdraws the rejection of a receiver argument. `DRF-20`, open since 2026-11-10, says that its reason for keeping an idle step off the list no longer holds. The rule stands. `DRF-20` closed on 2026-11-12: the owner kept the idle branch (`DRO-14` item 3), whose reason is now the work it saves per idle request |
| DRD-33 | active, decided on 2026-11-09 on the owner's acceptance of the slot model, from [`feature-composition-assessment.md`](feature-composition-assessment.md), with the slot's charge in `DRO-10`. Amends `DRD-2` in place, `DRD-27`, `DRD-28`, `DRD-29`, and the contract's vocabulary, public surface, DRI-9, DRI-13, DRI-17, DRI-18 and DRI-20, and adds DRI-21. Repairs `DRF-5`. Implemented at `8626b04fd`, `59cc79e74`, `bfc2bfb0e` and `11950690f` from [`feature-composition-handoff.md`](feature-composition-handoff.md), and reported at `0bb03f3ea` ([report](feature-composition-report.md)). The `targets` slot's +78 B and +59 B are above `DRO-10`'s 45 B and wait for the owner. When this row was written no review had read it. The combined review read it at `b01a0283d` (corrected on 2026-11-10). `DRD-52` amends choice 9 |
| DRD-34 | active, decided on 2026-11-09 on the owner's direction, from the owner's uncommitted edit on `39af0ef44` ([`owner-edit.diff.txt`](probes/gesture-receiver/owner-edit.diff.txt)). Amends `DRD-20`, `DRD-24`, `DRD-32` and the contract's public surface. Implemented at `fd7ae3e43` from [`gesture-receiver-handoff.md`](gesture-receiver-handoff.md), reported at `03d1449e2` ([report](gesture-receiver-report.md)). Read by the architect at `03d1449e2` ([assessment](gesture-receiver-assessment.md)): conforms. Its costs are reported and not accepted. When this row was written no review had read it. The combined review read it at `b01a0283d` (corrected on 2026-11-10). `DRD-35` amends its properties 6, 8 and 9 and supersedes its exclusion of receiver support. `DRD-37` supersedes its property 9 |
| DRD-35 | active, decided on 2026-11-09 on the owner's direction, from the model at `9f885b9a9` and the owner's uncommitted edit on it ([`owner-edit.diff.txt`](probes/callback-list/owner-edit.diff.txt)), with its costs in `DRO-12`. Amends `DRD-16`, `DRD-34` and the contract's public surface, DRI-8, DRI-9 and DRI-10. Implemented at `53c87f988` from [`callback-list-handoff.md`](callback-list-handoff.md), reported at `f06a99c4f` ([report](callback-list-report.md)). The architect read the report at `2bec0c431` (§Disposition of the callback list report). `DRD-36` replaces its property 5's direction function, and `DRD-37` supersedes its property 8. Its costs are accepted under `DRO-12`. `DRD-53` renames property 5's file and class |
| DRD-36 | active, decided on 2026-11-09 on the owner's direction, from the owner's uncommitted edit on `2bec0c431` ([`insertion-edit.diff.txt`](probes/callback-list/insertion-edit.diff.txt)). Amends `DRD-35`, and `DRO-12`'s figures. Implemented at `50ed18a17` from [`callback-list-completion-handoff.md`](callback-list-completion-handoff.md), reported at `36dbd55db` ([report](callback-list-completion-report.md)). Read by the architect ([assessment](callback-list-completion-assessment.md)): conforms. Its costs are accepted under `DRO-12`. **Amended on 2026-11-12 by `DRD-53`:** module factories in `kernel/callbacks.ts`, and insertion through the stored array method |
| DRD-37 | active, decided on 2026-11-09 on the owner's direction. Supersedes `DRD-34` property 9 and `DRD-35` property 8. Implemented at `50ed18a17`, reported at `36dbd55db`. Read by the architect ([assessment](callback-list-completion-assessment.md)): conforms. Property 3 was clarified on 2026-11-10: it is checked by reading lint's output |
| DRD-38 | active, decided on 2026-11-09 on the owner's direction, under CONTRIBUTING's TypeScript section as clarified at `2bec0c431`. Amends the contract's public surface. `DRO-13` holds the other declarations, and the owner deferred it on 2026-11-10. Implemented at `50ed18a17`, reported at `36dbd55db`. Read by the architect ([assessment](callback-list-completion-assessment.md)): conforms |
| DRD-39 | active, decided on 2026-11-10 by the architect on `DRF-10`, from [`combined-review-assessment.md`](combined-review-assessment.md) §3. Amends the contract's public surface. [`combined-review-remediation-handoff.md`](combined-review-remediation-handoff.md) item 1 implemented it at `d1a262306`, reported at `f2ac81bc5` ([report](combined-review-remediation-report.md)). Proven by the [feature proof](reviews/combined-ownership/remediation-reviewer.md) at `26919a938`, and read by the architect ([assessment](combined-review-remediation-assessment.md)): conforms. `DRF-10` is closed |
| DRD-40 | active, decided on 2026-11-10 by the architect on the owner's request to open the runtime-performance phase. Ends `DRO-4`'s timing deferral. Applied by [`performance-plan.md`](performance-plan.md). Its first unit is [`performance-instrument-handoff.md`](performance-instrument-handoff.md). That unit returned at `b8f1d1b35`, and `DRD-41` decides the return. It completed P1 at `c279973a3`, and the baseline of `a9c323f6a` is recorded. `DRD-42` and `DRD-43` decide P2. Its properties 2 and 5 apply to the in-page rows. `DRD-46` amends both: a selected candidate is confirmed by a "faster" verdict with no floor, and P3 no longer waits for `DRD-43` property 7. `DRD-44` adds the CPU model and core sets to property 4's machine record. The owner closed P3, the runtime pass, on 2026-11-12, with no budget change ([plan](performance-plan.md) §2 P3) |
| DRD-41 | active, decided on 2026-11-10 by the architect on the instrument unit's return at `b8f1d1b35`. Amends [`performance-instrument-handoff.md`](performance-instrument-handoff.md) and [`performance-plan.md`](performance-plan.md) §2 P1. Implemented at `676bdd3ba` (that handoff's item 2a). Q1 fails as required, and the witness is quiet and counted in the `--prove` recorded at `c279973a3`. Read by the architect on 2026-11-11 ([assessment](performance-instrument-assessment.md)): conforms |
| DRD-42 | active, decided on 2026-11-11 by the architect on the per-sample readings at `c279973a3`. Decides [`performance-plan.md`](performance-plan.md) §2 P2's first bullet. Implemented at `a600abc51` from [`performance-resolution-handoff.md`](performance-resolution-handoff.md) item 1, and reported at `39c8b432c`. Read by the architect ([assessment](performance-resolution-assessment.md) §3): conforms. Its second withdrawal doesn't apply to M4's form at Chrome 157, which the warm test catches |
| DRD-43 | active, decided on 2026-11-11 by the architect on the floors and the baseline at `c279973a3`. Decides P2's second bullet, adds P1b, and sets P3's entry condition in [`performance-plan.md`](performance-plan.md). Implemented at `a7b3851c1` from [`performance-resolution-handoff.md`](performance-resolution-handoff.md) item 2, and reported at `39c8b432c`. Read by the architect ([assessment](performance-resolution-assessment.md) §4): properties 1, 2, 4 and 5 hold, and property 3's path holds. Its gate injections don't flag, and no entry flags in F1 or F2, which isn't a stable floor under property 6. `DRD-44` decides the return, and its outcome is not resolved. B3' and the floors waited for `DRD-45`'s outcome, and aren't scheduled since `DRD-46` stopped its check. `DRD-46` supersedes property 8 |
| DRD-44 | active, decided on 2026-11-11 by the architect on the resolution report at `39c8b432c` ([assessment](performance-resolution-assessment.md) §4). Amends `DRD-43`'s sequence, `DRD-40` property 4's machine record, and [`performance-plan.md`](performance-plan.md) §2 P1b. Run at `24cdadc48` from [`performance-sensitivity-handoff.md`](performance-sensitivity-handoff.md). Read by the architect ([assessment](performance-sensitivity-assessment.md) §3): not resolved on both gate rows, final. `DRD-45` withdraws its gauge test and its rerun |
| DRD-45 | active, decided on 2026-11-11 by the architect on the sensitivity report at `24cdadc48` ([assessment](performance-sensitivity-assessment.md) §4). Amends `DRD-44` properties 4, 7 and 8, and [`performance-plan.md`](performance-plan.md) §2 P1b. Property 9 holds the injection repair for `566ebfc65`. Its check, [`performance-page-check-handoff.md`](performance-page-check-handoff.md), returned at `f344a0ea8` before any browser process. `DRD-46` stopped properties 3 to 8 on the owner's direction and keeps them for possible later use. Properties 1, 2 and 9 are in force |
| DRD-46 | active, decided on 2026-11-11 by the architect on the owner's direction. Stops `DRD-45` properties 3 to 8, supersedes `DRD-43` property 8, and amends `DRD-40` properties 2 and 5 and [`performance-plan.md`](performance-plan.md) §2. [`performance-trace-handoff.md`](performance-trace-handoff.md) recorded the first traces at `743921de0` and `e92e21eed` ([report](performance-trace-report.md)). Read by the architect ([assessment](performance-trace-assessment.md)): accepted. `DRD-47` selects the first candidate under property 8 |
| DRD-47 | active, decided on 2026-11-11 by the architect on the trace report at `e92e21eed` ([assessment](performance-trace-assessment.md) §2 and §3), under `DRD-46` property 8. Amended the contract's `DRI-14` at `bf9d1caed`, and [`performance-plan.md`](performance-plan.md) §2 P3. **Implemented at `bf9d1caed` and confirmed** ([report](performance-drop-report.md) at `8eda874f0`, [assessment](performance-drop-assessment.md)): the 2,000-item cycle row is faster by 2,449 µs of script per cycle. The owner approved the geometry rule and accepted +125 to +140 B Brotli on 2026-11-12 (`DRO-4`) |
| DRD-48 | active, decided on 2026-11-12 by the architect on `DRF-22` ([assessment](performance-drop-assessment.md) §4). Amends `DRD-33` choice 7. Amended the contract's `DRI-20` and `DRI-21` at `71f20df20`. **Implemented at `71f20df20`** ([report](free-drag-drop-report.md) at `7cb2207ae`, [assessment](free-drag-drop-assessment.md)), which closes `DRF-22`. The owner approved the reads at the drop and accepted +5 B Brotli on 2026-11-12 (`DRO-4`) |
| DRD-49 | active, decided on 2026-11-12 by the architect on the trace report at `e92e21eed` ([assessment](free-drag-drop-assessment.md) §2), under `DRD-46` property 8. Narrows `y()`'s terms. Amended the contract's `DRI-14` at `501f60ab7`. **Implemented at `501f60ab7` and confirmed** ([report](performance-window-report.md) at `56c1c27c3`, [assessment](performance-window-assessment.md)). The owner approved its scope and ordering term on 2026-11-12, before the unit. Property 8 amended by `DRD-50`. The owner accepted its final bytes on 2026-11-12, as `DRD-50`'s unit measured them (`DRO-4`) |
| DRD-50 | active, decided on 2026-11-12 by the architect on the window report at `56c1c27c3` ([assessment](performance-window-assessment.md) §2 and §3). Amends `DRD-49` property 8 and the internal `DisplacementSink.settle`. **Implemented at `8d002529a`, and it conforms** ([report](performance-window-correction-report.md) at `566d4d29e`, [assessment](performance-window-correction-assessment.md)). The probe read "no difference shown", so the shared rebuild stays, and the reading bounds no slowdown. `DRD-58`: W7's helpers identify the slot array by being an array, and a copy mutation replaces M7 |
| DRD-51 | active, decided on 2026-11-12 by the architect on the owner's request to open P4, from [`size-pass-assessment.md`](size-pass-assessment.md). Amends `DRD-40` property 6 for the size pass, and `DRF-14`'s required property. Applied by [`performance-plan.md`](performance-plan.md) §2 P4. Its first unit, `DRF-13` and `DRF-14`, is recommended and not started. `DRO-14` holds the owner's items. **Amended on 2026-11-12 by `DRD-52`:** its first unit also carries `DRD-52` and `DRD-53`, and [`size-pass-unit-handoff.md`](size-pass-unit-handoff.md) implements all three. **First unit landed on 2026-11-12** at `237d65d2f` and accepted ([assessment](size-pass-unit-assessment.md)). **Amended on 2026-11-12:** §First unit item 2's step becomes a module function, which [`size-pass-followup-handoff.md`](size-pass-followup-handoff.md) implements, and property 3 separates `bench/campaign.ts` from the deferred campaigns. **The amendment of item 2 landed on 2026-11-12** at `e22db849c` and was accepted (§Disposition of the size pass follow-up report). With `DRO-14` answered in full, no measured candidate remains. **Properties 1 and 3 amended on 2026-11-13 by `DRD-55`:** readings are booked from the gate on the published build, and `measure.ts` changes for that instrument change only |
| DRD-52 | active, decided on 2026-11-12 on the owner's approval of proposal P in [`rect-index-ownership-proposal.md`](rect-index-ownership-proposal.md), with the owner's two conditions. Amends `DRD-33` choice 9 and `DRD-51` §First unit, and answers `DRO-14` item 2. [`size-pass-unit-handoff.md`](size-pass-unit-handoff.md) implements it. Its 7 B per committed move is provisional. **Implemented on 2026-11-12** at `237d65d2f` and accepted ([assessment](size-pass-unit-assessment.md)). Property 9's 7 B is replaced by readings: +0.84 B per committed move warm, +4.13 B cold, both with their spreads. `DRD-58` amends properties 1, 4 and 6: the slot buffer is one `number[]` that nothing replaces |
| DRD-53 | active, decided on 2026-11-12 on the owner's direction, from the owner's commit `1d304128b`. Amends `DRD-35` property 5 and `DRD-36` properties 1, 3 and 4, and answers `DRO-14` item 1. [`size-pass-unit-handoff.md`](size-pass-unit-handoff.md) completes it outside `src`. `example: resize handle` is 8 B over its ceiling from `1d304128b`. **Completed on 2026-11-12** at `15e9d1ef2` and accepted ([assessment](size-pass-unit-assessment.md)) |
| DRD-54 | active, decided on 2026-11-12 by the architect on the owner's answer to `DRO-15`, which started its steps 1 and 2. Decides step 1, the `consumer` project. [`consumer-tests-handoff.md`](consumer-tests-handoff.md) implements it. Step 2, the gate on the published build, is decided when step 1 reports. **Implemented at `5ea7bb7e6`** and accepted on 2026-11-13 ([assessment](consumer-tests-assessment.md)). **Property 2 amended on 2026-11-13** for `DRF-23`: the resolved file decides, whatever the specifier form. [`published-gate-handoff.md`](published-gate-handoff.md) part A implements the amendment. Step 2 is `DRD-55`. The amendment was implemented at `79b4c3132`. `DRD-56` property 8 keeps the consumer project in Chromium only |
| DRD-55 | active, decided on 2026-11-13 by the architect on the owner's direction after `DRD-54`'s unit reported. `DRO-15` step 2: the size gate reads the published build. Amends `DRD-51` properties 1 and 3. [`published-gate-handoff.md`](published-gate-handoff.md) part B implements it. Every ceiling and the control figure stay, and a changed verdict goes to `DRO-4`. **Implemented** at `69c260685`, with `DRF-23` repaired at `79b4c3132`, and accepted on 2026-11-13 (§Disposition of the published gate report). No verdict changed |
| DRD-56 | active, decided on 2026-11-13 by the architect on the owner's answer to `DRO-15` step 3: source prefixes, then publish-time mangling, with no selection by type. Clarifies `DRD-51` property 3 and answers `DRD-54`'s question on three engines. [`publish-mangle-handoff.md`](publish-mangle-handoff.md) implements it. Budgets are unchanged. **Implemented** at `f7b7b300b` and `31f92f5a9`, reported at `78797ebf6`, and accepted on 2026-11-13 ([assessment](publish-mangle-assessment.md)). Properties 1 and 6 corrected in place the same day: the members that a published type declares, and the bounded class member exception to V4. The two changed verdicts went to `DRO-4`. No independent review has read it yet. **Property 2's selection extended on 2026-11-13 by `DRD-57`.** The [publish mangle review](reviews/publish-mangle/publish-mangle-summary.md) read it at `436b105c6`. **Superseded in part on 2026-11-13 by `DRD-59`:** properties 4 to 6 and property 7's V2 to V4 |
| DRD-57 | active, decided on 2026-11-13 by the architect on the owner's request to audit `DRD-56`'s selection, from [`mangle-selection-audit.md`](mangle-selection-audit.md) at `436b105c6`. Amends `DRD-56` property 2's starting set and adds the one-character rule to its property 1. [`mangle-selection-handoff.md`](mangle-selection-handoff.md) implements it. Budgets are unchanged. **Implemented** at `b50204f66`, and reported at `1719df16c`. The architect hasn't read the report. Property 4 is superseded by `DRD-59` |
| DRD-58 | active, decided on 2026-11-13 on the owner's direction. Replaces `RectIndex`'s growable `Float64Array` slot buffer with one `number[]`, and removes the lifetime and reentrancy rules that replacement required. Amends `DRD-52` properties 1, 4 and 6, and `DRD-50` W7's helpers. [`slot-array-handoff.md`](slot-array-handoff.md) implements it after `DRD-57`'s unit. Costs are reported, not gated. Not implemented. Property 8's first bullet amended by `DRD-59` |
| DRD-59 | active, decided on 2026-11-13 by the architect on the owner's requirements for the publication. Supersedes `DRD-56` properties 4 to 6 and property 7's V2 to V4, and `DRD-57` property 4, amends `DRD-58` property 8, and withdraws the remediation proposal at `be151f9ed`. Decides `DRF-24` to `DRF-37`. [`publication-build-handoff.md`](publication-build-handoff.md) implements it. Budgets are unchanged. Not implemented |