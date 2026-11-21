# Allocation row report

**Input:** `drag/alloc-flake-1` at `205bb0d43`, which carries the [handoff](allocation-row-handoff.md). **Governing records:** `DRF-53` and `DRF-48` in [`00-index.md`](00-index.md), with their datings of 2026-11-20; `DRI-17` ([`contract.md`](contract.md)); `repo:RD-7`; CONTRIBUTING §Comments and JSDoc. All local runs are in Playwright 1.65.0's Chromium 158.0.8127.18, the reading's browser.

**Outcome: the handoff is implemented, and no return condition was met.** Nothing out of scope changed. P1 to P6 hold. P7 is recorded below.

| Commit | Content |
| --- | --- |
| `3bbd506f6` | The command `pointerMoveHeldByCdp` and the row's moves, comments and closing move |
| the commit carrying this report | This report and the P5 probe, [`probes/allocation-row/input-probe.ts`](probes/allocation-row/input-probe.ts) |

## What changed

- **`tests/support/commands.node.ts`:** `pointerMoveHeldByCdp(x, y)`, built with `playwrightOnly`, so it throws for another provider. It sends one `Input.dispatchMouseEvent` with the parameters that Playwright's `RawMouseImpl.move` sends after its interception: `type: 'mouseMoved'`, `button: 'left'`, `buttons: 1`, `modifiers: 0`, `force: 0.5`. It is sent on the page's CDP session from `cdpOf`, which the heap commands use too. Its JSDoc states why it exists (property 4). **`tests/support/browser-commands.ts`** declares it.
- **The row:** its warm-up and its window send their 300 + 300 moves with the new command, to the same points as before. The press, its first move (`pointerMove(start.x, start.y + 10, 2)`), the `frames()` calls, the bound, the interval, the summed keys, both assertions, the title and the tag are unchanged (property 2).
- **One Playwright move after the window,** to the point of the last CDP move, `(start.x + 19, start.y + 12)`, after `stopHeapSampling` and before `Escape`. It is outside the window, so the sampler doesn't see it. It is how property 3 holds (§P5 shows why it's needed).
- **Comments (property 5):** the warm-up doesn't reach the optimized tier, so the window includes the kernel's tier-up from the baseline tier. The kernel reads about 5 to 10 B per move over the window, and about 60 with one escaping object per sample. The moves are sent by CDP because Playwright's held-button move runs page script whose recompiling the sampler files under `handleEvent`. They carry no finding id, review name or commit. The statement about the tier is the architect's reading at 300 moves (`handleEvent` in Sparkplug at the window's start in every run). This unit didn't read the tier again.

## Property 3: the pointer after the moves

Playwright's mouse keeps its own position, which is the point of its last move: `(start.x, start.y + 10)`. The CDP moves leave the browser's pointer at `(start.x + 19, start.y + 12)`. Without a correction, the harness's `afterEach` `pointerUp` would release at Playwright's stale point. P5 observed this: after a CDP move to (170, 130), Playwright's `mouse.up` gave a `pointerup` at (100, 100), the point of Playwright's last move, with no `pointermove` before it. After the row's closing move to the same point, the `pointerup` was at (170, 130).

So after the closing move, Playwright's position is the browser's. The later pointer commands are the row's `Escape` (a key), the harness's `pointerUp`, and the next test's `press`, which moves first. None of them uses a position that differs from the browser's.

## Proofs

### P1. Stable alone: 20 of 20

20 consecutive runs of `aube exec just test-engines tests/hot-path.browser.test.ts` in `packages/drag`, with a temporary `console.log` of the row's bytes after `stopHeapSampling`, removed before the commit. Every run passed 9 of 9. The only kernel key in every run was `kernel/session.ts:handleEvent`, and `lift.ts:translate` was the only `lift.ts` key.

| Run | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B per move | 6.93 | 7.84 | 7.68 | 8.35 | 10.67 | 8.36 | 5.89 | 7.40 | 7.52 | 7.25 |

| Run | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B per move | 8.28 | 6.97 | 8.75 | 7.69 | 5.37 | 6.72 | 9.15 | 8.08 | 8.88 | 6.72 |

The range is **5.37 to 10.67** B per move. The top is 0.52 B above the architect's CDP arm (4.73 to 10.15), and 5.33 B below the bound.

### P2. Stable in full runs: 3 of 3

Three runs of root `aube exec just test`, with the same temporary print. Each passed 146 of 146 files and 2,304 of 2,304 tests, so there were no other failures. The row read **10.39, 6.25 and 9.15** B per move, all in `handleEvent`.

**The coordinator's extra evidence.** On PR #91, the row read 23.89 in one of two full runs, and 17.41 in an earlier run. Both are consistent with the recompile cycle. Nothing like them came up here: the largest full-run reading is 10.39, inside P1's range.

### P3. A regression fails: 5 of 5

With `(this.#drag as unknown as { last?: unknown }).last = { x: event.clientX, y: event.clientY };` after `this.#drag.y = event.clientY;` in `Session.#move`, the file was run 5 times and then reverted with `git checkout`. The row failed in every run on its first assertion, the kernel bound (`hot-path.browser.test.ts:323` at the time), and `kernel/session.ts:#move` was in every message.

| Run | B per move | `#move` | `handleEvent` |
| --- | ---------- | ------- | ------------- |
| 1   | 59.87      | 16,192  | 1,768         |
| 2   | 56.89      | 15,484  | 1,584         |
| 3   | 64.48      | 16,060  | 3,200         |
| 4   | 65.92      | 16,832  | 2,720         |
| 5   | 54.48      | 14,936  | 1,408         |

The range is 54.48 to 65.92, against the architect's 59.08 to 62.36. Runs 3 and 4 also had small `gesture.ts:#applyRequests` (84) and `session.ts:stepTarget` (224) keys.

### P4. No recompile cycle in the window: 5 of 5

Five runs with `DEBUG=pw:browser` and `PROBE_JS_FLAGS='--trace-opt --trace-deopt'`. The probe's `launchArgs` change in `.scripts/vitest-config.ts` and its `window-start` and `window-end` marks were applied by hand, because the committed row no longer matches `checks/probe.diff`'s context. Both were reverted afterwards. [`corr.py`](probes/allocation-row/corr.py) counted **0** _"dependent property cell changed"_ inside the window in 5 of 5 runs. Each run passed, at 7.33, 6.32, 7.61, 8.08 and 7.64 B per move.

**The control.** Each log had 105 trace lines inside the window, so the trace was running. Two more traced runs had the row's 600 moves sent back through `pointerMove`. `corr.py` then counted 67 and 46 recompiles in the window, with `handleEvent` at 18,160 and 11,324 B, and the row failed in both, at 60.53 and 37.75 B per move. So the instrument sees the cycle when it runs.

**Observed, not required:** with the row on CDP, no _"dependent property cell changed"_ appears anywhere in the five logs, including the window of the `DRF-2` row that follows, which still moves with Playwright's mouse. In the architect's reading, that window had 67 to 166 recompiles. This is consistent with the reading's item 5: when the cycle starts depends on the page's earlier held-button moves. It isn't characterized further, and the `DRF-2` row's verdict doesn't read `handleEvent`.

### P5. The same input

[`input-probe.ts`](probes/allocation-row/input-probe.ts), run as `tests/probe-input.browser.test.ts` in Chromium and then removed. With the button pressed at (100, 100), it moves once with `pointerMove` and once with `pointerMoveHeldByCdp`, each to (150.5, 120.25), and records the window's pointer events.

| Move | Events | `clientX` | `clientY` | `buttons` | `pointerType` | `isTrusted` | `pressure` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Playwright's mouse | one `pointermove` | 150.5 | 120.25 | 1 | `mouse` | true | 0.5 |
| `pointerMoveHeldByCdp` | one `pointermove` | 150.5 | 120.25 | 1 | `mouse` | true | 0.5 |

The probe's equality assertion passed. Its second half is §Property 3's reading.

### P6. Gates

On the three changed `.ts` files, in `packages/drag`: `just fmt`, `just lint-fix`, `just fmt` and `just lint` passed with no diagnostics. `aube exec just typecheck` passed. `git diff --check` is clean. This report is formatted with `just fmt`, and its links were checked by resolving each relative path. A Markdown lint doesn't apply. After the temporary print was removed, the file passed once more, 9 of 9.

### P7. CI

To be recorded: the pull request's `measurements` job, the first run and two reruns.

## Stopping point

The unit stops at the pull request. The architect reads this report and decides whether `DRF-53` and `DRF-48` close. Nothing is open beyond that decision, and P7 until it is recorded.

**Scratch work:** the worktree and the run logs are in this session's scratchpad. They are removed when the unit is handed off.