# Performance instrument: assessment

**Read by:** the architect, on `drag/performance` at `c279973a3`, with a clean tree. **Input:** [`performance-instrument-report.md`](performance-instrument-report.md) §Resumed, and the commits `676bdd3ba`, `016ba7d5a`, `10e631943` and `c279973a3`. **Governing records:** [`performance-instrument-handoff.md`](performance-instrument-handoff.md), [`performance-plan.md`](performance-plan.md) §2 P2, and `DRD-40`, `DRD-41`, `DRF-1` and `DRO-4` in [`00-index.md`](00-index.md). The return at `b8f1d1b35` was read earlier, in §Disposition of the performance instrument return.

**Outcome:**

- The unit is complete. `DRD-41` conforms, `DRF-1` is closed, and the baseline of `a9c323f6a` is accepted.
- **The kernel per-sample test:** the evidence supports H1. `DRD-42` adds one unsampled pass of the test's own loop before sampling, and requires M1, M2 and M3 to fail with that pass in place (§3).
- **Timing sensitivity isn't sufficient for useful optimization on any timing row** (§4). Layout counts, the bytes rows, the retained row and the per-sample tests are sufficient. `DRD-43` adds rows driven from inside the page for the move path and the cycle, and measures their floors twice. No optimization unit starts before a row it reads has a sufficient floor.
- [`performance-resolution-handoff.md`](performance-resolution-handoff.md) is the next unit. It doesn't repeat B1, B2, the CDP floors, the profiles or the size table.
- `DRO-4` has the baseline's reading for the owner, with what it can't resolve (§5).

No raw reading, threshold, rule, scenario or budget changes in this assessment. `DRD-42` changes the per-sample test's setup and `DRD-43` adds rows. Neither changes a limit.

## 1. Checks made in this pass

| Check | Result |
| --- | --- |
| `git diff --stat a9c323f6a..HEAD -- src tests` | Empty |
| `git diff --stat 016ba7d5a..HEAD -- bench` | Empty, so item 5 ran at the unit's last code |
| [`prove.txt`](measurements/2026-11-10-performance-prove.txt) | `exit 0`. Every A/A line on the 12 validation rows reads `quiet` |
| [`persample-A.txt`](measurements/2026-11-10-performance-persample-A.txt), [`persample-D.txt`](measurements/2026-11-10-performance-persample-D.txt) | Recomputed from the summary lines: A has a median of 17.16 and 8 failures in 10 runs, and D a median of 0.89 and no failure, as reported |
| A/A bounds per timing row | Recomputed by a scratch script from the B1, B2, B3 and floors JSON, and read from `prove.txt` (§4) |
| Floors per round | Read from [`floors.json`](measurements/2026-11-10-performance-floors.json) (§4) |

**Not repeated:** every browser run. The readings are the report's.

## 2. Closures and status corrections

| Record | Change | Evidence |
| --- | --- | --- |
| `DRF-1` | **Closed** at `ab14380c1` | `--prove` at the unit's last code exits 0. N1 flags at 96 to 106 B per move under `kernel/gesture.ts:enter`, N2 under `kernel/session.ts:#move`, and N4 stays quiet and is counted |
| `DRD-41` status row | "Not implemented" → implemented at `676bdd3ba`, conforms | Q1 exits 1 and names the broken quiet expectation. N4 in `--prove` |
| `DRD-23` status row | `DRF-1` closed. The last bullet is applied in full | As above |
| `DRD-40` status row | P1 complete, `DRD-42` and `DRD-43` decide P2 | This record |
| `DRD-42`, `DRD-43` | New status rows | This record |
| The register's status paragraph | Brought to this reading | — |
| [`performance-plan.md`](performance-plan.md) | §1 gets the state after P1. §2 records P2's decisions, adds P1b and sets P3's entry condition | `DRD-42`, `DRD-43` |
| `DRO-4` | The baseline's reading for the owner | §5 |

**Accepted without a finding:**

- **The queuing error before B2** (report §Resumed). B1 ended at 17:52, and B2 and B3 ran in sequence after 20:27, with nothing in the gap. It affects no reading.
- **The discarded A and D runs.** Their command printed no console output for a passing run, so they had no reading for a pass. They are kept with that reason, and A and D were run again.
- **`ITERATIONS_PER_US` is 60, from a probe that read 38 to 115.** The sizes are nominal, and every figure this assessment uses is the measured median. On the move row the measured size was 1.5 to 1.7 times the nominal one at 30 and 100 µs.
- **Step 6 made no `--attribute` run** for the retained row, because the handoff asked for a profile only on a row that flags slower. The handoff was narrower than `DRO-4` needs. The next unit's item 3 makes the run.

**Unchanged:** `DRF-20` stays open for the size pass. The six red size rows stay with `DRO-4`.

## 3. The kernel per-sample test (`DRD-42`)

| Context | Kernel B per move: min / median / max | Failures | Kernel keys |
| --- | --- | --: | --- |
| A, alone | 14.96 / 17.16 / 18.47 | 8 of 10 | Every function on the path, 0.3 to 6.3 B each |
| B, its file | 0 / 0 / 0 | 0 of 10 | None |
| C, the Chromium suite | 0 / 0 / 0 | 0 of 5 | None |
| D, alone, with one unsampled pass | 0.28 / 0.89 / 1.31 | 0 of 10 | `kernel/session.ts:handleEvent`, and once `requestStep` |
| M1, M2, M3 in A and B | 41.68 to 112.52 | 26 of 26 | The injected function carries the excess |

**Decision: a warm pass in the test, D's form.** The test's result depends on what ran before it, and one pass of its own loop removes that dependency. Its sensitivity to the allocations it exists for is shown in B, where the code is already warm: M3, one object with two number properties per sample, read 51.85 to 53.97 B per move against a limit of 16. That shows that warm code still allocates an object that escapes. It doesn't prove the repair, because B's warm-up is five other tests and not D's pass. So `DRD-42` property 4 requires M1, M2 and M3 to fail with the warm pass itself in place, launched alone and as a file.

**What the repair gives up** is stated in `DRD-42`: the cost before the code is optimized, about 15 to 18.5 B per move over the first 300 moves, and any allocation the optimizing compiler removes. The handoff's M4 records the second, so that the record states what the test can't see instead of assuming it. Neither was bounded before in the file and suite runs, which were already warm.

**Why not the alternatives:** `DRD-42` §Rejected. In short, a higher limit would follow V8's tiering and not the library, and a rule on how to launch the test leaves its result dependent on order.

## 4. Timing sensitivity (`DRD-43`)

**Measured floors** ([`floors.json`](measurements/2026-11-10-performance-floors.json)). Each entry is fixed work at the gate injection's site. Script, injected arm minus base, per round:

| Entry, nominal | Differences per round, µs | A/A per round, µs | Median / bound | Verdict |
| --- | --- | --- | --- | --- |
| 300 µs per cycle | 265, 411, 312, 412, 746, 762, 411 | 32, 421, 246, −134, −207, 626, −197 | 411 / 626 | No difference shown |
| 100 µs per cycle | 132, 782, 622, −162, −1215, 207, 1192 | −8, 595, −2929, 853, −494, −933, 1143 | 207 / 2,929 | No difference shown |
| 100 µs per move | 353, 147, 152, 114, 163, 115, 144 | 221, −7, 31, −22, −10, −34, 35 | 147 / 221 | No difference shown |
| 30 µs per move | 31, 59, 54, 50, 69, 40, 49 | −19, 33, 11, 20, 23, 9, −25 | 50 / 33 | **Flags slower** |
| 10 µs per move | 45, 52, 5, 18, −1, −7, 2 | 1, 16, −12, −6, −23, −35, −39 | 5 / 39 | No difference shown |

**Script A/A bound per timing row, across the recorded runs.** Production's median is B1's and B2's.

| Row | Production, µs per event | A/A bound, µs per event | Graded | Fine enough |
| --- | --- | --- | --- | --- |
| 300 moves, 20 items | 168, 163 | 20 to 221: B1 20, B2 22, B3 35, `--prove` 36, floors 33, 39 and 221 | 50 flags. 147 and 5 don't | No |
| 300 moves, 2,000 items | 186, 173 | 20 to 70 | No | No |
| 50 cycles, 20 items, no landing | 2,120, 1,792 | 334 to 3,283: B1 334, B2 528, B3 885, `--prove` 3,283, floors 626 and 2,929 | 411 and 207 don't flag | No |
| The other three cycle rows | 1,961 to 6,628 | 423 to 2,601 | No | No |
| The four press rows | 79 to 693 | 42 to 624 | No | No |
| The two keyboard rows | 371 to 686 | 101 to 351 | No | No |
| Free drag, 300 moves | 117, 106 | 7 and 14 | No | Not known: no graded entry |

Task time's bounds were 151 µs to 31,745 µs on the same rows, so task time can't show an effect of library size.

**Reading.**

- **The move row's floor is between 5 and 50 µs measured, and isn't monotone.** 147 µs measured didn't flag because one round's A/A difference was 221 µs while the other six were within 35 µs. Across B1's and B2's timing rows, the largest absolute A/A difference was 1.3 to 10.9 times the median one. So one disturbed round sets the row's floor for that run.
- **Most of the move row's script isn't the library's.** The no-lift `draggable` row reads 102 to 115 µs per move and free drag 106 to 117 µs, against the sortable row's 163 to 168 µs. Each move costs one CDP input command and one page evaluation that awaits a frame, and both run script in the page. So `sortable`'s share at 20 items is at most about 55 to 65 µs per move, by difference. A 10 % saving of that share is about 6 µs, below every floor the row showed. **This is an estimate by difference.** The kernel's share and the harness's share aren't separated, and `DRD-43` property 5 measures the harness.
- **The cycle row can't show 20 % of its script.** Its bound varied tenfold between runs, from 334 to 3,283 µs, on the same source.

**Decision: `DRD-43`.** The first lever is the noise in each reading. A row driven from inside the page takes the CDP round trips and the per-move evaluations out of the timed window, and leaves the library's work as most of the reading. The judge and the rounds stay, so that a floor measured on the new rows is comparable with the old ones and a change to `judge` can be decided on readings. The hot path, moves, gets two rows, at 20 and 2,000 items. The cycle gets one, at 20 items with no landing, because that is where the gate injection and both cycle floor entries already are. The press and keyboard rows get nothing in this unit. A unit that targets them needs its own resolution step first.

**Sufficiency is stated before the readings** (`DRD-43` property 7): a stable floor at most 10 % of the library's share of the row's script. 10 % is the smallest effect worth an optimization unit's three-engine run, size table and reading.

## 5. The baseline for `DRO-4`

The owner's reading is in `DRO-4`'s "Baseline reading, 2026-11-11". In short:

- **Stable in B1 and B2:** the press at 2,000 items with `[...root.children]` is slower than drag2 in script by 385 and 472 µs per press. That is `DRO-1`'s pull at a press. Production retains 4,076 B more than drag2 and 3,396 B more than the prototype after 200 operations, in every round. Free drag's script is faster than drag2's by 15 and 21 µs per move.
- **Unstable:** four verdicts differ between B1 and B2. At this resolution they are noise.
- **Not resolved:** the per-cycle cost against both before arms, which `DRD-22` left as "probably slower". The cycle rows can't show less than about 20 % of their script.

The next unit attributes the retained figure. The cycle question needs the in-page cycle row with the before arms. That is a later unit, if the owner wants the answer, after the row's floor is known.

## 6. Next unit

[`performance-resolution-handoff.md`](performance-resolution-handoff.md), for one implementer:

1. `DRD-42`: the warm pass, with M1, M2 and M3 failing under it, and M4 recorded.
2. `DRD-43`: the in-page rows, their gate injections, their graded series and the harness row. The floors are measured twice, in separate processes.
3. The retained row's attribution, for `DRO-4`.

It then runs `--prove` and a `--before a9c323f6a` A/A run with the new rows. It doesn't run B1, B2, the CDP floors, profiles or the size table again.

**After it:** the architect reads the floors against `DRD-43` property 7. A sufficient row opens P3 on that row. An unstable or insufficient floor leads to the next decision, on `judge`'s bound or on events per reading, from those readings.

## 7. Open after this assessment

- `DRD-42` and `DRD-43`, until the next unit reports.
- `DRO-4`: the owner's reading of the baseline. The retained figure waits for its attribution.
- `DRF-20`, for the size pass.
- [`performance-plan.md`](performance-plan.md) §4, unchanged.