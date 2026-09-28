# F-236..F-242 final remediation — package-coherence pass

**Read at `f3adb3fc`** (current `drag2/fin-review` HEAD). Diff range `3d968dfa..f3adb3fc`, confirmed to be exactly one commit: `git log --oneline 3d968dfa..f3adb3fc` returns only `f3adb3fc`. `git status` at read time showed the working tree clean except for other agents' own untracked report files under `.plan/reviews/phase-24/`, which were not read or relied on for this pass.

This is an independent pass. No other pass's prompt, findings, or artifact was read or waited on.

## Scope

**Covered:**

- `AdmissionSubject`, `admit`'s return doc, and `ActivationScope` as reproduced in `.plan/contract/02-kernel-behavior-contract.md`, cross-checked byte-for-byte (membership) against the shipped `src/kernel/spec.ts`.
- The strike-through convention (`~~...~~`) used in this commit's edits to `02-kernel-behavior-contract.md`, against the file's and directory's own precedent.
- The `#### Why inheritedSpace is on the scope and not on the session` subsection (untouched by this diff) for coherence against the corrected type block immediately above it.
- The seam table's `admit` row against the corrected `AdmissionSubject` block, same file.
- `00-index.md`'s F-235..F-238, F-241, F-242 rows cross-checked against `plan.md`'s new entry, `COVERAGE.md`'s one changed row, and the F-239 "As landed" paragraph against the actual `packaging.node.test.ts` as landed (test name, assertion, array value), and against the seven required properties `f239-f240-disposition-claude.md` §2.5 sets for the implementer.
- Whether `src/kernel/spec.ts` is the only `src/` file touched and whether every changed line sits inside a `/** */` doc comment.
- `packaging.node.test.ts`'s rewrite, for orphaned imports, unused helpers, and stale `SRC`/`files`/directory-walk references.
- Closure-row format and tense for F-236..F-242 against F-231..F-235's precedent, and a repo-wide grep for any place still treating F-236..F-242 (or F-239/F-240) as open or routed.
- Ran the full `packaging.node.test.ts` suite and `npx just typecheck` against the landed tree.

**Not covered:** whether F-236..F-242's _content_ correctly discharges each finding's required property in isolation (feature-proof's subject); box-quad's own internal coherence; any package other than `drag2`; Material X component-list coherence (`packages/material-x/files.json`) — not applicable, this change touches no Material X component.

## Findings

| Local id | Tier | Claim |
| --- | --- | --- |
| integrity-1 | B | The D-85 placement-reasoning subsection in `02-kernel-behavior-contract.md`, left untouched by this remediation, is now the sole surviving unstruck description of the pre-D-165 single-member/single-read model — directly below, and inconsistent with, the type block this same commit corrected three paragraphs above it |
| integrity-2 | C | Two of this commit's strike-throughs mark retired _code_ (not prose) inside a raw `//` comment in a `ts` fence, a sub-convention with no precedent anywhere in the contract directory |

### integrity-1 (tier B) — the D-85 subsection still argues from one member and one read, unstruck, right after the block that split it into two

**Claim.** `02-kernel-behavior-contract.md`'s `ActivationScope` code block (lines 938–1026) was correctly brought into the three-role/two-space model by this commit: `inheritedSpace: InheritedSpace;` is struck (`// ~~inheritedSpace: InheritedSpace;~~ — split by **D-165**, which reads the ancestry twice at activation`, line 1000) and replaced with `visualSpace`/`itemSpace`. But the subsection immediately following it, `#### Why \`inheritedSpace\` is on the scope and not on the session (D-85, E-01)` (line 1028), was not touched by this diff and still argues in the pre-split vocabulary — unstruck.

Per this directory's own convention, that is not inert history:

- `.plan/contract/README.md:21`: **"The term in force is the unstruck text. Struck text is provenance... Nothing struck is normative, and nothing struck is deleted."**

So the subsection is currently normative, and it currently states three things the type block two dozen lines above it (and the field's own doc comment, updated in the same commit) contradicts:

1. **The heading itself** names the retired field: `Why \`inheritedSpace\` is on the scope...` — the same identifier the code block three lines above struck as retired (`// ~~inheritedSpace: InheritedSpace;~~`). Two sites in the same file, a dozen lines apart, disagree on whether `inheritedSpace` is current: the code comment says it is struck by D-165; the heading immediately below uses it unstruck as the subject of an active section.
2. **"The new member joins them"** (line 1036) — singular. D-165 added two members, `visualSpace` and `itemSpace` (line 1003, 1018), not one.
3. **"One failure policy, because there is now one read"** (line 1038) — this is the sharpest disagreement. The type block's own new comment says the opposite: `visualSpace`/`itemSpace` split "**because which element a translate is written on decides which space it is spent in**" and the struck-field comment says D-165 "**reads the ancestry twice at activation**" (line 1000-1002). The implementation confirms it: `packages/drag2/src/kernel/presentation.ts:527-529` —
   ```ts
   const visualSpace = inheritedSpaceOf(above);
   const itemSpace =
     itemAbove === above ? visualSpace : inheritedSpaceOf(itemAbove);
   ```
   `inheritedSpaceOf` is called once for `above` (the visual's ancestry) and, whenever `itemAbove !== above`, called again for the item's — a second, independent read that can independently throw `FAILURE_ACTIVATION`, which the "one read" sentence denies exists.

**Cross-site confirmation.** `00-index.md`'s own D-85 row (corrected by F-240, in force) already carries the accurate statement: _"It landed as one field named `inheritedSpace` and has been published as two, `visualSpace` and `itemSpace`, since D-165 split it on 2026-08-31."_ That row cites `02-kernel-behavior-contract.md` **§Why `inheritedSpace` is on the scope** by its literal (unrenamed) heading as "the reasons" for the placement — sending a reader who follows that citation straight into the stale "one member"/"one read" prose the ledger row itself has already superseded.

**Why this is this round's business, not pre-existing debt inherited unchanged.** Before this commit, the whole page (`AdmissionSubject`, `admit`, `ActivationScope`'s code block, and this subsection) was uniformly stale, and F-237 closed exactly that state — its closure paragraph in `00-index.md` says the fix reaches "`visualSpace` and `itemSpace` on the scope, with D-165's widening of the settled spelling recorded beside D-59's reasons, which it leaves standing." The remediation touched the code block and the D-59 section but stopped short of this subsection, leaving it now _isolated_ against freshly-corrected neighboring text rather than uniformly stale with the rest of the page — which is a new, sharper inconsistency the commit itself introduces at its own boundary, of the identical general shape F-236 and F-237 already name in this same round ("a remediation scoped to that list passes over identical instances").

**Required property:** every unstruck sentence in `02-kernel-behavior-contract.md` that describes `ActivationScope`'s pre-lift ancestry facts states the same member count and the same read count as the type block it explains, or the disagreement is struck per the directory's own convention.

### integrity-2 (tier C) — a new strike-through sub-convention for retired code, not prose, introduced with no precedent

**Claim.** Every other `~~...~~` instance in `02-kernel-behavior-contract.md` and the rest of `.plan/contract/*.md` strikes retired **prose** — either bare markdown text, or a sentence inside a JSDoc `/** ... */` block quoted in a `ts` fence (precedent this file already carries at lines 59–60, predating this commit: `* ~~Unused by the sortable behavior... holds an external resource.~~ **Required by D-39...**`, and the directory-wide precedent named in the task, `01-construction-ownership.md:423`'s `~~through the platform reporter~~, D-130`). This commit adds two instances that strike an actual retired **type declaration line** instead, wrapped in a bare `//` line comment sitting directly among live TypeScript:

- Line 272: `  // ~~HTMLElement | Readonly<{ visual: HTMLElement; box: HTMLElement }>~~ (D-165)`
- Line 1000: `  // ~~inheritedSpace: InheritedSpace;~~ — split by **D-165**, which reads the ancestry twice at activation...`

`grep -rn '// ~~' packages/drag2/.plan/contract/*.md` returns only these two lines in the whole directory, and `git show 3d968dfa:packages/drag2/.plan/contract/02-kernel-behavior-contract.md | grep -n '// ~~'` returns nothing — both are new in this commit, with no prior instance of this style anywhere in the tree to establish it as an existing convention.

This is not misleading on its own — the live union member and the live field declaration are both still plainly present immediately below each struck comment, so a reader is never told the wrong current shape. It is a formatting divergence worth naming rather than a soundness defect: the file's established convention retires _what a sentence claimed_, never _what a type literally was_, and these two lines do the latter with no stated reason to depart from the former.

**Required property:** a retired code shape is struck the same way this file already strikes retired prose (inline in a comment/description, not spelled out again as a second, commented-out declaration), or the departure is explained.

## Clean results

**`AdmissionSubject`, `admit`'s return doc, and `ActivationScope` match `src/kernel/spec.ts` byte-for-byte in membership**, once strike-through is read as retired:

- `02-kernel-behavior-contract.md:271–274` (with the strike read out): `HTMLElement | Readonly<{ visual: HTMLElement; box: HTMLElement; item: HTMLElement }>` — matches `src/kernel/spec.ts:116–127`'s shipped `AdmissionSubject` exactly: same three members (`visual`, `box`, `item`), all required, membership identical (field order differs — `item` is a separate property in the source with its own doc comment vs. inlined in the contract's compact block — which the task states does not need to match).
- `02-kernel-behavior-contract.md:308–330`'s corrected `admit` return doc ("Returns the element the kernel should lift when the item, the visual and the box are one element, the three named separately when they are not, or `null`...") matches `src/kernel/spec.ts:437–439` verbatim in substance.
- `02-kernel-behavior-contract.md:938–1026`'s `ActivationScope` block carries `visual`, `originRect`, `box`, `boxPre`, `visualSpace`, `itemSpace`, `lift`, `motion`, `presentation` — the same nine members, same requiredness, as `src/kernel/spec.ts:157–232`.

**The seam table's `admit` row agrees with the corrected `AdmissionSubject` block, same file, same round.** `02-kernel-behavior-contract.md:453`: _"return the subject — the bare item when the `visual` and `box` slots resolve to it, and the three named separately when any of them differs (D-59, D-165)"_ is the sortable-specific instance of the general rule the type block above it states (bare form ⇔ `item === box === visual`; object form ⇔ any differ). No contradiction between the two.

**`00-index.md`'s F-235, F-236, F-237, F-238, F-241, F-242 rows agree with `plan.md`'s new entry and `COVERAGE.md`'s one changed row on every fact checked:**

- F-235's corrected row and F-238's row both state the site count as "two occurrences inside the doc block, two inline comments, and one `console.info` label" — five sites — matching each other and matching `plan.md`'s new 2026-08-31 entry ("The F-235 row counted 'four inline comments' where the delta is two occurrences in the doc block, two inline comments and one `console.info` label").
- `COVERAGE.md`'s one changed row ("box-quad's specifier appears in exactly one `src/` module, the kernel seam" / test title "should import the geometry package in exactly one module") matches the actual test as landed in `tests/packaging.node.test.ts:297–329`: `it('should import the geometry package in exactly one module', ...)`, asserting `expect(importers).toEqual(['kernel/presentation.ts'])`.
- **F-239's "As landed" paragraph is accurate**: `00-index.md`'s row states the test "reads every `.ts` under `src/` and asserts the set of modules containing the specifier equals `['kernel/presentation.ts']`" — matches the landed test exactly (uses the pre-existing `sources(SRC)` helper, `.includes("from '@ydinjs/box-quad'")`, `toEqual(['kernel/presentation.ts'])`).
- **All seven required properties `f239-f240-disposition-claude.md` §2.5 sets for the implementer are satisfied** by the landed test: (1) reads no file outside `packages/drag2` — confirmed, `sources(SRC)` only; (2) positive and exhaustive over all of `src/` rather than a two-directory blacklist — confirmed; (3) fails closed on the expected site disappearing — confirmed, `toEqual(['kernel/presentation.ts'])` fails on an empty or different array; (4) the derived-name clause and `slotConstants()` are deleted, not broadened — confirmed by diff; (5) the private-slot anti-pattern survives as prose on the assertion — confirmed, the new comment block at lines 304–314; (6) the resilience-claim sentence goes with the deleted clause — confirmed, no "makes a rename carry the guard with it" language remains; (7) no `D-*` minted, amended or superseded — confirmed, `plan.md`'s diff touches no `D-*` row.

**`src/kernel/spec.ts` is the only `src/` file touched, and every changed line is inside a `/** */` doc comment.** `git diff 3d968dfa..f3adb3fc --name-only -- packages/drag2/src/` returns exactly one file. The full line-level diff for that file is:

```
-  /** The element the kernel is lifting — the visual half of what `admit` returned. */
+  /**
+   * The element the kernel is lifting — what `admit` returned as the `visual`
+   * member of its subject, or the element itself when it returned a bare one,
+   * which names it as the item and the box as well.
+   */
```

Every added/removed line is a `/**`, `*/`, or `*`-continuation line — no code outside the comment moved.

**`packaging.node.test.ts`'s rewrite leaves no orphaned imports, unused helpers, or stale `SRC`/`files` references.** `slotConstants()` (and its sole caller) is fully removed; every remaining import (`readdir`, `readFile`, `dirname`, `join`, `relative`, `resolve`) is still used elsewhere in the file. The removed two-directory (`['free-drag', 'sortable']`) walk is replaced by the file's own pre-existing `sources(SRC)` recursive helper, already used by the module-graph-parser `describe` block above it. Every remaining `'free-drag'`/`'sortable'` string in the file belongs to unrelated, pre-existing tests (`reachableFrom(['drag', 'sortable', ...])` etc.), not leftovers from the removed guard.

**The full `packaging.node.test.ts` suite passes (14/14) and `npx just typecheck` is clean** against the landed tree, run directly rather than assumed — including "should publish no declaration carrying an internal reference," which forbids `~~` and any decision/finding number inside a shipped `.d.ts`. None of F-236's new `src/kernel/spec.ts` prose (`ActivationScope.visual`'s doc) introduces either, consistent with that guard.

**F-236's fix reaches the site F-232 stopped short of, and only that site.** `src/kernel/spec.ts:159–163`'s `ActivationScope.visual` now reads "what `admit` returned as the `visual` member of its subject, or the element itself when it returned a bare one, which names it as the item and the box as well" — the same shape `box`'s doc already had (lines 166–170), fixing the "visual **half**" wording F-236 named. No other doc comment in the file still uses "half" language for either member.

**Closure-row format for F-236, F-237, F-238 matches F-231–F-235's precedent** ("**Closed, 2026-08-31.**", same tense and structure). **F-241 and F-242's "Closed as recorded, ...; no fix required" / "...; deliberately not fixed" phrasing is a variant, but not a new or inconsistent one**: the ledger already carries other closed-without-a-code-change dispositions in different words for the same situation — e.g. D-122's "**Implemented 2026-08-25.** ~~Decided; no code change.~~", F-92/F-93's "Recorded, deliberately not opened" — so stating the disposition honestly rather than forcing "Closed, <date>." onto a finding that was intentionally left unfixed is consistent with how this ledger already handles that case, not drift.

**No place in `.plan/` still calls F-236, F-237, F-238, F-241 or F-242 "open" or "routed."** `grep -rn "routed" packages/drag2/.plan/contract/00-index.md packages/drag2/.plan/plan.md` finds only the (accurate, historical) sentence describing F-239/F-240's routing to the architect — both closed with a linked disposition record — and one unrelated F-227 routing from phase 23. `bq6-bq9-d165-remediation-summary.md:87` ("None of the seven new findings has a ledger row yet") and `f239-f240-disposition-claude.md:119` ("None of the five has a ledger row yet") are both now stale relative to the landed tree (all seven do have rows), but both are dated, closed prior-round artifacts recording their own state at the time they were written, not live claims about the current tree — not a coherence defect in the current commit.