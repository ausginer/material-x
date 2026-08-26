# The consumer-fault-classification slice, reviewed at D-134

Review, 2026-08-26. Files read at `3dc8b081`. **No production code changed.**

Reviewing the landed implementation of **D-132** (the coarse code deleted, the stage carried), **D-133** (`STAGE_NAMES` withdrawn) and **D-134** (the vocabulary-root ceiling re-based and calibrated) against those decisions, the surrounding contracts and the published surface.

**Verdict: the slice is correct and I consider it closed.** Every required property of all three decisions is satisfied, and the D-134 calibration is the best-evidenced budget row in this instrument. Two findings, both **tier C, both prose-only**, neither touching production behaviour or any gate.

---

## 0. What was checked, and how

Everything below was verified by execution or by reading the built artifact, not from the decision records.

| Area | Result |
| --- | --- |
| D-132 — deletions, `stage` field, second publication point | **Clean** |
| D-132 — panic semantics (`stage: null`, F-104) | **Clean** — and `null` has exactly one producer |
| D-133 — `STAGE_NAMES` withdrawn, message shape | **Clean** |
| Stage vocabulary — twelve constants, holes at 12/13 | **Clean** — witness is now reflective and genuinely stronger |
| Public surface — `drag.js`, `kernel.js`, tier separation | **Clean** — pinned by `exports.node.test.ts` |
| D-134 — budget re-base and calibration | **Clean** — all four required properties met |
| Suite | 61 files, **1145 passed**, 116 skipped, **no type errors** |
| Size | All 14 rows within budget; `just size` re-run |

---

## 1. D-132 — the classification change

**The deletions are real.** `DraggableErrorCode`, `STAGE_TO_CODE` and `toDraggableError` appear nowhere in `src/`, `tests/` or any emitted `.d.ts` except as struck or historical prose, which is this package's convention rather than residue.

**The field is renamed, not retyped.** [`errors.ts:82-99`](../../../src/kernel/errors.ts) declares `readonly stage: FailureStage | null`. D-132 §5.1's whole argument is that a surviving name would make `err.code === 'consumer'` compile to an always-false comparison; the rename makes it a missing property, and [`errors.node.test.ts`](../../../tests/kernel/errors.node.test.ts) asserts exactly that with `expect('code' in error).toBe(false)`. That assertion is the one that would catch a well-meaning re-add.

**The second publication point is a re-export of the one declaration.** [`drag.ts:60-74`](../../../src/drag.ts) re-exports the twelve constants and `FailureStage` from `kernel/failures.ts`; `kernel.js` keeps its own export for the behavior author. `drag.d.ts` confirms the emitted surface. `kernel/failures.ts` remains the single declaration, so this is the `AT_PROPOSAL`/`CancelStage` pattern applied a second time, exactly as the decision describes.

**The count is twelve and the holes hold.** Eleven constants at 1–11, `FAILURE_TERMINAL_CALLBACK = 14`, `FailureStage` a twelve-member union, 12 and 13 unoccupied. `exports.node.test.ts` pins all twelve on the `drag.js` surface by name.

**F-80 (d) genuinely closes.** [`failures.ts:5-8`](../../../src/kernel/failures.ts)'s _"It is **public**: a consumer receiving `onError` has to be able to discriminate it"_ is restored unstruck, and it is true again: both publication points now depend on it.

### 1.1 Panic

`stage: null` has **exactly one producer** — [`kernel.ts:695`](../../../src/kernel/kernel.ts), `panic`. The other two construction sites pass real stages (`FAILURE_ADMISSION` at admission, `checkpoint.stage` at the failure checkpoint). That matters because D-132 §11 names _a second stage-less consequential fault_ as one of the things that would reverse the decision, so the single-producer property is the invariant worth having a reader able to check. It is checkable in one grep today.

F-104's improvement is real: a panicked controller was previously indistinguishable from a failed `requestAnimationFrame` (both `platform`); it now has the only value that means _the controller is gone_.

---

## 2. D-133 — the message

The fallback is `cause instanceof Error ? cause.message : (stage === null ? 'drag: controller destroyed' : \`drag: failure at stage ${stage}\`)`. That is D-133 as written: no table, the number interpolated, and the `null` arm kept as a fixed string because it is the one case a number cannot state.

The tests are well chosen. They assert stage **1** and stage **14** — the two ends of the list, so a reintroduced positional table that mis-slotted the high constant would fail rather than pass on a low one. The cause-preference row pins that the ordinary path never reaches the fallback at all, which is precisely the misapprehension F-105 records.

**After the deletion no positional table indexed by a stage number exists in the library.** I checked this rather than took it: the 12/13 witness now lives entirely in [`stages.node.test.ts`](../../../tests/kernel/stages.node.test.ts), which reflects over `failures.ts`'s own `FAILURE_*` exports. The file's claim that this is _stronger_ than the padding it replaced is correct and worth agreeing with explicitly — padding only ever caught a hole being closed up, while reflection also catches a constant being **reintroduced** at 12 or 13, which is the failure the never-reuse rule actually forbids.

---

## 3. D-134 — the vocabulary-root guard

**All four required properties are satisfied**, and this row is now the best-evidenced ceiling in the instrument.

| Required property | Status |
| --- | --- |
| Breached by an injection adding a runtime `drag.js` → `kernel/failures.js` reference while the graph half stays at one module | **Yes** — injected **220** against a ceiling of 205, modules unchanged at 1 |
| Not breached by rewording the two library-authored strings | **Yes** — same-length rewording **181**, a +48-char rewrite **190**, both clear |
| The injection is named in the row and writeable against the tree | **Yes** — written out as compilable code, dated, measured four ways |
| The contradictory paragraph goes | **Yes** — the 29 B-headroom paragraph is deleted and the 300-rationale is struck with its supersession |

Both halves are kept: `only: ['kernel/errors.js']` and `budget: 205`. Re-running `just size` confirms the landed artifact at **159 B / 1 non-entry module**, 46 B under.

**The bracketing method is the part worth praising.** The ceiling is not an estimate plus slack: 190 must pass and 220 must fail, so the admissible window is 191–219 and 205 is its midpoint, breaching the injection by 15 B and clearing the widest rewrite by 15 B. D-134 §6 had estimated the wording band at single-digit-to-low-tens from source length, which would have put the ceiling at 190 and failed on an ordinary rewording; the implementation **measured the band instead and found the opposite sign** — a same-length substitution costs +22 B compressed while saving 2 B minified, because Brotli's static dictionary covers `destroyed` and `failure` and not their replacements. That is a decision's own derivation being corrected by its implementation, recorded in the row, and it is the right outcome.

**F-106 is discharged for this row.** The row now states one sizing rule live and one struck, with the table separating what each half proves and what each is blind to.

---

## 4. Findings

Both are stale prose in load-bearing narration. Neither changes behaviour, neither fails a gate, and neither is a reason to hold the slice open. Recorded because in both cases the sentence is the only place the reason exists.

### F-A — the kernel-root row's disjointness claim is false at HEAD (tier C)

[`bench/size/measure.ts`](../../../bench/size/measure.ts), the `kernel root - kernel.js` row, four lines below the row D-134 rewrote:

> **The two graphs turn out to be disjoint, which is stronger than the split needed.** `kernel.js` does not pull `kernel/errors.js` either — `draggable` alone never names the class — so neither root subsumes the other…

**Measured at HEAD, the kernel root's graph is 14 modules and contains `kernel/errors.js`:**

```
kernel root - kernel.js -> entry, box-quad, kernel.js, kernel/errors.js,
  kernel/frames.js, kernel/kernel.js, kernel/lifetimes.js, kernel/pointer.js,
  kernel/presentation.js, kernel/protocol.js, kernel/queue.js, kernel/realm.js,
  kernel/seams.js, kernel/unwind.js
```

The vocabulary root's single non-entry module is `kernel/errors.js`, so it is a **strict subset** of the kernel root's graph. The two are not disjoint; the kernel root subsumes the vocabulary root. The row's adjacent framing — _twelve modules against the vocabulary root's one_ — is likewise now thirteen non-entry modules against one.

**Cause and date.** [`kernel.ts:26`](../../../src/kernel/kernel.ts) imports `DraggableError` and `DraggableWarning`; that import arrived at **`9e7cbfc6`** (D-130's implementation), which is the commit that made construction kernel-owned — so the premise expired as a direct and intended consequence of this arc. The claim itself dates to `99a2e7ce`, long before.

**Impact is bounded and worth stating precisely.** D-48's conclusion is untouched: the three-root split rests on an ordinary consumer not having to import `kernel.js` to name `DraggableError`, and the vocabulary-root row still proves that at one module against thirteen. What expired is the _stronger_ bonus observation that the subsumption ran in neither direction. No assertion fails — the row's gates are `present`/`absentPrefixes`, both still true — so nothing catches this but reading.

**Why it belongs in this review rather than a later one.** F-106 was filed in this same slice, and its stated reason for staying open is that _"`bench/size/measure.ts` is the largest body of justifying prose outside the contract tree and has never been read for this"_. D-134 then read one row's prose closely and discharged F-106 there, while the immediately adjacent row carries an instance of exactly the class F-106 names. The remedy is small — the sentence is wrong in a checkable way — but the pattern is the one worth noting: an audit that examines one member of an adjacent pair.

### F-B — the fixture D-132 cites as its proof contradicts itself in prose (tier C)

[`docs/revision/revision-2.ts`](../../../docs/revision/revision-2.ts). D-132's record cites this file as its central evidence — _"the package's own compiled demonstration"_ — and the **code was correctly updated**: `report` now switches on `error.stage`, includes the `null` arm F-104 made writable, and typechecks. Three unstruck prose claims did not follow it:

| Line | Claim | Status |
| --- | --- | --- |
| 177 | _"`DraggableError` and `DraggableErrorCode` are **imported** now"_ | `DraggableErrorCode` was deleted by D-132 |
| 339 | _"D-64 — the consumer branches on a fault class, never on a stage."_ | Reversed by D-132; the consumer now branches on the stage |
| 343 | _"only a `DraggableError` carries a `code`"_ | It carries `stage` |

Lines 339 and 343 sit in the doc comment **directly above the `report` function they misdescribe**, and the `~~…~~` strike in that block applies to a different clause (the deleted `SortableErrorContext` parameter), so a reader has no signal that the surrounding sentences are stale. Line 91's `stageToCode` mention **is** correctly struck, and line 716's inverted `@ts-expect-error` narration **is** correctly updated — which shows the pass did revisit this file and stopped at the assertions without re-reading the narration around them.

---

## 5. Why I consider the slice closed

The three decisions are implemented as written; where the implementation diverged from a decision's own derivation — D-134 §6's estimated wording band — it measured, recorded the correction and adjusted the ceiling accordingly, which is the behaviour the record asks for. The suite is green with no type errors, every budget row passes, the published surface is pinned by name, and the two invariants most likely to decay silently (`null` having one producer; no positional table indexed by a stage) are both checkable in one command today.

The two findings are prose whose premises expired inside this arc. Neither is a defect in the slice's own work, and both are cheaper to fix than to carry — but they are in the two places this package treats as load-bearing, so they are recorded rather than mentioned.

---

## 6. What would falsify this

- **F-A's module list is one measurement** on this toolchain, taken by importing `COMPOSITIONS` and re-running `measure` directly. If `tsdown`'s shaking differs under another configuration the subsumption could change; the source-level import at `kernel.ts:26` is the more durable half of the evidence.
- **I did not re-derive D-132's classification argument.** The brief said to treat the landed decisions as the contract, so §2's claim that the coarse code answered the wrong question is taken as settled, not re-examined.
- **The D-134 injection was not re-executed.** I verified it is written as compilable code against the current tree and that its landed figure (159 B) matches what `just size` reports now; I did not apply the patch and re-measure 220. That would be the one further check worth having if the ceiling is ever disputed.
- **`docs/revision/revision-2.ts` is compiled but its prose is not asserted anywhere**, which is why F-B could happen at all and why it will happen again in that file unless the narration is read on each pass.