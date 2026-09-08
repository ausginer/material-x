# Arc C — what deleting the settlement identity slot bought

**Measured 2026-09-08**, the landed arc against baseline `06ad3ff87` — the commit that settled [D-189](../contract/00-index.md) and changed no source. The baseline ran in a detached worktree with `node_modules` symlinked from the repository root, on the same machine in the same session as the arc run. Bytes from `measureAll()` in [`measure.ts`](../../bench/size/measure.ts): Rolldown at the lockfile version, `neutral`/ESM, Rolldown's minifier, Brotli at `node:zlib`'s default quality, no aliases and no repetition.

**One production change, so one joint measurement** ([`CONTRIBUTING.md`](../../../../CONTRIBUTING.md) §15). What is booked here is D-189's deletion: the `settlement` member of `AttemptSlots` and its initializer, its clear in `#retireAttempts`, the write in `#openSettlement`, the dead write in `#handleFailed`, the first conjunct of `#settlementLive` and — following it — that helper's parameter at its declaration and its one call. Everything else in the landing is instruments, comments and record: F-400's two rows are tests, and no test is bundled.

## The table

| Row | minified `06ad3ff87` | minified landed | Δ | Brotli `06ad3ff87` | Brotli landed | Δ | budget | slack |
| --- | --: | --: | --: | --: | --: | --: | --: | --: |
| minimal | 34,767 | 34,631 | **−136** | 10,422 | 10,404 | **−18** | 10,549 | 145 |
| minimal (xy) | 34,090 | 33,954 | **−136** | 10,294 | 10,269 | **−25** | 10,421 | 152 |
| minimal + layoutAnimation | 35,742 | 35,606 | **−136** | 10,752 | 10,753 | **+1** | 10,887 | 134 |
| xy + layoutAnimation | 35,065 | 34,929 | **−136** | 10,653 | 10,615 | **−38** | 10,776 | 161 |
| minimal + landing | 35,160 | 35,024 | **−136** | 10,582 | 10,568 | **−14** | 10,695 | 127 |
| complete | 36,135 | 35,999 | **−136** | 10,916 | 10,910 | **−6** | 11,033 | 123 |
| free drag minimal | 27,041 | 26,905 | **−136** | 8,132 | 8,116 | **−16** | 8,266 | 150 |
| free drag + bounds | 27,506 | 27,370 | **−136** | 8,295 | 8,274 | **−21** | 8,423 | 149 |
| free drag + landing | 27,434 | 27,298 | **−136** | 8,306 | 8,276 | **−30** | 8,425 | 149 |
| free drag complete | 27,899 | 27,763 | **−136** | 8,459 | 8,426 | **−33** | 8,576 | 150 |
| both behaviors | 43,530 | 43,394 | **−136** | 12,368 | 12,350 | **−18** | 12,493 | 143 |
| vocabulary root — `drag.js` | 252 | 252 | **0** | 142 | 142 | **0** | 205 | 63 |
| kernel root — `kernel.js` | 19,980 | 19,844 | **−136** | 6,208 | 6,185 | **−23** | 6,312 | 127 |
| baseline A — non-composed | 35,428 | 35,292 | **−136** | 10,732 | 10,711 | **−21** | 10,855 | 144 |
| baseline B — shipped package | 22,573 | 22,573 | **0** | 6,889 | 6,889 | **0** | 7,040 | 151 |

**No module entered or left any graph**: 33/32/34/33/35/36, 27/28/29/30/47, 2/16/31/26 — identical on both sides. **No row breached its ceiling and none went negative.** Slack runs **0.06 to 0.16 kB over all fifteen rows** — 63 B on `vocabulary root` to 161 B on `xy + layoutAnimation` — and **0.12 to 0.16 kB over the thirteen kernel-carrying ones**, 123 B on `complete` to the same 161 B.

## What the numbers say

**Thirteen rows pay exactly −136 B minified and the two that carry no kernel pay nothing**, which is one deletion arriving in one module and being counted once per graph. What was deleted is small and repetitive — a nullable member, three assignments of it, one identity conjunct and a parameter — and the minified figure is what says it landed in `kernel/kernel.js` alone.

**Brotli spreads it from −38 B to +1 B, and the +1 is the interesting cell.** `this.#attempts.settlement` is built from the two most repeated substrings in the file, so removing four of its occurrences returns very little to a compressor that was already paying almost nothing for them; on `minimal + layoutAnimation` the window shifts and the row comes back a byte dearer than it went in. **Shipped bytes are compressed bytes**, so Brotli is the reported figure and the minified column is what says the change is one thing rather than fifteen. That the two columns disagree in direction on one row is §15's second bullet, not a fault in either.

**The deletion is worth roughly what a deletion of its size is worth, and the record predicted no more.** D-189 justifies it by unreachability rather than by bytes: the conjunct is constant-true at its only evaluation point, and it would be deleted at a measured zero.

## The controls

**Both surviving controls held exactly**: `vocabulary root — drag.js` at 142 B and `baseline B` at 6,889 B, byte-identical on both figures with no module gained. They were declared before the pass as the rows a kernel-tier change must not reach, and it did not reach them. **A row that does not move is a result** ([`CONTRIBUTING.md`](../../../../CONTRIBUTING.md) §18).

**The five kernel-carrying controls are still suspended** for the D-170 arc series and owed back at its close ([O-13](../obligations.md)). Arc C is not that close — the series ends at Arc D — so nothing is restored here, and the four free-drag rows and `kernel root` are measured under their `budget:` alone. **What the suspension withdraws is stated at O-13**, which is the one place it is stated.

## No budget re-base, and the reading is what declines it

**§18 re-bases after a shrink, and this is a shrink — the re-base is declined on the reading rather than on the boundary** ([D-187](../contract/00-index.md)). Every ceiling stays where it is.

**The pass does not land well under budget; it lands at the standing headroom.** The ceilings this file has carried since Phase 17 sit at the landed figure plus ~150 B, and after the deletion the thirteen kernel-carrying rows sit **123 to 161 B** under theirs. Re-basing each to its landed figure plus that same 150 B would **raise nine of the thirteen ceilings** — by 1 to 27 B — lower two, and leave two where they are. A re-base that loosens the instrument on a shrink is the failure §18's third bullet names from the other side, and the arithmetic is the whole argument: there is no reclaimable slack here, because the ceilings were re-based last at D-170 step 6 and the tree has spent what it gained since.

**The precedent is Arc B's and it is followed rather than repeated by habit.** [`arc-b.md`](arc-b.md) declined the same trigger for a 7-to-49 B shrink inside the same band, on the ground that a ceiling following every arc down stops being a ceiling. This shrink is 6 to 38 B. **Restoring the five controls and re-basing the ceilings remain separate acts**, and neither happens here: the first waits on Arc D, the second waits on a reading that earns it.