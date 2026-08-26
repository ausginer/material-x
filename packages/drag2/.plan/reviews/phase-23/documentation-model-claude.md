# The documentation split, and what this package's source owes it

**Decided 2026-08-26 against `d39ea38a`** on `drag2/fin-review`, on an owner review finding that the repository's normative documents had absorbed the record. The repository-scope answer is [`.agents/docs/documentation.md`](../../../../../.agents/docs/documentation.md), which states the model and carries no numbers. This record carries the numbers, because they are facts about this package and go stale with it.

**Nothing in production was changed.** The source and declaration cleanup is a separate implementation step, booked as D-135.

## 0. Verdict

**A comment's audience is decided by whether it reaches a published `.d.ts`, and that boundary is mechanical rather than editorial.** JSDoc that survives the declaration prune is consumer documentation and carries no internal identifier, date, strikethrough or rejected alternative. Every other comment is a maintainer note, may carry one bare decision pointer, and still states only what holds now.

This package's tree does neither, and the cost is measurable rather than aesthetic.

## 1. What the tree measures at `d39ea38a`

| Artifact | Total | Comment prose |
| --- | --- | --- |
| `src/**/*.ts` | 616,755 B (14,876 lines) | 455,085 B — **74 %** (7,826 lines, 53 %) |
| Published `.d.ts`, 33 files | 128,566 B | 97,718 B — **76 %** |
| Runtime JS, all four entries | 13,474 B | — |

**The shipped type surface carries roughly seven times more decision narrative than the library has executable bytes.** `drag.js`, `free-drag.js`, `kernel.js` and `sortable.js` together are 13.5 kB; the prose in the declarations describing them is 97.7 kB, and every consumer fetches it at install.

**268 internal references reach 27 published declaration files** — `D-`, `F-`, `I-`, `E-` and `Q-` numbers, `CODE_OF_SIZE` citations, `.plan/` paths, phase numbers and strikethrough. The heaviest are `kernel/spec.d.ts` (52), `sortable/feature.d.ts` (29) and `kernel/failures.d.ts` (29). In `src/`, 138 strikethrough markers, 22 dates and 12 phase numbers.

## 2. Two records already said this, one of them in this package

`prune-declarations.ts` exists because four kernel modules shipped 6.5 kB of unreachable declarations — _not a boundary hole … but dead weight in the tarball with every internal type name in it_. That pass removed whole files and never looked inside the ones it kept.

`CODE_OF_SIZE.md` §4 (c) reached the general form and left it as an aside: **most of the install weight of the failure vocabulary was the doc comment about the constants rather than the constants**, closing with _when a vocabulary looks expensive, check whether you are pricing the values or the prose about them_. The model promotes that aside to a rule; this package is where it was observed and is the largest population of it.

## 3. Why the citation argument did not hold

`CODE_OF_SIZE.md` kept withdrawn wording inline on the stated ground that other documents cite it. **All 55 citations across the repository address a section number**; none quotes a struck sentence. The obligation is numbering stability, which struck text does not provide — D-96's rule applied to prose: a justification that cannot support its stated purpose is worse than none, because it gets quoted afterwards as though it could.

## 4. The safety property the sweep must honour

Some of this package's source comments are the **only** copy of a constraint — `failures.ts`'s hole comment is the working example: it stops a specific edit, and its argument is not fully duplicated anywhere. Deleting comments into a record that does not carry them destroys the record.

> **Nothing is deleted from a source comment unless the record already carries it.** Where it does not, it is written to the record first, in the same change.

That is what makes this an implementation step with judgment in it rather than a pattern substitution, and it is why it is not being done inside this decision.

## 5. Required properties for D-135

- **No published `.d.ts` contains an internal identifier**, a `CODE_OF_SIZE` citation, a `.plan/` path, a phase number, a date or a strikethrough. Asserted, because the property regresses silently: the next JSDoc edit reintroduces it with no other failing test.
- **Preconditions the compiler cannot state survive verbatim.** `moveTo`'s _its coordinates must both be finite_ and the landing's _a duration is finite_ are what [07](../../contract/07-free-drag-contract.md) deletes runtime guards on the strength of. Losing one silently converts a documented boundary into an undocumented one and reopens D-124.
- **`failures.ts`'s two holes keep a working comment.** The constraint — neither 12 nor 13 is ever reused, because a stage constant is inlined into a consumer's build — is load-bearing since D-132 and is stated in present tense with the consequence attached. Its history goes; `tests/kernel/stages.node.test.ts` remains the witness.
- **Internal comments keep at most one bare pointer** per claim, and no argument.
- **The published declaration weight is reported** in `bench/size/measure.ts`, and **not budgeted yet**. D-134's finding applies one level over: a ceiling whose calibrating injection cannot be re-run is not calibrated, and this figure has no measured regression behind it.
- **Tests are out of scope.** `tests/**` does not ship and its headers are the record's own voice at the point of use; they are subject to §1's current-state rule and to nothing else.

## 6. What does not change

- **The record keeps everything.** `.plan/` is append-only and none of this reduces it.
- **Decision pointers stay legal in internal comments.** The identifier is a cheap, durable index entry; the narrative around it is the cost. Banning the pointer would push readers to re-derive what the record already answers.
- **No contract document moves.** `contract/` is normative _and_ historical by design — it is the record's normative half, and the four-kind split places it there, not among the current-state documents.
- **No runtime byte is at stake.** Comments do not survive minification; this is install weight and consumer surface, which is `CODE_OF_SIZE.md` §4 (a) and (c), not §16.

## 7. Finding

**F-107.** The two instruments that price this package's tarball both stop at the file boundary. `prune-declarations.ts` removes unreachable declaration _files_ and `bench/size/measure.ts` weighs _runtime_ bundles, so 97.7 kB of prose inside reachable declarations is invisible to both while being the largest single class of published bytes the package has. It was named in passing by `CODE_OF_SIZE.md` §4 (c) and never measured until now.