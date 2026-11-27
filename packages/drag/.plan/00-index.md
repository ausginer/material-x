# `@ydinjs/drag` record: decisions

The register for scope `drag`, under `repo:RD-1`: decisions are `DRD-n`, invariants `DRI-n`, owner decisions `DRO-n`. Numbering starts at 1. drag2's bare `D-` series is separate. **Each decision, `DRD-n` and `DRO-n`, is a file of its own** in `decisions/`, named by its identifier, such as `decisions/DRD-1.md`. The invariants are in [`contract.md`](contract.md). This index keeps the findings, the dispositions and the status paragraphs. To read one entry of this index:

```sh
awk -v re="^#### DRF-1( —|$)" \
  '$0 ~ re {f=1;print;next} f && /^#{1,4} /{exit} f' \
  packages/drag/.plan/00-index.md
```

**Input:** the prototype read at `26f82fbb1`. That commit is on no ref now. Its `packages/drag` tree is byte-identical to `599684791` on `drag/prototype`, so later citations use `599684791`. Evidence: [`prototype-report.md`](prototype-report.md), [`probes/prototype/`](probes/prototype/README.md), [`probes/final-design/`](probes/final-design/README.md). The comparison and earlier evidence are in [`architecture-plan.md`](architecture-plan.md).

**Status, 2026-11-07:** production was built at `d7e7b0d3a` on `drag/production` and reviewed twice at that commit: a [review round](reviews/production/production-summary.md) and an [architecture challenge](reviews/architecture/production-design-challenge.md). `DRD-14` to `DRD-23` decide every finding and question from both. Where they change an earlier decision, its status row names the amendment. The required behavior is in [`contract.md`](contract.md). The [remediation](remediation-report.md) implemented them at `b91db2818`, and no independent review has read it yet. The owner's composition refactor at `3084191bb` and the implementer's findings on it are decided by `DRD-24` and `DRD-25`. `DRD-24` was revised to the owner's ownership model, and its [prototype](probes/session-owner/README.md) met it at `b54832a0e`. The owner approved its cost in `DRO-6`, and the [composition unit](composition-report.md) adopted it at `276947f82` and fixed the built-ins at `2506dcbb6`. The owner then split the kernel into modules at `bb644d6d7`, whose typecheck fails. `DRD-26` to `DRD-28` decide the ownership and lifecycle questions that the split exposed, and [`ownership-handoff.md`](ownership-handoff.md) implements them. The owner then required that the kernel know no lift, and `DRD-27` was revised on `6d5ba89e7`'s text before any of it was implemented. Their costs are `DRO-7`. The [ownership unit](ownership-report.md) implemented `DRD-26` to `DRD-28` at `039e8e153`, `433a0e06c` and `89995c27e`, and reported at `ff69cb8d7`. The architect read it at that commit: the three items conform, and its two instrument findings go to [`instrument-repair-handoff.md`](instrument-repair-handoff.md) (§Disposition of the ownership report). A third instrument finding is open as `DRF-1`. The combined review follows the instrument repair. On 2026-11-08 the architect proposed a change to the `Lift` in [`lift-representation-proposal.md`](lift-representation-proposal.md). With the owner's clarifications it is decided as `DRD-29`. [`lift-representation-handoff.md`](lift-representation-handoff.md) implements it, after repairing `DRF-2`, and reports its figures for `DRO-7`. The kernel's per-sample reading from the instrument repair stays open, apart from that unit. The [lift representation report](lift-representation-report.md) was read at `d258573fa`, in [`operation-lifetime-assessment.md`](operation-lifetime-assessment.md): `DRF-2` is closed, and `DRD-29` conforms except `DRF-3`, whose repair is that record's §3. The owner then proposed that `activate` return the behavior's operation, decided as `DRD-30`, which replaces that record's recommendation. [`activation-result-handoff.md`](activation-result-handoff.md) implements it after `DRF-3`'s repair, and its costs are `DRO-8`. `DRF-3` was repaired at `d7828a280`. `DRD-30` was implemented at `da139407e` and `3a67df0ea` and reported at `d99ebd304`. The architect read both at `d99ebd304`, in [`activation-result-assessment.md`](activation-result-assessment.md). `DRD-30` conforms, and is amended so that `freeDrag`'s motion belongs to its operation. `DRF-3` is closed, and `DRF-4` is open. That record's §6 is the remediation before the combined review. The owner then directed that `sortable` stop copying the `items()` array, decided as `DRD-31` from [`items-copy-assessment.md`](items-copy-assessment.md). [`items-borrowing-handoff.md`](items-borrowing-handoff.md) implements it. The owner approved the gate's revision in [`execution-boundary-assessment.md`](execution-boundary-assessment.md), decided as `DRD-32` with its cost in `DRO-9`. It was implemented from `8943f14e5` at `a8327a7c8`, inside `DRO-9`'s figures, and [`execution-boundary-report.md`](execution-boundary-report.md) reports it. The owner inspects it before any review. On 2026-11-09 the owner accepted closed, named capability slots for v1 from [`feature-composition-assessment.md`](feature-composition-assessment.md), decided as `DRD-33`, which amends `DRD-2`. The slot's charge is `DRO-10`, an accepted drop's landing into its target is `DRO-11`, and the `bounds` defect found there is `DRF-5`. [`feature-composition-handoff.md`](feature-composition-handoff.md) implements them. On the same day the owner withdrew the detached-call guarantee for `DraggableController` and let `draggable` return its `Gesture`, with one shared pass implementation. That is decided as `DRD-34` from the owner's uncommitted edit on `39af0ef44`, and [`gesture-receiver-handoff.md`](gesture-receiver-handoff.md) completes the edit. It was implemented at `fd7ae3e43` and reported at `03d1449e2`. The architect read both at `03d1449e2`, in [`gesture-receiver-assessment.md`](gesture-receiver-assessment.md): `DRD-34` conforms, and no cost is accepted. The owner inspects it before any review. Later that day the owner chose receiver-aware `requestStep` and `use` through one internal `CallbackList`, from the model at `9f885b9a9` on `drag/step-queue-model` and the owner's uncommitted edit on it. That is decided as `DRD-35`, which amends `DRD-34`, with its costs in `DRO-12`. [`callback-list-handoff.md`](callback-list-handoff.md) ports it to production. No combined review starts before the owner has read its report. It was implemented at `53c87f988` and reported at `f06a99c4f`, and the architect read the report at `2bec0c431` (§Disposition of the callback list report). The owner then chose the uncommitted `CallbackList` edit on `2bec0c431`, which inserts with `push` or `unshift` and runs with `pop`, decided as `DRD-36`. The owner also turned `@typescript-eslint/unbound-method` off for this package, decided as `DRD-37`, and clarified CONTRIBUTING so that `Drag` and `Lift` are types, decided as `DRD-38`. `DRO-12` is amended for `DRD-36`, and `DRO-13` asks about the other declarations. [`callback-list-completion-handoff.md`](callback-list-completion-handoff.md) implements the three decisions. No combined review starts before the owner has read its report. They were implemented at `50ed18a17` and reported at `36dbd55db`. On 2026-11-10 the owner accepted `DRO-12` and deferred `DRO-13`, and the architect read the report in [`callback-list-completion-assessment.md`](callback-list-completion-assessment.md): the three decisions conform. That record's §6 gives the revision, the scope and the open obligations for the combined review, which the owner directs next. The [combined review](reviews/combined-ownership/combined-ownership-summary.md) read `b01a0283d` and registered `DRF-6` to `DRF-18`. The owner had accepted `DRO-7` and `DRO-8` before it. The architect read it at `92fbb93e1`, after the owner's type-only `Fallible` commit, in [`combined-review-assessment.md`](combined-review-assessment.md) (§Disposition of the combined review). `DRF-4`, `DRF-5` and `DRF-11` are closed, `DRD-39` decides `DRF-10`, and [`combined-review-remediation-handoff.md`](combined-review-remediation-handoff.md) is the last unit before merge. That record's §7 lists the owner's remaining decisions. The remediation was implemented from `d1a262306` to `83f472624` and reported at `f2ac81bc5`, and a feature proof read it at `26919a938`. The architect read both at `26919a938`, in [`combined-review-remediation-assessment.md`](combined-review-remediation-assessment.md) (§Disposition of the combined review remediation). `DRF-6`, `DRF-8`, `DRF-9`, `DRF-10`, `DRF-12` and `DRF-16` are closed, and `DRD-39` is implemented. The proof's two title findings are `DRF-19`, owed before merge, and [`test-title-follow-up-handoff.md`](test-title-follow-up-handoff.md) repairs it. That record's §5 replaces the earlier §7 as the list of merge conditions and owner decisions.

**Status, 2026-11-10, after the merge:** the architect read the [test title follow-up report](test-title-follow-up-report.md) at `377264b3d` and the diff of `60680eb75`, and closed `DRF-19` (§Disposition of the test title follow-up). `drag/feature-composition` was squash-merged to `main` as `a9c323f6a` (#14). The six size rows stay red with unchanged budgets, as the pull request states. The record holds no answer to decisions 1 and 2 of [`combined-review-remediation-assessment.md`](combined-review-remediation-assessment.md) §5.2. On the same day the owner opened the runtime-performance phase on `drag/performance` from `a9c323f6a`: runtime speed first, bundle size second. `DRD-40` decides how it measures, [`performance-plan.md`](performance-plan.md) is its plan, and [`performance-instrument-handoff.md`](performance-instrument-handoff.md) is its first unit. That unit repairs `DRF-1` and `DRF-7`. It returned at `b8f1d1b35` after items 1 and 2: the step-list injection adds no bytes at the current source. `DRD-41` decides the return, and the [handoff](performance-instrument-handoff.md) says how the unit resumes (§Disposition of the performance instrument return). The unit completed at `c279973a3`, and the architect read it on 2026-11-11 in [`performance-instrument-assessment.md`](performance-instrument-assessment.md) (§Disposition of the performance instrument report). `DRF-1` is closed, and the baseline of `a9c323f6a` is recorded. `DRD-42` repairs the kernel per-sample test with a warm pass. `DRD-43` finds that no timing row can resolve an optimization yet and adds in-page rows. [`performance-resolution-handoff.md`](performance-resolution-handoff.md) implements both, and no optimization unit starts before it reports. The baseline's reading for the owner is in `DRO-4`. The unit reported at `39c8b432c` on `drag/performance-resolution`, and the architect read it on 2026-11-11 in [`performance-resolution-assessment.md`](performance-resolution-assessment.md) (§Disposition of the performance resolution report). `DRD-42` conforms. The in-page rows run, and their gate injections don't flag, at a load above the machine's four P-core threads. `DRD-44` attributes that to the machine or the method with one experiment, which [`performance-sensitivity-handoff.md`](performance-sensitivity-handoff.md) runs. The retained excess is attributed to V8's internal arrays and bounded within 400 operations, and its reading for the owner is in `DRO-4`. The experiment ran at `24cdadc48`, and the architect read it on 2026-11-11 in [`performance-sensitivity-assessment.md`](performance-sensitivity-assessment.md) (§Disposition of the performance sensitivity report). Its outcome is not resolved on both gate rows: the speed gauge measures its own first run rather than the machine, and unpinned readings always span both core classes. At the quietest load on record the gates' bounds are still too wide for an optimization unit, so the method changes in any outcome. `DRD-45` withdraws the gauge test, and one same-page check, which [`performance-page-check-handoff.md`](performance-page-check-handoff.md) runs, decides whether the spread comes from the page, the window or the clock. The alias cleanup at `566ebfc65` on `drag/performance` makes 10 of the 23 entries stale, and they are repaired before any campaign on that source. The page check returned at `f344a0ea8` before any browser process: the cycle row's end check counts the page's whole log. The owner then stopped the check. `DRD-46` keeps it for possible later use and redirects the phase to short scenario traces, which [`performance-trace-handoff.md`](performance-trace-handoff.md) records (§Disposition of the page check return). An optimization unit starts on one candidate the architect selects from those traces, and a focused paired measurement confirms it. The traces were recorded at `e92e21eed`, and the architect read them on 2026-11-11 in [`performance-trace-assessment.md`](performance-trace-assessment.md) (§Disposition of the performance trace report). `DRD-47` selects the drop's re-measure in a changed form: the unconditional call protects a scroll whose event hasn't arrived yet, so the drop confirms the cache against one row instead. [`performance-drop-handoff.md`](performance-drop-handoff.md) implements it, once the owner brings `566ebfc65`'s source and this record onto one branch. The bundle's missing module markers are `DRF-21`, and they change no recorded verdict. The branches were joined on `drag/performance` at `093f31c7f`. The unit implemented `DRD-47` at `bf9d1caed` and reported at `8eda874f0`, and the architect read it on 2026-11-12 in [`performance-drop-assessment.md`](performance-drop-assessment.md) (§Disposition of the performance drop report). `DRD-47` conforms and is confirmed: the 2,000-item cycle row is faster by 2,449 µs of script per cycle. The owner approved its geometry rule and accepted its +125 to +140 B Brotli, with no budget change (`DRO-4`). `DRD-48` decides `DRF-22`: `freeDrag`'s drop measures its targets and its bounds again, and [`free-drag-drop-handoff.md`](free-drag-drop-handoff.md) implements it. The unit implemented it at `71f20df20` and reported at `7cb2207ae`, and the architect read it on 2026-11-12 in [`free-drag-drop-assessment.md`](free-drag-drop-assessment.md) (§Disposition of the free drag drop report). `DRD-48` conforms, and `DRF-22` is closed. The owner accepted its +5 B Brotli, with no budget change. `DRD-49` selects the trace report's candidate 1: `y()` measures a window of rows that grows from the placeholder toward the pointer, instead of every row. [`performance-window-handoff.md`](performance-window-handoff.md) implements it. The owner approved its scope and ordering term and deferred virtualized lists until after 1.0.0. The unit implemented it at `501f60ab7` and reported at `56c1c27c3`, and the architect read it on 2026-11-12 in [`performance-window-assessment.md`](performance-window-assessment.md) (§Disposition of the performance window report). `DRD-49` conforms and is confirmed: the 2,000-item cycle row is faster by 2,508 µs of script per cycle. To fit the ceilings, the unit shared `xy()`'s rebuild with `y()`'s code, and with a sink each read allocates a view and a copy. `DRD-50` removes the allocation by range settling, and a paired probe decides whether the shared rebuild stays. [`performance-window-correction-handoff.md`](performance-window-correction-handoff.md) implements it. The unit implemented it at `8d002529a` and reported at `566d4d29e`, and the architect read it on 2026-11-12 in [`performance-window-correction-assessment.md`](performance-window-correction-assessment.md) (§Disposition of the performance window correction report). `DRD-50` conforms. The probe read "no difference shown", so the shared rebuild stays, and its A/A bounds don't limit a possible slowdown. The owner accepted the window's final bytes, with no budget change (`DRO-4`). The trace candidates are done, rejected or decisions first. One attribution probe is recommended and not started: the layout after a row animation ends at 2,000 items. If it finds nothing the library controls, the runtime pass is ready to close. The architect ran it on 2026-11-12 at `bb8e5ebb8` and recorded it in [`animation-end-layout-probe.md`](animation-end-layout-probe.md) (§Disposition of the animation-end layout probe). In Chromium 157, in a block list of fixed-height rows, every tested variant that started or stopped an animation or style of `translate`, `transform` or `opacity` invalidated the row's layout, and that layout cost more at 2,000 rows than at 20. None of the library-controlled forms the probe considered avoided it with the same rendering and cleanup, so the architect recommended closing the runtime pass. **The owner closed the runtime pass on 2026-11-12** ([`performance-plan.md`](performance-plan.md) §2 P3, which lists the confirmed results and the open items). Budgets are unchanged, and the deferred campaigns stay stopped. The owner inspects the code before a pull request is prepared and the phase closes. P4 hasn't started. `drag/performance` was squash-merged to `main` as `0a28f909a` (#15). **On 2026-11-12 the owner opened P4, the size pass, on `drag/size` from `0a28f909a`.** The architect read the package under CONTRIBUTING Part II in [`size-pass-assessment.md`](size-pass-assessment.md), with the probe and patches in [`probes/size-pass/`](probes/size-pass/README.md). No nannying, dead runtime vocabulary or diagnostic prose is left to remove. The measured candidates are worth tens of bytes per row, and no set of them makes a red row green, so `DRO-4`'s re-base stays the owner's. `DRD-51` decides how the pass measures and recommends its first unit, `DRF-13` and `DRF-14` together. `DRO-14` holds the four candidates that move a decision, a boundary or hot-path work. Budgets are unchanged, and the deferred campaigns stay stopped. At the owner's request, the architect revisited C6 at `c0d6b9205` in [`rect-index-ownership-proposal.md`](rect-index-ownership-proposal.md), with the variants in [`probes/rect-index-ownership/`](probes/rect-index-ownership/README.md). `RectIndex` becomes the dimension-neutral cache, each axis module holds its own policy, and `y()`'s prediction writes the slot buffer only through a lend scoped to one call and one range. That replaces C6's form in `DRO-14` item 2, which waits for the owner. The owner's staged `Callbacks` edit was left as it is. **The owner then committed that edit as `1d304128b`, approved P, and rejected C2.** `DRD-52` decides P, with the development check keeping the placeholder's x and the 7 B per committed move provisional. `DRD-53` decides the module factories. [`size-pass-unit-handoff.md`](size-pass-unit-handoff.md) is one unit that implements U1, `DRD-52` and `DRD-53` from `1d304128b`. `DRO-14` items 3 and 4 are unanswered. Budgets are unchanged, and `example: resize handle` is now 8 B over its ceiling. **The unit landed at `237d65d2f`, and the architect accepted its report** in [`size-pass-unit-assessment.md`](size-pass-unit-assessment.md): −62 B Brotli on "sortable + y", −56 B on "sortable + xy" and −65 B on "complete", with the allocation and timing results and their uncertainty under `DRD-52`. [`size-pass-followup-handoff.md`](size-pass-followup-handoff.md) carries the `invalidate` step's repair and the probe's launch documentation. `bench/campaign.ts` is now stated to be the tool for sequencing runs, apart from the deferred campaigns, which stay stopped. The architect then explored property mangling in [`property-mangling-exploration.md`](property-mangling-exploration.md), and `DRO-15` asks the owner whether the build shortens the internal property names. **The follow-up landed at `e22db849c` and `0c13786ea`, reported at `fe529df4c`, and the architect accepted it** (§Disposition of the size pass follow-up report). The owner then answered `DRO-14` items 3 and 4: C1's idle fast path and C5's capture functions stay unchanged. `DRF-20` closes, and P4 has no measured machinery candidate left. On `DRO-15` the owner started its first two steps, each a unit of its own, and holds the mangle until the published build's results exist. `DRD-54` decides the first step, and [`consumer-tests-handoff.md`](consumer-tests-handoff.md) implements it. Budgets are unchanged, and the deferred campaigns stay stopped. **The first step landed at `5ea7bb7e6` and reported at `87288b9d2`, and the architect accepted it on 2026-11-13** in [`consumer-tests-assessment.md`](consumer-tests-assessment.md) (§Disposition of the consumer tests report). 326 public browser tests pass against the emitted tree. The owner found that the consumer resolver lets an absolute path to a non-entry module reach its source. That is `DRF-23`, and `DRD-54` property 2 now decides by the resolved file. The build's clean doesn't target `src/`. On the owner's direction, `DRD-55` decides step 2: the size gate reads the published build through its exports map, one build per run serves both projects, box-quad stays on its source, and every ceiling stays. [`published-gate-handoff.md`](published-gate-handoff.md) repairs `DRF-23`, then implements `DRD-55`. The mangle stays pending, budgets are unchanged, and the deferred campaigns stay stopped. **Step 2 landed at `79b4c3132` and `69c260685`, reported at `2d9a2f482`, and the architect accepted it on 2026-11-13** (§Disposition of the published gate report). `DRF-23` is closed. The gate reads the emitted tree, the figures differ from `src` by −7 to +16 B Brotli, and no verdict changed. **The owner answered `DRO-15` step 3:** explicit `_` prefixes in source for strictly internal properties, then publish-time mangling, with public and platform names unchanged and no selection by type. The type-directed transform is deferred to [`performance-plan.md`](performance-plan.md) §6. `DRD-56` decides the step: one committed map from source name to output name, a step inside `tsdown`'s build, unchanged `.d.ts` files, source maps that lead back to `src`, and a node test that validates the publication. [`publish-mangle-handoff.md`](publish-mangle-handoff.md) implements it. Budgets are unchanged. **Step 3 landed at `f7b7b300b` and `31f92f5a9`, reported at `78797ebf6`, and the architect accepted it on 2026-11-13** in [`publish-mangle-assessment.md`](publish-mangle-assessment.md) (§Disposition of the publish mangle report). `DRD-56`'s properties 1 and 6 are corrected in place: property 1 names the members that a published type declares, and V4 accepts a `readonly` field's upstream mapping to its own member start, within a stated bound. The gain is −31 to −110 B Brotli per row. "example: resize handle" and "freeDrag" turn green and go to `DRO-4`, and four rows stay red. Budgets are unchanged, and the type-directed transform stays deferred. A fresh independent review of the publication pipeline is recommended, and the owner decides whether to start it. **On the owner's request, the architect audited the selection at `436b105c6`:** `DRD-57` adds 30 internal declarations that the starting set missed, because their names are also platform or published members, and [`mangle-selection-handoff.md`](mangle-selection-handoff.md) implements it. The independent review stays pinned to `436b105c6`. **On the owner's direction, `DRD-58` replaces `RectIndex`'s growable `Float64Array` slot buffer with one `number[]` that nothing replaces**, and removes the lifetime and reentrancy rules that replacement required. Fixed-size buffers stay as they are. [`slot-array-handoff.md`](slot-array-handoff.md) implements it after `DRD-57`'s unit, and reports its costs without a timing gate. **At the owner's request, the architect explored the owner's three-unit layout** at `cc9818a96` in [`unit-layout-exploration.md`](unit-layout-exploration.md), with the candidate in [`probes/unit-layout/`](probes/unit-layout/README.md): a kernel chunk, a sortable chunk and a freeDrag chunk, each built as one chunk with native mangling. `FrameTask._schedule` and `_cancel` are the only marker names that cross a unit, and either repair makes the layout pass the consumer project as `DRD-59`'s build does. `DRO-16` asks the owner to choose between the layout and `DRD-59`. `DRF-39`, registered as `DRF-38` at `1c99666f2`: two consumer tests count heap instances by class name, and both builds fail them. Nothing is adopted, and budgets are unchanged. **`DRD-58` landed at `5ec3b4b2d` and reported at `690769539`, and the architect accepted it on 2026-11-13** (§Disposition of the slot array report). On the owner's direction it was checked in Chromium only. The three `sortable` rows are 31 to 32 B Brotli smaller, the control rows don't move, no verdict changed, and allocation moved within its spread. The owner's separate revert of property mangling keeps the slot array. The baseline lint and typecheck errors are `DRF-38` and `repo:RF-31`. **On 2026-11-13 the owner stopped the mangling and layout exploration, and deferred property mangling,** because its measured savings don't justify its complexity. `DRD-60` records it: `DRD-56` and `DRD-57` are superseded, `DRD-59` is withdrawn before implementation, and `DRO-16` with it. [`mangle-rollback-handoff.md`](mangle-rollback-handoff.md) is one unit from `drag/size` at `f552e0ec9`, which this branch has merged. It removes the prefixes, the build step and the publication test, and keeps `DRD-58`'s slot array, the dependency update, the consumer project and the gate on the published build. The experiments stay as evidence, and budgets are unchanged. **Reconciled with `drag/size` at `f552e0ec9`:** `DRD-58`'s accepted result and `repo:RF-31` are carried over. `drag/size` registered `DRF-38` for the baseline lint error, so the class-name finding first registered here under that number is `DRF-39`. The rollback reports the baseline lint and typecheck errors apart from any new one, and its acceptance closes neither. **At the owner's request, the architect explored `RectIndex` owning its storage and every write to it** in [`rect-index-access-proposal.md`](rect-index-access-proposal.md) at `a61b76e9c`, on `drag/rect-index-ownership`, which merged `drag/size` at `8904947f6` after the rollback. **The owner approved proposal P and its displacement-sink interface.** `DRD-61` records it, and amends `DRD-52`, `DRD-58`, `DRD-50` and `DRD-33` choice 9. Ported to the restored names and measured against `8904947f6`, P reads −31, +22 and −92 B Brotli on the `sortable` rows, and no verdict changes: "complete" stays over its ceiling, by 101 B. The green "complete" of the mangled build is historical. [`rect-index-access-handoff.md`](rect-index-access-handoff.md) is one unit from `8904947f6` that implements it. It carries the replacement W7 tests and their mutations, size and allocation readings, and a focused timing check under the owner's hold, and its report keeps reduced allocation apart from unmeasured speed. Budgets are unchanged, and the deferred campaigns stay stopped. The rollback's report hasn't been read by the architect yet, and the 49 baseline lint errors and `repo:RF-31` stay unrepaired. **`DRD-61` landed at `010a9ef39`, reported at `f788b2b80`, and the architect accepted it on 2026-11-13** in [`rect-index-access-assessment.md`](rect-index-access-assessment.md) (§Disposition of the RectIndex access report). The size readings equal `DRD-61`'s figures, and no verdict changes. Allocation falls per `y()` sample, per cold committed move and per drop with a sink. Timing reads "no difference shown" in all three cases, so speed is unmeasured. `DRD-61` property 11 and the handoff read the A/A threshold as a limit on a slowdown the check could miss, and both are corrected. The verdicts and the rule stay as recorded. Budgets are unchanged, the deferred campaigns stay stopped, and the rollback report's acceptance is still pending. **At the owner's request, the architect explored moving `xy()`'s previous geometry into `RectIndex`** in [`xy-held-geometry-proposal.md`](xy-held-geometry-proposal.md) at `61f883d09`, which `drag/rect-index-ownership` fast-forwarded to, with the prototype in [`probes/xy-held-geometry/`](probes/xy-held-geometry/README.md). It recommends VX: `xy()` constructs a `RetainingRectIndex`, a subclass in `rect-index.ts` that keeps each slot's left and top across one rebuild in a private `number[]`, and `xy()` keeps its rule and owns no geometry array. "sortable + y", "complete" and the seven control rows read 0 B, and "sortable + xy" +30 B Brotli. Its timing check is prepared and waits for the owner's hold. Nothing is adopted, no decision is recorded, and budgets are unchanged. **At the owner's request, the final VX patch is applied to `src/sortable/rect-index.ts` and `src/sortable/xy.ts` as provisional source for inspection.** It stays provisional until the owner decides, and is reverted if VX isn't adopted. **The owner accepted VX on 2026-11-13, on the condition that the field types are narrowed in both classes.** `DRD-62` records it. `at` accepts the six geometry fields. `retained`, the constructor's `axis` and `#axis` accept only `LEFT` or `TOP`. The narrowing changes no emitted JavaScript, and a compile-time test checks it. Speed is unmeasured, and no timing run or hold is requested. [`xy-held-geometry-handoff.md`](xy-held-geometry-handoff.md) is one unit from `f79f66fe2`'s source. It adds the narrowed types, the compile-time test and the flows as suite tests, each shown by its mutations, and reads the size. A fresh independent reviewer reads its report before the architect's final acceptance. Budgets are unchanged. **The unit landed at `b4117dae2` and reported at `7184d069c`, an independent review read it at `c4d02d45c`, and the architect accepted it on 2026-11-14** in [`xy-held-geometry-assessment.md`](xy-held-geometry-assessment.md) (§Disposition of the xy() held geometry report). The build's 60 `.js` and `.d.ts` files are byte-identical to `f79f66fe2`'s, one source map differs because it embeds the typed source, and every size row reads 0/0/0. The review's one finding, tier C, is that the report counted 64 files of Vite's cache as emitted files. The report is corrected in place, and its saved measurements aren't changed. `DRD-62` property 2 now names the base's `held === 0` exit. Speed is unmeasured, budgets are unchanged, and integration is the owner's. **On the owner's authorization, `main` was integrated after box-quad's pull request 16, at `6296b741a`** ([report](main-integration-report.md)). **The architect read the rollback's report there on 2026-11-14 and accepted it** (§Disposition of the mangling rollback report). Its readings describe `b8e37b37c`, before `DRD-61`, `DRD-62` and the integration. `DRF-24` to `DRF-37` and `DRF-39` are closed. `DRF-38` understated the base, and is widened to the 49 ESLint errors that every whole-package lint since has found. It stays open with `repo:RF-31`. The owner's rerun at commit A is accepted, and the failing test's dependence on elapsed time is `DRF-40`. **An independent feature proof read the rollback and the integration merge at `fdaab3781`, and the architect read it on 2026-11-14** (§Disposition of the rollback and integration reviews). `DRD-60` properties 1, 2 and 4 hold at `b8e37b37c`, and its one tier-C finding corrected a count in the report. The integration review found nothing. The record requires nothing more before the drag pull request, and that disposition lists what the owner decides. Budgets are unchanged, and the deferred campaigns stay stopped.

**Status, 2026-11-14, `drag/class-refactor`:** the owner's class refactor is an uncommitted snapshot from `5b581fbdf`. A [verification report](owner-refactor-verification-report.md) at `00fc1aa28` and an independent [feature proof](reviews/owner-class-refactor/proof-reviewer.md) at `b4bca69f7` read it. The proof's six findings are confirmed (§Disposition of the owner's class refactor review). `DRD-63` adopts the conversions in form, and states what they must meet. [`owner-class-refactor-handoff.md`](owner-class-refactor-handoff.md) remediates them. The refactor isn't accepted before that unit, its independent recheck and the owner's reading of the costs. Under Q1's default, the implementer committed the snapshot as `d1df32018` and remediated it to `42f42a164`, and reported at `6ec32ad06`. An independent [recheck](reviews/owner-class-refactor-remediation/recheck-reviewer.md) at `8a4548e96` found every item met, with one finding, `class-refactor-recheck-1`. The architect confirmed it and revised `DRD-63` property 2 (§Disposition of the class refactor remediation and its recheck). [`class-refactor-receiver-handoff.md`](class-refactor-receiver-handoff.md) is the last unit before acceptance, and the owner's answer to Q4 is still owed. **2026-11-15:** the follow-up implemented the revision at `c9e728bad` and reported at `f6b4bdf4c`, and an independent [recheck](reviews/class-refactor-receiver/recheck-reviewer.md) at `cb24e927e` found no finding. The owner accepted the costs at the end (Q4). **`DRD-63` is implemented and the refactor is accepted at `c9e728bad`** (§Disposition of the receiver follow-up, and acceptance of the class refactor). The pull request is the owner's.

**Status, 2026-11-15, `drag2/removal`:** the owner retired drag2 (`DRO-17`). The architect compared it with drag at `0870abd75` in [`drag2-retirement-assessment.md`](drag2-retirement-assessment.md). `DRD-64` deletes drag2 and carries over its stories, the resolver (`repo:RD-5`) and two accessibility conclusions. [`drag2-retirement-handoff.md`](drag2-retirement-handoff.md) implements that, with the repair of `DRF-43`. The comparison also found 18 guarantees that drag implements and only drag2 tested (`DRF-45`), and [`drag2-guarantees-handoff.md`](drag2-guarantees-handoff.md) adds the drag tests for them. `DRF-44` is closed by decision. Neither unit has started. **2026-11-15:** the retirement unit landed at `aa68dae08` to `5c1ce7bfe` and reported at `a5f028959`. An independent [feature proof](reviews/drag2-retirement/proof-reviewer.md) at `b02f97d44` found that it meets `DRD-64`, `DRF-43` and `repo:RD-5`, with one tier-C finding. The owner answered that finding and the report's open items, and **the architect accepted the retirement** (§Disposition of the drag2 retirement review). `DRF-43` is closed. `DRO-18` records that WebKit runs in CI and not locally, and no CI job runs it yet. The guarantees unit (`DRF-45`) is next. **2026-11-15:** that unit stopped on S2's rotate case and a margin fixture. `DRD-65` states `y()`'s terms and precision, and `DRD-67` replaces `__DEV__` with test-side oracles. [`y-geometry-terms-handoff.md`](y-geometry-terms-handoff.md) implemented both and reported at `1c1e93bd9` with two stops, which the architect decided (§Disposition of the `y()` geometry terms report). `DRF-46` and `DRF-47` are closed. An independent [proof](reviews/drag2-guarantees/proof-reviewer.md) of both units at `1c1e93bd9` found `DRF-45` not yet proved (§Disposition of the guarantee tests proof). The owner stated `DRO-19`. [`drag2-guarantees-remediation-handoff.md`](drag2-guarantees-remediation-handoff.md) is next. It folds in the unrouted `y-geometry-terms-follow-up-handoff.md`. **2026-11-15:** the remediation landed at `cc3b839f9` and was rechecked at `349616213` with no finding. `DRF-45` is closed, and the branch is ready for its pull request (§`drag2/removal` at its pull request).

**Status, 2026-11-15, `drag/size-acceptance`:** from `3228d1f07`, the squash merge of #24. **The owner accepted drag's current size,** which answers `DRO-4`'s size re-base, and accepted `DRO-10`'s excess and the costs no approval covers, with nothing removed. **Until release, the size ceilings follow the code** (`DRO-20`): `DRD-68` moves every ceiling and the control to its reading at `988643dc9`, and each change the owner approves moves them again. `988643dc9` is the owner's source edit (`DRO-21`): fields read directly in the loops, the controllers' members declared as methods, and no guarantee about calling a member detached. `DRD-69` adopts it and drops the built-ins' receiver checks, and the contract is amended. The prototype arm retires (`DRO-5`). The owner also asked for a cleanup of `DRF-15`, `DRF-17`, `DRF-18`, `DRF-21` and `DRF-42`, and each is repaired. [`size-acceptance-cleanup-handoff.md`](size-acceptance-cleanup-handoff.md) implements all of it (§Disposition of the size acceptance). `Landing`'s shape is the next question, for later. Release isn't in scope: it comes after documentation, examples and CI.

**Status, 2026-11-15, `drag/size-acceptance` at `7f963e54a`:** the cleanup landed at `e9ca3732f` (item 1) and `a3423c793` (items 2 to 10), with no stop, and [reported](size-acceptance-cleanup-report.md) at `7f963e54a`. **The architect accepted it without an independent review** (§Disposition of the size acceptance cleanup report). `DRD-68` is implemented, and the final re-measure moved no row. `DRF-15`, `DRF-17`, `DRF-18`, `DRF-21` and `DRF-42` are closed at `a3423c793`. `DRD-69` is implemented apart from one site its property 4 covers and its list left out: `SortableBehavior.invalidate`'s `this`. Property 4 now names it. [`size-acceptance-follow-up-handoff.md`](size-acceptance-follow-up-handoff.md) removes it and corrects `bench/lab.ts`'s comment on the arms. **2026-11-15:** that unit landed at `7763a67a1` and reported at `db76672a3`, and the architect accepted it (§Disposition of the size acceptance follow-up report). `DRD-69` is implemented in full. The branch is ready for its pull request (§`drag/size-acceptance` at its pull request).

**Neither the prototype's approval nor the 2026-11-06 reading established a performance result.** `DRD-13` and `DRD-22` say what does.

## Decisions

The decisions are in [`decisions/`](decisions/), one file each, named by the identifier.

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

**Replaced on 2026-11-13** by §Disposition of the mangling deferral. `DRD-59` is withdrawn, and its handoff doesn't run.

## Disposition of the mangling deferral

On 2026-11-13 the owner stopped the mangling and layout exploration and deferred property mangling, because its measured savings don't justify its complexity. `DRD-60` records it. Read at `690769539` on `drag/size`, merged into `drag/mangle-remediation` at `a9da5a563`.

| Item | Disposition |
| --- | --- |
| `DRF-24` to `DRF-37` | Moot: the publication pipeline and the test they concern go. They close when the architect accepts the rollback's report |
| `DRF-39`, registered as `DRF-38` at `1c99666f2` | Moot: the publication isn't minified. It closes on the same report, with the consumer project at 326 of 326 |
| `DRO-16` | Withdrawn. No option is taken |
| [`publication-build-handoff.md`](publication-build-handoff.md) | Withdrawn with `DRD-59`. It doesn't run |
| [`publication-build-proposal.md`](publication-build-proposal.md), [`unit-layout-exploration.md`](unit-layout-exploration.md), [`property-mangling-exploration.md`](property-mangling-exploration.md), and their probes and readings | Kept unchanged as evidence, apart from a status line at the top of each |
| The owner's proposals S1 to S4 | Not decided here. S3 has no marker left to state |
| `DRF-38`, the baseline lint error, and `repo:RF-31`, the baseline typecheck error | Not this unit's. They stay open on their own cleanup units, and the rollback's acceptance closes neither. The rollback records both at its base and reports them apart from any new error |

**Next:** [`mangle-rollback-handoff.md`](mangle-rollback-handoff.md), one implementer unit.

## Disposition of the slot array report

The [report](slot-array-report.md) at `690769539`, read by the architect on 2026-11-13. The implementation is `5ec3b4b2d`. The architect read its diff and the saved evidence and didn't repeat the report's runs. The one check the architect ran was a scratch revert of `b50204f66`, for the mangling revert (`DRD-58` §Result).

| Item | Result |
| --- | --- |
| The return at `b66a9bf6d` | Kept as history. The handoff at `8f18d2f67` said to keep the old browser builds, but its command, `npx playwright install` without `PLAYWRIGHT_SKIP_BROWSER_GC=1`, removed them together with WebKit's unpacked libraries and `webkit-env.sh`. **That was the architect's error.** The owner's amendment at `706b91481` replaced the browser requirements, so nothing is restored. A later handoff that installs browsers and has to keep the old builds names the variable |
| Items 1 to 5 | Accepted. No return condition was met, and the tool list is identical at the base and at the end |
| Properties 1 to 7 | Hold in `5ec3b4b2d`'s diff. `#values` is `readonly number[] = []`. Its one growth site is `_collect`'s append loop, up to `n * STRIDE`, and nothing assigns its `length`. Every `_measure` range ends at or below `_count`. The architect's own reading of the write and read sites agrees with the report's §Property 2. `capacityFor` and `#capacity` are gone. The fixed-size buffers and `xy.ts`'s `before` are unchanged |
| Property 9 | Accepted. The architect compared the saved base and end verdict lists, and they differ only in line numbers. The saved outputs show the copy mutation failing W7's identity assertion for `y()` ("expected 2 to be 1") and `xy()` ("expected 3 to be 1"), and M8 failing W8 (119.94 against 80) |
| Property 8 | Accepted from the saved evidence. The `.d.ts` diff is the one `settle` line, the map is byte-identical, and `typedoc` gives the same two warnings |
| Size | Accepted. The architect compared the saved base and end rows: only the three `sortable` rows changed. Nothing goes to `DRO-4` |
| Allocation | Accepted as reported, and not rerun |
| Firefox and WebKit | Not run, on the owner's direction. Deferred to the owner's planned CI |
| ESLint, `tests/displacement-sink.browser.test.ts:57` | The same error at the base and at the end, on a line the unit didn't change. Registered as `DRF-38` |
| `npx just typecheck` | Exits 1 at the base and at the end, on `.scripts/tsdown-library.ts(53,11)`. `packages/drag` has no error of its own. Registered as `repo:RF-31` |

**Recorded:**

- `DRD-58`'s result, with what the owner's mangling revert keeps;
- `DRF-38`;
- `repo:RF-31`.

**Next:** none for `DRD-58`. `DRF-38` and `repo:RF-31` go to cleanup units that the owner starts. `DRD-57`'s status row still reads "Not implemented". Its result was never recorded, and this disposition doesn't record it.

## Disposition of the RectIndex access report

The [report](rect-index-access-report.md) at `f788b2b80`, read by the architect on 2026-11-13 in [`rect-index-access-assessment.md`](rect-index-access-assessment.md). The implementation is `010a9ef39`. The architect read its diff against the reference patch and the saved evidence, and reran nothing.

| Item | Disposition |
| --- | --- |
| Item 1, the base | Accepted. `2e47e7afe`'s `src`, `tests` and `bench` equal `8904947f6`'s, and the tools are identical at both ends |
| Items 2 and 3, `DRD-61` properties 1 to 9 | Accepted. Five differences from the reference patch, all accepted. One of them corrects the architect's patch: the held placeholder x is two numbers, as properties 1 and 9 say, not a tuple (assessment §2) |
| Item 4, W7, W8 and the mutations | Accepted. Only the two W7 titles change. M7a, M7b, M8 and the axis mutation each fail what item 4 names |
| Item 5, the publication | Accepted. Only `sortable/axis.d.ts` differs, and `typedoc` warns as at the base |
| Item 6, size | Accepted. −31, +22 and −92 B Brotli on the `sortable` rows, as `DRD-61` recorded, with the controls at 0/0/0 and no verdict change. Nothing goes to `DRO-4` |
| Item 6, allocation | Accepted as bytes allocated: reductions per `y()` sample, per cold committed move and per drop with a sink, and no difference per `xy()` sample or per warm move. No speed is inferred from them |
| Item 7, timing | Accepted. "No difference shown" in all three cases, under the hold, on the first attempt. Inconclusive, so a speed change in either direction is unmeasured. Nothing goes to the owner |
| The report's §Wording for the architect | **Accepted.** `DRD-61` property 11 and the handoff's item 7 are corrected in place: the A/A threshold is the rule's threshold, not a limit on a slowdown the check could have missed. The verdicts and the rule don't change (assessment §3.2) |
| Lint and typecheck | The base's 49 ESLint errors and `repo:RF-31`, with nothing new and nothing repaired. `DRF-38`'s line moves from 57 to 53 |

**Recorded:** `DRD-61`'s result and the correction of its property 11, and the handoff's corrected item 7.

**Not decided here:** `DRD-52`'s result and `performance-plan.md`'s P4 summary of the size pass unit describe their timing as not excluding "a slowdown below" the A/A bounds, which implies the same limit. They are left as they are, for the owner (assessment §3.2). `DRF-38`'s scope, `repo:RF-31`, `DRO-4`'s re-base and the rollback report's acceptance stay separate. Budgets are unchanged, and the deferred campaigns stay stopped. **Since then,** the owner directed both wording corrections, and they are made (§Disposition of the RectIndex access review).

## Disposition of the RectIndex access review

The independent [feature proof](reviews/rect-index-access/proof-reviewer.md) at `bdb2c73c8`, which read `2e47e7afe..f788b2b80` and ran its checks at `30bf21e6e`, whose `src` and `tests` equal `010a9ef39`'s. Read by the architect on 2026-11-13 in [`rect-index-access-assessment.md`](rect-index-access-assessment.md) §7, against `DRD-61` and the assessment at `30bf21e6e`. The architect used the saved evidence and the review's probes, and reran nothing.

| Item | Decision |
| --- | --- |
| `reviewer-1`, the source-only list's comment | **Accepted, tier C.** `tests/displacement-sink.browser.test.ts` stays on `DRAG_SOURCE_ONLY_BROWSER_TESTS`, because it reads `report` and `displaced`, which only the unpublished installer types declare. The comment's reasons, `settle`, `STRIDE` and `TOP`, are out of date. **Follow-up:** the one comment, in the [handoff](rect-index-access-handoff.md) §Follow-up after the independent review. No finding is registered, because the follow-up carries it |
| `reviewer-2`, property 3's "allocate nothing" | **Accepted, tier C. `DRD-61` property 3 is corrected in place** to the source reading it meant: `at` and `item` construct nothing. The report's "Yes" holds under it. The bytes the per-drop probe attributes to `at` stay in the allocation record as a reading whose cause isn't established. `DRD-50`'s amendment by `DRD-61` said "allocate nothing" in the same sense, and is corrected the same way. No probe is opened for the cause (assessment §7.2) |
| `reviewer-3`, W8's settled-top assertion | **Accepted, tier C. `DRD-61` property 10 is corrected in place:** W8's gap assertion observes the index's settled value, and M8 is attributed to it. The settled-top assertion checks the sink. No test changes (assessment §7.3) |
| The review's §Timing evidence | Agrees with the assessment's §3. The three verdicts stand as recorded. The review's sign-test spans hold only if the rounds are independent, which one unpinned process doesn't establish. They stay in the review as its reading, and no record turns them into a bound |
| The review's baseline, size and allocation results | Agree with the assessment. Nothing changes |
| `DRD-52`'s result and `performance-plan.md`'s P4 summary | **Corrected on the owner's direction,** as the assessment's §3.2 described. "No difference shown" is inconclusive, and the A/A bounds don't limit a slowdown. The verdicts and bounds don't change (assessment §7.4) |

**Recorded:** the corrections of `DRD-61` properties 3 and 10, of `DRD-50`'s amendment by `DRD-61`, and of `DRD-52`'s timing result. The P4 summary's correction. The follow-up item.

**Next:** the follow-up after the independent review, one implementer item, when the owner starts it. `DRD-61`'s acceptance stands. `DRF-38`'s scope, `repo:RF-31`, `DRO-4`'s re-base and the rollback report's acceptance stay separate. Budgets are unchanged, and the deferred campaigns stay stopped.

## Disposition of the xy() held geometry report

The [report](xy-held-geometry-report.md) at `7184d069c` and the independent [feature proof](reviews/xy-held-geometry/proof-reviewer.md) at `c4d02d45c`, which read and ran `7184d069c`. Read by the architect on 2026-11-14 in [`xy-held-geometry-assessment.md`](xy-held-geometry-assessment.md), against `DRD-62`. The implementation is `b4117dae2`. The architect used the saved evidence and the review's probes, and reran nothing.

| Item | Disposition |
| --- | --- |
| Item 1, the base | Accepted. `ae85d8f6a`'s `src`, `tests` and `bench` equal `f79f66fe2`'s, and the tools are identical at both ends |
| Items 2 and 3, properties 4 to 6 | Accepted. The `src` diff is the sketch, blob `b9234028e`. The declaration test differs from the sketch as the report lists, as item 3 asks. MT1 to MT3, and the review's RT1 and RT2, fail it |
| Item 4, property 7 | Accepted. The oracle reads layout offsets, not the index. MX1 to MX5, and the review's RB1 and RB2, fail what they name |
| Item 5, the publication | **Accepted, with the report corrected.** The build's 60 `.js` and `.d.ts` files are byte-identical. One source map, `sortable/rect-index.js.map`, differs, which property 5 doesn't cover. Every size row reads 0/0/0 |
| `reviewer-1`, Vite's cache counted as emitted files | **Accepted, tier C.** The report's 124 paths are the build's 60 and 64 files of Vite's dependency cache. **The report is corrected in place** to count and name only the build's output, and to state that it didn't compare source maps and that one differs. The saved measurements still read 124 and aren't changed. No source or test is implicated (assessment §4.1) |
| The review's `held === 0` note | **`DRD-62` property 2 is corrected in place** to name the base's exit. The source doesn't change (assessment §4.2) |
| The review's other notes and limits | The box path and the `count < held` side aren't witnessed, and are recorded as limits. The 98-character comment line isn't a finding, and isn't routed. No unit is opened (assessment §4.3) |
| Size, lint and typecheck | The base's six red rows, "complete" over by 110 B, the 49 ESLint errors with `DRF-38`'s line moved, and `repo:RF-31`. Nothing new, nothing repaired, and no budget change |
| Allocation and speed | Allocation stands as `DRD-62` §Costs reads it, and wasn't run again. Speed is unmeasured in both directions, including the polymorphism risk |

**Recorded:** `DRD-62`'s result and the correction of its property 2, and the report's corrected emitted-file passages.

**Next:** none for `DRD-62`. Integration and the pull request are the owner's. `DRF-38`'s scope, `repo:RF-31`, `DRO-4`'s re-base and the rollback report's acceptance stay separate. Budgets are unchanged, and the deferred campaigns stay stopped.

## Disposition of the mangling rollback report

The [report](mangle-rollback-report.md) at `8904947f6`, read by the architect on 2026-11-14 on `drag/size` at `6296b741a`, against `DRD-60` and its [handoff](mangle-rollback-handoff.md). The implementation is `cc752cc1b` (commit A) and `b8e37b37c` (commit B), from the base `7420cbb9a`, whose code is `690769539`'s. The architect read the saved evidence and reran none of the unit's checks. The architect's own checks were mechanical, at `6296b741a`: the tree state below and one whole-package lint ([output](measurements/2026-11-14-rollback-disposition-lint.txt)).

**The report's result is historical.** It describes `b8e37b37c`. Since then `DRD-61` (`010a9ef39`), `DRD-62` (`b4117dae2`) and the box-quad integration at `6296b741a` ([report](main-integration-report.md)) changed `src` and `tests`. So `DRD-60` property 1's comparison with `f7b7b300b^`, the `.js` and `.d.ts` comparisons and the size figures hold for `b8e37b37c` only. None of those later units' acceptances accepted the rollback, and this disposition accepts none of them again. **What still holds at `6296b741a`:** `build/` and `tests/publication.node.test.ts` don't exist; `tsdown.config.ts` and `tsconfig.json` are byte-identical to `f7b7b300b`'s; `src` and `bench` have no `\b_[A-Za-z]` name; and `tests` has only the five `_name` parameters that property 1 keeps.

| Item | Disposition |
| --- | --- |
| Tools, and item 1, the base | Accepted. The tool versions are the handoff's. The base's lint list is wider than the handoff expected (the lint row below) |
| Item 2, commit A | Accepted. The file list, the 27 byte-identical `.d.ts` files and the `.js` names check hold in the saved outputs |
| Commit A's consumer failure and the rerun | **Accepted as the owner's direction.** The first run met the handoff's return condition "a consumer test fails". The owner directed one rerun of the same command, on stated terms, in place of the return, and it passed 326 of 326. The rerun shows the failure isn't steady, and doesn't explain it. **It isn't attributed to the rollback:** commit A changes no path the test runs, the end passed 326 of 326 on its first run, and the same test failed once before, on 2026-11-09, at a tree without the rollback. Registered as `DRF-40`. It doesn't bear on `DRF-39`, which reads the end |
| Item 3, commit B | Accepted on the saved evidence: the marker search, the six-file `--stat`, the 95 changed lines equal to `5ec3b4b2d`'s, `DRD-58` §Result's types, and the probe's text. `lint-fix`'s `object-shorthand` restored the shorthand keys, not `fmt` as the handoff expected. The checks hold either way |
| Item 3.6, the `.js` lines | **Accepted, with the report corrected in place:** the saved output lists 10 lines in six files, not 11. `rect-index.ts`'s six restored keys are in `verifyEquivalence`, whose only call `define: { __DEV__: 'false' }` folds to dead code. The build drops the function, so no published line changes there |
| Item 4 | Accepted. The dry checks' outputs are byte-identical at the base and the end, no published file holds a marker, and the source maps hold as reported |
| Item 5, the suite | Accepted. The consumer project passes 326 of 326, including `DRF-39`'s two tests. The node project fails only the six size rows, and the five publication tests are gone |
| Item 5, the gate | Accepted. Every row grows by 35 to 144 B Brotli, none falls, and none exceeds the 160 B return condition. The verdicts go to `DRO-4` as a reading. No budget changes |
| Published size | Accepted as reported |
| **The baseline lint: 49 errors, not one** | **The discrepancy is the architect's.** `DRF-38` was registered from the slot array unit's lint of its five changed files, as if it were the whole package's. The report's 49 are the base's, unchanged at commit A and at the end, and no new error appeared. The independent review of `DRD-62` counted the same 49 at `f79f66fe2` and `7184d069c`, and the architect's run at `6296b741a` gives the same 49 by file and rule. **`DRF-38` is widened in place** to all 49, rather than a new finding. It stays open, and the rollback repairs none of it |
| The baseline typecheck | `repo:RF-31` only, unchanged at all three points. It stays open. At `6296b741a`, drag's typecheck also reports two TS2724 errors in `packages/drag2/src/kernel/presentation.ts`, from box-quad's removed factories, which `BQ-12` places outside its scope ([main integration report](main-integration-report.md)). They aren't the rollback's |
| The three extra ignored outputs in a fresh worktree | Accepted. A later handoff that runs the suite in a fresh worktree names them with the two it already names |
| **Independent proof** | **Missing for the rollback itself.** The reviews of `DRD-61` and `DRD-62` put it out of scope. Their own runs on trees that contain it corroborate item 5's consumer verdict and the baseline lint, and the architect's checks above cover the removals and the two configuration files. **Not covered independently:** property 1's comparison, property 2's publication comparison, property 4's dry checks and item 4's publication checks. **Routed** to one narrow `reviewer` feature proof ([handoff](mangle-rollback-handoff.md) §Independent review). The closures below don't depend on it |
| `DRF-24` to `DRF-37` | **Closed.** What each concerns is gone: the build step, its map, the generator and the publication test at `cc752cc1b`, and the marker at `b8e37b37c` (`DRF-32`). They are still gone at `6296b741a` |
| `DRF-39` | **Closed.** The publication isn't minified, and the consumer project passes 326 of 326 at `b8e37b37c` and in the independent run at `7184d069c` |
| `DRF-38` and `repo:RF-31` | Open, as `DRD-60` requires. `DRF-38` is widened |

**Recorded:**

- `DRD-60`'s result;
- the closure of `DRF-24` to `DRF-37` and `DRF-39`;
- `DRF-38`'s widening, and `DRF-40`;
- the rollback's verdicts in `DRO-4`;
- the report's corrected line count;
- [`mangle-rollback-handoff.md`](mangle-rollback-handoff.md) §Independent review.

**Before the drag pull request,** the record requires:

1. **The independent feature proof** of the rollback, and the architect's reading of it. A defect it finds is decided before the pull request.

**The owner decides,** and the record doesn't:

2. whether to merge with five red size rows and unchanged budgets. `DRO-4`'s re-base stays open, as it was when `drag/feature-composition` merged with red rows;
3. whether to merge with lint and typecheck exiting 1, on `DRF-38`, `repo:RF-31` and `BQ-12`'s two drag2 errors, or to run `DRF-38`'s cleanup unit first;
4. whether `DRF-40`'s repair comes first. Until then, a full run may fail that test again;
5. decisions 1 and 2 of [`combined-review-remediation-assessment.md`](combined-review-remediation-assessment.md) §5.2, which the record still doesn't answer.

The open findings the pull request carries are `DRF-15`, `DRF-17`, `DRF-18`, `DRF-21`, `DRF-38` and `DRF-40`. Its verification is Chromium only, and the speed of `DRD-61` and `DRD-62` is unmeasured.

**Next:** the independent feature proof, when the owner starts it. Budgets are unchanged, and the deferred campaigns stay stopped.

**Since then,** the proof ran and item 1 is met. §Disposition of the rollback and integration reviews replaces the list above.

## Disposition of the rollback and integration reviews

The independent [feature proof](reviews/mangle-rollback/proof-reviewer.md) at `fdaab3781`, which read `drag/size` at `55e109210` and the historical commits in detached scratch worktrees. Read by the architect on 2026-11-14 at `fdaab3781`, against `DRD-60`, [`mangle-rollback-handoff.md`](mangle-rollback-handoff.md) §Independent review and the [main integration report](main-integration-report.md). The architect used the review's saved outputs and probes, checked `rollback-reviewer-1`'s sum against the report's table, and reran nothing. `fdaab3781`'s code outside `.plan/` is `6296b741a`'s.

**The review has two scopes, with separate evidence and conclusions.** Neither result stands in for the other.

### The rollback: `DRD-60`'s independent proof

**Complete, with one tier-C finding.** Pinned to the base `7420cbb9a`, commit A `cc752cc1b`, commit B `b8e37b37c` and the report at `8904947f6`. The review built each commit in its own worktree, against that worktree's box-quad, and started no browser.

| Item | Disposition |
| --- | --- |
| Property 1, at `b8e37b37c` | Holds: the markers, the code tree against `f7b7b300b^`, `DRD-58`'s 95 lines, the probe file and `DRD-58` §Result's types. The rename is the marker reading and nothing else |
| Property 2 | Holds. `build/` is gone, and the two configuration files are `f7b7b300b`'s. The 27 `.d.ts` files at `b8e37b37c` are byte-identical to the base's. No published file holds a marker, and the source maps hold |
| Property 3, as §Independent review lists it | Holds |
| Property 4 | Holds. The dry outputs are byte-identical at the base and `b8e37b37c`. 13 entries apply, and the 10 that fail are `DRD-45` property 9's stale entries |
| The report's items 2 to 4 | Agree, apart from `rollback-reviewer-1`. The review's builds reproduce all 90 saved hashes at each of the three commits |
| `rollback-reviewer-1`, the interface-typed key count | **Accepted, tier C. The report is corrected in place.** §Commit B read "the 12 keys marked `*` belong to object literals typed by an interface". It now reads "the 9 keys marked `*` belong to object literals typed by an interface", with a note that quotes the old wording. The table marks 9, and 79 − 3 − 9 = 67, the handoff's count. The probe's output, its 13 `PropertyAssignment` nodes and the rename are unchanged. No source, test or decision is implicated, and no finding is registered |

**Two file counts, kept apart.** The build emits **90 files**: 33 `.js`, 30 `.js.map` and 27 `.d.ts`. The report's "90 published files" (items 1.5 and 2.3) and the three `-tree.sha256` files count those. `npm pack --dry-run` lists **92 paths**: the 90, with `README.md` and `package.json`. The review's "published file list" is the 92. Each list is the same at the base, A and B. The report's items enumerate what they count, so they aren't changed.

**Evidence limits:**

- the rename probe wasn't rerun, and its result was checked through the tree comparisons;
- the review read the A-to-B `.js` lines with a whole-file comparison and the report with its own probe. The two lists agree, and no third reading exists;
- no browser, suite, consumer project or size row is in this scope.

**`DRD-60`'s independent proof is complete,** and no defect returns the unit. **The proof is of `b8e37b37c`.** At `6296b741a`, only what §Disposition of the mangling rollback report checked again still holds: the removals, the two configuration files and the absence of markers.

### The main integration at `6296b741a`

**No finding.** The review compared every path with the merge base `0a28f909a` and both parents, `f0b66c2ec` and `7d8d7a805`.

- 852 paths were taken whole from the only side that changed them. The merge adds the integration report and its six measurements. Two paths needed reading.
- **`layout-animation.ts`,** the one conflict, keeps main's two lines and `DRD-61`'s change, and nothing else.
- **The test helper's `space()` migration** is two lines. It follows box-quad's API at `7d8d7a805`, and changes no assertion, fixture or routing.
- The integration report's claims agree.

**Focused checks, not whole ones:**

- Chromium, `browser` project, the four files that use `layoutAnimation` or the sink: 99 of 99;
- drag's typecheck: the three known errors;
- lint and format of the two edited files: `DRF-38`'s line 59 only.

**Evidence limits:**

- **No saved full suite is tied to `6296b741a`.** The integration's run, 747 of 752, recorded `f0b66c2ec` with `dirty: true`, the merge in progress. The five red size rows rest on that run's table, not on a build of the commit;
- whole-package lint, the consumer project, box-quad's suite, Firefox and WebKit weren't run.

**Recorded as reviewed, with a null result.** The integration decides nothing, as its report says, and this disposition accepts nothing outside the review's scope.

**Outside the merge, for information:** drag2's own typecheck fails against main's box-quad, with three `TS2724` errors for the removed factories and a `TS2322` at `tests/decisions.node.test.ts:740` that doesn't involve box-quad, besides `repo:RF-31`. Neither parent changed those drag2 files, and box-quad at the merge is main's, so main has the same errors. They aren't drag's, and this record registers nothing for them.

### Recorded

- the report's corrected count, with the old wording quoted;
- `DRD-60`'s independent proof, in its result and its status row;
- the integration review's null result;
- the findings' high-water mark, from `DRF-39` to `DRF-40`. `DRF-40` was registered at `55e109210` without moving it.

### Before the drag pull request

**The record requires nothing more.** Its one requirement, the independent proof, is met. What follows is the owner's.

**Current failing checks at the tip,** whose code is `6296b741a`'s:

- **`npx just test`:** five size rows, read on the integration's uncommitted tree. "draggable alone" is 50 B Brotli over, with its control moved by 165 B; "example: drop zone" 131 B; "freeDrag" 20 B; "freeDrag + bounds + landing" 206 B; "complete" 67 B;
- **`npx just lint`:** `DRF-38`'s 49 ESLint errors, all in `tests` and `bench`;
- **`npx just typecheck`:** `repo:RF-31`, and `BQ-12`'s two drag2 errors. The drag2 errors are on main already. `repo:RF-31` isn't: its inferred cause, the dependency update `31bac1381`, isn't an ancestor of `7d8d7a805`, so this pull request brings it to main.

**Decisions:**

1. **Size:** merge with the five red rows and unchanged budgets, as `drag/feature-composition` did, or order `DRO-4`'s re-base first. **Recommendation: merge with them red.** A re-base moves the ceilings to sizes that include the costs in the historical list below, so those come first ([`combined-review-remediation-assessment.md`](combined-review-remediation-assessment.md) §5.2).
2. **Lint and typecheck:** merge with both exiting 1, or run `DRF-38`'s cleanup unit first. Only the lint errors are drag's code. The typecheck errors are a shared script's and drag2's, and no drag unit repairs them.
3. **`DRF-40`:** repair it first, or merge with it open. It doesn't fail at the tip. It failed twice, each time under load, and may fail a full run again.
4. **The suite's evidence at the tip:** state in the pull request that no full run is tied to `6296b741a`, or have one full run made at the tip first.

**Historical costs, not failing checks:**

- **Open since 2026-11-10,** on code that is on main since `a9c323f6a`: decisions 1 and 2 of [`combined-review-remediation-assessment.md`](combined-review-remediation-assessment.md) §5.2, `DRO-10`'s excess and the reported costs no approval covers. They don't gate this merge. They come before the re-base;
- **Already approved or weighed, nothing to decide:** `DRD-47`'s, `DRD-48`'s and `DRD-49`'s bytes; the rollback's growth, which the owner weighed in `DRD-60`; `DRD-61`'s size, which sent nothing to `DRO-4`; `DRD-62`'s 0 B; the integration changes no budget;
- **Unmeasured, not a cost:** the speed of `DRD-61` and `DRD-62`. The verification is Chromium only.

**Defaults in force, not before the pull request:** `DRO-1`, `DRO-2` and `DRO-11` keep their defaults, unanswered. `DRO-3` is owed before a release, not a merge.

**The open findings the pull request carries:** `DRF-15`, `DRF-17`, `DRF-18`, `DRF-21`, `DRF-38` and `DRF-40`.

**Next:** none from the record. The pull request and the four decisions are the owner's. Budgets are unchanged, and the deferred campaigns stay stopped.

**Since then,** the owner ran `DRF-38`'s cleanup unit, with `repo:RF-31` and `DRF-40`. §Disposition of the final cleanup answers decisions 1 to 4 and replaces the failing checks and the open findings above.

## Disposition of the final cleanup

The [report](final-cleanup-report.md) at `e0e4cee55`, on the implementation at `27c60a9ac` from `f9e56fe7d`, and its independent [feature proof](reviews/final-cleanup/proof-reviewer.md) at `ea706c49d`. Read by the architect on 2026-11-14 at `ea706c49d`, against `DRF-38`, `DRF-40` and `repo:RF-31`. The owner approved the cleanup on 2026-11-14. `ea706c49d`'s code outside `packages/drag/.plan/` is `27c60a9ac`'s, by the architect's `git diff`.

The architect reused the proof's saved outputs and probes, and ran one check: both plugin packages' lint ([output](measurements/2026-11-14-final-cleanup-disposition-plugin-lint.txt)). It settles a line that the proof's saved output drops (§The report's claims).

**The implementation at `27c60a9ac` is accepted.** `DRF-38`, `DRF-40` and `repo:RF-31` close. Both of the proof's tier-C findings are accepted. One correction is routed, and one older gap is registered.

### `drag:DRF-38`: closed

| Required property | Evidence | Holds |
| --- | --- | --- |
| Lint exits 0 | The report's output and the proof's run. The diff adds no disable comment, `@ts-ignore`, `@ts-expect-error`, `as any` or `as unknown`, and changes no lint, `tsconfig`, package or lock file | Yes |
| Each `@ts-expect-error` still fails without its directive, for its comment's reason | The proof's directives probe: 37 and 13 directives at both commits, each error on the line after its directive. The sequences of codes and messages are identical. No directive is unused, and no other error appears except drag2's two `TS2724`. Making the receiver `Holder` gives the same `TS2345` in the old inline step and in `unknownReceiverStep` | Yes |
| A heap count runs after the reference that the test drops before it | Both tests hold the controller only in an inner function's frame. Kept in the test's frame, both fail at the class count (the proof's rows 1 and 2, and the report's matrix). Without the drop, `f9e56fe7d`'s tests fail | Yes |
| `bench/compare.ts` produces the same injections and output | The per-entry dry checks below. The injection definitions lie outside the diff's two hunks. Under `--dry`, neither changed function runs, and `coreSets` gives the same JSON on this machine's sysfs and on a fixture | Yes |

**The per-entry dry checks.** The report's dry runs stop at the third entry of each mode, so they exercise only the first two `--prove` and the first two `--floors` entries. The proof ran each of the 23 entries alone, with `--dry --only <name>`, once with `f9e56fe7d`'s `compare.ts` and once with `27c60a9ac`'s. The two outputs are identical ([comparison](reviews/final-cleanup/proof-reviewer-probes/dry-compare.txt), [`f9e56fe7d`](reviews/final-cleanup/proof-reviewer-probes/dry-head.txt), [`27c60a9ac`](reviews/final-cleanup/proof-reviewer-probes/dry-new.txt)):

| Mode | Applies (exit 0) | Doesn't apply (exit 1) |
| --- | --- | --- |
| `--prove`, 9 entries | about 1 ms of script per cycle, at the drop; one object of about 1 KB retained per operation past destruction; 1 KB allocated per move; one entry on the step list per frame; an array of four numbers per sample, in `Gesture.enter`; 300 µs of script per cycle, in the page | one forced layout per move; one O(n) walk per move; 30 µs of script per move, in the page |
| `--floors`, 14 entries | 300 µs and 100 µs of script per cycle, at the drop; one object with two number properties per sample, in `Session`'s `#move`; one object with two number properties retained per operation; 300 µs, 100 µs and 30 µs of script per cycle, in the page | 100 µs, 30 µs and 10 µs of script per move; 30 µs, 10 µs, 5 µs and 2 µs of script per move, in the page |

That is 13 that apply and 10 that don't. The 10 fail with the same message at both commits: "injection does not apply in sortable/operation.ts: `this.#lift.translate(drag.x - drag.originX, drag.y - drag.originY);`". They are `DRD-45` property 9's stale entries, and this unit didn't change them.

### `final-cleanup-reviewer-1` → `DRF-41`

**Accepted, tier C.** The comment at `tests/destruction.browser.test.ts:411` to `:412` says the controller keeps `behavior` reachable, and the proof's rows 3 and 4 show the object's release follows the test's variable.

**The minimal correction:** replace the comment with one that states what the read does. The callback captures the variable, not the object, so the object's release follows the variable, which the test clears after destruction, and not the controller's release. Nothing else changes: not the read, the assignment, an assertion or the title.

- **Not deletion:** with no comment, the read and the test's title still suggest that the sentinel checks the controller's release.
- **Not the sentinel's repair:** that changes what the test asserts, so it is `DRF-42`.

**Routed** to [`heap-comment-handoff.md`](heap-comment-handoff.md). `DRF-38`'s required property doesn't depend on a comment, so `DRF-38` closes with `DRF-41` open.

### The behavior sentinel → `DRF-42`

The proof's §Observation outside the change. **Registered, not treated as repaired.** The sentinel has been unable to detect a retained callback since `a9c323f6a`. `27c60a9ac` moved the controller into an inner function and left the sentinel's object, its variable and `behavior = null` as they were, so its verdict still follows the variable (the proof's rows 3 and 4). `DRF-38` barred changing what a test asserts, so the cleanup couldn't repair it, and accepting the cleanup doesn't. Routed to a drag test unit, which the owner starts. It doesn't gate the pull request.

### `drag:DRF-40`: closed

| Required property | Evidence |
| --- | --- |
| The verdict doesn't depend on how long the grab takes | The proof: 1 s between the release and the pause, and 2 s between the read and the grab, pass in both cases. The report: a 1 s wait passes 4 of 4, and fails `f9e56fe7d`'s rejected case by 4.72 px |
| It fails when activation cancels the landing before it measures | The report's M1, and the proof's independent mutation: 5 px and 45 px off, in both cases |
| It fails when activation measures without the landing's current offset | The report's M2, and the proof's independent mutation, which measures with every animation moved past its end: 5 px and 45 px off, in both cases |

- **What is unchanged:** the duration, the easing, the 1 px tolerance, both assertions and both cases. The test asserts that the landing exists at the grab.
- **The pause doesn't change the path under test:** `Lifter.acquire` reads the visual's rect before it writes anything, cancels the landing in its `finally`, and reads no play state. That a paused landing presents the same state as a playing one within one synchronous call is the proof's reasoning, not a measurement.
- **Evidence limits:** Chromium. The report's matrix covers the `browser` and `consumer` projects for its own mutations, and the proof's covers the `browser` project only.

### `repo:RF-31`: closed

The cause, the fix and the boundary of what its check guarantees are in [`repo:RF-31`](../../../.plan/00-index.md). In short: the required property holds at `27c60a9ac`. Every consumer typechecks apart from the expected drag2 errors, nothing is cast, and the emitted JavaScript is unchanged. `@ydinjs/vite-traits-plugin`'s `index.d.ts` declares the intersection, which is assignable to Vite's `Plugin`.

**`final-cleanup-reviewer-2`: accepted, tier C, recorded in `repo:RF-31` beside P7.** The check can't see a hook's use of a Vite-only context member such as `this.environment`. No form of the check catches that in a program that loads Vite's types. What makes the current hooks compatible is the proof's audit of every implemented hook at `27c60a9ac`, not the check. **The report is corrected in place** (§The report's claims).

### The report's claims

They agree with the proof, apart from these:

- **§`repo:RF-31`'s description of the check: corrected in place.** It said that assigning to the intersection "checks every implemented hook against Rolldown's signature", that an unacceptable transform result fails (P6), and it named P7 as the one limit. P6 doesn't separate the intersection from Vite's type, which rejects it too. The check also misses a hook's Vite-only context members. The report now says this, with a note that quotes the old wording.
- **"`--prove --dry` and `--floors --dry` give the same output":** true. Each run stops at its third entry, and the per-entry checks above cover the other entries. Not changed.
- **The plugin lint errors:** the report lists some of them, as it says. The proof adds five ESLint errors in `@ydinjs/vite-custom-element-assets`. **The proof's saved output** counts seven ESLint errors in that package and lists six: it drops `src/css/css.ts:31`, which its text names. The architect's run lists all seven. **Registered as [`repo:RF-32`](../../../.plan/00-index.md).** No line `27c60a9ac` changed carries one.

### Size, build, typecheck and the full suite

- **Size:** at `27c60a9ac` the `just size` table is byte-identical to the main integration's, and nothing that sets size changed. Five rows are red: "draggable alone" 50 B over, with its control moved by 165 B; "example: drop zone" 131 B; "freeDrag" 20 B; "freeDrag + bounds + landing" 206 B; and "complete" 67 B. **The owner accepts them with budgets unchanged** (`DRO-4`).
- **Build:** the report's hashes give 1,920 byte-identical files across the six tsdown consumers. The proof's emit comparison gives identical JavaScript for both edited plugin sources. Nothing was rebuilt in review.
- **Typecheck:** drag reports only drag2's two `TS2724`, from box-quad's removed factories (`BQ-12`). **By the owner's direction, they stay expected failures:** drag2 remains excluded and unsuppressed. drag2's own typecheck has its four known errors.
- **The full Chromium suite at `27c60a9ac`:** the status record ([size and status](measurements/2026-11-14-final-cleanup-size.txt)) gives revision `27c60a9ac` before and after, `git status` empty both times, `suite exit=1` and `size exit=1`. The [log](measurements/2026-11-14-final-cleanup-drag-suite.log) gives 56 files and 752 tests: 747 pass, and the 5 failures are the five size rows. "Type Errors" reports none. The run started at 09:25:59, 24 s after `27c60a9ac`'s commit time and before `e0e4cee55`. Its totals equal the main integration's.
- **The limits of that tie:**
  - the log carries no revision line, and the wrapper that wrote the status record isn't saved. The tie rests on the record, the timestamps and the counts;
  - the log isn't verbose, so it gives no per-project verdicts;
  - `just test` runs `vitest.config.ts`, whose browser projects are Chromium only. Firefox and WebKit didn't run, and no timing, allocation or campaign ran;
  - the proof didn't rerun the suite. Its unmutated focused runs of the three changed browser tests passed at identical code.

### Recorded

- `DRF-38`, `DRF-40` and `repo:RF-31` closed at `27c60a9ac`;
- `DRF-41` and `DRF-42` registered, and the high-water mark moved to `DRF-42`;
- `repo:RF-32` registered;
- the boundary of `repo:RF-31`'s check, beside P7;
- the report's §`repo:RF-31` corrected in place, with the old wording quoted;
- the owner's acceptance of the five size rows in `DRO-4`;
- [`heap-comment-handoff.md`](heap-comment-handoff.md).

### Before the drag pull request

**The record requires nothing more.** The four decisions of §Disposition of the rollback and integration reviews are answered:

1. **Size:** the owner accepts the five red rows with budgets unchanged. `DRO-4`'s re-base stays open;
2. **Lint and typecheck:** the cleanup ran first. drag's lint exits 0. drag's typecheck exits 1 on drag2's two `TS2724` only, which the owner keeps as expected failures;
3. **`DRF-40`:** repaired and closed;
4. **The suite's evidence:** one full Chromium run is tied to `27c60a9ac`, within the limits above. The pull request states them.

**Failing checks at the tip,** whose code is `27c60a9ac`'s: `npx just test` fails the five size rows, and `npx just typecheck` reports drag2's two `TS2724`. Both are accepted.

**The owner decides** whether `DRF-41`'s correction comes first. **Recommendation: yes.** It is a comment in a file this branch changes, the unit is bounded, and it owes no full suite. If it lands, the full suite stays tied to `27c60a9ac`, and the pull request says the later change is a comment, with its focused run.

**The open findings the pull request carries:** `DRF-15`, `DRF-17`, `DRF-18`, `DRF-21` and `DRF-42`, and `DRF-41` unless its unit runs first. `repo:RF-32` isn't drag's, and this branch doesn't change it.

**Historical costs, unchanged:** decisions 1 and 2 of [`combined-review-remediation-assessment.md`](combined-review-remediation-assessment.md) §5.2 and `DRO-10`'s excess stay open. They don't gate this merge, and they come before the re-base. `DRO-1`, `DRO-2` and `DRO-11` keep their defaults, and `DRO-3` is owed before a release.

**Next:** the owner's. `DRF-41`'s unit if the owner chooses it, then the pull request. Budgets are unchanged, and the deferred campaigns stay stopped.

**Since then,** the owner ran `DRF-41`'s unit first. §Disposition of the heap-comment correction closes `DRF-41` and replaces the open findings above.

## Disposition of the heap-comment correction

The [report](heap-comment-report.md) at `7021f1013`, on the comment change at `3c7028cc9` from the base `87c688fd3`. Read by the architect on 2026-11-14 at `7021f1013`, against `DRF-41` and [`heap-comment-handoff.md`](heap-comment-handoff.md). The architect read the diff and reused the report's checks. The architect's own checks were mechanical:

- `git diff 87c688fd3 7021f1013` outside `packages/drag/.plan/` changes only `tests/destruction.browser.test.ts`: one hunk, two comment lines removed and two added;
- the same comparison from `27c60a9ac` gives the same single hunk;
- `behavior = null` is at `:429`, below the comment;
- `npx just lint` on the test file exits 0.

| Handoff item | Disposition |
| --- | --- |
| Property 1, what the read does | Holds. The comment says that the callback captures the variable, not its object, and that clearing `behavior` below releases the object whether or not the controller is released |
| Property 2, agrees with the proof's rows 3 and 4 | Holds. It no longer says that the controller keeps the object reachable |
| Property 3, no bookkeeping | Holds. No finding id, review name or commit |
| Scope | Holds. The read, `behavior = null`, the `WeakRef` list, every assertion and the title are unchanged. `src` and `bench` are unchanged |
| Lint and typecheck | `npx just lint` exits 0. `npx just typecheck` reports only drag2's two `TS2724`, which are expected |
| The focused run | Chromium, `browser` project: the one test passes, with 22 skipped |

**`DRF-41` is closed at `3c7028cc9`.** The handoff used the suggested wording unchanged. `oxfmt` leaves the second line at 87 characters, and lint accepts it.

**What this doesn't change:**

- **`DRF-42` stays open.** The comment now describes the sentinel's limit, and the sentinel still can't detect a retained callback;
- **the full Chromium suite stays tied to `27c60a9ac`,** within the limits in §Disposition of the final cleanup. The tip's code differs from `27c60a9ac` only by these two comment lines, which execute nothing. No full suite ran at `3c7028cc9` or later, and the pull request says so.

**Before the drag pull request:** the record requires nothing more. The failing checks are those of §Disposition of the final cleanup, which the owner accepted: the five size rows and drag2's two `TS2724`. **The open findings the pull request carries** are `DRF-15`, `DRF-17`, `DRF-18`, `DRF-21` and `DRF-42`. `repo:RF-32` isn't drag's.

**Next:** the pull request, which is the owner's. Budgets are unchanged, and the deferred campaigns stay stopped.

## Disposition of the owner's class refactor review

**Inputs:**

- the owner's uncommitted snapshot on `drag/class-refactor`, whose diff against `5b581fbdf` has SHA-256 `019cd456…c508`;
- the [verification report](owner-refactor-verification-report.md) at `00fc1aa28`;
- the [feature proof](reviews/owner-class-refactor/proof-reviewer.md) at `b4bca69f7`.

Read by the architect on 2026-11-14. **The architect's own checks were mechanical:**

- the diff hash, the 16 file hashes and `git status --porcelain` still equal the saved input;
- each finding was read against the snapshot's source.

The reasoning is in the [assessment](owner-class-refactor-assessment.md).

| Finding | Tier | Disposition |
| --- | --- | --- |
| `class-refactor-reviewer-1`, published slot types refuse third-party objects | B | Confirmed. `DRD-63` property 1 restores the interfaces under `DRO-13` |
| `class-refactor-reviewer-2`, receiver declarations gone, the `DRD-35` declaration test fails | B | Confirmed. `DRD-63` property 2 declares `this` at all six sites |
| `class-refactor-reviewer-3`, `tsconfig.json` drops the probe, and lint fails | B | Confirmed. `DRD-60` property 2 already requires the line |
| `class-refactor-reviewer-4`, hoisted reads are back in the loops | C | Confirmed. On the owner's answer to Q2, `DRD-63` property 5 keeps the reads inline and the getters, and removes the false "read once" comments |
| `class-refactor-reviewer-5`, dev-only state is undeclared, or ships | C | Confirmed. `DRD-63` property 4 |
| `class-refactor-reviewer-6`, a fresh `MotionConstraint` doesn't clamp | C | Confirmed. `DRD-63` property 3 |

**Every finding goes to one remediation unit,** [`owner-class-refactor-handoff.md`](owner-class-refactor-handoff.md). None is registered as a `DRF`, because each one closes with that unit's recheck.

**The reports' other results are accepted as read:**

- equal behavior on the paths tested;
- release of every new object;
- box-quad's equivalence;
- sound arms;
- timing that is inconclusive;
- the allocation readings.

**The refactor isn't accepted.**

**The owner decides** (assessment §4):

- **Q1:** who commits the snapshot. By default, the implementer commits it verbatim as commit A;
- **Q2:** the hoisted reads. **Answered by the owner on 2026-11-14:** the reads stay inline, the getters stay, and the false "read once" comments go. The owner also withdrew a proposal to replace the getters with methods;
- **Q3:** confirm that `DRO-13`, the receiver guard and the probe's coverage stand. That is the default;
- **Q4,** after the recheck: the costs at the remediated end.

Q1 and Q3 don't block the unit, which builds their defaults. Q2's answer is in the handoff.

**Next:**

1. the `implementer` unit, which the owner starts;
2. a fresh `reviewer`'s recheck, scoped in the assessment's §5;
3. the architect's reading, and the owner's Q4.

No timing campaign is owed. Budgets are unchanged.

## Disposition of the class refactor remediation and its recheck

**Inputs:**

- the [remediation report](owner-class-refactor-report.md) at `6ec32ad06`, whose code equals `42f42a164`'s;
- the independent [recheck](reviews/owner-class-refactor-remediation/recheck-reviewer.md) at `8a4548e96`.

Read by the architect on 2026-11-14. The reasoning is in the [recheck assessment](class-refactor-recheck-assessment.md).

| Item | Disposition |
| --- | --- |
| `class-refactor-reviewer-1`, `-3`, `-4`, `-5`, `-6` | **Met** at `42f42a164`, with the witnesses the recheck reproduced. They close when the refactor is accepted |
| `class-refactor-reviewer-2` | Met as `DRD-63` property 2 was written. Stays open with `class-refactor-recheck-1` |
| `class-refactor-recheck-1`, a swapped receiver typechecks at sites 1 to 3 | Tier C. **Confirmed, and the narrowing isn't accepted.** `DRD-63` property 2 is revised in place: the declared receiver is the type the site reads the member through. [`class-refactor-receiver-handoff.md`](class-refactor-receiver-handoff.md) implements it, types only |
| Recheck qualification: the saved M1 diff doesn't apply at the end | **Accepted as a limit of the report's record.** Property 1's witness stands on the recheck's own M1 at the end, applied by content. The follow-up applies each mutation by content and saves its error |
| Recheck qualification: the Godbolt probe isn't in the repository | **The owner's answer to Q2 stands.** `DRD-63` property 5 now says that the probe's files weren't kept |

**The refactor isn't accepted.** **What it still needs:**

1. the receiver follow-up;
2. the architect's reading of the follow-up;
3. the owner's answer to Q4, on the end's costs in the assessment's §4. The follow-up must leave every emitted `.js` file unchanged, so those figures are final. The owner may answer Q4 before the follow-up ends.

Q3's defaults are built, and they stand unless the owner records otherwise. No timing campaign is owed. Budgets are unchanged.

## Disposition of the receiver follow-up, and acceptance of the class refactor

**Inputs:**

- the [receiver follow-up report](class-refactor-receiver-report.md) at `f6b4bdf4c`, on the unit's commit `c9e728bad`;
- the independent [recheck](reviews/class-refactor-receiver/recheck-reviewer.md) at `cb24e927e`, which read `f6b4bdf4c`.

Read by the architect on 2026-11-15. The architect repeated the recheck assessment §5's mechanical checks in two scratch trees: the appended cases, M7 through `tsc` and the `declaration` project, the six receiver removals, the recheck's probe, and the byte comparison of the builds against `42f42a164`. Each result reproduces the report and the recheck. The reasoning and the evidence are in the [acceptance assessment](class-refactor-acceptance-assessment.md).

| Item | Disposition |
| --- | --- |
| `class-refactor-recheck-1`, a swapped receiver typechecks at sites 1 to 3 | **Closed at `c9e728bad`.** `DRD-63` property 2 holds as revised. W1 to W3 fail on the receiver argument, and M7 makes each one an unused directive |
| `class-refactor-reviewer-2`, receiver declarations | **Closed at `c9e728bad`,** with `class-refactor-recheck-1` |
| `class-refactor-reviewer-1`, `-3`, `-4`, `-5`, `-6` | **Closed at `c9e728bad`.** Met at `42f42a164`, and the follow-up changes no emitted JavaScript |
| The import of `RectIndex` outside the appended block | **Accepted.** The handoff required the appended block only and a `RectIndex` imported from `src`, and lint refuses both an `import` inside the block and an `import()` type. The line changes no existing line, emits nothing, and isn't a case. The handoff's text was the defect. `DRD-63` doesn't change |
| Q4, the costs at the end | **Accepted by the owner,** with budgets unchanged and no speed claim. Recorded in `DRD-63` §Costs |
| Q3 | Its defaults stand. The owner recorded no other answer |
| The recheck's outstanding Q4 | Corrected by a dated note in the recheck's §Next |

**`DRD-63` is implemented, and the owner's class refactor is accepted at `c9e728bad`.** No finding is raised.

**Next:** the pull request, which is the owner's. It carries the failing checks that `5b581fbdf` already had: the five `drag:DRI-18` size rows and drag2's two `TS2724`. Firefox and WebKit didn't run on the refactor. Budgets are unchanged, and no timing campaign is owed.

## Disposition of the drag2 retirement review

**Inputs:**

- the [retirement report](drag2-retirement-report.md) at `a5f028959`, on the unit's commits `aa68dae08` to `5c1ce7bfe`;
- the independent [feature proof](reviews/drag2-retirement/proof-reviewer.md) at `b02f97d44`, which read `a5f028959`;
- the owner's answers of 2026-11-15, relayed by the coordinator.

Read by the architect on 2026-11-15. The architect checked the proof's evidence for its one finding (drag2's `makePlaceholder` at `0870abd75`, drag's `makePlaceholder` and the `.list .slot[data-drag-placeholder]` rule), the two `git grep` matches of open item 2, the commit order of `0870abd75..b02f97d44`, and that `.github/workflows/` holds only `docs.yml`.

| Item | Disposition |
| --- | --- |
| `proof-reviewer-1`, CustomPlaceholder doesn't keep drag2's placeholder look | Tier C. **Closed by the owner's answer: the new look is intended and stays.** A custom placeholder should look different from the default one, and in drag2 it barely did. `DRD-64` property 5 is clarified in place. No source change is owed |
| Report open item 1: item 5 is split over `63d56fd89` and `3a77addd8` | **Accepted as it is,** by the owner. Pull requests are squash-merged, so no commit on a work branch reaches `main`, and the merged commit deletes drag2 with its wiring. The handoff's one-commit property is met at the merge. The handoff carries a dated note |
| Report open item 2: item 5's grep list leaves the register sentences at `agent-workflow.md:86` and `review-findings.md:31` | **The implementation's reading is accepted,** by the owner: item 2 wins. The two sentences are the ones item 2 requires. The grep list was the handoff's defect, and the handoff carries a dated note. No document changes |
| Report open item 3: WebKit didn't run | **Not owed locally** (`DRO-18`). The unit's engine checks stand on Chromium and Firefox. No CI job runs WebKit yet (`DRO-18`) |
| Report open item 4: `compare.ts --prove --dry` fails | **Already recorded.** These are `DRD-45` property 9's stale entries, which fail the same way at `0870abd75`. They are repaired before any campaign on the current source, and no campaign is owed |
| Report open item 5: the five size rows and the moved control | **Already recorded** under `DRO-4`. Their inputs are unchanged by this range, and budgets are unchanged |
| Report open item 6: lint fixes in the unit's own new code | **Accepted.** The proof's lint run is clean on them |
| `DRF-43` | **Closed at `5c1ce7bfe`** (§Findings) |
| Proof: `--rejudge` now prints verdicts for the 12 recordings whose before arm is `before` or `base` | **Accepted.** That follows `DRD-64` property 4, and no line is removed |

**`DRD-64` properties 1 to 6 are implemented, and the retirement is accepted at `5c1ce7bfe`.** Its evidence limit is `DRO-18`'s: Chromium and Firefox only. No finding is raised.

**Next:** [`drag2-guarantees-handoff.md`](drag2-guarantees-handoff.md) (`DRF-45`, `DRD-64` property 7), for the implementer, from this record's commit on `drag2/removal`. Its checks now follow `DRO-18`, and its handoff carries a dated note. The pull request is the owner's.

## Disposition of the drag2 guarantees report

**Inputs:** the [guarantees report](drag2-guarantees-report.md) at `1a6551563`, on the unit's commits `b22d148db` to `1a6551563`, its stopped case and its saved mutations. The implementer's claims had not been verified by anyone.

Read by the architect on 2026-11-15, for the three items the coordinator asked about and the report's §For the architect. The architect reproduced the stopped case and the margin fixture in both builds ([probe](probes/drag2-guarantees/ruling/README.md)), and read `S6-7.diff`, `S6-8.diff` and `S10-2.diff` and the S10 tests at `tests/sortable.browser.test.ts:1250-1280`. The report's other rows are not assessed here.

| Item | Disposition |
| --- | --- |
| §Stopped, S2 under an authored `rotate` | **A wrong expectation in the test, and a precision the contract didn't state** (`DRF-46`). Not a drag defect. `DRD-65` states the precision and makes the instrument admit a tie, and the case returns to the suite. The development check's part is `DRD-66`'s |
| §For the architect, the block column with collapsing margins | **A contract gap** (`DRF-47`). The list is outside the rule, and the development check is right to refuse it. `DRD-65` states the term in `DRI-14` and adds the list and its remedy as self-checks. The `y.ts` comment is corrected in the handoff |
| §Unproven, S6's no-op clause | **Accepted as reported.** Three guards each stop a no-op for a reason of its own: the rule's `null`, the operation's `placeholderAt`, and the cache's unchanged-gap check. No single removal can be witnessed, and `S6-8`, which removes all three, is a mutation of the implementing code and fails `:166`. That meets `DRF-45`'s required property |
| §Unproven, S10's gap clause (`:1274`) | **Accepted as reported.** The clause holds because drag writes nothing on a row that a transition could animate and doesn't measure the dragged item, so there is no implementing code to remove. The test is a regression test, and `S10-2` shows that it can fail |
| §For the architect, F5's activation-time transform change not ported | **Accepted.** The F5 row doesn't state drag2's single-snapshot rule, and nothing is owed under `DRF-45` |
| §Notes, the session trailer in `b22d148db` and `302ba3bfc` | **Recorded, not rewritten.** No commit is rewritten without the owner's request |

**Next:** [`y-geometry-terms-handoff.md`](y-geometry-terms-handoff.md), for the implementer, from this record's commit on `drag2/removal`. `DRF-45` stays open until that unit reports, and until the guarantees unit has a proof.

**Corrected on 2026-11-15, on `proof-reviewer-1`** (§Disposition of the guarantee tests proof). The S6 row above relied on an inaccurate account of `S6-8`. `S6-8` removes the three guards and also adds a report for an empty span, and only that added report fails `:166`. With the three guards removed and nothing added, `:166` passes. The no-op clause holds because the report loop iterates the crossed span, and a no-op's span is empty. It is accepted on the same basis as S10's gap clause: no implementing code can be removed to fail it, and `S6-8` shows only that `:166` can fail.

## Disposition of the `y()` geometry terms report

**Inputs:** the [report](y-geometry-terms-report.md) at `1c1e93bd9`, on the unit's commits `b6fef26c4` and `953a0fcc6`. The coordinator had confirmed that `__DEV__` is gone from drag's `src`, `.scripts` and `tsdown.config.ts`. No one had verified the implementer's other claims.

Read by the architect on 2026-11-15, for the report's two stops and its open items. The architect checked the following ([probe](probes/y-geometry-terms-ruling/README.md)):

- re-ran `S2-tie-0` and `S2-tie-exact` in the consumer project, and `S2-tie-0` in the Chromium and Firefox source projects;
- reproduced the failure at `:266` in both projects, and ran the file with the consumer's keyframes held constant;
- confirmed that the built `sortable/y.js` keeps `y()`'s JSDoc.

The report's other claims, items 1 to 3 and their checks, are taken as reported and not proved here.

| Item | Disposition |
| --- | --- |
| §Stops, `S2-tie-0` passes | **Confirmed, and `DRD-65` property 5 was wrong** (amended). `S2-tie-0` passes 13 of 13 in the consumer project and 26 of 26 in the Chromium and Firefox source projects. `S2-tie-exact` fails the rotate case at `at 95: proposed 1, measured 2`. The instrument keeps `≤` at 1/8 px. `S2-tie-exact` is the lower witness, and no width fixture is owed |
| §Stops, `layout-animation.browser.test.ts:266` | **The fixture is wrong, and the oracle and the contract stand** (`DRD-67` §Property 7's stop). The consumer animation moves a row during the drag, which `DRI-14` puts outside the contract. The follow-up holds the row still and keeps the animation |
| §Item 1, `S2-instrument-tie` in place of `S2-instrument` | **Accepted.** The saved diff no longer applies, and the rewrite is the same mutation against the new instrument. It fails 4 |
| §Item 2, "byte-identical" | **Confirmed, and `DRD-65` property 6 was wrong** (amended). The emitted `.js` differs only in comments. Separately, the module comment of `src/sortable/y.ts` has one line of 132 characters (`:17`), which the follow-up rewraps |
| Open 1, `__DEV__` in the bench | **The define stays** (`DRD-67` property 2, amended). The bench builds earlier revisions, whose source reads it. The follow-up adds a comment at each site |
| Open 3, `DRF-46` and `DRF-47` | **Closed.** See each finding |
| Open 4, `953a0fcc6` repeats `f8d07e1c9`'s subject | **Recorded, not rewritten** |
| Open 5, the logs are filtered | **Accepted.** Each log keeps its failures and its summary line, which is what the witnesses cite |

**Next:** [`drag2-guarantees-remediation-handoff.md`](drag2-guarantees-remediation-handoff.md), for the implementer, from this record's commit on `drag2/removal`. `DRF-45` stays open until the guarantees unit has a proof.

## Disposition of the guarantee tests proof

**Inputs:** the independent [proof](reviews/drag2-guarantees/proof-reviewer.md) of the guarantees unit and the `y()` geometry terms unit, read at `1c1e93bd9` and committed at `02990b9f4`, with its [probes](reviews/drag2-guarantees/proof-reviewer-probes/README.md). It was read before the architect's rulings at `75611d3ae`.

Read by the architect on 2026-11-15. The architect confirmed these by reading the cited lines at `02990b9f4`:

- `S6-three-guards.diff` against `S6-8.diff`;
- `S2-3.diff` against the instrument's settling in `gap-conformance.ts`;
- `oracles.ts:255`'s `instanceof Event`, and the iframe test at `coordinates.browser.test.ts:333`;
- the F4 test at `free-drag.browser.test.ts:351`;
- `behavior.ts:117` and `:281`;
- the S4 fixture at `keyboard.browser.test.ts:60-66` and the region walk at `gesture.ts:80`;
- the F5 test at `coordinates.browser.test.ts:412`;
- the S1 test at `landing.browser.test.ts:618`;
- `consumer-types.node.test.ts:113`.

The reviewer's runs were not repeated. Each finding that owes work owes a witness in the remediation, and that witness confirms the two PLAUSIBLE findings or stops the unit.

**`DRF-45` stays open.** The remediation below owes the repairs. An independent recheck of them closes it.

| Finding | Disposition |
| --- | --- |
| `proof-reviewer-1`, S6's no-op clause | **Confirmed, and the earlier disposition is corrected** (note under §Disposition of the drag2 guarantees report). The clause holds by structure: a no-op's crossed span is empty. It is accepted as a regression test, on S10's basis. No work is owed |
| `proof-reviewer-2`, S2's displacement clause | **Confirmed.** Under `S2-3` the oracle fails only because its own fresh measurement is also unsettled. The live cache was predicted, so `y()` never measured a displaced row on that path, and the fixture doesn't exercise its clause. **Owed:** item 4 |
| `proof-reviewer-3`, the saved logs | **Confirmed.** The proof rests on logs from per-row trees, and some record the removed development check. **Owed:** item 5, a re-run at the remediation's tree |
| `proof-reviewer-4`, the refusal oracle and realms | **Confirmed, an implementation narrowing of `DRD-67` property 4** (clarified: an event of any realm counts). **Owed:** item 6 |
| `proof-reviewer-5`, F4's `null` | **Confirmed.** **Owed:** item 7 |
| `proof-reviewer-6`, S8's `box` over `visual` | **Plausible, and owed as a test with a witness:** item 8. The witness settles it |
| `proof-reviewer-7`, F8's per-entry resolution | **Plausible, and owed as a check with a witness:** item 9. The witness settles it |
| `proof-reviewer-8`, S4's marked region | **Confirmed.** **Owed:** item 10 |
| `proof-reviewer-9`, F5 passes with no activation | **Confirmed.** Cheap to close. **Owed:** item 11 |
| `proof-reviewer-10`, S1's outcome clause | **Confirmed.** The outcome is read before anything could change it, and no mutation fails the clause. **Owed:** item 12 |
| `proof-reviewer-11`, `F6-3` fails both clauses | **Accepted, no work.** `DRF-45` asks that the test fail under a mutation of the implementing code, and it does. The re-run log of item 5 names both failing assertions |
| `proof-reviewer-12`, a report line number | **Recorded.** Reports aren't rewritten. Item 5's logs carry the lines at the remediation's tree |
| §Survivors and stops | **Consistent with the rulings at `75611d3ae`.** The reviewer's field reading of stop 2 (`LEFT`, the consumer's `translateX` progressing) is the mechanism that `DRD-67` §Property 7's stop names |
| §Oracles against `DRD-67` | **Accepted.** Properties 3 to 5 hold, apart from `proof-reviewer-4` |

**One unit.** The unrouted [`y-geometry-terms-follow-up-handoff.md`](y-geometry-terms-follow-up-handoff.md) is folded into [`drag2-guarantees-remediation-handoff.md`](drag2-guarantees-remediation-handoff.md) as items 1 to 3, unchanged. Item 5 re-runs every witness at the tree that includes items 1 to 3, so one unit and one recheck cover both.

**Next:** [`drag2-guarantees-remediation-handoff.md`](drag2-guarantees-remediation-handoff.md), for the implementer, from this record's commit on `drag2/removal`. After it, an independent recheck of items 1 to 12 against `proof-reviewer-1` to `proof-reviewer-12`.

## Disposition of the guarantee tests remediation recheck

**Inputs:**

- the [remediation report](drag2-guarantees-remediation-report.md) at `349616213`, on `cc3b839f9`;
- the independent [recheck](reviews/drag2-guarantees/remediation-recheck-reviewer.md) of it, read at `349616213` and committed at `8424857df`, with its [probes](reviews/drag2-guarantees/remediation-recheck-reviewer-probes/README.md).

The recheck found all 12 of the proof's findings resolved and no new finding at any tier. It re-ran 10 witnesses, 2 unmutated baselines and 3 runs against the input's test files, in Chromium. The full suite, `test-engines`, typecheck, lint and the emitted-`.js` comparison come from the implementer's report alone.

Read by the architect on 2026-11-15. The architect read the change to `tests/y-geometry.browser.test.ts` at `349616213`, and ran nothing.

| Item | Disposition |
| --- | --- |
| The verdict | **Accepted. `DRF-45` is closed,** and with it `DRD-64` property 7 |
| Item 10's reading | **Accepted. The handoff's wording was wrong.** In `gesture.ts`, `subject` is `admission.handle ?? admission.item`, and the handoff meant the event's target, the first hop of the path. `S4-target-only` checks that hop only, and it fails `:225` and passes `:209`. That meets `proof-reviewer-8`'s required property. The handoff isn't rewritten |
| §Observation, the sub-pixel fixture runs only on the measured path | **Accepted as a recorded narrowing, and no work is owed.** Because the sweep invalidates before each sample, `:160` checks `y()`'s settling of displaced rows, which is the clause `proof-reviewer-2` found unwitnessed. It no longer checks the predicted chain under rounded rects. That chain is still checked with displacements running: in the `layout-animation` tests, under the oracle in the source and consumer projects (the recheck); and in `browser/firefox`, where every rect is in Gecko's own app units and the oracle runs on every `y()` drag (`DRD-67` property 3). Running the fixture both ways would be one more sweep, and it can be added if a later change touches the prediction's precision |

**Next:** §`drag2/removal` at its pull request, below, states what the branch delivers. The coordinator merges current `main` and, with the owner's approval, opens the pull request.

## `drag2/removal` at its pull request

**Stated on 2026-11-15 by the architect, at `8424857df` and this record's commit, before the merge of `main` at `dbdfaf80f`.** That merge brings only coordinator and handoff documentation. The pull request can cite this section.

### What the branch delivers

1. **drag2 is deleted, and drag takes its stories** (`DRO-17`, `DRD-64` properties 1 to 6, [handoff](drag2-retirement-handoff.md)).
   - drag2's stories, markup and stylesheet move into drag's stories (`src/sortable.stories.tsx`, `src/free-drag.stories.tsx`, `src/stories.module.css`). CustomPlaceholder's look differs, as the owner intends.
   - The record resolver is `repo:RD-5`.
   - Two accessibility conclusions are carried over.
   - drag's bench runs without drag2.
   - `DRF-43` is repaired.
   - Accepted on 2026-11-15 (§Disposition of the drag2 retirement review).
2. **drag's tests assert the 18 guarantees that only drag2's suite asserted** (`DRF-45`, `DRD-64` property 7). Each row's test fails under a mutation of the implementing code, logged at `cc3b839f9` under [`witnesses/`](probes/drag2-guarantees/witnesses/). Exceptions: S6's no-op clause and S10's gap clause hold by structure and are regression tests. Proved at `1c1e93bd9`, remediated, and rechecked at `349616213`.
3. **`y()`'s terms and precision are in the contract** (`DRD-65`, `DRF-46`, `DRF-47`).
   - `DRI-14` states that moving the placeholder moves only the items it crosses, by one distance.
   - A block column with margins that collapse on both sides of an item is outside that term, unless the placeholder has the items' margins.
   - `y()` predicts each center to within 1/16 px, so a pointer within 1/8 px of a tie may give either gap.
   - The gap instrument admits such a tie, and `y()`'s comments say the same.
   - No behavior changes.
4. **drag has no `__DEV__`, and its two instruments are test-side oracles** (`DRD-67`, `DRO-19`).
   - The equivalence check and the refusal count wrap `RectIndex` and `Gesture` from test support. They run against `src` in the source projects and against the emitted modules in the consumer project.
   - So the field-level check and `DRI-6`'s witness now cover the published build.
   - `src`, `tsdown.config.ts`, `.scripts/vite-config.ts` and `.scripts/vitest-config.ts` don't define `__DEV__`. The bench keeps the define only to build earlier revisions.
   - `DRI-6` no longer says that development builds count refusals.

**Public surface and shipped code.**

- **Public API:** no change.
- **Contract:** `DRI-14` gains the term and the precision, and `DRI-6` loses the development count ([change record](contract.md#change-record)).
- **Library code:** the code that `src` ships is unchanged. Against each unit's input, the emitted `.js` differs only in comments, and at the last unit it is byte-identical. The size table is unchanged, and so are its five failing rows (below).

### What is accepted

- `DRD-64`: properties 1 to 6 accepted after an independent proof at `b02f97d44`, and property 7 accepted on the recheck at `349616213`.
- `DRD-65` and `DRD-67`: implemented, proved at `1c1e93bd9` and accepted on the recheck. `DRD-67` property 4 is clarified (an event of any realm counts), and property 2 is amended (the bench's define), which the owner confirmed (`DRO-19`).
- `DRF-43`, `DRF-45`, `DRF-46` and `DRF-47`: closed. `DRF-44`: closed by decision.
- Every finding of the [retirement proof](reviews/drag2-retirement/proof-reviewer.md), the [guarantees proof](reviews/drag2-guarantees/proof-reviewer.md) and the [recheck](reviews/drag2-guarantees/remediation-recheck-reviewer.md): disposed of in the sections above.

### What stays open

- **The five `size.node.test.ts` ceiling rows fail:** complete, draggable alone, example drop zone, freeDrag, and freeDrag + bounds + landing. They failed before the branch, and the re-base is the owner's (`DRO-4`). `npx just test` therefore exits non-zero: 936 tests, 931 passed and 5 failed (the [remediation report](drag2-guarantees-remediation-report.md) §Checks).
- **WebKit didn't run** (`DRO-18`). Local runs cover Chromium and Firefox. No CI job runs drag's WebKit projects yet, so no run on this branch covers WebKit.
- **Findings open before the branch, unchanged by it:**
  - `DRF-15`, `DRF-17`, `DRF-18` and `DRF-42`, tier C;
  - `DRF-21`, tier B, in `bench/compare.ts`'s module attribution.
- **Owner decisions open before the branch, unchanged by it:** `DRO-10`'s excess and the costs that no approval covers ([`combined-review-remediation-assessment.md`](combined-review-remediation-assessment.md) §5.2).
- **Limits of the evidence:**
  - The recheck re-ran a subset in Chromium only.
  - The full suite, `npx just test-engines` (Chromium and Firefox: exit 0, 904 passed and 10 skipped), typecheck, lint and the emitted-`.js` comparison are the implementer's runs at `cc3b839f9`. They weren't repeated by a reviewer.
  - The sub-pixel fixture's narrowing is recorded above.
- **Couplings that `DRD-67` accepts:**
  - The oracles depend on drag's internal call protocol and on the emitted layout keeping `sortable/rect-index.js` and `kernel/gesture.js` as modules. A later publication that bundles or renames them decides again whether the consumer project keeps the oracles. The liveness tests fail loudly if either breaks.
  - Storybook no longer reports the development fault for a story outside `y()`'s rule.

## Disposition of the size acceptance

**Decided on 2026-11-15 by the architect, on `drag/size-acceptance` at `3228d1f07`, on the owner's direction** relayed by the coordinator. The owner accepted the current size and asked for a cleanup of the five findings that were open before `drag2/removal`. **Amended the same day at `988643dc9`,** on the owner's answers and the owner's source commit (`DRO-20`, `DRO-21`, `DRO-5`). Release is not in scope.

**The size.** `DRD-68`, as amended, moves every row's ceiling and the control to its reading at `988643dc9`. Until release, each change the owner approves moves them again (`DRO-20`). It answers `DRO-4`'s size re-base. The owner accepted decisions 1 and 2 of [`combined-review-remediation-assessment.md`](combined-review-remediation-assessment.md) §5.2, with nothing removed.

**The owner's commit.** `DRD-69` adopts `988643dc9` and applies `DRO-21`: no member carries a guarantee about its receiver, and no built-in declares `this` for a receiver check. The contract is amended in this record's commit. **Its loop change owes no `compare.ts` timing check:** the architect's [probe](probes/loop-field-reads/README.md) of two of its loops in Node's V8 shows no cost at about 1.5 ns per iteration (`DRD-69` §The loop change's cost).

**The prototype arm retires** (`DRO-5`). The figures already recorded stay as recorded.

**The findings.** All five are repaired in the same unit, [`size-acceptance-cleanup-handoff.md`](size-acceptance-cleanup-handoff.md). None closes by decision: each one's required property is still a rule the package keeps. None is deferred: the owner asked for the cleanup, and each repair is bounded to one site or one set of tests.

| Finding | Tier | Disposition | Item |
| --- | --- | --- | --: |
| `DRF-15`, `shared/timing.ts` | C | Repaired. The two constants move into `shared/landing.ts`, and `shared/timing.ts` goes. **The architect's probe at `3228d1f07`:** every row's Brotli figure is unchanged, and the three rows with `shared/landing` lose one module. | 2 |
| `DRF-17`, the `tap` command | C | Repaired. `tap` is removed from the commands and their declaration. | 3 |
| `DRF-18`, the duplicated helpers | C | Repaired, with its required property amended on 2026-11-15. Two of its evidence's names are different helpers that share a name, and they stay. `PROTOTYPE_REVISION` goes with the prototype arm. | 4, 6 |
| `DRF-21`, `compare.ts`'s module placement | B | Repaired, with how the property is shown amended on 2026-11-15. The three bytes injections apply at `3228d1f07` (`node bench/compare.ts --prove --dry --only <name>`, one at a time, by the architect). | 5 |
| `DRF-42`, the heap test's sentinel | C | Repaired under its required property, unchanged. | 10 |

**`DRF-21`'s run doesn't resume the stopped campaigns.** `DRD-46` stopped `--prove` as a campaign. A run limited to the three bytes injections is the instrument change's proof under `DRD-23`'s last bullet, and it also proves item 6's change to `compare.ts`. The entries that `DRD-45` property 9 holds are not selected, and stay unrepaired. A full `node bench/compare.ts --prove --dry` stops at the first of them, `sortable/operation.ts`'s `this.#lift.translate(…)`.

**The size during the unit.** Item 1 sets the ceilings at `988643dc9`'s readings first, so the gate reads items 2 to 10 against them. The unit then re-measures after its last item and moves every ceiling to its reading, under `DRO-20`, because the owner asked for each of these changes. **Expected:** no row moves. Item 2's probe read no change, and items 3 to 10 change tests, the bench, types and comments, which the minified gate doesn't count. **"draggable alone" is this pass's control row:** no item changes a file in its graph, so it reads exactly 2189, and a move is a stop.

**Still open after this unit,** unchanged by it:

- `Landing`'s shape, the next change the owner approves after inspecting it (`DRO-20`);
- WebKit, which no run covers until CI runs it (`DRO-18`), and `DRO-3`'s real devices;
- `DRO-4`'s timing and retention readings, and the rest of [`performance-plan.md`](performance-plan.md) §4;
- deleting `drag/prototype`, which is the owner's (`DRO-5`).

## Disposition of the size acceptance cleanup report

The [report](size-acceptance-cleanup-report.md) at `7f963e54a`, on `e9ca3732f` (item 1) and `a3423c793` (items 2 to 10) from the input `91b13613f`. **Read by the architect on 2026-11-15 at `7f963e54a`,** against [`size-acceptance-cleanup-handoff.md`](size-acceptance-cleanup-handoff.md), `DRD-68`, `DRD-69` and the five findings. The implementer hit no stop. The coordinator re-ran `npx just size` at `7f963e54a`: it exits 0, and every row reads its ceiling.

**The architect's own checks,** by reading, at `a3423c793`:

- `git diff 988643dc9 a3423c793 -- src` holds only item 2's move, items 7 to 9's comments and `this` parameters, and item 9's two removed comments. No statement in the code changes;
- the shared `focusableList`, `row` and `makeBox` in `tests/support/harness.ts` have the same bodies as the copies they replace, with `focus`'s optional parent;
- `sourcesPerLine` decodes the VLQs as the source map format defines them: 5 bits per digit, low first, 32 as the continuation, the lowest bit as the sign, and the source index cumulative across lines. A line is placed only when every segment on it names one source;
- the sentinel is created in `operateThenDestroy`, and only `onStart` reads it;
- the two TSDoc comments are true at the tree. `invalidate`'s names the scroll and resize step and `invalidate()`, and not its calls at activation and after a failed placeholder move, which property 6 doesn't require;
- `git grep -nE '\(this: ' -- packages/drag/src` finds only the kernel's public overloads and `SortableBehavior.invalidate`.

| Item | Disposition |
| --- | --- |
| 1, `DRD-68` | Conforms. The table at `e9ca3732f` reads the handoff's figures |
| 2, `DRF-15` | Conforms. Brotli unchanged, one module fewer in the three rows, as the probe predicted. **`DRF-15` closed** |
| 3, `DRF-17` | Conforms. **`DRF-17` closed** |
| 4, `DRF-18` | Conforms. Each caller keeps its own garbage collection, and the unsubscribe is in a `finally` block. **`DRF-18` closed**, with `PROTOTYPE_REVISION` gone in item 6 |
| 5, `DRF-21` | Conforms. The three witnesses hold: `RectIndex`, `directionOf` and `keyboardInsertion` move to their own modules, no module is unplaced, the injected allocation keys under `sortable/rect-index.ts` in every arm, and the three bytes injections apply and judge as required. **`DRF-21` closed** |
| 6, `DRO-5` | Conforms. `--rejudge` still reads a recording that holds a prototype arm, with output identical to the input instrument's |
| 7 to 9, `DRD-69` | Conform, apart from `SortableBehavior.invalidate` (below) |
| 10, `DRF-42` | Conforms. A retained callback fails the sentinel's assertion while the class count passes, the proof's row 3 fails it, and the unmutated test passes. The input's test passes under the same mutation, which is the gap the finding names. **`DRF-42` closed** |
| Final re-measure | No row moves. "draggable alone" reads 2189 |
| Emitted tree | Item 2's change in `shared/landing.js` and one JSDoc sentence in `lift.js`. No other `.js` differs |

**No independent review is owed before acceptance.** The normal sequence puts a review after implementation, and the architect waives it for this unit, because:

- **every changed behavior is shown by a check that would fail without it.** Items 5 and 10 have mutation witnesses, as `DRD-23`'s last bullet and `DRF-42` require. The emitted `.js` against `988643dc9` differs only where items 2 and 7 say. Items 3, 4 and 6 are removals and moves whose callers typecheck and whose tests pass with the same titles and assertions;
- **the public surface changes only as `DRD-69` decided:** statements and tests removed, and the contract already amended;
- **the library code that changed is two constants and comments,** and the architect read all of it;
- small units with mechanical evidence have been accepted on the architect's reading before (§Disposition of the heap-comment correction, §Disposition of the test title follow-up).

A review would re-derive the same witnesses. The residual risk is in `compare.ts`, an instrument that no release ships, and its next use reads it again.

**The report's open items:**

1. **`SortableBehavior.invalidate` still declares `this: SortableBehavior`** (`src/sortable/behavior.ts:121-124`). **`DRD-69` property 4 covers it.** `DRD-63` added it as a receiver declaration, and it is one of the six sites `DRD-69` §Why counts. The decision's list left it out, and the handoff copied the list. The implementer was right to leave it. **Property 4 is amended to name it,** and [`size-acceptance-follow-up-handoff.md`](size-acceptance-follow-up-handoff.md) item 1 removes it. `sortable.ts`'s site keeps passing `behavior`.
2. **`bench/lab.ts:3` names the prototype arm.** The comment is false since item 6. The follow-up's item 2 corrects it.
3. **`--profile` and `--attribute` now need `--before`.** **Accepted as item 6 requires.** They always compared a before arm with production, and the prototype was that arm by default. With the prototype gone, a run that needs a before arm and has none ends with an error that says so, before any build. No recipe or current-state record runs either flag without `--before`.
4. **`drag/prototype` can be deleted.** No instrument reads `599684791`. Deleting the branch stays the owner's (`DRO-5`). `DRD-23`'s bullet that `599684791` must stay reachable lapsed at `a3423c793`.

**Observed, not routed:** the sentinel test still pushes `WeakRef`s that it never asserts: each `onStart` item, and the list twice. They predate the unit, `DRF-42`'s property leaves the other assertions unchanged, and they hold nothing the assertions read.

**Next:** [`size-acceptance-follow-up-handoff.md`](size-acceptance-follow-up-handoff.md), for the implementer. The architect reads its report, and no review is owed for it either. The branch is then ready for its pull request, which is the owner's. `Landing`'s shape (`DRO-20`), WebKit (`DRO-18`), `DRO-3`'s devices and `DRO-4`'s timing and retention readings stay open, as §Disposition of the size acceptance lists.

## Disposition of the size acceptance follow-up report

The [report](size-acceptance-follow-up-report.md) at `db76672a3`, on `7763a67a1` from the input `9c248f11f`. **Read by the architect on 2026-11-15 at `db76672a3`,** against [`size-acceptance-follow-up-handoff.md`](size-acceptance-follow-up-handoff.md). No stop was hit. The architect's own checks:

- `git diff 9c248f11f 7763a67a1` outside `.plan` changes only `src/sortable/behavior.ts`, where `invalidate` loses `this: SortableBehavior` and nothing else, and `bench/lab.ts`'s file comment;
- `git grep -nE '\(this: ' -- packages/drag/src` at `db76672a3` finds only `kernel/callbacks.ts`, `kernel/drag.ts`, `kernel/gesture.ts` and `kernel/session.ts`;
- `git grep -n prototype -- packages/drag/bench` finds nothing.

| Item | Disposition |
| --- | --- |
| 1, `DRD-69` property 4 | Conforms. Typecheck exits 0, and `sortable.ts:67` still passes `behavior`. **`DRD-69` is implemented in full** |
| 2, the lab comment | Conforms. It is true. "each with its own `src`" repeats what the sentence already says, and isn't worth a unit |
| The re-measure, `DRD-68` property 3 | No row moves, and "draggable alone" reads 2189. Nothing is re-based |

**Accepted, with no review owed,** for the reasons in §Disposition of the size acceptance cleanup report: the change is one erased type and one comment, and the size run reads the published build. **The unit is complete,** and the branch is ready for its pull request (§`drag/size-acceptance` at its pull request).

## `drag/size-acceptance` at its pull request

**Stated on 2026-11-15 by the architect, at `db76672a3` and this record's commit, before the merge of `main` at `a07739742`.** That merge brings only coordinator documentation. **The pull request is `drag/size-acceptance` into `main`.** Opening it is the owner's. The pull request can cite this section.

### What the branch delivers

1. **The size ceilings follow the code until release** (`DRO-20`, `DRD-68`). Every row's ceiling and the control equal their readings at `988643dc9`, with no slack. Until the first publication of `@ydinjs/drag`, each change the owner approves moves them again, and the `budget` docblock in `bench/size/measure.ts` says so. **`npx just size` exits 0, and `npx just test` has no failing size row,** for the first time since `a9c323f6a`.
2. **The owner's source edit, `988643dc9`, is adopted** (`DRO-21`, `DRD-69`).
   - The loops read their fields directly. The architect's probe of two of them shows no cost at about 1.5 ns per iteration, and speed is otherwise unmeasured.
   - The `sortable` and `freeDrag` controllers declare their members as methods.
   - **No member carries a guarantee about its receiver.** The contract, the README and the JSDoc say nothing about calling a member detached, and no test asserts it. No built-in declares `this` for a receiver check. Every library site still passes its receiver, and the public receiver overloads and their tests stay.
   - `Invalidatable` and `Retirable` have TSDoc.
3. **The prototype arm retires** (`DRO-5`). `measure.ts` and `compare.ts` no longer build `599684791`. A comparison, `--profile` and `--attribute` take their before arm from `--before <revision>`. `--rejudge` still reads recordings that hold a prototype arm.
4. **Five findings are repaired** (§Disposition of the size acceptance cleanup report):
   - `DRF-15`: `shared/timing.ts` is gone;
   - `DRF-17`: the `tap` command is gone;
   - `DRF-18`: each shared test helper and the heap snapshot reader have one definition;
   - `DRF-21`: `compare.ts` places each bundle line from the bundle's source map;
   - `DRF-42`: the destruction heap test's sentinel detects a retained callback.

**Public surface and shipped code.**

- **Public API:** the controllers' members are declared as methods instead of read-only arrow properties (`988643dc9`). The functions, their parameters and the receiver overloads are unchanged.
- **Contract:** its public surface makes no statement about calling a member detached ([change record](contract.md#change-record), 2026-11-15).
- **Library code:** `988643dc9`'s loop and controller edit, and two constants moved into `shared/landing.ts`. The units after `988643dc9` change no other emitted code. Every size row reads the same at `db76672a3` as at `988643dc9`.

### What is accepted

- `DRD-68` and `DRD-69`: implemented and accepted on the architect's reading at `7f963e54a` and `db76672a3`. `DRD-69` property 4 was amended at `7f963e54a` to name `SortableBehavior.invalidate`.
- `DRF-15`, `DRF-17`, `DRF-18`, `DRF-21` and `DRF-42`: closed at `a3423c793`.
- `DRO-4`'s size re-base, and decisions 1 and 2 of [`combined-review-remediation-assessment.md`](combined-review-remediation-assessment.md) §5.2: answered by the owner's acceptance, with nothing removed.

### What stays open

- **No independent review read this branch.** The architect waived it for both units. Their evidence is mechanical: mutation witnesses for `DRF-21` and `DRF-42`, the emitted-tree comparison, and the size gate. `988643dc9` is the owner's own edit, adopted by decision.
- **Limits of the evidence:**
  - The full suite (exit 0, 928 passed) and `npx just test-engines` for Chromium and Firefox (exit 0, 898 passed and 10 skipped) are the implementer's runs at `a3423c793`. `7763a67a1` changes one erased type and one bench comment after them, and only typecheck, lint and the size gate ran there.
  - **WebKit didn't run** (`DRO-18`), and no CI job runs it yet.
- **Owner questions:** `Landing`'s shape, the next change the owner approves after inspecting it (`DRO-20`). Deleting `drag/prototype`, which no instrument reads any more (`DRO-5`).
- **Unchanged by the branch:** `DRO-3`'s real devices, `DRO-4`'s timing and retention readings, and the rest of [`performance-plan.md`](performance-plan.md) §4. Release comes after documentation, examples and CI.

## Findings

Findings for scope `drag`, under `DRD-23`'s first bullet. High-water mark: **`DRF-47`**.

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

Tier C, **closed at `a3423c793`**. Read by the architect on 2026-11-15 from the [size acceptance cleanup report](size-acceptance-cleanup-report.md) at `7f963e54a` (§Disposition of the size acceptance cleanup report): the two constants are module-private in `src/shared/landing.ts`, `src/shared/timing.ts` is deleted, and every row's Brotli figure is unchanged. Before closure: open. Found by the combined review at `b01a0283d` (`cleanup-4`).

- **Current behavior:** only `src/shared/landing.ts` imports it. It was drawn so that the lift and the landing shared the defaults, and `DRD-33` took the animation out of the lift.
- **Why it is a problem:** the boundary's reason has expired. No bytes change.
- **Evidence:** `grep -rn timing.ts src`.
- **Required property:** a module boundary has a reason that the one module using it couldn't own.
- **When, amended on 2026-11-15:** in the size acceptance cleanup, on the owner's request ([`size-acceptance-cleanup-handoff.md`](size-acceptance-cleanup-handoff.md) item 2, §Disposition of the size acceptance). It said: optional, with no merge condition ([`combined-review-assessment.md`](combined-review-assessment.md) §4).
- **"No bytes change," confirmed at `3228d1f07`** by the architect's probe: with the constants in `shared/landing.ts` and the module deleted, every row's Brotli figure is unchanged.

#### DRF-16 — Comments name a parameter, a flag and a contract that the code no longer has

Tier C, **closed on 2026-11-10**. Found by the combined review at `b01a0283d` (`cleanup-6`).

**Closure:** repaired at `83f472624`. The three comments name `listener`, `__DEV__` and "`false` is not an operation". The JSDoc change appears in the emitted `shared/invalidation.js`, which the owner authorized.

- **Current behavior:** `src/shared/invalidation.ts:1` names `onInvalidate`, now `listener`. `src/sortable/linear-shift.ts:84` says `DEV` for `__DEV__`. `tests/authoring.declaration.test.ts:215` says "`false` no longer declines".
- **Why it is a problem:** a comment's factual claim disagrees with the code, or argues about what was.
- **Evidence:** the three lines.
- **Required property:** each comment names the code as it is and states the property it checks.
- **When:** before merge, [`combined-review-remediation-handoff.md`](combined-review-remediation-handoff.md) item 6.

#### DRF-17 — The `tap` browser command has no caller

Tier C, **closed at `a3423c793`**. Read by the architect on 2026-11-15 from the [size acceptance cleanup report](size-acceptance-cleanup-report.md) at `7f963e54a` (§Disposition of the size acceptance cleanup report): `tap` and its declaration are removed. Before closure: open. Found by the combined review at `b01a0283d` (`cleanup-7`).

- **Current behavior:** `tests/support/commands.node.ts:80` defines `tap`, and `tests/support/browser-commands.ts:13` declares it. No test or bench calls it.
- **Why it is a problem:** harness machinery a reader must understand and keep compiling, for no test.
- **Evidence:** `grep -rnw tap tests bench`.
- **Required property:** the harness declares the commands that a test uses.
- **When, amended on 2026-11-15:** in the size acceptance cleanup, on the owner's request ([`size-acceptance-cleanup-handoff.md`](size-acceptance-cleanup-handoff.md) item 3). It said: optional, with no merge condition ([`combined-review-assessment.md`](combined-review-assessment.md) §4).

#### DRF-18 — Test and bench helpers have several definitions

Tier C, **closed at `a3423c793`**. Read by the architect on 2026-11-15 from the [size acceptance cleanup report](size-acceptance-cleanup-report.md) at `7f963e54a` (§Disposition of the size acceptance cleanup report): `row`, `focusableList` and `makeBox` are defined once in `tests/support/harness.ts`, the heap snapshot is read in `tests/support/heap-snapshot.node.ts` with each caller keeping its own collection, and `PROTOTYPE_REVISION` went with the prototype arm. Before closure: open. Found by the combined review at `b01a0283d` (`cleanup-8`).

- **Current behavior:** `row` is in the `activation`, `focus`, `landing` and `order` tests. `focusableList` is in `focus` and `order`. `makeBox` and `mount` are in `free-drag` and `commit`. Heap-snapshot reading is in `tests/support/commands.node.ts` and `bench/heap-snapshot.ts`. `PROTOTYPE_REVISION` is in `bench/compare.ts` and `bench/size/measure.ts`.
- **Why it is a problem:** a change to one helper or to the pinned revision has to find every copy. `tests/support/harness.ts` is already the shared place for the test helpers.
- **Evidence:** `grep -n "^const row\|^function focusableList\|^function makeBox\|^function mount" tests/*.ts`, and the two `PROTOTYPE_REVISION` lines.
- **Required property, amended on 2026-11-15:** each of these has one definition: `row`; `focusableList`, with `focus`'s optional parent; the `makeBox` of `commit` and `free-drag`; and the heap snapshot's type and the reading of its chunks. `PROTOTYPE_REVISION` goes, with the prototype arm (`DRO-5`). `mount` in `commit` and in `free-drag`, and `makeBox` in `drop-targets`, stay where they are. **It said:** each shared helper and the pinned revision have one definition, or the file says why it stays standalone. **Why it changed:** `free-drag`'s `mount` logs each end and `commit`'s doesn't, and `drop-targets`' `makeBox` takes an id and a position. They share a name, not a body. Each GC sequence and each count over the snapshot stays with its caller: the test collects once, and the bench enables the profiler and collects twice.
- **At `3228d1f07`:** `row` is also in `keyboard`, and so is `focusableList`. `row` has five identical copies, `focusableList` three, and the two `makeBox` are identical.
- **When, amended on 2026-11-15:** in the size acceptance cleanup, on the owner's request ([`size-acceptance-cleanup-handoff.md`](size-acceptance-cleanup-handoff.md) item 4). `DRO-5` retired the prototype arm on 2026-11-15, so `PROTOTYPE_REVISION` goes with it, in item 6. It said: optional, with no merge condition ([`combined-review-assessment.md`](combined-review-assessment.md) §4).

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

Tier B, **closed at `a3423c793`**. Read by the architect on 2026-11-15 from the [size acceptance cleanup report](size-acceptance-cleanup-report.md) at `7f963e54a` (§Disposition of the size acceptance cleanup report): `bundle` places each line from the bundle's source map, `moduleAt` throws on a line it can't place, an allocation injected into `RectIndex` keys under `sortable/rect-index.ts` in every arm, and the three bytes injections judge as required. Before closure: open. Reported by the trace unit at `e92e21eed`, and verified by the architect on 2026-11-11 ([assessment](performance-trace-assessment.md) §5).

- **Current behavior:** `bundle` records a module's start at each `// <path>` line rolldown writes, and `moduleAt` keys a line by the last start before it. In the arm built from `566ebfc65`, rolldown writes no marker for `sortable/rect-index.ts` or `sortable/keyboard.ts`. `RectIndex`, at line 1540 of [`bundle.js.txt`](measurements/traces/2026-11-11/bundle.js.txt), is keyed under `shared/landing.ts`, and `directionOf` and `keyboardInsertion` under `sortable/collection.ts`.
- **Who uses it:** only `samplingProfile`, which keys the bytes rows. `--profile` keys by function name and line. The trace mode copies the markers into `record.json`, and the trace analysis placed positions through a source map instead, which it checked.
- **What it affects:** no verdict. Every kernel key in the recorded bytes readings names a function of that kernel module, and the kernel modules without a marker have no runtime code, so `DRF-1`'s closure, `DRD-41`'s witness and every bytes verdict hold. Nine recorded readings key `RectIndex`'s methods as `shared/landing.ts:`. No report or decision drew a conclusion from those labels, and the readings stay as written.
- **Why it is a problem:** the kernel selection holds only while no unmarked module's code falls after a kernel module's marker. Nothing checks that, and a bundler change or a new module can break it with no error.
- **Required property:** every line of the lab bundle is placed in the module that holds its source, from the bundle's own mapping, such as a source map or the bundler's module data, and not from comment lines. A line the mapping can't place ends the run with an error. Under `DRD-23`'s last bullet, an allocation injected into `sortable/rect-index.ts` keys under that module, and every bytes injection still flags.
- **How it is shown, decided on 2026-11-15:**
  - the module placement of `RectIndex`'s methods, `directionOf` and `keyboardInsertion`, before and after the repair, at one tree;
  - one reading of the bytes row, with one allocation injected into a `sortable/rect-index.ts` method on the move path, applied for the run and reverted, shows that allocation keyed under `sortable/rect-index.ts`;
  - `node bench/compare.ts --prove --only` with the three bytes injections: the two expected to flag flag, and the step-list entry stays quiet.

  Before, the property named no run. `DRD-46` stopped `--prove` as a campaign, and a full `--prove` ends at `DRD-45` property 9's stale entries. The three bytes injections apply at `3228d1f07`.

- **When, amended on 2026-11-15:** in the size acceptance cleanup, on the owner's request ([`size-acceptance-cleanup-handoff.md`](size-acceptance-cleanup-handoff.md) item 5). It said: before the next bytes reading that a report or decision uses. `DRD-47`'s unit runs no bytes row, so it doesn't wait for this.

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

Tier B, **closed at `cc752cc1b`, moot under `DRD-60`**: what it concerns is gone. Read by the architect on 2026-11-14 (§Disposition of the mangling rollback report). Before that: open, **withdrawn by `DRD-59` with the requirement it tests**: V4 and the step go, and the new V3 checks renamed positions. Closes when `DRD-59`'s unit lands. Reported by the publish-mangle round at `436b105c6` as `reviewer-1` ([summary](reviews/publish-mangle/publish-mangle-summary.md), [report](reviews/publish-mangle/proof-reviewer.md)).

- **Current behavior:** `writes` accepts any mapping whose `src` text is `MODIFIERS`, then the key, and it applies that to every occurrence. An access mapped to its declaration's member start (`readonly _root`) passes, and the first form of V4 rejected it. An access mapped to another access of the same name, or a declaration mapped into another member, passes both forms.
- **Why it is a problem:** property 6 says "No other form passes: not … a position in another member", and assessment §3 says that applying the exception to every occurrence isn't weaker than the first form. Both describe a position bound that the test doesn't check.
- **Required property:** V4 rejects what property 6 rejects, or the record states the bound that V4 enforces.

#### DRF-25 — `DRD-56` property 6's mappings for kept tokens have no standing check

Tier B, **closed at `cc752cc1b`, moot under `DRD-60`**: what it concerns is gone. Read by the architect on 2026-11-14 (§Disposition of the mangling rollback report). Before that: open, **withdrawn by `DRD-59` with the requirement it tests**: no requirement fixes the mapping of a kept token. Closes when `DRD-59`'s unit lands. Reported by the publish-mangle round at `436b105c6` as `reviewer-2`.

- **Current behavior:** V4 inspects only occurrences of output names. Property 6 bullets 1 and 3, every map valid and every other token at its `src` position, were checked once, by the report's step check.
- **Why it is a problem:** a copy of the step that moved 3,737 of 6,902 mappings passed the build and all five tests.
- **Required property:** property 6 bullets 1 and 3 hold for every build the suite accepts, or the record states that they were a one-time acceptance.

#### DRF-26 — The step's map counts generated lines at LF only

Tier B, **closed at `cc752cc1b`, moot under `DRD-60`**: what it concerns is gone. Read by the architect on 2026-11-14 (§Disposition of the mangling rollback report). Before that: open, no instance at `436b105c6`, **moot under `DRD-59`**: the step that counts lines goes. Closes when `DRD-59`'s unit lands. Reported by the publish-mangle round as `reviewer-3`.

- **Current behavior:** `build/rename-properties.ts` starts a line only at `\n`. Rolldown keeps a raw U+2028 in a template literal and counts it as a line break, so every later mapping in that module moves. With no renamed name after the separator, every test passes (7 of 25 mappings moved in the probe).
- **Why it is a problem:** property 6 requires every token to keep its `src` position. `src` has no LS, PS or CR today.
- **Required property:** the step's map keeps every token's position for any module Rolldown can emit, including one with a raw LS or PS.

#### DRF-27 — The publication test resolves positions with lines split at LF only

Tier B, **closed at `cc752cc1b`, moot under `DRD-60`**: what it concerns is gone. Read by the architect on 2026-11-14 (§Disposition of the mangling rollback report). Before that: open, no instance at `436b105c6`, fails closed. **Decided by `DRD-59` property 7:** V3 splits `src` lines at every line terminator. Reported by the publish-mangle round as `reviewer-4`.

- **Current behavior:** `positionOf` and the `src` lookup split at `\n` (`tests/publication.node.test.ts:68`, `:70`, `:161`). Rolldown's original lines count CR, LS and PS.
- **Why it is a problem:** a correct source change, such as a CR or a pasted U+2028 in a comment, fails V4 on a correct publication.
- **Required property:** V3 and V4 resolve generated and original positions with the line rule that the maps use.

#### DRF-28 — A kept property written as a string key can share an output name and pass every check

Tier B, **closed at `cc752cc1b`, moot under `DRD-60`**: what it concerns is gone. Read by the architect on 2026-11-14 (§Disposition of the mangling rollback report). Before that: open, no instance at `436b105c6`. **Decided by `DRD-59` property 3:** `quoted: true`, and the build's check of each chunk's kept names, which Oxc lists. Reported by the publish-mangle round as `reviewer-5`.

- **Current behavior:** `readNames` doesn't count quoted or computed string keys as property names, and the generator's `kept` set and V3 both use it. With `{ "_size": "k" }`, a class with `_size` and `'k'` passes the name set and V1 to V4, and its result changes from 12 to 22.
- **Why it is a problem:** `DRD-56` property 4 requires that an output name equals no property name that stays. Property 1 doesn't forbid unprefixed string keys.
- **Required property:** no output name equals a property name that stays, however that name is written.

#### DRF-29 — V2 doesn't see prefixed member names written as strings in `.d.ts`

Tier B, **closed at `cc752cc1b`, moot under `DRD-60`**: what it concerns is gone. Read by the architect on 2026-11-14 (§Disposition of the mangling rollback report). Before that: open, no instance at `436b105c6`. **Decided by `DRD-59` property 7:** V2 rejects identifiers, string literals and template texts. Reported by the publish-mangle round as `reviewer-6`.

- **Current behavior:** V2 visits `Identifier` nodes only. A quoted key, a computed string key or a string-literal type that declares a prefixed member passes all five tests.
- **Why it is a problem:** the step would rename the uses, and the `.d.ts` would declare a member that doesn't exist at runtime. Property 1 requires every member that a `.d.ts` declares to keep its name.
- **Required property:** no emitted `.d.ts` declares a member under a prefixed name, in any syntax.

#### DRF-30 — `DRD-56`'s rationale says that V1 finds computed keys and enumerations

Tier B, **closed at `cc752cc1b`, moot under `DRD-60`**: what it concerns is gone. Read by the architect on 2026-11-14 (§Disposition of the mangling rollback report). Before that: open. **Decided by `DRD-59`'s corrections:** the record states what V1 finds. Closes when `DRD-59`'s unit lands. Reported by the publish-mangle round as `reviewer-7`.

- **Current behavior:** the rationale says string keys, computed keys and enumerations are forbidden, "and validation V1 finds them". V1 finds only prefixed property names and literal strings or template texts that start with the prefix. `o['_' + 'config']`, `JSON.parse('{"_config":1}')` and `Object.keys(o)` pass.
- **Why it is a problem:** a reader relies on V1 for forms that only code reading excludes.
- **Required property:** the record states what V1 detects, or V1 detects what the record says.

#### DRF-31 — A plain build or a publish enforces almost none of `DRD-56` property 7

Tier B, **closed at `cc752cc1b`, moot under `DRD-60`**: what it concerns is gone. Read by the architect on 2026-11-14 (§Disposition of the mangling rollback report). Before that: open. **Decided by `DRD-59` property 8:** what `just build` guarantees, what is publishable, and the obligation on a release change. Closes when `DRD-59`'s unit lands. Reported by the publish-mangle round as `reviewer-8`.

- **Current behavior:** `just build` fails only on an unmapped prefixed property name or a prefixed shorthand key. V1's string half, V2, V3, V4 and the name set hold only for a tree that a publication-test run read and passed. `package.json` has no `prepack` or `prepublishOnly` script, so a publish neither builds nor validates. A duplicate output name, a stale key and a prefixed `.d.ts` member all build cleanly.
- **Why it is a problem:** `DRD-56` places the step inside the build because "a separate step after the build could be skipped". The validation has no such placement.
- **Required property:** a tree that a publish can ship satisfies property 7, or the record states that only a tree that a passing test run read is publishable.

#### DRF-32 — The `_` marker and the map workflow are stated only in the record

Tier C, **closed at `b8e37b37c`, moot under `DRD-60`**: what it concerns is gone. Read by the architect on 2026-11-14 (§Disposition of the mangling rollback report). Before that: open. **Under `DRD-59`** the map workflow goes. A statement of the marker in CONTRIBUTING is the owner's proposal S3 ([proposal](publication-build-proposal.md) §7). Reported by the publish-mangle round as `integrity-1`.

- **Current behavior:** only `DRD-56` and `build/` name the marker, the map and `build/generate-property-names.ts`. The build's error for an unmapped name names the map, not the script. Regenerating after one new name moved 5 of the 29 existing assignments.
- **Why it is a problem:** a contributor learns the convention from the record or by reading `build/`, and the regeneration diff a person reviews (`DRD-56`, `DRD-57` property 4) is larger than the change.
- **Required property:** a current-state document or the failure itself tells a contributor that a `_` property is renamed, what is owed, and how the map is brought in line.

#### DRF-33 — `DRD-56` property 6 holds only while `classVarCleanupPlugin` is inert in drag's build

Tier C, **closed at `cc752cc1b`, moot under `DRD-60`**: what it concerns is gone. Read by the architect on 2026-11-14 (§Disposition of the mangling rollback report). Before that: open, **moot for drag under `DRD-59`**: no requirement depends on a token's exact mapping. The plugin's inertness is the owner's proposal S2. Closes when `DRD-59`'s unit lands. Reported by the publish-mangle round as `integrity-2`.

- **Current behavior:** with `experimental.nativeMagicString` on, the plugin rewrites `var X = class`, the chunk's own map points renamed tokens at statement starts, and V4 fails at 79 positions in 8 modules. Without the step the same token maps to the statement start with the plugin, and to the name without it.
- **Why it is a problem:** the precondition is stated nowhere, and assessment §8 prices enabling the option by size only. The failure is loud, but it isn't attributed to the plugin.
- **Required property:** the condition under which property 6 holds is stated where a change to it is read, or checked where it fails with its cause.

#### DRF-34 — Comments in emitted modules name members by their source names

Tier C, **closed at `cc752cc1b`, moot under `DRD-60`**: what it concerns is gone. Read by the architect on 2026-11-14 (§Disposition of the mangling rollback report). Before that: open, **moot under `DRD-59`**: a minified module keeps only legal comments and annotations. Closes when `DRD-59`'s unit lands. Reported by the publish-mangle round as `integrity-3`.

- **Current behavior:** twelve comment lines in six emitted modules name renamed members, for example `_run` in `kernel/callbacks.js:11-12`, beside the method `t` at line 46. Property 5 keeps every comment.
- **Why it is a problem:** within one published file, the comment and the code disagree.
- **Required property:** a published comment that names a renamed member doesn't mislead, or the decision records that it may.

#### DRF-35 — The reserved-word list and the identifier rule are written in the generator and in the test

Tier C, **closed at `cc752cc1b`, moot under `DRD-60`**: what it concerns is gone. Read by the architect on 2026-11-14 (§Disposition of the mangling rollback report). Before that: open, **moot under `DRD-59`**: the generator and its rules go. Closes when `DRD-59`'s unit lands. Reported by the publish-mangle round as `cleanup-1`.

- **Current behavior:** `RESERVED` is defined in `build/generate-property-names.ts` and in `tests/publication.node.test.ts`, and the identifier rule is `FIRST`/`REST` in one and `IDENTIFIER_NAME` in the other. Nothing says the second is a deliberate independent oracle.
- **Required property:** one definition, or the second states that it is deliberately independent.

#### DRF-36 — The test recomputes the prefixed names in `src` with the generator's own reader

Tier C, **closed at `cc752cc1b`, moot under `DRD-60`**: what it concerns is gone. Read by the architect on 2026-11-14 (§Disposition of the mangling rollback report). Before that: open, **moot under `DRD-59`**: the reader and the name-set test go. Closes when `DRD-59`'s unit lands. Reported by the publish-mangle round as `cleanup-2`.

- **Current behavior:** the name-set test walks `src` with the same `readNames` and `isPrefixed` as the generator, with its own copies of the directory walk. It catches a stale map, not a reader defect. `DRF-28` is a reader defect that neither sees.
- **Required property:** one owner of "the prefixed property names in `src`", or the test states what it checks that the generator can't.

#### DRF-37 — The generator's name sequence handles names of any length, and the map has only one-character names

Tier C, **closed at `cc752cc1b`, moot under `DRD-60`**: what it concerns is gone. Read by the architect on 2026-11-14 (§Disposition of the mangling rollback report). Before that: open, **moot under `DRD-59`**: Oxc assigns the output names. Closes when `DRD-59`'s unit lands. Reported by the publish-mangle round as `cleanup-3`.

- **Current behavior:** `candidates()` yields names of any length, and all 29 outputs are one character. Under `DRD-57` property 4 the map has 53 keys, `FIRST` has 53 characters, and `x` and `y` are kept, so the branch is reached on the next regeneration, untested.
- **Required property:** the sequence's extent is justified by the names it serves or by a stated bound. The note on `DRD-57` is the consolidator's, not the pass's.

#### DRF-38 — drag's lint exits non-zero on 49 ESLint errors in its tests and bench

Tier C, **closed at `27c60a9ac`**. Read by the architect on 2026-11-14 from the [final cleanup report](final-cleanup-report.md) and its [independent proof](reviews/final-cleanup/proof-reviewer.md) (§Disposition of the final cleanup): lint exits 0 with nothing suppressed, and each part of the required property holds. The one defect the unit added, a comment, is `DRF-41` and doesn't bear on this property. The behavior sentinel's older coverage gap is `DRF-42`, and this closure doesn't repair it. Registered by the architect on 2026-11-13 from the [slot array report](slot-array-report.md) at `690769539`. **Widened on 2026-11-14** from the [mangle rollback report](mangle-rollback-report.md) §Baseline errors (§Disposition of the mangling rollback report). Before closure: open.

- **Current behavior:** `npx just lint` from `packages/drag` reports 49 ESLint errors, and oxlint reports none. ESLint calls 39 of them fixable with `--fix`. At `6296b741a` the architect's run gives ([output](measurements/2026-11-14-rollback-disposition-lint.txt)):

  | File | Rule | Errors |
  | --- | --- | --- |
  | `tests/authoring.declaration.test.ts` | `@typescript-eslint/no-meaningless-void-operator` | 31 |
  | `tests/callbacks.declaration.test.ts` | `@typescript-eslint/no-meaningless-void-operator` | 5 |
  | `tests/callbacks.declaration.test.ts` | `prefer-arrow-callback` | 1 |
  | `tests/published-types.declaration.test.ts` | `@typescript-eslint/no-meaningless-void-operator` | 2 |
  | `tests/destruction.browser.test.ts` | `@typescript-eslint/no-meaningless-void-operator` | 1 |
  | `tests/classes.browser.test.ts` | `no-useless-assignment` | 1 |
  | `tests/destruction.browser.test.ts` | `no-useless-assignment` | 1 |
  | `tests/displacement-sink.browser.test.ts` | `func-name-matching` | 1, at 59:3 |
  | `tests/hot-path.browser.test.ts` | `func-name-matching` | 1 |
  | `tests/landing.browser.test.ts` | `func-name-matching` | 1 |
  | `tests/order.browser.test.ts` | `func-name-matching` | 1 |
  | `bench/compare.ts` | `camelcase` | 2 |
  | `bench/compare.ts` | `consistent-this` | 1 |

  The same 49, by file and rule, are in the saved outputs at `7420cbb9a`, `cc752cc1b` and `b8e37b37c` ([rollback report](mangle-rollback-report.md) §Baseline errors), and in the independent review's run at `f79f66fe2` and `7184d069c` ([review](reviews/xy-held-geometry/proof-reviewer.md) §Suite, lint and typecheck). Only the `displacement-sink` line moves (57, then 53, then 59), and `61f883d09` renamed `callback-list.declaration.test.ts` to `callbacks.declaration.test.ts`. Which tool update introduced each rule's errors isn't established.

- **Why it is a problem:** the lint exits 1 at every base, so a unit can show only that it adds no error, not that lint passes, and handoff.md's lint check turns into a comparison with the base.
- **Routed** to a drag cleanup unit for an `implementer`, which the owner starts.
- **Required property:** drag's lint exits 0 at the tip, with every test asserting what it asserts now and every helper recording the same reads. In particular:
  - each `@ts-expect-error` line still fails to typecheck without its directive, for the reason its comment gives;
  - a heap count still runs after the reference that the test drops before it;
  - `bench/compare.ts` produces the same injections and the same output.
- **Return to the architect** if a fix needs a rule turned off, an `eslint-disable` comment, or a change to what a test asserts or measures. `--fix` alone may remove a `void` that a type assertion needs, or an assignment whose purpose is to drop a reference before a heap count.
- **Not the mangling rollback's.** [`mangle-rollback-handoff.md`](mangle-rollback-handoff.md) records the base's errors and reports them apart from any new error. It doesn't change these files beyond its followers' names, and accepting its report doesn't close this finding.
- **Amended on 2026-11-14.** It used to be titled "drag's lint exits non-zero on a test helper's function name", and its current behavior read: "`npx just lint` from `packages/drag` reports one ESLint error, `func-name-matching`, at `tests/displacement-sink.browser.test.ts:57:3` … It reports it at `706b91481` and at `5ec3b4b2d` alike. The line was last changed in `5ea7bb7e6`. The tools are those of `31bac1381`. Whether that update introduced the error isn't established." Its required property was "drag's lint exits 0 at the tip, and the test helper still records the same reads", and its routing said it needs no decision unless the change alters what the helper records. **The one error was the architect's error:** the slot array report linted only its five changed files, and the finding was registered from that output as if it were the whole package's.

#### DRF-39 — Two consumer tests count heap instances by class name, which the minified build renames

Tier B, **closed at `b8e37b37c`, moot under `DRD-60`**: the publication isn't minified, so both classes keep their names. Read by the architect on 2026-11-14 (§Disposition of the mangling rollback report): the consumer project passes 326 of 326 at the rollback's end, including both tests, and again in the independent suite run at `7184d069c`. Before that: moot by `DRD-60`, to close when the architect accepted the rollback's report with the consumer project at 326 of 326. **Registered as `DRF-38` at `1c99666f2`, on `drag/mangle-remediation`, and renumbered on 2026-11-13** when this branch merged `drag/size` at `f552e0ec9`, where `DRF-38` is the lint error. `1c99666f2`'s commit message calls it `DRF-38`. Found by the architect on 2026-11-13 while exploring the three-unit layout ([exploration](unit-layout-exploration.md) §9), in `DRD-59`'s candidate and in the layout alike.

- **Current behavior:** `tests/classes.browser.test.ts:190` and `tests/destruction.browser.test.ts:381` run in the consumer project. Each counts heap objects through `countHeapObjects('FreeDragBehavior')` or `countHeapObjects('SortableBehavior')`, which reads constructor names in a heap snapshot. `DRD-59` property 2 keeps `keepNames` off, so minification renames both classes, and each test reads +0 where it expects +1. Observed on `DRD-59`'s candidate, `p4.config.ts` with `dts: { sourcemap: false }`: 324 of 326 consumer tests pass, and these two fail ([readings](measurements/2026-11-13-unit-layout-readings.txt)).
- **Why it is a problem:** the consumer project is the runtime check of the publication (`DRD-54`), and two of its tests can't read the build that `DRD-59` decides. [`publication-build-proposal.md`](publication-build-proposal.md) §3 says that no test depends on function or class names, which is false. `DRD-59`'s handoff returns on any failing consumer test, so its unit would stop at its first run of the consumer project.
- **No consumer observes it:** class names aren't part of the contract, and the retention that the tests check doesn't depend on them.
- **Required property:** the consumer project passes on the minified build, and both retention checks still run in a project that can read the class names.
- **Recommended:** the two class counts move to a file of their own, which `DRAG_SOURCE_ONLY_BROWSER_TESTS` lists. Its rule already covers a test that reads what the package doesn't publish, and the rest of both tests, and both files, stay in the consumer project. Keeping the two class names in the build would cost bytes on every row that bundles them. The architect decides it with `DRO-16`'s answer, since it applies to either build.

#### DRF-40 — A `DRI-13` test bounds the landing's travel by how long a grab takes

Tier C, **closed at `27c60a9ac`**. Read by the architect on 2026-11-14 from the [final cleanup report](final-cleanup-report.md) §`drag:DRF-40` and its [independent proof](reviews/final-cleanup/proof-reviewer.md) (§Disposition of the final cleanup). The test pauses the landing at its midpoint after the release, so the verdict doesn't depend on elapsed time, and a mutation of each kind fails both cases. The landing and the lift are unchanged. Registered by the architect on 2026-11-14 from the [mangle rollback report](mangle-rollback-report.md) §Commit A (§Disposition of the mangling rollback report). Before closure: open.

- **Current behavior:** `tests/activation.browser.test.ts` › "drag:DRI-13 a grab during a landing" › "should keep the visual under the pointer during a %s landing" grabs during a 90 px landing that runs 20 s, linear, which is 4.5 px/s. It requires the visual within 1 px of where it was read before the grab. So it passes only when the read before the grab and the read after activation are less than about 222 ms apart. Its comment states that assumption: "Slow enough that the flight moves well under 1 px between the press and the activation."
- **Observed failing twice, both in Chromium, both on the rejected case, both in a run that shared the machine with other work:**
  - on 2026-11-09, in the second full run of the feature-composition revision ([assessment](feature-composition-assessment.md) §7, [handoff](feature-composition-handoff.md) §The unexplained landing-test failure). The assertion's message wasn't recorded;
  - on 2026-11-13, at `cc752cc1b`, in the consumer project while the node project built the size compositions: 1.05 px, about 233 ms ([log](measurements/2026-11-13-rollback-a-node-consumer.log)).
- **Observed passing:** 20 runs of the block at each of two commits, in each of three engines ([feature composition report](feature-composition-report.md) §The landing-test failure); 10 isolated runs at `cc752cc1b` ([results](measurements/2026-11-13-rollback-a-landing-repeats.txt)); and every other full run on record, including the rollback's base and end.
- **The cause isn't established.** Elapsed time under load is consistent with both failures and with the test's constants. Neither failure changed code on the path the test runs: commit A renames nothing at runtime, and the 2026-11-09 revision didn't change `sortable` or the lift from its first version.
- **Why it is a problem:** the verdict can depend on the machine's load rather than on `DRI-13`, so a full run can fail without a defect. A handoff that returns on any failing consumer test stops on it.
- **Required property:** the test's verdict doesn't depend on how long the grab takes, and it still fails when activation measures the visual without the landing's current offset, or cancels the landing before it measures (`DRD-18`). A mutation of each kind is shown failing it.
- **Routed** to a drag test unit for an `implementer`, which the owner starts. It needs no decision unless the test can't meet the property without a change to the landing or the lift.

#### DRF-41 — A comment in the destruction heap test says the controller keeps the behavior sentinel reachable

Tier C, **closed at `3c7028cc9`**. Read by the architect on 2026-11-14 from the [heap-comment report](heap-comment-report.md) at `7021f1013` (§Disposition of the heap-comment correction): the two comment lines are replaced, and nothing else changes. Registered by the architect on 2026-11-14 from `final-cleanup-reviewer-1` in the [final cleanup proof](reviews/final-cleanup/proof-reviewer.md) §Findings (§Disposition of the final cleanup). Before closure: open.

- **Current behavior:** `tests/destruction.browser.test.ts:411` to `:412`, added at `27c60a9ac`, reads: "The callback reads `behavior`, so the controller keeps it reachable until the controller is released." The callback captures the variable, not the object, and the test sets the variable to `null` after destruction. In the proof, a live controller that was never destroyed and is kept in the test's frame doesn't keep the object: the `WeakRef` assertion passes and the test fails only at the class count. With `behavior = null` removed, the object stays reachable and the assertion fails ([logs](reviews/final-cleanup/proof-reviewer-probes/browser/)).
- **Why it is a problem:** the comment tells a reader that the sentinel checks whether the controller releases what its callbacks read, and the assertion can't fail that way. No assertion is affected.
- **Required property:** the comment beside the read states what the read does, consistently with the sentinel's observed reachability: the callback captures the variable, and the object's release follows the variable, not the controller.
- **Decided correction:** replace the comment, not delete it, and change nothing else. Without a comment, the read and the test's title still suggest that the sentinel checks the controller's release. A change to what the test asserts is `DRF-42`'s, not this finding's.
- **Routed** to [`heap-comment-handoff.md`](heap-comment-handoff.md), one `implementer` unit, which the owner starts.

#### DRF-42 — The destruction heap test's behavior sentinel can't detect a retained callback

Tier C, **closed at `a3423c793`**. Read by the architect on 2026-11-15 from the [size acceptance cleanup report](size-acceptance-cleanup-report.md) at `7f963e54a` (§Disposition of the size acceptance cleanup report): the sentinel is created inside `operateThenDestroy` and read only by `onStart`, a retained callback fails its assertion while the class count passes, the proof's row 3 fails it, and the unmutated test passes. Before closure: open. Registered by the architect on 2026-11-14 from the [final cleanup proof](reviews/final-cleanup/proof-reviewer.md) §Observation outside the change (§Disposition of the final cleanup). **Present since `a9c323f6a`**, which introduced the read as `void behavior`. **Not repaired by the final cleanup:** `27c60a9ac` moved the controller into an inner function and left the sentinel as it was, and `DRF-38`'s closure doesn't cover it.

- **Current behavior:** `drag:DRI-10 destruction` › "should retain no item, behavior, view or behavior instance after 3 operations and destruction" creates `behavior`, an empty object, keeps a `WeakRef` to it, and reads the variable in `onStart`. After destruction the test sets `behavior = null`, then asserts that the `WeakRef` is empty. The object is reachable only through that variable, so clearing the variable releases it whether or not anything keeps the callback. Row 3 of the proof's heap table shows a live controller kept in the test's frame passing the sentinel assertion. Row 4 shows the assertion failing only when the test keeps the variable.
- **Why it is a problem:** the title says the test checks that no "behavior" is retained, and the sentinel's assertion can't fail on a retained callback. The class count still detects a retained `SortableBehavior` instance. A retention of the consumer's callbacks that keeps no instance, such as a reference to the options that outlives `requestDestroy`, has no check in this test.
- **Required property:**
  - at the sentinel's assertion, nothing the test controls holds the sentinel's object, apart from the callbacks it passed to the controller. So the assertion fails when anything keeps those callbacks reachable after destruction;
  - a mutation that keeps the consumer's options or callbacks reachable after `requestDestroy`, and keeps no `SortableBehavior` instance, fails the sentinel's assertion while the class count passes. The proof's row 3 mutation fails the sentinel's assertion too;
  - the test's other assertions, its Chromium-only condition and its operations stay as they are. Its title states what its body checks.
- **Routed on 2026-11-15** to [`size-acceptance-cleanup-handoff.md`](size-acceptance-cleanup-handoff.md) item 10, on the owner's request. **Return to the architect** if the property needs a change under `src/`, or a change to another assertion. It said: routed to a drag test unit for an `implementer`, which the owner starts, and it doesn't gate the drag pull request.
- **At `3228d1f07`:** the test is as registered. Its comment in `onStart`, from `5b581fbdf`, already states that clearing `behavior` releases the object whether or not the controller is.

#### DRF-43 — Neither before arm of `compare.ts`, nor `measure.ts --prototype`, has bundled since `7d8d7a805`

**Found on 2026-11-15 by the architect, at `0870abd75`,** reading drag2's references for its retirement. **Open,** repaired by [`drag2-retirement-handoff.md`](drag2-retirement-handoff.md) item 6.

`compare.ts` and `measure.ts` alias `@ydinjs/box-quad` to the current `packages/box-quad/src` for every arm. `7d8d7a805` removed box-quad's `box()` and `space()` factories. drag2's `src/kernel/presentation.ts` and the prototype's `src/draggable/presentation.ts` at `599684791` both import them. Rolldown fails each bundle with `MISSING_EXPORT` for `box` and `space`. That was observed for `bench/lab-drag2.ts`, and for `bench/lab.ts` on the prototype's `src`. So `compare.ts` without `--before` can't run at all, and `measure.ts --prototype` can't run either. The same two imports are drag2's two `TS2724` errors in drag's typecheck.

**Required property:** an arm built from another revision's source bundles against box-quad at that same revision. For the prototype that's `packages/box-quad/src/index.ts` at `599684791`, one module with no imports. Bundled that way, `bench/lab.ts` on the prototype's `src` builds (72,714 B unminified, at `0870abd75`). drag2's arm is withdrawn by `DRD-64` property 4, so only the prototype needs the repair. `--before <revision>` bundles drag's `src` at that revision against the current box-quad, which is correct only for revisions from `7d8d7a805` on. **That limit is recorded and not repaired here:** no `--before` run before that commit is owed.

**Closed on 2026-11-15 at `5c1ce7bfe`** (§Disposition of the drag2 retirement review). The prototype arm and `measure.ts --prototype` alias `@ydinjs/box-quad` to `packages/box-quad/src/index.ts` at `599684791`, and every other arm keeps the current box-quad. The independent proof reproduced `measure.ts --prototype`'s column on all nine rows, and a one-row `compare.ts` run that reaches verdicts for the prototype, production and the control. The `--before` limit stays as recorded.

#### DRF-44 — `moveTo` reads its point when the move applies, and drag2 read it at the call

**Found on 2026-11-15 by the drag2 sweep** (drag2's `tests/free-drag/anchor.browser.test.ts:579-613` at `0870abd75`), and confirmed by the architect in `src/free-drag.ts`. There, the step closes over `point` and reads it when it runs. **Closed on 2026-11-15 by decision: drag's behavior stands.**

From inside a pass, such as `onMove`, `moveTo` defers its step (DRI-8). A consumer that changes the same `point` object before the step runs moves the visual to the changed value. drag2 captured `x` and `y` at the call. **This is accepted:** the point is the caller's, the parameter is `Readonly`, and the library doesn't copy what a caller owns (CONTRIBUTING §1.1, §9). The final placement equals the last call's whenever the caller doesn't change the point. The difference is listed in [`contract.md`](contract.md) §Accepted differences from drag2. No test is owed for it.

#### DRF-45 — drag's suite doesn't assert 18 guarantees that drag implements and only drag2's suite asserted

**Found on 2026-11-15 by the drag2 sweep** ([assessment](drag2-retirement-assessment.md) §3), and confirmed by the architect: no drag test fails if the implementing code is removed. One example: no drag test moves the pointer after `moveTo`, although its JSDoc says that the visual keeps following the pointer. **Open,** under `DRD-64` property 7. [`drag2-guarantees-handoff.md`](drag2-guarantees-handoff.md) lists the 18 rows and closes them.

**Required property:** each row is asserted by a drag test through the public API, and that test fails under a mutation of the code that implements the row.

**Reported on 2026-11-15** at `1a6551563` ([report](drag2-guarantees-report.md)). S2's rotate case stopped, and the report raised a fixture outside S2. Both are decided by `DRD-65`, with `DRD-66` (§Disposition of the drag2 guarantees report). **Still open,** until [`y-geometry-terms-handoff.md`](y-geometry-terms-handoff.md) reports and the guarantees unit has a proof. **2026-11-15:** that unit reported at `1c1e93bd9`, and `DRF-46` and `DRF-47` are closed. The guarantees unit's proof is still owed. **2026-11-15:** an independent [proof](reviews/drag2-guarantees/proof-reviewer.md) at `1c1e93bd9` found it not yet proved, with eight tier-B findings (§Disposition of the guarantee tests proof). [`drag2-guarantees-remediation-handoff.md`](drag2-guarantees-remediation-handoff.md) owes the repairs, and an independent recheck of them closes this finding.

**Closed on 2026-11-15.** The remediation landed at `cc3b839f9` and was reported at `349616213`. An independent [recheck](reviews/drag2-guarantees/remediation-recheck-reviewer.md) at `349616213` found all 12 of the proof's findings resolved, with no new finding (§Disposition of the guarantee tests remediation recheck). Each of the 18 rows is asserted by a drag test, and each cited mutation's log at `cc3b839f9` is under [`witnesses/`](probes/drag2-guarantees/witnesses/). Where no implementing code can be removed, the record says so: S6's no-op clause and S10's gap clause are regression tests.

#### DRF-46 — The S2 instrument demands exact agreement at a tie, which `y()`'s geometry doesn't give in the published build

**Found on 2026-11-15 by the guarantees unit** ([report](drag2-guarantees-report.md) §Stopped, at `1a6551563`), and **explained by the architect's [probe](probes/drag2-guarantees/ruling/README.md)**. With `__DEV__` false, S2's rotate fixture gives `at 95: proposed 1, measured 2`. At that sample the pointer is exactly 25 px from the placeholder's center and from a row's, and the rule keeps the incumbent on a tie. `y()`'s distance constant was measured from the rotated row, whose transformed rect Chromium reports at single precision, so the constant is 69.99999857 and not 70, and the predicted row center is nearer by 1.4 × 10⁻⁶ px. The development check re-measures the window after every committed move, which discards the error, so the source project passes. A pointer 0.01 px off the tie gives no disagreement in either build.

**Not a drag defect.** The error is far inside the 1/16 px to which drag's cache is specified to agree with a measurement (`EQUIVALENCE_SLACK`), and no one can observe a tie decided by 10⁻⁶ px. **The test's expectation is wrong,** because the instrument asks for bit-exact agreement. **The contract stated no precision,** so nothing said what agreement is owed. Decided by `DRD-65`, and the development check's part by `DRD-66`. **Open** until [`y-geometry-terms-handoff.md`](y-geometry-terms-handoff.md) reports.

**Closed on 2026-11-15** by `b6fef26c4`, reported at `1c1e93bd9`. The instrument admits a tie, and S2's rotate case passes in the source and consumer projects. `S2-tie-exact` witnesses the tie admission, as `DRD-65` property 5 now states (§Disposition of the `y()` geometry terms report).

#### DRF-47 — Margins that collapse on both sides break the linear shift rule, and `y.ts` and the contract admitted them

**Found on 2026-11-15 by the guarantees unit** ([report](drag2-guarantees-report.md) §For the architect), and **confirmed by the architect's probe**. Take a block column whose rows all carry `margin-top: 6px` and `margin-bottom: 10px`. The development check refuses the list, and the published build proposes a wrong gap (`at 203: proposed 2, measured 3`). Collapsed margins make the space between two neighbours the larger of their two margins. The default placeholder has no margins, so where it sits changes the spacing of rows it didn't cross: moved by one gap, it moved two uncrossed rows by 6 px. With the rows' margins on the placeholder, or in a flex column, both builds agree.

**The code and the development check are right: this list is outside the rule.** The text is what's wrong. `src/sortable/y.ts` says that "varying gaps and margins" satisfy the rule, and `DRI-14`'s Geometry paragraph stated no term that excludes this list, whose centers do increase along y. **A contract gap,** closed by `DRD-65` in the contract, with the `y.ts` correction in its handoff. **Open** until that handoff reports.

**Closed on 2026-11-15** by `b6fef26c4` and `953a0fcc6`, reported at `1c1e93bd9`. `y.ts`'s module comment and `y()`'s JSDoc state the term, and the instrument's two self-checks report the list and accept it with the rows' margins on the placeholder. The oracle records the list at a slot in both projects (§Disposition of the `y()` geometry terms report).

#### DRF-48 — In Playwright's Chromium 158, the kernel allocates more per sample than the hot-path allocation row's budget

Tier C, **closed at `3bbd506f6`** with `DRF-53`, read by the architect on 2026-11-21 at `82bfa8de7`. Registered on 2026-11-16 by the CI verification unit ([report](../../../.plan/ci-verification-1/ci-verification-report.md)), under `repo:RD-8` and its handoff's item 6. **A measurement row** (`repo:RD-7`), so it is outside the gate and is not disabled.

- **The row:** `tests/hot-path.browser.test.ts:261`, `drag:DRI-17 hot path` › "should allocate per sample only the CSS string a lifted write needs", in the `shipped` project. It carries the `measurement` tag.
- **Current behavior:** in Chromium 158.0.8127.18, Playwright's build since `27e54e9ac` (`repo:RD-9`), the kernel's bytes per move exceed the row's bound of 16. Readings: 36.5 and 28.2 B in the CI unit's two drag runs. In both, the only kernel key the sampler reported was `kernel/session.ts:handleEvent`, at 10,940 and 8,464 B over 300 moves. The row passed at `a8726c57d` in the development image's Chrome 157.0.8103.38. **The cause is not established.** No `src/` file changed between the passing and failing runs, so the browser version or its heap sampling is the inferred difference.
- **Why it is a problem:** the local `npx just test` in drag fails on this row until the owner of the budget decides (`RD-7` property 2), and CI reports it in the measurement job's comment and summary.
- **Required property:** the row's budget states what the kernel allocates per sample in the pinned Chromium, and the row passes there. Whether the bound moves or the kernel's allocation is reduced is drag's decision, not the CI unit's.
- **Routed** to the architect. The CI unit doesn't change the budget.
- **Dated 2026-11-17 by the architect: readings from the docs-gate unit,** which moved Vite from 8.3.8 to 8.4.0-beta.1 (`repo:RF-46`). They are from its [report](../../../.plan/docs-gate-1/docs-gate-report.md) and its [feature proof](../../../.plan/reviews/docs-gate-1/feature-proof-claude.md) (`reviewer-4`):

  | Reading | Commit | Vite | Row | B per move |
  | --- | --- | --- | --- | --- |
  | CI 44013920613, `main` | `4e85ac046` | 8.3.8 | passed | — |
  | CI 44016421012 | `5e1828d06` | 8.3.8 | passed | — |
  | CI 44018861028 | `3b38426cf` | 8.4.0-beta.1 | failed | 44.79 |
  | CI 44020422663 | `948390aa5` | 8.4.0-beta.1 | failed | 20.77 |
  | local, before the Vite change | — | 8.3.8 | failed | 30.4 |
  | local, after the Vite change | — | 8.4.0-beta.1 | passed | — |
  - In CI, the result split with the Vite version, 2 to 2. Locally, it split the other way.
  - **Neither variance nor Vite's version is established as the cause.** Two samples per version don't decide it. Whether Vite's version moves the reading is a question for this finding. The finding stays open, and its required property doesn't change.

- **Dated 2026-11-17 by the architect: two more CI readings,** from the [CI-speed report](../../../.plan/ci-speed-1/ci-speed-report.md), _The measurement rows' failing file_. Both runs are on Vite 8.4.0-beta.1:

  | Reading | Commit | Installer | Row | B per move |
  | --- | --- | --- | --- | --- |
  | CI 44035423615, `main` | `21392e738` | npm | failed | 18.77 |
  | CI 44055280400, `repo/ci-speed-1` | `633ef72d8` | aube | failed | 29.33 |
  - The row fails under both installers, so the move to aube isn't its cause. The CI-speed unit doesn't change it. The finding stays open, with the same required property.

- **Dated 2026-11-20 by the architect: this is `DRF-53`'s defect, and it closes with `DRF-53`'s repair.** `DRF-53`'s dating of this day establishes the cause, in the same Chromium. `handleEvent` is the only kernel key in these readings too. Playwright's drag interception runs page script on each held-button move, and the heap sampler attributes V8's work for that script to `handleEvent`. **The kernel doesn't allocate more per sample in Chromium 158.** With the row's moves sent by CDP, it reads 4.73 to 10.15 B per move against the unchanged bound of 16. So this entry's required property holds without moving the budget. The inference that the browser version or its heap sampling is the difference is replaced: the difference is whether the script's recompile cycle falls in the window. This entry closes when `DRF-53` does.

- **Dated 2026-11-21 by the architect: closed with `DRF-53`,** whose closure of this day gives the evidence. In Chromium 158, with the row's moves sent by CDP, the row reads 5.37 to 10.67 B per move in the [report](allocation-row-report.md)'s 20 runs and 3.51 to 8.88 in the 15 of the [feature proof](reviews/allocation-row/proof-reviewer.md)'s 20 that recorded figures, against the unchanged bound of 16. So the budget states what the kernel allocates per sample in the pinned Chromium, and the row passes there, which is this entry's required property. Until this dating the entry said **open**.

#### DRF-49 — In Safari, the `y()` sweep through `box` with a `visual` intermittently stalls until its timeout

Tier C, **open**. Registered on 2026-11-16 by the CI verification unit ([report](../../../.plan/ci-verification-1/ci-verification-report.md)), under `repo:RD-8` properties 1 and 4 and its handoff's _Resuming after the three Safari runs_. **Skipped in Safari only** (`it.skipIf(isSafari)`), in both `browser/drag` and `consumer/drag`, and the marking cites this address.

- **The row:** `tests/sortable.browser.test.ts`, `drag:DRI-14 candidates measured through box` › "should measure every y() candidate through box when visual is also given".
- **The engine:** Safari 27.2 on macOS 26.7.2, the `macos-26` runner, through the WebdriverIO provider.
- **The failure:** in three attempts of run 43830910625 at `ddf72ec4e`, the row passed in about 8.8 s in 4 of its 6 project runs and timed out at 15 s (`Test timed out in 15000ms`, at 15,206 and 15,194 ms) in 2: `browser/drag` in attempt 2 and `consumer/drag` in attempt 3. No run ended in between.
- **Attempt 2's aftermath** (run 43830910625): in `browser/drag`, the row after a timed-out sweep, _"should measure every xy() candidate through box, not through the item"_, failed on a missing placeholder (`null is not an object (evaluating 'list.querySelector("[data-drag-placeholder]")…')`), and the project then lost its browser connection (_"Browser connection was closed while running tests"_), so its other 29 files didn't run.
- **What is established:** the row's only waits are the WebDriver `pointerMove` command and `requestAnimationFrame` (`tests/support/gap-conformance.ts`'s `sweepGaps`), and Safari's pointer command delivers every interpolated move before it returns (`repo` CI unit's probe, run 43829273272). **The cause is not established.** No timeout was raised.
- **Required property:** the row finishes in Safari in every run.
- **Routed** to the architect. The CI unit doesn't change the row's instrument.

**Dated 2026-11-17 by the architect,** on `repo/ci-speed-1` at `229829ef7`: `repo:RD-12`'s amendment moves Safari out of the gate, into a weekly workflow that no rule requires. Once it is implemented, this row no longer fails `verify`. Its Safari skip stays and applies to the weekly run. The finding stays open, because no cause is established. **The row runs in Playwright's WebKit in the gate.** The CI-speed unit reads whether WebKit reproduces it, and if it does, it is a `repo:RD-8` row in WebKit.

#### DRF-50 — In Safari, the gap sweep with transitions on the rows and the item intermittently stalls until its timeout

Tier C, **open**. Registered on 2026-11-16 by the CI verification unit ([report](../../../.plan/ci-verification-1/ci-verification-report.md)), under `repo:RD-8` properties 1 and 4 and its handoff's _Resuming after the three Safari runs_. **Skipped in Safari only** (`it.skipIf(isSafari)`), in both `browser/drag` and `consumer/drag`, and the marking cites this address.

- **The row:** `tests/sortable.browser.test.ts`, `drag:DRI-9 authored transitions` › "should propose the gap a full measurement gives with transitions on the rows and the item".
- **The engine:** Safari 27.2 on macOS 26.7.2, the `macos-26` runner, through the WebdriverIO provider.
- **The failure:** in three attempts of run 43830910625 at `ddf72ec4e`, the row timed out at 15 s (`Test timed out in 15000ms`, 15,102 to 15,153 ms) in 4 of its 6 project runs: `consumer/drag` in attempts 1 and 3, and both projects in attempt 2. It passed in about 8.8 s in the other 2. No run ended in between. It also timed out in `browser/drag` in run 43827320614, before Reduce Motion was off.
- **Attempt 2's aftermath** (run 43830910625): in `browser/drag`, the row after the `y()` sweep's timeout (`DRF-49`), _"should measure every xy() candidate through box, not through the item"_, failed on a missing placeholder (`null is not an object (evaluating 'list.querySelector("[data-drag-placeholder]")…')`), and the project then lost its browser connection (_"Browser connection was closed while running tests"_), so its other 29 files didn't run.
- **What is established:** the row's only waits are the WebDriver `pointerMove` command and `requestAnimationFrame` (`tests/support/gap-conformance.ts`'s `sweepGaps`), and Safari's pointer command delivers every interpolated move before it returns (`repo` CI unit's probe, run 43829273272). **The cause is not established.** No timeout was raised.
- **Required property:** the row finishes in Safari in every run.
- **Routed** to the architect. The CI unit doesn't change the row's instrument.

**Dated 2026-11-17 by the architect,** on `repo/ci-speed-1` at `229829ef7`: `repo:RD-12`'s amendment moves Safari out of the gate, into a weekly workflow that no rule requires. Once it is implemented, this row no longer fails `verify`. Its Safari skip stays and applies to the weekly run. The finding stays open, because no cause is established. **The row runs in Playwright's WebKit in the gate.** The CI-speed unit reads whether WebKit reproduces it, and if it does, it is a `repo:RD-8` row in WebKit.

#### DRF-51 — In Safari, a TransformedStage box ends 16 px lower than where it was dropped

Tier C, **open**. Registered on 2026-11-16 by the CI verification unit ([report](../../../.plan/ci-verification-1/ci-verification-report.md)), under `repo:RD-8` property 4 and its handoff's _Resuming after the three Safari runs_, step 3. **Expected to fail in Safari only** (`it.fails`), and the marking cites this address.

- **The row:** `tests/stories.browser.test.ts`, `Free Drag stories` › "should keep a TransformedStage box where it was dropped". The file runs only in `browser/drag`.
- **The engine:** Safari 27.2 on macOS 26.7.2, the `macos-26` runner, through the WebdriverIO provider.
- **The failure:** after the drop, the box's top is 15.99997 px below its top just before the drop (`expected 15.999969482421875 to be less than or equal to 1`). Its left, width and height agree. It failed in every Safari run where it ran: run 43827320614, attempts 1 and 3 of run 43830910625 (attempt 2 lost the browser before the file) and run 43836389515. It passes in Chromium and Firefox. The `Interactive` story's row, which drags an untransformed box the same way, passes in Safari.
- **What is ruled out:** the hint above the stage rewrapping. `0ee0f9d84` measured the box within its area, and the row still failed by the same 16 px in run 43836389515, so the box moves within its stage. That repair is reverted.
- **The cause is not established.** The stage is rotated 6° and scaled 1.15 (`src/stories.module.css`, `.warped`), and the story commits the drop through the local delta.
- **Required property:** a TransformedStage box stays where it was dropped in Safari, as in Chromium and Firefox, and the row passes there without its marking.
- **Routed** to the architect. The CI unit doesn't change drag's source.

**Dated 2026-11-17 by the architect,** on `repo/ci-speed-1` at `229829ef7`: `repo:RD-12`'s amendment moves Safari out of the gate, into a weekly workflow that no rule requires. Once it is implemented, the row no longer runs in Safari in `verify`. Its Safari expected failure stays and applies to the weekly run. The finding stays open, because no cause is established. **The row runs in Playwright's WebKit in the gate.** The CI-speed unit reads whether WebKit reproduces it, and if it does, it is a `repo:RD-8` row in WebKit.

#### DRF-52 — In Safari, the equivalence oracle intermittently records a mismatch at an animated row in a `layoutAnimation` row

Tier C, **open**. Registered on 2026-11-17 by the architect, on the coordinator's report of run 44030423689 on `repo` pull request #30. **No row is disabled.** The row is in the gate.

- **The row:** `tests/layout-animation.browser.test.ts:183`, `layoutAnimation rows` › "should never animate the dragged item". It drags item 2 of 4 upward, so `layoutAnimation` animates rows 0 and 1. It waits only on WebDriver pointer commands and frames, with no wall-clock wait.
- **The engine:** Safari on the `macos-26` runner, through the WebdriverIO provider.
- **The failure:** attempt 2 of run 44030423689 at `a51e5cb1c`, in `consumer/drag`, at 170 ms. The row's own assertions didn't fail. The equivalence oracle (`DRD-67` property 4) failed the row at its end: _"the predicted insertion geometry disagreed with a fresh measurement at slot 0"_ (`tests/support/oracles.ts:311`, [log](../../../.plan/docs-gate-1/checks/safari-flake-44030423689-attempt-2.txt)). Slot 0 is a row that `layoutAnimation` animates at that moment.
- **Other runs:** in the same attempt, the file passed in `browser/drag`, and it passed in both projects in attempt 1. It passed in Safari in each of the branch's five earlier `verify` runs (44016421012 to 44027436469). `a51e5cb1c` differs from the green `8f62beedf` (run 44027436469) only in `.plan/`, and the branch changes nothing in `packages/drag` but this record.
- **The cause is not established.** One sample. The prediction and the fresh measurement read an animated row, and the oracle's precision is 1/16 px (`DRI-14`). A disagreement that depends on which frame of the animation each one reads is the candidate. It is an inference, not a reading. The file's earlier mismatch at slot 0 (`DRD-67`, _Property 7's stop_) came from a fixture that moved a row, and this row's fixture moves none.
- **For a change to the Safari job's speed:** the row has no wall-clock wait, so a change in load can't break it through a timeout. If the candidate holds, its result depends on which animation frames the two readings fall in, and so on how Safari schedules frames. That also changes with load. In both attempts, `browser/drag` and `consumer/drag` each took about 218 s, at 97 % test time, which is most of the `safari` step. The projects ran in a different order in each attempt.
- **Required property:** the row passes in Safari in every run. Any mismatch the oracle records there is either a defect in the prediction or one that `DRI-14` places outside the contract, and the record says which.
- **Routed** to the architect. The next step is a reading, and it isn't planned here.

**Dated 2026-11-17 by the architect,** on `repo/ci-speed-1` at `229829ef7`: `repo:RD-12`'s amendment moves Safari out of the gate, into a weekly workflow that no rule requires. Once it is implemented, this row no longer fails `verify`. It isn't skipped, so it can still turn a weekly run red, and that run's issue names it (`repo:RD-12` property 12). The finding stays open, because no cause is established. **The row runs in Playwright's WebKit in the gate.** The CI-speed unit reads whether WebKit reproduces it, and if it does, it is a `repo:RD-8` row in WebKit.

**Dated 2026-11-17 by the architect,** at `4136c0eea`: this row passes in Playwright's WebKit in the gate, in both projects, twice ([inventory](../../../.plan/ci-speed-1/checks/webkit-inventory.txt)). WebKit does fail the same oracle message deterministically, but in another row, `sortable.browser.test.ts`'s _"should cancel and report when an anchor leaves before the release"_, at slot 1. That row removes an anchor from the list on purpose, and the [CI-speed handoff](../../../.plan/ci-speed-1/ci-speed-handoff.md)'s _Disposition of the stop at `4136c0eea`_ decides it there. Nothing about it is read as this finding's cause.

#### DRF-53 — In CI's `measurements` job, the per-sample allocation row sometimes reads 28 to 83 bytes per move against its bound of 16, with the same code

Tier C, **closed at `3bbd506f6`**, read by the architect on 2026-11-21 at `82bfa8de7`. Registered on 2026-11-18 by the architect, on the coordinator's report of the `measurements` comments, relayed by the coordinator. `DRF-52` is the last `DRF-` on any branch, so this is the next free number. **No row is disabled.** The row is a measurement (`repo:RD-7` property 1), so in CI it reports and never fails the run.

- **The row:** `tests/hot-path.browser.test.ts:261`, `DRI-17` › _"should allocate per sample only the CSS string a lifted write needs"_. After 300 unsampled moves, it samples the heap at a 64-byte interval over 300 more. Then it bounds the bytes attributed to `kernel/` and `draggable.ts` per move at less than 16.
- **Observed** in each pull request's size comment, which reports that pull request's latest run. The row passed on #37, #38, #39 and #61, and failed on #59, #66, #67 and #68. In the failures, `kernel/session.ts:handleEvent` holds 8,496 to 24,836 bytes over the 300 moves. In #68's run 44279774938 (job 134717402054), which the architect read, it is 24,836, or 82.79 per move. The `DRF-2` row beside it passed in all eight.
- **The same code passes and fails.** #61's run 44275172650 at `6166ae132` passed it, and #59's run 44278340916 at `9ba55d78d` failed it. `packages/drag`, `packages/core` and `packages/box-quad` are identical at `7a4f82eb4` (#61's merge), at `a133bebee` (#59's) and at #68's head.
- **The cause isn't established,** and nothing was read locally. Two candidates:
  - when sampling starts, the kernel's handler isn't yet in its optimized tier, on a slower or busier runner. The row's own comment says that the warm-up exists for this;
  - the sampler attributes to `handleEvent` an allocation made by inlined code.
- **Why it matters.** A notification that fires with no change teaches readers to ignore the row. Locally, `just test` runs every row (`repo:RD-7` property 2), so the row can also fail a drag unit's local run with no change (`DRD-68` property 5).
- **Required property:** the row's result depends only on the code. Either it reads within its bound in every run at a tree whose kernel allocates nothing per sample, or the record states the variance it measures and the row bounds only what it can measure.
- **The architect's direction:** read first. Run the row repeatedly at one tree, locally and in the `measurements` job, and record `handleEvent`'s bytes in each run, with the warm-up as it is and lengthened. The repair is decided from that reading.
- **Routed** to the owner to order, through the work queue (`repo:RD-22`). **It doesn't block** any pull request.

**Dated 2026-11-19 by the architect: the row failed once in a local full run, with no change to drag.** From the trait migration's [proofs record](../../../.plan/trait-migration-1/checks/proofs.md) §2, read on `repo/traits-migration-1` at `aa73be64e`, relayed by the coordinator.

- **The failure:** in the root `just test` at the migration's last commit, the row read 23.69 bytes per move against its bound of 16. That full run had 2,117 tests, and this row was the only failure.
- **The same code:** `packages/drag` and `packages/box-quad` are identical on that branch and on `main` at `24c6672ce`. drag doesn't use traits.
- **Alone, at the same tree,** the file passed, 9 of 9.
- **This is the first local failure the record holds.** The entry said that nothing had been read locally. Like the CI failures, this reading names no cause, and it didn't record `handleEvent`'s bytes, so it doesn't choose between the two candidates.
- **The direction and the required property don't change.** The reading the direction asks for should record each function's bytes, in full runs and in runs of the file alone.

**Dated 2026-11-20 by the architect: the cause is established, and the repair is decided.** The owner raised issue #70 to _Queued_, relayed by the coordinator, with Mx Reviewer B's runs (4 of 5 failing at `e4b0e475d`, 1 of 5 at `69b721a3e`; [transcript](https://github.com/ausginer/material-x/blob/84ca8cd26/.plan/reviews/trait-decorator-2/checks/drag-flake.txt) on `repo/trait-decorator-2` at `84ca8cd26`) and Mx Implementer's (1 of 4 at `645410c12`, 1 of 3 later). The architect read the row on `drag/alloc-flake-1` at `e4b0e475d`, in Playwright 1.65.0's Chromium 158.0.8127.18, over 72 runs, each recording every function's bytes and `handleEvent`'s tier ([reading](measurements/2026-11-20-allocation-row.md), [probes](probes/allocation-row/)).

- **The cause: Playwright's drag interception, which the sampler attributes to the kernel.** In Chromium, each Playwright mouse move with the left button held runs page script in every frame. One script assigns a global, and a second one deletes it after the move. Once V8 starts optimizing the first script, it discards the code on the next move and optimizes it again, nearly every move. The sampler files V8's work for each cycle under `kernel/session.ts:handleEvent`: about 200 to 350 B per cycle, in objects of 36 to 380 B. With Playwright's mouse, the row failed in 17 of 29 runs, one of them a full run of drag's suite. The 22 runs with a reading read 3.53 to 102.37 B per move, and the traced ones had 3 to 143 cycles inside the window. Across runs, `handleEvent`'s bytes follow the cycle count.
- **What is ruled out.** The kernel's tier: in the `DRF-2` row, `handleEvent` is Maglev code before and after its window, and it still reads 8 to 33 KB with 67 to 166 cycles. The 64-byte interval, garbage-collection timing and Vite. Test order and the other tests in the page act only through when the cycle starts, which the repair makes irrelevant.
- **The CDP arm.** With the row's 600 moves sent by CDP `Input.dispatchMouseEvent`, the call Playwright's own move makes after its interception, no cycle runs in the window. The row then passed in 22 of 22 runs, alone and in two full runs of drag's suite, at 4.73 to 10.15 B per move. One escaping `{ x, y }` per sample in `Session.#move` failed it in 5 of 5, at 59.08 to 62.36.
- **Two facts about the row.** Its warm-up doesn't reach the optimized tier: `handleEvent` is in Sparkplug when sampling starts and in Maglev when it ends, in every run at 300 moves. And its `lift.ts:translate` key exists only while `translate` isn't inlined: a warm-up of 1,000 or 3,000 moves inlines it into `sortable/operation.ts:move`, and the row's second assertion fails in 12 of 12 runs.
- **Decided: the repair.** The row's warm-up and sampled moves go through CDP, as the [handoff](allocation-row-handoff.md) requires. The bound, the interval, the warm-up's length, the keys and both assertions don't change. So neither what the row measures nor its budget moves, and no owner decision is needed. The row's comments are corrected to what holds.
- **Not adopted,** with the reasons in the handoff: a longer warm-up, a higher bound, forced optimization, excluding `handleEvent`'s bytes, and synthetic events.
- **The required property doesn't change.** The finding closes when the handoff's proofs hold. **Unimplemented:** an `implementer` unit takes the handoff on `drag/alloc-flake-1`.
- **Size:** _medium_. The repair has its own branch and pull request, with nothing to decide first.

**Dated 2026-11-21 by the architect: closed.** The repair is implemented on `drag/alloc-flake-1` (#94): `3bbd506f6` sends the row's 600 moves by CDP. Read from the implementer's [report](allocation-row-report.md) at `5239af750`, and Mx Reviewer B's [feature proof](reviews/allocation-row/proof-reviewer.md) at `82bfa8de7`, which finds nothing. Until this dating the entry said **open**.

- **The required property holds.** At a tree whose kernel allocates nothing per sample, the row reads within its bound in every run:
  - 20 of 20 runs of the file alone, at 5.37 to 10.67 B per move. The feature proof's 20 independent runs passed too, and the 15 that recorded figures read 3.51 to 8.88;
  - 3 of 3 root `just test` runs, at 10.39, 6.25 and 9.15;
  - three attempts of CI's `measurements` job at `a4d6f03a8`, and its run at `5239af750`, read from the job logs. The job is `continue-on-error` and its test step ends in `|| true`, so a green job doesn't show the row's result.
- **A regression still fails it.** One escaping `{ x, y }` per sample fails it in 5 of 5 runs, at 54.48 to 65.92 B per move, and in the feature proof's 5 of 5, at 55.08 to 71.07.
- **The cause is gone from the window.** In five traced runs, no recompile of Playwright's script falls in it. With the moves sent back through Playwright's mouse, the same instrument counted 67 and 46, and the row failed. The moves are the same input: one trusted `pointermove` each, with the same coordinates, `buttons`, `pointerType` and `pressure`.
- **Accepted within the handoff: the Playwright move after the window.** The row adds one `pointerMove` to the last CDP point, after `stopHeapSampling` and before `Escape`. The sampler doesn't see it, it adds no input to the window, and it is how property 3 holds: it makes Playwright's position agree with the browser's before the harness releases the button. Property 2 names the press and its first move, and both are unchanged. The handoff's scope didn't name the statement, and it needs no amendment.
- **A correction to the handoff's P3.** Its anchor, `this.#drag.y = event.clientY;`, occurs twice in `src/kernel/session.ts`: in `#move` (`:374` at `5239af750`) and in `#up` (`:414`). The handoff names `Session.#move`, so the mutation goes after the occurrence in `#move`, where both units put it. The feature proof's first attempt used a replacement that refuses an anchor found twice, so it applied nothing, and its five runs are counted under P1.
- **Observed, not required:** with the row on CDP, no cycle appears in the `DRF-2` row's window either, although that row still moves with Playwright's mouse. When the cycle starts depends on the page's earlier held-button moves. The `DRF-2` row bounds `translate`'s bytes, not `handleEvent`'s, and it passed in every reading.
- **Nothing stays open.** The row stays a measurement (`repo:RD-7`). Its comments say _"about 5 to 10"_ B per move, and the readings run from 3.51 to 10.67, within the "about". `DRF-48` closes with this entry.

#### DRF-54 — In WebKit in CI, two arrow presses in a row moved an item one slot, once, with no change to drag

Tier B, **closed at `767d489f6`**, read by the architect on 2026-11-25. Registered on 2026-11-23 by the architect, on `repo/register-observations-7`, from [#194](https://github.com/ausginer/material-x/issues/194), relayed by the coordinator. `DRF-53` is the highest `DRF-` on any branch on `origin`, so this is the next free number. **No row is disabled.**

- **What was observed** ([reading](../../../.plan/observations-7/checks/webkit-two-arrows.txt)): in `verify` run 45142741219 on #192, whose changes are records only, the `webkit` job's attempt 1 failed `consumer/drag/webkit` › `tests/focus.browser.test.ts` › `DRI-12` › _"should let two arrow presses in a row reorder twice"_, at `:29`. It expected `r1,r2,r0,r3`, and the list was `r1,r0,r2,r3`. Attempt 2 of the job passed.
- **What it says:** one press moved the item one slot, and the other did nothing. The list doesn't show which press was lost, or where focus was, because the row's focus assertion is after the failed one. The result is the same when the first press is lost and when the second is.
- **The rest of the run:** the row's other 12 in the file passed. In `browser/drag/webkit`, all 13 passed, the row among them. The sibling row for `end`, `order.browser.test.ts:88`, passed in both projects, and so did `keyboard.browser.test.ts` and `activation.browser.test.ts`. The code under test is the same: `packages/drag`, `packages/core` and `packages/box-quad` are identical at #192's head and at `35ea25892`.
- **By reading, what could drop one press:**
  - the command's whole operation is synchronous, and a second command is refused while a session is open (`Gesture.#command`). The consumer's `onReorder` and `accept` complete in the first press's pass, so a second press can be refused only if that pass didn't end;
  - the press goes to the focused element. If focus isn't on `r0` when it arrives, no command is admitted. `restoreFocus` returns it only when the document's focus is on `body` or nothing;
  - the first press can come before the frame has focus, because it is the first input of the file;
  - the second press can arrive after the two frames that `frames()` waits. A press is a separate message from the runner to the browser.
  - None of these is shown.
- **Why it matters:** `DRI-12` is the rule that a reorder doesn't lose focus, so the row is the one that would catch a real loss. A row that fails with no change teaches readers to ignore it (compare `DRF-53`). In the package it would be a lost reorder for a keyboard user.
- **The first reading owed:** in WebKit, locally (the image has its system libraries since `DRO-18`'s note of 2026-11-17), repeat the row in the `consumer` project, alone, in a run of the file, and beside busy processes. Record for each failure the order of `keydown` events the list sees, `document.activeElement` before and after each press, and the result at the end of the wait. Name the press that is lost and where it went. If it doesn't reproduce, the record says how many runs passed and under what load, and the entry stays open.
- **The direction:** don't lengthen the wait to pass the row. A wait is a repair only after the reading shows that the press arrives late.
- **Required property:** the row's result depends only on the code. Either the cause is known and repaired, in the test or in the package, or the record states what a run can't control.
- **It doesn't block** any pull request. A rerun settles the gate.
- **Size:** _not known yet_: the reading is small, and the repair depends on its result.

**Dated 2026-11-25 by the architect of slot b: diagnosed, on `drag/quick-presses-1` from `2c83c7bc0`. The cause is the instrument's, and drag loses no press.** Requested by the coordinator. No code and no test changes here. The labels `A` to `C` are local, for the architect who takes the entry.

- **The first press is lost, and it goes to the runner's page.** A test runs in a frame of Vitest's page. The trace of 4 failures of 4 ([traces](quick-presses-1/checks/traces.txt)) is the same: `r0` has focus, `document.hasFocus()` is true in the test's frame, and the parent's `activeElement` is the frame. Then the first `keydown` reaches the parent's `body`, 1 to 13 ms after `focus()`, and drag's frame never gets it. The second `keydown` reaches `r0` and moves it once. Focus is on `r0` at the end. Nothing is reported, and nothing later arrives within a second.
- **Why:** in WebKit the UI process chooses the frame of a key by its own `m_focusedFrame`, and the web process updates it with the asynchronous message `FocusedFrameChanged` (`WebPageProxy::sendKeyEvent` and `focusedFrameChanged`, `WebChromeClient::focusedFrameChanged`, read in WebKit's `main` on 2026-11-25, not at build 2388's revision). A press that Playwright sends right after `focus()` can be handled before that message. The order follows from the readings, and the two processes weren't traced.
- **The control has nothing of drag** ([probe](quick-presses-1/probes/frame-focus.browser.test.ts.txt), [WebKit](quick-presses-1/checks/frame-focus-webkit.txt), [the others](quick-presses-1/checks/frame-focus-others.txt)): a script focuses a button in a frame without focus, and `keyPress` is called at once. In each round, `activeElement` and `hasFocus()` were right before the press. The variants are interleaved, beside `y-geometry` on the second page, on two CPUs, in three runs:

  | Between `focus()` and the press | Keys to the wrong frame, of 750 |
  | --- | --- |
  | Nothing | **22** |
  | One frame | 1 |
  | Two frames | 0 |
  | A mouse release, a `Shift` press, or Vitest's own `userEvent.keyboard` in place of `keyPress` | 0 each |

  At rest, with no second page, 0 of 250 for each. Chromium and Firefox: 0 of 250 for each, with `y-geometry` in the run.

- **It needs a busy second page, not a slow machine** ([runs](quick-presses-1/checks/row-runs.txt)). The row, traced, in `consumer/webkit`:
  - 242 files of the probe, whose first input is the row, beside each other: 0 failures. 60 of them were beside six busy processes on their two CPUs, where the two presses took 60 to 179 ms. 2,420 repetitions in the same frames, and 2,420 with the second press sent before the first returned: 0 failures.
  - in CI's order, after a copy of the verdict suite and beside `y-geometry`: **4 failures of 130**, 1 of 40 on four CPUs and 3 of 90 on two. The machine has 12, and its load was 2 to 8 (one minute) because other sessions ran.
  - _Why a busy page_ is by reading: the two pages share WebKit's UI process.
- **Why this row:** it is the one whose press is the first input of its frame and asserts a count of two. In the `consumer` logs `verdict` comes before it in 436 of 436, and `y-geometry` is still running in 427 of 436. `keyboard.browser.test.ts`'s first row has the same exposure, and hasn't failed. After the first focus the frame keeps it, so no later row is exposed. `keyPress` is the only command in the repository that calls Playwright's keyboard itself. Vitest's `userEvent.keyboard` first evaluates in the frame, so material-x and core aren't exposed.
- **It came back three times, not once** ([history](quick-presses-1/checks/ci-history.txt)): run 45142741219, run 45267554979 on #219, and run 45361184938 on `material-x/slider-1` on 2026-11-24, which ended as cancelled, so no failed gate shows it. All in `consumer/drag/webkit`, with the same values, and no change of drag. It is 3 in about 437 jobs since 2026-11-16. Cancelled jobs weren't read. Three of three in `consumer` isn't evidence that `browser` differs: the control lost keys in `browser`.
- **What is excluded.**
  - _A press refused by drag:_ the oracle fails a row that ends with a refused trusted event, and no log has that. In the traces the lost `keydown` isn't in drag's document at all.
  - _Two commands:_ a command is admission, activation, drop, verdict, `settle`, release and `end` in one pass. With `onReorder` and `accept` synchronous, the session is out of its slot before the next task, so a second `keydown` finds none. No unawaited second press was lost. With an asynchronous verdict, a press during it is refused by contract (one session at a time), which isn't this.
  - _Focus restoration and the placeholder's release:_ each runs in that pass, and the trace has `focus` on `r0` before that press's `keyup`.
  - _`DRD-71` (`repo:RF-127`):_ the three CI failures precede it, the four here follow it, and it changes an argument of `onStart`. `DRF-48` is closed and changes no source.
- **No user can meet it through drag.** It takes a script that moves focus into another frame within milliseconds of a key. A key then goes to the frame that had focus, before drag's document sees anything. The tier stays B.

**Options.**

- **(A) `keyPress` makes one round trip to the test's frame before the key. Recommended.** Playwright's branch evaluates an empty function in `context.frame()`, as Vitest's own keyboard command does. The reply is sent by the web process after `FocusedFrameChanged`, on the same connection, so the UI process has the frame when the key comes. It is one place, it covers each file and a nested frame, and it isn't a wait. Cost: one evaluation for each press. In `hot-path.browser.test.ts` every press is after the measured window.
  - _Read as a candidate_ ([diff](quick-presses-1/probes/key-press-ack.diff), applied and taken back): the control's first line falls from 22 of 750 to 0 of 750 ([reading](quick-presses-1/checks/frame-focus-candidate.txt)), and the row from 3 of 90 to 0 of 150, beside `y-geometry` on two CPUs. If the rate were still 3 of 90, 0 of 150 has a probability of about 0.6 %.
  - _The suites with it,_ browser, consumer and shipped projects: Chromium 878 passed, Firefox and WebKit 858 passed and 20 skipped ([reading](quick-presses-1/checks/suites-candidate.txt)).
- **(B) The harness focuses its frame and makes a round trip once for a file:** `window.focus()` and an awaited `pointerUp` in a `beforeAll`. It leaves the commands alone, but a row that focuses a nested frame stays exposed, and it rests on a mouse release having a reply, which is read in the control only.
- **(C) The row alone,** with a press of `Shift` or a release before the two. `keyboard.browser.test.ts`'s first row stays exposed, and the next file that begins with a key is too.
- **Not proposed:** two frames before the press (0 of 750, but one frame lost 1, so it is a wait), a longer wait after it (the key never arrives), a retry, and one page for WebKit (slower by `repo:RD-12`, for a race that a round trip closes).

**Required properties, for (A):**

1. A key that `keyPress` sends under Playwright is dispatched in the frame that the test has focused before the call, in the three engines, whatever another page does.
2. The wait is for the page's reply. No time, no frame count and no retry.
3. The row doesn't change, and neither does its wait. Safari's branch doesn't change.
4. No measured window of `hot-path.browser.test.ts` contains the round trip.

**Rows and witness:** no new row, because a race has no deterministic row. The witness is the control and `pairs.sh`, by `frame-focus.sh webkit y-geometry` and `pairs.sh 30 consumer/webkit y-geometry` on two CPUs (`taskset`), each in three runs. Before the repair the control loses keys in _nothing between_ and the pairs fail. After it neither does. The suites run one engine at a time. **Size:** _small_, about ten lines in `tests/support/commands.node.ts`.

**`DRD-72` (#265, read at `5e1b88dd8`) neither helps, hides nor worsens it.** It moves reports and reads into `drop()` and `settle`, which run only after the `keydown` has reached drag's document. A file of its rows that begins with a key is exposed, as any other, so (A) is worth having before its implementation. It doesn't depend on it. Its plan says that the row isn't touched, and (A) doesn't touch it.

**No question for the owner.** Not read: Safari, and the WebDriver branch. WebKit's two processes weren't traced. **The entry stays open** until the repair is in, and the acceptance is the architect's.

**Dated 2026-11-25 by the architect: the diagnosis and (A) are accepted, with one claim corrected and two properties added.** Requested by the coordinator. Read: the note, the probes and their readings, `commands.node.ts` at `923ab358a` and Vitest's Playwright provider.

- **It holds.** The trace has the first `keydown` in the parent and none in drag's frame, and the control loses keys with nothing of drag. So the loss comes before drag sees anything. The message order is an inference, as the note says, and (A) rests on the readings: 0 of 750 and 0 of 150, against 22 and 3 of 90.
- **Corrected:** _"`keyPress` is the only command in the repository that calls Playwright's keyboard itself … so material-x and core aren't exposed."_ `userEvent.keyboard` evaluates in the frame first, through `focusIframe`, and `userEvent.tab` doesn't. It is Vitest's own command, core and material-x call it 18 times by `grep`, and a file whose first input is it after a script's `focus()` has the same exposure. No such failure is known, so nothing is registered and this unit doesn't change it.
- **The round trip doesn't blunt the row.** It puts some milliseconds between the two presses, and the row's purpose is that focus is back by the second. Read ([reading](quick-presses-1/checks/row-sensitivity.txt)): `restoreFocus` removed, or called by a microtask, a frame, a zero timeout or 30 ms later, 20 runs in Chromium and WebKit, without (A) and with it. Each verdict is the same with (A) as without: removed and 30 ms fail in both engines, one frame fails in WebKit alone, a microtask and a zero timeout pass.
- **A nested frame** is the control's own case. A cross-origin one isn't, and no row has one.

**Properties added to the four:**

5. A rejected or missing frame fails the command. Nothing is caught, and no press goes out without the round trip.
6. The row still fails with `restoreFocus` removed, and with it 30 ms late, in Chromium and WebKit.

**The implementer's list,** on `drag/quick-presses-1`:

1. The candidate's change in `tests/support/commands.node.ts`, with a comment that says why: in WebKit the UI process can still hold the runner's frame as focused, and the reply of the page comes after its message. The type of the context is the file's own style. No test and no source file changes.
2. The witness as the note has it: `frame-focus.sh webkit y-geometry` and `pairs.sh 30 consumer/webkit y-geometry` on two CPUs, three runs each, before and after. Before must lose keys in the control. If `pairs.sh` loses none before, its result isn't a witness, and the control is enough. After, none is lost.
3. Property 6, read once with and without the repair.
4. The drag suites in the three engines, one at a time, typecheck, lint, the root format check. Property 4 by reading `hot-path.browser.test.ts`: at `923ab358a` each press follows the end of its window.
5. The pull request says `Closes #194`.

**No feature proof is owed:** no shipped file changes, and the discriminating reading is the control. **Closure** is the architect's, on that list and a CI that passes on the last commit. One CI isn't a witness for a 1 % race, so the record has the control's counts.

**`DRD-72` (#265) doesn't wait for this,** as the note says, and this doesn't wait for it. It neither changes the command nor the row. Until (A) is in, a file of its rows that begins with a key can fail in WebKit, and such a failure is this entry's. #194's description no longer holds: the cause is known, and it is the test's.

**Dated 2026-11-25 by the implementer: (A) is in, on `drag/quick-presses-1`, with `main` merged at `ca6918376`, and not closed.** Requested by the coordinator. One [reading](quick-presses-1/checks/repair.txt) has all of the below.

- **The change,** in `tests/support/commands.node.ts` alone: `keyPress` evaluates an empty function in the test's frame before the key, under Playwright, with a comment that says why. Nothing is caught. The context's type is a helper beside `pageOf`. No test and no source file changes.
- **The control,** WebKit, `y-geometry` beside, on CPUs 10 and 11, three runs of 250 keys: before **24 of 750** keys (7, 9 and 8) go to the wrong frame, after **0 of 750**. The other variants lose none, before and after.
- **The pairs,** 30 a run, three runs: before 1 of 90 (0, 0 and 1), after 0 of 90. The failure's trace has the first `keydown` in the parent. At that rate 0 of 90 says little, so the control is the witness.
- **Property 6,** 20 runs each, without the repair and with it, in Chromium and WebKit: unmutated passes, `restoreFocus` removed and 30 ms late fail, with the same assertion.
- **Property 4,** by reading `hot-path.browser.test.ts`: each of its presses follows the end of its window.
- **Suites,** browser, consumer and shipped: Chromium 878 passed, Firefox and WebKit 858 passed and 20 skipped. Typecheck, lint on the file and the root format check pass.
- **Not run:** Safari, whose branch doesn't change.

**Dated 2026-11-25 by the architect: closed at `767d489f6`.** Requested by the coordinator. Read: the diff of the commit, its [reading](quick-presses-1/checks/repair.txt), `hot-path.browser.test.ts` and the job log of `verify` run 45648244003. No reading was repeated.

- **Required property:** the cause is known and it is repaired in the test, so the row's result depends on the code. The witness is the control, 24 of 750 keys to the wrong frame before and 0 of 750 after. The pairs, 1 of 90 before and 0 of 90 after, say little at that rate.
- **Properties 1 to 6 hold.**
  - _1:_ the control in WebKit. In Chromium and Firefox the control lost no key without the repair, it wasn't run with it, and their suites pass.
  - _2 and 5, by reading:_ `keyPress` awaits the evaluation in the test's frame and catches nothing, so a missing or rejected frame fails the command before the key.
  - _3:_ outside the record, the branch's only changed file is `tests/support/commands.node.ts`, and its hunks are the type, the helper and the Playwright branch of `keyPress`.
  - _4, by reading:_ each of the five presses follows the end of its row's window.
  - _6:_ with `restoreFocus` removed, and 30 ms late, the row fails in Chromium and WebKit, without the repair and with it.
- **CI:** `verify` run 45648244003 passes at `767d489f6`, in the three engines. Its `measurements` job reports a failure. Its 12 rows pass, and its Comment step ended with _"unexpected end of JSON input"_ from `gh api`, so the size comment wasn't posted. That is neither the row's nor this change's, and nothing is registered for one occurrence. The run is one pass of a race of about 1 %, so it isn't the witness. The commit of this note changes the record alone.
- **Accepted departures:** other sessions ran in the container, before and after. The loads of the control and the pairs are in the reading, and the control needs a busy second page, not an idle machine. The 30 ms mutation takes `restoreFocus`'s arguments at once, which is the mutation that property 6 asks for. The pairs' reporter printed a probe's line only for a failure, and the totals are the file's own counts.
- **Remaining limits:** Safari wasn't run. A cross-origin nested frame has no row. `userEvent.tab` has the same exposure, with no known failure, as the acceptance says.
- Until this dating the entry said **open**, because the instrument was unsound until the cause was known. The package loses no press, so the tier stays B.

#### DRF-55 — A landing is reported as a fault when the dropped item left its list during the verdict

Tier A, **open**, pre-existing. Registered on 2026-11-23 by the architect, on `material-x/live-region-1`, from `reviewer-2` of the [feature proof](../../../.plan/reviews/live-region-1/feature-proof-claude.md) of #197, relayed by the coordinator. `DRF-54` is on `repo/register-observations-7` (#195) and is the highest `DRF-` on any branch on `origin`, so this is the next free number. Read at `85051cf6c`, and the reading is in the proof's [`shifts.txt`](../../../.plan/reviews/live-region-1/checks/shifts.txt).

- **What happens:** the consumer removes the item, or moves it to another list, while the verdict is pending, and then accepts. With a `landing`, `#landingTarget` finds the placeholder not beside the item and throws `sortable/landing-placeholder-lost`. It reaches `reportError` as a `DragFault`, once. The outcome stands and the controller stays usable. In `mx-sortable-list`, whose list accepts at its own bound, this is the only outcome that a consumer who deletes the item can get, unless it rejects the event in the handler.
- **The package agrees with itself:** `DRI-13` says that a landing that can't run _"is reported and skipped"_, and three rows expect the report (`landing.browser.test.ts`, _"should report and skip a landing when the consumer unmounted the item, and stay usable"_ and the row that moves it, and one in `frameworks.browser.test.ts`). So no code departs from the contract, and the finding is the contract.
- **Why it is a finding:** drag accepts a removed item everywhere else. A removed item cancels the drag, and a disconnected item declines an activation, without a report (`README.md`, `DRI-3`). After the drop, _"a collection change no longer affects the operation"_. Nothing in the README asks that the item stay during the verdict, so by `CONTRIBUTING.md` §1.1 removing it is valid input. A consumer of a list that others change can't prevent it. The report is a page-level error that the consumer didn't cause.
- **Decided direction:** a landing with nothing to land isn't a failure.
- **Required properties:**
  1. When the item isn't connected, or is in another parent than the list it was lifted from, the landing is skipped and nothing is reported. The outcome, `onEnd`, focus and the release stay as today.
  2. A placeholder that is lost while the item is still in its list is reported, as today, and skipped.
  3. The same holds for a home landing: a rejection, a cancel, and a cancel requested after the root left the document (below).
- **Rows:** the three above expect no report. A new row keeps property 2, with the placeholder removed and the item in place. A new row is a rejection with the item removed. A new row is `requestCancel()` with the root removed. **Witness:** each fails before the repair, apart from property 2's, which fails if the report is dropped for every case.
- **Amends `DRI-13`,** by the unit that takes it: _"A landing that can't run, including a throw from `start`, is reported and skipped, and the outcome stands. A landing whose item has left its list is skipped with no report."_
- **A proposal that was never registered is taken in here.** The [list-sortable plan](../../../.plan/list-sortable-1/list-sortable-plan.md#proposed-drag-finding-a-cancel-after-the-root-left-the-document) proposed a finding for `requestCancel()` after the root left the document, under the label `DRF-54`, and the [report](../../../.plan/list-sortable-1/list-sortable-report.md) cites `drag:DRF-54` for it. The label was a proposal and was never an address. Those citations mean this entry. `DRF-54` is another finding. The case wasn't reproduced in drag's own suite.
- **Not read:** the published package's size effect.
- **Ready** for an implementer, in its own pull request. It doesn't block #197.
- **Size:** _small_.

#### DRF-56 — With a landing, an item that left the collection but stays in its list is landed from the wrong place

Tier A, **open**, pre-existing. Registered on 2026-11-25 by the architect, on `drag/displacement-1`, from the rulings on #265's implementation (`DRD-72`'s last note). `DRF-55` is the highest `DRF-` on any branch on `origin`, so this is the next free number. Read in Chromium at `60caca966` and with `main`'s source at `ca6918376` ([reading](displacement-1/checks/late-commit.txt), [probe](displacement-1/probes/late-commit.browser.test.ts.txt)). It is the same with `displacement` and without.

- **What happens:** during a drag the consumer drops the item from `items()` but leaves it in the list, and calls `invalidate()`. The drag is canceled (`sortable:item-removed`), and with a `landing` the visual jumps to another place and flies from there to its own. `r1`, released at 130 px, is drawn at 170 in the first frame. `r3`, released at 50, is drawn at 170.
- **Why, by reading:** `homeInsertion` gives an absent item `from = -1`, and so the gap before the first row. `rebase` keeps it as the home, and `#landingTarget` moves the placeholder there and measures it. The offset of the flight is then from the first row's place, and the visual's own place is elsewhere.
- **Why it is a finding:** `README.md` says that a removed item cancels the drag, and nothing asks that the node be removed with it. A filtered list does this.
- **Decided direction:** the place of an item that left the collection is where it stands, as `DRD-72` has it for the rows.
- **Required properties:**
  1. The landing of an item that isn't in the collection at the last pull and is in its list lands at the item's own place, from where the visual was drawn, in the three engines, for `y()` and `xy()`, with `displacement` and without.
  2. Nothing changes for an item that is in the collection, or that left its list (`DRF-55`).
- **Rows:** one for each property-1 case, reading the first drawn frame after the cancel. **Witness:** each fails at `60caca966`.
- **Not read:** Firefox, WebKit and Safari.
- **Ready** for an implementer, in its own pull request, after #275. It doesn't block it.
- **Size:** _small_.

#### DRF-57 — Rows jump where the placeholder doesn't replace the item's whole footprint

Tier A, **open**, pre-existing, **not ready: the form isn't decided.** Registered on 2026-11-25 by the architect, on `drag/displacement-1`, from `reviewer-2` of #265's [feature proof](reviews/displacement-1/proof-reviewer.md) at `7afeebd11`. `DRF-56` is the highest `DRF-` on any branch on `origin`, so this is the next free number. The proof read it in the three engines for the `y()` lists and in Chromium for the `xy()` ones, and `main`'s source in Chromium ([cases](reviews/displacement-1/proof-reviewer-probes/cases.txt), [probe](reviews/displacement-1/proof-reviewer-probes/proof-cases.browser.test.ts.txt)).

- **What happens:** the placeholder has the size that the lifted visual had, and nothing more. The rows jump by what else the item took with it, or leaves, when it is lifted, committed or released:
  - **rows with margins that the placeholder hasn't,** such as `margin-bottom: 8px` with `y()`: 8 px;
  - **a visual that isn't the item, in an item with a footprint of its own,** such as 6 px of padding: 12 px in `y()`, 12 to 24 px in `xy()`, and a row goes to another line where that footprint and the placeholder together don't fit, 151 to 163 px.
- **On `main`:** a resolved pointer drop jumps by the same 8, 12 or 20 px. In a key move the jump is a part of the row's own jump there. With `DRD-72` the row slides from a place that is wrong by that much. In one case, named in `DRD-72`'s last note, the first frame is further away than on `main`.
- **Seen with it:** the item's own remaining box, where it draws one, jumps in a key move by up to 72 px in these lists.
- **Why it is a finding:** `DRI-14` says that margins on one side of each item meet `y()`'s term, and nothing told an integrator that the rows jump there. With #275 the README and `DRI-22` do, as a limit.
- **What limits it:** `[data-drag-placeholder]` with the rows' margin, for the first. No style was found for the second.
- **Required property:** with the placeholder that the library creates, a lift, a commit and a release draw each other row where the frame before drew it, for the two kinds of list, or the contract says which it doesn't hold for and why. The library writes the placeholder no style but its size today (`createPlaceholder`), so mirroring margins is a decision.
- **Not read:** whether mirrored margins collapse as the item's did, margins and padding in a grid, a pointer drag's first frame after the lift with a visual that isn't the item, and the three engines for `xy()`.
- **Size:** _large_, because a decision comes first.

#### DRF-58 — A pointer drop on the item's own gap snaps home without its landing

Tier A, **closed at `ba86742d1`**, for a pointer drop at `134809c64` and for a command noop after a rebase with its row at `ba86742d1` (the implementer's note of 2026-11-27, the last one). Until the architect's note of 2026-11-27 this said _"closed at `134809c64`"_, and until the implementer's last note it said _"closed at `134809c64` for a pointer drop. A command noop after a rebase is owed a row"_. On `main` since `a9c323f6a` (#14). Registered on 2026-11-27 by the architect, on `repo/register-observations-11`, from the owner's observation in [#322](https://github.com/ausginer/material-x/issues/322), relayed by the coordinator. `DRF-57` is the highest `DRF-` on any branch on `origin`, so this is the next free number. Read in Chromium at `085be1e2b` ([reading](../../../.plan/observations-11/checks/noop-landing.txt), [probe](../../../.plan/observations-11/probes/noop-landing.browser.test.ts.txt)).

- **The owner's words, 2026-11-27:** _"If I move an item to the next place, the animation works perfectly. But if the item moves, say, horizontally without changing its slot, its landing animation doesn't run at all: it returns to its place instantly."_ That was `mx-sortable-list`, which composes `axis: y()` and a `landing`.
- **What happens:** with a `landing` composed, a pointer drop that resolves to the item's own gap starts no flight. The visual is at home in the frame of the release. It is the same for a sideways drag, a drag into another slot and back, and a drift within the slot, with `y()` and `xy()`, and with `layoutAnimation` and without. `onEnd` gets `{ type: 'noop' }`. From the same position, `Escape` lands home, and a drop in the next slot lands there.
- **Why, by reading:** `SortableOperation.drop` returns no verdict when `request.to === request.from`, so the session decides `skipped`. `#recordResult` maps `skipped` to `noop` and to `RECOVERY_IMMEDIATE`, which `settle` treats as a fault: it names no landing. A drop's `skipped` is the only one that reaches `settle`, because an activation's `skipped` has no operation. `freeDrag`'s drop always returns a verdict, so it has no such case.
- **Why it is a finding:** no record makes the snap deliberate. The vocabulary's landing is _"the animation from the drop position to the visual's target"_, and `DRI-13` names no outcome without one. The mapping arrived in `a9c323f6a` with no reason. The rows that end in `noop` assert only the log, and none composes a landing.
- **Decided direction:** a drop on the item's own gap lands home, as a cancel does. Only a fault ends with no landing. The record doesn't leave this to the owner: the owner's observation states the expected behavior, and no recorded decision conflicts with it.
- **Required properties:**
  1. With a `landing` composed, a pointer drop whose request has `to === from` lands home from the position last translated to, in the three engines, for `y()` and `xy()`, with `displacement` and without.
  2. `onEnd` gets `{ type: 'noop', request }`, and `onReorder` isn't asked, as today.
  3. A fault still skips the landing. An accepted drop, a rejection and a cancel land as today.
  4. A noop whose visual is already at home starts no animation, as `landing()` does for every landing with a zero offset.
- **Rows:** the sideways drop, the return to the own gap, and a drift within the slot, each reading an additive flight on the item at the release and the item away from home in that frame. **Witness:** each fails at `085be1e2b`. `displacement.browser.test.ts`'s _"should start no animation in a drop on its own gap"_ composes no landing, so it stays.
- **Cost:** a noop drop with a landing now moves the placeholder home and reads its rect once, as a cancel does, and calls the landing's `timing`. `DRI-17`'s _"`sortable` measures a landing target only when a landing is composed"_ still holds.
- **Amends `DRI-13`,** by the unit that takes it, with a sentence after the first: _"`sortable` names a landing for every outcome but a fault: an accepted drop lands at its new place, and a rejection, a cancel and a drop on the item's own gap land home."_ It needs no `DRD` and no plan.
- **Not read:** Firefox, WebKit and Safari. A command whose drop is on its own gap: a command is refused at the collection's edge, so by reading one reaches `settle` skipped only after a rebase moves its gap, and its visual is at home there.
- **Ready** for an implementer, in its own pull request.
- **Size:** _small_.
- **Dated 2026-11-27 by the implementer: closed at `134809c64`,** on `drag/noop-landing-1`, requested by the coordinator. `#recordResult` maps `skipped` to the home recovery, as a cancel that isn't a fault, so `settle` names a landing home. `onEnd` still gets `{ type: 'noop', request }`, and `onReorder` isn't asked. `DRI-13` carries the sentence above. **Rows** in `landing.browser.test.ts`: a drop after a sideways drag, after a drag into another slot and back, and after a drift within the slot, each with `y()`, `y()` with `layoutAnimation` and `xy()`. Each reads one additive flight on the item at the release, the item still at its drop position in that frame, the log `start`, `end:noop`, and the item at home when the flight finishes. A further row reads that a fault, a throwing `onReorder`, still starts no flight. **Witness:** with `operation.ts` as at `ba7c06803`, the nine rows fail and the fault row passes ([transcript](noop-landing-1/checks/witness-before.txt)). At `134809c64` the file's 35 rows pass ([transcript](noop-landing-1/checks/after.txt)), and so do drag's 602 browser rows and its node, declaration, shipped and consumer projects, in Chromium. Material X's `mx-sortable-list` rows, 247 with its spec rows, pass against the rebuilt package. Its `onEnd` acts on the order only for `accepted`. Property 4 is `landing()`'s zero-offset rule, which `DRI-13`'s row _"should start nothing when the visual is already where it lands"_ reads. Until this dating the entry said **open**. **Not run here:** Firefox and WebKit, which CI reads.
- **Dated 2026-11-27 by the architect: a command noop after a rebase lands home by a flight, and that is intended,** on `drag/noop-landing-1`, read at `4dd394faf`, from `feature-proof-1` of the [feature proof](reviews/noop-landing-1/feature-proof-claude.md#local-id-feature-proof-1--a-command-noop-now-flies-and-the-record-says-its-visual-is-already-home), requested by the coordinator. The proof accepts the unit for pointer drops.
  - **What the proof read,** in Chromium, Firefox and WebKit alike: `onStart` moves `r1` before `r0` and calls `invalidate()`, and `r0`'s `ArrowDown` then ends `start:command`, `end:noop`, with `onReorder` not asked. The lifted visual is still drawn at `0,0`, its place before the rebase, and its home is now `0,40`. With a landing, `ba7c06803`'s code snapped it 40 px at the release. `134809c64`'s flies it there.
  - **The _Not read_ line above is wrong in its last clause.** _"Its visual is at home there"_ doesn't hold: the rebase moves the home, and the visual stays where it was drawn. The rest of the line holds. A command reaches `settle` skipped only after a rebase moves its gap.
  - **The flight is intended.** It is the case that this entry repairs: a visual drawn away from its home that returns without its landing. `DRI-13`'s sentence names _"a drop on the item's own gap"_ with no operation kind, and its _"starts from the position last translated to"_ is the visual's drawn place. `sortable.browser.test.ts`'s _"should land at the rebased home when a drag is canceled after a rebase"_ already gives a cancel after a rebase the same flight. A snap would be the defect that the owner observed, for a command. **`DRI-13` needs no change.**
  - **Property 1 is now:** _"With a `landing` composed, a drop whose request has `to === from` lands home from the position last translated to, in the three engines: a pointer drop for `y()` and `xy()`, with `displacement` and without, and a command after a rebase in `onStart` has made its gap the item's own."_ It replaces _"With a `landing` composed, a pointer drop whose request has `to === from` lands home from the position last translated to, in the three engines, for `y()` and `xy()`, with `displacement` and without."_ Properties 2 to 4 hold as written, and property 4 covers a command whose visual is already at home.
  - **The _Cost_ line holds for a command too:** one `getBoundingClientRect` and one `timing` call per noop with a landing composed, and nothing without one, as the proof read in each engine.
  - **Owed by the implementer, on this branch, before the merge:** one row, beside the rebased cancel's in `sortable.browser.test.ts` or in `landing.browser.test.ts`, at the implementer's choice. With a landing composed, `onStart` moves the next item before the lifted one and calls `invalidate()`, and the lifted item's `ArrowDown` then ends with the log `start:command`, `end:noop`, and `onReorder` isn't asked. The row reads one additive flight on the item at the release, the item still at its pre-rebase place in that frame, within 1 px, and the item at its new home when the flight finishes.
    - **Witness:** with `operation.ts` as at `ba7c06803`, the row fails. Its transcript is saved with the unit's checks.
    - **No other source changes.** The row runs in Chromium locally, and in Firefox and WebKit on CI's `verify` (`repo:RD-62`).
    - **No new feature proof is owed.** The proof already read the behavior in the three engines, with and without the fix. The row pins that reading. The coordinator checks the row and its witness against this note.
  - **The status line above** is amended so. The implementer's note for the row dates the closure again.
- **Dated 2026-11-27 by the implementer: closed again at `ba86742d1`, for a command noop after a rebase,** on `drag/noop-landing-1`, requested by the coordinator, as the architect's note above asks. **Row** in `landing.browser.test.ts`, _"should land a command on its own gap at the rebased home"_: with a landing composed, `onStart` moves `r1` before `r0` and calls `invalidate()`, and `r0`'s `ArrowDown` ends with the log `start:command`, `end:noop`, with `onReorder` not asked. The row reads one additive flight on `r0` at the release, `r0` within 1 px of its top before the rebase in that frame, and `r0` at its new home, below `r1`, when the flight finishes. **Witness:** with `operation.ts` as at `ba7c06803`, the row fails at the flight count, expected 1 and received 0 ([transcript](noop-landing-1/checks/witness-command-before.txt)). At `ba86742d1` the file's 36 rows pass in Chromium. No source file changes. **Not run here:** Firefox and WebKit, which CI's `verify` reads.

## Owner decisions

The decisions are in [`decisions/`](decisions/), one file each, named by the identifier.

None blocks the remediation. Each has a default the handoff builds. `DRO-6`, `DRO-9` and `DRO-10` are approved, and `DRO-7`, `DRO-8` and `DRO-12` are accepted. **What remains the owner's before merge** is in [`combined-review-assessment.md`](combined-review-assessment.md) §7: `DRO-10`'s excess, the reported costs that no approval covers, and whether to merge with the known failures that unchanged budgets leave.

**2026-11-10, after the merge:** that list was replaced by [`combined-review-remediation-assessment.md`](combined-review-remediation-assessment.md) §5.2. The owner merged at `a9c323f6a` with the size rows failing, which answers its decision 3. The record holds no answer to decision 1 (`DRO-10`'s excess) or decision 2 (the costs no approval covers). They stay open, and the performance phase doesn't depend on them. `DRO-4`'s size re-base stays the owner's.

**2026-11-15: the owner accepted drag's current size,** and confirmed that decisions 1 and 2 are accepted, with nothing removed. `DRD-68` moves every ceiling and the control to its reading at `988643dc9`, which answers `DRO-4`'s size re-base, and until release the ceilings follow each change the owner approves (`DRO-20`).