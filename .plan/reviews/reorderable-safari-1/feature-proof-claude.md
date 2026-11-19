# The Safari landing reading and its diagnostic — feature proof

**Files were read at:** `bb87ffe88` (`repo/reorderable-safari-1`, a detached scratch worktree, clean), the head of pull request [#71](https://github.com/ausginer/material-x/pull/71). **Commits reviewed:** `8ee3b0bdc` and `0a107f84e` (the scratch commits), `076087860` and `89bd1addd` (their reverts), `171254dc2` (the diagnostic and its witness), `3cdc52d21` (the reading's report and outputs), and `bb87ffe88` (a merge of `main` at `bc7fe07d6`). **Records read at the same commit.**

**Governing records:** `repo:RF-36` in [`00-index.md`](../../00-index.md); the accepted [plan](../../reorderable-safari-1/reorderable-safari-plan.md), its _Owner's answers_ and _Implementation_ steps 2 to 4; the implementer's [report](../../reorderable-safari-1/reorderable-safari-report.md).

**Lens:** feature proof, on the coordinator's task. Each claim below is my own reading of the tree, of the dispatch runs' logs, or of a local probe, unless it says otherwise. Nothing is repaired, and no record is amended. Written on 2026-11-19.

**Verdict: the diagnostic does what the plan's step 3 requires, the reading's numbers match the run logs exactly, the scratch commits are fully reverted, both Safari skips stay, and nothing under `src/` changes. One design finding is routed to the architect. I found no defect against the plan.**

- **`reviewer-1`, Tier B if it holds, for the architect.** On a passing run, the diagnostic changes no result and adds no output. But it runs the reading's active instruments during every landing of the only unskipped row: a frame loop, a 50 ms timer and a patch of `Element.prototype.animate`. The reading couldn't exclude that these instruments prevent the stall, and it caught none in 630 landings, against the record's rate of about one failing run in six. If they prevent it, the weekly Safari run can't show the stall in that row any more, and the diagnostic never fires. This isn't established.
- **No Tier A defect, and no Tier C defect.**

## Claims checked

1. **The diagnostic fails the row with the landing's trace when its wait gives up (`171254dc2`).** **Confirmed, in Chromium and WebKit.**
   - The row creates `traceLanding(list, item)` before `ue.pointer` and disposes it in a `finally`. Only the `vi.waitFor` on `item.style.position` is wrapped. On rejection, the row throws `The landing didn't tear down: <trace JSON>`, with the original assertion error as `cause`.
   - **A real stall** (my probe): after `ue.pointer` returns, the row pauses `item.getAnimations()`, so `teardown` never runs. In both engines the row fails at about 1,003 ms. The message carries the marks up to `ue.pointer returned` with no `finished`, `"playState":"paused"`, `currentTime` 0, progress 0, duration 200, the frames with `document.timeline.currentTime`, and the timer's lateness. Vitest prints `Caused by: … expected 'fixed' to be 'relative'` ([`checks/diagnostic-probes.txt`](checks/diagnostic-probes.txt)).
   - **The implementer's witness,** a wait for an unreachable `position`, repeated: the row fails with the trace in Chromium, as in [`diagnostic-witness.txt`](../../reorderable-safari-1/checks/diagnostic-witness.txt), and also in WebKit. So the patch of `Element.prototype.animate` works in WebKit too. The animation reads `finished`, and the marks include `finished` and `position relative`.
   - In each failing probe, the other 46 rows of the file pass. So `dispose()` restores `Element.prototype.animate` and stops the frame loop and the timer after a failure.
   - **Every trace field of the plan's [reading](../../reorderable-safari-1/reorderable-safari-plan.md#the-reading) is in the message:** the host's `pointerdown`, last `pointermove` and `pointerup`, the return of `ue.pointer`, each `animate()` call on the item and its `finished` or `finished rejected`, the `toggle` events, the changes of inline `position`, the frames, the 50 ms timer's lateness, visibility and focus at the start and at the timeout, and the animation's `playState`, `currentTime`, progress and duration. The plan's 10 s watch after a timeout isn't kept. Step 3 asks for the trace _"at that moment"_, so this is within the plan.
2. **The diagnostic changes nothing on a passing run.** **Confirmed for results and output, with `reviewer-1` on the page's activity.**
   - At `bb87ffe88`, the file passes 47 of 47 in local Chromium and WebKit, and no line of either run carries the trace ([`checks/diagnostic-probes.txt`](checks/diagnostic-probes.txt)).
   - The row's assertions are unchanged: the same `vi.waitFor` with `timeout: 1000` and the default interval, then the same `transform` check. The file has ten `timeout: 1000` waits before and after the change. The `skipIf` lines are identical to `main`'s.
   - The trace is created and its frame loop, timer, `MutationObserver` and patch run in every run, not only in a failing one (`reviewer-1`).
   - The `static` job of `verify` run 44446920794 passed at `bb87ffe88`: `fmt-check`, `lint`, `typecheck` and `typecheck-declarations`. I didn't run them myself.
3. **The reading's report (`3cdc52d21`): three dispatches, 630 landings, none stalled.** **Confirmed as written.**
   - **The runs:** 44282566548, 44285063425 and 44287092259 are `workflow_dispatch` runs of `safari` on `repo/reorderable-safari-1` at `0a107f84e`. They were created at 10:08:40, 10:24:11 and 10:37:03 UTC on 2026-11-18, and each concluded `success`. Each job ran `browser/core six times` with success. In each log, every isolated run printed `exited with 0`. The `issue` job was skipped.
   - **The versions:** each log's `macOS and Safari versions` step prints `26.7.2`, `25G332` and `27.2`.
   - **The saved outputs match the logs:** I took every `RF-36 landing {…}` line from each run's log, in order, and compared it, parsed, with the saved file's JSON lines. All 210 lines of each dispatch are identical. Each file holds 30 lines from the full job's `browser/core` and 30 from each of the six isolated runs, every result `passed` and every browser `safari` ([`checks/reading-regenerated.txt`](checks/reading-regenerated.txt)).
   - **Every number in the report's table and its _What it reads_ recomputes exactly:** teardown 211–240, 210–238 and 213–246 ms, p50 218 in each; the largest frame gaps 39, 28 and 62 ms; the worst timer lateness 29, 15 and 15 ms; over all 630, 210–246 ms with p50 218, p90 234 and p99 236; the bands 386, 21, 221 and 2; `ue.pointer` returned at most 18 ms in; `finished` 203 to 245 ms after `animate()`; teardown at most 5 ms after `finished`; every landing visible and focused at its start; no `finished rejected`. The 62 ms gap is dispatch 3, _"restore inline styles"_, repeat 8, teardown at 246 ms.
   - **The sequence:** with `toggle closed` left out, all 630 landings have one order of marks. The teardown's mark is `position (none)` in the two rows without an inline position and `position relative` in the third. `toggle closed` is missing in 5 lines.
   - **The local runs before the first dispatch** ([`local-instrumented.txt`](../../reorderable-safari-1/checks/local-instrumented.txt)): 47 of 47 in each engine, 60 landings, all passed, teardown 216.4 to 234.5 ms. The report gives 216 to 234 ms.
4. **The scratch commits are fully reverted.** **Confirmed.**
   - `076087860` is the exact inverse of `0a107f84e`, and `89bd1addd` the exact inverse of `8ee3b0bdc`: each revert's diff, reversed, is identical to the scratch commit's diff.
   - `git diff 08f67c251 89bd1addd` is empty, so the tree after the reverts is the tree before the scratch commits.
   - `.github/workflows/safari.yml` doesn't differ from `main` at `bb87ffe88`.
5. **Both Safari skips stay, and nothing under `src/` changes.** **Confirmed.**
   - `git diff origin/main bb87ffe88` (`main` at `bc7fe07d6`) touches nine files: the test file, the plan, the report, five outputs under `.plan/reorderable-safari-1/checks/` and two lines of `00-index.md`. None is under `src/` or `.github/`.
   - The two `it.skipIf(server.browser === 'safari')` rows keep their `RF-36` comments, and their bodies are unchanged.

**Not covered.** These areas are unread, which isn't the same as clean.

- I ran no Safari. My probes ran in local Chromium and WebKit. Whether the diagnostic changes the stall in Safari (`reviewer-1`) isn't read.
- `verify` run 44446920794 was still in progress when I wrote this: `system-deps (firefox)` hadn't finished. Only `scope`, `static`, and the `webkit` and `chromium` `system-deps` jobs had completed, all with success.
- I didn't review what the merge `bb87ffe88` brought from `main`. I checked only that the diff to `main` is the pull request's nine files.
- I didn't run `oxfmt`, `oxlint`, ESLint or `tsc` on the test file. CI's `static` job passed them.

## Findings

### reviewer-1 — Tier B if it holds: the diagnostic runs the reading's active instruments during every landing of the only unskipped row, and the reading couldn't exclude that they prevent the stall

- **Observed:**
  - `traceLanding` starts, before `ue.pointer`, a `requestAnimationFrame` loop that requests every frame, a 50 ms `setInterval`, a `MutationObserver` on the item's `style`, and a replacement of `Element.prototype.animate` that also subscribes to the item's `finished`. They run until `dispose()`, after the wait. This happens in every run of the row, in every engine, passing or not (`packages/core/tests/traits/reorderable.browser.test.ts:85`–`:205`, `:1043`).
  - These are the scratch instruments' four active parts in `8ee3b0bdc` (its lines 125, 157, 163 and 172).
  - Under those instruments, no landing stalled in 630 landings and 21 `browser/core` runs. Before them, the third row failed uninstrumented in the gate (run 44030423689), and the record gives about one failing run in six.
- **What the records say:**
  - The report's _Limits_: _"That they don't stall a landing is shown. That they don't prevent one is not."_ It names the instruments as one possible reason why the rate differs, among others it can't tell apart.
  - The plan's step 3 requires that the diagnostic _"changes neither the wait nor the skips, and it adds no output to a row that passes"_. It says nothing about the page's activity during the landing. So the implementation meets the plan.
  - The report: _"A future weekly Safari failure then carries its trace."_
- **Consequence, if the instruments prevent the stall:** the third row is the one row through which `RD-12`'s weekly Safari run can show `RF-36`. That row would then pass in Safari for a reason other than a repair, and the diagnostic would never fire. `RF-36` would stay open on an instrument that can't show it. A pass of the weekly row would then not be evidence that the stall is gone.
- **What isn't established:** whether the instruments prevent the stall. The reading's runs also differ from the gate's failing runs in other ways that the report lists. A frame loop that requests every frame is the part most likely to change candidate A, a stalled renderer or timeline. That is an inference, not a reading.
- **Required property:** a run of the row with the diagnostic can show the stall under the conditions it would have without the diagnostic. Otherwise, `RF-36`'s record states that the diagnostic may prevent the stall, and a weekly pass of the row isn't read as evidence that it is gone.
- **Routed** to the architect. How the diagnostic may act on the page it observes is a decision about the plan's step 3, and the owner accepted that step. The implementer followed it as written.

## For `RF-36`'s amendment

These are observations for the architect's dated amendment, not findings.

- **The reading:** three dispatches, runs 44282566548, 44285063425 and 44287092259, all at `0a107f84e`, on macOS 26.7.2 (25G332) and Safari 27.2. 630 landings in 21 `browser/core` runs, 3 inside the full Safari job and 18 alone. None stalled. Teardown ran 210 to 246 ms after the gesture's start, p50 218, p90 234 and p99 236. The candidates A to E are unread. The numbers are confirmed against the logs above.
- **Two instrumented readings have caught no stall:** this reading's 630 landings and the findings unit's 75 ([findings report](../../findings-1/findings-1-report.md) §3). Every recorded failure came from an uninstrumented row. `reviewer-1` bears on this.
- **What the diagnostic reads:** the state at the 1,000 ms timeout only. It doesn't read how long a stall lasts or what ends it, which the reading's 10 s watch did.
- **What the diagnostic doesn't reach:** it covers only the wait after `ue.pointer` returns. If `ue.pointer` doesn't return, for example under candidate B or a stalled driver, the row fails at the test's timeout with no trace. Its `finally` then doesn't run, and the instruments stay installed for the file's later rows. This is outside the plan's _"when the row's wait gives up"_.
- **Where a weekly trace ends up:** in the failing job's log. The weekly issue carries only the run's link and the failing projects, so the trace is reached through that link, and it lasts only as long as GitHub keeps the run's log. The record would need to save it from there.