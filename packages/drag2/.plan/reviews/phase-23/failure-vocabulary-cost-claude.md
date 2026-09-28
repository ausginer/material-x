# What the public `FAILURE_*` vocabulary costs

**Measurement record — no production code, contract or decision was changed.** Every figure below comes from a temporary ablation against `bench/size/measure.ts`; the tree was restored and re-verified byte-identical to the baseline table after each one.

The question this answers is narrow and was asked before an API decision, not after one: `CODE_OF_SIZE.md` §4 says _avoid exported numeric phase/state/failure constants unless they are part of the supported consumer contract_, `kernel.js` exports thirteen of them, and D-64 is the decision that put them there. **What does that publication actually cost?**

It does not answer whether the vocabulary should stay. §4's last line — _if an exported value is required for public authoring, that is an API decision, not a size trick_ — is the sentence that governs, and the measurement below removes size from the argument entirely rather than settling it.

---

## 0. Summary

| what | minified | brotli |
| --- | --- | --- |
| the export vocabulary, to a **bundling** consumer | **0 B** | **0 B** |
| the export vocabulary, in the **published tarball** | −3,984 B raw (js + d.ts) | −1,053 B on the `kernel.js` fetch closure |
| — of that, runtime **code** rather than doc comment or declaration | 1,326 B raw (596 in `kernel.js`, 730 in `kernel/failures.js`) | not separable |
| the **unrelated** error machinery, to a behavior author | 403 B | 67 B, +1 module |

Three findings, in the order they matter:

1. **A bundling consumer pays exactly zero for the export vocabulary**, whether it uses the constants or not. Not "approximately zero" — the artifacts are byte-identical, on all fourteen standing compositions and on a purpose-built third-party behavior fixture that names all thirteen stages.
2. **`kernel.js` — both readings of it — is a poor proxy, and it misleads in two opposite directions at once.** The entry _file_ makes the vocabulary look like 11 % of itself; the harness _row_ named after it cannot observe the vocabulary at all, because it reaches neither `kernel/failures.js` nor `kernel/errors.js`. §5 below.
3. **What the vocabulary does cost is tarball bytes, and most of that is prose.** Of the 2,768 B that leave `kernel/failures.js`, **2,031 B are the doc comment that documents the constants** and 730 B are the constants themselves.

---

## 1. Method

Baseline built from `drag2/fin-review` at the tree as committed, `npx just build` then `node bench/size/measure.ts`. Pipeline unchanged: Rolldown, `platform: 'neutral'`, `minify: true`, Brotli via `node:zlib` at default quality.

Two instruments, because the question needs both:

- **Bundled** — `measure()` from the existing harness, called directly with temporary composition literals rather than by editing `COMPOSITIONS`. This is what a consumer with a bundler ships.
- **Published** — raw bytes of the built package-root artifacts, plus per-file Brotli over the transitive `import` closure of `kernel.js`. This is what a no-bundler consumer fetches, and what the tarball carries. The package ships **unminified, with doc comments**, so raw bytes are the honest unit here and the comment share is called out separately wherever it dominates.

**The ablation.** `src/kernel.ts`'s thirteen-name value export block replaced by `export type { FailureStage } from './kernel/failures.ts';`. Nothing else moved: `src/kernel/failures.ts` is untouched, every stage keeps its number, D-41's `= 13` hole is preserved, and all thirty-one internal `FAILURE_*` uses in `kernel/kernel.ts` — and the twenty-five in `sortable/spec.ts`, thirteen in `free-drag/spec.ts` — are unchanged. This is _not published_ rather than _not present_, which is what was asked for.

**Restoration** was verified twice by rebuilding and diffing the full measurement table against the baseline; byte-identical both times. The temporary fixtures and scripts were deleted.

### Baseline table

| composition                         | minified | brotli | modules |
| ----------------------------------- | -------: | -----: | ------: |
| minimal                             |   33,697 | 11,162 |      32 |
| minimal (xy)                        |   32,502 | 10,807 |      31 |
| minimal + layoutAnimation           |   35,099 | 11,589 |      33 |
| minimal + landing                   |   34,444 | 11,449 |      34 |
| complete                            |   35,846 | 11,859 |      35 |
| free drag minimal                   |   25,558 |  8,768 |      27 |
| free drag + bounds                  |   26,029 |  8,922 |      28 |
| free drag + landing                 |   26,307 |  9,066 |      29 |
| free drag complete                  |   26,778 |  9,217 |      30 |
| both behaviors                      |   42,752 | 13,418 |      48 |
| vocabulary root - drag.js           |      184 |    121 |       2 |
| kernel root - kernel.js             |   18,538 |  6,598 |      13 |
| baseline A - non-composed           |   34,934 | 11,583 |      30 |
| baseline B - shipped `@ydinjs/drag` |   22,573 |  6,889 |      26 |

---

## 2. The bundled answer: zero, on every row

Under the ablation, **all fourteen rows are byte-identical to the baseline** — same minified bytes, same Brotli bytes, same module counts. The diff of the two tables is empty.

That includes `kernel root - kernel.js` itself, which stays at 18,538 / 6,598 / 13 modules.

**Why.** `kernel/failures.ts` declares thirteen `const X = <small integer>` bindings with no side effects. Rolldown inlines every one of them at the use site and then drops the module. `kernel/failures.js` appears in **no** bundled graph in the package — verified on `kernel root` (11 package modules) and on `free drag minimal` (25 package modules), neither of which lists it, even though the free-drag graph contains `free-drag/spec.js` with thirteen `FAILURE_*` uses in it.

The same inlining is already visible in the **published** tree, which is the detail that makes the bundled result predictable rather than lucky: `kernel/kernel.js`, `kernel/seams.js`, `sortable/spec.js` and `free-drag/spec.js` each carry a **bare** `import "./failures.js"` — a side-effect import with no named bindings — because `tsdown` has already folded the literals into them at build time. `measure.ts`'s own commentary on the `drag.js` row records this behaviour for F-77; it holds for every internal consumer, not only that one.

---

## 3. What a behavior author actually pays

`kernel root - kernel.js` imports `{ draggable }` and nothing else, which is the kernel **floor** rather than an author's bill. A temporary fixture was written to measure the other end: a third-party `pin()` behavior that authors a full `BehaviorSpec` — `createFramePart`/`resetFramePart`, `admit`, all four transactional seams, `moved`, `anchorTarget`, `finalized`, `reportFailure`, `retire` — and that names, reachably:

- `draggable`, `LIFT_FAITHFUL`, `ACTIVE`, `RELEASING`;
- all five `SETTLED_*` arms, discriminated in a `switch`;
- `AT_PROPOSAL` / `AT_CONSUMER`;
- **all thirteen `FAILURE_*` stages**, passed to `host.fail`, returned inside `SeamRejection`s and compared in `reportFailure`;
- `toDraggableError`, called on the consumer-facing error path.

Four variants were measured, all against the **unablated** production tree except where stated:

| fixture variant | minified | brotli | modules |
| --- | --: | --: | --: |
| **B** — published stages | 20,688 | 7,197 | 14 |
| **L** — the same file with the thirteen stages written as numeric literals | 20,688 | 7,197 | 14 |
| **N** — B with no call into the library's error machinery | 20,285 | 7,130 | 13 |
| **M** — B with the stage → code mapping re-owned by the behavior | 20,658 | 7,194 | 14 |

### 3.1 The export vocabulary: **B − L = 0 min / 0 br**

Variant L is what an author would be forced to write if `kernel.js` stopped publishing the constants — `host.fail(2, error)` instead of `host.fail(FAILURE_ACTIVATION, error)`. **The two bundles are byte-identical.** The symbolic name costs nothing over the number, because it _is_ the number by the time the minifier is finished.

Variant L was also measured **under** the ablation, to close the loop from the other side: still 20,688 / 7,197 / 14. (Variant B does not build under the ablation — thirteen `MISSING_EXPORT` errors, which is the ablation working.)

So the cost of the public `FAILURE_*` vocabulary to a bundling behavior author, measured three ways, is **zero**.

### 3.2 The behavior's own weight, for scale

B over the kernel floor: **+2,150 minified, +599 Brotli, +1 module**. The extra module is `kernel/errors.js`, pulled by `toDraggableError` — _not_ `kernel/failures.js`, which no variant reaches.

### 3.3 The unrelated machinery: **B − N = 403 min / 67 br / 1 module**

Variant N never calls `toDraggableError`, so `kernel/errors.js` — the `DraggableError` class, the fifteen-slot `STAGE_TO_CODE` array and `toDraggableError` itself — leaves the graph entirely. **This is the `FailureStage`/error machinery the question asked to hold separate, and it is the only part of the whole area with a non-zero bundled cost.**

Note the asymmetry: `DraggableError` is on `drag.js`, the shared root, so a consumer who writes `err instanceof DraggableError` pays for that module anyway and variant N's saving is available only to a behavior whose consumer never touches the class. It is a real 67 B, and it is not attributable to the export vocabulary in any way.

### 3.4 D-64's obligation, priced: **B − M = 30 min / 3 br**

Variant M is the counterfactual `kernel.ts` names when it justifies publishing `toDraggableError` — _each behavior would re-own the mapping_. Re-owning it in one behavior is **30 B minified and 3 B Brotli cheaper**, i.e. a wash.

**That is a result about size and not about the decision.** D-64's argument is that `code` would otherwise mean something different depending on which behavior raised the error; a 3 B measurement neither supports nor undermines it. Recorded here only so that no later pass mistakes the mapping for a size win in either direction. The measurement was taken with **one** behavior in the bundle; the `both behaviors` row is the configuration where a shared mapping could begin to pay, and it was not measured because the export vocabulary — the actual subject — is zero there too.

### 3.5 One in-repo consumer re-owns the mapping already, and it is not shipped

`findReferences` on a stage constant turns up a ninth file outside `src/` and the tests: `tests/revision/revision-2.ts`, the compile-only Revision 2 fixture. It declares its own `stageToCode` over all thirteen stages, in the **sparse `Readonly<Record<FailureStage, DraggableErrorCode>>` form that `src/kernel/errors.ts` retired on 2026-08-22** in favour of the positional array.

For this record it matters only as scale: the fixture is not in `files.json`, ships nothing, and costs nothing, so variant M above is the only priced version of that counterfactual. Two adjacent observations are worth recording anyway, neither of them a size finding:

- the fixture exists to assert D-64's totality **as a type**, which is the same guarantee `errors.ts` now carries via `satisfies` — so the two are checking the same rule in two representations, and only one of them was updated;
- its doc block still attributes stages using retired D-74 vocabulary (`reorder-resolution`) and a hyphenated code spelling that no longer matches `DraggableErrorCode`. Reported, not fixed.

---

## 4. The published tarball: where the bytes really are

The package ships unbundled (`unbundle: true`), unminified, with doc comments. A consumer on a bundler never sees these bytes; a native-ESM or CDN consumer fetches them, and every consumer downloads them at install.

| built artifact                 |    baseline |     ablated |      delta |
| ------------------------------ | ----------: | ----------: | ---------: |
| `kernel.js`                    |       5,449 |       4,853 |   **−596** |
| `kernel.d.ts`                  |       3,928 |       3,332 |   **−596** |
| `kernel/failures.js`           |       3,094 |         326 | **−2,768** |
| `kernel/seams.js`              |       9,765 |       9,741 |    **−24** |
| `kernel/failures.d.ts`         |       3,768 |       3,768 |      **0** |
| **total, all `.js` + `.d.ts`** | **330,049** | **326,065** | **−3,984** |

Brotli over the fifteen-file `kernel.js` fetch closure: **31,195 → 30,142 B, −1,053 B**, distributed as `kernel.js` −87, `kernel/failures.js` −951, `kernel/seams.js` −15.

Four things in that table are worth separating.

**(a) `kernel.js` −596 B is the export vocabulary itself, undiluted.** It is exactly the thirteen names appearing twice — once in the generated `import { … } from "./kernel/failures.js"` and once in the terminal `export { … }` list. No comment is involved: `tsdown` does not emit the doc block attached to a re-export statement, so `kernel.ts`'s eight-line justification for publishing the stages costs nothing in the artifact. This is the cleanest single number in the record.

**(b) `kernel/failures.js` −2,768 B is mostly prose.** Stripping comments from both variants: the _code_ falls 814 → 84 B, so **730 B is the thirteen `const` declarations plus their names in the export list, and 2,031 B is the module doc comment** — the D-74 renaming history, the wire-value rule, the D-41 hole. That comment documents constants that would no longer be public, so a decision to unpublish would plausibly shorten it; but it is prose, it compresses well (the whole module's Brotli delta is 951 B), and counting it as the cost of the vocabulary would overstate the vocabulary by roughly three to one.

**(c) `kernel/failures.js` does not leave the tarball.** `AT_PROPOSAL` and `AT_CONSUMER` are published from `sortable.js` and `free-drag.js` and are genuinely imported by name there, so the module survives at 326 B and the fetch closure keeps all fifteen files. No module count moves anywhere.

**(d) `kernel/failures.d.ts` does not move at all.** All thirteen `declare const`s stay, because `FailureStage` is defined as their union and the type remains published — `KernelHost.fail` and `SeamRejection.stage` are typed by it. The 3,768 B declaration is the largest single artifact carrying this vocabulary and the ablation does not touch it. Only `kernel.d.ts`'s re-export list shrinks, by the same 596 B as the runtime entry.

**The `kernel/seams.js` −24 B** is a curiosity worth one line: it is a bare `import "./failures.js"` side-effect line that the build stops emitting once `seams.ts`'s only remaining reference to the module is a type. It is residue, not machinery, and the same line survives in `kernel/kernel.js`, `sortable/spec.js` and `free-drag/spec.js` under both variants.

---

## 5. `kernel.js` is a poor proxy, and it fails in two directions

This was asked for explicitly, and the measurement does expose it.

**The entry file overstates.** `kernel.js` is 5,449 B and the vocabulary is 596 B of it — about 11 %, and the single largest thing on both its import and export lines. Read as a file, the thirteen stages look like the most expensive decision on the page. They are not; that reading is counting identifier characters in an artifact nobody's bundler ships.

**The harness row understates, and cannot do otherwise.** `kernel root - kernel.js` imports `{ draggable }`, and its eleven package modules include **neither `kernel/failures.js` nor `kernel/errors.js`**. The row is structurally incapable of observing any change to the failure vocabulary — publishing all thirteen stages, publishing none, or publishing thirty would all produce 18,538 / 6,598. Its 0 B result is therefore _true_ but is not evidence: it is what the row reports for a change it cannot see.

**Only the fixture is an instrument for this question**, and its answer is also zero — but it is zero _having reached the code_, which is a different claim and the one the decision needs. The distinction matters for the next pass too: `kernel root` will keep reporting 0 B for any future change to the stage vocabulary, including one that regresses.

**One consequence to flag rather than to act on.** The fixture was deleted with the rest of the ablation, so the package currently has **no standing instrument that reaches the kernel authoring API as an author uses it**. Whether one should be added to `COMPOSITIONS` is an owner decision with a real cost — a fixture is a second implementation of a behavior that must be kept honest, which is exactly the drift risk `bench/size/noncomposed.js` already carries and which `tests/bench/size.node.test.ts` exists to contain. It is recorded as a gap, not as a recommendation.

---

## 6. Limits of this measurement

- **One bundler.** Every zero above depends on cross-module constant inlining. Rolldown does it; so does `tsdown` at build time, which is why the published tree already shows bare side-effect imports. A consumer toolchain that preserves ESM without concatenating — or that bundles with module wrappers — would pay the import binding and the module. **Not measured**, and it is the one scenario in which the vocabulary is not free.
- **Brotli deltas are not additive.** The per-file figures in §4 are per-file compressions of separately served files, which _is_ what a no-bundler consumer gets, so they sum legitimately there. The bundled figures in §2 and §3 are whole-artifact and must not be added to them or to each other.
- **The fixture is one behavior of one shape.** It names the vocabulary exhaustively, which is the property the measurement needed, but its bulk (2,150 min over the floor) is not a claim about what behaviors weigh.
- **No production change was measured for correctness.** The ablation removes a public export and thirteen consumer-visible names; it is a bundling experiment, not a proposal, and it was never type-checked or tested beyond building.

---

## 7. What this does and does not settle

**Settled:** the thirteen public `FAILURE_*` exports cost a bundling consumer nothing — zero minified, zero Brotli, zero modules, whether the author uses them or not. §4's _avoid exported numeric failure constants_ has a size rationale behind it, and here that rationale is empirically absent. Any argument for unpublishing them has to be made on API-surface grounds — D-68's closure rule, `CODE_OF_SIZE.md` §4's own final line, the thirty-name authoring surface — and the size column should be written as `0` rather than left blank.

**Not settled, and deliberately left open:**

- Whether a **wire value** should be public at all. That is D-30/D-74's ground, and `failures.ts` states the constraint that governs any change here — _a stage constant is inlined into a consumer's compiled code, so a rename that repoints a value is the one change this list must never make_. Unpublishing the names does not retire the numbers; a consumer's already-compiled `2` keeps arriving.
- Whether the **tarball's** 3,984 B is worth an API decision. It is install-time weight, two-thirds prose, and it removes no module.
- Whether `kernel/errors.js`'s 67 Brotli bytes — the only non-zero figure in the whole area — belong to the kernel tier at all. That is D-64's question and it is untouched here.

---

LSP plugin - available; used: findReferences on FAILURE_ADMISSION in src/kernel/failures.ts, to enumerate every declaration and use site of a stage constant before ablating and to establish that the only non-test, non-src consumer is the compile-only fixture noted in section 3.5.