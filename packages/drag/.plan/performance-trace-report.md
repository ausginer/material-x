# Performance trace report

**Input:** [`performance-trace-handoff.md`](performance-trace-handoff.md), carried by `067f59bb7`. **Governing records:** `DRD-46`, with `DRD-40` properties 4 and 7 and `DRD-45` property 9, in [`00-index.md`](00-index.md), and [`performance-plan.md`](performance-plan.md) §2 P1c. **Traced source:** `packages/drag/src` at `566ebfc65`, on `drag/performance`. Every line number below is that revision's.

**Outcome: complete, no return condition met.** The trace mode is committed, 20 traces are recorded and analysed, and five candidates are named for the architect. Three of them are decisions first. No production source changed, and no comparison, `--before`, `--prove`, `--floors` or timing campaign ran.

| Commit | Content |
| --- | --- |
| `743921de0` | Item 1: `compare.ts --trace` |
| the commit carrying this report | The traces, the bundle, the analysis script and its output, the probe, and this report |

**Read first:** [§Tracing changes what it measures](#tracing-changes-what-it-measures). The trace itself inflates the per-call cost of any code that requests a frame or invalidates style. Two functions that look like the move path's largest library costs are mostly that inflation, and neither is a candidate.

## Item 1: the trace mode

**Command line**, from `packages/drag`:

```sh
node bench/compare.ts --trace 566ebfc65 --out .plan/measurements/traces/2026-11-11
```

`--only <text>` selects scenarios by text, as it selects rows. `--dry` builds the arm, lists the selected scenarios and launches no browser.

**What it does.** For each selected scenario it records one cold trace and three warm traces, each in a new page from `openPage`. For each trace, in order:

1. the scenario's set-up, which is the mirrored row's mount (and for a press scenario, the move to (`X`, `Y0`) and 30 ms);
2. for a warm trace, one untraced pass of the same interaction, marks included;
3. an idle wait: two animation frames, then frames until no animation is pending or running, then two more frames;
4. the page's `lab.log` length, the rows' order and the lab bundle's script id, read outside the trace;
5. `browser.startTracing`, the interaction, `browser.stopTracing`;
6. the checks below, and the trace written gzip-compressed.

The interaction places a user-timing mark before each phase, each from its own `page.evaluate` between input commands. A move scenario marks `press`, `crossing`, `moves`, `release` and `end`. Its `release` phase runs the release and the idle wait, so it holds the landing. A press scenario marks `press i` and `release i` for each pair, then `idle` and `end`. Each input event is also in the trace as its `EventDispatch`.

**Reuse.** The mode builds the arm with `bundle` and `archivedSource`, as `--before` builds its arm: `src` at the named revision, this branch's `bench/lab.ts`, `__DEV__` false, unminified. It drives the page with `openPage`, `mount`, `movePhase`, `X` and `Y0`. Two shared helpers changed shape without changing behavior:

- `grabAndCross` is now `grab` then `cross`, with the same calls in the same order, so that a mark can sit between the press and the crossing.
- `samplingProfile`'s lab-script lookup is now `labScriptId`, which the trace mode also calls. The calls and their order are unchanged.

**Checks the mode makes.** A move scenario's traced pass must add exactly one `lab.log` entry. A press scenario's pairs must leave the rows' order unchanged. A page error while recording fails the trace. Any failure prints `RETURN` and exits non-zero. None occurred.

**Files.** Each trace is one `.json.gz` in Chrome's trace event format. The arm's bundle is saved once as [`bundle.js.txt`](measurements/traces/2026-11-11/bundle.js.txt). [`record.json`](measurements/traces/2026-11-11/record.json) holds the head and traced revisions, Chrome's version, the categories, the bundle's module markers and, per trace, the lab script id, the checks and the machine record before and after.

**Trace categories:** `-*`, `devtools.timeline`, `disabled-by-default-devtools.timeline`, `disabled-by-default-devtools.timeline.frame`, `disabled-by-default-devtools.timeline.stack`, `disabled-by-default-devtools.target-rundown`, `disabled-by-default-devtools.v8-source-rundown`, `disabled-by-default-devtools.v8-source-rundown-sources`, `disabled-by-default-v8.cpu_profiler`, `disabled-by-default-v8.cpu_profiler.hires`, `v8.execute`, `v8`, `cppgc`, `blink.user_timing`, `blink.console`, `latencyInfo` and `toplevel`. The source rundown lets DevTools show the inline bundle's source.

**Effective sample interval:** 152 to 159 µs, the median gap between main-thread samples within the interaction, per trace ([analysis](measurements/2026-11-11-trace-analysis.txt) §Checks). The `hires` category asks for 100 µs. So a function that runs for less than about 150 µs in one event is usually not sampled in it, and per-event figures come from many events, or from counted events.

### The bundle's module markers are incomplete

The handoff expects a sample's line to resolve to its module by the bundle's `// <path>` markers. **Two of the 29 modules in the bundle have no marker:** `sortable/rect-index.ts` and `sortable/keyboard.ts`. The bundler places their code in another module's region, so a marker lookup attributes `RectIndex`, for example, to `shared/landing.ts`. The analysis script therefore builds the same bundle again from `566ebfc65`, with `bundle`'s options plus a source map. It checks that the code equals `bundle.js.txt` apart from the markers' temporary paths, and maps every position through the map. The check holds.

`compare.ts`'s own `moduleAt` uses the markers. So `--profile` and the bytes rule's module keys have the same gap: a function in `rect-index.ts` or `keyboard.ts` is keyed under the module before it. No run in this unit used them, and this unit changes neither. **This is an instrument finding for the architect,** and it is not part of any candidate.

## Machine records

| Fact | Value |
| --- | --- |
| Head | `743921de0`, the trace mode's commit |
| Traced `src` | `566ebfc653db8fd87708261d7bd50f66a615b988` |
| Chrome | 157.0.8103.38, `/usr/local/bin/chrome`, headless |
| Node | v26.13.0 |
| CPUs | 12. 12th Gen Intel Core i7-1255U. `cpu_core` 0-3, `cpu_atom` 4-11 |
| One-minute load | 1.80 at the run's head, 2.50 at its foot. 1.78 to 2.28 at every trace's start and end |
| Hold | None (`DRD-46` property 2). Nothing else from this session ran while a browser recorded |

Each trace's own record, with all three load averages before and after and the time, is in `record.json`. The run's head and foot are in [`2026-11-11-trace-run.txt`](measurements/2026-11-11-trace-run.txt), written by the [record wrapper](measurements/2026-11-11-trace-record-wrapper.sh.txt). The 20 traces took 46 s.

## Verification

| Check | Result |
| --- | --- |
| `git diff --stat 067f59bb7..HEAD -- src tests bench/lab.ts bench/lab-no-lift.ts bench/lab-drag2.ts`, in `packages/drag` | Empty, at `743921de0` and at the report's commit |
| `--prove --dry` and `--floors --dry`, before and after the change | 9 and 14 applied, both times, with identical `applies:` lines: [prove before](measurements/2026-11-11-trace-prove-dry-before.txt), [prove after](measurements/2026-11-11-trace-prove-dry-after.txt), [floors before](measurements/2026-11-11-trace-floors-dry-before.txt), [floors after](measurements/2026-11-11-trace-floors-dry-after.txt). The "before" runs used `HEAD`'s `compare.ts` as an untracked copy, `bench/.compare-before.ts`, which was then removed, so their header says "with uncommitted changes" |
| The trace mode's dry run, `CHROME_EXECUTABLE=/nonexistent/chrome` | The five scenarios, a bundle of 2,336 lines, exit 0 ([output](measurements/2026-11-11-trace-dry.txt)). It also shows that `566ebfc65`'s `src` builds with this branch's `bench/lab.ts` |
| Each trace, read by a script | All 20 parse, have their phase marks (5 per move trace, 22 per press trace) and have samples on the page's main thread: 15,056 to 15,522 per move trace and 615 to 832 per press trace within the interaction ([analysis](measurements/2026-11-11-trace-analysis.txt) §Checks) |
| One trace per scenario in DevTools' Performance panel | **Not done.** This unit couldn't open DevTools, and a scratch install of DevTools' trace engine to parse the files headlessly was refused by the session's permission policy. **The owner checks this** |
| `compare.ts` | `fmt`, `lint-fix`, `fmt`, `lint` clean. `typecheck` of the package passes |
| Markdown | `oxfmt` on this report. Its links checked by a scratch script. `git diff --check` clean. No Markdown linter is configured |

**Return conditions, each checked:** every move trace's pass added exactly one `lab.log` entry and reordered at nine moves. No press trace changed the rows' order. No page error was recorded. `566ebfc65`'s `src` built. The mode needed no excluded change. The traces kept total 19.0 MB, under 30 MB.

## Item 3: attribution

All tables are in the [analysis output](measurements/2026-11-11-trace-analysis.txt), produced unedited by the [analysis script](measurements/2026-11-11-trace-analysis.ts.txt): `node 2026-11-11-trace-analysis.ts <trace directory> 566ebfc65`, run from the repository after renaming the file to `.ts`. The tables below are extracts. Each figure is **µs per event: the median of the three warm traces [their range] | the cold trace**.

### What each class means

The script keeps three kinds of figure apart, and each table names the kind of each row:

- **Counted:** durations and counts of trace events on the page's main thread. These are tasks (busy time), CDP command tasks, script entry points (`FunctionCall`), input dispatch, style, layout, paint, GC, hit tests and row animations started.
- **Sampled:** JavaScript time estimated from the CPU profiler's samples, each weighted by the gap to the next sample, at most 4 median gaps. A sample inside a counted style, layout, paint, GC or hit-test event, or inside a CDP task, belongs to that event and isn't counted again as script. A native callee's sample counts for its nearest script caller.
- **Derived:** the browser's share is busy time less the library's, the consumer's and the harness's, so it carries the sampling error of the first two.

The split the handoff asks for is:

- **library:** samples in `src/` or `box-quad` modules;
- **consumer:** samples in `bench/lab.ts`;
- **harness:** the CDP command tasks, which are the mark evaluations, the per-move frame wait and the idle wait, plus samples in Playwright's scripts;
- **browser:** the rest.

The counted **library entries** row is the library's script entry points. It includes the consumer callbacks it calls and the forced style and layout inside them, so it is an upper bound on the library's own time, and it isn't sampled.

**Where a figure rests on fewer than 20 samples, the analysis output says so on its row.** That applies to every per-phase library figure of a single event, such as a press, the crossing or the release, and to most single functions.

### Reordering moves, per phase

| Phase | Busy (counted) | Library (sampled) | Consumer (sampled) | Harness | Browser (derived) | Library entries (counted) |
| --- | --- | --- | --- | --- | --- | --- |
| **20 items** |  |  |  |  |  |  |
| Press | 1050 [798–1309] \| 3973 | 65 [27–86] \| 1067 † | 0 | 221 [171–226] \| 694 | 738 [562–1061] \| 2212 | 97 [83–111] \| 1152 |
| Crossing | 5886 [4383–11124] \| 10913 | 839 [414–1850] \| 3465 † | 0 | 2020 [1375–3209] \| 3113 | 3027 [2594–6065] \| 4335 | 1407 [979–3005] \| 4543 |
| Per move, 61 moves | 2423 [2377–3443] \| 3101 | 125 [111–200] \| 197 | 0 | 905 [902–1221] \| 1165 | 1393 [1365–2022] \| 1740 | 233 [222–354] \| 326 |
| Release and landing | 6023 [5774–6680] \| 6812 | 640 [503–835] \| 1750 † | 208 [148–234] \| 339 † | 1020 [909–1081] \| 934 | 4154 [3934–4811] \| 3789 | 1528 [1394–1651] \| 2748 |
| **2,000 items** |  |  |  |  |  |  |
| Press | 1872 [1298–3169] \| 3152 | 25 [0–63] \| 389 † | 0 | 216 [163–371] \| 502 | 1656 [1110–2735] \| 2261 | 89 [77–169] \| 499 |
| Crossing | 13958 [10849–18658] \| 20833 | 4466 [3657–6790] \| 6631 | 0 | 2435 [2169–2560] \| 2978 | 6932 [5023–9433] \| 11224 | 5152 [4237–7832] \| 7556 |
| Per move, 61 moves | 3623 [3267–4465] \| 3315 | 166 [142–224] \| 156 | 0 | 1028 [972–1216] \| 976 | 2429 [2153–3025] \| 2183 | 386 [303–440] \| 325 |
| Release and landing | 13268 [11656–20293] \| 17065 | 3319 [2537–4942] \| 5852 | 290 [225–422] \| 333 † | 1110 [1062–1323] \| 1110 | 8597 [7784–13606] \| 9770 | 5309 [4143–8039] \| 8186 |

† fewer than 20 samples in at least one warm trace.

**The browser's share is the largest in every phase,** and the harness's is next on the move path: about 830 to 950 µs per move of CDP tasks for the row's `page.evaluate(() => new Promise(requestAnimationFrame))`. On top of that, Playwright's drag listeners cost about 74 to 83 µs per move (counted): their `mouseListener` at 59 to 67 µs median and another function at about 15. Playwright installs them with each `mouse.move`. These are part of every CDP move row's script too, and the in-page rows avoid both.

The cold traces are slower mostly at the first events: the press is 3,973 µs against 1,050 at 20 items, and the library's entry point 1,152 µs against 97. Per move the cold and warm figures are close.

**At 2,000 items the press's hit test is 808 [586–1263] \| 892 µs** (counted), against 30 at 20 items. It is the browser's first hit test of the new list, because a move scenario's press includes the move onto the row. In a press scenario, where that move is in the set-up, the hit test is 4.6 µs per press.

### Which moves reorder, and what a reorder costs

In all eight move traces the moves that start row animations are i = 0, 7, 14, 21, 27, 34, 41, 47 and 54: nine reorders and 17 row animations. A move's window runs from the task of its `pointermove` to the next one's, so it holds the move's frame.

| Per move | Busy (counted) | Library (sampled) | Library entries (counted) | Style (counted) | Layout (counted) | Paint (counted) |
| --- | --- | --- | --- | --- | --- | --- |
| 20 items, reordering (9) | 3159 [2931–4551] \| 4380 | 303 [248–509] \| 599 | 414 [357–654] \| 737 | 300 [267–429] \| 372 | 117 [105–168] \| 152 | 584 [502–810] \| 753 |
| 20 items, not reordering (52) | 2289 [2273–3235] \| 2868 | 95 [87–147] \| 127 | 202 [199–302] \| 255 | 163 [159–237] \| 186 | 21 [19–29] \| 24 | 297 [296–438] \| 370 |
| 2,000 items, reordering (9) | 6583 [5308–6940] \| 5426 | 455 [314–470] \| 427 | 722 [508–838] \| 651 | 641 [528–707] \| 536 | 1198 [897–1226] \| 858 | 1955 [1532–2169] \| 1525 |
| 2,000 items, not reordering (52) | 3092 [2908–4026] \| 2942 | 116 [113–182] \| 109 | 308 [267–391] \| 269 | 259 [229–338] \| 184 | 195 [156–264] \| 184 | 560 [534–769] \| 535 |

**A reordering move costs about 870 µs more busy time than a move that doesn't at 20 items, and about 3,500 µs more at 2,000.** Most of it is the browser's: paint, layout and style. The library's sampled share rises by about 210 µs at 20 items and 340 at 2,000. Without stack capture or the profiler, a reordering move's library entries are 416 [394–424] µs and a non-reordering move's are 124 [121–158] µs at 20 items, so the reorder adds about 290 µs of library-entered work ([probe](#tracing-changes-what-it-measures)).

Within a reordering move, the largest sampled library costs are `sortable/layout-animation.ts:report`, lines 74–117, at 100 [61–204] µs (20 items) and 159 [95–169] µs (2,000), and `sortable/placement.ts:movePlaceholder`, lines 75–94, at 109 [88–123] and 105 [102–134]. Each rests on fewer than 20 samples per trace. `report`'s hottest line is 99, its `element.animate(...)`, which runs once per displaced row. `movePlaceholder` is one DOM move.

At 2,000 items, each row animation's end is followed by an `InvalidateLayout` and a 0.85 to 1.2 ms layout of all 4,006 layout objects, with no script on the stack (seen in `moves-2000-warm1`). The trace doesn't show why a `translate` animation's end invalidates layout. **That attribution is uncertain,** and it isn't a candidate.

### The library's top functions per move

Sampled self time, µs per move:

| Function at `566ebfc65` | 20 items | Samples, warm \| cold | 2,000 items | Samples, warm \| cold |
| --- | --- | --- | --- | --- |
| `lift.ts:translate`, lines 290–294 | 45.6 [38.7–63.1] \| 53.6 | 83/92/91 \| 94 | 45.6 [39.9–71.9] \| 43.3 | 84/100/85 \| 82 |
| `shared/invalidation.ts:schedule`, lines 29–33 | 38.0 [36.2–54.9] \| 44.4 | 72/82/72 \| 74 | 47.9 [41.2–60.3] \| 37.6 | 82/78/76 \| 73 |
| `sortable/layout-animation.ts:report`, lines 74–117 | 14.8 [9.0–30.1] \| 35.4 | 8/16/9 \| 17 † | 23.5 [14.0–25.0] \| 19.7 | 13/13/10 \| 12 † |
| `sortable/placement.ts:movePlaceholder`, lines 75–94 | 16.0 [13.0–18.1] \| 11.1 | 14/14/12 \| 10 † | 15.6 [15.1–19.8] \| 13.6 | 13/15/13 \| 12 † |
| `sortable/y.ts:resolve`, lines 33–71 | 0.0 [0.0–0.8] \| 6.1 | 0/0/1 \| 4 † | 12.6 [10.5–21.3] \| 12.5 | 10/17/13 \| 8 † |
| `kernel/session.ts:handleEvent`, lines 309–357 | 3.5 [1.4–9.2] \| 9.6 | 3/6/1 \| 6 † | 4.5 [1.9–9.7] \| 5.9 | 1/6/3 \| 5 † |

**`translate` and `schedule` are mostly the trace's own cost.** `translate`'s hot line is 291, the `style.transform` write, and `schedule`'s is 31, `window.requestAnimationFrame(fire)`. With `timeline.stack` on, Chrome captures a JavaScript stack at each style invalidation and each frame request. Without that category, `schedule` falls to 7.4 µs and `translate` to 22.1 µs per move ([below](#tracing-changes-what-it-measures)).

The library's script entry points per move (counted) are `kernel/session.ts:handleEvent`, lines 309–357, the `pointermove` listener, at 138 [134–203] \| 180 µs, and `shared/invalidation.ts:fire`, lines 23–26, the frame callback, at 95 [88–151] \| 146 µs, at 20 items. At 2,000 items they are 168 [150–217] \| 150 and 218 [153–223] \| 175.

### Forced style and layout

Each style or layout event that carries the stack of the script that forced it, with the line that forced it (counted). Per-event counts and µs are in the analysis output. Per occurrence:

| Phase | Forced at | Function | 20 items | 2,000 items |
| --- | --- | --- | --- | --- |
| Crossing | `lift.ts:179` `visual.showPopover()` | `showKeepingFocus` | style, 214 µs | style, 230 µs |
| Crossing | `sortable/rect-index.ts:127` `getBoundingClientRect()` | `refresh` | style, 141 µs | style, 180 µs |
| First committed move | `sortable/linear-shift.ts:148` `getBoundingClientRect()` | `moved` | style and layout, about 120 and 100 µs, once per operation | style 545 µs and layout 1,959 µs, once per operation (`moves-2000-warm1`) |
| Frame after each reorder, 9 per trace | `sortable/rect-index.ts:183` `placeholder.getBoundingClientRect()` | `remeasurePlaceholder` | style, 121 to 898 µs, most near 200 | style, 295 to 1,479 µs, most near 420 |
| Release | `bench/lab.ts:63` `list.insertBefore(item, next)` | consumer's `onReorder` | style, 119 µs | style, 126 µs |
| Release | `sortable/operation.ts:265` `placeholder.getBoundingClientRect()` | `#landingTarget` | style 53 µs, layout 45 µs | style 72 µs, layout 108 µs |
| Release | `shared/landing.ts:95` `getComputedStyle(visual).position` | `startLandingAnimation` | style, 104 µs | style, 163 µs |
| Release | `kernel/session.ts:50` `focused.focus(...)` | `restoreFocus` | style ×2, 85 µs; layout 79 µs | style ×2, 113 µs; layout 828 µs |
| Release | the idle wait's evaluation | harness | style ×4, 330 µs | style ×4, 848 µs |

**No press scenario forces style or layout,** at the press or at the release.

In the frames checked (`moves-2000-warm1`), a forced style or layout during a reorder or a release doesn't make the frame recalculate again: the frame's own pass is small or absent after it. So each one moves work earlier rather than doubling it. The exception is the release's sequence, which forces style four times and layout twice in one task, because writes come between the reads. `restoreFocus`'s 828 µs layout at 2,000 items is the list's one relayout after the placeholder's removal (`InvalidateLayout` from `sortable/behavior.ts:187–189`). No second large layout follows it.

### Presses

Per press and per release, all at 10 pairs per trace:

| Scenario | Press, busy (counted) | Press, library entries (counted) | Press, consumer (sampled) | Release, busy (counted) | Release, library entries (counted) |
| --- | --- | --- | --- | --- | --- |
| 2,000 items, `[...root.children]` | 1406 [927–1738] \| 1472 | 740 [502–875] \| 773 | 626 [425–747] \| 522, 29/40/46 \| 35 samples | 750 [513–950] \| 657 | 65 [53–74] \| 73 |
| 2,000 items, cached array | 688 [577–863] \| 1991 | 89 [79–104] \| 321 | 0 | 782 [649–929] \| 1996 | 71 [62–81] \| 166 |
| 20 items, cached array | 777 [668–980] \| 773 | 90 [84–114] \| 158 | 0 | 832 [724–1032] \| 739 | 77 [73–91] \| 94 |

Each press and each release also carries 280 to 314 µs of harness CDP task, which is its mark's evaluation.

**The press against the release.** With the cached array, the library's press entry point is 89 to 90 µs at both sizes and its release is 71 to 77 µs. So the library's own press work doesn't grow with the item count. Its hottest sampled function is `kernel/session.ts:Session`, lines 170–248, at 12 to 16 µs per press, and the release's is `kernel/session.ts:#endPending`, lines 398–403, at 15 to 22 µs, all on fewer than 20 samples.

**The consumer's `items()` against the library's own work at the press.** With `[...root.children]` at 2,000 items:

- the consumer's `items()` is 626 µs per press, sampled. That is `bench/lab.ts:sortable.items`, lines 56–60, at 427 [303–542] µs, and its `filter` callback, line 58, at 199 [123–204] µs, which rests on fewer than 20 samples;
- the library's entry point is 740 µs, so the library's own share is about 114 µs (derived), against 89 with the cached array;
- GC is 38 [37–50] µs per press (counted), against none with the cached array.

The library calls `items()` at every admission: `sortable/behavior.ts:#admission`, lines 244–285, calls `#pull`, lines 234–237. A press below the threshold never uses the array beyond finding the pressed item. This is `DRO-1`'s pull. It is consistent with the 385 to 472 µs per press by which B1 and B2 found this row slower than drag2, which is inferred and not measured here.

### The drop

At the release, `sortable/operation.ts:drop`, lines 103–137, calls `this.#behavior.axis.invalidate()` at line 109 before it resolves the release position. The next `resolve` therefore runs `sortable/rect-index.ts:refresh`, lines 97–157, which calls `getBoundingClientRect()` on every row at line 127. The sample stacks are `refresh` < `linear-shift.ts:refresh` < `y.ts:resolve` < `operation.ts:drop` < `session.ts:#drop`.

| Trace | Library's `pointerup` entry, µs (counted) | Span to the first event `onReorder` causes, µs (counted) | `refresh` within it, µs (sampled) | Samples |
| --- | --- | --- | --- | --- |
| `moves-20` cold, warm 1–3 | 2641, 1562, 1428, 1324 | 672, 208, 165, 163 | 0 | 0 |
| `moves-2000` cold, warm 1–3 | 8015, 5233, 4082, 7921 | 4240, 2742, 2212, 4158 | 3120, 2467, 2097, 3805 | 20, 16, 14, 24 |

In `moves-2000-warm1`, no layout runs in that span: the rows' layout is clean, and the cost is the 2,000 calls and their rects. The other traces weren't checked for this.

### Tracing changes what it measures

The traces need `timeline.stack` for the forced style and layout stacks, and the CPU profiler for samples. Both have a cost. A probe measured it on the 20-item move scenario only, with the same mode from an untracked copy of `compare.ts`:

- probe A without `disabled-by-default-devtools.timeline.stack`;
- probe B also without both CPU-profiler categories.

The [diff](measurements/2026-11-11-trace-probe-categories.diff.txt), the runs ([A](measurements/2026-11-11-trace-probe-no-stack-run.txt), [B](measurements/2026-11-11-trace-probe-no-stack-no-profiler-run.txt)), the analyses ([A](measurements/2026-11-11-trace-probe-no-stack-analysis.txt), [B](measurements/2026-11-11-trace-probe-no-stack-no-profiler-analysis.txt)) and the traces under `traces/2026-11-11/probe-no-stack/` and `probe-no-stack-no-profiler/` are kept. Their run logs name the scratch directory the traces were first written to.

| 20 items, µs per move | Full categories | A: no stack capture | B: no stack capture, no profiler |
| --- | --- | --- | --- |
| Library entries, all moves (counted) | 233 [222–354] | 186 [158–225] | 168 [165–193] |
| Library entries, reordering moves (counted) | 414 [357–654] | 403 [353–420] | 416 [394–424] |
| Library entries, moves that don't reorder (counted) | 202 [199–302] | 149 [125–191] | 124 [121–158] |
| `session.ts:handleEvent` entry (counted) | 138 [134–203] | 94 [79–113] | 76 [74–98] |
| `invalidation.ts:schedule` self (sampled) | 38.0 [36.2–54.9] | 7.4 [4.2–11.3] † | — |
| `lift.ts:translate` self (sampled) | 45.6 [38.7–63.1] | 22.1 [6.2–22.4] † | — |

**So in the full traces, a function that requests a frame or writes a style carries roughly 20 to 30 µs per call of stack capture,** and the profiler adds about 20 µs more per move to the entry points. The reordering moves' extra library work, about 290 µs, holds in all three. Absolute figures in the full traces are upper bounds; their ranking of large costs holds, and the per-call costs of `schedule` and `translate` don't. The release phase's busy time varied more in the probes (4,329 to 11,575 µs) than in the main run, and none of this report's conclusions rests on it.

## Item 4: candidates

`DRD-46` property 7's fields for each. Ranked by expected saving per interaction, all **estimated** from the traces. Each saving is per traced interaction: one 61-move drag, or one press.

### 1. Lazy row measurement at activation, at 2,000 items — a decision first

| Field | Value |
| --- | --- |
| Site | `sortable/rect-index.ts:refresh`, lines 97–157, its loop at lines 120–138 and `getBoundingClientRect()` at line 127, called through `sortable/linear-shift.ts:refresh`, lines 88–119, from `sortable/y.ts:resolve`, lines 33–71 |
| Scenario and phase | Reordering moves, 2,000 items, the crossing: the activation's first resolution |
| How often | Once per operation, measuring every row but the dragged one |
| Cost per event | `rect-index.ts:refresh` 2,650 [1,932–5,192] \| 3,066 µs, and 784 [319–867] \| 159 µs sampled at `linear-shift.ts:111`, where V8 inlines the call. 12/17/33 \| 17 and 6/5/2 \| 1 samples, so both rest on fewer than 20 samples in some traces. At 20 items, too small to sample |
| Avoidable work | The first resolution needs the row nearest the pointer, but it measures all 1,999 rows. In a column whose centers are ordered, a search could measure about 11 |
| Why behavior doesn't change | The nearest center and its gap are the same, if the centers are ordered along the flow. The `y` rule's stated terms, one column with no wrapping, imply that order; the architect confirms it. `column-reverse` orders them the other way |
| Expected saving | Most of about 3 ms per drag at 2,000 items. Estimated, and the least certain in this list, because the cache's other users would change too |
| Confirming rows | "50 activate-and-drop cycles, 2000 items, no landing" and "… with landing"; "300 moves, one frame each, 2000 items" and its in-page mirror, because `moved()` and `settle` read the same cache |
| Touches | **A design change first.** It replaces the axis cache's model: every slot measured, spans shifted by `moved()`, and `displacement.settle` over all slots. No recorded decision names that model, but `DRD-33` choice 9 fixes `RectIndex`'s form. It interacts with candidate 2 |

### 2. The drop re-measures every row

| Field | Value |
| --- | --- |
| Site | `sortable/operation.ts:drop`, lines 103–137: `this.#behavior.axis.invalidate()` at line 109, before `resolve` at lines 112–114. The cost lands in `sortable/rect-index.ts:refresh`, lines 97–157 |
| Scenario and phase | Reordering moves, the release |
| How often | Once per pointer drop |
| Cost per event | At 2,000 items: the span from the `pointerup` entry point to `onReorder` is 2,742 [2,212–4,158] \| 4,240 µs (counted), of which `refresh` is 2,467 [2,097–3,805] \| 3,120 µs (sampled, 16/14/24 \| 20 samples). At 20 items the whole span is 165 [163–208] \| 672 µs, with no `refresh` sample |
| Avoidable work | Measuring rows the index already holds. Between the last frame and the release, the cache is kept true by `moved()`, by the scroll and resize staleness flags, and by the controller's `invalidate()`. Every frame's resolution relies on it already |
| Why behavior doesn't change | Resolving at the release position needs the pointer, not new geometry. When nothing marked the cache stale, the drop reads the rects it would have measured. When something did, the staleness flag still makes it measure. **Uncertain:** no recorded decision explains the unconditional `invalidate()`, and the architect should confirm that it guards no case the contract admits. A geometry change between frames with no signal is the obvious one, and `drag:DRI-14`'s consistency rules put an unsignalled collection change outside the contract |
| Expected saving | About 2.1 to 2.5 ms per drop at 2,000 items, and tens of µs at 20. Estimated from the sampled `refresh` |
| Confirming rows | "50 activate-and-drop cycles, 2000 items, no landing" and "… with landing", which drop once per cycle; "in the page: 50 activate-and-drop cycles, 20 items, no landing" for the small list |
| Touches | `DRD-40` property 7: no ownership moves. If the architect finds the re-measure is a correctness guarantee, it is a contract decision first |

### 3. The frame's nearest-center scan, at 2,000 items

| Field | Value |
| --- | --- |
| Site | `sortable/y.ts:resolve`, lines 33–71, the loop at lines 52–59 |
| Scenario and phase | Reordering moves, 2,000 items, each move's frame |
| How often | Once per frame with movement: 61 per traced drag, 300 per row |
| Cost per event | 12.6 [10.5–21.3] \| 12.5 µs per move, sampled, on 10/17/13 \| 8 samples, so fewer than 20. Its hottest lines are 52 and 55. At 20 items, 0 [0–0.8] \| 6.1 |
| Avoidable work | A scan of all 1,999 centers to find the nearest one |
| Why behavior doesn't change | A binary search over ordered centers finds the same center, if it keeps the placeholder's center as the incumbent and the strict `<` that breaks ties toward it. It rests on the same ordering as candidate 1, and the architect confirms it |
| Expected saving | About 10 µs per move at 2,000 items: about 0.6 ms per traced drag, and 3 ms per 300-move row. Estimated, on fewer than 20 samples |
| Confirming rows | "300 moves, one frame each, 2000 items" and "in the page: 300 moves, one frame each, 2000 items" |
| Touches | No decision moves, if the architect agrees that the `y` rule's terms imply ordered centers |

### 4. The pull at a press — a decision first

| Field | Value |
| --- | --- |
| Site | `sortable/behavior.ts:#admission`, lines 244–285, which calls `#pull`, lines 234–237, and so the consumer's `items()` |
| Scenario and phase | Press and release, 2,000 items, `[...root.children]`, each press |
| How often | Once per press, whether or not it activates |
| Cost per event | The consumer's `items()` at 626 [425–747] \| 522 µs per press (sampled, 29/40/46 \| 35 samples), and GC at 38 [37–50] \| 154 µs (counted). The library's own press work is about 114 µs (derived), against 89 with the cached array |
| Avoidable work | For a press below the threshold, the array is used only to find the pressed item |
| Why behavior doesn't change | **It changes.** Admission uses the array to decide whether the pressed node is an item, so a press would need another way to find its item, or a pull at activation. Either changes when and how often `items()` is called |
| Expected saving | Up to the consumer's `items()` per press below the threshold: about 0.63 ms here, nothing with the cached array. Estimated, and it depends on the consumer's `items()` |
| Confirming rows | "press and release below the threshold, 2000 items, [...root.children]"; the activation rows for their pull |
| Touches | **`DRO-1`'s pull at a press, a decision first** (`DRD-40` property 7), and [`architecture-plan.md`](architecture-plan.md) guarantee 10: `items()` is pulled at each admission |

### 5. The landing's computed-position read — a decision first

| Field | Value |
| --- | --- |
| Site | `shared/landing.ts:startLandingAnimation`, lines 60–106: `window.getComputedStyle(visual).position` at line 95 |
| Scenario and phase | Reordering moves, the release with its landing |
| How often | Once per landing |
| Cost per event | A forced style recalculation of 104 [80–104] \| 102 µs at 20 items and 163 [114–259] \| 182 µs at 2,000 (counted) |
| Avoidable work | Possibly one of the four style recalculations in the release task. It runs after the flight's `animate` and before `restoreFocus` forces style again. The visual's computed `position` could be read when style is clean, at the lift's acquisition |
| Why behavior doesn't change | Only if nothing changes the visual's `position` during the drag. **Uncertain:** the later recalculation at `restoreFocus` may grow by what this one saves |
| Expected saving | At most 0.1 to 0.16 ms per landing. Estimated, and uncertain |
| Confirming rows | "50 activate-and-drop cycles, 20 items, with landing" and "… 2000 items, with landing" |
| Touches | **A decision first:** the landing would receive a value the lift owns, through `Landing`'s published slot interface (`DRD-33` choice 8) |

### Costs listed apart, which aren't candidates

- **The browser's, which the library can't change:** paint, layout and style in every frame; the layout after each reorder at 2,000 items, about 1.2 ms; the press's first hit test at 2,000 items, 808 µs; the layout after each row animation ends at 2,000 items, whose cause is uncertain; and `restoreFocus`'s relayout, which happens once after the DOM change.
- **The consumer's:** `items()` at 626 µs per press with `[...root.children]` (reachable only through candidate 4), and `onReorder`'s `insertBefore`, at 208 to 290 µs sampled plus a 119 to 126 µs forced style.
- **The harness's:** the per-move frame wait's CDP task, 830 to 950 µs; Playwright's drag listeners per `mouse.move`, about 74 to 83 µs; the mark evaluations, about 300 µs per press and per release. Playwright's listeners are inside every CDP move row's measured window too. **That is an instrument finding** for the architect, beside the module markers above.
- **The library's feature cost:** one `element.animate` per displaced row in `layout-animation.ts:report` and one DOM move in `movePlaceholder` per reorder. The traces show no avoidable part of either.
- **No mechanism found:** the `pointermove` entry point's 76 µs per move without stack capture or profiler (probe B). Samples place about 37 µs of it in named functions, mostly `translate`'s style write. The rest isn't attributable at this sample interval.

**Scenarios with no library cost worth a candidate:** "press and release, 2,000 items, cached array" and "… 20 items, cached array". Their library work is about 90 µs per press and 70 to 77 µs per release at both sizes, and no single site in it rests on more than a few samples. At 20 items, the reordering-move scenario's only candidate-sized cost is the reorder's own work above.

## Limits

- **Sampling.** At 152 to 159 µs per sample, a single event's library share rests on a few samples. Every per-phase figure for a press, the crossing or the release is marked fewer than 20 samples in the analysis output. The ranking of candidates 1 to 3 rests on aggregates over many events or on counted spans.
- **Tracing cost.** See the probe. Per-call costs of code that schedules frames or writes styles are inflated, and the probe covers 20 items only.
- **Three warm traces** give a median and a range, not a distribution. The cold trace is one page's first interaction.
- **DevTools.** Not opened in this unit. The owner checks one trace per scenario.

## Files

| Path, under `measurements/` | Content |
| --- | --- |
| `traces/2026-11-11/*.json.gz` | The 20 traces |
| `traces/2026-11-11/bundle.js.txt`, `record.json` | The arm's bundle, and the per-trace record. Each `record.json` is raw output, kept as the mode wrote it, so `oxfmt --check` reports it, as it does the earlier raw JSON readings |
| `traces/2026-11-11/probe-no-stack/`, `probe-no-stack-no-profiler/` | The probe's traces, bundles and records, 4 traces each, 20 items only |
| `traces/2026-11-11/discarded-trial/` | **Discarded:** a trial of the trace mode before its commit, from the same code before formatting. It was used to develop the analysis script and is cited nowhere |
| `2026-11-11-trace-run.txt` | The run's output with its machine record |
| `2026-11-11-trace-analysis.ts.txt`, `2026-11-11-trace-analysis.txt` | The analysis script and its unedited output |
| `2026-11-11-trace-probe-*` | The probe's diff, runs and analyses |
| `2026-11-11-trace-*-dry*.txt` | The dry checks |
| `2026-11-11-trace-record-wrapper.sh.txt` | The machine-record wrapper |

## Next

The architect selects one candidate or none, and records the selection with its confirming rows (`DRD-46` property 8). The two instrument findings, the bundle's missing module markers and Playwright's drag listeners in the CDP move rows, go to the architect too. The owner checks one trace per scenario in DevTools. The candidate's unit needs `566ebfc65`'s `src` and this branch's record on one branch (handoff §After this unit).