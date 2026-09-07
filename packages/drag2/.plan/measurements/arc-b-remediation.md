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

**Two rows declared a control and both held it exactly**: `vocabulary root — drag.js` at 142 B and `baseline B` at 6,889 B, byte-identical on both figures with no module gained. They are the two rows carrying no kernel, and a kernel symbol reaching either is what they exist to detect. **A row that does not move is a result** ([`CONTRIBUTING.md`](../../../../CONTRIBUTING.md) §18), and these two were declared before the pass as rows it must not reach.

**The five kernel-carrying controls are removed for the D-170 arc series** and booked back at its close as [O-13](../obligations.md), which is F-385's disposition under D-186. `measure.ts`'s own rule omits a control _on a row a pass is expected to move_, and every kernel-tier pass is expected to move all five; re-declaring them after each arc produces a figure read off the result, which is the failure [`budget-rebases.md`](budget-rebases.md) names as _a budget wearing an exact number_. They were still declared at the moment this pass ran, and their movement — **−23, +5, +2, −1, 0 B** — is recorded here as the last reading before the suspension rather than absorbed by a re-declaration.

## No budget re-base, and the trigger is stated

**§18 re-bases after a shrink, and there is no shrink.** D-186's sequence anticipated one and scheduled a re-base of the rows the five controls sat on; the joint landing is not a shrink, so the condition that re-base rests on is not met. Every ceiling stays where it is, every row is 0.06 to 0.15 kB under it, and no row went negative.

**The re-base trigger for these rows is O-13's close** — when the last arc of the D-170 series lands, the five controls are restored with fresh exact figures and the ceilings are read against whatever the series actually cost. Re-basing them now, on a mixed result inside one pass, is the thing §18 calls turning the instrument into a record of what happened.