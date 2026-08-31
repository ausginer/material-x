# F-236 – F-242 final remediation — feature proof

**Read at:** `f3adb3fc` (`f3adb3fcf886769ed916d775ecd510630b4f4b8a`), branch `drag2/fin-review`, working tree clean at start and at end.

**Diff range:** `3d968dfa..f3adb3fc`. Confirmed exactly one commit — `git log --oneline 3d968dfa..f3adb3fc` returns a single line, `f3adb3fc drag2: assert where box-quad may enter, and bring the kernel contract to the three-role subject`. Six files, `+114/−84`: `.plan/contract/00-index.md`, `.plan/contract/02-kernel-behavior-contract.md`, `.plan/plan.md`, `src/kernel/spec.ts`, `tests/COVERAGE.md`, `tests/packaging.node.test.ts`.

**Subject:** whether the six findings the commit claims to close — F-236, F-237, F-238, F-239, F-241, F-242 — hold their required properties, and what the delta introduced. The requirements were read from `bq6-bq9-d165-remediation-summary.md` (§1, §§3–5) and `f239-f240-disposition-claude.md` (§§1–4, and §2.5's seven required properties), not from the commit's own account of itself.

## Scope

**Covered.** F-239 by mutation (four probes, all reverted). F-237 by reading the whole of `02-kernel-behavior-contract.md`'s admission and activation-scope material and sweeping it for pre-D-165 statements, rather than checking only the three sites the finding named. F-236 by grepping the whole of `src/` (not just `src/kernel/`) for the wording class and reading every hit. F-238/F-241 by counting the sites in the pre-remediation baseline `5adc3ab3` myself. F-242 by a whole-file diff of `COVERAGE.md` and by running `prettier --check` at both revisions. The production-behavior and scope claims, by a comment-stripped comparison of `src/kernel/spec.ts` across the delta. The baseline lint-failure claim, by blob identity plus an actual `oxlint` run.

**Ran.** `npx vitest run tests/packaging.node.test.ts` (14 passed, no type errors) and the whole node project, `npx vitest run --project node` (20 files, 307 tests, all passing).

**Not covered.** Browser suites were not run — no browser file is in the delta and the one `src/` change is JSDoc. F-240 and F-243 are closed in earlier commits and were not re-proved. BQ-6/BQ-9/D-165 themselves are not reopened. `box-quad` was not read (deliberately — F-239's whole point is that this package's guard must not need it).

## Verdicts

### F-239 — the D-85 source guard. **Closed.** All seven of §2.5's required properties hold, and three of them are demonstrated by mutation rather than by reading.

Property 1 (**no read outside `packages/drag2`**) and property 4 (**deleted, not broadened**): `grep -n "readFile\|box-quad" tests/packaging.node.test.ts` shows every `readFile` rooted at `ROOT` or at `SRC`; the `resolve(ROOT, '../box-quad/src/index.ts')` call is gone, and `resolve` now has exactly two uses (`ROOT` itself, and specifier resolution in `reachableFrom`). `grep -n "slotConstants\|declaresSlot"` returns nothing; the only surviving `forbidden` is the unrelated optional-module isolation row at line 179.

Property 2 (**positive and exhaustive**) — the assertion is now `expect(importers).toEqual(['kernel/presentation.ts'])` at `tests/packaging.node.test.ts:329`, built from the file's own recursive `sources(SRC)` helper (line 85), not from a two-directory `readdir` loop.

Property 3 (**fails closed**) — verified by mutation, not by reading the comment:

- **(b) expected site disappears.** Rewriting `presentation.ts:17`'s specifier to double quotes (`} from "@ydinjs/box-quad";`) makes the guard **fail**, `expected [ "kernel/presentation.ts" ] received []` — it does not vacuously pass. Under the pre-remediation blacklist shape, the same state would have been an empty-offenders pass.
- **(c) a new importer elsewhere.** Prepending `import { space } from '@ydinjs/box-quad';` to `src/sortable/rect-index.ts` fails the guard and **names the file** in the received array: `+ "sortable/rect-index.ts"`.
- **(d) the whole tree, not an allowlist.** The same plant in `src/shared/composition.ts` **and** in a freshly created `src/newdir/probe.ts` is caught in one run — received `["kernel/presentation.ts", "newdir/probe.ts", "shared/composition.ts"]`. Neither directory was walked by the loop this commit deleted. This is the property §2.5 called "covers `src/shared/` and every future directory", and it is now demonstrated rather than argued.

Property 5 (**anti-pattern survives as prose**) — the private-slot-index paragraph is on the assertion (`tests/packaging.node.test.ts:311–315`), together with why the import claim already covers it. Property 6 (**the resilience claim goes with the clause**) — `grep -n "rename\|carries the guard\|relative import at the top"` returns nothing, and the file's `eslint-disable import-x/no-relative-packages` header still cites only the `.scripts/` derivation (D-111), which is the exemption's real holder. Property 7 — no `D-*` was minted, amended or renumbered by the commit.

**Every mutation reverted; `git status --short` clean afterwards**, and the suite re-run green. One artifact of my own tooling (a stray `packages/drag2/packages/` created by a mistyped `--root`) was removed in the same pass; the tree at the end is identical to `f3adb3fc`.

**Scope note, not a finding.** `sources()` matches `.ts` only, and `src/` holds two `.tsx` files (`free-drag.stories.tsx`, `sortable.stories.tsx`) that the guard therefore does not read. The assertion's comment, the ledger row and `plan.md` all say "every `.ts` under `src/`", so the claim is exact rather than overstated, and neither story file is emitted into the published tree.

### F-237 — the kernel behavior contract. **Closed on the three sites the finding named; the sweep did not reach the whole page.** See `proof-1` and `proof-2`.

What holds. The strike convention is the directory's own — `contract/README.md:21`, "**The term in force is the unstruck text.** Struck text is provenance". Under it:

- `AdmissionSubject`'s doc block (line 254) opens `~~A bare HTMLElement … names a separate geometry source.~~` and follows with the three roles; the **type** is struck as a comment line, `// ~~HTMLElement | Readonly<{ visual: HTMLElement; box: HTMLElement }>~~ (D-165)`, with the new union below it. Struck, not silently reworded.
- `admit`'s return description (line 313) strikes `~~Returns the element … (D-5, widened by D-59)~~` and states the three-element precondition after it.
- `ActivationScope.inheritedSpace`'s derivation paragraph and the field itself are both struck (lines 984, 1000), with `visualSpace`/`itemSpace` following.

**(b) The reproduced types match `src/kernel/spec.ts`.** `AdmissionSubject`: same members, same order (`visual`, `box`, `item`), all required, same `Readonly` wrapper. `ActivationScope`: member-for-member identical to `spec.ts:157–232` — `visual`, `originRect`, `box`, `boxPre`, `visualSpace`, `itemSpace`, `lift`, `motion`, `presentation` — and the `itemSpace` doc's shared-object claim ("**The same object as `visualSpace` whenever the item is the visual**") agrees with `spec.ts:218` (`=== visualSpace` whenever the item is the visual) and with `presentation.ts:442–456`.

**(c) D-59's three reasons are intact and un-rewritten.** Lines 435–439 are context in the diff — no `+`/`−` on any of the three bullets. The commit adds one paragraph _after_ them (line 441, "**D-165 widens the object form again and leaves every reason above standing.**"). D-165's widening is recorded beside D-59's reasoning, not in place of it, as the disposition required.

**(d) D-85's own placement subsection was missed.** Judged against the split type twenty-eight lines above it, its reasoning no longer reads correctly. This is `proof-1`.

### F-236 — the two-role wording class. **Closed on the published kernel surface.**

`grep -rn "pair form\|box half\|visual half\|\bhalf\b" packages/drag2/src/kernel/` returns eleven hits; I read every one. None describes `AdmissionSubject` or `ActivationScope`: they are the two-phase behavior handshake (`spec.ts:512`, `kernel.ts:232`), the input-policy split (`input-policy.ts:5–8`), the arm/clear pair (`seams.ts:160`), the double-validation producer/applied halves, and "half-built"/"half-written" state descriptions. I widened the grep to all of `src/` and to `pair`, `halves`, `two roles`, `paired with`; the only remaining subject-shaped hit is outside the kernel and is `proof-4`.

The corrected member reads, at `src/kernel/spec.ts:158–162`, "what `admit` returned as the `visual` member of its subject, or the element itself when it returned a bare one, which names it as the item and the box as well" — the same shape `box` carries at line 167 (`the "box" member of its subject`, no longer "the box half"). `AdmissionSubject`'s own block (lines 98–127) states three roles and `item === box === visual` for the bare form. The `kernel.ts` barrel carries no admission-shape prose at all.

### F-238 — the F-235 ledger row's site count. **Closed, and the count is exact.**

Counted against the baseline myself. `git show 5adc3ab3:packages/drag2/tests/perf/m5.browser.test.ts` contains six matches for `inheritedSpace`, one of which (line 477) is `inheritedSpaceOf`, the live private function. The retired identifier appears **five** times, distributed exactly as the new row states:

| Site | Baseline line | Kind |
| --- | --- | --- |
| `Arm B — D-85's \`inheritedSpace\`` | 11 | inside the doc block |
| `no timing result removes \`inheritedSpace\`` | 32 | inside the doc block |
| `\`LIFT_IN_PLACE\` hands \`inheritedSpace\` straight` | 639 | inline comment |
| `the behavior that never reads \`inheritedSpace\`` | 774 | inline comment |
| `` `inheritedSpace=${…}` `` | 857 | `console.info` label |

Two doc-block occurrences, two inline comments, one `console.info` label — the row's wording, verbatim. The old row's "the doc block and four inline comments" was wrong in both the count and the distribution; the correction is right in both.

**The row implies no measurement change.** It describes prose sites, a corrected model name and a restated arm-B premise; "which is what the fixture composes" describes the fixture as it already stands. No threshold, decision rule, repeat count or composition is named as changed — and none is: the `5adc3ab3..f3adb3fc` diff of that file touches no assertion, no `calibrate`, no threshold constant.

### F-241 — the `console.info` label. **Closed as recorded; the claim is accurate.**

The delta's only non-comment line is `` `inheritedSpaceOf=${((derived - skipped) * 1000).toFixed(4)}µs ` `` inside the `describe.runIf(Boolean(import.meta.env['VITE_DRAG_MEASURE']))` block — every other changed line is a `*` or `//` comment. The label names `inheritedSpaceOf`, which is the live private function at `src/kernel/presentation.ts:416`, so the row's accuracy claim checks out. Nothing measured, thresholded or asserted moves.

### F-242 — `COVERAGE.md`. **Closed as recorded, and the file was not reformatted.**

`git diff --numstat 3d968dfa..f3adb3fc -- packages/drag2/tests/COVERAGE.md` is `1 1`. Deleting line 769 from both blobs and diffing the remainders produces **no output** — the file is byte-identical outside the single D-85 guard row, with no reflow anywhere in its 172 KB. The heading F-242 names is still unfixed: a scan for headings not preceded by a blank line finds exactly one in the whole file, line 991 (`## The two published spaces, as objects rather than as values`), which is the instance.

`prettier --check` warns on the file at **both** revisions (`[warn] …/COVERAGE.md`, exit 1 at `3d968dfa` and at `f3adb3fc`) — the same pre-existing state, not a new one. The row's causal claim also checks out: `git show 90d141e2:…/COVERAGE.md` does **not** end in a newline, and neither does any earlier revision I sampled, so the F-234 append at `052de91b` did land against a file with no trailing newline.

### Production behavior and scope. **Confirmed.**

`git diff --name-only 3d968dfa..f3adb3fc -- 'packages/drag2/src/'` returns `packages/drag2/src/kernel/spec.ts` and nothing else. Stripping `/* */` and `//` comments from both revisions of that file leaves **138 identical lines on each side** — no diff. The `AdmissionSubject` union, every `ActivationScope` member and `admit`'s signature are unchanged; there is no runtime code movement. No `perf`, `bench` or measurement file appears in the delta at all (`git diff --name-only … | grep -i "perf\|bench\|measure"` → nothing), so nothing gives a reason to reopen `perf/m5.browser.test.ts` or any composition fixture.

### Baseline lint failures. **Confirmed pre-existing and unrelated.**

The two files are `packages/drag2/tests/sortable/g3-conformance.browser.test.ts` (the prompt's path omitted `sortable/`) and `packages/drag2/bench/size/noncomposed.js`. Neither is in the delta's file list. Both are **byte-identical across it** — `git rev-parse` returns the same blob at `3d968dfa` and `f3adb3fc` (`602d5720…` and `2eecb904…` respectively). No lint configuration file is in the delta either. `npx oxlint` at `f3adb3fc` reproduces exactly three errors, all in those two files:

```
bench/size/noncomposed.js:86:22   eslint(max-params): Function 'mount' has too many parameters (5)
tests/sortable/g3-conformance.browser.test.ts:157:5  eslint(no-await-in-loop)
bench/size/noncomposed.js:118:21 typescript(no-unsafe-call)
```

Identical inputs and identical configuration mean identical output at the baseline. Nothing in this delta causes them. Not fixed, per instruction.

## New findings

### `proof-1` — tier B — D-85's placement subsection still argues from a singular field and one read, both of which D-165 retired

**Finding.** `.plan/contract/02-kernel-behavior-contract.md` §`Why inheritedSpace is on the scope and not on the session (D-85, E-01)` (line 1028 and its body through line 1044) is untouched by this commit and by D-165's landing. It is entirely unstruck, so under `contract/README.md:21` it is the term in force.

**Current contract.** Three statements in it no longer read correctly against the split type twenty-eight lines above:

- The **heading itself** names `inheritedSpace`, which line 1000 of the same file now marks `~~inheritedSpace: InheritedSpace;~~`.
- Line 1036: "The **new member** joins them" — singular, where two members joined.
- Line 1038, the load-bearing one: "**One failure policy, because there is now one read.** … The split policy E-01 found … has **no second read left to disagree with**."

**Why it is a problem.** The last is not stale phrasing but a false claim about the tree. `src/kernel/presentation.ts:481` states "**The item's ancestry is a second walk, and it is spent deliberately**", and line 472 of the same doc block says the throw covers "when **either** space cannot be read". The contract's own corrected `visualSpace` paragraph, at line 988, concedes the point in the opposite direction — "The walk itself is no longer shared with the measurement — D-165 spends that property deliberately". So the page asserts, in two places a few dozen lines apart, both that the second read is gone and that D-165 spends it. The outcome the subsection defends (one failure policy) survives; the reason it gives for it does not, which is precisely the class F-237 was about — a page that is normative by absence of a strike, with no failing state when the decision lands elsewhere.

**Evidence.** `sed -n '1028,1044p' packages/drag2/.plan/contract/02-kernel-behavior-contract.md`; `sed -n '442,495p' packages/drag2/src/kernel/presentation.ts`; `grep -n "D-165" 02-kernel-behavior-contract.md` shows the sweep's hits stopping at line 1006 and resuming nowhere in this subsection.

**Required property.** Every statement in `02` that D-165 changed is struck where it stands with its replacement following, or is left standing only where it remains true of the tree. In particular, no unstruck sentence in the file may assert that the activation path takes a single ancestry read.

### `proof-2` — tier B — two pre-D-165 spellings of the admission subject survive unstruck on the swept page

**Finding.** The commit struck the `AdmissionSubject` type and its doc block but left two other places on the same page stating the two-role form, neither struck:

- **Line 431**, D-59's settled-spelling verdict table, whose chosen row is ``| `HTMLElement \| { visual, box } \| null` | **this** |``. This is the section the document itself introduces as "**The spelling, settled here so 06 can follow it.**"
- **Line 1067**, D-52's window-ownership diagram: `admit  behavior RETURNS { visual, box }  ← D-59`.

**Why it is a problem.** Same mechanism as F-237: unstruck is in force, so the page's own _settled spelling_ table publishes a union the tree stopped carrying. The mitigation is real and worth recording — the paragraph the commit added at line 441 says D-165 widens the object form, ten lines below the table — but a reader consulting the verdict table for the spelling, or 06 following it as the section instructs, is given two members where the type has three. Line 1067 sits inside a ` ```text ` fence and cannot carry a markdown strike, so it needs a note rather than a strike; the file already handles this elsewhere by annotating in prose.

**Evidence.** `grep -n "visual, box" packages/drag2/.plan/contract/02-kernel-behavior-contract.md` → lines 431, 432, 433, 1067. The diff hunk that added line 441 has header `@@ -425,6 +438,8 @@`, so the table three lines above it was in context and untouched.

**Required property.** The page's settled-spelling record states the union the tree carries, or strikes the retired one; the D-52 ownership diagram names what `admit` returns today.

### `proof-3` — tier C — two superseded statements were corrected in place, without a strike, in the same commit that struck four others

**Finding.** The commit's own treatment is inconsistent. Struck: the `AdmissionSubject` doc and type, `admit`'s return description, the `inheritedSpace` derivation and field. Reworded in place with no strike:

- **Line 453**, the seam table's `admit` cell — `**return the subject** — the visual (via the \`visual\` slot or identity), paired with the box … (D-59)`became`— the bare item when the \`visual\` and \`box\` slots resolve to it, and the three named separately when any of them differs (D-59, D-165)`.
- **Line 948**, `ActivationScope.box`'s doc — "what `admit` returned as the **box half** of its subject" became "as the `box` **member** of its subject".

**Why it is a problem.** F-237's stated defect is that revising a normative page in place is indistinguishable from the staleness it replaces — nothing records that the sentence used to say something else. The convention answers this and the file has six struck table cells already; line 642 is the exact precedent, `| ~~**D-46**, decline~~ **the consumer, via `[data-drag-ignore]`** (D-129) |`. `plan.md` acknowledges the in-place edit ("the seam table's `admit` cell now names the three") without treating it as an exception. Tier C rather than B because both new statements are correct — nothing here misleads a reader; what is lost is the provenance the directory's convention exists to keep.

**Evidence.** `grep -n "^|.*~~" packages/drag2/.plan/contract/02-kernel-behavior-contract.md` → six struck table cells (642, 746, 765, 794, 797, 1768). `grep -n "^|.*~~" packages/drag2/.plan/contract/*.md` shows the same across `01`, `03`, `04` and `06`.

**Required property.** Within one document, a superseded normative statement is retired by the same mechanism regardless of whether it sits in a fenced type block or a table cell.

### `proof-4` — tier C — F-236's wording class survives one file outside the kernel

**Finding.** `src/sortable/spec.ts:424` reads "So it travels as the **second half of the admission subject**." The subject has three members; there is no half.

**Why it is a problem.** F-236 was scoped to the published kernel surface and is closed there. This is the same wording class one directory over, and it is the only remaining instance anywhere in `src/` — the sweep that closed F-236 by surface rather than by citation stopped at `src/kernel/`. Tier C because the comment sits inside `seedDraft`, a closure local to the sortable behavior factory, and reaches no emitted `.d.ts`; the sentence it belongs to is otherwise accurate about how `box` travels. The neighbouring doc block at line 453 already states the corrected shape ("a bare element when all three coincide, or the triple when they do not"), which is what makes line 424 read as a leftover.

**Evidence.** `grep -rn "\bhalf\b" packages/drag2/src/` — 40 hits, every one read; line 424 is the only one describing the admission subject's shape.

**Required property.** No comment in `src/` describes `AdmissionSubject` as having halves.

## Method

Four mutation probes on the working tree (specifier hidden at `presentation.ts:17`; `@ydinjs/box-quad` planted in `sortable/rect-index.ts`, in `shared/composition.ts`, and in a created `src/newdir/probe.ts`), each applied, run, and reverted with `git checkout --`/`rm -rf`. `git status --short` verified clean after the last revert and again at the end of the pass, and the packaging suite re-run green on the restored tree. No tracked file was modified by this pass. Counts for F-238 were taken from `git show 5adc3ab3:…` rather than from the summary's prose; the `COVERAGE.md` and `spec.ts` claims were checked by whole-file comparison rather than by reading the diff. This artifact is left uncommitted.