# D-200 — `Lifetime` and `ActionQueue` as classes

**What was measured.** [D-200](../contract/00-index.md) landed in the two steps it orders, against baseline `d7b07a8c0`, which changed no drag2 source after the decision was recorded. **Step 1** makes `Lifetime` a class, declares `LifetimeScope` as an interface and removes `useWhile`. **Step 2** makes `ActionQueue` a class with an in-place `clear()` and makes `ExecutionBracket` drain through `apply`. The decision asks for one composition figure per step, so each step is read against the state before it. The table also gives the joint figure (baseline against landed), because the two step deltas do not add up to the joint delta under compression ([`CONTRIBUTING.md`](../../../../CONTRIBUTING.md) §15).

**Method.** Each state was built with `just build` and measured by `measureAll()` from [`measure.ts`](../../bench/size/measure.ts) (Rolldown at the lockfile version, its minifier, and Brotli at `node:zlib`'s default quality), on the same machine in one session. The baseline was measured in the working checkout before any D-200 edit. Its only uncommitted source difference from `d7b07a8c0` was one deleted blank line in `src/kernel/lifetimes.ts`, which the minifier cannot see. A detached worktree at `d7b07a8c0` was used for the test and lint comparisons below, and not for the size figures.

## The table

Minified bytes, then Brotli bytes, at the baseline, after step 1 and after step 2. Δ₁ is step 1, Δ₂ is step 2, and Σ is baseline against landed.

| Row | min base | min step 1 | min landed | Δ₁ | Δ₂ | Σ | Brotli base | Brotli step 1 | Brotli landed | Δ₁ | Δ₂ | **Σ** | budget | slack |
| --- | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: |
| minimal | 34,306 | 34,385 | 34,357 | +79 | −28 | +51 | 10,351 | 10,362 | 10,349 | +11 | −13 | **−2** | 10,549 | 200 |
| minimal (xy) | 33,625 | 33,704 | 33,676 | +79 | −28 | +51 | 10,228 | 10,218 | 10,215 | −10 | −3 | **−13** | 10,421 | 206 |
| minimal + layoutAnimation | 35,285 | 35,364 | 35,336 | +79 | −28 | +51 | 10,705 | 10,691 | 10,684 | −14 | −7 | **−21** | 10,887 | 203 |
| xy + layoutAnimation | 34,604 | 34,683 | 34,655 | +79 | −28 | +51 | 10,572 | 10,564 | 10,564 | −8 | 0 | **−8** | 10,776 | 212 |
| minimal + landing | 34,699 | 34,778 | 34,750 | +79 | −28 | +51 | 10,505 | 10,502 | 10,511 | −3 | +9 | **+6** | 10,695 | 184 |
| complete | 35,678 | 35,757 | 35,729 | +79 | −28 | +51 | 10,852 | 10,848 | 10,834 | −4 | −14 | **−18** | 11,033 | 199 |
| free drag minimal | 26,812 | 26,891 | 26,863 | +79 | −28 | +51 | 8,118 | 8,107 | 8,109 | −11 | +2 | **−9** | 8,266 | 157 |
| free drag + bounds | 27,278 | 27,357 | 27,329 | +79 | −28 | +51 | 8,281 | 8,275 | 8,276 | −6 | +1 | **−5** | 8,423 | 147 |
| free drag + landing | 27,205 | 27,284 | 27,256 | +79 | −28 | +51 | 8,280 | 8,272 | 8,274 | −8 | +2 | **−6** | 8,425 | 151 |
| free drag complete | 27,671 | 27,750 | 27,722 | +79 | −28 | +51 | 8,428 | 8,435 | 8,423 | +7 | −12 | **−5** | 8,576 | 153 |
| both behaviors | 43,074 | 43,153 | 43,125 | +79 | −28 | +51 | 12,316 | 12,312 | 12,317 | −4 | +5 | **+1** | 12,493 | 176 |
| vocabulary root — `drag.js` | 252 | 252 | 252 | 0 | 0 | 0 | 142 | 142 | 142 | 0 | 0 | **0** | 205 | 63 |
| kernel root — `kernel.js` | 19,751 | 19,830 | 19,806 | +79 | −24 | +55 | 6,189 | 6,177 | 6,178 | −12 | +1 | **−11** | 6,312 | 134 |
| baseline A — non-composed | 34,971 | 35,050 | 35,022 | +79 | −28 | +51 | 10,672 | 10,665 | 10,667 | −7 | +2 | **−5** | 10,855 | 188 |
| baseline B — shipped package | 22,618 | 22,618 | 22,618 | 0 | 0 | 0 | 6,916 | 6,916 | 6,916 | 0 | 0 | **0** | 7,040 | 124 |

**No module entered or left any graph at either step**: 33/32/34/33/35/36, 27/28/29/30/47, 2/16/31/26 on all three readings. **No row breached its ceiling.**

**The two controls that cannot see the kernel did not move**, which was predicted before the run. `vocabulary root` does not reach `lifetimes.ts` or `queue.ts`, and baseline B measures the shipped `@ydinjs/drag` package. Every other row carries both modules, and every one of them moved at both steps.

## What the numbers say

**Step 1 costs +79 B minified on every kernel-carrying row.** That is the class shell: a constructor, a `signal` getter, and `#controller`, `#notify`, `#disposers` and `#finalized` as private fields with `this.#…` reads, where the factory had closure variables the minifier could shorten. The figure is net of removing `useWhile` and inlining its guard at the call. The figure is positive, and D-200 says such a figure is recorded rather than defended.

**Step 2 recovers −28 B on the sortable and free-drag rows and −24 B on `kernel.js`.** The free functions and the two-array record are gone, and the drain loop moved into `apply`. The only addition is the bracket's `#step` field.

**Brotli is mostly negative, and the two columns disagree in direction on eleven rows.** Jointly, +51 B minified is between −21 B and +6 B shipped. Eleven of the thirteen kernel-carrying rows went down. The two that went up are `minimal + landing` (+6 B) and `both behaviors` (+1 B). A class with `this.#…` reads repeats tokens the kernel already uses many times, so the compressor charges little for them. **Shipped bytes are compressed bytes, so the Brotli column governs** (§15). On it, this landing is noise in both directions: −21 B to +6 B on rows of 8.1 to 12.3 kB.

**This is not a size pass.** D-200 is an ownership decision. It is measured because §15 asks which consumers pay, and nearly none do.

**The published declarations went from 112,992 B to 113,026 B** (+34 B), with comment rising from 83,623 B to 83,716 B, across the same 33 files. All of it is `kernel/lifetimes.d.ts`. `useWhile` leaves, `signal` gains `readonly`, the type literal becomes an interface, and the docblock gains the receiver precondition consumers need: `use` must be called on the scope. Step 2 does not move the declarations, because `queue.ts` publishes nothing.

## The per-sample path

**`apply` adds one callback call per drained action, and every `pointermove` drains** (D-200 property 4). So this was measured as a runtime cost rather than inferred from bytes (§0). The probe built one `ExecutionBracket` with a trivial `handle` and dispatched 2,000,000 actions per run, each dispatch draining one entry and clearing. It took five warm-up runs and fifteen timed runs, and ran three times, alternating the baseline worktree's `execution.ts` and `queue.ts` with the landed ones, under Node with type stripping.

| Run | before, median ns/dispatch | after, median ns/dispatch |
| --- | -------------------------: | ------------------------: |
| 1   |                      268.6 |                     138.7 |
| 2   |                      264.2 |                     147.2 |
| 3   |                      186.5 |                     125.7 |

**No regression.** The landed drain was faster in every run. A plausible reason is one push and one truncation in place of two of each. Spread within a run was wide, though (minimum to maximum about 2×), and the probe ran in Node, not in the browser, so the figure says _not slower_ and does not establish a speedup.

## Instruments outside D-200, recorded and not changed

**Six `control:` equalities were already red at the baseline**, before any D-200 edit, and no D-200 change caused them. They are `free drag minimal` (8,118 against a declared 8,116), `free drag + bounds` (8,281 against 8,274), `free drag + landing` (8,280 against 8,276), `free drag complete` (8,428 against 8,426), `kernel root` (6,189 against 6,185) and baseline B (6,916 against 6,889). `tests/bench/size.node.test.ts` reds the same six. **Each one's interval drift predates this landing.** It is not attributable to D-200, and this record does not attribute it. The nearest landed change that could account for it is `01d88645f`, which updated dependencies, but that is unverified. **No control was re-based** (§18 forbids re-basing during a pass), and declaring the step-2 figures would also have absorbed the unexplained drift. That reading belongs to whoever owns the drift.

**The suite's other pre-existing reds are identical at `d7b07a8c0`.** On a clean worktree at that commit, the same runner reports `tests/docs.node.test.ts`'s four cases (TypeDoc exits with code 3), and `tests/sortable/react.browser.test.ts` and `stories.browser.test.ts` fail to load. Every one of them is red there as well.