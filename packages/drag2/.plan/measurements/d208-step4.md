# D-208 step 4 — surface and behaviors

> **Implemented 2026-11-02, not yet accepted.** Acceptance belongs to the independent step-4 feature review. This unit stops for it before step 5.

**Canonical entry: `drag2:D-208`**, step 4 as [`request-application-claude.md`](../reviews/architecture/request-application-claude.md) §17.4 states it, amended by §18.4 and §18.6. This record holds step 4's implementation status, its figures and its verification. It is **not** the decision's measurement record. `d208-requests.md` is written at step 6, and its absence is still the witness.

**Input.** `0c798ee17` on `drag2/fin-review2`. Its `src/` equals `ef1e4ef6b`'s, which is step 3 as accepted. The baseline suite at the input: ten fail, and two browser files do not load, as at step 3's acceptance. The ten are six `size.node` controls and four `docs.node` surface rows. The two files are `react.browser` and `stories.browser`.

**The escalation and its decision.** On the first attempt at step 4, from `9ae86b189`, the barrier inventory found four `kernel.closed` reads that are diagnostic intake rather than readings inside a unit. Removing them would have delivered `onError` after applied destruction. Under §17.4's first escalation clause the step was paused with nothing committed. D-208 (§18, F-441) decided it: the four reads are **replaced** by channels minted through `BehaviorContext.channel`. No other escalation was raised in this unit.

## What landed

| Item | Where |
| --- | --- |
| **Renamed, with no alias:** `destroy` to `requestDestroy` and `cancel` to `requestCancel`, on `BehaviorContext`, `SortableController`, `FreeDragController`, the kernel façade and the armed controller. `InvalidationTask.cancel` keeps its name | `src/kernel/spec.ts`, `src/kernel/kernel.ts`, `src/sortable/controller.ts`, `src/free-drag/controller.ts` |
| **Removed: `BehaviorContext.closed`** and the façade's getter | `src/kernel/spec.ts`, `src/kernel/kernel.ts` |
| **Added: `BehaviorContext.channel(deliver)`.** The façade mints a closure that refuses once the lifecycle is `CLOSED`, delivers otherwise and absorbs a throw from the sink. **The refusal is written once**, in `Kernel.channel`. The armed controller's own route is a channel the façade mints over the spec's `reportError` at arming, and it replaces `#notify`. Panic's report goes to `reportError` directly, behind its own terminus, which is the one bypass and stays on the kernel's route | `src/kernel/kernel.ts`, `src/kernel/spec.ts` |
| **Replaced, the four diagnostic-intake reads.** Each behavior's own channel is `kernel.channel(#deliver)`, and its unwind guard runs over it. Each composition `report` builds `drag: composition/unwind-failed` and delivers through `kernel.channel(merged.onError)`. Nothing under `sortable/` or `free-drag/` reads the lifecycle | `src/sortable/spec.ts`, `src/free-drag/spec.ts`, `src/sortable/behavior.ts`, `src/free-drag/behavior.ts` |
| **Deleted, the 23 readings inside units:** 15 in the sortable spec, the `#live` predicate and its threading included, and 8 in the free-drag spec | as above |
| **Deleted, the latch as a predicate:** `InsertionRuntimeView.live`, `DisplacementReport`'s `live` parameter, `createPlaceholder`'s and `applyMechanics`'s `live`, `RectIndex.refresh`'s and `LinearShift.refresh`'s `live` and their `false` return (both now return `void`), the barrier in `LinearShift.moved`, and the three readings in `layoutAnimation()`'s `report` | `src/sortable/{runtime,slots,placement,rect-index,linear-shift,y,xy,layout-animation,feature}.ts` |
| **`moveTo` captures its argument at intake.** The coordinates are copied on the call into a `CapturedPosition`. A malformed point fails the copy, and its error travels in the same record, so the action's `prepare` throws it. That keeps D-91's `FAILURE_ACTION_PREPARE` | `src/free-drag/controller.ts`, `src/free-drag/runtime.ts`, `src/free-drag/spec.ts` |
| **§2.12 copies.** `bounds()` copies the resolved rect into a record allocated once per installation, so the clamp never reads the consumer's object. The landing tail reads `duration` and `easing` out of the policy's record before `element.animate` is looked up. `home` was already destructured inside its seam, and the sortable's `anchorTarget` already copies into the library-owned `#anchor` | `src/free-drag/bounds.ts`, `src/kernel/kernel.ts` |
| `FeatureContext.report`'s JSDoc states the drop | `src/shared/composition.ts` |
| Comments that described a removed reading, the latch or the old names | the same files, `src/kernel.ts`, `src/sortable.ts`, `src/kernel/lifetimes.ts`, both `domain.ts` |
| **step3-B's repair, and R21** (§R21) | `tests/kernel/capture.node.test.ts` |
| **Contract**, in this commit (§Contract text) | `.plan/contract/01`, `03`, `05`, `07`, package `README.md` |
| **COVERAGE**: §Surface and behaviors, new. The withdrawn barrier rows are struck with a dated note, the settle control row is re-cited, and the ledger row is renamed with step3-B | `tests/COVERAGE.md` |

## Published-surface change

§3 is the authority for every row. Every change is to an unreleased API (CONTRIBUTING §8).

| Declaration (`.d.ts`) | Change |
| --- | --- |
| `kernel/spec.d.ts` → `BehaviorContext` (exported from `kernel.js`) | `closed` removed; `channel(deliver: (error: DraggableError \| DraggableWarning) => void): (error: DraggableError \| DraggableWarning) => void` added; `cancel` renamed `requestCancel`; `destroy` renamed `requestDestroy`. Still seven members. No `Notify` name is published, because the signature is written out (CONTRIBUTING §4) |
| `sortable/controller.d.ts` → `SortableController` (exported from `sortable.js`) | `cancel` renamed `requestCancel`, now documented; `destroy` renamed `requestDestroy` |
| `free-drag/controller.d.ts` → `FreeDragController` (exported from `free-drag.js`) | the same two renames |
| ~~`sortable/runtime.d.ts`, `sortable/slots.d.ts`~~ **Corrected 2026-11-03 (in `d208-step5.md` §Corrections):** `sortable/slots.d.ts` → `InsertionRuntimeView` (exported from `sortable/feature.js`). `sortable/runtime.d.ts` is not emitted | `live` removed |
| `sortable/slots.d.ts` → `DisplacementReport` (exported from `sortable/feature.js`) | the `live: () => boolean` parameter removed. The signature is `(element, dx, dy, space) => void` |
| `shared/composition.d.ts` → `FeatureContext.report` | signature unchanged; its documentation states the drop after applied destruction |

No other published type changes. `CapturedPosition` is declared in `free-drag/runtime.ts` and is not exported from any entry. **The declaration surface changes in this commit**: `tests/kernel/context.declaration.test.ts` pins the seven names and `channel`'s shape, and `tests/composition.declaration.test.ts` reads the renamed controller members.

## Barrier inventory

Each removed barrier, the code it now reaches, and whether the state after application differs from the baseline's. The reading at every site below is `kernel.closed` or `live()`. Destruction is applied only at a unit boundary, and every site runs inside a unit, so each reading answered _live_ for the whole of its unit at the input. **Each removal therefore reaches code that already ran at the input.** None changes a published outcome.

| Removed barrier | Code it now reaches when a request was registered earlier in the unit | Consumer code that can observe it | After application |
| --- | --- | --- | --- |
| sortable `#resolveItem`, after `handle` | the subject scan, then `seedDraft` and `visual` | the `visual` resolver, as R1 already requires | equal: admission publishes, application tears it down |
| sortable `#seedDraft`, after `visual` and after `box` | the draft writes, then `box` | the `box` resolver | equal |
| sortable `activation.effect`, the pre-publication reading and the post-`invalidateInSeam` reading | lifetime registration, the runtime record, `onStart` | `onStart`, as R2 and §4 item 2 state | equal |
| sortable `prepareAction` spatial, after `resolveInsertion` | `draft.insertion` | none | equal |
| sortable `prepareAction` collection, after `items()` | the copy, reconcile and publication | none until the effect: R32's sortable row | the collection is published (§17.2, decided) |
| sortable committed move, after `movePlaceholder`, and the `finally`'s second conjunct | `movedInsertion`, the displacement sink, `invalidateInsertion` | `box`, `settle`, `animate()` on rows | equal: the presentation lifetime cancels contributions |
| sortable `release.prepare`, after the resolve | the proposal | none | equal |
| sortable `release.effect`, before `lift.write` | the release write | none | equal |
| sortable settlement `SETTLED_FULFILLED` | `draft.domain` | none | equal |
| sortable `anchorTarget`, the re-anchor conjunct and the post-re-anchor reading | `item.before(placeholder)`, then the measurement | a custom placeholder's callbacks, as R7 already exhibits | equal |
| `createPlaceholder` and `applyMechanics` (six readings) | the mechanics writes on the placeholder | a custom placeholder's attribute and style setters | equal: the presentation disposer removes the placeholder |
| `RectIndex.refresh` (two), `LinearShift.moved`, `layoutAnimation()` `report` (three) | the rest of the candidate loop, `settle`, the contribution | `box`, `settle`, `animate()`, `finished` | equal |
| free drag `admit`, after `handle` and after `visual` | `visual`, then the draft write | the `visual` resolver | equal |
| free drag `activation.effect`, after `deriveMotion` | the lift write and `onStart` | `onStart` | equal |
| free drag `moved`, before `onMove` | `onMove` | `onMove` | equal |
| free drag `release.prepare`, before `draft.request` | the request write | none | equal |
| free drag `release.effect` | the release write | none | equal |
| free drag settlement `SETTLED_FULFILLED` | `draft.domain` | none | equal |
| free drag `anchorTarget`, before `home` | `home` | the `home` resolver, as R7 states | equal |

**Run, not only read.** With the façade getter forced to `false` at the first attempt's input, the full suite gained ten failures, and none was a production barrier: five `kernel.browser` rows read `closed` as an instrument, and five sortable bench rows called seams from outside any unit. Those bench rows tested the withdrawn barrier itself and are deleted here (§Cases). The four intake reads were the only reads whose removal reached new code. They are replaced, not removed (§R33).

## Cases

All rows drive `draggable()`, `sortable()` or `freeDrag()` and the running controller, with no harness flag. COVERAGE §Surface and behaviors lists them.

| Case | Rows | At `c14ee4d5c`'s `src/` |
| --- | --- | --- |
| **R18** | `anchor.browser` — _should commit the coordinates passed, not the object mutated afterwards_, _should read the coordinates once, on the call_ | **the first fails**: `[5, 5]`, the mutated coordinates. The second passes at both trees, because the baseline also reads each accessor once, at application |
| **R21** | `capture.node` — _should find lifecycle and request reads only at the runner, intake, the channel and unit entries_, _should find no lifecycle or request read outside the kernel_ | — (new) |
| **R32**, release | `kernel.browser` — _should run the release effect of a release whose prepare requested cancel_ | **fails**: `release.effect` never runs |
| **R32**, action | _should run the effect of an action whose prepare requested cancel_ | **fails**: the action's `effect` never runs |
| **R32**, sortable | `features.browser` — _should publish the pulled collection and cancel after it_ | **fails**: the second drag's request carries the collection from before the pull |
| **R33** (a)–(g), both behaviors | `diagnostic-intake.browser` — seven rows per behavior | — (the member is new). Each row's outcome is the baseline `9ae86b189`'s, by §18.4 |
| **R33** (h) | `kernel.browser` — _should deliver in the construction window and drop once destruction is applied_ | — (new) |

**R32 over the baseline** was run in a scratch worktree with `c14ee4d5c`'s `src/` and this tree's three test files. The renames were mapped back mechanically, `requestCancel` to `cancel` and `requestDestroy` to `destroy`. All four discriminating rows fail for the reason §7 states.

**R33's panic row is reachable through both behaviors.** The threshold crossing clears the selection through `window.getSelection()`, which the handler runs unguarded. A throw there escapes the `MOVE` unit into the panic, as the kernel's own panic row does. No other consumer-reachable panic route was found. Every consumer call the behaviors make runs inside a seam or a driver leaf.

**Withdrawn promises, revised in this commit.** These went with what they tested:

- `sortable.browser`: _the terminal barrier on the behavior's frame writes_, all six rows. They called seams from outside any unit, a position the running controller never reaches.
- `placement.browser`: the three rows that flipped `live` during the mechanics, and their `recording` helper.
- `y.browser` and `xy.browser`: _the terminal barrier in the candidate loop_ and _on candidate geometry_ and _before the displacement sink_. `y`'s positive control survives as _should invoke settle once per rebuild_. `xy`'s composed row, _should finish the traversal of the composed move whose candidate requested destruction_, is kept under a new describe.
- `displacement.browser`: _the terminal barrier in the displacement bracket_.
- `kernel.browser`: the rows that read `closed` as an instrument now read `applied()`, a helper that mints a channel and reports whether it delivers. That is the same applied-lifecycle question, through the one route a behavior has.

**Mechanical renames** were applied at the compiler's reported locations, across the source, the stories, the tests, the perf suites and the revision fixtures, so no `.cancel(` that is not a request was touched. `consumer.node`'s fixture strings were renamed by hand.

## R21 and step3-B

**step3-B's repair.** `ledgerReads` matches a lifecycle read through **any** of the bracket's lifecycle accessors on `this.#bracket`. That set is derived from `ExecutionBracket`: every getter whose body reads `#lifecycle`. At this tree it is `closed` and `idle`, and a second row pins it, so the derivation cannot silently find nothing. The armed controller's row now lists `#onPointerDown: idle`. It drops `#notify: closed`, because the refusal is the façade's. **The row's per-member granularity is a stated limit**: a second read of a listed fact later in the same handler leaves the list unchanged. The test says so in its docblock.

**The step3-B witness, re-run.** Inserting `if (!this.#bracket.idle) { void 0; }` into `#handleCancel` after its entry reads reddens the ledger row and the R21 row (§Mutation census). At step 3's tree it reddened nothing.

**R21**, by location over the whole of `src/`, from the compiler API at this tree:

| Place | Reads |
| --- | --- |
| the runner, `kernel/execution.ts` | `ExecutionBracket.#step`, `#leave`, `dispatch`, `requestClose` read `#lifecycle`; `runIngress` reads `idle`; the accessors `closed` and `idle` themselves |
| intake, `kernel/kernel.ts` | `ArmedController.#cancelWith` (`closed`, `cancelRequest`), `#failOperation` (`closed`, `cancelRequest`), `Kernel.dispatch` (`closed`) |
| the runner's ingress refusal | `ArmedController.#onPointerDown` (`idle`) |
| the channel's one refusal | `Kernel.channel` (`closed`) |
| unit entries | `#handleActivate`, `#handleMove`, `#handleCancel`, `#handleStartCommitted`, `#handleOpenResolution` (`cancelRequest`, `failureRegistered`), `#handleFailed` (`cancelRequest`; its `superseded` read is in the ledger row) |
| outside `src/kernel/` | **none** |

These are §6's places and no others. `BehaviorContext` has no lifecycle member.

**The guard-site census by `grep`**, comments excluded: `kernel.closed` has **zero** hits in `src/`, and `live()` has none. `this.#bracket.closed` has four hits, all in `kernel/kernel.ts`: `#cancelWith`, `#failOperation`, `Kernel.channel` and `Kernel.dispatch`. `this.#bracket.idle` has one, in `#onPointerDown`.

## Mutation census

Taken at this tree, in the shared checkout. Each mutation was applied alone, by an exact-text patch, to `src/kernel/kernel.ts` (and to `src/kernel/execution.ts` for M2), and ran against **the whole suite**, every project. Both files were restored from copies after each run and compared byte for byte. The counts exclude the 15 rows red at the unmutated tree (the 14 of §Verification, and `coverage.node`'s citation row, repaired after the batch) and the `size.node` budget rows, whose bytes move with any edit to the kernel.

| Mutation | Rows red |
| --- | --- |
| **M1** the channel's refusal removed | **19**: R33 (a), (b), (c), (d) and (e) in both behaviors, (h), the R21 census, and seven existing kernel rows that observe the kernel's own route after application (the panic order row, the `onError`-destroys row, the reset-during-destroy row, R5, R28, R29 and the instrument row reading `applied()` after the unit). (e) reddens because the hook's teardown report then arrives beside the interval report. (f) and (g) stay green, as their outcomes need no refusal |
| **M2** the refusal also reads `REQUESTED` | **11**: R33 (e) in both behaviors, (h), the R21 census and the accessor-derivation row (the mutation adds a lifecycle accessor), and six existing rows that deliver a report in the interval: R25's registered-and-unapplied row, the two free-drag rows that report the requesting unit's own failure, R5, and the two instrument rows reading `applied()` inside the requesting unit |
| N1 `ACTIVATE`'s held-cancel clause | 4: the keyboard and kernel command R31 rows, the ledger row and R21 |
| N2 `MOVE`'s clause at `PENDING` | 3: the pointer R31 row, the ledger row and R21 |
| N3 the phase rule's upper bound | 1: R8's supersession row, over the whole suite. At step 3 it reddened nothing over the run |
| N4 supersession not captured | 5: R16's first order, the two cancel-then-fail rows, the ledger row and R21 |
| N5 `FAILED`'s held-cancel reading | 5: the two fail-then-cancel rows, `composition.browser`'s queued-work row, the ledger row and R21 |
| N6 intake demotes on a held cancel | 1: R16's first order |
| N7 `OPEN_RESOLUTION`'s phase clause | 2: R4 and R32's release row |
| N8 `START_COMMITTED`'s held-cancel reading | 4: _should not reach ACTIVE when a cancel is latched during activation_, the current-operation slot row, the ledger row and R21 |
| step3-B witness, an `idle` read inside `#handleCancel` | 2: the ledger row and R21 |

Every N-mutation path holds `requestCancel`, so all eight were re-run. Each reddens at least the rows step 3 recorded for it. The ledger and census rows redden whenever a reading is removed or added, which is their purpose, not a second witness of the behavior.

## Composition

`just build`, read through `measureAll()` from `bench/size/measure.ts`. **Before** is the input's `src/`, built in a scratch worktree. It reproduces `d207-step3.md`'s "after" column byte for byte. **After** is this tree. Bytes. Brotli governs. **Budgets are unchanged.**

| Row | min before | min after | Δ | Brotli before | Brotli after | **Δ** | budget | distance |
| --- | --: | --: | --: | --: | --: | --: | --: | --: |
| minimal | 33,874 | 33,345 | −529 | 10,322 | 10,218 | **−104** | 10,549 | −331 |
| minimal (xy) | 33,193 | 32,702 | −491 | 10,196 | 10,099 | **−97** | 10,421 | −322 |
| minimal + layoutAnimation | 34,853 | 34,261 | −592 | 10,663 | 10,543 | **−120** | 10,887 | −344 |
| xy + layoutAnimation | 34,172 | 33,618 | −554 | 10,545 | 10,417 | **−128** | 10,776 | −359 |
| minimal + landing | 34,267 | 33,738 | −529 | 10,483 | 10,366 | **−117** | 10,695 | −329 |
| complete | 35,246 | 34,654 | −592 | 10,817 | 10,692 | **−125** | 11,033 | −341 |
| free drag minimal | 26,935 | 26,980 | +45 | 8,229 | 8,262 | **+33** | 8,266 | −4 |
| free drag + bounds | 27,401 | 27,624 | +223 | 8,381 | 8,495 | **+114** | 8,423 | **+72** |
| free drag + landing | 27,328 | 27,373 | +45 | 8,400 | 8,437 | **+37** | 8,425 | **+12** |
| free drag complete | 27,794 | 28,017 | +223 | 8,529 | 8,628 | **+99** | 8,576 | **+52** |
| both behaviors | 42,642 | 42,193 | −449 | 12,281 | 12,198 | **−83** | 12,493 | −295 |
| vocabulary root — drag.js | 252 | 252 | 0 | 142 | 142 | **0** | 205 | −63 |
| kernel root — kernel.js | 19,874 | 19,954 | +80 | 6,300 | 6,320 | **+20** | 6,312 | **+8** |
| baseline A — feature-matched, non-composed | 34,539 | 33,945 | −594 | 10,655 | 10,507 | **−148** | 10,855 | −348 |
| baseline B — shipped @ydinjs/drag sortable.js | 22,618 | 22,618 | 0 | 6,916 | 6,916 | **0** | 7,040 | −124 |

**Module counts are equal on every row. No module entered or left any graph.**

**Growth, attributed by composition** (CONTRIBUTING §15):

- **The kernel, +80 B minified, +20 Brotli** on the kernel root, which every kernel-carrying row carries. That is `Kernel.channel` and the minted armed route, net of the removed `closed` getter and `#notify`, plus panic's direct delivery and the landing tail's two-field read. **The kernel root's margin at the input was 12 B, and it is now 8 B over budget.**
- **`bounds()`'s copy, +178 B minified**: the difference between the `+ bounds` rows' growth and the minimal rows'. The copy record and the field-by-field read replace one cached reference. It lands on `free drag + bounds` and `free drag complete`. Brotli does not decompose additively, so the row figures stand and no per-cause Brotli number is claimed.
- **Free drag otherwise, −35 B minified** (`free drag minimal`'s +45 less the kernel's +80): the eight removed readings and the unused `#kernel` field, net of the composition channel, the spec's minted channel and `moveTo`'s capture.
- **The sortable rows shrink by 97 to 148 B Brotli.** The fifteen readings, the `live` threading and its six placement readings outweigh the kernel's growth.

**Four rows are over budget**: free drag + bounds (+72), free drag + landing (+12), free drag complete (+52) and the kernel root (+8). This is put to the owner at step 4's acceptance, under §17.4. No budget is re-based and no byte-recovery pass was made. Step 2's tolerance does not cover it. The six `size.node` control equalities stay red, as at the input.

## Runtime

**Not measured in this unit.** No timing claim is made in either direction, and M-1's resolving measurement is step 6's.

**Analysis, not measurement:**

- **Per active sample (`MOVE` at `ACTIVE`):** the sortable's committed move loses its readings, and free drag's `moved` loses one property read before `onMove`. `bounds()`'s `apply` reads one boolean and four fields of a record it owns, where it read four fields through a cached reference. Nothing is added to the per-sample path, and nothing is allocated on it: the copy is taken at resolve, once per invalidation.
- **Per `moveTo` call:** one record allocated, as §2.12 permits. A malformed point allocates one more, for the fault.
- **Per controller:** one closure per minted channel. The sortable and free drag each mint two, and the kernel mints one for the armed route. The removed `#live` closure was one per sortable controller.
- **Per diagnostic:** the composition `report` now builds its warning before the channel refuses or delivers it. After application that is one object thrown away. It was not built at the input.

## Property 13 — interim accounting

The architect's `run.sh` was rerun at the input, unmodified, in a scratch worktree at `0c798ee17`. It was rerun at this tree through a scratch copy that maps the probes' old names when it materializes them: `.destroy(` to `.requestDestroy(`, `.cancel(` to `.requestCancel(`, and `String(kernel.closed)` to the literal `(removed)`. The tracked probes are unchanged.

**With the `closed=` instrument field normalized, the two outputs are identical.** Every model row is `ok` at both trees. The one other difference is P8's skipped count, down six with the deleted sortable bench rows. **No probed row makes a consumer call that both the baseline and the target withhold.**

| Case | Outcome now |
| --- | --- |
| R1–R17, R19, R20, R22–R31 | required, as at step 3 |
| **R18** | **required**, as tests through the running controller (§Cases). Not probed by `run.sh` |
| **R32** | **required**: the P7 lines for a cancel in `release.prepare` and in `action.prepare` show `release.effect` or the action running before `canceled` at `AT_PROPOSAL`, at both trees, and §Cases has the three rows |
| **R21** | required, structurally (§R21) |
| **R33** | baseline and required coincide (§18.6). The witnesses are R33's rows |

## Contract text

Amended in this commit, as §17.4 and §18.6 list:

- **05:**
  - **I-36**: a restatement, dated D-208, which is now the operative statement. It covers (a), (b) and (c) after application and the interval clause. The per-invocation reading is withdrawn in full. D-51's list is unchanged and empty. The exceptions are named by route and in the present tense: the retire-hook walk under relinquishment, and the panic route's one `onError` under diagnosis. That is step2-C's obligation. The kernel's channel refusal is (a)'s mechanism on every diagnostic route, and the teardown silence is named by route;
  - D-179's participant clause: step 4 removed the readings;
  - **I-37**: unchanged, with the governed set stated.
- **01 §`BehaviorContext`:** the renamed members, `closed` removed, `channel` added, the count kept at seven, and the construction-window paragraph.
- **03:** `FeatureContext.report`'s drop; the `InsertionRuntimeView.live` row struck, with the D-13 widening count recorded rather than rewritten; the candidate-loop barrier withdrawn; the placement barrier withdrawn.
- **07:** the controller's two renamed members, and `moveTo`'s capture with D-91's classification.
- **README:** the bullet on a destroying resolver is withdrawn, and replaced by one on requests, the renames and `moveTo`'s capture.
- **JSDoc:** `FeatureContext.report`, `BehaviorContext`, both controllers and both behaviors' channels.

## Corrections

- **step3-C.** `d207-step3.md` §What landed says _"No published type changes except the removal of the `rollback` members, which no published declaration named."_ That is wrong. At the baseline, the shipped `kernel/seams.d.ts` declared `rollback?` on `Transition` and `ActionTransition`, and `kernel.d.ts` exports both types. **Step 3 removed the published, optional `rollback` member from both**, a change to the kernel-tier SPI that §3 decides, on an unreleased API. No declaration test named the members, so no row had to change. A dated correction is added to `d207-step3.md`.

## Verification

- **Tests:** `vitest run`, every project, on the committed tree. 1,375 pass and 14 fail, and the same two browser files do not load. The 14 are the input's ten (six `size.node` controls and four `docs.node` rows) and the four budget rows above. Every new row passes, and so does every row from steps 1 to 3 that is not listed under _Withdrawn promises_. `coverage.node`, `references.node` and `decisions.node` pass. The mutation census's unmutated run shows 15, because `coverage.node`'s citation row was repaired after it.
- **R33 alone:** `diagnostic-intake.browser`, 14 of 14, and `kernel.browser`'s two channel rows.
- **Lint**, over the changed files, after `fmt`, `lint-fix`, `fmt`. Thirteen eslint errors remain, and the same thirteen are reported at `HEAD` in a scratch worktree, by the same rules in the same files: `consistent-return` ×4 in the two stories, `consistent-return` in both `spec.ts` files, `unbound-method` in `kernel.browser`, `features.browser` and `sortable.browser`, `no-unnecessary-condition` in `commit-window.browser`, `react.browser` and `sortable.browser`, and `prefer-promise-reject-errors` in `sortable.browser`. `HEAD`'s fourteenth, `no-unnecessary-condition` in `sortable/spec.ts`, went with a removed reading. **Corrected 2026-11-03 (in `d208-step5.md` §Corrections):** `HEAD` had fifteen, not fourteen. The fifteenth, `prefer-includes` in `g3-conformance.browser`, went with the rewritten assertion, which now calls `.includes`. Markdown is reported as ignored.
- **Typecheck:** only the two `.scripts/vitest-*.ts` errors present at the input.
- `git diff --check` is clean.

## Limits

- **Browser runs used Chromium only.**
- **Runtime is analysis only** (§Runtime).
- **The mutations ran in the shared checkout**, one at a time, with the two kernel files restored from copies and compared after each.
- **The census is by the compiler API and `grep`.** An aliased access to the bracket would escape both, and none exists.
- **The baseline runs mapped the renames mechanically** (§Cases, §Property 13). A row that failed only for a missing member would not discriminate. Each R32 row was checked to fail on its stated assertion, not on a `TypeError`.
- **`docs.node`'s four rows are red at both trees**, so they do not check the renamed surface. The declaration tests and the compiler do.

## Unresolved obligations

- **The four budget overruns** (free drag + bounds, + landing, complete, and the kernel root) are put to the owner at step 4's acceptance (§Composition).
- **Step 5**, the comment pass, is not started.
- **Reviewer-E** is untouched and stays the owner's.
- **D-208 stays `Unimplemented (Remediation)`.** `d208-requests.md` is not created, F-432 to F-435 and F-441 stay open, and D-200's independent acceptance is still pending.
- **Next:** stop for the independent step-4 feature review.