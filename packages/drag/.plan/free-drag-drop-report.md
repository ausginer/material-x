# Free drag drop report

**Input:** [`free-drag-drop-handoff.md`](free-drag-drop-handoff.md), carried by `d11d71d27` on `drag/performance`. **Governing records:** `DRD-48` in [`00-index.md`](00-index.md), with `DRD-33` C6 and C7, `DRD-40` properties 4 and 6, and `DRF-22`, and [`performance-plan.md`](performance-plan.md) §2 P3. **Base for comparison:** `packages/drag/src` at `bf9d1caed`.

**Outcome: complete.** Before `freeDrag`'s drop computes the motion and before the tracker's `drop()`, the drop marks the bounds and the drop-target tracker stale. W3 and W4 pass in Chromium, Firefox and WebKit. Each fails at `bf9d1caed`'s source in all three engines, and M3 and M4 each fail their witness in all three engines. One drop with ten targets and an element `bounds` reads 11 layout values, against 0 at `bf9d1caed`'s source. The two `freeDrag` size rows grow by 19 B minified and 5 B Brotli, and every other row reads 0. No return condition was met.

**Owner approval.** The owner approved measuring the targets and the bounds again at the drop, and stated that correctness takes priority over this added work. The owner stated this in the request that started this unit, on 2026-11-12. This report records it beside the results, for the architect to record under `DRD-48`. The approval covers the added reads at the drop. The bytes below are still the owner's to accept (`DRD-33` C7, `DRD-40` property 6).

**About the 1.2 µs figure.** `DRD-48` cites "about 1.2 µs per row" from `DRD-47`'s run. That figure is the sortable drop's full scan, packing included, and it gives context only. This unit did not measure the time a `freeDrag` drop takes. It counted the drop's layout reads, under item 5.

| Commit | Content |
| --- | --- |
| `71f20df20` | Items 2, 3 and 4: the drop's call, the `invalidate` documentation, W3 and W4, `DRI-20` and `DRI-21` with their change record row and the current-state sentence, and the README sentence |
| the commit carrying this report | This report, and the records under `measurements/` |

## Item 1: the base

`git diff --stat bf9d1caed HEAD -- packages/drag/src packages/drag/tests` at `d11d71d27`, before any change: **empty**.

## Item 2: the drop

**The form of the call.** `FreeDragOperation.drop` (`free-drag/operation.ts`) calls `this.handleEvent()` as its first statement. That is the operation's scroll and resize listener, and its body is `this.#behavior.bounds?.invalidate()` and `this.#targets?.invalidate()`. So the drop sends the bounds and the tracker the same signal that a scroll sends, through the members they already implement. Then `#computeMotion()` clamps, and `bounds.apply` reads the box again. Then `this.#targets?.drop()` resolves, and the tracker measures every target again.

- **Why this form.** One call reaches both caches, and a third-party `MotionConstraint` or `DropTargetTracker` receives it. Its bytes were not compared with two explicit calls. A comment at the call gives the reason: a scroll after the last rendering update dispatches its `scroll` event at the next update, which the drop doesn't wait for.
- **Published types.** `DropTargetTracker` and `MotionConstraint` keep their members. No published type changed.
- **Unchanged:** samples, frames, the listener's body, activation, `settle`, the landing, `home`, `dropTargets()`'s and `bounds()`'s runtime code, `sortable` and `DRD-47`'s confirmation.

**Documentation (property 4).**

- `DropTargetTracker.invalidate` now says that it is also called at the drop, before `drop()`.
- `MotionConstraint.invalidate` now lists its callers: scroll, resize, activation, the controller's `invalidate()` and the drop. Activation was already a caller (`free-drag/behavior.ts`, "The box may be from before a scroll between operations"), and the documentation didn't name it.
- `dropTargets()`'s documentation says that the targets are measured at the first resolution, after a scroll, a resize or `invalidate()`, and at the drop. Without that, the comment would describe code that no longer exists.
- `handleEvent`'s documentation says that the drop also calls it.

## Item 3: the witnesses

| Witness | Where | With the change (Chromium, Firefox, WebKit) | At `bf9d1caed`'s source | Mutation | Mutation result |
| --- | --- | --- | --- | --- | --- |
| **W3** | `tests/drop-targets.browser.test.ts`, "drag:DRD-48 should name the target under the release position after a scroll whose event has not arrived" | Pass in all three | **Fails in all three:** the request names `z1`, not `z2` | **M3:** the drop calls only `this.#behavior.bounds?.invalidate()` | **Fails in all three:** the request names `z1`, not `z2`. W4 passes |
| **W4** | `tests/free-drag.browser.test.ts`, "drag:DRD-48 should clamp the drop against the bounds after a scroll whose event has not arrived" | Pass in all three | **Fails in all three:** "expected { arenaBottom: 210, localDeltaY: 110 } to deeply equal { arenaBottom: 210, localDeltaY: 70 }" | **M4:** the drop calls only `this.#targets?.invalidate()` | **Fails in all three**, with the same message. W3 passes |

- **W3.** A fixed scroller, 400 px high, holds two 120 px targets, `z1` at 100 px and `z2` at 260 px into its content. The dragged box is outside the scroller. A capture-phase `pointerup` listener on the window, added before the press with `once`, adds 160 px to the scroller's `scrollTop`. The drag moves the pointer to `z1`'s center and waits two frames, and `z1` has the mark. At the release the pointer is 160 px into the scroller, which after the scroll is 320 px into the content, inside `z2`. The request's `target` is `z2`.
- **W4.** A fixed scroller, 400 px high, holds a 200 px arena at 50 px into its content, and the 50 px box sits inside the arena. `bounds(arena)` is composed. The drag moves 200 px down and waits two frames, and the visual is held with its bottom at the arena's bottom, 250 px. The same kind of listener adds 40 px to `scrollTop`. After the release the arena's bottom is at 210 px. The request's `localDeltaY` is the clamp against that box: 210 − 50 − 90 = 70. Before the change, and under M4, it is 110, the clamp against the box before the scroll.
- **The base run** used `operation.ts` from `bf9d1caed` with this unit's tests. Both witnesses fail in all three engines, so the window shows in every engine for a scroll made in a `pointerup` listener.
- **The existing tests.** "should re-read the targets after a scroll" and every other test in `tests/drop-targets.browser.test.ts` pass, in the three-engine suite below.

**Where they ran.** Every witness and mutation run used `vitest.engines.config.ts`, after `source ~/.cache/ms-playwright/webkit-env.sh`, on the working copy before the commit. Each mutation was an uncommitted edit of `operation.ts`, and the landed file was restored from a scratch copy after each run. The landed `operation.ts` is identical to the one in `71f20df20`, and the format and lint steps changed no test file. Each record's head shows the `drop()` lines the run used.

Records: [`2026-11-12-free-drop-witnesses.txt`](measurements/2026-11-12-free-drop-witnesses.txt), [`2026-11-12-free-drop-mutation-M3.txt`](measurements/2026-11-12-free-drop-mutation-M3.txt), [`2026-11-12-free-drop-mutation-M4.txt`](measurements/2026-11-12-free-drop-mutation-M4.txt), [`2026-11-12-free-drop-witnesses-at-bf9d1caed.txt`](measurements/2026-11-12-free-drop-witnesses-at-bf9d1caed.txt), and the runner [`2026-11-12-free-drop-witness-runner.sh.txt`](measurements/2026-11-12-free-drop-witness-runner.sh.txt). The runner filters Vite's dynamic-import warning out of the saved output.

## Item 4: the contract and the README

All of these are in `71f20df20`, the same commit as item 2.

- **`DRI-21`'s drop bullet** in [`contract.md`](contract.md) is `DRD-48` property 5's text, word for word.
- **`DRI-20`** has the sentence "With `bounds`, the drop reads the box again before it clamps the drop position." after "The request's `target` is DRI-21's, and `null` without `dropTargets`."
- **The change record** has a row dated 2026-11-12 for `DRI-20` and `DRI-21` that names `DRD-48` and `DRF-22`.
- **The current-state paragraph** has a sentence that names `DRD-48`, DRI-20 and DRI-21, and links this report.
- **The README's drop-target paragraph** says that the targets are also measured again at the drop, so the request names the target under the release position even after a scroll whose event hasn't reached the library yet.

## Item 5: the cost

**Reads.** A temporary test in `tests/hot-path.browser.test.ts` used that file's census helper, `countLayoutReads`. It is not committed: [`2026-11-12-free-drop-reads-probe.diff.txt`](measurements/2026-11-12-free-drop-reads-probe.diff.txt) holds it. The test composes `freeDrag` with `bounds(arena)` and `dropTargets` over ten 40 px targets. It drags to the fourth target and moves twice with two frames each, so a frame resolved the targets and the cache is warm. It counts layout reads from `commands.pointerUp()` until two frames later, and then fails on purpose so that the count is printed. The request named the fourth target in every run.

| Source | Chromium (`shipped` project) | Chromium, Firefox, WebKit (`vitest.engines.config.ts`) |
| --- | --- | --- |
| `bf9d1caed`'s `operation.ts` | 0 | 0, 0, 0 |
| This unit's `operation.ts` | 11 | 11, 11, 11 |

The difference is 11, as expected: ten target rects and one box. This is reported and not a gating test. Without `targets` and `bounds` the drop reads nothing more, because each call is optional-chained on a `null` member. No sample or frame reads more: the census tests below pass unchanged.

Records: [`2026-11-12-free-drop-reads.txt`](measurements/2026-11-12-free-drop-reads.txt), [`2026-11-12-free-drop-reads-at-bf9d1caed.txt`](measurements/2026-11-12-free-drop-reads-at-bf9d1caed.txt), and the runner [`2026-11-12-free-drop-census-runner.sh.txt`](measurements/2026-11-12-free-drop-census-runner.sh.txt).

**Size.** `node bench/size/measure.ts` at `71f20df20`, and then with `src` checked out from `bf9d1caed`, one after the other. `src` was restored after the base run.

| Composition | `bf9d1caed` min / br | `71f20df20` min / br | Change |
| --- | --- | --- | --- |
| draggable alone (control) | 6,733 / 2,197 | 6,733 / 2,197 | 0 |
| draggable + lift | 11,544 / 3,974 | 11,544 / 3,974 | 0 |
| example: resize handle | 9,390 / 3,310 | 9,390 / 3,310 | 0 |
| example: drop zone | 13,183 / 4,610 | 13,183 / 4,610 | 0 |
| example: canvas group | 9,526 / 3,306 | 9,526 / 3,306 | 0 |
| **freeDrag** | 15,182 / 5,031 | 15,201 / 5,036 | **+19 / +5** |
| **freeDrag + bounds + landing** | 16,347 / 5,471 | 16,366 / 5,476 | **+19 / +5** |
| sortable + y (control) | 20,364 / 6,578 | 20,364 / 6,578 | 0 |
| sortable + xy (control) | 20,159 / 6,566 | 20,159 / 6,566 | 0 |
| complete (control) | 22,041 / 7,207 | 22,041 / 7,207 | 0 |

- **Where the bytes are.** The `this.handleEvent()` call in `FreeDragOperation.drop`. Only the two compositions that contain `freeDrag` change. The controls read 0 as stated: "draggable alone", and the three `sortable` rows, whose graphs exclude the free-drag modules (`complete` declares them absent). "example: drop zone" uses the lift and not `freeDrag`. Module counts are unchanged.
- **Budgets.** "freeDrag" was 64 B over its 4,967 B Brotli ceiling at `bf9d1caed` and is now 69 B over. "freeDrag + bounds + landing" was 261 B over its 5,210 B ceiling and is now 266 B over. Both rows were already red, so no green row turned red. The other three violations, including "draggable alone"'s control movement of 173 B, are the same at both sources. No ceiling is re-based.

Records: [`2026-11-12-free-drop-size.txt`](measurements/2026-11-12-free-drop-size.txt) and [`2026-11-12-free-drop-size-base.txt`](measurements/2026-11-12-free-drop-size-base.txt). `measure.ts` doesn't print a header, so each record's first three lines were added: the command, the revision and the machine.

## Item 6: the other checks

These ran on the working copy after format and lint, before the commit. Its source and tests are identical to `71f20df20`'s.

- **The three-engine suite** (`npx just test-engines`, with the WebKit environment script): 1,053 passed and 18 skipped, in 72 files, with no failure. Record: [`2026-11-12-free-drop-engines.txt`](measurements/2026-11-12-free-drop-engines.txt).
- **The census tests** (`npx just test tests/hot-path.browser.test.ts`, Chromium, the `shipped` project): 8 passed. Record: [`2026-11-12-free-drop-hot-path.txt`](measurements/2026-11-12-free-drop-hot-path.txt).
- **The Chromium suite** (`npx just test`): 409 passed and 5 failed. The five are the known `DRO-4` size rows: "draggable alone", "example: drop zone", "freeDrag", "freeDrag + bounds + landing" and "complete". The two `freeDrag` rows grew by the change's 5 B Brotli. Record: [`2026-11-12-free-drop-chromium.txt`](measurements/2026-11-12-free-drop-chromium.txt).

## Verification

| Check | Result |
| --- | --- |
| Item 1 | Empty |
| `git diff --stat d11d71d27..HEAD -- packages/drag` | `src/free-drag/{operation,drop-targets,bounds}.ts`, `tests/drop-targets.browser.test.ts`, `tests/free-drag.browser.test.ts`, `.plan/contract.md`, `README.md`, this report and `measurements/` |
| W3 and W4 | Pass in Chromium, Firefox and WebKit, and fail at `bf9d1caed`'s source in all three |
| M3 and M4 | M3 fails W3, and M4 fails W4, in all three engines |
| Item 5 | 0 reads at `bf9d1caed`'s source and 11 with the change, in every engine. The size table has its controls at 0 |
| Changed `.ts` files | `just fmt`, `just lint-fix`, `just fmt`, then `just lint`, which is clean. `just typecheck` passes |
| Markdown | `just fmt` on this report, `contract.md` and `README.md`. Links checked with a scratch script. `git diff --check` is clean on the Markdown files. It reports trailing whitespace in the raw records under `measurements/`, which is Vitest's output and stays unedited. No Markdown linter is configured, so lint doesn't apply |

**Not changed:** `sortable`, `DRD-47`'s confirmation, the kernel, samples, frames, the scroll and resize listener's body, activation, `settle`, the landing, `home`, every `bench/` file, every row, injection and floor entry, every ceiling and every recorded reading. No `compare.ts`, `--prove`, `--floors` or campaign ran.

## For the architect

- **Record the result under `DRD-48` and `DRF-22`**, with the owner's approval of the added reads stated above.
- **Pending acceptance:** the owner accepts or refuses the 5 B Brotli on the two `freeDrag` rows (`DRD-33` C7). The 11 reads at this drop are covered by the owner's approval under §Owner approval. **Corrected by the architect on 2026-11-12:** this bullet used to list the reads as pending too ([assessment](free-drag-drop-assessment.md) §1). The owner accepted the bytes on the same day.
- **Still open:** `DRF-21`, until the next bytes reading that a report or decision uses, and `DRD-45` property 9's repair before any `--prove` or `--floors`.