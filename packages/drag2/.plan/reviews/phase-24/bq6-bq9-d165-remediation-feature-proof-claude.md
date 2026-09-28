# BQ-6 / BQ-9 / D-165 remediation — feature proof

**Read at:** `052de91b` (`drag2: state all three admission roles, derive the D-85 guard's names, and assert the shared space`). Branch `drag2/fin-review`; branch HEAD is `cd8ed820`, which touches only `.claude/agents/consolidator.md` and leaves the `packages/drag2` tree at `052de91b` — verified with `git diff --stat 052de91b..cd8ed820`.

**Diff range:** `5adc3ab3..052de91b`, confirmed to be exactly one commit on `packages/drag2` (`git log --oneline 5adc3ab3..052de91b`). Seven files: `.plan/contract/00-index.md`, `.plan/plan.md`, `src/kernel/spec.ts`, `tests/COVERAGE.md`, `tests/kernel/presentation.browser.test.ts`, `tests/packaging.node.test.ts`, `tests/perf/m5.browser.test.ts`.

**Subject of record:** `packages/drag2/.plan/reviews/phase-24/bq6-bq9-d165-summary.md` (§1 table, §§2–3), read directly.

---

## 1. Scope

**Covered.**

- The whole delta, hunk by hunk, at `052de91b`, against the summary's original claim and required property for each of F-232…F-235.
- **Discriminating verification by mutation**, four experiments, each reverted and the tracked tree verified clean with `git status --short` afterwards:
  - break `slotConstants()`'s extraction regex → the guard must fail;
  - plant the current-spelling anti-pattern in a behavior module → the guard must name it;
  - the same plant against the **pre-remediation** guard → it must pass green (the falsification of F-233's own claim);
  - remove `acquireLift`'s shared-buffer short-circuit, and separately collapse it to one derivation → the identity row and the control row must fail respectively.
- **Test execution, both projects, at `052de91b` with a clean tree.** `node`: 20 files / 307 tests passed (includes `packaging.node.test.ts` and the ledger-shape instrument `references.node.test.ts`, which F-231 records as breakable by reformatting). `browser`: 39 files / 856 passed, 60 skipped. Browser infrastructure is available in this sandbox; no fallback to static-only checking was needed for F-234 or F-235.
- The claim that the remediation is docs/tests/plan-only, verified mechanically rather than by reading.
- Hand-traced transform composition for the F-234 fixture, against `box-quad`'s `ancestry()` and `presentation.ts`'s `inheritedSpaceOf()`, then cross-checked against the browser's own observed values.

**Not covered — explicitly.**

- The **opt-in timing arms** of `perf/m5.browser.test.ts` (`VITE_DRAG_MEASURE`, the 8 skipped rows) were not run. I verified that nothing the timings depend on changed; I did not re-establish that the recorded numbers still satisfy phase-21's gate.
- `@ydinjs/box-quad`'s own suite was not run — out of this package's scope. The new cross-package read in `packaging.node.test.ts` was exercised only through drag2's `node` project.
- The plan and ledger prose was checked for **accuracy of the four closure claims** and for the ledger instrument still passing; it was not audited against the record's tense or narrative conventions.
- An untracked `bq6-bq9-d165-remediation-cleanup-claude.md` from a parallel pass is present in this directory. **Deliberately not read** — this report stands on its own evidence.

---

## 2. Verdicts

| Finding | Verdict |
| --- | --- |
| F-232 | **Closed as scoped** — both named doc sites now state all three roles, consistently and without contradiction. One adjacent site of the same defect class survives, on the same published type: `proof-1` |
| F-233 | **Closed** — and the closure is real, not cosmetic. Discriminated three ways, including a falsification showing the old guard passes green on the exact anti-pattern the new one names |
| F-234 | **Closed** — the assertion discriminates reference identity from equal values, and the control is a genuine divergence control whose arithmetic I traced independently and then confirmed against the browser |
| F-235 | **Closed** — the prose now matches what the fixture composes and what the tree does, and nothing measured changed |
| Production-change claim | **Verified.** No non-comment line of `src/kernel/spec.ts` differs between `5adc3ab3` and `052de91b` |

---

## 3. F-232 — the bare admission subject's prose

**Verdict: closed as scoped.**

Both sites the summary names now describe three roles and state the bare form in the `item === box === visual` form.

`src/kernel/spec.ts:98-114` (`AdmissionSubject`'s doc block) opens with _"**Three roles, and a bare `HTMLElement` says one element fills all of them** — `item === box === visual`, which is the common form"_, then defines each role separately, then closes with _"All three are **required** inside the object form, so that *they are one element* has exactly one encoding"_ — replacing the pre-remediation _"`box` is **required** inside the pair"_, which was the sentence that most directly implied a two-member subject.

`src/kernel/spec.ts:430-437` (`BehaviorSpec.admit`'s return description) now reads _"Returns the element the kernel should lift when the item, the visual and the box are one element, the three named separately when they are not, or `null`…"_.

**Where this discriminated rather than inspected.** I checked for the three failure modes the task named rather than for the presence of edits:

- **Asymmetry.** Both sites name all three roles, and both state the bare form's precondition as all three coinciding. Neither site now says "pair", "half" or "optionally paired". `grep -rn "pair form\|box half\|visual half" packages/drag2/src` returns exactly one hit, `proof-1` below.
- **Internal contradiction.** The `item` member's own doc comment (`spec.ts:120-125`) says _"a bare element is the spelling of all three coinciding"_ — agreeing with the block above it. `ActivationScope.box`'s doc was corrected in the same commit from _"the box half of its subject"_ to _"the `box` member of its subject, or the element itself when it returned a bare one"_. No contradiction found.
- **Technically-present-but-misleading.** `admit`'s new sentence states the bare form as a **precondition on when a behavior may return it** ("when the item, the visual and the box are one element"), which is exactly the thing an author reading only `admit` needed and previously did not get. It does not merely list three nouns.

Two comments elsewhere still read `box === visual` — `sortable/slots.ts:105` and `sortable/rect-index.ts:448`, plus `free-drag/spec.ts:243`. These are **not** part of this finding: each is a statement about the box and visual coinciding in a specific internal computation, not a description of what the bare admission form asserts, and none is on a published surface's doc block.

### proof-1 — tier B — `ActivationScope.visual`'s doc still frames the subject as having halves

- **Finding.** `src/kernel/spec.ts:158` reads:
  ```ts
  /** The element the kernel is lifting — the visual half of what `admit` returned. */
  visual: HTMLElement;
  ```
- **Current behavior / contract.** `AdmissionSubject` has three members. This is the only remaining occurrence of the two-role framing on a published kernel doc block, and it sits **six lines above** the `box` member whose identical _"the box half of its subject"_ wording this very commit corrected.
- **Why it is a problem.** It is the same defect F-232 named — a published surface describing a superseded shape — and the remediation corrected the neighbouring member while leaving this one. A reader who takes `ActivationScope`'s own members as the description of what `admit` returns is told the subject has halves, immediately before being told, correctly, that `box` is a _member_. That within-type asymmetry is more misleading than either wording alone would be.
- **Evidence.** `git diff 5adc3ab3..052de91b -- packages/drag2/src/kernel/spec.ts` shows the `box` doc changed and `visual`'s untouched; `grep -rn "half" packages/drag2/src/kernel/spec.ts` returns line 158 only.
- **Required property.** Every doc block on a published kernel type describes `admit`'s subject as three roles, or names one role without implying a count. No published doc block describes the subject as having halves.

---

## 4. F-233 — the D-85 conformance guard

**Verdict: closed.** All three sub-questions answered affirmatively, two of them by execution rather than by reading.

### (a) The names are genuinely read, not restated

`tests/packaging.node.test.ts:43-67` adds `slotConstants()`, which does `readFile(resolve(ROOT, '../box-quad/src/index.ts'), 'utf8')` and returns `[...source.matchAll(/^const ([A-Z][A-Z\d_]*) = \d+;$/gmu)].map((m) => m[1]!)`. No forbidden name appears as a literal anywhere in the test. The consumer at line 342 builds `new RegExp(\`\\b(?:${forbidden.join('|')})\\b\`, 'u')`.

Against the current `packages/box-quad/src/index.ts` this extracts 16 names — `BOX_LENGTH`, `BOX_A`…`BOX_HEIGHT`, `SPACE_LENGTH`, `SPACE_A`…`SPACE_ANCESTOR_ZOOM`, `QUAD_LENGTH`. I confirmed by `grep -nE "^(export )?const [A-Z][A-Z0-9_]*" packages/box-quad/src/index.ts` that these are **all** the module-level uppercase constants box-quad declares, so the extraction currently misses none. The `\b` word boundaries make the alternation safe against prefix collisions: `\bSPACE_A\b` cannot match inside `SPACE_ANCESTOR_ZOOM`, since `_` is a word character.

The import half was rewritten from a regex alternation to `source.includes("from '@ydinjs/box-quad'")` — behaviourally equivalent for the single-quote import style this repo formats to, and no longer carrying the retired `BOX_ANCESTOR_` literal.

### (b) The vacuity check is real, not cosmetic — verified by mutation

I mutated the extraction pattern to `/^const ([A-Z][A-Z\d_]*) := \d+;$/gmu`, which matches nothing, and ran the test:

```
FAIL tests/packaging.node.test.ts:324 > should keep the geometry package out of every behavior
AssertionError: expected 0 to be greater than 0
 ❯ tests/packaging.node.test.ts:340:30
```

Without the check, that mutation would have left the guard green while testing only the import specifier — the exact silence F-233 describes. Test file restored; suite returned to 14/14 passing.

### (c) The guard catches a current-spelling redeclaration — verified by construction

I prepended to `packages/drag2/src/free-drag/geometry.ts`:

```ts
const SPACE_A = 0;
const SPACE_ANCESTOR_ZOOM = 4;
```

The repaired guard fails and names the file:

```
AssertionError: expected [ 'free-drag/geometry.ts' ] to deeply equal []
+   "free-drag/geometry.ts",
```

**The falsification that makes this discriminating rather than confirmatory.** With that plant still in place, I substituted the **pre-remediation** `packaging.node.test.ts` (`git show 5adc3ab3:…`) and re-ran:

```
Test Files  1 passed (1)
     Tests  14 passed (14)
```

The old guard passes green on the anti-pattern it exists to catch; the new one fails. That is F-233's claim reproduced and its closure demonstrated on the same tree, in the same run. Both the source plant and the test substitution were reverted; `git status --short` is clean of tracked changes.

### proof-3 — tier C — the vacuity check is all-or-nothing, so partial extraction loss is still silent

- **Finding.** `expect(forbidden.length).toBeGreaterThan(0)` catches only total extraction failure. If box-quad renamed one slot into a form the pattern does not match — `export const SPACE_A = 0;`, `const SPACE_A = 0 as const;`, an indented declaration, or a non-integer initializer — that single name would drop out of `forbidden` while the other fifteen keep the length positive, and the guard would silently stop looking for the renamed slot.
- **Current behavior / contract.** The doc block on `slotConstants()` claims the derivation "makes a rename carry the guard with it". That is true for a rename of the _identifier_, which is the case F-233 was about; it is not true for a change to the _declaration form_.
- **Why it is a problem.** It is a narrower instance of the failure mode the finding named, on the same instrument, and the vacuity check reads as though it covers it.
- **Evidence.** All 16 current declarations match the pattern, so nothing is missed today — this is a forward-looking residual, not a live gap. Verified by comparing `grep -nE "^(export )?const [A-Z][A-Z0-9_]*"` (16 hits) against the test's own pattern (16 matches).
- **Required property.** Either the extraction is insensitive to declaration form, or the guard's own count is pinned so that losing one name is as loud as losing all of them.

**This does not block F-233's closure.** The required property the summary adopted — track the current vocabulary or the underlying invariant rather than a spelling — holds, and is demonstrated by execution.

---

## 5. F-234 — the object-identity assertion

**Verdict: closed.** The new `describe('the two published spaces', …)` block at `tests/kernel/presentation.browser.test.ts:305-364` discriminates reference identity from value equality, and its companion is a real divergence control.

### The identity row genuinely distinguishes object from value — verified by mutation

`presentation.ts:527-529` currently reads:

```ts
const visualSpace = inheritedSpaceOf(above);
const itemSpace =
  itemAbove === above ? visualSpace : inheritedSpaceOf(itemAbove);
```

I removed the short-circuit — `const itemSpace = inheritedSpaceOf(itemAbove);` — which is exactly "an implementation that allocated a second, value-equal `Space`". The identity row fails, and fails on identity rather than on value:

```
FAIL > the two published spaces > should publish one object for both spaces when the item is the visual
AssertionError: expected { a: 0.5, b: -0, c: -0, d: 0.5 } to be { a: 0.5, b: -0, c: -0, d: 0.5 } // Object.is equality
Received: serializes to the same string
Compared values have no visual difference.
 ❯ tests/kernel/presentation.browser.test.ts:347:22
```

The control row passed under this mutation, which is what a control should do.

The `expect(visualSpace).not.toBeNull()` guard is load-bearing and works: `inheritedSpaceOf` returns `null` for the identity space, and `null === null` would satisfy `toBe` trivially. The `stage('2')` wrapper puts a real `scale(2)` above the visual, so `visualSpace` is the object `{ a: 0.5, … }` and `toBe` can only be satisfied by the same object. Confirmed by the failure output above, which shows two distinct objects.

### The control is a real divergence control — verified by the opposite mutation

I then collapsed the derivation to one — `const itemSpace = visualSpace;` — and the control row fails, on the arithmetic rather than on identity:

```
FAIL > should publish two different spaces when a transform sits between them
AssertionError: expected 0.3333333333333333 to be close to 0.5, received difference is 0.16666666666666669
 ❯ tests/kernel/presentation.browser.test.ts:360:25
```

So the identity row holds because the two ancestries are one, not because the kernel only ever derives one space — which is precisely the thing the control exists to establish. `presentation.ts` restored; `git status --short` clean.

### The expected values check out against the DOM the fixture builds — traced independently

`box-quad`'s `ancestry()` (`packages/box-quad/src/index.ts:234-265`) starts at `flatParentOf(element)`, so the space it reads is **strictly above** the element and excludes the element's own transform. `inheritedSpaceOf` returns the inverse of that linear part.

- **Identity row.** `visual = createBox({}, stage('2'))` — the visual is a direct child of a `scale(2)` stage. Above the visual: `2`. Inverse `a = 0.5`. The assertion is `toBeCloseTo(0.5, 6)`. ✓
- **Control row.** `item = createBox({ transform: 'scale(1.5)' }, stage('2'))`, then `visual = createBox({}, item)`. Above the visual: `2 × 1.5 = 3` → inverse `a = 1/3`. Above the item: `2` only, its own `scale(1.5)` excluded → inverse `a = 0.5`. Both assertions match. ✓

`transformOrigin` and the inherited `left: 40px / top: 60px` from `createBox`'s defaults affect only the translation, which `InheritedSpace` does not carry (`spec.ts:196-197`: _"A delta, never a point"_), so they cannot perturb `a`. The browser's own observed `0.3333333333333333` in the second mutation run independently confirms the `1/3` figure was not merely asserted.

The `acquire()` helper passes `(visual, item, …)` in `acquireLift`'s declared order (`presentation.ts:496-503`) and pushes the session into the fixture's `sessions` array, so the `afterEach` disposal already in the file covers it.

---

## 6. F-235 — the M-5 arm-B prose

**Verdict: closed.** The new prose is accurate against the tree, and nothing measured changed.

### The prose matches what the tree does

Each factual claim in the rewritten doc block, checked against source rather than against the record:

- _"`acquireLift` derives one for the visual and one for the item and publishes both as `ActivationScope.visualSpace` and `ActivationScope.itemSpace` (D-165)"_ — `presentation.ts:527-529`, `kernel.ts:1210` and `kernel.ts:1244-1245`. ✓
- _"under the common configuration the item is the visual, so there is one ancestry, one derivation and one object"_ — the `itemAbove === above ? visualSpace : …` short-circuit, independently falsified above. ✓
- _"D-165 spends a second `ancestry` reading when the item is not the visual"_ — `presentation.ts:512-513`, `(itemAbove !== above && !ancestry(item, itemAbove))`. ✓
- _"`ancestry` takes computed style and no layout"_ — `ancestry()` reads only `getComputedStyle`; `box-quad`'s own doc for the measuring operation says _"This is the only operation that touches layout"_. ✓
- _"**A sortable with no displacement sink derives it and never spends it**"_ — traced, not assumed. `sortable/spec.ts:882` hands `scope.itemSpace` down onto the presentation runtime unconditionally, but the value is only ever **read** at `linear-shift.ts:242` and `xy.ts:358`, both inside `if (report) { … }` where `report: DisplacementReport | null` (`linear-shift.ts:220`, `slots.ts:48-54`). With no sink composed, `report` is `null` and `runtime.space` is never touched. The old premise (_"The sortable never names it"_) had indeed expired — the sortable does name `itemSpace` now — and the replacement is the accurate residue. ✓
- _"the fixture composes `axis: y()` and nothing else"_ — `m5.browser.test.ts:282-286` composes `items`, `axis: y()` and `onReorder`. The first and third are the required collection source and the required resolution callback, which the pre-existing comment eight lines above already scopes out (_"No consumer slot is composed beyond the one required resolution callback"_). Read in that file's own vocabulary the sentence is accurate; read literally it is loose. Not raised as a finding — it does not mislead within its own context.

No bare `inheritedSpace` survives in the file: `grep -n "inheritedSpace" tests/perf/m5.browser.test.ts` returns two hits, both `inheritedSpaceOf`, which is the live private function name in `presentation.ts:416` and was never part of the finding.

### The fixture, the thresholds and the measured paths are unchanged — verified mechanically

Diffing both revisions with comment-only lines removed:

```
$ strip() { git show "$1" | grep -vE '^[[:space:]]*(//|/\*|\*/?)'; }
$ diff <(strip 5adc3ab3:packages/drag2/tests/perf/m5.browser.test.ts) \
       <(strip 052de91b:packages/drag2/tests/perf/m5.browser.test.ts)
639c639
<             `inheritedSpace=${((derived - skipped) * 1000).toFixed(4)}µs ` +
---
>             `inheritedSpaceOf=${((derived - skipped) * 1000).toFixed(4)}µs ` +
```

That single line is the whole of the non-comment delta. No threshold, no `calibrate`/`withArm` body, no fixture composition, no `describe.runIf` gate, no measured region. The file's structural rows still pass at `052de91b` (`5 passed | 8 skipped`, type-check clean).

### proof-2 — tier C — the one non-comment change in the measurement file, disclosed

- **Finding.** The remediation is claimed to be prose-only in `perf/m5.browser.test.ts`. Strictly it is not: one string literal changed, the label in the opt-in `console.info` diagnostic at line 870.
- **Current behavior / contract.** The printed quantity, `derived - skipped`, is unchanged; only the word preceding `=` differs. The line is inside the `describe.runIf(Boolean(import.meta.env['VITE_DRAG_MEASURE']))` block and produces no assertion.
- **Why it is a problem.** Only that it makes the "prose-only" claim imprecise. The new label is accurate — the delta is the cost of the derivation, and `inheritedSpaceOf` is the live name of the function that performs it — so I do not read this as a measurement change, and I am **not** raising it as a serious finding. It is recorded so the consolidator disposes of it rather than discovering it.
- **Evidence.** The comment-stripped diff above, which is exhaustive for that file.
- **Required property.** None beyond accurate disclosure; the change is benign.

---

## 7. The production-change claim

**Verdict: verified.** The remediation touches no runtime behavior and no type.

```
$ diff <(strip 5adc3ab3:packages/drag2/src/kernel/spec.ts) \
       <(strip 052de91b:packages/drag2/src/kernel/spec.ts)
   (no output)
```

Not one non-comment line of `src/kernel/spec.ts` differs. That covers, byte for byte:

- the `AdmissionSubject` union — `HTMLElement | Readonly<{ visual; box; item }>` — unchanged;
- `ActivationScope`'s member list and every member's type, including `box`, `visualSpace` and `itemSpace` — unchanged;
- `BehaviorSpec.admit`'s signature `(event: PointerEvent, draft: Draft<Part>): AdmissionSubject | null` — unchanged.

`src/kernel/spec.ts` is the only file under `src/` in the delta (`git diff --stat 5adc3ab3..052de91b`). The other six files are two `.plan` records, `tests/COVERAGE.md`, and three test files. No scope beyond docs, tests and plan.

### proof-4 — tier C — the new `COVERAGE.md` section heading has no blank line before it

- **Finding.** `tests/COVERAGE.md:991`, `## The two published spaces, as objects rather than as values — new (2026-08-31, F-234)`, is immediately preceded by a table row with no blank line, because the pre-remediation file ended without a trailing newline and the new section was appended onto that last row.
- **Current behavior / contract.** It is the only heading in the file in that position: `awk 'NR>1 && /^## / { if (prev != "") print NR } { prev=$0 }' tests/COVERAGE.md` returns exactly line 991, out of the file's 40-plus `##` headings.
- **Why it is a problem.** Cosmetic and inconsistent with every other section in a document whose whole purpose is to be read. CommonMark and GFM both let an ATX heading interrupt the table, so rendering is not broken and no instrument parses this file — the full `node` project, including the ledger-shape instrument, passes.
- **Evidence.** `sed -n '989,992p' tests/COVERAGE.md | cat -A` shows the row and the heading adjacent. Note that `prettier --check` warns on all three edited Markdown files — but it warned on all three at `5adc3ab3` as well, which F-231 records as deliberate, so this is **not** a new formatting regression and must not be "fixed" by running the formatter over these files.
- **Required property.** A section heading appended to `COVERAGE.md` is separated from the preceding content the way every other section in the file is.

---

## 8. Null results, stated

- **No production behavior change, no scope creep.** §7. The `kernel/spec.ts` edit is comment-only at line granularity; nothing else in the delta touches `src/`.
- **No test weakening.** No assertion was deleted or relaxed anywhere in the delta. The `packaging.node.test.ts` guard strictly widened (16 derived names plus the import specifier, versus one literal plus the import specifier); `presentation.browser.test.ts` gained two rows and lost none; `m5.browser.test.ts` gained no assertions and lost none.
- **No regression.** Both drag2 projects are green at `052de91b` with a clean tree — `node` 307/307, `browser` 856 passed / 60 skipped, 39 files.
- **No `D-*` touched.** Nothing in this delta creates, amends, supersedes or renumbers a decision; the ledger gained four _closure_ rows for existing `F-` ids and the plan gained one record. Nothing here is routed to the architect.
- **The four findings' required properties, as the summary stated them, all hold.** Two doc blocks state what the bare form asserts about all three members; the conformance guard expresses the invariant rather than a spelling; the object-identity property is asserted and discriminated; the measurement file's prose names the mechanism that now exists.

## 9. Local findings

| Local id | Tier | Claim |
| --- | --- | --- |
| proof-1 | B | `ActivationScope.visual`'s doc block at `src/kernel/spec.ts:158` still calls the element "the visual **half** of what `admit` returned" — F-232's own defect class, on the same published type, six lines above the `box` member whose identical wording this commit corrected |
| proof-2 | C | The one non-comment change in `tests/perf/m5.browser.test.ts` is a `console.info` label in the opt-in timing block; benign and accurate, recorded so the "prose-only" claim is precise rather than approximate |
| proof-3 | C | `slotConstants()`'s vacuity check is all-or-nothing, so a change to box-quad's _declaration form_ (rather than to a slot's name) would silently drop one forbidden name while the guard stayed green |
| proof-4 | C | The new `tests/COVERAGE.md` section heading is the only one in the file not preceded by a blank line, from appending onto a file that had no trailing newline |

None of the four requires a design, contract or public-surface decision.