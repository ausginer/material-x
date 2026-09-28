# BQ-6/BQ-9/D-165 remediation — decision-elimination review

Commit read at: `052de91b`, the single commit in `git diff 5adc3ab3..052de91b` (confirmed via `git log --oneline 5adc3ab3..052de91b` — exactly one commit) on branch `drag2/fin-review`. This remediation closes F-232 through F-235, recorded in `packages/drag2/.plan/reviews/phase-24/bq6-bq9-d165-summary.md`.

Independent pass. Did not read any other pass's prompt, findings, or artifact.

## Scope

**Covered**, read in full at `052de91b` and cross-checked against the decision projection (`npx just decisions`, `npx just decisions --retired`, both run from `packages/drag2`) and against the referenced decision text directly:

- `packages/drag2/tests/packaging.node.test.ts` — the new `slotConstants()` helper and the `declaresSlot` guard (F-233), checked for whether it encodes an undecided cross-package contract, per task question 1.
- `packages/drag2/tests/perf/m5.browser.test.ts` — the rewritten doc block and the "What it does not weigh is the walk" paragraph (F-235), checked word-for-word against D-85's and D-165's actual recorded text, per task question 2.
- `packages/drag2/src/kernel/spec.ts`, `.plan/plan.md`, `.plan/contract/00-index.md` — checked for reintroduction of anything BQ-6/BQ-9/D-164 retired (the cache, the ancestor-boundary capability, `inheritedSpace` as a single-value model), per task question 3.
- The full diff — checked for a decision-bearing production-surface change absent a `D-` record, and for any change to an existing `D-` record's understood scope, per task question 4.
- D-85's and D-165's live text as returned by `npx just decisions`, and D-164's retired text as returned by `npx just decisions --retired`, read directly rather than through the summary's paraphrase.
- `packages/drag2/src/kernel/presentation.ts:496-556` (`acquireLift`), to confirm the ordering of the two `ancestry` reads relative to mutation, and `packages/box-quad/src/index.ts:234-274` (`ancestry`/`coordinates`), to confirm which operation touches layout.

**Not covered**: code-discipline questions about helper size/duplication (`presentation.browser.test.ts`'s new `describe` block, `slotConstants()`'s proportionality) — that is `cleanup`'s remit, and its remediation report (`bq6-bq9-d165-remediation-cleanup-claude.md`) already covers it; package coherence outside the decision-elimination lens; re-deriving BQ-1 through BQ-8's byte/runtime measurements, already closed on the record.

## Result

**Two tier-B findings.** Task questions 2 and 3 come back clean — stated explicitly below, with evidence, because a clean pass is itself a result. Task question 1 surfaces a new finding: the fix for F-233 introduces a mechanism whose soundness rests on an assumption about another package's private source shape that no decision anywhere commits to. Task question 4 surfaces a second, independent finding found while reading the decision projection directly as instructed: D-85's own live entry in the projection still describes a shape the tree no longer has, unrelated to this diff but bearing directly on whether "D-85 holds" can be read off the instrument this pass is chartered to use as its primary input.

---

### der-1 (tier B) — F-233's fix trades a hardcoded name for an undecided assumption about box-quad's private declaration shape

**Finding.** `packaging.node.test.ts`'s new `slotConstants()` (added by this commit) reads `packages/box-quad/src/index.ts` from disk and extracts every name matching `/^const ([A-Z][A-Z\d_]*) = \d+;$/gmu` — i.e. every top-level, single-line `const NAME = <integer>;` declaration, unexported. This is the only place in the entire repository's test suite where one package's tests read another package's `src/` file directly:

```
$ grep -rn "readFile(" packages --include="*.test.ts" | grep -v node_modules | grep "\.\./"
packages/drag2/tests/consumer.node.test.ts:...   # reads its own package's packed tarball, not another package's src
packages/drag2/tests/packaging.node.test.ts:61:  resolve(ROOT, '../box-quad/src/index.ts'),
```

The mechanism replaces F-233's problem (a guard hardcoding one spelling, `BOX_ANCESTOR_`, that BQ-9's rename made invisible) with a guard whose soundness now depends on a different, equally unstated assumption: that box-quad's private slot/length constants will continue to be declared as bare, unexported, single-line `const NAME = <integer>;` statements. Nothing commits to that shape being stable:

- **BQ-9's own record** (`packages/box-quad/.plan/reviews/11-D-first-class-space-claude.md`) describes `Space` as "caller-owned storage in the package's existing idiom — `Float64Array(5)`, `[a, b, c, d, ancestorZoom]`" and discusses `BOX_LENGTH`, `Box` narrowing, and the deleted `BOX_ANCESTOR_*` slots — nowhere does it discuss, or commit to, how the slot-index constants are declared as source text. Grepped `SPACE_\|BOX_A\|slot\|declaration` across the record: no such clause exists.
- **D-85's active text** (`npx just decisions`, checked below) discusses `captureLocalSpace and its four private index constants are deleted` as a historical fact, not a forward commitment about box-quad's declaration syntax.
- **No repo-wide convention exists for it.** `CONTRIBUTING.md` and `.agents/docs/` were grepped for `monorepo`/`workspace`/`package boundary`/ `cross-package`/`private` and none discuss a package's tests reading another package's unpublished source as a sanctioned pattern; box-quad's `package.json` has no `"private": true` marker distinguishing internal from public source at the package-boundary level the way `.d.ts` emission does.

The new doc comment on `slotConstants()` argues the shape is "the safe direction" because it is over-broad rather than under-broad, and the sibling `cleanup` remediation report independently confirmed the current over-breadth (`BOX_LENGTH`/`SPACE_LENGTH`/`QUAD_LENGTH` also match) produces no false positive today. That argument covers _width_ (matching more names than strictly necessary is safe), not _shape_: it does not address what happens if box-quad's constants stop being written in this exact single-line, bare-`const` form — e.g. grouped into an object or `enum`, written `export const` for an unrelated reason, or split across lines by a formatter change. In any of those cases the regex silently drops exactly the entries that changed shape while still matching whatever bare single-line constants remain (so `expect(forbidden.length).toBeGreaterThan(0)` would not fire, since the list is not empty — only narrower than it should be). That is the same failure mode F-233 itself demonstrated for the old hardcoded spelling — a silent narrowing of what the guard actually catches — reproduced one layer down, at the declaration-shape level instead of the name-spelling level, and nothing records that this new dependency was accepted, weighed, or even named as a dependency.

**Why it is a problem, from a decision-elimination lens.** The mechanism is not unsound _today_ — it correctly derives the current forbidden-name list and the sibling `cleanup` pass confirmed it fires on an injected reproduction of the anti-pattern. The problem is that its soundness going forward rests entirely on an assumption (box-quad's constant-declaration shape) that was never elevated to a decision the way the guard's _subject_ (D-85, the anti-pattern itself) was. A reviewer checking "does the justification for this test mechanism still hold" six months from now has nowhere to look — there is no `D-` or `BQ-` record that says "drag2's packaging test may read box-quad's private source, in this shape, for this reason" — only a doc comment inside the test file itself, which is exactly the kind of undocumented, self-justifying coupling a decision record exists to make visible and revisitable.

**Evidence.**

- `packages/drag2/tests/packaging.node.test.ts:57-65` (the `slotConstants()` body) and `:325-345` (the `declaresSlot` guard), read at `052de91b`.
- `grep -rn "readFile(" packages --include="*.test.ts" | grep -v node_modules` across the whole repo — `packaging.node.test.ts`'s read of `../box-quad/src/index.ts` is the only instance of a test reading another package's `src/`.
- `packages/box-quad/src/index.ts:19-65` — the current constants (`BOX_LENGTH`, `BOX_A`…`BOX_HEIGHT`, `SPACE_LENGTH`, `SPACE_A`… `SPACE_ANCESTOR_ZOOM`, `QUAD_LENGTH`) are all, today, bare single-line `const NAME = <integer>;` — confirming the mechanism works now, and that its correctness is contingent on that continuing.
- `packages/box-quad/.plan/reviews/11-D-first-class-space-claude.md` — read in full for any clause committing to declaration shape; none found.

**Required property.** A test mechanism whose correctness depends on another package's private, unpublished implementation detail (here: how a constant is spelled as source text) should have that dependency named where a decision record names dependencies, not only in the mechanism's own doc comment — so that a future change to box-quad's internal style is checked against a stated expectation rather than silently discovered (or not discovered) by this guard going quiet.

---

### Task 2 — F-235's rewritten D-85/D-165 prose: verified against the actual recorded text, no distortion found

**Both claims checked and matched.**

1. _"every geometry read is taken before acquisition mutates anything"_ as D-85's rationale. D-85's live text (`npx just decisions`) reads: "derived from the measurement `acquireLift` already took before it mutated anything." The pre-remediation `m5.browser.test.ts` text additionally claimed "one traversal, two products" as D-85's ground — a claim D-85's own record never makes (D-85 speaks only of timing, not traversal count) and which D-165 had already made false by landing a _second_ traversal before this remediation commit (D-165's own text: "there are now two flat-tree walks at activation rather than one... Property 1 is spent deliberately"). The rewrite drops the "one traversal" gloss and restates only the timing ground, generalized from "the measurement" (singular, pre-D-165 model) to "every geometry read" (plural, current model). I confirmed the generalization is factually accurate for the landed code, not just rhetorically consistent: `acquireLift` (`presentation.ts:496-556`) calls `ancestry(visual, above)` and `ancestry(item, itemAbove)` both before the comment at line 536 ("Everything below mutates the visual"), and both `visualSpace`/`itemSpace` derivations (lines 527-529) also precede it. The rewrite is a correction that brings the file back in line with D-85's own textual ground, not a narrowing or widening of it.

2. _"the second `ancestry` walk is 'deliberately' out of Arm B's scope, with its cost recorded where that decision is."_ Checked against D-165's live text directly: "Property 1 is spent deliberately: there are now two flat-tree walks at activation rather than one, costing **+180 µs at depth 30 and +19 µs at depth 15, once per lift**." This is the same record the summary and `00-index.md` cite as D-165, and it is a real, findable record — not an assertion with no backing. The new paragraph's claim that `ancestry` "takes computed style and no layout" was also checked directly against `packages/box-quad/src/index.ts:234-265` (`ancestry`, calls only `getComputedStyle`) versus its neighbor `coordinates` at `:267-269`, whose own doc comment states "This is the only operation that touches layout" — confirming `ancestry` is correctly excluded from touching M5's "layout read" ground.

I also confirmed the file's related factual correction — "the sortable reads `itemSpace` now" — against source: `packages/drag2/src/sortable/spec.ts:882` reads `scope.itemSpace`, so the old "the sortable never names it" premise (about the identifier `inheritedSpace`) had indeed gone stale independent of the renaming, exactly as F-235 and its fix state.

**No finding.** Both rewritten claims match the decision records they cite, word for word where checked, and the corrected code claims (ordering, what `ancestry` touches, what the sortable reads) are independently true of the landed source.

---

### Task 3 — resurrection check: clean

Read the full diff hunks in `kernel/spec.ts`, `plan.md`, `00-index.md`, `COVERAGE.md` and `m5.browser.test.ts` for any reintroduction, rename-and- reintroduction, or partial resurrection of BQ-6's cache, BQ-9's deleted ancestor-boundary capability, or `inheritedSpace` as a single-value model, outside clearly historical reference:

- `kernel/spec.ts`'s rewritten `AdmissionSubject`/`ActivationScope.box`/ `BehaviorSpec.admit` doc blocks name only `item`, `visual`, `box` — no mention of a boundary, a cache, or a single combined space.
- `plan.md`'s and `00-index.md`'s new F-232–F-235 entries describe the two-space (`visualSpace`/`itemSpace`) model throughout; every occurrence of `inheritedSpace` in the diff is in a "was, before D-165" clause (`m5`'s doc block: "described a single `inheritedSpace` and the one-traversal model, using an identifier absent from `src` since D-165") — explicitly framed as retired, past-tense narration, not present-tense fact.
- `packaging.node.test.ts`'s new comment references "the anti-pattern D-85 removed" and "box-quad's slot-index constants" only as historical justification for why the guard exists — it does not restate or reintroduce the boundary capability or the cache.
- The one surviving occurrence of the string `inheritedSpace` after this commit is the function name `inheritedSpaceOf` (`presentation.ts:527-529`, unchanged by this diff) — a live, currently-used name for the per-space derivation helper, not the retired `ActivationScope.inheritedSpace` field; F-235's own record explicitly carves this out as "unrelated and not part of the finding," and I confirmed the two are textually and semantically distinct (one is a function that derives _a_ space, the other was a field publishing _the_ space).

**No finding.** The forward pass over this diff's prose specifically (as distinct from the wider `55eaaf1b..90d141e2` tree, already checked clean by the prior round's `der` pass) finds nothing of BQ-6, BQ-9's deleted capability, or the single-`inheritedSpace` model surviving as anything other than marked historical reference.

---

### der-2 (tier B) — D-85's own live entry in the decision projection still describes a field name the tree no longer has

**Finding.** `npx just decisions` (run from `packages/drag2`, the primary input this pass is chartered to read first) returns D-85 as `active` with the live statement: _"ActivationScope carries `inheritedSpace`: the inverse inherited linear part, or null, derived from the measurement `acquireLift` already took before it mutated anything."_ `ActivationScope` has carried no field named `inheritedSpace` since D-165 landed (before this remediation commit) — it carries `visualSpace` and `itemSpace`:

```
$ grep -n "inheritedSpace\|visualSpace\|itemSpace" packages/drag2/src/kernel/spec.ts packages/drag2/src/kernel/presentation.ts | grep -v inheritedSpaceOf
kernel/spec.ts:202:  visualSpace: InheritedSpace;
kernel/spec.ts:216:  itemSpace: InheritedSpace;
kernel/presentation.ts:459-460,527-529,551-555,614: visualSpace / itemSpace (no `inheritedSpace` field)
```

This is not introduced by `052de91b` — D-85's own record file is untouched by this diff, and the split into `visualSpace`/`itemSpace` was landed by D-165 in an earlier commit. It is directly relevant to this remediation round, though, for two reasons. First, this remediation _did_ fix the identical staleness (the retired `inheritedSpace` identifier, narrating a model the tree no longer has) in `m5.browser.test.ts` as F-235, but left the same staleness standing in D-85's own decision text — the one record whose job is to be the authoritative, queryable statement of what D-85 requires. Second, `.agents/docs/documentation.md` draws exactly this line: _"A **substantive** amendment — one that changes what the decision requires of the code — mints a new decision... A **non-substantive** edit — wording, a corrected citation, a re-pointed link — is made in place... A decision amended in place is partly in force and partly not, and no instrument can tell a reader which half a given mechanism rests on."_ Whether the `inheritedSpace` → `visualSpace`/`itemSpace` split is substantive (a single guaranteed value became two values that can diverge) or non-substantive (a pure rename, correctness ground unchanged) is exactly the kind of question a decision-elimination pass surfaces rather than settles — but neither path was taken: the entry was not edited in place as a citation fix, and no record notes that D-165 changed what D-85's own text describes ActivationScope as carrying.

**Why it is a problem.** This pass's task brief names the decision projection as "your primary input." A reader — human or agent — running exactly the command this task specifies, to check whether D-85 still holds, is told `ActivationScope carries inheritedSpace`, a claim false of the tree since before this remediation commit. That is the tier-B bar precisely: no consumer-observable runtime effect, but an instrument the repository relies on (the decision projection itself, consulted by this review and by any future one) states something about a currently-active decision that the current source contradicts.

**Evidence.**

- `npx just decisions` output for `D-85`, quoted above in full.
- `grep -n "inheritedSpace\|visualSpace\|itemSpace" packages/drag2/src/kernel/spec.ts packages/drag2/src/kernel/presentation.ts` — no `ActivationScope.inheritedSpace` field found; `visualSpace`/`itemSpace` confirmed as the current shape.
- `packages/drag2/.plan/contract/00-index.md`'s D-165 row (`npx just decisions` for `D-165`) already states the current shape correctly: "`ActivationScope` publishes `visualSpace` and `itemSpace`" — so the accurate statement exists in the projection, just not under D-85's own entry.
- `.agents/docs/documentation.md` lines 152-158, quoted above, for the record-mutability rule this gap falls between.

**Required property.** A decision's live statement, read on its own through the projection, should not describe a field name or shape the tree has not carried since a later, already-landed decision. Whether that calls for an in-place citation fix or a note pointing to D-165 is a documentation-model question, not one this pass settles — but the gap should not be silent, particularly on the one record this round's own summary asserts "D-85 holds" against without having checked this specific claim (the prior round's D-85 verification was scoped to import confinement — `grep -rn "@ydinjs/box-quad" packages/drag2/src` — not to whether D-85's own text still names the field the tree carries).

---

### Task 4 — scope check: no decision-bearing production surface changed without a `D-` record

`kernel/spec.ts` is the only `src/` file in the diff. Read the full hunk: every change is inside a `/** ... */` doc comment above `AdmissionSubject`, `ActivationScope.box`, and `BehaviorSpec.admit`. No type member was added, removed, or retyped — `AdmissionSubject`'s `item`/`box`/`visual` members and `ActivationScope`'s fields are byte-for-byte unchanged outside the comments (confirmed by re-reading the diff hunk: every `-`/`+` line pair is comment text). This is F-232's fix exactly as scoped — prose catching up to a type shape D-165 already landed — not a new production-surface change requiring its own `D-` record.

No entry in the diff changes what an existing `D-` record's _own_ text says its scope is — `00-index.md` and `plan.md` only append new F-232–F-235 rows/prose dated `2026-08-31`, under the existing append-only, dated-entry convention (`.agents/docs/documentation.md` line 152); no `D-` row's cell text is edited by this diff (`git show 052de91b -- packages/drag2/.plan/contract/00-index.md` shows only additions, no changed line inside a `D-`-numbered row). The `m5.browser.test.ts` rewrite changes how a _test file_ narrates D-85's ground (addressed under Task 2, found accurate) but does not touch D-85's or D-165's own record text — that gap (der-2) exists independent of this diff, not because of it.

**No finding beyond der-1 and der-2**, both reported above.

## Summary

| Local id | Tier | Claim |
| --- | --- | --- |
| der-1 | B | `slotConstants()`'s fix for F-233 makes drag2's D-85 guard depend on box-quad's private constant-declaration shape (`const NAME = <integer>;`), an assumption no `D-`/`BQ-` record or repo convention commits to — an undecided coupling introduced under cover of an instrument-accuracy fix |
| der-2 | B | D-85's own live entry in the decision projection (`npx just decisions`) still states `ActivationScope carries inheritedSpace`, a field name the tree has not carried since D-165 (pre-dates and is untouched by this remediation, but bears directly on reading D-85 "holds" off the primary input this pass is chartered to use) |

Task 2 (F-235's rewritten D-85/D-165 prose) and task 3 (resurrection check) are clean, verified directly against the cited decision text and source rather than taken on the remediation's own word — evidence given in each section above.