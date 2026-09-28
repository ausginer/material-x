# Arc D's remediation — the variance obligation and the release-site snapshot

**What was measured.** The post-Arc-D remediation round, landed as one unit against `9e74f52fa` — the commit that settled D-192…D-195 and changed no source. Two of its ten findings reach the runtime: **F-416** builds the release proposal from the frame's own committed `snapshot` instead of the behavior-private `#snapshot`, and **D-194** (F-413 + F-418) rewrites `InsertionGeometry.resolve` and `.moved` as the named aliases `ResolveInsertion` and `MovedInsertion`. Everything else in the landing is instruments, comments and record: a widened deferred-table recogniser, two new declaration-instrument rows, four repaired comments and a deleted JSDoc clause.

**One joint measurement** ([`CONTRIBUTING.md`](../../../../CONTRIBUTING.md) §15). No ablation is booked. One was taken for **attribution** and is reported below as a ranking figure, because D-194's own scope claim — _it emits no JavaScript_ — is a falsifiable prediction about fifteen rows and is worth reading rather than asserting.

**Method.** Both trees built and measured with [`measure.ts`](../../bench/size/measure.ts) — Rolldown at the lockfile version, `neutral`/ESM, Rolldown's minifier, Brotli at `node:zlib`'s default quality, no aliases and no repetition. The baseline ran in a worktree detached at `9e74f52fa` with `node_modules` symlinked from the repository root, on the same machine in the same session, so the working checkout was never mutated. Its fifteen rows reproduce [`arc-d.md`](arc-d.md)'s landed column exactly.

## The table

| Row | minified `9e74f52fa` | minified landed | Δ | Brotli `9e74f52fa` | Brotli landed | Δ | budget | slack |
| --- | --: | --: | --: | --: | --: | --: | --: | --: |
| minimal | 34,367 | 34,361 | **−6** | 10,357 | 10,353 | **−4** | 10,549 | 196 |
| minimal (xy) | 33,686 | 33,680 | **−6** | 10,224 | 10,227 | **+3** | 10,421 | 194 |
| minimal + layoutAnimation | 35,342 | 35,336 | **−6** | 10,697 | 10,700 | **+3** | 10,887 | 187 |
| xy + layoutAnimation | 34,661 | 34,655 | **−6** | 10,560 | 10,561 | **+1** | 10,776 | 215 |
| minimal + landing | 34,760 | 34,754 | **−6** | 10,503 | 10,504 | **+1** | 10,695 | 191 |
| complete | 35,735 | 35,729 | **−6** | 10,860 | 10,845 | **−15** | 11,033 | 188 |
| free drag minimal | 26,905 | 26,905 | **0** | 8,116 | 8,116 | **0** | 8,266 | 150 |
| free drag + bounds | 27,370 | 27,370 | **0** | 8,274 | 8,274 | **0** | 8,423 | 149 |
| free drag + landing | 27,298 | 27,298 | **0** | 8,276 | 8,276 | **0** | 8,425 | 149 |
| free drag complete | 27,763 | 27,763 | **0** | 8,426 | 8,426 | **0** | 8,576 | 150 |
| both behaviors | 43,130 | 43,124 | **−6** | 12,305 | 12,313 | **+8** | 12,493 | 180 |
| vocabulary root — `drag.js` | 252 | 252 | **0** | 142 | 142 | **0** | 205 | 63 |
| kernel root — `kernel.js` | 19,844 | 19,844 | **0** | 6,185 | 6,185 | **0** | 6,312 | 127 |
| baseline A — non-composed | 35,028 | 35,022 | **−6** | 10,664 | 10,660 | **−4** | 10,855 | 195 |
| baseline B — shipped package | 22,573 | 22,573 | **0** | 6,889 | 6,889 | **0** | 7,040 | 151 |

**No module entered or left any graph**: 33/32/34/33/35/36, 27/28/29/30/47, 2/16/31/26 — identical on both sides. **No row breached its ceiling and none went negative.** Slack runs **0.06 to 0.22 kB over all fifteen rows** — 63 B on `vocabulary root` to 215 B on `xy + layoutAnimation`.

## What the numbers say

**Every sortable-carrying row pays exactly −6 B minified and nothing else moves**, which is one changed identifier arriving in one module and being counted once per graph. `buildReorderProposal(this.#snapshot, …)` becomes `buildReorderProposal(snapshot, …)`: a private field read on `this` replaced by a local the minifier has already shortened to a single character.

**Brotli spreads it from −15 B to +8 B, and the two columns disagree in direction on five rows** ([`CONTRIBUTING.md`](../../../../CONTRIBUTING.md) §15). That is the expected shape rather than a puzzle: what was deleted is a **repeat** — `this.#snapshot` occurs throughout `spec.ts` and the compressor was paying almost nothing for one more copy of it — while the local it is replaced by rearranges the window. **Shipped bytes are compressed bytes**, so the Brotli column is the reported figure, and on it this landing is noise: ±8 B on rows of 10.2 to 12.3 kB. The minified column is what says the change is one thing rather than eight.

**This is not a size pass and no byte here is a result.** F-416 is a correctness repair — the insertion carries the version it was resolved against, so building against a republished `#snapshot` is the one input that can throw `drag: sortable/release-no-proposal` — and it happens to be six bytes smaller. It is measured because §15 asks which consumers pay for a landing, and the answer is that nobody does.

**The published declarations went from 116,432 B to 116,295 B raw**, of which comment fell from 85,343 B to 85,086 B, across the same 33 files. Two effects, in opposite directions and unequal: D-194 adds two exported aliases and F-415 deletes a design-defence clause from a block that reaches a consumer's `.d.ts`. Net **−137 B** of tarball, of which −257 B is comment and +120 B is declaration text — the same reading [`CONTRIBUTING.md`](../../../../CONTRIBUTING.md) §4 (c) makes about pricing the prose rather than the values.

**The figure is in bytes because the obligation has to be falsifiable** (D-197, F-425). A two-alias conversion moves the published declarations by tens of bytes, which two-decimal kB cannot see — an obligation to record a figure that the change cannot move is discharged by writing the same number. It is booked here, in the measurement that owns the change, rather than appended to [`arc-d.md`](arc-d.md)'s install-weight sentence, which prices Arc D's own docblock movement and is scoped to it.

## D-194's own scope claim, read rather than asserted

**D-194 predicts fifteen unchanged rows, and it is the falsifier of its own scope rather than a formality.** Taken alone in the detached worktree — `feature.ts`'s two members converted and nothing else — **all fifteen compositions are byte-identical to the baseline on both columns, with no module gained.** A named type alias is `declare`-only, so the conversion emits no JavaScript and cannot reach a graph.

What it does move is the declaration weight: **116,432 → 116,504 B** (+72 B), with comment falling 85,343 → 85,295 B as `moved`'s docblock leaves the member and reflows onto the alias. So the two new middle-tier names cost about **120 B of declaration text** in the tarball, which is the price D-194 states it is paying, now measured. **This figure ranks the conversion; it is not subtracted from the joint number above**, which is what actually landed.

## The controls

**All seven `control:` rows are live for the first pass since O-13's restoration, and all seven held exactly.** `free drag minimal` 8,116, `+ bounds` 8,274, `+ landing` 8,276, `complete` 8,426, `kernel root — kernel.js` 6,185, `vocabulary root — drag.js` 142 and `baseline B` 6,889 — byte-identical on both figures with no module gained.

**They were declared before the pass as rows it must not reach, and the declaration was substantive.** The round edits `src/sortable/` and nothing else in `src/`; each of the five restored rows carries `absentPrefixes: ['sortable/']`, and the two standing rows carry no behavior at all. **A row that does not move is a result** (§18), and the result here is that the restored instrument's first reading is the one it was restored to give.

## No budget re-base

**§18 re-bases after a shrink, and there is no shrink.** Five rows are positive on Brotli, three negative and seven flat. Every ceiling stays where it is, every row is 0.06 to 0.22 kB under it, and no row went negative. [SC-1](../obligations.md)'s triggers are unmet: no row is negative, and the ±8 B that moved is attributable to one named landed change.