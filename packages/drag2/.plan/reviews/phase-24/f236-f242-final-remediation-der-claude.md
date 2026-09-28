# F-236–F-242 final remediation — decision-elimination review

**Commit read at:** `f3adb3fc` (`drag2: assert where box-quad may enter, and bring the kernel contract to the three-role subject`), confirmed by `git log --oneline 3d968dfa..f3adb3fc` to be exactly one commit on top of `3d968dfa` (the architect's disposition record, `f239-f240-disposition-claude.md`, itself one commit on top of `052de91b`).

**Diff range:** `3d968dfa..f3adb3fc`, six files: `.plan/contract/00-index.md`, `.plan/contract/02-kernel-behavior-contract.md`, `.plan/plan.md`, `src/kernel/spec.ts`, `tests/COVERAGE.md`, `tests/packaging.node.test.ts` — matches the file list given in the task.

**Scope.** This is not a fresh full-tree decision-elimination sweep; the task scoped it to one question — _was the architect's disposition (`f239-f240-disposition-claude.md`) actually implemented as decided, and does this specific commit's delta introduce, resurrect or reinterpret anything the disposition settled._ Four sub-questions, each covered below with citations to the decision/disposition text checked against. Not covered: a fresh forward pass over the full `npx just decisions --retired` output unrelated to D-85/D-165/F-239/F-240/F-243 — the task named these as the live thread, and I did not go looking for unrelated retired machinery outside it.

**Result: no findings. All four questions resolve clean**, each demonstrated below rather than asserted. This is itself the outcome to state, per `.agents/docs/review-findings.md`: _a null result is a result and is stated explicitly._

---

## 1. F-239's seven required properties (disposition §2.5) — checked item by item

Disposition text: `f239-f240-disposition-claude.md` §2.5, "Required properties, encoding left open." Checked against `tests/packaging.node.test.ts` as landed at `f3adb3fc`, and the vitest run (`npx vitest run tests/packaging.node.test.ts` → 14 passed, 0 failed, type-check clean).

| # | Required property | Verified against |
| --- | --- | --- |
| 1 | Asserted **without reading any file outside `packages/drag2`** | The deleted `slotConstants()` function (`readFile(resolve(ROOT, '../box-quad/src/index.ts'), 'utf8')`) is gone in its entirety — `git diff 3d968dfa..f3adb3fc -- tests/packaging.node.test.ts` shows it removed, not edited. `grep -n "readFile\|box-quad" tests/packaging.node.test.ts` shows the only surviving `box-quad` references are the bare specifier string `'@ydinjs/box-quad'` matched against files already read from `src/`. |
| 2 | **Positive and exhaustive** — the specifier appears in exactly the declared set of `src/` modules, not a two-directory blacklist | The new test walks `sources(SRC)` (the file's own pre-existing recursive `.ts` walker, used elsewhere for the module-graph parser test) rather than `readdir(join(SRC, directory))` over `['free-drag', 'sortable']`, and asserts `expect(importers).toEqual(['kernel/presentation.ts'])` — a positive membership claim, not an absence-of-forbidden-name claim. |
| 3 | **Non-vacuity fails closed** — an expected site that stops existing fails rather than passing | `toEqual(['kernel/presentation.ts'])` is itself the vacuity floor: if the import were deleted, `importers` would be `[]` and the assertion would fail, not pass silently. Confirmed structurally (no separate `expect(...).toBeGreaterThan(0)` is needed or present, unlike the deleted guard, because the exact-set assertion subsumes it). |
| 4 | The derived-name clause and its cross-package read **deleted, not broadened** | Confirmed by diff: `slotConstants()`, the `declaresSlot` regex, and the `['free-drag', 'sortable']` offender loop are all removed outright. Nothing in the surviving test widens a regex or globs `box-quad/src` — the replacement reads none of it. |
| 5 | The anti-pattern **survives as prose** | New comment block, lines ~309–313: _"A private slot index — the anti-pattern this rule exists against — is unreachable behind the same claim. The kernel seam names no `Box`, no `Space` and no `Float64Array`; a behavior receives four named fields, so an index has nothing to address..."_ — present verbatim in the file as landed. |
| 6 | The resilience claim **removed with the clause**, including the tie to the `import-x/no-relative-packages` exemption | The deleted JSDoc's sentence _"which is the same argument the relative import at the top of this file is disabled for"_ is gone with the function. `grep -n "no-relative-packages" tests/packaging.node.test.ts` returns exactly one hit, the file-header eslint-disable tied to the `.scripts/` import (D-111) — untouched and unaffected, as the disposition required. |
| 7 | **No `D-*` minted, amended or superseded** | `git diff 3d968dfa..f3adb3fc -- .plan/contract/00-index.md \| grep -E '^\+.*D-[0-9]'` returns only pre-existing references (D-59, D-85, D-165, D-68, D-43) inside prose that already cited them before this commit — no new decision id appears anywhere in the diff, and the D-85/D-165 ledger rows are byte-identical to `3d968dfa` (§2 below). |

All seven hold as landed. None was done differently than decided, and none was silently narrowed or widened.

**One thing worth naming rather than flagging.** The task asked whether hardcoding the exact site array (`['kernel/presentation.ts']`) itself imports a new undecided commitment, the way the old regex did. It does not: disposition §2.5 property 2 explicitly requires "the claim is positive and exhaustive... the set is one module today, and adding to it is a visible edit to the assertion" — hardcoding the literal set _is_ the required property, not a new one. The asymmetry with the old guard is exactly the point the disposition makes in §2.3: the old clause failed open on an unstated assumption about a file it didn't own; this one is a closed, exact claim about `src/` files this package does own, and a future addition to that set is a deliberate, visible edit to the test rather than a silent narrowing.

---

## 2. D-85's status — corrected in `3d968dfa`, untouched by `f3adb3fc`

**Which commit carries the correction.** `git diff 3d968dfa..f3adb3fc -- .plan/contract/00-index.md \| grep -n "D-85"` shows no line-level change to the D-85 row; direct comparison confirms it:

```
diff <(git show 3d968dfa:packages/drag2/.plan/contract/00-index.md | sed -n '371p') \
     <(git show f3adb3fc:packages/drag2/.plan/contract/00-index.md | sed -n '371p')
# no output
diff <(git show 3d968dfa:packages/drag2/.plan/contract/00-index.md | sed -n '682p') \
     <(git show f3adb3fc:packages/drag2/.plan/contract/00-index.md | sed -n '682p')
# no output
```

Both the prose row (line 371) and the status-register row (line 682, `| D-85     | active   |`) are byte-identical between the two commits. The correction was made entirely in `3d968dfa`, matching the disposition's own method note: _"Applied in this pass... the correction is a record edit, so it is made here rather than handed on"_ (§1). `f3adb3fc` correctly leaves it alone.

**The four "verbatim" clauses (disposition §1 table), checked against the pre-round text (`052de91b`) and the current live text (`npx just decisions`):**

| Disposition clause | `052de91b` (pre-round) text | Current live text (`f3adb3fc`) |
| --- | --- | --- |
| the behavior multiplies; it never measures | "The behavior multiplies; it never measures." | identical |
| `BehaviorLiftSession` unchanged, no `Box` crosses the seam | "`BehaviorLiftSession` is unchanged, no `Box` crosses the seam" | identical |
| `captureLocalSpace` and its four private index constants deleted with the second traversal | "`captureLocalSpace` and its four private index constants are deleted with the second traversal." | identical |
| `InheritedSpace` publishes at `kernel.js` as part of the scope's closure | "`InheritedSpace` publishes at `kernel.js` as part of the scope's closure (D-68)." | identical, `(D-68)` included in both |

Only the first sentence of the row changed (in `3d968dfa`, not in `f3adb3fc`): from _"`ActivationScope` carries `inheritedSpace`: the inverse inherited linear part..."_ to _"`ActivationScope` carries the inverse inherited linear part... It landed as one field named `inheritedSpace` and has been published as two, `visualSpace` and `itemSpace`, since D-165 split it on 2026-08-31; what this decision requires is unchanged by that, which is why it is corrected here rather than superseded."_ This satisfies disposition required properties 1–2 (states today's shape, preserves the old `inheritedSpace` wording rather than deleting it) and required property 4 (no other clause touched — confirmed above, all four survive verbatim). Required property 3 (status stays `active`, nothing supersedes it) holds: the status register row is unchanged and `npx just decisions` reports D-85 as `active`.

`npx just decisions` (re-run at `f3adb3fc`) confirms the live projection matches the ledger row exactly — there is no second store to reconcile, consistent with the disposition's own framing (§1: "the projection and the ledger row are the same text").

---

## 3. F-243 and F-240 — not re-touched by `f3adb3fc`

Both were minted/closed by the disposition's own pass, `3d968dfa`, per its §5 method note: _"the only edits in this unit are to `.plan/` records"_ and §4: _"F-240 closed by a record correction, made in this pass... F-243 minted and closed the same way."_

```
git diff 3d968dfa..f3adb3fc -- .plan/contract/00-index.md | grep -E "^\+\| F-240|^-\| F-240|^\+\| F-243|^-\| F-243"
# no output
git diff 3d968dfa..f3adb3fc -- .plan/plan.md | grep -n "F-240\|F-243"
# no output
```

Neither row appears anywhere in `f3adb3fc`'s diff, in either file. Their rows in `00-index.md` (F-240 at line 1071, F-243 at line 1074) sit adjacent to the five rows `f3adb3fc` does add (F-236–F-239, F-241, F-242), but `f3adb3fc` only inserts new rows around them — it does not edit, duplicate, or contradict either. Consistent with the disposition's own accounting in §4 ("Not touched, and not mine: F-236, F-237, F-238, F-241, F-242... None of the five has a ledger row yet, which is a real gap the remediation pass owns" — correctly read by this commit as its own job, and F-240/F-243 correctly read as already done).

---

## 4. Resurrection and scope check on `f3adb3fc` specifically

**No retired mechanism, spelling, or concept reappears.** `git diff 3d968dfa..f3adb3fc | grep -inE "BOX_ANCESTOR_|slotConstants|readFile\(.*box-quad|BQ-6|BQ-9|D-164"` returns hits only inside the F-233/F-239 closure prose narrating _history_ (already present, unchanged, in both the `-` and `+` sides of the F-235→F-239 row rewrite) and inside the `-` (deleted) lines of `tests/packaging.node.test.ts`. Nothing reintroduces the cross-package read, the `BOX_ANCESTOR_` spelling, or the retired D-164 boundary-parameter model as live/normative text; all such references are past-tense narration of what was closed, which is the expected shape for a closure row (`00-index.md`'s own convention).

**`src/kernel/spec.ts` — JSDoc-only, confirmed by comment-stripped diff.**

```
perl -0777 -pe 's{/\*.*?\*/}{}gs' <(git show 3d968dfa:packages/drag2/src/kernel/spec.ts) > before
perl -0777 -pe 's{/\*.*?\*/}{}gs' <(git show f3adb3fc:packages/drag2/src/kernel/spec.ts) > after
diff before after   # empty
```

No output — every `ActivationScope`/`AdmissionSubject` type member, and every other line of code, is byte-identical once block comments are stripped. The only change is `ActivationScope.visual`'s doc comment (F-236's fix), which matches the pattern already established for F-232/F-236 elsewhere in this file (doc-only correction, no shape change) and does not touch the type this commit's own `02-kernel-behavior-contract.md` prose changes describe.

**The new positive-assertion test does not encode an undecided commitment** — addressed in §1 above (the "one thing worth naming" note): hardcoding `['kernel/presentation.ts']` is disposition §2.5 property 2 itself, not a new assumption smuggled in past decision review. It differs from the old regex's failure mode in exactly the way the disposition argues (§2.3): the old clause was _wrong about its own resilience_ (claimed to survive a rename, did not, in a way that reports a false pass); the new one makes no resilience claim beyond "this exact set, today," and a future addition is a visible line-level diff to the assertion rather than a silent gap in an extraction regex.

---

## Conclusion

No findings. `f3adb3fc` implements the architect's disposition (`f239-f240-disposition-claude.md`) as decided: all seven of F-239's required properties hold as specified, none reinterpreted or partially done; D-85's correction was already complete in `3d968dfa` and this commit correctly leaves every clause of that row untouched, including the four the disposition marked verbatim; F-240 and F-243 are neither re-touched nor duplicated; and nothing in this commit's prose or code resurrects a retired mechanism, spelling, or decision, nor introduces a fresh undecided commitment under cover of "asserting positively." The forward direction — whether anything routed to the architect as a decision-provenance question came back reinterpreted rather than settled — also checks out clean: the disposition's own choice to delete the coupling rather than name it as a decision is exactly what `tests/packaging.node.test.ts` does at `f3adb3fc`.