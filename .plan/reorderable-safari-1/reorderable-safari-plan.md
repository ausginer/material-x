# The Safari landing stall in `useReorderable` — plan

**Status: accepted by the owner on 2026-11-18,** as relayed by the coordinator. His answers are in [Owner's answers](#owners-answers), and they change the implementation's dispatch step. No identifier is minted. Written by the architect on 2026-11-18 at `377ca72df` (`origin/main`), on `repo/reorderable-safari-1`, on the coordinator's task. It plans a reading that establishes `repo:RF-36`'s cause, and it doesn't decide the repair. The repair is decided on the reading, and the decision then gets its identifier. Until the answers, this line said _"proposed, for the owner"_.

Canonical entry: `RF-36` — in Safari, `useReorderable` intermittently keeps the landed visual in the top layer past its rows' wait ([`00-index.md`](../00-index.md)). Its required property, as amended on 2026-11-16: the rows pass in Safari in every run, with a wait that states the landing it covers.

## What the record already establishes

- **Three rows** in `packages/core/tests/traits/reorderable.browser.test.ts` fail the same way in Safari, in about one run in six to seven. Two are skipped in Safari (`it.skipIf`, lines 396 and 972). The third, _"should restore pre-existing inline styles on the target after landing"_, isn't skipped. Each drags the list's sole item 90 px, releases it, and waits up to 1,000 ms for the landing's teardown. Seven more rows in the file use the same wait.
- **The failures** gave up at 1,015 to 1,031 ms. In each, `teardown` hadn't run: the visual was still in the top layer, or still had the lift's `position: fixed`.
- **The landing.** A sole item proposes nothing, so `land()` animates the visual home with `animateTo('translate(0px, 0px)')` and runs `teardown` in its `finally` once `animation.finished` settles (`packages/core/src/traits/reorderable.ts:596`–`:654`). No commit grace applies, so the earlier _"at least 700 ms"_ inference is refuted.
- **The probe** ([findings report](../findings-1/findings-1-report.md) §3) timed 75 landings of the same gesture in Safari 27.2 on macOS 26.7.2. Each left the top layer 216 to 256 ms after the gesture began, and frames came 14 to 19 ms apart, with the window visible and focused. So a failure holds the visual about four times as long as the slowest landing read. **No failing landing has been observed with instruments.**
- **WebKit passes the rows** in both full runs of the CI-speed inventory ([inventory](../ci-speed-1/checks/webkit-inventory.txt) §C). The stall is particular to Safari, its driver or its runner, and not to the WebKit engine as Playwright ships it.
- **Real Safari runs only in `safari.yml`,** weekly and by dispatch, on `macos-26`. The last dispatched run took 11 min. Its `Safari projects` step took 9 min 39 s, and `browser/core` is about 14 s of that. A dispatched run opens no issue: only a scheduled failure does.

## What the reading must discriminate

The visual stays lifted because `teardown` hasn't run. Each candidate cause leaves a different trace at the moment the wait gives up:

| Candidate | Trace at the timeout |
| --- | --- |
| **A. The renderer or the timeline stalled** | frame callbacks stop arriving, or `document.timeline.currentTime` stops advancing; the animation is `running` with `currentTime` below its duration |
| **B. The release arrived late** | no `pointerup` on the host yet, or one long after `ue.pointer` returned; no landing animation started |
| **C. The animation ended, but `finished` settled late** | the animation is `finished` and its `currentTime` has reached its duration, but `teardown` hasn't run |
| **D. Page timers were starved, not frames** | frames arrive, but timer callbacks run late |
| **E. Something else holds the landing** | none of the above, for example a second `pointerdown` or a cancelled animation that didn't reach `finally` |

Each needs a different repair. A and D are conditions of the page under automation, and the repair is to how the rows wait. C is a Safari defect that a consumer would also see, so it would raise the tier by consequence. B and E point at the gesture or at core's code path.

## The reading

**Instruments, in the test file only.** `src/` doesn't change. For each landing in the three rows:

- timestamps from the gesture's start, by `performance.now()`: the host's `pointerdown`, its last `pointermove`, its `pointerup`, the return of `ue.pointer`, each `animate()` call on the visual (through a scratch wrapper of `Element.prototype.animate`), the animation's `finished`, the item's `toggle` events, and the change of `position` from `fixed`;
- during the wait, every frame callback's timestamp and `document.timeline.currentTime`, and the lateness of a 50 ms timer;
- `document.visibilityState` and `document.hasFocus()` at the start and at the timeout;
- at the timeout, the animation's `playState`, `currentTime` and computed progress.

**On a timeout, the row keeps watching** for up to 10 s, until `teardown` runs, and records when it ran and what came just before it: a frame after a gap, `finished`, a timer. Then it fails with that record. So each failure reads both the stall's length and what ended it.

**The rows run unskipped, and each repeats 10 times** in the run (Vitest's `repeats`), with the 1,000 ms wait unchanged. Every landing is logged, not only failures, so that the reading also gives the distribution of landing times. The log goes to the job's output as one JSON line per landing.

**The dispatches.** A scratch change on this branch adds one step to `safari.yml`, after `Safari projects`, that runs only the `browser/core` Safari project six more times. Each run is its own Vitest process, as `test-safari` runs it, and each continues after a failure. A dispatch with `--ref repo/reorderable-safari-1` runs the branch's copy of the workflow.

- **Each dispatch reads:** one full Safari job in today's project order, with the instrumented rows, which keeps the failing condition as the gate saw it; then `browser/core` six times alone, which shows whether the stall needs the earlier projects. That is about 14 min of a `macos-26` runner. The repository is public, so GitHub doesn't charge for the runner.
- **At most three dispatches,** one after another: 21 runs of `browser/core` and 630 landings of the three rows. At the record's rate of one failing run in six, three dispatches catch at least one failure with a probability of about 0.98, if a failure is independent of the run. The repeats make that likelier if the stall is per landing.
- **Stop early** when two failures with full traces are caught. Then the remaining dispatches aren't started.
- **The outputs** are saved in `.plan/reorderable-safari-1/checks/`, with each run's id, commit, macOS and Safari versions. The scratch workflow step and the scratch instrumentation are reverted on the branch after the last dispatch, so the branch's later pull request doesn't carry them.

## After the reading

The implementer reports, and the architect adjudicates. The main slot's architect records a dated amendment to `RF-36`. Then:

- **A or D:** the wait is the defect, not the landing. The repair is a decision about how a row waits in Safari, for example on the landing's own events with a bound that names the stall, and it is decided then. `drag:DRF-49` and `drag:DRF-50` are Safari stalls of the same kind, so the decision states whether it reaches them. Their reading is a separate unit.
- **C:** a Safari defect that a consumer also sees: the item stays lifted after a drop. The finding is re-tiered by consequence, and the repair to core's landing is decided then.
- **B or E:** the cause is in the gesture or in core's code path, and the repair is decided then.
- **No failure in three dispatches:** the reading is recorded, with the landing-time distribution and the versions. The entry stays open, and the two skips stay.

## Owner questions

1. **Up to three dispatches of `safari.yml` on `repo/reorderable-safari-1`,** each about 14 min, stopping early after two caught failures, and none in the gate? **The architect recommends yes.** The record holds no observation of a failing landing, and nothing else can give one.
2. **If no failure is caught:** keep a short failure diagnostic on the unskipped third row, so that a future weekly failure carries its trace, or keep the row as it is? **The architect recommends the diagnostic.** It is a few lines in the test file, and it turns the weekly run into the reading at no further cost.

## Owner's answers

Given on 2026-11-18 and relayed by the coordinator, translated.

1. **The dispatches:** yes, up to three dispatches of `safari.yml` on this branch, with no stop for the owner before each: _"You don't even need to ask. We need to detect what goes wrong."_ The limit of three and the early stop after two caught failures stand.
2. **If no failure is caught:** yes, keep the diagnostic on the unskipped third row.

## Implementation

1. **One implementer unit on `repo/reorderable-safari-1`.** It writes the instruments and the scratch workflow step as committed, pushed scratch commits. Then it dispatches `safari.yml` on the branch itself, one dispatch after another, with no stop for the owner before each: at most three, and none after two failures with full traces are caught. It reports each run's id to the coordinator. (Changed on the owner's answer 1. Until then, the implementer asked the coordinator for each dispatch, and the coordinator took it to the owner first.)
2. **Before the first dispatch,** one local Chromium run and one local WebKit run of the instrumented file pass with no timeout. That shows the instruments don't hold the landing themselves. The implementer also checks that a run of the branch's workflow ran the added step.
3. **After the last dispatch:** the scratch commits are reverted, the outputs are saved, and the report states which candidate each failure's trace matches, or that none was caught.
   - **If none was caught,** the unit keeps a short failure diagnostic on the unskipped third row, _"should restore pre-existing inline styles on the target after landing"_, on the owner's answer 2. When the row's wait gives up, its failure message carries the trace fields of [The reading](#the-reading) at that moment. The diagnostic lives in the test file only, it changes neither the wait nor the skips, and it adds no output to a row that passes. The diagnostic is the one committed change that this unit keeps, and it gets a feature proof.
4. **No repair in this unit.** `src/`, the rows' waits and the skips don't change.

## Proposed identifiers

None now. `RF-36` gets a dated amendment with the reading. A decision on the repair gets the next free `RD-` number when it is made, and a re-tier, if candidate C holds, is an amendment of `RF-36`.