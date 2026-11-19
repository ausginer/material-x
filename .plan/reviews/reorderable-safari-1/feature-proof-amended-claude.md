# The amended landing diagnostic — narrowed feature proof

**Files were read at:** `cfed2376e` (`repo/reorderable-safari-1`, in a detached scratch worktree that was clean before the probes), the head of pull request [#71](https://github.com/ausginer/material-x/pull/71). **Commit reviewed:** `cfed2376e` (the amended diagnostic and its witness). The diff is read against `32f12bdcd`, and the row is compared with `main` at `32f12bdcd^2`. **Records read at the same commit.**

**Governing records:** the plan's [step 3](../../reorderable-safari-1/reorderable-safari-plan.md#implementation), as the architect amended it on 2026-11-19 at `ffb5d346f`, with its properties 1 to 5; `RF-36`'s amendment of that date in [`00-index.md`](../../00-index.md), which accepts `reviewer-1` of the [earlier feature proof](feature-proof-claude.md) at `63ba89b8f`.

**Lens:** narrowed feature proof, on the coordinator's task. Each claim below is my own reading of the tree or of a local probe, unless it says otherwise. Nothing is repaired, and no record is amended. Written on 2026-11-19.

**Scope:** properties 1 to 5 against the code at `cfed2376e`; the implementer's two witnesses in [`diagnostic-amended-witness.txt`](../../reorderable-safari-1/checks/diagnostic-amended-witness.txt); and whether the [report](../../reorderable-safari-1/reorderable-safari-report.md) that still describes the old diagnostic is a finding. **Not in scope:** the merge of `main` at `32f12bdcd`, the rest of the test file, and Safari. I ran no Safari, and the plan owes no Safari dispatch.

**Verdict: the amended diagnostic meets properties 1 to 5, and both witnesses reproduce in local Chromium and WebKit. Two Tier C findings remain. Neither changes what the row does or what a trace shows about candidates A to E. No Tier A or Tier B finding.**

- **`reviewer-2`, Tier C:** the report's _What this unit keeps_ still describes the diagnostic of `171254dc2` and doesn't name the supersession. Yes, this is a finding.
- **`reviewer-3`, Tier C:** `afterGiveUp.timelineAdvanced` reads the timeline only in the watch's frame callbacks. When no frame arrives during the watch, the field is `false` although the diagnostic didn't read the timeline after give-up.

## Properties checked

1. **Until the wait gives up, the diagnostic schedules no callback of its own.** **Confirmed by the code and by a probe.**
   - In `traceLanding` (`packages/core/tests/traits/reorderable.browser.test.ts:89`–`:238`), the only `requestAnimationFrame`, `setInterval` and `setTimeout` calls are in `watch()`, at `:192`, `:194`, `:197` and `:204`. The only promise reaction is to the item animation's `finished` (`:149`), which the plan allows. `poll()` (`:168`) only appends to an array.
   - `watch()` has one call site, the wait's `.catch` (`:1102`). The trace's other call sites are `mark` (`:1085`), `poll` in the wait's callback (`:1094`) and `dispose` in `finally` (`:1107`).
   - **Probe `p1`:** the probe wrapped `window.requestAnimationFrame`, `setTimeout` and `setInterval` before `traceLanding()` and recorded the caller of each call. On a passing row in both engines, every call between `traceLanding()` and the end of the wait comes from user-event's `wait`, from the source's own `pointermove` handler (its frame request at `packages/core/src/traits/reorderable.ts:695`) or from Vitest's fake-timer setup. None comes from the trace. With the animation paused, the trace's calls appear only after the wait's `.catch`: one frame request, one interval and one timeout from `watch`, and then 61 frame requests from `onFrame`.
2. **The wait's condition, timeout and interval don't change.** **Confirmed.** On `main`, the wait is `vi.waitFor(() => expect(item.style.position).toBe('relative'), { timeout: 1000 })`. At `cfed2376e`, it calls `trace.poll()` and then makes the same assertion, with `{ timeout: 1000 }` (`:1091`–`:1098`). The interval stays at Vitest's default of 50 ms (Vitest 5.1.0, `interval = 50`). `poll()` doesn't throw, so the callback fails exactly when the assertion fails.
3. **After give-up, a bounded watch, and the row still fails within its test timeout.** **Confirmed.**
   - The frame loop and the interval are cancelled after `bound` ms (`:206`–`:207`). The message states the bound (_"the trace watched 1000 ms more"_), and so does `afterGiveUp.bound`.
   - The row throws after the watch in every path, including when teardown runs during the watch. **Probe `m3`:** the probe resumed the paused animation 1,500 ms after `ue.pointer` returned. In both engines, `finished` and `position relative` appear in the marks at 1,733 to 1,739 ms, `tornDown` is `true`, and the row still fails.
   - The failing row took 2,116 to 2,193 ms in the probes. No `testTimeout` is configured, so the timeout is Vitest's browser default of 15,000 ms (`resolved.testTimeout ??= resolved.browser.enabled ? 15e3 : 5e3`).
   - `framesArrived`, `timelineAdvanced` and `tornDown` are present. `timelineAdvanced` has the limit in `reviewer-3`.
4. **The trace keeps every other field of `171254dc2`.** **Confirmed.** It keeps `marks`, `lastMove` and `atStart`. The old `now` is now named `atGiveUp`, and it is still read when the wait gives up, at the start of `watch()`. `animation` keeps `playState`, `currentTime`, progress and duration, read at the same moment. The frames and the timer's lateness moved to `afterGiveUp`, and `polls` was added.
5. **Test file only, no output from a passing row, `dispose()` restores what the diagnostic installed, and the skips stay.** **Confirmed.**
   - `cfed2376e` changes the test file and the witness only. Compared with `main`, `packages/core/src` doesn't change, and the diff contains no `skipIf` line.
   - A passing run has no trace line and no `stdout` or `stderr` block in either engine.
   - **Probe `p5-dispose`:** after a failure, `Element.prototype.animate.name` is `tracedAnimate` before `dispose()` and `animate` after it, in both engines. The frame loop and the interval are cancelled in `watch()` before `watch()` returns, so `dispose()` no longer needs to cancel them.
   - The witness argues _"the file's other 46 rows pass, so `dispose()` restores `Element.prototype.animate`"_. That doesn't discriminate, because the wrapper delegates to the native `animate` and records only calls on the row's own item. Later rows would pass with the wrapper still installed. `p5-dispose` reads the restoration directly.

## Witnesses

Both reproduce at `cfed2376e` ([`checks/amended-diagnostic-probes.txt`](checks/amended-diagnostic-probes.txt)):

- **Unchanged file:** 47 of 47 rows pass in Chromium and in WebKit, with no trace line.
- **`m2`, paused after `ue.pointer` returns:** the row fails in both engines, and the file's other 46 rows pass. The trace carries 20 polls with `document.timeline.currentTime`, the state and the `paused` animation at give-up, and an `afterGiveUp` with `bound: 1000`, `framesArrived: true`, `timelineAdvanced: true`, `tornDown: false`, 61 frames and 19 or 20 timer ticks. The implementer's traces have the same shape.

## Findings

### Tier C: the report still describes the superseded diagnostic and doesn't name its supersession (`reviewer-2`)

- **Observed:** the report's _What this unit keeps_ (`.plan/reorderable-safari-1/reorderable-safari-report.md:37`–`:44`) says that the error message carries _"the page's state at the start and at the timeout, … the frames, and the timer's lateness"_, and it links the old [`diagnostic-witness.txt`](../../reorderable-safari-1/checks/diagnostic-witness.txt). That describes `171254dc2`. At `cfed2376e`, frames and the timer exist only in the watch after give-up, and the trace carries `polls` and `afterGiveUp`. Nothing in the report names the 2026-11-19 amendment, `cfed2376e` or [`diagnostic-amended-witness.txt`](../../reorderable-safari-1/checks/diagnostic-amended-witness.txt). The plan and `RF-36`'s amendment do name the change.
- **Rule:** [`documentation.md`](../../../.agents/docs/documentation.md) §6: _"A record entry is append-only and dated, and a superseded entry is amended in place with its supersession named rather than rewritten."_
- **Why it's a problem:** the unit that takes a weekly Safari failure saves the trace and reads it against candidates A to E. If that unit starts from the report, it expects frames during the wait and finds polls.
- **Why Tier C:** no program behaviour changes, and the instrument is sound. The trace is self-describing JSON, and the plan and the index carry the current properties.
- **Required property:** the report's entry on the kept diagnostic names its supersession by the plan's amendment of 2026-11-19 and points to the current witness. Its original text stays.
- **Routed** to the implementer, who owns the report, through the coordinator. This needs no design decision.

### Tier C: `timelineAdvanced` reads the timeline only through frame callbacks (`reviewer-3`)

- **Observed:** `lastTimeline = frames.at(-1)?.[1] ?? null`, and `timelineAdvanced` is `lastTimeline != null && now.timeline != null && lastTimeline > now.timeline` (`:209`, `:220`–`:223`). The diagnostic reads `document.timeline.currentTime` after give-up only inside `onFrame`. If no frame callback runs during the watch, `timelineAdvanced` is `false`, but the timeline wasn't read.
- **Required by:** property 3: the trace _"states whether frames arrived, whether the timeline advanced, and whether teardown ran in that time"_.
- **Why Tier C:** for candidate A, _"frame callbacks stop arriving, or `document.timeline.currentTime` stops advancing"_, both readings name the same candidate. The trace also carries `framesArrived: false` and `frames: []`, so a reader can see that the timeline wasn't read. No candidate is misread. The field is only less exact than property 3 says.
- **Required property:** when the trace says that the timeline didn't advance after give-up, the diagnostic read the timeline after give-up. Otherwise the trace shows that it didn't read the timeline.
- **Routed** to the implementer through the coordinator. Whether the change is worth making before #71 merges is the coordinator's or the architect's call.

## Noted outside this scope

- **`timerLateness` is cumulative against the ideal schedule:** it is `now - watchStart - ticks × 50`. In local WebKit, it grows by about 2 ms per tick, to 39 ms in the 1,000 ms watch of `m2`, while the animation is paused and frames arrive every 16 ms. A single late tick and steady interval drift give the same number. The definition comes from `171254dc2` and the reading's scratch instruments, and the plan doesn't define lateness. So it isn't a finding against step 3. It bears on how a trace reads candidate D, and on the report's _"the 50 ms timer ran at most 29 ms late"_ in Safari. I didn't read whether Safari's interval drifts in the same way. The architect may want to look at this when a weekly trace arrives.
- **The polls read `document.timeline.currentTime` during the wait,** as property 2 allows. I didn't read whether that read has an engine-side effect in Safari.

## Limits

- Local Chromium and WebKit only, as Playwright ships them. No Safari run.
- `p1` sees only calls through `window`'s globals. A callback scheduled by another path, such as a `MessageChannel` or `queueMicrotask`, would not appear. The code read covers those paths: `traceLanding` contains none of them.
- The merge of `main` at `32f12bdcd` wasn't reviewed.