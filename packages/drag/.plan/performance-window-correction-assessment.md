# Performance window correction assessment

**Read:** [`performance-window-correction-report.md`](performance-window-correction-report.md) at `566d4d29e`, on `drag/performance`, by the architect on 2026-11-12. **Code read:** `8d002529a`, the unit's last code commit, against `6e505dacf`. **Governing records:** `DRD-50`, `DRD-49`, `DRD-44` property 6, `DRD-40` property 4 and `DRO-4`, in [`00-index.md`](00-index.md). CONTRIBUTING Part II §0 and §14.

**Outcome:** `DRD-50` conforms.

- A measurement settles a slot range of the cache's own buffer and element array, and allocates nothing for the sink.
- W7 and W8 pass in all three engines, and M7 and M8 each fail their witness in all three.
- The probe of `xy()`'s rebuild reads "no difference shown" in both cases, so the shared rebuild stays, and item 5 didn't apply.
- That reading doesn't bound a possible slowdown. §2 states what it shows, and corrects the report's wording.

The owner accepts the window's final bytes against `71f20df20`: +143 B Brotli on "sortable + y", +36 B on "sortable + xy" and +149 B on "complete". No budget changes.

**Next:** §4 recommends one bounded runtime task, an attribution probe of the layout that follows a row animation's end at 2,000 items. It doesn't start until the owner approves it. If it finds nothing the library controls, the runtime pass is ready to close.

## 1. Conformance of `DRD-50`

| Property | Checked | Result |
| --- | --- | --- |
| 1. Range settling | `git diff 6e505dacf 566d4d29e -- src` | Conforms. `settle(values, items, first, end)` loops from `first` to before `end`, and keeps the early return when nothing is in flight. `measure` passes `values`, `items`, `lo` and `hi`, with no view or copy. The confirmation and `linearShift`'s probe pass their one-slot scratch with `0, 1`, and allocate what they did before. `settle`'s documentation states the range and that nothing outside it is read or written. The type stays internal. `src/` doesn't change after `8d002529a` |
| 2. The probe | The probe's source, bundle, output and hold records | Conforms, with one deviation below. One page holds both classes, each arm has its own instance and sink, and the three arms pack the same values. The rounds are rotated, and every timed batch lasted at least 191.5 ms. The verdict code is `pairedVerdict`'s rule on unrounded values, which I checked against `compare.ts`. The medians, sign counts and bounds in the report recompute from the output |
| 3. One pass | — | Didn't apply. Neither case reads "slower" |
| 4. Witnesses | `tests/sortable.browser.test.ts` and the witness and mutation records | Conforms. W7 covers a `y()` drag with at least 3 measurement calls after slot 0, and an `xy()` rebuild. W8 fails under M8 on the settled geometry, before the gap or the development check. The existing tests pass |
| 5. Bytes | [the size record](measurements/2026-11-12-window-correction-size.txt) | Conforms. The `sortable` rows are 12, 15 and 6 B smaller than at `501f60ab7`, and the seven rows without `sortable` read 0. No ceiling moved |
| 6. What it doesn't change | The diff's file list | Conforms. Four source files, one test file, the report and `measurements/`. No `compare.ts` run, campaign, `--prove` or `--floors` |

**Item 1** is empty: `git diff --stat 501f60ab7 6e505dacf -- src tests` prints nothing.

**Accepted with their reasons:**

- **M7 as run.** It is `501f60ab7`'s view and copy, passed with the range `0, hi - lo`. The literal three-argument call would settle nothing against the new signature, so W7 couldn't show that it catches the copy. The mutation keeps what M7 is for.
- **W8's two corrections before any mutation result was accepted.** Both moved W8's failure under M8 onto the assertion that the handoff names. The outputs of the earlier runs were overwritten, so the record keeps only the final form's runs. No verdict depends on the lost outputs.
- **Three probe processes instead of one.** Attempt 0 failed before any browser started. Attempt 1 broke the 100 ms batch rule, and the unit reran it because of that rule and not because of the verdict. Attempt 1 read the same verdict in both cases. Both are kept.

**Also accepted:** the hold and its note about attempt 0's exit line, the machine record at the head and foot, the three-engine suite, the hot-path tests, and the size table.

## 2. What the probe shows

The per-round spread is as large as a rebuild. Within one round the arms differ by up to about 1.7 ms, against a `before` median of 2,384 µs with no sink and 2,061 µs with `layoutAnimation`. `DRD-50` inferred that the shared rebuild adds well under 1 %, about 20 µs. This probe can't resolve an effect that size.

**The A/A bound isn't a limit on a slowdown.** The bound is the largest absolute `control − production` difference in the run. The paired rule uses it as a threshold. It isn't a confidence limit, and it doesn't cap how much slower `production` could be:

- a slowdown smaller than the bound can't read "slower";
- a larger slowdown can also fail the rule, if the spread reverses its sign in two or more of the seven rounds;
- the bound is the largest of seven differences in one process, so another process gives another bound.

**What the reading shows.** The rule found no slowdown in either case. In both cases `production` was lower than `before` in 4 of 7 rounds, and the median difference is negative: −219.5 µs with no sink and −135.9 µs with the sink. Attempt 1, which isn't the reading, was also negative in both cases. Nothing in the data points to a slowdown. The data also can't rule out one smaller than the spread, which is several hundred µs.

**The correction.** The report's §Limits said that the reading "shows that `production` isn't slower by more than about a third of a rebuild". That treats the bound as a limit on the slowdown, and §Limits now states what the reading shows. The 650 µs and 807 µs in the report's tables stay as they are, as the rule's thresholds. `DRD-50`'s result records the same reading.

**Why the shared rebuild stays anyway.** `DRD-50` fixed the rule before the run: anything except "slower" keeps it. Its reads, the values they return and its settling are the same as `71f20df20`'s, and the work it adds is inferred to be small. That is still an inference.

**No tighter probe is recommended.** It would decide only whether to spend up to about 120 B on one pass, against an inferred 20 µs. A real rebuild after a move also pays a forced layout of about 1.2 ms at 2,000 items. Each layout in §4.2 costs about 50 times that inferred 20 µs. If the owner wants the inference measured, a probe that gives both arms a geometry source with fixed rects removes the `DOMRect` allocation and the layout from the timing, so the changed loops are all that is left to time. It isn't scheduled.

## 3. The bytes, accepted

| Row | At `71f20df20` (Brotli) | At `8d002529a` | Change | Ceiling | State |
| --- | --- | --- | --- | --- | --- |
| sortable + y | 6,578 B | 6,721 B | +143 B | 6,733 B | green, 12 B left |
| sortable + xy | 6,566 B | 6,602 B | +36 B | 6,617 B | green, 15 B left |
| complete | 7,207 B | 7,356 B | +149 B | 7,065 B | red, 291 B over, up from 142 B |

**The owner accepts these figures on 2026-11-12,** for about 2.3 to 2.5 ms less script per drag at 2,000 items (`DRD-49`'s confirmation). No budget changes. The +36 B on "sortable + xy" buys `xy()` no saving: it is `y()`'s window code in the class both axes share. Five rows are red at `8d002529a`, as at `501f60ab7`: "draggable alone", "example: drop zone", "freeDrag", "freeDrag + bounds + landing" and "complete". `DRO-4`'s size re-base stays open.

## 4. The next runtime task

### 4.1 The trace candidates

| Candidate | State |
| --- | --- |
| 2. The drop's re-measure | Done, `DRD-47` |
| 1. Lazy measurement at activation | Done, `DRD-49` |
| 3. Binary search per frame | Rejected under `DRD-49`. The window bounds the scan, and the saving was about 10 µs per move against a row bound of 22 µs |
| 4. The pull at a press | `DRO-1`'s pull, an owner decision first. The saving is the consumer's `items()`, and nothing with a cached array |
| 5. The landing's computed position | A decision first. At most 0.16 ms per landing, uncertain, and below the landing cycle rows' bounds |

None of these is a bounded runtime task now.

### 4.2 The layout after a row animation ends

The trace report listed this as the browser's cost, with an uncertain attribution, and named no candidate. I checked the saved traces again, at 2,000 items: [`traces/2026-11-11/moves-2000-warm1.json.gz`](measurements/traces/2026-11-11/moves-2000-warm1.json.gz) and its `warm2` and `warm3`.

The table counts layouts over 0.7 ms that follow an `InvalidateLayout` with no script stack and dirty 5 of the 4,006 layout objects.

| Trace | Layouts | Each | In all | Time from the last `Animation` end to the invalidation |
| --- | --- | --- | --- | --- |
| warm1 | 8 | 804 to 1,195 µs | 7.7 ms | 180 to 264 µs |
| warm2 | 7 | 857 to 2,345 µs | 11.9 ms | 163 to 542 µs |
| warm3 | 5 | 797 to 1,382 µs | 5.1 ms | 144 to 316 µs |

- **The timing.** Each of these layouts follows an animation's end by 144 to 542 µs, in all three traces. Each trace holds 19 animations, of which the report counts 17 as row animations.
- **The size.** Each layout dirties 5 objects. Even so, it lasts about as long as the layout after a reorder, about 1.2 ms. Per traced drag of 61 moves that is 5 to 12 ms of main-thread time. The library's whole script saving from `DRD-47` and `DRD-49` is about 2.5 ms per drag.
- **Not counted.** Each trace also has one or two stackless layouts that dirty 13 objects. Two of them come before any animation ends, so this class isn't attributed.
- **At 20 items** no layout lasts over 0.7 ms (`moves-20-warm1`).

**These are counted spans in traced runs.** The trace probe didn't measure what tracing adds to a layout. I didn't verify the mechanism.

**The hypothesis, not verified.** When an animation ends, the browser removes its effect, so the row's `translate` goes from `0 0` back to `none`. In Chromium, an element that gains or loses a transform-related property may change its paint layer and its containing block, which marks layout. The list's relayout then walks all its children, so the cost grows with the list. A form that the library controls may avoid this. For example, a row could end with the same rendering and nothing removed, or several rows' ends could share one frame. Whether any such form exists, and whether it renders the same, isn't known.

### 4.3 The recommendation

**Run one attribution probe of this layout, and change no production code yet.**

- **The runner:** Chromium, one process, under `DRD-44` property 6's hold, with `DRD-40` property 4's machine record. The runner starts from a scratch location, and its source and output are kept under `measurements/`.
- **The page:** a laid-out list of 2,000 rows like the lab's.
- **The variants:** one row animated with `layoutAnimation`'s keyframes and options, and variants that isolate the cause:
  - the same row with `translate: 0 0` authored, so nothing changes when the effect is removed;
  - a control animation of `opacity`;
  - the same change of `translate` as a plain style write.
- **The reading:** the count and duration of the layouts in the frame after the end, from trace events.

It changes no instrument and no row, and it isn't one of the deferred campaigns.

**What follows it:**

- **A form that avoids the layout with the same rendering:** the architect decides it as a candidate, with its confirming measurement, and an optimization unit implements it. A change that alters what a consumer sees, such as a lasting `translate` that creates a stacking context, is a contract decision first.
- **The cost is the browser's for any displacement animation:** it is listed as the browser's cost. The runtime pass is then ready to close, and P4 (the size pass) follows. Whether the README advises consumers on containing a long list's layout is a separate documentation decision.

**Ran on 2026-11-12:** [`animation-end-layout-probe.md`](animation-end-layout-probe.md). It corrects §4.2's hypothesis, finds no library-controlled alternative, and recommends closing the runtime pass.

**Not started when this assessment was written.** The owner decides whether it runs. The deferred instrument campaigns stay stopped: the page check, B3', the in-page floors, `--prove` and `--floors`. `DRD-45` property 9's repair is still owed before any `--prove` or `--floors`, and `DRF-21` stays open.

## 5. Limits

- **`xy()`'s rebuild is measured only to the probe's resolution** (§2). Its rebuild with rows in flight wasn't timed.
- **§4.2 rests on three traces of one scenario,** with tracing on and the mechanism not verified. The table's counts are mechanical. I checked them with a scratch script over the saved traces, which isn't kept.
- **`DRD-49`'s confirmation wasn't rerun.** Range settling removes work from `y()`'s path and adds none.