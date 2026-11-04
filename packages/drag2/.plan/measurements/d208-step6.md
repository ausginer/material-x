# D-208 step 6 — the measurements

> **Working record, taken 2026-11-03. Not complete:** three escalations are open (§Escalations), and the owner's dated disposition of the four overruns is absent. `d208-requests.md` is not written.

**Canonical entry: `drag2:D-208`**, step 6 as [`request-application-claude.md`](../reviews/architecture/request-application-claude.md) §23.3 states it, over §20.5 as §21.8 amends it. This record follows `d208-step4.md` and `d208-step5.md`. It is **not** D-208's witness. Creating it changes nothing in the unimplemented table, and `d208-requests.md` stays absent.

**Input.** `8733b893f` on `drag2/fin-review2`.

**The frozen `src/`** is tree `4630579d236624eb32f124268b1c026482f84da2` (§23.2). `git rev-parse <rev>:packages/drag2/src` returns it at the input, at the harness commit `be75b3da1`, and at this record's commit. Nothing under `src/` was edited.

**The series:**

1. `be75b3da1`, the harness, touching only `tests/perf/` and `bench/`;
2. this record.

**Measurements and analysis are kept apart.** §Measurements holds what an instrument returned. §Analysis holds what is read from the code or inferred from the figures, and every paragraph in it is labelled.

## Status of the evidence

| §23.3 item | State |
| --- | --- |
| Composition at the tip, beside 5R's row and 5R.1's control | measured (§Composition) |
| M-1, with I-26's structural check | measured (§M-1, §Allocation per sample, §Call counts). **Escalations 2 and 3 are open** |
| M-2, controller cost with the façade | measured (§M-2). **Escalation 1 is open** |
| R21's read census, with the `channel` mint sites | measured (§R21). Five mint sites, as expected |
| step4-D: free drag's per-sample allocation, net of the harness | measured (§Allocation per sample) |
| step4-D: the committed move | **measured**. The harness reaches the frame (§Committed move), so no analysis stands in for it |
| Instruments, revisions, limits | §Instruments, §Limits |

**Every item is measured, and the evidence is still not complete,** because §23.3 counts it complete only when no escalation is open, and three are. **The owner's dated disposition of the four overruns is absent.** Either one alone stops step 6 before `d208-requests.md`.

## Instruments

| Input | Value |
| --- | --- |
| Engine | Google Chrome for Testing **153.0.8010.52**, headless, through `@vitest/browser-playwright` (`playwright-core` 1.64.1) |
| Runner | Vitest 5.0.5, Node v26.9.0 |
| Bundler (composition) | Rolldown 1.2.15, through `bench/size/measure.ts` unchanged |
| Machine | Linux 7.2.11-200.fc44.x86_64, 12th Gen Intel Core i7-1255U, devcontainer. **The host was loaded throughout**: the load average was 6.6 to 27.2, from processes outside the container |
| Flags | `--js-flags=--expose-gc`, `--enable-precise-memory-info`, as set for the drag browser projects in `.scripts/vitest-config.ts` |

### The harnesses

- **`tests/perf/d208-step6.browser.test.ts`** (new, `be75b3da1`). It holds three structural rows that run on every suite run, and six measurement rows that are opt-in with `VITE_DRAG_MEASURE=1` and assert nothing. It uses two instruments, both through `cdp()`:
  - **allocation by attribution.** V8's sampling heap profiler (`HeapProfiler.startSampling`), with a sampling interval of 8 B and objects collected by either collector included. Each sampled allocation carries the stack that made it. Bytes are booked to the allocating frame: a frame served from `src/` is the library's, a frame in the harness is the harness's, and every other frame is _other_. Where a row is quoted as a total, it is the sum of all three;
  - **call counts.** V8's precise coverage (`Profiler.startPreciseCoverage`, `callCount: true`), taken over a window and keyed by `file:function`.

  Sample arms dispatch **pointer events constructed before the window opens**, so the harness's own `PointerEvent` is outside it. Each arm is preceded by 5,000 warm-up samples, so the window measures the optimized path. A **control arm** dispatches the same events with no controller listening.

- **`bench/shipped/vitest.config.ts`** (new, `be75b3da1`). It is the package configuration with the step-6 harness added to the `shipped` project's list, where `__DEV__` is `false`. It changes nothing else. Rows marked **shipped** ran there. Rows marked **DEV** ran in the ordinary `browser` project, where `__DEV__` is `true`.
- **`tests/perf/m1.browser.test.ts`** (M-1 end to end, and M-1's heap-growth allocation reading), **`tests/perf/m1-prime.browser.test.ts`** arm C (free drag per sample, four compositions) and **`tests/perf/m2-prime.browser.test.ts`** (per-controller retained heap). All three are unchanged, and each was run alone, one file per Vitest run.

### The baseline, `6905af249`

A scratch worktree at `6905af249` (src tree `19f0b867e4094c764c11f1cf5016f7d2796fac98`), with the shared `node_modules`. The tip's `.scripts/vitest-config.ts`, `packages/drag2/vitest.config.ts` and `bench/shipped/vitest.config.ts` were copied in, so both trees run under the same test infrastructure. M-1, M-1′ and M-2′ ran from the baseline's own copies of those files. They differ from the tip's only by the `requestDestroy` rename and `RectIndex.refresh`'s removed `live` argument. The step-6 harness was copied in with `requestDestroy` mapped to `destroy` and `requestCancel` mapped to `cancel`, and nothing else changed. The worktree is scratch and was removed after the runs.

### Rounds

- **Allocation, M-2′, and M-1 and M-1′ (first set):** four rounds, ABBA order (tip first in odd rounds), each arm of a round tip and baseline back to back.
- **M-1 and M-1′ timing:** 24 paired rounds in total. The four rounds above are not among them. The 24 are two sets of 12, also ABBA.
- **M-2′:** its two per-controller rows only (`-t per-controller`). The full file takes 6 min 41 s a run, and its retention and P-02 rows are not M-2's question.
- **The paired allocation rounds ran the harness as it stood before its last edit.** That edit added the retention arm (run separately, at both trees, after the rounds) and the file-level lint directive, and reformatted the file. No other measurement code changed.

## Measurements

### Composition

`just size` at the frozen tree, read through `measureAll()`. Bytes.

| Row | Minified | Brotli | Modules | = 5R (`d208-step5.md` §5R Composition) |
| --- | --: | --: | --: | --- |
| minimal | 33,336 | 10,201 | 33 | equal |
| minimal (xy) | 32,693 | 10,094 | 32 | equal |
| minimal + layoutAnimation | 34,252 | 10,533 | 34 | equal |
| xy + layoutAnimation | 33,609 | 10,413 | 33 | equal |
| minimal + landing | 33,729 | 10,386 | 35 | equal |
| complete | 34,645 | 10,688 | 36 | equal |
| free drag minimal | 26,980 | 8,262 | 27 | equal |
| free drag + bounds | 27,624 | 8,495 | 28 | equal |
| free drag + landing | 27,373 | 8,437 | 29 | equal |
| free drag complete | 28,017 | 8,628 | 30 | equal |
| both behaviors | 42,184 | 12,209 | 47 | equal |
| vocabulary root - drag.js | 252 | 142 | 2 | equal |
| kernel root - kernel.js | 19,954 | 6,320 | 16 | equal |
| baseline A - feature-matched, non-composed | 33,936 | 10,508 | 31 | equal |
| baseline B - shipped @ydinjs/drag sortable.js | 22,618 | 6,916 | 26 | equal |

- **5R's row**, as §21.2 books it, is the table's last column: every row equals 5R's tip table, minified, Brotli and modules.
- **5R.1's control**, `d208-step5.md` §5R.1 Composition and §Closing commit: all 15 rows equal 5R's tip table. The tip reproduces it.
- **The four budget rows** are unchanged: free drag + bounds +72, free drag + landing +12, free drag complete +52, and the kernel root +8 (§19.3). `just size` exits 1 on them and on the six controls, as at the input. Nothing is re-based.

### M-1 — timing, paired against `6905af249`

Microseconds per sample, as each harness reports. That is the median of 21 calibrated batches, at a resolution of about 0.195 µs. 24 paired rounds.

| Arm | Tip median | Base median | Tip min | Base min | Tip slower / faster / equal | Median paired difference |
| --- | --: | --: | --: | --: | --- | --: |
| sortable end to end, 50 rows (M-1) | 4.69 | 5.27 | 3.32 | 3.32 | 9 / 12 / 3 | 0.000 |
| sortable end to end, 200 rows (M-1) | 4.88 | 4.69 | 3.52 | 3.32 | 13 / 10 / 1 | +0.195 |
| free drag, bare (M-1′ C) | 5.08 | 4.88 | 3.52 | 3.32 | **16 / 6 / 2** | **+0.391** |
| free drag, `axis: 'y'` | 4.88 | 4.59 | — | 3.32 | 11 / 10 / 3 | 0.000 |
| free drag, `bounds(element)` | 5.08 | 4.88 | 3.32 | 3.42 | 13 / 11 / 0 | +0.195 |
| free drag, `bounds(thunk)` | 4.88 | 4.69 | 3.42 | 3.22 | **17 / 6 / 1** | **+0.195** |

- **Spread.** Individual rounds range from 3.3 to 37.5 µs, and the four preliminary rounds alone range from 4.1 to 37.5 µs. The distribution is bimodal, as the step-4 feature proof found.
- **One `axis` reading at the tip is 0.0000 µs**, a calibration failure, so its minimum is not quoted.

### M-1 — the heap-growth reading

M-1's own allocation row: `usedJSHeapSize` growth over 20,000 samples, with no `gc()` in between. **0.0 kB, ≈ 0.0 B per sample, at both trees in every one of 28 runs.**

### Allocation per sample

Bytes per sample. The sum of library, harness and other, over 2,000 samples per arm, in four rounds. The range is across the rounds.

| Arm | Tip, shipped | Base, shipped | Tip, DEV | Base, DEV |
| --- | --- | --- | --- | --- |
| sortable, 50 rows, `y()` | 193.6 – 194.6 | 194.2 – 198.6 | 202.5 – 203.4 | 202.4 – 207.1 |
| sortable, control | 2.9 – 3.0 | 3.0 – 3.1 | 2.9 – 3.0 | 3.0 – 3.1 |
| free drag, bare | 192.0 – 195.6 | 191.9 – 196.0 | 191.7 – 192.5 | 192.1 – 195.9 |
| free drag, `bounds(element)` | 191.5 – 196.1 | 192.3 – 196.7 | 191.3 – 196.7 | 195.9 – 196.3 |
| free drag, `bounds(thunk)` | 191.2 – 192.1 | 191.6 – 191.8 | 191.5 – 191.7 | 191.8 – 192.3 |
| free drag, `onMove` installed | 260.0 – 260.3 | 260.0 – 260.7 | 260.3 – 260.5 | 259.9 – 260.5 |
| free drag controls (each arm's) | 2.7 – 9.4 | 2.7 – 9.5 | 2.7 – 2.8 | 2.8 – 9.5 |

**Attribution, shipped, tip.** Bytes per sample, by allocating frame, from one run. Rows under 0.5 B are omitted.

| Arm | Library | Other | Harness |
| --- | --- | --- | --- |
| sortable | `sortable/spec.ts:moved` 104.7 | `push` ≈ 84 | 0.1 |
| free drag, bare | `kernel/presentation.ts:write` 105.2 | `push` ≈ 84 | 0.1 |
| free drag, `bounds(element)` | `write` 105.2, `#pointerHandler` 4.7 | `push` 84.0 | 0.0 |
| free drag, `bounds(thunk)` | `free-drag/spec.ts:moved` 104.8 | `push` 84.0 | 0.0 |
| free drag, `onMove` | `write` 104.5, `free-drag/geometry.ts:buildGeometry` 68.4 | `push` 84.0 | 0.0 |

The baseline books the same frames, in the same amounts to within 1 B.

**Calibration**, the same instrument on `ActionQueue` (`src/kernel/queue.ts`) alone, with one `add` and one `clear` per cycle:

| Cycle | Tip | Base |
| --- | --- | --- |
| `ActionQueue` add, then clear | 88.8 – 90.0 B | 90.0 – 90.2 B |
| a plain array, push two, then truncate to length 2 | 99.9 – 100.0 B | 100.0 – 100.1 B |

### Committed move

The sortable's spatial frame, reached by **waiting for real animation frames**. Ten rows and `y()`. 200 frames per arm. One sample is dispatched before each frame:

- **moving:** the pointer alternates between two rows, so every frame commits a placeholder move;
- **still:** the pointer stays inside one row, so the frame runs and commits nothing.

The structural rows _should commit a placeholder move on every frame of the moving arm_ and _should commit no placeholder move on the frames of the still arm_ pin both arms on every suite run.

Bytes per frame, the sum of every owner, four rounds:

| Arm    | Tip, shipped  | Base, shipped | Tip, DEV      | Base, DEV     |
| ------ | ------------- | ------------- | ------------- | ------------- |
| moving | 1,117 – 1,179 | 1,137 – 1,184 | 2,543 – 2,602 | 2,634 – 2,638 |
| still  | 694 – 704     | 688 – 699     | 693 – 702     | 696 – 698     |

**Attribution, shipped, tip, moving**, library frames, bytes per frame: `sortable/y.ts:resolve` 206.8, `sortable/rect-index.ts:advance` 153.4, `kernel/seams.ts:runCore` 105.5, `sortable/spec.ts:moved` 86.3, `sortable/linear-shift.ts:moved` 36.3, `rect-index.ts:remeasureHole` 28.6, `sortable/domain.ts:insertionAt` 28.3, `kernel/presentation.ts:compose` 16.6, `kernel/invalidation.ts:runNow` 8.8. The library total is 680. The harness books about 105 B per frame on both arms and both trees, which is the awaited frame promise.

**In DEV**, `sortable/rect-index.ts:verifyEquivalence` books 800–840 B per moving frame at both trees. It is the `DEV`-only equivalence instrument, and it is absent from the shipped rows.

### Per drop and per call

Bytes per unit, the sum of every owner, four rounds:

| Unit | Tip, shipped | Base, shipped | Tip, DEV | Base, DEV |
| --- | --- | --- | --- | --- |
| free-drag drop (press, threshold move, release, settle) | 15,266 – 15,308 | 15,284 – 15,299 | 15,287 – 15,302 | 15,288 – 15,316 |
| sortable drop (press, two moves, release, settle) | 16,834 – 16,868 | 16,850 – 16,863 | 16,750 – 16,789 | 16,778 – 16,802 |
| `moveTo` call, active free drag, one point object per call built before the window | 343.8 – 351.5 | 323.7 – 324.1 | 350.4 – 351.4 | 323.6 – 324.3 |

**Attribution, `moveTo`, shipped:**

- **tip:** `free-drag/controller.ts:moveTo` 15.0 B, `kernel/seams.ts:runCore` 104.5 B, `free-drag/spec.ts:effectAction` 103.4 B, and `push` ≈ 84 B among _other_;
- **base:** `runCore` 104.4 B and `effectAction` 103.9 B. No `moveTo` frame allocates.

### Call counts

V8 precise coverage. **Identical in all 16 runs** at each tree, shipped and DEV, four rounds each.

| Window | Tip | Base |
| --- | --- | --- |
| press, then 2,000 samples (sortable) | `#handleMove` 2,001, `#handleOpenResolution` **0** | `#handleMove` 2,001, `#handleOpenResolution` 0 |
| 50 drops (sortable) | `#handleMove` 100, `#handleUp` 50, `#handleOpenResolution` **50** | `#handleMove` 100, `#handleUp` 50, `#handleOpenResolution` 0 |
| 2,000 `moveTo` calls (free drag, active) | `moveTo` **2,000**, `#handleOpenResolution` 0 | `moveTo` 2,000, `#handleOpenResolution` 0 |

The press's threshold move is the 2,001st `#handleMove`. The baseline has no `OPEN_RESOLUTION` unit, so its count is 0 by construction.

### M-2 — controller cost with the façade

M-2′'s per-controller retained heap, in bytes per controller over existing DOM. Four rounds:

| Population    |    n | Tip              | Base             | Δ             |
| ------------- | ---: | ---------------- | ---------------- | ------------- |
| all sortable  |  100 | 3,709 (all four) | 3,701 (all four) | **+8**        |
| half and half |  100 | 3,323 (all four) | 3,276 – 3,277    | **+46 – +47** |
| all free drag |  100 | 2,792 (all four) | 2,713 – 2,714    | **+78 – +79** |
| all sortable  | 1000 | 3,723 – 3,725    | 3,703 – 3,704    | **+19 – +22** |
| half and half | 1000 | 3,170 – 3,234    | 3,148 – 3,182    | +22 – +52     |
| all free drag | 1000 | 2,704 – 2,755    | 2,626 – 2,676    | +28 – +129    |

**Attributed retention.** The step-6 harness's retention row, shipped, one run per tree. It counts objects still live after `gc()` from the construction of 100 controllers, with collected objects excluded:

| Controller | Tip, total | Base, total | Δ | `kernel/kernel.ts:channel`, tip |
| --- | --: | --: | --: | --: |
| sortable (three rows, `y()`) | 5,116.3 B | 5,089.6 B | **+26.7** | 104.6 B |
| free drag (bare) | 3,471.1 B | 3,402.0 B | **+69.1** | 105.6 B |

The baseline has no `channel` frame. Several other frames move between the trees in both directions, among them `Kernel` against `ArmedController` and `#arm`, and _other_ `assign`.

### R21 — the read census and the mint sites

**`tests/kernel/capture.node.test.ts`, at the frozen tree:** 15 of 15 pass. They include _should find lifecycle and request reads only at the runner, intake, the channel and unit entries_ and _should find no lifecycle or request read outside the kernel_. By location, as the row asserts it:

| Place | Reads |
| --- | --- |
| the runner, `kernel/execution.ts` | `ExecutionBracket.#leave`, `#step`, `dispatch`, `requestClose` read `#lifecycle`; the accessors `closed` and `idle` themselves; `runIngress` reads `idle` |
| intake, `kernel/kernel.ts` | `ArmedController.#cancelWith` and `#failOperation` (`closed`, `cancelRequest`); `Kernel.dispatch` (`closed`) |
| the runner's ingress refusal | `ArmedController.#onPointerDown` (`idle`) |
| the channel's one refusal | `Kernel.channel` (`closed`) |
| unit entries | `#handleActivate`, `#handleCancel`, `#handleFailed`, `#handleMove`, `#handleStartCommitted` (`cancelRequest`); `#handleOpenResolution` (`cancelRequest`, `failureRegistered`) |
| outside `src/kernel/` | **none** |

**`grep`** over `src/` for `#bracket.closed`, `#bracket.idle` and `#lifecycle`, comments excluded, finds hits only in `kernel/execution.ts` and `kernel/kernel.ts`. A search for `.closed`, `.idle`, `#lifecycle` and `live()` finds no file outside `src/kernel/`.

**The `channel` mint sites**, by `grep` for `channel(` and for the bare word `channel`, comments excluded. **Five, all at construction:**

| Site | Mints over |
| --- | --- |
| `kernel/kernel.ts:2748`, `Kernel`'s arming, passed to `ArmedController` | `next.reportError` |
| `sortable/spec.ts:317`, `SortableBehavior`'s constructor | `#deliver` |
| `free-drag/spec.ts:243`, `FreeDragBehavior`'s constructor | `#deliver` |
| `sortable/behavior.ts:126`, the composition's `report` | `merged.onError` |
| `free-drag/behavior.ts:52`, the composition's `report` | `merged.onError` |

The other two hits are the declaration (`kernel/spec.ts:105`) and the definition (`kernel/kernel.ts:2553`). No alias of `channel` exists: the bare word appears in no other code line. **No sixth site.** The step-4 feature proof's line numbers moved with step 5's comment pass, and the sites are the same five.

## Analysis

_Everything in this section is analysis: read from the code or inferred from the figures above._

**Composition.** No change since 5R, as the freeze requires. This is a control row: the instrument sees every kernel-carrying module, and the frozen tree should move nothing.

**I-26's structural check, against what the figures show.**

- **One sample allocates about 189 B at both trees, so _allocates nothing_ does not hold literally.** It holds for I-26's own wording: _no wrapper, tuple, collection or protocol object_. The bytes come from two places:
  - **about 105 B is the CSS transform string**, written per sample by `presentation.ts` (inlined into `moved` on some arms). I-26 names this allocation as permitted;
  - **about 84 B is the action queue's backing store**, which `Array.prototype.push` allocates under `kernel/execution.ts:dispatch`. The calibration reproduces it with `ActionQueue` alone: 89–90 B a cycle. It also reproduces with a truncation to a non-empty length, 100 B, so the cause is that a large length decrease trims the store and the next push regrows it. That every sample pays it is consistent with every `MOVE` unit adding one entry and draining it. **`queue.ts` is unchanged since `6905af249`, and the baseline books the same 84 B.** It is not D-208's. It is a source-comment defect (Escalation 3).
- **Net of the harness.** Free drag's per-sample allocation is about 189 B: the arm's total less its control, 2.7–9.5 B. The control measures dispatch with no listener. The harness's own `PointerEvent` is outside the window, because events are built first, and the harness books 0.0–0.1 B. The step-4 feature proof's ~50 B per sample came from `usedJSHeapSize` growth with each sample's event built inside the loop. It is consistent with that event's wrapper, but it does not decompose against these figures. **M-1's heap-growth reading of 0.0 B at both trees, on a path that allocates ~189 B a sample, shows that the reading does not see this churn**: scavenges inside the loop return it before the second reading.
- **`OPEN_RESOLUTION` is per drop:** 0 in 2,000 samples, 50 in 50 drops, 0 in 2,000 `moveTo` calls.
- **`moveTo`'s copy is per call:** 2,000 calls for 2,000 `moveTo`s. It adds 20–27 B per call over the baseline. That matches one `CapturedPosition` record, whose allocating frame (`moveTo`, 15.0 B shipped) does not exist at the baseline. §2.12 requires it, and step 4's record predicts it.
- **No per-sample difference from D-208.** Every per-sample arm is equal between the trees, within the round-to-round spread, shipped and DEV. Drops are equal too.

**step4-D, the committed move.**

- **Equal between the trees.** Shipped, a moving frame allocates about 1.1–1.2 kB and a still frame about 0.7 kB, at both trees. The moving arm's excess, about 420–480 B a frame, is the spatial resolve, the rect-index advance and the linear shift.
- **In DEV the tip is about 90 B lower per moving frame**, all of it in `verifyEquivalence`, which ships in no build. Step 4's removal of the `live` threading is the plausible source. It is not attributed further.

**M-2.**

- **Each tip controller retains more than at the baseline**: +8 B (sortable) and +78 B (free drag) at 100 controllers, where every round reproduces to the byte. Mixed populations land between the two, as M-2′'s additivity predicts.
- **Attribution.** The profiler books about 105 B per controller to `Kernel.channel` at the tip, a frame the baseline does not have. That is the minted closures: three per controller, the armed route and the behavior's two. D-208 §18.4 requires them, and step 4's record predicted _one closure per minted channel_. The net is smaller than 105 B because step 4 also removed `#live`, `#notify` and the `closed` getter. Which frames make up the remainder is not established, because attribution follows inlining (§Limits).
- **This is a measured increase in M-2's quantity, attributable to D-208,** and §23.3 says to escalate it, not decide it (Escalation 1). It is not judged here to be a regression or not one.

**M-1 timing.**

- **The sortable path shows no difference** at the instrument's resolution: 50 rows split 9 / 12, and 200 rows split 13 / 10.
- **Free drag leans slower at the tip on two arms.** Bare splits 16 / 6 with a median difference of +0.39 µs, two timer quanta. `bounds(thunk)` splits 17 / 6 with +0.20 µs, one quantum. `axis` and `bounds(element)` show no lean.
- **Under a two-sided sign test**, the two leaning arms sit near p ≈ 0.05 and p ≈ 0.035. That is the conventional threshold, with four arms looked at, on a host whose load moved from 6 to 27 during the runs.
- **What the code predicts.** Free drag's per-sample path loses a read in `moved` and reads an owned record in `bounds()`. `#handleMove` gained one `cancelRequest` read at entry in step 3 (D-207, R21's census). Allocation is identical. Nothing identified on the path accounts for 0.4 µs.
- **The instrument cannot settle it, so it is escalated as unresolved (Escalation 2).** It is neither claimed as a regression nor ruled out as one.

## Escalations

Each is raised under §23.3's _Escalate rather than decide_. None is decided here, and none was acted on in `src/`.

1. **M-2: per-controller retained heap grows at the tip, and the growth is attributable to D-208** (§23.3, first condition).
   - **The figures:** +8 B per sortable controller and +78 B per free-drag controller at 100 controllers, reproduced to the byte in four rounds. At 1000 controllers: +19 to +22 B, and +28 to +129 B.
   - **Attribution:** about 105 B per controller in `Kernel.channel`'s minted closures (§18.4).
   - **What it does not establish:** that this is a _regression_ in the owner's sense. The design requires the channels, and the record predicted the closures. §20.5 says _the owner authorizes none_.
   - **For the architect, and the owner if needed:** whether a retained-heap increase from a required mechanism is the regression §20.5 refers to.
2. **M-1: an unresolved lean on free drag's per-sample timing** (§23.3, first condition).
   - **The figures:** bare and `bounds(thunk)` are slower at the tip in 16 and 17 of 24 paired rounds, by one to two timer quanta, on a heavily loaded host. The sortable shows no lean. Allocation is identical.
   - **What it does not establish:** a regression, or its absence.
   - **For the architect:** whether a quieter host, or an instrument finer than the calibrated batch (for example, a CPU profile of the two paths), is required before acceptance.
3. **A source-comment defect in `src/kernel/queue.ts`, which is not D-208's** (§23.3, fourth condition; §23.2).
   - **The class header** says _array capacity growth is amortized_.
   - **`clear()`'s docblock** says _a drain clears once per pointer sample and truncation allocates nothing_.
   - **Measured:** every pointer sample allocates a new backing store, about 84 B, at both trees. Truncation trims the store, and the next `add` regrows it.
   - **Consequence:** the comments do not describe what the code does per sample, and I-26's statement, which `d208-requests.md` would carry as _one sample allocates nothing_, is not met literally.
   - **Status:** the file is unchanged since `6905af249`, and the comment predates D-208. Step 6 does not fix it, and this record does not absorb it. The architect decides whether it blocks acceptance and where a correction goes.

## Closed items the record cites

Each where it closed:

- R34 (`e46e11493`);
- step3-B (§20.2);
- step4-A's census and 5R's supplementary census;
- step5-A, step5-C and #1, closed in 5R (§21);
- the uniqueness text, closed in 5R.1 (§22);
- 5r1-A, I-31's qualification and L-2's citation, closed at `7f1900ccf` (§23.1).

## Verification

- **Tests:** `vitest run`, every project, with the harness in the tree. 1,380 pass and 14 fail, with 66 skipped. `react.browser` and `stories.browser` do not load, as before.
  - **The 14 are identical by name** to the input's run: the six `size.node` controls, the four `docs.node` rows and the four budget rows.
  - **The harness adds three passing rows and six opt-in rows**, which are skipped without `VITE_DRAG_MEASURE`. It adds no failing row.
- **Lint**, over the two harness files, after `fmt`, `lint-fix`, `fmt`: clean. The harness carries one file-level `no-await-in-loop` directive with its reason. Each awaited step is a frame, a drop or an arm that must finish before the next begins.
- **Typecheck:** only the two `.scripts/vitest-*.ts` errors present at the input.
- **The freeze:** `git rev-parse` returns `4630579d…` for `packages/drag2/src` at `be75b3da1` and at this record's commit.
- `git diff --check`: clean.

## Limits

- **Chromium only**, one engine version, one machine.
- **The host was heavily loaded**, by processes outside the container. Timing is bimodal, and the M-1 timing rows bound a difference at about one quantum without resolving one. Allocation, call counts and the 100-controller M-2 figures did not vary with load: they reproduce to within a few bytes, and to the byte, across rounds.
- **Attribution follows the physical frame.** An allocation in a function that was inlined is booked to the function it was inlined into. That is why the same transform string appears under `write`, `compose`, `moved` or `effectAction` depending on the arm, and the queue store under `dispatch` or under _other_ `push`. Totals and the arm-minus-control differences do not depend on inlining. Per-function figures do, so they identify sources and are not a decomposition.
- **The sampling interval** is 8 B, smaller than every allocation booked here. A sampled heap profile is still an estimate, and the figures carry its scaling.
- **The heap figures are V8 heap only.** Blink's allocations outside the JS heap (DOM nodes, style data) are not counted on any arm.
- **The committed move runs under real frames**, so each frame also carries whatever else the page did. The still arm is its control, and the harness's own frame promise appears on both arms.
- **The baseline's harness was mapped by text** (`requestDestroy` → `destroy`, `requestCancel` → `cancel`). Every baseline run passed its structural rows and reported every arm, so no arm failed on a missing member.
- **M-2′ was run on its per-controller rows only.** Its retention-after-drags and P-02 rows were not run at either tree.
- **The `channel` mint-site census is a text search.** A mint reached through a computed property name would escape it. None exists.

## Unresolved obligations

- **Escalations 1–3** go to the architect, and through the architect to the owner where a published outcome or an authorization is involved.
- **The owner's dated disposition of the four overruns** is absent. Step 6 does not propose or presume one.
- **`d208-requests.md` is not created.** It is written only when the evidence is complete **and** the disposition is present, and writing it is step 6's last act.
- **D-208 stays `Unimplemented (Remediation)`.** F-432 to F-435 and F-441 stay open. F-442 is untouched. Reviewer-E and D-200's independent acceptance stay the owner's.

**Next:** the architect's disposition of Escalations 1–3, and the owner's dated disposition of the four overruns. Step 6 resumes when both are present: it re-measures whatever an escalation's outcome changes, then writes `d208-requests.md` as its last act. Step 6's feature proof follows.

## M-1's follow-up, 2026-11-03 (§24.5 step 3)

**Canonical entry: `drag2:D-208`**, under [`request-application-claude.md`](../reviews/architecture/request-application-claude.md) §24.2 and §24.5 step 3. This is measurement only. **Input:** `57d5b7326`. **The frozen `src/`** is tree `4630579d236624eb32f124268b1c026482f84da2` at the input and at every commit of this section. **Baseline:** `6905af249`, src tree `19f0b867e4094c764c11f1cf5016f7d2796fac98`.

### Protocol (pre-registered)

Committed before the first round. Nothing below changes after a round has run, and the rounds are not pooled with step 6's 24 rounds or its four preliminary rounds.

**Instrument.** `tests/perf/d208-m1.browser.test.ts`, its timing row only, at harness commit `3be92b8d9`. It is the only harness change.

- **Fixtures.** The arms are built as M-1′ arm C and M-1 build them: the same fixtures, the same sample coordinates, one live controller at a time. The arms run in a fixed order: free drag bare, `axis: 'y'`, `bounds(element)`, `bounds(thunk)`, then sortable at 50 rows and at 200 rows.
- **Policy.** M-1's policy, unchanged: five discarded warm-up samples, a batch calibrated to at least 2 ms, then 21 batches. The per-sample figure is the median batch mean.
- **Resolution.** The harness measures the clamp quantum `q` of `performance.now()` as the smallest nonzero step over 200 steps. It then doubles the batch's repeat count until `q / repeats ≤ 0.05 µs`. Every figure is reported with `q`, `repeats` and `q / repeats`. **The stated resolution `r`** is the largest `q / repeats` reported in any accepted run. The probe runs before this commit returned `q` = 100 µs, `repeats` = 2,048 and `r` = 0.0488 µs.
- **Project.** The ordinary `browser` project, where `__DEV__` is `true`, which is where step 6's M-1 timing rows ran. The file runs alone, one file per Vitest run: `VITE_DRAG_MEASURE=1 npx vitest run -c vitest.config.ts --project browser --reporter=verbose tests/perf/d208-m1.browser.test.ts`.
- **The baseline.** A scratch worktree at `6905af249`, using the shared `node_modules`. The tip's `.scripts/vitest-config.ts` and `packages/drag2/vitest.config.ts` are copied in, as step 6 did. The harness is copied in with `requestDestroy` mapped to `destroy`, and nothing else changes.

**Rounds.** One round is one run at each tree, back to back. Rounds are numbered 1–24 and run in ABBA order: the tip runs first in odd rounds, and the baseline runs first in even rounds. A rerun keeps its round's number and order.

**The host filter.** The 1-minute load average is the first field of `/proc/loadavg`.

- It is read immediately before a round's first run and immediately after its second.
- **If either reading is above 2.0, the round is discarded** and rerun. A discarded round is recorded with both readings and its figures, and it does not enter the rule.
- A round is not started until a reading is at or below 2.0. Readings are taken every 30 s while waiting, and a wait is not a discarded round.
- **The instrument filter.** A run that fails a row, does not report all six arms, or reports `q / repeats` above 0.05 µs discards its round. That discard is recorded separately from the load discards.
- **Blocked on the environment** if either of these happens:
  - no reading at or below 2.0 occurs in a continuous 2-hour wait;
  - 48 rounds are discarded before 24 are accepted.

  Then step 3 is reported blocked, and the accepted rounds so far are recorded without a rule outcome. The 2.0 threshold is not relaxed.

**The rule.** For each arm and each accepted round, `d = tip − base`, in µs, per-sample figure against per-sample figure.

- **A tie** is `|d| < r / 2`, which means the two figures are the same multiple of the resolution. Ties are dropped, both from the sign test and from the median.
- `n` is the number of untied rounds, and `k` is the number with `d > 0` (tip slower).
- **Exact one-sided sign test for _tip slower_:** `p = Σ_{j=k}^{n} C(n, j) / 2^n`. If `n = 0`, then `p = 1` and the median is 0.
- **The median paired difference** `m` is the median of the `n` untied differences. For an even `n` it is the mean of the two middle values.
- **Per primary arm:**
  - **regression:** `p < 0.01`;
  - **no regression:** `p ≥ 0.05` and `m ≤ r`;
  - **inconclusive:** anything else.
- **The primary arms** are free drag bare and free drag `bounds(thunk)`. **The secondary arms** are `axis`, `bounds(element)`, sortable at 50 rows and sortable at 200 rows. A secondary arm is computed the same way. At `p < 0.01` it is reported as a finding, and it does not enter the outcome.
- **Outcome:**
  - **_no regression_** only if both primary arms are no regression;
  - **_regression_** if either primary arm is a regression;
  - **_inconclusive_** otherwise.
- **Telemetry outside the rule:** each arm's median of all 24 differences with ties included, its tip and base medians, and its slower / faster / equal split.

**On _regression_ or _inconclusive_.** The harness's CPU-profile row (`VITE_DRAG_PROFILE=1`) runs once at each tree, after the 24 rounds. It covers both primary arms: 20,000 warm-up samples, then 200,000 samples under V8's CPU profiler at a 25 µs interval. It reports self time per sample by function, and it books frames served from `src/` to the library. Then step 3 stops and escalates to the architect. No fix is attempted.

### Rounds

**Pre-registration:** protocol commit `08ebdb63e`, over harness commit `3be92b8d9`. Every round ran after both. The rounds ran 2026-11-03, 17:26–19:49 UTC, in the same instruments as §Instruments: Chrome for Testing 153.0.8010.52, Vitest 5.0.5, Node v26.9.0, the same machine. The baseline worktree's src tree is `19f0b867e…`, and its harness differs from the tip's in the two `requestDestroy` → `destroy` lines only.

**Achieved resolution:** every one of the 72 runs (36 attempts, two trees each) reported `q` = 100 µs and `repeats` = 2,048, so `q / repeats` = **0.0488 µs**, and **`r` = 0.0488 µs**.

**Attempts:** 36 in all. **24 accepted. 12 discarded, every one on load:** in each, the start reading was at or below 2.0 and the end reading was above it. **No instrument discard:** every run passed both rows, reported six arms and reached `r`. The blocked conditions were not reached. The longest continuous run of readings above 2.0 was about 12.5 minutes, and the discards stopped at 12 of 48.

**The driver's waiting**, which the protocol leaves to the operator, and which changes no filter:

- Attempts 1 and 2 ran back to back as soon as a reading was at or below 2.0, and both ended above it, carrying the first run's own load.
- From attempt 3 on, the driver also waits 120 s after every attempt before it polls again.
- Between attempts 2 and 3, the driver briefly waited for a reading at or below 1.0 instead. No attempt started under that gate, and it was withdrawn because the host's idle floor sat at 1.1–2.5, so the gate might never open while the 2-hour clock never ran.

**Accepted rounds.** Per-sample figures in µs, tip / base. Load is the 1-minute average at the start and end. Times are UTC.

| Round | Attempt | Order | Start | Load start | Load end | bare | `bounds(thunk)` | `axis` | `bounds(element)` | sortable 50 | sortable 200 |
| --: | --: | --- | --- | --: | --: | --- | --- | --- | --- | --- | --- |
| 1 | 3 | tip → base | 17:58:27 | 1.53 | 1.67 | 3.223 / 3.467 | 6.934 / 2.881 | 3.516 / 3.320 | 3.467 / 3.125 | 2.783 / 2.930 | 2.783 / 2.881 |
| 2 | 4 | base → tip | 18:03:03 | 1.72 | 1.90 | 3.516 / 4.150 | 3.125 / 3.076 | 4.297 / 3.467 | 6.982 / 7.031 | 2.881 / 2.832 | 2.881 / 2.881 |
| 3 | 6 | tip → base | 18:08:15 | 1.49 | 1.45 | 3.320 / 3.662 | 3.027 / 2.832 | 3.272 / 5.078 | 2.783 / 2.978 | 3.125 / 3.027 | 3.174 / 3.027 |
| 4 | 7 | base → tip | 18:10:21 | 1.21 | 1.28 | 3.613 / 3.125 | 2.783 / 2.881 | 3.027 / 3.027 | 2.881 / 2.783 | 2.686 / 2.978 | 2.783 / 2.832 |
| 5 | 8 | tip → base | 18:12:26 | 1.66 | 1.61 | 3.272 / 5.713 | 3.027 / 3.027 | 3.027 / 6.494 | 2.930 / 3.320 | 3.027 / 2.686 | 2.783 / 2.978 |
| 6 | 9 | base → tip | 18:14:32 | 1.35 | 1.48 | 3.223 / 7.178 | 2.881 / 2.930 | 3.467 / 3.369 | 3.174 / 7.178 | 2.930 / 3.027 | 2.978 / 2.832 |
| 7 | 10 | tip → base | 18:16:37 | 1.40 | 1.45 | 3.027 / 4.150 | 2.881 / 3.076 | 2.832 / 4.883 | 2.881 / 3.174 | 2.832 / 2.930 | 2.783 / 2.881 |
| 8 | 11 | base → tip | 18:20:43 | 1.59 | 1.57 | 3.418 / 3.320 | 2.978 / 3.076 | 3.174 / 3.027 | 2.930 / 2.783 | 3.320 / 2.734 | 2.832 / 2.881 |
| 9 | 12 | tip → base | 18:22:48 | 1.01 | 1.00 | 3.272 / 3.174 | 2.881 / 2.978 | 2.978 / 3.076 | 2.734 / 3.076 | 2.881 / 2.881 | 2.832 / 2.881 |
| 10 | 13 | base → tip | 18:24:53 | 1.70 | 1.64 | 3.272 / 7.471 | 3.125 / 3.076 | 3.027 / 3.125 | 3.027 / 6.836 | 3.027 / 2.978 | 2.881 / 2.783 |
| 11 | 14 | tip → base | 18:26:59 | 1.26 | 1.40 | 3.125 / 3.564 | 2.881 / 2.978 | 3.320 / 3.564 | 2.783 / 3.223 | 2.588 / 2.881 | 2.734 / 2.881 |
| 12 | 16 | base → tip | 18:32:09 | 1.54 | 1.57 | 3.076 / 3.174 | 2.832 / 3.125 | 3.076 / 3.174 | 2.783 / 3.027 | 2.637 / 3.027 | 2.686 / 3.125 |
| 13 | 17 | tip → base | 18:34:15 | 1.14 | 1.12 | 3.125 / 4.736 | 3.174 / 3.076 | 3.272 / 6.348 | 3.174 / 3.467 | 2.930 / 3.076 | 2.930 / 2.930 |
| 14 | 18 | base → tip | 18:38:51 | 1.63 | 1.66 | 3.223 / 3.369 | 3.809 / 2.881 | 3.174 / 3.272 | 3.320 / 2.881 | 4.639 / 2.734 | 3.272 / 2.686 |
| 15 | 19 | tip → base | 18:41:57 | 1.51 | 1.55 | 3.272 / 4.541 | 3.125 / 3.760 | 3.223 / 4.346 | 3.076 / 3.857 | 2.978 / 3.516 | 2.930 / 3.516 |
| 16 | 20 | base → tip | 18:45:02 | 1.67 | 1.80 | 3.467 / 3.467 | 3.076 / 2.832 | 4.346 / 3.125 | 3.125 / 2.832 | 2.978 / 3.174 | 2.881 / 3.076 |
| 17 | 23 | tip → base | 18:59:51 | 1.53 | 1.57 | 3.369 / 7.227 | 3.272 / 3.076 | 3.467 / 3.662 | 3.369 / 3.320 | 3.272 / 3.027 | 3.223 / 3.174 |
| 18 | 24 | base → tip | 19:01:57 | 0.87 | 1.04 | 3.564 / 3.516 | 3.272 / 3.174 | 3.418 / 3.369 | 3.076 / 3.174 | 3.174 / 3.223 | 3.272 / 3.369 |
| 19 | 26 | tip → base | 19:19:10 | 1.39 | 1.60 | 3.418 / 3.272 | 2.881 / 2.978 | 3.272 / 3.320 | 2.881 / 3.076 | 2.686 / 2.930 | 2.832 / 2.930 |
| 20 | 28 | base → tip | 19:23:21 | 1.64 | 1.67 | 3.418 / 3.564 | 2.930 / 3.027 | 3.516 / 3.174 | 3.027 / 2.978 | 3.027 / 3.027 | 2.978 / 2.978 |
| 21 | 29 | tip → base | 19:25:26 | 1.23 | 1.29 | 3.174 / 4.004 | 3.125 / 3.174 | 3.076 / 3.223 | 2.978 / 3.076 | 2.930 / 2.930 | 2.832 / 3.027 |
| 22 | 30 | base → tip | 19:29:02 | 1.61 | 1.56 | 3.418 / 3.369 | 3.174 / 3.174 | 3.369 / 3.418 | 3.125 / 3.516 | 3.076 / 2.783 | 3.027 / 2.783 |
| 23 | 32 | tip → base | 19:36:13 | 1.64 | 1.99 | 3.272 / 3.418 | 2.978 / 3.027 | 3.125 / 3.320 | 2.930 / 3.223 | 2.978 / 2.978 | 3.076 / 2.832 |
| 24 | 36 | base → tip | 19:47:36 | 1.26 | 1.32 | 3.320 / 3.272 | 2.978 / 2.930 | 3.418 / 3.320 | 3.711 / 3.223 | 2.881 / 3.027 | 3.027 / 2.978 |

**Discarded rounds.** They do not enter the rule.

| Round | Attempt | Order | Start | Load start | Load end | Discard | bare | `bounds(thunk)` | `axis` | `bounds(element)` | sortable 50 | sortable 200 |
| --: | --: | --- | --- | --: | --: | --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 | tip → base | 17:26:53 | 1.72 | 2.06 | load | 3.320 / 4.492 | 2.881 / 3.125 | 3.027 / 3.174 | 2.783 / 3.711 | 3.027 / 2.930 | 2.881 / 2.930 |
| 1 | 2 | tip → base | 17:27:29 | 1.68 | 2.58 | load | 3.418 / 3.564 | 2.930 / 3.516 | 3.125 / 4.981 | 2.832 / 3.272 | 2.881 / 3.125 | 2.783 / 2.978 |
| 3 | 5 | tip → base | 18:06:09 | 1.99 | 3.27 | load | 3.272 / 3.223 | 3.027 / 3.125 | 3.027 / 7.031 | 3.076 / 3.857 | 2.783 / 2.832 | 2.881 / 3.076 |
| 12 | 15 | base → tip | 18:29:04 | 1.77 | 2.35 | load | 3.467 / 3.320 | 3.076 / 2.978 | 3.076 / 3.174 | 3.027 / 3.076 | 3.027 / 2.881 | 2.978 / 2.832 |
| 17 | 21 | tip → base | 18:53:09 | 1.88 | 2.93 | load | 3.272 / 3.613 | 3.125 / 3.272 | 3.418 / 3.662 | 3.076 / 3.369 | 3.955 / 3.076 | 3.174 / 3.027 |
| 17 | 22 | tip → base | 18:57:15 | 1.73 | 2.07 | load | 3.369 / 7.666 | 3.125 / 3.272 | 3.467 / 4.492 | 3.369 / 3.272 | 3.076 / 2.930 | 3.223 / 2.930 |
| 19 | 25 | tip → base | 19:17:04 | 1.87 | 2.20 | load | 3.711 / 3.369 | 2.930 / 3.027 | 3.125 / 3.320 | 2.881 / 2.978 | 2.881 / 2.881 | 2.881 / 2.978 |
| 20 | 27 | base → tip | 19:21:15 | 1.44 | 4.05 | load | 3.662 / 3.223 | 3.223 / 3.027 | 3.467 / 3.223 | 7.031 / 2.978 | 2.930 / 2.686 | 2.978 / 2.637 |
| 23 | 31 | tip → base | 19:34:08 | 1.91 | 2.16 | load | 3.320 / 3.369 | 2.783 / 3.125 | 3.027 / 3.174 | 2.734 / 3.027 | 2.734 / 2.930 | 2.832 / 2.881 |
| 24 | 33 | base → tip | 19:40:49 | 1.99 | 2.21 | load | 7.031 / 4.297 | 2.930 / 3.174 | 5.176 / 3.369 | 3.027 / 3.564 | 2.881 / 2.930 | 3.076 / 2.978 |
| 24 | 34 | base → tip | 19:43:24 | 1.84 | 3.13 | load | 3.467 / 3.613 | 3.174 / 2.930 | 3.418 / 3.369 | 3.125 / 3.027 | 2.978 / 2.978 | 3.027 / 2.978 |
| 24 | 35 | base → tip | 19:45:30 | 1.59 | 2.18 | load | 3.857 / 3.223 | 3.027 / 3.027 | 7.178 / 2.881 | 3.076 / 2.832 | 3.272 / 2.881 | 3.174 / 2.930 |

### Results under the rule

`d = tip − base`, in µs. `r` = 0.0488 µs, and a tie is `|d| < 0.0244`.

| Arm | Slower / faster / tied | `n` | `k` | One-sided `p` | `m` (ties dropped) | Verdict |
| --- | --- | --: | --: | --: | --: | --- |
| **free drag bare** (primary) | 7 / 16 / 1 | 23 | 7 | 0.983 | −0.244 | **no regression** |
| **free drag `bounds(thunk)`** (primary) | 10 / 12 / 2 | 22 | 10 | 0.738 | −0.049 | **no regression** |
| free drag `axis` | 8 / 15 / 1 | 23 | 8 | 0.953 | −0.098 | no finding |
| free drag `bounds(element)` | 8 / 16 / 0 | 24 | 8 | 0.968 | −0.195 | no finding |
| sortable, 50 rows | 8 / 12 / 4 | 20 | 8 | 0.868 | −0.098 | no finding |
| sortable, 200 rows | 8 / 13 / 3 | 21 | 8 | 0.905 | −0.049 | no finding |

**Telemetry, outside the rule:**

| Arm | Tip median | Base median | Median `d`, ties included |
| --- | --: | --: | --: |
| free drag bare | 3.272 | 3.540 | −0.195 |
| free drag `bounds(thunk)` | 3.027 | 3.027 | −0.024 |
| free drag `axis` | 3.272 | 3.320 | −0.098 |
| free drag `bounds(element)` | 3.027 | 3.174 | −0.195 |
| sortable, 50 rows | 2.954 | 2.979 | −0.024 |
| sortable, 200 rows | 2.881 | 2.905 | −0.049 |

**Outcome: _no regression_.** Both primary arms meet `p ≥ 0.05` and `m ≤ r`. No secondary arm reaches `p < 0.01` for _tip slower_, so there is no finding. Because the outcome is not _regression_ or _inconclusive_, the CPU-profile row was not part of the protocol's response and was not run for the record. Step 3 does not escalate.

### Analysis

_Read from the figures above. None of it enters the rule._

- **The step-6 lean does not reproduce** at four times the resolution on a host inside the filter. On the two arms where it was 16 / 6 and 17 / 6 slower, the tip is now slower in 7 and 10 rounds of 23 and 22, and both medians of the untied differences are at or below zero.
- **The distribution is still bimodal.** Some arm-runs read about 7 µs against a typical 3 µs, which is the mode step 6 and the step-4 feature proof saw. Among the accepted rounds these land on the baseline more often than on the tip: for example, bare in rounds 5, 6, 10 and 17. Those rounds raise the baseline's median on bare and widen the negative side of `m`. A sign test counts each of them as one round, so they do not decide the outcome. Without them, bare is still not slower: the tip is slower in 7 of the 19 remaining untied rounds.
- **The outcome is read at `r` and not below it.** `m` on `bounds(thunk)` is −0.049 µs, one resolution step. The figures do not order the trees on that arm, and the rule does not ask them to.

### Limits

- **Chromium only**, one engine version, one machine, under `__DEV__` `true` in the ordinary `browser` project, as step 6's M-1 timing rows ran. A shipped-build timing was not part of the protocol.
- **The host filter bounds the 1-minute average at the two ends of a round, not during it.** A round lasts about 20 s, so the average reflects mostly what ran before the round.
- **The sign test answers _is the tip slower more often than not_, not _by how much_.** `m` is the only magnitude in the rule, and it is quantized to `r`.

### Verification

- **The freeze:** `git rev-parse HEAD:packages/drag2/src` returns `4630579d…` at `3be92b8d9`, at `08ebdb63e` and at this section's commit. Nothing under `src/` was edited.
- **The harness:** `fmt`, `lint-fix`, `fmt` and `lint` are clean. Typecheck shows only the two `.scripts/vitest-*.ts` errors already present at the input. Its structural row passed in every one of the 72 runs.
- **This record:** `oxfmt` formatted it. `lint` reports Markdown as not linted, so no code-lint pass is claimed.
- **Retained scratch:** the round logs, the driver and the analysis script are in the session scratchpad, not in the tree. The baseline worktree was removed after the rounds.

### Next

Step 3 is complete with the outcome _no regression_. Per §24.5, the next step is 6R (step 4). It is not started in this unit. Under step 5, this result carries over to 6R's tree only if 6R's diff touches no function on the per-sample path and the per-sample call counts are identical.

## Remediation 6R, 2026-11-03 (§24.5 step 4) — escalated, nothing landed

**Outcome: the target is unreachable within D-208's properties, and 6R stops here.** No source change is committed. `src/` stays tree `4630579d236624eb32f124268b1c026482f84da2` at this record's commit. The residuals, and what was tried, go to the architect and then the owner (§24.5 step 4, _Escalate rather than decide_).

**Input.** `0852534bf` on `drag2/fin-review2`. Governing text: [`request-application-claude.md`](../reviews/architecture/request-application-claude.md) §24.1 and §24.5 step 4.

**The owner's direction, 2026-11-03.** Asked whether to stop and escalate, to commit the in-property changes and escalate the residual, or to read D-208 as allowing an unminted kernel route, the owner chose _Stop and escalate: record the residual per population and every variant tried in §Remediation 6R. Do not commit source._ The question presented variant B′ as in-property. It is not, as below, so the in-property residual is larger than the one the question stated. The direction stands, because B′ failing only widens the gap.

### The target

M-2′, four rounds ABBA, against `6905af249`:

- **at 100 controllers**, the tip's per-controller figure is at or below the baseline's in every round, for all three populations;
- **at 1000 controllers**, the tip's range does not lie above the baseline's.

### What was tried

All variants touch only construction: `#arm`, `ArmedController`'s constructor, `Kernel.channel`, the two behaviors' factories and their specs' constructors. None of these functions has a nonzero count in step 6's per-sample window. M-2′'s per-controller rows, bytes per controller at 100 controllers, from one run unless noted.

| Variant | What it changes | Sortable | Mixed | Free | Properties |
| --- | --- | --: | --: | --: | --- |
| input (`4630579d`) | — | 3,709 | 3,323 | 2,792 | all hold |
| baseline (`6905af249`) | — | 3,701 | 3,277 | 2,714 | — |
| **A** | The kernel's mint moves from `#arm` into `ArmedController`'s constructor, over `(error) => { this.#spec.reportError(error); }`. The wrapper shares the context the driver callback already allocates, so `#arm` allocates no context | **3,690** | **3,302** | **2,771** | **all hold** (four rounds, below) |
| B | The behavior's own channel is the composition channel, passed to the spec, so each controller mints two channels instead of three | 3,816 | 3,474 | 2,885 | hold; reverted |
| A + B′ | B′: `channel(deliver)` returns `deliverUnlessApplied.bind(bracket, deliver)`, a module function holding the refusal | 3,657 | 3,270 | 2,740 | **R21 fails** (four rounds, below) |
| A + B′ + a bound forwarder | the kernel's wrapper as `forwardToSpec.bind(spec)` | 3,653 – 3,667 | 3,266 – 3,267 | 2,736 | R21 fails; two runs |
| prototype P | The kernel's own route as one arrow applying the refusal itself, not minted through `channel()`. A measurement prototype that writes the refusal a second time | 3,622 | 3,235 | 2,704 | breaks _written once_ and the kernel's mint; R21 not run |

- **B costs more than it saves.** In a bare composition the composition channel is garbage after construction, because no installer keeps `report`. Handing it to the spec retains it, and through its sink retains `merged`, the merged plugins array and the factory's context. Attribution books the rise to `mergeFreeFragments` (+52 B), the factory's closures (+49 B) and `createComposedFreeDragBehavior` (+21 B).
- **B′ moves the refusal's read.** `capture.node`'s census row _should find lifecycle and request reads only at the runner, intake, the channel and unit entries_ then reports `deliverUnlessApplied: closed` in place of `Kernel.channel: closed`, and fails. Keeping B′ would mean changing what R21 pins, which this unit cannot do.
- **P meets the target, and violates two properties.** It is reported only as the figure a design change would have to reach.

**The diff of A**, the only variant that keeps every property, against `4630579d`, giving src tree `1a5a1ae95c14b7eca741e32918a5c7aa76689f8f`:

```diff
@@ ArmedController constructor
     draft: Frame<Part>,
-    report: Notify,
+    kernel: Kernel<Part, Activation>,
   ) {
-    this.report = report;
-    this.#unwind = createUnwind(report);
+    this.report = kernel.channel((error) => {
+      this.#spec.reportError(error);
+    });
+    this.#unwind = createUnwind(this.report);
@@ Kernel.#arm
         draft,
-        this.channel((error) => {
-          next.reportError(error);
-        }),
+        this,
       );
```

**B′'s diff**, on top of A (src tree `b7dad3e4c83075055326d640158b90c3421fb305`): `channel`'s body becomes `return deliverUnlessApplied.bind(this.#bracket, deliver);`. `deliverUnlessApplied(this: ExecutionBracket, deliver, error)` is a module function holding the same `closed` test and the same `try`/`catch` terminus.

### Measurements

**M-2′, four rounds ABBA, A against `6905af249`**, ordinary `browser` project as in step 6. Bytes per controller.

| Round | Order | Tip, n=100 (s / m / f) | Base, n=100 (s / m / f) | Tip, n=1000 (s / m / f) | Base, n=1000 (s / m / f) | Load, start → end |
| --: | --- | --- | --- | --- | --- | --- |
| 1 | tip, base | 3,690 / 3,302 / 2,771 | 3,701 / 3,277 / 2,714 | 3,702 / 3,212 / 2,734 | 3,703 / 3,175 / 2,675 | 7.62 → 7.61 |
| 2 | base, tip | 3,690 / 3,302 / 2,771 | 3,701 / 3,277 / 2,714 | 3,616 / 3,212 / 2,734 | 3,703 / 3,180 / 2,675 | 7.61 → 7.90 |
| 3 | tip, base | 3,690 / 3,302 / 2,771 | 3,701 / 3,277 / 2,714 | 3,649 / 3,212 / 2,734 | 3,645 / 3,139 / 2,675 | 7.90 → 7.76 |
| 4 | base, tip | 3,690 / 3,302 / 2,771 | 3,701 / 3,276 / 2,713 | 3,703 / 3,212 / 2,734 | 3,704 / 3,181 / 2,675 | 7.76 → 7.27 |

**M-2′, four rounds ABBA, A + B′ against `6905af249`**, the same project.

| Round | Order | Tip, n=100 (s / m / f) | Base, n=100 (s / m / f) | Tip, n=1000 (s / m / f) | Base, n=1000 (s / m / f) | Load, start → end |
| --: | --- | --- | --- | --- | --- | --- |
| 1 | tip, base | 3,657 / 3,270 / 2,739 | 3,684 / 3,276 / 2,714 | 3,585 / 3,182 / 2,635 | 3,703 / 3,137 / 2,619 | 2.33 → 2.61 |
| 2 | base, tip | 3,657 / 3,271 / 2,740 | 3,697 / 3,277 / 2,714 | **−858** / 3,182 / 2,702 | 3,702 / 3,180 / 2,675 | 2.61 → 3.52 |
| 3 | tip, base | 3,657 / 3,271 / 2,740 | 3,701 / 3,277 / 2,688 | 3,584 / 3,180 / 2,702 | 3,646 / 3,182 / 2,675 | 3.52 → 4.17 |
| 4 | base, tip | 3,657 / 3,270 / 2,739 | 3,701 / 3,276 / 2,713 | 3,671 / 3,109 / 2,702 | 3,703 / 3,180 / 2,675 | 4.17 → 4.20 |

- The tip's sortable figure at 1000 in round 2, **−858 B**, is a failed reading: a negative retained heap. It is reported as read, and no range below includes it.
- M-2′ has no load filter. The loads are recorded and filter nothing.

**Attribution**, the step-6 harness's retention row (_should attribute what a constructed controller retains, by function_), ordinary `browser` project, 100 bare controllers, one run per tree. Bytes per controller, library frames that bear on the channel:

| Frame                                | Input | A + B′ |            Base |
| ------------------------------------ | ----: | -----: | --------------: |
| `kernel/kernel.ts:channel`           | 104.4 |      — |               — |
| _other_ `bind`                       |     — |   71.3 |               — |
| `kernel/kernel.ts:#arm`              | 197.9 |  151.2 | — (`arm` 173.7) |
| `kernel/kernel.ts:ArmedController`   | 671.4 |  700.2 |               — |
| `free-drag/spec.ts:FreeDragBehavior` | 192.7 |  191.9 |           222.0 |

The input row reproduces step 6's attribution (§M-2): 104.4 B to `channel` at the tip, and no such frame at the baseline.

**R33 and R21 on A:** `tests/diagnostic-intake.browser.test.ts` and `tests/kernel/kernel.browser.test.ts`, 234 of 234 pass; `tests/kernel/capture.node.test.ts`, 15 of 15. On A + B′: 234 of 234, and `capture.node` 14 of 15, the census row above failing. R33's two mutations were not run on any variant, because none lands.

### Analysis

_Everything in this subsection is analysis: read from the code or inferred from the figures above._

**A bare controller retains two channels, not three.** The composition channel is minted at construction and kept only by an installer that keeps `report`. Bare compositions keep none, so the 104.4 B step 6 booked to `Kernel.channel` is two mints: the kernel's own and the behavior's. That is about 52 B each, a closure and its two-slot context. The step-6 analysis's _three per controller_ counted the composition channel, which is transient in M-2′'s populations.

**Where D-208's bytes sit, per bare controller, against the baseline's routes:**

| Route | Baseline | Input | A |
| --- | --- | --- | --- |
| kernel's | `#report`, one arrow in the field initializer's existing context (≈ 29 B) | minted channel (≈ 52 B), and a wrapper with its own `#arm` context (≈ 29 + 18 B) | minted channel (≈ 52 B), and a wrapper in the constructor's existing context (≈ 29 B) |
| behavior's | `#notify`, one arrow in the field initializer's existing context (≈ 29 B) | minted channel (≈ 52 B) | unchanged |

Against the baseline, A still carries about 23 B on the kernel's route (a minted channel's closure and context, over an arrow) and about 23 B on the behavior's (a minted channel, over an arrow). The input's other changes offset part of that per population, which is why sortable meets the target and mixed and free do not.

**Why no in-property variant closes it.**

- A minted channel must hold its `deliver` and the lifecycle's owner. A closure therefore needs a context of its own per mint. The bound form is cheaper, about 36 B against 52 B, but it moves the refusal's read out of `Kernel.channel`, and R21 pins that location.
- The kernel's route needs a minted channel **and** a function that calls `reportError` with its receiver at each call. `BehaviorSpec.reportError` is a method, and the SPI does not say that it may be called detached or read once. So the wrapper stays. A changes only where it lives.
- One channel per behavior (B) is possible only by retaining the composition channel, and that retains more than it removes.

### Residual per population, within the properties (A)

| Population | n | Tip (A) | Base | Residual |
| --- | --: | --- | --- | --- |
| all sortable | 100 | 3,690 (all four) | 3,701 (all four) | **meets the target** (−11) |
| half and half | 100 | 3,302 (all four) | 3,276 – 3,277 | **+25 – +26** |
| all free drag | 100 | 2,771 (all four) | 2,713 – 2,714 | **+57 – +58** |
| all sortable | 1000 | 3,616 – 3,703 | 3,645 – 3,704 | not above |
| half and half | 1000 | 3,212 (all four) | 3,139 – 3,181 | **above** |
| all free drag | 1000 | 2,734 (all four) | 2,675 (all four) | **above** |

Against the input, A recovers 19 B on sortable, 21 B on mixed and 21 B on free drag at 100 controllers. All of it comes from the kernel's mint site and its wrapper.

### Escalation, for the architect and then the owner

**6R's target is unreachable within §24.5 step 4's properties** (_Escalate rather than decide_, first condition). These are the decisions the measured figures leave open:

1. **Authorize the residual** at A: +25 to +26 B per mixed pair and +57 to +58 B per free-drag controller at 100 controllers.
2. **The kernel's own route.** Could it apply the single refusal without being a channel minted through `channel()`? D-208 _Ownership and surface_ says the refusal is written once _for its own route and every minted channel_. §24.1 and §24.5 say _every diagnostic passes through a minted channel_. Prototype P reaches 2,704 B on free drag. A version that kept the refusal written once would still move the `closed` read, so R21's census would change as well.
3. **The SPI.** Could `reportError` be called without a receiver, or read once at arming? Then the kernel's route could mint over the spec's own sink with no wrapper. Not measured. It changes `BehaviorSpec`'s calling convention, which is an escalation condition in its own right.
4. **R21's pinned location.** Could the refusal live in one kernel function other than `Kernel.channel`? That would admit B′: free drag +25 to +52 B, mixed −5 to −7 B and sortable −27 to −44 B at 100 controllers, against each round's baseline. It would still miss the target on free drag.

None of these was decided or acted on here.

### Not measured, because nothing landed

Allocation per sample, per drop, per `moveTo` and per committed frame, call counts, the published declarations and composition against step 1's ceilings were not taken. `drag.js` and baseline B are untouched, as `src/` is.

### Verification

- **The freeze:** `git rev-parse HEAD:packages/drag2/src` returns `4630579d…` at this record's commit. Every variant was applied in the working tree, measured, and restored with `git checkout src`.
- **This record:** `fmt`, `lint-fix`, `fmt` and `lint` over this file. Both linters report that no Markdown file is lintable, so only formatting is checked. `git diff --check` is clean.

### Limits

- **Chromium only**, one engine and one machine. M-2′'s 100-controller rows reproduce to the byte, or to 1 B, across rounds. The 1000-controller rows spread, and one tip reading failed.
- **The variants other than A and A + B′ are single runs**, or two, and are reported to rank them, not as the target's reading.
- **Attribution follows the physical frame**, as step 6's §Limits states. The per-route byte figures in §Analysis are inferred from the attribution and from object sizes, and they identify sources rather than decompose the total.
- **The baseline worktree** was rebuilt as in step 6: a scratch worktree at `6905af249` with the shared `node_modules` and the tip's test configuration copied in. M-2′ ran from the baseline's own copy. It was removed after the runs.

### Next

6R is escalated, and step 5 does not start. The architect disposes of the four questions above, with the owner where an authorization is needed. A resumed 6R starts from that disposition, with variant A's diff above as the in-property starting point.

### Resumed 2026-11-04 (record §25.5): the shared-refusal candidate, a literal miss in two cells, nothing landed

**Outcome: the literal target is missed, so no source is committed and 6R escalates.** At 100 controllers, the candidate is above the baseline in two of the twelve population-round cells: round 2 mixed and round 4 sortable. In each, the baseline's reading is far below its own other readings. In every other cell the candidate is at or below the baseline. Every property of §25.5 that was checked holds, except that nine cost cells read above step 6's tip ranges (§Costs). `src/` stays tree `4630579d236624eb32f124268b1c026482f84da2`. **Whether those two cells count as a miss is the question this subsection escalates. This unit did not decide it, and no reading was discarded or replaced.**

**Input.** `04f6348c7` on `drag2/fin-review2`. The candidate is the working tree recorded in §The candidate's whole diff, src tree `c0713204a55b24ffc44f9ac0a92d80efa28c7aeb`. Every reading below was taken at that tree, and the tree was then restored with `git checkout`.

#### The candidate

- **One function holds the refusal and the terminus.** `deliverUnlessApplied(this: ExecutionBracket, receiver, deliver, error)`, a module function in `kernel/kernel.ts`, tests `this.closed`, then calls `deliver.call(receiver, error)` inside the one `try`/`catch`. No other copy of the test exists.
- **Every minted channel** is `deliverUnlessApplied.bind(this.#bracket, undefined, deliver)`. `channel(deliver)` keeps its signature. `deliver` still receives `undefined` as its receiver, and an extra argument to a channel is still ignored.
- **The kernel's own route** is one arrow in `ArmedController`'s constructor, `(error) => { deliverUnlessApplied.call(this.#bracket, this.#spec, reportToSpec, error); }`. It is not minted through `channel()`. It shares the context the driver's callback already allocates, so `#arm` allocates no context for it.
- **`reportToSpec`** is a module function, `this.reportError(error)`. `reportError` is still read and called with its receiver at each delivery, after the refusal and inside the terminus, so the SPI's calling convention does not change and no per-controller wrapper exists.
- **Panic is unchanged:** `ArmedController.panic` calls the spec's sink behind its own discard. The behaviors' routes are not edited.
- **The per-sample path:** the changed functions are `ArmedController`'s constructor, `Kernel.channel` and `Kernel.#arm`, plus the two new module functions. None appears in the per-sample window.

**The mint sites at the candidate**, four, by the same search as §R21. The kernel's own is gone, and nothing else changed: `sortable/spec.ts:317`, `free-drag/spec.ts:243`, `sortable/behavior.ts:126`, `free-drag/behavior.ts:52`. The definition is `kernel/kernel.ts:2599`, and the refusal's read is `kernel/kernel.ts`, `deliverUnlessApplied`.

**A variant not measured.** Keeping the receiver out of the bound arguments, as a trailing parameter, would save one slot per channel. A channel's second argument would then reach `deliver` as its receiver, which changes `channel`'s semantics, so it was not tried.

#### The rounds

**M-2′, four rounds ABBA, the candidate against `6905af249`**, ordinary `browser` project, as in step 6. Bytes per controller, every population at 100 and 1000. **Bold** marks a 100-controller cell where the candidate is above that round's baseline.

| Round | Order | Tip, n=100 (s / m / f) | Base, n=100 (s / m / f) | Tip, n=1000 (s / m / f) | Base, n=1000 (s / m / f) | Load, start → end |
| --: | --- | --- | --- | --- | --- | --- |
| 1 | tip, base | 3,625 / 3,239 / 2,708 | 3,701 / 3,277 / 2,712 | 3,638 / 3,075 / 2,670 | 3,703 / 3,153 / 2,622 | 1.88 → 1.89 |
| 2 | base, tip | 3,626 / **3,239** / 2,708 | 3,701 / **3,024** / 2,713 | 3,563 / 3,087 / 2,623 | 3,703 / 3,182 / 2,676 | 1.89 → 1.98 |
| 3 | tip, base | 3,625 / 3,238 / 2,707 | 3,701 / 3,276 / 2,714 | 3,640 / 3,150 / 2,670 | 3,705 / 3,182 / 2,675 | 1.98 → 1.98 |
| 4 | base, tip | **3,626** / 3,239 / 2,708 | **3,522** / 3,277 / 2,714 | 3,638 / 3,148 / 2,594 | 3,705 / 3,182 / 2,690 | 1.98 → 2.66 |

**The target, read literally against these rounds:**

| Population | n | Tip | Base | Reading |
| --- | --: | --- | --- | --- |
| all sortable | 100 | 3,625 – 3,626 | 3,701 ×3, **3,522** in round 4 | **above in round 4, by 104 B**; below in the other three, by 75 – 76 B |
| half and half | 100 | 3,238 – 3,239 | 3,276 – 3,277 ×3, **3,024** in round 2 | **above in round 2, by 215 B**; below in the other three, by 38 B |
| all free drag | 100 | 2,707 – 2,708 | 2,712 – 2,714 | met in all four, by 4 – 7 B |
| all sortable | 1000 | 3,563 – 3,640 | 3,703 – 3,705 | not above |
| half and half | 1000 | 3,075 – 3,150 | 3,153 – 3,182 | not above |
| all free drag | 1000 | 2,594 – 2,670 | 2,622 – 2,690 | not above |

**Four further rounds, with each of the five readings logged.** These are a diagnostic, not a substitute. They were taken after the four above, with a temporary `console.info` in `retention` at both trees, since reverted. Each figure is the instrument's minimum of its five readings.

| Round | Order | Tip, n=100 (s / m / f) | Base, n=100 (s / m / f) | Tip, n=1000 (s / m / f) | Base, n=1000 (s / m / f) |
| --: | --- | --- | --- | --- | --- |
| 1 | tip, base | 3,506 / 3,239 / 2,708 | 3,684 / 3,277 / 2,714 | 3,640 / 3,150 / 2,670 | 3,705 / 3,182 / 2,675 |
| 2 | base, tip | 3,625 / 3,239 / 2,708 | 3,701 / 3,277 / 2,714 | 3,553 / 3,148 / 2,670 | 3,703 / 3,180 / 2,675 |
| 3 | tip, base | 3,625 / 3,238 / 2,707 | 3,701 / 3,277 / 2,714 | 3,640 / 3,150 / 2,670 | 3,703 / 3,180 / 2,635 |
| 4 | base, tip | 3,626 / 3,239 / 2,708 | 3,701 / 3,277 / 2,714 | 3,640 / 3,161 / 2,670 | 3,703 / 3,180 / 2,675 |

The load ran 2.33 to 3.54. The candidate is at or below the baseline in every cell at 100, and no range at 1000 lies above the baseline's. Examples of what a single reading does, in bytes over 100 controllers:

| Row | The five readings | Minimum, per controller |
| --- | --- | --- |
| tip, sortable, n=100, round 1 | 362,524 / **350,592** / 373,952 / 370,424 / 370,424 | 3,506 B; round 2's lowest is 362,524 |
| base, sortable, n=100, round 1 | **368,388** / 395,148 / 380,788 / 377,436 / 377,380 | 3,684 B; rounds 2–4's lowest is 370,088 |
| base, free, n=1000, round 3 | 2,690,508 / 2,694,568 / **2,634,892** / 2,694,676 / 2,675,464 | 2,635 B; rounds 1, 2 and 4's lowest is 2,675,064 |

_What follows is analysis, inferred from these figures._ The instrument's comment says that heap noise is one-sided, so that _every source of error inflates a reading and none deflates it_. These readings do not fit that: a single one of five runs can land well below the others, at both trees, and the minimum then selects it. No such reading came with a measured cause, so **3,024 B and 3,522 B are not shown to be errors**. They could also be a true low state of the baseline. §Remediation 6R's −858 B and the 2,688 B baseline that §25.4 cites look like the same behavior. It is why the record cannot say that the target holds, and also why it cannot say that the candidate retains more than the baseline.

**Against the input and the usual baseline**, for ranking only: the candidate recovers 84 B per controller in all three populations (3,709 → 3,625, 3,323 → 3,239, 2,792 → 2,708), and all of it comes from the kernel's mint, the wrapper and the channels' form. Against the baseline's usual reading it is 75 – 76 B below on sortable, 38 B on mixed and 4 – 7 B on free drag. No unrelated saving is in the diff. Free drag's margin is small enough that a low baseline reading such as 2,688 B would also defeat it.

#### Attribution

The step-6 retention row, ordinary `browser` project, 100 bare controllers, one run of the candidate. The input and baseline columns are the §Remediation 6R runs. Bytes per controller, free-drag controller:

| Frame                                | Input | Candidate |            Base |
| ------------------------------------ | ----: | --------: | --------------: |
| `kernel/kernel.ts:channel`           | 104.4 |         — |               — |
| _other_ `bind`                       |     — |      41.0 |               — |
| `kernel/kernel.ts:#arm`              | 197.9 |     144.4 | — (`arm` 173.7) |
| `kernel/kernel.ts:ArmedController`   | 671.4 |     699.6 |               — |
| `free-drag/spec.ts:FreeDragBehavior` | 192.7 |     186.9 |           222.0 |
| library total                        | 3,009 |     2,640 |           2,805 |

The sortable controller reads the same way: `channel` 104.2 → none, `bind` 40.5, `#arm` 229.3 → 144.8, `ArmedController` 719.8 → 702.3. **The sampled library totals move by more than M-2′ does, and they are not read as the recovery.** The physical frames are what this row establishes: one bound function is retained per bare controller, the behavior's own, because the composition's is garbage after construction.

#### R33, R21 and the mutations

Whole suite, every project, on the candidate. Each mutation was applied alone by an exact-text patch and run against the whole suite. The two kernel files were restored from copies and compared byte for byte after each run.

- **Unmutated:** 1,385 pass, 10 fail, 68 skipped; `react.browser` and `stories.browser` do not load, as before. The 10 are the six `size.node` controls and the four `docs.node` rows, the failing set §24.5 step 1 names. R33 passes in full.
- **R21:** `capture.node` 15 of 15 with **the one re-pin §25.3 permits**. `kernel/kernel.ts › deliverUnlessApplied: closed` replaces `kernel/kernel.ts › Kernel.channel: closed`, with a comment saying what it is. No other entry in either list, the row _should find no lifecycle or request read outside the kernel_ and the ledger row change.

| Mutation | Applied to | Rows red beyond the unmutated run |
| --- | --- | --- |
| **M1** the refusal removed | `deliverUnlessApplied` | **19, as at step 4.** `diagnostic-intake`, both behaviors: _deliver a report made between the request and its application_, _deliver nothing when destruction requested at depth 0 is applied_, _deliver nothing when destruction requested from a slot is applied at its boundary_, _deliver only the panic when a panic tears the controller down_, _drop a kept report once the promise has settled_. `capture.node`: the census row. `kernel.browser`: _run both scrubs when a reset throws during destroy_, _close, report and only then tear down on a panic_, _read closed once the requesting unit has ended_, _deliver in the construction window and drop once destruction is applied_, _refuse every later notification once onError destroys_, and three _open no round-trip_ rows (release effect, its dispatched action, release prepare) |
| **M2** the refusal reads `REQUESTED` too | `deliverUnlessApplied`, with an accessor added to `execution.ts` | **11, as at step 4.** `diagnostic-intake`, both behaviors: _deliver a report made between the request and its application_ (the interval row). `kernel.browser`: _deliver in the construction window and drop once destruction is applied_ (the construction-window row), _report out-of-range tags while a destroy request is registered and not yet applied_, _agree with the physical signal inside the requesting unit_, _read open for the rest of the requesting unit_, _open no round-trip for a destroy requested in the release effect_. `free-drag`: _report the admission failure of the unit that requested destruction_, _report the invalid home of the unit that requested destruction_. `capture.node`: the census row and the accessor-derivation row |
| **M3** the kernel's route calls the sink directly behind its own `try`/`catch`, without the refusal | the arrow in `ArmedController`'s constructor | **2.** `kernel.browser`: _run both scrubs when a reset throws during destroy_, the row §25.5 requires, and _refuse every later notification once onError destroys_. **No finding: a row reddens** |

#### Costs

§25.5 asks for these only if the target is met. They were taken anyway, so a disposition does not need a second pass.

**Call counts:** identical in all eight runs, and equal to §Call counts: `#handleMove` 2,001, `#handleOpenResolution` 0; `#handleMove` 100, `#handleUp` 50, `#handleOpenResolution` 50; `moveTo` 2,000, `#handleOpenResolution` 0.

**Declarations:** 32 of 33 files are byte-identical. `kernel/spec.d.ts` differs in one doc-comment passage, `BehaviorSpec.reportError`'s _No guard belongs here_, which said that the kernel calls it _only through a channel it minted_. No type, member or signature changes.

**Allocation**, four rounds, tip only, shipped and DEV; load 2.73 – 4.73. The ranges of **nine cells rise above step 6's tip range**, and those cells are reported rather than read as noise:

| Row | Candidate | Step 6's tip | Above by |
| --- | --- | --- | --: |
| sortable sample, shipped | 194.0 – 200.1 | 193.6 – 194.6 | 5.5 |
| free drag bare, DEV | 192.1 – 195.9 | 191.7 – 192.5 | 3.4 |
| free drag `bounds(element)`, shipped | 195.7 – 196.8 | 191.5 – 196.1 | 0.7 |
| free drag `bounds(element)`, DEV | 196.2 – 196.8 | 191.3 – 196.7 | 0.1 |
| free drag `bounds(thunk)`, DEV | 191.4 – 191.8 | 191.5 – 191.7 | 0.1 |
| committed move, moving, shipped | 1,133.0 – 1,180.9 | 1,117 – 1,179 | 1.9 |
| free-drag drop, shipped | 15,290.3 – 15,311.7 | 15,266 – 15,308 | 3.7 |
| free-drag drop, DEV | 15,271.9 – 15,317.3 | 15,287 – 15,302 | 15.3 |
| sortable drop, DEV | 16,751.3 – 16,809.4 | 16,750 – 16,789 | 20.4 |

Every other row is within its range: sortable sample DEV 202.4 – 202.9; free drag bare shipped 192.0 – 192.3; `bounds(thunk)` shipped 191.3 – 191.6; `onMove` 259.7 – 260.1 shipped and 260.3 – 260.5 DEV; committed move still 690.2 – 695.7 shipped and 696.1 – 698.5 DEV, moving DEV 2,537.1 – 2,586.5; sortable drop shipped 16,816.2 – 16,860.6; `moveTo` 350.8 – 351.4 shipped and 349.7 – 350.5 DEV.

_Analysis:_ read from the code, no function the candidate changes runs in a sample, frame or `moveTo` window, and a drop reports nothing unless it faults. Each range above also overlaps the baseline's or sits within a few bytes of it, on a sampling instrument. That suggests noise, and no paired run or per-frame comparison was taken to establish it.

**Composition**, `measureAll()` at the candidate, against step 6's table. Bytes.

| Row                       | Minified | Brotli | Δ Brotli | Modules |
| ------------------------- | -------: | -----: | -------: | ------: |
| minimal                   |   33,419 | 10,221 |      +20 |      33 |
| minimal (xy)              |   32,776 | 10,117 |      +23 |      32 |
| minimal + layoutAnimation |   34,335 | 10,558 |      +25 |      34 |
| xy + layoutAnimation      |   33,692 | 10,435 |      +22 |      33 |
| minimal + landing         |   33,812 | 10,393 |       +7 |      35 |
| complete                  |   34,728 | 10,722 |      +34 |      36 |
| free drag minimal         |   27,063 |  8,281 |      +19 |      27 |
| free drag + bounds        |   27,707 |  8,514 |      +19 |      28 |
| free drag + landing       |   27,456 |  8,449 |      +12 |      29 |
| free drag complete        |   28,100 |  8,652 |      +24 |      30 |
| both behaviors            |   42,268 | 12,235 |      +26 |      47 |
| vocabulary root - drag.js |      252 |    142 |    **0** |       2 |
| kernel root - kernel.js   |   20,033 |  6,340 |      +20 |      16 |
| baseline A                |   34,019 | 10,525 |      +17 |      31 |
| baseline B                |   22,618 |  6,916 |    **0** |      26 |

Every package row stays under step 1's ceiling of its frozen-tree figure plus 150 B: the largest rise is 34 B. `drag.js` and baseline B, this unit's declared controls, do not move. Minified rises 79 to 84 B on every row carrying the kernel.

#### Text

The candidate's diff carries the text §25.5 requires: the `report` field's and `Kernel.channel`'s documentation, `panic`'s comment, the census entry, and 05:253's dated precision with the original struck. Since no source is committed, none of it landed either, and 05:253 still reads as before.

**Other text that states the kernel's route is minted**, as met while editing, and changed in the candidate's diff so that it states what the candidate does. No search was made for more:

- `kernel/seams.ts`, the driver's `#notify` field: _the one the façade mints over the spec's `reportError`_;
- `kernel/spec.ts`, `BehaviorSpec.reportError`: _only through a channel it minted over it_. It is published, and it is the one declaration difference above;
- `tests/kernel/capture.node.test.ts`, two comments: _the channel the façade minted_ and _the diagnostic channel's refusal is the façade's_;
- `kernel/kernel.ts`, four comments that name the controller's channel or link `Kernel.channel` for the refusal.

#### Escalation, for the architect and then the owner

**The literal residual, at the best candidate that keeps §25.5's properties:** all sortable +104 B in round 4 only, half and half +215 B in round 2 only, all free drag none. At 1000 no range lies above the baseline's. In both cells the candidate's own reading is its usual one, and the baseline's is the low one.

**The decision this leaves open.** §25.5 says _in every round_, and M-2′'s figure is a minimum that one low run sets. So:

1. **Is a round whose baseline figure comes from a single low run a miss?** If it is, the target as written can fail on the baseline's noise alone, at any candidate, and the owner authorizes the residual or directs a design change, as §25.5 states.
2. **If not, what reading replaces it?** For example, a pre-registered rule over M-2′'s five readings, or new rounds under one. It is a change to the target's instrument, so it is not this unit's to make, and rerunning until a clean four-round set appears would be selecting the result.
3. **The nine allocation cells.** Whether §24.5 step 4's _at or below step 6's tip ranges_ needs a paired reading for them, on a path the diff does not reach.

Nothing here was decided or acted on. If the candidate is admitted, the unit is the diff below, which still needs its commit, the recheck and closure.

#### Verification

- **The freeze:** `git rev-parse HEAD:packages/drag2/src` returns `4630579d…` at this record's commit. `git status` showed only the candidate's five files before the restore, and none after it.
- **The candidate:** `fmt`, `lint-fix`, `fmt` and `lint` over its four source and test files. The linters report four errors, all in `kernel/seams.ts` at lines this diff does not touch (`only-throw-error` twice and `no-unnecessary-condition` twice), and they report the same four at the input. Typecheck: only the two `.scripts/vitest-*.ts` errors present at the input.
- **This record:** `fmt`, `lint-fix`, `fmt` and `lint`. Both linters report that no Markdown file is lintable, so only formatting is checked. `git diff --check` is clean.

#### Limits

- **Chromium only**, one engine and one machine. M-2′ has no load filter; the loads filter nothing.
- **The logged rounds are not the governing four.** They ran after the rounds above were read, with one added line in the instrument at both trees.
- **The cause of the low readings was not investigated.** Nothing here shows why a run reads low.
- **Attribution is one run at each tree**, and the input and baseline columns come from the earlier section's runs.
- **Allocation was read only at the candidate,** against step 6's recorded ranges, not paired against a baseline in these rounds.
- **The baseline worktree** was rebuilt as in step 6 and removed after the runs.

#### Next

6R is escalated again, and step 5 does not start. The architect and then the owner dispose of the questions above.

#### The candidate's whole diff

Applies with `git apply` from the repository root at `04f6348c7`, and gives src tree `c0713204a`.

```diff
diff --git a/packages/drag2/.plan/contract/05-lifecycle-invariants.md b/packages/drag2/.plan/contract/05-lifecycle-invariants.md
index 3d53639dd..9a3dc5f23 100644
--- a/packages/drag2/.plan/contract/05-lifecycle-invariants.md
+++ b/packages/drag2/.plan/contract/05-lifecycle-invariants.md
@@ -250,7 +250,7 @@ Kernel-private, decided at admission. Escape-to-cancel is armed identically to a
 - **relinquishment** — each behavior's walk of its installers' retire hooks, run by teardown as part of application;
 - **diagnosis** — the panic route's one `onError`, a `DraggableError` whose stage is `null`, delivered after the panic closes and before it tears down.

-**D-51's named list is unchanged and empty.** **(a)'s mechanism on every diagnostic route is the kernel's channel refusal** (D-208). Every diagnostic the library delivers to `onError` leaves through a channel the kernel minted: the kernel's own route, each behavior's own channel and unwind guard, and the composition's `FeatureContext.report`. Each channel delivers until destruction is applied and drops from then on; the refusal is written once, in the kernel, and reads the applied lifecycle only, so its answer is constant across every unit. Panic's report is the one delivery that does not pass through it. **The silence for a teardown step that throws is grounded, and it is named by route**: a retire hook, a lifetime disposer or a frame reset that throws while destruction is applied reports nothing, because the channel it would report through refuses — on the behavior's route for a retire hook, and on the kernel's route for the rest. A `FeatureContext.report` an installer makes after application is dropped the same way. **What remains of D-53 is withdrawn**: the logical-liveness member it added is removed, and the only lifecycle readings left are the kernel's — the runner, request intake and the channel's refusal (§[02](02-kernel-behavior-contract.md) §What this actually guarantees).
+**D-51's named list is unchanged and empty.** **(a)'s mechanism on every diagnostic route is the kernel's channel refusal** (D-208). ~~Every diagnostic the library delivers to `onError` leaves through a channel the kernel minted: the kernel's own route, each behavior's own channel and unwind guard, and the composition's `FeatureContext.report`.~~ **Precision 2026-11-04 (D-208, remediation 6R):** each behavior's own channel, its unwind guard and the composition's `FeatureContext.report` are channels minted through `BehaviorContext.channel`; the kernel's own route is the kernel's, is not minted through it, and applies the same refusal. Each channel, and that route, delivers until destruction is applied and drops from then on; the refusal is written once, in the kernel, and reads the applied lifecycle only, so its answer is constant across every unit. Panic's report is the one delivery that does not pass through it. **The silence for a teardown step that throws is grounded, and it is named by route**: a retire hook, a lifetime disposer or a frame reset that throws while destruction is applied reports nothing, because the channel it would report through refuses — on the behavior's route for a retire hook, and on the kernel's route for the rest. A `FeatureContext.report` an installer makes after application is dropped the same way. **What remains of D-53 is withdrawn**: the logical-liveness member it added is removed, and the only lifecycle readings left are the kernel's — the runner, request intake and the channel's refusal (§[02](02-kernel-behavior-contract.md) §What this actually guarantees).

 **Tier:** ~~**C** for (a)~~ — **corrected to A by D-176, 2026-09-04**: under the repository's current scale Tier A is _a correctly integrated consumer observes something different at runtime_, and invoking a slot the consumer filled after the consumer destroyed the controller runs the consumer's own function body. That is the observation, and it is exactly why D-36's bracket cannot make a call consequence-free. **B** for (b) and for every publication the kernel sequences

diff --git a/packages/drag2/src/kernel/kernel.ts b/packages/drag2/src/kernel/kernel.ts
index afff1ebc8..f370952e1 100644
--- a/packages/drag2/src/kernel/kernel.ts
+++ b/packages/drag2/src/kernel/kernel.ts
@@ -346,6 +346,63 @@ function resetFrame<Part extends object, Activation extends {}>(
   });
 }

+/**
+ * **The diagnostic refusal and terminus, written once.** The armed controller's
+ * route and every channel {@link Kernel.channel} mints deliver through here, and
+ * nowhere else is either written:
+ *
+ * 1. **Refuse after application.** A channel outlives the unit that minted it: a
+ * composition's `report`, captured by an installer and called after destruction
+ * has been applied, would otherwise invoke `onError` after application, which
+ * the floor forbids outright. The refusal reads the applied lifecycle only, so
+ * its answer is constant across every unit: a request registered in the unit
+ * cannot change it.
+ * 2. **Hand the finished error to the sink**, which forwards it to `onError` and
+ * does nothing else.
+ * 3. **Discard whatever that throws.** *This is the terminus.* A throw from the
+ * sink is never re-notified, and that single discard is the whole of what makes
+ * the route non-recursive. It is also what lets every `unwind` site stay total
+ * without knowing anything about reporting: their catch calls a route, and a
+ * route cannot throw.
+ *
+ * Panic's report is the one exception, and it does not pass through here.
+ *
+ * The bracket is `this` and the receiver a parameter, so a channel is one bound
+ * function with no context of its own, and the armed controller's route reaches
+ * its spec with no per-controller wrapper.
+ */
+function deliverUnlessApplied(
+  this: ExecutionBracket,
+  receiver: unknown,
+  deliver: Notify,
+  error: DraggableError | DraggableWarning,
+): void {
+  if (this.closed) {
+    return;
+  }
+
+  try {
+    deliver.call(receiver, error);
+  } catch {
+    // The terminus. Reporting a reporting failure is the one recursion this
+    // model has to be incapable of, and being incapable is stronger than being
+    // careful.
+  }
+}
+
+/**
+ * The armed controller's sink: the spec's `reportError`, read and called with
+ * its receiver at each delivery and only after the refusal has let it through.
+ * The spec contract does not say that method may be called detached or read
+ * once.
+ */
+function reportToSpec(
+  this: Readonly<Pick<BehaviorSpec<never, never>, 'reportError'>>,
+  error: DraggableError | DraggableWarning,
+): void {
+  this.reportError(error);
+}
+
 /**
  * **The armed controller.** It owns the frame pair, the seam driver, the
  * operation and activation records, the attempt slots, the landing tail, the
@@ -414,15 +471,16 @@ class ArmedController<Part extends object, Activation extends {}> {
     resolution: null,
   };

-  /* ---- the controller's channel ---- */
+  /* ---- the controller's route ---- */

   /**
-   * **Every fault the kernel surfaces leaves through here**: the façade's
-   * channel, minted by construction over the spec's `reportError`, so it
-   * applies the one refusal {@link Kernel.channel} states and absorbs a throw
-   * from the behavior. Its collaborators take it as a value: the driver, every
-   * operation's lifetimes, this controller's unwind guard, and construction's
-   * unwind when it fails after publishing this controller.
+   * **Every fault the kernel surfaces leaves through here**: the kernel's own
+   * route to the spec's `reportError`, not a channel minted through
+   * {@link Kernel.channel}. It applies the one refusal and terminus
+   * {@link deliverUnlessApplied} states, so it refuses after application and
+   * absorbs a throw from the behavior. Its collaborators take it as a value:
+   * the driver, every operation's lifetimes, this controller's unwind guard,
+   * and construction's unwind when it fails after publishing this controller.
    *
    * **The stage is deliberately absent.** The sites that reach this holding a
    * real `FailureStage` discard it — the demoted checkpoints, `failOperation`'s
@@ -434,10 +492,10 @@ class ArmedController<Part extends object, Activation extends {}> {
   readonly report: Notify;

   /**
-   * The unwind guard, over this controller's channel.
+   * The unwind guard, over this controller's route.
    *
    * One closure per kernel rather than a free function: every call site
-   * reads `unwind(fn)` either way, and threading the channel's identity through
+   * reads `unwind(fn)` either way, and threading the route's identity through
    * each of them would put reporting at every site that merely wants the next
    * statement to run.
    */
@@ -467,10 +525,14 @@ class ArmedController<Part extends object, Activation extends {}> {
     spec: BehaviorSpec<Part, Activation>,
     current: Frame<Part>,
     draft: Frame<Part>,
-    report: Notify,
   ) {
-    this.report = report;
-    this.#unwind = createUnwind(report);
+    // Over the controller's fields rather than the parameters: the driver's
+    // callback below already puts `this` in this constructor's context, so the
+    // route adds one closure and no context of its own.
+    this.report = (error): void => {
+      deliverUnlessApplied.call(this.#bracket, this.#spec, reportToSpec, error);
+    };
+    this.#unwind = createUnwind(this.report);
     this.#realm = realm;
     this.#root = root;
     this.#bracket = bracket;
@@ -489,7 +551,7 @@ class ArmedController<Part extends object, Activation extends {}> {
       // lets the `QUALITY` and `BEST_EFFORT` tiers collapse into one sentinel.
       //
       // There is no lifetime guard at this site, and adding one here is wrong:
-      // the guard belongs in the channel, where every route shares it. A
+      // the guard belongs in the shared refusal, where every route has it. A
       // quality fault's producer is consumer-reaching — a `home` resolver, a
       // landing policy — and is equally free to request destruction before it
       // throws.
@@ -662,7 +724,7 @@ class ArmedController<Part extends object, Activation extends {}> {
    * next is conditioned on the call; it publishes no lifecycle or domain event
    * and ignores its return; and it is wrapped. Which sites share that property
    * is not this comment's to count — that list is maintained where the
-   * exception is stated, and the channel refuses every site that fails it.
+   * exception is stated, and the shared refusal drops every site that fails it.
    *
    * Reporting first and destroying second would run consumer code on a
    * controller whose invariants are *already known to be broken*, with the
@@ -681,12 +743,12 @@ class ArmedController<Part extends object, Activation extends {}> {
   panic(error: unknown): void {
     // **The one diagnostic delivered after application**: the diagnosis.
     // The bracket closed before calling this and tears down once it returns,
-    // so the channel would refuse it: it goes to the spec's sink directly,
-    // behind the same terminus.
+    // so the shared refusal would drop it: it goes to the spec's sink directly,
+    // behind a terminus of its own.
     try {
       this.#spec.reportError(new DraggableError(null, error));
     } catch {
-      // The terminus, as the channel's.
+      // The terminus, as the shared route's.
     }
   }

@@ -898,9 +960,9 @@ class ArmedController<Part extends object, Activation extends {}> {
       // this is a `DraggableError`, built here from the stage the kernel owns.
       //
       // Neither a destruction the resolver requested nor a throwing `onError`
-      // is handled here. **Both belong to the channel**
-      // ({@link Kernel.channel}), which refuses only after application and
-      // absorbs a throwing sink for every route rather than for this one.
+      // is handled here. **Both belong to the controller's route**
+      // ({@link deliverUnlessApplied}), which refuses only after application
+      // and absorbs a throwing sink for every route rather than for this one.
       this.report(new DraggableError(FAILURE_ADMISSION, error));

       return null;
@@ -986,7 +1048,7 @@ class ArmedController<Part extends object, Activation extends {}> {
       // **This site is not forced onto a second channel.** It reads like the
       // one place a platform report is unavoidable — the identity is a local
       // never published to the frames, so `failOperation` would degrade anyway
-      // — but the channel is operation-independent, so that reason does not
+      // — but the route is operation-independent, so that reason does not
       // hold: a warning needs no operation and no stage, and `return false`
       // refuses admission, so the outcome is the same either way.
       this.#unwind(live.lifetimes.dispose);
@@ -2527,43 +2589,15 @@ export class Kernel<
   }

   /**
-   * **The diagnostic refusal, written once.** Every channel — this
-   * controller's own, minted for the armed controller at construction, and
-   * each one a behavior mints — refuses after destruction has been
-   * **applied**, and nowhere else is it written:
-   *
-   * 1. **Refuse after application.** A channel outlives the unit that minted
-   * it: a composition's `report`, captured by an installer and called after
-   * destruction has been applied, would otherwise invoke `onError` after
-   * application, which the floor forbids outright. The refusal reads the
-   * applied lifecycle only, so its answer is constant across every unit: a
-   * request registered in the unit cannot change it.
-   * 2. **Hand the finished error to the sink**, which forwards it to `onError`
-   * and does nothing else.
-   * 3. **Discard whatever that throws.** *This is the terminus.* A throw from
-   * the sink is never re-notified, and that single discard is the whole of
-   * what makes the channel non-recursive. It is also what lets every `unwind`
-   * site stay total without knowing anything about reporting: their catch
-   * calls a channel, and a channel cannot throw.
+   * Mints a channel over `deliver`: it delivers until destruction is applied,
+   * drops every call afterwards and absorbs a throw from `deliver`, by the one
+   * refusal and terminus {@link deliverUnlessApplied} states.
    *
    * It needs only the lifecycle, which this façade holds from its own
    * construction, so a channel minted in the factory works before arming.
-   * Panic's report is the one exception, and it does not pass through here.
    */
   channel(deliver: Notify): Notify {
-    return (error): void => {
-      if (this.#bracket.closed) {
-        return;
-      }
-
-      try {
-        deliver(error);
-      } catch {
-        // The terminus. Reporting a reporting failure is the one recursion
-        // this model has to be incapable of, and being incapable is stronger
-        // than being careful.
-      }
-    };
+    return deliverUnlessApplied.bind(this.#bracket, undefined, deliver);
   }

   /**
@@ -2611,7 +2645,7 @@ export class Kernel<
    * A call from the construction window — the factory body or a frame-part
    * factory — is outside every seam, so it takes the demotion this member's
    * own contract states. The demotion is silent there because the report
-   * travels through the armed controller's channel, which does not exist yet:
+   * travels through the armed controller's route, which does not exist yet:
    * the same place a platform report has no destination on any other pre-arm
    * route.
    */
@@ -2745,9 +2779,6 @@ export class Kernel<
         next,
         current,
         draft,
-        this.channel((error) => {
-          next.reportError(error);
-        }),
       );
       this.#armed = armed;
       armed.attach();
@@ -2768,9 +2799,9 @@ export class Kernel<
    * constructed frame this path is still responsible for, and one that never
    * ran leaves nothing `resetFramePart` could be handed.
    *
-   * A failure inside the unwind reports through the armed controller's channel
+   * A failure inside the unwind reports through the armed controller's route
    * when one was published, and nowhere otherwise: before publication there is
-   * no channel to report through.
+   * no route to report through.
    */
   #unwindArm(
     next: BehaviorSpec<Part, Activation>,
diff --git a/packages/drag2/src/kernel/seams.ts b/packages/drag2/src/kernel/seams.ts
index 0c097a924..8b8910f98 100644
--- a/packages/drag2/src/kernel/seams.ts
+++ b/packages/drag2/src/kernel/seams.ts
@@ -144,8 +144,8 @@ export class SeamDriver<Part extends object> {
   readonly #fail: (stage: FailureStage, error: unknown) => void;

   /**
-   * The controller's channel, the one the façade mints over the spec's
-   * `reportError`. No checkpoint is queued, no recovery is
+   * The armed controller's route to the spec's `reportError`, which applies the
+   * kernel's one diagnostic refusal. No checkpoint is queued, no recovery is
    * selected, and the operation's own outcome is untouched — which is what
    * makes everything the driver sends here a {@link DraggableWarning}.
    */
diff --git a/packages/drag2/src/kernel/spec.ts b/packages/drag2/src/kernel/spec.ts
index c12f9a32d..a5d737331 100644
--- a/packages/drag2/src/kernel/spec.ts
+++ b/packages/drag2/src/kernel/spec.ts
@@ -523,9 +523,9 @@ export type BehaviorSpec<
    * proof that the operation is over**, and the terminal for that operation
    * still publishes afterwards.
    *
-   * **No guard belongs here.** The kernel calls this only through a channel
-   * it minted over it, and once from a panic, behind a discard of its own. A
-   * channel absorbs a throw from its sink, so a throw from `onError` stops
+   * **No guard belongs here.** The kernel calls this only through its own
+   * route, which refuses after destruction is applied and absorbs a throw, and
+   * once from a panic, behind a discard of its own. So a throw from `onError` stops
    * there and is never reported back. A behavior's own reports and its
    * composition's `report` reach `onError` through channels the behavior
    * mints with {@link BehaviorContext.channel}, not through this member.
diff --git a/packages/drag2/tests/kernel/capture.node.test.ts b/packages/drag2/tests/kernel/capture.node.test.ts
index 8a93ebea4..0f748723f 100644
--- a/packages/drag2/tests/kernel/capture.node.test.ts
+++ b/packages/drag2/tests/kernel/capture.node.test.ts
@@ -104,8 +104,8 @@ const membersWhere = (

 /**
  * The controller-scope context: realm, root, the bracket, the ingress signal,
- * the spec, the frame pair, the driver, and the channel the façade minted with
- * the unwind guard over it. The seam adapters are arrow-valued fields with
+ * the spec, the frame pair, the driver, and the controller's diagnostic route
+ * with the unwind guard over it. The seam adapters are arrow-valued fields with
  * initializers, and are `readonly` for the same reason; this list is the
  * context that arrives from construction.
  */
@@ -331,7 +331,7 @@ function ledgerReads(
 /**
  * **No unit reads the ledger after its entry.** The places left in the armed
  * controller are request intake, the runner's refusal before an ingress pass,
- * and unit entries. The diagnostic channel's refusal is the façade's, and the
+ * and unit entries. The diagnostic refusal is a module function's, and the
  * runner's own reading is the bracket's; both are outside this class and are
  * located by the source-wide census below.
  */
@@ -472,9 +472,11 @@ describe('the read census', () => {
       'kernel/kernel.ts › ArmedController.#handleStartCommitted: cancelRequest',
       // The runner's refusal before a native ingress pass is admitted.
       'kernel/kernel.ts › ArmedController.#onPointerDown: idle',
-      // The diagnostic channel's one refusal, and the façade's dispatch intake.
-      'kernel/kernel.ts › Kernel.channel: closed',
+      // The façade's dispatch intake.
       'kernel/kernel.ts › Kernel.dispatch: closed',
+      // The diagnostic refusal, shared by the kernel's route and every minted
+      // channel.
+      'kernel/kernel.ts › deliverUnlessApplied: closed',
     ]);
   });

```

### Protocol M-2″, 2026-11-04 (record §26.5–§26.8): retained heap reads outcome A, allocation reads a3 on one cell, nothing landed

**Input** `296be0275`. **Harness commit** `550777c9c`, before the first round; it touches only `tests/perf/`, `bench/m2pp/` and `drag2:F-445`'s dated notes. **`src/` stays tree `4630579d2`.** The candidate stays outside the tree.

**Result:**

| §26.1 label | At this result | Evidence |
| --- | --- | --- |
| **Unmet acceptance criterion** | **Yes.** 6R's landing needs A and a1, and a1 is not reached. The two cells of the resumed 6R and its nine allocation cells stay as they were recorded | §Allocation |
| **Demonstrated regression** | **No.** No population reads regression, on `E1` or `E2`, and no allocation cell does | §Retained heap, §Allocation |
| **Unresolved measurement uncertainty** | **Yes, one cell.** `moveTo` in DEV reads inconclusive, with `m` 1.01 B against `r` 1.0 B. The cause of the low readings also stays unestablished | §Allocation, §Low readings |

**Raw data:** [`d208-m2pp-raw.jsonl`](d208-m2pp-raw.jsonl) has one line per run with every `F`, `B` and `A`, including warm-ups, and every allocation row unrounded. [`d208-m2pp-rule.json`](d208-m2pp-rule.json) is the output of `node bench/m2pp/rule.ts` on it, the one computation.

#### What ran

- **168 runs, every one reporting.** No run failed and none was rerun. 2026-11-04, 04:44:59 – 05:02:59 UTC. Load 1.95 – 6.86, as telemetry only.
- **Engine:** every ledger reports `HeadlessChrome/153.0.0.0`, the record's Chrome for Testing 153.0.8010.52 at `/usr/local/bin/chrome`.
- **Trees, checked before the first round and after the last:** base `19f0b867e`, input `4630579d2`, candidate `c0713204a`. The candidate is the record's diff, extracted by `bench/m2pp/run.ts`, sha256 `68e9672a…df300`.
- **Same measurement code:** `m2-prime.browser.test.ts` is identical at input and candidate, and differs at base only by `requestDestroy` → `destroy`. `d208-step6.browser.test.ts` is identical at input and candidate.
- **Before the harness commit, not rounds:** shape-only smoke runs, whose figures were not read, and one scratch probe of the injected array alone. That probe read 4.24 B per slot at n=100, with single readings of −85.04 and −0.52 B among six. V8's flag list in this Chrome build contains `--flush-bytecode`, so D2 ran. Its effect on this workload is unverified.
- **No figure was read before the computation.** Progress output held counts only.

#### Gates

| Gate | Result | Figures |
| --- | --- | --- |
| **V0, continuity** | pass | Floors, base: 3,700.88, 3,277.12, 2,714.04 B. Candidate: 3,625.24, 3,238.80, 2,708.12 B |
| **V1, the instrument sees the margin** | pass | At 100, set P reads regression in all three populations, `k` 11 of 12, `m` 4.24 B. At 1000, reported only: inconclusive in all three, `m` 2.35, 2.88, 3.84 B |
| **V2, no typical difference on one tree** | pass | The median of the six differences is 0.0 B in AB and AC for every population, to the printed precision |

`L` is **2**, of 36 cells: AB sortable round 2 (+17.0 B) and AC mixed round 1 (+252.0 B). So, under §26.4, rule `R` replaces _in every round_ at 100 controllers.

`T`: low figures, base 5 of 72, candidate 9 of 72. Two-sided Fisher p = 0.3997.

#### Retained heap, set G

| Population | Count | `k`/`n` | `p` | `m` | Range of `d` | Tip range | Base range | Literal misses | `R` on `E1` | `R` on `E2` (`k`/`n`, `m`) |
| --- | --: | --: | --: | --: | --: | --: | --: | --: | --- | --- |
| sortable | 100 | 0/12 | 1.0000 | -75.1 | -134.9 to -22.9 | 3565.9 – 3625.8 | 3648.1 – 3700.9 | 0 | no regression | no regression (0/12, -69.0) |
| mixed | 100 | 1/12 | 0.9998 | -38.3 | -177.7 to 94.0 | 3099.4 – 3238.8 | 3144.2 – 3277.1 | 1 | no regression | no regression (1/12, -38.3) |
| free | 100 | 2/12 | 0.9968 | -5.9 | -95.2 to 228.2 | 2618.9 – 2708.1 | 2479.9 – 2714.0 | 2 | no regression | no regression (1/12, -5.9) |
| sortable | 1000 | 1/12 | 0.9998 | -64.7 | -152.9 to 2.5 | 3552.1 – 3639.9 | 3637.4 – 3704.9 | 1 | no regression | no regression (0/12, -58.1) |
| mixed | 1000 | 1/12 | 0.9998 | -33.4 | -102.9 to 22.7 | 3076.9 – 3149.7 | 3127.0 – 3182.0 | 1 | no regression | no regression (1/12, -31.5) |
| free | 1000 | 3/12 | 0.9807 | -5.4 | -45.2 to 48.3 | 2610.5 – 2670.1 | 2621.7 – 2675.4 | 3 | no regression | no regression (2/12, -5.4) |

**Outcome A, by the table in §26.6.** V0–V2 pass, `R` reads no regression in all six rows, `L` ≥ 1, no range lies above the baseline's at 1000, `E2` reads no regression, and `T`'s p ≥ 0.01.

**The literal clause is missed in three further cells at 100,** beside the two recorded earlier: mixed round 2 (3,238.2 against 3,144.2 B), free drag round 2 (2,708.1 against 2,634.2 B), and free drag round 6 (2,708.1 against 2,479.9 B). Each is the candidate's usual figure against a low base figure.

#### Low readings

| Tree, count | Low figures | Low readings | high-`B` | low-`A` | unclassed |
| --- | --: | --: | --: | --: | --: |
| base, 100 | 5 | 12 | 3 | 4 | 5 |
| candidate, 100 | 9 | 23 | 7 | 5 | 11 |
| base, 1000 | 5 | 17 | 2 | 0 | 15 |
| candidate, 1000 | 21 | 62 | 13 | 3 | 46 |

These class the five measured readings of each figure. Warm-ups have no run median to class against, and they stay in the raw file. 3 of the 5,760 readings, warm-ups included, are negative.

| Probe, tree | Low figures of 36 | Floors at 100, against Block 1's | Floors hold |
| --- | --: | --- | --- |
| D1, base | 35 | 3,697.32, 3,273.76, 2,710.68 B | no |
| D1, candidate | 35 | 3,622.68, 3,235.44, 2,704.76 B | no |
| D2, base | 5 | 3,700.88, 3,277.12, 2,714.04 B | yes |
| D2, candidate | 6 | 3,625.24, 3,238.16, 2,708.12 B | yes |

**The cause is unestablished at both trees,** a permitted result, carried as a named limit. No class reaches 80%. Base's rate also predicts 2.5 low figures in 36, under the required 3.

_Analysis:_ D1 lowers every floor by about 2.6 to 3.6 B. So its 35 low figures come from comparing against Block 1's floor, and they say nothing about the low state. D2 leaves the low figures in place, at about Block 1's rate, which does not support bytecode flushing as their cause. Neither is a finding about the mechanism.

**What `R` does not settle:** `R` compares each tree's usual state. The low state stays unexplained at both trees, and it is outside what `R` measures.

#### Allocation

Figures are the sum of library, harness and other bytes per unit, unrounded, candidate minus input.

| Cell | Project | `k`/`n` | `p` | `m` | `r` | Range of `d` | Reads |
| --- | --- | --: | --: | --: | --: | --: | --- |
| sortable sample | shipped | 5/12 | 0.8062 | -0.13 | 1 | -7.2 to 7.0 | no regression |
| free sample bare | shipped | 7/12 | 0.3872 | 0.16 | 3.6 | -4.2 to 0.6 | no regression |
| free sample bounds(element) | shipped | 6/10 | 0.3770 | 0.13 | 4.6 | -0.6 to 5.6 | no regression |
| free sample bounds(thunk) | shipped | 7/12 | 0.3872 | 0.16 | 0.9 | -0.7 to 0.5 | no regression |
| free sample onMove | shipped | 9/11 | 0.0327 | 0.25 | 0.3 | -0.3 to 1.0 | no regression |
| committed move moving | shipped | 6/12 | 0.6128 | -0.06 | 62 | -44.5 to 41.1 | no regression |
| committed move still | shipped | 5/12 | 0.8062 | -0.98 | 10 | -8.8 to 5.3 | no regression |
| free drop | shipped | 4/12 | 0.9270 | -16.48 | 42 | -33.7 to 39.0 | no regression |
| sortable drop | shipped | 7/12 | 0.3872 | 4.32 | 34 | -36.4 to 47.8 | no regression |
| free moveTo | shipped | 9/11 | 0.0327 | 0.61 | 7.7 | -0.5 to 7.4 | no regression |
| sortable sample | DEV | 10/12 | 0.0193 | 0.40 | 0.9 | -4.2 to 3.6 | no regression |
| free sample bare | DEV | 6/11 | 0.5000 | 0.51 | 0.8 | -0.9 to 4.2 | no regression |
| free sample bounds(element) | DEV | 3/12 | 0.9807 | -0.38 | 5.4 | -4.6 to 5.1 | no regression |
| free sample bounds(thunk) | DEV | 3/12 | 0.9807 | -0.15 | 0.2 | -0.9 to 0.4 | no regression |
| free sample onMove | DEV | 7/11 | 0.2744 | 0.10 | 0.2 | -0.9 to 2.7 | no regression |
| committed move moving | DEV | 10/12 | 0.0193 | 34.74 | 59 | -88.0 to 157.1 | no regression |
| committed move still | DEV | 7/12 | 0.3872 | 3.48 | 9 | -8.6 to 11.9 | no regression |
| free drop | DEV | 8/12 | 0.1938 | 3.16 | 15 | -23.8 to 310.6 | no regression |
| sortable drop | DEV | 9/12 | 0.0730 | 27.32 | 39 | -57.5 to 103.0 | no regression |
| free moveTo | DEV | 9/11 | 0.0327 | 1.01 | 1 | -1.1 to 2.6 | **inconclusive** |

**Attribution:** 0 B on `ArmedController`, `channel`, `#arm`, `deliverUnlessApplied`, `reportToSpec` or a frame named `report`, in all 20 windows and all 24 candidate runs.

**Outcome a3,** because one cell is inconclusive and no cell reads regression. By round, `moveTo` in DEV, candidate − input:

| Round | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
| --- | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: |
| `d`, B | 2.550 | 0.950 | 1.326 | −1.056 | tie, 0.028 | 0.370 | 1.186 | 1.010 | 1.872 | 1.794 | −1.016 | 0.774 |

**The outcome turns on precision, and that is the question below.** The committed computation works from raw bytes, as §26.6 states for `E1` and `E2`: 11 untied rounds, `k` 9, `m` 1.010 B, above `r` 1.0 B. §26.7 states `r` at 0.1 B, and calls its tie _the same figure at the reported precision_. The same cell with each arm's figure rounded to 0.1 B first gives `m` 1.0 B, which is within `r`, and every other cell also stays within `r`. That second reading would give a1. **It was computed only after the outcome was known, so it does not govern,** and the candidate was not applied.

`kernel/kernel.ts:(anonymous)` books bytes in the drop windows at both trees, in both directions, and the profile cannot name which anonymous function. The candidate's new arrow in `ArmedController` is anonymous too. §26.7's list does not name it, so this is not counted as a finding, and it is reported as a limit of the attribution.

**Load per allocation round:**

| Round | Load, start – end |
| ----: | ----------------: |
|     1 |       4.09 – 3.47 |
|     2 |       3.47 – 2.75 |
|     3 |       2.75 – 2.43 |
|     4 |       2.43 – 2.87 |
|     5 |       2.87 – 4.76 |
|     6 |       4.76 – 3.50 |
|     7 |       3.50 – 4.52 |
|     8 |       4.52 – 4.79 |
|     9 |       4.79 – 3.47 |
|    10 |       3.47 – 4.04 |
|    11 |       4.04 – 3.60 |
|    12 |       3.60 – 4.09 |

#### Every round, whole bytes per controller

Each cell reads sortable / mixed / free. Unrounded figures and the five readings behind each are in the raw file. Load is the 1-minute average at the round's first start and last end.

**Set G, candidate against base:**

| Round | Load, start – end | Candidate, 100 | Candidate, 1000 | Base, 100 | Base, 1000 |
| --: | --: | --- | --- | --- | --- |
| 1 | 3.60 – 3.95 | 3626 / 3239 / 2708 | 3640 / 3148 / 2670 | 3701 / 3277 / 2714 | 3705 / 3182 / 2675 |
| 2 | 3.96 – 4.06 | 3625 / 3238 / 2708 | 3640 / 3150 / 2670 | 3648 / 3144 / 2634 | 3637 / 3127 / 2635 |
| 3 | 4.06 – 5.09 | 3624 / 3239 / 2706 | 3638 / 3077 / 2670 | 3701 / 3276 / 2713 | 3681 / 3180 / 2675 |
| 4 | 6.33 – 5.82 | 3622 / 3239 / 2707 | 3552 / 3148 / 2670 | 3701 / 3277 / 2714 | 3705 / 3180 / 2675 |
| 5 | 5.47 – 6.11 | 3625 / 3239 / 2707 | 3638 / 3148 / 2670 | 3701 / 3277 / 2714 | 3681 / 3180 / 2658 |
| 6 | 5.70 – 5.37 | 3626 / 3239 / 2708 | 3640 / 3148 / 2670 | 3701 / 3277 / 2480 | 3704 / 3180 / 2675 |
| 7 | 5.16 – 4.84 | 3626 / 3239 / 2708 | 3640 / 3150 / 2670 | 3701 / 3276 / 2713 | 3703 / 3180 / 2675 |
| 8 | 4.95 – 5.36 | 3625 / 3238 / 2707 | 3640 / 3112 / 2670 | 3701 / 3277 / 2714 | 3703 / 3180 / 2675 |
| 9 | 5.37 – 5.18 | 3626 / 3239 / 2708 | 3554 / 3150 / 2670 | 3701 / 3276 / 2713 | 3704 / 3182 / 2675 |
| 10 | 5.66 – 5.62 | 3626 / 3239 / 2708 | 3567 / 3079 / 2670 | 3701 / 3277 / 2714 | 3703 / 3180 / 2675 |
| 11 | 5.33 – 6.06 | 3566 / 3099 / 2619 | 3561 / 3087 / 2610 | 3701 / 3277 / 2714 | 3703 / 3180 / 2656 |
| 12 | 5.43 – 5.07 | 3626 / 3239 / 2708 | 3638 / 3148 / 2670 | 3701 / 3277 / 2714 | 3704 / 3182 / 2622 |

**Set AB, base against itself:**

| Round | Load, start – end | Tip role, 100 | Tip role, 1000 | Base role, 100 | Base role, 1000 |
| --: | --: | --- | --- | --- | --- |
| 1 | 3.95 – 3.96 | 3701 / 3277 / 2714 | 3703 / 3175 / 2675 | 3701 / 3277 / 2714 | 3705 / 3182 / 2675 |
| 2 | 5.09 – 6.33 | 3701 / 3277 / 2714 | 3705 / 3180 / 2675 | 3684 / 3277 / 2713 | 3703 / 3178 / 2655 |
| 3 | 6.11 – 5.70 | 3701 / 3277 / 2714 | 3703 / 3180 / 2675 | 3701 / 3277 / 2714 | 3704 / 3180 / 2675 |
| 4 | 4.84 – 4.95 | 3701 / 3277 / 2714 | 3705 / 3180 / 2675 | 3701 / 3277 / 2714 | 3681 / 3180 / 2675 |
| 5 | 5.18 – 5.66 | 3701 / 3277 / 2713 | 3703 / 3180 / 2675 | 3701 / 3277 / 2714 | 3686 / 2882 / 2675 |
| 6 | 6.06 – 5.43 | 3701 / 3277 / 2714 | 3703 / 3180 / 2675 | 3701 / 3277 / 2714 | 3703 / 3180 / 2675 |

**Set AC, candidate against itself:**

| Round | Load, start – end | Tip role, 100 | Tip role, 1000 | Base role, 100 | Base role, 1000 |
| --: | --: | --- | --- | --- | --- |
| 1 | 4.06 – 4.06 | 3626 / 3239 / 2708 | 3638 / 3114 / 2670 | 3626 / 2987 / 2708 | 3638 / 3148 / 2670 |
| 2 | 5.82 – 5.47 | 3625 / 3238 / 2707 | 3640 / 3150 / 2679 | 3625 / 3238 / 2708 | 3552 / 3148 / 2670 |
| 3 | 5.37 – 5.16 | 3625 / 3238 / 2708 | 3551 / 3087 / 2623 | 3626 / 3239 / 2708 | 3638 / 3071 / 2670 |
| 4 | 5.36 – 5.37 | 3585 / 2980 / 2621 | 3561 / 3087 / 2623 | 3625 / 3239 / 2708 | 3638 / 2777 / 2624 |
| 5 | 5.62 – 5.33 | 3626 / 3239 / 2708 | 3640 / 3150 / 2670 | 3625 / 3238 / 2707 | 3640 / 3148 / 2670 |
| 6 | 5.07 – 4.83 | 3626 / 3239 / 2708 | 3638 / 3148 / 2607 | 3625 / 3239 / 2708 | 3638 / 3148 / 2670 |

**Set P, base with inject mode against base:**

| Round | Load, start – end | Injected, 100 | Injected, 1000 | Base, 100 | Base, 1000 |
| --: | --: | --- | --- | --- | --- |
| 1 | 4.60 – 4.55 | 3705 / 3281 / 2718 | 3707 / 3184 / 2679 | 3701 / 3277 / 2714 | 3703 / 3180 / 2675 |
| 2 | 4.55 – 4.23 | 3574 / 3148 / 2638 | 3641 / 3131 / 2639 | 3701 / 3277 / 2714 | 3703 / 3182 / 2675 |
| 3 | 4.23 – 3.97 | 3705 / 3281 / 2718 | 3708 / 3186 / 2679 | 3701 / 3277 / 2714 | 3703 / 3149 / 2675 |
| 4 | 3.97 – 3.74 | 3705 / 3281 / 2718 | 3707 / 3107 / 2604 | 3701 / 3276 / 2714 | 3705 / 3180 / 2675 |
| 5 | 3.74 – 5.62 | 3705 / 3281 / 2718 | 3691 / 3180 / 2679 | 3701 / 3277 / 2714 | 3703 / 3180 / 2675 |
| 6 | 5.62 – 6.86 | 3705 / 3281 / 2718 | 3707 / 3184 / 2679 | 3701 / 3276 / 2713 | 3702 / 3180 / 2675 |
| 7 | 6.86 – 6.28 | 3705 / 3281 / 2718 | 3689 / 3184 / 2679 | 3701 / 3277 / 2714 | 3704 / 3182 / 2675 |
| 8 | 6.28 – 5.86 | 3705 / 3281 / 2718 | 3708 / 3186 / 2679 | 3701 / 3276 / 2713 | 3703 / 3180 / 2675 |
| 9 | 5.86 – 5.63 | 3705 / 3281 / 2718 | 3707 / 3184 / 2625 | 3701 / 3276 / 2713 | 3705 / 3182 / 2675 |
| 10 | 5.63 – 5.82 | 3705 / 3281 / 2718 | 3641 / 3137 / 2679 | 3684 / 3276 / 2713 | 3705 / 3182 / 2675 |
| 11 | 5.82 – 5.93 | 3705 / 3281 / 2718 | 3707 / 3184 / 2679 | 3701 / 3277 / 2714 | 3705 / 3138 / 2675 |
| 12 | 5.93 – 5.84 | 3705 / 3281 / 2718 | 3707 / 3184 / -819 | 3701 / 3277 / 2462 | 3705 / 3182 / 2675 |

**Set D, the probes:**

| Round | Load, start – end | D1 base, 100 | D1 base, 1000 | D1 candidate, 100 | D1 candidate, 1000 |
| --: | --: | --- | --- | --- | --- |
| 1 | 5.37 – 4.84 | 3697 / 3274 / 2711 | 3704 / 3180 / 2675 | 3618 / 3236 / 2703 | -858 / 3148 / 2670 |
| 2 | 4.84 – 4.54 | 3574 / 3141 / 2631 | 3637 / 3128 / 2635 | 3623 / 3235 / 2703 | 3638 / 3148 / 2669 |
| 3 | 4.54 – 4.95 | 3695 / 3274 / 2711 | 3702 / 3180 / 2675 | 3623 / 3236 / 2705 | 3638 / 3148 / 2669 |
| 4 | 4.95 – 4.57 | 3695 / 3291 / 2711 | 3703 / 3180 / 2675 | 3622 / 3235 / 2705 | 3638 / 3148 / 2669 |
| 5 | 4.57 – 4.14 | 3698 / 3274 / 2711 | 3705 / 3181 / 2675 | 3623 / 3236 / 2705 | 3638 / 3149 / 2669 |
| 6 | 4.14 – 4.45 | 3698 / 3274 / 2711 | 3702 / 3180 / 2675 | 3623 / 3235 / 2705 | 3638 / 3148 / 2669 |
| 7 | 4.45 – 3.83 | 3698 / 3274 / 2711 | 3705 / 3180 / 2675 | 3622 / 3253 / 2705 | 3638 / 3149 / 2670 |
| 8 | 3.83 – 3.64 | 3697 / 3274 / 2711 | 3703 / 3180 / 2675 | 3563 / 3097 / 2634 | 3561 / 2776 / 2623 |
| 9 | 3.64 – 3.41 | 3698 / 3274 / 2711 | 3703 / 3180 / 2675 | 3623 / 3235 / 2705 | 3638 / 3149 / 2670 |
| 10 | 3.41 – 3.16 | 3698 / 3274 / 2711 | 3702 / 3180 / 2675 | 3623 / 3236 / 2706 | 3638 / 3147 / 2670 |
| 11 | 3.16 – 2.96 | 3697 / 3274 / 2711 | 3637 / 3132 / 2635 | 3623 / 3235 / 2705 | 3638 / 3148 / 2669 |
| 12 | 2.96 – 4.09 | 3694 / 3274 / 2711 | 3702 / 3180 / 2675 | 3619 / 3235 / 2705 | 3638 / 3148 / 2670 |

| Round | Load, start – end | D2 base, 100 | D2 base, 1000 | D2 candidate, 100 | D2 candidate, 1000 |
| --: | --: | --- | --- | --- | --- |
| 1 | 5.37 – 4.84 | 3701 / 3277 / 2714 | 3703 / 3180 / 2675 | 3567 / 3100 / 2622 | 3253 / 3087 / 2623 |
| 2 | 4.84 – 4.54 | 3701 / 3277 / 2714 | 3703 / 3180 / 2675 | 3622 / 3189 / 2708 | 3638 / 3148 / 2670 |
| 3 | 4.54 – 4.95 | 3701 / 3277 / 2714 | 3704 / 3182 / 2675 | 3626 / 3239 / 2708 | 3552 / 3075 / 2628 |
| 4 | 4.95 – 4.57 | 3642 / 3144 / 2634 | 3637 / 3127 / 2635 | 3626 / 3239 / 2708 | 3638 / 3148 / 2670 |
| 5 | 4.57 – 4.14 | 3701 / 3275 / 2714 | 3705 / 3182 / 2675 | 3625 / 3189 / 2707 | 3552 / 3163 / 2670 |
| 6 | 4.14 – 4.45 | 3701 / 3276 / 2713 | 3703 / 3182 / 2675 | 3626 / 3239 / 2708 | 3640 / 2768 / 2670 |
| 7 | 4.45 – 3.83 | 3701 / 3277 / 2714 | 3703 / 3180 / 2675 | 3625 / 3239 / 2708 | 3552 / 3088 / 2669 |
| 8 | 3.83 – 3.64 | 3701 / 3277 / 2714 | 3703 / 3180 / 2675 | 3625 / 3238 / 2707 | 3638 / 3111 / 2670 |
| 9 | 3.64 – 3.41 | 3701 / 3277 / 2714 | 3703 / 3180 / 2675 | 3625 / 3238 / 2707 | 3638 / 3148 / 2670 |
| 10 | 3.41 – 3.16 | 3701 / 3277 / 2714 | 3704 / 3140 / 2675 | 3625 / 3238 / 2708 | 3587 / 3148 / 2670 |
| 11 | 3.16 – 2.96 | 3701 / 3277 / 2462 | 3703 / 3182 / 2675 | 3625 / 3239 / 2708 | 3638 / 3148 / 2670 |
| 12 | 2.96 – 4.09 | 3701 / 3277 / 2714 | 3703 / 3180 / 2675 | 3625 / 3238 / 2707 | 3640 / 3149 / 2670 |

#### Reported beside these, not pooled

The resumed 6R's four governing rounds and four logged rounds stay as recorded above. Their two literal cells stay missed under the clause as written.

#### Escalation, for the architect

**Outcome: retained heap A, allocation a3. No source is committed.**

**The unresolved question:** does §26.7's `m ≤ r` compare at the unrounded figure, or at the 0.1 B precision `r` is stated in? On the first reading, `moveTo` in DEV is inconclusive by 0.01 B and 6R stays open. On the second, the outcome is a1, and the candidate lands byte for byte under §26.8. The computation committed before the first round used the first, so this is not for the implementer to re-read.

Two more things for that decision:

- `k` from 7 to 9 cannot reach _no regression_ with 12 untied rounds. The median of 12 with at least 7 positive differences is positive, so §26.6's _k ≤ 9 with `m` ≤ 0_ holds in practice only up to about `k` = 6. No retained row is near that limit. Set G's largest `k` is 3.
- `moveTo`'s median is near 1 B in DEV, and shipped reads `m` 0.61 B. Those windows run no function the diff changes, as far as the code reads, and the attribution is clean. That does not explain a small positive median, and `k` 9 of 11 sits in both projects.

**Carried, not re-measured, within §26.8's scope:** R33, R21 with its one re-pin, M1 to M3, the call counts, the declarations, composition and the attribution row. They remain the record's readings, because the candidate's diff did not change.

#### Verification

- **Rule:** `tests/perf/m2pp-rule.node.test.ts` pinned the rule and schedule on made-up data before the harness commit.
- **Independent recomputation:** a separate script recomputed the `moveTo` DEV row and `k` and `m` for G at 100 from the raw file, and agrees.
- **Harness commit's checks:** format and lint are clean on its files. `just typecheck` reports two errors, both in `.scripts/` files this unit did not touch. `references` and `entry` node tests pass.
- **This record:** Markdown only, plus the two data files. `git diff --check` is clean.

#### Limits

- **Chromium only,** one machine, under lower load than step 6.
- **The rule's thresholds were chosen after seeing earlier rounds,** as §26.9 states.
- **At 1000 controllers** the row bounds gross growth only.
- **The candidate's tree was never in the main checkout.** Its worktrees were removed after the runs.

#### Next

Stop at escalation. The architect decides the precision question, and with it whether 6R proceeds under §26.8 or goes on to the owner. Step 5, control re-declaration, `F-442`, `F-443` and `d208-requests.md` have not started.

### Landed 2026-11-04 (record §28.4): the shared-refusal candidate at src tree `c0713204a`

**Outcome:** _retained heap A; allocation a3; no regression demonstrated and none excluded; the remaining uncertainty accepted by the owner, 2026-11-04._ The owner's disposition, its scope and the questions it leaves unanswered are in [record §28](../reviews/architecture/request-application-claude.md), §28.1 above all. **This unit ran no measurement rounds** and built no harness.

**Input:** `85e659cca` on `drag2/fin-review2`, with `src/` at tree `4630579d2`.

**Objects checked.** The diff in §The candidate's whole diff, extracted from this file, applies from the repository root. These objects equal §28.3's after the diff, again after `fmt`, `lint-fix` and `fmt`, and again after the suite:

| Path under `packages/drag2/` | Object |
| --- | --- |
| `src/` | tree `c0713204a55b24ffc44f9ac0a92d80efa28c7aeb` |
| `src/kernel/kernel.ts` | blob `f370952e1ef2e73de585a8ced10224621672cc4b` |
| `src/kernel/seams.ts` | blob `8b8910f98b67ff11a629a9a54d0ad0f382b006b5` |
| `src/kernel/spec.ts` | blob `a5d737331cc0e6d41bc77c5397f8fdfb713343c5` |
| `tests/kernel/capture.node.test.ts` | blob `0f748723f3f3582b516e3a8d87055d9d4d501fd2` |
| `.plan/contract/05-lifecycle-invariants.md` | blob `9a3dc5f23469327967f3a7da48c77ea74b832ae3` |

**Finalizing.** `fmt` and `lint-fix` changed no byte of the five files. The residue is what §28.4 expects:

- **`lint`:** four errors in `kernel/seams.ts`, at lines 478 and 522 (`only-throw-error`) and 539 and 555 (`no-unnecessary-condition`). The diff changes only lines 147 and 148 of that file. The linters do not read the contract's Markdown.
- **`typecheck`:** two errors, in `.scripts/vitest-config.ts` and `.scripts/vitest-one-shot.ts`.

**The whole suite, run once, every project:** 1,419 pass, 10 fail, 68 skipped, of 1,497; 74 of 78 files pass. The 34 passes above the candidate's recorded 1,385 are `m2pp-rule.node`'s rows. No other failure occurred.

- **`size.node`, the six declared controls:** _baseline B - shipped @ydinjs/drag sortable.js_, _free drag + bounds_, _free drag + landing_, _free drag complete_, _free drag minimal_ and _kernel root - kernel.js_.
- **`docs.node`, four rows:** _should resolve every reference a public type makes_, and the closure rows for the kernel, ordinary and free-drag tiers.
- **Not loaded:** `tests/sortable/react.browser.test.ts` and `tests/sortable/stories.browser.test.ts`, both on incompatible `react` and `react-dom` versions.
- **R33 and `capture.node`:** `tests/diagnostic-intake.browser.test.ts`, `tests/kernel/kernel.browser.test.ts` and `tests/kernel/capture.node.test.ts` report no failure.

**Limits.** This run checks that these rows pass and nothing about allocation or retained heap. The mutations, the call-count row and the reading of the diff belong to §28.5 and were not run or done here.

**Next.** The freeze holds at `c0713204a`. The next role is the independent recheck under §28.5. Step 5, control re-declaration and `d208-requests.md` have not started.

## The final tree, 2026-11-04 (record §29.6 steps 1 and 2): the comment-only commit, and composition unchanged

**Input:** `6a1f28f2c` on `drag2/fin-review2`, with `src/` at tree `c0713204a`. **Comment commit:** `65649c6d0`. **The new frozen `src/` tree is `c6c5e6ea59697efa8f27beae2700a574e6f3df4c`** (record §29.4). No retained-heap, allocation or timing round ran.

### Step 1: the seven comment sites

The commit changes the sites of record §29.3 and no other sentence: `free-drag/spec.ts` twice, `sortable/spec.ts`, `kernel/kernel.ts`, `kernel/unwind.ts` twice and `kernel/spec.ts`. In `free-drag/spec.ts` and `kernel/kernel.ts` the following lines of the same paragraph are rewrapped.

| Check | Result |
| --- | --- |
| Every changed line is a comment | Holds: no added or removed line of the diff falls outside a comment |
| Each changed file, transpiled with comments removed, equals its version at `c0713204a` | Holds for all five, with `ts.transpileModule` and `removeComments` on both sides, compared as strings |
| `just build`'s declarations differ only in `kernel/spec.d.ts`, only in that doc comment | Holds. 32 of 33 files are byte-identical. The one difference is _each call allocates one closure_, now _one function_ |
| The new `src/` tree hash | `c6c5e6ea59697efa8f27beae2700a574e6f3df4c` |

**Finalizing.** The lint residue over the five files is two `consistent-return` errors on `prepareSettlement`, at `free-drag/spec.ts:697` and `sortable/spec.ts:1286`, on lines the commit does not touch. `just typecheck` reports the same two `.scripts/` errors.

**Reported and left, as §29.3 directs. This is not a census:**

- `kernel/unwind.ts:33`, _the channel's identity_, in a guard now built over one notifier;
- `sortable/spec.ts:1685`, _the sink every channel delivers to_, where the kernel's own route delivers there too.

Each sits beside a listed site and was not required by a listed sentence. Changing either is a further source change, so it goes to the architect first (§29.4).

### Step 2: composition

`measureAll()` at `65649c6d0`, in a detached worktree after `npm ci`, with `vite-traits-plugin`, `box-quad`, `drag` and `drag2` rebuilt there. `just size` in the main checkout reports the same six control figures.

**Every row equals §Costs' Composition table, in minified, Brotli and modules.** Ceilings are step 1's, and none moved. Bytes.

| Row | Minified | Brotli | Modules | Ceiling | Slack |
| --- | --: | --: | --: | --: | --: |
| minimal | 33,419 | 10,221 | 33 | 10,351 | 130 |
| minimal (xy) | 32,776 | 10,117 | 32 | 10,244 | 127 |
| minimal + layoutAnimation | 34,335 | 10,558 | 34 | 10,683 | 125 |
| xy + layoutAnimation | 33,692 | 10,435 | 33 | 10,563 | 128 |
| minimal + landing | 33,812 | 10,393 | 35 | 10,536 | 143 |
| complete | 34,728 | 10,722 | 36 | 10,838 | 116 |
| free drag minimal | 27,063 | 8,281 | 27 | 8,412 | 131 |
| free drag + bounds | 27,707 | 8,514 | 28 | 8,645 | 131 |
| free drag + landing | 27,456 | 8,449 | 29 | 8,587 | 138 |
| free drag complete | 28,100 | 8,652 | 30 | 8,778 | 126 |
| both behaviors | 42,268 | 12,235 | 47 | 12,359 | 124 |
| vocabulary root - drag.js | 252 | 142 | 2 | 205 | 63 |
| kernel root - kernel.js | 20,033 | 6,340 | 16 | 6,470 | 130 |
| baseline A - feature-matched, non-composed | 34,019 | 10,525 | 31 | 10,658 | 133 |
| baseline B - shipped @ydinjs/drag sortable.js | 22,618 | 6,916 | 26 | 7,040 | 124 |

**Every row is under its ceiling.** `drag.js` stays at 142 and baseline B reads 6,916, and neither moved at this commit or at 6R.

**M-1 carries, as record §29.1 states:** the comment-stripped diff changes no code in a per-sample function, and the per-sample counts are identical. Step 3's _no regression_ stands for this tree, and its protocol does not rerun. The comment commit changes no code that runs, so M-2″'s readings and the owner's acceptance carry across it (§29.4): _retained heap A; allocation a3; no regression demonstrated and none excluded; the remaining uncertainty accepted by the owner, 2026-11-04._