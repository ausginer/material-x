# Arc D — what the activation record's membership bought

**Measured 2026-09-09**, the landed arc against baseline `0c62b02c6` — the commit that carried [D-191](../contract/00-index.md)'s post-challenge corrections and changed no source. The baseline ran in a detached worktree with `node_modules` symlinked from the repository root, on the same machine in the same session as the arc run. Bytes from `measureAll()` in [`measure.ts`](../../bench/size/measure.ts): Rolldown at the lockfile version, `neutral`/ESM, Rolldown's minifier, Brotli at `node:zlib`'s default quality, no aliases and no repetition.

**Three source commits, one joint measurement** ([`CONTRIBUTING.md`](../../../../CONTRIBUTING.md) §15). D-191 makes steps 2 and 3 separate commits and one reading, and step 1 is landed the same way, so what is booked here is the whole of what shipped: the record's completion and rename, the deletion of `realm` and `item`, the absorption of `lift` and of the cached `activePlaceholder` alias, `insertion` leaving `InsertionRuntimeView` (F-325), and `snapshot` moving from `InsertionRuntimeView` to `InsertionFrameView` (F-326). No ablation is booked, and none was taken. Everything else in the landing is instruments, comments and record: F-404's three rows are type assertions in a declaration test, and no test is bundled.

## The table

| Row | minified `0c62b02c6` | minified landed | Δ | Brotli `0c62b02c6` | Brotli landed | Δ | budget | slack |
| --- | --: | --: | --: | --: | --: | --: | --: | --: |
| minimal | 34,631 | 34,367 | **−264** | 10,404 | 10,357 | **−47** | 10,549 | 192 |
| minimal (xy) | 33,954 | 33,686 | **−268** | 10,269 | 10,224 | **−45** | 10,421 | 197 |
| minimal + layoutAnimation | 35,606 | 35,342 | **−264** | 10,753 | 10,697 | **−56** | 10,887 | 190 |
| xy + layoutAnimation | 34,929 | 34,661 | **−268** | 10,615 | 10,560 | **−55** | 10,776 | 216 |
| minimal + landing | 35,024 | 34,760 | **−264** | 10,568 | 10,503 | **−65** | 10,695 | 192 |
| complete | 35,999 | 35,735 | **−264** | 10,910 | 10,860 | **−50** | 11,033 | 173 |
| free drag minimal | 26,905 | 26,905 | **0** | 8,116 | 8,116 | **0** | 8,266 | 150 |
| free drag + bounds | 27,370 | 27,370 | **0** | 8,274 | 8,274 | **0** | 8,423 | 149 |
| free drag + landing | 27,298 | 27,298 | **0** | 8,276 | 8,276 | **0** | 8,425 | 149 |
| free drag complete | 27,763 | 27,763 | **0** | 8,426 | 8,426 | **0** | 8,576 | 150 |
| both behaviors | 43,394 | 43,130 | **−264** | 12,350 | 12,305 | **−45** | 12,493 | 188 |
| vocabulary root — `drag.js` | 252 | 252 | **0** | 142 | 142 | **0** | 205 | 63 |
| kernel root — `kernel.js` | 19,844 | 19,844 | **0** | 6,185 | 6,185 | **0** | 6,312 | 127 |
| baseline A — non-composed | 35,292 | 35,028 | **−264** | 10,711 | 10,664 | **−47** | 10,855 | 191 |
| baseline B — shipped package | 22,573 | 22,573 | **0** | 6,889 | 6,889 | **0** | 7,040 | 151 |

**No module entered or left any graph**: 33/32/34/33/35/36, 27/28/29/30/47, 2/16/31/26 — identical on both sides. **No row breached its ceiling and none went negative.** Slack runs **0.06 to 0.22 kB over all fifteen rows** — 63 B on `vocabulary root` to 216 B on `xy + layoutAnimation`.

## What the numbers say

**Eight rows pay −264 B minified, two of them −268, and the seven that carry no sortable pay nothing.** The −264 is the same edit counted once per graph: five property writes gone from one statement group in `sortable/spec.ts`, the bracket's publish-and-clear pair, the collection effect's rewrite of a mirrored snapshot, and the two `!` assertions that stopped being needed once the record became complete-or-absent. The extra 4 B on the two `xy` rows is `xy.ts` reading `frame.snapshot!` where it read `runtime.snapshot`; `y.ts` pays the same 4 B and its rows already carry the linear axis, so it is inside their −264.

**Brotli takes −45 to −65 B, and the direction agrees with minified on every row that moved.** Nothing here is the §15 case where the two columns disagree: what was deleted is property writes with distinct right-hand sides rather than repetitions of one token, so the compressor was paying real bytes for them. **Shipped bytes are compressed bytes**, and the reported figure is the Brotli one; the minified column is what says this is one change arriving in one module rather than eight independent ones.

**What is not a size result.** The membership rule is justified by ownership, not by bytes — a mirror is a defect at zero bytes — and D-191 predicted no figure for the sortable rows beyond _they fall_. The record's shape is the return: six members, every one `readonly`, complete at construction and dropped whole.

**The one cost that went the other way is install weight, and it is worth naming** ([`CONTRIBUTING.md`](../../../../CONTRIBUTING.md) §4 (c)). The published declarations went from **116.39 kB to 116.43 kB raw**, of which comment went from 85.28 kB to 85.34 kB: `snapshot` arriving on `InsertionFrameView` brought a docblock a third-party axis author reads, and the members that left were internal and carried theirs out of an unpublished type. About 40 B of tarball against 45 to 65 B off every composition's shipped bytes — the trade is the right way round, and the figure is recorded rather than inferred.

## The controls, and O-13

**The two standing controls held exactly**: `vocabulary root — drag.js` at 142 B and `baseline B` at 6,889 B, byte-identical on both figures with no module gained.

**The five suspended controls are restored here, which is the act O-13 waits on.** Arc D's landing is the close of the D-170 arc series, so the four free-drag rows and `kernel root — kernel.js` take fresh exact `control:` figures — **8,116**, **8,274**, **8,276**, **8,426** and **6,185** — and the suspension paragraph leaves `measure.ts`.

**The restoration is read against the figures the suspension recorded, and the interval reconciles to the byte** (§18, D-192). ~~The restoration re-declares figures this arc did not move, which is the condition a returning equality wants~~ — **struck**: arc-local inertness would hold identically had the preceding arc moved those rows by any amount for reasons nobody could name, and would fail on a restoration that was otherwise perfectly accounted for. It is neither necessary nor sufficient for what it was offered as.

The last figures the five produced while they were still declared, at Arc B's remediation ([`arc-b-remediation.md`](arc-b-remediation.md) §The controls), are **8,136**, **8,298**, **8,295**, **8,447** and **6,210** Brotli. Against the figures restored here the suspension interval is **−20, −24, −19, −21 and −25 B**, and every byte of it is attributable to a named landed change:

| Row | at suspension | F-394's deletion | Arc C (D-189) | Arc D | restored | interval |
| --- | --: | --: | --: | --: | --: | --: |
| free drag minimal | 8,136 | −4 | −16 | 0 | 8,116 | **−20** |
| free drag + bounds | 8,298 | −3 | −21 | 0 | 8,274 | **−24** |
| free drag + landing | 8,295 | +11 | −30 | 0 | 8,276 | **−19** |
| free drag complete | 8,447 | +12 | −33 | 0 | 8,426 | **−21** |
| kernel root — `kernel.js` | 6,210 | −2 | −23 | 0 | 6,185 | **−25** |

The chain is continuous at each seam — `arc-b-remediation.md`'s second landed column is [`arc-c.md`](arc-c.md)'s baseline column exactly, and `arc-c.md`'s landed column is this document's baseline column exactly — so nothing in the interval is unaccounted for. **An unattributable interval would have been a finding before it was a declaration**, and this is the read that decides which. D-192 books the same reconciliation over the longer span, from the `control:` values declared at Arc B — 8,159, 8,293, 8,293, 8,448, 6,210 — at **−43, −19, −17, −22 and −25 B**; the two agree at the same endpoint and differ only in where they start. That all five also read byte-identical **across this arc** is true and is a scope tripwire, not the reading.

**The prediction those five carried was entailed rather than independent**, and O-13 says so. Each already declares `absentPrefixes: ['sortable/']`, so no `sortable/` module is in any of their graphs and identical module sets compress identically; a non-zero delta would have meant an edit outside `src/sortable/` — which `git diff --stat` reports more directly — or a non-deterministic build. It is a scope tripwire that was worth reading and is not evidence of its own. **What the restored equalities buy from here is what the suspension withdrew**: a byte _transfer_ between rows, which every ceiling can stay green through and which no `budget:` can see.

**The restored rows were checked for inertness rather than assumed live.** Declaring `kernel root — kernel.js` at 6,186 instead of 6,185 reports `control moved by −1 B`, so the equality is an assertion and not a comment.

## No budget re-base, and the reading is what declines it

**§18 re-bases after a shrink, and this is a shrink after the last arc of the series — the re-base is still declined, and on the reading rather than on the boundary** ([D-187](../contract/00-index.md)). Every ceiling stays where it is. **The close restores an instrument and spends none**: that the series ended is not admissible as a re-base trigger here, and it is not the argument below.

**The seven rows that did not move cannot be re-based at all** — their slack is exactly what it was — so the question is only about the eight that fell.

**Those eight land 173 to 216 B under ceilings whose standing headroom is ~150 B**, so the reclaimable slack is **23 to 66 B**, a fraction of one landing on rows of 10.2 to 12.3 kB. The shrink itself is **45 to 65 B Brotli**, inside the band [`arc-b.md`](arc-b.md) declined at 7 to 49 B and [`arc-c.md`](arc-c.md) at 6 to 38 B, both on the ground that **a ceiling following every arc down stops being a ceiling**. This is the fourth consecutive arc to move the same rows in the same direction, which makes it the strongest instance of that ground rather than an exception to it: a ceiling re-based at each of the four would by now be measuring the passes rather than checking them.

**And the instrument's own stated trigger is not met.** [SC-1](../obligations.md) fires on a row going negative, on erosion that stops being attributable to a named landed change, or on L-11; no row is negative, every byte that moved is attributable to this landing, and L-11 landed as D-154 and was answered at that reading. Re-basing outside the condition that governs these ceilings would be a schedule wearing a boundary's clothes, which is what §18's fourth bullet refuses.

## ~~The one edge this arc creates, booked so it is not re-derived~~

**Struck 2026-09-09 (F-416). The edge does not exist.** It was booked as a divergence between the frame's committed `snapshot` and the behavior's own `#snapshot` across the resolve→build interval, and its two statements were both wrong: the consequence of a mixed pair is a **thrown release** rather than two reads parting company — `buildReorderProposal` answers `null` on a version mismatch and `spec.ts` raises `drag: sortable/release-no-proposal` — and the interval proved clean was narrower than the one that mattered. `prepareRelease` already destructures the committed `snapshot` off the draft and guards it non-null one screen above, so the proposal is now built from that value rather than from `#snapshot`. With one value on both sides there is no pair to diverge and nothing to re-derive.