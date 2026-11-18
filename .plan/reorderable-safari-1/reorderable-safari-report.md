# The Safari landing stall in `useReorderable` — the reading

**Status: no failure caught in three dispatches.** The implementer ran the reading on 2026-11-18, on `repo/reorderable-safari-1`, under the accepted [plan](reorderable-safari-plan.md) and the owner's answers. It is about `repo:RF-36`, issue #44. The input was `8803c84fa`, merged with `origin/main` at `a133bebee` as `08f67c251`. The architect adjudicates the reading, and the main slot's architect records the dated amendment to `RF-36`.

Canonical entry: `RF-36` — in Safari, `useReorderable` intermittently keeps the landed visual in the top layer past its rows' wait ([`00-index.md`](../00-index.md)).

## What ran

- **Instruments**, in the test file only, as scratch commit `8ee3b0bdc`. Each landing of the three rows was traced, the two skipped rows were unskipped, and each of the three repeated 10 times (`repeats: 9`). The 1,000 ms wait was unchanged. Every landing logged one JSON line. A wait that gave up would have kept watching for 10 s more and then failed with the trace. The instruments covered every field of the plan's [reading](reorderable-safari-plan.md#the-reading): each mark from the gesture's start, frames with `document.timeline.currentTime`, the lateness of a 50 ms timer, visibility and focus, and the animation's state.
- **Workflow step**, as scratch commit `0a107f84e`. After `Safari projects`, `browser/core/safari (safari)` ran alone six more times, each in its own Vitest process, continuing after a failure. GitHub served the branch's workflow with the step (`gh workflow view --ref`) before the first dispatch. The step ran and succeeded in all three runs.
- **Before the first dispatch,** the instrumented file passed once in local Chromium and once in local WebKit, 47 of 47, with no timeout. Every landing tore down 216 to 234 ms after the gesture started ([local-instrumented.txt](checks/local-instrumented.txt)). So the instruments don't hold the landing themselves.
- **Three dispatches** of `safari.yml` on the branch, all at `0a107f84e`, on `macos-26` with macOS 26.7.2 (25G332) and Safari 27.2. Each ran the full Safari job and then `browser/core` six times: 7 × 30 landings per dispatch.

| Dispatch | Run | Started (UTC) | Result | Landings | Teardown, ms after the gesture's start | Largest frame gap | Worst timer lateness | Output |
| --- | --- | --- | --- | --: | --- | --: | --: | --- |
| 1 | 44282566548 | 10:08 | success | 210, all passed | 211–240, p50 218 | 39 ms | 29 ms | [dispatch-1](checks/dispatch-1-44282566548.txt) |
| 2 | 44285063425 | 10:24 | success | 210, all passed | 210–238, p50 218 | 28 ms | 15 ms | [dispatch-2](checks/dispatch-2-44285063425.txt) |
| 3 | 44287092259 | 10:37 | success | 210, all passed | 213–246, p50 218 | 62 ms | 15 ms | [dispatch-3](checks/dispatch-3-44287092259.txt) |

Each output file holds the run's summary and its landing lines in log order. The first 30 lines are the full job's `browser/core`, and the six isolated runs follow.

## What it reads

**No landing failed:** 630 landings in 21 `browser/core` runs, 3 inside the full Safari job and 18 alone. No row gave up its wait, so no trace matches any of the candidates A to E. The reading says nothing about what a failure is, only about what the passing landings were.

- **The landing-time distribution.** Teardown ran 210 to 246 ms after the gesture started, p50 218, p90 234, p99 236. It falls in two bands one frame apart: 386 landings in 210–219 ms, 21 in 220–229 ms, 221 in 230–239 ms and 2 at 240 ms or later. The three rows don't differ. The probe in the [findings report](../findings-1/findings-1-report.md) §3 read 216 to 256 ms on the same Safari version.
- **The sequence never varied.** In every landing the marks came in one order: `pointerdown`, `position fixed`, `toggle open`, `animate`, `pointerup`, `ue.pointer` returned, `finished`, and the teardown's change of `position`. The `animate()` call is marked before `pointerup` because the trait's listener on the host runs before the trace's, in the same dispatch.
  - `ue.pointer` returned at most 18 ms after the gesture began.
  - `finished` settled 203 to 245 ms after `animate()`, for a 200 ms animation.
  - Teardown followed `finished` within 5 ms in every landing.
  - In some lines the final `toggle closed` is missing: the event is queued after teardown, and the trace stopped first.
- **The page.** At the start of every landing the window was visible and focused. Frames came about 16.7 ms apart, and the largest gap in any landing was 62 ms: dispatch 3, _"restore inline styles"_, repeat 8, which tore down at 246 ms. The 50 ms timer ran at most 29 ms late.
- **Against the record's rate.** The record has about one failing run in six. If failures were independent of the run, 21 runs would all pass with a probability of about 0.02. The reading doesn't say why the rate differs. Possible reasons: the stall depends on a condition these runs didn't have, such as the runner's load, another image or an earlier project in a different order; or the instruments' frame loop and timer change the conditions. Nothing here tells these apart.

**Limits.** The instruments add a frame callback, a 50 ms interval, a `MutationObserver` and a wrapper of `Element.prototype.animate` while a landing runs. That they don't stall a landing is shown. That they don't prevent one is not. The isolated runs repeat `browser/core` on a runner that has just run the full job, not on a fresh one.

## What this unit keeps

On the owner's answer 2, the unskipped row _"should restore pre-existing inline styles on the target after landing"_ keeps a failure diagnostic. When the row's 1,000 ms wait gives up, its error message carries the landing's trace as JSON: the marks, the last `pointermove`, the page's state at the start and at the timeout, the animation's `playState`, `currentTime`, progress and duration, the frames, and the timer's lateness. A future weekly Safari failure then carries its trace.

- The diagnostic is in the test file only. The wait, the skips and `src/` don't change.
- It adds no output to a row that passes: in local Chromium and WebKit the file passes with no trace line. With the wait made unsatisfiable, the row fails with the trace in its message ([diagnostic-witness.txt](checks/diagnostic-witness.txt)).
- It needs a feature proof, as the plan's step 3 says.

The scratch commits are reverted, by `076087860` (the workflow step) and `89bd1addd` (the instruments). After them, the tree matches `08f67c251`.

## Next

The plan's [After the reading](reorderable-safari-plan.md#after-the-reading) applies for no failure in three dispatches. The reading is recorded with the landing-time distribution and the versions, `RF-36` stays open, and the two skips stay. The architect adjudicates, and the feature proof of the diagnostic follows.