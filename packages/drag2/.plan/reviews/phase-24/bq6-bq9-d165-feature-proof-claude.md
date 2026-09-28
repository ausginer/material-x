# Phase 24 — feature proof: box-quad BQ-6/BQ-9 and drag2 D-165

**Read at `90d141e2`** (range `55eaaf1b..90d141e2`, branch `drag2/fin-review`). Working tree clean at read time and at write time; no project file was modified by this pass.

**Verdict: the decomposition and the regression fix land as recorded.** Every required property of BQ-9 §7 and every carried property of D-165 holds in the tree, the two new browser cases discriminate the fix rather than passing regardless, and the byte figures in the plan row match the ledger. Three findings, none tier A: two documentation/instrument defects on published or relied-upon surfaces, and one unasserted claim.

---

## 1. Scope

**Covered, with evidence produced by this pass:**

- box-quad `packages/box-quad/src/index.ts` in full against record 11 §7 properties 1–7 and record 12's amendment.
- The pre-change source at `55eaaf1b` as the comparison basis for property 4 (style-read count and numeric agreement), by throwaway browser probe.
- drag2 `src/kernel/presentation.ts`, `src/kernel/kernel.ts`, `src/kernel/spec.ts`, `src/kernel.ts`, `src/sortable/spec.ts`, `src/sortable/config.ts`, `src/sortable/xy.ts`, `src/sortable/y.ts`, `src/free-drag/spec.ts`.
- Every `admit()` construction of the subject in the repository (`src/sortable/spec.ts` ×2, `tests/consumer.node.test.ts`, `tests/revision/revision-2.ts`) and the bare-element normalization in `kernel.ts`.
- `packages/box-quad` browser suite (193 passing, 5 files) and the full `packages/drag2` suite (65 files, 1234 passing, 60 skipped, typecheck clean), both run at `90d141e2`.
- Falsification: `space: scope.itemSpace` reverted to `scope.visualSpace` in the working tree, suite re-run, file restored, tree verified clean.
- `packages/drag2/.plan/measurements/budget-rebases.md` against D-165's row, and `bench/size/measure.ts`'s control re-declarations.
- `packages/drag2/tests/COVERAGE.md` and `tests/sortable/displacement.browser.test.ts`.
- box-quad `contract/00-index.md`, `01-public-api.md`, `02-behavior-scenarios.md`, `03-failure-table.md`, `04-support-matrix.md` for claims falsified by the new source.

**Not covered (silent, not clean):**

- Bytes were **not** re-measured. The ledger's figures were checked for internal consistency and against the plan row; no bundle was rebuilt.
- Runtime cost of the second walk (+180 µs at depth 30) was not re-timed.
- The 1–2 ULP association change (record 11 §6.2) was checked only to 9 decimal places against the pre-change implementation, not characterized at ULP resolution.
- `packages/drag2` visual/story surfaces and the `material-x` consumers were not exercised.
- F-1's open half in box-quad (`readBoxQuad` naming, no artifact describing `Box` or `Space`) was observed and is out of scope: the plan's own record for this pass states it shrinks and does not close.

---

## 2. What holds

### 2.1 BQ-9's seven properties, in the landed source

| Property | Holds | Evidence in `packages/box-quad/src/index.ts` |
| --- | --- | --- |
| 1 — caller-owned numeric storage, no element reference | yes | `Space = Float64Array`, `SPACE_LENGTH = 5`, `space()` at :71. Nothing in the type or the writer holds a node. |
| 2 — produces without reading layout or touching the element's own box | yes | `ancestry` :234–265 starts at `flatParentOf(element)` and never names `element` again; no `getClientRects`, no `getBoundingClientRect`. Asserted at `tests/coordinates.browser.test.ts:383–431` for `display: contents`, a fragmented inline, and a disconnected element — each `coordinates` `false`, `ancestry` `true`. |
| 3 — `Box` carries only what `projection` reads | yes | `BOX_LENGTH = 8`; slots `BOX_A…BOX_HEIGHT` only; `BOX_ANCESTOR_*` occur nowhere in either package's source (one vestigial mention in a test regex — see `proof-2`). |
| 4 — the split repeats no work | yes | Probe below. |
| 5 — ancestry argument optional, fallback not shared module state | yes | `coordinates(element, out, above?)` :294–316; the fallback calls `space()` **inside** the function body, allocating per call. No module-level buffer exists in the file. |
| 6 — precondition documented, not enforced, in `projection`'s own terms | yes | :279–282, explicitly "in the same way {@link projection}'s same-viewport requirement does". |
| 7 — no boundary, no designated ancestor, no cardinality | yes | The whole exported surface is `box`, `space`, `quad`, `ancestry(element, out)`, `coordinates(element, out, above?)`, `projection(source, out, relativeTo?)`. No element-valued parameter beyond the measured one, and no capacity argument. |

**Property 4, measured rather than argued.** A throwaway browser test instrumented `window.getComputedStyle` over a depth-12 chain and ran the pre-change monolith (`git show 55eaaf1b:packages/box-quad/src/index.ts`, imported side by side) against the landed split:

```
PROBE monolith=15 ancestry=14 coordinates=1 split=15 fallback=15
```

Identical, in both the caller-supplied and the internal-fallback form. The first eight `Box` slots agreed with the monolith's to 9 decimal places on the same chain. The flat tree is walked once in each function: one `while (current)` loop in `ancestry`, none in `coordinates`. Probe files were created under `packages/box-quad/tests/` and deleted; `git status --porcelain` is clean.

### 2.2 D-165's consumption of the new surface

- `acquireLift(visual, item, mode, originRect, realm, unwind)` (`src/kernel/presentation.ts:496`) reads the visual's ancestry, the item's **only when they differ**, and measures the visual **through** the first: `!ancestry(visual, above) || (itemAbove !== above && !ancestry(item, itemAbove)) || !coordinates(visual, measured, above)`. The hazard D-165 names — a `Space` the library cannot validate — is closed by construction: `above` is passed to `coordinates` for the element it was just read for, and nothing else.
- **Object identity, not agreement.** `const itemAbove = item === visual ? above : space()` (:508) and `itemSpace = itemAbove === above ? visualSpace : inheritedSpaceOf(itemAbove)` (:528–529). One buffer, one derived value, `visualSpace === itemSpace` by reference in the default case. Matches the "As landed" paragraph exactly.
- `ActivationScope` publishes `visualSpace` and `itemSpace` (`src/kernel/spec.ts:198, 212`); `compose` and free drag take the first (`presentation.ts:551`, `free-drag/spec.ts:353`), the displacement sink the second (`sortable/spec.ts:882`). No other consumer of either exists in `src/`.
- **D-85 stands unamended.** `grep -rn "box-quad" src/` returns exactly one import, `src/kernel/presentation.ts:17`; the other hits are prose in `kernel/spec.ts`, `free-drag/geometry.ts` and two `.stories.tsx` files. No behavior module imports the package, and none carries a `Box` index.
- Every pair-form construction supplies a deliberate item: `sortable/spec.ts:432` (`{ visual, box: visual, item }` — `box` deliberately defaulted to the visual without re-invoking the consumer's resolver) and `:449` (`{ visual, box, item }`, all three resolved from `item`). `kernel.ts:951–959` sets all three from the bare form. The two test fixtures (`consumer.node.test.ts:658`, `revision/revision-2.ts:586–590`) set `item` equal to their visual, which preserves their prior behavior exactly.

### 2.3 The regression fix, discriminated

The full drag2 suite passes at `90d141e2` (1234 passed, 0 failed). Reverting only the routed value — `space: scope.itemSpace` → `scope.visualSpace` in `src/sortable/spec.ts:882`, nothing else — fails exactly two tests, with exactly the numbers D-165 claims:

```
× should ignore a transformed wrapper between item and visual
  expected 53.33332824707031 to be close to 80
× should ignore a transform authored on the item itself
  expected 26.666664123535156 to be close to 40
  Tests  2 failed | 29 passed (31)
```

26.67 against 40 is F-227's recorded regression reproduced by the instrument that closes it; 53.33 against 80 is F-225's wrapper case, and it is the number the superseded test asserted as its expectation (`carried ≈ (-travel * 2) / 3`). The third case in the same `describe` — a descendant `visual` with nothing between — passes under **both** routings, which is what `COVERAGE.md` claims for it ("passes whichever space is routed, which is what makes it the control for the pair below"): verified, not assumed. The file was restored with `git checkout --` and the tree re-verified clean.

The two configurations are distinct in the fixtures rather than in prose: the wrapper case inserts a `scale(1.5)` `middle` element between item and visual under a `scale(2)` stage; the item case authors `scale(1.5)` on the item itself with **no** stage at all, which is what makes it F-227's shape rather than another instance of F-225's.

### 2.4 The published limit

`git diff 55eaaf1b 90d141e2 -- src/sortable/config.ts` shows the F-225 boundary sentence **deleted**, not reworded: the four-limit list becomes three ("visual order must follow DOM order, rule-placed layouts are unsupported, and in grid `box` must equal `visual`"), and the whole explanatory paragraph beneath it is gone. The replacement sits on `visual`'s own doc block (`config.ts:94–103`): "expected to resolve to the item or to something inside it. Nothing detects a violation…". That is D-165's property 3 remainder, on the slot D-164 said it belonged to.

### 2.5 Coverage and measurements

- `COVERAGE.md` gains a new section naming both configurations distinctly, with the counterfactual numbers recorded (53.33/80 and 26.67/40) — both confirmed real by §2.3.
- **F-229 and F-230 are unchanged by this commit and are not reported.** `displacement.browser.test.ts` still hardwires `axis: y()` (:105) and `xy.browser.test.ts:158,180` still pass `space: null`, so the `xy()` gap is neither closed nor widened; the three new/reworked cases are all `y()`, which is more of the same restriction rather than a change to it. F-230's subject is an artifact's framing and is untouched.
- The ledger's D-165 section records `minimal` +62, `minimal + layoutAnimation` +71, `xy + layoutAnimation` +64, `complete` +75 — matching the plan row verbatim — with every budget unchanged and every slack positive (tightest `both behaviors`, 44 B, down from 150 B, as the row claims). Five control rows re-declared in `bench/size/measure.ts` (four free-drag rows plus `kernel.js`), and `drag.js` and baseline B untouched — exactly the "five moved, two held at zero" the record states. The `minimal` baseline the section subtracts from (9,912 − 62 = 9,850) is the "after" figure `e4e835ba` recorded in `plan.md`, so the ledger's continuity across the two files is intact despite the intervening pass not writing a table here.

---

## 3. Findings

### `proof-1` — tier B — the published `AdmissionSubject` still documents itself as a pair

**Current contract.** `src/kernel/spec.ts:98–123`. The type gained a required third member `item`, and that member is documented on itself. The block **above** the type was not touched:

> A bare `HTMLElement` is the common form and means `box === visual`. The pair form names a separate geometry source: what leaves flow is the **visual**, while what the layout loses is the **box**.
>
> […] `box` is **required** inside the pair, so that _the box is the visual_ has exactly one encoding.

`BehaviorSpec.admit` carries the same gap at `:429–430`: "Returns the element the kernel should lift — optionally paired with the element the kernel should measure — or `null`".

**Why it is a problem.** `AdmissionSubject` is published from the kernel tier (`src/kernel.ts:72`), so a behavior author outside this repository reads this block and nothing else. It tells them the bare form asserts `box === visual`; it does not tell them the bare form now also asserts `item === visual`, and therefore that returning a bare element for an operation whose item is _not_ the visual silently routes the visual's space to a displacement sink — which is precisely the conflation D-165 exists to end, restated one tier up. The type system does not cover the gap: `item` is required, so the author supplies _something_, and the doc gives them no basis for choosing anything but the visual. The pair-form/triple-form vocabulary is also now wrong in three places in one paragraph.

**Evidence.** `src/kernel/spec.ts:98–123` and `:425–432` at `90d141e2`, unchanged by `git diff 55eaaf1b 90d141e2 -- src/kernel/spec.ts` except for the type body. Contrast `src/sortable/spec.ts:445–449`, whose internal comment _was_ updated to "the box is the visual is the item" and "There is exactly one encoding".

**Required property.** The doc block governing `AdmissionSubject`, and `BehaviorSpec.admit`'s return description, state what the bare form asserts about all three members and why each is required — in the same terms the sortable spec's internal comment already uses.

### `proof-2` — tier B — the D-85 source guard names a constant that can no longer exist, and not the ones that replaced it

**Current behavior.** `tests/packaging.node.test.ts:323`:

```ts
if (/from '@ydinjs\/box-quad'|BOX_ANCESTOR_/u.test(source)) {
```

**Why it is a problem.** BQ-9 deleted `BOX_ANCESTOR_ZOOM` and `BOX_ANCESTOR_A…D`; this regex is the only place the token survives in the repository, and it can never match again. The drift the second alternative existed to catch — the test's own comment says "Free drag used to take its own `coordinates()` traversal — with four private copies of box-quad's index constants" and "no behavior module carries a `Box` index of its own" — is now spelled `SPACE_A`…`SPACE_ANCESTOR_ZOOM` (the kernel's private copies live at `src/kernel/presentation.ts:41–45`), and the guard does not name them. The instrument's coverage narrowed silently while its comment kept claiming the wider property. The first alternative still holds, so nothing about D-85's import half is unenforced and no program behavior is affected. The same comment additionally states the kernel "measures the box space once… and hands the four coefficients down on `ActivationScope`", which is now two spaces and eight coefficients.

**Evidence.** `grep -rn "BOX_ANCESTOR" packages/box-quad/src packages/box-quad/tests packages/drag2/src packages/drag2/tests` returns that line and nothing else, at `90d141e2`.

**Required property.** The guard's source-level clause covers whichever box-quad slot vocabulary is current, so that a behavior module reproducing box-quad's index constants is refused whatever those constants are now called; and its comment describes what the kernel actually publishes.

### `proof-3` — tier C — property 5's object identity is claimed in two records and asserted nowhere

**Current behavior.** D-165's "As landed" states the identity is "object identity rather than agreement", and `LiftAcquisition`'s doc block (`src/kernel/presentation.ts:454–455`) states "The two are the same object whenever the visual is the item". `grep -rn "visualSpace\|itemSpace" tests/` returns nothing: neither field is named anywhere in the suite. The behavior is proven only end to end, through rendered travel.

**Why it is a problem.** The single-buffer arrangement at `presentation.ts:508` is the whole mechanism of the claim, and an implementation that allocated a second `Space` and filled it identically would pass every test in the repository while making both records' wording false. Consequence is confined to allocation and to the accuracy of the record — no consumer observes a difference — which is why this is C rather than B.

**Evidence.** `grep -rn "visualSpace\|itemSpace" packages/drag2/tests/` → no matches, at `90d141e2`.

---

## 4. Method

Records read in full before judging: `packages/box-quad/.plan/plan.md` (BQ-6, BQ-9 rows and the three most recent Record entries), `reviews/11-D-first-class-space-claude.md`, `reviews/12-D-batch-ancestry-query-claude.md`, `packages/drag2/.plan/contract/00-index.md` rows D-164, D-165, F-225, F-227–F-231, and `reviews/phase-23/f227-inherited-space-boundary-claude.md` §4–§5. `CONTRIBUTING.md` §13 retrieved and found not to govern any finding above (none is a size-pass trade). `.agents/docs/review-findings.md` and `.agents/docs/handoff.md` read before writing and before committing.

Abandoned intermediate forms (BQ-2, BQ-5, BQ-7, BQ-8, D-164's boundary encoding) were treated as historical context only and not evaluated as live.

Two throwaway probes, both removed: a `getComputedStyle` counter comparing the landed split with the pre-change monolith imported side by side, and a working-tree revert of the routed space to confirm the two new browser cases discriminate. `git status --porcelain` verified clean after each.

LSP plugin — unavailable (two `ToolSearch` probes returned no language-server tools).