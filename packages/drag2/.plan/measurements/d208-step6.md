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