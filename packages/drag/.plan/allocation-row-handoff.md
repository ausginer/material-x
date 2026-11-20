# Allocation row handoff

**For:** one `implementer` unit on `drag/alloc-flake-1`. **Base:** the commit that carries this handoff.

**Governing records:** `DRF-53` and `DRF-48` in [`00-index.md`](00-index.md), with their datings of 2026-11-20; the contract's `DRI-17` ([`contract.md`](contract.md)); `repo:RD-7`; CONTRIBUTING §Comments and JSDoc. **The reading:** [`measurements/2026-11-20-allocation-row.md`](measurements/2026-11-20-allocation-row.md), with its probes in [`probes/allocation-row/`](probes/allocation-row/).

**Goal:** after this unit, the hot-path allocation row's result depends only on the code. At a tree whose kernel allocates nothing per sample, it reads within its bound in every run. A kernel that allocates one object per sample fails it in every run.

The row is `tests/hot-path.browser.test.ts`, `drag:DRI-17 hot path` › _"should allocate per sample only the CSS string a lifted write needs"_, in the `shipped` project (line 261 at `e4b0e475d`).

## The cause

The reading is the architect's, at `e4b0e475d` in Playwright 1.65.0's Chromium 158.0.8127.18. Every run is in the [reading](measurements/2026-11-20-allocation-row.md).

1. **Playwright runs page script on every move the row makes.** In Chromium, Playwright's `mouse.move` with the left button held goes through `interceptDragCausedByMove` (`crDragDrop.ts`). In the utility world of every frame, it first evaluates `setupDragListeners`, which assigns `window.__cleanupDrag`. After the move, it evaluates `window.__cleanupDrag?.()`, which deletes that global. All 600 moves of the row are such moves.
2. **V8 recompiles that script on nearly every move once a cycle starts.** It optimizes the evaluated `setupDragListeners` call with Maglev. On the next move it discards that code (_"dependent property cell changed"_), because the cleanup deleted `window.__cleanupDrag`, the global the code assigns, in between. V8's code log ties the recompiled function to that script, at offsets 0 to 942. The traced runs at the same tree had 3 to 143 such recompiles inside the 300-move window.
3. **The heap sampler files V8's work for each recompile under `kernel/session.ts:handleEvent`.** Why that function is inferred, not read: it is the first JavaScript to run when a move's event arrives, so V8's pending work is likely done while it is on top of the stack. Each recompile adds about 200 to 350 B there. The sampled objects are 36 to 380 B and grow in size, so they aren't an object the kernel allocates per move. Across the runs, `handleEvent`'s bytes follow the recompile count: 3 recompiles gave 1,060 B, 42 gave 10,484 B and 143 gave 30,712 B.
4. **The kernel's tier is not the cause.** In the `drag:DRF-2` row, which runs next in the same page, `handleEvent` was already Maglev code before and after its window. With 67 to 166 recompiles there, it still read 8 to 33 KB. In a run warmed to Maglev before the window, 4 recompiles gave 860 B.
5. **Why it varies:** whether the recompile cycle falls inside the window. When it starts depends on the page's earlier held-button moves and on V8's tier decisions. That isn't characterized further, because the repair removes the cycle.
6. **Not the cause:** the 64-byte interval. Its sampling noise is a few hundred bytes over the window, and the CDP arm below reads 4.73 to 10.15 B per move at the same interval. Garbage-collection timing isn't the cause either: the profile includes collected objects, and the excess follows the recompile count. Vite's version didn't change between these runs.

Two facts about the row itself came up in the reading:

- **Its warm-up doesn't reach the optimized tier.** In every run at 300 moves, `handleEvent` is in Sparkplug, the baseline tier, when sampling starts, and in Maglev when it ends. The row's comment _"It lets the kernel's code reach its optimized form"_ is false. So is _"Warm, the kernel reads 0 to about 1 B per move"_ as a statement of what this row reads. Without the recompile cycle, it reads 4.73 to 10.15 B per move. With `handleEvent` kept in Sparkplug for the whole window, it reads 6.17 to 10.32.
- **Its `lift.ts:translate` key exists only while `translate` isn't inlined.** At warm-ups of 1,000 and 3,000 moves, `translate` is inlined into `sortable/operation.ts:move`. The sampler then files its bytes there, the key disappears, and the row fails its second assertion in 12 of 12 runs. At 300, the key was present in every run. V8 counts tier-up in executions, so this should be fixed for a given tree and Chromium. That is an inference, consistent with every run at 300. A Chromium that tiers up earlier would fail the row on that assertion every time, with a readable message.

## Boundaries

**In scope:**

- the row: its warm-up loop, its sampled loop and its comments;
- one new Playwright-only command in `tests/support/commands.node.ts`, and its declaration in `tests/support/browser-commands.ts`.

**Out of scope.** Don't change these:

- the bound of 16, the 64-byte interval, the warm-up's 300 moves, the window's 300 moves, the keys the row sums, the `liftFunctions` assertion, the title and the `measurement` tag;
- the `drag:DRF-2` row. Its verdict reads only `lift.ts` keys, and in this reading the recompile bytes land in `handleEvent` there too;
- `pointerMove` and every other command, every other test, `src/`, `bench/` and `.scripts/`.

**Return to the architect** if a required property can't be met without changing something out of scope.

## Required properties

1. **The row's 600 moves don't go through Playwright's drag interception.** Each move of its warm-up and of its window reaches the page as Chromium input sent by CDP `Input.dispatchMouseEvent`. It is a `mouseMoved` event with the left button held (`button: 'left'`, `buttons: 1`), the call Playwright's own move makes after its interception. Each command is one move, and the page receives one trusted `pointermove` at the requested point. The input still goes through the browser's input pipeline, which is why the row doesn't dispatch synthetic events.
2. **The rest of the row is unchanged.** The press, and its first move through Playwright's mouse, stay as they are.
3. **The pointer agrees with Playwright after the moves.** Playwright's mouse keeps its own position, and the CDP moves don't update it. After the last CDP move, the next Playwright pointer command doesn't depend on a position that differs from the browser's. That includes the harness's cleanup. Show how this holds.
4. **The command says why it exists,** in one or two sentences: Playwright's Chromium mouse runs page script on each move with a button held, and the heap sampler attributes V8's work for that script to the kernel. It throws for a provider other than Playwright, as `playwrightOnly` does.
5. **The row's comments state what holds,** with no finding id, review name or commit (CONTRIBUTING §Comments and JSDoc):
   - the warm-up doesn't reach the optimized tier, so the window includes the kernel's tier-up from the baseline tier;
   - unchanged, the kernel reads about 5 to 10 B per move, and one escaping object per sample reads about 60;
   - why the moves are sent by CDP.

## The proofs before the pull request

Record each reading in `allocation-row-report.md`. The row prints its bytes only when it fails. Take each run's figures with the [probe](probes/allocation-row/), applied uncommitted and reverted afterwards, or with an equivalent temporary print.

| Proof | Required result |
| --- | --- |
| **P1. Stable alone.** 20 consecutive runs of `aube exec just test-engines tests/hot-path.browser.test.ts` in `packages/drag` | The row passes in 20 of 20. Record each run's kernel bytes per move. The architect's CDP arm read 4.73 to 10.15 |
| **P2. Stable in full runs.** 3 runs of root `aube exec just test` | The row passes in 3 of 3. Record the readings and the other failures, if any |
| **P3. A regression fails.** In `Session.#move`, after `this.#drag.y = event.clientY;`, add `(this.#drag as unknown as { last?: unknown }).last = { x: event.clientX, y: event.clientY };`. Run the file 5 times, then revert | The row fails in 5 of 5, on the kernel bound, with `kernel/session.ts:#move` in its message. The architect's runs read 59.08 to 62.36 B per move |
| **P4. No recompile cycle in the window.** 5 runs with the probe's trace flags (`DEBUG=pw:browser`, `PROBE_JS_FLAGS='--trace-opt --trace-deopt'`), counted by `corr.py` | 0 _"dependent property cell changed"_ inside the window in 5 of 5 |
| **P5. The same input.** A probe that moves once with Playwright's mouse and once with the new command, each to the same point with the button held, and records the window's `pointermove` events | Each move gives one event, with the same `clientX`, `clientY`, `buttons` and `pointerType`, and `isTrusted` true |
| **P6. Gates** | `handoff.md`'s steps for the changed files; `aube exec just typecheck` in `packages/drag` |
| **P7. CI.** The pull request's `measurements` job, run three times (the first run and two reruns) | The row passes in each. Record the run ids |

**Report** in `allocation-row-report.md`, with the commits, the readings above and the stopping point. The architect reads it and decides whether `DRF-53` and `DRF-48` close.

## Not adopted

- **A longer warm-up, to reach Maglev before the window.** The kernel then reads 0 to 1.12 B per move, but `translate` is inlined. So the `liftFunctions` assertion fails, and keeping the row would change what it measures. Each move takes about one frame, so a warm-up of 1,000 moves adds about 12 s to the file. And it doesn't remove the recompile cycle: in a 3,000-move run, 4 recompiles in the window still gave 860 B.
- **A higher bound.** The cycle reached 102 B per move. A bound above that can't tell a single escaping object per sample (about 60) from no change.
- **Forcing optimization with V8's native syntax.** The row would measure a tier that V8 didn't choose, and the project would need `--allow-natives-syntax`.
- **Excluding `handleEvent`'s bytes.** It is the kernel's entry point, where an allocation the kernel makes per sample would show.
- **Synthetic `PointerEvent`s dispatched in the page.** They are untrusted and don't go through the browser's input pipeline, which is the input the hot-path file measures.