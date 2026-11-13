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

**Done on 2026-11-12:** the architect ran the probe at `bb8e5ebb8` ([record](animation-end-layout-probe.md)). In Chromium 157, in a block list of fixed-height rows at 20 and 2,000 items, the layout followed every tested variant that started or stopped an animated or styled `translate`, `transform` or `opacity`, and the `opacity` control laid out too. It cost more at 2,000 rows than at 20. None of the library-controlled forms the probe considered avoided it with the same rendering and cleanup. **The architect recommended closing the runtime pass**, with P4 next. **Corrected on 2026-11-12:** this paragraph said that the layout follows any element and that no library form avoids it. The probe tested one scenario in one engine.

**Runtime pass closed by the owner on 2026-11-12.** No optimization unit is open. The owner inspects the code on `drag/performance` before a pull request is prepared and the phase closes.

Confirmed results, each against its recorded baseline:

| Unit | Result | Bytes, accepted by the owner |
| --- | --- | --- |
| Instruments (P1, `DRD-41`, `DRD-42`) | `DRF-1` closed, the kernel per-sample test samples after a warm pass, and the baseline of `a9c323f6a` is recorded | — |
| `DRD-47`, the drop's confirmation | "50 activate-and-drop cycles, 2000 items, no landing": faster by 2,449 µs of script per cycle, A/A bound 409 µs | +125 to +140 B Brotli |
| `DRD-48`, `freeDrag`'s drop, a correctness unit | `DRF-22` closed | +5 B Brotli |
| `DRD-49`, `y()`'s window | The same row: faster by 2,508 µs of script per cycle, A/A bound 427 µs | With `DRD-50`, against `71f20df20`: +143 B on "sortable + y", +36 B on "sortable + xy", +149 B on "complete" |
| `DRD-50`, range settling | A read with a sink allocates nothing. `xy()`'s shared rebuild: "no difference shown", so it stays, and the A/A bounds don't limit a slowdown | (in the row above) |
| The animation-end layout probe | Attributed to the browser in the tested Chromium scenario and variants only | — |

The trace candidates: 1 and 2 are done, 3 was rejected under `DRD-49`, and 4 and 5 are decisions first. **No budget changed** in the pass. The deferred campaigns stay stopped: the page check, B3', the in-page floors, `--prove` and `--floors`. What remains open is in §4.

**Entry condition** (`DRD-46` property 8): a unit starts on one candidate that the architect selected from a trace report. No row has to meet `DRD-43` property 7 first. **Amended on 2026-11-11 by `DRD-46`:** it said that a unit starts only on a row whose floor is stable and at most 10 % of the library's share of that row's script, and that the candidate comes from `compare.ts --profile --only <row>`.

Each unit is one bounded change at the selected candidate's site. Each unit:

- states the candidate, its expected saving, and the existing rows that mirror its scenario;
- measures with `compare.ts --before <baseline commit> --only <rows>` in one process: those rows, and any existing row on another path that the change reaches. It reports each verdict with its sign count, median and A/A bound. The candidate is confirmed by a "faster" verdict on its target row, or by a lower layout count; "no difference shown" goes to the architect, and "slower" on any row returns the unit;
- runs the three-engine suite, the per-sample tests and the size table;
- reports a size change with its timing rows, and a timing change with its size rows.

When the target row shows no difference, the architect decides what follows (`DRD-46` property 8): the change doesn't land as an optimization, or one injection of the expected size at the candidate's site shows whether the row could see it, or a longer row is decided as an instrument change. The owner decides whether a change lands for another reason.

### P4. Size pass

**Opened by the owner on 2026-11-12** on `drag/size` from `0a28f909a`, the squash merge of #15. **Governing decision:** `DRD-51`, with `DRO-4` and `DRO-14`. **Opening assessment:** [`size-pass-assessment.md`](size-pass-assessment.md), with the probe and the candidate patches in [`probes/size-pass/`](probes/size-pass/README.md) and the raw readings in [`2026-11-12-size-pass-readings.txt`](measurements/2026-11-12-size-pass-readings.txt).

It works under CONTRIBUTING Part II: delete machinery before compressing syntax (§16), and measure each change by composition (§15). Any byte saving that adds work on a hot path goes to the owner (§0). `DRO-4`'s re-base is the owner's decision, made after the pass against the figures the owner accepts (§18).

**What the opening found.** The reachability gate (§1.1) removes nothing: every guard is reachable through correct use. No runtime vocabulary ships unfolded, and the shipped diagnostics are already identities. Seven candidates were measured as patches against `0a28f909a`. Each takes 1 to 76 B Brotli off a row, and the largest set takes 26 to 120 B. **No set makes a red row green,** so the pass removes machinery, and the budgets stay a question for `DRO-4`.

**How each unit measures** (`DRD-51`):

- every row as minified, gzip-9 and Brotli-11 bytes, with the settings recorded in the assessment's §1. Brotli-11 gates, and gzip is recorded and not gated. Only joint readings are booked;
- control rows named before the reading, each at exactly 0 B;
- a change that only removes work: the per-sample tests, the hot-path censuses and the three-engine suite, with no `compare.ts` run. A change that adds or moves hot-path work also runs `compare.ts --before <its base> --only <rows>` and goes to the owner;
- no ceiling, control figure or `measure.ts` change, and the deferred campaigns stay stopped. `bench/campaign.ts` isn't one of them (§3).

**First unit, handed off on 2026-11-12:** [`size-pass-unit-handoff.md`](size-pass-unit-handoff.md), from `1d304128b`. It carries:

- `DRF-13` and `DRF-14` (`DRD-51` §First unit);
- `RectIndex`'s ownership (`DRD-52`, proposal P with the owner's two conditions);
- the completion of the owner's `kernel/callbacks.ts` refactor (`DRD-53`).

Expected against `1d304128b`: −62 B Brotli on "sortable + y", −56 B on "sortable + xy", −65 B on "complete" and −1 B on "freeDrag". The five rows that import neither `sortable` nor `freeDrag` must read exactly 0 B. Because `DRD-52` moves work on the committed-move path, the unit also:

- reads allocation per committed move after warm-up, where the 7 B is provisional;
- runs `compare.ts` on the move and cycle rows.

**`DRO-14`, answered in part on 2026-11-12:** item 1 (C2) is rejected, and the named module factories stay (`DRD-53`). Item 2 (C6) is approved as `DRD-52`. Items 3 (C1, `DRF-20`) and 4 (C5) are unanswered, and nothing is taken for them. The architect recommends not taking either.

**The owner's commit `1d304128b`** puts "example: resize handle" 8 B over its 3,313 B ceiling. Budgets are unchanged, and `DRO-4` holds the re-base.

**The first unit landed on 2026-11-12** at `237d65d2f`, and its [report](size-pass-unit-report.md) is accepted in [`size-pass-unit-assessment.md`](size-pass-unit-assessment.md):

- size equals the joint reading on every row: −62 B Brotli on "sortable + y", −56 B on "sortable + xy", −65 B on "complete" and −1 B on "freeDrag", with the controls at 0/0/0;
- allocation stands: +0.84 B per committed move warm, inside a run-to-run spread of about 3 B, and +4.13 B cold, consistently;
- timing reads "no difference shown" on ten rows. That is inconclusive, so speed is unmeasured in either direction, and the rows' A/A bounds don't limit a possible slowdown;
- six size rows stay over their ceilings, and `DRF-13` and `DRF-14` are closed.

**Corrected on 2026-11-13** on the owner's direction ([`rect-index-access-assessment.md`](rect-index-access-assessment.md) §7.4). The timing item said "timing holds: "no difference shown" on ten rows, which doesn't exclude a slowdown below their A/A bounds". That implies that a larger slowdown is excluded, and the A/A bound isn't such a limit. The verdict doesn't change.

**Second unit, handed off on 2026-11-12:** [`size-pass-followup-handoff.md`](size-pass-followup-handoff.md), from `ed4bd589f`. It makes `freeDrag`'s `invalidate` step a module function (`DRD-51`, as amended), and corrects the C6 probe's launch documentation. Expected: −1 B Brotli on "freeDrag" and −5 B on "freeDrag + bounds + landing", and 0/0/0 on the eight other rows. It only removes work, so it runs no `compare.ts` row.

**Property mangling, explored on 2026-11-12:** [`property-mangling-exploration.md`](property-mangling-exploration.md). The internal property names that survive minification take 30 to 119 B Brotli per row, and a publish-time mangle could take them. Nothing checks the published build today, so it would start with a suite against that build. **`DRO-15` holds it for the owner.** Budgets are unchanged.

**The second unit landed on 2026-11-12** at `e22db849c` and `0c13786ea`, and its [report](size-pass-followup-report.md) is accepted in `00-index.md` §Disposition of the size pass follow-up report. It took 1 B Brotli off "freeDrag" and 5 B off "freeDrag + bounds + landing", with the eight control rows at 0/0/0, and each documented probe launch selected one test.

**`DRO-14` was answered in full on 2026-11-12.** The owner rejected items 3 (C1) and 4 (C5): the idle fast path and the lift's capture functions stay unchanged, and `DRF-20` is closed. No measured machinery candidate remains.

**`DRO-15` was answered in part on 2026-11-12.** The owner started its first two steps, each a unit of its own:

1. consumer tests against the real `tsdown` output: `DRD-54`, handed off in [`consumer-tests-handoff.md`](consumer-tests-handoff.md);
2. the size gate on that output, decided when step 1 reports.

Source tests stay for internal behavior and development instruments. The mangle waits for the published build's results. Six rows stay over their ceilings, budgets are unchanged, and the deferred campaigns stay stopped.

**Step 1 landed on 2026-11-13** at `5ea7bb7e6`, and its [report](consumer-tests-report.md) is accepted in [`consumer-tests-assessment.md`](consumer-tests-assessment.md). 326 public browser tests pass against the emitted tree. The guard gap `DRF-23` is open: the consumer resolver lets an absolute path to a non-entry module reach its source.

**Step 2 is decided as `DRD-55`:** the size gate reads the published build through its exports map, box-quad stays on its source, and every ceiling stays. [`published-gate-handoff.md`](published-gate-handoff.md) repairs `DRF-23` in part A and implements `DRD-55` in part B. Its per-row figures, from `src` and from the build, are the results that the mangle waits for. A verdict that changes goes to `DRO-4`. Budgets are unchanged, and the deferred campaigns stay stopped.

**Owner direction, 2026-11-13: source prefixes for step 3.** Use an explicit `_` prefix in source for the ordinary internal properties selected for publish-time mangling. Public names and properties read by the platform keep their names; `#private` members need no additional prefix. The build selects the marked properties rather than inferring a list of safe names from TypeScript analysis. The architect records the choice under `DRO-15` and prepares its implementation handoff after assessing [`published-gate-report.md`](published-gate-report.md). Budgets remain unchanged. A transform that selects properties by type is deferred to [§6](#6-deferred-property-selection-by-type).

**Step 2 landed on 2026-11-13** at `79b4c3132` and `69c260685`, and its [report](published-gate-report.md) is accepted in `00-index.md` §Disposition of the published gate report. The gate reads the emitted tree. Its figures differ from `src` by −7 to +16 B Brotli, and no verdict changed. `DRF-23` is closed.

**Step 3 is decided as `DRD-56`,** from the owner's direction above. `_`-prefixed internal properties in `src`, 29 names to start, are confirmed by reading their use sites. One committed map gives each its output name. A step inside `tsdown`'s build renames them in the emitted JavaScript, leaves the `.d.ts` files unchanged, and keeps the source maps leading back to `src`. A node test validates the publication. [`publish-mangle-handoff.md`](publish-mangle-handoff.md) implements it. The exploration estimated −30 to −119 B Brotli per row. Budgets are unchanged, a verdict that changes goes to `DRO-4`, and the deferred campaigns stay stopped.

**Step 3 landed on 2026-11-13** at `f7b7b300b` and `31f92f5a9`, and its [report](publish-mangle-report.md) is accepted in [`publish-mangle-assessment.md`](publish-mangle-assessment.md). The gate on the renamed build reads −31 to −66 B Brotli on the rows without `sortable`, and −102 to −110 B on the three rows with it. "example: resize handle" and "freeDrag" turn green and go to `DRO-4`. Four rows stay red: "draggable alone", "example: drop zone", "freeDrag + bounds + landing" and "complete". Budgets are unchanged. A fresh independent review of the publication pipeline is recommended in that assessment's §9.

**Property mangling deferred on 2026-11-13** (`DRD-60`). `DRD-57` extended the selection, and `DRD-59` was to replace the pipeline. The owner then stopped the mangling and layout exploration, and deferred property mangling, because its measured savings don't justify its complexity. Those savings were −34 to −135 B Brotli per row. [`mangle-rollback-handoff.md`](mangle-rollback-handoff.md) removes the prefixes, the build step and the publication test from `690769539`, and keeps `DRD-58`'s slot array, the dependency update, the consumer project and the gate on the published build. The publication stays unbundled, unminified ESM with source maps and documented declarations. "example: resize handle" and "freeDrag" are expected over their ceilings again, and go to `DRO-4`. Budgets are unchanged.

**`RectIndex`'s storage, decided on 2026-11-13** (`DRD-61`). The owner approved proposal P in [`rect-index-access-proposal.md`](rect-index-access-proposal.md): `RectIndex` owns its storage and every write to it, code outside reads one value at a time, and the displacement sink answers per element. Against `8904947f6`, after the rollback, it reads −31, +22 and −92 B Brotli on the `sortable` rows, and no verdict changes. [`rect-index-access-handoff.md`](rect-index-access-handoff.md) implements it, with allocation readings and a focused timing check. Budgets are unchanged, and the deferred campaigns stay stopped.

**It landed on 2026-11-13** at `010a9ef39`, and its [report](rect-index-access-report.md) is accepted in [`rect-index-access-assessment.md`](rect-index-access-assessment.md). Size equals the figures above, and no verdict changes. Allocation falls by 34.74 B per `y()` sample, 11.77 B per cold committed move and 406.53 B per drop with `layoutAnimation()`, and shows no difference per `xy()` sample or per warm move. Those are bytes allocated. The timing check reads "no difference shown" for `xy()`'s rebuild, with and without the sink, and for `y()`'s scan. That is inconclusive, so speed is unmeasured in either direction, and the A/A thresholds don't limit a possible slowdown.

## 3. Rules every unit follows

**Owner direction, 2026-11-13: local development checks use Chromium only.** For the current drag phase, source and consumer browser tests, witnesses and probes run in Chromium. This replaces earlier requirements for local Firefox and WebKit runs, including those in existing handoffs. Missing Firefox or WebKit executables or host libraries do not block local development, and restoring them is not required. Their checks are deferred to a separate CI that the owner plans; this instruction does not establish that CI or claim cross-engine verification. Preserve the engine configurations and historical results.

`DRD-40`'s properties, in short:

- **Raw readings are kept** under `measurements/`, unedited, with the commit, Chrome and Node versions, the CPU count, and the load average before and after. A discarded run is kept with its reason.
- **No threshold, rule, scenario or budget moves with a reading.** A change is a decision first, which names its reading.
- **An instrument change is shown by an injection it catches** (`DRD-23`), and the floors are measured again after it.
- **Nothing else runs on the machine from the same session** during a timing run. Other sessions can't be controlled, so the load average is the record of them.
- **A long sequence of runs goes through [`bench/campaign.ts`](../bench/campaign.ts).** It runs the commands in order, stops at the first failure, and records each command's revision, process, times, exit code and log in `.campaigns/<id>/status.json`. `campaign.ts status` reports each run as running, succeeded, failed or interrupted from that file and `/proc`, not from a log. It writes nothing while a step runs. It changes no scenario, rule or threshold. Report: [`campaign-runner-report.md`](campaign-runner-report.md).
- **The runner isn't a campaign.** Added on 2026-11-12 (`DRD-51` property 3, as amended). "The deferred campaigns" are named measurement work: the page check, B3', the in-page floors, `--prove` and `--floors`. They stay stopped until a decision restarts one. The runner only orders the runs a unit's handoff asks for, such as allocation probes, the `compare.ts` runs it names and suites, and a unit uses it for any sequence of them. It does no work while a step runs, so it may run during a hold.
- **A unit waits for a process through the process itself:** the runner, a foreground command, or the harness's notice that a background command exited. It never waits by searching the process table for a pattern, as in `until ! pgrep -f <name>`. The waiting shell's own command line contains the pattern, so the search always finds it, and the wait never ends. This happened on 2026-11-10, before B2 and B3, and again on 2026-11-12, when three such loops ran into a hold ([assessment](size-pass-unit-assessment.md) §5).

## 4. Open items this plan doesn't decide

**Carried forward on 2026-11-12, when the runtime pass closed.** None is a runtime task in this pass.

- `DRO-4`'s size re-base and the red rows: five at `bf9d1caed`, the same five after the window, and four after `DRD-56` (`DRO-4`). The owner's.
- Decisions 1 and 2 of [`combined-review-remediation-assessment.md`](combined-review-remediation-assessment.md) §5.2: `DRO-10`'s excess and the costs no approval covers. The record holds no answer.
- `DRO-3`, real touch and pen devices, before release.
- **Added on 2026-11-13 by the owner:** Firefox and WebKit checks in a separate CI. Local development uses Chromium (§3); the CI is planned and not configured by this unit.
- `DRF-21`, the bytes rows' module keys: repaired before the next bytes reading that a report or decision uses.
- `DRD-45` property 9: the stale injection entries, repaired before any `--prove` or `--floors` on `566ebfc65`'s source or a descendant.
- The optional findings `DRF-15`, `DRF-17` and `DRF-18`. An optimization unit that touches one of their sites may repair it, if the handoff says so. `DRF-13` and `DRF-14` were closed on 2026-11-12 by P4's first unit.
- Trace candidates 4 and 5: `DRO-1`'s pull at a press and the landing's computed position. Each is a decision first ([assessment](performance-window-correction-assessment.md) §4.1).
- The retained plateau of about 4 KB in `DRO-4`, whose retainer isn't known.
- The owner's DevTools check of the saved traces ([assessment](performance-trace-assessment.md)).
- `xy()`'s shared rebuild: its probe can't limit a slowdown, and its rebuild with rows in flight wasn't timed ([assessment](performance-window-correction-assessment.md) §5).
- The animation-end layout outside the tested scenario: a flex or grid container, rows with layout containment, Firefox and WebKit, and what tracing adds to a layout ([probe](animation-end-layout-probe.md) §5).
- A README note on long lists and `layoutAnimation`. A documentation decision, the owner's, which needs its own measurement of the layer cost first.
- **Added on 2026-11-12, when P4 opened:** the contract gap that the threshold isn't stated finite ([assessment](size-pass-assessment.md) §3). `DRO-14`'s four items were answered on 2026-11-12, and `DRF-20` is closed.
- **Added on 2026-11-12:** `DRO-15`, a publish-time mangle of internal property names. Steps 1 to 3 landed (`DRD-54`, `DRD-55`, `DRD-56`). **On 2026-11-13 the owner deferred property mangling** (`DRD-60`), and step 3 is rolled back. Whether it returns would be a new decision. The type-directed transform stays deferred (§6).

## 5. Post-1.0.0: virtualized lists

**Owner direction, 2026-11-12:** plan a separate extension for drag and drop in virtualized lists. `yvirt` is a working name, not a decided API or architecture. The current `y()` does not support virtualized lists.

The future design covers moving a file into a folder while scrolling a virtualized file list, and reordering across the rendered window's boundary. It must consider stable item identity when DOM rows are removed or reused, and an operation that outlives its source row. Whether this needs a separate behavior, capability or adapter remains for that design. This work is not a prerequisite for 1.0.0 or for `DRD-49`.

## 6. Deferred: property selection by type

**Owner direction, 2026-11-13:** retain the idea of a build transform that takes an explicit set of internal types or classes, prefixes their property declarations and uses in the emitted code, then applies property mangling. Source names would stay readable without prefixes.

The transform must handle the same object being accessed through different structural types, and keep declarations, destructuring and property accesses consistent. Its scope, maintenance cost and measured benefit need evaluation before adoption. No delivery version or date is assigned. This work is not a prerequisite for step 3's source prefixes. **On 2026-11-13 the owner deferred property mangling as a whole** (`DRD-60`), so this transform has no step to follow, and stays deferred with it.