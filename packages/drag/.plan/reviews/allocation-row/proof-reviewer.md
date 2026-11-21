# Allocation row: feature proof

**Lens:** `reviewer`, feature proof of [`allocation-row-handoff.md`](../../allocation-row-handoff.md): its goal, its boundaries, required properties 1 to 5 and proofs P1 to P7. The coordinator's brief for pull request #94 (`Closes #70`) asked for these:

- the boundaries;
- the closing Playwright move against properties 2 and 3;
- properties 4 and 5;
- independent P1 and P3 runs, and P4 or P5 if the report was in doubt;
- that `a4d6f03a8` only formats `st.mjs`.

**Commit read:** `5239af750`, the head of `drag/alloc-flake-1` and of #94. Its base is `e4b0e475d`. `origin/main` is at `2f95645a6`, and `git diff --stat e4b0e475d origin/main -- packages/drag` is empty, so `main` hasn't moved under this package. I read the [reading](../../measurements/2026-11-20-allocation-row.md) and the [report](../../allocation-row-report.md) as they stand at that commit.

**Method:** one detached scratch worktree at `5239af750`, with `aube install` and the builds of `core`, `tproc`, `material-x` and `box-quad`. All runs are in Playwright 1.65.0's Chromium, the reading's browser.

- **Figures.** The row prints its bytes only when it fails. For the figures, I added a temporary `console.log` of `bytes` after `stopHeapSampling` and ran with `--reporter=verbose`, which prints a passing test's stdout. The default reporter doesn't, so runs 1 to 5 have no figures. The print adds one line, so a failure at `:322` in my runs is `hot-path.browser.test.ts:321` at `5239af750`.
- **Clean-up.** The P3 mutation, the print and the P5 probe were reverted or removed with `git checkout` and `rm`. `git status` was clean before this report was added.
- **Evidence.** The figures are in [`proof-reviewer-probes/`](proof-reviewer-probes/): `readings.txt`, `p5-probe.txt`, `st-output.txt` and `ci.txt`. `sum.mjs.txt` is the script that read the printed bytes.

## Scope

**Covered:**

- the diff `e4b0e475d...5239af750` in `tests/`, `src/`, `bench/` and `.scripts/`;
- `playwrightOnly`, `cdpOf`, `pointerMove`, `pointerUp`, the harness's `afterEach` and `press`;
- `playwright-core` 1.65.0's `RawMouseImpl.move`, `Mouse.move` and `interceptDragCausedByMove` (`lib/coreBundle.js`);
- P1, P3, P5 and P7 independently;
- P6 in part: `typecheck` and `fmt-check` in `packages/drag`, `lint` on the three changed files, and `git diff --check`;
- the `st.mjs` reformat.

**Not covered:**

- **P2,** the three full root runs. Not re-run.
- **P4,** the traced runs. Not re-run. The report's control has the instrument count 67 and 46 recompiles with the moves sent back through `pointerMove`. That makes its null result discriminating, and the brief left re-running to doubt.
- **Whole-package `just lint` in `packages/drag`.** In my worktree it failed on `tests/support/oracles.build.ts`, with two `import-x/no-unresolved` errors for drag's own build output (`../../kernel/gesture.js`, `../../sortable/rect-index.js`). The pull request doesn't touch that file, and I hadn't run `_test-builds`. The `static` job passed at `5239af750` (run 44876355288).
- **The `drag:DRF-53` and `drag:DRF-48` datings in `00-index.md`,** and whether they close. That is the architect's decision.

## Boundaries

| Boundary | Holds | Evidence |
| --- | --- | --- |
| Nothing in `src/`, `bench/` or `.scripts/` | yes | `git diff --stat e4b0e475d 5239af750 -- packages/drag/src packages/drag/bench .scripts` is empty |
| Bound 16, interval 64, 300 + 300 moves | yes | `hot-path.browser.test.ts:282` and `:290` (`i < 300`), `:287` (`startHeapSampling(64)`), `:321` (`toBeLessThan(16)`) |
| Summed keys, `liftFunctions` assertion | yes | `:307`–`:315` and `:322`–`:324` are not in the diff |
| Title, `measurement` tag | yes | `:261`–`:262`, not in the diff |
| `drag:DRF-2` row | yes | `:328` on, not in the diff |
| No other command changes | yes | `commands.node.ts`: one addition, `:218`–`:240`; `browser-commands.ts`: one declaration, `:13` |
| The press and its first move | yes | `:268` and `:270`, not in the diff |

## Required properties

1. **Holds.** `commands.node.ts:225`–`:240` sends one `Input.dispatchMouseEvent` with `type: 'mouseMoved'`, `button: 'left'`, `buttons: 1`, `modifiers: 0` and `force: 0.5`. These are the parameters of Playwright's own `RawMouseImpl.move` (`coreBundle.js:37571`–`:37581`) with the left button held, sent there by `interceptDragCausedByMove` after its page script. Both loops call it (`:284` and `:293`). My P5 run shows one trusted `pointermove` per move, at the requested point (below).
2. **Holds.** The press, the first move, the `frames()` calls and everything after `stopHeapSampling` except one statement are unchanged. That statement is the closing move under property 3.
3. **Holds, and needs no decision from the architect.** The closing move is `hot-path.browser.test.ts:304`, `pointerMove(start.x + (299 % 40), start.y + 12)`. It is the last CDP point (`i = 299` in `:293`), after `stopHeapSampling` (`:298`), so the sampler doesn't see it.
   - It is the first Playwright pointer command after the CDP moves, and it doesn't depend on Playwright's stale position. With `steps = 1`, `Mouse.move` sends `fromX + (x − fromX) · 1` (`coreBundle.js:22962`–`:22972`), which is the target. It keeps `_buttons`, so it is a held-button move, like the CDP moves.
   - After it, Playwright's position is the browser's. The later pointer commands are `keyPress('Escape')`, which is a key, then `afterEach`'s `pointerUp` (`harness.ts:115`), then the next test's `press`, which moves first (`harness.ts:168`).
   - My P5 run reproduces both halves. Without the closing move, the release lands at the stale (100, 100). With it, the release lands at (170, 130).
   - Against property 2: the property names the press and its first move, and both are unchanged. The added statement adds no input to the window. The handoff's out-of-scope list doesn't name it, and property 3 asks the row to show how the agreement holds. So the statement meets both properties, and no return condition applies. The handoff's in-scope list names the loops and the comments but not this statement. The report flags it (§Property 3), and the architect reads the report when deciding the closure.
4. **Holds.** The JSDoc (`commands.node.ts:218`–`:224`) says why the command exists: Playwright's Chromium mouse runs page script on each held-button move, and the heap sampler attributes V8's work for it to the kernel. It also says that Playwright's position isn't updated. The command is built with `playwrightOnly` (`:225`), which throws for any other provider (`:98`–`:113`).
5. **Holds.** The comments at `:273`–`:281`, `:300`–`:303` and `:318`–`:320` state the three required facts: the warm-up stops short of the optimized tier, so the window includes the tier-up; about 5 to 10 B per move unchanged, and about 60 with one escaping object; and why the moves go by CDP. They carry no finding id, review name, commit or history.
   - **The tier sentence is supported for the input the row now sends.** The reading's arm C, CDP moves at 300, records Sparkplug → Maglev in all 22 runs.
   - **"Up to about 100 B per move"** matches the reading's maximum of 102.37 (`nofilt-2`).
   - **One of my readings, 3.51, is below "about 5 to 10".** The bound is an upper bound, and the readings across the reading, the report and this proof run from 3.51 to 10.67. I don't count that as a factual error in an "about" figure.

## Proofs

| Proof | Independent result | Holds |
| --- | --- | --- |
| **P1** | 20 runs of the file, 20 passing 9 of 9. The 15 with figures read **3.51 to 8.88** B per move, every byte in `kernel/session.ts:handleEvent`. One run also had `kernel/gesture.ts:enter` at 168 B. `lift.ts:translate` was the only `lift.ts` key in each. Five of the 20 came from my first P3 attempt, in which nothing was applied (below). | yes |
| **P2** | not re-run | report only |
| **P3** | The mutation at `src/kernel/session.ts:374` in `#move`, 5 runs, then reverted. 5 of 5 fail on the kernel bound, with `kernel/session.ts:#move` in each message, at **55.08 to 71.07** B per move (`#move` 14,628 to 18,248 B). The report's range is 54.48 to 65.92. | yes |
| **P4** | not re-run. The report's control makes its null result discriminating. | report only |
| **P5** | Re-ran `input-probe.ts` as `tests/probe-input.browser.test.ts`, then removed it. Both moves give one `pointermove` at (150.5, 120.25), with `buttons: 1`, `pointerType: 'mouse'`, `isTrusted: true` and `pressure: 0.5`. The probe's equality assertion passed. | yes |
| **P6** | `aube exec just typecheck` and `just fmt-check` in `packages/drag` pass. `just lint` on the three changed files passes. `git diff --check origin/main...HEAD` is clean. Whole-package lint isn't covered (§Scope). | yes, for the changed files |
| **P7** | Each attempt's log read through the jobs API: jobs 136758566524, 136760677264 and 136761213104 of run 44875222605, all at `a4d6f03a8`. The row passed at 10,196, 10,196 and 10,200 ms, with 12 passed and 2,212 skipped, as reported. The run at the head `5239af750` (44876355288, job 136761967304) also passed it, at 10,225 ms. | yes |

**The P7 evidence has to be the log.** The `measurements` job is `continue-on-error: true`, and its test step ends in `|| true` (`.github/workflows/verify.yml:411`, `:442`). So a green job doesn't show that the row passed. The report's figures match the logs.

**My first P3 attempt applied nothing.** The handoff's anchor, `this.#drag.y = event.clientY;`, occurs twice in `session.ts`: at `:374` in `#move` and at `:414` in `#up`. My single-occurrence replacement refused, and those five runs ran the unmutated tree. They are counted under P1. The second attempt put the line after `:374`, the occurrence the handoff names by its method.

## `a4d6f03a8`

**Holds.** The commit changes `probes/allocation-row/st.mjs` and adds P6 to the report, and nothing else. In `st.mjs`, the diff only splits statements onto their own lines, under `oxfmt`. `node --allow-natives-syntax` prints the same output for the file at `205bb0d43` and at `a4d6f03a8`, as `cmp` shows: `fresh 131073`, `called once 65`, `baseline 16385`, `maglev 25`, `turbofan 41`, `deopted 1` ([`st-output.txt`](proof-reviewer-probes/st-output.txt)).

## Findings

**None.** No property or proof of the handoff fails at `5239af750`, and nothing in the change needs the architect's decision before the closure the handoff already gives the architect.

## Verdict

**The handoff is met at `5239af750`.** Properties 1 to 5 hold. P1, P3, P5 and P7 hold on independent runs, P6 holds for the changed files, and P2 and P4 rest on the report. The next step is the architect's: whether `DRF-53` and `DRF-48` close.