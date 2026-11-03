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