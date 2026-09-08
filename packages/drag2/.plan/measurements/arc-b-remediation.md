# Arc B's remediation — the construction window and the identity conjunct

**What was measured.** The joint effect of D-184 and D-186, landed together, against `5f7a901a4` — the tree at which Arc B's architecture closed and neither decision had been implemented. D-184 adds two channel guards, two latch tests in `arm()` and one shared unwind; D-186 deletes `#pinned`, its capture, its two clears, the identity conjunct, `Kernel.#begin()` and the seam driver's fifth collaborator.

**One measurement, not two.** [`CONTRIBUTING.md`](../../../../CONTRIBUTING.md) §15 refuses added ablations — compression deltas do not decompose, and related changes share tokens — so what is booked here is the joint change that actually landed. D-186's own entry carries a ranking figure for its deletion in isolation (**−44, −18, −21, −25, −28 B** Brotli, taken at `a114daf8f` in a worktree); that figure ranked the deletion and is not subtracted from anything below.

**Method.** Both trees built and measured with `bench/size/measure.ts` — Rolldown at the lockfile version, `neutral`/ESM, Rolldown's minifier, Brotli at `node:zlib`'s default quality, no aliases, no repetition. The baseline was measured in a worktree detached at `5f7a901a4` so the working checkout was never mutated.

## The table

| Row | minified `5f7a901a4` | minified landed | Δ | Brotli `5f7a901a4` | Brotli landed | Δ |
| --- | --- | --- | --- | --- | --- | --- |
| minimal | 34,768 | 34,773 | **+5** | 10,431 | 10,435 | **+4** |
| minimal (xy) | 34,091 | 34,096 | **+5** | 10,331 | 10,301 | **−30** |
| minimal + layoutAnimation | 35,743 | 35,748 | **+5** | 10,763 | 10,774 | **+11** |
| xy + layoutAnimation | 35,066 | 35,071 | **+5** | 10,659 | 10,665 | **+6** |
| minimal + landing | 35,161 | 35,166 | **+5** | 10,585 | 10,584 | **−1** |
| complete | 36,136 | 36,141 | **+5** | 10,917 | 10,918 | **+1** |
| free drag minimal | 27,042 | 27,047 | **+5** | 8,159 | 8,136 | **−23** |
| free drag + bounds | 27,507 | 27,512 | **+5** | 8,293 | 8,298 | **+5** |
| free drag + landing | 27,435 | 27,440 | **+5** | 8,293 | 8,295 | **+2** |
| free drag complete | 27,900 | 27,905 | **+5** | 8,448 | 8,447 | **−1** |
| both behaviors | 43,531 | 43,536 | **+5** | 12,381 | 12,373 | **−8** |
| vocabulary root — `drag.js` | 252 | 252 | **0** | 142 | 142 | **0** |
| kernel root — `kernel.js` | 19,981 | 19,986 | **+5** | 6,210 | 6,210 | **0** |
| baseline A — non-composed | 35,429 | 35,434 | **+5** | 10,722 | 10,731 | **+9** |
| baseline B — shipped package | 22,573 | 22,573 | **0** | 6,889 | 6,889 | **0** |

**No module moved in any composition**, and no budget was breached: slack runs 0.06 to 0.15 kB, the same band as before.

## What the numbers say

**The two figures disagree, and the minified one is the readable half.** Every composition that carries `kernel/kernel.js` pays **exactly +5 B minified** and nothing else does, which is the whole delta arriving in one module and being counted once per graph. Brotli then spreads it from **−30 B** to **+11 B** with no relation to the source change, because what the guards add is repetition of tokens the compressor already had — `this.#spec` and `this.#bracket.closed` are the most common substrings in the file — while what the conjunct's deletion removes is a distinct one. **Shipped bytes are compressed bytes**, so the Brotli column is the reported figure; the minified column is what says the change is one thing rather than fifteen.

**The deletion did not net out as a shrink, and that is the point of measuring the joint change.** D-186 alone would have taken 18 to 44 B off the kernel-carrying rows. Landed beside D-184, five of the eleven kernel-carrying rows are still negative on Brotli, four are positive and one is flat — which is a change of roughly the size of the compressor's own noise on this graph, and not the shrink either decision predicted on its own.

## The controls

**Two rows declared a control and both held it exactly**: `vocabulary root — drag.js` at 142 B and `baseline B` at 6,889 B, byte-identical on both figures with no module gained. **A row that does not move is a result** ([`CONTRIBUTING.md`](../../../../CONTRIBUTING.md) §18), and these two were declared before the pass as rows it must not reach.

**The five kernel-carrying controls are removed for the D-170 arc series** and booked back at its close as [O-13](../obligations.md), which is F-385's disposition under D-186. `measure.ts`'s own rule omits a control _on a row a pass is expected to move_, and every kernel-tier pass is expected to move all five; re-declaring them after each arc produces a figure read off the result, which is the failure [`budget-rebases.md`](budget-rebases.md) names as _a budget wearing an exact number_. They were still declared at the moment this pass ran, and their movement — **−23, +5, +2, −1, 0 B** — is recorded here as the last reading before the suspension rather than absorbed by a re-declaration. **What the suspension withdraws is stated at [O-13](../obligations.md)**, which is the one place it is stated; nothing here says what the remaining rows still cover.

## No budget re-base, and the trigger is stated

**§18 re-bases after a shrink, and there is no shrink.** D-186's sequence anticipated one and scheduled a re-base of the rows the five controls sat on; the joint landing is not a shrink, so the condition that re-base rests on is not met. Every ceiling stays where it is, every row is 0.06 to 0.15 kB under it, and no row went negative.

**O-13's close restores the five controls and authorises no re-base.** When the last arc of the D-170 series lands, the five are restored with fresh exact figures, and that is the next occasion on which these ceilings are read — §18 decides there whether they move, from the reading rather than from the boundary that preceded it. Re-basing them now, on a mixed result inside one pass, is the thing §18 calls turning the instrument into a record of what happened.

## The review remediation of the same arc, measured on its own

**What was measured.** The one production change in Arc B's review remediation, against `6def139f0` — the deletion of the `current && draft` narrowing beside `arm()`'s terminal latch test (F-394), which the monotonic latch already establishes and which is replaced by the two assertions the file uses at 32 other sites. Nothing else in that landing reaches the runtime: the rest is instruments, JSDoc on a type-only module and record repairs.

**A separate landing, so a separate joint measurement.** [`CONTRIBUTING.md`](../../../../CONTRIBUTING.md) §15 forbids ablations within a landing, not measurements of successive landings. This one is booked against the tree the previous section's _landed_ column describes, which is why that column and the baseline below are the same numbers.

| Row | minified `6def139f0` | minified landed | Δ | Brotli `6def139f0` | Brotli landed | Δ |
| --- | --- | --- | --- | --- | --- | --- |
| minimal | 34,773 | 34,767 | **−6** | 10,435 | 10,422 | **−13** |
| minimal (xy) | 34,096 | 34,090 | **−6** | 10,301 | 10,294 | **−7** |
| minimal + layoutAnimation | 35,748 | 35,742 | **−6** | 10,774 | 10,752 | **−22** |
| xy + layoutAnimation | 35,071 | 35,065 | **−6** | 10,665 | 10,653 | **−12** |
| minimal + landing | 35,166 | 35,160 | **−6** | 10,584 | 10,582 | **−2** |
| complete | 36,141 | 36,135 | **−6** | 10,918 | 10,916 | **−2** |
| free drag minimal | 27,047 | 27,041 | **−6** | 8,136 | 8,132 | **−4** |
| free drag + bounds | 27,512 | 27,506 | **−6** | 8,298 | 8,295 | **−3** |
| free drag + landing | 27,440 | 27,434 | **−6** | 8,295 | 8,306 | **+11** |
| free drag complete | 27,905 | 27,899 | **−6** | 8,447 | 8,459 | **+12** |
| both behaviors | 43,536 | 43,530 | **−6** | 12,373 | 12,368 | **−5** |
| vocabulary root — `drag.js` | 252 | 252 | **0** | 142 | 142 | **0** |
| kernel root — `kernel.js` | 19,986 | 19,980 | **−6** | 6,210 | 6,208 | **−2** |
| baseline A — non-composed | 35,434 | 35,428 | **−6** | 10,731 | 10,732 | **+1** |
| baseline B — shipped package | 22,573 | 22,573 | **0** | 6,889 | 6,889 | **0** |

**Every kernel-carrying row pays exactly −6 B minified and no other row moves at all**, which is one deleted expression arriving in one module and being counted once per graph. Brotli spreads it from **−22 B** to **+12 B**: two conjuncts and their operator are a repeat the compressor was already paying little for, so removing them buys almost nothing and rearranges the window on two free-drag rows. **Shipped bytes are compressed bytes**, so Brotli is the reported figure and the minified column is what says the change is one thing rather than fifteen.

**Both surviving controls held exactly** — 142 B and 6,889 B, byte-identical, no module gained. They were declared before the pass as rows this change must not reach, and it did not. **No module moved in any composition**, and no ceiling was approached: slack runs 0.06 to 0.13 kB, the same band as before.

**No re-base.** Ten of the fifteen rows are negative on Brotli, three are positive and two are flat, which is not the shrink §18's third bullet re-bases after; the five suspended controls' restoration boundary is unchanged, and [O-13](../obligations.md) still states what the suspension withdraws.