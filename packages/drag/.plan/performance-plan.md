# Runtime performance plan

**Opened:** 2026-11-10 on `drag/performance` from `a9c323f6a`, the squash merge of #14. **Governing decision:** `DRD-40` in [`00-index.md`](00-index.md), with `DRD-13`, `DRD-22`, `DRD-23` and `DRO-4`. **First unit:** [`performance-instrument-handoff.md`](performance-instrument-handoff.md).

**Goal:** make `@ydinjs/drag` faster at runtime, then smaller. Each change is shown by a reading that could have shown the opposite. Runtime wins over bytes by CONTRIBUTING §0 and §14. The contract's invariants and the ownership decisions hold through every step (`DRD-40` property 7).

## 1. The instruments and what each can show

| Instrument | What it measures | How it decides | State at `a9c323f6a` |
| --- | --- | --- | --- |
| `bench/compare.ts`, timing rows | Script and task time, and layout count, per cycle, move, press or key. Chromium only, one browser process, arms interleaved, a new page per run | `judge`: paired differences within rounds, a sign in 6 of 7 rounds and a median beyond the largest A/A difference. Layouts are exact | The last `--prove` ran at `b91db2818`. All six injections are stale (`DRF-7`). **Detection floor unknown** below the injected 1 ms per cycle and about 900 µs per move |
| `compare.ts`, bytes rows | Sampled bytes per move by function, interval 64 B | A kernel function at 16 B per move or more flags | Selects the kernel by function name (`DRF-1`) |
| `compare.ts`, retained row | Retained JavaScript objects after 200 operations and destruction | Paired, 3 of 3 rounds, beyond the A/A bound (0 B at `b91db2818`) | Its injection is stale (`DRF-7`) |
| `tests/hot-path.browser.test.ts`, kernel per-sample test | Sampled kernel bytes per move over 300 moves, interval 64 B | `kernelPerMove < 16` | Selects by location. **Fails in some runs on accepted source:** 6 of 11 runs launched alone with `-t` failed, at 13.33 to 17.49 B ([`instrument-repair-report.md`](instrument-repair-report.md) §Item 1). Every recorded whole-file and suite run passed. M1 and M2 were never run against it |
| `hot-path`, `DRF-2` test | The lift's sampled bytes per move, interval 16 B | `< 153` B per move | Proven at `8c5ace665` with a 54 B object |
| `hot-path`, census tests | Layout reads per sample, spatial searches per frame, consumer callbacks per sample | Exact counts | Pass |
| `bench/size/measure.ts` and `size.node.test.ts` | Minified and Brotli bytes per composition, and module graphs | Ceilings and `absent` lists | Six rows red with unchanged budgets (`DRO-4`) |

**Why the floor matters.** At `b91db2818` production's script time was about 192 µs per move and 2.5 ms per cycle at 20 items, against A/A bounds of 44 µs and 387 µs ([`2026-11-07-compare.json`](measurements/2026-11-07-compare.json)). Task time's bounds were 0.7 ms per move and 2.6 ms per cycle. A 10 % saving in script time is inside both script bounds. Until the floor is measured, a "no difference shown" says nothing about an optimization.

**After P1, at `c279973a3`** ([assessment](performance-instrument-assessment.md) §4). Layout counts are exact. The bytes row flags one two-number object per sample, and the retained row flags one per operation. The kernel per-sample test fails alone and passes after other tests, and `DRD-42` repairs it. **No timing row resolves an optimization.** The 20-item move row flagged 50 µs measured and missed 147 µs and 5 µs, with A/A bounds of 20 to 221 µs per move. The 20-item cycle row missed 411 µs, with bounds of 334 to 3,283 µs per cycle. `DRD-43` adds rows driven from inside the page (P1b).

## 2. Phases

### P1. Instruments, then the baseline

One implementer unit: [`performance-instrument-handoff.md`](performance-instrument-handoff.md).

1. `DRF-7`: every injection applies to the current source, and a dry check proves it with no browser.
2. `DRF-1`: the bytes rule selects the kernel by module location.
3. A graded series of injected regressions gives each judged row type its detection floor. The series is recorded and doesn't gate.
4. `--prove`: every injection expected to flag flags, the step-list injection stays quiet, and the A/A pass is quiet. **Amended on 2026-11-10 by `DRD-41`:** it said "every gate injection flags". At the current source the step list allocates nothing per entry, so that injection shows that the bytes rule doesn't flag kernel work with no allocation.
5. The kernel per-sample test is run in four launch contexts, with M1 and M2, to find what its result depends on. Nothing in the test changes in this unit.
6. The baseline: two full comparisons at the unit's last commit against drag2 and the prototype, one `--before` A/A run of the baseline commit against itself, and the size table.

### P2. The architect reads P1

- **The kernel per-sample test.** The architect decides its repair from item 5's evidence, as a decision in the register. Possible outcomes include a warm-up before sampling, a different launch for the test, or a finding about the threshold for the owner. None is chosen before the evidence.
- **The detection floors.** If a floor is coarser than the effects worth pursuing, the architect decides how to raise the resolution before any optimization. Examples: more rounds, more events per reading, or an in-page row that dispatches events without CDP input. A change to `judge` or to a scenario is a decision (`DRD-40` property 3).
- **`DRO-4`.** The baseline's timing against drag2 and the prototype goes to the owner, with each slower row and the profile that attributes it.

**Decided on 2026-11-11** ([assessment](performance-instrument-assessment.md)): the per-sample test gets one unsampled pass of its own loop before sampling (`DRD-42`). The timing floors are too coarse, and P1b raises the resolution on the move path and the cycle (`DRD-43`). `DRO-4` holds the baseline's reading for the owner. The retained row's attribution is in P1b.

### P1b. Resolution

One implementer unit: [`performance-resolution-handoff.md`](performance-resolution-handoff.md).

1. `DRD-42`: the per-sample test's warm pass, with M1, M2 and M3 failing under it.
2. `DRD-43`: rows driven from inside the page for 300 moves at 20 and 2,000 items and for 50 cycles at 20 items, a row that measures the driver alone, two gate injections, and graded entries measured in two runs.
3. The retained row's attribution, for `DRO-4`.
4. `--prove`, and a `--before a9c323f6a` A/A run that gives the new rows their baseline. B1, B2, the CDP floors and the size table aren't repeated.
5. **Added on 2026-11-11 by `DRD-44`.** The unit returned at `39c8b432c`: `--prove` failed on both in-page gates, and no floor entry flagged ([assessment](performance-resolution-assessment.md)). One experiment, [`performance-sensitivity-handoff.md`](performance-sensitivity-handoff.md), attributes that to the machine or the method. It runs four processes, unpinned and pinned to the E-cores, and records each reading's run-queue wait, core class and speed. Its outcome table decides the next change. Step 4's B3' and the in-page floors wait for it.
6. **Added on 2026-11-11 by `DRD-45`.** The experiment ran at `24cdadc48`, and its outcome is not resolved on both gate rows ([assessment](performance-sensitivity-assessment.md)). Its speed gauge measures its own first run, so `DRD-45` withdraws the gauge test and the rerun. One check, [`performance-page-check-handoff.md`](performance-page-check-handoff.md), reads each in-page gate row in four windows per page across ten pages, with the clock recorded in each window. It tells the page, the window and the clock apart. At the quietest load on record the bounds are still too wide for P3, so a method change follows in any outcome. Before any campaign on `566ebfc65`'s source, the 10 entries its alias cleanup made stale are repaired (`DRD-45` property 9).
7. **Added on 2026-11-11 by `DRD-46`.** The check returned before any browser process, and the owner stopped it. It is kept for possible later use, and step 6's B3' and in-page floors aren't scheduled. Property 9's repair is still owed before any `--prove` or `--floors` on `566ebfc65`'s source.

### P1c. Scenario traces

**Added on 2026-11-11 by `DRD-46`.** One implementer unit: [`performance-trace-handoff.md`](performance-trace-handoff.md).

1. A trace mode of `compare.ts` records short Chrome traces of named scenarios, with set-up outside the traced interaction, from `src` at a named revision.
2. The first scenarios, at `566ebfc65`: reordering moves at 20 and 2,000 items, and the press and release below the threshold at 2,000 items, with `[...root.children]` and with the cached array.
3. A report that attributes each phase's main-thread time and names candidates, each with its site, cost, mechanism, expected saving and confirming row. No production change.

The architect then selects one candidate, or none, and records the selection.

**Done on 2026-11-11:** the traces were recorded at `e92e21eed` ([report](performance-trace-report.md), [assessment](performance-trace-assessment.md)), and `DRD-47` selects candidate 2 in a changed form.

### P3. Optimization units

**First unit:** [`performance-drop-handoff.md`](performance-drop-handoff.md), `DRD-47`. The pointer drop confirms the axis cache against one row instead of measuring every row, and the 2,000-item cycle rows confirm it.

**Done on 2026-11-12:** implemented at `bf9d1caed` and confirmed ([report](performance-drop-report.md), [assessment](performance-drop-assessment.md)). "50 activate-and-drop cycles, 2000 items, no landing" is faster by 2,449 µs of script per cycle, against an A/A bound of 409 µs. The owner accepted +125 to +140 B Brotli on the `sortable` rows, and no budget changed.

**Next, a correctness unit:** [`free-drag-drop-handoff.md`](free-drag-drop-handoff.md), `DRD-48`. `freeDrag`'s drop measures its drop targets and its bounds again, which `DRF-22` found missing. It isn't an optimization unit, and no paired run reaches it. The next optimization candidate is selected after it, from the trace report or from new traces, under `DRD-46` property 8.

**Done on 2026-11-12:** implemented at `71f20df20` ([report](free-drag-drop-report.md), [assessment](free-drag-drop-assessment.md)), and `DRF-22` is closed. The owner accepted +5 B Brotli on the two `freeDrag` rows.

**Second optimization unit:** [`performance-window-handoff.md`](performance-window-handoff.md), `DRD-49`. The trace report's candidate 1: `y()` measures a window of rows that grows from the placeholder toward the pointer, instead of every row at the activation and after every invalidation. The 2,000-item cycle rows confirm it, and the move rows show that nothing is slower.

**Owner scope approval, 2026-11-12:** `y()` serves rendered, non-virtualized DOM lists under `DRD-49`'s ordering terms. Virtualized lists are deferred until after 1.0.0, as recorded in §5. This approval allows the second optimization unit to start; it accepts no unmeasured speed or size result.

**Done on 2026-11-12:** implemented at `501f60ab7` and confirmed ([report](performance-window-report.md), [assessment](performance-window-assessment.md)). "50 activate-and-drop cycles, 2000 items, no landing" is faster by 2,508 µs of script per cycle, against an A/A bound of 427 µs. Its bytes, +155 B Brotli on "sortable + y" and "complete" and +51 B on "sortable + xy", await the owner's acceptance after the correction below.

**Next, a correction unit:** [`performance-window-correction-handoff.md`](performance-window-correction-handoff.md), `DRD-50`. A measurement settles a slot range of the cache's own buffer, so a read with a sink allocates nothing. A paired probe of `xy()`'s rebuild against `71f20df20`'s decides whether the shared rebuild stays. Runtime comes before the byte ceilings in this unit. No `compare.ts` run follows, and `DRD-49`'s readings stand.

**Done on 2026-11-12:** implemented at `8d002529a` ([report](performance-window-correction-report.md), [assessment](performance-window-correction-assessment.md)). A read with a sink allocates nothing. The probe read "no difference shown" in both cases, so `xy()`'s shared rebuild stays. Its A/A bounds don't limit a possible slowdown. The owner accepted +143 B Brotli on "sortable + y", +36 B on "sortable + xy" and +149 B on "complete", against `71f20df20`, and no budget changed.

**Recommended next, not started:** one attribution probe of the layout that follows a row animation's end at 2,000 items, 5 to 12 ms per traced drag in the saved traces (assessment §4). It changes no production code or instrument. Trace candidates 3 to 5 aren't bounded runtime tasks now. If the probe finds nothing the library controls, the runtime pass is ready to close and P4 follows. The owner decides whether it runs.

**Done on 2026-11-12:** the architect ran the probe at `bb8e5ebb8` ([record](animation-end-layout-probe.md)). The layout follows any element that starts or stops an animated or styled `translate`, `transform` or `opacity`, and the `opacity` control lays out too. Its cost grows with the list. No form that the library controls avoids it with the same rendering and cleanup. **The architect recommends closing the runtime pass**, with P4 next. The owner decides.

**Entry condition** (`DRD-46` property 8): a unit starts on one candidate that the architect selected from a trace report. No row has to meet `DRD-43` property 7 first. **Amended on 2026-11-11 by `DRD-46`:** it said that a unit starts only on a row whose floor is stable and at most 10 % of the library's share of that row's script, and that the candidate comes from `compare.ts --profile --only <row>`.

Each unit is one bounded change at the selected candidate's site. Each unit:

- states the candidate, its expected saving, and the existing rows that mirror its scenario;
- measures with `compare.ts --before <baseline commit> --only <rows>` in one process: those rows, and any existing row on another path that the change reaches. It reports each verdict with its sign count, median and A/A bound. The candidate is confirmed by a "faster" verdict on its target row, or by a lower layout count; "no difference shown" goes to the architect, and "slower" on any row returns the unit;
- runs the three-engine suite, the per-sample tests and the size table;
- reports a size change with its timing rows, and a timing change with its size rows.

When the target row shows no difference, the architect decides what follows (`DRD-46` property 8): the change doesn't land as an optimization, or one injection of the expected size at the candidate's site shows whether the row could see it, or a longer row is decided as an instrument change. The owner decides whether a change lands for another reason.

### P4. Size pass

After the runtime units, under CONTRIBUTING Part II: delete machinery before compressing syntax (§16), and measure each change by composition (§15). Any byte saving that adds work on a hot path goes to the owner (§0). `DRO-4`'s re-base is the owner's decision, and it is made against the figures the owner accepts.

## 3. Rules every unit follows

`DRD-40`'s properties, in short:

- **Raw readings are kept** under `measurements/`, unedited, with the commit, Chrome and Node versions, the CPU count, and the load average before and after. A discarded run is kept with its reason.
- **No threshold, rule, scenario or budget moves with a reading.** A change is a decision first, which names its reading.
- **An instrument change is shown by an injection it catches** (`DRD-23`), and the floors are measured again after it.
- **Nothing else runs on the machine from the same session** during a timing run. Other sessions can't be controlled, so the load average is the record of them.
- **A long sequence of runs goes through [`bench/campaign.ts`](../bench/campaign.ts).** It runs the commands in order, stops at the first failure, and records each command's revision, process, times, exit code and log in `.campaigns/<id>/status.json`. `campaign.ts status` reports each run as running, succeeded, failed or interrupted from that file and `/proc`, not from a log. It writes nothing while a step runs. It changes no scenario, rule or threshold. Report: [`campaign-runner-report.md`](campaign-runner-report.md).

## 4. Open items this plan doesn't decide

- `DRO-4`'s size re-base and the red rows, five at `bf9d1caed`. The owner's.
- Decisions 1 and 2 of [`combined-review-remediation-assessment.md`](combined-review-remediation-assessment.md) §5.2: `DRO-10`'s excess and the costs no approval covers. The record holds no answer.
- `DRO-3`, real touch and pen devices, before release.
- `DRF-21`, the bytes rows' module keys: repaired before the next bytes reading that a report or decision uses.
- `DRD-45` property 9: the stale injection entries, repaired before any `--prove` or `--floors` on `566ebfc65`'s source or a descendant.
- The optional findings `DRF-13`, `DRF-14`, `DRF-15`, `DRF-17` and `DRF-18`. An optimization unit that touches one of their sites may repair it, if the handoff says so.

## 5. Post-1.0.0: virtualized lists

**Owner direction, 2026-11-12:** plan a separate extension for drag and drop in virtualized lists. `yvirt` is a working name, not a decided API or architecture. The current `y()` does not support virtualized lists.

The future design covers moving a file into a folder while scrolling a virtualized file list, and reordering across the rendered window's boundary. It must consider stable item identity when DOM rows are removed or reused, and an operation that outlives its source row. Whether this needs a separate behavior, capability or adapter remains for that design. This work is not a prerequisite for 1.0.0 or for `DRD-49`.