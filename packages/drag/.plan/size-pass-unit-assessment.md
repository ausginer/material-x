# Size pass unit: assessment

**Read:** [`size-pass-unit-report.md`](size-pass-unit-report.md) at `ed4bd589f` on `drag/size`, and the unit's code commits `15e9d1ef2`, `312f4ec32` and `237d65d2f`. **Governing records:** [`size-pass-unit-handoff.md`](size-pass-unit-handoff.md), and `DRD-51`, `DRD-52` and `DRD-53` in [`00-index.md`](00-index.md). Assessed by the architect on 2026-11-12.

**Outcome: accepted.** Every required property of the handoff holds, and no return condition was met. The size readings equal the architect's joint reading on every row. The allocation reading stands against its limits, and the timing reading holds. Neither reading shows that the unit costs nothing (§2). The report raises two findings, and the assessment adds two:

- the lint error on `FreeDragBehavior.invalidate`, which the decided `DRF-14` change caused. **A repair is chosen** (§3);
- the per-sample probe's blind second launch, which the probe's documentation allowed. **The documentation is corrected in the next unit** (§4);
- **the hold record is wrong for its first 14 seconds:** four of the implementing session's background tasks ran until 12:34:59, four seconds into the moves process (§2.2);
- the cause of those tasks: **the self-matching waiter recurred.** `performance-plan.md` §3 now separates the campaign runner from the deferred campaigns (§5).

## 1. What the architect checked

| Check | Result |
| --- | --- |
| `git diff --stat 1d304128b ed4bd589f -- packages/drag` without `measurements/` | The 13 files of the handoff's §Boundaries, the report, and nothing else |
| The source diff `b86f61133..237d65d2f` | Read in full. The shipped arithmetic, the report loop and the check's message are P5's. The comments added beyond the patch are accurate |
| Size: `delta.ts.txt` over the unit's `base-size.json` and `commit3-size.json` | Equal to the report's table on every row and column |
| Allocation: the means and differences, recomputed from the raw lines | Equal to the report's table. The spreads are in §2.1 |
| The witness, M1, the suites and the check's throw sites | The raw records show what the report states: the witness passes at the unit and at the base's source, it fails in three engines under M1, and the check throws three times, all in the witness |
| The lint error | Reproduced from the record, and the rule is `class-methods-use-this` at `.oxlintrc.json`'s error level |
| The implementing session's tool calls between 12:10 and 12:35 | Read from its transcript. Four background tasks ran until 12:34:59 (§2.2) |

## 2. The uncertainty the readings keep

### 2.1 Allocation

Chromium, the `shipped` project, heap sampling at 16 B. Three runs per tree. Heap sampling attributes sampled allocations to functions, so a function's figure is an estimate, and the attribution doesn't name a cause.

| Reading | Unit − base, mean | Pairwise range | Within one tree | Limit |
| --- | --: | --- | --- | --: |
| Per sample, `y()` | +0.80 B | −1.56 to +3.10 B | up to 2.4 B | 4 B |
| Per sample, `xy()`, launched alone | +0.55 B | −1.84 to +2.98 B | up to 3.1 B | 4 B |
| Per committed move, warm (2,000 crossings) | +0.84 B | −1.08 to +3.12 B | up to 3.1 B | 7 B |
| Per committed move, cold (100 crossings) | +4.13 B | +0.88 to +7.10 B | up to 4.9 B | reported |

- **"Stands" is a bound, not a measurement of zero.** The warm difference is smaller than the run-to-run spread inside either tree. The readings show that the warm excess is below 7 B, and they don't resolve an excess of about 1 B in either direction.
- **The cold excess is consistent.** Every unit run reads above every base run. In this probe, before the code is optimized, the unit allocates about 4 B more per committed move. A drag that commits fewer moves than the probe's warm-up sees the cold figure, not the warm one. Both figures are below 7 B.
- **Warm, the committed-move code allocates nothing that the probe sees,** at either tree. The only warm allocation in the two files is `linear-shift.ts:refresh`, which runs every frame, and one 72 B sample elsewhere in three of the six runs.
- **`xy()` per sample was read in launches of its own.** In a launch that ran `y()` first, every `xy()` line read 0 B at both trees. The cause isn't established (§4).

### 2.2 Timing

All ten selected rows read "no difference shown" in script and task time, and every layout count equals the base's.

- **This isn't evidence of no difference.** A slowdown smaller than a row's A/A bound can't read "slower" (`DRD-40` property 2). The bounds are 8 to 325 µs of script and 51 to 3,305 µs of task time. Six of the ten script medians are positive, the largest 112 µs, and the largest task median is +458 µs, on the 20-item landing cycle row, inside its 1,095 µs bound.
- **The hold record is wrong for its first 14 seconds.** It states that nothing else from the implementing session ran between the hold and the release. Four background tasks from that session started between 12:11 and 12:22 and ran until 12:34:59: three shell loops that ran `pgrep -f alloc.sh` every 5 seconds, and a `tail -f` piped to `grep` that watched the allocation output. The hold began at 12:34:45 and the moves process at 12:34:55, so they overlapped its first four seconds. The console has no timestamps, so whether that overlap reached round 1's measured section isn't known.
- **The verdict stands, with that overlap recorded.** The loops were idle between polls, and the overlap is four seconds of a 14-minute process. A repeat would read the same rows against the same bounds, so it couldn't show a slowdown smaller than them either. The raw hold record stays as written, and the report carries a correction that points here.

## 3. The state-free `invalidate` step

**The finding.** `DRD-51` §First unit item 2 made `FreeDragBehavior.invalidate` call only `operation?.handleEvent()`. The arrow property then reads no `this`, and `class-methods-use-this` reports it. The handoff forbids resolving a lint error by hand, so the unit left it.

**The repair: the step is a function of `free-drag/behavior.ts`'s module, not a member of the behavior.** `free-drag.ts`'s controller requests that function. Four placements were measured against `ed4bd589f` ([readings](measurements/2026-11-12-invalidate-step-readings.txt), [patches](probes/size-pass/patches/)):

| Variant | freeDrag | freeDrag + bounds + landing | Lint |
| --- | --- | --- | --- |
| **R1: a function exported from `free-drag/behavior.ts`** | −13/−7/**−1** | −13/−5/**−5** | clean |
| R1a: a function in `free-drag.ts` | −17/−5/−3 | −17/−4/**+1** | clean |
| R1b: an arrow in `free-drag.ts` | −18/−4/−3 | −18/−3/**+3** | clean |
| R1d: a `static` member | +1/+2/+4 | +1/+2/+3 | `no-invalid-void-type` on `this: void` |

Minified/gzip-9/Brotli-11 bytes. The eight other rows read 0/0/0 under every variant.

**Why R1:**

- **It is the only variant whose figures don't disagree in sign** on both rows. It takes 1 and 5 B Brotli off them. R1a and R1b take more minified bytes off, and Brotli adds 1 to 3 B to "freeDrag + bounds + landing".
- **It moves nothing across modules.** The step stays in the module that owned it, next to the operation type it calls, and `free-drag.ts` adds one named import. `free-drag/behavior.js` isn't in the package's exports map, so the export isn't public.
- **It removes a closure per controller.** The arrow property was created in every `FreeDragBehavior`. The module function is created once. No per-sample, per-frame, drop or activation path changes, so by `DRD-51` property 4 no `compare.ts` row runs.
- **Coalescing is unchanged.** A step coalesces with the same step and receiver in its own controller's list (`Gesture`'s `#steps`). The function is now shared by every controller, and each controller still has its own list, so two calls on one controller before the step runs still run it once.
- **R1d is rejected.** A static member is a property the minifier keeps at full length, and its `this` typing needs a lint exception.
- **An inline arrow per call is rejected without measuring.** A new function per call never coalesces, and it allocates on every `invalidate()`. `moveTo` does that on purpose, because each call carries its point.

`sortable`'s `invalidate` step reads the behavior's `#pull`, so it stays a member.

**Checked in the architect's scratch worktree of `ed4bd589f`:** with R1, `tsc --noEmit` reports no error, oxlint and ESLint report none on the two files, and `tests/free-drag.browser.test.ts` passes 10 of 10 in Chromium. With the step's body emptied (M2), "should re-read bounds on invalidate" fails: "expected 300 to be close to 200". The handoff makes that test the witness.

## 4. The probe's launch documentation

**The finding.** The probe README says to run each probe "alone with `-t '<name>'`", and `alloc-probe.test.ts.txt`'s header names `-t 'C6 probe'`. That pattern selects both `C6 probe y:` and `C6 probe xy:`, which then run in one page. In that launch every `xy()` line read `perMove=0.00 keys={}` at both trees. Launched alone, `xy()` reads about 50 B per sample, as the proposal read it. The architect's own readings for the proposal were launched one axis at a time, and the README didn't say so.

**What the documentation must state** (the next unit, item 3 of its handoff):

- each launch selects exactly one probe test, by a pattern that matches only that test;
- a line that reads 0 B with no function under `sortable/` isn't a reading, and its launch is discarded and repeated alone;
- the warm move probe, which `DRD-52` property 9's result uses, is a file of its own, as the unit ran it;
- a sequence of launches runs through `bench/campaign.ts run` (§5).

**Not required:** finding why the second probe in one page reads an empty profile. The documented launch avoids it, and no decision depends on it.

## 5. The campaign runner and the deferred campaigns

**What recurred.** To wait for a background script, the implementing session ran `until ! pgrep -f alloc.sh; do sleep 5; done`. The waiting shell's own command line contains `alloc.sh`, so `pgrep -f` always finds at least that shell, and the loop never ends. Three such loops ran until the session stopped them at 12:34:59. The same pattern occurred on 2026-11-10, when a session waited for B1's `compare.ts` process with `while pgrep -f "performance-b1.json"` before starting B2 and B3.

**Why it happened here.** The handoff said not to run "a campaign" (`DRD-51` property 3). `bench/campaign.ts` is called a campaign runner, so the word reads as covering it. It doesn't: the deferred campaigns are named measurement work, and the runner only orders processes.

**The rule now, in [`performance-plan.md`](performance-plan.md) §3 and `DRD-51` property 3:**

- **The deferred measurement campaigns stay stopped:** the page check, B3', the in-page floors, `--prove` and `--floors`. A decision restarts each one.
- **`bench/campaign.ts` isn't one of them.** It is the tool for sequencing the runs a unit's handoff asks for: allocation probes, the `compare.ts` runs it names, and suites. It does no work while a step runs, so it may run during a hold.
- **A unit waits for a process through the process itself:** the runner, a foreground command, or the harness's notice that a background command exited. It doesn't wait by searching the process table for a pattern that its own command line contains.

## 6. What follows

- **Recorded:** the results under `DRD-51`, `DRD-52` and `DRD-53`, the disposition in `00-index.md`, `DRD-51`'s two amendments, and P4's state in `performance-plan.md`.
- **Handed off:** [`size-pass-followup-handoff.md`](size-pass-followup-handoff.md), one implementer unit with R1 and the probe documentation.
- **The owner's:** `DRO-14` items 3 and 4, and `DRO-4`'s re-base. Six size rows are over their ceilings. Budgets are unchanged.
- **Next for the architect:** the property-mangling exploration, which is analysis and changes no source.