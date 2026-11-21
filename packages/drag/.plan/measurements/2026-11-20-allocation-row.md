# The hot-path allocation row, read 2026-11-20

**What was read:** `tests/hot-path.browser.test.ts`, `drag:DRI-17 hot path` › _"should allocate per sample only the CSS string a lifted write needs"_, for `DRF-53`. **Tree:** `e4b0e475d` (`origin/main`), on `drag/alloc-flake-1`. **Browser:** Playwright 1.65.0's Chromium, Google Chrome for Testing 158.0.8127.18, headless, in the development container (12 CPUs). **Reader:** the architect.

**How:** `packages/drag`, `aube exec just test-engines tests/hot-path.browser.test.ts`, after the root `aube exec just _test-builds`. The [probe](../probes/allocation-row/checks/probe.diff) was applied uncommitted and reverted afterwards. It doesn't change the row's assertions, its bound, its interval or its keys. It adds the following:

- a `PROBE {...}` line from the row with every function's bytes, and `%GetOptimizationStatus` of `Session.prototype.handleEvent` at the warm-up's start and at the window's start and end. This takes `--allow-natives-syntax`, added to the drag projects' `--js-flags`. [`st.mjs`](../probes/allocation-row/st.mjs) decodes the values with Node's V8: 16385 is Sparkplug, 25 is Maglev and 41 is TurboFan;
- `%GlobalPrint` marks in the browser's stdout at the warm-up's start and at the window's start and end. With `DEBUG=pw:browser` and `PROBE_JS_FLAGS='--trace-opt --trace-deopt'`, V8's trace lies between them;
- `VITE_PROBE_WARM`, the warm-up's length, which is 300 on `main`. `VITE_PROBE_RAW=1` sends the row's warm-up and window moves by CDP `Input.dispatchMouseEvent` (`pointerMoveRaw`) instead of Playwright's mouse;
- the row's timeout raised to 300 s, for the long warm-ups;
- `PROBE_PROFILE_DIR`: `stopHeapSampling` saves each raw sampling profile;
- the mutation (arm M only): `(this.#drag as unknown as { last?: unknown }).last = { x: event.clientX, y: event.clientY };` after `this.#drag.y = event.clientY;` in `Session.#move`.

The [scripts](../probes/allocation-row/) give the tables: `sum.py`, `corr.py` for the recompile count in the window, `drf2.py`, `tree.py`, `sizes.py`, `phase.py` and `table.py`.

## Findings

1. **The excess is `handleEvent`'s own bytes, and it isn't an object per move.**
   - In the raw profiles, the kernel's bytes beyond the steady 1 to 3 KB are `selfSize` on the `handleEvent` node. Nothing below it carries them: `enter` → `#move` → the operation's `move` → `translate` hold the same bytes in passing and failing runs.
   - The sampled sizes under `handleEvent` (scaled by the 64-byte interval) are 72, 84, 96 and 108 in a passing run, and also 168, 252 and 384 in a failing one, a handful of each. Each is an object of about 16 to 380 B, and they grow, so they don't look like one allocation per move. The other functions' samples are 72 and 80, the CSS string and its parts.
2. **It follows the recompiles of Playwright's per-move script inside the window** (arm A, the traced runs). Each _"dependent property cell changed"_ deoptimization adds about 200 to 350 B to `handleEvent`:

   | Recompiles in the window | `handleEvent` B | B per recompile |
   | ------------------------ | --------------- | --------------- |
   | 3                        | 1,060           | 353             |
   | 14                       | 2,944           | 210             |
   | 19                       | 5,968           | 314             |
   | 28                       | 6,292           | 225             |
   | 34                       | 7,440           | 219             |
   | 42                       | 10,484          | 250             |
   | 49                       | 14,160          | 289             |
   | 97                       | 19,160          | 198             |
   | 109                      | 26,176          | 240             |
   | 112                      | 23,352          | 209             |
   | 143                      | 30,712          | 215             |

3. **The recompiled function is Playwright's.** V8's trace names it only as `<JSFunction (sfi = …)>`. Its code log (`--log-code --logfile`, run `trace-3`) maps that SFI to an evaluated script with no URL, id 65, offsets 0 to 942: `(function setupDragListeners() { … window.__cleanupDrag = async () => { … delete window.__cleanupDrag; … } })()`. Playwright evaluates it in every frame before each move with the left button held, and evaluates `window.__cleanupDrag?.()` after it (`playwright-core` 1.65.0, `lib/coreBundle.js`, from `src/server/chromium/crDragDrop.ts`, `interceptDragCausedByMove`). In run `trace-3`, the log has 158 Maglev code objects for that SFI.
4. **The kernel's tier is not the cause.** In the `DRF-2` row, which runs next in the same page with no warm-up, `handleEvent` is Maglev code before and after its window. It still holds the recompiles' bytes:

   | Run | `handleEvent`'s tier | Recompiles in the window | `handleEvent` B |
   | --- | --- | --- | --- |
   | `d2w300-1` | Maglev → Maglev | 165 | 32,612 |
   | `d2w300-2` | Maglev → Maglev | 142 | 16,276 |
   | `d2w300-3` | Maglev → Maglev | 67 | 8,252 |
   | `d2w3000-1` | Maglev → Maglev | 136 | 12,280 |
   | `d2w3000-2` | Maglev → Maglev | 137 | 11,612 |
   | `d2w3000-3` | Maglev → Maglev | 166 | 25,668 |

   In the allocation row of `d2w3000-1`, `handleEvent` was Maglev code before its window, and 4 recompiles in the window gave 860 B.

5. **Sent by CDP, the moves start no recompile, and the row reads 4.73 to 10.15 B per move** (arm C). Kept in Sparkplug for the whole window, with `--maglev-filter=-handleEvent --turbo-filter=-handleEvent`, it reads 6.17 to 10.32 (arm D). So the kernel's tier moves the reading by at most about 10 B per move.
6. **The warm-up doesn't reach the optimized tier.** In every run at 300, `handleEvent` is in Sparkplug when sampling starts. V8 marks it for Maglev inside the window: in run `trace-2`, between the window's start and end marks.
7. **The `lift.ts:translate` key needs `translate` not to be inlined.** At 1,000 and 3,000 moves of warm-up, `translate`, `resolve` and `updateInsertion` fold into `sortable/operation.ts:move`, and the row fails `liftFunctions` in 12 of 12 runs (arms B and E). The whole sample then reads 124 to 169 B per move, against 181 to 213 in arm C at 300.
8. **One escaping `{ x, y }` per sample in `#move` fails in 5 of 5** at 59.08 to 62.36 B per move, with `kernel/session.ts:#move` at 15,272 to 17,168 B (arm M).
9. **`--maglev-filter=-~`** (arm A, `nofilt-*`) was meant to keep anonymous functions out of Maglev. It didn't stop the recompiles. It is listed with arm A because it changed nothing that the row reads.
10. **Each move takes about one frame,** about 16.7 ms, whether it is sent by Playwright or by CDP. A 1,000-move warm-up made the file take 30 s instead of 18 s.

## The runs

The first run of arm A failed at 26.64 B per move, with `handleEvent` in Sparkplug and then in Maglev. Its log was overwritten by `base-1` of the next loop, so it isn't in the table. In `base-1` to `base-7`, vitest printed no console output for a passing row, so those runs have no reading. From `quiet-1` on, the runs pass `--silent=false`. The runs `trace-*`, `nofilt-*`, `d2w*`, `raw300-*`, `raw1000-*`, `raw3000-*` and `rawnoopt-*` carry the trace flags. The `rawclean-*`, `mutraw-*` and `full*` runs don't.

One more run of arm B, at 3,000 moves before the timeout was raised, timed out at 15 s and isn't in the table. In its `DRF-2` row, which ran warm after it, `handleEvent` read 108 B.

### A: Playwright's mouse, a 300-move warm-up, as on `main`

| Run | Kernel B per move | `handleEvent` B | `#move` B | `lift.ts:translate` key | Tier before → after the window | Recompiles in the window | Row |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `base-1` | — | — | — | — | — | not traced | pass, with no reading |
| `base-2` | — | — | — | — | — | not traced | pass, with no reading |
| `base-3` | — | — | — | — | — | not traced | pass, with no reading |
| `base-4` | — | — | — | — | — | not traced | pass, with no reading |
| `base-5` | — | — | — | — | — | not traced | pass, with no reading |
| `base-6` | — | — | — | — | — | not traced | pass, with no reading |
| `base-7` | — | — | — | — | — | not traced | pass, with no reading |
| `base-8` | 17.96 | 5304 | 0 | yes | Sparkplug → Maglev | not traced | fail |
| `base-9` | 16.73 | 5020 | 0 | yes | Sparkplug → Maglev | not traced | fail |
| `base-10` | 30.96 | 9288 | 0 | yes | Sparkplug → Maglev | not traced | fail |
| `base-11` | 53.99 | 16028 | 0 | yes | Sparkplug → Maglev | not traced | fail |
| `quiet-1` | 7.83 | 2348 | 0 | yes | Sparkplug → Maglev | not traced | pass |
| `prof-1` | 7.71 | 2312 | 0 | yes | Sparkplug → Maglev | not traced | pass |
| `prof-2` | 34.04 | 10212 | 0 | yes | Sparkplug → Maglev | not traced | fail |
| `prof-3` | 10.23 | 3068 | 0 | yes | Sparkplug → Maglev | not traced | pass |
| `trace-1` | 16.81 | 4960 | 0 | yes | Sparkplug → Maglev | not traced | fail |
| `trace-2` | 87.25 | 26176 | 0 | yes | Sparkplug → Maglev | 109 | fail |
| `trace-3` | 19.89 | 5968 | 0 | yes | Sparkplug → Maglev | 19 | fail |
| `nofilt-1` | 34.95 | 10484 | 0 | yes | Sparkplug → Maglev | 42 | fail |
| `nofilt-2` | 102.37 | 30712 | 0 | yes | Sparkplug → Maglev | 143 | fail |
| `nofilt-3` | 63.87 | 19160 | 0 | yes | Sparkplug → Maglev | 97 | fail |
| `nofilt-4` | 47.20 | 14160 | 0 | yes | Sparkplug → Maglev | 49 | fail |
| `nofilt-5` | 3.53 | 1060 | 0 | yes | Sparkplug → Maglev | 3 | pass |
| `nofilt-6` | 10.56 | 2944 | 0 | yes | Sparkplug → Maglev | 14 | pass |
| `d2w300-1` | 20.97 | 6292 | 0 | yes | Sparkplug → Maglev | 28 | fail |
| `d2w300-2` | 24.80 | 7440 | 0 | yes | Sparkplug → Maglev | 34 | fail |
| `d2w300-3` | 77.84 | 23352 | 0 | yes | Sparkplug → Maglev | 112 | fail |

### B: Playwright's mouse, a 3,000-move warm-up

| Run | Kernel B per move | `handleEvent` B | `#move` B | `lift.ts:translate` key | Tier before → after the window | Recompiles in the window | Row |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `w3000-1` | 0.00 | 0 | 0 | no | Maglev → Maglev | not traced | fail |
| `w3000-2` | 0.00 | 0 | 0 | no | Maglev → Maglev | not traced | fail |
| `trace-w3000` | 0.00 | 0 | 0 | no | Maglev → Maglev | 0 | fail |
| `d2w3000-1` | 2.87 | 860 | 0 | no | Maglev → Maglev | 4 | fail |
| `d2w3000-2` | 0.00 | 0 | 0 | no | Maglev → Maglev | 0 | fail |
| `d2w3000-3` | 0.00 | 0 | 0 | no | Maglev → Maglev | 0 | fail |

### C: CDP moves, a 300-move warm-up: the repair

`fullraw-1` and `fullraw-2` are full runs of drag's suite, `aube exec just test` in `packages/drag`, with 938 tests. Every test passed in both.

| Run | Kernel B per move | `handleEvent` B | `#move` B | `lift.ts:translate` key | Tier before → after the window | Recompiles in the window | Row |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `raw300-1` | 7.45 | 2152 | 0 | yes | Sparkplug → Maglev | 0 | pass |
| `raw300-2` | 7.52 | 2172 | 0 | yes | Sparkplug → Maglev | 0 | pass |
| `raw300-3` | 7.68 | 2304 | 0 | yes | Sparkplug → Maglev | 0 | pass |
| `raw300-4` | 4.81 | 1444 | 0 | yes | Sparkplug → Maglev | 0 | pass |
| `raw300-5` | 8.09 | 2428 | 0 | yes | Sparkplug → Maglev | 0 | pass |
| `raw300-6` | 6.80 | 2040 | 0 | yes | Sparkplug → Maglev | 0 | pass |
| `raw300-7` | 8.64 | 2592 | 0 | yes | Sparkplug → Maglev | 0 | pass |
| `raw300-8` | 6.37 | 1912 | 0 | yes | Sparkplug → Maglev | 0 | pass |
| `rawclean-1` | 7.89 | 2368 | 0 | yes | Sparkplug → Maglev | not traced | pass |
| `rawclean-2` | 5.93 | 1780 | 0 | yes | Sparkplug → Maglev | not traced | pass |
| `rawclean-3` | 9.32 | 2796 | 0 | yes | Sparkplug → Maglev | not traced | pass |
| `rawclean-4` | 6.49 | 1948 | 0 | yes | Sparkplug → Maglev | not traced | pass |
| `rawclean-5` | 9.04 | 2712 | 0 | yes | Sparkplug → Maglev | not traced | pass |
| `rawclean-6` | 10.15 | 3044 | 0 | yes | Sparkplug → Maglev | not traced | pass |
| `rawclean-7` | 7.48 | 2244 | 0 | yes | Sparkplug → Maglev | not traced | pass |
| `rawclean-8` | 4.73 | 1420 | 0 | yes | Sparkplug → Maglev | not traced | pass |
| `rawclean-9` | 7.60 | 2280 | 0 | yes | Sparkplug → Maglev | not traced | pass |
| `rawclean-10` | 9.87 | 2960 | 0 | yes | Sparkplug → Maglev | not traced | pass |
| `rawclean-11` | 6.13 | 1840 | 0 | yes | Sparkplug → Maglev | not traced | pass |
| `rawclean-12` | 8.87 | 2660 | 0 | yes | Sparkplug → Maglev | not traced | pass |
| `fullraw-1` | 6.09 | 1828 | 0 | yes | Sparkplug → Maglev | not traced | pass |
| `fullraw-2` | 7.89 | 2368 | 0 | yes | Sparkplug → Maglev | not traced | pass |

### D: CDP moves, a 300-move warm-up, `handleEvent` kept in Sparkplug

| Run | Kernel B per move | `handleEvent` B | `#move` B | `lift.ts:translate` key | Tier before → after the window | Recompiles in the window | Row |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `rawnoopt-1` | 8.92 | 2676 | 0 | yes | Sparkplug → Sparkplug | 0 | pass |
| `rawnoopt-2` | 10.32 | 3096 | 0 | yes | Sparkplug → Sparkplug | 0 | pass |
| `rawnoopt-3` | 6.17 | 1852 | 0 | yes | Sparkplug → Sparkplug | 0 | pass |

### E: CDP moves, 1,000- and 3,000-move warm-ups

| Run | Kernel B per move | `handleEvent` B | `#move` B | `lift.ts:translate` key | Tier before → after the window | Recompiles in the window | Row |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `raw1000-1` | 0.00 | 0 | 0 | no | Maglev → Maglev | 0 | fail |
| `raw1000-2` | 1.12 | 336 | 0 | no | Maglev → Maglev | 0 | fail |
| `raw1000-3` | 0.00 | 0 | 0 | no | Maglev → Maglev | 0 | fail |
| `raw3000-1` | 0.00 | 0 | 0 | no | Maglev → Maglev | 0 | fail |
| `raw3000-2` | 0.00 | 0 | 0 | no | Maglev → Maglev | 0 | fail |
| `raw3000-3` | 0.00 | 0 | 0 | no | Maglev → Maglev | 0 | fail |

### M: CDP moves, a 300-move warm-up, one escaping `{ x, y }` per sample in `#move`

| Run | Kernel B per move | `handleEvent` B | `#move` B | `lift.ts:translate` key | Tier before → after the window | Recompiles in the window | Row |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `mutraw-1` | 59.31 | 2080 | 15712 | yes | Sparkplug → Maglev | not traced | fail |
| `mutraw-2` | 59.08 | 2452 | 15272 | yes | Sparkplug → Maglev | not traced | fail |
| `mutraw-3` | 62.17 | 2028 | 16624 | yes | Sparkplug → Maglev | not traced | fail |
| `mutraw-4` | 59.12 | 2368 | 15368 | yes | Sparkplug → Maglev | not traced | fail |
| `mutraw-5` | 62.36 | 1540 | 17168 | yes | Sparkplug → Maglev | not traced | fail |

### F: Playwright's mouse, a 300-move warm-up, in a full run of drag's suite

The row was the only one of the 938 tests that failed.

| Run | Kernel B per move | `handleEvent` B | `#move` B | `lift.ts:translate` key | Tier before → after the window | Recompiles in the window | Row |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `fullbase-1` | 37.93 | 11380 | 0 | yes | Sparkplug → Maglev | not traced | fail |