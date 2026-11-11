# Performance resolution: assessment

**Read by:** the architect, on `drag/performance-resolution` at `39c8b432c`, with a clean tree, in the worktree `.claude/worktrees/drag-performance-resolution`. **Input:** [`performance-resolution-report.md`](performance-resolution-report.md), and the commits `a600abc51`, `a7b3851c1` and `39c8b432c`. **Governing records:** [`performance-resolution-handoff.md`](performance-resolution-handoff.md), [`performance-plan.md`](performance-plan.md) §2 P1b, and `DRD-40`, `DRD-42`, `DRD-43`, `DRD-23`'s last bullet and `DRO-4` in [`00-index.md`](00-index.md).

**Outcome:**

- **Item 1 is complete.** `DRD-42` conforms at `a600abc51`. Its sensitivity is shown under its own warm pass (§3). The allocation evidence stands as recorded, and nothing in it is run again.
- **Item 2 is implemented, and its gate isn't shown.** The in-page rows run, every cycle ends, and their layout counts equal their CDP mirrors'. Neither gate injection flags, and neither row has a floor in F1 or F2. The readings don't show whether the cause is the machine or the method (§4). The cause they suggest is the machine: this campaign ran at a one-minute load of 4.0 to 9.5, on a CPU with 4 fast hardware threads. Every earlier timing run ran at a load of 3.8 or less, and the CDP move row was 4 to 7 times noisier in this campaign than in B1 to B3.
- **`DRD-44` decides the next step:** one experiment that separates placement and contention from the method, in four processes. It doesn't repeat F1, F2, `--prove` or B3', and it changes no instrument. [`performance-sensitivity-handoff.md`](performance-sensitivity-handoff.md) is that unit.
- **Item 3 attributes the retained excess to one snapshot class and bounds its growth, and leaves its source open** (§5). `DRO-4` has the reading for the owner.
- No raw reading, threshold, rule, scenario, row, injection or budget changes in this assessment.

## 1. Checks made in this pass

| Check | Result |
| --- | --- |
| `git diff --stat a9c323f6a..39c8b432c -- src` | Empty |
| `git diff --stat a9c323f6a..39c8b432c -- tests` | `hot-path.browser.test.ts`, and `campaign.node.test.ts` from `2e3697845` (§2) |
| `git diff --stat a7b3851c1..39c8b432c -- bench src tests` | Empty, so F1, F2, item 3 and `--prove` ran at the unit's last code |
| `CHROME_EXECUTABLE=/nonexistent/chrome node bench/compare.ts --prove --dry`, and the same with `--floors --dry` | 9 applied, the step-list entry quiet, exit 0. 14 applied, exit 0. So all 23 entries apply at this branch's source |
| The core classes, from `/sys/devices/cpu_core/cpus`, `/sys/devices/cpu_atom/cpus` and `cpuinfo_max_freq` | CPUs 0 to 3 are P-core threads, 4.7 GHz, two cores with two threads each. CPUs 4 to 11 are E-cores, 3.5 GHz, one thread each. Model: 12th Gen Intel Core i7-1255U |
| One-minute load at the head and foot of every timing run in `measurements/` | Read from each raw file (§2, §4) |
| Per-round script of every timing row in `--prove`, F1, F2, B1, B2 and B3 | Recomputed by a scratch script from the JSON (§4) |
| The campaign's [status file](measurements/2026-11-11-resolution-campaign-status.json) | Read: every step's revision is `a7b3851c1` with `dirty: true` (§2) |

**Not repeated:** every browser run. The readings are the report's.

## 2. Status corrections

These correct the report or the earlier handoff. None changes a reading or a verdict.

| Where | Correction | Evidence |
| --- | --- | --- |
| Report §Environment, load average | **The one-minute load for F1, F2, item 3 and `--prove` was 4.9 to 9.0, not 5.6 to 9.9.** 9.88 is `--prove`'s five-minute figure at its foot. Over the campaign the one-minute range is 4.0 to 9.5, which is the item 1 range. The scale probe ran at 7.1 to 7.8 | The `# before` and `# after` lines of [`f1`](measurements/2026-11-11-resolution-f1.txt), [`f2`](measurements/2026-11-11-resolution-f2.txt), [`attribute`](measurements/2026-11-11-resolution-attribute.txt) and [`prove`](measurements/2026-11-11-resolution-prove.txt) |
| Report §Environment, CPUs | **"12" omits the core classes:** 4 P-core threads and 8 E-cores. With a load of 4 or more, the P-core threads can't all be free for the page. That is material to every timing reading (§4) | §1 |
| Report §Environment | **Every campaign step recorded `dirty: true`, and the report doesn't say why.** The runner calls `git status --porcelain`, which counts untracked files. The report's commit adds the pre-check JSON that ran before the campaign, so an untracked file existed from the first step. This is consistent with an untracked file and not with a tracked change, but it isn't recorded, so it is inferred. The `src` and `tests` claims rest on the driver's `git diff --quiet` after each mutation run and on the commit diffs in §1 | Status file; `git show --stat 39c8b432c` |
| Handoff §Verification, `tests` | **The handoff's "only `tests/hot-path.browser.test.ts`" was wrong at its base.** The campaign runner and its test came after the handoff, at `2e3697845`. The unit changed only `hot-path.browser.test.ts`, which is what the row was meant to require | Report §Checks; §1 |
| Handoff item 3, "with control" | **The handoff asked for an arm that `--attribute` doesn't build.** It builds drag2, the prototype and production. No control is needed for this figure: the retained row's A/A bound was 0 B in every recorded run, and the scale probe's two repeats are identical | Report §Item 3 |
| `DRD-42`, §What it withdraws | **The second withdrawal doesn't apply to M4's form at Chrome 157.** M4's object isn't stored, and it shows under `kernel/session.ts:#move` at 27.16 to 28.75 B per move, failing in 3 of 3 runs. So the warm test catches that allocation in this context. Whether the warm code is at V8's top tier isn't observed | Report §Item 1 |

**Accepted without a finding:**

- **The setup-check M4 run** is excluded from the counts and kept with its reason.
- **The discarded pre-check and scale-probe attempt** are kept with their reasons. The pre-check is one round at an unrecorded load, so it isn't a reading. §4 cites it only as what the rows read once.
- **U-A's maximum of 2.47 B per move,** against 1.31 in the earlier D run. The figure is still a sixth of the limit, and one 64 B sample is 0.21 B per move.

## 3. Item 1: `DRD-42` conforms

| Property | Evidence | Met |
| --- | --- | --- |
| 1, the warm pass | The same 300-move loop, unsampled, then `await frames()`. Nothing else in the test changes | Yes |
| 2, limits unchanged | `< 16`, 64 B, 300 sampled moves, location selection and the lift assertion | Yes |
| 3, the comment | It states the warm figure and an escaping allocation at tens of bytes | Yes |
| 4, sensitivity under the warm pass | M1, M2 and M3 fail in 24 of 24 runs. Alone: 43.71 to 49.88, 80.69 to 87.99, and 27.63 to 30.80. In the file: 64.53 to 70.31, 80.48 to 84.64, and 47.67 to 51.53. M3, the smallest required object, is at least 1.7 times the limit | Yes |
| 5, passes alone | U-A passes 10 of 10 at 0 to 2.47, and U-B passes 5 of 5 at 0 to 1.03 | Yes |

The Chromium suite fails only on the six size rows, as at `a9c323f6a`. **The allocation evidence is complete for this unit.** Its readings stay as the per-sample test's record, and the next unit runs none of them again.

## 4. Item 2 and the return: what the readings show

### 4.1 What holds

- **The same path (`DRD-43` property 3, first half).** In `--prove`'s A/A pass, production's median layouts are 83, 83 and 250 on the in-page rows, equal to their CDP mirrors in the same run. Every in-page cycle ended.
- **The harness's share (property 5).** The driver-alone row reads 5 to 7 µs of script per move, with an A/A bound of 1 µs. In-page, at 20 items, the driver is about 5 % of production's 119 µs.
- **The in-page rows take out most of the CDP overhead.** In the same pass, production read 119 µs per move in the page against 178 µs through CDP at 20 items, 152 against 182 at 2,000 items, and 1,582 against 2,224 µs per cycle.

### 4.2 What fails

**Property 3's gate:** the 30 µs injection measured 26 µs against an A/A bound of 83 µs, and the 300 µs injection measured 502 µs against 622 µs. Both had the sign in 6 or 7 of 7 rounds. So the sign test passed and the bound failed.

**Property 6, my reading of "no floor in both runs":** that isn't a stable floor. Property 6 defines a floor as the smallest entry that flags. With no entry flagging, each run shows only that the floor is above the largest entry, 30 µs per move and 300 µs per cycle nominal. An unmeasured floor can't be stable. Both rows are also far from property 7's figure. At 20 items the library's share is about 119 − 6 = 113 µs per move, so the floor must be about 11 µs. The cycle row needs about 158 µs.

### 4.3 Machine or method: what the recorded readings already say

**The noise moved with the machine, on every row.** Script A/A bound of the CDP row "300 moves, one frame each, 20 items", by run:

| Run | One-minute load, head and foot | A/A bound, µs per move | Bound ÷ production's median |
| --- | --- | --: | --: |
| 2026-11-10 `--prove` | 1.9 and 1.0 | 36 | about 0.2 |
| B1 | 3.7 and 2.6 | 20 | 0.12 |
| B2 | 2.8 and 2.7 | 22 | 0.13 |
| B3 | 2.7 and 2.4 | 35 | 0.21 |
| 2026-11-11 `--prove` | 5.6 and 8.3 | 143 | 0.81 |

- **In the same `--prove` pass, the in-page rows were no noisier than their CDP mirrors.** Bound ÷ median: 0.63, 0.79 and 0.93 in the page, against 0.81, 0.51 and 0.81 through CDP. So the readings don't show that the in-page method adds noise. Their only reading at the earlier machine state is the discarded pre-check, with A/A differences of 11 µs per move and 23 µs per cycle in one round.
- **One round was disturbed across the whole machine.** In round 6 of the A/A pass, every arm read above 1.1 times its row's base median on 13 of the 15 timing rows. In rounds 1 to 5, no row did. The rows run in sequence within a round, so round 6 spans several minutes. Only a cause outside the page can raise every row and every arm together.
- **But that round doesn't set the gates' bounds.** The 30 µs gate's bound of 83 µs comes from round 3: control read 227 µs and production 144 µs, a few seconds apart in the same round. The base arm's seven readings were 93 to 135 µs. That variation is between pages, on a scale of seconds. No recorded figure tells contention apart from the method there, because a reading has no time stamp and no record of where the page's thread ran.

**The candidate mechanism is placement.** This is inferred, not observed. The renderer's main thread runs where the scheduler puts it. With a load of 4 or more, the four P-core threads are often taken, so a 5-second window can run partly on an E-core, about half as fast per thread, or wait in a run queue. That would give a reading-to-reading spread that grows with the load, falls on every row, and doesn't show in the driver-alone row, whose script is a few µs. It is consistent with the record, and nothing in the record tests it.

**What a method limit would look like.** Each arm gets a new page, so each reading includes its own JIT warm-up and garbage collection, and `judge`'s bound is the largest of seven A/A differences. Both could give the same spread with no contention. `DRD-43` deferred the remedies for them (events per reading, the bound) until the readings decide.

### 4.4 Decision: `DRD-44`

**One experiment, before any change to the method, `judge` or the launch, and before any repeat of F1, F2, `--prove` or B3'.** It runs the two gate injections on their in-page rows and the CDP move row's A/A, unchanged, in four processes: two unpinned, as every run so far, and two pinned to the E-cores, alternating. Each reading records its run-queue wait, which core class its thread ran on, and a speed gauge measured before and after its window. The rules that read the results are fixed in `DRD-44` before the run.

**Why this one:**

- **It separates the explanations on one set of readings.** Pinning removes placement and keeps the method. The run-queue record measures contention inside each reading. The CDP row shows whether the run was as quiet as B1 to B3. A gate that fails in a process whose readings are settled is a method limit. A gate that flags whenever its readings are settled and fails only when they aren't is a machine limit.
- **A repeat at lower load would not decide it.** The load isn't under this project's control, so a repeat would be the same campaign at a different load. If it passed, it would show the load mattered, but not through which mechanism, or what launch condition keeps it out. If it failed, it would not show why.
- **It is bounded.** Six rows per process run for about 10 minutes, so the experiment takes about 40 minutes, in one campaign. It changes no tracked file under `bench/`, `src/` or `tests/`.

**Rejected:** `DRD-44` §Rejected.

## 5. Item 3: the retained excess

### 5.1 What the attribution establishes

- **The excess is in one class of the heap snapshot.** Production's growth of `array `, the internal arrays with an empty name, is +4,064 B against both before arms. Against drag2 that is 4,064 of the 4,076 B the row flags, and every other constructor's difference is between −144 and +384 B. Against the prototype `array `'s +4,064 is more than the flagged 3,396 B. `array (object properties)`'s −704 B accounts for most of the difference.
- **The figure is deterministic.** Both repeats of the scale probe are identical, and the retained row has had the same figure in every round of every recorded run.
- **It starts equal.** At 0 operations, `array ` is 35,068 to 35,196 B in all three arms.
- **It grows with operations up to 200, and not from 200 to 400.** Production's `array ` grows by 540, 512, 1,024 and 2,048 B over the steps to 25, 50, 100 and 200 operations. That is 20.5 B per operation from 50 to 200, and 0 from 200 to 400. The before arms grow by 60 B by 25 operations and then not at all.
- **So the row at 200 operations measures a plateau value.** Within 400 operations the excess is about 4 KB, and isn't a retention that grows with every operation.

### 5.2 What it leaves unresolved

- **The retaining object.** The attribution is by snapshot class only. No retainer path was read, so nothing says which object holds these arrays.
- **Library or engine.** An `array ` node is a V8 internal array. It can be a backing store of the library's own structure that outlives destruction, or the engine's data for the library's code, such as feedback or a weak list. Which one it is decides whether a source change can remove it.
- **What the doubling steps mean.** Each step is twice the previous one for twice the operations. That fits one backing store whose capacity doubles as entries arrive, which then stops getting entries, or is compacted, before 400 operations. That is an inference from the shape, not an observation.
- **The range outside 0 to 400 operations,** and whether the figure depends on the item count, the lift or the landing. Only the 20-item row was attributed.

**What would resolve it,** if the owner wants it before `DRO-4`: one probe page that takes a snapshot after 0 operations and another after 200 in the same page, so that node ids match, and reads the retainer path of the new `array ` nodes. It isn't in the next unit, which has one task.

## 6. Next unit

[`performance-sensitivity-handoff.md`](performance-sensitivity-handoff.md), for one implementer, on this branch. It runs `DRD-44`'s experiment: one probe, kept out of the instrument, in four processes, in one campaign. **The implementer coordinates every browser process with the owner's other sessions,** so that no build, size run, typecheck or browser suite overlaps it, and records the hold.

**After it:** the architect applies `DRD-44`'s outcome table. A machine outcome leads to a decision on the launch and admission condition for timing runs, and then to F1, F2, `--prove` and B3' under that condition. A method outcome leads to the deferred decision on events per reading or `judge`'s bound, from the settled readings. No optimization unit starts before a row meets `DRD-43` property 7.

## 7. Open after this assessment

- `DRD-43` properties 3, 6 and 7, and B3', until `DRD-44`'s outcome.
- `DRD-44`, until the next unit reports.
- `DRO-4`: the owner's reading of the baseline and of §5.
- `DRF-20`, for the size pass.
- **The alias cleanup on `drag/performance`, reported to the architect by its implementer during this pass and not read here.** It inlines `const drag = this.#drag` in `sortable`'s `Operation.move()`, so `MOVE_SITE` no longer occurs in that branch's `src/sortable/operation.ts`. 10 of the 23 `--prove` and `--floors` entries are stale there: 3 gate injections and 7 floor entries. `DRD-23`'s last bullet applies before any run at that source. It also changes the source that B1 to B3 measured. Its report, `alias-cleanup-report.md` on `drag/performance`, is read separately. `DRD-44`'s experiment runs on this branch's frozen source, where all 23 entries apply (§1). It uses two of the gate injections and no floor entry.
- [`performance-plan.md`](performance-plan.md) §4, unchanged.