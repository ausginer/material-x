# Arc B — what extracting the frame transaction cost

**Measured 2026-09-05**, arc tree `0a0cef1a` against baseline `185fb371` — the commit that amended the arc's architecture and changed no source. The baseline ran in a detached worktree with `node_modules` symlinked from the repository root, on the same machine in the same session as the arc runs. Instruments: [`m1.browser.test.ts`](../../tests/perf/m1.browser.test.ts) and [`m1-prime.browser.test.ts`](../../tests/perf/m1-prime.browser.test.ts) under `VITE_DRAG_MEASURE=1`, one file at a time; `measureAll()` from `bench/size/measure.ts` for bytes.

**What this run is testing, said before the numbers, because one answer is closed in advance.** A getter returning `this.#current` is a call where a private field read stands today. The alternative that removes the cost entirely — a public data property the swap reassigns, read as a plain property — is closed by [D-170](../contract/00-index.md) §The ownership boundary, which forbids a mutable public field. So this is not a choice between two designs; it prices a constraint the record already accepted, and a regression here is an argument about D-170 rather than about Arc B.

**The result in one line.** Nothing on the move path is measurable at either harness's resolution, and every composition that carries the kernel pays **+359 B minified — +357 on `kernel root`, the one row that carries the class and no behavior — and one module**, while **Brotli goes down on thirteen of the fifteen rows**. The two compositions that carry no kernel pay 0 on both figures.

## The per-sample accessor count, stated before the timings

D-181 asks for this figure first, and predicted **six** accessor invocations per `ACTIVE` sample. Measured by replacing `FrameTransaction.prototype`'s `current` and `draft` accessors with counting wrappers over the originals, driving 100 `pointermove` samples with one animation frame between them, in a temporary probe that is not part of the suite. The drag was confirmed live at the moment of counting: the placeholder was in the DOM — 51 children under a 50-item root — and the lifted item carried `transform: translate(0px, 139px)`.

| Composition | `current` | `draft` | per sample |
| --- | --- | --- | --- |
| `complete` — 50 rows, `y()`, `landing()` | **6.12** | **3** | **9.12** |
| `free drag complete` — `bounds()`, `landing()`, `onMove` filled | **5** | **2** | **7** |

**The prediction was low, and by more than a rounding.** D-181 counted the five sites it could name — `#onPointer`'s pointer-identity check, `#handleMove`'s two reads and two draft writes, `#runMoved`'s frame argument. What it did not count is that `#begin` reads `current` to pin the operation, that `#handleMove` reaches the pair again through the phase test and the commit, and that the sortable's apply performs reads on its scan, which is what the fractional `.12` is: twelve extra reads over a hundred samples rather than a per-sample cost. Against these, **three private-field accesses per sample left with the stamp** — `begin`'s two-half handover and `commit`'s consume-and-clear.

**So the arc's per-sample cost is six to nine property loads that were field reads, and the timings below cannot see them.** That is the honest reading of a null result at a 0.0977 µs quantum: not that the calls are free, but that they are far below what this harness can resolve, on a path that spends ~3 µs.

## M-1 — the move path

Two runs of each tree, medians of 21 calibrated samples. `performance.now()` is clamped, so **0.0977 µs is one quantum** and nothing below it is a reading.

| Row | `185fb371` | Arc B |
| --- | --- | --- |
| end-to-end pointer sample, 50 rows | 3.0273, 2.9297 | 3.0273, 3.0273 |
| end-to-end pointer sample, 200 rows | 3.0273, 3.1250 | 3.2227, 3.1250 |
| what one sample allocates, over 20 000 samples | 0.0 B | 0.0 B |

The publication-path rows (`part=3` … `part=28`, polymorphic) are a micro-benchmark over frame objects the arc does not touch; they reproduce on both trees within one quantum and are not repeated here.

## M-1′ — the constrained compositions, the churn and the retained heap

| Row | `185fb371` | Arc B |
| --- | --- | --- |
| C bare | 3.0273 – 3.1250 | 3.1250 |
| C axis, delta vs bare | −0.0977 – 0.0000 | −0.0000 – 0.0000 |
| C bounds(element), delta vs bare | 0.0000 – +0.1953 | 0.0000 – +0.0977 |
| C bounds(thunk), delta vs bare | −0.1953 – −0.0977 | −0.0000 |
| E churn, `onMove` installed, median | 3.2227 – 3.3203 | 3.2227 – 3.5156 |
| E churn, slot null, median | 2.9297 – 3.0273 | 2.9297 – 3.0273 |
| E retention over 20 000 samples | −0.00 B per sample | −0.00 B per sample |

**Every row moves by at most one quantum and in both directions across repeats, which is the shape of a null result rather than of a small cost.** The retention arm is the one that could have shown a real regression — the entity is one more object per controller, and its two accessors are on the sample path — and it is flat, because both are per controller rather than per sample.

## Brotli and minified, all fifteen rows, and the two figures disagree in direction

Exact bytes from `measureAll()`, with the bundled module count.

| Row | `185fb371` | Arc B | Δ Brotli | Δ minified | modules |
| --- | --- | --- | --- | --- | --- |
| minimal | 10,456 | 10,431 | **−25** | +359 | 32 → 33 |
| minimal (xy) | 10,313 | 10,331 | **+18** | +359 | 31 → 32 |
| minimal + layoutAnimation | 10,795 | 10,763 | **−32** | +359 | 33 → 34 |
| xy + layoutAnimation | 10,670 | 10,659 | **−11** | +359 | 32 → 33 |
| minimal + landing | 10,604 | 10,585 | **−19** | +359 | 34 → 35 |
| complete | 10,966 | 10,917 | **−49** | +359 | 35 → 36 |
| free drag minimal | 8,166 | 8,159 | **−7** | +359 | 26 → 27 |
| free drag + bounds | 8,327 | 8,293 | **−34** | +359 | 27 → 28 |
| free drag + landing | 8,338 | 8,293 | **−45** | +359 | 28 → 29 |
| free drag complete | 8,479 | 8,448 | **−31** | +359 | 29 → 30 |
| both behaviors | 12,397 | 12,381 | **−16** | +359 | 46 → 47 |
| vocabulary root — `drag.js` | 142 | 142 | **0** | 0 | 2 → 2 |
| kernel root — `kernel.js` | 6,218 | 6,210 | **−8** | +357 | 15 → 16 |
| baseline A — feature-matched, non-composed | 10,749 | 10,722 | **−27** | +359 | 30 → 31 |
| baseline B — shipped `@ydinjs/drag` sortable.js | 6,889 | 6,889 | **0** | 0 | 26 → 26 |

**This is §15's second trap arriving as the headline: the two figures disagree in direction, and the shipped figure is Brotli.** Minified grows by 359 B on every kernel-carrying row — a second module's boundary, a class declaration with two fields, a constructor, five accessors and methods, one more construction site with five arguments, and `arm()`'s two locals — while the compressed bundle **shrinks by 7 to 49 B**. What leaves is repetition the compressor was already paying little for and the arc removes outright: the stamp's two slots, its sentinel and its type alias, `#runStamped` with its `try`/`finally` and three call-site wrappers, the seven-member `SeamContext` literal with its seven closures, and four `draft.phase = …` statements. What arrives is one class and one construction, which is novel token rather than repeat. **`minimal (xy)` is the one row that pays**, at +18 B, and no attempt is made here to attribute eighteen bytes to a token: it is recorded because the summary sentence has to be true of every row it quantifies over.

**`kernel root`'s +357 against everyone else's +359** is the same two-byte shape Arc A recorded in the other direction, and it is left unattributed for the same reason: it is the row that carries the kernel and no behavior, so it is where the change is read cleanly, and inventing a cause for two bytes without measuring one would be the error a byte table exists to prevent.

**The two zero rows are the pass's declared controls, and they are the result rather than the absence of one.** `drag.js` carries the failure vocabulary and no kernel; baseline B is the shipped `@ydinjs/drag`, which this tree does not compile. Both are byte-identical on both figures and neither gained a module, which is what says the instrument is scoped to the change.

**No composition went over budget, and no ceiling moved.** Slack is 0.09 to 0.13 kB where it was 0.06 to 0.11 — wider, because the pass shrinks. §18's re-base trigger is therefore live for the ceilings and is **declined deliberately**: a seven-to-forty-nine-byte shrink inside the same band buys no sensitivity worth the churn, and a ceiling that follows every arc down stops being a ceiling. The exact `control:` rows are a different instrument and are re-declared below, because they are equality assertions that this pass was declared in advance to reach.

**Five `control:` rows were re-declared, and D-181 said in advance that they would be.** `free drag minimal`, `+ bounds`, `+ landing`, `free drag complete` and `kernel root` carry exact controls set by passes that could not reach the kernel. This one changes the kernel, which every one of them carries. Recorded in [`budget-rebases.md`](budget-rebases.md).

## One module, and which graphs took it

`kernel/transaction.js` enters every graph that carries `kernel/kernel.js` — thirteen of the fifteen rows, +1 module each — and enters neither `drag.js` nor baseline B. `both behaviors` goes 46 → 47 and its union identity against `complete` + `free drag complete` still holds, so the new module is reached through the kernel by both behaviors rather than duplicated per behavior.